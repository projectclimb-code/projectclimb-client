<template>
  <div
    ref="box"
    class="flex relative touch-none items-center justify-center w-full route-edit-container"
    :class="{
      'h-full': true,
      'pt-[80px]': isTablet && !isSessionRoute,
      'session-route': isSessionRoute,
    }"
    :style="
      isSessionRoute
        ? {
            backgroundImage: `url(${plywood})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            minHeight: '0',
            position: 'relative',
            pointerEvents: 'auto',
            overflow: 'hidden',
          }
        : {
            minHeight: '0',
            position: 'relative',
            pointerEvents: 'auto',
            overflow: 'hidden',
          }
    "
  >
    <ActionButtons
      :is-mobile="isMobile"
      :is-session-route="isSessionRoute"
      :start-mode="startMode"
      :end-mode="endMode"
      :is-recording="isRecording"
      :is-paused="isPaused"
      :recording-time="recordingTime"
      @save="handleSave"
      @cancel="handleCancel"
      @edit-info="handleEditInfo"
      @flip="handleFlip"
      @start="activateStartMode"
      @end="activateEndMode"
      @restart="handleRestart"
      @relay="handleRelay"
      @pause="handlePause"
      @toggle-recording="toggleRecording"
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
        :style="{ opacity: isSvgReady ? 1 : 0, transition: 'opacity 0.2s ease-in' }"
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
      v-if="!isSessionRoute"
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
        <DifficultyTag v-if="currentRoute.data?.grade" :grade="currentRoute.data.grade" />
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
import Konva from 'konva'
import { startSession } from '@/services/routes.service'

const CUSTOM_POSE_CONNECTIONS: [number, number][] = [
  ...POSE_CONNECTIONS.filter((conn: [number, number]) => {
    const [a, b] = conn
    return a < 11 && b < 11
  }),
  [11, 23],
  [12, 24],
  [23, 24],
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  ...POSE_CONNECTIONS.filter((conn: [number, number]) => {
    const [a, b] = conn
    return a >= 23 || b >= 23
  }),
]

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
const isSvgReady = ref(false)
const startMode = ref(false)
const endMode = ref(false)
const selectedStarts = ref<string[]>([])
const selectedEnd = ref<string | null>(null)
const selectedNormalPositions = ref<Set<string>>(new Set())
const replaceFirstStartNext = ref(false)
const currentRoute = ref<Route | null>(null)
const touchedHolds = ref<Map<string, number>>(new Map())
const timeTextNodes = ref<Map<string, any>>(new Map())

const isRecording = ref(false)
const isPaused = ref(false)
const recordingTime = ref('00:00')
let recordingInterval: number | null = null
let recordingStartTime = 0
let pausedTime = 0
let totalPausedDuration = 0

const lastPoseData = ref<any[] | null>(null)
const smoothedPoseData = ref<any[] | null>(null)
let skeletonCtx: CanvasRenderingContext2D | null = null
let skeletonAnimationFrame: number | null = null
let wsUnsubscribe: (() => void) | null = null
let isSkeletonLoopRunning = false
const SMOOTHING_FACTOR = 0.7
const enableSmoothing = ref(false)

interface BufferedPoseFrame {
  landmarks: any[]
  timestamp: number
}
const poseBuffer: BufferedPoseFrame[] = []
const BUFFER_SIZE = 3
const INTERPOLATION_DELAY = 16
const MAX_FRAME_AGE = 200

let wsMessageCount = 0
let wsLastMessageTime = 0
let wsMessageTimes: number[] = []
let drawCount = 0
let lastDrawTime = 0
let drawTimes: number[] = []
const DEBUG_SKELETON = false

const zoomScale = ref(1)
const baseScale = ref(1)
const basePosition = ref({ x: 0, y: 0 })
const panOffset = ref({ x: 0, y: 0 })
const isPanMode = ref(false)
const isDragging = ref(false)
const lastPointerPosition = ref({ x: 0, y: 0 })
const minZoom = 1 / 1.2
const maxZoom = 3

let observer: ResizeObserver | null = null
let flipToastTimeout: ReturnType<typeof setTimeout> | null = null

async function handleSave() {
  disablePanMode()

  if (!currentRoute.value || !currentRoute.value?.id) {
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'No route to save',
      life: 3000,
    })
    return
  }

  const hasGrade = currentRoute.value.data?.grade && currentRoute.value.data.grade.trim() !== ''
  if (!hasGrade) {
    dialog.open(CreateBoulderDialog, {
      data: {
        route: currentRoute.value,
        selectGradeOnly: true,
      },
      props: {
        header: '',
        style: { width: '90vw', maxWidth: '420px' },
        modal: true,
        dismissableMask: true,
        closable: false,
        closeOnEscape: true,
      },
      onClose: async (result) => {
        const data = result?.data
        if (data && data.grade) {
          await performSave(data.grade)
        }
      },
    })
    return
  }

  await performSave()
}

async function performSave(grade?: ClimbingRouteGrade) {
  if (!currentRoute.value || !currentRoute.value?.id) return

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

  try {
    await routesStore.saveRoute(updatedRoute)
    currentRoute.value = updatedRoute
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Saved successfully',
      life: 3000,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save',
      life: 3000,
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
      closeOnEscape: true,
    },
  })
}

function handleEditInfo() {
  disablePanMode()
  if (!currentRoute.value) {
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'No route to edit',
      life: 3000,
    })
    return
  }

  dialog.open(CreateBoulderDialog, {
    data: {
      route: currentRoute.value,
    },
    props: {
      header: '',
      style: { width: '90vw', maxWidth: '420px' },
      modal: true,
      dismissableMask: true,
      closable: false,
      closeOnEscape: true,
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
              author: data.author,
            },
          }
          await routesStore.saveRoute(updatedRoute)
          currentRoute.value = updatedRoute
          toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Route updated successfully',
            life: 3000,
          })
        } catch (error) {
          toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update route',
            life: 3000,
          })
        }
      }
    },
  })
}

function flipId(id: string): string {
  const numId = parseInt(id, 10)

  if (isNaN(numId)) {
    return id
  }

  if (numId >= 0 && numId < 100) {
    return String(numId + 100)
  } else if (numId >= 100 && numId < 200) {
    return String(numId - 100)
  } else {
    return id
  }
}

function handleFlip() {
  disablePanMode()
  selectedStarts.value = selectedStarts.value.map((id) => flipId(id))

  if (selectedEnd.value) {
    selectedEnd.value = flipId(selectedEnd.value)
  }

  const flippedNormal = new Set<string>()
  selectedNormalPositions.value.forEach((id) => {
    flippedNormal.add(flipId(id))
  })
  selectedNormalPositions.value = flippedNormal

  updatePathColors()
  preview()

  if (flipToastTimeout) {
    clearTimeout(flipToastTimeout)
  }

  flipToastTimeout = setTimeout(() => {
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Selections flipped successfully',
      life: 3000,
      group: 'flip',
    })
    flipToastTimeout = null
  }, 300)
}

function preview() {
  websocketService.sendPreview({
    id: currentRoute.value?.id,
    data: {
      problem: {
        holds: [
          ...selectedStarts.value.map((id) => ({ id, type: HoldType.start })),
          ...Array.from(selectedNormalPositions.value).map((id) => ({
            id,
            type: HoldType.normal,
          })),
          ...(selectedEnd.value ? [{ id: selectedEnd.value, type: HoldType.finish }] : []),
        ],
      },
    },
  })
}

function handleRestart() {
  console.log('Restarting session...')
  websocketService.sendSessionAction('restart')
}

function handleRelay() {
  console.log('Relaying session...')
  restartSession()
}

function handlePause() {
  if (isRecording.value && !isPaused.value) {
    pauseRecording()
  } else if (isRecording.value && isPaused.value) {
    resumeRecording()
  }
}

function toggleRecording() {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

function startRecording() {
  isRecording.value = true
  isPaused.value = false
  recordingStartTime = Date.now()
  totalPausedDuration = 0

  recordingInterval = window.setInterval(() => {
    const elapsed = Math.floor((Date.now() - recordingStartTime - totalPausedDuration) / 1000)
    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60
    recordingTime.value = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, 1000)
}

function pauseRecording() {
  if (!isRecording.value || isPaused.value) return
  isPaused.value = true
  pausedTime = Date.now()
  if (recordingInterval !== null) {
    clearInterval(recordingInterval)
    recordingInterval = null
  }
}

function resumeRecording() {
  if (!isRecording.value || !isPaused.value) return
  isPaused.value = false
  const pauseDuration = Date.now() - pausedTime
  totalPausedDuration += pauseDuration
  pausedTime = 0

  recordingInterval = window.setInterval(() => {
    const elapsed = Math.floor((Date.now() - recordingStartTime - totalPausedDuration) / 1000)
    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60
    recordingTime.value = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, 1000)
}

function stopRecording() {
  isRecording.value = false
  isPaused.value = false
  if (recordingInterval !== null) {
    clearInterval(recordingInterval)
    recordingInterval = null
  }
  recordingTime.value = '00:00'
  totalPausedDuration = 0
  pausedTime = 0
}

function activateStartMode() {
  disablePanMode()
  if (startMode.value) {
    startMode.value = false
  } else {
    startMode.value = true
    endMode.value = false
  }
}

function activateEndMode() {
  disablePanMode()
  if (endMode.value) {
    endMode.value = false
  } else {
    endMode.value = true
    startMode.value = false
  }
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

    baseScale.value = mainLayer.value.scaleX()
    basePosition.value = {
      x: mainLayer.value.x(),
      y: mainLayer.value.y(),
    }

    applyTransform()
    konvaStage.draw()

    if (isSessionRoute.value) {
      updateSkeletonCanvasSize()
    }
  }
}

let handleResize: (() => void) | null = null

function restartSession() {
  const routeId = route.query.id ? Number(route.query.id) : null
  if (isSessionRoute.value) {
    startSession(routeId || 0)
  }
}

onMounted(async () => {
  await nextTick()

  const routeId = route.query.id ? Number(route.query.id) : null

  if (routeId) {
    restartSession()
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

  const initializeStage = async () => {
    if (!innerbox.value || !stage.value) {
      setTimeout(initializeStage, 50)
      return
    }

    const container = innerbox.value as HTMLElement
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    if (containerWidth === 0 || containerHeight === 0) {
      setTimeout(initializeStage, 50)
      return
    }

    isWideScreen()
    await nextTick()

    const konvaStage = stage.value.getNode()
    if (konvaStage.width() === 0 || konvaStage.height() === 0) {
      setTimeout(initializeStage, 50)
      return
    }

    await initKonva()
    setTimeout(() => {
      updatePathColors()
    }, 50)
  }

  setTimeout(initializeStage, 100)

  handleResize = () => {
    isWideScreen()
    isLandscape.value = window.innerWidth > window.innerHeight
  }
  window.addEventListener('resize', handleResize)
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
  isSkeletonLoopRunning = false
  poseBuffer.length = 0
  touchedHolds.value.clear()
  timeTextNodes.value.forEach((textNode) => {
    textNode.destroy()
  })
  timeTextNodes.value.clear()
  smoothedPoseData.value = null
  stopRecording()
  if (!isSessionRoute.value) {
    websocketService.disconnect()
  }
})

function handlePathClick(pathId: string) {
  if (isSessionRoute.value) {
    return
  }

  if (isPanMode.value) {
    return
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

  if (index > -1) {
    selectedStarts.value.splice(index, 1)
    if (selectedStarts.value.length < 2) {
      replaceFirstStartNext.value = false
    }
    updatePathColors()
    return
  }

  selectedNormalPositions.value.delete(pathId)
  if (selectedEnd.value === pathId) {
    selectedEnd.value = null
  }

  if (selectedStarts.value.length === 0) {
    selectedStarts.value.push(pathId)
    replaceFirstStartNext.value = false
  } else if (selectedStarts.value.length === 1) {
    selectedStarts.value.push(pathId)
    replaceFirstStartNext.value = false
  } else if (selectedStarts.value.length === 2) {
    if (replaceFirstStartNext.value) {
      selectedStarts.value[0] = pathId
      replaceFirstStartNext.value = false
    } else {
      selectedStarts.value[1] = pathId
      replaceFirstStartNext.value = true
    }
  }

  updatePathColors()
}

function handleEndSelection(pathId: string) {
  if (selectedEnd.value === pathId) {
    selectedEnd.value = null
    updatePathColors()
    return
  }

  selectedNormalPositions.value.delete(pathId)
  const startIndex = selectedStarts.value.indexOf(pathId)
  if (startIndex > -1) {
    selectedStarts.value.splice(startIndex, 1)
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

function formatTime(timeMs: number): string {
  const totalSeconds = Math.floor(timeMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function updatePathColors() {
  if (!mainLayer.value || !stage.value) return

  const konvaStage = stage.value.getNode()
  const children = mainLayer.value.children
  if (!children) return

  const currentTouchedIds = new Set<string>()
  touchedHolds.value.forEach((_, holdId) => {
    currentTouchedIds.add(holdId)
    currentTouchedIds.add(`hold_${holdId}`)
  })

  timeTextNodes.value.forEach((textNode, holdId) => {
    if (!currentTouchedIds.has(holdId) && !currentTouchedIds.has(holdId.replace('hold_', ''))) {
      textNode.destroy()
      timeTextNodes.value.delete(holdId)
    }
  })

  children.forEach((node: any) => {
    const pathId = node.id()
    const isStart = selectedStarts.value.includes(pathId)
    const isEnd = selectedEnd.value === pathId
    const isNormalSelected = selectedNormalPositions.value.has(pathId)

    let touchedTime: number | null = null
    if (isSessionRoute.value) {
      touchedTime =
        touchedHolds.value.get(pathId) || touchedHolds.value.get(`hold_${pathId}`) || null
    }
    const isTouched = touchedTime !== null

    if (isTouched) {
      node.fill('rgba(0, 255, 0, 0.3)')
      node.opacity(1)
      node.strokeWidth(0)
      node.stroke('transparent')

      const textId = `time_${pathId}`
      let timeText = timeTextNodes.value.get(textId)

      if (!timeText) {
        const box = node.getClientRect()
        const centerX = box.x + box.width / 2
        const centerY = box.y + box.height / 2

        timeText = new Konva.Text({
          id: textId,
          text: formatTime(touchedTime!),
          fontSize: 14,
          fontFamily: 'Arial',
          fill: '#000000',
          stroke: '#ffffff',
          strokeWidth: 2,
          x: centerX,
          y: centerY - 10,
          align: 'center',
          verticalAlign: 'middle',
          offsetX: 0,
          offsetY: 0,
          listening: false,
          perfectDrawEnabled: false,
        })

        timeText.offsetX(timeText.width() / 2)
        timeText.offsetY(timeText.height() / 2)

        mainLayer.value.add(timeText)
        timeTextNodes.value.set(textId, timeText)
      } else {
        timeText.text(formatTime(touchedTime!))
        const box = node.getClientRect()
        const centerX = box.x + box.width / 2
        const centerY = box.y + box.height / 2
        timeText.x(centerX)
        timeText.y(centerY - 10)
        timeText.offsetX(timeText.width() / 2)
        timeText.offsetY(timeText.height() / 2)
      }
    } else if (isStart) {
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

function constrainPanOffset() {
  if (!mainLayer.value || !stage.value) return

  const konvaStage = stage.value.getNode()
  const stageWidth = konvaStage.width()
  const stageHeight = konvaStage.height()
  const finalScale = baseScale.value * zoomScale.value

  const scaledWidth = constants.WALL_WIDTH_MM * finalScale
  const scaledHeight = constants.WALL_HEIGHT_MM * finalScale

  if (scaledWidth <= stageWidth && scaledHeight <= stageHeight) {
    panOffset.value = { x: 0, y: 0 }
    return
  }

  const minVisibleWidth = scaledWidth * 0.1
  const minVisibleHeight = scaledHeight * 0.1

  const minPanX = -minVisibleWidth - basePosition.value.x + scaledWidth / 2
  const maxPanX = stageWidth + minVisibleWidth - basePosition.value.x - scaledWidth / 2
  const minPanY = -minVisibleHeight - basePosition.value.y + scaledHeight / 2
  const maxPanY = stageHeight + minVisibleHeight - basePosition.value.y - scaledHeight / 2

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
  const finalScale = baseScale.value * zoomScale.value

  if (!isDragging.value) {
    constrainPanOffset()
  }

  mainLayer.value.scale({ x: finalScale, y: finalScale })
  mainLayer.value.position({
    x: basePosition.value.x + panOffset.value.x,
    y: basePosition.value.y + panOffset.value.y,
  })

  if (isSessionRoute.value && timeTextNodes.value.size > 0) {
    updateTimeTextPositions()
  }

  konvaStage.draw()
}

function updateTimeTextPositions() {
  if (!mainLayer.value || !stage.value) return

  const children = mainLayer.value.children
  if (!children) return

  timeTextNodes.value.forEach((timeText, textId) => {
    const pathId = textId.replace('time_', '')
    const pathNode = mainLayer.value.findOne(`#${pathId}`)

    if (pathNode) {
      const box = pathNode.getClientRect()
      const centerX = box.x + box.width / 2
      const centerY = box.y + box.height / 2
      timeText.x(centerX)
      timeText.y(centerY - 10)
      timeText.offsetX(timeText.width() / 2)
      timeText.offsetY(timeText.height() / 2)
    }
  })
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
    setTimeout(() => handleReset(), 50)
    return
  }

  isSvgReady.value = false
  zoomScale.value = 1
  panOffset.value = { x: 0, y: 0 }
  configKonva.value.width = containerWidth
  configKonva.value.height = containerHeight

  nextTick(() => {
    if (!mainLayer.value || !stage.value) return

    const updatedStage = stage.value.getNode()

    if (updatedStage.width() !== containerWidth || updatedStage.height() !== containerHeight) {
      updatedStage.width(containerWidth)
      updatedStage.height(containerHeight)
    }

    scaleLayer(mainLayer.value, updatedStage)
    baseScale.value = mainLayer.value.scaleX()
    basePosition.value = {
      x: mainLayer.value.x(),
      y: mainLayer.value.y(),
    }

    panOffset.value = { x: 0, y: 0 }
    applyTransform()
    isSvgReady.value = true
  })
}

