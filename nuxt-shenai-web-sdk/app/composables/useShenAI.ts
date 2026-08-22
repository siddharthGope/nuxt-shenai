// Brand colors applied to the SDK's built-in canvas UI via setCustomColorTheme.
const THEME = {
  themeColor: '#E8623D', // START/STOP text + progress bar
  textColor: '#0f172a', // results text
  backgroundColor: '#ffffff', // background around UI + results
  tileColor: '#ffffff', // result tiles, face overlay, buttons
  buttonMainColor: '#E8623D', // left gradient of main buttons + onboarding dots
  buttonSecondaryColor: '#C94F2E' // right gradient of main buttons
}

// Keep a single SDK instance across calls/components.
let sdkInstance: any = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let active = false

export const useShenAI = () => {
  const { $createShenaiSDK } = useNuxtApp()
  const vitals = useVitals()
  const { phase } = useScanState()
  const progress = useState<number>('scanProgress', () => 0)
  const measuring = useState<boolean>('measuring', () => false)
  const finished = useState<boolean>('finished', () => false)

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

    // A repeated initialize() is a no-op while still initialized, so start fresh
    // to ensure the settings below actually apply.
    if (sdkInstance.isInitialized && sdkInstance.isInitialized()) {
      sdkInstance.deinitialize()
    }
    active = false
    finished.value = false
    measuring.value = false
    progress.value = 0

    // Keep the SDK's built-in UI on the canvas and re-brand it below via
    // setCustomColorTheme. Onboarding stays hidden.
    const result: any = await new Promise((resolve) => {
      sdkInstance.initialize(
        apiKey,
        'user123',
        {
          showUserInterface: true,
          onboardingMode: sdkInstance.OnboardingMode.HIDDEN,
          hideShenaiLogo: true,
          showFaceMask: true,
          showBloodFlow: true,
          showFacePositioningOverlay: true,
          enableSummaryScreen: false
        },
        resolve
      )
    })

    // InitializationResult.OK === 0
    if (result?.value !== 0) {
      throw new Error('SDK initialization failed (code ' + result?.value + ')')
    }

    active = true
    // Re-brand the SDK's built-in canvas UI.
    sdkInstance.setCustomColorTheme(THEME)
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
      if (metrics?.hrv_sdnn_ms != null) {
        vitals.hrv.value = Math.round(metrics.hrv_sdnn_ms)
      }

      progress.value = Math.round(sdkInstance.getMeasurementProgressPercentage() ?? 0)

      // Show the metric tiles once a measurement is running (state 2..7).
      const ms = sdkInstance.getMeasurementState()
      measuring.value = !!ms && ms.value >= 2 && ms.value <= 7

      // Mirror final values into the custom cards. The SDK summary screen is
      // disabled, so we surface our own results screen on demand.
      const final = sdkInstance.getMeasurementResults()
      if (final) {
        applyResults(final)
        finished.value = true
      }
    }, 500)
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

  // deinitialize() frees resources and disconnects the camera.
  function deinitialize() {
    if (active && sdkInstance) {
      sdkInstance.deinitialize()
      active = false
    }
  }

  // Move to the custom results screen, keeping the measured values.
  function viewResults() {
    stopPolling()
    deinitialize()
    phase.value = 'results'
  }

  function stopShenAI() {
    stopPolling()
    deinitialize()
    progress.value = 0
    measuring.value = false
    finished.value = false
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
    stop: stopShenAI,
    viewResults,
    progress,
    measuring,
    finished,
    sdk: () => sdkInstance
  }
}