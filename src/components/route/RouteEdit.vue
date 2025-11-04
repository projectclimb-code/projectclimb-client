<template>
  <div
    ref="box"
    class="flex relative touch-none items-center justify-center w-full"
    :class="{
      'h-[calc(100vh-150px)]': isMobile,
      'h-[calc(100%-100px)] overflow-hidden': !isMobile,
      'pt-[80px]': isTablet,
      'session-route': isSessionRoute
    }"
    style="min-height: 0; position: relative;"
  >
    <ActionButtons
      :is-mobile="isMobile"
      :is-session-route="isSessionRoute"
      :start-mode="startMode"
      :end-mode="endMode"
      @save="handleSave"
      @cancel="handleCancel"
      @edit-info="handleEditInfo"
      @flip="handleFlip"
      @start="activateStartMode"
      @end="activateEndMode"
    />

    <div
      ref="innerbox"
      class="relative bg-cover bg-center flex items-center justify-center overflow-hidden"
      :class="{
        'canvas-container': true,
        'tablet-canvas': isTablet,
      }"
      :style="{ backgroundImage: `url(${plywood})`, zIndex: 1 }"
    >
      <v-stage
        ref="stage"
        :config="configKonva"
        class="touch-none canvas-stage"
      ></v-stage>
    </div>
    
  </div>
