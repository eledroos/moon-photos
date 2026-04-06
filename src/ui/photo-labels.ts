import * as THREE from 'three'
import type { PhotoCluster } from '../scene/markers.js'
import { onAnimate } from '../scene/setup.js'
import { openPhotoPanel } from './photo-detail.js'
import type { Photo } from '../../shared/types.js'

interface ClusterLabel {
  element: HTMLElement
  lineEl: SVGLineElement
  position: THREE.Vector3
  cluster: PhotoCluster
}

const labels: ClusterLabel[] = []
let allPhotos: Photo[] = []

/**
 * Create floating label cards for photo clusters with connector lines to ghost markers.
 */
export function createPhotoLabels(
  clusters: PhotoCluster[],
  photos: Photo[],
  camera: THREE.PerspectiveCamera,
): HTMLElement {
  allPhotos = photos

  const container = document.createElement('div')
  container.id = 'photo-labels'
  container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;overflow:hidden;'
  document.body.appendChild(container)

  // SVG layer for connector lines
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;'
  container.appendChild(svg)

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i]

    // Connector line (SVG)
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('stroke', '#D55E0F')
    line.setAttribute('stroke-width', '1')
    line.setAttribute('stroke-opacity', '0.4')
    line.setAttribute('stroke-dasharray', '3,3')
    svg.appendChild(line)

    // Label card
    const el = document.createElement('div')
    el.className = 'photo-label-card'
    el.style.cssText = `
      position: absolute;
      font-family: var(--font-ui, 'Inter', sans-serif);
      font-size: 12px;
      font-weight: 500;
      color: #F0F0F0;
      background: rgba(213, 94, 15, 0.2);
      border: 1px solid rgba(213, 94, 15, 0.5);
      padding: 6px 10px;
      border-radius: 5px;
      pointer-events: auto;
      cursor: pointer;
      max-width: 180px;
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      transition: background 0.2s, border-color 0.2s, transform 0.15s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `

    if (cluster.photos.length === 1) {
      el.textContent = cluster.photos[0].caption || cluster.photos[0].id
    } else {
      const count = cluster.photos.length
      el.innerHTML = `<span style="color:#D55E0F;font-weight:600;">${count} photos</span><br><span style="font-size:10px;opacity:0.7;">${cluster.photos[0].caption || cluster.photos[0].id}</span>`
      el.style.whiteSpace = 'normal'
      el.style.lineHeight = '1.4'
    }

    el.title = cluster.photos.map(p => p.caption || p.id).join('\n')

    // Click → open photo panel
    el.addEventListener('click', () => {
      openPhotoPanel(cluster.photos[0], allPhotos)
    })

    el.addEventListener('mouseenter', () => {
      el.style.background = 'rgba(213, 94, 15, 0.3)'
      el.style.borderColor = 'rgba(213, 94, 15, 0.8)'
      el.style.transform = el.style.transform.replace(/scale\([^)]+\)/, '') + ' scale(1.05)'
      line.setAttribute('stroke-opacity', '0.8')
    })
    el.addEventListener('mouseleave', () => {
      el.style.background = 'rgba(213, 94, 15, 0.15)'
      el.style.borderColor = 'rgba(213, 94, 15, 0.4)'
      el.style.transform = el.style.transform.replace(/ ?scale\([^)]+\)/, '')
      line.setAttribute('stroke-opacity', '0.4')
    })

    container.appendChild(el)

    // Offset labels alternating left/right to reduce overlap
    labels.push({ element: el, lineEl: line, position: cluster.position.clone(), cluster })
  }

  // Project labels + lines each frame
  onAnimate(() => {
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i]
      const screenPos = label.position.clone().project(camera)

      if (screenPos.z > 1) {
        label.element.style.display = 'none'
        label.lineEl.style.display = 'none'
        continue
      }

      const markerX = (screenPos.x * 0.5 + 0.5) * window.innerWidth
      const markerY = (-screenPos.y * 0.5 + 0.5) * window.innerHeight

      if (markerX < -150 || markerX > window.innerWidth + 150 || markerY < -80 || markerY > window.innerHeight + 80) {
        label.element.style.display = 'none'
        label.lineEl.style.display = 'none'
        continue
      }

      const dist = camera.position.distanceTo(label.position)
      const opacity = dist > 500 ? 0 : dist > 200 ? (500 - dist) / 300 : 1

      if (opacity < 0.05) {
        label.element.style.display = 'none'
        label.lineEl.style.display = 'none'
        continue
      }

      label.element.style.display = 'block'
      label.lineEl.style.display = 'block'
      label.element.style.opacity = String(opacity)
      label.lineEl.setAttribute('stroke-opacity', String(opacity * 0.4))

      // Spread labels out: stagger by index to avoid overlap
      const angle = (i * 1.2) + (i % 3) * 0.8  // stagger angles
      const offsetDist = 18
      const offsetX = Math.cos(angle) * offsetDist + 10
      const offsetY = Math.sin(angle) * offsetDist
      const labelX = markerX + offsetX
      const labelY = markerY + offsetY

      label.element.style.transform = `translate(${labelX}px, ${labelY}px)`

      // Draw connector line from ghost marker to label card
      label.lineEl.setAttribute('x1', String(markerX))
      label.lineEl.setAttribute('y1', String(markerY))
      label.lineEl.setAttribute('x2', String(labelX))
      label.lineEl.setAttribute('y2', String(labelY + 10))
    }
  })

  return container
}
