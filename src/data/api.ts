import type { TrajectoryData, BodyData, PhotosData } from '../../shared/types.js'

/**
 * Fetch a JSON endpoint. Tries /api/name first (Express server),
 * falls back to /api/name.json (static Cloudflare Pages build).
 */
async function fetchJSON<T>(name: string, fallback: T): Promise<T> {
  // Try Express server endpoint first
  try {
    const res = await fetch(`/api/${name}`)
    if (res.ok) return await res.json()
  } catch { /* fall through */ }

  // Fallback to static .json file (Cloudflare Pages)
  try {
    const res = await fetch(`/api/${name}.json`)
    if (res.ok) return await res.json()
  } catch { /* fall through */ }

  return fallback
}

export async function fetchTrajectory(): Promise<TrajectoryData | null> {
  return fetchJSON<TrajectoryData | null>('trajectory', null)
}

export async function fetchMoon(): Promise<BodyData | null> {
  return fetchJSON<BodyData | null>('moon', null)
}

export async function fetchSun(): Promise<BodyData | null> {
  return fetchJSON<BodyData | null>('sun', null)
}

export async function fetchPhotos(): Promise<PhotosData> {
  return fetchJSON<PhotosData>('photos', { lastUpdated: '', photos: [] })
}

export interface AllData {
  trajectory: TrajectoryData | null
  moon: BodyData | null
  sun: BodyData | null
  photos: PhotosData
}

export async function fetchAllData(): Promise<AllData> {
  const [trajectory, moon, sun, photos] = await Promise.all([
    fetchTrajectory(),
    fetchMoon(),
    fetchSun(),
    fetchPhotos(),
  ])
  return { trajectory, moon, sun, photos }
}
