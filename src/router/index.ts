import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/session',
    },
    {
      path: '/routes',
      name: 'Routes',
      component: () => import('../views/RoutesView.vue'),
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('../views/SettingsView.vue'),
    },
    {
      path: '/live',
      name: 'Live',
      component: () => import('../views/LiveView.vue'),
    },
    {
      path: '/edit',
      name: 'Edit',
      component: () => import('../views/EditView.vue'),
    },
    {
      path: '/session',
      name: 'Session',
      component: () => import('../views/SessionView.vue'),
    },
  ],
})

export default router
