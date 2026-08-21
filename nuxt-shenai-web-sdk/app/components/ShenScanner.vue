<script setup lang="ts">
const status = ref('Idle')

const {
    initialize,
    stop
} = useShenAI()

async function startScan() {
    status.value = 'Initializing'

    try {
        const result = await initialize()
        console.log(result)
        status.value = 'Ready'
    } catch (error) {
        console.error(error)
        status.value = 'Error: ' + (error as Error).message
    }
}

function stopScan() {
    stop()
    status.value = 'Stopped'
}
</script>

<template>
    <div>
        <ScanStatus :status="status" />

        <CameraCanvas />

        <ScanControls @start="startScan" @stop="stopScan" />

        <VitalResults />
    </div>
</template>