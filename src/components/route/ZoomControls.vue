<template>
  <div class="zoom-controls">
    <Button
      icon="pi pi-plus"
      severity="secondary"
      rounded
      class="control-button"
      @click="$emit('zoom-in')"
    />
    <Button
      icon="pi pi-minus"
      severity="secondary"
      rounded
      class="control-button"
      @click="$emit('zoom-out')"
    />
    <Button
      icon="pi pi-refresh"
      severity="secondary"
      rounded
      class="control-button"
      @click="$emit('reset')"
    />
    <Button
      icon="pi pi-arrows-alt"
      :severity="isPanMode ? 'info' : 'secondary'"
      rounded
      class="control-button"
      @click="$emit('toggle-pan')"
    />
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'

interface Props {
  isPanMode?: boolean
}

withDefaults(defineProps<Props>(), {
  isPanMode: false
})

defineEmits<{
  'zoom-in': []
  'zoom-out': []
  'reset': []
  'toggle-pan': []
}>()
</script>

<style scoped lang="scss">
.zoom-controls {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.75rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.control-button {
  width: 2.5rem;
  height: 2.5rem;
  
  :deep(.p-button-icon) {
    font-size: 1rem;
  }
  
  :deep(.p-button-info .p-button-icon) {
    color: white;
  }
}

@media (max-width: 768px) {
  .zoom-controls {
    right: 0.5rem;
    padding: 0.5rem;
    gap: 0.5rem;
  }
  
  .control-button {
    width: 2.25rem;
    height: 2.25rem;
    
    :deep(.p-button-icon) {
      font-size: 0.9rem;
    }
  }
}
</style>


