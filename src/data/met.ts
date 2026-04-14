import { formatMet, utcToMet, flightDay, LAUNCH_EPOCH_MS } from '../../shared/met.js'
import { getMissionMet } from './mission-time.js'

export { formatMet, utcToMet, flightDay, LAUNCH_EPOCH_MS }

// Archive mode: return fixed mission-end MET
export function currentMet(): number {
  return getMissionMet()
}

/**
 * Archive mode: calls the callback once with the fixed final MET.
 * No ticking interval.
 */
export function createMetTicker(callback: (formatted: string, metSeconds: number) => void): () => void {
  const met = getMissionMet()
  callback(formatMet(met), met)
  return () => {}
}
