import exifr from 'exifr'
import type { CameraMetadata } from '../../shared/types.js'

/**
 * Extract capture timestamp from EXIF data as UTC ISO string.
 * Cameras aboard Orion are set to CDT (UTC-5), so OffsetTime is typically "-05:00".
 *
 * CRITICAL: EXIF DateTimeOriginal has NO timezone. exifr returns it as a Date
 * interpreted in the system's local timezone. We must manually apply the
 * OffsetTime to get the correct UTC time.
 */
export async function extractTimestamp(buffer: Buffer): Promise<string | null> {
  try {
    const data = await exifr.parse(buffer, {
      pick: ['DateTimeOriginal', 'OffsetTime', 'OffsetTimeOriginal'],
    })
    if (!data?.DateTimeOriginal) return null

    const dt = data.DateTimeOriginal as Date
    const offsetStr = data.OffsetTime || data.OffsetTimeOriginal || '-05:00'

    // Parse offset string like "-05:00" or "+00:00"
    const offsetMatch = offsetStr.match(/([+-])(\d{2}):(\d{2})/)
    if (!offsetMatch) {
      // Can't parse offset, assume CDT (-5h)
      return new Date(dt.getTime() + 5 * 3600000).toISOString()
    }

    const [, sign, hours, minutes] = offsetMatch
    const offsetMs = (parseInt(hours) * 60 + parseInt(minutes)) * 60000
    const signedOffsetMs = sign === '-' ? offsetMs : -offsetMs

    // exifr interprets DateTimeOriginal using the system timezone.
    // We need to: 1) get the raw local time components, 2) construct UTC correctly.
    //
    // The raw EXIF time is the camera's local time (CDT).
    // To get UTC: if offset is -05:00, UTC = local + 5 hours
    //
    // Since exifr already applied the system TZ offset, we need to undo that
    // and apply the camera's offset instead.
    // Simplest approach: extract the time components and rebuild.
    const year = dt.getFullYear()
    const month = dt.getMonth()
    const day = dt.getDate()
    const hour = dt.getHours()
    const min = dt.getMinutes()
    const sec = dt.getSeconds()

    // These are the camera's local time (CDT). Build a UTC date by applying the camera offset.
    // Camera offset -05:00 means UTC = camera_time + 5 hours
    const cameraLocalMs = Date.UTC(year, month, day, hour, min, sec)
    const utcMs = cameraLocalMs + signedOffsetMs

    return new Date(utcMs).toISOString()
  } catch {
    return null
  }
}

/**
 * Extract camera metadata from EXIF.
 */
export async function extractCameraMetadata(buffer: Buffer): Promise<CameraMetadata | null> {
  try {
    const data = await exifr.parse(buffer, {
      pick: ['Make', 'Model', 'LensModel', 'FocalLength', 'FNumber', 'ExposureTime', 'ISO'],
    })
    if (!data?.Make) return null

    return {
      make: data.Make || 'Unknown',
      model: data.Model || 'Unknown',
      lens: data.LensModel || 'Unknown',
      focalLength: data.FocalLength || 0,
      aperture: data.FNumber ? `f/${data.FNumber}` : 'Unknown',
      exposure: data.ExposureTime ? formatExposure(data.ExposureTime) : 'Unknown',
      iso: data.ISO || 0,
    }
  } catch {
    return null
  }
}

function formatExposure(seconds: number): string {
  if (seconds >= 1) return `${seconds}s`
  return `1/${Math.round(1 / seconds)}s`
}

/**
 * Parse timestamp from spacecraft camera filename patterns.
 * e.g., "cmaopnav_20260402131722.tiff" → "2026-04-02T13:17:22Z"
 */
export function parseFilenameTimestamp(filename: string): string | null {
  const match = filename.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/)
  if (!match) return null
  const [, y, m, d, h, min, s] = match
  return `${y}-${m}-${d}T${h}:${min}:${s}Z`
}

/**
 * Build fallback UTC timestamp from a date string (date-only precision).
 * Places at noon UTC that day.
 */
export function dateCreatedFallback(dateCreated: string): string {
  const d = new Date(dateCreated)
  d.setUTCHours(12, 0, 0, 0)
  return d.toISOString()
}
