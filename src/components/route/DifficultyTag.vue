<script setup lang="ts">
import { defineProps } from 'vue'

const props = defineProps<{
  difficulty: string
}>()
</script>
<template>
  <div
    class="scale-80 text-xs bg-[#ED6A5A] text-[#E6EBE0] rounded-md font-medium w-[22px] h-[22px] flex justify-center items-center px-4"
  >
    <div>{{ props.difficulty }}</div>
  </div>
</template>
