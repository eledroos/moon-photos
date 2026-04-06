import { describe, it, expect } from 'vitest'
import { filterNewPhotos } from '../../server/fetchers/photos.js'

const mockItems = [
  { data: [{ nasa_id: 'art002e000001', media_type: 'image', title: '', description: '', date_created: '' }] },
  { data: [{ nasa_id: 'art002e000002', media_type: 'image', title: '', description: '', date_created: '' }] },
  { data: [{ nasa_id: 'art002m000001', media_type: 'video', title: '', description: '', date_created: '' }] },
  { data: [{ nasa_id: 'KSC-20260401', media_type: 'image', title: '', description: '', date_created: '' }] },
]

describe('Photos fetcher', () => {
  it('filterNewPhotos returns only new art002e images', () => {
    const result = filterNewPhotos(mockItems as any, [])
    expect(result).toHaveLength(2)
    expect(result[0].data[0].nasa_id).toBe('art002e000001')
    expect(result[1].data[0].nasa_id).toBe('art002e000002')
  })

  it('filterNewPhotos excludes known IDs', () => {
    const result = filterNewPhotos(mockItems as any, ['art002e000001'])
    expect(result).toHaveLength(1)
    expect(result[0].data[0].nasa_id).toBe('art002e000002')
  })

  it('filterNewPhotos excludes non-art002e and non-image', () => {
    const result = filterNewPhotos(mockItems as any, [])
    const ids = result.map(r => r.data[0].nasa_id)
    expect(ids).not.toContain('art002m000001')
    expect(ids).not.toContain('KSC-20260401')
  })
})
