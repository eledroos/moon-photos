import { createMetTicker } from '../data/met.js'
import type { TrajectoryData, BodyData, PhotosData, Photo } from '../../shared/types.js'
import { getCurrentPosition, getCurrentVelocity, vectorMagnitude, vectorDistance, interpolatePosition } from '../data/interpolate.js'
import { formatMet } from '../data/met.js'
import { openPhotoPanel } from './photo-detail.js'
import { flyTo } from '../navigation/fly-to.js'
import { SCALE } from '../scene/setup.js'
import * as THREE from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'

let metTickerCleanup: (() => void) | null = null

export function createTelemetryBar(options?: {
  camera?: THREE.PerspectiveCamera
  controls?: OrbitControls
}): {
  element: HTMLElement
  update: (trajectory: TrajectoryData, moon: BodyData, photos: PhotosData) => void
} {
  const bar = document.createElement('header')
  bar.className = 'telemetry-bar glass-panel'

  // Clean, consistent layout — all items inline, no multi-line stacking
  bar.innerHTML = `
    <button class="telem-btn" id="menu-btn" aria-label="Menu">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12h18M3 6h18M3 18h18"/>
      </svg>
    </button>

    <div class="telem-separator"></div>

    <div class="telem-item">
      <span class="telem-label">MET</span>
      <span class="telem-value met-counter" id="met-display">000:00:00:00</span>
    </div>

    <div class="telem-separator desktop-only"></div>

    <div class="telem-item desktop-only">
      <span class="telem-label">Earth</span>
      <span class="telem-value" id="dist-earth">--</span>
    </div>

    <div class="telem-item desktop-only">
      <span class="telem-label">Moon</span>
      <span class="telem-value" id="dist-moon">--</span>
    </div>

    <div class="telem-item desktop-only">
      <span class="telem-label">Vel</span>
      <span class="telem-value" id="velocity">--</span>
    </div>

    <div class="telem-separator desktop-only"></div>

    <button class="telem-btn" id="photo-grid-btn" title="Browse photos">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
      <span id="photo-count">0</span>
    </button>

    <span class="telem-btn" style="cursor:default;opacity:0.6;font-size:10px;">Mission Complete</span>
  `

  const uiLayer = document.getElementById('ui-layer')
  if (uiLayer) uiLayer.appendChild(bar)

  // Add scoped styles
  if (!document.getElementById('telem-styles')) {
    const style = document.createElement('style')
    style.id = 'telem-styles'
    style.textContent = `
      .telemetry-bar {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        margin-top: 30px; /* below marquee bar + gap */
      }
      .telem-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border: 1px solid var(--glass-border);
        border-radius: 6px;
        background: var(--glass-bg);
        color: var(--text-primary);
        font-family: var(--font-ui);
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.15s;
      }
      .telem-btn:hover {
        background: rgba(255,255,255,0.12);
        border-color: rgba(255,255,255,0.2);
      }
      .telem-btn-accent {
        background: var(--accent-active);
        border-color: var(--accent-active);
        color: #fff;
        font-weight: 600;
      }
      .telem-btn-accent:hover {
        background: #e86a1c;
        border-color: #e86a1c;
        box-shadow: 0 2px 10px rgba(213,94,15,0.4);
      }
      .telem-separator {
        width: 1px;
        height: 24px;
        background: rgba(255,255,255,0.1);
        margin: 0 4px;
      }
      .telem-item {
        display: flex;
        align-items: baseline;
        gap: 6px;
      }
      .telem-label {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: var(--text-secondary);
      }
      .telem-value {
        font-family: var(--font-data);
        font-size: 14px;
        color: var(--telemetry-data);
        font-variant-numeric: tabular-nums;
      }
      .telem-value.met-counter {
        font-size: 16px;
        color: var(--text-primary);
        font-weight: 700;
      }
      @media (max-width: 767px) {
        .telemetry-bar { padding: 6px 10px; }
        .telem-value.met-counter { font-size: 14px; }
      }
    `
    document.head.appendChild(style)
  }

  // MET ticker
  const metDisplay = bar.querySelector('#met-display')!
  metTickerCleanup = createMetTicker((formatted) => {
    metDisplay.textContent = formatted
  })

  // Photo grid
  let gridOverlay: HTMLElement | null = null
  let allPhotos: Photo[] = []

  bar.querySelector('#photo-grid-btn')!.addEventListener('click', () => {
    if (gridOverlay) {
      gridOverlay.remove()
      gridOverlay = null
      return
    }
    gridOverlay = createPhotoGrid(allPhotos, options?.camera, options?.controls)
  })

  function update(trajectory: TrajectoryData, moon: BodyData, photos: PhotosData): void {
    const pos = getCurrentPosition(trajectory.vectors)
    // Archive mode: use flyby moon position for distance calc
    const moonPos: [number, number, number] = [-129398, -381922, -36343]
    allPhotos = photos.photos

    const distEarthEl = bar.querySelector('#dist-earth')
    if (distEarthEl) distEarthEl.textContent = `${Math.round(vectorMagnitude(pos)).toLocaleString()} km`

    const distMoonEl = bar.querySelector('#dist-moon')
    if (distMoonEl) distMoonEl.textContent = `${Math.round(vectorDistance(pos, moonPos)).toLocaleString()} km`

    const velEl = bar.querySelector('#velocity')
    if (velEl) velEl.textContent = `${getCurrentVelocity(trajectory.vectors).toFixed(2)} km/s`

    const countEl = bar.querySelector('#photo-count')
    if (countEl) countEl.textContent = `${photos.photos.length}`
  }

  return { element: bar, update }
}

