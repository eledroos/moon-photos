import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { parseHorizonsResult, parseHorizonsBodyResult, buildHorizonsUrl } from '../../server/fetchers/horizons.js'

const sampleResult = readFileSync('tests/fixtures/horizons-sample.txt', 'utf-8')

describe('Horizons parser', () => {
  it('parses state vectors from result string', () => {
    const vectors = parseHorizonsResult(sampleResult)
    expect(vectors.length).toBeGreaterThan(0)
  })

  it('each vector has utc, met, pos[3], vel[3]', () => {
    const vectors = parseHorizonsResult(sampleResult)
    const v = vectors[0]
    expect(v.utc).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(typeof v.met).toBe('number')
    expect(v.pos).toHaveLength(3)
    expect(v.vel).toHaveLength(3)
    v.pos.forEach(p => expect(typeof p).toBe('number'))
    v.vel.forEach(p => expect(typeof p).toBe('number'))
  })

  it('positions are in km (reasonable magnitude)', () => {
    const vectors = parseHorizonsResult(sampleResult)
    const magnitude = Math.sqrt(vectors[0].pos.reduce((s, v) => s + v * v, 0))
    expect(magnitude).toBeLessThan(500000)
    expect(magnitude).toBeGreaterThan(0)
  })

  it('velocities are in km/s (reasonable magnitude)', () => {
    const vectors = parseHorizonsResult(sampleResult)
    const magnitude = Math.sqrt(vectors[0].vel.reduce((s, v) => s + v * v, 0))
    expect(magnitude).toBeLessThan(20) // orbital velocities < 20 km/s
    expect(magnitude).toBeGreaterThan(0)
  })

  it('parseHorizonsBodyResult returns BodyVector without vel', () => {
    const vectors = parseHorizonsBodyResult(sampleResult)
    expect(vectors.length).toBeGreaterThan(0)
    expect(vectors[0]).toHaveProperty('utc')
    expect(vectors[0]).toHaveProperty('pos')
    expect(vectors[0]).not.toHaveProperty('vel')
    expect(vectors[0]).not.toHaveProperty('met')
  })

  it('buildHorizonsUrl constructs correct URL', () => {
    const url = buildHorizonsUrl({
      command: '-1024',
      startTime: '2026-04-02',
      stopTime: '2026-04-03',
      stepMin: 15,
      baseUrl: 'https://ssd.jpl.nasa.gov/api/horizons.api',
    })
    expect(url).toContain('COMMAND')
    expect(url).toContain('-1024')
    expect(url).toContain('VECTORS')
    expect(url).toContain('ECLIPTIC')
  })
})
