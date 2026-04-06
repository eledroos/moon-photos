/**
 * First-visit onboarding tooltip pointing to the timeline bar.
 * Shows once, then stores a flag in localStorage so it doesn't repeat.
 */

const STORAGE_KEY = 'artemis2-onboarding-seen'

export function showOnboardingTooltip(): void {
  if (localStorage.getItem(STORAGE_KEY)) return

  // Wait for timeline bar to be in the DOM
  setTimeout(() => {
    const timelineBar = document.getElementById('timeline-bar')
    if (!timelineBar) return

    const tooltip = document.createElement('div')
    tooltip.id = 'onboarding-tooltip'
    tooltip.style.cssText = `
      position: fixed;
      right: 52px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 35;
      background: rgba(10, 14, 26, 0.95);
      border: 1px solid var(--accent-active, #D55E0F);
      border-radius: 8px;
      padding: 14px 18px;
      max-width: 220px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      animation: onboardFadeIn 0.5s ease-out;
    `

    tooltip.innerHTML = `
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px;">
        Browse mission photos
      </div>
      <div style="font-size:11px;color:var(--text-secondary);line-height:1.5;margin-bottom:10px;">
        Click the dots on the timeline to jump to photos taken along the trajectory. Hover for details.
      </div>
      <button id="onboarding-dismiss" style="
        background:var(--accent-active);color:#fff;border:none;border-radius:4px;
        padding:5px 12px;font-size:11px;font-weight:600;cursor:pointer;
        font-family:var(--font-ui,'Inter',sans-serif);
      ">Got it</button>

      <!-- Arrow pointing right toward the timeline bar -->
      <div style="
        position:absolute;
        right:-8px;
        top:50%;
        transform:translateY(-50%);
        width:0;height:0;
        border-top:8px solid transparent;
        border-bottom:8px solid transparent;
        border-left:8px solid var(--accent-active, #D55E0F);
      "></div>
    `

    // Inject animation keyframes
    if (!document.getElementById('onboard-styles')) {
      const style = document.createElement('style')
      style.id = 'onboard-styles'
      style.textContent = `
        @keyframes onboardFadeIn {
          from { opacity: 0; transform: translateY(-50%) translateX(10px); }
          to { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
      `
      document.head.appendChild(style)
    }

    document.body.appendChild(tooltip)

    tooltip.querySelector('#onboarding-dismiss')!.addEventListener('click', () => {
      tooltip.style.opacity = '0'
      tooltip.style.transition = 'opacity 0.3s'
      setTimeout(() => tooltip.remove(), 300)
      localStorage.setItem(STORAGE_KEY, '1')
    })

    // Auto-dismiss after 12 seconds
    setTimeout(() => {
      if (tooltip.parentElement) {
        tooltip.style.opacity = '0'
        tooltip.style.transition = 'opacity 0.3s'
        setTimeout(() => tooltip.remove(), 300)
        localStorage.setItem(STORAGE_KEY, '1')
      }
    }, 12000)
  }, 2000) // 2s after load to let the scene settle
}
