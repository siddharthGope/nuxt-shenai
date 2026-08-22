// composables/useScanState.ts

export const useScanState = () => {
  const phase = useState('scanPhase', () => 'camera')

  return {
    phase
  }
}