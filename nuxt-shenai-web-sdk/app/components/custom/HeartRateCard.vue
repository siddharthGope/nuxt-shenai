<script setup lang="ts">
const { heartRate } = useVitals()
</script>

<template>
  <VitalCard label="Heart Rate" :value="heartRate" unit="bpm" />
</template>