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

  // Clamp to nearest edge
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

export function vectorMagnitude(v: [number, number, number]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
}

export function vectorDistance(
  a: [number, number, number],
  b: [number, number, number],
): number {
  return vectorMagnitude([a[0] - b[0], a[1] - b[1], a[2] - b[2]])
}
