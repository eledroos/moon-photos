import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { PerspectiveCamera } from 'three'

/**
 * Vertical zoom slider positioned below the timeline bar on the right.
 */
export function createZoomSlider(
  camera: PerspectiveCamera,
  controls: OrbitControls,
): HTMLElement {
  const container = document.createElement('div')
  container.id = 'zoom-slider'
  container.style.cssText = `
    position: fixed;
    right: 18px;
    bottom: 24px;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  `

  // Zoom in button
  const zoomIn = document.createElement('button')
  zoomIn.className = 'telem-btn'
  zoomIn.style.cssText = 'padding:4px 6px;font-size:16px;line-height:1;min-width:28px;justify-content:center;'
  zoomIn.textContent = '+'
  zoomIn.title = 'Zoom in'

  // Slider (vertical)
  const slider = document.createElement('input')
  slider.type = 'range'
  slider.min = '0'
  slider.max = '100'
  slider.value = '50'
  slider.style.cssText = `
    writing-mode: vertical-lr;
    direction: rtl;
    width: 28px;
    height: 100px;
    appearance: none;
    -webkit-appearance: none;
    background: transparent;
    cursor: pointer;
  `

  // Zoom out button
  const zoomOut = document.createElement('button')
  zoomOut.className = 'telem-btn'
  zoomOut.style.cssText = 'padding:4px 6px;font-size:16px;line-height:1;min-width:28px;justify-content:center;'
  zoomOut.textContent = '−'
  zoomOut.title = 'Zoom out'

  container.appendChild(zoomIn)
  container.appendChild(slider)
  container.appendChild(zoomOut)

  // Inject slider track styles
  if (!document.getElementById('zoom-styles')) {
    const style = document.createElement('style')
    style.id = 'zoom-styles'
    style.textContent = `
      #zoom-slider input[type="range"]::-webkit-slider-track {
        width: 3px;
        background: rgba(100, 200, 220, 0.2);
        border-radius: 2px;
      }
      #zoom-slider input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--trajectory, #64C8DC);
        border: 2px solid rgba(255,255,255,0.3);
        cursor: pointer;
      }
      #zoom-slider input[type="range"]::-moz-range-track {
        width: 3px;
        background: rgba(100, 200, 220, 0.2);
        border-radius: 2px;
      }
      #zoom-slider input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--trajectory, #64C8DC);
        border: 2px solid rgba(255,255,255,0.3);
        cursor: pointer;
      }
    `
    document.head.appendChild(style)
  }

  // Map slider value (0-100) to camera distance (minDistance-maxDistance)
  const minDist = controls.minDistance  // 5
  const maxDist = controls.maxDistance  // 1500

  function sliderToDistance(val: number): number {
    // Logarithmic mapping for natural zoom feel
    const t = val / 100
    return minDist * Math.pow(maxDist / minDist, 1 - t)
  }

  function distanceToSlider(dist: number): number {
    return (1 - Math.log(dist / minDist) / Math.log(maxDist / minDist)) * 100
  }

  // Update camera distance from slider
  slider.addEventListener('input', () => {
    const targetDist = sliderToDistance(parseFloat(slider.value))
    const dir = camera.position.clone().sub(controls.target).normalize()
    camera.position.copy(controls.target).add(dir.multiplyScalar(targetDist))
  })

  // +/- buttons
  zoomIn.addEventListener('click', () => {
    slider.value = String(Math.min(100, parseFloat(slider.value) + 8))
    slider.dispatchEvent(new Event('input'))
  })
  zoomOut.addEventListener('click', () => {
    slider.value = String(Math.max(0, parseFloat(slider.value) - 8))
    slider.dispatchEvent(new Event('input'))
  })

  // Sync slider when user zooms with scroll wheel
  controls.addEventListener('change', () => {
    const dist = camera.position.distanceTo(controls.target)
    const val = distanceToSlider(dist)
    slider.value = String(Math.max(0, Math.min(100, val)))
  })

  const uiLayer = document.getElementById('ui-layer')
  if (uiLayer) uiLayer.appendChild(container)

  return container
}
