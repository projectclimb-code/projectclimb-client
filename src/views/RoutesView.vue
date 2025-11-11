<script setup lang="ts">
import { ref, computed, onMounted, onActivated, nextTick, watch } from 'vue'
import RouteView from '@/components/route/RouteView.vue'
import { useRoutesStore } from '@/stores/routes'
import { useRouter, useRoute } from 'vue-router'
import { useDialog } from 'primevue/usedialog'
import CreateBoulderDialog from '@/components/route/CreateBoulderDialog.vue'
import Dropdown from 'primevue/dropdown'
import { ClimbingRouteGrade } from '@/interfaces/interfaces'

const routesStore = useRoutesStore()
const router = useRouter()
const route = useRoute()
const dialog = useDialog()

const selectedGrade = ref<ClimbingRouteGrade | null>(null)

const gradeOptions = [
  { label: 'All Grades', value: null },
  ...Object.values(ClimbingRouteGrade).map((grade) => ({
    label: grade,
    value: grade,
  })),
]

const filteredRoutes = computed(() => {
  if (!selectedGrade.value) {
    return routesStore.routes
  }
  return routesStore.routes.filter((r) => r.data?.grade === selectedGrade.value)
})

onMounted(() => {
  routesStore.getRoutes()
})

onActivated(async () => {
  await routesStore.getRoutes()
  await nextTick()
  // Force resize event to trigger ResizeObserver in RouteView components
  window.dispatchEvent(new Event('resize'))
})

// Watch for route changes to handle navigation when component is not kept alive
watch(() => route.path, async (newPath) => {
  if (newPath === '/routes') {
    await routesStore.getRoutes()
    await nextTick()
    // Force resize event to trigger ResizeObserver in RouteView components
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 100)
  }
}, { immediate: false })

function createRoute() {
  dialog.open(CreateBoulderDialog, {
    props: {
      header: '',
      style: { width: '90vw', maxWidth: '420px' },
      modal: true,
      dismissableMask: true,
      closable: false,
      closeOnEscape: true,
    },
    onClose: async (result) => {
      console.log('Dialog onClose called with result:', result)
      const data = result?.data
      if (data && data.name && data.grade && data.author) {
        console.log('Creating route with:', { name: data.name, grade: data.grade, author: data.author })
        try {
          const newRoute = await routesStore.createRoute(data.name, data.grade, data.author)
          console.log('Route created:', newRoute)
          routesStore.getRoutes()
          if (newRoute && newRoute.id) {
            router.push(`/edit?id=${newRoute.id}`)
          }
        } catch (error) {
          console.error('Failed to create route:', error)
        }
      } else {
        console.warn('Dialog closed without valid data:', result)
      }
    },
  })
}
</script>
<template>
  <div class="relative h-full overflow-x-hidden overflow-y-auto routes-view-container">
    <div class="filter-container">
      <div class="filter-wrapper">
        <span class="p-input-icon-right">
          <i class="pi pi-filter" />
          <Dropdown
            v-model="selectedGrade"
            :options="gradeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Filter by Grade"
            class="grade-filter-dropdown"
          />
        </span>
      </div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6 pb-[120px]">
      <RouteView 
        v-for="route in filteredRoutes" 
        :key="route.id" 
        class="w-full route-view-item" 
        :route="route"
      ></RouteView>
    </div>
    <div v-if="filteredRoutes.length === 0" class="empty-state">
      <i class="pi pi-inbox empty-icon"></i>
      <p class="empty-message">No routes found</p>
      <p class="empty-submessage" v-if="selectedGrade">
        Try selecting a different grade or clear the filter
      </p>
    </div>
  </div>
</template>

<style scoped>
.routes-view-container {
  min-height: 0;
}

.filter-container {
  padding: 1.5rem 1.5rem 0 1.5rem;
  display: flex;
  justify-content: flex-end;
}

.filter-wrapper {
  display: flex;
  align-items: center;
}

.p-input-icon-right {
  position: relative;
  display: inline-block;
}

.p-input-icon-right i {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  pointer-events: none;
  z-index: 1;
}

.grade-filter-dropdown {
  min-width: 200px;
}

.route-view-item {
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: stretch;
}

.route-view-item > * {
  width: 100%;
  min-width: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: #6b7280;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-message {
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.5rem 0;
}

.empty-submessage {
  font-size: 0.95rem;
  color: #6b7280;
  margin: 0;
}

/* Dropdown styling */
:deep(.grade-filter-dropdown .p-dropdown) {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:deep(.grade-filter-dropdown .p-dropdown-label) {
  padding-right: 2.5rem;
}

:deep(.grade-filter-dropdown .p-dropdown-panel) {
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

@media (max-width: 1024px) {
  .grade-filter-dropdown {
    min-width: 180px;
  }
}

@media (max-width: 640px) {
  .filter-container {
    padding: 1rem 1rem 0 1rem;
  }

  .grade-filter-dropdown {
    min-width: 160px;
  }

  .empty-state {
    padding: 3rem 1.5rem;
  }

  .empty-icon {
    font-size: 3rem;
  }

  .empty-message {
    font-size: 1.1rem;
  }
}
</style>
