import type { Photo } from '../../shared/types.js'
import { formatMet } from '../data/met.js'

let panelElement: HTMLElement | null = null
let fullscreenElement: HTMLElement | null = null
let currentPhotos: Photo[] = []
let currentIndex = 0

export const PHOTO_SELECTED_EVENT = 'photo-selected'
export const PHOTO_CLOSED_EVENT = 'photo-closed'

export function createPhotoPanel(): HTMLElement {
  if (!document.getElementById('photo-panel-styles')) {
    const style = document.createElement('style')
    style.id = 'photo-panel-styles'
    style.textContent = `
      #photo-panel {
        position: fixed;
        left: 0; right: 0; bottom: 0;
        height: 38vh;
        min-height: 260px;
        max-height: 420px;
        background: rgba(10, 14, 26, 0.96);
        border-top: 1px solid var(--glass-border);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        transform: translateY(100%);
        transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        z-index: 20;
        display: flex;
        flex-direction: row;
      }
      #photo-panel.active { transform: translateY(0); }

      /* Left: large photo */
      .photo-bottom-image {
        flex: 0 0 55%;
        max-width: 55%;
        background: #000;
        position: relative;
        cursor: pointer;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .photo-bottom-image img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .photo-bottom-image:hover .photo-expand-hint { opacity: 1; }
      .photo-expand-hint {
        position: absolute;
        bottom: 10px; right: 10px;
        padding: 4px 10px;
        background: rgba(0,0,0,0.7);
        border-radius: 4px;
        font-size: 10px;
        color: #fff;
        opacity: 0;
        transition: opacity 0.15s;
        pointer-events: none;
      }
      .photo-bottom-nav {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 8px;
        pointer-events: none;
      }
      .photo-bottom-nav button {
        pointer-events: auto;
        width: 34px; height: 34px;
        border-radius: 50%;
        background: rgba(0,0,0,0.4);
        border: 1px solid rgba(255,255,255,0.15);
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }
      .photo-bottom-nav button:hover {
        background: var(--accent-active);
        border-color: var(--accent-active);
      }

      /* Right: info */
      .photo-bottom-info {
        flex: 1;
        padding: 18px 20px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        position: relative;
      }
      .photo-bottom-close {
        position: absolute;
        top: 12px; right: 12px;
        width: 28px; height: 28px;
        border-radius: 50%;
        background: rgba(255,255,255,0.06);
        border: 1px solid var(--glass-border);
        color: var(--text-secondary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        transition: all 0.15s;
      }
      .photo-bottom-close:hover { background: rgba(255,255,255,0.12); color: #fff; }

      .photo-bottom-fd {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: var(--accent-active);
        margin-bottom: 6px;
      }
      .photo-bottom-title {
        font-size: 17px;
        font-weight: 600;
        color: var(--text-primary);
        line-height: 1.3;
        margin-bottom: 6px;
      }
      .photo-bottom-desc {
        font-size: 12px;
        color: var(--text-secondary);
        line-height: 1.5;
        margin-bottom: 14px;
        flex-shrink: 0;
      }
      .photo-bottom-meta {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        padding: 10px 12px;
        background: rgba(0,0,0,0.25);
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.05);
      }
      .photo-bm-item {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .photo-bm-label {
        font-size: 9px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        color: var(--text-secondary);
      }
      .photo-bm-val {
        font-family: var(--font-data);
        font-size: 12px;
        color: var(--telemetry-data);
      }
      .photo-bottom-counter {
        margin-top: auto;
        padding-top: 8px;
        font-size: 10px;
        color: var(--text-secondary);
        text-align: center;
      }

      /* Fullscreen lightbox */
      #photo-fullscreen {
        position: fixed;
        inset: 0;
        z-index: 50;
        background: rgba(0,0,0,0.94);
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: zoom-out;
      }
      #photo-fullscreen.active { display: flex; }
      #photo-fullscreen img {
        max-width: 95vw;
        max-height: 78vh;
        object-fit: contain;
      }
      .fs-caption {
        text-align: center;
        padding: 14px 20px;
        max-width: 700px;
      }
      .fs-caption h3 {
        font-size: 16px;
        font-weight: 600;
        color: #F0F0F0;
        margin-bottom: 4px;
      }
      .fs-caption p {
        font-size: 12px;
        color: #8899AA;
        line-height: 1.5;
      }
      .fs-close {
        position: absolute;
        top: 16px; right: 16px;
        width: 40px; height: 40px;
        border-radius: 50%;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.2);
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        transition: all 0.15s;
      }
      .fs-close:hover { background: rgba(255,255,255,0.15); }
      .fs-nav {
        position: absolute;
        top: 50%; transform: translateY(-50%);
        width: 44px; height: 44px;
        border-radius: 50%;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.15);
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }
      .fs-nav:hover { background: var(--accent-active); border-color: var(--accent-active); }
      .fs-nav-prev { left: 16px; }
      .fs-nav-next { right: 16px; }

      @media (max-width: 767px) {
        #photo-panel {
          flex-direction: column;
          height: 80vh;
          max-height: none;
        }
        .photo-bottom-image {
          flex: 0 0 45%;
          max-width: 100%;
        }
        .photo-bottom-meta {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `
    document.head.appendChild(style)
  }

  const panel = document.createElement('div')
  panel.id = 'photo-panel'
  panel.innerHTML = `
    <div class="photo-bottom-image" id="photo-thumb-area">
      <img id="photo-img" src="" alt="">
      <div class="photo-bottom-nav">
        <button id="photo-prev"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>
        <button id="photo-next"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button>
      </div>
      <div class="photo-expand-hint">View full resolution</div>
    </div>
    <div class="photo-bottom-info">
      <button class="photo-bottom-close" id="photo-close">&times;</button>
      <div class="photo-bottom-fd" id="photo-flight-day">Flight Day --</div>
      <h2 class="photo-bottom-title" id="photo-caption">—</h2>
      <p class="photo-bottom-desc" id="photo-description">—</p>
      <div class="photo-bottom-meta">
        <div class="photo-bm-item"><span class="photo-bm-label">MET</span><span class="photo-bm-val" id="photo-met">—</span></div>
        <div class="photo-bm-item"><span class="photo-bm-label">Earth</span><span class="photo-bm-val" id="photo-dist-earth">—</span></div>
        <div class="photo-bm-item"><span class="photo-bm-label">Moon</span><span class="photo-bm-val" id="photo-dist-moon">—</span></div>
        <div class="photo-bm-item"><span class="photo-bm-label">Velocity</span><span class="photo-bm-val" id="photo-velocity">—</span></div>
        <div class="photo-bm-item"><span class="photo-bm-label">UTC</span><span class="photo-bm-val" id="photo-utc" style="font-size:10px;">—</span></div>
        <div class="photo-bm-item" id="camera-section"><span class="photo-bm-label">Camera</span><span class="photo-bm-val" id="photo-camera" style="font-size:10px;color:var(--text-primary);">—</span></div>
      </div>
      <button class="telem-btn telem-btn-accent" id="photo-fullres-btn" style="margin-top:10px;align-self:flex-start;gap:6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
        </svg>
        View Full Resolution
      </button>
      <div class="photo-bottom-counter" id="photo-counter">— / —</div>
    </div>
  `

  panel.querySelector('#photo-close')!.addEventListener('click', closePhotoPanel)
  panel.querySelector('#photo-prev')!.addEventListener('click', () => navigatePhoto('prev'))
  panel.querySelector('#photo-next')!.addEventListener('click', () => navigatePhoto('next'))
  panel.querySelector('#photo-thumb-area')!.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('button')) return
    openFullscreen()
  })
  panel.querySelector('#photo-fullres-btn')!.addEventListener('click', () => openFullscreen())

  document.addEventListener('keydown', (e) => {
    if (fullscreenElement?.classList.contains('active')) {
      if (e.key === 'Escape') closeFullscreen()
      if (e.key === 'ArrowLeft') navigatePhoto('prev')
      if (e.key === 'ArrowRight') navigatePhoto('next')
      return
    }
    if (!panel.classList.contains('active')) return
    if (e.key === 'ArrowLeft') navigatePhoto('prev')
    if (e.key === 'ArrowRight') navigatePhoto('next')
    if (e.key === 'Escape') closePhotoPanel()
  })

  // Fullscreen lightbox
  fullscreenElement = document.createElement('div')
  fullscreenElement.id = 'photo-fullscreen'
  fullscreenElement.innerHTML = `
    <button class="fs-close" id="fs-close">&times;</button>
    <button class="fs-nav fs-nav-prev" id="fs-prev"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>
    <button class="fs-nav fs-nav-next" id="fs-next"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button>
    <img id="fs-img" src="" alt="">
    <div class="fs-caption">
      <h3 id="fs-caption">—</h3>
      <p id="fs-desc">—</p>
    </div>
  `
  fullscreenElement.addEventListener('click', (e) => {
    const t = e.target as HTMLElement
    if (t === fullscreenElement || t.closest('#fs-close')) closeFullscreen()
  })
  fullscreenElement.querySelector('#fs-prev')!.addEventListener('click', () => navigatePhoto('prev'))
  fullscreenElement.querySelector('#fs-next')!.addEventListener('click', () => navigatePhoto('next'))
  document.body.appendChild(fullscreenElement)

  const uiLayer = document.getElementById('ui-layer')
  if (uiLayer) uiLayer.appendChild(panel)
  panelElement = panel
  return panel
}

