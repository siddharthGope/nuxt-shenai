<script setup lang="ts">
import type { RiskProfile, StoredScan } from '~/composables/useHealthStore'

const { phase } = useScanState()
const { stop, initialize, computeHealthRisks } = useShenAiCapacitor()
const { heartRate, systolic, diastolic, stress, hrv } = useVitals()
const { getScanHistory, getRiskProfile, saveRiskProfile, getRiskScores, saveRiskScores } = useHealthStore()

const history = ref<StoredScan[]>([])

// A returning member may open this screen without scanning, so fall back to the
// most recent scan persisted on the device.
const latestStored = computed(() => history.value[0] ?? null)
const hasLiveScan = computed(() => heartRate.value > 0 || systolic.value > 0 || hrv.value > 0)

const vitalsView = computed(() => {
  const scan = latestStored.value
  if (hasLiveScan.value || !scan) {
    return {
      heartRate: heartRate.value,
      systolic: systolic.value,
      diastolic: diastolic.value,
      hrv: hrv.value,
      stress: stress.value
    }
  }
  return {
    heartRate: scan.heartRate,
    systolic: scan.systolic,
    diastolic: scan.diastolic,
    hrv: scan.hrv,
    stress: scan.stress
  }
})

const hrStatus = computed(() => heartRateStatus(vitalsView.value.heartRate))
const bpStatus = computed(() => bloodPressureStatus(vitalsView.value.systolic, vitalsView.value.diastolic))
const hrvStatus_ = computed(() => hrvStatus(vitalsView.value.hrv))
const stressStatus_ = computed(() => stressStatus(vitalsView.value.stress))

const wellness = computed(() => wellnessScore(vitalsView.value))

const previousScan = computed(() => history.value[1] ?? null)
const wellnessTrend = computed(() =>
  previousScan.value ? wellness.value - previousScan.value.wellness : null
)

// Shen.AI needs at least two scans before an averaged view is meaningful.
const averagedWellness = computed(() => {
  if (history.value.length < 2) return null
  const recent = history.value.slice(0, 3)
  return Math.round(recent.reduce((sum, scan) => sum + scan.wellness, 0) / recent.length)
})

const scanDate = computed(() => latestStored.value?.scanDate ?? null)

const updatedLabel = computed(() => {
  if (!scanDate.value) return 'No scan saved yet'
  const date = new Date(scanDate.value)
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `Updated ${relativeDay(date)} · ${time}`
})

