import type { Route } from '@/interfaces/interfaces.ts'

const API_BASE_URL = 'https://climber.dev.maptnh.net/api/routes/'

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
    name: 'sdfasd',
    data: {
      grade: '6a',
      author: 'Trinity',
      problem: {
        holds: [
          { id: '17', type: 'start', next: 6, hand: 'l' },
          { id: '91', type: 'start', next: 101, hand: 'r' },
          { id: '6', type: 'normal', next: 55, hand: 'r' },
          { id: '101', type: 'normal', next: 133, hand: 'l' },
          { id: '55', type: 'normal', next: 11, hand: 'r' },
          { id: '133', type: 'normal', next: 89, hand: 'r' },
          { id: '89', type: 'normal', next: 72, hand: 'r' },
          { id: '41', type: 'normal', next: 101, hand: 'r' },
          { id: '72', type: 'finish', next: null, hand: 'r' },
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
