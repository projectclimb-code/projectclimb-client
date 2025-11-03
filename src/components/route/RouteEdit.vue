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
      <SpeedDial 
        :model="items" 
        direction="up" 
        class="speed-dial-large"
        :buttonProps="{ style: { width: '4.2rem', height: '4.2rem', fontSize: '2.2rem', borderRadius: '50%' } }"
        :actionButtonProps="{ style: { width: '3.2rem', height: '3.2rem', fontSize: '2.2rem', borderRadius: '50%', backgroundColor: 'white', color: 'black', border: 'none' } }"
        style="position: absolute; left: 2%; bottom: 10%" 
      />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { loadWallSvg, scaleLayer } from '@/wall/wall'
import SpeedDial from 'primevue/speeddial'
import { onBeforeUnmount, onMounted, ref, computed } from 'vue'
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

function handleSave() {
  // TODO: Implement save functionality
  console.log('Save clicked')
}

function handleCancel() {
  // TODO: Implement cancel functionality
  console.log('Cancel clicked')
}

function handleEditInfo() {
  // TODO: Implement edit info functionality
  console.log('Edit info clicked')
}

function handleFlip() {
  // TODO: Implement flip functionality
  console.log('Flip clicked')
}

const items = computed(() => [
  {
    label: 'Flip',
    icon: 'pi pi-refresh',
    command: handleFlip,
    tooltip: 'Flip',
    tooltipOptions: {
      position: 'left',
    },
  },
  {
    label: 'End',
    icon: 'pi pi-stop-circle',
    command: activateEndMode,
    tooltip: 'End',
    tooltipOptions: {
      position: 'left',
    },
    class: endMode.value ? 'opacity-50' : '',
  },
  {
    label: 'Start',
    icon: 'pi pi-play',
    command: activateStartMode,
    tooltip: 'Start',
    tooltipOptions: {
      position: 'left',
    },
    class: startMode.value ? 'opacity-50' : '',
  },
  {
    label: 'Edit info',
    icon: 'pi pi-pencil',
    command: handleEditInfo,
    tooltip: 'Edit info',
    tooltipOptions: {
      position: 'left',
    },
  },
  {
    label: 'Cancel',
    icon: 'pi pi-times',
    command: handleCancel,
    tooltip: 'Cancel',
    tooltipOptions: {
      position: 'left',
    },
  },
  {
    label: 'Save',
    icon: 'pi pi-check',
    command: handleSave,
    tooltip: 'Save',
    tooltipOptions: {
      position: 'left',
    },
  },
])

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

<style scoped>
:deep(.speed-dial-large .p-speeddial-button),
:deep(.speed-dial-large .p-speeddial-button-icon) {
  width: 4.2rem !important;
  height: 4.2rem !important;
  border-radius: 50% !important;
  font-size: 2.2rem !important;
}

:deep(.speed-dial-large .p-speeddial-action),
:deep(.speed-dial-large .p-speeddial-action-button),
:deep(.speed-dial-large .p-speeddial-action-icon) {
  width: 3.2rem !important;
  height: 3.2rem !important;
  border-radius: 50% !important;
  font-size: 2.2rem !important;
  min-width: 3.2rem !important;
  min-height: 3.2rem !important;
}

:deep(.speed-dial-large .p-speeddial-action-button) {
  border-radius: 50% !important;
  background-color: white !important;
  color: black !important;
  border: none !important;
  box-shadow: none !important;
  transition: background-color 0.2s ease !important;
}

:deep(.speed-dial-large .p-speeddial-action-button:hover) {
  background-color: #f0f0f0 !important;
}

:deep(.speed-dial-large .p-speeddial-action-icon) {
  color: black !important;
}

:deep(.speed-dial-large .p-button) {
  border-radius: 50% !important;
}
</style>
