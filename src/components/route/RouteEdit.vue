<template>
  <div
    ref="box"
    class="flex items-center justify-center relative h-[calc(100%-100px)] overflow-hidden"
  >
    <div
      ref="innerbox"
      class="relative bg-cover bg-center aspect-[0.78] flex items-center justify-center overflow-hidden bg-amber-600"
      :class="{
        'h-full max-w-full': isWide,
        'w-full max-h-full': !isWide,
      }"
    >
      <v-stage ref="stage" :config="configKonva"></v-stage>
      <div class="absolute top-0 left-0 flex flex-col gap-2">
        <Button label="Save" />
        <Button label="Cancel" />
        <Button label="Edit info" />
        <Button label="Start" />
        <Button label="End" />
        <Button label="Flip" />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { loadWallSvg, scaleLayer } from '@/wall/wall'
import Button from 'primevue/button'
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

function isWideScreen(width?: number, height?: number) {
  configKonva.value.width = innerbox.value.clientWidth
  configKonva.value.height = innerbox.value.clientHeight
  ratio.value = width / height || innerbox.value.clientWidth / innerbox.value.clientHeight
  isWide.value = ratio.value > 0.78
}

onMounted(() => {
  const konvaStage = stage.value.getNode()
  initKonva()
  isWideScreen()

  observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect
    isWideScreen(width, height)
    if (konvaStage && mainLayer.value) {
      scaleLayer(mainLayer.value, konvaStage)
    }
  })
  observer.observe(box.value)
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
})

async function initKonva() {
  const konvaStage = stage.value.getNode()
  mainLayer.value = await loadWallSvg()
  scaleLayer(mainLayer.value, konvaStage)
  konvaStage.add(mainLayer.value)
  konvaStage.draw()
}
</script>
