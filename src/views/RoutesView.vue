<script setup lang="ts">
import RouteView from '@/components/route/RouteView.vue'
import { useRoutesStore } from '@/stores/routes'
import { onMounted } from 'vue'

const routesStore = useRoutesStore()
onMounted(() => {
  routesStore.getRoutes()
})

async function createRoute() {
  routesStore.createRoute()
  routesStore.getRoutes()
}
</script>
<template>
  <div class="relative h-full overflow-x-hidden overflow-y-auto">
    <div
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6 pb-[120px] auto-rows-fr"
    >
      <RouteView 
        v-for="route in routesStore.routes" 
        :key="route.id" 
        class="w-full h-full min-h-0" 
        :route="route"
      ></RouteView>
    </div>

    <div
      @click="createRoute"
      class="fixed right-0 top-10 bg-white rounded-l-full h-[60px] w-[80px] flex items-center justify-start shadow-lg pl-3 z-10"
      style="box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px"
    >
      <div
        class="rounded-full bg-[#4095f2] text-white w-[40px] h-[40px] flex flex-col items-center justify-center cursor-pointer"
      >
        <div class="text-3xl -mt-1">+</div>
      </div>
    </div>
  </div>
</template>

