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

export enum ClimbingRouteGrade {
  '6a' = '6a',
  '6a+' = '6a+',
  '6b' = '6b',
  '6b+' = '6b+',
  '6c' = '6c',
  '6c+' = '6c+',
  '7a' = '7a',
  '7a+' = '7a+',
  '7b' = '7b',
  '7b+' = '7b+',
  '7c' = '7c',
  '7c+' = '7c+',
  '8a' = '8a',
  '8a+' = '8a+',
  '8b' = '8b',
  '8b+' = '8b+',
  '8c' = '8c',
  '8c+' = '8c+'
}
