<script setup lang="ts">
type MetricInfo = {
  title: string
  description: string
  value: string | number
  unit: string
  range: string
}

type WellnessInterpretation = {
  label: string
  text: string
}

type CardioRiskForm = {
  smoker: string
  diabetes: string
  treatedBp: string
  totalCholesterol: string
  hdl: string
  height: string
  weight: string
}

type DiabetesForm = {
  fastingGlucose: string
  hba1c: string
  triglycerides: string
}

type HypertensionForm = {
  smoker: string
  familyHistory: string
  height: string
  weight: string
}

const props = defineProps<{
  showCardioRiskForm: boolean
  showWellnessInfo: boolean
  metricInfo: MetricInfo | null
  activeMetricInfo: string | null
  showHypertensionInfo: boolean
  showHypertensionForm: boolean
  showDiabetesInfo: boolean
  showDiabetesForm: boolean
  wellness: number
  wellnessInterpretation: WellnessInterpretation
  hypertensionRisk: number
  diabetesRisk: number
  systolic: number
  diastolic: number
  cardioRiskForm: CardioRiskForm
  diabetesForm: DiabetesForm
  hypertensionForm: HypertensionForm
  cardioRiskError: string
}>()

const emit = defineEmits<{
  closeCardioRiskForm: []
  submitCardioRiskForm: []
  closeWellnessInfo: []
  closeMetricInfo: []
  closeHypertensionInfo: []
  openHypertensionForm: []
  closeHypertensionForm: []
  submitHypertensionForm: []
  closeDiabetesInfo: []
  openDiabetesForm: []
  closeDiabetesForm: []
  submitDiabetesForm: []
}>()
</script>

