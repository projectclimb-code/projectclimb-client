<template>
  <div class="camera-view">
    <video 
      ref="video" 
      playsinline
      class="camera-video"
      autoplay
      muted
      webkit-playsinline
    ></video>
    <PoseTracker
      ref="poseTrackerRef"
      :video-element="video"
      @ready="handlePoseReady"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount, toRaw, markRaw } from 'vue'
import { Camera } from '@mediapipe/camera_utils'
import PoseTracker from './PoseTracker.vue'
import type { Pose } from '@mediapipe/pose'

const video = ref<HTMLVideoElement | null>(null)
const poseTrackerRef = ref<InstanceType<typeof PoseTracker> | null>(null)

let cameraInstance: Camera | null = null
let poseInstance: Pose | null = null

const emit = defineEmits<{
  ready: [videoElement: HTMLVideoElement, poseInstance: Pose]
}>()

function handlePoseReady(pose: Pose) {
  poseInstance = pose
  const videoElement = video.value
  if (videoElement && poseInstance) {
    // Mark video element as raw to avoid Vue proxy issues
    markRaw(videoElement)
    
    // Initialize MediaPipe Camera
    cameraInstance = new Camera(videoElement, {
      onFrame: async () => {
        if (poseInstance && videoElement) {
          const rawVideo = toRaw(videoElement)
          await poseInstance.send({ image: rawVideo })
        }
      },
      width: 640,
      height: 480,
    })
    
    // Emit ready event
    emit('ready', videoElement, poseInstance)
  }
}

onBeforeUnmount(() => {
  if (cameraInstance) {
    try {
      cameraInstance.stop()
      cameraInstance = null
    } catch (err) {
      console.warn('Error stopping MediaPipe Camera:', err)
    }
  }
  
  if (video.value) {
    video.value.pause()
    if (video.value.srcObject) {
      const stream = video.value.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      video.value.srcObject = null
    }
  }
})

// Expose methods for parent
defineExpose({
  video,
  restartCamera: () => {
    if (cameraInstance) {
      cameraInstance.stop()
    }
    if (poseInstance && video.value) {
      const videoElement = video.value
      markRaw(videoElement)
      cameraInstance = new Camera(videoElement, {
        onFrame: async () => {
          if (poseInstance && videoElement) {
            await poseInstance.send({ image: toRaw(videoElement) })
          }
        },
        width: 640,
        height: 480,
      })
      cameraInstance.start()
    }
  }
})
</script>

<style scoped lang="scss">
.camera-view {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.camera-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  pointer-events: none;
}

.camera-canvas {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
  display: block;
}

@media (min-width: 769px) {
  .camera-view {
    max-width: 1200px;
    margin: 0 auto;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  }
  
  .camera-canvas {
    border-radius: 12px;
  }
}
</style>

