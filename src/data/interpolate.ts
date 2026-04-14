// Re-export server interpolation functions for client use
// These are pure functions that work on the shared data types

import type { StateVector, BodyVector } from '../../shared/types.js'

type AnyVector = { utc: string; pos: [number, number, number] }

export function findBracketingVectors<T extends AnyVector>(
  vectors: T[],
  utcTarget: string,
): [T, T, number] {
  const targetMs = Date.parse(utcTarget)

  for (let i = 0; i < vectors.length - 1; i++) {
    const aMs = Date.parse(vectors[i].utc)
    const bMs = Date.parse(vectors[i + 1].utc)
    if (targetMs >= aMs && targetMs <= bMs) {
      const t = bMs === aMs ? 0 : (targetMs - aMs) / (bMs - aMs)
      return [vectors[i], vectors[i + 1], t]
    }
  }

  if (targetMs <= Date.parse(vectors[0].utc)) {
    return [vectors[0], vectors[0], 0]
  }
  const last = vectors[vectors.length - 1]
  return [last, last, 0]
}

export function interpolatePosition(
  vectors: AnyVector[],
  utcTarget: string,
): [number, number, number] {
  const [a, b, t] = findBracketingVectors(vectors, utcTarget)
  return [
    a.pos[0] + (b.pos[0] - a.pos[0]) * t,
    a.pos[1] + (b.pos[1] - a.pos[1]) * t,
    a.pos[2] + (b.pos[2] - a.pos[2]) * t,
  ]
}

export function getCurrentPosition(
  vectors: AnyVector[],
): [number, number, number] {
  // Archive mode: use fixed mission end time
  return interpolatePosition(vectors, '2026-04-10T23:00:00Z')
}

export function getCurrentVelocity(
  vectors: StateVector[],
): number {
  const utc = '2026-04-10T23:00:00Z' // Archive mode: fixed mission end
  const [a, b, t] = findBracketingVectors(vectors, utc)
  const aState = a as StateVector
  const bState = b as StateVector
  if (!aState.vel || !bState.vel) return 0
  const vel: [number, number, number] = [
    aState.vel[0] + (bState.vel[0] - aState.vel[0]) * t,
    aState.vel[1] + (bState.vel[1] - aState.vel[1]) * t,
    aState.vel[2] + (bState.vel[2] - aState.vel[2]) * t,
  ]
  return Math.sqrt(vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2])
}

export function vectorMagnitude(v: [number, number, number]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
}

export function vectorDistance(
  a: [number, number, number],
  b: [number, number, number],
): number {
  return vectorMagnitude([a[0] - b[0], a[1] - b[1], a[2] - b[2]])
}
