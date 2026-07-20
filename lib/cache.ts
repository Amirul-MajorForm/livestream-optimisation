import type { Stream } from './parser'

let cachedData: Stream[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL_MS = 5 * 60 * 1000

export function getCached(): Stream[] | null {
  if (cachedData && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedData
  }
  return null
}

export function setCache(data: Stream[]): void {
  cachedData = data
  cacheTimestamp = Date.now()
}

export function clearCache(): void {
  cachedData = null
  cacheTimestamp = 0
}

export function getCacheTimestamp(): number {
  return cacheTimestamp
}
