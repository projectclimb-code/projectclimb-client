<template>
  <div class="absolute bottom-0 w-full overflow-hidden bottom-menu-container">
    <div
      class="bg-white h-full rounded-3xl mx-auto flex items-center justify-center bottom-menu-inner"
    >
      <router-link to="/routes">
        <div class="menuitem" :class="route.path === '/routes' ? 'active' : ''">
          <img src="@/assets/images/path.svg" alt="Boulders" class="icon icon-image" />
          <div class="title" v-if="route.path === '/routes'">Boulders</div>
        </div>
      </router-link>
      <router-link to="/edit">
        <div class="menuitem" :class="route.path === '/edit' ? 'active' : ''">
          <div class="icon icon-pi">
            <div class="pi pi-file-edit"></div>
          </div>
          <div class="title" v-if="route.path === '/edit'">Edit</div>
        </div>
      </router-link>
      <router-link to="/session">
        <div class="menuitem relative" :class="route.path === '/session' ? 'active' : ''">
          <img
            src="@/assets/images/climber.svg"
            alt="Climb"
            class="mt-[-4px] icon icon-image"
          />
          <div class="title" v-if="route.path === '/session'">Climb</div>
        </div>
      </router-link>
      <router-link to="/live">
        <div class="menuitem" :class="route.path === '/live' ? 'active' : ''">
          <img
            class="icon icon-image"
            src="@/assets/images/camera.svg"
            alt="Live"
          />
          <div class="title" v-if="route.path === '/live'">Live</div>
        </div>
      </router-link>
      <router-link to="/settings">
        <div class="menuitem" :class="route.path === '/settings' ? 'active' : ''">
          <div class="icon icon-pi">
            <span class="pi pi-cog"></span>
          </div>
          <div class="title" v-if="route.path === '/settings'">Settings</div>
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
  height: 80px;
  min-height: 80px;
  padding: 8px;
  z-index: 1000;
  pointer-events: auto;
  touch-action: manipulation;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
}

.bottom-menu-inner {
  width: fit-content !important;
  max-width: calc(100% - 10px);
  height: 64px;
  padding: 0 5px;
  gap: 8px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.bottom-menu-inner a {
  text-decoration: none;
  color: black;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  touch-action: manipulation;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
}

.menuitem {
  transition: all 0.2s ease-in-out;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 0;
  border-radius: 9999px;
  min-width: 44px;
  pointer-events: auto;
  touch-action: manipulation;
  cursor: pointer;
}

.active {
  font-weight: 600;
  background-color: black;
  padding: 8px 16px 8px 14px !important;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.title {
  color: black;
  font-size: 13px;
  white-space: nowrap;
  font-weight: 500;
}

.active .title {
  color: white;
}

.icon-image {
  height: 24px;
  width: 24px;
  object-fit: contain;
  filter: brightness(0);
  flex-shrink: 0;
}

.active .icon-image {
  filter: brightness(0) invert(1);
}

.icon-pi {
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: black;
  flex-shrink: 0;
}

.active .icon-pi {
  color: white;
}

.icon-pi .pi,
.icon-pi span,
.icon-pi div {
  font-size: 24px;
  line-height: 1;
  color: inherit;
}

@media (min-width: 641px) and (max-width: 1024px) {
  .bottom-menu-container {
    height: 85px;
    min-height: 85px;
    padding: 8px;
  }

  .bottom-menu-inner {
    width: fit-content !important;
    max-width: calc(100% - 10px);
    height: 69px;
    padding: 0 5px;
    gap: 8px;
    box-sizing: border-box;
    flex-shrink: 0;
  }

  .menuitem {
    gap: 8px;
    padding: 8px 0;
    min-width: 44px;
  }

  .active {
    padding: 8px 16px 8px 14px !important;
  }

  .title {
    font-size: 14px;
  }

  .icon-image {
    height: 28px;
    width: 28px;
  }

  .icon-pi {
    font-size: 28px;
    width: 28px;
    height: 28px;
  }

  .icon-pi .pi,
  .icon-pi span,
  .icon-pi div {
    font-size: 28px;
  }
}

@media (min-width: 1025px) {
  .bottom-menu-container {
    height: 90px;
    min-height: 90px;
    padding: 10px;
  }

  .bottom-menu-inner {
    width: fit-content !important;
    max-width: calc(100% - 20px);
    height: 70px;
    padding: 0 5px;
    gap: 10px;
    box-sizing: border-box;
    flex-shrink: 0;
  }

  .menuitem {
    gap: 10px;
    padding: 10px 0;
    min-width: 48px;
  }

  .active {
    padding: 10px 20px 10px 18px !important;
  }

  .title {
    font-size: 15px;
  }

  .icon-image {
    height: 28px;
    width: 28px;
  }

  .icon-pi {
    font-size: 28px;
    width: 28px;
    height: 28px;
  }

  .icon-pi .pi,
  .icon-pi span,
  .icon-pi div {
    font-size: 28px;
  }
}
</style>
