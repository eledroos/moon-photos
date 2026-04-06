import type { StateVector, BodyVector } from '../../shared/types.js'
import { utcToMet } from '../../shared/met.js'

interface HorizonsQueryParams {
  command: string
  startTime: string
  stopTime: string
  stepMin: number
  baseUrl: string
}

export function buildHorizonsUrl(params: HorizonsQueryParams): string {
  const { command, startTime, stopTime, stepMin, baseUrl } = params
  const p = new URLSearchParams({
    format: 'json',
    COMMAND: `'${command}'`,
    EPHEM_TYPE: "'VECTORS'",
    CENTER: "'500@399'",
    START_TIME: `'${startTime}'`,
    STOP_TIME: `'${stopTime}'`,
    STEP_SIZE: `'${stepMin} m'`,
    VEC_TABLE: "'2'",
    REF_PLANE: "'ECLIPTIC'",
    REF_SYSTEM: "'J2000'",
    OUT_UNITS: "'KM-S'",
    CSV_FORMAT: "'NO'",
  })
  return `${baseUrl}?${p.toString()}`
}

// Month abbreviation map used by Horizons date strings (e.g. "Apr")
const MONTH_MAP: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}

/**
 * Parse a Horizons calendar date string such as:
 *   "A.D. 2026-Apr-02 02:00:00.0000 TDB"
 * into an ISO-8601 UTC string.
 */
function parseHorizonsDate(datePart: string): string {
  // datePart example: "A.D. 2026-Apr-02 02:00:00.0000 TDB"
  const match = datePart.match(
    /A\.D\.\s+(\d{4})-([A-Za-z]{3})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?\s+TDB/
  )
  if (!match) throw new Error(`Cannot parse Horizons date: ${datePart}`)
  const [, year, mon, day, hh, mm, ss] = match
  const month = MONTH_MAP[mon]
  if (!month) throw new Error(`Unknown month abbreviation: ${mon}`)
  return `${year}-${month}-${day}T${hh}:${mm}:${ss}Z`
}

/**
 * Parse a position/velocity value string like:
 *   "X =-2.460259791031141E+04 Y =-1.466164717271550E+04 Z =-1.313590155061838E+03"
 * Returns [x, y, z] as numbers.
 */
function parseXYZ(line: string): [number, number, number] {
  // Match each component: allow optional spaces around '='
  const matches = [...line.matchAll(/[XYZ]\s*=\s*([+-]?\d+(?:\.\d+)?E[+-]\d+)/gi)]
  if (matches.length !== 3) throw new Error(`Cannot parse XYZ from line: ${line}`)
  return matches.map(m => parseFloat(m[1])) as [number, number, number]
}

/**
 * Extract lines between $$SOE and $$EOE markers and split into blocks.
 * Each block is 3 lines: date, position, velocity (plus optional LT/RG/RR lines).
 */
function extractBlocks(result: string): Array<{ dateLine: string; posLine: string; velLine: string }> {
  const soeIdx = result.indexOf('$$SOE')
  const eoeIdx = result.indexOf('$$EOE')
  if (soeIdx === -1 || eoeIdx === -1) throw new Error('Missing $$SOE/$$EOE markers in Horizons result')

  const body = result.slice(soeIdx + '$$SOE'.length, eoeIdx)
  const lines = body.split('\n').map(l => l.trimEnd()).filter(l => l.length > 0)

  const blocks: Array<{ dateLine: string; posLine: string; velLine: string }> = []
  let i = 0
  while (i < lines.length) {
    // Date line contains "= A.D."
    if (lines[i].includes('= A.D.')) {
      const dateLine = lines[i]
      const posLine = lines[i + 1] ?? ''
      const velLine = lines[i + 2] ?? ''
      blocks.push({ dateLine, posLine, velLine })
      i += 3
      // Skip any trailing LT/RG/RR lines
      while (i < lines.length && !lines[i].includes('= A.D.')) i++
    } else {
      i++
    }
  }
  return blocks
}

export function parseHorizonsResult(result: string): StateVector[] {
  const blocks = extractBlocks(result)
  return blocks.map(({ dateLine, posLine, velLine }) => {
    const adPart = dateLine.split('= ').slice(1).join('= ').trim()
    const utc = parseHorizonsDate(adPart)
    const met = utcToMet(utc)
    const pos = parseXYZ(posLine)
    const vel = parseXYZ(velLine)
    return { utc, met, pos, vel }
  })
}

export function parseHorizonsBodyResult(result: string): BodyVector[] {
  const blocks = extractBlocks(result)
  return blocks.map(({ dateLine, posLine }) => {
    const adPart = dateLine.split('= ').slice(1).join('= ').trim()
    const utc = parseHorizonsDate(adPart)
    const pos = parseXYZ(posLine)
    return { utc, pos }
  })
}

export async function fetchHorizons(params: HorizonsQueryParams): Promise<string> {
  const url = buildHorizonsUrl(params)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Horizons API error: ${res.status} ${res.statusText}`)
  const json = await res.json() as { result: string }
  return json.result
}
