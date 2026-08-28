import {
  ShenaiSdkCapacitor,
  CameraMode,
  FamilyHistory,
  Gender,
  HypertensionTreatment,
  InitializationMode,
  InitializationResult,
  MeasurementState,
  MeasurementPreset,
  OnboardingMode,
  OperatingMode,
  ParentalHistory,
  PhysicalActivity,
  Race,
  Screen,
  type HealthRisks,
  type MeasurementResults,
  type MeasurementResultsHistory,
  type RisksFactors
} from '@shenai/capacitor-sdk'

// The native Capacitor bridge always resolves `{ value: <payload> }`, but the
// shipped typings claim the payload is returned directly.
function unwrap<T>(response: unknown): T | null {
  if (response == null) return null
  const value = (response as { value?: T }).value
  return value == null ? null : value
}

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
  gender?: 'male' | 'female' | 'other' | string
  cholesterol?: number
  cholesterolHdl?: number
  sbp?: number
  dbp?: number
  isSmoker?: boolean
  hasDiabetes?: boolean
  treatedBp?: boolean
  bodyHeight?: number
  bodyWeight?: number
  fastingGlucose?: number
  triglycerides?: number
  familyHistory?: string
  diet?: string
  activity?: string
}

function toParentalHistory(value?: string): ParentalHistory | undefined {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return undefined
  if (normalized.startsWith('none')) return ParentalHistory.NONE
  if (normalized.startsWith('one')) return ParentalHistory.ONE
  if (normalized.startsWith('both')) return ParentalHistory.BOTH
  return undefined
}

function toFamilyHistory(value?: string): FamilyHistory | undefined {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return undefined
  if (normalized.startsWith('none')) return FamilyHistory.NONE
  return FamilyHistory.FIRST_DEGREE
}

function toPhysicalActivity(value?: string): PhysicalActivity | undefined {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return undefined
  if (normalized.startsWith('sedentary')) return PhysicalActivity.SEDENTARY
  if (normalized.startsWith('light')) return PhysicalActivity.LIGHTLY_ACTIVE
  if (normalized.startsWith('moderate')) return PhysicalActivity.MODERATELY
  if (normalized.startsWith('very')) return PhysicalActivity.VERY_ACTIVE
  if (normalized.startsWith('extra')) return PhysicalActivity.EXTRA_ACTIVE
  return undefined
}

