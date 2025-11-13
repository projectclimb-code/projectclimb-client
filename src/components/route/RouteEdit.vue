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
        'pan-mode': isPanMode,
        'pan-dragging': isDragging,
      }"
      :style="{ backgroundImage: `url(${plywood})`, zIndex: 1, pointerEvents: 'auto' }"
    >
      <v-stage
        ref="stage"
        :config="configKonva"
        class="touch-none canvas-stage"
      ></v-stage>
      <canvas
        v-if="isSessionRoute"
        ref="skeletonCanvas"
        class="skeleton-canvas"
        :style="{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10,
        }"
      ></canvas>
    </div>
    
    <ZoomControls
      :is-pan-mode="isPanMode"
      @zoom-in="handleZoomIn"
      @zoom-out="handleZoomOut"
      @reset="handleReset"
      @toggle-pan="togglePanMode"
    />
    
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
import { constants } from '@/utils/constants'
import { onBeforeUnmount, onMounted, ref, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import plywood from '@/assets/images/plywood.jpg'
import ActionButtons from './ActionButtons.vue'
import DifficultyTag from './DifficultyTag.vue'
import ZoomControls from './ZoomControls.vue'
import { useRoutesStore } from '@/stores/routes'
import type { Route, Hold, ClimbingRouteGrade } from '@/interfaces/interfaces.ts'
import { HoldType } from '@/interfaces/interfaces.ts'
import { websocketService } from '@/services/ws.service'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useDialog } from 'primevue/usedialog'
import CancelDialog from './CancelDialog.vue'
import CreateBoulderDialog from './CreateBoulderDialog.vue'
import { POSE_CONNECTIONS } from '@mediapipe/pose'
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'

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
  draggable: false,
})
const stage = ref<any>(null)
const mainLayer = ref<any>(null)
const skeletonCanvas = ref<HTMLCanvasElement | null>(null)
const startMode = ref(false)
const endMode = ref(false)
const selectedStarts = ref<string[]>([])
const selectedEnd = ref<string | null>(null)
const selectedNormalPositions = ref<Set<string>>(new Set())
const currentRoute = ref<Route | null>(null)

// Skeleton drawing state
const lastPoseData = ref<any[] | null>(null)
let skeletonCtx: CanvasRenderingContext2D | null = null
let skeletonAnimationFrame: number | null = null
let wsUnsubscribe: (() => void) | null = null
let isSkeletonLoopRunning = false

// Buffering for smooth animation
interface BufferedPoseFrame {
  landmarks: any[]
  timestamp: number
}
const poseBuffer: BufferedPoseFrame[] = []
const BUFFER_SIZE = 3 // Store last 3 frames
const INTERPOLATION_DELAY = 16 // ~60 FPS (16ms per frame)
const MAX_FRAME_AGE = 200 // Max age of frame in ms before considering it stale
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
let reconnectTimeout: number | null = null

// Debug/performance tracking
let wsMessageCount = 0
let wsLastMessageTime = 0
let wsMessageTimes: number[] = []
let drawCount = 0
let lastDrawTime = 0
let drawTimes: number[] = []
const DEBUG_SKELETON = true // Set to false to disable debug logs

// Pan and zoom state
const zoomScale = ref(1) // User zoom multiplier (starts at 1)
const baseScale = ref(1) // Base scale from scaleLayer
const basePosition = ref({ x: 0, y: 0 }) // Base position from scaleLayer
const panOffset = ref({ x: 0, y: 0 }) // User pan offset
const isPanMode = ref(false)
const isDragging = ref(false)
const lastPointerPosition = ref({ x: 0, y: 0 })
const minZoom = 0.5
const maxZoom = 3

let observer: ResizeObserver | null = null
let flipToastTimeout: ReturnType<typeof setTimeout> | null = null

async function handleSave() {
  disablePanMode()
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

  // Check if route has no grade - show grade selection dialog
  const hasGrade = currentRoute.value.data?.grade && currentRoute.value.data.grade.trim() !== ''
  if (!hasGrade) {
    dialog.open(CreateBoulderDialog, {
      data: {
        route: currentRoute.value,
        selectGradeOnly: true
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
        if (data && data.grade) {
          // Update route with grade and save
          await performSave(data.grade)
        }
      }
    })
    return
  }

  // Route has grade, proceed with normal save
  await performSave()
}

