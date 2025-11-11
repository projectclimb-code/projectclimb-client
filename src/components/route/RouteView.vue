<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, onActivated, watch } from 'vue'
import plywood from '@/assets/images/plywood.jpg'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import DifficultyTag from './DifficultyTag.vue'
import { useRouter } from 'vue-router'
import { loadWallSvg, scaleLayer } from '@/wall/wall'
import { HoldType } from '@/interfaces/interfaces'

const box = ref<HTMLElement | null>(null)
const innerbox = ref<HTMLElement | null>(null)
const isWide = ref(false)
const ratio = ref(1)
const visible = ref(false)
const router = useRouter()
const routesStore = useRoutesStore()

const configKonva = ref({
  width: 200,
  height: 200,
})
const stage = ref<any>(null)
const mainLayer = ref<any>(null)

let observer: ResizeObserver | null = null
import type { Route } from '@/interfaces/interfaces'
import { useRoutesStore } from '@/stores/routes'
import { websocketService } from '@/services/ws.service'

const props = defineProps<{
  route: Route
}>()

onMounted(async () => {
  await nextTick()
  
  if (box.value) {
    observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          ratio.value = width / height
          isWide.value = width / height > 0.78
        }
      }
      // Update Konva stage size
      if (innerbox.value && stage.value) {
        updateKonvaSize()
      }
    })
    observer.observe(box.value)
    if (innerbox.value) {
      observer.observe(innerbox.value)
    }
    
    // Force initial calculation
    nextTick(() => {
      if (box.value) {
        const rect = box.value.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          ratio.value = rect.width / rect.height
          isWide.value = rect.width / rect.height > 0.78
        }
      }
    })
  }
  
  // Initialize Konva after a short delay to ensure DOM is ready
  setTimeout(() => {
    if (stage.value) {
      initKonva()
    }
  }, 100)
})

onActivated(async () => {
  await nextTick()
  if (box.value && observer) {
    // Re-observe after navigation
    const rect = box.value.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      ratio.value = rect.width / rect.height
      isWide.value = rect.width / rect.height > 0.78
    }
  }
  // Re-initialize Konva if needed
  if (stage.value && !mainLayer.value) {
    setTimeout(() => {
      initKonva()
    }, 100)
  } else if (mainLayer.value) {
    updatePathColors()
  }
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
})

function editRoute(path: string) {
  router.push({ path, query: { id: props.route.id } })
}

function preview() {
  websocketService.send({
    type: 'preview',
    route: props.route,
  })
}

function deleteRoute() {
  if (props.route.id) {
    routesStore.deleteRoute(props.route.id)
    visible.value = false
  }
}

function updateKonvaSize() {
  if (!innerbox.value || !stage.value) return
  
  const container = innerbox.value as HTMLElement
  const containerWidth = container.clientWidth
  const containerHeight = container.clientHeight
  
  if (containerWidth > 0 && containerHeight > 0) {
    configKonva.value.width = containerWidth
    configKonva.value.height = containerHeight
    
    if (mainLayer.value) {
      const konvaStage = stage.value.getNode()
      scaleLayer(mainLayer.value, konvaStage)
      konvaStage.draw()
    }
  }
}

function updatePathColors() {
  if (!mainLayer.value || !stage.value) return
  
  const konvaStage = stage.value.getNode()
  const children = mainLayer.value.children
  if (!children) return
  
  // Extract hold IDs from route data
  const routeHolds = props.route.data?.problem?.holds || []
  const startHolds = routeHolds.filter(h => h.type === HoldType.start).map(h => h.id)
  const endHolds = routeHolds.filter(h => h.type === HoldType.finish).map(h => h.id)
  const normalHolds = routeHolds.filter(h => h.type === HoldType.normal).map(h => h.id)
  
  children.forEach((node: any) => {
    const pathId = node.id()
    const isStart = startHolds.includes(pathId)
    const isEnd = endHolds.includes(pathId)
    const isNormal = normalHolds.includes(pathId)
    
    if (isStart) {
      node.fill('green')
      node.opacity(1)
    } else if (isEnd) {
      node.fill('red')
      node.opacity(1)
    } else if (isNormal) {
      node.fill('white')
      node.opacity(1)
    } else {
      node.fill('white')
      node.opacity(0.3)
    }
  })
  
  konvaStage.draw()
}

async function initKonva() {
  if (!stage.value) return
  
  const konvaStage = stage.value.getNode()
  
  // Load wall SVG without click handlers (read-only)
  mainLayer.value = await loadWallSvg(undefined, [], null)
  
  // Remove all event listeners to make it read-only
  const children = mainLayer.value.children
  if (children) {
    children.forEach((node: any) => {
      node.off('tap')
      node.off('click')
      node.listening(false)
    })
  }
  
  updateKonvaSize()
  scaleLayer(mainLayer.value, konvaStage)
  konvaStage.add(mainLayer.value)
  updatePathColors()
  konvaStage.draw()
}

