<script setup lang="ts">
const { stop } = useShenAI()

function newScan() {
  // stop() deinitializes the SDK, resets vitals, and returns to the camera phase.
  stop()
}
</script>

<template>
  <div class="finish-screen">
    <h2>Scan Complete</h2>
    <p>Your measurement has finished.</p>

    <button @click="newScan">
      New Scan
    </button>
  </div>
</template>

<style scoped>
.finish-screen { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
</style>