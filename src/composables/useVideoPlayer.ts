import { ref } from 'vue'

const activeVideoId = ref<number | null>(null)
const activeVideoRef = ref<HTMLVideoElement | null>(null)

export function useVideoPlayer() {
  function setActiveVideo(id: number | null, videoRef: HTMLVideoElement | null) {
    // Pause previous video if exists
    if (activeVideoRef.value && activeVideoRef.value !== videoRef) {
      activeVideoRef.value.pause()
    }
    
    activeVideoId.value = id
    activeVideoRef.value = videoRef
  }

  function clearActiveVideo() {
    if (activeVideoRef.value) {
      activeVideoRef.value.pause()
    }
    activeVideoId.value = null
    activeVideoRef.value = null
  }

  function isActiveVideo(id: number | null): boolean {
    return activeVideoId.value === id
  }

  return {
    activeVideoId,
    setActiveVideo,
    clearActiveVideo,
    isActiveVideo,
  }
}



