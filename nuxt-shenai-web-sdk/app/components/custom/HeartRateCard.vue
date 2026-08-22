<script setup lang="ts">
const { heartRate } = useVitals()
</script>

<template>
  <VitalCard label="Heart Rate" :value="heartRate" unit="bpm">
    <template #icon>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
        <path d="M12 21s-7.5-4.7-10-9.3C.6 8 2.7 4.5 6.2 4.5c2 0 3.3 1 3.8 2 .5-1 1.8-2 3.8-2 3.5 0 5.6 3.5 4.2 7.2C19.5 16.3 12 21 12 21z" />
      </svg>
    </template>
  </VitalCard>
</template>