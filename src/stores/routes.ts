import { ref } from 'vue'
import { defineStore } from 'pinia'
import { routesDelete, routesGet, routesCreate, routeUpdate } from '@/services/routes.service'
import type { Route } from '@/interfaces/interfaces.ts'

export const useRoutesStore = defineStore('routes', () => {
  const routes = ref<Route[]>([])

  async function getRoutes() {
    routes.value = await routesGet()
  }

  async function createRoute() {
    const response = await routesCreate()
    routes.value.push(response)
    return response
  }

  async function deleteRoute(id: string) {
    await routesDelete(id)
    getRoutes()
    return id
  }

  async function saveRoute(route: Route) {
    await routeUpdate(route)
    routes.value = routes.value.map((r) => (r.id === route.id ? route : r))
    return route
  }

  return { routes, deleteRoute, getRoutes, saveRoute, createRoute }
})
