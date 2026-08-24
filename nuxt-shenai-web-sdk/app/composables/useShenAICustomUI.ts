// Fully custom UI Shen.AI integration (Web SDK, MediaStream mode).
// We own the camera (<video>) and all screens; the SDK only supplies
// face/measurement state via its hidden-but-onscreen #mxcanvas.
// Docs: https://developer.shen.ai/getting-started/initialization
//       https://developer.shen.ai/video-measurement/preparation
//       https://developer.shen.ai/video-measurement/measurement
//       https://developer.shen.ai/video-measurement/results

let sdk: any = null
let mediaStream: MediaStream | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null

// MediaStream isn't serializable, so it's kept outside useState.
const cameraStream = shallowRef<MediaStream | null>(null)

// Let the SDK's render loop tick a few times before/after swapping the frame
// source (matches the official webrtc example's waitForAnimationFrames).
function waitFrames(count = 2): Promise<void> {
  return new Promise((resolve) => {
    let i = 0
    const tick = () => (++i >= count ? resolve() : requestAnimationFrame(tick))
    requestAnimationFrame(tick)
  })
}

// FaceState -> user-facing hint (see getFaceState() docs).
const FACE_HINTS: Record<number, string> = {
  0: 'Hold still',
  1: 'Move a little closer',
  2: 'Move a little back',
  3: 'Center your face',
  4: 'Position your face in the frame',
  5: 'Look at the camera',
  6: 'Position your face in the frame'
}

