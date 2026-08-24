// Fully custom UI (Option 3): the SDK renders nothing. We own the camera
// preview (a MediaStream shown in our own <video>) and draw all UI ourselves;
// the SDK acts as a headless signal processor.

let sdkInstance: any = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let active = false
let mediaStream: MediaStream | null = null

// Shared camera stream for the <video> element (non-serializable, so not useState).
const cameraStream = shallowRef<MediaStream | null>(null)

// FaceState enum -> user hint. 0 OK, 1 TOO_FAR, 2 TOO_CLOSE, 3 NOT_CENTERED,
// 4 NOT_VISIBLE, 5 TURNED_AWAY, 6 UNKNOWN.
const FACE_HINTS: Record<number, string> = {
  0: 'Hold still',
  1: 'Move a little closer',
  2: 'Move a little back',
  3: 'Center your face',
  4: 'Position your face in the frame',
  5: 'Look at the camera',
  6: 'Position your face in the frame'
}

// MeasurementState enum -> on-screen warning. 0 NOT_STARTED, 1 WAITING_FOR_FACE,
// 2 RUNNING_SIGNAL_SHORT, 3 RUNNING_SIGNAL_GOOD, 4 RUNNING_SIGNAL_BAD,
// 5 RUNNING_SIGNAL_BAD_DEVICE_UNSTABLE, 6 FINALIZING, 7 FINISHED, 8 FAILED.
const MEASUREMENT_HINTS: Record<number, string> = {
  1: 'Waiting for your face…',
  2: 'Hold still, analyzing…',
  4: 'Signal quality is low — hold still in good, even lighting',
  5: 'Device is unstable — hold your phone steady',
  6: 'Finalizing your results…',
  8: 'Measurement failed — please try again'
}

