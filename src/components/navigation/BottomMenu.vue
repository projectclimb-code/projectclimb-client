<template>
  <div
    class="absolute bottom-0 w-full text-color-[#007bff] text-sm font-medium overflow-hidden bottom-menu-container"
    style="color: var(--primarycolor, #007bff); opacity: 1"
  >
    <div
      class="bg-white w-full h-full rounded-3xl px-3 mx-auto flex items-center justify-between bottom-menu-inner"
      style="
        box-shadow:
          rgba(0, 0, 0, 0.16) 0px 10px 36px 0px,
          rgba(0, 0, 0, 0.06) 0px 0px 0px 1px;
      "
    >
      <router-link to="/routes">
        <div class="menuitem" :class="route.path === '/routes' ? 'active' : ''">
          <img src="@/assets/images/path.svg" alt="Logo" class="icon icon-image" />
          <div class="title hidden min-[320px]:block">Boulders</div>
        </div>
      </router-link>
      <router-link to="/edit">
        <div class="menuitem" :class="route.path === '/edit' ? 'active' : ''">
          <div class="icon icon-pi">
            <div class="pi pi-file-edit"></div>
          </div>
          <div class="title hidden min-[320px]:block">Edit</div>
        </div>
      </router-link>
      <router-link to="/session">
        <div class="menuitem relative" :class="route.path === '/session' ? 'active' : ''">
          <img
            src="@/assets/images/climber.svg"
            alt="Logo"
            class="mt-[-4px] icon icon-image"
          />
          <div class="title hidden min-[320px]:block">Climb</div>
        </div>
      </router-link>
      <router-link to="/live">
        <div class="menuitem" :class="route.path === '/live' ? 'active' : ''">
          <img
            class="icon icon-image"
            src="@/assets/images/camera.svg"
            alt="Logo"
          />
          <div class="title hidden min-[320px]:block sm:text-xs">Live</div>
        </div>
      </router-link>
      <router-link to="/settings">
        <div class="menuitem" :class="route.path === '/settings' ? 'active' : ''">
          <div class="icon icon-pi">
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
.bottom-menu-container {
  height: 100px;
  padding: 12px;
  z-index: 1000;
}

.bottom-menu-inner {
  width: 90vw;
  min-width: 300px;
  height: 76px;
}

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

.icon-image {
  height: 20px;
  width: 20px;
  object-fit: contain;
}

.icon-pi {
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.icon-pi .pi,
.icon-pi span,
.icon-pi div {
  font-size: 20px;
  line-height: 1;
}

@media (min-width: 641px) and (max-width: 1024px) {
  .bottom-menu-container {
    height: 140px;
    padding: 16px;
  }

  .bottom-menu-inner {
    width: 40vw;
    min-width: 400px;
    height: 108px;
    padding: 0 24px;
    justify-content: space-between;
  }

  .menuitem {
    height: 60px;
    grid-template-rows: 45px 15px;
    font-size: 16px;
    margin: 0;
    flex-shrink: 0;
  }

  .bottom-menu-inner a {
    display: flex;
    justify-content: center;
    flex-shrink: 0;
  }

  .icon-image {
    height: 32px;
    width: 32px;
    object-fit: contain;
  }

  .icon-pi {
    font-size: 32px;
    width: 32px;
    height: 32px;
  }

  .icon-pi .pi,
  .icon-pi span,
  .icon-pi div {
    font-size: 32px;
    line-height: 1;
  }

  .active {
    transform: scale(1.25) translateY(-4px);
  }
}

@media (min-width: 1025px) {
  .bottom-menu-container {
    height: 120px;
    padding: 14px;
  }

  .bottom-menu-inner {
    width: 34vw;
    height: 92px;
    padding: 0 24px;
    justify-content: space-between;
  }

  .menuitem {
    height: 50px;
    grid-template-rows: 38px 12px;
    font-size: 14px;
    margin: 0;
    flex-shrink: 0;
  }

  .bottom-menu-inner a {
    display: flex;
    justify-content: center;
    flex-shrink: 0;
  }

  .icon-image {
    height: 24px;
    width: 24px;
    object-fit: contain;
  }

  .icon-pi {
    font-size: 24px;
    width: 24px;
    height: 24px;
  }

  .icon-pi .pi,
  .icon-pi span,
  .icon-pi div {
    font-size: 24px;
    line-height: 1;
  }

  .active {
    transform: scale(1.25) translateY(-3px);
  }
}
</style>