async function performSave(grade?: ClimbingRouteGrade) {
  if (!currentRoute.value || !currentRoute.value.id) return

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
      grade: grade || currentRoute.value.data?.grade,
      problem: {
        holds,
      },
    },
  }

  console.log('Saving route:', updatedRoute)

  try {
    await routesStore.saveRoute(updatedRoute)
    currentRoute.value = updatedRoute
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
  disablePanMode()
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
  disablePanMode()
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
      if (data && data.name && data.grade && data.author && data.isEdit && currentRoute.value) {
        try {
          const updatedRoute: Route = {
            ...currentRoute.value,
            name: data.name,
            data: {
              ...currentRoute.value.data,
              grade: data.grade,
              author: data.author
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

function flipId(id: string): string {
  const numId = parseInt(id, 10)
  
  if (isNaN(numId)) {
    return id // Return as-is if not a number
  }
  
  // Left side (0-99, up to 100) -> Right side (100-199)
  if (numId >= 0 && numId < 100) {
    return String(numId + 100)
  }
  // Right side (100-199, from 100 to 200) -> Left side (0-99)
  else if (numId >= 100 && numId < 200) {
    return String(numId - 100)
  }
  // Middle elements (>= 200) stay the same
  else {
    return id
  }
}

function handleFlip() {
  disablePanMode()
  // Flip start holds
  selectedStarts.value = selectedStarts.value.map(id => flipId(id))
  
  // Flip end hold
  if (selectedEnd.value) {
    selectedEnd.value = flipId(selectedEnd.value)
  }
  
  // Flip normal holds
  const flippedNormal = new Set<string>()
  selectedNormalPositions.value.forEach(id => {
    flippedNormal.add(flipId(id))
  })
  selectedNormalPositions.value = flippedNormal
  
  // Update the visual representation
  updatePathColors()
  
  // Preview the flipped route
  preview()
  
  // Clear any pending toast notification
  if (flipToastTimeout) {
    clearTimeout(flipToastTimeout)
  }
  
  // Debounce the toast notification
  flipToastTimeout = setTimeout(() => {
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Selections flipped successfully',
      life: 3000,
      group: 'flip'
    })
    flipToastTimeout = null
  }, 300)
}

function preview() {
  websocketService.send({
    type: 'preview',
    route: {
      data: {
        problem: {
          holds: [
            ...selectedStarts.value.map((id) => ({ id, type: HoldType.start })),
            ...Array.from(selectedNormalPositions.value).map((id) => ({
              id,
              type: HoldType.normal,
            })),
            ...(selectedEnd.value
              ? [{ id: selectedEnd.value, type: HoldType.finish }]
              : []),
          ],
        },
      }
    }
  })
}

function activateStartMode() {
  disablePanMode()
  startMode.value = true
  endMode.value = false
}

function activateEndMode() {
  disablePanMode()
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
  const viewportHeight = window.innerHeight
  isMobile.value = viewportWidth < 640
  isTablet.value = viewportWidth >= 640 && viewportWidth < 1024
  isLandscape.value = viewportWidth > viewportHeight
  
  if (stage.value && mainLayer.value) {
    const konvaStage = stage.value.getNode()
    scaleLayer(mainLayer.value, konvaStage)
    
    // Update base scale and position after resize
    baseScale.value = mainLayer.value.scaleX()
    basePosition.value = {
      x: mainLayer.value.x(),
      y: mainLayer.value.y(),
    }
    
    // Reapply transform with new base values
    applyTransform()
    konvaStage.draw()
    
    // Update skeleton canvas size to match SVG
    if (isSessionRoute.value) {
      updateSkeletonCanvasSize()
    }
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
  
  setTimeout(async () => {
    if (stage.value) {
      const konvaStage = stage.value.getNode()
      await initKonva()
      
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
      if (isSessionRoute.value) {
        updateSkeletonCanvasSize()
      }
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
  
  // Setup WebSocket for session mode
  if (isSessionRoute.value) {
    setupWebSocket()
    nextTick(() => {
      updateSkeletonCanvasSize()
    })
  }
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
  if (handleResize) {
    window.removeEventListener('resize', handleResize)
  }
  if (wsUnsubscribe) {
    wsUnsubscribe()
    wsUnsubscribe = null
  }
  if (skeletonAnimationFrame !== null) {
    cancelAnimationFrame(skeletonAnimationFrame)
    skeletonAnimationFrame = null
  }
  if (reconnectTimeout !== null) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }
  isSkeletonLoopRunning = false
  poseBuffer.length = 0 // Clear buffer
  // Only disconnect if we're leaving session mode
  if (!isSessionRoute.value) {
    websocketService.disconnect()
  }
})

function handlePathClick(pathId: string) {
  // Deselect pan mode when clicking on a path
  if (isPanMode.value) {
    togglePanMode()
  }
  
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
  
  // If clicking an already selected start, deselect it
  if (index > -1) {
    selectedStarts.value.splice(index, 1)
    updatePathColors()
    return
  }
  
  // If no starts selected, add first start
  if (selectedStarts.value.length === 0) {
    selectedStarts.value.push(pathId)
  }
  // If one start selected, add second start
  else if (selectedStarts.value.length === 1) {
    selectedStarts.value.push(pathId)
    // Exit start mode after selecting the second start position
    startMode.value = false
  }
  // If both starts selected, replace the last (second) one
  else if (selectedStarts.value.length === 2) {
    selectedStarts.value[1] = pathId
    // Exit start mode after replacing
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

// Pan and zoom functions
function constrainPanOffset() {
  if (!mainLayer.value || !stage.value) return
  
  const konvaStage = stage.value.getNode()
  const stageWidth = konvaStage.width()
  const stageHeight = konvaStage.height()
  const finalScale = baseScale.value * zoomScale.value
  
  // Calculate the scaled SVG dimensions
  const scaledWidth = constants.WALL_WIDTH_MM * finalScale
  const scaledHeight = constants.WALL_HEIGHT_MM * finalScale
  
  // Only constrain if the scaled SVG is larger than the stage (zoomed in)
  // If zoomed out, the SVG should stay centered
  if (scaledWidth <= stageWidth && scaledHeight <= stageHeight) {
    // When zoomed out, keep centered (pan offset should be 0)
    panOffset.value = { x: 0, y: 0 }
    return
  }
  
  // When zoomed in, allow panning but keep at least 10% visible on each side
  const minVisibleWidth = scaledWidth * 0.1
  const minVisibleHeight = scaledHeight * 0.1
  
  // The layer center position is: basePosition + panOffset
  // The layer left edge is: (basePosition.x + panOffset.x) - scaledWidth/2
  // The layer right edge is: (basePosition.x + panOffset.x) + scaledWidth/2
  
  // We want the left edge to be at most minVisibleWidth off-screen to the left
  // So: (basePosition.x + panOffset.x) - scaledWidth/2 >= -minVisibleWidth
  // Solving for panOffset.x: panOffset.x >= -minVisibleWidth - basePosition.x + scaledWidth/2
  const minPanX = -minVisibleWidth - basePosition.value.x + scaledWidth / 2
  
  // We want the right edge to be at most minVisibleWidth off-screen to the right
  // So: (basePosition.x + panOffset.x) + scaledWidth/2 <= stageWidth + minVisibleWidth
  // Solving for panOffset.x: panOffset.x <= stageWidth + minVisibleWidth - basePosition.x - scaledWidth/2
  const maxPanX = stageWidth + minVisibleWidth - basePosition.value.x - scaledWidth / 2
  
  // Same for Y axis
  const minPanY = -minVisibleHeight - basePosition.value.y + scaledHeight / 2
  const maxPanY = stageHeight + minVisibleHeight - basePosition.value.y - scaledHeight / 2
  
  // Only clamp if the range is valid (min < max)
  if (minPanX < maxPanX) {
    panOffset.value.x = Math.max(minPanX, Math.min(maxPanX, panOffset.value.x))
  }
  if (minPanY < maxPanY) {
    panOffset.value.y = Math.max(minPanY, Math.min(maxPanY, panOffset.value.y))
  }
}

function applyTransform() {
  if (!mainLayer.value || !stage.value) return
  
  const konvaStage = stage.value.getNode()
  // Apply base scale * zoom scale
  const finalScale = baseScale.value * zoomScale.value
  
  // Constrain pan offset before applying (only if not actively dragging to allow smooth panning)
  if (!isDragging.value) {
    constrainPanOffset()
  }
  
  mainLayer.value.scale({ x: finalScale, y: finalScale })
  
  // Apply base position + pan offset
  mainLayer.value.position({
    x: basePosition.value.x + panOffset.value.x,
    y: basePosition.value.y + panOffset.value.y,
  })
  konvaStage.draw()
  
  // Redraw skeleton if in session mode (skeleton will be redrawn in animation loop)
}

function handleZoomIn() {
  disablePanMode()
  zoomScale.value = Math.min(zoomScale.value * 1.2, maxZoom)
  applyTransform()
}

function handleZoomOut() {
  disablePanMode()
  zoomScale.value = Math.max(zoomScale.value / 1.2, minZoom)
  applyTransform()
}

function handleReset() {
  disablePanMode()
  if (!mainLayer.value || !stage.value || !innerbox.value) return
  
  const container = innerbox.value as HTMLElement
  const containerWidth = container.clientWidth
  const containerHeight = container.clientHeight
  
  if (containerWidth === 0 || containerHeight === 0) {
    // Wait for container to be ready
    setTimeout(() => handleReset(), 50)
    return
  }
  
  // Reset zoom and pan values first
  zoomScale.value = 1
  panOffset.value = { x: 0, y: 0 }
  
  // Update configKonva to ensure reactive stage size is correct
  configKonva.value.width = containerWidth
  configKonva.value.height = containerHeight
  
  // Wait for next tick to ensure Vue-Konva has updated the stage size
  nextTick(() => {
    if (!mainLayer.value || !stage.value) return
    
    const updatedStage = stage.value.getNode()
    
    // Ensure stage size matches container (in case Vue-Konva hasn't updated)
    if (updatedStage.width() !== containerWidth || updatedStage.height() !== containerHeight) {
      updatedStage.width(containerWidth)
      updatedStage.height(containerHeight)
    }
    
    // Recalculate base scale and position by calling scaleLayer
    // This will center the SVG at stage.width()/2, stage.height()/2
    scaleLayer(mainLayer.value, updatedStage)
    
    // Update base scale and position after scaleLayer
    baseScale.value = mainLayer.value.scaleX()
    basePosition.value = {
      x: mainLayer.value.x(),
      y: mainLayer.value.y(),
    }
    
    // Ensure pan offset is still 0
    panOffset.value = { x: 0, y: 0 }
    
    // Apply transform - this will position the layer at basePosition (centered)
    applyTransform()
  })
}

function togglePanMode() {
  isPanMode.value = !isPanMode.value
  isDragging.value = false
  // Don't make the stage draggable - we handle panning through mouse events on the layer
  if (stage.value) {
    const konvaStage = stage.value.getNode()
    konvaStage.draggable(false)
    konvaStage.draw()
  }
}

function disablePanMode() {
  if (isPanMode.value) {
    isPanMode.value = false
    isDragging.value = false
    if (stage.value) {
      const konvaStage = stage.value.getNode()
      konvaStage.draggable(false)
      konvaStage.draw()
    }
  }
}

function handleWheel(e: WheelEvent) {
  e.preventDefault()
  if (!stage.value || !mainLayer.value) return
  
  const konvaStage = stage.value.getNode()
  const stageBox = konvaStage.container().getBoundingClientRect()
  const pointer = {
    x: e.clientX - stageBox.left,
    y: e.clientY - stageBox.top,
  }
  
  const oldZoom = zoomScale.value
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  zoomScale.value = Math.max(minZoom, Math.min(zoomScale.value * delta, maxZoom))
  
  // Calculate zoom point in layer coordinates
  const layerPoint = {
    x: (pointer.x - basePosition.value.x - panOffset.value.x) / (baseScale.value * oldZoom),
    y: (pointer.y - basePosition.value.y - panOffset.value.y) / (baseScale.value * oldZoom),
  }
  
  // Adjust pan offset to keep the zoom point under the mouse
  panOffset.value = {
    x: pointer.x - layerPoint.x * (baseScale.value * zoomScale.value) - basePosition.value.x,
    y: pointer.y - layerPoint.y * (baseScale.value * zoomScale.value) - basePosition.value.y,
  }
  
  applyTransform()
}

function handleMouseDown(e: MouseEvent) {
  if (!isPanMode.value || !stage.value || !mainLayer.value) return
  
  // Only pan with left mouse button
  if (e.button !== 0) return
  
  // Check if clicking on a path - if so, don't pan
  const konvaStage = stage.value.getNode()
  const pointer = konvaStage.getPointerPosition()
  if (!pointer) return
  
  const clickedOnShape = konvaStage.getIntersection(pointer)
  if (clickedOnShape && clickedOnShape !== konvaStage && clickedOnShape !== mainLayer.value) {
    // Clicked on a shape (path), let the normal click handler work
    return
  }
  
  isDragging.value = true
  const stageBox = konvaStage.container().getBoundingClientRect()
  lastPointerPosition.value = {
    x: e.clientX - stageBox.left,
    y: e.clientY - stageBox.top,
  }
  e.preventDefault()
  e.stopPropagation()
}

function handleMouseMove(e: MouseEvent) {
  if (!isPanMode.value || !isDragging.value || !stage.value || !mainLayer.value) return
  
  const konvaStage = stage.value.getNode()
  const stageBox = konvaStage.container().getBoundingClientRect()
  const newPointerPosition = {
    x: e.clientX - stageBox.left,
    y: e.clientY - stageBox.top,
  }
  
  const dx = newPointerPosition.x - lastPointerPosition.value.x
  const dy = newPointerPosition.y - lastPointerPosition.value.y
  
  // Update pan offset to move the layer (not the stage)
  panOffset.value = {
    x: panOffset.value.x + dx,
    y: panOffset.value.y + dy,
  }
  
  lastPointerPosition.value = newPointerPosition
  applyTransform()
  e.preventDefault()
  e.stopPropagation()
}

function handleMouseUp() {
  isDragging.value = false
  // Apply constraints after dragging ends
  if (mainLayer.value && stage.value) {
    constrainPanOffset()
    applyTransform()
  }
}

async function initKonva() {
  if (!stage.value) return
  
  const konvaStage = stage.value.getNode()
  mainLayer.value = await loadWallSvg(
    handlePathClick,
    selectedStarts.value,
    selectedEnd.value
  )
  
  // Wait for next tick to ensure stage is fully initialized
  await nextTick()
  
  scaleLayer(mainLayer.value, konvaStage)
  
  // Store base scale and position after scaleLayer
  baseScale.value = mainLayer.value.scaleX()
  basePosition.value = {
    x: mainLayer.value.x(),
    y: mainLayer.value.y(),
  }
  
  konvaStage.add(mainLayer.value)
  
  // Initialize transform before drawing to prevent jump
  zoomScale.value = 1
  panOffset.value = { x: 0, y: 0 }
  applyTransform()
  konvaStage.draw()
  
  // Attach event listeners to the stage container
  const container = konvaStage.container()
  container.addEventListener('wheel', handleWheel, { passive: false })
  container.addEventListener('mousedown', handleMouseDown)
  container.addEventListener('mousemove', handleMouseMove)
  container.addEventListener('mouseup', handleMouseUp)
  container.addEventListener('mouseleave', handleMouseUp)
}

// Skeleton drawing functions
function setupWebSocket() {
  if (!isSessionRoute.value) return
  
  const wsUrl = 'wss://climber.dev.maptnh.net/ws/pose/'
  
  // Don't disconnect if already connected to the same URL - just reuse the connection
  // Only disconnect if we need to change endpoints
  
  // Clear any existing reconnect timeout
  if (reconnectTimeout !== null) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }
  
  reconnectAttempts = 0
  
  const connectWebSocket = () => {
    try {
      websocketService.connect(wsUrl)
      
      // Subscribe to WebSocket messages for pose data
      wsUnsubscribe = websocketService.subscribe((data: any) => {
        // Process immediately without blocking - use microtask for debug logging
        const now = performance.now()
        
        // Parse landmarks first (fast path)
        let landmarks: any[] | null = null
        
        if (Array.isArray(data)) {
          landmarks = data
        } else if (data?.landmarks) {
          landmarks = Array.isArray(data.landmarks) ? data.landmarks : null
        } else if (data?.pose_landmarks) {
          landmarks = Array.isArray(data.pose_landmarks) ? data.pose_landmarks : null
        }
        
        // Update data immediately if valid
        if (landmarks && landmarks.length > 0) {
          // Store latest landmarks
          lastPoseData.value = landmarks
          
          // Add to buffer for smooth interpolation
          poseBuffer.push({
            landmarks: landmarks,
            timestamp: now
          })
          
          // Keep buffer size limited
          if (poseBuffer.length > BUFFER_SIZE) {
            poseBuffer.shift()
          }
          
          // Start continuous animation loop if not already running
          if (!isSkeletonLoopRunning) {
            isSkeletonLoopRunning = true
            if (DEBUG_SKELETON) {
              console.log('[Skeleton Debug] Starting animation loop')
            }
            skeletonAnimationLoop()
          }
        }
        
        // Debug tracking (async to not block message processing)
        if (DEBUG_SKELETON) {
          // Use setTimeout with 0 delay to defer debug work
          setTimeout(() => {
            wsMessageCount++
            const timeSinceLastMessage = wsLastMessageTime > 0 ? now - wsLastMessageTime : 0
            wsLastMessageTime = now
            wsMessageTimes.push(timeSinceLastMessage)
            
            // Keep only last 60 timings (about 1 second at 60fps)
            if (wsMessageTimes.length > 60) {
              wsMessageTimes.shift()
            }
            
            // Log stats every 30 messages
            if (wsMessageCount % 30 === 0) {
              const avgTime = wsMessageTimes.reduce((a, b) => a + b, 0) / wsMessageTimes.length
              const minTime = Math.min(...wsMessageTimes.filter(t => t > 0))
              const maxTime = Math.max(...wsMessageTimes)
              const fps = avgTime > 0 ? (1000 / avgTime).toFixed(1) : 'N/A'
              console.log('[Skeleton Debug] WebSocket:', {
                messageCount: wsMessageCount,
                avgInterval: `${avgTime.toFixed(2)}ms`,
                minInterval: `${minTime.toFixed(2)}ms`,
                maxInterval: `${maxTime.toFixed(2)}ms`,
                estimatedFPS: fps,
                dataSize: JSON.stringify(data).length,
                isArray: Array.isArray(data),
                bufferSize: poseBuffer.length,
              })
              
              if (landmarks && landmarks.length > 0) {
                console.log('[Skeleton Debug] Landmarks received:', {
                  count: landmarks.length,
                  firstLandmark: landmarks[0],
                  timestamp: now,
                })
              } else {
                console.warn('[Skeleton Debug] No valid landmarks in message:', data)
              }
            }
          }, 0)
        }
      })
      
      // Reset reconnect attempts on successful connection
      reconnectAttempts = 0
    } catch (error) {
      console.error('[Skeleton Debug] WebSocket connection error:', error)
      attemptReconnect(wsUrl)
    }
  }
  
  // Initial connection attempt
  setTimeout(() => {
    connectWebSocket()
  }, 100)
}

function attemptReconnect(wsUrl: string) {
  // Only reconnect if we're still in session mode and haven't exceeded max attempts
  if (!isSessionRoute.value || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    if (DEBUG_SKELETON && reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[Skeleton Debug] Max reconnection attempts reached')
    }
    return
  }
  
  // Clear any existing reconnect timeout
  if (reconnectTimeout !== null) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }
  
  reconnectAttempts++
  const delay = Math.min(2000 * reconnectAttempts, 10000) // Longer delays, max 10s
  
  if (DEBUG_SKELETON) {
    console.log(`[Skeleton Debug] Reconnecting attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`)
  }
  
  reconnectTimeout = window.setTimeout(() => {
    if (!isSessionRoute.value) {
      return // Don't reconnect if we've left session mode
    }
    
    // Only reconnect if socket is actually closed
    try {
      websocketService.connect(wsUrl)
      reconnectAttempts = 0 // Reset on successful connection
    } catch (error) {
      console.error('[Skeleton Debug] Reconnection failed:', error)
      // Don't recursively call attemptReconnect - let it happen naturally if needed
    }
  }, delay)
}

function updateSkeletonCanvasSize() {
  if (!skeletonCanvas.value || !innerbox.value || !stage.value) {
    skeletonCtx = null
    return
  }
  
  const container = innerbox.value as HTMLElement
  const containerWidth = container.clientWidth
  const containerHeight = container.clientHeight
  
  if (containerWidth > 0 && containerHeight > 0) {
    skeletonCanvas.value.width = containerWidth
    skeletonCanvas.value.height = containerHeight
    // Get and cache the context
    skeletonCtx = skeletonCanvas.value.getContext('2d')
  }
}

function interpolateLandmarks(frame1: any[], frame2: any[], t: number): any[] {
  // Interpolate between two frames
  // t is interpolation factor (0 = frame1, 1 = frame2)
  if (!frame1 || !frame2 || frame1.length !== frame2.length) {
    return frame1 || frame2 || []
  }
  
  return frame1.map((lm1: any, i: number) => {
    const lm2 = frame2[i]
    return {
      x: (lm1.x || 0) + ((lm2.x || 0) - (lm1.x || 0)) * t,
      y: (lm1.y || 0) + ((lm2.y || 0) - (lm1.y || 0)) * t,
      z: (lm1.z || 0) + ((lm2.z || 0) - (lm1.z || 0)) * t,
      visibility: (lm1.visibility !== undefined ? lm1.visibility : 1) + 
                  ((lm2.visibility !== undefined ? lm2.visibility : 1) - 
                   (lm1.visibility !== undefined ? lm1.visibility : 1)) * t,
    }
  })
}

function getInterpolatedPose(): any[] | null {
  const now = performance.now()
  
  // Clean up stale frames from buffer
  while (poseBuffer.length > 0) {
    const oldestFrame = poseBuffer[0]
    if (oldestFrame && now - oldestFrame.timestamp > MAX_FRAME_AGE * 2) {
      poseBuffer.shift()
    } else {
      break
    }
  }
  
  if (poseBuffer.length === 0) {
    return lastPoseData.value
  }
  
  if (poseBuffer.length === 1) {
    const frame = poseBuffer[0]
    // If frame is too old, don't use it
    if (!frame || (frame && now - frame.timestamp > MAX_FRAME_AGE)) {
      return lastPoseData.value
    }
    return frame.landmarks || lastPoseData.value
  }
  
  // Get the two most recent frames
  const frame1 = poseBuffer[poseBuffer.length - 2]
  const frame2 = poseBuffer[poseBuffer.length - 1]
  
  if (!frame1 || !frame2) {
    return lastPoseData.value
  }
  
  // If frames are too old, just use the latest
  if (now - frame2.timestamp > MAX_FRAME_AGE) {
    return frame2.landmarks
  }
  
  // Calculate interpolation factor based on time since last frame
  const timeSinceFrame1 = now - frame1.timestamp
  const timeBetweenFrames = frame2.timestamp - frame1.timestamp
  
  if (timeBetweenFrames <= 0) {
    return frame2.landmarks
  }
  
  // Interpolate between frames (0 = frame1, 1 = frame2)
  // Clamp t to prevent extrapolation beyond frame2
  const t = Math.min(1, Math.max(0, timeSinceFrame1 / timeBetweenFrames))
  
  return interpolateLandmarks(frame1.landmarks, frame2.landmarks, t)
}

function transformLandmarks(landmarks: any[]): any[] {
  if (!mainLayer.value || !stage.value || !skeletonCanvas.value) {
    return []
  }
  
  const konvaStage = stage.value.getNode()
  const canvas = skeletonCanvas.value
  const finalScale = baseScale.value * zoomScale.value
  
  // Calculate the scaled SVG dimensions
  const scaledWidth = constants.WALL_WIDTH_MM * finalScale
  const scaledHeight = constants.WALL_HEIGHT_MM * finalScale
  
  // Calculate layer position
  const layerX = basePosition.value.x + panOffset.value.x
  const layerY = basePosition.value.y + panOffset.value.y
  
  // Calculate layer bounds
  const leftEdge = layerX - scaledWidth / 2
  const topEdge = layerY - scaledHeight / 2
  
  // Transform landmarks from normalized wall coordinates (0-1) to canvas coordinates (0-1)
  return landmarks.map((lm: any) => {
    // Convert from normalized wall coordinates to pixel coordinates in the layer
    const pixelX = leftEdge + (lm.x * scaledWidth)
    const pixelY = topEdge + (lm.y * scaledHeight)
    
    // Normalize to canvas coordinates (0-1) for MediaPipe drawing utilities
    return {
      x: pixelX / canvas.width,
      y: pixelY / canvas.height,
      z: lm.z || 0,
      visibility: lm.visibility !== undefined ? lm.visibility : 1,
    }
  })
}

function drawSkeleton(landmarks: any[]) {
  const drawStartTime = performance.now()
  
  if (!skeletonCanvas.value || !landmarks || landmarks.length === 0 || !skeletonCtx) {
    return
  }
  
  const canvas = skeletonCanvas.value
  
  // Ensure canvas is properly sized and context is cached
  if (canvas.width === 0 || canvas.height === 0) {
    updateSkeletonCanvasSize()
    if (!skeletonCtx || canvas.width === 0 || canvas.height === 0) {
      return
    }
  }
  
  const ctx = skeletonCtx
  
  // Transform landmarks to canvas coordinates
  const transformStartTime = performance.now()
  const transformedLandmarks = transformLandmarks(landmarks)
  const transformTime = performance.now() - transformStartTime
  
  if (transformedLandmarks.length === 0) {
    return
  }
  
  // Clear canvas
  const clearStartTime = performance.now()
  ctx.save()
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const clearTime = performance.now() - clearStartTime
  
  // Draw pose connections using MediaPipe utilities
  const drawConnectorsStartTime = performance.now()
  drawConnectors(ctx, transformedLandmarks, POSE_CONNECTIONS, {
    color: '#00FF00',
    lineWidth: 4,
  })
  const drawConnectorsTime = performance.now() - drawConnectorsStartTime
  
  // Draw pose landmarks using MediaPipe utilities
  const drawLandmarksStartTime = performance.now()
  drawLandmarks(ctx, transformedLandmarks, {
    color: '#FF0000',
    lineWidth: 2,
    radius: 5,
  })
  const drawLandmarksTime = performance.now() - drawLandmarksStartTime
  
  ctx.restore()
  
  // Track drawing performance
  if (DEBUG_SKELETON) {
    const totalDrawTime = performance.now() - drawStartTime
    drawCount++
    const timeSinceLastDraw = lastDrawTime > 0 ? drawStartTime - lastDrawTime : 0
    lastDrawTime = drawStartTime
    drawTimes.push(totalDrawTime)
    
    // Keep only last 60 timings
    if (drawTimes.length > 60) {
      drawTimes.shift()
    }
    
    // Log stats every 60 draws (about 1 second at 60fps)
    if (drawCount % 60 === 0) {
      const avgDrawTime = drawTimes.reduce((a, b) => a + b, 0) / drawTimes.length
      const maxDrawTime = Math.max(...drawTimes)
      const avgInterval = timeSinceLastDraw > 0 ? timeSinceLastDraw : 0
      const drawFPS = avgInterval > 0 ? (1000 / avgInterval).toFixed(1) : 'N/A'
      
      console.log('[Skeleton Debug] Drawing Performance:', {
        drawCount,
        avgDrawTime: `${avgDrawTime.toFixed(2)}ms`,
        maxDrawTime: `${maxDrawTime.toFixed(2)}ms`,
        transformTime: `${transformTime.toFixed(2)}ms`,
        clearTime: `${clearTime.toFixed(2)}ms`,
        drawConnectorsTime: `${drawConnectorsTime.toFixed(2)}ms`,
        drawLandmarksTime: `${drawLandmarksTime.toFixed(2)}ms`,
        estimatedDrawFPS: drawFPS,
        landmarksCount: landmarks.length,
      })
    }
  }
}

function skeletonAnimationLoop() {
  if (!isSkeletonLoopRunning) return
  
  const loopStartTime = performance.now()
  
  // Always continue the loop, even if no data
  // Get interpolated pose data from buffer for smooth animation
  const interpolatedPose = getInterpolatedPose()
  
  if (interpolatedPose && interpolatedPose.length > 0) {
    drawSkeleton(interpolatedPose)
  } else {
    // Keep drawing the last known pose if available, even if stale
    if (lastPoseData.value && lastPoseData.value.length > 0) {
      drawSkeleton(lastPoseData.value)
    } else if (DEBUG_SKELETON && drawCount % 300 === 0) {
      console.warn('[Skeleton Debug] Animation loop running but no pose data available')
    }
  }
  
  const loopTime = performance.now() - loopStartTime
  
  // Track loop performance
  if (DEBUG_SKELETON && drawCount % 300 === 0) {
    const now = performance.now()
    const lastFrameTime = poseBuffer.length > 0 
      ? poseBuffer[poseBuffer.length - 1]?.timestamp || 0 
      : 0
    const timeSinceLastFrame = now - lastFrameTime
    
    console.log('[Skeleton Debug] Animation loop:', {
      loopTime: `${loopTime.toFixed(2)}ms`,
      hasPoseData: !!interpolatedPose,
      bufferSize: poseBuffer.length,
      timeSinceLastFrame: `${timeSinceLastFrame.toFixed(0)}ms`,
      isRunning: isSkeletonLoopRunning,
    })
  }
  
  // Always continue the loop - never stop it
  skeletonAnimationFrame = requestAnimationFrame(() => {
    skeletonAnimationLoop()
  })
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

.canvas-container.pan-mode {
  cursor: grab;
}

.canvas-container.pan-mode.pan-dragging {
  cursor: grabbing;
}

.canvas-container.pan-mode :deep(canvas) {
  cursor: grab;
}

.canvas-container.pan-mode.pan-dragging :deep(canvas) {
  cursor: grabbing;
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
