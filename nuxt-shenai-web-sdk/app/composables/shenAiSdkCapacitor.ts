import {
  ShenaiSdkCapacitor,
  CameraMode,
  Gender,
  HypertensionTreatment,
  InitializationMode,
  InitializationResult,
  MeasurementState,
  OnboardingMode,
  OperatingMode,
  Race,
  Screen,
  type HealthRisks,
  type MeasurementResults,
  type MeasurementResultsHistory,
  type RisksFactors
} from '@shenai/capacitor-sdk'

type NativeVitalsResult = {
  heartRate: number
  systolic: number
  diastolic: number
  bloodPressure: string
  hrv: number
  stress: number
  breathingRate: number
}

type NativeHealthRiskInput = {
  age?: number
  cholesterol?: number
  cholesterolHdl?: number
  sbp?: number
  dbp?: number
  isSmoker?: boolean
  hasDiabetes?: boolean
  treatedBp?: boolean
  bodyHeight?: number
  bodyWeight?: number
}

const emptyNativeVitalsResult = (): NativeVitalsResult => ({
  heartRate: 0,
  systolic: 0,
  diastolic: 0,
  bloodPressure: '0/0',
  hrv: 0,
  stress: 0,
  breathingRate: 0
})

function roundOrZero(value: number | null | undefined) {
  return value != null ? Math.round(value) : 0
}

function normalizeNativeResults(results: MeasurementResults | null): NativeVitalsResult {
  if (!results) return emptyNativeVitalsResult()

  const systolic = roundOrZero(results.systolicBloodPressureMmhg)
  const diastolic = roundOrZero(results.diastolicBloodPressureMmhg)

  return {
    heartRate: roundOrZero(results.heartRateBpm),
    systolic,
    diastolic,
    bloodPressure: `${systolic}/${diastolic}`,
    hrv: roundOrZero(results.hrvSdnnMs),
    stress: results.stressIndex != null ? Math.round(results.stressIndex * 100) / 100 : 0,
    breathingRate: roundOrZero(results.breathingRateBpm)
  }
}

function toRiskFactors(input: NativeHealthRiskInput): RisksFactors {
  const factors: RisksFactors = {
    age: input.age,
    cholesterol: input.cholesterol,
    cholesterolHdl: input.cholesterolHdl,
    sbp: input.sbp,
    dbp: input.dbp,
    isSmoker: input.isSmoker,
    hypertensionTreatment: input.treatedBp === true
      ? HypertensionTreatment.YES
      : input.treatedBp === false
        ? HypertensionTreatment.NO
        : undefined,
    hasDiabetes: input.hasDiabetes,
    bodyHeight: input.bodyHeight,
    bodyWeight: input.bodyWeight,
    gender: Gender.MALE,
    country: 'US',
    race: Race.OTHER
  }

  Object.keys(factors).forEach((key) => {
    const typedKey = key as keyof RisksFactors
    const value = factors[typedKey]
    if (value == null || value === '') delete factors[typedKey]
  })

  return factors
}