const vitalsSource = computed(() =>
  scanDate.value ? `From scan · ${relativeDay(new Date(scanDate.value))}` : 'No scan yet'
)

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function relativeDay(date: Date) {
  const days = Math.floor((startOfDay(new Date()).getTime() - startOfDay(date).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const showRiskForm = ref(false)
const riskFormError = ref('')
const hasStoredProfile = ref(false)
const cardioRisk = ref<number | null>(null)
const diabetesRisk = ref<number | null>(null)
const hypertensionRisk = ref<number | null>(null)

const form = reactive({
  name: '',
  age: '',
  gender: 'male',
  smoker: '',
  diabetes: '',
  treatedBp: '',
  totalCholesterol: '',
  hdl: '',
  height: '',
  weight: '',
  fastingGlucose: '',
  triglycerides: '',
  familyHistory: '',
  diet: '',
  activity: ''
})

const memberName = computed(() => form.name.trim() || 'Your Profile')
const memberInitial = computed(() => memberName.value.charAt(0).toUpperCase())
const memberChip = computed(() => {
  const parts: string[] = []
  if (form.age) parts.push(`Age ${form.age}`)
  if (form.gender) parts.push(form.gender.charAt(0).toUpperCase())
  return parts.join(' · ')
})

const bmi = computed(() => bmiValue(toNumber(form.height) ?? null, toNumber(form.weight) ?? null))
const bmiState = computed(() => bmiStatus(bmi.value))
const cardioState = computed(() => riskStatus(cardioRisk.value))
const diabetesState = computed(() => riskStatus(diabetesRisk.value))
const hypertensionState = computed(() => riskStatus(hypertensionRisk.value))

const chronicFlags = computed(() => {
  const flags: string[] = []
  if (form.diabetes === 'yes') flags.push('Diabetes')
  if (form.treatedBp === 'yes') flags.push('Hypertension')
  return flags
})

const labValues = computed(() => [
  { label: 'Total Cholesterol', value: form.totalCholesterol, unit: 'mg/dL' },
  { label: 'HDL Cholesterol', value: form.hdl, unit: 'mg/dL' },
  { label: 'Fasting Glucose', value: form.fastingGlucose, unit: 'mg/dL' },
  { label: 'Triglycerides', value: form.triglycerides, unit: 'mg/dL' }
])

const lifestyleValues = computed(() => [
  { label: 'SMOKING', value: form.smoker === 'yes' ? 'Yes' : form.smoker === 'no' ? 'No' : '' },
  { label: 'FAMILY HISTORY', value: form.familyHistory },
  { label: 'DIET', value: form.diet },
  { label: 'ACTIVITY', value: form.activity }
])

const completeness = computed(() => {
  const fields = [
    form.name, form.age, form.gender, form.smoker, form.diabetes, form.treatedBp,
    form.totalCholesterol, form.hdl, form.height, form.weight,
    form.fastingGlucose, form.triglycerides, form.familyHistory, form.diet, form.activity
  ]
  const filled = fields.filter((value) => String(value).trim() !== '').length
  return Math.round((filled / fields.length) * 100)
})

const missingLabel = computed(() => {
  const missing: string[] = []
  if (!form.totalCholesterol || !form.hdl) missing.push('add lab values')
  if (!form.familyHistory) missing.push('add family history')
  if (!form.diet) missing.push('track your diet')
  if (!form.activity) missing.push('log your activity')
  return missing.length ? `To complete: ${missing.join(' · ')}` : 'Your profile is complete'
})

const insight = computed(() => {
  const bpRaised = bpStatus.value.tone !== 'good'
  const stressRaised = stressStatus_.value.tone !== 'good'
  if (bpRaised && stressRaised) return "Your blood pressure and stress level are both a touch elevated; let's keep an eye on those."
  if (bpRaised) return "Your blood pressure is a touch elevated; let's keep an eye on it."
  if (stressRaised) return "Your stress level is a touch elevated; let's keep an eye on it."
  return "Your key vitals are looking steady; keep tracking them over time."
})

onMounted(async () => {
  history.value = await getScanHistory(10).catch(() => [])

  const [profile, scores] = await Promise.all([
    getRiskProfile().catch(() => null),
    getRiskScores().catch(() => null)
  ])

  if (profile) {
    hasStoredProfile.value = true
    applyStoredProfile(profile)
  }

  cardioRisk.value = scores?.cardio ?? null
  diabetesRisk.value = scores?.diabetes ?? null
  hypertensionRisk.value = scores?.hypertension ?? null

  // A returning member already answered the questionnaire, so recompute the
  // risks against the new scan instead of asking again.
  if (hasStoredProfile.value && hasLiveScan.value) {
    await computeAndStoreRisks().catch(() => {})
  }
})

function boolToChoice(value: boolean | null) {
  return value == null ? '' : value ? 'yes' : 'no'
}

function choiceToBool(value: string) {
  return value === '' ? null : value === 'yes'
}

function numToText(value: number | null) {
  return value != null ? String(value) : ''
}

function applyStoredProfile(profile: RiskProfile) {
  form.name = profile.name ?? ''
  form.age = profile.age != null ? String(profile.age) : ''
  form.gender = profile.gender ?? 'male'
  form.smoker = boolToChoice(profile.smoker)
  form.diabetes = boolToChoice(profile.diabetes)
  form.treatedBp = boolToChoice(profile.treatedBp)
  form.totalCholesterol = numToText(profile.cholesterol)
  form.hdl = numToText(profile.hdl)
  form.height = numToText(profile.height)
  form.weight = numToText(profile.weight)
  form.fastingGlucose = numToText(profile.fastingGlucose)
  form.triglycerides = numToText(profile.triglycerides)
  form.familyHistory = profile.familyHistory ?? ''
  form.diet = profile.diet ?? ''
  form.activity = profile.activity ?? ''
}

function currentProfile(): RiskProfile {
  return {
    name: form.name.trim() || null,
    age: toNumber(form.age) ?? null,
    gender: form.gender,
    smoker: choiceToBool(form.smoker),
    diabetes: choiceToBool(form.diabetes),
    treatedBp: choiceToBool(form.treatedBp),
    cholesterol: toNumber(form.totalCholesterol) ?? null,
    hdl: toNumber(form.hdl) ?? null,
    height: toNumber(form.height) ?? null,
    weight: toNumber(form.weight) ?? null,
    fastingGlucose: toNumber(form.fastingGlucose) ?? null,
    triglycerides: toNumber(form.triglycerides) ?? null,
    familyHistory: form.familyHistory || null,
    diet: form.diet || null,
    activity: form.activity || null,
    updatedAt: null
  }
}

function close() {
  // Stored results stay on the device, so returning here re-hydrates them.
  stop()
  phase.value = 'camera'
}

async function computeAndStoreRisks() {
  const profile = currentProfile()

  const risks = await computeHealthRisks({
    age: profile.age ?? undefined,
    gender: profile.gender ?? undefined,
    sbp: vitalsView.value.systolic,
    dbp: vitalsView.value.diastolic,
    isSmoker: profile.smoker ?? undefined,
    hasDiabetes: profile.diabetes ?? undefined,
    treatedBp: profile.treatedBp ?? undefined,
    cholesterol: profile.cholesterol ?? undefined,
    cholesterolHdl: profile.hdl ?? undefined,
    bodyHeight: profile.height ?? undefined,
    bodyWeight: profile.weight ?? undefined
  })

  const overall = risks?.cvDiseases?.overallRisk
  if (typeof overall === 'number') cardioRisk.value = normalizeRiskPercent(overall)
  if (risks?.diabetesRisk != null) diabetesRisk.value = normalizeRiskPercent(risks.diabetesRisk)
  if (risks?.hypertensionRisk != null) hypertensionRisk.value = normalizeRiskPercent(risks.hypertensionRisk)

  await saveRiskScores({
    cardio: cardioRisk.value,
    diabetes: diabetesRisk.value,
    hypertension: hypertensionRisk.value
  }).catch(() => {})
}

async function submitRiskForm() {
  riskFormError.value = ''

  try {
    await saveRiskProfile(currentProfile())
    hasStoredProfile.value = true
    await computeAndStoreRisks()
    showRiskForm.value = false
  } catch (error) {
    riskFormError.value = error instanceof Error ? error.message : 'Could not calculate your risk scores.'
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

async function rescan() {
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
      <button class="icon-btn" aria-label="Back" @click="close">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <div class="brand">Health Profile</div>
      <span class="icon-btn-spacer" />
    </header>

    <div class="p-body">
      <div class="member">
        <div class="avatar">{{ memberInitial }}</div>
        <div class="member-info">
          <div class="member-name">{{ memberName }}</div>
          <div class="member-sub">{{ updatedLabel }}</div>
        </div>
        <span v-if="memberChip" class="member-chip">{{ memberChip }}</span>
      </div>

      <div class="hero-score">
        <div class="hero-ring" :style="{ '--p': wellness }">
          <div class="hero-ring-inner">
            <b>{{ wellness }}</b>
            <span>out of 100</span>
          </div>
        </div>
        <div class="hero-title">Wellness Score</div>
        <div class="hero-sub">
          <template v-if="wellnessTrend != null">
            {{ Math.abs(wellnessTrend) }} point{{ Math.abs(wellnessTrend) === 1 ? '' : 's' }}
            {{ wellnessTrend >= 0 ? 'above' : 'below' }} your last scan
          </template>
          <template v-else>Your first scan is saved on this device</template>
        </div>
        <div v-if="averagedWellness != null" class="hero-avg">
          Averaged across your last {{ Math.min(history.length, 3) }} scans: <b>{{ averagedWellness }}</b>
        </div>
      </div>

      <div class="section-head">
        <h3>Vitals</h3>
        <span>{{ vitalsSource }}</span>
      </div>

      <div class="grid">
        <div class="metric-card">
          <div class="mc-top"><span>Heart Rate</span><i class="chev-sm" /></div>
          <div class="mc-v">{{ vitalsView.heartRate }}<small>bpm</small></div>
          <div class="mc-status" :class="hrStatus.tone"><span class="dot" />{{ hrStatus.label }}</div>
        </div>

        <div class="metric-card">
          <div class="mc-top"><span>Blood Pressure</span><i class="chev-sm" /></div>
          <div class="mc-v">{{ vitalsView.systolic }}<small>/{{ vitalsView.diastolic }}</small></div>
          <div class="mc-status" :class="bpStatus.tone"><span class="dot" />{{ bpStatus.label }}</div>
        </div>

        <div class="metric-card">
          <div class="mc-top"><span>Heart Rate Variability</span><i class="chev-sm" /></div>
          <div class="mc-v">{{ vitalsView.hrv }}<small>ms</small></div>
          <div class="mc-status" :class="hrvStatus_.tone"><span class="dot" />{{ hrvStatus_.label }}</div>
        </div>

        <div class="metric-card">
          <div class="mc-top"><span>Stress Level</span><i class="chev-sm" /></div>
          <div class="mc-v">{{ vitalsView.stress }}</div>
          <div class="mc-status" :class="stressStatus_.tone"><span class="dot" />{{ stressStatus_.label }}</div>
        </div>
      </div>

      <p class="insight">{{ insight }}</p>

      <button class="pill" @click="rescan">Rescan</button>

      <div class="section-head">
        <h3>Health Indices</h3>
      </div>

      <div class="index-list">
        <button class="index-card" type="button" @click="showRiskForm = true">
          <div class="ic-head">
            <div>
              <strong>Cardiovascular Risk</strong>
              <small>{{ cardioRisk != null ? 'From scan + lab values' : 'Missing information' }}</small>
            </div>
            <span class="badge" :class="cardioState ? cardioState.tone : 'idle'">
              {{ cardioState ? cardioState.label : 'Incomplete' }}
            </span>
          </div>
          <div v-if="cardioRisk != null" class="ic-meter-row">
            <i class="risk-meter" :style="{ '--risk': cardioRisk }"><em /></i>
            <b>{{ cardioRisk }}%</b>
          </div>
        </button>

        <button class="index-card" type="button" @click="showRiskForm = true">
          <div class="ic-head">
            <div>
              <strong>Diabetes Risk</strong>
              <small>{{ diabetesRisk != null ? 'From scan + your profile' : 'Missing information' }}</small>
            </div>
            <span class="badge" :class="diabetesState ? diabetesState.tone : 'idle'">
              {{ diabetesState ? diabetesState.label : 'Incomplete' }}
            </span>
          </div>
          <div v-if="diabetesRisk != null" class="ic-meter-row">
            <i class="risk-meter" :style="{ '--risk': diabetesRisk }"><em /></i>
            <b>{{ diabetesRisk }}%</b>
          </div>
        </button>

        <button class="index-card" type="button" @click="showRiskForm = true">
          <div class="ic-head">
            <div>
              <strong>Hypertension Risk</strong>
              <small>{{ hypertensionRisk != null ? 'From scan + your profile' : 'Missing information' }}</small>
            </div>
            <span class="badge" :class="hypertensionState ? hypertensionState.tone : 'idle'">
              {{ hypertensionState ? hypertensionState.label : 'Incomplete' }}
            </span>
          </div>
          <div v-if="hypertensionRisk != null" class="ic-meter-row">
            <i class="risk-meter" :style="{ '--risk': hypertensionRisk }"><em /></i>
            <b>{{ hypertensionRisk }}%</b>
          </div>
        </button>

        <button class="index-card" type="button" @click="showRiskForm = true">
          <div class="ic-head">
            <div>
              <strong>Body Mass Index</strong>
              <small v-if="bmi != null">From your profile · {{ form.weight }} kg · {{ form.height }} cm</small>
              <small v-else>Missing information</small>
            </div>
            <span class="badge" :class="bmiState ? bmiState.tone : 'idle'">
              {{ bmiState ? bmiState.label : 'Incomplete' }}
            </span>
          </div>
          <div v-if="bmi != null" class="ic-meter-row bmi-row">
            <b class="bmi-v">{{ bmi }}<small> kg/m²</small></b>
            <span class="bmi-range">Healthy range<br /><b>18.5 – 24.9 target</b></span>
          </div>
        </button>
      </div>

      <div class="note" :class="{ flagged: chronicFlags.length }">
        <template v-if="chronicFlags.length">
          <b>{{ chronicFlags.join(' and ') }}</b> recorded in your profile — these are included in your risk scores.
        </template>
        <template v-else>
          <b>No chronic condition flags</b> recorded in your profile. Diabetes and hypertension are included automatically once you add them.
        </template>
      </div>

      <div class="section-head">
        <h3>Lab Values</h3>
        <span>From your report</span>
      </div>

      <div class="grid">
        <div v-for="lab in labValues" :key="lab.label" class="metric-card lab-card">
          <div class="mc-top"><span>{{ lab.label }}</span></div>
          <div v-if="lab.value" class="mc-v">{{ lab.value }}<small>{{ lab.unit }}</small></div>
          <div v-else class="mc-empty">Not set</div>
        </div>
      </div>

      <div class="section-head">
        <h3>Lifestyle</h3>
      </div>

      <div class="grid">
        <div v-for="item in lifestyleValues" :key="item.label" class="metric-card lab-card">
          <div class="mc-top"><span>{{ item.label }}</span></div>
          <div class="mc-lifestyle" :class="{ empty: !item.value }">{{ item.value || 'Not set' }}</div>
        </div>
      </div>

      <div class="completeness">
        <div class="cp-head">
          <span>Profile Completeness</span>
          <b>{{ completeness }}%</b>
        </div>
        <div class="cp-bar"><span :style="{ width: completeness + '%' }" /></div>
        <small>{{ missingLabel }}</small>
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

    <div v-if="showRiskForm" class="risk-modal" role="dialog" aria-modal="true" aria-labelledby="risk-title" @click.self="showRiskForm = false">
      <form class="risk-sheet" @submit.prevent="submitRiskForm">
        <h3 id="risk-title">{{ hasStoredProfile ? 'Your Details' : 'Missing Information' }}</h3>
        <p>A few more details so Lumi can calculate your health indices. Answers stay on this device.</p>

        <div class="risk-chips" aria-label="Known details">
          <span>Systolic BP <b>{{ vitalsView.systolic }} mmHg</b></span>
          <span>Diastolic BP <b>{{ vitalsView.diastolic }} mmHg</b></span>
        </div>

        <div class="risk-input-grid">
          <label>
            <span>Name</span>
            <input v-model="form.name" placeholder="e.g. Jenny" />
          </label>
          <label>
            <span>Age</span>
            <input v-model="form.age" inputmode="numeric" placeholder="e.g. 46" />
          </label>
          <label>
            <span>Gender</span>
            <select v-model="form.gender">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            <span>Family History</span>
            <select v-model="form.familyHistory">
              <option value="">Not set</option>
              <option value="None">None</option>
              <option value="One parent">One parent</option>
              <option value="Both parents">Both parents</option>
            </select>
          </label>
        </div>

        <fieldset class="choice-group">
          <legend>Current Smoker</legend>
          <div class="choice-row">
            <button type="button" :class="{ selected: form.smoker === 'yes' }" @click="form.smoker = 'yes'">Yes</button>
            <button type="button" :class="{ selected: form.smoker === 'no' }" @click="form.smoker = 'no'">No</button>
          </div>
        </fieldset>

        <fieldset class="choice-group">
          <legend>Diabetes</legend>
          <div class="choice-row">
            <button type="button" :class="{ selected: form.diabetes === 'yes' }" @click="form.diabetes = 'yes'">Yes</button>
            <button type="button" :class="{ selected: form.diabetes === 'no' }" @click="form.diabetes = 'no'">No</button>
          </div>
        </fieldset>

        <fieldset class="choice-group">
          <legend>Treated for High Blood Pressure</legend>
          <div class="choice-row">
            <button type="button" :class="{ selected: form.treatedBp === 'yes' }" @click="form.treatedBp = 'yes'">Yes</button>
            <button type="button" :class="{ selected: form.treatedBp === 'no' }" @click="form.treatedBp = 'no'">No</button>
          </div>
        </fieldset>

        <div class="risk-input-grid">
          <label>
            <span>Total Cholesterol (mg/dL)</span>
            <input v-model="form.totalCholesterol" inputmode="numeric" placeholder="e.g. 180" />
          </label>
          <label>
            <span>HDL (mg/dL)</span>
            <input v-model="form.hdl" inputmode="numeric" placeholder="e.g. 50" />
          </label>
          <label>
            <span>Fasting Glucose (mg/dL)</span>
            <input v-model="form.fastingGlucose" inputmode="numeric" placeholder="e.g. 94" />
          </label>
          <label>
            <span>Triglycerides (mg/dL)</span>
            <input v-model="form.triglycerides" inputmode="numeric" placeholder="e.g. 110" />
          </label>
          <label>
            <span>Height (cm)</span>
            <input v-model="form.height" inputmode="numeric" placeholder="e.g. 165" />
          </label>
          <label>
            <span>Weight (kg)</span>
            <input v-model="form.weight" inputmode="numeric" placeholder="e.g. 68" />
          </label>
          <label>
            <span>Diet</span>
            <select v-model="form.diet">
              <option value="">Not set</option>
              <option value="Balanced">Balanced</option>
              <option value="High vegetable">High vegetable</option>
              <option value="Needs work">Needs work</option>
            </select>
          </label>
          <label>
            <span>Activity</span>
            <select v-model="form.activity">
              <option value="">Not set</option>
              <option value="Sedentary">Sedentary</option>
              <option value="Lightly active">Lightly active</option>
              <option value="Moderately active">Moderately active</option>
              <option value="Very active">Very active</option>
            </select>
          </label>
        </div>

        <p class="risk-note">Cholesterol and HDL give the most accurate score; height and weight (BMI) can be used instead if you do not have lab values on hand.</p>

        <p v-if="riskFormError" class="risk-error">{{ riskFormError }}</p>

        <button class="submit-risk" type="submit">Submit</button>
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
  border-bottom: 1px solid #f1f5f9;
}
.icon-btn {
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  display: grid;
  place-items: center;
}
.icon-btn-spacer { width: 20px; }
.brand { font-weight: 700; font-size: 1.05rem; }

.p-body {
  padding: 14px 18px 24px;
  overflow-y: auto;
}

.member {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex: none;
}
.member-info { flex: 1; min-width: 0; }
.member-name { font-weight: 700; font-size: 0.98rem; }
.member-sub { font-size: 0.76rem; color: var(--muted); }
.member-chip {
  flex: none;
  padding: 6px 12px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 600;
}

.hero-score {
  border-radius: 20px;
  background: #0d1f33;
  color: #fff;
  padding: 22px 18px 20px;
  text-align: center;
}
.hero-ring {
  --p: 0;
  width: 132px;
  height: 132px;
  margin: 0 auto 14px;
  border-radius: 50%;
  background: conic-gradient(var(--accent) calc(var(--p) * 1%), rgba(255, 255, 255, 0.16) 0);
  display: grid;
  place-items: center;
}
.hero-ring-inner {
  width: 108px;
  height: 108px;
  border-radius: 50%;
  background: #0d1f33;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 2px;
}
.hero-ring-inner b { font-size: 2.5rem; line-height: 1; font-weight: 800; }
.hero-ring-inner span { font-size: 0.72rem; color: rgba(255, 255, 255, 0.65); }
.hero-title { font-weight: 700; font-size: 1.05rem; }
.hero-sub { margin-top: 4px; font-size: 0.82rem; color: rgba(255, 255, 255, 0.7); line-height: 1.4; }
.hero-avg { margin-top: 8px; font-size: 0.76rem; color: rgba(255, 255, 255, 0.55); }

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 22px 0 10px;
}
.section-head h3 {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
}
.section-head span { font-size: 0.74rem; color: var(--muted); }

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
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
  gap: 6px;
  font-size: 0.78rem;
  color: var(--muted);
}
.chev-sm {
  width: 8px;
  height: 8px;
  border-top: 2px solid #cbd5e1;
  border-right: 2px solid #cbd5e1;
  transform: rotate(45deg);
  flex: none;
  margin-top: 3px;
}
.mc-v { font-size: 1.55rem; font-weight: 800; }
.mc-v small { font-size: 0.78rem; font-weight: 500; color: var(--muted); margin-left: 3px; }
.mc-empty { font-size: 0.86rem; color: #94a3b8; font-weight: 600; }
.mc-lifestyle { font-size: 0.95rem; font-weight: 700; }
.mc-lifestyle.empty { color: #94a3b8; font-weight: 600; font-size: 0.86rem; }
.lab-card { gap: 6px; }
.mc-status { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #475569; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.mc-status.good .dot { background: #16a34a; }
.mc-status.warn .dot { background: #f59e0b; }
.mc-status.bad .dot { background: #dc2626; }

.insight {
  margin: 16px 0 14px;
  color: var(--text);
  line-height: 1.5;
  font-size: 0.9rem;
}

.pill {
  border: 1px solid #d7dce3;
  background: #fff;
  color: var(--text);
  font: inherit;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: 999px;
  cursor: pointer;
}

.index-list { display: grid; gap: 12px; }

.index-card {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #fff;
  padding: 14px 16px;
  display: grid;
  gap: 12px;
  text-align: left;
  font: inherit;
  cursor: pointer;
}
.ic-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.ic-head strong { display: block; color: #0f172a; font-size: 0.95rem; }
.ic-head small { display: block; margin-top: 2px; color: var(--muted); font-size: 0.76rem; }

.badge {
  flex: none;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
}
.badge.good { background: #dcfce7; color: #15803d; }
.badge.warn { background: #fef3c7; color: #b45309; }
.badge.bad { background: #fee2e2; color: #b91c1c; }
.badge.idle { background: #fff1e6; color: #c2410c; }

.ic-meter-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ic-meter-row > b { font-size: 0.95rem; font-weight: 800; flex: none; }

.risk-meter {
  --risk: 0;
  position: relative;
  display: block;
  flex: 1;
  height: 8px;
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

.bmi-row { justify-content: space-between; align-items: flex-end; }
.bmi-v { font-size: 1.6rem; font-weight: 800; }
.bmi-v small { font-size: 0.78rem; font-weight: 500; color: var(--muted); }
.bmi-range { text-align: right; font-size: 0.72rem; color: var(--muted); line-height: 1.4; }
.bmi-range b { color: #0f172a; }

.note {
  margin-top: 14px;
  border: 1px solid #fde68a;
  background: #fffbeb;
  border-radius: 14px;
  padding: 12px 14px;
  font-size: 0.8rem;
  color: #78350f;
  line-height: 1.45;
}
.note.flagged { border-color: #fecaca; background: #fef2f2; color: #991b1b; }

.completeness {
  margin-top: 20px;
  border: 1px solid #eef2f7;
  border-radius: 16px;
  padding: 14px;
}
.cp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.86rem;
  font-weight: 600;
}
.cp-bar {
  height: 8px;
  border-radius: 999px;
  background: #eef2f7;
  overflow: hidden;
  margin: 10px 0 8px;
}
.cp-bar span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent-dark), var(--accent));
}
.completeness small { color: var(--muted); font-size: 0.74rem; }

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

.risk-input-grid input,
.risk-input-grid select {
  width: 100%;
  height: 42px;
  border: 1px solid #d9dee5;
  border-radius: 10px;
  padding: 0 13px;
  color: #14202b;
  font: inherit;
  font-size: 0.86rem;
  outline: none;
  background: #fff;
}

.risk-input-grid input:focus,
.risk-input-grid select:focus {
  border-color: #001a33;
}

.score-trend {
  margin-top: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}
.score-trend.up { color: #16a34a; }
.score-trend.down { color: #dc2626; }

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