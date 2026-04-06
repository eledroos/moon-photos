# Artemis II Photo-Trajectory Viewer — Design Spec

An interactive web application that maps photographs taken by the Artemis II crew to Orion's trajectory through space, with astronomically accurate 3D rendering and live data updates.

## Architecture

**Canvas Hybrid**: Three.js full-viewport 3D scene with HTML/CSS overlay panels. Single Express server handles both data fetching (background polling) and frontend serving.

**Stack**: Vite + vanilla TypeScript, Three.js (3D scene), Express (server), `exifr` (EXIF extraction).

## Data Pipeline

### Sources

| Source | ID / Endpoint | Step Interval | Polling Refresh |
|--------|--------------|---------------|-----------------|
| Orion trajectory | JPL Horizons `COMMAND='-1024'` | 15 min | Every 30 min |
| Moon position | JPL Horizons `COMMAND='301'` | 1 hour | Every 30 min |
| Sun position | JPL Horizons `COMMAND='10'` | 1 hour | Every 30 min |
| Photos | NASA Images API `/album/Artemis_II` | — | Every 10 min |

All Horizons queries use geocentric ecliptic J2000 reference frame, positions in km, velocities in km/s.

### Photo-to-Position Matching

1. Poll NASA Images API album endpoint for new `art002e` entries
2. For each new photo, fetch `https://images-assets.nasa.gov/image/{id}/{id}~orig.jpg`
3. Extract EXIF `DateTimeOriginal` + `OffsetTime` (cameras set to CDT, UTC-5)
4. Convert to UTC. **Fallback**: if no EXIF timestamp (e.g., spacecraft cameras), parse timestamp from filename pattern (`cmaopnav_YYYYMMDDHHMMSS.tiff`) or fall back to the `date_created` field from the NASA Images API (date-only precision, placed at noon UTC that day)
5. Find the two trajectory vectors bracketing that UTC timestamp
6. Linearly interpolate position between them
7. Compute `distanceFromEarth` (vector magnitude), `distanceFromMoon` (distance to Moon position at same time), `velocity` (magnitude of velocity vector)
8. Store in `photos.json`

### MET (Mission Elapsed Time)

Epoch: `2026-04-01T22:35:00Z` (launch). MET in seconds = `UTC_timestamp - epoch`. Displayed as `DDD:HH:MM:SS`.

## Data Structures

### trajectory.json

```json
{
  "fetchedAt": "2026-04-05T15:30:00Z",
  "source": "JPL Horizons COMMAND=-1024",
  "referenceFrame": "ecliptic_j2000_geocentric",
  "units": { "position": "km", "velocity": "km/s" },
  "vectors": [
    {
      "utc": "2026-04-02T01:58:32Z",
      "met": 27512,
      "pos": [-4521.3, 2891.7, 1203.4],
      "vel": [-1.023, 0.847, 0.312]
    }
  ]
}
```

~960 entries at 15-minute intervals covering Apr 2 01:58 through Apr 10 23:52.

**T-0 gap**: Horizons has no data for the first ~3.5 hours after launch (before ICPS separation). The trajectory visualization bridges this with a synthetic interpolation from Earth's surface (Kennedy Space Center coordinates) to the first real data point. This segment is rendered visually distinct (dimmer, no velocity data).

### moon.json

```json
{
  "fetchedAt": "2026-04-05T15:30:00Z",
  "source": "JPL Horizons COMMAND=301",
  "vectors": [
    {
      "utc": "2026-04-02T02:00:00Z",
      "pos": [-321847.2, 142891.5, -18432.1]
    }
  ]
}
```

~240 entries at 1-hour intervals.

### sun.json

Same structure as `moon.json`, sourced from `COMMAND='10'`. ~240 entries at 1-hour intervals. Used for scene lighting direction and Sun sphere position.

### photos.json

```json
{
  "lastUpdated": "2026-04-05T15:45:00Z",
  "photos": [
    {
      "id": "art002e009006",
      "utc": "2026-04-04T07:03:18Z",
      "met": 203298,
      "pos": [-187432.1, 98201.3, -12044.7],
      "caption": "Artemis II crew photo on flight day 4",
      "description": "The four-member crew poses...",
      "urls": {
        "thumb": "https://images-assets.nasa.gov/image/art002e009006/art002e009006~thumb.jpg",
        "medium": "...~medium.jpg",
        "large": "...~large.jpg",
        "orig": "...~orig.jpg"
      },
      "camera": {
        "make": "Nikon",
        "model": "Z 9",
        "lens": "35mm f/2D",
        "focalLength": 35,
        "aperture": "f/2",
        "exposure": "1/250",
        "iso": 3200
      },
      "distanceFromEarth": 231847,
      "distanceFromMoon": 152103,
      "velocity": 1.247,
      "flightDay": 4
    }
  ]
}
```

