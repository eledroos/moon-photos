import * as THREE from 'three'
import { SCALE } from './setup.js'
import type { Photo } from '../../shared/types.js'

export interface PhotoCluster {
  photos: Photo[]
  position: THREE.Vector3
  index: number  // index of first photo in cluster
}

export interface PhotoMarker extends THREE.Group {
  userData: {
    isPhotoMarker: true
    photo: Photo       // first photo in cluster (for click)
    photos: Photo[]    // all photos in cluster
    index: number
  }
}

/**
 * Cluster photos that are within a threshold distance of each other.
 * Photos must be sorted chronologically before calling.
 */
function clusterPhotos(photos: Photo[], thresholdKm: number = 3000): PhotoCluster[] {
  const clusters: PhotoCluster[] = []
  const used = new Set<number>()

  for (let i = 0; i < photos.length; i++) {
    if (used.has(i)) continue

    const cluster: Photo[] = [photos[i]]
    used.add(i)

    for (let j = i + 1; j < photos.length; j++) {
      if (used.has(j)) continue
      const dx = photos[i].pos[0] - photos[j].pos[0]
      const dy = photos[i].pos[1] - photos[j].pos[1]
      const dz = photos[i].pos[2] - photos[j].pos[2]
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (dist < thresholdKm) {
        cluster.push(photos[j])
        used.add(j)
      }
    }

    // Average position of cluster
    const avg: [number, number, number] = [0, 0, 0]
    for (const p of cluster) {
      avg[0] += p.pos[0]; avg[1] += p.pos[1]; avg[2] += p.pos[2]
    }
    avg[0] /= cluster.length; avg[1] /= cluster.length; avg[2] /= cluster.length

    const pos = new THREE.Vector3(
      avg[0] * SCALE,
      avg[2] * SCALE,
      -avg[1] * SCALE,
    )

    clusters.push({ photos: cluster, position: pos, index: i })
  }

  return clusters
}

function createGhostOrion(opacity: number = 0.2): THREE.Group {
  const group = new THREE.Group()

  const coneGeo = new THREE.ConeGeometry(0.5, 1.3, 8)
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0x4577EA, wireframe: true, transparent: true, opacity,
  })
  const cone = new THREE.Mesh(coneGeo, coneMat)
  cone.rotation.x = Math.PI / 2
  group.add(cone)

  const cylGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.9, 8)
  const cylMat = new THREE.MeshBasicMaterial({
    color: 0x4577EA, wireframe: true, transparent: true, opacity: opacity * 0.7,
  })
  const cyl = new THREE.Mesh(cylGeo, cylMat)
  cyl.rotation.x = Math.PI / 2
  cyl.position.z = -0.9
  group.add(cyl)

  const wingGeo = new THREE.BoxGeometry(3.5, 0.02, 0.8)
  const wingMat = new THREE.MeshBasicMaterial({
    color: 0x4577EA, wireframe: true, transparent: true, opacity: opacity * 0.5,
  })
  const wing = new THREE.Mesh(wingGeo, wingMat)
  wing.position.set(0, 0, -0.9)
  group.add(wing)

  return group
}

/**
 * Create clustered ghost Orion markers. Nearby photos share one ghost.
 * Returns markers (one per cluster) and the cluster data for labels.
 */
export function createPhotoMarkers(
  scene: THREE.Scene,
  photos: Photo[],
): { markers: PhotoMarker[]; clusters: PhotoCluster[] } {
  const clusters = clusterPhotos(photos)
  const markers: PhotoMarker[] = []

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i]
    const ghost = createGhostOrion(0.2) as PhotoMarker

    ghost.position.copy(cluster.position)

    const dir = cluster.position.clone().normalize()
    const target = cluster.position.clone().add(dir)
    ghost.lookAt(target)

    ghost.userData = {
      isPhotoMarker: true,
      photo: cluster.photos[0],
      photos: cluster.photos,
      index: cluster.index,
    }

    scene.add(ghost)
    markers.push(ghost)
  }

  console.log(`[Markers] ${photos.length} photos → ${clusters.length} clusters`)
  return { markers, clusters }
}

export function highlightMarker(marker: PhotoMarker): void {
  marker.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const mat = child.material as THREE.MeshBasicMaterial
      mat.color.set(0xFFFFFF)
      mat.opacity = Math.min(mat.opacity * 3, 0.8)
    }
  })
}

export function unhighlightMarker(marker: PhotoMarker): void {
  marker.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const mat = child.material as THREE.MeshBasicMaterial
      mat.color.set(0x4577EA)
      mat.opacity = mat.opacity / 3
    }
  })
}
