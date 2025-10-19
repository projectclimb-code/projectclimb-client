<script setup lang="ts">
import Dock from 'primevue/dock'
const items = [
  {
    label: 'Home',
    icon: 'https://primefaces.org/cdn/primevue/images/home.svg',
    command: () => {
      window.location.href = 'https://primefaces.org/primevue'
    },
  },
  {
    label: 'Calendar',
    icon: 'https://primefaces.org/cdn/primevue/images/calendar.svg',
  },
  {
    label: 'Messages',
    icon: 'https://primefaces.org/cdn/primevue/images/messages.svg',
  },
  {
    label: 'Settings',
    icon: 'pi pi-user',
  },
]
</script>

<template>
  <Dock :model="items" position="bottom">
    <template #itemicon="{ item }">
      <i :class="item.icon" style="color: #000000"></i>
    </template>
  </Dock>
</template>

<style scoped></style>
