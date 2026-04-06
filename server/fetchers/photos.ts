import type { Photo, PhotoUrls, TrajectoryData, BodyData, ServerState, AppConfig } from '../../shared/types.js'
import { utcToMet, flightDay } from '../../shared/met.js'
import { interpolatePosition, vectorMagnitude, vectorDistance } from '../utils/interpolate.js'
import { extractTimestamp, extractCameraMetadata, parseFilenameTimestamp, dateCreatedFallback } from '../utils/exif.js'
import { addKnownPhoto, addFailedExif, removeFailedExif, getFailedExifEntry } from '../utils/state.js'

interface NasaImageItem {
  data: Array<{
    nasa_id: string
    title: string
    description: string
    description_508?: string
    date_created: string
    center: string
    keywords?: string[]
    media_type: string
  }>
  links?: Array<{
    href: string
    rel: string
  }>
}

/**
 * Fetch Artemis II photos from NASA Images API.
 * Uses BOTH the album endpoint AND a keyword search to catch photos
 * that exist in the API but aren't in the album listing.
 */
export async function fetchAlbum(config: AppConfig): Promise<NasaImageItem[]> {
  const seenIds = new Set<string>()
  const items: NasaImageItem[] = []
  const baseUrl = config.api.nasaImagesBaseUrl

  // Source 1: Album listing (paginated, up to 5 pages)
  for (let page = 1; page <= 5; page++) {
    try {
      const url = `${baseUrl}/album/Artemis_II?page=${page}`
      const res = await fetch(url)
      if (!res.ok) break
      const json = await res.json() as { collection: { items: NasaImageItem[] } }
      const pageItems = json.collection?.items
      if (!pageItems || pageItems.length === 0) break
      for (const item of pageItems) {
        const id = item.data?.[0]?.nasa_id
        if (id && !seenIds.has(id)) {
          seenIds.add(id)
          items.push(item)
        }
      }
      if (pageItems.length < 100) break
    } catch {
      break
    }
  }

  // Source 2: Keyword search for art002e photos not in album
  try {
    const searchUrl = `${baseUrl}/search?q=artemis+II+art002e&media_type=image&year_start=2026`
    const res = await fetch(searchUrl)
    if (res.ok) {
      const json = await res.json() as { collection: { items: NasaImageItem[] } }
      const searchItems = json.collection?.items || []
      for (const item of searchItems) {
        const id = item.data?.[0]?.nasa_id
        if (id && !seenIds.has(id)) {
          seenIds.add(id)
          items.push(item)
          console.log(`[Photos] Found via search (not in album): ${id}`)
        }
      }
    }
  } catch {
    // Search is supplementary, don't fail if it errors
  }

  // Source 3: Direct ID lookup for known photos that may not appear in album or search
  // All art002e IDs found on nasa.gov/gallery/journey-to-the-moon/
  const knownMissionPhotoIds = [
    'art002e000180', 'art002e000190', 'art002e000191', 'art002e000193',
    'art002e004357', 'art002e004411', 'art002e004429',
    'art002e004437', 'art002e004438', 'art002e004439', 'art002e004440', 'art002e004441',
    'art002e004450', 'art002e004462',
    'art002e008486', 'art002e008487',
    'art002e009006', 'art002e009007', 'art002e009057',
    'art002e009166', 'art002e009174', 'art002e009205', 'art002e009206', 'art002e009210',
  ]
  for (const id of knownMissionPhotoIds) {
    if (seenIds.has(id)) continue
    try {
      const r = await fetch(`${baseUrl}/search?nasa_id=${id}`)
      if (!r.ok) continue
      const d = await r.json() as { collection: { items: NasaImageItem[] } }
      const found = d.collection?.items?.[0]
      if (found && found.data?.[0]?.nasa_id === id) {
        seenIds.add(id)
        items.push(found)
        console.log(`[Photos] Found via direct lookup: ${id} — ${found.data[0].title}`)
      }
    } catch { /* skip */ }
  }

  console.log(`[Photos] Fetched ${items.length} unique items from album + search + direct`)
  return items
}

/**
 * Filter album items to only new art002e (in-flight) still images.
 */
export function filterNewPhotos(items: NasaImageItem[], knownIds: string[]): NasaImageItem[] {
  const knownSet = new Set(knownIds)
  const seenIds = new Set<string>()
  return items.filter(item => {
    const id = item.data?.[0]?.nasa_id
    if (!id) return false
    if (!id.startsWith('art002e')) return false
    if (item.data[0].media_type !== 'image') return false
    if (knownSet.has(id)) return false
    if (seenIds.has(id)) return false  // Deduplicate within batch
    seenIds.add(id)
    return true
  })
}

/**
 * Build photo URLs from NASA image ID.
 */
