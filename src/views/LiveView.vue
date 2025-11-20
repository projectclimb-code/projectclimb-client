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
        :is-switching-camera="isSwitchingCamera"
        @ready="handleCameraReady"
      />
      
      <div v-if="isMobile && !cameraPermissionGranted && !cameraError" class="camera-permission-overlay">
        <div class="camera-permission-content">
          <h3>Camera Access Required</h3>
          <p>Please click the button below to start the camera.</p>
          <button 
            @click="startCameraOnMobile" 
            class="permission-button"
            type="button"
          >
            Start Camera
          </button>
        </div>
      </div>
      
      <div v-if="cameraError" class="camera-error-message">
        <p>{{ cameraError }}</p>
        <button @click="cameraError = null; cameraPermissionGranted = true; requestCameraPermission()" class="retry-button">
          Retry
        </button>
      </div>
      
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
import DeviceDetector from 'device-detector-js'

interface CameraDevice {
  name: string
  code: string
}

const cameraFeedRef = ref<InstanceType<typeof CameraFeed> | null>(null)
const selectedCamera = ref<CameraDevice | null>(null)
const cameras = ref<CameraDevice[]>([])
const isUsingFrontCamera = ref(true)
const isSwitchingCamera = ref(false)
const frontCamera = ref<CameraDevice | null>(null)
const backCamera = ref<CameraDevice | null>(null)
const isMobile = ref(false)
const isIOS = ref(false)
const isAndroid = ref(false)
let poseInstance: Pose | null = null
const cameraError = ref<string | null>(null)
const cameraPermissionGranted = ref(false)

// Initialize device detector
const deviceDetector = new DeviceDetector()
const deviceInfo = deviceDetector.parse(navigator.userAgent)

// Fake recording state
const isRecording = ref(false)
const recordingTime = ref('00:00')
let recordingInterval: number | null = null
let recordingStartTime = 0


  const enumerateCameras = async () => {
    try {
    if (isMobile.value && navigator.mediaDevices && !currentStream.value) {
      try {
        let tempConstraints: MediaStreamConstraints
        if (isUsingFrontCamera.value && frontCamera.value) {
          tempConstraints = {
            video: { deviceId: { ideal: frontCamera.value.code } },
            audio: false
          }
        } else if (!isUsingFrontCamera.value && backCamera.value) {
          tempConstraints = {
            video: { deviceId: { ideal: backCamera.value.code } },
            audio: false
          }
        } else {
          tempConstraints = {
            video: { facingMode: { ideal: isUsingFrontCamera.value ? 'user' : 'environment' } },
            audio: false
          }
        }
        
        const tempStream = await navigator.mediaDevices.getUserMedia(tempConstraints)
          tempStream.getTracks().forEach(track => track.stop())
        } catch (err) {
        }
      }
      
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices()
      const videoInputs = devices.filter(device => device.kind === 'videoinput')
      
      cameras.value = []
      frontCamera.value = null
      backCamera.value = null
      
      if (videoInputs.length > 0) {
        const uniqueDevices = new Map<string, MediaDeviceInfo>()
        videoInputs.forEach((device) => {
          if (device.deviceId && !uniqueDevices.has(device.deviceId)) {
            uniqueDevices.set(device.deviceId, device)
          }
        })
        
        const uniqueVideoInputs = Array.from(uniqueDevices.values())
        
        uniqueVideoInputs.forEach((device) => {
          let cameraName = device.label || `Camera ${cameras.value.length + 1}`
          let isFront = false
          let isBack = false
          
          if (isMobile.value && device.label) {
            const labelLower = device.label.toLowerCase()
            if (labelLower.includes('front') || labelLower.includes('user') || labelLower.includes('face')) {
              cameraName = 'Front Camera'
              isFront = true
            } else if (labelLower.includes('back') || labelLower.includes('environment') || labelLower.includes('rear') || labelLower.includes('wide')) {
              cameraName = 'Back Camera'
              isBack = true
            }
          }
          
          const camera: CameraDevice = {
            name: cameraName,
              code: device.deviceId,
          }
          
          cameras.value.push(camera)
          
          if (isFront) {
            if (!frontCamera.value) {
              frontCamera.value = camera
            }
          } else if (isBack) {
            if (!backCamera.value) {
              backCamera.value = camera
            }
          }
        })
        
        if (isMobile.value && cameras.value.length >= 2 && (!frontCamera.value || !backCamera.value)) {
          try {
            const frontStream = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode: 'user' }, 
              audio: false 
            })
            const frontTrack = frontStream.getVideoTracks()[0]
            const frontDeviceId = frontTrack?.getSettings().deviceId
            
            frontStream.getTracks().forEach(track => track.stop())
            
            const backStream = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode: 'environment' }, 
              audio: false 
            })
            const backTrack = backStream.getVideoTracks()[0]
            const backDeviceId = backTrack?.getSettings().deviceId
            
            backStream.getTracks().forEach(track => track.stop())
            
            if (frontDeviceId) {
              const frontCam = cameras.value.find(cam => cam.code === frontDeviceId)
              if (frontCam && !frontCamera.value) {
                frontCamera.value = frontCam
                frontCam.name = 'Front Camera'
              }
            }
            if (backDeviceId) {
              const backCam = cameras.value.find(cam => cam.code === backDeviceId)
              if (backCam && !backCamera.value) {
                backCamera.value = backCam
                backCam.name = 'Back Camera'
              }
      }
    } catch (err) {
            if (!frontCamera.value && cameras.value.length >= 1 && cameras.value[0]) {
              frontCamera.value = cameras.value[0]
              cameras.value[0].name = 'Front Camera'
            }
            if (!backCamera.value && cameras.value.length >= 2 && cameras.value[1]) {
              backCamera.value = cameras.value[1]
              cameras.value[1].name = 'Back Camera'
            }
          }
        }
        
        if (isMobile.value && (frontCamera.value || backCamera.value)) {
          cameras.value = cameras.value.filter(cam => 
            (frontCamera.value && cam.code === frontCamera.value.code) ||
            (backCamera.value && cam.code === backCamera.value.code)
          )
        }
      }
      }
    } catch (err) {
    }
  }
  
