#!/usr/bin/env bash
set -euo pipefail

# Build static site with pre-fetched data for Cloudflare Pages deployment.
# Fetches trajectory, moon, sun, and photo data, bundles as static JSON,
# then runs the Vite build.

echo "=== Artemis II Static Build ==="

# Ensure dependencies and assets
echo "[1/4] Checking assets..."
npm run setup 2>/dev/null || true

# Ensure config exists
if [ ! -f config.json ]; then
  if [ -f config.example.json ]; then
    echo "[!] No config.json found. Copying from config.example.json"
    cp config.example.json config.json
  else
    echo "[!] ERROR: No config.json or config.example.json"
    exit 1
  fi
fi

# Fetch data using the server's fetcher (run it briefly to populate data/)
echo "[2/4] Fetching mission data from NASA APIs..."
mkdir -p data

npx tsx -e "
import { readFileSync, writeFileSync, existsSync } from 'fs'

// Load config
const config = JSON.parse(readFileSync('config.json', 'utf-8'))

// Import fetchers
const { fetchHorizons, parseHorizonsResult, parseHorizonsBodyResult } = await import('./server/fetchers/horizons.js')
const { fetchAndProcessPhotos } = await import('./server/fetchers/photos.js')
const { loadState, saveState, defaultState } = await import('./server/utils/state.js')

const state = existsSync('data/state.json') ? loadState() : defaultState()

// Fetch trajectory (multi-resolution)
console.log('  Fetching trajectory (near-Earth 2-min + deep-space 15-min)...')
const nearResult = await fetchHorizons({ command: config.mission.horizonsId, startTime: '2026-04-02T02:00:00', stopTime: '2026-04-03T02:00:00', stepMin: 2, baseUrl: config.api.horizonsBaseUrl })
const nearVectors = parseHorizonsResult(nearResult)
const deepResult = await fetchHorizons({ command: config.mission.horizonsId, startTime: '2026-04-03T02:15:00', stopTime: '2026-04-10T23:00:00', stepMin: 15, baseUrl: config.api.horizonsBaseUrl })
const deepVectors = parseHorizonsResult(deepResult)
const trajectoryData = {
  fetchedAt: new Date().toISOString(),
  source: 'JPL Horizons COMMAND=' + config.mission.horizonsId,
  referenceFrame: 'ecliptic_j2000_geocentric',
  units: { position: 'km', velocity: 'km/s' },
  vectors: [...nearVectors, ...deepVectors],
}
writeFileSync('data/trajectory.json', JSON.stringify(trajectoryData, null, 2))
console.log('  Trajectory: ' + trajectoryData.vectors.length + ' vectors')

// Fetch Moon
console.log('  Fetching Moon...')
const moonResult = await fetchHorizons({ command: config.mission.moonId, startTime: '2026-04-02T02:00:00', stopTime: '2026-04-10T23:00:00', stepMin: 60, baseUrl: config.api.horizonsBaseUrl })
const moonData = { fetchedAt: new Date().toISOString(), source: 'JPL Horizons COMMAND=' + config.mission.moonId, vectors: parseHorizonsBodyResult(moonResult) }
writeFileSync('data/moon.json', JSON.stringify(moonData, null, 2))
console.log('  Moon: ' + moonData.vectors.length + ' vectors')

// Fetch Sun
console.log('  Fetching Sun...')
const sunResult = await fetchHorizons({ command: config.mission.sunId, startTime: '2026-04-02T02:00:00', stopTime: '2026-04-10T23:00:00', stepMin: 60, baseUrl: config.api.horizonsBaseUrl })
const sunData = { fetchedAt: new Date().toISOString(), source: 'JPL Horizons COMMAND=' + config.mission.sunId, vectors: parseHorizonsBodyResult(sunResult) }
writeFileSync('data/sun.json', JSON.stringify(sunData, null, 2))
console.log('  Sun: ' + sunData.vectors.length + ' vectors')

// Fetch Photos
console.log('  Fetching photos (this takes a minute for EXIF downloads)...')
const newPhotos = await fetchAndProcessPhotos(config, state, trajectoryData, moonData)
let photosData = { lastUpdated: '', photos: [] }
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
console.log('  Photos: ' + photosData.photos.length + ' total')

console.log('  Data fetch complete.')
"

# Copy data into public/ so Vite bundles it as static files
echo "[3/4] Bundling data as static assets..."
mkdir -p public/api
cp data/trajectory.json public/api/trajectory.json
cp data/moon.json public/api/moon.json
cp data/sun.json public/api/sun.json
cp data/photos.json public/api/photos.json

# Create a static status endpoint
echo "{\"mode\":\"static\",\"builtAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"trajectoryVectors\":$(python3 -c "import json; print(len(json.load(open('data/trajectory.json'))['vectors']))" 2>/dev/null || echo 0),\"photos\":$(python3 -c "import json; print(len(json.load(open('data/photos.json'))['photos']))" 2>/dev/null || echo 0)}" > public/api/status.json

# Build the Vite frontend
echo "[4/4] Building frontend..."
npx vite build

echo ""
echo "=== Build complete ==="
echo "Output: dist/"
echo "Deploy dist/ to Cloudflare Pages"
