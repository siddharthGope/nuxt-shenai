export type VitalTone = 'good' | 'warn' | 'bad'
export type VitalStatus = { label: string; tone: VitalTone }

export type VitalValues = {
  heartRate: number
  systolic: number
  diastolic: number
  hrv: number
  stress: number
}

export function heartRateStatus(v: number): VitalStatus {
  if (v >= 60 && v <= 100) return { label: 'Normal', tone: 'good' }
  if ((v > 100 && v <= 110) || (v >= 50 && v < 60)) return { label: 'Slightly elevated', tone: 'warn' }
  return { label: 'Out of range', tone: 'bad' }
}

export function bloodPressureStatus(systolic: number, diastolic: number): VitalStatus {
  if (systolic < 120 && diastolic < 80) return { label: 'Normal', tone: 'good' }
  if (systolic < 130 && diastolic < 80) return { label: 'Slightly elevated', tone: 'warn' }
  return { label: 'Elevated', tone: 'bad' }
}

export function hrvStatus(v: number): VitalStatus {
  if (v >= 60) return { label: 'Good', tone: 'good' }
  if (v >= 40) return { label: 'Fair', tone: 'warn' }
  return { label: 'Low', tone: 'bad' }
}

export function stressStatus(v: number): VitalStatus {
  if (v < 2) return { label: 'Low', tone: 'good' }
  if (v < 4) return { label: 'Slightly elevated', tone: 'warn' }
  return { label: 'High', tone: 'bad' }
}

const toneScore = (tone: VitalTone) => (tone === 'good' ? 90 : tone === 'warn' ? 74 : 56)

export function bmiValue(heightCm: number | null, weightKg: number | null): number | null {
  if (!heightCm || !weightKg || heightCm <= 0) return null
  const meters = heightCm / 100
  return Math.round((weightKg / (meters * meters)) * 10) / 10
}

export function bmiStatus(bmi: number | null): VitalStatus | null {
  if (bmi == null) return null
  if (bmi < 18.5) return { label: 'Underweight', tone: 'warn' }
  if (bmi < 25) return { label: 'Normal', tone: 'good' }
  if (bmi < 30) return { label: 'Overweight', tone: 'warn' }
  return { label: 'Obese', tone: 'bad' }
}

export function riskStatus(percent: number | null): VitalStatus | null {
  if (percent == null) return null
  if (percent < 10) return { label: 'Low', tone: 'good' }
  if (percent < 20) return { label: 'Moderate', tone: 'warn' }
  return { label: 'High', tone: 'bad' }
}

export function wellnessScore(values: VitalValues): number {
  return Math.round(
    (toneScore(heartRateStatus(values.heartRate).tone) +
      toneScore(bloodPressureStatus(values.systolic, values.diastolic).tone) +
      toneScore(hrvStatus(values.hrv).tone) +
      toneScore(stressStatus(values.stress).tone)) /
      4
  )
}
