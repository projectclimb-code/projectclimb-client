<template>
  <div
    class="absolute h-[100px] bottom-0 w-full p-3 text-color-[#007bff] text-sm font-medium overflow-hidden"
    style="color: var(--primarycolor, #007bff); opacity: 1"
  >
    <div
      class="bg-white w-full h-full rounded-3xl max-w-[400px] px-3 mx-auto flex items-center justify-between"
      style="
        box-shadow:
          rgba(0, 0, 0, 0.16) 0px 10px 36px 0px,
          rgba(0, 0, 0, 0.06) 0px 0px 0px 1px;
      "
    >
      <router-link to="/routes">
        <div class="menuitem" :class="route.path === '/routes' ? 'active' : ''">
          <img src="@/assets/images/path.svg" alt="Logo" height="19px" width="20px" class="icon" />
          <div class="title hidden min-[320px]:block">Boulders</div>
        </div>
      </router-link>
      <router-link to="/edit">
        <div class="menuitem" :class="route.path === '/edit' ? 'active' : ''">
          <div class="icon">
            <div class="pi pi-file-edit" color="007bffff" size="29px"></div>
          </div>
          <div class="title hidden min-[320px]:block">Edit</div>
        </div>
      </router-link>
      <router-link to="/session">
        <div class="menuitem relative" :class="route.path === '/session' ? 'active' : ''">
          <img
            src="@/assets/images/climber.svg"
            alt="Logo"
            height="20px"
            width="20px"
            class="mt-[-4px] icon"
          />
          <div class="title hidden min-[320px]:block">Climb</div>
        </div>
      </router-link>
      <router-link to="/live">
        <div class="menuitem" :class="route.path === '/live' ? 'active' : ''">
          <img
            class="icon"
            src="@/assets/images/camera.svg"
            alt="Logo"
            height="20px"
            width="20px"
          />
          <div class="title hidden min-[320px]:block sm:text-xs">Live</div>
        </div>
      </router-link>
      <router-link to="/settings">
        <div class="menuitem" :class="route.path === '/settings' ? 'active' : ''">
          <div class="icon">
            <span class="pi pi-cog"></span>
          </div>
          <div class="title hidden min-[320px]:block">Settings</div>
        </div>
      </router-link>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
</script>
<style lang="scss" scoped>
.active {
  font-weight: 600;
  transform: scale(1.3) translateY(-2px);
}

.menuitem {
  transition: transform 0.2s ease-in-out;
  height: 40px;
  display: grid;
  grid-template-rows: 30px 10px;
  font-size: 12px;
  align-items: center;
  justify-items: center;
  margin: 0 12px;
}
</style>