</template>
<script lang="ts" setup>
import { loadWallSvg, scaleLayer } from '@/wall/wall'
import { onBeforeUnmount, onMounted, ref, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import plywood from '@/assets/images/plywood.jpg'
import ActionButtons from './ActionButtons.vue'
import { useRoutesStore } from '@/stores/routes'
import type { Route, Hold } from '@/interfaces/interfaces.ts'
import { HoldType } from '@/interfaces/interfaces.ts'
import { websocketService } from '@/services/ws.service'

const route = useRoute()
const router = useRouter()
const routesStore = useRoutesStore()
const isSessionRoute = computed(() => route.path === '/session')

const box = ref(null)
const innerbox = ref(null)
const isWide = ref(false)
const ratio = ref(1)
const isMobile = ref(false)
const isTablet = ref(false)

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
const selectedNormalPositions = ref<Set<string>>(new Set())
const currentRoute = ref<Route | null>(null)

let observer: ResizeObserver | null = null

async function handleSave() {
  if (!currentRoute.value || !currentRoute.value.id) {
    console.error('No route to save')
    return
  }

  const holds: Hold[] = []
  
  selectedStarts.value.forEach((id) => {
    holds.push({ id, type: HoldType.start })
  })
  
  Array.from(selectedNormalPositions.value).forEach((id) => {
    holds.push({ id, type: HoldType.normal })
  })
  
  if (selectedEnd.value) {
    holds.push({ id: selectedEnd.value, type: HoldType.finish })
  }

  const updatedRoute: Route = {
    ...currentRoute.value,
    data: {
      ...currentRoute.value.data,
      problem: {
        holds,
      },
    },
  }

  try {
    await routesStore.saveRoute(updatedRoute)
    router.push('/routes')
  } catch (error) {
    console.error('Failed to save route:', error)
  }
}

function handleCancel() {
  router.push('/routes')
}

function handleEditInfo() {
  // TODO: Implement edit info functionality
  console.log('Edit info clicked')
}

function handleFlip() {
  // TODO: Implement flip functionality
  console.log('Flip clicked')
}

function preview() {
  websocketService.send({
    type: 'preview',
    startHolds: [...selectedStarts.value],
    finishHold: selectedEnd.value || null,
    holds: Array.from(selectedNormalPositions.value),
  })
}

function activateStartMode() {
  startMode.value = true
  endMode.value = false
}

function activateEndMode() {
  endMode.value = true
  startMode.value = false
}

function isWideScreen(width?: number, height?: number) {
  if (!innerbox.value || !(innerbox.value as HTMLElement).clientWidth) {
    setTimeout(() => {
      if (innerbox.value && (innerbox.value as HTMLElement).clientWidth) {
        isWideScreen()
      }
    }, 50)
    return
  }
  
  const containerWidth = (innerbox.value as HTMLElement).clientWidth
  const containerHeight = (innerbox.value as HTMLElement).clientHeight
  
  if (containerWidth === 0 || containerHeight === 0) {
    setTimeout(() => {
      if (innerbox.value) {
        const retryWidth = (innerbox.value as HTMLElement).clientWidth
        const retryHeight = (innerbox.value as HTMLElement).clientHeight
        if (retryWidth > 0 && retryHeight > 0) {
          isWideScreen()
        }
      }
    }, 50)
    return
  }
  
  configKonva.value.width = containerWidth
  configKonva.value.height = containerHeight
  ratio.value = containerWidth / containerHeight
  isWide.value = ratio.value > 0.78
  
  const viewportWidth = window.innerWidth
  isMobile.value = viewportWidth < 640
  isTablet.value = viewportWidth >= 640 && viewportWidth < 1024
  
  if (stage.value && mainLayer.value) {
    const konvaStage = stage.value.getNode()
    scaleLayer(mainLayer.value, konvaStage)
    konvaStage.draw()
  }
}

let handleResize: (() => void) | null = null

onMounted(async () => {
  await nextTick()
  
  const routeId = route.query.id ? Number(route.query.id) : null
  if (routeId) {
    await routesStore.getRoutes()
    const routeToEdit = routesStore.routes.find((r) => r.id === routeId)
    if (routeToEdit) {
      currentRoute.value = routeToEdit
      
      if (routeToEdit.data?.problem?.holds) {
        routeToEdit.data.problem.holds.forEach((hold) => {
          if (hold.type === HoldType.start) {
            selectedStarts.value.push(hold.id)
          } else if (hold.type === HoldType.finish) {
            selectedEnd.value = hold.id
          } else if (hold.type === HoldType.normal) {
            selectedNormalPositions.value.add(hold.id)
          }
        })
      }
    }
  }
  
  setTimeout(() => {
    const konvaStage = stage.value.getNode()
    initKonva()
    
    setTimeout(() => {
      isWideScreen()
      updatePathColors()
    }, 50)
  }, 100)
  
  handleResize = () => {
    isWideScreen()
  }
  window.addEventListener('resize', handleResize)

  observer = new ResizeObserver(() => {
    setTimeout(() => {
      isWideScreen()
    }, 10)
  })
  
  setTimeout(() => {
    if (observer) {
      if (box.value) {
        observer.observe(box.value as Element)
      }
      if (innerbox.value) {
        observer.observe(innerbox.value as Element)
      }
    }
  }, 100)
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
  if (handleResize) {
    window.removeEventListener('resize', handleResize)
  }
})

function handlePathClick(pathId: string) {
  if (startMode.value) {
    handleStartSelection(pathId)
  } else if (endMode.value) {
    handleEndSelection(pathId)
  } else {
    handleNormalSelection(pathId)
  }
  preview()
}

function handleStartSelection(pathId: string) {
  const index = selectedStarts.value.indexOf(pathId)
  
  if (index > -1) {
    selectedStarts.value.splice(index, 1)
    updatePathColors()
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
    selectedEnd.value = null
    updatePathColors()
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
  if (!path) return
  
  const isCurrentlySelected = selectedNormalPositions.value.has(pathId)
  
  if (isCurrentlySelected) {
    selectedNormalPositions.value.delete(pathId)
    path.opacity(0.3)
  } else {
    selectedNormalPositions.value.add(pathId)
    path.opacity(1)
  }
  
  path.getLayer()?.batchDraw()
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
    const isNormalSelected = selectedNormalPositions.value.has(pathId)
    
    if (isStart) {
      node.fill('green')
      node.opacity(1)
    } else if (isEnd) {
      node.fill('red')
      node.opacity(1)
    } else {
      node.fill('white')
      if (isNormalSelected) {
        node.opacity(1)
      } else {
        node.opacity(0.3)
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
/* Container for Konva canvas, centered with aspect ratio */
.canvas-container {
  aspect-ratio: 0.78;
  position: relative;
  width: 100%;
  max-width: 100vw;
  max-height: 100vh;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* The canvas should always fill its container */
.canvas-stage {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

.box {
  display: flex !important;
  justify-content: center !important;
}

@media (max-width: 640px) {
  /* Mobile: use nearly all available screen space */
  .canvas-container {
    width: min(calc(100vw - 8px), calc((100vh - 120px) * 0.78));
    max-width: 100vw;
    max-height: calc(100vh - 120px);
    border-radius: 12px;
  }
  .box {
    align-items: flex-start !important;
    padding: 4px !important;
    padding-bottom: 80px !important;
  }
  .box.session-route {
    padding-bottom: 4px !important;
  }
  .box.session-route .canvas-container {
    max-height: calc(100vh - 100px) !important;
  }

  :deep(canvas) {
    touch-action: none;
    -webkit-touch-callout: none;
  }
}

/* Tablet styles */
@media (min-width: 641px) and (max-width: 1024px) {
  .canvas-container {
    width: min(90vw, 90%) !important;
    max-width: 90% !important;
    max-height: calc(100vh - 240px) !important;
  }
  .box {
    align-items: flex-start !important;
    padding-top: 80px !important;
  }
}

/* Desktop styles */
@media (min-width: 1025px) {
  .canvas-container {
    width: min(90vw, calc(100% - 100px));
    max-width: calc(100% - 100px);
    max-height: calc(100% - 50px);
  }
  .box {
    align-items: center !important;
  }
}

/* Prevent unwanted selection/tap highlight on mobile/tablet */
@media (max-width: 1024px) {
  .touch-none {
    -webkit-tap-highlight-color: transparent;
    touch-action: none;
    user-select: none;
  }
}

</style>
