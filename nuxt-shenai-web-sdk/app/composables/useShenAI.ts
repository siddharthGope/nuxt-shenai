// Keep a single SDK instance across calls/components.
let sdkInstance: any = null
let pollTimer: ReturnType<typeof setInterval> | null = null

export const useShenAI = () => {
  const { $createShenaiSDK } = useNuxtApp()
  const vitals = useVitals()

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

    // initialize() is callback-based, so wrap it in a Promise.
    // The SDK auto-renders its camera + UI to the canvas with id "mxcanvas".
    const result: any = await new Promise((resolve) => {
      sdkInstance.initialize(apiKey, 'user123', {}, resolve)
    })

    // InitializationResult.OK === 0
    if (result?.value !== 0) {
      throw new Error('SDK initialization failed (code ' + result?.value + ')')
    }

    startPolling()

    return result
  }

  // Mirror the SDK's realtime metrics into the shared vitals state.
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
    }, 1000)
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function stopShenAI() {
    stopPolling()
    if (sdkInstance) {
      // deinitialize() frees resources and disconnects the camera.
      sdkInstance.deinitialize()
    }
    vitals.heartRate.value = 0
    vitals.stress.value = 0
    vitals.respiration.value = 0
  }

  return {
    initialize: initializeShenAI,
    stop: stopShenAI,
    sdk: () => sdkInstance
  }
}