function buildPhotoUrls(id: string, assetsBase: string): PhotoUrls {
  const base = `${assetsBase}/image/${id}/${id}`
  return {
    thumb: `${base}~thumb.jpg`,
    medium: `${base}~medium.jpg`,
    large: `${base}~large.jpg`,
    orig: `${base}~orig.jpg`,
  }
}

/**
 * Process a single photo: fetch EXIF from ~orig.jpg, extract timestamp,
 * interpolate trajectory position, compute distances.
 */
export async function processPhoto(
  item: NasaImageItem,
  trajectoryData: TrajectoryData,
  moonData: BodyData,
  config: AppConfig,
): Promise<Photo | null> {
  const data = item.data[0]
  const id = data.nasa_id
  const urls = buildPhotoUrls(id, config.api.nasaAssetsBaseUrl)

  // Try to fetch ~orig.jpg for EXIF
  let utc: string | null = null
  let camera = null
  let exifAvailable = false

  try {
    const origRes = await fetch(urls.orig)
    if (origRes.ok) {
      const buffer = Buffer.from(await origRes.arrayBuffer())
      utc = await extractTimestamp(buffer)
      camera = await extractCameraMetadata(buffer)
      if (utc) exifAvailable = true
    }
  } catch {
    // EXIF fetch failed — will use fallback
  }

  // Fallback: try filename timestamp from description_508
  if (!utc && data.description_508) {
    utc = parseFilenameTimestamp(data.description_508)
  }

  // Final fallback: date_created at noon UTC
  if (!utc) {
    utc = dateCreatedFallback(data.date_created)
  }

  // Interpolate position
  const pos = interpolatePosition(trajectoryData.vectors, utc)
  const moonPos = interpolatePosition(moonData.vectors, utc)
  const met = utcToMet(utc)

  // Find velocity at this time (interpolate from nearest state vectors)
  let velocity = 0
  const trajectoryVectors = trajectoryData.vectors
  for (let i = 0; i < trajectoryVectors.length - 1; i++) {
    if (Date.parse(utc) >= Date.parse(trajectoryVectors[i].utc) &&
        Date.parse(utc) <= Date.parse(trajectoryVectors[i + 1].utc)) {
      // Interpolate velocity magnitude
      const t = (Date.parse(utc) - Date.parse(trajectoryVectors[i].utc)) /
                (Date.parse(trajectoryVectors[i + 1].utc) - Date.parse(trajectoryVectors[i].utc))
      const vel: [number, number, number] = [
        trajectoryVectors[i].vel[0] + (trajectoryVectors[i + 1].vel[0] - trajectoryVectors[i].vel[0]) * t,
        trajectoryVectors[i].vel[1] + (trajectoryVectors[i + 1].vel[1] - trajectoryVectors[i].vel[1]) * t,
        trajectoryVectors[i].vel[2] + (trajectoryVectors[i + 1].vel[2] - trajectoryVectors[i].vel[2]) * t,
      ]
      velocity = vectorMagnitude(vel)
      break
    }
  }

  return {
    id,
    utc,
    met,
    pos,
    caption: data.title || '',
    description: data.description || '',
    urls,
    camera,
    distanceFromEarth: vectorMagnitude(pos),
    distanceFromMoon: vectorDistance(pos, moonPos),
    velocity,
    flightDay: flightDay(met),
    exifAvailable,
  }
}

/**
 * Fetch and process all new photos.
 * Returns array of new Photo objects and updates state.
 */