### config.json

```json
{
  "mission": {
    "name": "Artemis II",
    "spacecraft": "Orion (Integrity)",
    "launchUtc": "2026-04-01T22:35:00Z",
    "splashdownUtc": "2026-04-10T23:00:00Z",
    "horizonsId": "-1024"
  },
  "api": {
    "nasaApiKey": "YOUR_KEY_HERE",
    "horizonsBaseUrl": "https://ssd.jpl.nasa.gov/api/horizons.api",
    "nasaImagesBaseUrl": "https://images-api.nasa.gov"
  },
  "polling": {
    "trajectoryIntervalMs": 1800000,
    "photoIntervalMs": 600000,
    "trajectoryStepMin": 15,
    "moonStepMin": 60,
    "sunStepMin": 60
  }
}
```

### state.json

```json
{
  "lastFetch": {
    "trajectory": "2026-04-05T15:30:00Z",
    "moon": "2026-04-05T15:30:00Z",
    "sun": "2026-04-05T15:30:00Z",
    "photos": "2026-04-05T15:45:00Z"
  },
  "knownPhotoIds": [
    "art002e000180",
    "art002e000193",
    "art002e004357"
  ],
  "failedExif": [
    {
      "id": "art002e004462",
      "reason": "~orig.jpg returned 404",
      "attempts": 2,
      "lastAttempt": "2026-04-05T15:45:00Z"
    }
  ],
  "startedAt": "2026-04-05T14:00:00Z",
  "totalPhotosFetched": 11,
  "totalHorizonsCalls": 47
}
```

Tracks fetch history, known photos (for incremental EXIF fetching), failed extractions with retry tracking, and server lifecycle stats.

## 3D Scene Composition

### Astronomically Accurate Elements

**Starfield**: HYG star catalog (~120,000 stars). Real RA/Dec positions projected onto a large celestial sphere. Magnitude maps to point size, color temperature maps to star color. Visible magnitude limit ~6.5 (naked eye equivalent). Loaded async after first paint.

**Sun**: Emissive sphere at correct geocentric position from `sun.json`. Drives the scene's `DirectionalLight` — Earth and Moon day/night terminators and phase are physically accurate. Lens flare post-processing when Sun is in view.

**Earth**: Textured sphere at origin (geocentric frame). NASA Blue Marble 2K texture + cloud layer overlay. Atmosphere rim glow shader (Frutiger Nova aesthetic). Day/night terminator derived from real Sun direction. Radius: 6,371 km to scale.

**Moon**: Textured sphere at position interpolated from `moon.json`. NASA Moon texture 2K. Phase/terminator accurate from real Sun direction. Radius: 1,737 km to scale.

### Trajectory & Spacecraft

**Trajectory ribbon**: `TubeGeometry` from `CatmullRomCurve3` spline through trajectory vectors. Emissive cyan material (`#64C8DC`) with `UnrealBloomPass` glow. Visual treatment along the path: past = solid bright, present = pulsing, future = dashed/dim.

