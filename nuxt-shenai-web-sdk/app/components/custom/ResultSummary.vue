<script setup lang="ts">
const { phase } = useScanState()
const { stop, initialize } = useShenAI()
const { heartRate, systolic, diastolic, stress, hrv } = useVitals()

type Status = { label: string; tone: 'good' | 'warn' | 'bad' }

const hrStatus = computed<Status>(() => {
  const v = heartRate.value
  if (v >= 60 && v <= 100) return { label: 'Normal', tone: 'good' }
  if ((v > 100 && v <= 110) || (v >= 50 && v < 60)) return { label: 'Slightly elevated', tone: 'warn' }
  return { label: 'Out of range', tone: 'bad' }
})

const bpStatus = computed<Status>(() => {
  const s = systolic.value
  const d = diastolic.value
  if (s < 120 && d < 80) return { label: 'Normal', tone: 'good' }
  if (s < 130 && d < 80) return { label: 'Slightly elevated', tone: 'warn' }
  return { label: 'Elevated', tone: 'bad' }
})

const hrvStatus = computed<Status>(() => {
  const v = hrv.value
  if (v >= 60) return { label: 'Good', tone: 'good' }
  if (v >= 40) return { label: 'Fair', tone: 'warn' }
  return { label: 'Low', tone: 'bad' }
})

const stressStatus = computed<Status>(() => {
  const v = stress.value
  if (v < 2) return { label: 'Low', tone: 'good' }
  if (v < 4) return { label: 'Slightly elevated', tone: 'warn' }
  return { label: 'High', tone: 'bad' }
})

const toneScore = (t: Status['tone']) => (t === 'good' ? 90 : t === 'warn' ? 74 : 56)

const wellness = computed(() =>
  Math.round(
    (toneScore(hrStatus.value.tone) +
      toneScore(bpStatus.value.tone) +
      toneScore(hrvStatus.value.tone) +
      toneScore(stressStatus.value.tone)) /
      4
  )
)

function close() {
  // Return to the start screen.
  stop()
}

async function scanAgain() {
  // Restart a fresh scan; the persistent #mxcanvas keeps the SDK binding valid.
  phase.value = 'scanning'
  try {
    await initialize()
  } catch {
    phase.value = 'camera'
  }
}
</script>

<template>
  <div class="profile">
    <header class="p-top">
      <button class="icon-btn" aria-label="Close" @click="close">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div class="brand">Lumi AI</div>
      <div class="avatar">J</div>
    </header>

    <div class="p-body">
      <div class="hero">
        <span class="check">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <h2>Your Health Profile</h2>
      </div>

      <p class="lead">Scan complete — here's your latest health profile.</p>

      <button class="pill" @click="scanAgain">Scan Again</button>

      <div class="score-card">
        <div class="score-info">
          <div class="score-k">WELLNESS SCORE</div>
          <div class="score-v">{{ wellness }}<small> / 100</small></div>
        </div>
        <div class="ring" :style="{ '--p': wellness }">
          <span>{{ wellness }}</span>
        </div>
        <svg class="chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>

      <p class="lead">Your Wellness Score is <b>{{ wellness }}</b> — you're doing well overall.</p>

      <div class="grid">
        <div class="metric-card">
          <div class="mc-top"><span>Heart Rate</span><i class="chev-sm" /></div>
          <div class="mc-v">{{ heartRate }}<small>bpm</small></div>
          <div class="mc-status" :class="hrStatus.tone"><span class="dot" />{{ hrStatus.label }}</div>
        </div>

        <div class="metric-card">
          <div class="mc-top"><span>Blood Pressure (est.)</span><i class="chev-sm" /></div>
          <div class="mc-v">{{ systolic }}/{{ diastolic }}</div>
          <div class="mc-status" :class="bpStatus.tone"><span class="dot" />{{ bpStatus.label }}</div>
        </div>

        <div class="metric-card">
          <div class="mc-top"><span>Heart Rate Variability</span><i class="chev-sm" /></div>
          <div class="mc-v">{{ hrv }}<small>ms</small></div>
          <div class="mc-status" :class="hrvStatus.tone"><span class="dot" />{{ hrvStatus.label }}</div>
        </div>

        <div class="metric-card">
          <div class="mc-top"><span>Stress Level</span><i class="chev-sm" /></div>
          <div class="mc-v">{{ stress }}</div>
          <div class="mc-status" :class="stressStatus.tone"><span class="dot" />{{ stressStatus.label }}</div>
        </div>
      </div>
    </div>

    <div class="ask-bar">
      <button class="ask-menu" aria-label="Menu">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <span class="ask-ph">Ask Lumi AI</span>
      <button class="ask-mic" aria-label="Voice">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M8 6v12M12 3v18M16 8v8M20 11v2M4 10v4" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.profile {
  width: 100%;
  max-width: 400px;
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.p-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
}
.icon-btn {
  border: none;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  display: grid;
  place-items: center;
}
.brand { font-weight: 700; font-size: 1.05rem; }
.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  display: grid;
  place-items: center;
}

.p-body { padding: 4px 20px 20px; }

.hero { display: flex; align-items: center; gap: 10px; }
.check {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #16a34a;
  color: #fff;
  display: grid;
  place-items: center;
}
.hero h2 { margin: 0; font-size: 1.35rem; }
.lead { color: var(--muted); line-height: 1.5; margin: 12px 0; }

.pill {
  border: 1px solid #d7dce3;
  background: #fff;
  color: var(--text);
  font-weight: 600;
  padding: 10px 20px;
  border-radius: 999px;
  cursor: pointer;
}

.score-card {
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #eef2f7;
  border-radius: 18px;
  padding: 18px;
  margin-top: 18px;
}
.score-info { flex: 1; }
.score-k { font-size: 0.7rem; letter-spacing: 0.06em; color: var(--muted); font-weight: 600; }
.score-v { font-size: 2rem; font-weight: 800; }
.score-v small { font-size: 1rem; font-weight: 500; color: var(--muted); }
.ring {
  --p: 0;
  width: 66px;
  height: 66px;
  border-radius: 50%;
  background: conic-gradient(#0f172a calc(var(--p) * 1%), #e5e7eb 0);
  display: grid;
  place-items: center;
  position: relative;
}
.ring::before { content: ''; position: absolute; inset: 9px; background: var(--surface); border-radius: 50%; }
.ring span { position: relative; font-weight: 700; font-size: 0.95rem; }
.chev { color: #94a3b8; }

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 6px;
}
.metric-card {
  border: 1px solid #eef2f7;
  border-radius: 16px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.mc-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--muted);
}
.chev-sm {
  width: 8px;
  height: 8px;
  border-top: 2px solid #cbd5e1;
  border-right: 2px solid #cbd5e1;
  transform: rotate(45deg);
  flex: none;
  margin-top: 3px;
}
.mc-v { font-size: 1.6rem; font-weight: 800; }
.mc-v small { font-size: 0.8rem; font-weight: 500; color: var(--muted); margin-left: 3px; }
.mc-status { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; color: #475569; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.mc-status.good .dot { background: #16a34a; }
.mc-status.warn .dot { background: #f59e0b; }
.mc-status.bad .dot { background: #dc2626; }

.ask-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-top: 1px solid #eef2f7;
  background: #fafbfc;
}
.ask-menu {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  background: #eef2f7;
  color: var(--text);
  display: grid;
  place-items: center;
  cursor: pointer;
}
.ask-ph { flex: 1; color: var(--muted); }
.ask-mic {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  background: #0f172a;
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
}
</style>