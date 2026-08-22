<script setup lang="ts">
const { phase } = useScanState()

function finish() {
  phase.value = 'finished'
}
</script>

<template>
  <div class="result-summary">
    <h2>Your Results</h2>

    <div class="cards">
      <HeartRateCard />
      <BloodPressureCard />
      <StressCard />
    </div>

    <button @click="finish">
      Finish
    </button>
  </div>
</template>

<style scoped>
.result-summary { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.cards { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; }
</style>