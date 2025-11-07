<template>
  <div class="create-boulder-dialog">
    <div class="dialog-header">
      <div class="header-icon">
        <i :class="isEditMode ? 'pi pi-file-edit' : 'pi pi-plus-circle'"></i>
      </div>
      <h3 class="dialog-title">{{ isEditMode ? 'Edit Boulder' : 'Create New Boulder' }}</h3>
      <p class="dialog-description">
        {{ isEditMode ? 'Update the name and grade for this boulder route.' : 'Enter a name and select a grade for your new boulder route.' }}
      </p>
    </div>
    <div class="dialog-content">
      <div class="form-field">
        <label for="boulderName" class="form-label">
          <i class="pi pi-pencil form-label-icon"></i>
          Boulder Name
        </label>
        <InputText
          id="boulderName"
          v-model="boulderName"
          placeholder="Enter boulder name"
          class="w-full custom-input"
          autofocus
          @keyup.enter="handleSubmit"
        />
      </div>
      <div class="form-field">
        <label for="boulderGrade" class="form-label">
          <i class="pi pi-sort-amount-up form-label-icon"></i>
          Grade
        </label>
        <Dropdown
          id="boulderGrade"
          v-model="selectedGrade"
          :options="gradeOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select a grade"
          class="w-full grade-dropdown custom-dropdown"
        />
      </div>
      <div class="form-field">
        <label for="boulderAuthor" class="form-label">
          <i class="pi pi-user form-label-icon"></i>
          Author
        </label>
        <InputText
          id="boulderAuthor"
          v-model="author"
          placeholder="Enter author name"
          class="w-full custom-input"
          @keyup.enter="handleSubmit"
        />
      </div>
      <div class="dialog-actions">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          class="action-button cancel-button"
          @click="handleCancel"
        >
          <template #icon>
            <i class="pi pi-times"></i>
          </template>
        </Button>
        <Button
          :label="isEditMode ? 'Update' : 'Create'"
          type="button"
          class="action-button create-button"
          :disabled="!boulderName || !selectedGrade"
          @click="handleSubmit"
        >
          <template #icon>
            <i class="pi pi-check"></i>
          </template>
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, computed, onMounted } from 'vue'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import { ClimbingRouteGrade } from '@/interfaces/interfaces'
import type { Route } from '@/interfaces/interfaces'

const dialogRef = inject<any>('dialogRef')

const boulderName = ref('')
const selectedGrade = ref<ClimbingRouteGrade | null>(null)
const author = ref('Trinity')

// Get initial data from dialogRef if editing
const initialData = computed(() => {
  return dialogRef?.value?.data as { route?: Route } | undefined
})

const isEditMode = computed(() => {
  return !!initialData.value?.route
})

const gradeOptions = Object.values(ClimbingRouteGrade).map((grade) => ({
  label: grade,
  value: grade,
}))

// Initialize form with existing route data if editing
onMounted(() => {
  if (isEditMode.value && initialData.value?.route) {
    const route = initialData.value.route
    boulderName.value = route.name || ''
    selectedGrade.value = route.data?.grade || null
    author.value = route.data?.author || 'Trinity'
  }
})

function handleCancel() {
  if (dialogRef?.value) {
    dialogRef.value.close()
  }
}

function handleSubmit() {
  console.log('handleSubmit called', { 
    boulderName: boulderName.value, 
    selectedGrade: selectedGrade.value,
    isEditMode: isEditMode.value
  })
  
  if (!boulderName.value || !selectedGrade.value) {
    console.warn('Missing required fields', { 
      boulderName: boulderName.value, 
      selectedGrade: selectedGrade.value 
    })
    return
  }
  
  const closeData = {
    name: boulderName.value.trim(),
    grade: selectedGrade.value,
    author: author.value.trim() || 'Trinity', // Default to 'Trinity' if empty
    isEdit: isEditMode.value,
    route: initialData.value?.route
  }
  console.log('Closing dialog with data:', closeData)
  
  if (dialogRef?.value) {
    console.log('Calling dialogRef.value.close with data')
    dialogRef.value.close(closeData)
  } else {
    console.error('dialogRef.value is not available', { dialogRef })
  }
}
</script>

<style scoped>
.create-boulder-dialog {
  padding: 0;
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
}

