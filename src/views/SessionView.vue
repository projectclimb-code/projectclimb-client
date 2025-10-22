<script setup lang="ts">
import RouteView from '@/components/route/RouteView.vue'
</script>
<template>
  <div
    class="grid grid-cols-2 sm:grid-cols-3 items-center justify-center p-4 lg:p-8 scroll-auto overflow-scroll h-full gap-4 lg:gap-16"
  >
    <RouteView></RouteView>
    <RouteView></RouteView>
    <RouteView></RouteView>
    <RouteView></RouteView>
    <RouteView></RouteView>
    <RouteView></RouteView>
    <RouteView></RouteView>
    <RouteView></RouteView>
    <RouteView></RouteView>
    <div class="h-[100px] col-span-2"></div>
  </div>
</template>
