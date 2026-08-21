<script setup lang="ts">
const emit = defineEmits([
  'start',
  'stop'
])
</script>

<template>
  <div>
    <button @click="emit('start')">
      Start Scan
    </button>

    <button @click="emit('stop')">
      Stop Scan
    </button>
  </div>
</template>