export const useShenAiCapacitor = () => {
  const { phase } = useScanState()
  const initialized = useState<boolean>('shenai_cap_initialized', () => false)
  const ready = useState<boolean>('shenai_cap_ready', () => false)
  const faceHint = useState<string>('shenai_cap_faceHint', () => 'Position your face in the frame')
  const measuring = useState<boolean>('shenai_cap_measuring', () => false)
  const progress = useState<number>('shenai_cap_progress', () => 0)
  const vitalsResult = useState<NativeVitalsResult>('shenai_cap_vitalsResult', emptyNativeVitalsResult)
  let pollTimer: ReturnType<typeof setInterval> | null = null

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function startPolling() {
    stopPolling()
    pollTimer = setInterval(() => {
      void refreshMeasurementState()
    }, 300)
  }

  async function initialize(userId: string) {
    const apiKey = import.meta.env.VITE_SHENAI_API_KEY
    if (!apiKey) {
      throw new Error('Missing VITE_SHENAI_API_KEY. Add it to a .env file at the project root.')
    }

    const current = await ShenaiSdkCapacitor.isInitialized()
    if (current.value) {
      await ShenaiSdkCapacitor.deinitialize()
    }

    const result = await ShenaiSdkCapacitor.initialize({
      apiKey,
      userId,
      settings: {
        cameraMode: CameraMode.FACING_USER,
        initializationMode: InitializationMode.MEASUREMENT,
        operatingMode: OperatingMode.POSITIONING,
        onboardingMode: OnboardingMode.HIDDEN,
        showDisclaimer: false,
        showUserInterface: false,
        showStartStopButton: false,
        showFacePositioningOverlay: false,
        showVisualWarnings: false,
        hideShenaiLogo: true,
        localMemoryEnabled: true,
        uiFlowScreens: [Screen.MEASUREMENT]
      }
    })

    if (result.value !== InitializationResult.OK) {
      throw new Error(`Shen.AI Capacitor initialization failed: ${result.value}`)
    }

    initialized.value = true
    ready.value = false
    faceHint.value = 'Position your face in the frame'
    measuring.value = false
    progress.value = 0
    vitalsResult.value = emptyNativeVitalsResult()

    await ShenaiSdkCapacitor.setScreen({ screen: Screen.MEASUREMENT })
    // Keep the native camera surface behind the WebView so our custom controls
    // and face-positioning guide remain visible above it.
    await ShenaiSdkCapacitor.setOverlaysWebview({ overlay: false }).catch(() => {})
    startPolling()
  }

  async function startMeasurement() {
    const readyResult = await ShenaiSdkCapacitor.isReadyToStartMeasurement()
    if (!readyResult.value) return false

    await ShenaiSdkCapacitor.setOperatingMode({ operatingMode: OperatingMode.MEASURE })
    await ShenaiSdkCapacitor.startMeasurement()
    measuring.value = true
    return true
  }

  async function stopMeasurement() {
    await ShenaiSdkCapacitor.stopMeasurement()
    await ShenaiSdkCapacitor.setOperatingMode({ operatingMode: OperatingMode.POSITIONING })
    measuring.value = false
  }

  async function setViewRect(rect: { x: number; y: number; width: number; height: number }) {
    await ShenaiSdkCapacitor.setViewRect(rect)
  }

  async function refreshMeasurementState() {
    if (!initialized.value) return MeasurementState.NOT_STARTED

    const readyResult = await ShenaiSdkCapacitor.isReadyToStartMeasurement().catch(() => ({ value: false }))
    ready.value = readyResult.value
    const state = await ShenaiSdkCapacitor.getMeasurementState()
    const progressResult = await ShenaiSdkCapacitor.getMeasurementProgressPercentage()

    progress.value = Math.round(progressResult.value ?? 0)
    measuring.value = state.value >= MeasurementState.RUNNING_SIGNAL_SHORT && state.value <= MeasurementState.FINALIZING

    if (state.value === MeasurementState.WAITING_FOR_FACE) {
      faceHint.value = 'Position your face in the frame'
    } else if (state.value === MeasurementState.NOT_STARTED && ready.value) {
      faceHint.value = 'Face detected - hold still'
    } else if (state.value === MeasurementState.RUNNING_SIGNAL_BAD) {
      faceHint.value = 'Signal is low - hold still'
    } else if (state.value === MeasurementState.RUNNING_SIGNAL_BAD_DEVICE_UNSTABLE) {
      faceHint.value = 'Hold your phone steady'
    } else if (state.value === MeasurementState.FINALIZING) {
      faceHint.value = 'Finalizing your results'
    }

    const liveResults = await ShenaiSdkCapacitor.getRealtimeMetrics({ periodSec: 10 }).catch(() => null)
    if (liveResults) vitalsResult.value = normalizeNativeResults(liveResults)

    if (state.value === MeasurementState.FINISHED) {
      const finalResults = await ShenaiSdkCapacitor.getMeasurementResults()
      vitalsResult.value = normalizeNativeResults(finalResults)
      measuring.value = false
      stopPolling()
      phase.value = 'results'
    }

    return state.value
  }

  async function getMeasurementResults(): Promise<NativeVitalsResult> {
    const results = await ShenaiSdkCapacitor.getMeasurementResults()
    vitalsResult.value = normalizeNativeResults(results)
    return vitalsResult.value
  }

  async function getMeasurementHistory(): Promise<MeasurementResultsHistory | null> {
    return await ShenaiSdkCapacitor.getMeasurementResultsHistory()
  }

  async function computeHealthRisks(input: NativeHealthRiskInput): Promise<HealthRisks> {
    return await ShenaiSdkCapacitor.computeHealthRisks({ risksFactors: toRiskFactors(input) })
  }

  async function stop() {
    stopPolling()
    if (initialized.value) {
      await ShenaiSdkCapacitor.deinitialize().catch(() => {})
    }
    initialized.value = false
    ready.value = false
    faceHint.value = 'Position your face in the frame'
    measuring.value = false
    progress.value = 0
    vitalsResult.value = emptyNativeVitalsResult()
  }

  return {
    initialize,
    startMeasurement,
    stopMeasurement,
    setViewRect,
    refreshMeasurementState,
    getMeasurementResults,
    getMeasurementHistory,
    computeHealthRisks,
    stop,
    ready,
    faceHint,
    initialized,
    measuring,
    progress,
    vitalsResult
  }
}