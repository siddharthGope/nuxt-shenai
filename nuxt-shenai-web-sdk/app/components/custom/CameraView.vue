<script setup lang="ts">
const { phase } = useScanState()
const { initialize } = useShenAI()

const loading = ref(false)
const error = ref('')

async function start() {
  error.value = ''
  loading.value = true
  try {
    await initialize()
    phase.value = 'guidance'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="camera-view">
    <h1>Health Scan</h1>
    <p>Sit in a well-lit area, hold your device steady, and tap start.</p>

    <button :disabled="loading" @click="start">
      {{ loading ? 'Starting…' : 'Start Scan' }}
    </button>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.camera-view { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
.error { color: #c0392b; }
</style>