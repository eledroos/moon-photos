import express from 'express'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import type { AppConfig, TrajectoryData, BodyData, PhotosData } from '../shared/types.js'
import { fetchHorizons, parseHorizonsResult, parseHorizonsBodyResult } from './fetchers/horizons.js'
import { fetchAndProcessPhotos } from './fetchers/photos.js'
import { loadState, saveState } from './utils/state.js'
import { startScheduler, stopScheduler } from './fetchers/scheduler.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'data')
const CONFIG_PATH = path.join(ROOT, 'config.json')

// Ensure data directory exists
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

// Load config
const config: AppConfig = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))

// Load state
let state = loadState()
state.startedAt = new Date().toISOString()

// Data holders (in-memory + on disk)
let trajectoryData: TrajectoryData | null = null
let moonData: BodyData | null = null
let sunData: BodyData | null = null
let photosData: PhotosData = { lastUpdated: '', photos: [] }

// --- Data fetching functions ---

async function fetchTrajectoryData(): Promise<void> {
  console.log('[Fetch] Fetching trajectory data (multi-resolution)...')

  // Phase 1: Near-Earth (first 24h) at 2-minute intervals — captures tight orbital curves
  const nearEarthResult = await fetchHorizons({
    command: config.mission.horizonsId,
    startTime: '2026-04-02T02:00:00',
    stopTime: '2026-04-03T02:00:00',
    stepMin: 2,
    baseUrl: config.api.horizonsBaseUrl,
  })
  const nearEarthVectors = parseHorizonsResult(nearEarthResult)
  console.log(`[Fetch] Near-Earth phase: ${nearEarthVectors.length} vectors (2-min intervals)`)

  // Phase 2: Translunar coast + flyby + return at 15-minute intervals
  const deepSpaceResult = await fetchHorizons({
    command: config.mission.horizonsId,
    startTime: '2026-04-03T02:15:00',
    stopTime: '2026-04-10T23:00:00',
    stepMin: config.polling.trajectoryStepMin,
    baseUrl: config.api.horizonsBaseUrl,
  })
  const deepSpaceVectors = parseHorizonsResult(deepSpaceResult)
  console.log(`[Fetch] Deep space phase: ${deepSpaceVectors.length} vectors (15-min intervals)`)

  // Merge: near-Earth (high-res) + deep space (normal-res)
  const vectors = [...nearEarthVectors, ...deepSpaceVectors]

  trajectoryData = {
    fetchedAt: new Date().toISOString(),
    source: `JPL Horizons COMMAND=${config.mission.horizonsId}`,
    referenceFrame: 'ecliptic_j2000_geocentric',
    units: { position: 'km', velocity: 'km/s' },
    vectors,
  }
  writeFileSync(path.join(DATA_DIR, 'trajectory.json'), JSON.stringify(trajectoryData, null, 2))
  state.lastFetch.trajectory = new Date().toISOString()
  state.totalHorizonsCalls += 2
  saveState(state)
  console.log(`[Fetch] Trajectory total: ${vectors.length} vectors`)
}

async function fetchMoonData(): Promise<void> {
  console.log('[Fetch] Fetching Moon data...')
  const result = await fetchHorizons({
    command: config.mission.moonId,
    startTime: '2026-04-02T02:00:00',
    stopTime: '2026-04-10T23:00:00',
    stepMin: config.polling.moonStepMin,
    baseUrl: config.api.horizonsBaseUrl,
  })
  const vectors = parseHorizonsBodyResult(result)
  moonData = {
    fetchedAt: new Date().toISOString(),
    source: `JPL Horizons COMMAND=${config.mission.moonId}`,
    vectors,
  }
  writeFileSync(path.join(DATA_DIR, 'moon.json'), JSON.stringify(moonData, null, 2))
  state.lastFetch.moon = new Date().toISOString()
  state.totalHorizonsCalls++
  saveState(state)
  console.log(`[Fetch] Moon: ${vectors.length} vectors`)
}

async function fetchSunData(): Promise<void> {
  console.log('[Fetch] Fetching Sun data...')
  const result = await fetchHorizons({
    command: config.mission.sunId,
    startTime: '2026-04-02T02:00:00',
    stopTime: '2026-04-10T23:00:00',
    stepMin: config.polling.sunStepMin,
    baseUrl: config.api.horizonsBaseUrl,
  })
  const vectors = parseHorizonsBodyResult(result)
  sunData = {
    fetchedAt: new Date().toISOString(),
    source: `JPL Horizons COMMAND=${config.mission.sunId}`,
    vectors,
  }
  writeFileSync(path.join(DATA_DIR, 'sun.json'), JSON.stringify(sunData, null, 2))
  state.lastFetch.sun = new Date().toISOString()
  state.totalHorizonsCalls++
  saveState(state)
  console.log(`[Fetch] Sun: ${vectors.length} vectors`)
}

