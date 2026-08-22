// Keep a single SDK instance across calls/components.
let sdkInstance: any = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let active = false

export const useShenAI = () => {
  const { $createShenaiSDK } = useNuxtApp()
  const vitals = useVitals()
  const { phase } = useScanState()
  const progress = useState<number>('scanProgress', () => 0)

  async function initializeShenAI() {
    const apiKey = import.meta.env.VITE_SHENAI_API_KEY
    if (!apiKey) {
      throw new Error('Missing VITE_SHENAI_API_KEY. Add it to a .env file at the project root.')
    }

    // Create the SDK on first use. This requests camera access, so it must run
    // from a user gesture (the Start Scan button).
    if (!sdkInstance) {
      sdkInstance = await ($createShenaiSDK as any)({
        enablePreloadDisplay: false
      })
    }

    // Custom UI: hide the SDK's built-in interface and on-canvas overlays so
    // only the raw camera feed renders to the canvas with id "mxcanvas".
    const result: any = await new Promise((resolve) => {
      sdkInstance.initialize(
        apiKey,
        'user123',
        {
          showUserInterface: false,
          showFacePositioningOverlay: false,
          showVisualWarnings: false,
          showFaceMask: false,
          showBloodFlow: false,
          showSignalTile: false,
          showSignalQualityIndicator: false,
          showStartStopButton: false,
          hideShenaiLogo: true
        },
        resolve
      )
    })

    // InitializationResult.OK === 0
    if (result?.value !== 0) {
      throw new Error('SDK initialization failed (code ' + result?.value + ')')
    }

    active = true
    startPolling()

    return result
  }

  function startMeasurement() {
    if (!sdkInstance) return
    progress.value = 0
    sdkInstance.setOperatingMode(sdkInstance.OperatingMode.MEASURE)
    sdkInstance.startMeasurement()
  }

  // Mirror the SDK's realtime metrics + progress into shared state.
  function startPolling() {
    stopPolling()
    pollTimer = setInterval(() => {
      if (!sdkInstance) return

      const hr = sdkInstance.getRealtimeHeartRate()
      const stress = sdkInstance.getRealtimeCardiacStress()
      const metrics = sdkInstance.getRealtimeMetrics(10)

      if (hr != null) vitals.heartRate.value = Math.round(hr)
      if (stress != null) vitals.stress.value = Math.round(stress * 100) / 100
      if (metrics?.breathing_rate_bpm != null) {
        vitals.respiration.value = Math.round(metrics.breathing_rate_bpm)
      }

      progress.value = Math.round(sdkInstance.getMeasurementProgressPercentage() ?? 0)

      // getMeasurementResults() returns non-null once the measurement finishes.
      const final = sdkInstance.getMeasurementResults()
      if (final) {
        applyResults(final)
        stopPolling()
        deinitialize()
        phase.value = 'results'
      }
    }, 500)
  }

  function applyResults(r: any) {
    if (r.heart_rate_bpm != null) vitals.heartRate.value = Math.round(r.heart_rate_bpm)
    if (r.systolic_blood_pressure_mmhg != null) vitals.systolic.value = Math.round(r.systolic_blood_pressure_mmhg)
    if (r.diastolic_blood_pressure_mmhg != null) vitals.diastolic.value = Math.round(r.diastolic_blood_pressure_mmhg)
    if (r.stress_index != null) vitals.stress.value = Math.round(r.stress_index * 100) / 100
    if (r.breathing_rate_bpm != null) vitals.respiration.value = Math.round(r.breathing_rate_bpm)
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  // deinitialize() frees resources and disconnects the camera.
  function deinitialize() {
    if (active && sdkInstance) {
      sdkInstance.deinitialize()
      active = false
    }
  }

  function stopShenAI() {
    stopPolling()
    deinitialize()
    progress.value = 0
    vitals.heartRate.value = 0
    vitals.systolic.value = 0
    vitals.diastolic.value = 0
    vitals.stress.value = 0
    vitals.respiration.value = 0
    phase.value = 'camera'
  }

  return {
    initialize: initializeShenAI,
    startMeasurement,
    stop: stopShenAI,
    progress,
    sdk: () => sdkInstance
  }
}