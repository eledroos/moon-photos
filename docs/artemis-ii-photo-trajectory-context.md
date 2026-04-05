# Artemis II Photo-Trajectory Project — Context Document

## Project Concept

An interactive web application that maps photographs taken by the Artemis II crew to Orion's ("Integrity") trajectory through space. As NASA releases new photos, they are added to the trajectory path. Users can view the full Earth-to-Moon-and-back trajectory, then zoom into specific segments to see the photos taken at those positions. The experience connects *where* a photo was taken to *what* it shows, relative to the whole journey.

No one else has built this. There are many trajectory trackers and many photo galleries, but nothing that combines the two.

---

## Mission Overview

- **Mission**: Artemis II, first crewed lunar flyby since Apollo 17 (1972)
- **Spacecraft**: Orion, named "Integrity" by the crew
- **Crew**: Commander Reid Wiseman, Pilot Victor Glover, Mission Specialists Christina Koch and Jeremy Hansen (CSA)
- **Launch**: April 1, 2026, 6:35 PM EDT from Kennedy Space Center, Launch Complex 39B
- **Duration**: Approximately 10 days
- **Moon flyby**: April 6, 2026 (passes ~4,000 miles / 6,400 km beyond the far side)
- **Splashdown**: April 10, 2026, Pacific Ocean
- **Vehicle**: SLS Block 1 rocket, Orion MPCV with European Service Module

### Key Mission Timeline Events

| Event | Date | Notes |
|-------|------|-------|
| Launch | Apr 1, 6:35 PM EDT | |
| Proximity operations demo | Apr 1 | Manual maneuvering relative to ICPS |
| Apogee raise burn | Apr 1 | |
| Perigee raise burn | Apr 2 | 43-second burn |
| Translunar injection (TLI) | Apr 2, 7:49 PM EDT | 5 min 49 sec burn, humans leave Earth orbit for first time since 1972 |
| Outbound trajectory correction | Apr 3 | Cancelled (trajectory already accurate) |
| Lunar sphere of influence | Apr 5 | Moon's gravity becomes dominant |
| Lunar flyby (far side) | Apr 6 | ~4,000 miles beyond the Moon |
| Return transit | Apr 7–9 | |
| Splashdown | Apr 10 | Pacific Ocean |

---

## Data Source: JPL Horizons API

The trajectory data for Orion is available from NASA's JPL Horizons system.

### Access Details

- **API endpoint**: `https://ssd.jpl.nasa.gov/api/horizons.api`
- **Web interface**: `https://ssd.jpl.nasa.gov/horizons/app.html`
- **Orion spacecraft ID**: `COMMAND='-1024'` (listed as "Artemis II (spacecraft) (Integrity)")
- **Moon ID**: `COMMAND='301'`
- **Reference frame**: Ecliptic J2000, Earth-centered
- **Data source**: NASA/JSC Flight Dynamics Operations
- **Format**: CCSDS Orbital Ephemeris Message (OEM) standard

### What's Available

- Orion position vectors (X, Y, Z) at regular intervals
- Orion velocity vectors (VX, VY, VZ)
- Moon position vectors
- Data covers the full 10-day mission (Apr 2–11, 2026)
- State vectors available at intervals as fine as 4 minutes (2-second during maneuvers)
- Multiple existing projects have successfully fetched 299 Orion state vectors and 75 Moon position vectors covering the mission

### How to Query

From the Horizons web app:
1. Set Target Body: search "Artemis II" or enter object number `-1024`
2. Set Observer Location (e.g., geocentric, or a specific city)
3. Set Time Span (e.g., start: 2026-04-01, stop: 2026-04-12)
4. Set Step Size (e.g., 5 min, 30 min, 1 hour depending on needed resolution)

The API also supports batch/programmatic queries.

---

## Photo Sources

### NASA Official Gallery

- **URL**: `https://www.nasa.gov/gallery/journey-to-the-moon/`
- **Multimedia hub**: `https://www.nasa.gov/artemis-ii-multimedia/`
- Photos are tagged with image IDs (e.g., `art002e009006`), dates, and descriptive captions
- Captions typically include the date and context (e.g., "April 4, 2026 - The Artemis II crew took this photo on day 4 of their journey...")
- Photos include crew shots, Earth views from various distances, Moon views, spacecraft selfies (from solar array cameras), and interior shots
- The crew is actively working with NASA's science team on what to photograph, especially as they approach the Moon

### NASA Images API

- Existing open-source projects (e.g., GaltRanch/artemis-tracker) have demonstrated pulling official Artemis II mission photos programmatically via the NASA Images API
- API key available free at `https://api.nasa.gov` (1,000 requests/hour with key, 30/hour with DEMO_KEY)

### Photo ID Convention

Photos use the format `art002eNNNNNN` with dates in captions. Examples from the mission so far:

- `art002e004429` (April 3, 2026) — Crew en route to Moon, flight day 2
- `art002e000193` (April 3, 2026) — Backlit Earth from Orion window, taken by Reid Wiseman after TLI
- `art002e004357` (April 3, 2026) — Orion selfie from solar array camera
- `art002e004438` (April 3, 2026) — Moon through Orion window
- `art002e004440` (April 3, 2026) — Christina Koch illuminated by screen in darkened cabin
- `art002e004437` (April 3, 2026) — Earth sliver against black space
- `art002e009006` (April 4, 2026) — Crew photo on day 4
- `art002e004462` (April 4, 2026) — Earth sliver illuminated against space
- `art002e004450` (April 4, 2026) — Earth illuminated, taken by crew

### Photo-to-Position Matching

