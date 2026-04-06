// =============================================================================
// FAB — Jump to Now (mobile circular button)
// =============================================================================

/**
 * Create and inject the "Jump to Now" FAB into #ui-layer.
 * The button is hidden on desktop via CSS (.fab-jump { display: none }).
 * On mobile (<768 px) it becomes visible and emits a 'jump-to-now' CustomEvent
 * when tapped.
 */
export function createJumpToNowFab(): HTMLElement {
  const fab = document.createElement('button')
  fab.className = 'fab-jump'
  fab.setAttribute('aria-label', 'Jump to current mission position')
  fab.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
    </svg>
  `
  fab.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('jump-to-now'))
  })

  const uiLayer = document.getElementById('ui-layer')
  if (uiLayer) uiLayer.appendChild(fab)

  return fab
}

/**
 * Hide the FAB after the mission's Pacific Splashdown (Apr 10 2026 23:00 UTC).
 * Call this once on page load and optionally on a timer if the page stays open
 * across the splashdown boundary.
 */
export function updateFabVisibility(fab: HTMLElement): void {
  const splashdownMs = Date.parse('2026-04-10T23:00:00Z')
  if (Date.now() > splashdownMs) {
    fab.style.display = 'none'
  }
}

// =============================================================================
// Desktop Photo Tooltip — shown on marker hover
// =============================================================================

export interface PhotoTooltip {
  element: HTMLElement
  show: (x: number, y: number, thumbUrl: string, caption: string, flightDay: number) => void
  hide: () => void
}

/**
 * Create and inject a glassmorphic hover tooltip into #ui-layer.
 * The tooltip is desktop-only (hidden on mobile via the `.desktop-only` class).
 *
 * Usage:
 *   const tooltip = createPhotoTooltip()
 *   tooltip.show(mouseX, mouseY, photo.urls.thumb, photo.caption, photo.flightDay)
 *   tooltip.hide()
 */
export function createPhotoTooltip(): PhotoTooltip {
  const tooltip = document.createElement('div')
  tooltip.className = 'hover-tooltip glass-panel desktop-only'
  tooltip.innerHTML = `
    <img class="tooltip-thumb" src="" alt="">
    <div>
      <div class="label-text accent-color" id="tooltip-day"></div>
      <div style="font-size: 13px; font-weight: 500; margin-top: 2px;" id="tooltip-caption"></div>
    </div>
  `

  const uiLayer = document.getElementById('ui-layer')
  if (uiLayer) uiLayer.appendChild(tooltip)

  return {
    element: tooltip,

    show(x: number, y: number, thumbUrl: string, caption: string, flightDay: number) {
      const img = tooltip.querySelector('.tooltip-thumb') as HTMLImageElement
      img.src = thumbUrl
      tooltip.querySelector('#tooltip-day')!.textContent = `Flight Day ${flightDay}`
      tooltip.querySelector('#tooltip-caption')!.textContent =
        caption.length > 50 ? caption.slice(0, 50) + '...' : caption
      tooltip.style.left = `${x + 20}px`
      tooltip.style.top = `${y - 20}px`
      tooltip.classList.add('visible')
    },

    hide() {
      tooltip.classList.remove('visible')
    },
  }
}
