<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import plywood from '@/assets/images/plywood.jpg'
const box = ref(null)
const isWide = ref(false)
const ratio = ref(1)
let observer

onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect
    ratio.value = width / height
    isWide.value = width / height > 0.75
  })
  observer.observe(box.value)
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
})
</script>
<template>
  <div
    ref="box"
    class="bg-red overflow-hidden flex items-start h-[calc(100vh-64px)] max-h-[calc(100vh-84px)] m-4 justify-center p-2 outline-green-600 outline-4"
  >
    <!-- aspect is width/height = 4/3 -> height/width = 0.75 -->

    <div
      class="bg-cover bg-center aspect-[0.75] flex items-center justify-center"
      :class="{
        'h-full max-w-full': isWide,
        'w-full max-h-full': !isWide,
      }"
    >
      <div
        class="overflow-hidden bg-white rounded-[16px] relative"
        style="box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px"
      >
        <div
          class="relative bg-cover bg-center m-[4px] rounded-[12px]"
          :style="{ backgroundImage: `url(${plywood})` }"
        >
          {{ ratio }}
          <img src="@/assets/images/wall.svg" class="w-full" />
        </div>
      </div>
    </div>
  </div>
</template>
