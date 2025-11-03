import type { Route } from '@/interfaces/interfaces.ts'

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || ''}routes/`

const headers = {
  accept: 'application/json',
  'Content-Type': 'application/json',
}

export async function routesGet() {
  const response = await fetch(API_BASE_URL, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch routes: ${response.status}`)
  }
  const data = await response.json()
  return data // or just `data` if the API returns an array
}

export async function routesCreate() {
  const data = {
    slug: '',
    deleted: false,
    name: 'Warm Up Eagle',
    data: {
      grade: '6a',
      author: 'Trinity',
      problem: {
        holds: [
          { id: '130', type: 'start', next: 6, hand: 'l' },
          { id: '42', type: 'start', next: 6, hand: 'l' },
          { id: '113', type: 'normal', next: 101, hand: 'r' },
          { id: '41', type: 'normal', next: 55, hand: 'r' },
          { id: '127', type: 'normal', next: 133, hand: 'l' },
          { id: '124', type: 'normal', next: 11, hand: 'r' },
          { id: '106', type: 'finish', next: null, hand: 'r' },
        ],
      },
    },
  }

  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    throw new Error(`Failed to create route: ${response.status}`)
  }
  const res = await response.json()
  return res // or just `data` if the API returns an array
}

export async function routesDelete(id: number) {
  const response = await fetch(`https://climber.dev.maptnh.net/api/routes/${id}/`, {
    method: 'DELETE',
    headers,
  })

  if (!response.ok) {
    throw new Error(`Failed to delete route: ${response.status}`)
  }
  return true
}

export async function routeUpdate(route: Route) {
  if (!route.id) {
    throw new Error('Route ID is required for update')
  }
  const response = await fetch(`https://climber.dev.maptnh.net/api/routes/${route.id}/`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(route),
  })
  if (!response.ok) {
    throw new Error(`Failed to update route: ${response.status}`)
  }
  const data = await response.json()
  return data
}