<template>
  <div v-if="props.showCardioRiskForm" class="risk-modal" role="dialog" aria-modal="true" aria-labelledby="cardio-risk-title" @click.self="emit('closeCardioRiskForm')">
    <form class="risk-sheet" @submit.prevent="emit('submitCardioRiskForm')">
      <h3 id="cardio-risk-title">Missing Information</h3>
      <p>A few more details to calculate your Cardiovascular Risk Score.</p>
      <div class="risk-chips" aria-label="Known details">
        <span>Age <b>46</b></span><span>Gender <b>Male</b></span><span>Systolic BP <b>{{ props.systolic }} mmHg</b></span>
      </div>
      <fieldset class="choice-group"><legend>Current Smoker</legend><div class="choice-row">
        <button type="button" :class="{ selected: props.cardioRiskForm.smoker === 'yes' }" @click="props.cardioRiskForm.smoker = 'yes'">Yes</button>
        <button type="button" :class="{ selected: props.cardioRiskForm.smoker === 'no' }" @click="props.cardioRiskForm.smoker = 'no'">No</button>
      </div></fieldset>
      <fieldset class="choice-group"><legend>Diabetes</legend><div class="choice-row">
        <button type="button" :class="{ selected: props.cardioRiskForm.diabetes === 'yes' }" @click="props.cardioRiskForm.diabetes = 'yes'">Yes</button>
        <button type="button" :class="{ selected: props.cardioRiskForm.diabetes === 'no' }" @click="props.cardioRiskForm.diabetes = 'no'">No</button>
      </div></fieldset>
      <fieldset class="choice-group"><legend>Treated for High Blood Pressure</legend><div class="choice-row">
        <button type="button" :class="{ selected: props.cardioRiskForm.treatedBp === 'yes' }" @click="props.cardioRiskForm.treatedBp = 'yes'">Yes</button>
        <button type="button" :class="{ selected: props.cardioRiskForm.treatedBp === 'no' }" @click="props.cardioRiskForm.treatedBp = 'no'">No</button>
      </div></fieldset>
      <div class="risk-input-grid">
        <label><span>Total Cholesterol (mg/dL)</span><input v-model="props.cardioRiskForm.totalCholesterol" inputmode="numeric" placeholder="e.g. 180" /></label>
        <label><span>HDL (mg/dL)</span><input v-model="props.cardioRiskForm.hdl" inputmode="numeric" placeholder="e.g. 50" /></label>
        <label><span>Height (cm)</span><input v-model="props.cardioRiskForm.height" inputmode="numeric" placeholder="e.g. 165" /></label>
        <label><span>Weight (kg)</span><input v-model="props.cardioRiskForm.weight" inputmode="numeric" placeholder="e.g. 68" /></label>
      </div>
      <p class="risk-note">Cholesterol and HDL give the most accurate score; height and weight (BMI) can be used instead if you do not have lab values on hand.</p>
      <p v-if="props.cardioRiskError" class="risk-error">{{ props.cardioRiskError }}</p>
      <button class="submit-risk" type="submit">Submit</button>
    </form>
  </div>

  <div v-if="props.showWellnessInfo" class="wellness-modal" role="dialog" aria-modal="true" aria-labelledby="wellness-info-title" @click.self="emit('closeWellnessInfo')">
    <section class="wellness-sheet">
      <div class="wellness-sheet-head"><h3 id="wellness-info-title">Wellness Score</h3><button class="wellness-close" type="button" aria-label="Close Wellness Score information" @click="emit('closeWellnessInfo')"><span aria-hidden="true">&#10005;</span></button></div>
      <p class="wellness-description">An indication of your overall wellbeing based on this assessment.</p>
      <p class="wellness-disclaimer">It is not a diagnosis or a substitute for medical advice. Speak with a healthcare professional if you have concerns.</p>
      <div class="wellness-modal-score"><div class="wellness-ring" :style="{ '--p': props.wellness }"><span>{{ props.wellness }}</span><small>out of 100</small></div></div>
      <p class="wellness-result"><strong>Result Interpretation:</strong> {{ props.wellnessInterpretation.label }}; {{ props.wellnessInterpretation.text }}</p>
      <div class="wellness-scale" aria-label="Wellness Score grading scale"><div><span class="scale-colour green" /><strong>61-100</strong><small>Above-average wellness</small></div><div><span class="scale-colour yellow" /><strong>41-60</strong><small>Moderate wellness</small></div><div><span class="scale-colour red" /><strong>0-40</strong><small>Below-average wellness</small></div></div>
    </section>
  </div>

  <div v-if="props.metricInfo" class="hypertension-modal" role="dialog" aria-modal="true" :aria-labelledby="`${props.activeMetricInfo}-info-title`" @click.self="emit('closeMetricInfo')">
    <section class="metric-info-sheet"><div class="wellness-sheet-head"><h3 :id="`${props.activeMetricInfo}-info-title`">{{ props.metricInfo.title }}</h3><button class="wellness-close" type="button" :aria-label="`Close ${props.metricInfo.title} information`" @click="emit('closeMetricInfo')"><span aria-hidden="true">&#10005;</span></button></div><p class="metric-info-description">{{ props.metricInfo.description }}</p><div class="metric-info-value"><strong>{{ props.metricInfo.value }}</strong><span>{{ props.metricInfo.unit }}</span></div><div class="metric-info-meter"><span /></div><p class="metric-info-range">{{ props.metricInfo.range }}</p></section>
  </div>

  <div v-if="props.showHypertensionInfo" class="hypertension-modal" role="dialog" aria-modal="true" aria-labelledby="hypertension-info-title" @click.self="emit('closeHypertensionInfo')">
    <section class="hypertension-sheet"><div class="wellness-sheet-head"><h3 id="hypertension-info-title">Hypertension Risk</h3><button class="wellness-close" type="button" aria-label="Close Hypertension Risk information" @click="emit('closeHypertensionInfo')"><span aria-hidden="true">&#10005;</span></button></div><p class="hypertension-description">Assesses the risk of high blood pressure and related cardiovascular issues. Score is based on Framingham Heart Study.</p><div class="hypertension-score"><strong>{{ props.hypertensionRisk }}</strong><span>%</span></div><div class="hypertension-meter" :style="{ '--risk': props.hypertensionRisk }"><span /></div><button class="assess-again" type="button" @click="emit('openHypertensionForm')">Assess Again</button></section>
  </div>

  <div v-if="false && props.showHypertensionForm" class="risk-modal" role="dialog" aria-modal="true" aria-labelledby="hypertension-form-title" @click.self="emit('closeHypertensionForm')">
    <form class="risk-sheet hypertension-form-sheet" @submit.prevent="emit('submitHypertensionForm')"><div class="wellness-sheet-head"><h3 id="hypertension-form-title">Hypertension Risk</h3><button class="wellness-close" type="button" aria-label="Close Hypertension Risk assessment" @click="emit('closeHypertensionForm')"><span aria-hidden="true">&#10005;</span></button></div><p class="hypertension-description">Assesses the risk of high blood pressure and related cardiovascular issues.</p><p class="diabetes-form-subtitle">What we already know</p><div class="risk-chips" aria-label="Known details"><span>Age <b>46</b></span><span>Gender <b>Male</b></span><span>Blood Pressure <b>{{ props.systolic }}/{{ props.diastolic }} mmHg</b></span></div><p class="diabetes-form-subtitle">Lifestyle &amp; History</p><fieldset class="choice-group"><legend>Current smoker</legend><div class="choice-row"><button type="button" :class="{ selected: props.hypertensionForm.smoker === 'yes' }" @click="props.hypertensionForm.smoker = 'yes'">Yes</button><button type="button" :class="{ selected: props.hypertensionForm.smoker === 'no' }" @click="props.hypertensionForm.smoker = 'no'">No</button></div></fieldset><fieldset class="choice-group"><legend>Hypertension in either parent</legend><div class="choice-row"><button type="button" :class="{ selected: props.hypertensionForm.familyHistory === 'yes' }" @click="props.hypertensionForm.familyHistory = 'yes'">Yes</button><button type="button" :class="{ selected: props.hypertensionForm.familyHistory === 'no' }" @click="props.hypertensionForm.familyHistory = 'no'">No</button></div></fieldset><div class="risk-input-grid"><label><span>Height (cm)</span><input v-model="props.hypertensionForm.height" inputmode="numeric" placeholder="e.g. 170" /></label><label><span>Weight (kg)</span><input v-model="props.hypertensionForm.weight" inputmode="numeric" placeholder="e.g. 90" /></label></div><button class="submit-risk hypertension-submit" type="submit">Submit</button></form>
  </div>

  <div v-if="props.showDiabetesInfo" class="hypertension-modal" role="dialog" aria-modal="true" aria-labelledby="diabetes-info-title" @click.self="emit('closeDiabetesInfo')">
    <section class="hypertension-sheet"><div class="wellness-sheet-head"><h3 id="diabetes-info-title">Diabetes Risk</h3><button class="wellness-close" type="button" aria-label="Close Diabetes Risk information" @click="emit('closeDiabetesInfo')"><span aria-hidden="true">&#10005;</span></button></div><p class="hypertension-description">Estimates the risk of developing diabetes. Score is based on Framingham Diabetes Risk Score and Finnish Diabetes Risk Score (FINDRISC)</p><div class="hypertension-score"><strong>{{ props.diabetesRisk }}</strong><span>%</span></div><div class="hypertension-meter" :style="{ '--risk': props.diabetesRisk }"><span /></div><button class="assess-again" type="button" @click="emit('openDiabetesForm')">Assess Again</button></section>
  </div>

  <div v-if="false && props.showDiabetesForm" class="risk-modal" role="dialog" aria-modal="true" aria-labelledby="diabetes-form-title" @click.self="emit('closeDiabetesForm')">
    <form class="risk-sheet diabetes-form-sheet" @submit.prevent="emit('submitDiabetesForm')"><div class="wellness-sheet-head"><h3 id="diabetes-form-title">Diabetes Risk</h3><button class="wellness-close" type="button" aria-label="Close Diabetes Risk assessment" @click="emit('closeDiabetesForm')"><span aria-hidden="true">&#10005;</span></button></div><p class="diabetes-form-subtitle">What we already know</p><div class="risk-chips" aria-label="Known details"><span>Age <b>46</b></span><span>Gender <b>Male</b></span><span>Blood Pressure <b>{{ props.systolic }}/{{ props.diastolic }} mmHg</b></span></div><p class="diabetes-form-subtitle">Health Parameters</p><p class="diabetes-form-hint">Check in your latest reports</p><div class="risk-input-grid"><label><span>Fasting Glucose (mg/dL)</span><input v-model="props.diabetesForm.fastingGlucose" inputmode="numeric" placeholder="e.g. 95" /></label><label><span>HbA1c (%)</span><input v-model="props.diabetesForm.hba1c" inputmode="decimal" placeholder="e.g. 5.4" /></label><label><span>Triglycerides (mg/dL)</span><input v-model="props.diabetesForm.triglycerides" inputmode="numeric" placeholder="e.g. 95" /></label></div><p class="diabetes-form-subtitle">Lifestyle &amp; History</p><p class="diabetes-form-hint">Add details from your health history if available.</p><button class="submit-risk diabetes-submit" type="submit">Submit</button></form>
  </div>
