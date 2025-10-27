<script setup lang="ts">
import RouteView from '@/components/route/RouteView.vue'
</script>
<template>
  <div
    class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 justify-center scroll-auto overflow-scroll h-full"
  >
    <RouteView class="m-6"></RouteView>
    <RouteView class="m-6"></RouteView>
    <RouteView class="m-6"></RouteView>
    <RouteView class="m-6"></RouteView>
    <RouteView class="m-6"></RouteView>
    <RouteView class="m-6"></RouteView>
    <RouteView class="m-6"></RouteView>
    <RouteView class="m-6"></RouteView>
    <RouteView class="m-6"></RouteView>
    <RouteView class="m-6"></RouteView>
    <RouteView class="m-6"></RouteView>
    <RouteView class="m-6"></RouteView>
    <div class="h-[150px] col-span-2"></div>
    <RouterLink to="/edit">
      <div
        class="absolute -right-1 top-20 bg-white rounded-l-full h-[60px] w-[80px] flex items-center justify-start shadow-lg pl-3"
        style="box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px"
      >
        <div
          class="rounded-full bg-[#4095f2] text-white w-[40px] h-[40px] flex flex-col items-center justify-center cursor-pointer"
        >
          <div class="text-3xl -mt-1">+</div>
        </div>
      </div>
    </RouterLink>
  </div>
</template>
