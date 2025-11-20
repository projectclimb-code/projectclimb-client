<template>
  <div class="camera-view">
    <video 
      ref="video" 
      playsinline
      class="camera-video"
      autoplay
      muted
      webkit-playsinline
      preload="auto"
      disablePictureInPicture
    ></video>
    <PoseTracker
      ref="poseTrackerRef"
      :video-element="video"
      @ready="handlePoseReady"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, toRaw, markRaw, watch } from 'vue'
import { Camera } from '@mediapipe/camera_utils'
import PoseTracker from './PoseTracker.vue'
import type { Pose } from '@mediapipe/pose'

const video = ref<HTMLVideoElement | null>(null)
const poseTrackerRef = ref<InstanceType<typeof PoseTracker> | null>(null)
const isIOS = ref(false)

let cameraInstance: Camera | null = null
let poseInstance: Pose | null = null
let isRestarting = false
let isInitialized = false

interface Props {
  isSwitchingCamera?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  ready: [videoElement: HTMLVideoElement, poseInstance: Pose]
}>()

// Set mobile-specific video attributes programmatically
onMounted(() => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
  isIOS.value = /iPad|iPhone|iPod/.test(userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  
  if (video.value) {
    video.value.setAttribute('x-webkit-airplay', 'deny')
    video.value.setAttribute('playsinline', 'true')
    video.value.setAttribute('webkit-playsinline', 'true')
    
    if ('disablePictureInPicture' in video.value) {
      ;(video.value as any).disablePictureInPicture = true
    }
    
    video.value.muted = true
    video.value.preload = 'auto'
  }
})

watch(video, (newVideo) => {
  if (newVideo) {
    newVideo.setAttribute('x-webkit-airplay', 'deny')
    newVideo.setAttribute('playsinline', 'true')
    newVideo.setAttribute('webkit-playsinline', 'true')
    if ('disablePictureInPicture' in newVideo) {
      ;(newVideo as any).disablePictureInPicture = true
    }
    newVideo.muted = true
    newVideo.preload = 'auto'
  }
})

watch(() => video.value?.srcObject, (srcObject, oldSrcObject) => {
      if (!srcObject && oldSrcObject && cameraInstance) {
        try {
          cameraInstance.stop()
        } catch (err) {
          // Ignore errors during stream removal
        }
        cameraInstance = null
        isInitialized = false
      }
      
      if (srcObject && poseInstance && !isInitialized && !isRestarting && !(props.isSwitchingCamera === true)) {
        startCameraWhenReady()
      }
    })

function handlePoseReady(pose: Pose) {
  poseInstance = pose
  
  if (video.value && video.value.srcObject) {
    startCameraWhenReady()
  }
  
  if (video.value && poseInstance) {
    emit('ready', video.value, poseInstance)
  }
}

function startCameraWhenReady() {
  const videoEl = video.value
  if (!videoEl || !poseInstance || isInitialized || isRestarting) {
    return
  }
  
  if (!videoEl.srcObject) {
    return
  }
  
  const tryStart = () => {
    if (isInitialized || !videoEl || !poseInstance) return
    
    try {
      markRaw(videoEl)
      
      cameraInstance = new Camera(videoEl, {
        onFrame: async () => {
          if (!isInitialized || !poseInstance || !videoEl || !videoEl.srcObject) {
            return
          }
          
          if (videoEl.readyState < 2) {
            return
          }
          
          try {
            const rawVideo = toRaw(videoEl)
            await poseInstance.send({ image: rawVideo })
          } catch (err: any) {
            if (err?.name !== 'AbortError' && err?.message?.includes('cancel') === false) {
              // Ignore expected errors during switching
            }
          }
        },
        width: 640,
        height: 480,
      })
      
      cameraInstance.start()
      isInitialized = true
    } catch (err) {
      isInitialized = false
    }
  }
  
  if (videoEl.readyState >= 1) {
    tryStart()
  } else {
    const onReady = () => {
      if (!isInitialized) {
        tryStart()
      }
    }
    videoEl.addEventListener('loadedmetadata', onReady, { once: true })
    videoEl.addEventListener('loadeddata', onReady, { once: true })
    setTimeout(() => {
      if (!isInitialized && videoEl.srcObject) {
        tryStart()
      }
    }, 1000)
  }
}

onBeforeUnmount(() => {
  isRestarting = false
  isInitialized = false
  
  if (cameraInstance) {
    try {
      cameraInstance.stop()
      cameraInstance = null
    } catch (err) {
      // Ignore errors during cleanup
    }
  }
  
  if (video.value && video.value.srcObject) {
    const stream = video.value.srcObject as MediaStream
    stream.getTracks().forEach(track => track.stop())
    video.value.srcObject = null
  }
})

defineExpose({
  video: video,
  restartCamera: () => {
    if (props.isSwitchingCamera === true) {
      return
    }
    
    if (isRestarting) {
      return
    }
    
    isRestarting = true
    
    const videoEl = video.value
    if (!videoEl || !poseInstance) {
      isRestarting = false
      return
    }
    
    if (cameraInstance) {
      try {
        cameraInstance.stop()
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            cameraInstance = null
            isInitialized = false
            
            setTimeout(() => {
              isRestarting = false
              if (videoEl && poseInstance && videoEl.srcObject) {
                startCameraWhenReady()
              }
              resolve()
            }, 200)
          }, 100)
        })
      } catch (err) {
        cameraInstance = null
        isInitialized = false
        isRestarting = false
      }
    } else {
      isRestarting = false
      if (videoEl && poseInstance && videoEl.srcObject) {
        startCameraWhenReady()
      }
    }
  },
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
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
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
