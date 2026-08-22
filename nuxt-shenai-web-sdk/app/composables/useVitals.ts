// composables/useVitals.ts

export const useVitals = () => {
  const heartRate = useState('heartRate', () => 0)
  const systolic = useState('systolic', () => 0)
  const diastolic = useState('diastolic', () => 0)
  const stress = useState('stress', () => 0)
  const respiration = useState('respiration', () => 0)

  return {
    heartRate,
    systolic,
    diastolic,
    stress,
    respiration
  }
}