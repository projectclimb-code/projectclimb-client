<template>
  <!-- Action Bar for Tablet and Desktop - Positioned relative to viewport -->
  <div v-if="!isMobile && !isSessionRoute" class="action-bar">
    <Button
      :icon="'pi pi-check'"
      class="action-bar-button"
      @click="$emit('save')"
      v-tooltip.left="'Save'"
      rounded
    />
    <Button
      :icon="'pi pi-times'"
      class="action-bar-button"
      @click="$emit('cancel')"
      v-tooltip.left="'Cancel'"
      rounded
    />
    <Button
      :icon="'pi pi-pencil'"
      class="action-bar-button"
      @click="$emit('editInfo')"
      v-tooltip.left="'Edit info'"
      rounded
    />
    <Button
      :icon="'pi pi-play'"
      class="action-bar-button"
      :class="{ 'action-bar-button-start': startMode }"
      @click="$emit('start')"
      v-tooltip.left="'Start'"
      rounded
    />
    <Button
      :icon="'pi pi-stop-circle'"
      class="action-bar-button"
      :class="{ 'action-bar-button-end': endMode }"
      @click="$emit('end')"
      v-tooltip.left="'End'"
      rounded
    />
    <Button
      :icon="'pi pi-arrow-right-arrow-left'"
      class="action-bar-button"
      @click="$emit('flip')"
      v-tooltip.left="'Flip'"
      rounded
    />
  </div>

  <!-- Mobile Action Bar - compact icon-only design -->
  <div v-if="isMobile && !isSessionRoute" class="mobile-action-bar">
    <button
      v-for="item in mobileActionItems"
      :key="item.label"
      class="mobile-action-btn"
      :class="item.class"
      @click="item.command()"
      :title="item.tooltip"
    >
      <i :class="item.icon"></i>
    </button>
  </div>
</template>

<script lang="ts" setup>
import Button from 'primevue/button'
import { computed } from 'vue'

const props = defineProps<{
  isMobile: boolean
  isSessionRoute: boolean
  startMode: boolean
  endMode: boolean
}>()

const emit = defineEmits<{
  save: []
  cancel: []
  editInfo: []
  flip: []
  start: []
  end: []
}>()

const mobileActionItems = computed(() => [
  {
    label: 'Save',
    icon: 'pi pi-check',
    command: () => emit('save'),
    tooltip: 'Save',
    class: '',
  },
  {
    label: 'Cancel',
    icon: 'pi pi-times',
    command: () => emit('cancel'),
    tooltip: 'Cancel',
    class: '',
  },
  {
    label: 'Edit',
    icon: 'pi pi-pencil',
    command: () => emit('editInfo'),
    tooltip: 'Edit info',
    class: '',
  },
  {
    label: 'Start',
    icon: 'pi pi-play',
    command: () => emit('start'),
    tooltip: 'Start',
    class: props.startMode ? 'mobile-action-start' : '',
  },
  {
    label: 'End',
    icon: 'pi pi-stop-circle',
    command: () => emit('end'),
    tooltip: 'End',
    class: props.endMode ? 'mobile-action-end' : '',
  },
  {
    label: 'Flip',
    icon: 'pi pi-refresh',
    command: () => emit('flip'),
    tooltip: 'Flip',
    class: '',
  },
])
</script>

<style scoped>
/* Action Bar Styles for Tablet and Desktop */
.action-bar {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  z-index: 10;
}

@media (min-width: 641px) and (max-width: 1024px) {
  .action-bar {
    left: 50%;
    top: 16px;
    transform: translateX(-50%);
    flex-direction: row;
    gap: 1rem;
    z-index: 20;
  }
}

@media (max-width: 640px) {
  .action-bar { left: 16px; }
}

/* Tablet portrait orientation - action bar at top */
@media (min-width: 641px) and (max-width: 1024px) and (orientation: portrait) {
  .action-bar {
    left: 50% !important;
    top: 16px !important;
    transform: translateX(-50%) !important;
    flex-direction: row !important;
    gap: 1rem !important;
    z-index: 20 !important;
  }
}

/* Tablet landscape orientation - action bar on side */
@media (min-width: 641px) and (max-width: 1024px) and (orientation: landscape) {
  .action-bar {
    left: 20px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    flex-direction: column !important;
    gap: 0.75rem !important;
    z-index: 10 !important;
  }
}

/* Desktop styles */
@media (min-width: 1025px) {
  .action-bar {
    left: 20px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    flex-direction: column !important;
    gap: 0.75rem !important;
    z-index: 10 !important;
  }
}

/* Action bar button base style */
.action-bar-button, 
.action-bar-button.p-button {
  width: 3.5rem !important;
  height: 3.5rem !important;
  font-size: 1rem !important;
  border-radius: 50% !important;
  background: white !important;
  color: black !important;
  border: none !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
  transition: all 0.2s !important;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-bar-button:active:not(.action-bar-button-start):not(.action-bar-button-end) {
  transform: scale(0.95);
  background: #d0d0d0 !important;
}

.action-bar-button-start, .action-bar-button-start.p-button {
  background: #22c55e !important;
  border-color: #22c55e !important;
  color: #fff !important;
}

.action-bar-button-end, .action-bar-button-end.p-button {
  background: #ef4444 !important;
  border-color: #ef4444 !important;
  color: #fff !important;
}

.action-bar-button-start:active, .action-bar-button-start.p-button:active {
  background: #15803d !important;
  border-color: #15803d !important;
}

.action-bar-button-end:active, .action-bar-button-end.p-button:active {
  background: #b91c1c !important;
  border-color: #b91c1c !important;
}

.action-bar-button :deep(.p-button-icon),
.action-bar-button :deep(.pi),
.action-bar-button :deep(i) {
  font-size: inherit !important;
  color: inherit !important;
}

@media (min-width: 641px) and (max-width: 1024px) {
  .action-bar-button {
    width: 5rem !important;
    height: 5rem !important;
    font-size: 1.4rem !important;
  }
  .action-bar-button :deep(.p-button-icon),
  .action-bar-button :deep(.pi),
  .action-bar-button :deep(i) {
    font-size: 1.4rem !important;
  }
}

@media (min-width: 1025px) {
  .action-bar-button {
    width: 4rem !important;
    height: 4rem !important;
    font-size: 1.1rem !important;
  }
  .action-bar-button :deep(.p-button-icon),
  .action-bar-button :deep(.pi),
  .action-bar-button :deep(i) {
    font-size: 1.1rem !important;
  }
}

/* Mobile Action Bar - Modern Compact Design */
@media (max-width: 640px) {
  .mobile-action-bar {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(100px + 8px);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.9rem;
    background: rgba(255,255,255,0.95);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
    z-index: 1000;
    pointer-events: auto;
  }
  .mobile-action-btn {
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 14px;
    background: transparent;
    color: #333;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    position: relative;
  }
  .mobile-action-btn:active {
    transform: scale(0.92);
  }
  .mobile-action-btn i {
    font-size: 1.25rem;
    color: inherit;
  }
  .mobile-action-btn.mobile-action-start { background: #22c55e !important; }
  .mobile-action-btn.mobile-action-start i { color: #fff !important; }
  .mobile-action-btn.mobile-action-end { background: #ef4444 !important; }
  .mobile-action-btn.mobile-action-end i { color: #fff !important; }
}
</style>

