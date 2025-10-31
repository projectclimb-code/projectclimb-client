<template>
  <div
    ref="box"
    class="flex items-center justify-center relative h-[calc(100%-100px)] overflow-hidden"
  >
    <div
      ref="innerbox"
      class="bg-cover bg-center aspect-[0.78] flex items-center justify-center overflow-hidden bg-amber-600"
      :class="{
        'h-full max-w-full': isWide,
        'w-full max-h-full': !isWide,
      }"
    >
      <v-stage ref="stage" :config="configKonva"></v-stage>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { loadWallSvg, scaleLayer } from '@/wall/wall'
import Konva from 'konva'
import { onBeforeUnmount, onMounted, ref } from 'vue'
const box = ref(null)
const innerbox = ref(null)
const isWide = ref(false)
const ratio = ref(1)

const configKonva = ref({
  width: 200,
  height: 200,
})
const stage = ref(null)
const mainLayer = ref(null)

let observer

onMounted(() => {
  mainLayer.value = new Konva.Layer()
  configKonva.value.width = innerbox.value.clientWidth
  configKonva.value.height = innerbox.value.clientHeight
  ratio.value = box.value.clientWidth / box.value.clientHeight
  isWide.value = ratio.value > 0.78
  scaleLayer(mainLayer.value, stage.value)

  observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect
    configKonva.value.width = innerbox.value.clientWidth
    configKonva.value.height = innerbox.value.clientHeight
    ratio.value = width / height
    isWide.value = ratio.value > 0.78
    scaleLayer(mainLayer.value, stage.value)
  })
  observer.observe(box.value)
  initKonva()
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
})

async function initKonva() {
  const konvaStage = stage.value.getNode()

  const holdsLayer = loadWallSvg()
  const layer = new Konva.Layer()
  layer.add(holdsLayer)
  konvaStage.add(layer)
  konvaStage.draw()
}
</script>
