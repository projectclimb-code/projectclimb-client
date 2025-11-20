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

  <!-- Session Action Bar for Tablet and Desktop -->
  <div v-if="!isMobile && isSessionRoute" class="action-bar">
    <Button
      :icon="'pi pi-refresh'"
      class="action-bar-button"
      @click="$emit('restart')"
      v-tooltip.left="'Restart'"
      rounded
    />
    <Button
      :icon="'pi pi-replay'"
      class="action-bar-button"
      @click="$emit('relay')"
      v-tooltip.left="'Relay'"
      rounded
    />
    <Button
      :icon="'pi pi-pause'"
      class="action-bar-button"
      @click="$emit('pause')"
      v-tooltip.left="'Pause'"
      rounded
    />
  </div>

  <!-- Mobile Session Action Bar -->
  <div v-if="isMobile && isSessionRoute" class="mobile-action-bar">
    <button
      v-for="item in sessionMobileActionItems"
      :key="item.label"
      class="mobile-action-btn"
      @click="item.command()"
      :title="item.tooltip"
    >
      <i :class="item.icon"></i>
    </button>
  </div>

  <!-- Recording Button for Session (Desktop/Tablet) -->
  <div v-if="!isMobile && isSessionRoute" class="recording-button-container">
    <button
      class="recording-button-camera"
      :class="{ 'recording': isRecording }"
      @click="$emit('toggleRecording')"
    >
      <span v-if="!isRecording" class="recording-button-inner"></span>
      <span v-else class="recording-button-stop"></span>
    </button>
    <div v-if="isRecording" class="recording-timer-display">{{ recordingTime }}</div>
  </div>

  <!-- Recording Button for Session (Mobile) -->
  <div v-if="isMobile && isSessionRoute" class="recording-button-container-mobile">
    <button
      class="recording-button-camera-mobile"
      :class="{ 'recording': isRecording }"
      @click="$emit('toggleRecording')"
    >
      <span v-if="!isRecording" class="recording-button-inner-mobile"></span>
      <span v-else class="recording-button-stop-mobile"></span>
    </button>
    <div v-if="isRecording" class="recording-timer-display-mobile">{{ recordingTime }}</div>
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
  isRecording?: boolean
  recordingTime?: string
}>()

const emit = defineEmits<{
  save: []
  cancel: []
  editInfo: []
  flip: []
  start: []
  end: []
  restart: []
  relay: []
  pause: []
  toggleRecording: []
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

const sessionMobileActionItems = computed(() => [
  {
    label: 'Restart',
    icon: 'pi pi-refresh',
    command: () => emit('restart'),
    tooltip: 'Restart',
  },
  {
    label: 'Relay',
    icon: 'pi pi-replay',
    command: () => emit('relay'),
    tooltip: 'Relay',
  },
  {
    label: 'Pause',
    icon: 'pi pi-pause',
    command: () => emit('pause'),
    tooltip: 'Pause',
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
    top: max(16px, env(safe-area-inset-top, 16px));
    bottom: auto;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.9rem;
    background: rgba(255,255,255,0.95);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
    z-index: 1001;
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

/* Recording Button - Camera App Style (Desktop/Tablet) */
.recording-button-container {
  position: absolute;
  left: 20px;
  bottom: 110px; /* Above bottom menu (90px height + 20px padding) */
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
  z-index: 1001; /* Above bottom menu (z-index: 1000) */
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

/* Recording Button - Mobile */
.recording-button-container-mobile {
  position: fixed;
  bottom: 100px; /* Above bottom menu (80px height + 20px padding) */
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  z-index: 1001; /* Above bottom menu (z-index: 1000) */
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

@media (min-width: 641px) and (max-width: 1024px) {
  .recording-button-container {
    left: 50%;
    bottom: 115px; /* Above bottom menu (85px height + 30px padding) */
    transform: translateX(-50%);
  }
}
</style>

