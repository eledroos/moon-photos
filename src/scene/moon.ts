import * as THREE from 'three'
import { SCALE } from './setup.js'
import { FLYBY_MOON_POS } from '../data/mission-time.js'

const MOON_RADIUS = 1737 * SCALE  // 1.737 units

let moonMesh: THREE.Mesh | null = null

export function createMoon(scene: THREE.Scene): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(MOON_RADIUS, 32, 32)
  const material = new THREE.MeshPhongMaterial({
    color: 0x8899AA,
  })
  moonMesh = new THREE.Mesh(geometry, material)

  // Lock Moon at its flyby position (closest approach, Apr 6 23:45 UTC)
  moonMesh.position.set(
    FLYBY_MOON_POS[0] * SCALE,
    FLYBY_MOON_POS[2] * SCALE,    // ecliptic Z → Y
    -FLYBY_MOON_POS[1] * SCALE,   // ecliptic Y → -Z
  )

  scene.add(moonMesh)

  const textureLoader = new THREE.TextureLoader()
  textureLoader.load('/textures/moon_2k.jpg', (texture) => {
    material.map = texture
    material.color.set(0xffffff)
    material.needsUpdate = true
  })

  return moonMesh
}
