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

export async function routesCreate(name: string, grade: string, author: string) {
  console.log('routesCreate service called:', { name, grade, author, API_BASE_URL })
  const data = {
    name: name,
    data: {
      grade: grade,
      author: author || 'Trinity',
      problem: {
        holds: [
        ],
      },
    },
  }

  console.log('Sending data to API:', JSON.stringify(data, null, 2))
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  
  console.log('API response status:', response.status, response.statusText)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('API error response:', errorText)
    throw new Error(`Failed to create route: ${response.status} - ${errorText}`)
  }
  const res = await response.json()
  console.log('API response data:', res)
  return res
}

export async function routesDelete(id: number) {
  const response = await fetch(`${API_BASE_URL}${id}/`, {
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
  const response = await fetch(`${API_BASE_URL}${route.id}/`, {
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
