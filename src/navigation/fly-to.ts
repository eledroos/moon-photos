import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

/**
 * Smoothly animate camera to look at a target position.
 * Camera is placed at an offset from the target.
 */
export function flyTo(
  target: THREE.Vector3,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  duration: number = 1500,
): Promise<void> {
  return new Promise((resolve) => {
    const startPos = camera.position.clone()
    const startTarget = controls.target.clone()

    // Position camera slightly above and behind target
    const offset = new THREE.Vector3(-5, 8, 15)
    const endPos = target.clone().add(offset)
    const endTarget = target.clone()

    const startTime = performance.now()

    function animate() {
      const elapsed = performance.now() - startTime
      const t = Math.min(elapsed / duration, 1)

      // Smooth ease-in-out
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

      camera.position.lerpVectors(startPos, endPos, ease)
      controls.target.lerpVectors(startTarget, endTarget, ease)
      controls.update()

      if (t < 1) {
        requestAnimationFrame(animate)
      } else {
        resolve()
      }
    }

    animate()
  })
}
