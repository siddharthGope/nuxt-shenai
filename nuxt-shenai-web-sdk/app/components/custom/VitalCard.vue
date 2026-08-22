<script setup lang="ts">
defineProps<{
  label: string
  value: number | string
  unit?: string
}>()
</script>

<template>
  <div class="vital-card">
    <span class="label">{{ label }}</span>
    <span class="value">
      {{ value }}<small v-if="unit"> {{ unit }}</small>
    </span>
  </div>
</template>

<style scoped>
.vital-card {
  border: 1px solid #e2e2e2;
  border-radius: 12px;
  padding: 16px 20px;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.label { font-size: 0.75rem; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
.value { font-size: 1.8rem; font-weight: 600; }
.value small { font-size: 0.9rem; font-weight: 400; color: #888; }
</style>