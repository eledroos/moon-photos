interface SchedulerConfig {
  trajectoryIntervalMs: number
  photoIntervalMs: number
}

interface SchedulerCallbacks {
  onFetchTrajectory: () => Promise<void>
  onFetchPhotos: () => Promise<void>
}

let trajectoryTimer: ReturnType<typeof setInterval> | null = null
let photoTimer: ReturnType<typeof setInterval> | null = null

export function startScheduler(config: SchedulerConfig, callbacks: SchedulerCallbacks): void {
  stopScheduler()

  trajectoryTimer = setInterval(async () => {
    try {
      await callbacks.onFetchTrajectory()
    } catch (err) {
      console.error('[Scheduler] Trajectory fetch error:', err)
    }
  }, config.trajectoryIntervalMs)

  photoTimer = setInterval(async () => {
    try {
      await callbacks.onFetchPhotos()
    } catch (err) {
      console.error('[Scheduler] Photo fetch error:', err)
    }
  }, config.photoIntervalMs)

  console.log(`[Scheduler] Started — trajectory every ${config.trajectoryIntervalMs / 60000}m, photos every ${config.photoIntervalMs / 60000}m`)
}

export function stopScheduler(): void {
  if (trajectoryTimer) { clearInterval(trajectoryTimer); trajectoryTimer = null }
  if (photoTimer) { clearInterval(photoTimer); photoTimer = null }
}
