# Artemis II — Photo Trajectory Viewer

An interactive 3D visualization that maps photographs taken by the Artemis II crew to Orion's real trajectory through space. As NASA releases new photos, they appear pinned to the exact position where they were captured — connecting *where* a photo was taken to *what* it shows.

**Live mission**: Artemis II launched April 1, 2026 — the first crewed lunar flyby since Apollo 17 (1972).

## Features

- **Astronomically accurate 3D scene** — Earth, Moon, and Sun positioned from JPL Horizons ephemeris data. 8,900+ real stars from the HYG catalog with correct positions, magnitudes, and colors.
- **Live trajectory** — Orion's position updates in real time from NASA/JSC navigation data. Bold cyan line shows the traveled path; dashed line shows the predicted future trajectory.
- **28 crew photographs** pinned to the trajectory by EXIF capture timestamps, with ghost wireframe Orion markers showing where each was taken.
- **Photo viewer** — bottom panel shows the photo with metadata (MET, distances, velocity, camera info). Click to view full NASA original resolution.
- **Photo grid** — browse all mission photos grouped by flight day.
- **Telemetry bar** — live Mission Elapsed Time, distance to Earth/Moon, velocity.
- **Timeline bar** — vertical navigation showing Earth → Moon → Splashdown with clickable photo markers.
- **Mission drawer** — crew bios (linked to NASA profiles), detailed 16-event flight timeline, project credits.
- **NASA broadcast PIP** — floating YouTube player for the live NASA stream.
- **Self-updating** — trajectory data refreshes every 30 minutes, photos every 10 minutes.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Download textures and star catalog
npm run setup

# 3. Add your NASA API key
cp config.example.json config.json
# Edit config.json and replace "YOUR_KEY_HERE" with your key from https://api.nasa.gov

# 4. Start the server (fetches trajectory + photos, serves API)
npm run server &

# 5. Start the dev server (hot reload)
npm run dev

