<script setup lang="ts">
import RouteView from '@/components/route/RouteView.vue'
import { useRoutesStore } from '@/stores/routes'
import { onMounted, onActivated, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useDialog } from 'primevue/usedialog'
import CreateBoulderDialog from '@/components/route/CreateBoulderDialog.vue'

const routesStore = useRoutesStore()
const router = useRouter()
const route = useRoute()
const dialog = useDialog()

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
      if (data && data.name && data.grade) {
        console.log('Creating route with:', { name: data.name, grade: data.grade })
        try {
          const newRoute = await routesStore.createRoute(data.name, data.grade)
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
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6 pb-[120px]">
      <RouteView 
        v-for="route in routesStore.routes" 
        :key="route.id" 
        class="w-full route-view-item" 
        :route="route"
      ></RouteView>
    </div>
  </div>
</template>

<style scoped>
.routes-view-container {
  min-height: 0;
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
</style>
