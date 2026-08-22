<script setup lang="ts">
const { phase } = useScanState()
</script>

<template>

  <CameraView
    v-if="phase === 'camera'"
  />

  <FaceGuide
    v-else-if="phase === 'guidance'"
  />

  <ScanProgress
    v-else-if="phase === 'measuring'"
  />

  <ResultSummary
    v-else-if="phase === 'results'"
  />

  <FinishScreen
    v-else-if="phase === 'finished'"
  />

</template>