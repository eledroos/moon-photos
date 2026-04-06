// --- Trajectory ---
export interface StateVector {
  utc: string
  met: number // seconds since launch
  pos: [number, number, number] // km, ecliptic J2000 geocentric
  vel: [number, number, number] // km/s
}

export interface TrajectoryData {
  fetchedAt: string
  source: string
  referenceFrame: string
  units: { position: string; velocity: string }
  vectors: StateVector[]
}

// --- Celestial body positions (Moon, Sun) ---
export interface BodyVector {
  utc: string
  pos: [number, number, number]
}

export interface BodyData {
  fetchedAt: string
  source: string
  vectors: BodyVector[]
}

// --- Photos ---
export interface PhotoUrls {
  thumb: string
  medium: string
  large: string
  orig: string
}

export interface CameraMetadata {
  make: string
  model: string
  lens: string
  focalLength: number
  aperture: string
  exposure: string
  iso: number
}

export interface Photo {
  id: string
  utc: string
  met: number
  pos: [number, number, number]
  caption: string
  description: string
  urls: PhotoUrls
  camera: CameraMetadata | null
  distanceFromEarth: number
  distanceFromMoon: number
  velocity: number
  flightDay: number
  exifAvailable: boolean
}

export interface PhotosData {
  lastUpdated: string
  photos: Photo[]
}

// --- Config ---
export interface MissionConfig {
  name: string
  spacecraft: string
  launchUtc: string
  splashdownUtc: string
  horizonsId: string
  moonId: string
  sunId: string
}

export interface ApiConfig {
  nasaApiKey: string
  horizonsBaseUrl: string
  nasaImagesBaseUrl: string
  nasaAssetsBaseUrl: string
}

export interface PollingConfig {
  trajectoryIntervalMs: number
  photoIntervalMs: number
  trajectoryStepMin: number
  moonStepMin: number
  sunStepMin: number
}

export interface AppConfig {
  mission: MissionConfig
  api: ApiConfig
  polling: PollingConfig
}

// --- Server state ---
export interface FailedExif {
  id: string
  reason: string
  attempts: number
  lastAttempt: string
}

export interface ServerState {
  lastFetch: {
    trajectory: string | null
    moon: string | null
    sun: string | null
    photos: string | null
  }
  knownPhotoIds: string[]
  failedExif: FailedExif[]
  startedAt: string
  totalPhotosFetched: number
  totalHorizonsCalls: number
}
