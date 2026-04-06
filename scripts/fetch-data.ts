import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { fetchHorizons, parseHorizonsResult, parseHorizonsBodyResult } from '../server/fetchers/horizons.js'
import { fetchAndProcessPhotos } from '../server/fetchers/photos.js'
import { loadState, saveState, defaultState } from '../server/utils/state.js'
import type { TrajectoryData, BodyData, PhotosData } from '../shared/types.js'

async function main() {
  const config = JSON.parse(readFileSync('config.json', 'utf-8'))
  if (!existsSync('data')) mkdirSync('data', { recursive: true })

  const state = existsSync('data/state.json') ? loadState() : defaultState()

  // Fetch trajectory (multi-resolution)
  console.log('  Fetching trajectory (near-Earth 2-min + deep-space 15-min)...')
  const nearResult = await fetchHorizons({ command: config.mission.horizonsId, startTime: '2026-04-02T02:00:00', stopTime: '2026-04-03T02:00:00', stepMin: 2, baseUrl: config.api.horizonsBaseUrl })
  const nearVectors = parseHorizonsResult(nearResult)
  const deepResult = await fetchHorizons({ command: config.mission.horizonsId, startTime: '2026-04-03T02:15:00', stopTime: '2026-04-10T23:00:00', stepMin: 15, baseUrl: config.api.horizonsBaseUrl })
  const deepVectors = parseHorizonsResult(deepResult)
  const trajectoryData: TrajectoryData = {
    fetchedAt: new Date().toISOString(),
    source: `JPL Horizons COMMAND=${config.mission.horizonsId}`,
    referenceFrame: 'ecliptic_j2000_geocentric',
    units: { position: 'km', velocity: 'km/s' },
    vectors: [...nearVectors, ...deepVectors],
  }
  writeFileSync('data/trajectory.json', JSON.stringify(trajectoryData, null, 2))
  console.log(`  Trajectory: ${trajectoryData.vectors.length} vectors`)

  // Fetch Moon
  console.log('  Fetching Moon...')
  const moonResult = await fetchHorizons({ command: config.mission.moonId, startTime: '2026-04-02T02:00:00', stopTime: '2026-04-10T23:00:00', stepMin: 60, baseUrl: config.api.horizonsBaseUrl })
  const moonData: BodyData = { fetchedAt: new Date().toISOString(), source: `JPL Horizons COMMAND=${config.mission.moonId}`, vectors: parseHorizonsBodyResult(moonResult) }
  writeFileSync('data/moon.json', JSON.stringify(moonData, null, 2))
  console.log(`  Moon: ${moonData.vectors.length} vectors`)

  // Fetch Sun
  console.log('  Fetching Sun...')
  const sunResult = await fetchHorizons({ command: config.mission.sunId, startTime: '2026-04-02T02:00:00', stopTime: '2026-04-10T23:00:00', stepMin: 60, baseUrl: config.api.horizonsBaseUrl })
  const sunData: BodyData = { fetchedAt: new Date().toISOString(), source: `JPL Horizons COMMAND=${config.mission.sunId}`, vectors: parseHorizonsBodyResult(sunResult) }
  writeFileSync('data/sun.json', JSON.stringify(sunData, null, 2))
  console.log(`  Sun: ${sunData.vectors.length} vectors`)

  // Fetch Photos
  console.log('  Fetching photos (this takes a minute for EXIF downloads)...')
  const newPhotos = await fetchAndProcessPhotos(config, state, trajectoryData, moonData)
  let photosData: PhotosData = { lastUpdated: '', photos: [] }
  if (existsSync('data/photos.json')) {
    photosData = JSON.parse(readFileSync('data/photos.json', 'utf-8'))
  }
  if (newPhotos.length > 0) {
    photosData.photos.push(...newPhotos)
    photosData.photos.sort((a, b) => Date.parse(a.utc) - Date.parse(b.utc))
  }
  photosData.lastUpdated = new Date().toISOString()
  writeFileSync('data/photos.json', JSON.stringify(photosData, null, 2))
  saveState(state)
  console.log(`  Photos: ${photosData.photos.length} total`)
  console.log('  Data fetch complete.')
}

main().catch(err => {
  console.error('Data fetch failed:', err)
  process.exit(1)
})