There is no API that directly ties photos to trajectory coordinates. The matching must be done by:
1. Extracting the timestamp from the photo ID / caption (date and approximate time of day)
2. Looking up Orion's position in the Horizons trajectory data at that timestamp
3. Storing the mapping as structured data (photo ID → timestamp → trajectory position)

The mission blog posts on nasa.gov often include specific times (EDT) for events, which helps narrow photo timestamps beyond just the date.

---

## Existing Open-Source Projects (Reference Implementations)

### JOnathanST29/artemis2-live

- **Repo**: `https://github.com/JOnathanST29/artemis2-live`
- **Stack**: React 18, Vite, pure SVG rendering
- **License**: MIT
- **Key details**:
  - Ships with 299 pre-fetched Orion state vectors and 75 Moon position vectors
  - Zero external dependencies beyond React
  - 2D projection works by: (1) getting Moon position vector at current time, (2) using Earth→Moon direction as X-axis, (3) computing perpendicular Y-axis in ecliptic plane, (4) projecting all 3D positions onto this 2D plane
  - Keeps Earth-Moon line horizontal, shows free-return trajectory curving above/below
  - Has a manual REFETCH button for live Horizons pulls
  - Very clean, minimal codebase (~5 commits)

### cucco-io/artemis-ii-tracker

- **Repo**: `https://github.com/cucco-io/artemis-ii-tracker`
- **Stack**: Three.js for 3D rendering
- **Key details**:
  - Includes `parse_horizons.py` script that converts raw Horizons CSV into `trajectory_data.js`
  - 30-minute interval state vectors for entire mission
  - Glassmorphism UI
  - Time playback/scrubbing controls
  - Synthetically plots initial launch-to-first-data-point path (Horizons data doesn't begin exactly at T-0)
  - Dynamic camera focusing (switch view between Earth, Moon, Orion)
  - Provides distance readouts, velocity, altitude, mission phase

### GaltRanch/artemis-tracker

- **Repo**: `https://github.com/GaltRanch/artemis-tracker`
- **Stack**: Vanilla JS, Three.js, Node.js proxy server
- **License**: MIT
- **Key details**:
  - Pulls from 7 NASA APIs: JPL Horizons, DSN Now, DONKI, EPIC, APOD, NeoWs, NASA Images
  - Node.js server acts as proxy to avoid CORS issues
  - Request queue to avoid rate limiting (serialized with delays)
  - Response cache (1 min for DSN, 3 min for Horizons, 30 min for DONKI/EPIC/Images)
  - Includes NASA Images integration (official Artemis II mission photos, polled every 10 min)
  - Exact 13-event mission timeline from Horizons ephemeris with MET times
  - PWA-ready
  - Configurable for future missions (just change spacecraft ID and mission parameters)

### Deployed Trackers (not open-source, for reference)

- `https://artemis-tracker.netlify.app/` — Live telemetry, sub-spacecraft point, angular diameter calculations, audio sonification
- `https://artemistracker.mapki.com/` — 3D visualization using AROW live telemetry + Horizons predicted trajectory + HYG star catalog
- `https://artemisradar.com/` — Real-time telemetry with speed, distance, altitude
- `https://artemislivetracker.com/` — 3D trajectory map, live telemetry panels
- `https://issinfo.net/artemis` — 2D map of Earth-Moon system with trajectory replay

---

## Additional NASA Data Sources

| Source | URL | What it provides |
|--------|-----|------------------|
| NASA Images API | `https://api.nasa.gov` | Official mission photos, searchable |
| AROW (Artemis Real-time Orbit Website) | Referenced by mapki.com tracker | Live telemetry from the spacecraft |
| DSN Now | Part of NASA APIs | Which Deep Space Network antennas are communicating with Orion |
| Artemis II Blog | `https://www.nasa.gov/blogs/missions/` | Timestamped mission updates, often with specific EDT times for events |
| NASA Artemis II Multimedia Resource Page | `https://www.nasa.gov/artemis-ii-multimedia/` | Central hub for all photos, videos, podcasts |

---

## Technical Considerations

### 2D vs 3D Trajectory Rendering

- The JOnathanST29 approach (2D SVG projection) is simpler and may be better suited for a photo-browsing UX where the trajectory is a navigation element rather than a spectacle
- The Three.js 3D approach (cucco-io, GaltRanch) is more visually impressive but adds complexity to the zoom-to-photo interaction
- Consider: the trajectory is the *context* for the photos, not the main attraction. Simpler rendering may serve the concept better.

### Zoom Interaction Pattern

The core UX: user sees the full trajectory at macro level, then zooms into a segment to reveal photo markers clustered at their positions along the path. Clicking a marker opens the photo with metadata (what it shows, who took it, distance from Earth/Moon at that moment).

Possible approaches:
- D3.js with semantic zoom (different detail levels at different zoom scales)
- Mapbox-style tile approach (but for a 1D path rather than a 2D map)
- Simple scroll-driven zoom along the trajectory path
- SVG with CSS transforms for zoom, overlaying photo markers at computed positions

### CORS

NASA APIs may have CORS restrictions. The GaltRanch project solves this with a Node.js proxy server. For a static site (Vercel/Netlify), pre-fetching trajectory data at build time and bundling it avoids this issue entirely. Photos can be referenced by URL (NASA image URLs are typically CORS-friendly for display).

### Data Update Workflow

Since this is a curated project (photos manually matched to positions), the update flow would be:
1. NASA releases new photos
2. Maintainer (you) identifies timestamp from caption/blog
3. Looks up trajectory position at that timestamp
4. Adds entry to a JSON data file mapping photo → position
5. Pushes update, site rebuilds

This could also be partially automated: scrape NASA gallery for new `art002e` entries, extract dates from captions, auto-lookup trajectory positions, then manually verify and publish.
