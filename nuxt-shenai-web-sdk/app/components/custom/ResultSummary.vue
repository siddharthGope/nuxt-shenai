<script setup lang="ts">
const { phase } = useScanState()

function finish() {
  phase.value = 'finished'
}
</script>

<template>
  <div class="screen">
    <div class="badge">
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </div>

    <h2>Your results</h2>

    <div class="cards">
      <HeartRateCard />
      <BloodPressureCard />
      <StressCard />
    </div>

    <button class="btn" @click="finish">
      Finish
    </button>
  </div>
</template>

<style scoped>
.badge {
  width: 66px;
  height: 66px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(180deg, var(--accent), var(--accent-dark));
  box-shadow: 0 10px 24px rgba(16, 185, 129, 0.4);
}
.cards { display: flex; flex-wrap: wrap; gap: 12px; width: 100%; }
</style>