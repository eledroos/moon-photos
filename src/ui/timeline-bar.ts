import * as THREE from 'three'
import type { Photo, TrajectoryData } from '../../shared/types.js'
import type { PhotoCluster } from '../scene/markers.js'
import { getPointProgress } from '../scene/trajectory.js'
import { openPhotoPanel } from './photo-detail.js'
import { SCALE } from '../scene/setup.js'
import { flyTo } from '../navigation/fly-to.js'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'

interface TimelineBarOptions {
  trajectoryData: TrajectoryData
  photos: Photo[]
  clusters: PhotoCluster[]
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
}

export function createTimelineBar(options: TimelineBarOptions): HTMLElement {
  const { trajectoryData, photos, clusters, camera, controls } = options

  const bar = document.createElement('aside')
  bar.id = 'timeline-bar'
  bar.style.cssText = `
    position: fixed;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    height: 70vh;
    width: 20px;
    z-index: 10;
    display: flex;
    justify-content: center;
  `

  const track = document.createElement('div')
  track.style.cssText = `
    position: relative;
    width: 2px;
    height: 100%;
    background: rgba(100, 200, 220, 0.12);
    border-radius: 2px;
  `
  bar.appendChild(track)

  // Progress fill
  const progressFill = document.createElement('div')
  progressFill.id = 'timeline-progress'
  progressFill.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    height: 0%;
    background: #64C8DC;
    border-radius: 2px;
    box-shadow: 0 0 4px rgba(100, 200, 220, 0.5);
    transition: height 2s linear;
  `
  track.appendChild(progressFill)

  // Three milestone markers: Earth (top), Moon (middle), Earth Return (bottom)
  const milestones = [
    { label: 'Earth', pos: 0, color: '#64C8DC', size: '9px' },
    { label: 'Moon', pos: 0.5, color: '#8899AA', size: '9px' },
    { label: 'Splashdown', pos: 1.0, color: '#64C8DC', size: '9px' },
  ]

  for (const ms of milestones) {
    // Dot
    const dot = document.createElement('div')
    dot.style.cssText = `
      position: absolute;
      left: 50%; top: ${ms.pos * 100}%;
      transform: translate(-50%, -50%);
      width: ${ms.size}; height: ${ms.size};
      background: ${ms.color};
      border-radius: 50%;
      z-index: 2;
      pointer-events: none;
    `
    track.appendChild(dot)

    // Label
    const label = document.createElement('div')
    label.style.cssText = `
      position: absolute;
      right: 16px;
      top: ${ms.pos * 100}%;
      transform: translateY(-50%);
      white-space: nowrap;
      font-family: var(--font-ui, 'Inter', sans-serif);
      font-size: 9px;
      font-weight: 600;
      color: ${ms.color};
      text-transform: uppercase;
      letter-spacing: 0.8px;
      opacity: 0.7;
      pointer-events: none;
    `
    label.textContent = ms.label
    track.appendChild(label)
  }

  // Photo dots — mapped to the full journey (outbound + return)
  // The flyby happens roughly at the midpoint of the timeline
  const flybyProgress = getPointProgress(trajectoryData, '2026-04-06T23:00:00Z')

  for (const cluster of clusters) {
    const rawProgress = getPointProgress(trajectoryData, cluster.photos[0].utc)

    // Map to 0-1 where 0=Earth, 0.5=Moon flyby, 1=Splashdown
    let timelinePos: number
    if (rawProgress <= flybyProgress) {
      // Outbound: 0 → 0.5
      timelinePos = (rawProgress / flybyProgress) * 0.5
    } else {
      // Return: 0.5 → 1.0
      timelinePos = 0.5 + ((rawProgress - flybyProgress) / (1 - flybyProgress)) * 0.5
    }

    const dot = document.createElement('div')
    const count = cluster.photos.length
    const size = count >= 4 ? 14 : count >= 2 ? 11 : 8
    dot.style.cssText = `
      position: absolute;
      left: 50%; top: ${timelinePos * 100}%;
      transform: translate(-50%, -50%);
      width: ${size}px;
      height: ${size}px;
      background: rgba(69, 119, 234, 0.7);
      border: 1.5px solid rgba(100, 200, 220, 0.6);
      border-radius: 50%;
      cursor: pointer;
      z-index: 3;
      transition: all 0.15s;
    `

    // Rich tooltip element
    const tooltip = document.createElement('div')
    tooltip.style.cssText = `
      position: absolute;
      right: 22px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(10, 14, 26, 0.9);
      border: 1px solid rgba(69, 119, 234, 0.5);
      border-radius: 6px;
      padding: 8px 10px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s;
      white-space: nowrap;
      font-family: var(--font-ui, 'Inter', sans-serif);
      z-index: 10;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      min-width: 140px;
    `

    const photo = cluster.photos[0]
    const date = new Date(photo.utc)
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    const metH = Math.floor(photo.met / 3600)
    const metM = Math.floor((photo.met % 3600) / 60)

    if (count > 1) {
      tooltip.innerHTML = `
        <div style="font-size:11px;font-weight:600;color:#F0F0F0;margin-bottom:3px;">${cluster.photos.length} photos</div>
        <div style="font-size:10px;color:#6FD7EC;font-family:var(--font-data,'Space Mono',monospace);">MET +${metH}h${String(metM).padStart(2,'0')}m</div>
        <div style="font-size:9px;color:#8899AA;margin-top:2px;">${dateStr} ${timeStr} UTC</div>
        <div style="font-size:10px;color:#ccc;margin-top:4px;white-space:normal;max-width:180px;line-height:1.3;">${cluster.photos.map(p => p.caption || p.id).join(', ')}</div>
      `
    } else {
      tooltip.innerHTML = `
        <div style="font-size:11px;font-weight:600;color:#F0F0F0;margin-bottom:3px;">${photo.caption || photo.id}</div>
        <div style="font-size:10px;color:#6FD7EC;font-family:var(--font-data,'Space Mono',monospace);">MET +${metH}h${String(metM).padStart(2,'0')}m</div>
        <div style="font-size:9px;color:#8899AA;margin-top:2px;">${dateStr} ${timeStr} UTC</div>
      `
    }

    dot.appendChild(tooltip)

    dot.addEventListener('mouseenter', () => {
      dot.style.background = 'rgba(255, 255, 255, 0.9)'
      dot.style.borderColor = '#FFF'
      dot.style.boxShadow = '0 0 8px rgba(255,255,255,0.6)'
      dot.style.transform = 'translate(-50%, -50%) scale(1.4)'
      tooltip.style.opacity = '1'
    })
    dot.addEventListener('mouseleave', () => {
      dot.style.background = 'rgba(69, 119, 234, 0.7)'
      dot.style.borderColor = 'rgba(100, 200, 220, 0.6)'
      dot.style.boxShadow = 'none'
      dot.style.transform = 'translate(-50%, -50%)'
      tooltip.style.opacity = '0'
    })
    dot.addEventListener('click', () => {
      openPhotoPanel(cluster.photos[0], photos)
      const photo = cluster.photos[0]
      const target = new THREE.Vector3(
        photo.pos[0] * SCALE, photo.pos[2] * SCALE, -photo.pos[1] * SCALE,
      )
      flyTo(target, camera, controls)
    })

    track.appendChild(dot)
  }

  // Current Orion position dot
  const currentDot = document.createElement('div')
  currentDot.id = 'timeline-current'
  currentDot.style.cssText = `
    position: absolute;
    left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    width: 10px; height: 10px;
    background: #D55E0F;
    border-radius: 50%;
    box-shadow: 0 0 8px #D55E0F;
    z-index: 4;
    pointer-events: none;
    transition: top 2s linear;
  `
  track.appendChild(currentDot)

  // Update every 5s
  function updatePosition() {
    const nowUtc = new Date().toISOString()
    const rawProgress = getPointProgress(trajectoryData, nowUtc)

    let timelinePos: number
    if (rawProgress <= flybyProgress) {
      timelinePos = (rawProgress / flybyProgress) * 0.5
    } else {
      timelinePos = 0.5 + ((rawProgress - flybyProgress) / (1 - flybyProgress)) * 0.5
    }

    const pct = `${timelinePos * 100}%`
    progressFill.style.height = pct
    currentDot.style.top = pct
  }

  updatePosition()
  setInterval(updatePosition, 5000)

  const uiLayer = document.getElementById('ui-layer')
  if (uiLayer) uiLayer.appendChild(bar)

  return bar
}
