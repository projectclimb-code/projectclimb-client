export interface Route {
  id?: number
  created?: string
  updated?: string
  name: string
  data: Data
}

export interface Data {
  grade: string
  author: string
  problem: Problem
}

export interface Problem {
  holds: Hold[]
}

export interface Hold {
  id: string
  type: string
  next?: number
  hand: string
}
