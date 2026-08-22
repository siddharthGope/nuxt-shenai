<script setup lang="ts">
const { stress } = useVitals()
</script>

<template>
  <VitalCard label="Stress" :value="stress">
    <template #icon>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
      </svg>
    </template>
  </VitalCard>
</template>