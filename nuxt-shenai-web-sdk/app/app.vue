<script setup lang="ts">
const { phase } = useScanState()

const showCamera = computed(
  () => phase.value === 'guidance' || phase.value === 'measuring'
)
</script>

<template>
  <div class="app">
    <div class="device">
      <div v-show="showCamera" class="stage">
        <canvas id="mxcanvas" />
      </div>

      <CameraView v-if="phase === 'camera'" />
      <FaceGuide v-else-if="phase === 'guidance'" />
      <ScanProgress v-else-if="phase === 'measuring'" />
      <ResultSummary v-else-if="phase === 'results'" />
      <FinishScreen v-else-if="phase === 'finished'" />
    </div>
  </div>
</template>

<style>
:root {
  --accent: #10b981;
  --accent-dark: #059669;
  --surface: #ffffff;
  --bg: #eef2f7;
  --text: #0f172a;
  --muted: #64748b;
  --radius: 22px;
  --shadow: 0 18px 44px rgba(2, 6, 23, 0.12);
}

* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }

body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  color: var(--text);
  background: radial-gradient(1100px 560px at 50% -12%, #dbeafe 0%, var(--bg) 55%);
}

/* Shared UI primitives */
.btn {
  appearance: none;
  border: none;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  padding: 14px 30px;
  border-radius: 999px;
  color: #fff;
  background: linear-gradient(180deg, var(--accent), var(--accent-dark));
  box-shadow: 0 10px 22px rgba(16, 185, 129, 0.35);
  transition: transform 0.06s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}
.btn:hover { box-shadow: 0 12px 28px rgba(16, 185, 129, 0.45); }
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
.device {
  width: 100%;
  max-width: 420px;
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}
.stage {
  width: 100%;
  border-radius: 18px;
  overflow: hidden;
  background: #000;
  line-height: 0;
}
#mxcanvas {
  width: 100%;
  aspect-ratio: 3 / 4;
  display: block;
}
</style>