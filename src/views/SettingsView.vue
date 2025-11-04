<template>
  <div>
    <h1>Settings</h1>
    <div class="flex flex-wrap gap-2">
      <div>
        <Button @click="switchVisibility('background')">Background</Button>
        <ColorPicker v-model="backgroundColor" @change="sendBackgroundColor()" />
      </div>
      <div>
        <Button @click="switchVisibility('wallBackground')">Wall Background</Button>
        <ColorPicker v-model="wallBackgroundColor" @change="sendWallBackgroundColor()" />
      </div>
      <Button @click="switchVisibility('wallGrid')">Wall Grid</Button>
      <Button @click="holdsOff">Holds Off</Button>
      <Button @click="holdsOn">Holds On</Button>
      <Button @click="reset">Reset</Button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { websocketService } from '@/services/ws.service'
import ColorPicker from 'primevue/colorpicker'
import { ref } from 'vue'

const backgroundColor = ref('#000')
const wallBackgroundColor = ref('#000')
function switchVisibility(layer) {
  websocketService.send({ type: 'display', layer })
}

function sendBackgroundColor() {
  websocketService.send({ type: 'display', layer: 'background', color: backgroundColor.value })
}

function sendWallBackgroundColor() {
  websocketService.send({
    type: 'display',
    layer: 'wallBackground',
    color: wallBackgroundColor.value,
  })
}

function holdsOn() {
  websocketService.send({ type: 'display', layer: 'holds', visibility: true })
}

function holdsOff() {
  websocketService.send({ type: 'display', layer: 'holds', visibility: false })
}

function reset() {
  websocketService.send({ type: 'display', layer: 'reset', color: wallBackgroundColor.value })
}
</script>
<style lang="scss"></style>
