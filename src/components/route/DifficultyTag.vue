<script setup lang="ts">
import { defineProps } from 'vue'

const props = defineProps<{
  grade: string
}>()
</script>
<template>
  <div
    class="scale-80 text-xs bg-[#5D576B] text-white rounded-md font-medium w-[22px] h-[22px] flex justify-center items-center px-4"
  >
    <div>{{ props.grade }}</div>
  </div>
</template>
