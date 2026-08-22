<script setup lang="ts">
const { progress } = useShenAI()
const { heartRate } = useVitals()
</script>

<template>
  <div class="screen">
    <div class="ring" :style="{ '--p': progress }">
      <span>{{ progress }}%</span>
    </div>

    <h2>Measuring vitals…</h2>

    <p v-if="heartRate" class="live">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d="M12 21s-7.5-4.7-10-9.3C.6 8 2.7 4.5 6.2 4.5c2 0 3.3 1 3.8 2 .5-1 1.8-2 3.8-2 3.5 0 5.6 3.5 4.2 7.2C19.5 16.3 12 21 12 21z" />
      </svg>
      {{ heartRate }} <small>bpm</small>
    </p>

    <p class="sub">Keep still until the scan completes.</p>
  </div>
</template>

<style scoped>
.ring {
  --p: 0;
  width: 128px;
  height: 128px;
  border-radius: 50%;
  background: conic-gradient(var(--accent) calc(var(--p) * 1%), #e2e8f0 0);
  display: grid;
  place-items: center;
  position: relative;
}
.ring::before {
  content: '';
  position: absolute;
  inset: 11px;
  background: var(--surface);
  border-radius: 50%;
}
.ring span { position: relative; font-size: 1.5rem; font-weight: 700; }
.live {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--accent-dark);
}
.live small { font-size: 0.8rem; font-weight: 500; color: var(--muted); }
</style>