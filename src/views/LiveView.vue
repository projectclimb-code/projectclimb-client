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
      <CameraFeed
        ref="cameraFeedRef"
        @ready="handleCameraReady"
      />
      
      <!-- Fake Recording Button (Desktop/Tablet) -->
      <div v-if="!isMobile" class="recording-button-container">
        <button
          class="recording-button-camera"
          :class="{ 'recording': isRecording }"
          @click="toggleRecording"
        >
          <span v-if="!isRecording" class="recording-button-inner"></span>
          <span v-else class="recording-button-stop"></span>
        </button>
        <div v-if="isRecording" class="recording-timer-display">{{ recordingTime }}</div>
      </div>

      <!-- Fake Recording Button (Mobile) -->
      <div v-if="isMobile" class="recording-button-container-mobile">
        <button
          class="recording-button-camera-mobile"
          :class="{ 'recording': isRecording }"
          @click="toggleRecording"
        >
          <span v-if="!isRecording" class="recording-button-inner-mobile"></span>
          <span v-else class="recording-button-stop-mobile"></span>
        </button>
        <div v-if="isRecording" class="recording-timer-display-mobile">{{ recordingTime }}</div>
      </div>
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
let poseInstance: Pose | null = null

// Fake recording state
const isRecording = ref(false)
const recordingTime = ref('00:00')
let recordingInterval: number | null = null
let recordingStartTime = 0

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
  stopRecording()
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

// Fake recording functions
function toggleRecording() {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

function startRecording() {
  isRecording.value = true
  recordingStartTime = Date.now()
  
  recordingInterval = window.setInterval(() => {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000)
    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60
    recordingTime.value = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, 1000)
}

function stopRecording() {
  isRecording.value = false
  if (recordingInterval !== null) {
    clearInterval(recordingInterval)
    recordingInterval = null
  }
  recordingTime.value = '00:00'
}
</script>

<style scoped lang="scss">
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

/* Fake Recording Button - Camera App Style (Desktop/Tablet) */
.recording-button-container {
  position: absolute;
  left: 20px;
  bottom: 20px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
  z-index: 1001;
}

.recording-button-camera {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: white;
  border: 3px solid rgba(255, 255, 255, 0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  transition: box-shadow 0.2s ease, opacity 0.2s ease;
  position: relative;
  transform-origin: center;
  will-change: box-shadow;
  flex-shrink: 0;
}

.recording-button-camera:hover {
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4);
}

.recording-button-camera:active {
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  opacity: 0.9;
}

.recording-button-inner {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: #ef4444;
  transition: all 0.3s ease;
}

.recording-button-stop {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 3px;
  background: white;
  transition: all 0.3s ease;
}

.recording-button-camera.recording {
  background: #ef4444;
  border-color: rgba(239, 68, 68, 0.8);
  animation: recordingPulse 2s ease-in-out infinite;
}

.recording-timer-display {
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  font-family: 'Courier New', monospace;
  background: rgba(0, 0, 0, 0.6);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  backdrop-filter: blur(10px);
  white-space: nowrap;
}

@keyframes recordingPulse {
  0%, 100% {
    box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
  }
  50% {
    box-shadow: 0 4px 30px rgba(239, 68, 68, 0.7);
  }
}

/* Fake Recording Button - Mobile */
.recording-button-container-mobile {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  z-index: 1001;
}

.recording-button-camera-mobile {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: white;
  border: 2.5px solid rgba(255, 255, 255, 0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  transition: box-shadow 0.2s ease, opacity 0.2s ease;
  transform-origin: center;
  will-change: box-shadow;
  flex-shrink: 0;
}

.recording-button-camera-mobile:active {
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  opacity: 0.9;
}

.recording-button-inner-mobile {
  width: 1.875rem;
  height: 1.875rem;
  border-radius: 50%;
  background: #ef4444;
  transition: all 0.3s ease;
}

.recording-button-stop-mobile {
  width: 1rem;
  height: 1rem;
  border-radius: 2px;
  background: white;
  transition: all 0.3s ease;
}

.recording-button-camera-mobile.recording {
  background: #ef4444;
  border-color: rgba(239, 68, 68, 0.8);
  animation: recordingPulse 2s ease-in-out infinite;
}

.recording-timer-display-mobile {
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  font-family: 'Courier New', monospace;
  background: rgba(0, 0, 0, 0.6);
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  backdrop-filter: blur(10px);
  white-space: nowrap;
}
</style>
