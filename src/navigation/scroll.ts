import * as THREE from 'three'
import type { SceneContext } from '../scene/setup.js'
import type { Photo, TrajectoryData } from '../../shared/types.js'
import { getTrajectoryProgress } from '../scene/trajectory.js'
import { onAnimate } from '../scene/setup.js'

interface ScrollSetupOptions {
  ctx: SceneContext
  curve: THREE.CatmullRomCurve3
  trajectoryData: TrajectoryData
  photos: Photo[]
}

let scrollProgress = 0
let targetScrollProgress = 0

export function setupScrollNavigation(options: ScrollSetupOptions): {
  getProgress: () => number
  jumpToProgress: (progress: number) => void
  createMinimap: () => HTMLElement
} {
  const { ctx, curve, trajectoryData, photos } = options
  const { camera } = ctx

  // Create scroll container (tall element to capture scroll)
  const scrollContainer = document.createElement('div')
  scrollContainer.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 500vh;
    z-index: 5; pointer-events: auto;
  `
  document.body.appendChild(scrollContainer)

  // Scroll handler
  window.addEventListener('scroll', () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    targetScrollProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0
  }, { passive: true })

  // Smooth camera movement along curve
  onAnimate((delta) => {
    // Lerp toward target
    scrollProgress += (targetScrollProgress - scrollProgress) * Math.min(1, delta * 5)

    const t = Math.max(0.001, Math.min(0.999, scrollProgress))
    const point = curve.getPointAt(t)
    const lookAt = curve.getPointAt(Math.min(0.999, t + 0.02))

    camera.position.copy(point)
    // Offset camera slightly above the path
    camera.position.y += 5
    camera.lookAt(lookAt)
  })

  function jumpToProgress(progress: number) {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo({ top: progress * maxScroll, behavior: 'smooth' })
  }

  // Listen for "jump to now" events
  window.addEventListener('jump-to-now', () => {
    const utc = new Date().toISOString()
    const progress = getTrajectoryProgress(trajectoryData, utc)
    jumpToProgress(progress)
  })

  function createMinimap(): HTMLElement {
    const minimap = document.createElement('aside')
    minimap.className = 'scroll-minimap'

    // Build minimap HTML
    let dotsHtml = ''
    photos.forEach(photo => {
      const progress = getTrajectoryProgress(trajectoryData, photo.utc)
      dotsHtml += `<div class="minimap-dot" style="top: ${progress * 100}%"></div>`
    })

    minimap.innerHTML = `
      <div class="minimap-track">
        <div class="minimap-progress" id="minimap-progress"></div>

        <div class="minimap-label" style="top: 0%; color: var(--trajectory);">
          Earth
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
        </div>
        <div class="minimap-stage-zone" style="top: 8%;">Earth Orbit</div>

        <div class="minimap-tick" style="top: 15%;"></div>
        <div class="minimap-stage-zone" style="top: 50%;">Translunar Coast</div>
        <div class="minimap-tick" style="top: 85%;"></div>

        <div class="minimap-stage-zone" style="top: 92%;">Lunar Orbit</div>
        <div class="minimap-label" style="top: 100%; color: var(--text-primary);">
          Moon
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 016 6c0 7-6 12-6 12s-6-5-6-12a6 6 0 016-6z"/></svg>
        </div>

        ${dotsHtml}

        <div class="minimap-current" id="minimap-current" style="top: 0%;">
          <div class="current-label">Artemis II</div>
        </div>
      </div>
    `

    // Update minimap on animation frame
    onAnimate(() => {
      const progress = document.getElementById('minimap-progress')
      const current = document.getElementById('minimap-current')
      if (progress) progress.style.height = `${scrollProgress * 100}%`
      if (current) current.style.top = `${scrollProgress * 100}%`
    })

    const uiLayer = document.getElementById('ui-layer')
    if (uiLayer) uiLayer.appendChild(minimap)

    return minimap
  }

  return { getProgress: () => scrollProgress, jumpToProgress, createMinimap }
}
