<script setup lang="ts">
const { phase } = useScanState()
const { startMeasurement } = useShenAI()

function beginMeasurement() {
  startMeasurement()
  phase.value = 'measuring'
}
</script>

<template>
  <div class="screen">
    <h2>Position your face</h2>
    <p class="sub">Center your face in the frame above and hold still. Good, even lighting improves accuracy.</p>

    <button class="btn" @click="beginMeasurement">
      Begin measurement
    </button>
  </div>
</template>