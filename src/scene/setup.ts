import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

// Scale: 1 unit = 1,000 km
export const SCALE = 1 / 1000

export interface SceneContext {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  composer: EffectComposer
  clock: THREE.Clock
}

export function createScene(): SceneContext {
  const scene = new THREE.Scene()

  // Camera
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100000,
  )
  // Initial position: wide view showing Earth-Moon system
  // Earth is at origin, Moon ~384 units away
  camera.position.set(0, 200, 400)
  camera.lookAt(0, 0, 0)

  // Renderer — alpha: true so CSS ambient orbs show through
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0

  // Attach to DOM
  const container = document.getElementById('canvas-container')
  if (container) {
    container.appendChild(renderer.domElement)
  }

  // Post-processing
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.8,   // strength
    0.3,   // radius
    0.85,  // threshold
  )
  composer.addPass(bloomPass)
  composer.addPass(new OutputPass())

  // Handle window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    composer.setSize(window.innerWidth, window.innerHeight)
  })

  const clock = new THREE.Clock()

  return { scene, camera, renderer, composer, clock }
}

// Animation callbacks
type AnimationCallback = (delta: number, elapsed: number) => void
const callbacks: AnimationCallback[] = []

export function onAnimate(callback: AnimationCallback): void {
  callbacks.push(callback)
}

export function startAnimationLoop(ctx: SceneContext): void {
  function animate() {
    requestAnimationFrame(animate)
    const delta = ctx.clock.getDelta()
    const elapsed = ctx.clock.getElapsedTime()

    // Run all registered animation callbacks
    for (const cb of callbacks) {
      cb(delta, elapsed)
    }

    ctx.composer.render()
  }
  animate()
}