function togglePanMode() {
  isPanMode.value = !isPanMode.value
  isDragging.value = false
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

  const layerPoint = {
    x: (pointer.x - basePosition.value.x - panOffset.value.x) / (baseScale.value * oldZoom),
    y: (pointer.y - basePosition.value.y - panOffset.value.y) / (baseScale.value * oldZoom),
  }

  panOffset.value = {
    x: pointer.x - layerPoint.x * (baseScale.value * zoomScale.value) - basePosition.value.x,
    y: pointer.y - layerPoint.y * (baseScale.value * zoomScale.value) - basePosition.value.y,
  }

  applyTransform()
}

function handleMouseDown(e: MouseEvent | any) {
  if (!isPanMode.value || !stage.value || !mainLayer.value) return
  if (e.button !== undefined && e.button !== 0) return

  const konvaStage = stage.value.getNode()
  const pointer = konvaStage.getPointerPosition()
  if (!pointer) return

  isDragging.value = true
  lastPointerPosition.value = {
    x: pointer.x,
    y: pointer.y,
  }
  if (e.preventDefault) e.preventDefault()
  if (e.stopPropagation) e.stopPropagation()
  if (e.evt && e.evt.preventDefault) e.evt.preventDefault()
  if (e.evt && e.evt.stopPropagation) e.evt.stopPropagation()
}

