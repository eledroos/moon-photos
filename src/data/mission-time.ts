/**
 * Archive mode — fixed mission reference times.
 * All components read from here instead of Date.now().
 */

import { utcToMet, formatMet } from '../../shared/met.js'

// End of JPL Horizons trajectory data (just before reentry)
export const MISSION_END_UTC = '2026-04-10T23:00:00Z'

// Closest lunar approach
export const FLYBY_UTC = '2026-04-06T23:45:00Z'

// Moon position at closest approach (km, ecliptic J2000 geocentric)
export const FLYBY_MOON_POS: [number, number, number] = [-129398, -381922, -36343]

export function getMissionTime(): string {
  return MISSION_END_UTC
}

export function getMissionMet(): number {
  return utcToMet(MISSION_END_UTC)
}

export function getMissionMetFormatted(): string {
  return formatMet(getMissionMet())
}

export function getMissionTimeMs(): number {
  return Date.parse(MISSION_END_UTC)
}
