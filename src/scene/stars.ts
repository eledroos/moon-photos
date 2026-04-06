import * as THREE from 'three'

// Initial procedural starfield (fast to create, replaced when HYG loads)
export function createStars(scene: THREE.Scene): THREE.Points {
  const count = 3000
  const positions = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    // Random positions on a large sphere
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = 30000 + Math.random() * 20000

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.8,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: false,
  })

  const stars = new THREE.Points(geometry, material)
  scene.add(stars)
  return stars
}

/**
 * Load HYG star catalog and replace procedural stars.
 * HYG CSV has columns: id,hip,hd,hr,gl,bf,proper,ra,dec,dist,pmra,pmdec,rv,mag,absmag,spect,ci,...
 * ra is in hours (0-24), dec in degrees (-90 to +90), mag is apparent magnitude
 */
export async function loadRealStars(
  scene: THREE.Scene,
  proceduralStars: THREE.Points,
): Promise<THREE.Points> {
  const response = await fetch('/data/hyg_v41.csv')
  const text = await response.text()

  const lines = text.split('\n')
  const header = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
  const raIdx = header.indexOf('ra')
  const decIdx = header.indexOf('dec')
  const magIdx = header.indexOf('mag')
  const ciIdx = header.indexOf('ci')  // B-V color index

  // Filter to visible stars (magnitude <= 6.5)
  const starPositions: number[] = []
  const starColors: number[] = []
  const SPHERE_RADIUS = 40000

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.replace(/"/g, ''))
    if (cols.length < Math.max(raIdx, decIdx, magIdx) + 1) continue

    const ra = parseFloat(cols[raIdx])
    const dec = parseFloat(cols[decIdx])
    const mag = parseFloat(cols[magIdx])
    const ci = parseFloat(cols[ciIdx]) || 0

    if (isNaN(ra) || isNaN(dec) || isNaN(mag)) continue
    if (mag > 6.5) continue

    // Convert RA (hours) / Dec (degrees) to 3D Cartesian
    const raRad = (ra / 24) * Math.PI * 2
    const decRad = (dec / 180) * Math.PI

    const x = SPHERE_RADIUS * Math.cos(decRad) * Math.cos(raRad)
    const y = SPHERE_RADIUS * Math.sin(decRad)
    const z = SPHERE_RADIUS * Math.cos(decRad) * Math.sin(raRad)

    starPositions.push(x, y, z)

    // B-V color index to RGB (simplified)
    const color = bvToRgb(ci)
    starColors.push(color.r, color.g, color.b)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3))

  const material = new THREE.PointsMaterial({
    vertexColors: true,
    size: 1.5,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: false,
  })

  const realStars = new THREE.Points(geometry, material)

  // Remove procedural, add real
  scene.remove(proceduralStars)
  proceduralStars.geometry.dispose()
  ;(proceduralStars.material as THREE.Material).dispose()
  scene.add(realStars)

  console.log(`[Stars] Loaded ${starPositions.length / 3} real stars from HYG catalog`)
  return realStars
}

/**
 * Convert B-V color index to approximate RGB color.
 * Based on: http://www.vendian.org/mncharity/dir3/starcolor/
 */
function bvToRgb(bv: number): { r: number; g: number; b: number } {
  // Clamp B-V to reasonable range
  bv = Math.max(-0.4, Math.min(2.0, bv))

  let r: number, g: number, b: number

  if (bv < 0) {
    // Hot blue stars
    r = 0.6 + 0.4 * (bv + 0.4) / 0.4
    g = 0.7 + 0.3 * (bv + 0.4) / 0.4
    b = 1.0
  } else if (bv < 0.4) {
    // Blue-white to white
    r = 0.8 + 0.2 * bv / 0.4
    g = 0.85 + 0.15 * bv / 0.4
    b = 1.0
  } else if (bv < 0.8) {
    // White to yellow-white
    r = 1.0
    g = 1.0 - 0.15 * (bv - 0.4) / 0.4
    b = 1.0 - 0.4 * (bv - 0.4) / 0.4
  } else if (bv < 1.2) {
    // Yellow to orange
    r = 1.0
    g = 0.85 - 0.35 * (bv - 0.8) / 0.4
    b = 0.6 - 0.3 * (bv - 0.8) / 0.4
  } else {
    // Orange to red
    r = 1.0
    g = 0.5 - 0.3 * (bv - 1.2) / 0.8
    b = 0.3 - 0.2 * (bv - 1.2) / 0.8
  }

  return { r: Math.max(0, Math.min(1, r)), g: Math.max(0, Math.min(1, g)), b: Math.max(0, Math.min(1, b)) }
}