function handleMouseMove(e: MouseEvent | any) {
  if (!isPanMode.value || !isDragging.value || !stage.value || !mainLayer.value) return

  const konvaStage = stage.value.getNode()
  const pointer = konvaStage.getPointerPosition()
  if (!pointer) return

  const newPointerPosition = {
    x: pointer.x,
    y: pointer.y,
  }

  const dx = newPointerPosition.x - lastPointerPosition.value.x
  const dy = newPointerPosition.y - lastPointerPosition.value.y

  panOffset.value = {
    x: panOffset.value.x + dx,
    y: panOffset.value.y + dy,
  }

  lastPointerPosition.value = newPointerPosition
  applyTransform()
  if (e.preventDefault) e.preventDefault()
  if (e.stopPropagation) e.stopPropagation()
  if (e.evt && e.evt.preventDefault) e.evt.preventDefault()
  if (e.evt && e.evt.stopPropagation) e.evt.stopPropagation()
}

function handleMouseUp() {
  isDragging.value = false
  if (mainLayer.value && stage.value) {
    constrainPanOffset()
    applyTransform()
  }
}

function handleTouchStart(e: any) {
  if (!isPanMode.value || !stage.value || !mainLayer.value) return

  const konvaStage = stage.value.getNode()
  const pointer = konvaStage.getPointerPosition()
  if (!pointer) return

  isDragging.value = true
  lastPointerPosition.value = {
    x: pointer.x,
    y: pointer.y,
  }
  if (e.evt) {
    e.evt.preventDefault()
    e.evt.stopPropagation()
  }
}

