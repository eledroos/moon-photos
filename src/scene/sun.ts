import * as THREE from 'three'
import { SCALE } from './setup.js'
import type { BodyData } from '../../shared/types.js'
import { interpolatePosition } from '../data/interpolate.js'
import { FLYBY_UTC } from '../data/mission-time.js'

// The Sun is ~150M km away. We render it at a fixed position in the scene
// along the real direction, close enough to always be visible.
const SUN_DISPLAY_RADIUS = 30
const SUN_DISPLAY_DISTANCE = 800  // Close enough to always see from default camera

let sunLight: THREE.DirectionalLight | null = null
let sunGroup: THREE.Group | null = null

export function createSun(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group()
  sunGroup = group

  // Ambient light for baseline illumination
  const ambient = new THREE.AmbientLight(0xffffff, 0.4)
  scene.add(ambient)

  // Directional light from Sun direction
  sunLight = new THREE.DirectionalLight(0xffffff, 1.5)
  scene.add(sunLight)

  // Sun sphere (always bright, emissive)
  const geometry = new THREE.SphereGeometry(SUN_DISPLAY_RADIUS, 32, 32)
  const material = new THREE.MeshBasicMaterial({
    color: 0xFFF5E0,
  })
  const sunMesh = new THREE.Mesh(geometry, material)
  group.add(sunMesh)

  // Load texture
  const textureLoader = new THREE.TextureLoader()
  textureLoader.load('/textures/sun_2k.jpg', (texture) => {
    material.map = texture
    material.needsUpdate = true
  })

  // Glow sprite for visibility at any angle
  const glowCanvas = document.createElement('canvas')
  glowCanvas.width = 256
  glowCanvas.height = 256
  const ctx = glowCanvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255, 245, 224, 1.0)')
  gradient.addColorStop(0.1, 'rgba(255, 230, 170, 0.9)')
  gradient.addColorStop(0.3, 'rgba(255, 210, 120, 0.4)')
  gradient.addColorStop(0.6, 'rgba(255, 190, 80, 0.1)')
  gradient.addColorStop(1, 'rgba(255, 180, 50, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)

  const glowMaterial = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(glowCanvas),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const glow = new THREE.Sprite(glowMaterial)
  glow.scale.set(150, 150, 1)
  group.add(glow)

  scene.add(group)

  void SCALE
  return group
}

export function updateSunPosition(sunData: BodyData): void {
  const pos = interpolatePosition(sunData.vectors, FLYBY_UTC)

  // Real direction to Sun (normalized)
  const dir = new THREE.Vector3(pos[0], pos[2], -pos[1]).normalize()

  // Position directional light along Sun direction
  if (sunLight) {
    sunLight.position.copy(dir.clone().multiplyScalar(500))
  }

  // Position Sun group at symbolic distance along real direction
  if (sunGroup) {
    sunGroup.position.copy(dir.clone().multiplyScalar(SUN_DISPLAY_DISTANCE))
  }
}
