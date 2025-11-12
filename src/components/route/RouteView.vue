<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, onActivated, watch } from 'vue'
import plywood from '@/assets/images/plywood.jpg'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import DifficultyTag from './DifficultyTag.vue'
import { useRouter } from 'vue-router'
import { loadWallSvg, scaleLayer } from '@/wall/wall'
import { HoldType } from '@/interfaces/interfaces'
import { useToast } from 'primevue/usetoast'

const box = ref<HTMLElement | null>(null)
const innerbox = ref<HTMLElement | null>(null)
const isWide = ref(false)
const ratio = ref(1)
const visible = ref(false)
const isHighlighted = ref(false)
const router = useRouter()
const routesStore = useRoutesStore()
const toast = useToast()

const configKonva = ref({
  width: 200,
  height: 200,
})
const stage = ref<any>(null)
const mainLayer = ref<any>(null)

let observer: ResizeObserver | null = null
let flipToastTimeout: ReturnType<typeof setTimeout> | null = null
import type { Route } from '@/interfaces/interfaces'
import { useRoutesStore } from '@/stores/routes'

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
  // Add highlight effect
  isHighlighted.value = true
  setTimeout(() => {
    isHighlighted.value = false
  }, 300)
  
  if (props.route.id) {
    router.push({ path: '/session', query: { id: props.route.id } })
  }
}

function deleteRoute() {
  if (props.route.id) {
    routesStore.deleteRoute(props.route.id)
    visible.value = false
  }
}

function flipId(id: string): string {
  const numId = parseInt(id, 10)
  
  if (isNaN(numId)) {
    return id
  }
  
  if (numId >= 0 && numId < 100) {
    return String(numId + 100)
  } else if (numId >= 100 && numId < 200) {
    return String(numId - 100)
  } else {
    return id
  }
}

async function flipRoute() {
  if (!props.route.id || !props.route.data?.problem?.holds) {
    return
  }
  
  const flippedHolds = props.route.data.problem.holds.map(hold => ({
    ...hold,
    id: flipId(hold.id)
  }))
  
  const flippedRoute: Route = {
    ...props.route,
    data: {
      ...props.route.data,
      problem: {
        ...props.route.data.problem,
        holds: flippedHolds
      }
    }
  }
  
  try {
    await routesStore.saveRoute(flippedRoute)
    updatePathColors()
    
    // Clear any pending toast notification
    if (flipToastTimeout) {
      clearTimeout(flipToastTimeout)
    }
    
    // Debounce the toast notification
    flipToastTimeout = setTimeout(() => {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Route flipped successfully',
        life: 3000,
        group: 'flip'
      })
      flipToastTimeout = null
    }, 300)
  } catch (error) {
    console.error('Failed to flip route:', error)
    
    // Clear any pending toast notification
    if (flipToastTimeout) {
      clearTimeout(flipToastTimeout)
    }
    
    // Show error immediately (no debounce for errors)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to flip route',
      life: 3000,
      group: 'flip'
    })
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
      node.strokeWidth(13)
    } else if (isEnd) {
      node.fill('red')
      node.opacity(1)
      node.strokeWidth(13)
    } else if (isNormal) {
      node.fill('white')
      node.opacity(1)
      node.strokeWidth(13)
    } else {
      node.fill('white')
      node.opacity(0.6)
      node.strokeWidth(5)
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
  <div ref="box" class="flex items-center justify-center relative w-full h-full min-h-0" style="width: 100%; height: 100%;">
    <!-- aspect is width/height = 4/3 -> height/width = 0.75 -->

    <div
      class="bg-cover bg-center flex items-center justify-center"
      style="min-width: 0; min-height: 0; width: 100%; height: 100%;"
    >
      <div
        class="overflow-hidden bg-white rounded-[16px] relative route-card cursor-pointer"
        :class="{ 'route-card-highlighted': isHighlighted }"
        style="box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px; position: relative; width: 97%; height: 100%;"
        @click="preview()"
      >
        <div
          ref="innerbox"
          class="relative bg-cover bg-center m-[4px] rounded-[12px] flex items-center justify-center overflow-hidden pointer-events-none"
          :style="{ backgroundImage: `url(${plywood})`, minHeight: 0, position: 'relative', width: '97%', height: '100%' }"
        >
          <v-stage
            ref="stage"
            :config="configKonva"
            class="touch-none"
            style="width: 100%; height: 100%; position: absolute; top: 5%; left: 0; pointer-events: none;"
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
        <div class="absolute bottom-2 left-2 right-2 flex justify-between items-center z-10 pointer-events-none">
          
          <button
            class="flex justify-center items-center bg-[#ED6A5A] text-white h-[36px] w-[36px] sm:h-[40px] sm:w-[40px] rounded-full p-2 flex-shrink-0 pointer-events-auto"
            style="
              box-shadow:
                rgba(50, 50, 93, 0.25) 0px 13px 27px -5px,
                rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;
            "
            @click.stop="editRoute('/session')"
          >
            <div class="text-primary font-light flex items-center gap-1 text-xs">
              <img
                src="@/assets/images/climber-white.svg"
                class="h-[18px] w-[18px] sm:h-[22px] sm:w-[22px] inline-block fill-black"
              />
            </div>
          </button>
          <div class="flex items-center pointer-events-none" style="gap: 4%; margin-right: 0.5rem;">
            <button
              class="flex justify-center items-center border bg-white border-primary text-white h-[28px] w-[28px] sm:h-[32px] sm:w-[32px] p-1.5 sm:p-2 rounded-full flex-shrink-0 pointer-events-auto"
              style="
                box-shadow:
                  rgba(50, 50, 93, 0.25) 0px 13px 27px -5px,
                  rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;
              "
              @click.stop="editRoute('/edit')"
            >
              <span
                class="pi pi-pencil text-primary inline-block"
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
              @click.stop="flipRoute()"
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
              @click.stop="visible = true"
            >
              <span
                class="pi pi-trash text-primary inline-block"
                style="font-size: 11px; font-weight: 100"
              ></span>
            </button>
          </div>

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
  width: 97%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 0 auto;
  transition: all 0.3s ease;
}

.route-card-highlighted {
  box-shadow: rgba(64, 149, 242, 0.6) 0px 5px 25px !important;
  transform: scale(0.98);
  background-color: rgba(64, 149, 242, 0.05) !important;
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

@media (max-width: 640px) {
  .route-card > div:first-child {
    padding-top: 5%;
  }
}

</style>