const startCameraOnMobile = () => {
  requestCameraPermission()
}

const handlePermissionClick = (event: Event) => {
  event.preventDefault()
  event.stopPropagation()
  
  if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const constraints = isMobile.value ? buildMobileConstraints() : { video: true, audio: false }
    
    navigator.mediaDevices.getUserMedia(constraints)
      .then(handlePermissionGranted)
      .catch(handleCameraError)
  } else {
    cameraError.value = 'Camera API not supported in this browser.'
  }
}

const handlePermissionGranted = async (stream: MediaStream) => {
  try {
    cameraError.value = null
    cameraPermissionGranted.value = true
    
    currentStream.value = stream
    
    if (!cameraFeedRef.value?.video) {
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    
    const videoElement = cameraFeedRef.value?.video
    if (videoElement) {
      setupVideoElement(videoElement, stream)
      try {
        await videoElement.play()
      } catch {
      }
    }
    await enumerateCameras()
    
    if (!isSwitchingCamera.value) {
  setTimeout(() => {
        if (cameraFeedRef.value && !isSwitchingCamera.value) {
          cameraFeedRef.value.restartCamera()
        }
      }, 500)
    }
  } catch (err: any) {
    cameraError.value = `Error setting up camera: ${err.message || 'Unknown error'}`
  }
}


const requestCameraPermission = async () => {
  if (isSwitchingCamera.value) {
    return
  }
  
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    cameraError.value = 'Camera API not supported in this browser.'
    return
  }
  
  try {
    cameraError.value = null
    
    if (!cameraFeedRef.value?.video) {
      await new Promise(resolve => setTimeout(resolve, 500))
      if (!cameraFeedRef.value?.video) {
        cameraError.value = 'Camera feed not ready. Please refresh the page.'
        return
      }
    }
    
    const videoElement = cameraFeedRef.value.video
    const constraints = isMobile.value ? buildMobileConstraints() : { video: true, audio: false }
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    cameraPermissionGranted.value = true
    currentStream.value = stream
    
    if (videoElement) {
      setupVideoElement(videoElement, stream)
      try {
        await videoElement.play()
      } catch {
      }
    }
    
    await enumerateCameras()
    setTimeout(() => restartPoseTracking(videoElement), 300)
  } catch (err: any) {
    handleCameraError(err)
  }
}

const getTargetCamera = () => {
    if (isMobile.value) {
    if (isUsingFrontCamera.value && frontCamera.value) {
      return frontCamera.value.code
    }
    if (!isUsingFrontCamera.value && backCamera.value) {
      return backCamera.value.code
    }
    return isUsingFrontCamera.value ? 'user' : 'environment'
  }
  return cameras.value[0]?.code || 'default'
}

