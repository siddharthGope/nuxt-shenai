<script setup lang="ts">
const { stop } = useShenAI()

function newScan() {
  // stop() deinitializes the SDK, resets vitals, and returns to the camera phase.
  stop()
}
</script>

<template>
  <div class="screen">
    <div class="badge">
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </div>

    <h2>Scan complete</h2>
    <p class="sub">Your measurement finished successfully.</p>

    <button class="btn" @click="newScan">
      New scan
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
</style>