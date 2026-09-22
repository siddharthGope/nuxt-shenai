<script setup lang="ts">
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
  showHypertensionForm: boolean
  showDiabetesForm: boolean
  systolic: number
  diastolic: number
  diabetesForm: DiabetesForm
  hypertensionForm: HypertensionForm
}>()

const emit = defineEmits<{
  closeHypertensionForm: []
  submitHypertensionForm: []
  closeDiabetesForm: []
  submitDiabetesForm: []
}>()
</script>

<template>
  <div v-if="props.showHypertensionForm" class="risk-modal" role="dialog" aria-modal="true" aria-labelledby="hypertension-form-title" @click.self="emit('closeHypertensionForm')">
    <form class="risk-sheet hypertension-form-sheet" @submit.prevent="emit('submitHypertensionForm')">
      <div class="wellness-sheet-head">
        <h3 id="hypertension-form-title">Hypertension Risk</h3>
        <button class="wellness-close" type="button" aria-label="Close Hypertension Risk assessment" @click="emit('closeHypertensionForm')">×</button>
      </div>
      <p class="hypertension-description">Assesses the risk of high blood pressure and related cardiovascular issues.</p>
      <p class="form-subtitle">What we already know</p>
      <div class="risk-chips" aria-label="Known details">
        <span>Age <b>46</b></span>
        <span>Gender <b>Male</b></span>
        <span>Blood Pressure <b>{{ props.systolic }}/{{ props.diastolic }} mmHg</b></span>
      </div>
      <p class="form-subtitle">Lifestyle &amp; History</p>
      <fieldset class="choice-group">
        <legend>Current smoker</legend>
        <div class="choice-row">
          <button type="button" :class="{ selected: props.hypertensionForm.smoker === 'yes' }" @click="props.hypertensionForm.smoker = 'yes'">Yes</button>
          <button type="button" :class="{ selected: props.hypertensionForm.smoker === 'no' }" @click="props.hypertensionForm.smoker = 'no'">No</button>
        </div>
      </fieldset>
      <fieldset class="choice-group">
        <legend>Hypertension in either parent</legend>
        <div class="choice-row">
          <button type="button" :class="{ selected: props.hypertensionForm.familyHistory === 'yes' }" @click="props.hypertensionForm.familyHistory = 'yes'">Yes</button>
          <button type="button" :class="{ selected: props.hypertensionForm.familyHistory === 'no' }" @click="props.hypertensionForm.familyHistory = 'no'">No</button>
        </div>
      </fieldset>
      <div class="risk-input-grid">
        <label><span>Height (cm)</span><input v-model="props.hypertensionForm.height" inputmode="numeric" placeholder="e.g. 170" /></label>
        <label><span>Weight (kg)</span><input v-model="props.hypertensionForm.weight" inputmode="numeric" placeholder="e.g. 90" /></label>
      </div>
      <button class="submit-risk hypertension-submit" type="submit">Submit</button>
    </form>
  </div>

  <div v-if="props.showDiabetesForm" class="risk-modal" role="dialog" aria-modal="true" aria-labelledby="diabetes-form-title" @click.self="emit('closeDiabetesForm')">
    <form class="risk-sheet diabetes-form-sheet" @submit.prevent="emit('submitDiabetesForm')">
      <div class="wellness-sheet-head">
        <h3 id="diabetes-form-title">Diabetes Risk</h3>
        <button class="wellness-close" type="button" aria-label="Close Diabetes Risk assessment" @click="emit('closeDiabetesForm')">×</button>
      </div>
      <p class="form-subtitle">What we already know</p>
      <div class="risk-chips" aria-label="Known details">
        <span>Age <b>46</b></span>
        <span>Gender <b>Male</b></span>
        <span>Blood Pressure <b>{{ props.systolic }}/{{ props.diastolic }} mmHg</b></span>
      </div>
      <p class="form-subtitle">Health Parameters</p>
      <p class="form-hint">Check in your latest reports</p>
      <div class="risk-input-grid">
        <label><span>Fasting Glucose (mg/dL)</span><input v-model="props.diabetesForm.fastingGlucose" inputmode="numeric" placeholder="e.g. 95" /></label>
        <label><span>HbA1c (%)</span><input v-model="props.diabetesForm.hba1c" inputmode="decimal" placeholder="e.g. 5.4" /></label>
        <label><span>Triglycerides (mg/dL)</span><input v-model="props.diabetesForm.triglycerides" inputmode="numeric" placeholder="e.g. 95" /></label>
      </div>
      <p class="form-subtitle">Lifestyle &amp; History</p>
      <p class="form-hint">Add details from your health history if available.</p>
      <button class="submit-risk diabetes-submit" type="submit">Submit</button>
    </form>
  </div>
</template>

<style scoped>
.risk-modal { position: absolute; inset: 0; z-index: 10; display: flex; align-items: flex-end; background: rgba(0, 0, 0, 0.38); }
.risk-sheet { width: 100%; max-height: calc(100% - 78px); overflow-y: auto; padding: 20px 28px 10px; border: 0; border-radius: 22px 22px 0 0; background: #fff; color: #14202b; box-shadow: 0 -18px 34px rgba(15, 23, 42, 0.18); }
.wellness-sheet-head { display: flex; align-items: center; justify-content: space-between; }
.wellness-sheet-head h3 { margin: 0 0 6px; font-size: 1rem; color: #001a33; }
.wellness-close { display: grid; place-items: center; width: 34px; height: 34px; padding: 0; border: 0; border-radius: 50%; background: #f5f5f5; color: #17191c; font-size: 1.2rem; cursor: pointer; }
.hypertension-description { margin: 0 0 14px; color: #5b6470; font-size: 0.86rem; line-height: 1.35; }
.form-subtitle { margin: 16px 0 7px; color: #17191c; font-size: 0.78rem; font-weight: 700; }
.form-hint { margin: 0 0 9px; color: #737980; font-size: 0.72rem; }
.risk-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.risk-chips span { padding: 8px 14px; border-radius: 999px; background: #f5f5f6; color: #656a70; font-size: 0.76rem; }
.risk-chips b { color: #1f2937; }
.choice-group { padding: 0; margin: 0 0 14px; border: 0; }
.choice-group legend { margin-bottom: 9px; color: #14202b; font-size: 0.82rem; font-weight: 700; }
.choice-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.choice-row button { height: 32px; border: 1px solid #d8dde3; border-radius: 999px; background: #fff; color: #001a33; font: inherit; font-size: 0.78rem; font-weight: 700; cursor: pointer; }
.choice-row button.selected { border-color: #001a33; background: #001a33; color: #fff; }
.risk-input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.risk-input-grid label { display: grid; gap: 6px; }
.risk-input-grid span { color: #6b7280; font-size: 0.75rem; }
.risk-input-grid input { width: 100%; height: 42px; border: 1px solid #d9dee5; border-radius: 10px; padding: 0 13px; color: #14202b; font: inherit; font-size: 0.86rem; outline: none; }
.submit-risk { width: 100%; height: 32px; margin-top: 18px; border: 0; border-radius: 999px; background: #001a33; color: #fff; font: inherit; font-size: 0.86rem; font-weight: 800; cursor: pointer; }
</style>