function toVegetableFruitDiet(value?: string): boolean | undefined {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return undefined
  return normalized.includes('vegetarian') || normalized.includes('vegan')
    || normalized.includes('balanced') || normalized.includes('mediterranean')
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

function positiveOrUndefined(value?: number) {
  return value != null && value > 0 ? value : undefined
}

function toRiskFactors(input: NativeHealthRiskInput): RisksFactors {
  const factors: RisksFactors = {
    age: input.age,
    cholesterol: positiveOrUndefined(input.cholesterol),
    cholesterolHdl: positiveOrUndefined(input.cholesterolHdl),
    // A 0 mmHg reading means "not measured yet"; sending it poisons the model.
    sbp: positiveOrUndefined(input.sbp),
    dbp: positiveOrUndefined(input.dbp),
    isSmoker: input.isSmoker,
    hypertensionTreatment: input.treatedBp === true
      ? HypertensionTreatment.YES
      : input.treatedBp === false
        ? HypertensionTreatment.NO
        : undefined,
    hasDiabetes: input.hasDiabetes,
    historyOfHypertension: input.treatedBp ?? undefined,
    historyOfHighGlucose: input.hasDiabetes ?? undefined,
    bodyHeight: positiveOrUndefined(input.bodyHeight),
    bodyWeight: positiveOrUndefined(input.bodyWeight),
    fastingGlucose: positiveOrUndefined(input.fastingGlucose),
    triglyceride: positiveOrUndefined(input.triglycerides),
    parentalHypertension: toParentalHistory(input.familyHistory),
    familyDiabetes: toFamilyHistory(input.familyHistory),
    physicalActivity: toPhysicalActivity(input.activity),
    vegetableFruitDiet: toVegetableFruitDiet(input.diet),
    gender: input.gender === 'female' ? Gender.FEMALE : input.gender === 'other' ? Gender.OTHER : Gender.MALE,
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
  const vitals = useVitals()
  const { userId } = useCurrentUser()
  const { saveScan } = useHealthStore()
  const initialized = useState<boolean>('shenai_cap_initialized', () => false)
  const ready = useState<boolean>('shenai_cap_ready', () => false)
  const faceHint = useState<string>('shenai_cap_faceHint', () => 'Position your face in the frame')
  const measuring = useState<boolean>('shenai_cap_measuring', () => false)
  const progress = useState<number>('shenai_cap_progress', () => 0)
  const vitalsResult = useState<NativeVitalsResult>('shenai_cap_vitalsResult', emptyNativeVitalsResult)
  const lastScanDate = useState<string | null>('shenai_cap_lastScanDate', () => null)
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let pollInFlight = false

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function startPolling() {
    stopPolling()
    pollTimer = setInterval(() => {
      if (!pollInFlight) void refreshMeasurementState()
    }, 300)
  }

  async function initialize(member: string = userId.value) {
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
      userId: member,
      settings: {
        cameraMode: CameraMode.FACING_USER,
        initializationMode: InitializationMode.MEASUREMENT,
        measurementPreset: MeasurementPreset.ONE_MINUTE_ALL_METRICS,
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
    applyVitalsResult(emptyNativeVitalsResult())

    await ShenaiSdkCapacitor.setScreen({ screen: Screen.MEASUREMENT })
    await Promise.all([
      ShenaiSdkCapacitor.setShowUserInterface({ value: false }),
      ShenaiSdkCapacitor.setShowFacePositioningOverlay({ value: false }),
      ShenaiSdkCapacitor.setShowVisualWarnings({ value: false }),
      ShenaiSdkCapacitor.setShowStartStopButton({ value: false }),
      ShenaiSdkCapacitor.setShowInfoButton({ value: false })
    ]).catch((settingsError) => {
      console.warn('[ShenAI] Could not hide native controls:', settingsError)
    })
    await ShenaiSdkCapacitor.resetMeasurementSession().catch(() => {})
    await ShenaiSdkCapacitor.setOperatingMode({ operatingMode: OperatingMode.POSITIONING })
    // Keep the native camera surface behind the WebView so our custom controls
    // and face-positioning guide remain visible above it.
    await ShenaiSdkCapacitor.setOverlaysWebview({ overlay: false }).catch(() => {})
    startPolling()
  }

  async function startMeasurement() {
    if (!ready.value) return false
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

  async function getMeasurementResultsWithRetry(attempts = 5, delayMs = 250): Promise<MeasurementResults | null> {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const response = await ShenaiSdkCapacitor.getMeasurementResults().catch(() => null)
      const results = unwrap<MeasurementResults>(response)
      if (results) return results
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    return null
  }

  async function refreshMeasurementState() {
    if (!initialized.value) return MeasurementState.NOT_STARTED

    pollInFlight = true
    try {
      return await refreshMeasurementStateInternal()
    } finally {
      pollInFlight = false
    }
  }

  async function refreshMeasurementStateInternal() {
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

    const [liveResponse, heartRate10s, heartRate4s] = await Promise.all([
      ShenaiSdkCapacitor.getRealtimeMetrics({ periodSec: 10 }).catch(() => null),
      ShenaiSdkCapacitor.getHeartRate10s().catch(() => ({ value: null })),
      ShenaiSdkCapacitor.getHeartRate4s().catch(() => ({ value: null }))
    ])
    const liveResults = unwrap<MeasurementResults>(liveResponse)
    if (liveResults || heartRate10s.value != null || heartRate4s.value != null) {
      const next = normalizeNativeResults(liveResults)
      const latestHeartRate = heartRate4s.value ?? heartRate10s.value ?? liveResults?.heartRateBpm
      if (latestHeartRate != null) next.heartRate = roundOrZero(latestHeartRate)
      applyVitalsResult({
        ...vitalsResult.value,
        ...next,
        heartRate: latestHeartRate != null ? next.heartRate : vitalsResult.value.heartRate,
        bloodPressure: liveResults?.systolicBloodPressureMmhg != null && liveResults?.diastolicBloodPressureMmhg != null
          ? next.bloodPressure
          : vitalsResult.value.bloodPressure,
        systolic: liveResults?.systolicBloodPressureMmhg != null ? next.systolic : vitalsResult.value.systolic,
        diastolic: liveResults?.diastolicBloodPressureMmhg != null ? next.diastolic : vitalsResult.value.diastolic,
        hrv: liveResults?.hrvSdnnMs != null ? next.hrv : vitalsResult.value.hrv,
        stress: liveResults?.stressIndex != null ? next.stress : vitalsResult.value.stress,
        breathingRate: liveResults?.breathingRateBpm != null ? next.breathingRate : vitalsResult.value.breathingRate
      })
    }

    if (state.value === MeasurementState.FINISHED) {
      // The native side can briefly return null right after FINISHED is
      // reported, before the final results are actually computed - retry
      // instead of overwriting the last known-good (real-time) values with zeros.
      const finalResults = await getMeasurementResultsWithRetry()
      if (finalResults) {
        applyVitalsResult(mergeNativeResults(vitalsResult.value, finalResults))
      }
      measuring.value = false
      stopPolling()
      await persistCurrentScan()
      phase.value = 'results'
    }

    return state.value
  }

  async function getMeasurementResults(): Promise<NativeVitalsResult> {
    const response = await ShenaiSdkCapacitor.getMeasurementResults()
    applyVitalsResult(mergeNativeResults(vitalsResult.value, unwrap<MeasurementResults>(response)))
    return vitalsResult.value
  }

  function mergeNativeResults(previous: NativeVitalsResult, results: MeasurementResults | null): NativeVitalsResult {
    if (!results) return previous

    const next = normalizeNativeResults(results)
    return {
      heartRate: results.heartRateBpm != null ? next.heartRate : previous.heartRate,
      systolic: results.systolicBloodPressureMmhg != null ? next.systolic : previous.systolic,
      diastolic: results.diastolicBloodPressureMmhg != null ? next.diastolic : previous.diastolic,
      bloodPressure: results.systolicBloodPressureMmhg != null && results.diastolicBloodPressureMmhg != null
        ? next.bloodPressure
        : previous.bloodPressure,
      hrv: results.hrvSdnnMs != null ? next.hrv : previous.hrv,
      stress: results.stressIndex != null ? next.stress : previous.stress,
      breathingRate: results.breathingRateBpm != null ? next.breathingRate : previous.breathingRate
    }
  }

  async function persistCurrentScan() {
    const result = vitalsResult.value
    if (!result.heartRate) return

    const scanDate = new Date().toISOString()
    await saveScan({ ...result, scanDate, wellness: wellnessScore(result) })
      .then(() => {
        lastScanDate.value = scanDate
      })
      .catch((storageError) => {
        console.warn('[ShenAI] Could not persist scan locally:', storageError)
      })
  }

  // Populates the live vitals from a previously stored scan so a returning
  // member sees their last results without running the camera.
  function applyStoredScan(scan: StoredScan) {
    applyVitalsResult({
      heartRate: scan.heartRate,
      systolic: scan.systolic,
      diastolic: scan.diastolic,
      bloodPressure: scan.bloodPressure,
      hrv: scan.hrv,
      stress: scan.stress,
      breathingRate: scan.breathingRate
    })
    lastScanDate.value = scan.scanDate
  }

  function applyVitalsResult(result: NativeVitalsResult) {
    vitalsResult.value = result
    vitals.heartRate.value = result.heartRate
    vitals.systolic.value = result.systolic
    vitals.diastolic.value = result.diastolic
    vitals.stress.value = result.stress
    vitals.respiration.value = result.breathingRate
    vitals.hrv.value = result.hrv
  }

  async function getMeasurementHistory(): Promise<MeasurementResultsHistory | null> {
    const response = await ShenaiSdkCapacitor.getMeasurementResultsHistory()
    const history = unwrap<MeasurementResultsHistory['history']>(response)
    return history ? { history } : null
  }

  async function computeHealthRisks(input: NativeHealthRiskInput): Promise<HealthRisks | null> {
    if (!initialized.value) {
      throw new Error('Shen.AI is not running. Start a scan before calculating your health risks.')
    }
    const response = await ShenaiSdkCapacitor.computeHealthRisks({ risksFactors: toRiskFactors(input) })
    return unwrap<HealthRisks>(response)
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
    applyVitalsResult(emptyNativeVitalsResult())
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
    applyStoredScan,
    stop,
    ready,
    faceHint,
    initialized,
    measuring,
    progress,
    lastScanDate,
    vitalsResult
  }
}