<script setup lang="ts">
const { phase } = useScanState()
const {
  initialize,
  startMeasurement,
  stopMeasurement,
  setViewRect,
  stop,
  progress,
  measuring,
  ready,
  faceHint
} = useShenAiCapacitor()
const { heartRate, systolic, diastolic, stress, hrv } = useVitals()

const starting = ref(false)
const error = ref('')
const stageEl = ref<HTMLElement | null>(null)

async function updateNativeCameraRect() {
  if (!stageEl.value) return

  const rect = stageEl.value.getBoundingClientRect()
  await setViewRect({
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height
  }).catch((cameraError) => {
    console.warn('[ShenAI] Could not position native camera view:', cameraError)
  })
}

let cameraResizeObserver: ResizeObserver | null = null
onMounted(() => {
  cameraResizeObserver = new ResizeObserver(() => void updateNativeCameraRect())
  if (stageEl.value) cameraResizeObserver.observe(stageEl.value)
  window.addEventListener('resize', updateNativeCameraRect)
  setCameraBackground(phase.value === 'scanning' || phase.value === 'measuring')
})
onBeforeUnmount(() => {
  cameraResizeObserver?.disconnect()
  window.removeEventListener('resize', updateNativeCameraRect)
})
watch(phase, (nextPhase) => {
  setCameraBackground(nextPhase === 'scanning' || nextPhase === 'measuring')
})

function continueFromConsent() {
  phase.value = 'camera'
}

function setCameraBackground(enabled: boolean) {
  document.documentElement.classList.toggle('native-camera-active', enabled)
  document.body.classList.toggle('native-camera-active', enabled)
}

async function begin() {
  error.value = ''
  starting.value = true
  try {
    await initialize('user123')
    await nextTick()
    await updateNativeCameraRect()
    requestAnimationFrame(() => void updateNativeCameraRect())
    setCameraBackground(true)
    phase.value = 'scanning'
    console.info("[ShenAI] SDK initialized successfully; phase set to 'scanning'")
  } catch (e) {
    error.value = (e as Error).message
    console.error('[ShenAI] Failed to initialize:', e)
  } finally {
    starting.value = false
  }
}

function close() {
  stop()
  setCameraBackground(false)
  error.value = ''
  phase.value = 'consent'
}
</script>

<template>
  <div class="app">

    <!-- <ResultSummary /> -->
    <ConsentScreen v-if="phase === 'consent'" @continue="continueFromConsent" />

    <!-- Keep the native camera view mounted while the custom controls overlay it. -->
    <div v-show="phase !== 'consent' && phase !== 'results'" class="phone">
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

      <div ref="stageEl" class="stage">
        <div v-if="phase === 'scanning'" class="guide">
          <span class="br tl" /><span class="br tr" />
          <span class="br bl" /><span class="br br-c" />
        </div>

        <div v-if="phase === 'scanning' && !measuring" class="hint">
          {{ faceHint }}
        </div>

        <div v-if="measuring" class="progress">
          <span :style="{ width: progress + '%' }" />
        </div>
      </div>

      <footer class="footer">
        <div v-if="measuring" class="metrics">
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
        </p>

        <button v-if="phase === 'camera'" class="btn footer-btn" :disabled="starting" @click="begin">
          {{ starting ? 'Starting…' : 'Start Scan' }}
        </button>

        <button
          v-else-if="phase === 'scanning' && !measuring"
          class="btn footer-btn"
          :disabled="starting"
          @click="startMeasurement"
        >
          {{ ready ? 'Start Measurement' : 'Checking face position' }}
        </button>

        <button v-else-if="measuring" class="btn btn-ghost footer-btn" @click="stopMeasurement">
          Stop
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
html.native-camera-active,
body.native-camera-active {
  background: transparent;
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

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  background: var(--surface);
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
  background: transparent;
  overflow: hidden;
}
.cam {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 2;
  transform: scaleX(-1); /* mirror for a natural selfie view */
}
/* The SDK's WebGL frame pipeline only runs when this canvas is genuinely
   on-screen (moving it off-screen via -99999px silently stops frame
   processing, even though cameraMode/getLastCameraError look fine). Keep it
   in-viewport at real size, just pixel-covered by our own <video> on top. */
.proc-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
}

/* Face-position guide (corner brackets). */
.guide {
  position: absolute;
  inset: 12% 14%;
  z-index: 3;
  pointer-events: none;
}
.br {
  position: absolute;
  width: 28px;
  height: 28px;
  border: 3px solid var(--accent);
  transition: border-color 0.2s ease;
}
.guide.ok .br { border-color: #22c55e; }
.br.tl { top: 0; left: 0; border-right: none; border-bottom: none; border-top-left-radius: 8px; }
.br.tr { top: 0; right: 0; border-left: none; border-bottom: none; border-top-right-radius: 8px; }
.br.bl { bottom: 0; left: 0; border-right: none; border-top: none; border-bottom-left-radius: 8px; }
.br.br-c { bottom: 0; right: 0; border-left: none; border-top: none; border-bottom-right-radius: 8px; }

.hint {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  background: rgba(15, 23, 42, 0.7);
  color: #fff;
  font-size: 0.85rem;
  padding: 6px 14px;
  border-radius: 999px;
  white-space: nowrap;
}
.hint.warn { background: rgba(220, 38, 38, 0.85); }
.progress {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 14px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.35);
  z-index: 3;
  overflow: hidden;
}
.progress span {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width 0.3s ease;
}

.error { color: #dc2626; font-size: 0.85rem; text-align: center; padding: 8px 20px 0; }

.footer { padding: 16px 18px 22px; background: var(--surface); }
.footer-btn { width: 100%; }
.view-results { width: 100%; margin-top: 14px; }
.instruction {
  margin: 0 0 14px;
  text-align: center;
  color: var(--muted);
  line-height: 1.5;
}

.metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin-bottom: 14px;
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