// Watch for route changes to update colors
watch(() => props.route.data?.problem?.holds, () => {
  if (mainLayer.value) {
    updatePathColors()
  }
}, { deep: true })

</script>
<template>
  <div ref="box" class="flex items-center justify-center relative w-full h-full min-h-0">
    <!-- aspect is width/height = 4/3 -> height/width = 0.75 -->

    <div
      class="bg-cover bg-center aspect-[0.78] flex items-center justify-center"
      :class="{
        'h-full max-w-full': isWide,
        'w-full max-h-full': !isWide,
      }"
      style="min-width: 0; min-height: 0;"
    >
      <div
        class="overflow-hidden bg-white rounded-[16px] relative route-card"
        style="box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px; position: relative; width: 100%; height: 100%;"
      >
        <div
          ref="innerbox"
          class="relative bg-cover bg-center m-[4px] rounded-[12px] flex items-center justify-center overflow-hidden"
          :style="{ backgroundImage: `url(${plywood})`, minHeight: 0, position: 'relative', width: '100%', height: '100%' }"
        >
          <v-stage
            ref="stage"
            :config="configKonva"
            class="touch-none"
            style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;"
          ></v-stage>
        </div>
        <div class="absolute top-2 left-2 right-2 flex items-center gap-2 z-10 pointer-events-none">
          <div
            class="text-xs sm:text-sm bg-white text-primary rounded-md whitespace-nowrap size-fit p-1 px-2 truncate flex-shrink"
            style="max-width: calc(100% - 80px);"
          >
            {{ props.route.name }}
          </div>
          <DifficultyTag :grade="props.route.data.grade" class="flex-shrink-0"></DifficultyTag>
        </div>
        <div class="absolute bottom-2 left-2 right-2 px-2 flex gap-1.5 justify-end items-center z-10">
          
          <button
            class="mr-auto flex justify-center items-center bg-[#ED6A5A] text-white h-[36px] w-[36px] sm:h-[40px] sm:w-[40px] rounded-full p-2 flex-shrink-0 pointer-events-auto"
            style="
              box-shadow:
                rgba(50, 50, 93, 0.25) 0px 13px 27px -5px,
                rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;
            "
            @click="editRoute('/session')"
          >
            <div class="text-primary font-light flex items-center gap-1 text-xs">
              <img
                src="@/assets/images/climber-white.svg"
                class="h-[18px] w-[18px] sm:h-[22px] sm:w-[22px] inline-block fill-black"
              />
            </div>
          </button>
          <button
            class="flex justify-center items-center border bg-white border-primary text-white h-[28px] w-[28px] sm:h-[32px] sm:w-[32px] p-1.5 sm:p-2 rounded-full flex-shrink-0 pointer-events-auto"
            style="
              box-shadow:
                rgba(50, 50, 93, 0.25) 0px 13px 27px -5px,
                rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;
            "
            @click="preview()"
          >
            <span
              class="pi pi-eye text-primary inline-block"
              style="font-size: 11px; font-weight: 100"
            ></span>
          </button>
          <button
            class="flex justify-center items-center border bg-white border-primary text-white h-[28px] w-[28px] sm:h-[32px] sm:w-[32px] p-1.5 sm:p-2 rounded-full flex-shrink-0 pointer-events-auto"
            style="
              box-shadow:
                rgba(50, 50, 93, 0.25) 0px 13px 27px -5px,
                rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;
            "
            @click="editRoute('/edit')"
          >
            <span
              class="pi pi-file-edit text-primary inline-block"
              style="font-size: 11px; font-weight: 100"
            ></span>
          </button>
          <button
            class="flex justify-center items-center border bg-white border-primary text-white h-[28px] w-[28px] sm:h-[32px] sm:w-[32px] p-1.5 sm:p-2 rounded-full flex-shrink-0 pointer-events-auto"
            style="
              box-shadow:
                rgba(50, 50, 93, 0.25) 0px 13px 27px -5px,
                rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;
            "
            @click="preview()"
          >
            <span
              class="pi pi-arrow-right-arrow-left text-primary inline-block"
              style="font-size: 11px; font-weight: 100"
            ></span>
          </button>
          <button
            class="flex justify-center items-center border bg-white border-primary text-white h-[28px] w-[28px] sm:h-[32px] sm:w-[32px] p-1.5 sm:p-2 rounded-full flex-shrink-0 pointer-events-auto"
            style="
              box-shadow:
                rgba(50, 50, 93, 0.25) 0px 13px 27px -5px,
                rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;
            "
            @click="visible = true"
          >
            <span
              class="pi pi-trash text-primary inline-block"
              style="font-size: 11px; font-weight: 100"
            ></span>
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

.route-card {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.route-card > div:first-child {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.route-card img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

</style>