function openFullscreen(): void {
  if (!fullscreenElement || currentPhotos.length === 0) return
  const photo = currentPhotos[currentIndex]
  const img = fullscreenElement.querySelector('#fs-img') as HTMLImageElement
  img.src = photo.urls.large
  img.onload = function () {
    if (img.src.includes('~large') || img.src.includes('?w=1920')) {
      img.onload = null
      img.src = photo.urls.orig
    }
  }
  img.alt = photo.caption || ''
  fullscreenElement.querySelector('#fs-caption')!.textContent = photo.caption || photo.id
  fullscreenElement.querySelector('#fs-desc')!.textContent = photo.description || ''
  fullscreenElement.classList.add('active')
}

function closeFullscreen(): void {
  if (fullscreenElement) fullscreenElement.classList.remove('active')
}

function populatePanel(photo: Photo): void {
  if (!panelElement) return
  const img = panelElement.querySelector('#photo-img') as HTMLImageElement
  img.src = photo.urls.thumb
  img.alt = photo.caption || ''
  img.onload = function () {
    if (img.src.includes('~thumb') || img.src.includes('?w=300')) {
      img.onload = function () {
        if (img.src.includes('~medium') || img.src.includes('?w=800')) {
          img.onload = null
          img.src = photo.urls.large
        }
      }
      img.src = photo.urls.medium
    }
  }
  const setText = (id: string, text: string) => {
    const el = panelElement!.querySelector(`#${id}`)
    if (el) el.textContent = text
  }
  setText('photo-caption', photo.caption || photo.id)
  setText('photo-description', photo.description || '')
  setText('photo-flight-day', `Flight Day ${photo.flightDay}`)
  setText('photo-met', formatMet(photo.met))
  setText('photo-utc', new Date(photo.utc).toUTCString().replace(' GMT', ' UTC'))
  setText('photo-dist-earth', `${Math.round(photo.distanceFromEarth).toLocaleString()} km`)
  setText('photo-dist-moon', `${Math.round(photo.distanceFromMoon).toLocaleString()} km`)
  setText('photo-velocity', `${photo.velocity.toFixed(2)} km/s`)
  const cam = panelElement.querySelector('#camera-section') as HTMLElement
  if (photo.camera) {
    cam.style.display = ''
    setText('photo-camera', `${photo.camera.make} ${photo.camera.model} · ${photo.camera.exposure} ${photo.camera.aperture}`)
  } else {
    cam.style.display = 'none'
  }
  setText('photo-counter', `${currentIndex + 1} / ${currentPhotos.length}`)
  if (fullscreenElement?.classList.contains('active')) openFullscreen()
}

export function openPhotoPanel(photo: Photo, allPhotos: Photo[]): void {
  currentPhotos = allPhotos
  currentIndex = allPhotos.findIndex(p => p.id === photo.id)
  if (currentIndex === -1) currentIndex = 0
  populatePanel(photo)
  if (panelElement) panelElement.classList.add('active')
  window.dispatchEvent(new CustomEvent(PHOTO_SELECTED_EVENT, { detail: photo }))
}

export function closePhotoPanel(): void {
  if (panelElement) panelElement.classList.remove('active')
  closeFullscreen()
  window.dispatchEvent(new CustomEvent(PHOTO_CLOSED_EVENT))
}

function navigatePhoto(direction: 'prev' | 'next'): void {
  if (currentPhotos.length === 0) return
  currentIndex = direction === 'prev'
    ? (currentIndex - 1 + currentPhotos.length) % currentPhotos.length
    : (currentIndex + 1) % currentPhotos.length
  populatePanel(currentPhotos[currentIndex])
  window.dispatchEvent(new CustomEvent(PHOTO_SELECTED_EVENT, { detail: currentPhotos[currentIndex] }))
}

export function isPhotoPanelOpen(): boolean {
  return panelElement?.classList.contains('active') ?? false
}
