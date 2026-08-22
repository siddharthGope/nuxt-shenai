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
    phase.value = 'scanning'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="screen">
    <div class="hero">
      <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" aria-hidden="true">
        <path d="M12 21s-7.5-4.7-10-9.3C.6 8 2.7 4.5 6.2 4.5c2 0 3.3 1 3.8 2 .5-1 1.8-2 3.8-2 3.5 0 5.6 3.5 4.2 7.2C19.5 16.3 12 21 12 21z" />
      </svg>
    </div>

    <h1>Health Scan</h1>
    <p class="sub">Sit in a well-lit area, hold your device steady, and start your scan.</p>

    <button class="btn" :disabled="loading" @click="start">
      {{ loading ? 'Starting…' : 'Start Scan' }}
    </button>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.hero {
  width: 78px;
  height: 78px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(180deg, var(--accent), var(--accent-dark));
  box-shadow: 0 12px 26px rgba(16, 185, 129, 0.4);
}
.error { color: #dc2626; font-size: 0.9rem; }
</style>