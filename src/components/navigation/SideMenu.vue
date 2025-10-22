<template>
  <div class="h-full">
    <!-- Burger button -->
    <div class="flex h-full items-center justify-between w-full p-2">
      <Button
        icon="pi pi-bars"
        class="p-button-text p-button-rounded"
        @click="sidebarVisible = true"
        style="color: var(--primarycolor, #007bff); opacity: 1"
        aria-label="Open sidebar"
      ></Button>
      <img
        src="@/assets/images/logo_icon.png"
        alt="Logo"
        class="inline-block mt-[2px] mr-3"
        style="height: 24px"
      />
    </div>
    <!-- Sidebar (slide-out) -->
    <Sidebar
      v-model:visible="sidebarVisible"
      position="left"
      class="w-64 color: var(--primarycolor, #007bff)"
      :dismissable="true"
      :showCloseIcon="false"
    >
      <div>
        <span
          class="pi pi-times mx-4"
          style="color: var(--primarycolor, #007bff); opacity: 0.6"
          @click="sidebarVisible = false"
        ></span>
      </div>
      <!-- Use PrimeVue Menu component inside the sidebar -->
      <div class="p-4" style="color: var(--primarycolor, #007bff); opacity: 0.6">
        <div>
          <span class="pi pi-home mr-2"></span>
          <router-link to="/" @click="sidebarVisible = false">Home</router-link>
        </div>
        <div>
          <span class="pi pi-cog mr-2"></span>
          <router-link to="/settings" @click="sidebarVisible = false">Settings</router-link>
        </div>
      </div>
    </Sidebar>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const sidebarVisible = ref(false)
</script>

<style scoped>
/* you can override styling if desired */
</style>
