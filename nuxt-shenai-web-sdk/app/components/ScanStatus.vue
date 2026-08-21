<script setup lang="ts">
defineProps<{
  status: string
}>()
</script>

<template>
  <div>
    Status: {{ status }}
  </div>
</template>