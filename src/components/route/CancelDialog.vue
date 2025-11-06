<template>
  <div class="cancel-dialog">
    <div class="dialog-header">
      <div class="header-icon">
        <i class="pi pi-exclamation-triangle"></i>
      </div>
      <h3 class="dialog-title">Cancel</h3>
    </div>
    <div class="dialog-content">
      <p class="dialog-message">Are you sure you want to cancel?</p>
    </div>
    <div class="dialog-actions">
      <Button
        label="No"
        severity="secondary"
        outlined
        class="action-button cancel-button-no"
        @click="handleNo"
      >
        <template #icon>
          <i class="pi pi-times"></i>
        </template>
      </Button>
      <Button
        label="Yes"
        severity="danger"
        class="action-button cancel-button-yes"
        @click="handleYes"
      >
        <template #icon>
          <i class="pi pi-check"></i>
        </template>
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import Button from 'primevue/button'
import { useRouter } from 'vue-router'

const router = useRouter()
const dialogRef = inject<any>('dialogRef')

function handleNo() {
  if (dialogRef?.value) {
    dialogRef.value.close()
  }
}

function handleYes() {
  if (dialogRef?.value) {
    dialogRef.value.close()
    router.push('/routes')
  }
}
</script>

<style scoped>
.cancel-dialog {
  padding: 0;
  background: #ffffff;
  border-radius: 20px;
  overflow: hidden;
}

.dialog-header {
  padding: 2.5rem 2rem 1.5rem 2rem;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%);
  color: white;
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
  font-size: 3rem;
  opacity: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.dialog-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
}

.dialog-content {
  padding: 2.5rem 2rem;
  background: #ffffff;
}

.dialog-message {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.7;
  color: #4b5563;
  text-align: center;
  font-weight: 400;
}

.dialog-actions {
  padding: 0 2rem 2rem 2rem;
  background: #ffffff;
  display: flex;
  justify-content: center;
  gap: 1rem;
}

:deep(.action-button.p-button) {
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 14px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: 'Zalando Sans', sans-serif;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 140px;
  justify-content: center;
  letter-spacing: 0.01em;
}

:deep(.cancel-button-no.p-button) {
  background: #ffffff;
  color: #6b7280;
  border: 2px solid #e5e7eb;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

:deep(.cancel-button-no.p-button:hover) {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #374151;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

:deep(.cancel-button-no.p-button:active) {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

:deep(.cancel-button-yes.p-button) {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border: none;
  color: white;
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.35);
}

:deep(.cancel-button-yes.p-button:hover) {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  transform: translateY(-3px);
  box-shadow: 0 10px 28px rgba(239, 68, 68, 0.45);
}

:deep(.cancel-button-yes.p-button:active) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
}

:deep(.action-button .p-button-icon) {
  font-size: 1.1rem;
}

@media (max-width: 640px) {
  .dialog-header {
    padding: 1.5rem 1.5rem 1.25rem 1.5rem;
  }
  
  .header-icon .pi {
    font-size: 2.5rem;
  }
  
  .dialog-title {
    font-size: 1.25rem;
  }
  
  .dialog-content {
    padding: 1.5rem;
  }
  
  .dialog-message {
    font-size: 0.95rem;
  }
  
  .dialog-actions {
    padding: 1.25rem 1.5rem 1.5rem 1.5rem;
    flex-direction: column-reverse;
    gap: 0.75rem;
  }
  
  :deep(.action-button.p-button) {
    width: 100%;
  }
}
</style>

