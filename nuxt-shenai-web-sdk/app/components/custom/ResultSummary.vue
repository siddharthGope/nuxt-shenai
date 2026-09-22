<script setup lang="ts">
const { phase } = useScanState()
const { stop, initialize, computeHealthRisks } = useShenAICustomUI()
const { heartRate, systolic, diastolic, stress, hrv } = useVitals()

type Status = { label: string; tone: 'good' | 'warn' | 'bad' }

const hrStatus = computed<Status>(() => {
  const v = heartRate.value
  if (v >= 60 && v <= 100) return { label: 'Normal', tone: 'good' }
  if ((v > 100 && v <= 110) || (v >= 50 && v < 60)) return { label: 'Slightly elevated', tone: 'warn' }
  return { label: 'Out of range', tone: 'bad' }
})

const bpStatus = computed<Status>(() => {
  const s = systolic.value
  const d = diastolic.value
  if (s < 120 && d < 80) return { label: 'Normal', tone: 'good' }
  if (s < 130 && d < 80) return { label: 'Slightly elevated', tone: 'warn' }
  return { label: 'Elevated', tone: 'bad' }
})

const hrvStatus = computed<Status>(() => {
  const v = hrv.value
  if (v >= 60) return { label: 'Good', tone: 'good' }
  if (v >= 40) return { label: 'Fair', tone: 'warn' }
  return { label: 'Low', tone: 'bad' }
})

const stressStatus = computed<Status>(() => {
  const v = stress.value
  if (v < 2) return { label: 'Low', tone: 'good' }
  if (v < 4) return { label: 'Slightly elevated', tone: 'warn' }
  return { label: 'High', tone: 'bad' }
})

const toneScore = (t: Status['tone']) => (t === 'good' ? 90 : t === 'warn' ? 74 : 56)

const wellness = computed(() =>
  Math.round(
    (toneScore(hrStatus.value.tone) +
      toneScore(bpStatus.value.tone) +
      toneScore(hrvStatus.value.tone) +
      toneScore(stressStatus.value.tone)) /
      4
  )
)

const showWellnessInfo = ref(false)
const showHypertensionInfo = ref(false)
const showDiabetesInfo = ref(false)
const showDiabetesForm = ref(false)
const diabetesFormSubmitted = ref(false)
const showHypertensionForm = ref(false)
const hypertensionFormSubmitted = ref(false)
const activeMetricInfo = ref<'heartRate' | 'bloodPressure' | 'hrv' | 'stress' | null>(null)

const metricInfo = computed(() => {
  switch (activeMetricInfo.value) {
    case 'heartRate':
      return {
        title: 'Heart Rate',
        description: 'Measures average heartbeats per minute, reflecting autonomic nervous system activity and cardiovascular fitness.',
        value: heartRate.value,
        unit: 'bpm',
        range: 'Normal resting range: 60-100 bpm'
      }
    case 'bloodPressure':
      return {
        title: 'Blood Pressure',
        description: 'Measures blood pressure between heartbeats, which is important for assessing cardiovascular health.',
        value: `${systolic.value}/${diastolic.value}`,
        unit: 'mmHg',
        range: 'Normal range: below 120/80 mmHg'
      }
    case 'hrv':
      return {
        title: 'Heart Rate Variability',
        description: 'Measures variation in the time between heartbeats, reflecting autonomic nervous system activity.',
        value: hrv.value,
        unit: 'ms',
        range: 'HRV has no universal normal range - it varies by age, time of day, and lifestyle.'
      }
    case 'stress':
      return {
        title: 'Stress Index',
        description: 'Indicates whether the body is under stress or functioning normally.',
        value: stress.value,
        unit: '',
        range: 'Normal range: 0-4'
      }
    default:
      return null
  }
})

const hypertensionRisk = computed(() => (bpStatus.value.tone === 'bad' ? 7 : bpStatus.value.tone === 'warn' ? 3.5 : 1.5))
const diabetesRisk = 3

const wellnessInterpretation = computed(() => {
  if (wellness.value >= 61) {
    return {
      label: 'Excellent',
      text: 'Key health parameters are in ideal ranges, and you likely have strong protective factors against chronic disease and aging related risks.'
    }
  }

  if (wellness.value >= 41) {
    return {
      label: 'Moderate',
      text: 'Your results suggest there is room to improve some health parameters. Small, consistent lifestyle changes can support your overall wellbeing.'
    }
  }

  return {
    label: 'Needs attention',
    text: 'Your results suggest that some health parameters may need attention. Speak with a healthcare professional about your results and next steps.'
  }
})

const riskCards = [
  // 'Cardiovascular Disease Risk',
  'Diabetes Risk',
  'Hypertension Risk'
]

const visibleRiskCards = computed(() =>
  riskCards.filter((card) =>
    (cardioRisk.value != null || card !== 'Cardiovascular Disease Risk') && card !== 'Hypertension Risk' && card !== 'Diabetes Risk'
  )
)

const showCardioRiskForm = ref(false)
const cardioRisk = ref<number | null>(null)
const cardioRiskError = ref('')
const cardioRiskForm = reactive({
  smoker: '',
  diabetes: '',
  treatedBp: '',
  totalCholesterol: '',
  hdl: '',
  height: '',
  weight: ''
})
const diabetesForm = reactive({
  fastingGlucose: '',
  hba1c: '',
  triglycerides: ''
})
const hypertensionForm = reactive({
  smoker: '',
  familyHistory: '',
  height: '',
  weight: ''
})

