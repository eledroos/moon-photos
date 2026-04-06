# Design Brief: Artemis II Photo-Trajectory Viewer

## What You're Designing

A web application that maps photographs taken by the Artemis II crew to Orion's trajectory through space. Users scroll through the journey from Earth to the Moon and back, seeing crew photos pinned to the exact positions where they were taken. The 3D scene is astronomically accurate — real star positions, real Sun lighting, real Earth/Moon placement.

The Three.js 3D scene and data pipeline are being built separately. **Your job is the visual design system**: the CSS, the HTML overlay panels, the glassmorphism effects, the typography, the color application, the layout, the responsive behavior, and the overall look and feel that makes this feel like a premium, distinctive experience — not another generic dark-mode dashboard.

## Aesthetic Direction: Frutiger Nova + Mirror's Edge

### Frutiger Nova

Frutiger Nova is a sub-genre of Frutiger Aero that applies the same design principles — glossy, translucent, optimistic futurism — to cosmic and space themes. Think: the visual language of Windows Vista/7 and early iPhone, but set in space.

Key characteristics:
- Planets rendered as glass marbles or floating bubbles
- Space rendered in deep cyans, purples, and teals — **never pure black**
- Holographic HUD-style interface elements
- Soft gradients, lens flares, light diffusion, bloom effects
- Glossy, reflective surfaces with translucency
- The overall tone is "safe, clean, and inviting — a resort in the stars"
- Optimistic about space exploration, not dystopian or grimdark

References:
- https://aesthetics.fandom.com/wiki/Frutiger_Aero
- https://medium.com/@bubblehorizonshop/what-is-frutiger-nova-the-official-guide-to-the-space-aero-aesthetic-c222bd5d4d97
- https://frutiger-aero.org/frutiger-aero

### Mirror's Edge Wayfinding

From the video game Mirror's Edge — a design language where one bold accent color guides the user through a clean, minimalist environment.

Key principles:
- Foundation of neutral/cool tones (here: deep space blues and cyans)
- **One warm accent color used exclusively for wayfinding**: the active spacecraft position, selected states, and primary CTAs
- 90/10 color ratio: cool tones dominate, warm accent is 10% or less
- Red/warm = "importance and direction", not danger
- Monochromatic zones lit by a single dominant color for atmospheric effect
- Virtually no decorative chrome — let spatial and contextual cues guide the user

References:
- https://www.worldofleveldesign.com/categories/game_environments_design/mirrors-edge-color.php
- https://interfaceingame.com/games/mirrors-edge-catalyst/

### The Synthesis

"Frutiger Nova meets mission control." An optimistic, glossy, translucent space interface where the 3D trajectory is the environment and photos are the waypoints. It should feel like looking through the window of a spacecraft with a beautiful heads-up display overlaid.

## Color Palette

| Role | Value | Usage |
|------|-------|-------|
| Deep space background | `#0A0E1A` | Page/scene background — never pure black |
| Background gradient orb 1 | `#0689E4` | Frutiger Aero blue, ambient depth |
| Background gradient orb 2 | `#1299CA` | Cosmic teal, ambient depth |
| Background gradient orb 3 | `#4A2FBD` | Nebula purple, ambient depth |
| Trajectory ribbon | `#64C8DC` | The glowing path through space |
| Active accent | `#D55E0F` | Orion position, selected states, primary buttons — the Mirror's Edge red. Use sparingly. |
| Photo markers (inactive) | `#4577EA` | Soft blue dots along trajectory |
| Photo markers (active) | `#FFFFFF` with glow | White bloom on selection |
| Glass surface | `rgba(255,255,255,0.06)` | All overlay panel backgrounds |
| Glass border | `rgba(255,255,255,0.10)` | Edge definition on glass panels |
| Glass shadow | `0 8px 32px rgba(0,0,0,0.36)` | Depth on glass panels |
| Text primary | `#F0F0F0` | Headings, body text |
| Text secondary | `#8899AA` | Labels, captions, secondary info |
| Telemetry data | `#6FD7EC` | Numbers, readouts, live data |
| Nominal/success | `#71AB23` | Status indicators, "live" badges |

### Ambient Depth Technique

The background should never be flat. Behind the glassmorphic panels, place large soft radial-gradient orbs in the accent colors (`#0689E4`, `#1299CA`, `#4A2FBD`) at low opacity (10-30%). These create the Frutiger Nova "luminous cosmos" feeling — as if there's light diffusing through the interface from the space scene behind it. The 3D scene shows through the glass panels via `backdrop-filter: blur()`.

## Typography

| Role | Font | Weight | Size Range |
|------|------|--------|------------|
| Headings / Navigation | Inter | 600-700 | 18-32px |
| Body / UI labels | Inter | 400-500 | 13-16px |
| Telemetry data / MET counter | Space Mono | 400-500 | 14-24px |
| Distance/velocity readouts | Space Mono | 400 | 14-18px |
| Small labels | Inter | 500 | 11-12px, uppercase, letter-spacing 1px |

Both fonts are on Google Fonts. Use tabular numerals for all numeric displays so digits don't shift width as values change.

## Components to Design

### 1. Telemetry Bar

Persistent bar showing live mission data. **Bottom of screen on mobile, top on desktop.**