function handleTouchMove(e: any) {
  if (!isPanMode.value || !isDragging.value || !stage.value || !mainLayer.value) return

  const konvaStage = stage.value.getNode()
  const pointer = konvaStage.getPointerPosition()
  if (!pointer) {
    isDragging.value = false
    return
  }

  const newPointerPosition = {
    x: pointer.x,
    y: pointer.y,
  }

  const dx = newPointerPosition.x - lastPointerPosition.value.x
  const dy = newPointerPosition.y - lastPointerPosition.value.y

  panOffset.value = {
    x: panOffset.value.x + dx,
    y: panOffset.value.y + dy,
  }

  lastPointerPosition.value = newPointerPosition
  applyTransform()
  if (e.evt) {
    e.evt.preventDefault()
    e.evt.stopPropagation()
  }
}

function handleTouchEnd() {
  isDragging.value = false
  if (mainLayer.value && stage.value) {
    constrainPanOffset()
    applyTransform()
  }
}

async function initKonva() {
  if (!stage.value || !innerbox.value) return

  const konvaStage = stage.value.getNode()
  const container = innerbox.value as HTMLElement
  const containerWidth = container.clientWidth
  const containerHeight = container.clientHeight

  if (containerWidth === 0 || containerHeight === 0) {
    setTimeout(() => initKonva(), 50)
    return
  }

  if (konvaStage.width() !== containerWidth || konvaStage.height() !== containerHeight) {
    configKonva.value.width = containerWidth
    configKonva.value.height = containerHeight
    konvaStage.width(containerWidth)
    konvaStage.height(containerHeight)
  }

  // Load SVG
  mainLayer.value = await loadWallSvg(
    isSessionRoute.value ? undefined : handlePathClick,
    selectedStarts.value,
    selectedEnd.value,
  )

  await nextTick()
  scaleLayer(mainLayer.value, konvaStage)

  baseScale.value = mainLayer.value.scaleX()
  basePosition.value = {
    x: mainLayer.value.x(),
    y: mainLayer.value.y(),
  }

  // Disable click/tap events on session route
  if (isSessionRoute.value && mainLayer.value) {
    const children = mainLayer.value.children
    if (children) {
      children.forEach((node: any) => {
        node.listening(false)
        node.off('tap')
        node.off('click')
      })
    }
  }

  konvaStage.add(mainLayer.value)
  zoomScale.value = 1
  panOffset.value = { x: 0, y: 0 }
  applyTransform()
  konvaStage.draw()
  isSvgReady.value = true

  const stageContainer = konvaStage.container()
  if (!isSessionRoute.value) {
    stageContainer.addEventListener('wheel', handleWheel, { passive: false })
  }

  konvaStage.on('mousedown', handleMouseDown)
  konvaStage.on('mousemove', handleMouseMove)
  konvaStage.on('mouseup', handleMouseUp)
  konvaStage.on('mouseleave', handleMouseUp)
  konvaStage.on('touchstart', handleTouchStart)
  konvaStage.on('touchmove', handleTouchMove)
  konvaStage.on('touchend', handleTouchEnd)
  konvaStage.on('touchcancel', handleTouchEnd)
}