const startCameraWhenReady = () => {
  if (isSwitchingCamera.value) return
  
  let attempts = 0
  const maxAttempts = 30
  
  const checkVideoReady = () => {
    if (cameraFeedRef.value?.video) {
      startCamera(getTargetCamera())
    } else if (attempts < maxAttempts) {
      attempts++
      setTimeout(checkVideoReady, 100)
    } else {
      startCamera(getTargetCamera())
    }
  }
  
  setTimeout(checkVideoReady, 200)
}

onMounted(() => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return
  }
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || ''
  const platform = navigator.platform || ''
  
  const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream
  const isIPadOS = platform === 'MacIntel' && navigator.maxTouchPoints > 1
  const isIOSUserAgent = /iPhone|iPad|iPod/i.test(userAgent)
  
  isIOS.value = isIOSDevice || isIPadOS || isIOSUserAgent || deviceInfo.os?.name === 'iOS'
  isAndroid.value = /Android/i.test(userAgent) || deviceInfo.os?.name === 'Android'
  
  isMobile.value = isIOS.value || isAndroid.value || 
                   deviceInfo.device?.type === 'smartphone' || 
                   deviceInfo.device?.type === 'tablet' ||
                   window.innerWidth < 768
  
  if (!isMobile.value) {
    requestCameraPermission()
  } else {
    enumerateCameras().catch(() => {})
  }
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

const currentStream = ref<MediaStream | null>(null)

const buildCameraConstraints = (deviceIdOrFacingMode?: string): MediaStreamConstraints => {
  if (!isMobile.value) {
    return { video: true, audio: false }
  }
  
  if (deviceIdOrFacingMode && deviceIdOrFacingMode !== 'user' && deviceIdOrFacingMode !== 'environment' && deviceIdOrFacingMode !== 'default') {
    const baseConstraints = {
      video: { deviceId: { ideal: deviceIdOrFacingMode } },
      audio: false,
    }
    
    if (isAndroid.value) {
      return {
        ...baseConstraints,
        video: {
          ...baseConstraints.video,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      }
    }
    return baseConstraints
  }
  
  const facingMode = deviceIdOrFacingMode === 'environment' ? 'environment' : 'user'
  const baseConstraints = {
    video: { facingMode: { ideal: facingMode } },
    audio: false,
  }
  
  if (isAndroid.value) {
    return {
      ...baseConstraints,
      video: {
        ...baseConstraints.video,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    }
  }
  return baseConstraints
}

const buildMobileConstraints = (): MediaStreamConstraints => {
  if (isUsingFrontCamera.value && frontCamera.value) {
    return {
      video: { deviceId: { ideal: frontCamera.value.code } },
      audio: false,
    }
  }
  if (!isUsingFrontCamera.value && backCamera.value) {
    return {
      video: { deviceId: { ideal: backCamera.value.code } },
      audio: false,
    }
  }
  return {
    video: { facingMode: { ideal: isUsingFrontCamera.value ? 'user' : 'environment' } },
    audio: false,
  }
}

const setupVideoElement = (videoElement: HTMLVideoElement, stream: MediaStream) => {
  videoElement.setAttribute('playsinline', 'true')
  videoElement.setAttribute('webkit-playsinline', 'true')
  videoElement.muted = true
  videoElement.srcObject = stream
}

const handleCameraError = (err: any) => {
  cameraPermissionGranted.value = false
  
  if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
    cameraError.value = 'Camera permission denied. Please allow camera access in your browser settings and try again.'
  } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
    cameraError.value = 'No camera found. Please connect a camera and try again.'
  } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
    cameraError.value = 'Camera is already in use by another application. Please close other apps using the camera.'
  } else {
    cameraError.value = `Failed to access camera: ${err.message || err.name || 'Unknown error'}. Please try again.`
  }
}

const restartPoseTracking = (videoElement: HTMLVideoElement) => {
  if (isSwitchingCamera.value) return
  
  if (cameraFeedRef.value && videoElement.readyState >= 2) {
    cameraFeedRef.value.restartCamera()
  } else {
    videoElement.addEventListener('loadedmetadata', () => {
      if (!isSwitchingCamera.value && cameraFeedRef.value && videoElement.readyState >= 2) {
        cameraFeedRef.value.restartCamera()
      }
    }, { once: true })
  }
}

