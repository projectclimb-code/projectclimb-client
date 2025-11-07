<template>
  <div class="settings-container">
    <div class="settings-header">
      <div class="header-icon">
        <i class="pi pi-cog"></i>
      </div>
      <h1 class="settings-title">Settings</h1>
      <p class="settings-subtitle">Configure display and wall settings</p>
    </div>

    <div class="settings-content">
      <!-- Color Settings Section -->
      <div class="settings-section">
        <h2 class="section-title">
          <i class="pi pi-palette section-icon"></i>
          Color Settings
        </h2>
        <div class="settings-grid">
          <div class="setting-card">
            <label class="setting-label">
              <i class="pi pi-image setting-label-icon"></i>
              Background Color
            </label>
            <div class="color-picker-wrapper">
              <ColorPicker 
                v-model="backgroundColor" 
                @change="sendBackgroundColor()"
                class="color-picker"
              />
              <Button 
                label="Toggle"
                icon="pi pi-eye"
                severity="secondary"
                outlined
                size="small"
                @click="switchVisibility('background')"
                class="toggle-button"
              />
            </div>
          </div>

          <div class="setting-card">
            <label class="setting-label">
              <i class="pi pi-th-large setting-label-icon"></i>
              Wall Background Color
            </label>
            <div class="color-picker-wrapper">
              <ColorPicker 
                v-model="wallBackgroundColor" 
                @change="sendWallBackgroundColor()"
                class="color-picker"
              />
              <Button 
                label="Toggle"
                icon="pi pi-eye"
                severity="secondary"
                outlined
                size="small"
                @click="switchVisibility('wallBackground')"
                class="toggle-button"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Display Controls Section -->
      <div class="settings-section">
        <h2 class="section-title">
          <i class="pi pi-sliders-h section-icon"></i>
          Display Controls
        </h2>
        <div class="settings-grid">
          <Button 
            label="Toggle Wall Grid"
            icon="pi pi-th-large"
            severity="secondary"
            outlined
            @click="switchVisibility('wallGrid')"
            class="control-button"
          />
          <Button 
            label="Holds On"
            icon="pi pi-check-circle"
            severity="success"
            @click="holdsOn"
            class="control-button"
          />
          <Button 
            label="Holds Off"
            icon="pi pi-times-circle"
            severity="danger"
            @click="holdsOff"
            class="control-button"
          />
        </div>
      </div>

      <!-- Actions Section -->
      <div class="settings-section">
        <h2 class="section-title">
          <i class="pi pi-refresh section-icon"></i>
          Actions
        </h2>
        <div class="settings-grid">
          <Button 
            label="Reset All Settings"
            icon="pi pi-replay"
            severity="warning"
            outlined
            @click="reset"
            class="control-button reset-button"
          />
        </div>
      </div>
    </div>

    <!-- Version Footer -->
    <div class="settings-footer">
      <div class="version-info">
        <i class="pi pi-info-circle version-icon"></i>
        <span class="version-label">Version</span>
        <span class="version-number">{{ appVersion }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { websocketService } from '@/services/ws.service'
import ColorPicker from 'primevue/colorpicker'
import Button from 'primevue/button'
import { ref } from 'vue'

// Get version from package.json - Vite will handle this at build time
const appVersion = ref(import.meta.env.VITE_APP_VERSION || '0.0.0')
const backgroundColor = ref('#000')
const wallBackgroundColor = ref('#000')

function switchVisibility(layer: string) {
  websocketService.send({ type: 'display', layer })
}

function sendBackgroundColor() {
  websocketService.send({ type: 'display', layer: 'background', color: backgroundColor.value })
}

function sendWallBackgroundColor() {
  websocketService.send({
    type: 'display',
    layer: 'wallBackground',
    color: wallBackgroundColor.value,
  })
}

function holdsOn() {
  websocketService.send({ type: 'display', layer: 'holds', visibility: true })
}

function holdsOff() {
  websocketService.send({ type: 'display', layer: 'holds', visibility: false })
}

function reset() {
  websocketService.send({ type: 'display', layer: 'reset', color: wallBackgroundColor.value })
}
</script>

<style scoped lang="scss">
.settings-container {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background: linear-gradient(to bottom, #f8fafc 0%, #ffffff 100%);
  padding-bottom: 120px;
}

.settings-header {
  background: linear-gradient(135deg, #4095f2 0%, #2077d6 100%);
  color: white;
  padding: 3rem 2rem 2rem 2rem;
  text-align: center;
  position: relative;
}

.header-icon {
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.header-icon .pi {
  font-size: 3.5rem;
  opacity: 0.9;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.settings-title {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 700;
  color: white;
}

.settings-subtitle {
  margin: 0;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 400;
}

.settings-content {
  padding: 2rem 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.settings-section {
  margin-bottom: 2.5rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e5e7eb;
}

.section-icon {
  color: #4095f2;
  font-size: 1.5rem;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.setting-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
}

.setting-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.95rem;
  color: #374151;
  margin-bottom: 1rem;
}

.setting-label-icon {
  color: #4095f2;
  font-size: 1.1rem;
}

.color-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.color-picker {
  flex: 1;
  min-width: 200px;
}

.toggle-button {
  flex-shrink: 0;
}

.control-button {
  width: 100%;
  padding: 1rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.control-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.reset-button {
  border: 2px solid #f59e0b;
}

.settings-footer {
  position: fixed;
  bottom: 80px;
  left: 0;
  right: 0;
  padding: 1rem 2rem;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.version-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.version-icon {
  font-size: 1rem;
  opacity: 0.7;
}

.version-label {
  font-weight: 500;
}

.version-number {
  font-weight: 600;
  color: #4095f2;
  font-family: 'Monaco', 'Menlo', monospace;
}

@media (max-width: 640px) {
  .settings-header {
    padding: 2rem 1.5rem 1.5rem 1.5rem;
  }

  .header-icon .pi {
    font-size: 2.5rem;
  }

  .settings-title {
    font-size: 1.5rem;
  }

  .settings-subtitle {
    font-size: 0.9rem;
  }

  .settings-content {
    padding: 1.5rem 1rem;
  }

  .settings-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .setting-card {
    padding: 1.25rem;
  }

  .color-picker-wrapper {
    flex-direction: column;
    align-items: stretch;
  }

  .color-picker {
    min-width: 100%;
  }

  .toggle-button {
    width: 100%;
  }

  .settings-footer {
    bottom: 70px;
    padding: 0.75rem 1rem;
  }
}

/* PrimeVue ColorPicker styling */
:deep(.p-colorpicker-preview) {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.3s ease;
}

:deep(.p-colorpicker-preview:hover) {
  border-color: #4095f2;
  box-shadow: 0 0 0 4px rgba(64, 149, 242, 0.1);
}

:deep(.p-colorpicker-panel) {
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  border: 1px solid #e5e7eb;
}
</style>