if (typeof window !== 'undefined') {
  ;(window as any).togglePoseSmoothing = () => {
    enableSmoothing.value = !enableSmoothing.value
    return enableSmoothing.value
  }
  ;(window as any).setPoseSmoothing = (enabled: boolean) => {
    enableSmoothing.value = enabled
    return enableSmoothing.value
  }
}

function setupWebSocket() {
  if (!isSessionRoute.value) return

  wsUnsubscribe = websocketService.connectSession({
    onHolds: (holds: any[]) => {
      const newTouchedHolds = new Map<string, number>()

      holds.forEach((hold: any) => {
        if (!hold.id) return

        let holdId = hold.id
        if (holdId.startsWith('hold_')) {
          holdId = holdId.replace('hold_', '')
        }

        if (hold.status === 'touched' && hold.time !== null && hold.time !== undefined) {
          const timeMs = typeof hold.time === 'number' ? hold.time : parseFloat(hold.time) || 0
          newTouchedHolds.set(holdId, timeMs)
          newTouchedHolds.set(`hold_${holdId}`, timeMs)
        }
      })

      touchedHolds.value = newTouchedHolds
      updatePathColors()
    },
    onPose: (landmarks: any[]) => {
      const now = performance.now()

      lastPoseData.value = landmarks

      poseBuffer.push({
        landmarks: landmarks,
        timestamp: now,
      })

      if (poseBuffer.length > BUFFER_SIZE) {
        poseBuffer.shift()
      }

      if (!isSkeletonLoopRunning) {
        isSkeletonLoopRunning = true
        skeletonAnimationLoop()
      }
    },
  })
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
    skeletonCtx = skeletonCanvas.value.getContext('2d')
  }
}