async function stopCamera() {
  if (cameraFeedRef.value) {
    const videoElement = cameraFeedRef.value.video
    if (videoElement && videoElement.srcObject) {
    }
  }
  
  if (currentStream.value) {
    currentStream.value.getTracks().forEach((track) => {
      track.stop()
    })
    currentStream.value = null
  }
  
  const videoElement = cameraFeedRef.value?.video
  if (videoElement) {
    if (videoElement.srcObject) {
      const stream = videoElement.srcObject as MediaStream
      stream.getTracks().forEach((track) => {
        track.stop()
      })
    }
    videoElement.pause()
    videoElement.srcObject = null
  }
  
  await new Promise(resolve => setTimeout(resolve, 300))
}

async function startCamera(deviceIdOrFacingMode: string) {
  const videoElement = cameraFeedRef.value?.video
  if (!videoElement) {
    const maxRetries = 5
    let retryCount = 0
    const retryStart = () => {
      retryCount++
      if (retryCount <= maxRetries) {
        setTimeout(() => {
          if (cameraFeedRef.value?.video) {
            startCamera(deviceIdOrFacingMode)
          } else {
            retryStart()
          }
        }, 200)
      } else {
        cameraError.value = 'Camera feed not ready. Please refresh the page.'
      }
    }
    retryStart()
    return
  }
  
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    cameraError.value = 'Camera API not supported in this browser.'
    return
  }
  
  await stopCamera()
  
  if (isMobile.value) {
    const isDeviceId = deviceIdOrFacingMode !== 'user' && deviceIdOrFacingMode !== 'environment' && deviceIdOrFacingMode !== 'default'
    
    if (isDeviceId) {
      if (frontCamera.value && deviceIdOrFacingMode === frontCamera.value.code) {
        isUsingFrontCamera.value = true
        selectedCamera.value = frontCamera.value
      } else if (backCamera.value && deviceIdOrFacingMode === backCamera.value.code) {
        isUsingFrontCamera.value = false
        selectedCamera.value = backCamera.value
      }
    } else if (deviceIdOrFacingMode === 'user' || deviceIdOrFacingMode === 'environment') {
      isUsingFrontCamera.value = deviceIdOrFacingMode === 'user'
    } else {
      const defaultCamera = frontCamera.value
      if (defaultCamera) {
        selectedCamera.value = defaultCamera
      }
      isUsingFrontCamera.value = true
    }
  } else if (!isMobile.value && deviceIdOrFacingMode !== 'default') {
    const camera = cameras.value.find(cam => cam.code === deviceIdOrFacingMode)
    if (camera) {
      selectedCamera.value = camera
    }
  }
  
  const constraints = buildCameraConstraints(deviceIdOrFacingMode)
  
  cameraError.value = null
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
      currentStream.value = stream
    
    if (!videoElement) {
      cameraError.value = 'Video element not ready. Please refresh the page.'
      return
    }
    
        videoElement.pause()
    if (videoElement.srcObject) {
      const oldStream = videoElement.srcObject as MediaStream
      oldStream.getTracks().forEach(track => track.stop())
    }
        videoElement.srcObject = null
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const setupVideo = () => {
      if (!videoElement) return
      
      setupVideoElement(videoElement, stream)
      
      const attemptPlay = async () => {
        if (!videoElement) return
        
        try {
          await videoElement.play()
          cameraError.value = null
          cameraPermissionGranted.value = true
          
          if (videoElement.readyState >= 2) {
            setTimeout(() => {
              if (cameraFeedRef.value && videoElement.readyState >= 2) {
                cameraFeedRef.value.restartCamera()
              }
            }, 300)
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            videoElement.onloadedmetadata = async () => {
              try {
                await videoElement.play()
                cameraError.value = null
                cameraPermissionGranted.value = true
                if (videoElement.readyState >= 2) {
                  setTimeout(() => {
                    if (cameraFeedRef.value && videoElement.readyState >= 2) {
                      cameraFeedRef.value.restartCamera()
                    }
                  }, 300)
                }
              } catch (playErr: any) {
                if (playErr.name !== 'AbortError') {
                  cameraError.value = 'Failed to start camera playback. Please try again.'
                }
              }
            }
          }
        }
      }
      
      attemptPlay()
      
      videoElement.onloadedmetadata = async () => {
        if (videoElement?.paused) {
          try {
            await videoElement.play()
            cameraError.value = null
            cameraPermissionGranted.value = true
          } catch {
          }
        }
      }
    }
    
    if (isIOS.value) {
      setupVideo()
    } else {
      setTimeout(setupVideo, 100)
    }
  } catch (err: any) {
    if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        if (isIOS.value) {
          try {
            const fallbackConstraints: MediaStreamConstraints = {
              video: true,
              audio: false,
            }
            const fallbackStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints)
            currentStream.value = fallbackStream
            if (videoElement) {
              videoElement.pause()
              videoElement.srcObject = null
              await new Promise(resolve => setTimeout(resolve, 100))
              if (videoElement) {
                videoElement.srcObject = fallbackStream
                await videoElement.play()
                cameraError.value = null
                cameraPermissionGranted.value = true
                if (videoElement.readyState >= 2) {
      setTimeout(() => {
                    if (cameraFeedRef.value && videoElement.readyState >= 2) {
          cameraFeedRef.value.restartCamera()
        }
      }, 300)
                }
              }
            }
          } catch (fallbackErr: any) {
            cameraError.value = 'Failed to start camera. Please check your camera settings and permissions.'
          }
        } else {
          cameraError.value = 'Camera constraints not supported. Please try a different camera.'
        }
      } else {
        handleCameraError(err)
      }
    }
}

