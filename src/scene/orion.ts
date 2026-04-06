import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { SCALE, onAnimate } from './setup.js'
import type { TrajectoryData } from '../../shared/types.js'
import { interpolatePosition, findBracketingVectors } from '../data/interpolate.js'

let orionGroup: THREE.Group | null = null
let glowRing: THREE.Mesh | null = null

export function createOrion(scene: THREE.Scene): THREE.Group {
  orionGroup = new THREE.Group()

  const loader = new GLTFLoader()
  loader.load(
    '/models/orion.glb',
    (gltf) => {
      gltf.scene.scale.setScalar(1.5)
      orionGroup!.add(gltf.scene)
      console.log('[Orion] Loaded NASA glTF model')
    },
    undefined,
    () => {
      console.log('[Orion] glTF not found, using fallback shape')
      orionGroup!.add(createFallbackOrion())
    },
  )

  // Pulsing glow ring
  const ringGeo = new THREE.RingGeometry(1.5, 2.0, 32)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xD55E0F,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5,
  })
  glowRing = new THREE.Mesh(ringGeo, ringMat)
  orionGroup.add(glowRing)

  scene.add(orionGroup)

  onAnimate((_delta, elapsed) => {
    if (glowRing) {
      const pulseScale = 1 + Math.sin(elapsed * 3) * 0.3
      glowRing.scale.set(pulseScale, pulseScale, pulseScale)
      ;(glowRing.material as THREE.MeshBasicMaterial).opacity = 0.8 - (pulseScale - 1)
    }
  })

  return orionGroup
}

function createFallbackOrion(): THREE.Group {
  const group = new THREE.Group()

  const coneGeo = new THREE.ConeGeometry(0.8, 2.0, 16)
  const coneMat = new THREE.MeshPhongMaterial({ color: 0xCCCCCC, emissive: 0x222222 })
  const cone = new THREE.Mesh(coneGeo, coneMat)
  cone.rotation.x = Math.PI / 2
  group.add(cone)

  const cylGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.5, 16)
  const cylMat = new THREE.MeshPhongMaterial({ color: 0x888888, emissive: 0x111111 })
  const cyl = new THREE.Mesh(cylGeo, cylMat)
  cyl.rotation.x = Math.PI / 2
  cyl.position.z = -1.5
  group.add(cyl)

  const wingGeo = new THREE.BoxGeometry(6, 0.05, 1.5)
  const wingMat = new THREE.MeshPhongMaterial({ color: 0x1a3a6a, emissive: 0x0a1a3a })
  const wing1 = new THREE.Mesh(wingGeo, wingMat)
  wing1.position.set(0, 0, -1.5)
  group.add(wing1)

  return group
}

/**
 * Update Orion position using REAL interpolated coordinates from trajectory data.
 * NOT using curve.getPointAt (which uses arc-length parameterization that doesn't match time).
 */
export function updateOrionPosition(
  trajectoryData: TrajectoryData,
  _curve: THREE.CatmullRomCurve3,
): void {
  if (!orionGroup) return

  const utc = new Date().toISOString()

  // Get real interpolated position from trajectory vectors
  const pos = interpolatePosition(trajectoryData.vectors, utc)

  // Convert ecliptic J2000 → Three.js coordinates, apply scale
  const x = pos[0] * SCALE
  const y = pos[2] * SCALE    // ecliptic Z → Three.js Y
  const z = -pos[1] * SCALE   // ecliptic Y → Three.js -Z

  orionGroup.position.set(x, y, z)

  // Orient along velocity: look toward position slightly ahead in time
  const futureUtc = new Date(Date.now() + 60000).toISOString() // 1 minute ahead
  const futurePos = interpolatePosition(trajectoryData.vectors, futureUtc)
  const lookTarget = new THREE.Vector3(
    futurePos[0] * SCALE,
    futurePos[2] * SCALE,
    -futurePos[1] * SCALE,
  )
  orionGroup.lookAt(lookTarget)
}
