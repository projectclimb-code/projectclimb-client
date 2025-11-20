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

    const container = canvasElement.parentElement
    if (container) {
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight

      if (canvasElement.width !== containerWidth || canvasElement.height !== containerHeight) {
        canvasElement.width = containerWidth
        canvasElement.height = containerHeight
      }
    }

    canvasCtx.save()
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height)

    if (results.image) {
      const imageWidth = results.image.width || 640
      const imageHeight = results.image.height || 480
      const imageAspectRatio = imageWidth / imageHeight
      const canvasAspectRatio = canvasElement.width / canvasElement.height

      let drawWidth = canvasElement.width
      let drawHeight = canvasElement.height
      let drawX = 0
      let drawY = 0

      if (imageAspectRatio > canvasAspectRatio) {
        drawHeight = canvasElement.width / imageAspectRatio
        drawY = (canvasElement.height - drawHeight) / 2
      } else {
        drawWidth = canvasElement.height * imageAspectRatio
        drawX = (canvasElement.width - drawWidth) / 2
      }

      canvasCtx.fillStyle = '#000000'
      canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height)

      canvasCtx.drawImage(
        results.image,
        drawX,
        drawY,
        drawWidth,
        drawHeight
      )
    } else {
      canvasCtx.fillStyle = '#000000'
      canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height)
    }

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

  if (poseInstance) {
    emit('ready', poseInstance)
  }
})

onBeforeUnmount(() => {
})

defineExpose({
  poseInstance: () => poseInstance
})
</script>

<style scoped lang="scss">
.pose-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000;
  display: block;
  z-index: 1;
  object-fit: contain;
}
</style>

