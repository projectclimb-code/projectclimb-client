<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose'
import { Camera } from '@mediapipe/camera_utils'
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'

const video = ref<HTMLVideoElement | null>(null)
const output = ref<HTMLCanvasElement | null>(null)
const selectedCamera = ref<{ name: string; code: string } | null>(null)
const cameras = ref<{ name: string; code: string }[]>([])
onMounted(() => {
  const videoElement = video.value as HTMLVideoElement
  const canvasElement = output.value as HTMLCanvasElement
  const canvasCtx = canvasElement.getContext('2d')!
  navigator.mediaDevices.enumerateDevices().then((devices) => {
    devices.forEach((device) => {
      if (device.kind === 'videoinput') {
        cameras.value.push({
          name: device.label || `Camera ${cameras.value.length + 1}`,
          code: device.deviceId,
        })
      }
    })
  })
  const pose = new Pose({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    },
  })

  pose.setOptions({
    modelComplexity: 0,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })

  pose.onResults((results) => {
    canvasCtx.save()
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height)
    canvasCtx.drawImage(
      results.image,
      0,
      0,
      canvasElement.width,
      canvasElement.height
    )
    // Draw pose landmarks
    if (results.poseLandmarks) {
      drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 4,
      })
      drawLandmarks(canvasCtx, results.poseLandmarks, {
        color: '#FF0000',
        lineWidth: 2,
      })
    }
    canvasCtx.restore()
  })

  const camera = new Camera(videoElement, {
    onFrame: async () => {
      await pose.send({ image: videoElement })
    },
    width: 640,
    height: 480,
  })
  camera.start()
})

// Add this function to handle camera switching
function startCamera(deviceId: string) {
  if (!video.value) return
  navigator.mediaDevices
    .getUserMedia({
      video: { deviceId: { exact: deviceId } },
      audio: false,
    })
    .then((stream) => {
      video.value!.srcObject = stream
      video.value!.play()
    })
    .catch((err) => {
      console.error('Error accessing camera:', err)
    })
}
</script>
<template>
  <div class="max-w-3xl mx-auto p-4">
    <div class="card flex justify-content-center">
      <Dropdown
        v-model="selectedCamera"
        :options="cameras"
        optionLabel="name"
        placeholder="Select a Camera"
        class="w-full md:w-14rem"
         @change="startCamera($event.value.code)"

      />

    </div>

    <div class="flex flex-col items-center">
      <video ref="video" :playsinline="true" class="rounded-lg shadow mb-2 w-full max-w-md hidden"></video>
      <canvas
        ref="output"
        class="rounded-lg shadow w-full max-w-md"
        width="640"
        height="480"
      ></canvas>
    </div>
  </div>
</template>
