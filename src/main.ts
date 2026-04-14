import './styles/main.css'
import { createScene, startAnimationLoop, onAnimate } from './scene/setup.js'
import { createEarth } from './scene/earth.js'
import { createMoon } from './scene/moon.js'
import { createSun, updateSunPosition } from './scene/sun.js'
import { createStars, loadRealStars } from './scene/stars.js'
import { createTrajectory } from './scene/trajectory.js'
import { createOrion, updateOrionPosition } from './scene/orion.js'
import { createPhotoMarkers } from './scene/markers.js'
import { SCALE } from './scene/setup.js'

import { updateLoadingProgress, hideLoadingScreen } from './ui/loading.js'
import { createTelemetryBar } from './ui/telemetry.js'
import { createPhotoPanel } from './ui/photo-detail.js'
import { createMissionDrawer } from './ui/mission-info.js'
import { createPhotoTooltip } from './ui/jump-to-now.js'
import { createBroadcastPip } from './ui/broadcast-pip.js'
import { showOnboardingTooltip } from './ui/onboarding.js'
import { createZoomSlider } from './ui/zoom-slider.js'
import { createTimelineBar } from './ui/timeline-bar.js'
import { createPhotoLabels } from './ui/photo-labels.js'

import { fetchAllData } from './data/api.js'
import { PHOTO_SELECTED_EVENT } from './ui/photo-detail.js'
import { flyTo } from './navigation/fly-to.js'
import { FLYBY_MOON_POS } from './data/mission-time.js'
import * as THREE from 'three'

import { setupOrbitControls } from './navigation/orbit.js'
import { setupScrollNavigation } from './navigation/scroll.js'

async function main() {
  updateLoadingProgress(5, 'Loading mission archive...')

  updateLoadingProgress(10, 'Fetching trajectory data...')
  const data = await fetchAllData()

  if (!data.trajectory || !data.moon || !data.sun) {
    updateLoadingProgress(0, 'Error: Could not load mission data. Is the server running?')
    return
  }

  updateLoadingProgress(30, 'Building scene...')
  const ctx = createScene()

  // Celestial bodies — all static (archive mode)
  updateLoadingProgress(40, 'Rendering Earth...')
  createEarth(ctx.scene)

  updateLoadingProgress(45, 'Positioning Moon...')
  createMoon(ctx.scene) // Locked at flyby position, no orbit line

  updateLoadingProgress(50, 'Positioning Sun...')
  createSun(ctx.scene)
  updateSunPosition(data.sun) // Called once, locked at flyby time

  updateLoadingProgress(55, 'Loading stars...')
  const proceduralStars = createStars(ctx.scene)

  // Trajectory — full solid line (all traveled)
  updateLoadingProgress(65, 'Plotting trajectory...')
  const { curve } = createTrajectory(ctx.scene, data.trajectory)

  // Orion at final position
  updateLoadingProgress(70, 'Deploying Orion...')
  createOrion(ctx.scene)
  updateOrionPosition(data.trajectory, curve) // Called once, fixed at mission end

  // Photo markers
  updateLoadingProgress(75, 'Placing photo markers...')
  const { markers, clusters } = createPhotoMarkers(ctx.scene, data.photos.photos)

  // UI
  updateLoadingProgress(80, 'Initializing interface...')

  createPhotoPanel()
  const drawer = createMissionDrawer()
  const tooltip = createPhotoTooltip()

  createPhotoLabels(clusters, data.photos.photos, ctx.camera)
  createBroadcastPip()

  // Navigation — camera starts orbiting the Moon/flyby area
  updateLoadingProgress(90, 'Configuring navigation...')

  const isMobile = window.innerWidth < 768
  let controls: ReturnType<typeof setupOrbitControls> | null = null

  // Moon flyby position in scene coordinates
  const moonScenePos = new THREE.Vector3(
    FLYBY_MOON_POS[0] * SCALE,
    FLYBY_MOON_POS[2] * SCALE,
    -FLYBY_MOON_POS[1] * SCALE,
  )

  if (!isMobile) {
    controls = setupOrbitControls({
      ctx,
      markers,
      allPhotos: data.photos.photos,
      tooltip,
      orionPosition: moonScenePos, // Camera orbits around the Moon area
    })
    onAnimate(() => { controls!.update() })
  } else {
    const mobileNav = setupScrollNavigation({
      ctx,
      curve,
      trajectoryData: data.trajectory,
      photos: data.photos.photos,
      markers,
    })
    controls = mobileNav.controls
    onAnimate(() => { controls!.update() })
  }

  // Telemetry bar (static values — no polling)
  const telemetry = createTelemetryBar({
    camera: ctx.camera,
    controls: controls ?? undefined,
  })
  telemetry.update(data.trajectory, data.moon, data.photos)

  // Timeline bar
  if (controls) {
    createTimelineBar({
      trajectoryData: data.trajectory,
      photos: data.photos.photos,
      clusters,
      camera: ctx.camera,
      controls,
    })
  }

  // Fly camera to photo on selection
  window.addEventListener(PHOTO_SELECTED_EVENT, ((e: CustomEvent) => {
    const photo = e.detail as import('../shared/types.js').Photo
    const target = new THREE.Vector3(
      photo.pos[0] * SCALE, photo.pos[2] * SCALE, -photo.pos[1] * SCALE,
    )
    if (controls) flyTo(target, ctx.camera, controls)
  }) as EventListener)

  // Drawer toggle
  const menuBtn = document.getElementById('menu-btn')
  if (menuBtn) menuBtn.addEventListener('click', drawer.toggle)

  // Zoom slider
  if (!isMobile && controls) {
    createZoomSlider(ctx.camera, controls)
  }

  showOnboardingTooltip()

  // Start animation loop (for camera damping, glow pulse, etc. — no position updates)
  startAnimationLoop(ctx)

  // Load real stars async
  loadRealStars(ctx.scene, proceduralStars).catch(err => {
    console.warn('[Stars] Failed to load HYG catalog:', err)
  })

  // Done
  updateLoadingProgress(100, 'Ready')
  setTimeout(() => hideLoadingScreen(), 500)

  console.log('=== Artemis II Photo-Trajectory Archive ===')
  console.log(`Trajectory: ${data.trajectory.vectors.length} vectors`)
  console.log(`Photos: ${data.photos.photos.length}`)
}

main().catch(err => {
  console.error('[Fatal]', err)
  updateLoadingProgress(0, `Error: ${err.message}`)
})
