import { describe, it, expect } from 'vitest'
import { utcToMet, metToUtc, formatMet, flightDay } from '../../shared/met'

describe('MET utilities', () => {
  it('utcToMet converts launch time to 0', () => {
    expect(utcToMet('2026-04-01T22:35:00Z')).toBe(0)
  })

  it('utcToMet converts 1 hour after launch', () => {
    expect(utcToMet('2026-04-01T23:35:00Z')).toBe(3600)
  })

  it('utcToMet handles pre-launch (negative)', () => {
    expect(utcToMet('2026-04-01T22:34:00Z')).toBe(-60)
  })

  it('metToUtc round-trips with utcToMet', () => {
    const utc = '2026-04-04T07:03:18.000Z'
    const met = utcToMet(utc)
    expect(metToUtc(met)).toBe(utc)
  })

  it('formatMet formats zero', () => {
    expect(formatMet(0)).toBe('000:00:00:00')
  })

  it('formatMet formats typical mission time', () => {
    const met = 2 * 86400 + 14 * 3600 + 36 * 60 + 22
    expect(formatMet(met)).toBe('002:14:36:22')
  })

  it('formatMet handles negative (pre-launch)', () => {
    expect(formatMet(-60)).toBe('-000:00:01:00')
  })

  it('flightDay returns 1 for launch day', () => {
    expect(flightDay(0)).toBe(1)
  })

  it('flightDay returns 4 for day 4', () => {
    expect(flightDay(3 * 86400 + 100)).toBe(4)
  })
})
