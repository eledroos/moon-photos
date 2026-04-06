import { describe, it, expect } from 'vitest'
import { parseFilenameTimestamp, dateCreatedFallback } from '../../server/utils/exif.js'

describe('EXIF utilities', () => {
  it('parseFilenameTimestamp parses opnav format', () => {
    expect(parseFilenameTimestamp('cmaopnav_20260402131722.tiff'))
      .toBe('2026-04-02T13:17:22Z')
  })

  it('parseFilenameTimestamp parses solar array format', () => {
    expect(parseFilenameTimestamp('cmasaw4_20260403141616_034.JPG'))
      .toBe('2026-04-03T14:16:16Z')
  })

  it('parseFilenameTimestamp returns null for no match', () => {
    expect(parseFilenameTimestamp('art002e009006.NEF')).toBeNull()
  })

  it('dateCreatedFallback places at noon UTC', () => {
    const result = dateCreatedFallback('2026-04-04')
    expect(result).toContain('2026-04-04T12:00:00')
  })
})