export const useShenAICustomUI = () => {
  const { $createShenaiSDK } = useNuxtApp()
  const { phase } = useScanState()
  const vitals = useVitals()

  const faceHint = useState<string>('cui_faceHint', () => '')
  const faceOk = useState<boolean>('cui_faceOk', () => false)
  const ready = useState<boolean>('cui_ready', () => false)
  const measuring = useState<boolean>('cui_measuring', () => false)
  const progress = useState<number>('cui_progress', () => 0)

  async function initialize() {
    const apiKey = import.meta.env.VITE_SHENAI_API_KEY
    if (!apiKey) {
      throw new Error('Missing VITE_SHENAI_API_KEY. Add it to a .env file at the project root.')
    }

    // 1. Our own camera, shown in our own <video>.
    if (!mediaStream) {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      })
      cameraStream.value = mediaStream
    }

    // Size the SDK's #mxcanvas backing store to the ACTUAL stream resolution.
    // Default is 300x150 which mismatches the camera and breaks face detection.
    const track = mediaStream.getVideoTracks()[0]
    const { width, height } = track.getSettings()
    const canvas = document.getElementById('mxcanvas') as HTMLCanvasElement | null
    if (canvas && width && height) {
      canvas.width = width
      canvas.height = height
      console.info('[ShenAI] canvas sized to stream', width, 'x', height)
    }

    // 2. Create + initialize the SDK against the (visually hidden) #mxcanvas.
    if (!sdk) {
      sdk = await ($createShenaiSDK as any)({ enablePreloadDisplay: false })
    }
    if (sdk.isInitialized?.()) {
      sdk.deinitialize()
    }
    faceOk.value = false
    faceHint.value = ''
    measuring.value = false
    progress.value = 0

    const result: any = await new Promise((resolve) => {
      sdk.initialize(
        apiKey,
        'user123',
        {
          // The SDK's own camera stays OFF: we are the frame source via
          // setMediaStream(). Without cameraMode:OFF the SDK keeps its internal
          // camera as the source and silently ignores our stream, so
          // getFaceState() stays UNKNOWN forever (matches official webrtc example).
          cameraMode: sdk.CameraMode.OFF,
          cameraAspectRatio: width && height ? width / height : undefined,
          initializationMode: sdk.InitializationMode?.MEASUREMENT,
          operatingMode: sdk.OperatingMode.POSITIONING,
          showUserInterface: true,
          onboardingMode: sdk.OnboardingMode.HIDDEN,
          showDisclaimer: false,
          // Drive the flow straight to the measurement screen. Without this the
          // SDK sits on its onboarding/disclaimer screen and never starts
          // processing frames, so getFaceState() stays UNKNOWN.
          uiFlowScreens: [sdk.Screen.MEASUREMENT],
          enableFullFrameProcessing: true
        },
        resolve
      )
    })

    // InitializationResult.OK === 0
    const resultCode = typeof result === 'number' ? result : result?.value
    if (resultCode !== sdk.InitializationResult.OK.value) {
      throw new Error('SDK initialization failed: ' + JSON.stringify(result))
    }
    console.info('[ShenAI] initialized (license activated)')

    // 3. Feed our camera stream into the SDK now that it's initialized.
    //    Give the render loop a couple ticks, then push a CLONED track wrapped
    //    in a fresh MediaStream (the official webrtc example does exactly this;
    //    passing the raw stream/track can be dropped by the frame dispatcher).
    sdk.setOperatingMode(sdk.OperatingMode.POSITIONING)
    await waitFrames(2)
    const sdkTrack = mediaStream.getVideoTracks()[0].clone()
    const sdkStream = new MediaStream([sdkTrack])
    sdk.setMediaStream(sdkStream, true)
    await waitFrames(3)

    // Ensure the SDK is on the measurement screen so it starts face detection.
    sdk.setScreen?.(sdk.Screen.MEASUREMENT)

    startPolling()
  }

  // Clicks the SDK's START button programmatically. startMeasurement() is a
  // documented no-op until isReadyToStartMeasurement() is true, so gate the
  // custom button on `ready`.
  function startMeasurement() {
    console.log("inside startMeasurement");
    
    if (!sdk) return
    if (!sdk.isReadyToStartMeasurement()) {
      console.warn('[ShenAI] not ready to start; position your face first.')
      return
    }
    progress.value = 0
    sdk.setOperatingMode(sdk.OperatingMode.MEASURE)
    sdk.startMeasurement()
  }

  // Clicks the SDK's STOP button programmatically.
  function stopMeasurement() {
    if (!sdk) return
    sdk.stopMeasurement()
    sdk.setOperatingMode(sdk.OperatingMode.POSITIONING)
    measuring.value = false
  }

  // Poll face state + measurement progress; move to results on FINISHED.
  function startPolling() {
    console.log("inside startPolling");
    stopPolling()
    pollTimer = setInterval(() => {
      if (!sdk) return

      // getNormalizedFaceBbox() returns null when no face is tracked.
      const bbox = sdk.getNormalizedFaceBbox?.()
      if (bbox) {
        console.log('normalized face bbox:', bbox.x, bbox.y, bbox.width, bbox.height)
      }

      const fs = sdk.getFaceState()
      if (fs) {
        faceOk.value = fs.value === 0
        faceHint.value = FACE_HINTS[fs.value] ?? ''
        console.log('[ShenAI] faceState=', fs.value, 'cameraMode=', sdk.getCameraMode?.()?.value, 'camErr=', sdk.getLastCameraError?.())
      }

      // Real SDK readiness drives the custom START button's enabled state.
      ready.value = !!sdk.isReadyToStartMeasurement?.()

      // MeasurementState: 0 NOT_STARTED, 1 WAITING_FOR_FACE, 2-6 RUNNING/FINALIZING,
      // 7 FINISHED, 8 FAILED.
      const ms = sdk.getMeasurementState()
      if (ms) {
        measuring.value = ms.value >= 2 && ms.value <= 6
        progress.value = Math.round(sdk.getMeasurementProgressPercentage() ?? 0)

        // Live values while the scan runs so the UI isn't stuck at 0.
        if (measuring.value) {
          const rt = sdk.getRealtimeMetrics?.(10)
          if (rt) applyResults(rt)
        }

        if (ms.value === 7) {
          const results = sdk.getMeasurementResults()
          if (results) {
            applyResults(results)
            stopPolling()
            phase.value = 'results'
          }
        } else if (ms.value === 8) {
          // FAILED: reset so the user can retry from positioning.
          console.warn('[ShenAI] measurement failed; returning to positioning.')
          measuring.value = false
          progress.value = 0
          sdk.setOperatingMode(sdk.OperatingMode.POSITIONING)
        }
      }
    }, 300)
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function applyResults(r: any) {
    if (r.heart_rate_bpm != null) vitals.heartRate.value = Math.round(r.heart_rate_bpm)
    if (r.systolic_blood_pressure_mmhg != null) vitals.systolic.value = Math.round(r.systolic_blood_pressure_mmhg)
    if (r.diastolic_blood_pressure_mmhg != null) vitals.diastolic.value = Math.round(r.diastolic_blood_pressure_mmhg)
    if (r.stress_index != null) vitals.stress.value = Math.round(r.stress_index * 100) / 100
    if (r.breathing_rate_bpm != null) vitals.respiration.value = Math.round(r.breathing_rate_bpm)
    if (r.hrv_sdnn_ms != null) vitals.hrv.value = Math.round(r.hrv_sdnn_ms)
  }

  function stop() {
    stopPolling()
    if (sdk?.isInitialized?.()) sdk.deinitialize()
    mediaStream?.getTracks().forEach((t) => t.stop())
    mediaStream = null
    cameraStream.value = null
    faceHint.value = ''
    faceOk.value = false
    ready.value = false
    measuring.value = false
    progress.value = 0
    phase.value = 'camera'
  }

  return {
    initialize,
    startMeasurement,
    stopMeasurement,
    stop,
    faceHint,
    faceOk,
    ready,
    measuring,
    progress,
    stream: cameraStream
  }
}
