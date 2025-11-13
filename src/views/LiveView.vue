<template>
  <div class="live-view-container">
    <div class="live-view-content">
      <CameraControls
        :is-mobile="isMobile"
        :cameras="cameras"
        :selected-camera="selectedCamera"
        :is-using-front-camera="isUsingFrontCamera"
        @camera-change="handleCameraChange"
        @flip-camera="flipCamera"
      />
      <div v-if="isLoading" class="skeleton-loader">
        <div class="skeleton-content"></div>
      </div>
      <CameraFeed
        v-else
        ref="cameraFeedRef"
        @ready="handleCameraReady"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import CameraControls from '@/components/live/CameraControls.vue'
import CameraFeed from '@/components/live/CameraFeed.vue'
import type { Pose } from '@mediapipe/pose'

interface CameraDevice {
  name: string
  code: string
}

const cameraFeedRef = ref<InstanceType<typeof CameraFeed> | null>(null)
const selectedCamera = ref<CameraDevice | null>(null)
const cameras = ref<CameraDevice[]>([])
const isUsingFrontCamera = ref(true)
const isMobile = ref(false)
const currentStream = ref<MediaStream | null>(null)
const isLoading = ref(true)
let poseInstance: Pose | null = null

onMounted(() => {
  // Check if navigator is available
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error('getUserMedia is not supported')
    return
  }
  
  // Check if mobile
  const userAgent = navigator.userAgent || ''
  isMobile.value = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  
  // Enumerate cameras
  const enumerateCameras = async () => {
    try {
      if (!isMobile.value && navigator.mediaDevices) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true })
          tempStream.getTracks().forEach(track => track.stop())
        } catch (err) {
          console.warn('Could not request camera permission:', err)
        }
      }
      
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices()
        devices.forEach((device) => {
          if (device.kind === 'videoinput') {
            cameras.value.push({
              name: device.label || `Camera ${cameras.value.length + 1}`,
              code: device.deviceId,
            })
          }
        })
      }
    } catch (err) {
      console.error('Error enumerating cameras:', err)
    }
  }
  
  enumerateCameras()
  
  // Start camera after a short delay
  setTimeout(() => {
    if (isMobile.value) {
      startCamera('user')
    } else {
      const firstCamera = cameras.value[0]
      if (firstCamera) {
        startCamera(firstCamera.code)
      } else {
        startCamera('default')
      }
    }
  }, 500)
})

onBeforeUnmount(() => {
  stopCamera()
  if (cameraFeedRef.value) {
    const videoElement = cameraFeedRef.value.video
    if (videoElement) {
      videoElement.pause()
      videoElement.srcObject = null
    }
  }
})

function handleCameraReady(videoElement: HTMLVideoElement, pose: Pose) {
  poseInstance = pose
  isLoading.value = false
}

function stopCamera() {
  if (currentStream.value) {
    currentStream.value.getTracks().forEach((track) => track.stop())
    currentStream.value = null
  }
  if (cameraFeedRef.value?.video) {
    cameraFeedRef.value.video.srcObject = null
  }
}

function startCamera(deviceIdOrFacingMode: string) {
  const videoElement = cameraFeedRef.value?.video
  if (!videoElement) return
  
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error('getUserMedia is not supported')
    return
  }
  
  stopCamera()
  
  let constraints: MediaStreamConstraints
  
  if (isMobile.value) {
    if (deviceIdOrFacingMode === 'user' || deviceIdOrFacingMode === 'environment') {
      constraints = {
        video: { facingMode: deviceIdOrFacingMode as 'user' | 'environment' },
        audio: false,
      }
      isUsingFrontCamera.value = deviceIdOrFacingMode === 'user'
    } else {
      constraints = {
        video: { facingMode: 'user' },
        audio: false,
      }
      isUsingFrontCamera.value = true
    }
  } else {
    if (deviceIdOrFacingMode === 'default') {
      constraints = {
        video: true,
        audio: false,
      }
    } else {
      constraints = {
        video: { deviceId: { exact: deviceIdOrFacingMode } },
        audio: false,
      }
    }
  }
  
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      currentStream.value = stream
      if (videoElement) {
        // Stop any existing playback first
        videoElement.pause()
        videoElement.srcObject = null
        
        // Wait a bit before setting new stream
        setTimeout(() => {
          if (videoElement) {
            videoElement.srcObject = stream
            // Wait for video to be ready before playing
            videoElement.onloadedmetadata = () => {
              videoElement.play().catch((err) => {
                // Ignore AbortError - it's expected when switching cameras
                if (err.name !== 'AbortError') {
                  console.error('Error playing video:', err)
                }
              })
            }
          }
        }, 100)
      }
      
      // Restart MediaPipe Camera with new stream after a delay
      setTimeout(() => {
        if (cameraFeedRef.value) {
          cameraFeedRef.value.restartCamera()
        }
      }, 300)
      
      if (!isMobile.value && deviceIdOrFacingMode !== 'default') {
        const camera = cameras.value.find(cam => cam.code === deviceIdOrFacingMode)
        if (camera) {
          selectedCamera.value = camera
        }
      }
    })
    .catch((err) => {
      console.error('Error accessing camera:', err)
    })
}

function handleCameraChange(deviceId: string) {
  startCamera(deviceId)
}

function flipCamera() {
  if (isMobile.value) {
    const newFacingMode = isUsingFrontCamera.value ? 'environment' : 'user'
    startCamera(newFacingMode)
  } else {
    if (cameras.value.length > 1) {
      const currentIndex = cameras.value.findIndex(
        cam => cam.code === selectedCamera.value?.code
      )
      const nextIndex = (currentIndex + 1) % cameras.value.length
      const nextCamera = cameras.value[nextIndex]
      if (nextCamera) {
        startCamera(nextCamera.code)
      }
    }
  }
}
</script>

<style scoped lang="scss">
.skeleton-loader {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1a1a;
  position: relative;
  overflow: hidden;
}

.skeleton-content {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.live-view-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #000;
  overflow: hidden;
}

.live-view-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

@media (max-width: 768px) {
  .live-view-container {
    height: 100vh;
    height: 100dvh;
  }
}

@media (min-width: 769px) {
  .live-view-container {
    padding: 1rem;
  }
}
</style>
