<template>
  <canvas
    ref="canvas"
    class="pose-canvas"
    width="640"
    height="480"
  ></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose'
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'

interface Props {
  videoElement: HTMLVideoElement | null
}

const props = defineProps<Props>()

const canvas = ref<HTMLCanvasElement | null>(null)
let poseInstance: Pose | null = null

const emit = defineEmits<{
  ready: [poseInstance: Pose]
}>()

onMounted(() => {
  const canvasElement = canvas.value
  if (!canvasElement) return
  
  const canvasCtx = canvasElement.getContext('2d')
  if (!canvasCtx) return
  
  // Initialize MediaPipe Pose
  poseInstance = new Pose({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    },
  })

  poseInstance.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })

  poseInstance.onResults((results) => {
    if (!canvasElement || !canvasCtx) return
    
    // Update canvas size
    const container = canvasElement.parentElement
    if (container) {
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight
      const cameraAspectRatio = 640 / 480
      let canvasWidth = containerWidth
      let canvasHeight = containerWidth / cameraAspectRatio
      
      if (canvasHeight > containerHeight) {
        canvasHeight = containerHeight
        canvasWidth = containerHeight * cameraAspectRatio
      }
      
      if (canvasElement.width !== canvasWidth || canvasElement.height !== canvasHeight) {
        canvasElement.width = canvasWidth
        canvasElement.height = canvasHeight
      }
    }
    
    canvasCtx.save()
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height)
    
    // Draw video frame
    if (results.image) {
      canvasCtx.drawImage(
        results.image,
        0,
        0,
        canvasElement.width,
        canvasElement.height
      )
    }
    
    // Draw pose landmarks
    if (results.poseLandmarks) {
      drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 4,
      })
      
      drawLandmarks(canvasCtx, results.poseLandmarks, {
        color: '#FF0000',
        lineWidth: 2,
        radius: 5,
      })
    }
    
    canvasCtx.restore()
  })
  
  // Emit ready event with pose instance
  if (poseInstance) {
    emit('ready', poseInstance)
  }
})

onBeforeUnmount(() => {
  // Cleanup if needed
})

// Expose pose instance
defineExpose({
  poseInstance: () => poseInstance
})
</script>

<style scoped lang="scss">
.pose-canvas {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
  display: block;
}
</style>

