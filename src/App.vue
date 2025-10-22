<script setup lang="ts">
import BottomMenu from './components/navigation/BottomMenu.vue'
import SideMenu from './components/navigation/SideMenu.vue'
</script>

<template>
  <div class="h-[100vh] w-[100vw] overflow-hidden grid grid-rows-[50px_1fr] gap-0">
    <div
      class="w-full h-[50px]"
      style="
        box-shadow:
          rgba(0, 0, 0, 0.16) 0px 10px 36px 0px,
          rgba(0, 0, 0, 0.06) 0px 0px 0px 1px;
      "
    >
      <SideMenu></SideMenu>
    </div>
    <div class="w-full bg-red overflow-scroll mb-[-20px]">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
    <BottomMenu></BottomMenu>
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