function interpolateLandmarks(frame1: any[], frame2: any[], t: number): any[] {
  if (!frame1 || !frame2 || frame1.length !== frame2.length) {
    return frame1 || frame2 || []
  }

  return frame1.map((lm1: any, i: number) => {
    const lm2 = frame2[i]
    return {
      x: (lm1.x || 0) + ((lm2.x || 0) - (lm1.x || 0)) * t,
      y: (lm1.y || 0) + ((lm2.y || 0) - (lm1.y || 0)) * t,
      z: (lm1.z || 0) + ((lm2.z || 0) - (lm1.z || 0)) * t,
      visibility:
        (lm1.visibility !== undefined ? lm1.visibility : 1) +
        ((lm2.visibility !== undefined ? lm2.visibility : 1) -
          (lm1.visibility !== undefined ? lm1.visibility : 1)) *
          t,
    }
  })
}

function getInterpolatedPose(): any[] | null {
  if (isSessionRoute.value) {
    if (poseBuffer.length > 0) {
      const latestFrame = poseBuffer[poseBuffer.length - 1]
      return latestFrame ? latestFrame.landmarks : lastPoseData.value
    }
    return lastPoseData.value
  }

  const now = performance.now()

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
    if (!frame || (frame && now - frame.timestamp > MAX_FRAME_AGE)) {
      return lastPoseData.value
    }
    return frame.landmarks || lastPoseData.value
  }

  const frame1 = poseBuffer[poseBuffer.length - 2]
  const frame2 = poseBuffer[poseBuffer.length - 1]

  if (!frame1 || !frame2) {
    return lastPoseData.value
  }

  if (now - frame2.timestamp > MAX_FRAME_AGE) {
    return frame2.landmarks
  }

  const timeSinceFrame1 = now - frame1.timestamp
  const timeBetweenFrames = frame2.timestamp - frame1.timestamp

  if (timeBetweenFrames <= 0) {
    return frame2.landmarks
  }

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

  const scaledWidth = constants.WALL_WIDTH_MM * finalScale
  const scaledHeight = constants.WALL_HEIGHT_MM * finalScale

  const layerX = basePosition.value.x + panOffset.value.x
  const layerY = basePosition.value.y + panOffset.value.y

  const leftEdge = layerX - scaledWidth / 2
  const topEdge = layerY - scaledHeight / 2

  return landmarks.map((lm: any) => {
    const pixelX = leftEdge + lm.x * scaledWidth
    const pixelY = topEdge + lm.y * scaledHeight

    return {
      x: pixelX / canvas.width,
      y: pixelY / canvas.height,
      z: lm.z || 0,
      visibility: lm.visibility !== undefined ? lm.visibility : 1,
    }
  })
}

