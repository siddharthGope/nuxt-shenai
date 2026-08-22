<script setup lang="ts">
const { systolic, diastolic } = useVitals()
</script>

<template>
  <VitalCard
    label="Blood Pressure"
    :value="`${systolic}/${diastolic}`"
    unit="mmHg"
  />
</template>