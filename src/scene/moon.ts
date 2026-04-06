import * as THREE from 'three'
import { SCALE } from './setup.js'
import type { BodyData } from '../../shared/types.js'
import { interpolatePosition } from '../data/interpolate.js'

const MOON_RADIUS = 1737 * SCALE  // 1.737 units

let moonMesh: THREE.Mesh | null = null

export function createMoon(scene: THREE.Scene): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(MOON_RADIUS, 32, 32)
  const material = new THREE.MeshPhongMaterial({
    color: 0x8899AA,
  })
  moonMesh = new THREE.Mesh(geometry, material)
  scene.add(moonMesh)

  const textureLoader = new THREE.TextureLoader()
  textureLoader.load('/textures/moon_2k.jpg', (texture) => {
    material.map = texture
    material.color.set(0xffffff)
    material.needsUpdate = true
  })

  return moonMesh
}

/**
 * Draw the Moon's orbital path as a faint line through all moon.json vectors.
 */
export function createMoonOrbit(scene: THREE.Scene, moonData: BodyData): THREE.Line {
  const points = moonData.vectors.map(v => new THREE.Vector3(
    v.pos[0] * SCALE,
    v.pos[2] * SCALE,
    -v.pos[1] * SCALE,
  ))

  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
  const curvePoints = curve.getPoints(500)
  const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints)
  const material = new THREE.LineBasicMaterial({
    color: 0x8899AA,
    transparent: true,
    opacity: 0.25,
  })
  const line = new THREE.Line(geometry, material)
  scene.add(line)
  return line
}

export function updateMoonPosition(moonData: BodyData): void {
  if (!moonMesh) return
  const utc = new Date().toISOString()
  const pos = interpolatePosition(moonData.vectors, utc)
  moonMesh.position.set(pos[0] * SCALE, pos[2] * SCALE, -pos[1] * SCALE)
}
