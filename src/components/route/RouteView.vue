<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import plywood from '@/assets/images/plywood.jpg'
import Button from 'primevue/button'
import DifficultyTag from './DifficultyTag.vue'
import { useRouter } from 'vue-router'

const box = ref(null)
const isWide = ref(false)
const ratio = ref(1)
const visible = ref(false)
const router = useRouter()
const routesStore = useRoutesStore()

let observer
import type { Route } from '@/types/route'
import { useRoutesStore } from '@/stores/routes'
import { websocketService } from '@/services/ws.service'

const props = defineProps<{
  route: Route
}>()

onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect
    ratio.value = width / height
    isWide.value = width / height > 0.78
  })
  observer.observe(box.value)
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
})

function editRoute(path: string) {
  router.push(path)
}

function preview() {
  websocketService.send({
    type: 'preview',
    route: props.route,
  })
}

function deleteRoute() {
  routesStore.deleteRoute(props.route.id)
  visible.value = false
}

</script>
<template>
  <div ref="box" class="flex items-center justify-center relative">
    <!-- aspect is width/height = 4/3 -> height/width = 0.75 -->

    <div
      class="bg-cover bg-center aspect-[0.78] flex items-center justify-center"
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
          class="relative bg-cover bg-center m-[4px] rounded-[12px] pt-12"
          :style="{ backgroundImage: `url(${plywood})` }"
        >
          <!-- <div class="e absolute w-full h-full flex items-center justify-center pb-4">
            <button class="bg-[#4095f2] text-white text-sm rounded-lg px-4">Climb</button>
          </div> -->
          <img src="@/assets/images/wall.svg" class="w-full" />
        </div>
        <div class="absolute top-3 left-3 grid gap-1 items-center w-full">
          <div
            class="text-sm bg-white text-primary rounded-md whitespace-nowrap size-fit p-1 px-2 max-w-[80%] truncate"
          >
            {{ props.route.name }}
          </div>
          <DifficultyTag :grade="props.route.data.grade"></DifficultyTag>
        </div>
        <div class="absolute bottom-3 left-0 px-4 flex gap-2 justify-end w-full rounded-full">
          
          <button
            class="mr-auto flex justify-center items-center bg-[#ED6A5A] text-white h-[40px] w-[40px] rounded-full mt-[-10px] p-2"
            style="
              box-shadow:
                rgba(50, 50, 93, 0.25) 0px 13px 27px -5px,
                rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;
            "
            @click="editRoute('/session')"
          >
            <div class="-mt-[2px] text-primary font-light flex items-center gap-1 text-xs">
              <img
                src="@/assets/images/climber-white.svg"
                class="h-[22px] w-[22px] inline-block fill-black"
              />
            </div>
          </button>
          <button
            class="flex justify-center items-center border bg-white border-primary text-white h-[32px] w-[32px] p-2 rounded-full"
            style="
              box-shadow:
                rgba(50, 50, 93, 0.25) 0px 13px 27px -5px,
                rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;
            "
            @click="preview('/edit')"
          >
            <div class="-mt-[5px]">
              <span
                class="pi pi-eye text-primary inline-block"
                style="font-size: 13px; font-weight: 100"
              ></span>
            </div>
          </button>
          <button
            class="flex justify-center items-center border bg-white border-primary text-white h-[32px] w-[32px] p-2 rounded-full"
            style="
              box-shadow:
                rgba(50, 50, 93, 0.25) 0px 13px 27px -5px,
                rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;
            "
            @click="editRoute('/edit')"
          >
            <div class="-mt-[5px] ml-[2px]">
              <span
                class="pi pi-file-edit text-primary inline-block"
                style="font-size: 13px; font-weight: 100"
              ></span>
            </div>
          </button>
          <button
            class="flex justify-center items-center border bg-white border-primary text-white h-[32px] w-[32px] p-2 rounded-full"
            style="
              box-shadow:
                rgba(50, 50, 93, 0.25) 0px 13px 27px -5px,
                rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;
            "
            @click="preview('/edit')"
          >
            <div class="-mt-[5px]">
              <span
                class="pi pi-refresh text-primary inline-block"
                style="font-size: 13px; font-weight: 100"
              ></span>
            </div>
          </button>
          <button
            class="flex justify-center items-center border bg-white border-primary text-white h-[32px] w-[32px] p-2 rounded-full"
            style="
              box-shadow:
                rgba(50, 50, 93, 0.25) 0px 13px 27px -5px,
                rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;
            "
            @click="visible = true"
          >
            <div class="-mt-[5px]">
              <span
                class="pi pi-trash text-primary inline-block"
                style="font-size: 13px; font-weight: 100"
              ></span>
            </div>
          </button>

          <Dialog
            v-model:visible="visible"
            modal
            header="Delete route"
            :style="{ width: '25rem' }"
            class="text-sm"
          >
            <span class="text-surface-500 dark:text-surface-400 block mb-8"
              >Are you sure you want to delete this route?</span
            >

            <div class="flex justify-end gap-2">
              <Button type="button" label="Cancel" severity="secondary" @click="visible = false">
                Cancel
              </Button>
              <Button type="button" label="Delete" @click="deleteRoute()">Delete</Button>
            </div>
          </Dialog>
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="scss">
$primary-color: #000;
</style>
