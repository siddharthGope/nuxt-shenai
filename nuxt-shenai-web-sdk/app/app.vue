<script setup lang="ts">
const { phase } = useScanState()
const { initialize, stop, measuring, finished, viewResults } = useShenAI()
const { heartRate, systolic, diastolic, stress, hrv } = useVitals()

const starting = ref(false)
const error = ref('')

async function begin() {
  error.value = ''
  starting.value = true
  try {
    await initialize()
    phase.value = 'scanning'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    starting.value = false
  }
}

function close() {
  stop()
  error.value = ''
}
</script>

<template>
  <div class="app">
    <!-- Keep the phone frame (and #mxcanvas) mounted so the SDK's canvas
         binding survives the results screen and re-scans work. -->
    <div v-show="phase !== 'results'" class="phone">
      <header class="topbar">
        <div>
          <div class="title">Vitals Measurement</div>
          <div class="subtitle">Powered by Shen.AI</div>
        </div>
        <button class="close" aria-label="Close" @click="close">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <!-- The branded SDK UI (camera + face mesh + brackets + START/STOP) renders here. -->
      <div class="stage">
        <canvas id="mxcanvas" />
      </div>

      <footer class="footer">
        <div v-if="measuring || finished" class="metrics">
          <div class="metric">
            <span class="k">PULSE</span>
            <span class="v">{{ heartRate }}<small>bpm</small></span>
          </div>
          <div class="metric">
            <span class="k">BLOOD PRESSURE</span>
            <span class="v accent">{{ systolic }}<small> / </small>{{ diastolic }}<small>mmHg</small></span>
          </div>
          <div class="metric">
            <span class="k">HRV</span>
            <span class="v">{{ hrv }}<small>ms</small></span>
          </div>
          <div class="metric">
            <span class="k">STRESS INDEX</span>
            <span class="v">{{ stress }}</span>
          </div>
        </div>

        <p v-else class="instruction">
          Hold your phone at eye level in good lighting and look at the camera.
          Tap <b>Start Scan</b> to begin.
        </p>

        <button v-if="phase === 'camera'" class="btn footer-btn" :disabled="starting" @click="begin">
          {{ starting ? 'Starting…' : 'Start Scan' }}
        </button>

        <button v-if="finished" class="btn view-results" @click="viewResults">
          View results
        </button>

        <p v-if="error" class="error">{{ error }}</p>
      </footer>
    </div>

    <ResultSummary v-if="phase === 'results'" />
  </div>
</template>

<style>
:root {
  --accent: #e8623d;
  --accent-dark: #c94f2e;
  --surface: #ffffff;
  --bg: #eef2f7;
  --text: #0f172a;
  --muted: #64748b;
  --radius: 28px;
  --shadow: 0 24px 60px rgba(2, 6, 23, 0.18);
}

* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }

body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  color: var(--text);
  background: radial-gradient(1100px 560px at 50% -12%, #f3f4f6 0%, var(--bg) 55%);
}

/* Shared UI primitives (also used by the custom flow components). */
.btn {
  appearance: none;
  border: none;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  padding: 14px 34px;
  border-radius: 999px;
  color: #fff;
  background: linear-gradient(180deg, var(--accent), var(--accent-dark));
  box-shadow: 0 10px 22px rgba(232, 98, 61, 0.35);
  transition: transform 0.06s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}
.btn:hover { box-shadow: 0 12px 28px rgba(232, 98, 61, 0.45); }
.btn:active { transform: translateY(1px); }
.btn:disabled { opacity: 0.6; cursor: default; box-shadow: none; }
.btn-ghost {
  background: #f1f5f9;
  color: var(--text);
  box-shadow: none;
}

.screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
  width: 100%;
}
.screen h1, .screen h2 { margin: 0; font-weight: 700; }
.screen h1 { font-size: 1.6rem; }
.screen h2 { font-size: 1.35rem; }
.screen .sub { margin: 0; color: var(--muted); max-width: 300px; line-height: 1.5; }
</style>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.phone {
  width: 100%;
  max-width: 400px;
  background: var(--surface);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
}
.title { font-weight: 700; font-size: 1.15rem; }
.subtitle { font-size: 0.75rem; color: var(--muted); }
.close {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: #f1f5f9;
  color: var(--text);
  display: grid;
  place-items: center;
  cursor: pointer;
}

.stage {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  background: #000;
}
#mxcanvas { width: 100%; height: 100%; display: block; }
.error { color: #dc2626; font-size: 0.85rem; text-align: center; padding: 8px 20px 0; }

.footer { padding: 16px 18px 22px; }
.footer-btn { width: 100%; }
.view-results { width: 100%; margin-top: 14px; }
.instruction {
  margin: 0;
  text-align: center;
  color: var(--muted);
  line-height: 1.5;
}
.instruction b { color: var(--accent); }

.metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.metric {
  padding: 14px 12px;
  border-top: 1px solid #eef2f7;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.metric:nth-child(odd) { border-right: 1px solid #eef2f7; }
.k { font-size: 0.68rem; letter-spacing: 0.06em; color: var(--muted); }
.v { font-size: 1.5rem; font-weight: 700; }
.v small { font-size: 0.75rem; font-weight: 500; color: var(--muted); }
.v.accent { color: var(--accent); }
</style>