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
      <!-- Recording Button -->
      <div class="recording-indicator" :class="{ 'recording': isRecording }">
        <button
          class="recording-button"
          @click="toggleRecording"
        >
          <span class="recording-dot"></span>
          <span class="recording-text">rec...</span>
          <span class="recording-timer">{{ recordingTime }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
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

// Recording state
const isRecording = ref(false)
const recordingTime = ref('00:00')
let recordingInterval: number | null = null
let recordingStartTime = 0

onMounted(async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    console.error('Camera not supported')
    isLoading.value = false
    return
  }
  
  isMobile.value = window.innerWidth < 768
  
  // Enumerate cameras
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    devices.forEach((device) => {
      if (device.kind === 'videoinput') {
        cameras.value.push({
          name: device.label || `Camera ${cameras.value.length + 1}`,
          code: device.deviceId,
        })
      }
    })
  } catch (err) {
    console.warn('Could not enumerate cameras:', err)
  }
  
  // Start camera
  nextTick(() => {
    if (isMobile.value) {
      startCamera('user')
    } else {
      startCamera('default')
    }
  })
})

onBeforeUnmount(() => {
  stopRecording()
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
  if (!cameraFeedRef.value?.video) {
    nextTick(() => startCamera(deviceIdOrFacingMode))
    return
  }
  
  stopCamera()
  
  const constraints: MediaStreamConstraints = isMobile.value
    ? { video: { facingMode: (deviceIdOrFacingMode === 'user' || deviceIdOrFacingMode === 'environment') ? deviceIdOrFacingMode as 'user' | 'environment' : 'user' }, audio: false }
    : deviceIdOrFacingMode === 'default'
    ? { video: true, audio: false }
    : { video: { deviceId: { exact: deviceIdOrFacingMode } }, audio: false }
  
  if (isMobile.value) {
    isUsingFrontCamera.value = deviceIdOrFacingMode === 'user'
  }
  
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      currentStream.value = stream
      const videoElement = cameraFeedRef.value?.video
      if (videoElement) {
        videoElement.srcObject = stream
        videoElement.play().catch(console.error)
      }
      
      if (cameraFeedRef.value) {
        cameraFeedRef.value.restartCamera()
      }
      
      if (!isMobile.value && deviceIdOrFacingMode !== 'default') {
        const camera = cameras.value.find(cam => cam.code === deviceIdOrFacingMode)
        if (camera) {
          selectedCamera.value = camera
        }
      }
    })
    .catch((err) => {
      console.error('Camera error:', err.name, err.message)
      isLoading.value = false
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

.recording-indicator {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 100;
}

.recording-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.recording-button:hover {
  background: rgba(0, 0, 0, 0.8);
  border-color: rgba(255, 255, 255, 0.5);
}

.recording-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.recording-indicator.recording .recording-dot {
  opacity: 1;
  animation: pulse 1.5s ease-in-out infinite;
}

.recording-text {
  font-size: 0.75rem;
  opacity: 0.7;
}

.recording-indicator.recording .recording-text {
  opacity: 1;
}

.recording-timer {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  min-width: 45px;
  text-align: right;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.8);
  }
}

@media (max-width: 768px) {
  .recording-indicator {
    top: 0.75rem;
    right: 0.75rem;
  }
  
  .recording-button {
    padding: 0.4rem 0.8rem;
    font-size: 0.75rem;
  }
  
  .recording-timer {
    font-size: 0.75rem;
    min-width: 40px;
  }
}
</style>
