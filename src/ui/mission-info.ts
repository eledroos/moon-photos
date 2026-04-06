import { closePhotoPanel } from './photo-detail.js'

let drawerElement: HTMLElement | null = null
let isOpen = false

const CREW = [
  {
    name: 'Reid Wiseman',
    role: 'Commander',
    photo: 'https://www.nasa.gov/wp-content/uploads/2023/06/jsc2023e0016434-alt.jpg?w=400',
    bio: 'https://www.nasa.gov/humans-in-space/astronauts/g-reid-wiseman/',
  },
  {
    name: 'Victor Glover',
    role: 'Pilot',
    photo: 'https://www.nasa.gov/wp-content/uploads/2023/06/jsc2023e0016433-alt.jpg?w=400',
    bio: 'https://www.nasa.gov/humans-in-space/astronauts/victor-j-glover/',
  },
  {
    name: 'Christina Koch',
    role: 'Mission Specialist 1',
    photo: 'https://www.nasa.gov/wp-content/uploads/2023/06/jsc2023e0016435-alt.jpg?w=400',
    bio: 'https://www.nasa.gov/people/christina-koch/',
  },
  {
    name: 'Jeremy Hansen',
    role: 'Mission Specialist 2 (CSA)',
    photo: 'https://www.nasa.gov/wp-content/uploads/2023/06/jsc2023e0016436-alt.jpg?w=400',
    bio: 'https://www.asc-csa.gc.ca/eng/astronauts/canadian/active/bio-jeremy-hansen.asp',
  },
]

// Detailed timeline with EDT times
const TIMELINE_EVENTS = [
  { day: 'FD 1', date: 'Apr 1', time: '6:35 PM', label: 'Liftoff', detail: 'Launch Complex 39B, KSC', icon: '🚀', ts: '2026-04-01T22:35:00Z' },
  { day: 'FD 1', date: 'Apr 1', time: '6:43 PM', label: 'Core Stage Separation', detail: 'MECO + ICPS takeover', ts: '2026-04-01T22:43:00Z' },
  { day: 'FD 1', date: 'Apr 1', time: '8:22 PM', label: 'Apogee Raise Burn', detail: '18-min burn → 43,760 mi orbit', ts: '2026-04-02T00:22:00Z' },
  { day: 'FD 1', date: 'Apr 1', time: '10:01 PM', label: 'ICPS Separation', detail: 'Orion free-flying', ts: '2026-04-02T02:01:00Z' },
  { day: 'FD 1', date: 'Apr 1', time: '10:10 PM', label: 'Proximity Operations', detail: 'Crew manually pilots near ICPS', ts: '2026-04-02T02:10:00Z' },
  { day: 'FD 2', date: 'Apr 2', time: 'AM', label: 'Perigee Raise Burn', detail: '43-second firing', ts: '2026-04-02T14:00:00Z' },
  { day: 'FD 2', date: 'Apr 2', time: '7:49 PM', label: 'Translunar Injection', detail: '5m 55s burn — humans leave Earth orbit', icon: '🌙', ts: '2026-04-02T23:49:00Z' },
  { day: 'FD 3', date: 'Apr 3', time: '', label: 'Outbound Coast Begins', detail: 'TCB #1 cancelled (on target)', ts: '2026-04-03T12:00:00Z' },
  { day: 'FD 4', date: 'Apr 4', time: '', label: 'Manual Piloting Demo', detail: '41-min crew demonstration', ts: '2026-04-04T12:00:00Z' },
  { day: 'FD 5', date: 'Apr 5', time: '11:03 PM', label: 'Trajectory Correction #3', detail: '17.5-second firing', ts: '2026-04-06T03:03:00Z' },
  { day: 'FD 5', date: 'Apr 5', time: 'Late', label: 'Lunar Sphere of Influence', detail: "Moon's gravity now dominant", ts: '2026-04-06T04:41:00Z' },
  { day: 'FD 6', date: 'Apr 6', time: '7:02 PM', label: 'Lunar Flyby', detail: '~4,050 mi from surface (far side)', icon: '🌑', ts: '2026-04-06T23:02:00Z' },
  { day: 'FD 7', date: 'Apr 7', time: '9:03 PM', label: 'Return Correction #1', detail: '43-second firing', ts: '2026-04-08T01:03:00Z' },
  { day: 'FD 9', date: 'Apr 9', time: '10:53 PM', label: 'Return Correction #2', detail: 'Final trajectory trim', ts: '2026-04-10T02:53:00Z' },
  { day: 'FD 10', date: 'Apr 10', time: '7:53 PM', label: 'Entry Interface', detail: '400,000 ft, 25,000 mph', ts: '2026-04-10T23:53:00Z' },
  { day: 'FD 10', date: 'Apr 10', time: '8:07 PM', label: 'Splashdown', detail: 'Pacific Ocean, off San Diego', icon: '🌊', ts: '2026-04-11T00:07:00Z' },
]

function getActiveEventIndex(): number {
  const now = Date.now()
  let idx = -1
  for (let i = 0; i < TIMELINE_EVENTS.length; i++) {
    if (now >= Date.parse(TIMELINE_EVENTS[i].ts)) idx = i
  }
  return idx
}

