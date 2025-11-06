<template>
  <div class="create-boulder-dialog">
    <div class="dialog-header">
      <h3 class="dialog-title">Create New Boulder</h3>
      <p class="dialog-description">Enter a name and select a grade for your new boulder route.</p>
    </div>
    <div class="dialog-content">
      <div class="form-field">
        <label for="boulderName" class="form-label">Boulder Name</label>
        <InputText
          id="boulderName"
          v-model="boulderName"
          placeholder="Enter boulder name"
          class="w-full"
          autofocus
          @keyup.enter="handleCreate"
        />
      </div>
      <div class="form-field">
        <label for="boulderGrade" class="form-label">Grade</label>
        <Dropdown
          id="boulderGrade"
          v-model="selectedGrade"
          :options="gradeOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select a grade"
          class="w-full grade-dropdown"
        />
      </div>
      <div class="dialog-actions">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          @click="handleCancel"
        />
        <Button
          label="Create"
          type="button"
          :disabled="!boulderName || !selectedGrade"
          @click="handleCreate"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Button from 'primevue/button'
import { ClimbingRouteGrade } from '@/interfaces/interfaces'

const dialogRef = inject<any>('dialogRef')

const boulderName = ref('')
const selectedGrade = ref<ClimbingRouteGrade | null>(null)

const gradeOptions = Object.values(ClimbingRouteGrade).map((grade) => ({
  label: grade,
  value: grade,
}))

function handleCancel() {
  if (dialogRef?.value) {
    dialogRef.value.close()
  }
}

function handleCreate() {
  console.log('handleCreate called', { 
    boulderName: boulderName.value, 
    selectedGrade: selectedGrade.value,
    dialogRef: dialogRef
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
}

.dialog-header {
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.dialog-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.dialog-description {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
}

.dialog-content {
  padding: 1.5rem;
  min-width: 320px;
}

.form-field {
  margin-bottom: 1.5rem;
}

.form-field:last-of-type {
  margin-bottom: 2rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  color: #374151;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

:deep(.p-inputtext) {
  width: 100%;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  border-radius: 0.375rem;
  border: 1px solid #d1d5db;
  transition: all 0.2s;
}

:deep(.p-inputtext:focus) {
  outline: none;
  border-color: #4095f2;
  box-shadow: 0 0 0 3px rgba(64, 149, 242, 0.1);
}

:deep(.p-dropdown) {
  width: 100%;
}

:deep(.p-dropdown .p-dropdown-label) {
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
}

:deep(.grade-dropdown .p-dropdown-panel .p-dropdown-items .p-dropdown-item) {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
}

:deep(.grade-dropdown .p-dropdown-panel .p-dropdown-items-wrapper) {
  max-height: 300px;
}

:deep(.grade-dropdown .p-dropdown-panel) {
  font-size: 0.75rem;
}

:deep(.p-button) {
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.375rem;
  transition: all 0.2s;
}

:deep(.p-button:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}


@media (max-width: 640px) {
  .dialog-header {
    padding: 1.25rem 1.25rem 0.875rem 1.25rem;
  }
  
  .dialog-title {
    font-size: 1.125rem;
  }
  
  .dialog-description {
    font-size: 0.8125rem;
  }
  
  .dialog-content {
    padding: 1.25rem;
    min-width: 280px;
  }
  
  .form-field {
    margin-bottom: 1.25rem;
  }
  
  .form-field:last-of-type {
    margin-bottom: 1.75rem;
  }
}
</style>