# Open http://localhost:5173
```

### Production (single port)

```bash
npm start
# Builds frontend, starts server on http://localhost:3001
```

## Architecture

```
┌──────────────────────────────────────────────────┐
│  Browser (Three.js + HTML overlays)              │
│  ├─ 3D scene: Earth, Moon, Sun, stars,           │
│  │  trajectory ribbon, Orion model, photo markers│
│  ├─ UI: telemetry bar, photo panel, timeline,    │
│  │  mission drawer, broadcast PIP                │
│  └─ Navigation: orbit controls (desktop),        │
│     scroll-driven (mobile)                       │
└────────────────────┬─────────────────────────────┘
                     │ /api/*
┌────────────────────▼─────────────────────────────┐
│  Express Server (port 3001)                      │
│  ├─ Fetchers: JPL Horizons, NASA Images API      │
│  ├─ EXIF extraction (exifr) for photo timestamps │
│  ├─ Photo-to-trajectory position matching        │
│  └─ JSON file persistence (data/*.json)          │
└──────────────────────────────────────────────────┘
```

### Data Pipeline

1. **Trajectory**: Fetches Orion state vectors from JPL Horizons (`COMMAND='-1024'`). Multi-resolution: 2-minute intervals near Earth (captures orbital maneuvers), 15-minute intervals in deep space. ~1,477 vectors total.

2. **Celestial bodies**: Moon (`COMMAND='301'`) and Sun (`COMMAND='10'`) positions at 1-hour intervals from Horizons.

3. **Photos**: Polls the NASA Images API album + direct ID lookups + WordPress gallery scraping. For each new `art002e` photo, downloads the `~orig.jpg` to extract EXIF `DateTimeOriginal` (cameras set to CDT/UTC-5), converts to UTC, interpolates the trajectory position at that timestamp, and computes distances.

4. **Persistence**: All data saved as JSON files in `data/`. Server resumes from cached data on restart; only fetches new/changed data incrementally.

### MET (Mission Elapsed Time)

Epoch: `2026-04-01T22:35:00Z` (liftoff). Displayed as `DDD:HH:MM:SS`.

## Tech Stack

- **Frontend**: Vite, vanilla TypeScript, Three.js (WebGL), HTML/CSS overlays
- **Backend**: Express.js, exifr (EXIF parsing), tsx (TypeScript runner)
- **Data**: JPL Horizons API, NASA Images API, NASA WordPress gallery
- **3D Assets**: NASA Blue Marble (Earth), Solar System Scope textures (Moon, Sun), HYG v4.1 star catalog
- **Design**: Frutiger Nova aesthetic + Mirror's Edge wayfinding (see `docs/gemini-design-brief.md`)

## Project Structure

```
├── server/                 # Express backend
│   ├── index.ts            # Server entry, API routes, startup
│   ├── fetchers/
│   │   ├── horizons.ts     # JPL Horizons API client + parser
│   │   ├── photos.ts       # NASA Images API + EXIF pipeline
│   │   └── scheduler.ts    # Polling interval manager
│   └── utils/
│       ├── exif.ts          # EXIF timestamp + camera extraction
│       ├── interpolate.ts   # Trajectory position interpolation
│       └── state.ts         # Server state persistence
├── src/                    # Frontend (Vite)
│   ├── main.ts             # App entry, wires everything together
│   ├── scene/              # Three.js 3D scene
│   │   ├── setup.ts        # Renderer, camera, bloom post-processing
│   │   ├── earth.ts        # Earth sphere + atmosphere + sidereal rotation
│   │   ├── moon.ts         # Moon sphere + orbital path
│   │   ├── sun.ts          # Sun + directional lighting
│   │   ├── stars.ts        # HYG star catalog → point cloud
│   │   ├── trajectory.ts   # Orion trajectory (Line2 fat lines, past/future split)
│   │   ├── orion.ts        # Orion model (glTF or fallback wireframe)
│   │   └── markers.ts      # Ghost Orion wireframes at photo positions
│   ├── navigation/
│   │   ├── orbit.ts        # Desktop OrbitControls + raycasting
│   │   ├── scroll.ts       # Mobile scroll-driven camera
│   │   └── fly-to.ts       # Smooth camera animation
│   ├── ui/
│   │   ├── telemetry.ts    # Top telemetry bar + photo grid
│   │   ├── photo-detail.ts # Bottom photo panel + fullscreen lightbox
│   │   ├── photo-labels.ts # Floating labels near ghost markers
│   │   ├── mission-info.ts # Crew, timeline, about drawer
│   │   ├── timeline-bar.ts # Vertical timeline (right edge)
│   │   ├── jump-to-now.ts  # FAB + tooltip
│   │   ├── broadcast-pip.ts# NASA YouTube PIP player
│   │   └── loading.ts      # Loading screen
│   ├── data/
│   │   ├── api.ts          # Frontend API client
│   │   ├── interpolate.ts  # Client-side position interpolation
│   │   └── met.ts          # MET clock + ticker
│   └── styles/
│       └── main.css        # Design system (glassmorphism, tokens, responsive)
├── shared/                 # Shared between server + client
│   ├── types.ts            # All TypeScript interfaces
│   └── met.ts              # MET utility functions
├── public/
│   ├── textures/           # Earth, Moon, Sun textures (downloaded by setup)
│   ├── models/             # Orion .glb (manual download)
│   └── data/               # HYG star catalog (downloaded by setup)
├── tests/                  # Vitest unit tests
├── docs/
│   ├── artemis-ii-photo-trajectory-context.md
│   ├── gemini-design-brief.md
│   ├── mockups/            # HTML mockups from design phase
│   └── superpowers/specs/  # Design spec
├── scripts/
│   └── setup-assets.sh     # Downloads textures + star catalog
├── hooks/
│   └── commit-msg          # Git hook
├── config.example.json     # Template (copy to config.json, add API key)
├── index.html              # Entry point
├── vite.config.ts
├── tsconfig.json           # Frontend TS config
└── tsconfig.server.json    # Server TS config
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/trajectory` | Orion state vectors (position + velocity) |
| `GET /api/moon` | Moon position vectors |
| `GET /api/sun` | Sun position vectors |
| `GET /api/photos` | All matched photos with metadata |
| `GET /api/status` | Server health, fetch times, counts |

## Configuration

`config.json` (gitignored — copy from `config.example.json`):

| Key | Description |
|-----|-------------|
| `api.nasaApiKey` | NASA API key (free at https://api.nasa.gov) |
| `polling.trajectoryIntervalMs` | Trajectory refresh interval (default: 30 min) |
| `polling.photoIntervalMs` | Photo refresh interval (default: 10 min) |
| `mission.launchUtc` | Launch epoch for MET calculation |

## Data Sources

- **[JPL Horizons](https://ssd.jpl.nasa.gov/horizons/)** — Spacecraft and celestial body ephemeris
- **[NASA Images API](https://images.nasa.gov/)** — Official mission photography
- **[NASA Gallery](https://www.nasa.gov/gallery/journey-to-the-moon/)** — WordPress-hosted crew photos
- **[HYG Star Database](https://github.com/astronexus/HYG-Database)** — Star catalog
- **[Solar System Scope](https://www.solarsystemscope.com/textures/)** — Planet textures

## Credits

Built during the Artemis II mission (April 2026).

Crew: Commander Reid Wiseman, Pilot Victor Glover, Mission Specialist Christina Koch, Mission Specialist Jeremy Hansen (CSA).
