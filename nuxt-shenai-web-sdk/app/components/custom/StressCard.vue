<script setup lang="ts">
const { stress } = useVitals()
</script>

<template>
  <VitalCard label="Stress" :value="stress" />
</template>