export async function fetchAndProcessPhotos(
  config: AppConfig,
  state: ServerState,
  trajectoryData: TrajectoryData,
  moonData: BodyData,
): Promise<Photo[]> {
  const albumItems = await fetchAlbum(config)
  const newItems = filterNewPhotos(albumItems, state.knownPhotoIds)

  // Also retry failed EXIF entries (up to 5 attempts)
  const retryItems = albumItems.filter(item => {
    const id = item.data?.[0]?.nasa_id
    if (!id) return false
    const entry = getFailedExifEntry(state, id)
    return entry && entry.attempts < 5
  })

  const allToProcess = [...newItems, ...retryItems]
  const photos: Photo[] = []

  for (const item of allToProcess) {
    const id = item.data[0].nasa_id
    try {
      const photo = await processPhoto(item, trajectoryData, moonData, config)
      if (photo) {
        photos.push(photo)
        addKnownPhoto(state, id)
        removeFailedExif(state, id)
        state.totalPhotosFetched++
      }
    } catch (err) {
      console.error(`[Photos] Error processing ${id}:`, (err as Error).message)
      addFailedExif(state, id, (err as Error).message)
    }
  }

  // Source 4: WordPress-only photos from nasa.gov gallery (not in Images API)
  const wpPhotos = getWordPressGalleryPhotos()
  for (const wp of wpPhotos) {
    if (state.knownPhotoIds.includes(wp.id)) continue
    const utc = wp.utc
    const pos = interpolatePosition(trajectoryData.vectors, utc)
    const moonPos = interpolatePosition(moonData.vectors, utc)
    const met = utcToMet(utc)

    let velocity = 0
    for (let i = 0; i < trajectoryData.vectors.length - 1; i++) {
      const v = trajectoryData.vectors
      if (Date.parse(utc) >= Date.parse(v[i].utc) && Date.parse(utc) <= Date.parse(v[i + 1].utc)) {
        const t = (Date.parse(utc) - Date.parse(v[i].utc)) / (Date.parse(v[i + 1].utc) - Date.parse(v[i].utc))
        const vel: [number, number, number] = [
          v[i].vel[0] + (v[i + 1].vel[0] - v[i].vel[0]) * t,
          v[i].vel[1] + (v[i + 1].vel[1] - v[i].vel[1]) * t,
          v[i].vel[2] + (v[i + 1].vel[2] - v[i].vel[2]) * t,
        ]
        velocity = vectorMagnitude(vel)
        break
      }
    }

    photos.push({
      id: wp.id,
      utc,
      met,
      pos,
      caption: wp.caption,
      description: wp.description,
      urls: wp.urls,
      camera: null,
      distanceFromEarth: vectorMagnitude(pos),
      distanceFromMoon: vectorDistance(pos, moonPos),
      velocity,
      flightDay: flightDay(met),
      exifAvailable: false,
    })
    addKnownPhoto(state, wp.id)
    state.totalPhotosFetched++
    console.log(`[Photos] Added WordPress gallery photo: ${wp.id} — ${wp.caption}`)
  }

  return photos
}

/**
 * WordPress-only photos from nasa.gov/gallery/journey-to-the-moon/
 * that are NOT available in the NASA Images API.
 * Dates estimated from gallery captions and mission timeline.
 */
function getWordPressGalleryPhotos() {
  const wpBase = 'https://www.nasa.gov/wp-content/uploads/2026/04'
  return [
    {
      id: 'wp-artemis-ii-crew-inside-orion',
      utc: '2026-04-04T12:00:00Z', // FD3 — crew downlink event
      caption: 'Artemis II Crew Inside Orion',
      description: 'The Artemis II crew answers questions from reporters during the first downlink event of their mission.',
      urls: {
        thumb: `${wpBase}/artemis-ii-crew-inside-orion-7.jpg?w=300`,
        medium: `${wpBase}/artemis-ii-crew-inside-orion-7.jpg?w=800`,
        large: `${wpBase}/artemis-ii-crew-inside-orion-7.jpg?w=1920`,
        orig: `${wpBase}/artemis-ii-crew-inside-orion-7.jpg`,
      },
    },
    {
      id: 'wp-congratulations-jeremy',
      utc: '2026-04-06T06:00:00Z', // FD5 — gold wings ceremony
      caption: 'Congratulations to Jeremy for His First Flight in Space',
      description: 'The Artemis II crew presents Jeremy Hansen with his Gold Wings signifying his first flight into space during Flight Day 5.',
      urls: {
        thumb: `${wpBase}/congratulations-to-jeremy-for-his-first-flight-in-space.png?w=300`,
        medium: `${wpBase}/congratulations-to-jeremy-for-his-first-flight-in-space.png?w=800`,
        large: `${wpBase}/congratulations-to-jeremy-for-his-first-flight-in-space.png?w=1920`,
        orig: `${wpBase}/congratulations-to-jeremy-for-his-first-flight-in-space.png`,
      },
    },
    {
      id: 'wp-sliver-of-earth-koch',
      utc: '2026-04-05T12:00:00Z', // FD4 — Koch photo
      caption: 'A Sliver of Earth from Orion',
      description: 'Peering out one of the four windows near the display console on the Orion spacecraft, Artemis II crew member Christina Koch captures a sliver of Earth.',
      urls: {
        thumb: `${wpBase}/sliver-of-earth-9.jpg?w=300`,
        medium: `${wpBase}/sliver-of-earth-9.jpg?w=800`,
        large: `${wpBase}/sliver-of-earth-9.jpg?w=1920`,
        orig: `${wpBase}/sliver-of-earth-9.jpg`,
      },
    },
    {
      id: 'wp-fd02-crew-photo',
      utc: '2026-04-03T12:00:00Z', // FD2
      caption: 'Crew Photo on Flight Day 2',
      description: 'The Artemis II crew poses for a photo during Flight Day 2 of their mission to the Moon.',
      urls: {
        thumb: `${wpBase}/art002e000192.jpg?w=300`,
        medium: `${wpBase}/art002e000192.jpg?w=800`,
        large: `${wpBase}/art002e000192.jpg?w=1920`,
        orig: `${wpBase}/art002e000192.jpg`,
      },
    },
  ]
}
