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

  const now = new Date().toISOString()
  const pointProgress = getPointProgress(trajectoryData, now)
  const splitIndex = Math.max(1, Math.floor(pointProgress * NUM_SAMPLES))

  // Past path: bold bright cyan using Line2 (fat lines)
  const pastPoints = allCurvePoints.slice(0, splitIndex + 1)
  const pastPositions: number[] = []
  for (const p of pastPoints) pastPositions.push(p.x, p.y, p.z)

  const pastGeo = new LineGeometry()
  pastGeo.setPositions(pastPositions)
  const pastMat = new LineMaterial({
    color: 0x64C8DC,
    linewidth: 3, // pixels
    transparent: true,
    opacity: 0.95,
    resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
  })
  const pastLine = new Line2(pastGeo, pastMat)
  pastLine.computeLineDistances()
  group.add(pastLine)

  // Future path: thin dim
  const futurePoints = allCurvePoints.slice(splitIndex)
  const futurePositions: number[] = []
  for (const p of futurePoints) futurePositions.push(p.x, p.y, p.z)

  const futureGeo = new LineGeometry()
  futureGeo.setPositions(futurePositions)
  const futureMat = new LineMaterial({
    color: 0x64C8DC,
    linewidth: 1,
    transparent: true,
    opacity: 0.2,
    dashed: true,
    dashSize: 1.5,
    gapSize: 1.0,
    resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
  })
  const futureLine = new Line2(futureGeo, futureMat)
  futureLine.computeLineDistances()
  group.add(futureLine)

  scene.add(group)

  // Update resolution on resize
  window.addEventListener('resize', () => {
    const res = new THREE.Vector2(window.innerWidth, window.innerHeight)
    pastMat.resolution = res
    futureMat.resolution = res
  })

  // Update split every 10 seconds
  setInterval(() => {
    const nowUtc = new Date().toISOString()
    const currentPointProgress = getPointProgress(trajectoryData, nowUtc)
    const newSplit = Math.max(1, Math.floor(currentPointProgress * NUM_SAMPLES))

    const updatedPastPositions: number[] = []
    for (let i = 0; i <= newSplit && i < allCurvePoints.length; i++) {
      updatedPastPositions.push(allCurvePoints[i].x, allCurvePoints[i].y, allCurvePoints[i].z)
    }
    pastGeo.setPositions(updatedPastPositions)
    pastLine.computeLineDistances()

    const updatedFuturePositions: number[] = []
    for (let i = newSplit; i < allCurvePoints.length; i++) {
      updatedFuturePositions.push(allCurvePoints[i].x, allCurvePoints[i].y, allCurvePoints[i].z)
    }
    futureGeo.setPositions(updatedFuturePositions)
    futureLine.computeLineDistances()
  }, 10000)

  return { curve, group }
}

/**
 * Map a UTC time to the curve parameter (0-1) based on which input data point
 * it falls between. This correctly handles non-uniform time spacing
 * (e.g., 2-min near Earth, 15-min in deep space).
 */
export function getPointProgress(
  trajectoryData: TrajectoryData,
  utcTarget: string,
): number {
  const targetMs = Date.parse(utcTarget)
  const vectors = trajectoryData.vectors
  if (vectors.length < 2) return 0

  // Find which two vectors bracket this time
  for (let i = 0; i < vectors.length - 1; i++) {
    const aMs = Date.parse(vectors[i].utc)
    const bMs = Date.parse(vectors[i + 1].utc)
    if (targetMs >= aMs && targetMs <= bMs) {
      const t = (targetMs - aMs) / (bMs - aMs)
      // Progress = fraction through the input points array
      return (i + t) / (vectors.length - 1)
    }
  }

  // Before first or after last
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
