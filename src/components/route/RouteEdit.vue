<template>
  <div
    ref="box"
    class="flex relative touch-none items-center justify-center w-full route-edit-container"
    :class="{
      'h-full': true,
      'pt-[80px]': isTablet,
      'session-route': isSessionRoute
    }"
    style="min-height: 0; position: relative; pointer-events: auto; overflow: hidden;"
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
      :style="{ backgroundImage: `url(${plywood})`, zIndex: 1, pointerEvents: 'auto' }"
    >
      <v-stage
        ref="stage"
        :config="configKonva"
        class="touch-none canvas-stage"
      ></v-stage>
    </div>
    
    <!-- Route name and grade display -->
    <div
      v-if="currentRoute && !isSessionRoute"
      class="route-info-bar"
      :class="{
        'route-info-mobile': isMobile,
        'route-info-tablet': isTablet,
        'route-info-tablet-landscape': isTablet && isLandscape,
      }"
    >
      <div class="route-info-content">
        <span class="route-name">{{ currentRoute.name }}</span>
        <DifficultyTag :grade="currentRoute.data.grade" />
      </div>
    </div>
    
  </div>
</template>
<script lang="ts" setup>
import { loadWallSvg, scaleLayer } from '@/wall/wall'
import { onBeforeUnmount, onMounted, ref, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import plywood from '@/assets/images/plywood.jpg'
import ActionButtons from './ActionButtons.vue'
import DifficultyTag from './DifficultyTag.vue'
import { useRoutesStore } from '@/stores/routes'
import type { Route, Hold } from '@/interfaces/interfaces.ts'
import { HoldType } from '@/interfaces/interfaces.ts'
import { websocketService } from '@/services/ws.service'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useDialog } from 'primevue/usedialog'
import CancelDialog from './CancelDialog.vue'
import CreateBoulderDialog from './CreateBoulderDialog.vue'

const route = useRoute()
const router = useRouter()
const routesStore = useRoutesStore()
const toast = useToast()
const confirm = useConfirm()
const dialog = useDialog()
const isSessionRoute = computed(() => route.path === '/session')

const box = ref(null)
const innerbox = ref(null)
const isWide = ref(false)
const ratio = ref(1)
const isMobile = ref(false)
const isTablet = ref(false)
const isLandscape = ref(false)

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
  console.log('handleSave called', { currentRoute: currentRoute.value })
  
  if (!currentRoute.value || !currentRoute.value.id) {
    console.warn('No route to save')
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'No route to save',
      life: 3000
    })
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

  console.log('Saving route:', updatedRoute)

  try {
    await routesStore.saveRoute(updatedRoute)
    console.log('Route saved successfully')
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Saved successfully',
      life: 3000
    })
  } catch (error) {
    console.error('Failed to save route:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save',
      life: 3000
    })
  }
}

function handleCancel() {
  dialog.open(CancelDialog, {
    props: {
      header: '',
      style: { width: '90vw', maxWidth: '480px' },
      modal: true,
      dismissableMask: true,
      closable: false,
      closeOnEscape: true
    }
  })
}

function handleEditInfo() {
  if (!currentRoute.value) {
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'No route to edit',
      life: 3000
    })
    return
  }

  dialog.open(CreateBoulderDialog, {
    data: {
      route: currentRoute.value
    },
    props: {
      header: '',
      style: { width: '90vw', maxWidth: '420px' },
      modal: true,
      dismissableMask: true,
      closable: false,
      closeOnEscape: true
    },
    onClose: async (result) => {
      const data = result?.data
      if (data && data.name && data.grade && data.isEdit && currentRoute.value) {
        try {
          const updatedRoute: Route = {
            ...currentRoute.value,
            name: data.name,
            data: {
              ...currentRoute.value.data,
              grade: data.grade
            }
          }
          await routesStore.saveRoute(updatedRoute)
          currentRoute.value = updatedRoute
          toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Route updated successfully',
            life: 3000
          })
        } catch (error) {
          console.error('Failed to update route:', error)
          toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update route',
            life: 3000
          })
        }
      }
    }
  })
}