const switchCamera = async (deviceId: string) => {
  if (isSwitchingCamera.value) return
  
  if (frontCamera.value && deviceId === frontCamera.value.code) {
    isUsingFrontCamera.value = true
    selectedCamera.value = frontCamera.value
  } else if (backCamera.value && deviceId === backCamera.value.code) {
    isUsingFrontCamera.value = false
    selectedCamera.value = backCamera.value
  } else {
    const camera = cameras.value.find(cam => cam.code === deviceId)
        if (camera) {
          selectedCamera.value = camera
      const nameLower = camera.name.toLowerCase()
      isUsingFrontCamera.value = nameLower.includes('front')
    }
  }
  
  isSwitchingCamera.value = true
  
  try {
    await stopCamera()
    await new Promise(resolve => setTimeout(resolve, 200))
    await startCamera(deviceId)
  } finally {
    setTimeout(() => {
      isSwitchingCamera.value = false
    }, 1000)
  }
}

async function handleCameraChange(deviceId: string) {
  await switchCamera(deviceId)
}

async function flipCamera() {
  if (isSwitchingCamera.value) return
  
  if (isMobile.value) {
    if (frontCamera.value && backCamera.value) {
      const targetCamera = isUsingFrontCamera.value ? backCamera.value : frontCamera.value
      isUsingFrontCamera.value = !isUsingFrontCamera.value
      await switchCamera(targetCamera.code)
    } else {
    const newFacingMode = isUsingFrontCamera.value ? 'environment' : 'user'
      isUsingFrontCamera.value = !isUsingFrontCamera.value
      await switchCamera(newFacingMode)
    }
  } else if (cameras.value.length > 1) {
    const currentIndex = cameras.value.findIndex(cam => cam.code === selectedCamera.value?.code)
      const nextIndex = (currentIndex + 1) % cameras.value.length
      const nextCamera = cameras.value[nextIndex]
      if (nextCamera) {
      await switchCamera(nextCamera.code)
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

/* Camera Error Message */
.camera-error-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  z-index: 1002;
  max-width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  
  p {
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
    line-height: 1.5;
  }
  
  .retry-button {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease;
    
    &:hover {
      background: #dc2626;
    }
    
    &:active {
      background: #b91c1c;
    }
  }
}

@media (max-width: 768px) {
  .camera-error-message {
    padding: 1.25rem;
    max-width: 85%;
    
    p {
      font-size: 0.85rem;
    }
    
    .retry-button {
      padding: 0.625rem 1.25rem;
      font-size: 0.85rem;
    }
  }
}

/* Camera Permission Overlay */
.camera-permission-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1003;
  backdrop-filter: blur(10px);
}

.camera-permission-content {
  text-align: center;
  padding: 2rem;
  max-width: 90%;
  color: white;
  
  h3 {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
    font-weight: 600;
  }
  
  p {
    margin: 0 0 2rem 0;
    font-size: 1rem;
    line-height: 1.5;
    opacity: 0.9;
  }
  
  .permission-button {
    background: #ef4444;
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
    
    &:hover {
      background: #dc2626;
      box-shadow: 0 6px 25px rgba(239, 68, 68, 0.6);
      transform: translateY(-2px);
    }
    
    &:active {
      background: #b91c1c;
      transform: translateY(0);
    }
  }
}

@media (max-width: 768px) {
  .camera-permission-content {
    padding: 1.5rem;
    
    h3 {
      font-size: 1.25rem;
    }
    
    p {
      font-size: 0.9rem;
      margin-bottom: 1.5rem;
    }
    
    .permission-button {
      padding: 0.875rem 1.75rem;
      font-size: 0.95rem;
      width: 100%;
      max-width: 300px;
    }
  }
}
</style>
