export const useVitals = () => {
  const heartRate = useState<number>('heartRate', () => 0)
  const stress = useState<number>('stress', () => 0)
  const respiration = useState<number>('respiration', () => 0)

  return {
    heartRate,
    stress,
    respiration
  }
}
