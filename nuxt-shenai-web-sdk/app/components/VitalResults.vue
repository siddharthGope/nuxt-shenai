<script setup lang="ts">
const {
  heartRate,
  respiration,
  stress
} = useVitals()
</script>

<template>
  <div>
    <h3>Results</h3>

    <p>
      Heart Rate:
      {{ heartRate }}
      bpm
    </p>

    <p>
      Respiration:
      {{ respiration }}
      rpm
    </p>

    <p>
      Stress:
      {{ stress }}
    </p>
  </div>
</template>