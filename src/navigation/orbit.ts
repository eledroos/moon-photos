import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { SceneContext } from '../scene/setup.js'
import type { PhotoMarker } from '../scene/markers.js'
import type { Photo } from '../../shared/types.js'
import { highlightMarker, unhighlightMarker } from '../scene/markers.js'
import { openPhotoPanel } from '../ui/photo-detail.js'
import { flyTo } from './fly-to.js'

interface OrbitSetupOptions {
  ctx: SceneContext
  markers: PhotoMarker[]
  allPhotos: Photo[]
  tooltip: {
    show: (x: number, y: number, thumbUrl: string, caption: string, flightDay: number) => void
    hide: () => void
  }
}

/**
 * Walk up the parent chain to find the PhotoMarker group.
 */
function findMarkerParent(object: THREE.Object3D, markers: PhotoMarker[]): PhotoMarker | null {
  let current: THREE.Object3D | null = object
  while (current) {
    if (markers.includes(current as PhotoMarker)) {
      return current as PhotoMarker
    }
    current = current.parent
  }
  return null
}

export function setupOrbitControls(options: OrbitSetupOptions & { orionPosition?: THREE.Vector3 }): OrbitControls {
  const { ctx, markers, allPhotos, tooltip, orionPosition } = options
  const { camera, renderer } = ctx

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 5
  controls.maxDistance = 1500

  // Start camera near Orion with gentle auto-rotate
  if (orionPosition) {
    controls.target.copy(orionPosition)
    camera.position.set(
      orionPosition.x + 20,
      orionPosition.y + 15,
      orionPosition.z + 30,
    )
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.4  // Slow orbit

    // Stop auto-rotate on first user interaction
    const stopAutoRotate = () => {
      controls.autoRotate = false
      renderer.domElement.removeEventListener('pointerdown', stopAutoRotate)
      renderer.domElement.removeEventListener('wheel', stopAutoRotate)
    }
    renderer.domElement.addEventListener('pointerdown', stopAutoRotate)
    renderer.domElement.addEventListener('wheel', stopAutoRotate)
  }

  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  let hoveredMarker: PhotoMarker | null = null

  // Collect all raycastable children from marker groups
  function getMarkerChildren(): THREE.Object3D[] {
    const children: THREE.Object3D[] = []
    for (const marker of markers) {
      marker.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          children.push(child)
        }
      })
    }
    return children
  }

  const raycastTargets = getMarkerChildren()

  renderer.domElement.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(raycastTargets)

    if (intersects.length > 0) {
      const marker = findMarkerParent(intersects[0].object, markers)
      if (!marker) return

      if (hoveredMarker !== marker) {
        if (hoveredMarker) unhighlightMarker(hoveredMarker)
        hoveredMarker = marker
        highlightMarker(marker)

        const photo = marker.userData.photo
        tooltip.show(event.clientX, event.clientY, photo.urls.thumb, photo.caption, photo.flightDay)
      } else {
        tooltip.show(event.clientX, event.clientY,
          hoveredMarker.userData.photo.urls.thumb,
          hoveredMarker.userData.photo.caption,
          hoveredMarker.userData.photo.flightDay)
      }

      renderer.domElement.style.cursor = 'pointer'
    } else {
      if (hoveredMarker) {
        unhighlightMarker(hoveredMarker)
        hoveredMarker = null
        tooltip.hide()
      }
      renderer.domElement.style.cursor = 'default'
    }
  })

  renderer.domElement.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('.glass-panel') ||
        (event.target as HTMLElement).closest('button')) return

    if (hoveredMarker) {
      const photo = hoveredMarker.userData.photo
      openPhotoPanel(photo, allPhotos)
      flyTo(hoveredMarker.position, camera, controls)
    }
  })

  return controls
}
