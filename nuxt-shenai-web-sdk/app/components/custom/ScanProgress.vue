<script setup lang="ts">
const { progress } = useShenAI()
const { heartRate } = useVitals()
</script>

<template>
  <div class="scan-progress">
    <h2>Measuring Vitals…</h2>

    <progress :value="progress" max="100" />
    <p>{{ progress }}%</p>

    <p v-if="heartRate">Live Heart Rate: {{ heartRate }} bpm</p>
  </div>
</template>

<style scoped>
.scan-progress { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
progress { width: 100%; max-width: 320px; height: 14px; }
</style>