const LAUNCH_EPOCH_MS = Date.parse('2026-04-01T22:35:00Z')

export function utcToMet(utcString: string): number {
  return (Date.parse(utcString) - LAUNCH_EPOCH_MS) / 1000
}

export function metToUtc(metSeconds: number): string {
  return new Date(LAUNCH_EPOCH_MS + metSeconds * 1000).toISOString()
}

export function formatMet(metSeconds: number): string {
  const totalSec = Math.floor(Math.abs(metSeconds))
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60
  const sign = metSeconds < 0 ? '-' : ''
  return `${sign}${String(days).padStart(3, '0')}:${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function currentMet(): number {
  return (Date.now() - LAUNCH_EPOCH_MS) / 1000
}

export function flightDay(metSeconds: number): number {
  return Math.floor(metSeconds / 86400) + 1
}

export { LAUNCH_EPOCH_MS }