.dialog-header {
  padding: 2rem 2rem 1.5rem 2rem;
  background: linear-gradient(135deg, #4095f2 0%, #2077d6 100%);
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
  opacity: 0.9;
}

.dialog-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: white;
}

.dialog-description {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}

.dialog-content {
  padding: 2rem;
  min-width: 360px;
  background: #ffffff;
}

.form-field {
  margin-bottom: 1.75rem;
}

.form-field:last-of-type {
  margin-bottom: 2.5rem;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
  font-size: 0.9rem;
  color: #374151;
}

.form-label-icon {
  color: #4095f2;
  font-size: 1rem;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 2px solid #f3f4f6;
}

/* Input styling */
:deep(.custom-input.p-inputtext) {
  width: 100%;
  padding: 0.875rem 1rem;
  font-size: 0.95rem;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  background: #f9fafb;
  transition: all 0.3s ease;
  font-family: 'Zalando Sans', sans-serif;
}

:deep(.custom-input.p-inputtext:hover) {
  border-color: #4095f2;
  background: #ffffff;
}

:deep(.custom-input.p-inputtext:focus) {
  outline: none;
  border-color: #4095f2;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(64, 149, 242, 0.15);
  transform: translateY(-1px);
}

/* Dropdown styling */
:deep(.custom-dropdown.p-dropdown) {
  width: 100%;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  background: #f9fafb;
  transition: all 0.3s ease;
}

:deep(.custom-dropdown.p-dropdown:hover) {
  border-color: #4095f2;
  background: #ffffff;
}

:deep(.custom-dropdown.p-dropdown.p-focus) {
  border-color: #4095f2;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(64, 149, 242, 0.15);
}

:deep(.custom-dropdown .p-dropdown-label) {
  padding: 0.875rem 1rem;
  font-size: 0.95rem;
  font-family: 'Zalando Sans', sans-serif;
}

:deep(.grade-dropdown .p-dropdown-panel) {
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  margin-top: 0.5rem;
}

:deep(.grade-dropdown .p-dropdown-panel .p-dropdown-items .p-dropdown-item) {
  padding: 0.75rem 1rem;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  font-family: 'Zalando Sans', sans-serif;
}

:deep(.grade-dropdown .p-dropdown-panel .p-dropdown-items .p-dropdown-item:hover) {
  background: #f0f9ff;
  color: #4095f2;
}

:deep(.grade-dropdown .p-dropdown-panel .p-dropdown-items .p-dropdown-item.p-highlight) {
  background: #4095f2;
  color: white;
}

:deep(.grade-dropdown .p-dropdown-panel .p-dropdown-items-wrapper) {
  max-height: 300px;
}

/* Button styling */
:deep(.action-button.p-button) {
  padding: 0.875rem 1.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 12px;
  transition: all 0.3s ease;
  font-family: 'Zalando Sans', sans-serif;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 120px;
  justify-content: center;
}

:deep(.cancel-button.p-button) {
  background: #ffffff;
  color: #6b7280;
  border: 2px solid #e5e7eb;
}

:deep(.cancel-button.p-button:hover) {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #374151;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:deep(.create-button.p-button) {
  background: linear-gradient(135deg, #4095f2 0%, #2077d6 100%);
  border: none;
  color: white;
  box-shadow: 0 4px 12px rgba(64, 149, 242, 0.3);
}

:deep(.create-button.p-button:hover:not(:disabled)) {
  background: linear-gradient(135deg, #2077d6 0%, #165ba7 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(64, 149, 242, 0.4);
}

:deep(.create-button.p-button:active:not(:disabled)) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(64, 149, 242, 0.3);
}

:deep(.create-button.p-button:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
  background: #9ca3af;
  box-shadow: none;
}

:deep(.action-button .p-button-icon) {
  font-size: 1rem;
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
  
  .dialog-description {
    font-size: 0.85rem;
  }
  
  .dialog-content {
    padding: 1.5rem;
    min-width: 300px;
  }
  
  .form-field {
    margin-bottom: 1.5rem;
  }
  
  .form-field:last-of-type {
    margin-bottom: 2rem;
  }
  
  .dialog-actions {
    flex-direction: column-reverse;
    gap: 0.75rem;
  }
  
  :deep(.action-button.p-button) {
    width: 100%;
  }
}
</style>

