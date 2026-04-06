import type { TrajectoryData, BodyData, PhotosData } from '../../shared/types.js'

const API_BASE = '/api'

export async function fetchTrajectory(): Promise<TrajectoryData | null> {
  try {
    const res = await fetch(`${API_BASE}/trajectory`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function fetchMoon(): Promise<BodyData | null> {
  try {
    const res = await fetch(`${API_BASE}/moon`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function fetchSun(): Promise<BodyData | null> {
  try {
    const res = await fetch(`${API_BASE}/sun`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function fetchPhotos(): Promise<PhotosData> {
  try {
    const res = await fetch(`${API_BASE}/photos`)
    if (!res.ok) return { lastUpdated: '', photos: [] }
    return await res.json()
  } catch {
    return { lastUpdated: '', photos: [] }
  }
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