const insight = computed(() => {
  const bpRaised = bpStatus.value.tone !== 'good'
  const stressRaised = stressStatus.value.tone !== 'good'
  if (bpRaised && stressRaised) return "Your blood pressure and stress level are both a touch elevated; let's keep an eye on those."
  if (bpRaised) return "Your blood pressure is a touch elevated; let's keep an eye on it."
  if (stressRaised) return "Your stress level is a touch elevated; let's keep an eye on it."
  return "Your key vitals are looking steady; keep tracking them over time."
})

function close() {
  // Return to the start screen.
  stop()
}

function openRiskCard(card: string) {
  if (card === 'Cardiovascular Disease Risk') {
    showCardioRiskForm.value = true
  }
}

function submitDiabetesForm() {
  diabetesFormSubmitted.value = true
  showDiabetesForm.value = false
}

function submitHypertensionForm() {
  hypertensionFormSubmitted.value = true
  showHypertensionForm.value = false
}

function submitCardioRiskForm() {
  cardioRiskError.value = ''

  try {
    const risks = computeHealthRisks({
      age: 46,
      sbp: systolic.value,
      dbp: diastolic.value,
      isSmoker: cardioRiskForm.smoker === 'yes',
      hasDiabetes: cardioRiskForm.diabetes === 'yes',
      treatedBp: cardioRiskForm.treatedBp === 'yes',
      cholesterol: toNumber(cardioRiskForm.totalCholesterol),
      cholesterolHdl: toNumber(cardioRiskForm.hdl),
      bodyHeight: toNumber(cardioRiskForm.height),
      bodyWeight: toNumber(cardioRiskForm.weight)
    })

    const overallRisk = risks?.cvDiseases?.overallRisk
    cardioRisk.value = typeof overallRisk === 'number' ? normalizeRiskPercent(overallRisk) : null
    showCardioRiskForm.value = false
  } catch (error) {
    cardioRiskError.value = error instanceof Error ? error.message : 'Could not calculate cardiovascular risk.'
  }
}

function normalizeRiskPercent(value: number) {
  const percent = value <= 1 ? value * 100 : value
  return Math.round(percent * 10) / 10
}

function toNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && value.trim() !== '' ? parsed : undefined
}

async function scanAgain() {
  // Restart a fresh scan; the persistent #mxcanvas keeps the SDK binding valid.
  phase.value = 'scanning'
  try {
    await initialize()
  } catch {
    phase.value = 'camera'
  }
}
</script>

<template>
  <div class="profile">
    <header class="p-top">
      <button class="icon-btn" aria-label="Close" @click="close">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div class="brand">Lumi AI</div>
      <div class="avatar">J</div>
    </header>

    <div class="p-body">
      <div class="hero">
        <span class="check">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <h2>Your Health Profile</h2>
      </div>

      <p class="lead">Scan complete — here's your latest health profile.</p>

      <button class="pill" @click="scanAgain">Scan Again</button>

      <div class="score-card">
        <div class="score-info">
          <div class="score-k">
            <span>WELLNESS SCORE</span>
            <button class="score-info-btn" type="button" aria-label="About Wellness Score" @click="showWellnessInfo = true">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5M12 8h.01" />
              </svg>
            </button>
          </div>
          <div class="score-v">{{ wellness }}<small> / 100</small></div>
        </div>
        <div class="ring" :style="{ '--p': wellness }">
          <span>{{ wellness }}</span>
        </div>
        <svg class="chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>

      <p class="lead">Your Wellness Score is <b>{{ wellness }}</b> — you're doing well overall.</p>

      <div class="grid">
        <div class="metric-card">
          <div class="mc-top">
            <span>Heart Rate</span>
            <button class="metric-info-button" type="button" aria-label="About Heart Rate" @click="activeMetricInfo = 'heartRate'">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5M12 8h.01" />
              </svg>
            </button>
          </div>
          <div class="mc-v">{{ heartRate }}<small>bpm</small></div>
          <div class="mc-status" :class="hrStatus.tone"><span class="dot" />{{ hrStatus.label }}</div>
        </div>

        <div class="metric-card">
          <div class="mc-top">
            <span>Blood Pressure (est.)</span>
            <button class="metric-info-button" type="button" aria-label="About Blood Pressure" @click="activeMetricInfo = 'bloodPressure'">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5M12 8h.01" />
              </svg>
            </button>
          </div>
          <div class="mc-v">{{ systolic }}/{{ diastolic }}</div>
          <div class="mc-status" :class="bpStatus.tone"><span class="dot" />{{ bpStatus.label }}</div>
        </div>

        <div class="metric-card">
          <div class="mc-top">
            <span>Heart Rate Variability</span>
            <button class="metric-info-button" type="button" aria-label="About Heart Rate Variability" @click="activeMetricInfo = 'hrv'">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5M12 8h.01" />
              </svg>
            </button>
          </div>
          <div class="mc-v">{{ hrv }}<small>ms</small></div>
          <div class="mc-status" :class="hrvStatus.tone"><span class="dot" />{{ hrvStatus.label }}</div>
        </div>

        <div class="metric-card">
          <div class="mc-top">
            <span>Stress Level</span>
            <button class="metric-info-button" type="button" aria-label="About Stress Index" @click="activeMetricInfo = 'stress'">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5M12 8h.01" />
              </svg>
            </button>
          </div>
          <div class="mc-v">{{ stress }}</div>
          <div class="mc-status" :class="stressStatus.tone"><span class="dot" />{{ stressStatus.label }}</div>
        </div>
      </div>

      <p class="insight">{{ insight }}</p>

      <div class="risk-list" aria-label="Risk assessment information">
        <button
          v-if="cardioRisk != null"
          class="risk-card risk-card-result"
          type="button"
          @click="openRiskCard('Cardiovascular Disease Risk')"
        >
          <span>
            <strong>Cardiovascular Disease Risk</strong>
            <b>{{ cardioRisk }}<small>%</small></b>
            <i class="risk-meter" :style="{ '--risk': cardioRisk }">
              <em />
            </i>
          </span>
          <i class="risk-chevron" />
        </button>
