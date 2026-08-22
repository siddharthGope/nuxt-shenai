<script setup lang="ts">
const { phase } = useScanState()
</script>

<template>
  <div class="scanner">
    <!-- Persistent camera canvas; the SDK renders the live camera here.
         Kept in the DOM (v-show) so the SDK always has a render target. -->
    <canvas
      id="mxcanvas"
      v-show="phase === 'guidance' || phase === 'measuring'"
    />

    <CameraView v-if="phase === 'camera'" />
    <FaceGuide v-else-if="phase === 'guidance'" />
    <ScanProgress v-else-if="phase === 'measuring'" />
    <ResultSummary v-else-if="phase === 'results'" />
    <FinishScreen v-else-if="phase === 'finished'" />
  </div>
</template>

<style scoped>
.scanner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.2rem;
  padding: 2rem;
  font-family: system-ui, sans-serif;
}

#mxcanvas {
  width: 100%;
  max-width: 420px;
  aspect-ratio: 3 / 4;
  background: #000;
  border-radius: 16px;
}
</style>