/**
 * Photo grid grouped by flight day.
 */
function createPhotoGrid(
  photos: Photo[],
  camera?: THREE.PerspectiveCamera,
  controls?: OrbitControls,
): HTMLElement {
  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position: fixed;
    top: 80px; left: 50%; transform: translateX(-50%);
    width: min(90vw, 820px);
    max-height: 70vh;
    overflow-y: auto;
    background: rgba(10, 14, 26, 0.95);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    padding: 20px;
    z-index: 25;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  `

  // Header
  const header = document.createElement('div')
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;'
  header.innerHTML = `
    <span style="font-size:15px;font-weight:600;color:var(--text-primary);">${photos.length} Mission Photos</span>
    <button class="telem-btn" id="grid-close">&times;</button>
  `
  overlay.appendChild(header)

  // Group by flight day
  const byDay = new Map<number, Photo[]>()
  for (const p of photos) {
    const day = p.flightDay
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(p)
  }

  const sortedDays = [...byDay.keys()].sort((a, b) => a - b)

  for (const day of sortedDays) {
    const dayPhotos = byDay.get(day)!

    // Day header
    const dayHeader = document.createElement('div')
    dayHeader.style.cssText = `
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--trajectory);
      margin: 16px 0 8px 0;
      padding-bottom: 4px;
      border-bottom: 1px solid rgba(100,200,220,0.15);
    `
    dayHeader.textContent = `Flight Day ${day}`
    if (day === sortedDays[0]) dayHeader.style.marginTop = '0'
    overlay.appendChild(dayHeader)

    // Grid for this day
    const grid = document.createElement('div')
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;'

    for (const photo of dayPhotos) {
      const card = document.createElement('div')
      card.style.cssText = `
        cursor: pointer;
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.06);
        transition: border-color 0.15s, transform 0.1s;
        background: rgba(0,0,0,0.3);
      `

      card.innerHTML = `
        <div style="aspect-ratio:4/3;background:#0a0e1a;overflow:hidden;">
          <img src="${photo.urls.thumb}" alt="${photo.caption}"
               style="width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 0.3s;"
               onload="this.style.opacity='1'"
          >
        </div>
        <div style="padding:5px 7px;">
          <div style="font-size:11px;font-weight:500;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${photo.caption || photo.id}</div>
          <div style="font-size:9px;color:var(--text-secondary);margin-top:2px;font-family:var(--font-data);">${new Date(photo.utc).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} UTC</div>
        </div>
      `

      card.addEventListener('mouseenter', () => {
        card.style.borderColor = 'rgba(213,94,15,0.5)'
        card.style.transform = 'translateY(-2px)'
      })
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = 'rgba(255,255,255,0.06)'
        card.style.transform = 'none'
      })

      card.addEventListener('click', () => {
        overlay.remove()
        openPhotoPanel(photo, photos)
        if (camera && controls) {
          const target = new THREE.Vector3(
            photo.pos[0] * SCALE, photo.pos[2] * SCALE, -photo.pos[1] * SCALE,
          )
          flyTo(target, camera, controls)
        }
      })

      grid.appendChild(card)
    }

    overlay.appendChild(grid)
  }

  overlay.querySelector('#grid-close')!.addEventListener('click', () => overlay.remove())
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onEsc) }
  })

  document.body.appendChild(overlay)
  return overlay
}

export function destroyTelemetryBar(): void {
  if (metTickerCleanup) { metTickerCleanup(); metTickerCleanup = null }
}