function handleFlip() {
  confirm.require({
    message: 'Are you sure you want to flip your selections?',
    header: 'Flip Selections',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'No',
      severity: 'secondary',
      outlined: true
    },
    acceptProps: {
      label: 'Yes',
      severity: 'warning'
    },
    accept: () => {
      // TODO: Implement flip functionality
      console.log('Flip confirmed')
    }
  })
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
  toast.add({
    severity: 'info',
    summary: 'Start',
    detail: 'Select two elements to start',
    life: 3000
  })
}

function activateEndMode() {
  endMode.value = true
  startMode.value = false
  toast.add({
    severity: 'info',
    summary: 'End',
    detail: 'Select one end element',
    life: 3000
  })
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
  const viewportHeight = window.innerHeight
  isMobile.value = viewportWidth < 640
  isTablet.value = viewportWidth >= 640 && viewportWidth < 1024
  isLandscape.value = viewportWidth > viewportHeight
  
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
      console.log('Route loaded:', routeToEdit.name, routeToEdit.data.grade)
      
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
    if (stage.value) {
      const konvaStage = stage.value.getNode()
      initKonva()
      
      setTimeout(() => {
        isWideScreen()
        updatePathColors()
      }, 50)
    }
  }, 100)
  
  handleResize = () => {
    isWideScreen()
    // Update landscape orientation
    isLandscape.value = window.innerWidth > window.innerHeight
  }
  window.addEventListener('resize', handleResize)
  // Initialize landscape state
  isLandscape.value = window.innerWidth > window.innerHeight

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
    width: min(calc(100vw - 8px), calc((100vh - 200px) * 0.78));
    max-width: 100vw;
    max-height: calc(100vh - 200px);
    border-radius: 12px;
  }
  .route-edit-container.box {
    align-items: flex-start !important;
    padding: 4px !important;
    padding-bottom: 0 !important;
  }
  .route-edit-container.box.session-route {
    padding-bottom: 0 !important;
  }
  .route-edit-container.box.session-route .canvas-container {
    max-height: calc(100vh - 180px) !important;
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

/* Ensure canvas container doesn't block bottom menu */
  .canvas-container {
  pointer-events: auto;
}

/* Ensure route edit container doesn't cover bottom menu */
.route-edit-container {
  z-index: 1;
  position: relative;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  padding-bottom: 0 !important;
  margin-bottom: 0 !important;
}

/* Route info bar */
.route-info-bar {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 12px 20px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
  z-index: 998;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.route-info-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.route-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Mobile: bottom above menu */
@media (max-width: 640px) {
  .route-info-bar {
    bottom: calc(80px + env(safe-area-inset-bottom, 0px));
    top: auto;
    padding: 10px 16px;
    border-radius: 10px;
    left: 50%;
    transform: translateX(-50%);
    width: auto;
    max-width: calc(100vw - 32px);
    z-index: 999;
  }
  
  .route-info-content {
    gap: 10px;
  }
  
  .route-name {
    font-size: 14px;
    max-width: 200px;
    color: #333;
    display: block;
  }
}

/* Tablet portrait: bottom above menu */
@media (min-width: 641px) and (max-width: 1024px) {
  .route-info-bar {
    bottom: 100px;
    top: auto;
    padding: 12px 18px;
  }
  
  .route-name {
    font-size: 15px;
    max-width: 250px;
  }
}

/* Tablet landscape: top of screen */
@media (min-width: 641px) and (max-width: 1024px) {
  .route-info-bar.route-info-tablet-landscape {
    top: 16px;
    bottom: auto;
  }
}

/* Desktop: bottom above menu */
@media (min-width: 1025px) {
  .route-info-bar {
    bottom: 105px;
    top: auto;
  }
}

/* Cancel Dialog wrapper styling */
:deep(.p-dialog) {
  border-radius: 20px !important;
  overflow: hidden;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05) !important;
  border: none !important;
}

:deep(.p-dialog .p-dialog-content) {
  padding: 0 !important;
}

</style>
