<script setup lang="ts">
defineProps<{
  label: string
  value: number | string
  unit?: string
}>()
</script>

<template>
  <div class="vital-card">
    <div class="icon"><slot name="icon" /></div>
    <span class="label">{{ label }}</span>
    <span class="value">
      {{ value }}<small v-if="unit"> {{ unit }}</small>
    </span>
  </div>
</template>

<style scoped>
.vital-card {
  flex: 1 1 130px;
  min-width: 130px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
.icon { color: var(--accent); line-height: 0; }
.icon:empty { display: none; }
.label { font-size: 0.7rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.value { font-size: 1.7rem; font-weight: 700; line-height: 1; }
.value small { font-size: 0.85rem; font-weight: 500; color: var(--muted); }
</style>