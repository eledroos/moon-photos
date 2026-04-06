import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { SceneContext } from '../scene/setup.js'
import type { Photo, TrajectoryData } from '../../shared/types.js'
import type { PhotoMarker } from '../scene/markers.js'
import { highlightMarker, unhighlightMarker } from '../scene/markers.js'
import { openPhotoPanel } from '../ui/photo-detail.js'
import { flyTo } from './fly-to.js'
import { getCurrentPosition } from '../data/interpolate.js'
import { SCALE } from '../scene/setup.js'

interface MobileSetupOptions {
  ctx: SceneContext
  curve: THREE.CatmullRomCurve3
  trajectoryData: TrajectoryData
  photos: Photo[]
  markers: PhotoMarker[]
}

/**
 * Mobile navigation: touch-enabled OrbitControls + tap-to-select markers.
 * Much simpler and more reliable than scroll hijacking.
 */
export function setupScrollNavigation(options: MobileSetupOptions): {
  getProgress: () => number
  jumpToProgress: (progress: number) => void
  createMinimap: () => HTMLElement
  controls: OrbitControls
} {
  const { ctx, curve, trajectoryData, photos, markers } = options
  const { camera, renderer } = ctx

  // Start camera near Orion
  const orionPos = getCurrentPosition(trajectoryData.vectors)
  const orionScenePos = new THREE.Vector3(
    orionPos[0] * SCALE,
    orionPos[2] * SCALE,
    -orionPos[1] * SCALE,
  )

  // Touch-friendly OrbitControls
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 5
  controls.maxDistance = 1500
  controls.target.copy(orionScenePos)
  camera.position.set(
    orionScenePos.x + 15,
    orionScenePos.y + 12,
    orionScenePos.z + 25,
  )
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.3

  // Stop auto-rotate on touch
  const stopAutoRotate = () => {
    controls.autoRotate = false
    renderer.domElement.removeEventListener('touchstart', stopAutoRotate)
  }
  renderer.domElement.addEventListener('touchstart', stopAutoRotate)

  // Tap to select markers (raycasting)
  const raycaster = new THREE.Raycaster()
  raycaster.params.Sprite = { threshold: 5 } // Generous touch target
  let lastTap = 0

  function getMarkerChildren(): THREE.Object3D[] {
    const children: THREE.Object3D[] = []
    for (const marker of markers) {
      marker.traverse((child) => {
        if (child instanceof THREE.Mesh) children.push(child)
      })
    }
    return children
  }

  const raycastTargets = getMarkerChildren()

  renderer.domElement.addEventListener('click', (event) => {
    // Debounce double-taps
    const now = Date.now()
    if (now - lastTap < 300) return
    lastTap = now

    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1,
    )
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(raycastTargets)

    if (intersects.length > 0) {
      // Walk up to find parent marker group
      let obj: THREE.Object3D | null = intersects[0].object
      while (obj) {
        if (markers.includes(obj as PhotoMarker)) {
          const marker = obj as PhotoMarker
          openPhotoPanel(marker.userData.photo, photos)
          flyTo(marker.position, camera, controls)
          return
        }
        obj = obj.parent
      }
    }
  })

  // Jump to now
  window.addEventListener('jump-to-now', () => {
    const pos = getCurrentPosition(trajectoryData.vectors)
    const target = new THREE.Vector3(pos[0] * SCALE, pos[2] * SCALE, -pos[1] * SCALE)
    flyTo(target, camera, controls)
  })

  function jumpToProgress(_progress: number) {
    // Not used in touch mode, but kept for interface compatibility
  }

  function createMinimap(): HTMLElement {
    // Return empty element — mobile uses the timeline bar instead
    return document.createElement('div')
  }

  return {
    getProgress: () => 0,
    jumpToProgress,
    createMinimap,
    controls,
  }
}
