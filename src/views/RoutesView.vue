<script setup lang="ts">
import RouteView from '@/components/route/RouteView.vue'
import { useRoutesStore } from '@/stores/routes'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDialog } from 'primevue/usedialog'
import CreateBoulderDialog from '@/components/route/CreateBoulderDialog.vue'

const routesStore = useRoutesStore()
const router = useRouter()
const dialog = useDialog()

onMounted(() => {
  routesStore.getRoutes()
})

function createRoute() {
  dialog.open(CreateBoulderDialog, {
    props: {
      header: '',
      width: '90vw',
      style: { maxWidth: '420px' },
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
  <div class="relative h-full overflow-x-hidden overflow-y-auto">
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6 pb-[120px]">
      <RouteView 
        v-for="route in routesStore.routes" 
        :key="route.id" 
        class="w-full" 
        :route="route"
      ></RouteView>
    </div>

  </div>
</template>
