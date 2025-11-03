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
        <Button 
          label="Start" 
          :class="{ 'opacity-50': startMode }"
          @click="activateStartMode" 
        />
        <Button 
          label="End" 
          :class="{ 'opacity-50': endMode }"
          @click="activateEndMode" 
        />
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
const stage = ref<any>(null)
const mainLayer = ref<any>(null)
const startMode = ref(false)
const endMode = ref(false)
const selectedStarts = ref<string[]>([])
const selectedEnd = ref<string | null>(null)

let observer

function activateStartMode() {
  startMode.value = true
  endMode.value = false
}

function activateEndMode() {
  endMode.value = true
  startMode.value = false
}

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

function handlePathClick(pathId: string) {
  // Only allow selection when in appropriate mode
  if (startMode.value) {
    handleStartSelection(pathId)
  } else if (endMode.value) {
    handleEndSelection(pathId)
  } else {
    handleNormalSelection(pathId)
  }
}

function handleStartSelection(pathId: string) {
  const index = selectedStarts.value.indexOf(pathId)
  if (index > -1) {
    return
  }
  
  if (selectedStarts.value.length < 2) {
    selectedStarts.value.push(pathId)
  } else {
    selectedStarts.value[0] = pathId
  }
  
  if (selectedStarts.value.length === 2) {
    startMode.value = false
  }
  
  updatePathColors()
}

function handleEndSelection(pathId: string) {
  if (selectedEnd.value === pathId) {
    return
  }
  
  selectedEnd.value = pathId
  
  endMode.value = false
  
  updatePathColors()
}

function handleNormalSelection(pathId: string) {
  if (selectedStarts.value.includes(pathId) || selectedEnd.value === pathId) {
    return
  }
  
  if (!stage.value || !mainLayer.value) return
  
  const konvaStage = stage.value.getNode()
  const path = mainLayer.value.findOne(`#${pathId}`)
  if (path) {
    const currentOpacity = path.opacity()
    path.opacity(currentOpacity < 1 ? 1 : 0.3)
    path.getLayer()?.batchDraw()
  }
}

function updatePathColors() {
  if (!mainLayer.value || !stage.value) return
  
  const konvaStage = stage.value.getNode()
  const children = mainLayer.value.children
  if (!children) return
  
  children.forEach((node: any) => {
    const pathId = node.id()
    const isStart = selectedStarts.value.includes(pathId)
    const isEnd = selectedEnd.value === pathId
    
    // Update start/end positions
    if (isStart) {
      node.fill('green')
      node.opacity(1)
    } else if (isEnd) {
      node.fill('red')
      node.opacity(1)
    } else {
      const currentFill = node.fill()
      if (currentFill === 'green' || currentFill === 'red') {
        node.fill('white')
        if (node.opacity() === 1) {
          node.opacity(0.3)
        }
      }
    }
  })
  
  konvaStage.draw()
}

async function initKonva() {
  const konvaStage = stage.value.getNode()
  mainLayer.value = await loadWallSvg(
    handlePathClick,
    selectedStarts.value,
    selectedEnd.value
  )
  scaleLayer(mainLayer.value, konvaStage)
  konvaStage.add(mainLayer.value)
  konvaStage.draw()
}
</script>
