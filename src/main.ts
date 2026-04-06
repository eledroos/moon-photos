import './styles/main.css'
import { createScene, startAnimationLoop, onAnimate } from './scene/setup.js'
import { createEarth } from './scene/earth.js'
import { createMoon, createMoonOrbit, updateMoonPosition } from './scene/moon.js'
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
import { createJumpToNowFab, updateFabVisibility, createPhotoTooltip } from './ui/jump-to-now.js'
import { createBroadcastPip } from './ui/broadcast-pip.js'
import { showOnboardingTooltip } from './ui/onboarding.js'
import { createZoomSlider } from './ui/zoom-slider.js'
import { createTimelineBar } from './ui/timeline-bar.js'
import { createPhotoLabels } from './ui/photo-labels.js'

import { fetchAllData } from './data/api.js'
import { getCurrentPosition } from './data/interpolate.js'
import { PHOTO_SELECTED_EVENT } from './ui/photo-detail.js'
import { flyTo } from './navigation/fly-to.js'
import * as THREE from 'three'

import { setupOrbitControls } from './navigation/orbit.js'
import { setupScrollNavigation } from './navigation/scroll.js'

import type { TrajectoryData, BodyData, PhotosData } from '../shared/types.js'

async function main() {
  // 1. Show loading screen
  updateLoadingProgress(5, 'Connecting to mission control...')

  // 2. Fetch all data from server API
  updateLoadingProgress(10, 'Fetching trajectory data...')
  const data = await fetchAllData()

  if (!data.trajectory || !data.moon || !data.sun) {
    updateLoadingProgress(0, 'Error: Could not load mission data. Is the server running?')
    return
  }

  updateLoadingProgress(30, 'Building scene...')

  // 3. Create Three.js scene
  const ctx = createScene()

  // 4. Create celestial bodies
  updateLoadingProgress(40, 'Rendering Earth...')
  createEarth(ctx.scene)

  updateLoadingProgress(45, 'Positioning Moon...')
  createMoon(ctx.scene)
  createMoonOrbit(ctx.scene, data.moon)
  updateMoonPosition(data.moon)

  updateLoadingProgress(50, 'Positioning Sun...')
  createSun(ctx.scene)
  updateSunPosition(data.sun)

  updateLoadingProgress(55, 'Loading stars...')
  const proceduralStars = createStars(ctx.scene)

  // 5. Create trajectory
  updateLoadingProgress(65, 'Plotting trajectory...')
  const { curve } = createTrajectory(ctx.scene, data.trajectory)

  // 6. Create Orion model
  updateLoadingProgress(70, 'Deploying Orion...')
  createOrion(ctx.scene)
  updateOrionPosition(data.trajectory, curve)

  // 7. Create photo markers
  updateLoadingProgress(75, 'Placing photo markers...')
  const { markers, clusters } = createPhotoMarkers(ctx.scene, data.photos.photos)

  // 8. Create UI components
  updateLoadingProgress(80, 'Initializing interface...')

  // Telemetry bar placeholder — created after controls are set up below

  // Photo detail panel
  createPhotoPanel()

  // Mission info drawer
  const drawer = createMissionDrawer()

  // Tooltip (desktop)
  const tooltip = createPhotoTooltip()

  // FAB removed — "Jump to Orion" in telemetry bar handles both desktop and mobile

  // Photo title labels near ghost markers (clustered)
  createPhotoLabels(clusters, data.photos.photos, ctx.camera)

  // Broadcast PIP
  createBroadcastPip()

  // 9. Set up navigation based on viewport
  updateLoadingProgress(90, 'Configuring navigation...')

  const isMobile = window.innerWidth < 768
  let controls: ReturnType<typeof setupOrbitControls> | null = null

  if (!isMobile) {
    // Start camera orbiting around Orion's current position
    const orionPos = getCurrentPosition(data.trajectory.vectors)
    const orionScenePos = new THREE.Vector3(
      orionPos[0] * SCALE,
      orionPos[2] * SCALE,
      -orionPos[1] * SCALE,
    )

    controls = setupOrbitControls({
      ctx,
      markers,
      allPhotos: data.photos.photos,
      tooltip,
      orionPosition: orionScenePos,
    })
    onAnimate(() => {
      controls!.update()
    })
  } else {
    // Mobile: touch-enabled OrbitControls + tap markers
    const mobileNav = setupScrollNavigation({
      ctx,
      curve,
      trajectoryData: data.trajectory,
      photos: data.photos.photos,
      markers,
    })
    controls = mobileNav.controls
    onAnimate(() => {
      controls!.update()
    })
  }

  // 10. Now create telemetry bar with camera/controls for photo grid
  const telemetry = createTelemetryBar({
    camera: ctx.camera,
    controls: controls ?? undefined,
  })
  telemetry.update(data.trajectory, data.moon, data.photos)

  // 10b. Timeline bar (both desktop and mobile — key navigation tool)
  if (controls) {
    createTimelineBar({
      trajectoryData: data.trajectory,
      photos: data.photos.photos,
      clusters,
      camera: ctx.camera,
      controls,
    })
  }

  // 11. Fly camera to photo position when navigating photos
  window.addEventListener(PHOTO_SELECTED_EVENT, ((e: CustomEvent) => {
    const photo = e.detail as import('../shared/types.js').Photo
    const target = new THREE.Vector3(
      photo.pos[0] * SCALE,
      photo.pos[2] * SCALE,
      -photo.pos[1] * SCALE,
    )
    if (controls) {
      flyTo(target, ctx.camera, controls)
    }
  }) as EventListener)

  // 11. Wire up menu button to drawer
  const menuBtn = document.getElementById('menu-btn')
  if (menuBtn) {
    menuBtn.addEventListener('click', drawer.toggle)
  }

  // 12. Wire up Jump to Now button (desktop) — fly camera to Orion's current position
  const jumpBtn = document.getElementById('jump-to-now-btn')
  if (jumpBtn) {
    jumpBtn.addEventListener('click', () => {
      if (controls) {
        const pos = getCurrentPosition(data.trajectory!.vectors)
        const target = new THREE.Vector3(
          pos[0] * SCALE,
          pos[2] * SCALE,
          -pos[1] * SCALE,
        )
        flyTo(target, ctx.camera, controls)
      }
      // Also dispatch for mobile scroll nav
      window.dispatchEvent(new CustomEvent('jump-to-now'))
    })
  }

  // Zoom slider (desktop only)
  if (!isMobile && controls) {
    createZoomSlider(ctx.camera, controls)
  }

  // Onboarding tooltip (first visit)
  showOnboardingTooltip()

  // 12. Start animation loop
  startAnimationLoop(ctx)

  // 13. Update positions every 5 seconds (not every frame — too expensive)
  setInterval(() => {
    updateMoonPosition(data.moon!)
    updateSunPosition(data.sun!)
    updateOrionPosition(data.trajectory!, curve)
  }, 5000)

  // 14. Update telemetry every 5 seconds
  setInterval(() => {
    telemetry.update(data.trajectory!, data.moon!, data.photos)
  }, 5000)

  // 15. Re-fetch photos every 10 minutes, trajectory every 30 minutes
  setInterval(async () => {
    try {
      const newPhotos = await (await fetch('/api/photos')).json() as PhotosData
      data.photos = newPhotos
      telemetry.update(data.trajectory!, data.moon!, data.photos)
      console.log(`[Refresh] Photos: ${data.photos.photos.length}`)
    } catch (err) {
      console.error('[Refresh] Photo fetch error:', err)
    }
  }, 600000) // 10 minutes

  setInterval(async () => {
    try {
      const newTrajectory = await (await fetch('/api/trajectory')).json() as TrajectoryData
      data.trajectory = newTrajectory
      console.log(`[Refresh] Trajectory: ${data.trajectory.vectors.length} vectors`)
    } catch (err) {
      console.error('[Refresh] Trajectory fetch error:', err)
    }
  }, 1800000) // 30 minutes

  // 16. Start async loading of real stars (doesn't block)
  loadRealStars(ctx.scene, proceduralStars).catch(err => {
    console.warn('[Stars] Failed to load HYG catalog:', err)
  })

  // 17. Hide loading screen
  updateLoadingProgress(100, 'Ready')
  setTimeout(() => hideLoadingScreen(), 500)

  console.log('=== Artemis II Photo-Trajectory Viewer initialized ===')
  console.log(`Trajectory: ${data.trajectory.vectors.length} vectors`)
  console.log(`Moon: ${data.moon.vectors.length} vectors`)
  console.log(`Sun: ${data.sun.vectors.length} vectors`)
  console.log(`Photos: ${data.photos.photos.length}`)
}

// Start the app
main().catch(err => {
  console.error('[Fatal]', err)
  updateLoadingProgress(0, `Error: ${err.message}`)
})
