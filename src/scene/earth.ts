import * as THREE from 'three'
import { SCALE, onAnimate } from './setup.js'

const EARTH_RADIUS = 6371 * SCALE  // 6.371 units

// Earth's sidereal rotation period in seconds
const SIDEREAL_DAY_S = 86164.0905

/**
 * Compute Greenwich Mean Sidereal Time in radians for a given Date.
 * Simplified formula from the US Naval Observatory.
 */
function gmstRadians(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5
  const t = (jd - 2451545.0) / 36525.0
  // GMST in degrees
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
    + 0.000387933 * t * t - t * t * t / 38710000.0
  gmst = ((gmst % 360) + 360) % 360
  return gmst * Math.PI / 180
}

export function createEarth(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group()

  // Base sphere
  const geometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64)
  const material = new THREE.MeshPhongMaterial({
    color: 0x0689E4,
    emissive: 0x011328,
    specular: 0x444444,
    shininess: 40,
  })
  const earth = new THREE.Mesh(geometry, material)
  group.add(earth)

  // Load texture
  const textureLoader = new THREE.TextureLoader()
  textureLoader.load('/textures/earth_daymap_2k.jpg', (texture) => {
    material.map = texture
    material.color.set(0xffffff)
    material.needsUpdate = true
  })

  // Cloud layer
  const cloudGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.01, 64, 64)
  const cloudMat = new THREE.MeshPhongMaterial({
    transparent: true,
    opacity: 0.3,
    color: 0xffffff,
    depthWrite: false,
  })
  const clouds = new THREE.Mesh(cloudGeo, cloudMat)
  group.add(clouds)

  textureLoader.load('/textures/earth_clouds_2k.jpg', (texture) => {
    cloudMat.map = texture
    cloudMat.alphaMap = texture
    cloudMat.needsUpdate = true
  })

  // Atmosphere glow rim
  const atmosGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.05, 32, 32)
  const atmosMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        gl_FragColor = vec4(0.4, 0.8, 1.0, 1.0) * intensity;
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  })
  const atmosphere = new THREE.Mesh(atmosGeo, atmosMat)
  group.add(atmosphere)

  group.position.set(0, 0, 0)
  // Render Earth first so it writes depth buffer before trajectory lines
  group.renderOrder = 0
  scene.add(group)

  // Real sidereal rotation — update every frame but it's just setting a value, not searching arrays
  onAnimate(() => {
    const now = new Date()
    const angle = gmstRadians(now)
    earth.rotation.y = angle
    clouds.rotation.y = angle + 0.02 // Clouds drift slightly relative to surface
  })

  return group
}