Contents:
- Mission Elapsed Time (ticking counter, `DDD:HH:MM:SS` format, monospace)
- Distance from Earth (km, updating live)
- Distance from Moon (km, updating live)
- Velocity (km/s)
- Mission phase label (e.g., "Translunar Coast", "Lunar Flyby", "Return Transit")
- Photo count badge (number of photos available)
- "Jump to Now" button (desktop only — on mobile this is a separate FAB)

Design notes:
- Dark glassmorphism: `backdrop-filter: blur(12px)`, the glass surface/border colors from the palette
- Data values in `#6FD7EC` Space Mono, labels in `#8899AA` Inter uppercase
- Should feel like a spacecraft instrument panel, not a web nav bar
- Compact — this shouldn't dominate the screen

### 2. Photo Detail Panel

Opens when a photo marker is selected. **Slides in from right on desktop (400-500px wide), bottom sheet on mobile (expandable).**

Contents:
- Photo (progressive loading: blurred thumb → medium → large)
- Caption and description text
- Camera metadata block: camera model, lens, focal length, aperture, exposure time, ISO
- Spatial context block: distance from Earth, distance from Moon, velocity at capture
- Temporal context: MET at capture, flight day number, UTC date/time
- Left/right navigation arrows to step between photos chronologically
- Close button

Design notes:
- The photo is the hero — give it maximum space
- Camera metadata should feel like an EXIF readout (monospace, compact, grid layout)
- Spatial/temporal context could use small iconographic labels (Earth icon + distance, Moon icon + distance)
- Smooth slide-in animation with slight backdrop dim

### 3. Mission Info Drawer

Expandable side panel. **Hamburger icon trigger on mobile, persistent icon on desktop.**

Contents:
- Crew section: photos and brief bios of Reid Wiseman, Victor Glover, Christina Koch, Jeremy Hansen
- Mission timeline: key events with dates (launch, TLI, flyby, splashdown)
- About section: what this project is, how it works
- Credits: data sources (JPL Horizons, NASA Images API), open-source acknowledgments

Design notes:
- Full-height panel, scrollable
- Same glassmorphism treatment
- Crew photos should feel warm and human against the cosmic backdrop

### 4. "Jump to Now" FAB (Mobile)

Floating action button visible while Artemis II is in flight.

Design notes:
- Use the warm accent color (`#D55E0F`)
- Circular, bottom-right corner, above the telemetry bar
- Pulsing or glowing animation to draw attention
- Icon: could be a location/crosshair icon or a stylized Orion silhouette
- Hidden after mission splashdown

### 5. Scroll Progress Indicator (Mobile)

Thin vertical indicator on the right edge showing scroll position along the trajectory.

Design notes:
- Thin line in trajectory cyan (`#64C8DC`)
- Current position marked with accent dot (`#D55E0F`)
- Photo positions marked with small blue dots (`#4577EA`)
- Essentially a minimap of the trajectory in 1D

### 6. Photo Marker Tooltip (Desktop)

Appears on hover over a photo marker in the 3D scene.

Design notes:
- Small glassmorphic card
- Photo thumbnail (small, ~100px)
- Caption text (1 line, truncated)
- Flight day badge
- Positioned near the cursor, offset so it doesn't cover the marker

### 7. Loading State

Progressive loading experience as assets arrive.

Design notes:
- Initial: dark background with ambient gradient orbs, "Artemis II" title, loading progress
- As scene loads: simple colored spheres first, then textures swap in
- Star catalog and Orion model load last
- The transition from loading to scene should feel seamless, not jarring

## Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| < 768px (mobile) | Scroll-driven navigation, telemetry bar at bottom, photo detail as bottom sheet, FAB for "Jump to Now", hamburger menu for mission info |
| >= 768px (tablet) | Hybrid — orbit controls with optional scroll, telemetry at top, photo detail as right panel |
| >= 1200px (desktop) | Full orbit controls, telemetry at top, photo detail right panel (400-500px), mission info as sidebar |

## CSS Techniques

### Glassmorphism Base

```css
.glass-panel {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.36);
}
```

### Ambient Gradient Orbs

```css
.ambient-orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: -1;
}
/* Place 2-3 of these at different positions with the accent colors */
```

### Performance

- Use `will-change: transform` on animated glass panels
- Limit `backdrop-filter` elements per viewport (expensive on mobile)
- Use `@supports (backdrop-filter: blur(12px))` with solid fallback
- Prefer CSS transitions over JS animations for panel slide-in/out

## What NOT to Do

- No pure black backgrounds — always `#0A0E1A` or darker blues
- No bright white text on glass panels — use `#F0F0F0` (slightly off-white)
- No rounded-everything iOS style — keep some sharp edges for the mission-control feel
- No emoji as UI elements
- No generic dashboard look — this should feel unique, like something NASA would be proud to link to
- Don't overuse the warm accent — it's for the spacecraft position and primary actions ONLY. If everything is orange, nothing is orange.
- Don't make the UI compete with the 3D scene — the trajectory and photos are the star, the UI is the frame

## Deliverables

A complete CSS design system and HTML templates for all 7 components listed above, responsive across the 3 breakpoints. The CSS should be self-contained in a single `main.css` file. HTML templates should use semantic markup and clearly defined class names that match the component descriptions.

The 3D scene (Three.js canvas) occupies the full viewport behind everything. All UI components are HTML/CSS overlays positioned on top of the canvas with `position: fixed` or `position: absolute`. The canvas itself is not part of your deliverable — just design around it.
