<script setup lang="ts">
const { phase } = useScanState()
const { startMeasurement } = useShenAI()

function beginMeasurement() {
  startMeasurement()
  phase.value = 'measuring'
}
</script>

<template>
  <div class="face-guide">
    <h2>Position Your Face</h2>
    <p>Keep your face centered in the frame and hold still.</p>

    <button @click="beginMeasurement">
      Begin Measurement
    </button>
  </div>
</template>

<style scoped>
.face-guide { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
</style>