async function fetchPhotoData(): Promise<void> {
  if (!trajectoryData || !moonData) {
    console.log('[Fetch] Skipping photos — trajectory/moon data not loaded yet')
    return
  }
  console.log('[Fetch] Fetching photo data...')
  const newPhotos = await fetchAndProcessPhotos(config, state, trajectoryData, moonData)
  if (newPhotos.length > 0) {
    photosData.photos.push(...newPhotos)
    // Keep photos sorted chronologically by UTC timestamp
    photosData.photos.sort((a, b) => Date.parse(a.utc) - Date.parse(b.utc))
  }
  photosData.lastUpdated = new Date().toISOString()
  writeFileSync(path.join(DATA_DIR, 'photos.json'), JSON.stringify(photosData, null, 2))
  state.lastFetch.photos = new Date().toISOString()
  saveState(state)
  console.log(`[Fetch] Photos: ${newPhotos.length} new, ${photosData.photos.length} total`)
}

// --- Load existing data from disk if available ---
function loadExistingData(): void {
  const tryLoad = <T>(filename: string): T | null => {
    const filepath = path.join(DATA_DIR, filename)
    if (existsSync(filepath)) {
      try {
        return JSON.parse(readFileSync(filepath, 'utf-8'))
      } catch { return null }
    }
    return null
  }
  trajectoryData = tryLoad('trajectory.json')
  moonData = tryLoad('moon.json')
  sunData = tryLoad('sun.json')
  photosData = tryLoad('photos.json') || { lastUpdated: '', photos: [] }
}

// --- Express app ---
const app = express()
const PORT = parseInt(process.env.PORT || '3001', 10)

// API routes — serve data files
app.get('/api/trajectory', (_req, res) => {
  if (trajectoryData) {
    res.json(trajectoryData)
  } else {
    res.status(503).json({ error: 'Trajectory data not yet loaded' })
  }
})

app.get('/api/moon', (_req, res) => {
  if (moonData) {
    res.json(moonData)
  } else {
    res.status(503).json({ error: 'Moon data not yet loaded' })
  }
})

app.get('/api/sun', (_req, res) => {
  if (sunData) {
    res.json(sunData)
  } else {
    res.status(503).json({ error: 'Sun data not yet loaded' })
  }
})

app.get('/api/photos', (_req, res) => {
  res.json(photosData)
})

app.get('/api/status', (_req, res) => {
  res.json({
    uptime: process.uptime(),
    startedAt: state.startedAt,
    lastFetch: state.lastFetch,
    knownPhotos: state.knownPhotoIds.length,
    totalPhotos: photosData.photos.length,
    failedExif: state.failedExif.length,
    totalHorizonsCalls: state.totalHorizonsCalls,
    trajectoryVectors: trajectoryData?.vectors.length ?? 0,
    moonVectors: moonData?.vectors.length ?? 0,
    sunVectors: sunData?.vectors.length ?? 0,
  })
})

// Serve static files (Vite build output) in production
const distPath = path.join(ROOT, 'dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// --- Startup sequence ---
async function startup(): Promise<void> {
  console.log('=== Artemis II Photo-Trajectory Server ===')

  // Load any existing cached data first
  loadExistingData()
  if (trajectoryData) console.log(`[Cache] Loaded ${trajectoryData.vectors.length} trajectory vectors`)
  if (moonData) console.log(`[Cache] Loaded ${moonData.vectors.length} moon vectors`)
  if (sunData) console.log(`[Cache] Loaded ${sunData.vectors.length} sun vectors`)
  if (photosData.photos.length) console.log(`[Cache] Loaded ${photosData.photos.length} photos`)

  // Fetch fresh data (trajectory/moon/sun sequentially to avoid JPL rate limits, photos incremental)
  try {
    await fetchTrajectoryData()
  } catch (err) {
    console.error('[Startup] Error fetching trajectory:', err)
    if (!trajectoryData) console.error('[Startup] No cached trajectory data available')
  }
  try {
    await fetchMoonData()
  } catch (err) {
    console.error('[Startup] Error fetching moon:', err)
    if (!moonData) console.error('[Startup] No cached moon data available')
  }
  try {
    await fetchSunData()
  } catch (err) {
    console.error('[Startup] Error fetching sun:', err)
    if (!sunData) console.error('[Startup] No cached sun data available')
  }

  try {
    await fetchPhotoData()
  } catch (err) {
    console.error('[Startup] Error fetching photos:', err)
  }

  // Start scheduler for recurring fetches
  startScheduler(
    {
      trajectoryIntervalMs: config.polling.trajectoryIntervalMs,
      photoIntervalMs: config.polling.photoIntervalMs,
    },
    {
      onFetchTrajectory: async () => {
        try { await fetchTrajectoryData() } catch (err) { console.error('[Scheduler] Trajectory error:', err) }
        try { await fetchMoonData() } catch (err) { console.error('[Scheduler] Moon error:', err) }
        try { await fetchSunData() } catch (err) { console.error('[Scheduler] Sun error:', err) }
      },
      onFetchPhotos: fetchPhotoData,
    },
  )

  // Start listening
  app.listen(PORT, () => {
    console.log(`[Server] Listening on http://localhost:${PORT}`)
    console.log(`[Server] API: /api/trajectory, /api/moon, /api/sun, /api/photos, /api/status`)
  })
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...')
  stopScheduler()
  saveState(state)
  process.exit(0)
})

process.on('SIGTERM', () => {
  stopScheduler()
  saveState(state)
  process.exit(0)
})

startup().catch(err => {
  console.error('[Fatal]', err)
  process.exit(1)
})