<!-- hyper tension card / diabetes risk -->
        <button v-if="!diabetesFormSubmitted" class="risk-card diabetes-start-card" type="button" @click="showDiabetesForm = true">
          <span>
            <strong>Diabetes Risk Assessment</strong>
            <small>Tap to start</small>
          </span>
          <svg class="assessment-edit" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
          </svg>
        </button>

        <div v-else class="risk-card assessment-card diabetes-card">
          <div class="risk-card-heading">
            <strong>Diabetes Risk</strong>
            <button class="risk-info-button" type="button" aria-label="About Diabetes Risk" @click="showDiabetesInfo = true">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5M12 8h.01" />
              </svg>
            </button>
          </div>
          <b>{{ diabetesRisk }}<small>%</small></b>
          <span class="risk-level">Low Risk</span>
          <i class="risk-meter" :style="{ '--risk': diabetesRisk }"><em /></i>
          <small class="risk-updated">Last updated: 08 Sept, 2026</small>
        </div>

        <!-- Hypertension Risk Assessment -->
        <button v-if="!hypertensionFormSubmitted" class="risk-card hypertension-start-card" type="button" @click="showHypertensionForm = true">
          <span>
            <strong>Hypertension Risk Assessment</strong>
            <small>Tap to start</small>
          </span>
          <svg class="assessment-edit" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
          </svg>
        </button>

        <div v-else class="risk-card hypertension-card">
          <div class="risk-card-heading">
            <strong>Hypertension Risk</strong>
            <button class="risk-info-button" type="button" aria-label="About Hypertension Risk" @click="showHypertensionInfo = true">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5M12 8h.01" />
              </svg>
            </button>
          </div>
          <b>{{ hypertensionRisk }}<small>%</small></b>
          <span class="risk-level">Low Risk</span>
          <i class="risk-meter" :style="{ '--risk': hypertensionRisk }"><em /></i>
          <small class="risk-updated">Last updated: 08 Sept, 2026</small>
        </div>

        <button v-for="card in visibleRiskCards" :key="card" class="risk-card" type="button" @click="openRiskCard(card)">
          <svg class="risk-lock" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          <span>
            <strong>{{ card }}</strong>
            <small>Missing information</small>
          </span>
        </button>
      </div>

      <section class="next-steps" aria-labelledby="next-steps-title">
        <h3 id="next-steps-title">Next Steps</h3>
        <p>Book a doctor or explore your Wellness Hub for personalised guidance.</p>
        <div class="next-actions">
          <button class="primary-action" type="button">See a Doctor</button>
          <button class="secondary-action" type="button">Explore Wellness Hub</button>
        </div>
      </section>
    </div>

    <div v-if="showCardioRiskForm" class="risk-modal" role="dialog" aria-modal="true" aria-labelledby="cardio-risk-title" @click.self="showCardioRiskForm = false">
      <form class="risk-sheet" @submit.prevent="submitCardioRiskForm">
        <h3 id="cardio-risk-title">Missing Information</h3>
        <p>A few more details to calculate your Cardiovascular Risk Score.</p>

        <div class="risk-chips" aria-label="Known details">
          <span>Age <b>46</b></span>
          <span>Gender <b>Male</b></span>
          <span>Systolic BP <b>{{ systolic }} mmHg</b></span>
        </div>

        <fieldset class="choice-group">
          <legend>Current Smoker</legend>
          <div class="choice-row">
            <button type="button" :class="{ selected: cardioRiskForm.smoker === 'yes' }" @click="cardioRiskForm.smoker = 'yes'">Yes</button>
            <button type="button" :class="{ selected: cardioRiskForm.smoker === 'no' }" @click="cardioRiskForm.smoker = 'no'">No</button>
          </div>
        </fieldset>

        <fieldset class="choice-group">
          <legend>Diabetes</legend>
          <div class="choice-row">
            <button type="button" :class="{ selected: cardioRiskForm.diabetes === 'yes' }" @click="cardioRiskForm.diabetes = 'yes'">Yes</button>
            <button type="button" :class="{ selected: cardioRiskForm.diabetes === 'no' }" @click="cardioRiskForm.diabetes = 'no'">No</button>
          </div>
        </fieldset>

        <fieldset class="choice-group">
          <legend>Treated for High Blood Pressure</legend>
          <div class="choice-row">
            <button type="button" :class="{ selected: cardioRiskForm.treatedBp === 'yes' }" @click="cardioRiskForm.treatedBp = 'yes'">Yes</button>
            <button type="button" :class="{ selected: cardioRiskForm.treatedBp === 'no' }" @click="cardioRiskForm.treatedBp = 'no'">No</button>
          </div>
        </fieldset>

        <div class="risk-input-grid">
          <label>
            <span>Total Cholesterol (mg/dL)</span>
            <input v-model="cardioRiskForm.totalCholesterol" inputmode="numeric" placeholder="e.g. 180" />
          </label>
          <label>
            <span>HDL (mg/dL)</span>
            <input v-model="cardioRiskForm.hdl" inputmode="numeric" placeholder="e.g. 50" />
          </label>
          <label>
            <span>Height (cm)</span>
            <input v-model="cardioRiskForm.height" inputmode="numeric" placeholder="e.g. 165" />
          </label>
          <label>
            <span>Weight (kg)</span>
            <input v-model="cardioRiskForm.weight" inputmode="numeric" placeholder="e.g. 68" />
          </label>
        </div>

        <p class="risk-note">Cholesterol and HDL give the most accurate score; height and weight (BMI) can be used instead if you do not have lab values on hand.</p>

        <p v-if="cardioRiskError" class="risk-error">{{ cardioRiskError }}</p>

        <button class="submit-risk" type="submit">Submit</button>
      </form>
    </div>

    <!-- wellness score modal -->
    <div v-if="showWellnessInfo" class="wellness-modal" role="dialog" aria-modal="true" aria-labelledby="wellness-info-title" @click.self="showWellnessInfo = false">
      <section class="wellness-sheet">
        <div class="wellness-sheet-head">
          <h3 id="wellness-info-title">Wellness Score</h3>
          <button class="wellness-close" type="button" aria-label="Close Wellness Score information" @click="showWellnessInfo = false">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <p class="wellness-description">An indication of your overall wellbeing based on this assessment.</p>
        <p class="wellness-disclaimer">It is not a diagnosis or a substitute for medical advice. Speak with a healthcare professional if you have concerns.</p>

        <div class="wellness-modal-score">
          <div class="wellness-ring" :style="{ '--p': wellness }"><span>{{ wellness }}</span><small>out of 100</small></div>
        </div>

        <p class="wellness-result"><strong>Result Interpretation:</strong> {{ wellnessInterpretation.label }}; {{ wellnessInterpretation.text }}</p>

        <div class="wellness-scale" aria-label="Wellness Score grading scale">
          <div><span class="scale-colour green" /> <strong>61-100</strong><small>Above-average wellness</small></div>
          <div><span class="scale-colour yellow" /> <strong>41-60</strong><small>Moderate wellness</small></div>
          <div><span class="scale-colour red" /> <strong>0-40</strong><small>Below-average wellness</small></div>
        </div>
      </section>
    </div>

  <!-- metric info modal -->
    <div v-if="metricInfo" class="hypertension-modal" role="dialog" aria-modal="true" :aria-labelledby="`${activeMetricInfo}-info-title`" @click.self="activeMetricInfo = null">
      <section class="metric-info-sheet">
        <div class="wellness-sheet-head">
          <h3 :id="`${activeMetricInfo}-info-title`">{{ metricInfo.title }}</h3>
          <button class="wellness-close" type="button" :aria-label="`Close ${metricInfo.title} information`" @click="activeMetricInfo = null">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <p class="metric-info-description">{{ metricInfo.description }}</p>
        <div class="metric-info-value"><strong>{{ metricInfo.value }}</strong><span>{{ metricInfo.unit }}</span></div>
        <div class="metric-info-meter"><span /></div>
        <p class="metric-info-range">{{ metricInfo.range }}</p>
      </section>
    </div>
