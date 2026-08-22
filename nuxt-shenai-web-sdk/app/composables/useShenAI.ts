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

export const useShenAI = () => {
  const { $createShenaiSDK } = useNuxtApp()
  const vitals = useVitals()
  const { phase } = useScanState()
  const progress = useState<number>('scanProgress', () => 0)
  const measuring = useState<boolean>('measuring', () => false)
  const finished = useState<boolean>('finished', () => false)
  const faceHint = useState<string>('faceHint', () => '')
  const faceOk = useState<boolean>('faceOk', () => false)

  async function initializeShenAI() {
    const apiKey = import.meta.env.VITE_SHENAI_API_KEY
    if (!apiKey) {
      throw new Error('Missing VITE_SHENAI_API_KEY. Add it to a .env file at the project root.')
    }

    // 1. Acquire the camera ourselves — in fully custom mode we own the preview.
    if (!mediaStream) {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
        audio: false
      })
      cameraStream.value = mediaStream
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

    // 3. Fully custom: no SDK UI, camera supplied as a MediaStream.
    const result: any = await new Promise((resolve) => {
      sdkInstance.initialize(
        apiKey,
        'user123',
        {
          showUserInterface: false,
          onboardingMode: sdkInstance.OnboardingMode.HIDDEN,
          cameraMode: sdkInstance.CameraMode.MEDIA_STREAM,
          eventCallback: (event: string) => {
            if (event === 'MEASUREMENT_FINISHED') finished.value = true
          }
        },
        resolve
      )
    })

    // InitializationResult.OK === 0
    if (result?.value !== 0) {
      throw new Error('SDK initialization failed (code ' + result?.value + ')')
    }

    active = true
    // 4. Feed our camera stream to the SDK for processing.
    sdkInstance.setMediaStream(mediaStream, true)

    startPolling()
    return result
  }

  function startMeasurement() {
    if (!sdkInstance) return
    progress.value = 0
    finished.value = false
    sdkInstance.setOperatingMode(sdkInstance.OperatingMode.MEASURE)
    sdkInstance.startMeasurement()
  }

  function stopMeasurement() {
    if (!sdkInstance) return
    sdkInstance.stopMeasurement()
    measuring.value = false
  }

  // Poll face state, realtime metrics and progress into shared state.
  function startPolling() {
    stopPolling()
    pollTimer = setInterval(() => {
      if (!sdkInstance) return

      const fs = sdkInstance.getFaceState()
      if (fs) {
        faceOk.value = fs.value === 0
        faceHint.value = FACE_HINTS[fs.value] ?? ''
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
    stream: cameraStream,
    sdk: () => sdkInstance
  }
}