export const useShenAI = () => {
  const { $createShenaiSDK } = useNuxtApp()
  const vitals = useVitals()
  const { phase } = useScanState()
  const progress = useState<number>('scanProgress', () => 0)
  const measuring = useState<boolean>('measuring', () => false)
  const finished = useState<boolean>('finished', () => false)
  const faceHint = useState<string>('faceHint', () => '')
  const faceOk = useState<boolean>('faceOk', () => false)
  const measurementHint = useState<string>('measurementHint', () => '')
  const measurementFailed = useState<boolean>('measurementFailed', () => false)

  async function initializeShenAI() {
    const apiKey = import.meta.env.VITE_SHENAI_API_KEY
    if (!apiKey) {
      throw new Error('Missing VITE_SHENAI_API_KEY. Add it to a .env file at the project root.')
    }

    // 1. Acquire the camera ourselves — in fully custom mode we own the preview.
    // Let the device report its natural resolution (most webcams are landscape;
    // forcing a portrait "ideal" size is usually ignored by the hardware anyway).
    if (!mediaStream) {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      })
      cameraStream.value = mediaStream

      // getUserMedia() resolving doesn't guarantee a decoded frame yet; wait for
      // the track to actually report real dimensions before handing it to the SDK.
      const t = mediaStream.getVideoTracks()[0]
      for (let i = 0; i < 20 && !t.getSettings().width; i++) {
        await new Promise((r) => setTimeout(r, 50))
      }
    }

    // Size the hidden processing canvas to match the ACTUAL stream resolution.
    // A mismatched canvas size (e.g. default 300x150) makes the SDK's frame
    // cropping look at the wrong region, so the face is never detected.
    const track = mediaStream.getVideoTracks()[0]
    const settings = track?.getSettings?.() ?? {}
    const canvasEl = document.getElementById('mxcanvas') as HTMLCanvasElement | null
    if (canvasEl && settings.width && settings.height) {
      canvasEl.width = settings.width
      canvasEl.height = settings.height
    }
    if (import.meta.dev) {
      console.info('[ShenAI] camera track settings:', settings, 'canvas size:', canvasEl?.width, canvasEl?.height)
    }

    // 2. Create the SDK. It still needs a (hidden) #mxcanvas for its WebGL context.
    if (!sdkInstance) {
      sdkInstance = await ($createShenaiSDK as any)({
        enablePreloadDisplay: false
      })
    }

    // Re-init cleanly so settings apply and a new session starts.
    if (sdkInstance.isInitialized && sdkInstance.isInitialized()) {
      sdkInstance.deinitialize()
    }
    active = false
    finished.value = false
    measuring.value = false
    progress.value = 0

    // 3. Fully custom: no SDK UI. Matching the official webrtc example order:
    // initialize() first (no cameraMode override), then attach the MediaStream.
    const result: any = await new Promise((resolve) => {
      sdkInstance.initialize(
        apiKey,
        'user123',
        {
          showUserInterface: false,
          onboardingMode: sdkInstance.OnboardingMode.HIDDEN,
          // Skip the SDK's default portrait-oriented crop; process the raw
          // stream frame as-is (our stream's real aspect ratio may be landscape).
          enableFullFrameProcessing: true,
          eventCallback: (event: string) => {
            if (event === 'MEASUREMENT_FINISHED') finished.value = true
          }
        },
        resolve
      )
    })

    // InitializationResult.OK === 0
    const resultCode = typeof result === 'number' ? result : result?.value
    if (resultCode !== 0) {
      throw new Error('SDK initialization failed: ' + JSON.stringify(result))
    }

    active = true
    // 4. Attach our camera stream now that the SDK is initialized (this is what
    // actually switches the SDK into MediaStream camera mode).
    sdkInstance.setMediaStream(mediaStream, true)

    if (import.meta.dev) {
      console.info(
        '[ShenAI] after setMediaStream -> cameraMode:', sdkInstance.getCameraMode?.(),
        'lastCameraError:', sdkInstance.getLastCameraError?.()
      )
    }

    startPolling()
    return result
  }

  // startMeasurement() is a documented no-op until the SDK is ready (face
  // detected in position), so surface that instead of silently doing nothing.
  function startMeasurement() {
    if (!sdkInstance) return
    if (!sdkInstance.isReadyToStartMeasurement()) {
      faceHint.value = faceHint.value || 'Position your face in the frame'
      return
    }
    progress.value = 0
    finished.value = false
    sdkInstance.startMeasurement()
  }

  function stopMeasurement() {
    if (!sdkInstance) return
    sdkInstance.stopMeasurement()
    measuring.value = false
  }

  // Poll face state, realtime metrics and progress into shared state.
  let lastLoggedKey = ''
  function startPolling() {
    stopPolling()
    pollTimer = setInterval(() => {
      if (!sdkInstance) return

      const fs = sdkInstance.getFaceState()
      if (fs) {
        faceOk.value = fs.value === 0
        faceHint.value = FACE_HINTS[fs.value] ?? ''
      }

      // Dev diagnostics: log only when something meaningful changes.
      if (import.meta.dev) {
        const camErr = sdkInstance.getLastCameraError?.()
        const camMode = sdkInstance.getCameraMode?.()
        const ms0 = sdkInstance.getMeasurementState?.()
        const ready = sdkInstance.isReadyToStartMeasurement?.()
        const key = `${fs?.value}|${ms0?.value}|${ready}|${camErr?.value}|${camMode?.value}`
        if (key !== lastLoggedKey) {
          lastLoggedKey = key
          console.info('[ShenAI] faceState:', fs?.value, 'measurementState:', ms0?.value, 'ready:', ready, 'cameraError:', camErr, 'cameraMode:', camMode)
        }
      }

      const hr = sdkInstance.getRealtimeHeartRate()
      const stress = sdkInstance.getRealtimeCardiacStress()
      const metrics = sdkInstance.getRealtimeMetrics(10)

      if (hr != null) vitals.heartRate.value = Math.round(hr)
      if (stress != null) vitals.stress.value = Math.round(stress * 100) / 100
      if (metrics?.breathing_rate_bpm != null) vitals.respiration.value = Math.round(metrics.breathing_rate_bpm)
      if (metrics?.hrv_sdnn_ms != null) vitals.hrv.value = Math.round(metrics.hrv_sdnn_ms)

      progress.value = Math.round(sdkInstance.getMeasurementProgressPercentage() ?? 0)

      const ms = sdkInstance.getMeasurementState()
      measuring.value = !!ms && ms.value >= 2 && ms.value <= 7
      measurementHint.value = MEASUREMENT_HINTS[ms?.value] ?? ''
      measurementFailed.value = ms?.value === 8

      const final = sdkInstance.getMeasurementResults()
      if (final) {
        applyResults(final)
        finished.value = true
      }
    }, 300)
  }

  function applyResults(r: any) {
    if (r.heart_rate_bpm != null) vitals.heartRate.value = Math.round(r.heart_rate_bpm)
    if (r.systolic_blood_pressure_mmhg != null) vitals.systolic.value = Math.round(r.systolic_blood_pressure_mmhg)
    if (r.diastolic_blood_pressure_mmhg != null) vitals.diastolic.value = Math.round(r.diastolic_blood_pressure_mmhg)
    if (r.stress_index != null) vitals.stress.value = Math.round(r.stress_index * 100) / 100
    if (r.breathing_rate_bpm != null) vitals.respiration.value = Math.round(r.breathing_rate_bpm)
    if (r.hrv_sdnn_ms != null) vitals.hrv.value = Math.round(r.hrv_sdnn_ms)
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function deinitialize() {
    if (active && sdkInstance) {
      sdkInstance.deinitialize()
      active = false
    }
  }

  function stopCamera() {
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop())
      mediaStream = null
      cameraStream.value = null
    }
  }

  // Move to the custom results screen, keeping the measured values.
  function viewResults() {
    stopPolling()
    deinitialize()
    stopCamera()
    phase.value = 'results'
  }

  function stopShenAI() {
    stopPolling()
    deinitialize()
    stopCamera()
    progress.value = 0
    measuring.value = false
    finished.value = false
    faceHint.value = ''
    faceOk.value = false
    measurementHint.value = ''
    measurementFailed.value = false
    vitals.heartRate.value = 0
    vitals.systolic.value = 0
    vitals.diastolic.value = 0
    vitals.stress.value = 0
    vitals.respiration.value = 0
    vitals.hrv.value = 0
    phase.value = 'camera'
  }

  return {
    initialize: initializeShenAI,
    startMeasurement,
    stopMeasurement,
    stop: stopShenAI,
    viewResults,
    progress,
    measuring,
    finished,
    faceHint,
    faceOk,
    measurementHint,
    measurementFailed,
    stream: cameraStream,
    sdk: () => sdkInstance
  }
}