function smoothLandmarks(newLandmarks: any[]): any[] {
  if (!enableSmoothing.value) {
    smoothedPoseData.value = newLandmarks.map((lm) => ({ ...lm }))
    return newLandmarks
  }

  if (!smoothedPoseData.value || smoothedPoseData.value.length !== newLandmarks.length) {
    smoothedPoseData.value = newLandmarks.map((lm) => ({ ...lm }))
    return newLandmarks
  }

  return newLandmarks.map((lm, i) => {
    const prev = smoothedPoseData.value![i]
    if (!prev) return lm

    return {
      x: prev.x + (lm.x - prev.x) * (1 - SMOOTHING_FACTOR),
      y: prev.y + (lm.y - prev.y) * (1 - SMOOTHING_FACTOR),
      z: prev.z + ((lm.z || 0) - (prev.z || 0)) * (1 - SMOOTHING_FACTOR),
      visibility: lm.visibility !== undefined ? lm.visibility : prev.visibility || 1,
    }
  })
}

function drawSkeleton(landmarks: any[]) {
  if (!skeletonCanvas.value || !landmarks || landmarks.length === 0 || !skeletonCtx) {
    return
  }

  const canvas = skeletonCanvas.value

  if (canvas.width === 0 || canvas.height === 0) {
    updateSkeletonCanvasSize()
    if (!skeletonCtx || canvas.width === 0 || canvas.height === 0) {
      return
    }
  }

  const ctx = skeletonCtx
  const shouldSmooth = enableSmoothing.value && !isSessionRoute.value
  const processedLandmarks = shouldSmooth ? smoothLandmarks(landmarks) : landmarks
  if (shouldSmooth) {
    smoothedPoseData.value = processedLandmarks
  } else {
    smoothedPoseData.value = processedLandmarks.map((lm) => ({ ...lm }))
  }

  const transformedLandmarks = transformLandmarks(processedLandmarks)

  if (transformedLandmarks.length === 0) {
    return
  }

  ctx.save()
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  drawConnectors(ctx, transformedLandmarks, CUSTOM_POSE_CONNECTIONS, {
    color: '#00FF00',
    lineWidth: 4,
  })

  drawLandmarks(ctx, transformedLandmarks, {
    color: '#FF0000',
    lineWidth: 2,
    radius: 5,
  })

  ctx.restore()
}