<!-- show hypertension info modal -->
    <div v-if="showHypertensionInfo" class="hypertension-modal" role="dialog" aria-modal="true" aria-labelledby="hypertension-info-title" @click.self="showHypertensionInfo = false">
      <section class="hypertension-sheet">
        <div class="wellness-sheet-head">
          <h3 id="hypertension-info-title">Hypertension Risk</h3>
          <button class="wellness-close" type="button" aria-label="Close Hypertension Risk information" @click="showHypertensionInfo = false">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <p class="hypertension-description">Assesses the risk of high blood pressure and related cardiovascular issues. Score is based on Framingham Heart Study.</p>

        <div class="hypertension-score"><strong>{{ hypertensionRisk }}</strong><span>%</span></div>
        <div class="hypertension-meter" :style="{ '--risk': hypertensionRisk }"><span /></div>

        <button class="assess-again" type="button" @click="showHypertensionInfo = false; showHypertensionForm = true">Assess Again</button>
      </section>
    </div>

    <!-- Hypertension Risk Assessment Form -->
    <div v-if="showHypertensionForm" class="risk-modal" role="dialog" aria-modal="true" aria-labelledby="hypertension-form-title" @click.self="showHypertensionForm = false">
      <form class="risk-sheet hypertension-form-sheet" @submit.prevent="submitHypertensionForm">
        <div class="wellness-sheet-head">
          <h3 id="hypertension-form-title">Hypertension Risk</h3>
          <button class="wellness-close" type="button" aria-label="Close Hypertension Risk assessment" @click="showHypertensionForm = false">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <p class="hypertension-description">Assesses the risk of high blood pressure and related cardiovascular issues.</p>

        <p class="diabetes-form-subtitle">What we already know</p>
        <div class="risk-chips" aria-label="Known details">
          <span>Age <b>46</b></span>
          <span>Gender <b>Male</b></span>
          <span>Blood Pressure <b>{{ systolic }}/{{ diastolic }} mmHg</b></span>
        </div>

        <p class="diabetes-form-subtitle">Lifestyle &amp; History</p>
        <fieldset class="choice-group">
          <legend>Current smoker</legend>
          <div class="choice-row">
            <button type="button" :class="{ selected: hypertensionForm.smoker === 'yes' }" @click="hypertensionForm.smoker = 'yes'">Yes</button>
            <button type="button" :class="{ selected: hypertensionForm.smoker === 'no' }" @click="hypertensionForm.smoker = 'no'">No</button>
          </div>
        </fieldset>

        <fieldset class="choice-group">
          <legend>Hypertension in either parent</legend>
          <div class="choice-row">
            <button type="button" :class="{ selected: hypertensionForm.familyHistory === 'yes' }" @click="hypertensionForm.familyHistory = 'yes'">Yes</button>
            <button type="button" :class="{ selected: hypertensionForm.familyHistory === 'no' }" @click="hypertensionForm.familyHistory = 'no'">No</button>
          </div>
        </fieldset>

        <div class="risk-input-grid">
          <label>
            <span>Height (cm)</span>
            <input v-model="hypertensionForm.height" inputmode="numeric" placeholder="e.g. 170" />
          </label>
          <label>
            <span>Weight (kg)</span>
            <input v-model="hypertensionForm.weight" inputmode="numeric" placeholder="e.g. 90" />
          </label>
        </div>

        <button class="submit-risk hypertension-submit" type="submit">Submit</button>
      </form>
    </div>

    <!-- diabetes risk info modal -->
    <div v-if="showDiabetesInfo" class="hypertension-modal" role="dialog" aria-modal="true" aria-labelledby="diabetes-info-title" @click.self="showDiabetesInfo = false">
      <section class="hypertension-sheet">
        <div class="wellness-sheet-head">
          <h3 id="diabetes-info-title">Diabetes Risk</h3>
          <button class="wellness-close" type="button" aria-label="Close Diabetes Risk information" @click="showDiabetesInfo = false">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <p class="hypertension-description">Estimates the risk of developing diabetes. Score is based on Framingham Diabetes Risk Score and Finnish Diabetes Risk Score (FINDRISC)</p>

        <div class="hypertension-score"><strong>{{ diabetesRisk }}</strong><span>%</span></div>
        <div class="hypertension-meter" :style="{ '--risk': diabetesRisk }"><span /></div>

        <button class="assess-again" type="button" @click="showDiabetesInfo = false; showDiabetesForm = true">Assess Again</button>
      </section>
    </div>

    <!-- Diabetes Form  -->
    <div v-if="showDiabetesForm" class="risk-modal" role="dialog" aria-modal="true" aria-labelledby="diabetes-form-title" @click.self="showDiabetesForm = false">
      <form class="risk-sheet diabetes-form-sheet" @submit.prevent="submitDiabetesForm">
        <div class="wellness-sheet-head">
          <h3 id="diabetes-form-title">Diabetes Risk</h3>
          <button class="wellness-close" type="button" aria-label="Close Diabetes Risk assessment" @click="showDiabetesForm = false">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <p class="diabetes-form-subtitle">What we already know</p>
        <div class="risk-chips" aria-label="Known details">
          <span>Age <b>46</b></span>
          <span>Gender <b>Male</b></span>
          <span>Blood Pressure <b>{{ systolic }}/{{ diastolic }} mmHg</b></span>
        </div>

        <p class="diabetes-form-subtitle">Health Parameters</p>
        <p class="diabetes-form-hint">Check in your latest reports</p>
        <div class="risk-input-grid">
          <label>
            <span>Fasting Glucose (mg/dL)</span>
            <input v-model="diabetesForm.fastingGlucose" inputmode="numeric" placeholder="e.g. 95" />
          </label>
          <label>
            <span>HbA1c (%)</span>
            <input v-model="diabetesForm.hba1c" inputmode="decimal" placeholder="e.g. 5.4" />
          </label>
          <label>
            <span>Triglycerides (mg/dL)</span>
            <input v-model="diabetesForm.triglycerides" inputmode="numeric" placeholder="e.g. 95" />
          </label>
        </div>

        <p class="diabetes-form-subtitle">Lifestyle &amp; History</p>
        <p class="diabetes-form-hint">Add details from your health history if available.</p>
        <button class="submit-risk diabetes-submit" type="submit">Submit</button>
      </form>
    </div>

    <div class="ask-bar">
      <span class="ask-ph">Ask Lumi AI</span>
      <div class="ask-actions">
        <button class="ask-menu" aria-label="Menu">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <button class="ask-mic" aria-label="Voice">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M8 6v12M12 3v18M16 8v8M20 11v2M4 10v4" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile {
  width: 100%;
  max-width: 400px;
  max-height: calc(100vh - 32px);
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.p-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
}
.icon-btn {
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  display: grid;
  place-items: center;
}
.brand { font-weight: 700; font-size: 1.05rem; }
.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  display: grid;
  place-items: center;
}