**Orion model**: NASA glTF model from `nasa3d.arc.nasa.gov`. Positioned at live interpolated trajectory point. Oriented along velocity vector (nose forward). Scale exaggerated for visibility (not to true scale). Pulsing warm red-orange glow halo (`#D55E0F`, Mirror's Edge wayfinding accent).

**Photo markers**: Diamond sprites at each photo's matched position along the trajectory. LOD behavior: dot when camera is far, thumbnail preview when camera is close. Inactive: soft blue (`#4577EA`). Active/hover: white glow.

### Post-Processing

- `UnrealBloomPass` for trajectory ribbon, photo markers, Sun, and Orion glow
- Renderer: `WebGLRenderer` with antialiasing, pixel ratio capped at 2

## Navigation

### Mobile (Scroll-Driven)

- Page scroll position maps to progress along the trajectory spline (0% = Earth departure, 100% = splashdown)
- Camera follows the spline path, always oriented slightly ahead of current position
- Photo markers expand into HTML card overlays as the user scrolls past them
- Scroll progress indicator on right edge of screen
- **"Jump to Now" FAB**: floating action button that animates scroll to the current live MET position. Visible while Artemis II is in flight, hidden after splashdown.
- Pull-to-refresh triggers data update

### Desktop (Orbit + Click)

- `OrbitControls`: click-drag to rotate, scroll to zoom, right-drag to pan
- Initial view: wide shot showing full Earth-to-Moon trajectory
- Click photo marker: camera smoothly animates to that point, opens photo detail panel
- Click Orion marker: flies to current live position
- Hover photo marker: tooltip with thumbnail + caption
- **"Jump to Now" button** in telemetry bar
- Keyboard: left/right arrow keys step between photo markers chronologically

## HTML Overlay Panels

All panels use dark glassmorphism styling: `background: rgba(255,255,255,0.06)`, `backdrop-filter: blur(12px)`, `border: 1px solid rgba(255,255,255,0.1)`, `border-radius: 10px`.

### Telemetry Bar

Persistent bar (bottom on mobile, top on desktop) showing:
- Mission Elapsed Time (live ticking counter in `DDD:HH:MM:SS`)
- Distance from Earth (km, updating)
- Distance from Moon (km, updating)
- Velocity (km/s)
- Mission phase label (e.g., "Translunar Coast", "Lunar Flyby", "Return Transit")
- Photo count badge
- "Jump to Now" button (desktop)

### Photo Detail Panel

Opens when a photo marker is selected. Slides in from right on desktop, bottom sheet on mobile.
- Photo with progressive loading: thumb → medium → large
- Caption and description from NASA
- Camera metadata: make, model, lens, focal length, aperture, exposure, ISO
- Distance from Earth and Moon at moment of capture
- MET at capture
- Flight day number
- Left/right arrows to navigate to adjacent photos chronologically
- Close button returns camera to previous view

### Mission Info Drawer

Expandable side panel (hamburger menu on mobile):
- Crew bios (Reid Wiseman, Victor Glover, Christina Koch, Jeremy Hansen)
- Mission timeline with key events
- About this project
- Data sources and credits

## Server Architecture

Single Express.js process with two roles:

### Data Fetcher (Background)

- On startup: read `state.json`, check staleness, fetch as needed
- Trajectory/Moon/Sun: always re-fetch on startup (cheap, may have new JPL data)
- Photos: incremental — diff album listing against `knownPhotoIds`, fetch EXIF only for new entries, retry `failedExif` entries
- Write updated JSON files to `data/` directory
- Update `state.json` after each successful fetch cycle
- Schedule polling intervals from `config.json`

### Static Server

- `GET /` — Vite-built frontend
- `GET /api/trajectory` — serves `data/trajectory.json`
- `GET /api/moon` — serves `data/moon.json`
- `GET /api/sun` — serves `data/sun.json`
- `GET /api/photos` — serves `data/photos.json`
- `GET /api/status` — health check with last fetch times, next scheduled fetches, photo count, error count

### Resilience

- All data persisted to disk as JSON — survives restarts
- `state.json` tracks everything needed to resume without duplicate work
- Failed EXIF extractions are retried each photo polling cycle, up to 5 attempts max (tracked in `failedExif`). After 5 failures, the photo is added to `photos.json` with `date_created` fallback timestamp and flagged `"exifAvailable": false`.
- No database dependency — just the filesystem

## Performance

### Loading Strategy

1. **First paint (~240KB)**: App shell, Three.js, simple colored spheres for Earth/Moon/Sun, trajectory line from cached data
2. **Progressive enhancement (async)**: Earth texture, Moon texture, Sun texture, cloud layer, star catalog, Orion glTF model
3. **On demand**: Photo thumbnails lazy-loaded as markers enter camera frustum

### Budget

| Asset | Size |
|-------|------|
| App code + Three.js + styles | ~190KB gzip |
| Fonts (Inter + Space Mono) | ~50KB |
| Earth texture (Blue Marble 2K) | ~500KB |
| Earth clouds overlay | ~200KB |
| Moon texture 2K | ~300KB |
| Sun texture 1K | ~100KB |
| HYG Star Catalog | ~2.5MB |
| Orion MPCV .glb model | ~1-3MB |
| **Critical path (first paint)** | **~240KB** |
| **Total with all assets** | **~4-5MB** |

### Targets

- 60fps on desktop
- 30fps on mobile
- Pixel ratio capped at 2 for mobile GPU performance

## Reference Mockups

Two HTML mockups produced by Google Gemini are in `docs/mockups/`:

- **`mockup-1.html`** (primary) — Working Three.js scene with orbit controls, raycasting, marker interaction. Full-width telemetry bar, scroll minimap with stage labels, Lucide icons, animated ambient orbs, hero star flares. This is the base for implementation.
- **`mockup-2.html`** (secondary) — Better photo detail panel layout (photo-hero flush at top, content grid below) and timeline dot styling in the mission drawer. Adopt these specific components into the mockup-1 base.

**What to take from mockup-1**: telemetry bar layout, scroll minimap with Earth/Moon/stage labels, loading screen gradient title, Three.js scene structure (transparent renderer over CSS ambient orbs), icon system (Lucide), btn-primary/btn-icon styling, responsive breakpoints.

**What to take from mockup-2**: photo panel structure (photo flush at top with overlaid nav arrows, drag handle on mobile bottom sheet, content sections below), mission drawer timeline component (left-border + dot + active state pattern).

## Design Direction

**Aesthetic**: Frutiger Nova (Frutiger Aero applied to cosmic/space themes) combined with Mirror's Edge wayfinding principles. Visual design brief for Gemini is at `docs/gemini-design-brief.md`.

**Key principles**:
- Ambient depth: gradient orbs and soft glows behind glass panels, never pure black backgrounds (base: `#0A0E1A`)
- 90/10 warm-to-cool color ratio (Mirror's Edge): warm red-orange accent (`#D55E0F`) reserved strictly for Orion position, active selections, and primary CTAs
- Glassmorphic panels for all UI overlays
- Monospace type (Space Mono) for telemetry data; humanist sans-serif (Inter) for everything else
- Trajectory rendered as a luminous ribbon of light, not a clinical diagram

**Color palette**:
- Deep space background: `#0A0E1A`
- Trajectory ribbon: `#64C8DC`
- Active accent (Orion, CTAs): `#D55E0F`
- Photo markers inactive: `#4577EA`
- Glass surface: `rgba(255,255,255,0.06)`
- Glass border: `rgba(255,255,255,0.10)`
- Telemetry data: `#6FD7EC`
- Text primary: `#F0F0F0`
- Text secondary: `#8899AA`
- Nominal/success: `#71AB23`

## Project Structure

```
moon-photos/
├── server/
│   ├── index.ts              # Express server + startup logic
│   ├── fetchers/
│   │   ├── horizons.ts       # JPL Horizons API client
│   │   ├── photos.ts         # NASA Images API + EXIF extraction
│   │   └── scheduler.ts      # Polling interval management
│   └── utils/
│       ├── exif.ts            # EXIF parsing with exifr
│       ├── interpolate.ts     # Trajectory position interpolation
│       └── state.ts           # state.json read/write
├── src/
│   ├── main.ts               # Entry point, scene init
│   ├── scene/
│   │   ├── setup.ts           # Renderer, camera, post-processing
│   │   ├── earth.ts           # Earth sphere + atmosphere
│   │   ├── moon.ts            # Moon sphere
│   │   ├── sun.ts             # Sun sphere + directional light
│   │   ├── stars.ts           # HYG star catalog point cloud
│   │   ├── trajectory.ts      # Trajectory tube geometry
│   │   ├── orion.ts           # Orion glTF model
│   │   └── markers.ts         # Photo marker sprites
│   ├── navigation/
│   │   ├── scroll.ts          # Mobile scroll-driven camera
│   │   ├── orbit.ts           # Desktop OrbitControls
│   │   └── fly-to.ts          # Animated camera transitions
│   ├── ui/
│   │   ├── telemetry.ts       # Telemetry bar
│   │   ├── photo-detail.ts    # Photo detail panel
│   │   ├── mission-info.ts    # Mission info drawer
│   │   └── jump-to-now.ts     # FAB / button
│   ├── data/
│   │   ├── api.ts             # Fetch from /api/* endpoints
│   │   ├── interpolate.ts     # Client-side position interpolation
│   │   └── met.ts             # MET clock
│   └── styles/
│       └── main.css           # Glassmorphism, layout, typography
├── public/
│   ├── textures/              # Earth, Moon, Sun textures
│   ├── models/                # Orion .glb
│   └── data/                  # HYG star catalog
├── data/                      # Server-managed JSON files
│   ├── trajectory.json
│   ├── moon.json
│   ├── sun.json
│   ├── photos.json
│   └── state.json
├── config.json
├── hooks/
│   └── commit-msg
├── docs/
│   └── artemis-ii-photo-trajectory-context.md
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .gitignore
```
