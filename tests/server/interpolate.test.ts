import { describe, it, expect } from 'vitest'
import { interpolatePosition, findBracketingVectors, vectorMagnitude, vectorDistance } from '../../server/utils/interpolate.js'
import type { StateVector } from '../../shared/types.js'

const vectors: StateVector[] = [
  { utc: '2026-04-02T02:00:00Z', met: 0, pos: [0, 0, 0], vel: [1, 0, 0] },
  { utc: '2026-04-02T03:00:00Z', met: 3600, pos: [3600, 0, 0], vel: [1, 0, 0] },
  { utc: '2026-04-02T04:00:00Z', met: 7200, pos: [7200, 0, 0], vel: [1, 0, 0] },
]

describe('interpolation', () => {
  it('findBracketingVectors returns exact match', () => {
    const [a, b, t] = findBracketingVectors(vectors, '2026-04-02T02:00:00Z')
    expect(t).toBe(0)
    expect(a.utc).toBe('2026-04-02T02:00:00Z')
  })

  it('findBracketingVectors returns midpoint t=0.5', () => {
    const [a, b, t] = findBracketingVectors(vectors, '2026-04-02T02:30:00Z')
    expect(a.utc).toBe('2026-04-02T02:00:00Z')
    expect(b.utc).toBe('2026-04-02T03:00:00Z')
    expect(t).toBeCloseTo(0.5, 5)
  })

  it('findBracketingVectors clamps before first vector', () => {
    const [a, b, t] = findBracketingVectors(vectors, '2026-04-01T00:00:00Z')
    expect(t).toBe(0)
    expect(a.utc).toBe('2026-04-02T02:00:00Z')
  })

  it('findBracketingVectors clamps after last vector', () => {
    const [a, b, t] = findBracketingVectors(vectors, '2026-04-10T00:00:00Z')
    expect(t).toBe(0)
    expect(a.utc).toBe('2026-04-02T04:00:00Z')
  })

  it('interpolatePosition lerps correctly at t=0.5', () => {
    const pos = interpolatePosition(vectors, '2026-04-02T02:30:00Z')
    expect(pos[0]).toBeCloseTo(1800, 1)
    expect(pos[1]).toBeCloseTo(0, 1)
    expect(pos[2]).toBeCloseTo(0, 1)
  })

  it('interpolatePosition at t=0.25', () => {
    const pos = interpolatePosition(vectors, '2026-04-02T02:15:00Z')
    expect(pos[0]).toBeCloseTo(900, 1)
  })

  it('vectorMagnitude computes correctly', () => {
    expect(vectorMagnitude([3, 4, 0])).toBeCloseTo(5, 5)
    expect(vectorMagnitude([0, 0, 0])).toBe(0)
    expect(vectorMagnitude([1, 1, 1])).toBeCloseTo(Math.sqrt(3), 5)
  })

  it('vectorDistance computes correctly', () => {
    expect(vectorDistance([0, 0, 0], [3, 4, 0])).toBeCloseTo(5, 5)
    expect(vectorDistance([1, 1, 1], [1, 1, 1])).toBe(0)
  })
})
