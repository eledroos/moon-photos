import * as THREE from 'three'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { SCALE } from './setup.js'
import type { TrajectoryData } from '../../shared/types.js'

export interface TrajectoryResult {
  curve: THREE.CatmullRomCurve3
  group: THREE.Group
}

export function createTrajectory(
  scene: THREE.Scene,
  trajectoryData: TrajectoryData,
): TrajectoryResult {
  const group = new THREE.Group()

  const points = trajectoryData.vectors.map(v => new THREE.Vector3(
    v.pos[0] * SCALE,
    v.pos[2] * SCALE,
    -v.pos[1] * SCALE,
  ))

  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')

  const NUM_SAMPLES = 5000
  const allCurvePoints = curve.getPoints(NUM_SAMPLES)

  // Archive mode: entire trajectory is traveled — one solid bold line
  const positions: number[] = []
  for (const p of allCurvePoints) positions.push(p.x, p.y, p.z)

  const geo = new LineGeometry()
  geo.setPositions(positions)
  const mat = new LineMaterial({
    color: 0x64C8DC,
    linewidth: 3,
    transparent: true,
    opacity: 0.95,
    resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
  })
  const line = new Line2(geo, mat)
  line.computeLineDistances()
  group.add(line)

  scene.add(group)

  window.addEventListener('resize', () => {
    mat.resolution.set(window.innerWidth, window.innerHeight)
  })

  return { curve, group }
}

export function getPointProgress(
  trajectoryData: TrajectoryData,
  utcTarget: string,
): number {
  const targetMs = Date.parse(utcTarget)
  const vectors = trajectoryData.vectors
  if (vectors.length < 2) return 0
  for (let i = 0; i < vectors.length - 1; i++) {
    const aMs = Date.parse(vectors[i].utc)
    const bMs = Date.parse(vectors[i + 1].utc)
    if (targetMs >= aMs && targetMs <= bMs) {
      const t = (targetMs - aMs) / (bMs - aMs)
      return (i + t) / (vectors.length - 1)
    }
  }
  if (targetMs <= Date.parse(vectors[0].utc)) return 0
  return 1
}

export function getTrajectoryProgress(
  trajectoryData: TrajectoryData,
  utcTarget: string,
): number {
  const targetMs = Date.parse(utcTarget)
  const vectors = trajectoryData.vectors
  if (vectors.length < 2) return 0
  const startMs = Date.parse(vectors[0].utc)
  const endMs = Date.parse(vectors[vectors.length - 1].utc)
  return Math.max(0, Math.min(1, (targetMs - startMs) / (endMs - startMs)))
}