</template>

<style scoped>
.hypertension-modal,.wellness-modal,.risk-modal{position:absolute;inset:0;display:flex;align-items:flex-end;background:rgba(0,0,0,.38)}
.hypertension-modal,.wellness-modal{z-index:12}.risk-modal{z-index:10}
.hypertension-sheet,.metric-info-sheet,.wellness-sheet{width:100%;background:#fff;color:#17191c;border-radius:24px 24px 0 0;box-shadow:0 -18px 34px rgba(15,23,42,.18)}
.hypertension-sheet,.metric-info-sheet{padding:26px 26px 40px}.wellness-sheet{max-height:calc(100% - 52px);overflow-y:auto;padding:26px 26px 18px}
.wellness-sheet-head{display:flex;align-items:center;justify-content:space-between}.wellness-sheet h3{margin:0;font-size:1.45rem;letter-spacing:-.02em}
.wellness-close{display:grid;place-items:center;width:34px;height:34px;padding:0;border:0;border-radius:50%;background:#f5f5f5;color:#17191c;cursor:pointer}
.hypertension-description,.metric-info-description{max-width:330px;margin:10px 0 26px;color:#55585d;font-size:.88rem;line-height:1.35}.metric-info-description{margin-bottom:24px}
.hypertension-score,.metric-info-value{display:flex;align-items:baseline;justify-content:center;gap:4px;margin-bottom:15px}.hypertension-score strong,.metric-info-value strong{color:#17191c;font-size:1.7rem}.hypertension-score span,.metric-info-value span{color:#55585d;font-size:.8rem}
.hypertension-meter,.metric-info-meter{position:relative;height:8px;margin-bottom:28px;border-radius:999px;background:linear-gradient(90deg,#70c98d 0 33%,#f9c638 33% 66%,#ef4d78 66% 100%)}
.hypertension-meter span,.metric-info-meter span{position:absolute;top:50%;left:clamp(7px,calc(var(--risk) * 1%),calc(100% - 7px));width:17px;height:17px;border:1px solid #e4e7e9;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.12);transform:translate(-50%,-50%)}
.metric-info-meter span{left:33%}.metric-info-range{margin:0;color:#55585d;font-size:.78rem;line-height:1.35}
.assess-again{width:100%;height:57px;border:0;border-radius:999px;background:#001a33;color:#fff;font:inherit;font-weight:700;cursor:pointer}
.wellness-description,.wellness-disclaimer,.wellness-result{color:#55585d;line-height:1.35}.wellness-description{margin:10px 0 18px}.wellness-disclaimer{margin:0 0 22px}.wellness-modal-score{display:grid;place-items:center;margin:0 0 24px}
.wellness-ring{--p:0;position:relative;display:grid;place-items:center;width:114px;height:114px;border-radius:50%;background:conic-gradient(#6cc68b calc(var(--p) * 1%),#e7e7e7 0)}.wellness-ring:before{content:'';position:absolute;inset:10px;border-radius:50%;background:#fff}.wellness-ring span,.wellness-ring small{position:relative;z-index:1}.wellness-ring span{margin-top:10px;font-size:1.6rem;font-weight:800}.wellness-ring small{margin-top:-28px;color:#55585d;font-size:.68rem}.wellness-result{margin:0 0 22px;font-size:.82rem}.wellness-result strong{color:#57595d}.wellness-scale{display:grid;gap:9px;padding-top:16px;border-top:1px solid #ececec}.wellness-scale>div{display:grid;grid-template-columns:10px 52px 1fr;align-items:center;gap:8px;color:#4d5054;font-size:.76rem}.wellness-scale small{color:#74777b}.scale-colour{width:10px;height:10px;border-radius:50%}.scale-colour.green{background:#6eb448}.scale-colour.yellow{background:#fbbb08}.scale-colour.red{background:#ef1717}
.risk-sheet{width:100%;max-height:calc(100% - 78px);overflow-y:auto;padding:20px 28px 10px;border:0;border-radius:22px 22px 0 0;background:#fff;color:#14202b;box-shadow:0 -18px 34px rgba(15,23,42,.18)}.risk-sheet h3{margin:0 0 6px;font-size:1rem;color:#001a33}.risk-sheet>p{margin:0 0 14px;color:#5b6470;font-size:.86rem;line-height:1.35}.risk-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}.risk-chips span{padding:8px 14px;border-radius:999px;background:#f5f5f6;color:#656a70;font-size:.76rem}.risk-chips b{color:#1f2937}.choice-group{padding:0;margin:0 0 14px;border:0}.choice-group legend{margin-bottom:9px;color:#14202b;font-size:.82rem;font-weight:700}.choice-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.choice-row button{height:32px;border:1px solid #d8dde3;border-radius:999px;background:#fff;color:#001a33;font:inherit;font-size:.78rem;font-weight:700;cursor:pointer}.choice-row button.selected{border-color:#001a33;background:#001a33;color:#fff}.risk-input-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.risk-input-grid label{display:grid;gap:6px}.risk-input-grid span{color:#6b7280;font-size:.75rem}.risk-input-grid input{width:100%;height:42px;border:1px solid #d9dee5;border-radius:10px;padding:0 13px;color:#14202b;font:inherit;font-size:.86rem;outline:none}.risk-input-grid input:focus{border-color:#001a33}.risk-note{margin:14px 0 10px!important;color:#858585!important;font-size:.72rem!important;line-height:1.35!important}.risk-error{margin:0 0 10px!important;color:#dc2626!important;font-size:.75rem!important}.submit-risk{width:100%;height:32px;border:0;border-radius:999px;background:#001a33;color:#fff;font:inherit;font-size:.86rem;font-weight:800;cursor:pointer}.diabetes-form-subtitle{margin:16px 0 7px!important;color:#17191c!important;font-size:.78rem!important;font-weight:700}.diabetes-form-hint{margin:0 0 9px!important;color:#737980!important;font-size:.72rem!important}.diabetes-submit,.hypertension-submit{margin-top:18px}.diabetes-form-sheet,.hypertension-form-sheet{max-height:calc(100% - 32px)}
</style>