.p-body {
  padding: 4px 20px 24px;
  overflow-y: auto;
}

.hero { display: flex; align-items: center; gap: 10px; }
.check {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #16a34a;
  color: #fff;
  display: grid;
  place-items: center;
}
.hero h2 { margin: 0; font-size: 1.35rem; }
.lead { color: var(--muted); line-height: 1.5; margin: 12px 0; }

.pill {
  border: 1px solid #d7dce3;
  background: #fff;
  color: var(--text);
  font-weight: 600;
  padding: 10px 20px;
  border-radius: 999px;
  cursor: pointer;
}

.score-card {
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #eef2f7;
  border-radius: 18px;
  padding: 18px;
  margin-top: 18px;
}
.score-info { flex: 1; }
.score-k { display: flex; align-items: center; gap: 5px; font-size: 0.7rem; letter-spacing: 0.06em; color: var(--muted); font-weight: 600; }
.score-info-btn {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}
.score-info-btn:hover { color: var(--text); }
.score-v { font-size: 2rem; font-weight: 800; }
.score-v small { font-size: 1rem; font-weight: 500; color: var(--muted); }
.ring {
  --p: 0;
  width: 66px;
  height: 66px;
  border-radius: 50%;
  background: conic-gradient(#0f172a calc(var(--p) * 1%), #e5e7eb 0);
  display: grid;
  place-items: center;
  position: relative;
}
.ring::before { content: ''; position: absolute; inset: 9px; background: var(--surface); border-radius: 50%; }
.ring span { position: relative; font-weight: 700; font-size: 0.95rem; }
.chev { color: #94a3b8; }

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 6px;
}
.metric-card {
  border: 1px solid #eef2f7;
  border-radius: 16px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.mc-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--muted);
}
.metric-info-button {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #737980;
  cursor: pointer;
}
.metric-info-button:hover { color: var(--text); }
.chev-sm {
  width: 8px;
  height: 8px;
  border-top: 2px solid #cbd5e1;
  border-right: 2px solid #cbd5e1;
  transform: rotate(45deg);
  flex: none;
  margin-top: 3px;
}
.mc-v { font-size: 1.6rem; font-weight: 800; }
.mc-v small { font-size: 0.8rem; font-weight: 500; color: var(--muted); margin-left: 3px; }
.mc-status { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; color: #475569; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.mc-status.good .dot { background: #16a34a; }
.mc-status.warn .dot { background: #f59e0b; }
.mc-status.bad .dot { background: #dc2626; }

.insight {
  margin: 18px 0 16px;
  color: var(--text);
  line-height: 1.5;
}

.risk-list {
  display: grid;
  gap: 12px;
  margin-bottom: 12px;
}

.risk-card {
  width: 100%;
  min-height: 62px;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #fff;
  color: #c8520b;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  text-align: left;
  cursor: pointer;
}

.risk-lock { flex: none; }
.risk-card span { display: grid; gap: 3px; }
.risk-card strong {
  color: #858585;
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.risk-card small { color: #d45b0a; font-weight: 700; font-size: 0.82rem; }

.assessment-card {
  display: block;
  color: #001a33;
  cursor: default;
}
.diabetes-start-card {
  justify-content: space-between;
  min-height: 112px;
  color: #17191c;
  text-align: left;
}
.diabetes-start-card span { gap: 8px; }
.diabetes-start-card strong {
  color: #17191c;
  font-size: 1.05rem;
  letter-spacing: 0;
  text-transform: none;
}
.diabetes-start-card small {
  color: #55585d;
  font-size: 1rem;
  font-weight: 400;
}
.assessment-edit { color: #737980; flex: none; }
.diabetes-form-sheet { max-height: calc(100% - 32px); }
.diabetes-form-subtitle {
  margin: 16px 0 7px !important;
  color: #17191c !important;
  font-size: 0.78rem !important;
  font-weight: 700;
}
.diabetes-form-hint {
  margin: 0 0 9px !important;
  color: #737980 !important;
  font-size: 0.72rem !important;
}
.diabetes-submit { margin-top: 18px; }
.hypertension-start-card {
  justify-content: space-between;
  min-height: 112px;
  color: #17191c;
  text-align: left;
}
.hypertension-start-card span { gap: 8px; }
.hypertension-start-card strong {
  color: #17191c;
  font-size: 1.05rem;
  letter-spacing: 0;
  text-transform: none;
}
.hypertension-start-card small {
  color: #55585d;
  font-size: 1rem;
  font-weight: 400;
}
.hypertension-form-sheet { max-height: calc(100% - 32px); }
.hypertension-submit { margin-top: 18px; }
.risk-card-heading {
  display: flex;
  align-items: center;
  gap: 5px;
}
.risk-info-button {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #737980;
  cursor: pointer;
}
.assessment-card > b {
  display: inline-block;
  margin-top: 7px;
  color: #17191c;
  font-size: 1.75rem;
  line-height: 1;
}
.assessment-card > b small {
  color: #55585d;
  font-size: 0.9rem;
  font-weight: 500;
}
.risk-level {
  margin-left: 5px;
  color: #55585d;
  font-size: 0.82rem;
}
.risk-updated {
  display: block;
  margin-top: 8px;
  color: #55585d !important;
  font-size: 0.72rem !important;
  font-weight: 400 !important;
}

.hypertension-modal {
  position: absolute;
  inset: 0;
  z-index: 12;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.38);
}
.hypertension-sheet {
  width: 100%;
  padding: 26px 26px 40px;
  border-radius: 24px 24px 0 0;
  background: #fff;
  color: #17191c;
  box-shadow: 0 -18px 34px rgba(15, 23, 42, 0.18);
}
.hypertension-description {
  max-width: 330px;
  margin: 10px 0 26px;
  color: #55585d;
  font-size: 0.88rem;
  line-height: 1.35;
}
.hypertension-score {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  margin-bottom: 15px;
}
.hypertension-score strong {
  color: #17191c;
  font-size: 1.7rem;
}
.hypertension-score span {
  color: #55585d;
  font-size: 0.8rem;
}
.hypertension-meter {
  --risk: 0;
  position: relative;
  height: 8px;
  margin-bottom: 28px;
  border-radius: 999px;
  background: linear-gradient(90deg, #70c98d 0 33%, #f9c638 33% 66%, #ef4d78 66% 100%);
}
.hypertension-meter span {
  position: absolute;
  top: 50%;
  left: clamp(7px, calc(var(--risk) * 1%), calc(100% - 7px));
  width: 17px;
  height: 17px;
  border: 1px solid #e4e7e9;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
  transform: translate(-50%, -50%);
}
.assess-again {
  width: 100%;
  height: 57px;
  border: 0;
  border-radius: 999px;
  background: #001a33;
  color: #fff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.risk-card-result {
  align-items: flex-start;
  color: #001a33;
}

.risk-card-result span {
  width: 100%;
}

.risk-card-result b {
  color: #001a33;
  font-size: 1.75rem;
  line-height: 1;
}

.risk-card-result b small {
  color: inherit;
  font-size: 1.1rem;
}

.risk-meter {
  --risk: 0;
  position: relative;
  display: block;
  width: 100%;
  height: 8px;
  margin-top: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, #47b267 0 33%, #f4b65f 33% 66%, #ef7d70 66% 100%);
}

.risk-meter em {
  position: absolute;
  top: 50%;
  left: clamp(4px, calc(var(--risk) * 1%), calc(100% - 10px));
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 5px rgba(15, 23, 42, 0.24);
  transform: translate(-50%, -50%);
}

.risk-chevron {
  width: 8px;
  height: 8px;
  border-top: 2px solid #8e99a5;
  border-right: 2px solid #8e99a5;
  transform: rotate(45deg);
  flex: none;
  margin-top: 5px;
}

.risk-modal {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.38);
}

.risk-sheet {
  width: 100%;
  max-height: calc(100% - 78px);
  overflow-y: auto;
  padding: 20px 28px 10px;
  border: 0;
  border-radius: 22px 22px 0 0;
  background: #fff;
  color: #14202b;
  box-shadow: 0 -18px 34px rgba(15, 23, 42, 0.18);
}

.risk-sheet h3 {
  margin: 0 0 6px;
  font-size: 1rem;
  color: #001a33;
}

.risk-sheet > p {
  margin: 0 0 14px;
  color: #5b6470;
  font-size: 0.86rem;
  line-height: 1.35;
}

.risk-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}

.risk-chips span {
  padding: 8px 14px;
  border-radius: 999px;
  background: #f5f5f6;
  color: #656a70;
  font-size: 0.76rem;
}

.risk-chips b { color: #1f2937; }

.choice-group {
  padding: 0;
  margin: 0 0 14px;
  border: 0;
}

.choice-group legend {
  margin-bottom: 9px;
  color: #14202b;
  font-size: 0.82rem;
  font-weight: 700;
}

.choice-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.choice-row button {
  height: 32px;
  border: 1px solid #d8dde3;
  border-radius: 999px;
  background: #fff;
  color: #001a33;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.choice-row button.selected {
  border-color: #001a33;
  background: #001a33;
  color: #fff;
}

.risk-input-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.risk-input-grid label {
  display: grid;
  gap: 6px;
}

.risk-input-grid span {
  color: #6b7280;
  font-size: 0.75rem;
}

.risk-input-grid input {
  width: 100%;
  height: 42px;
  border: 1px solid #d9dee5;
  border-radius: 10px;
  padding: 0 13px;
  color: #14202b;
  font: inherit;
  font-size: 0.86rem;
  outline: none;
}

.risk-input-grid input:focus {
  border-color: #001a33;
}

.risk-note {
  margin: 14px 0 10px !important;
  color: #858585 !important;
  font-size: 0.72rem !important;
  line-height: 1.35 !important;
}

.risk-error {
  margin: 0 0 10px !important;
  color: #dc2626 !important;
  font-size: 0.75rem !important;
}

.wellness-modal {
  position: absolute;
  inset: 0;
  z-index: 11;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.38);
}

.wellness-sheet {
  width: 100%;
  max-height: calc(100% - 52px);
  overflow-y: auto;
  padding: 26px 26px 18px;
  border-radius: 24px 24px 0 0;
  background: #fff;
  color: #17191c;
  box-shadow: 0 -18px 34px rgba(15, 23, 42, 0.18);
}

.wellness-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.wellness-sheet h3 {
  margin: 0;
  font-size: 1.45rem;
  letter-spacing: -0.02em;
}

.wellness-close {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #f5f5f5;
  color: #17191c;
  cursor: pointer;
}

.metric-info-sheet {
  width: 100%;
  padding: 26px 26px 34px;
  border-radius: 24px 24px 0 0;
  background: #fff;
  color: #17191c;
  box-shadow: 0 -18px 34px rgba(15, 23, 42, 0.18);
}

.metric-info-description {
  max-width: 330px;
  margin: 10px 0 24px;
  color: #55585d;
  font-size: 0.88rem;
  line-height: 1.35;
}

.metric-info-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  margin-bottom: 15px;
}

.metric-info-value strong {
  color: #17191c;
  font-size: 1.7rem;
}

.metric-info-value span {
  color: #55585d;
  font-size: 0.8rem;
}

.metric-info-meter {
  position: relative;
  height: 8px;
  margin-bottom: 24px;
  border-radius: 999px;
  background: linear-gradient(90deg, #70c98d 0 33%, #f9c638 33% 66%, #ef4d78 66% 100%);
}

.metric-info-meter span {
  position: absolute;
  top: 50%;
  left: 33%;
  width: 17px;
  height: 17px;
  border: 1px solid #e4e7e9;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
  transform: translate(-50%, -50%);
}

.metric-info-range {
  margin: 0;
  color: #55585d;
  font-size: 0.78rem;
  line-height: 1.35;
}

.wellness-description,
.wellness-disclaimer,
.wellness-result {
  color: #55585d;
  line-height: 1.35;
}

.wellness-description { margin: 10px 0 18px; }
.wellness-disclaimer { margin: 0 0 22px; }

.wellness-modal-score {
  display: grid;
  place-items: center;
  margin: 0 0 24px;
}

.wellness-ring {
  --p: 0;
  position: relative;
  display: grid;
  place-items: center;
  width: 114px;
  height: 114px;
  border-radius: 50%;
  background: conic-gradient(#6cc68b calc(var(--p) * 1%), #e7e7e7 0);
}

.wellness-ring::before {
  content: '';
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  background: #fff;
}

.wellness-ring span,
.wellness-ring small {
  position: relative;
  z-index: 1;
}

.wellness-ring span { margin-top: 10px; font-size: 1.6rem; font-weight: 800; }
.wellness-ring small { margin-top: -28px; color: #55585d; font-size: 0.68rem; }

.wellness-result {
  margin: 0 0 22px;
  font-size: 0.82rem;
}

.wellness-result strong { color: #57595d; }

.wellness-scale {
  display: grid;
  gap: 9px;
  padding-top: 16px;
  border-top: 1px solid #ececec;
}

.wellness-scale > div {
  display: grid;
  grid-template-columns: 10px 52px 1fr;
  align-items: center;
  gap: 8px;
  color: #4d5054;
  font-size: 0.76rem;
}

.wellness-scale small { color: #74777b; }
.scale-colour { width: 10px; height: 10px; border-radius: 50%; }
.scale-colour.green { background: #6eb448; }
.scale-colour.yellow { background: #fbbb08; }
.scale-colour.red { background: #ef1717; }

.submit-risk {
  width: 100%;
  height: 32px;
  border: 0;
  border-radius: 999px;
  background: #001a33;
  color: #fff;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 800;
  cursor: pointer;
}

.next-steps { margin-top: 12px; }
.next-steps h3 {
  margin: 0 0 10px;
  font-size: 1.05rem;
  color: #071d33;
}
.next-steps p {
  margin: 0 0 16px;
  color: #2b2f35;
  line-height: 1.45;
}

.next-actions {
  display: flex;
  gap: 10px;
}

.primary-action,
.secondary-action {
  border-radius: 999px;
  padding: 11px 18px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.primary-action {
  border: 1px solid #001a33;
  background: #001a33;
  color: #fff;
}

.secondary-action {
  flex: 1;
  border: 1px solid #001a33;
  background: #fff;
  color: #001a33;
}

.ask-bar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 0 12px 10px;
  padding: 18px 18px 14px;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 -10px 30px rgba(15, 23, 42, 0.08);
}
.ask-actions { display: flex; align-items: center; justify-content: space-between; }
.ask-menu {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: none;
  background: #f3f3f3;
  color: var(--text);
  display: grid;
  place-items: center;
  cursor: pointer;
}
.ask-ph { color: #868686; }
.ask-mic {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: none;
  background: #001a33;
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
}

@media (max-width: 380px) {
  .next-actions { flex-direction: column; }
  .primary-action,
  .secondary-action { width: 100%; }
}
</style>