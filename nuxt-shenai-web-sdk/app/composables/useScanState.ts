// composables/useScanState.ts

export const useScanState = () => {
  const phase = useState('scanPhase', () => 'consent')

  return {
    phase
  }
}