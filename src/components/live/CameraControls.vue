<template>
  <div class="camera-controls">
    <Dropdown
      v-if="!isMobile"
      v-model="selectedCamera"
      :options="cameras"
      optionLabel="name"
      placeholder="Select a Camera"
      class="camera-dropdown"
      @change="$emit('camera-change', $event.value.code)"
    />
    <Button
      :label="flipButtonLabel"
      :icon="flipButtonIcon"
      severity="secondary"
      outlined
      class="flip-camera-button"
      @click="$emit('flip-camera')"
    >
      <template #icon>
        <i :class="flipButtonIcon"></i>
      </template>
    </Button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'

interface Camera {
  name: string
  code: string
}

interface Props {
  isMobile: boolean
  cameras: Camera[]
  selectedCamera: Camera | null
  isUsingFrontCamera: boolean
}

const props = defineProps<Props>()
defineEmits<{
  'camera-change': [deviceId: string]
  'flip-camera': []
}>()

const selectedCamera = ref<Camera | null>(props.selectedCamera)

const flipButtonLabel = computed(() => {
  if (props.isMobile) {
    return props.isUsingFrontCamera ? 'Back Camera' : 'Front Camera'
  }
  return 'Switch Camera'
})

const flipButtonIcon = computed(() => {
  return 'pi pi-refresh'
})

watch(() => props.selectedCamera, (newCamera) => {
  selectedCamera.value = newCamera
})
</script>

<style scoped lang="scss">
.camera-controls {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 10;
  display: flex;
  gap: 0.5rem;
}

.camera-dropdown {
  background: white !important;
  border: 2px solid white !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  
  :deep(.p-dropdown-label) {
    color: #000 !important;
    font-weight: 500;
  }
  
  :deep(.p-dropdown-trigger) {
    color: #000 !important;
  }
  
  &:hover {
    background: #f5f5f5 !important;
    border-color: #f5f5f5 !important;
  }
}

.flip-camera-button {
  background: white !important;
  border: 2px solid white !important;
  color: #000 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  font-weight: 500;
  
  &:hover {
    background: #f5f5f5 !important;
    border-color: #f5f5f5 !important;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }
  
  :deep(.p-button-label) {
    color: #000 !important;
    @media (max-width: 640px) {
      display: none;
    }
  }
  
  :deep(.p-button-icon) {
    color: #000 !important;
  }
}

@media (max-width: 768px) {
  .camera-controls {
    top: 0.75rem;
    right: 0.75rem;
    left: 0.75rem;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .camera-dropdown {
    width: 100%;
  }
  
  .flip-camera-button {
    padding: 0.75rem;
    min-width: auto;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    
    :deep(.p-button-icon) {
      margin: 0;
      font-size: 1.25rem;
    }
  }
}
</style>