function skeletonAnimationLoop() {
  if (!isSkeletonLoopRunning) return

  const interpolatedPose = getInterpolatedPose()

  if (interpolatedPose && interpolatedPose.length > 0) {
    drawSkeleton(interpolatedPose)
  } else {
    if (lastPoseData.value && lastPoseData.value.length > 0) {
      drawSkeleton(lastPoseData.value)
    }
  }

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
    padding-top: 0 !important;
  }
  .route-edit-container.box.session-route .canvas-container {
    max-height: calc(100vh - 180px) !important;
    margin-top: 0 !important;
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
  .box.session-route {
    align-items: flex-start !important;
    padding-top: 0 !important;
    padding: 0 !important;
  }
  .box.session-route .canvas-container {
    margin-top: 0 !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    max-height: calc(100vh - 180px) !important;
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
    touch-action: pan-x pan-y;
    user-select: none;
  }

  .canvas-container.pan-mode {
    touch-action: pan-x pan-y;
  }

  .canvas-container.pan-mode.pan-dragging {
    touch-action: pan-x pan-y;
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
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(0, 0, 0, 0.05);
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
  box-shadow:
    0 25px 80px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(0, 0, 0, 0.05) !important;
  border: none !important;
}

:deep(.p-dialog .p-dialog-content) {
  padding: 0 !important;
}
</style>
