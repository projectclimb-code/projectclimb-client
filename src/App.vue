<script setup lang="ts">
import { onMounted } from 'vue'
import BottomMenu from './components/navigation/BottomMenu.vue'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import DynamicDialog from 'primevue/dynamicdialog'
// import SideMenu from './components/navigation/SideMenu.vue'

onMounted(() => {
  document.title = 'ProjectClimb'
})
</script>

<template>
  <div class="h-[100vh] w-[100vw] overflow-hidden grid grid-rows-[1fr_auto] gap-0">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    <BottomMenu />
    <Toast />
    <ConfirmDialog />
    <DynamicDialog />
  </div>  
</template>

<style lang="scss">
body {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  font-size: 22px;
  font-weight: 300;
  font-family: 'Zalando Sans', sans-serif;
  -webkit-touch-callout: none; /* iOS Safari */
  -webkit-user-select: none; /* Safari */
  -khtml-user-select: none; /* Konqueror HTML */
  -moz-user-select: none; /* Old versions of Firefox */
  -ms-user-select: none; /* Internet Explorer/Edge */
  user-select: none; /* Non-prefixed version, currently */
}

$primary-color: #4095f2;
$secondary-color: #ed6a5a;
//#FE4A49
//#FED766
//#E6E6EA
//#F4F4F8

//#ED6A5A
//#F4F1BB
//#5D576B
//#E6EBE0

.fade-enter-active,
.fade-leave-active {
  transition:
    transform 100ms ease-out,
    opacity 100ms ease-in;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition:
    transform 300ms ease-out,
    opacity 300ms ease-in;
  position: relative;
}
.slide-left-enter-from {
  transform: translateX(-100vw);
  opacity: 1;
}
.slide-left-enter-to {
  transform: translateX(0);
  opacity: 1;
}
.slide-left-leave-from {
  transform: translateX(0);
  opacity: 1;
}
.slide-left-leave-to {
  transform: translateX(-100vw);
  opacity: 1;
}

/* slide-right (mirror) */
.slide-right-enter-active,
.slide-right-leave-active {
  transition:
    transform 300ms ease-out,
    opacity 300ms ease-in;
  position: relative;
}
.slide-right-enter-from {
  transform: translateX(100vw);
  opacity: 1;
}
.slide-right-enter-to {
  transform: translateX(0);
  opacity: 1;
}
.slide-right-leave-from {
  transform: translateX(0);
  opacity: 1;
}
.slide-right-leave-to {
  transform: translateX(100vw);
  opacity: 1;
}
</style>
