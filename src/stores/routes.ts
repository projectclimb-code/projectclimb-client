import { ref } from 'vue'
import { defineStore } from 'pinia'
import { routesDelete, routesGet, routesCreate, routeUpdate } from '@/services/routes.service'
import type { Route } from '@/interfaces/interfaces.ts'
import type { ClimbingRouteGrade } from '@/interfaces/interfaces.ts'

export const useRoutesStore = defineStore('routes', () => {
  const routes = ref<Route[]>([])
  const isLoading = ref(false)

  async function getRoutes() {
    isLoading.value = true
    try {
      routes.value = await routesGet()
    } finally {
      isLoading.value = false
    }
  }

  async function createRoute(name: string, grade: ClimbingRouteGrade, author: string) {
    console.log('createRoute called in store:', { name, grade, author })
    try {
      const response = await routesCreate(name, grade, author)
      console.log('routesCreate response:', response)
      routes.value.push(response)
      return response
    } catch (error) {
      console.error('Error in createRoute store:', error)
      throw error
    }
  }

  async function deleteRoute(id: number) {
    await routesDelete(id)
    getRoutes()
    return id
  }

  async function saveRoute(route: Route) {
    const updatedRoute = await routeUpdate(route)
    routes.value = routes.value.map((r) => (r.id === route.id ? updatedRoute : r))
    return updatedRoute
  }

  return { routes, isLoading, deleteRoute, getRoutes, saveRoute, createRoute }
})