function buildCrewGrid(): string {
  return CREW.map(c => {
    const initials = c.name.split(' ').map(p => p[0]).join('')
    return `
    <a href="${c.bio}" target="_blank" rel="noopener" class="crew-member" style="text-decoration:none;color:inherit;cursor:pointer;">
      <div class="crew-avatar" style="border:2px solid rgba(100,200,220,0.3);transition:border-color 0.2s;">
        <img src="${c.photo}" alt="${c.name}"
             style="width:100%;height:100%;object-fit:cover;border-radius:50%;"
             onerror="this.style.display='none';this.parentElement.innerHTML='<span style=\\'font-size:20px;font-weight:700;color:rgba(255,255,255,0.8)\\'>${initials}</span>'"
        >
      </div>
      <div style="font-size:13px;font-weight:500;">${c.name}</div>
      <div style="font-size:11px;color:var(--text-secondary);">${c.role}</div>
    </a>
  `}).join('')
}

function buildTimeline(): string {
  const activeIdx = getActiveEventIndex()

  return TIMELINE_EVENTS.map((ev, i) => {
    const isPast = i <= activeIdx
    const isActive = i === activeIdx
    const isFuture = i > activeIdx

    const dotColor = isActive ? 'var(--accent-active, #D55E0F)' :
                     isPast ? 'var(--trajectory, #64C8DC)' : 'rgba(100,200,220,0.3)'
    const dotShadow = isActive ? 'box-shadow: 0 0 8px var(--accent-active, #D55E0F);' : ''
    const textOpacity = isFuture ? 'opacity:0.4;' : ''
    const icon = ev.icon || ''

    return `
      <div class="timeline-item ${isActive ? 'active' : ''}" style="${textOpacity}">
        <div style="position:absolute;left:-17px;top:5px;width:8px;height:8px;border-radius:50%;background:${dotColor};${dotShadow}"></div>
        <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:1px;">
          <span style="font-size:10px;font-weight:600;color:${isActive ? '#D55E0F' : '#8899AA'};text-transform:uppercase;letter-spacing:0.5px;min-width:32px;">${ev.day}</span>
          <span style="font-size:13px;font-weight:${isActive ? '600' : '500'};color:${isActive ? '#F0F0F0' : '#ccc'};">${icon} ${ev.label}</span>
        </div>
        <div style="margin-left:38px;font-size:10px;color:var(--text-secondary);line-height:1.3;">
          ${ev.time ? `<span style="color:#6FD7EC;font-family:var(--font-data,'Space Mono',monospace);font-size:10px;">${ev.time} EDT</span> · ` : ''}${ev.detail}
        </div>
      </div>
    `
  }).join('')
}

export function createMissionDrawer(): {
  element: HTMLElement
  toggle: () => void
} {
  const drawer = document.createElement('aside')
  drawer.className = 'mission-drawer glass-panel'
  drawer.id = 'mission-drawer'
  drawer.setAttribute('aria-label', 'Mission information')

  drawer.innerHTML = `
    <div class="panel-header drawer-header">
      <h2 class="panel-title">Artemis II</h2>
      <button class="btn-icon" id="drawer-close" aria-label="Close mission drawer">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <section>
      <div class="label-text" style="margin-bottom:8px;color:var(--trajectory);">The Crew</div>
      <div class="crew-grid">
        ${buildCrewGrid()}
      </div>
    </section>

    <section>
      <div class="label-text" style="margin-bottom:8px;color:var(--trajectory);">Flight Timeline</div>
      <div class="timeline" style="gap:14px;">
        ${buildTimeline()}
      </div>
    </section>

    <section>
      <div class="label-text" style="margin-bottom:8px;">About</div>
      <p style="font-size:12px;color:var(--text-secondary);line-height:1.6;">
        An interactive 3D trajectory viewer for NASA's Artemis II — the first crewed
        lunar flyby since Apollo 17 (1972). Positions computed from JPL Horizons ephemeris.
        Photos from the NASA Images API, pinned to the trajectory by EXIF capture time.
      </p>
    </section>

    <section style="padding-bottom:1rem;">
      <div class="label-text" style="margin-bottom:8px;">Data Sources</div>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:4px;">
        <li style="font-size:12px;color:var(--text-secondary);"><span style="color:var(--trajectory);">JPL Horizons</span> — Ephemeris data</li>
        <li style="font-size:12px;color:var(--text-secondary);"><span style="color:var(--trajectory);">NASA Images API</span> — Photography</li>
        <li style="font-size:12px;color:var(--text-secondary);"><span style="color:var(--trajectory);">HYG Catalog</span> — Star positions</li>
        <li style="font-size:12px;color:var(--text-secondary);"><span style="color:var(--trajectory);">Three.js</span> — 3D rendering</li>
      </ul>
    </section>
  `

  drawer.querySelector('#drawer-close')!.addEventListener('click', () => closeDrawer())
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeDrawer()
  })

  const uiLayer = document.getElementById('ui-layer')
  if (uiLayer) uiLayer.appendChild(drawer)
  drawerElement = drawer

  function openDrawer(): void {
    closePhotoPanel()
    drawer.classList.add('active')
    isOpen = true
  }

  function closeDrawer(): void {
    drawer.classList.remove('active')
    isOpen = false
  }

  function toggle(): void {
    isOpen ? closeDrawer() : openDrawer()
  }

  return { element: drawer, toggle }
}

export function isMissionDrawerOpen(): boolean {
  return drawerElement?.classList.contains('active') ?? false
}
