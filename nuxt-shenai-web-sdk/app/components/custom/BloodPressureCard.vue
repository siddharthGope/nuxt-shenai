<script setup lang="ts">
const { systolic, diastolic } = useVitals()
</script>

<template>
  <VitalCard
    label="Blood Pressure"
    :value="`${systolic}/${diastolic}`"
    unit="mmHg"
  >
    <template #icon>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 12h4l2 5 4-10 2 5h6" />
      </svg>
    </template>
  </VitalCard>
</template>