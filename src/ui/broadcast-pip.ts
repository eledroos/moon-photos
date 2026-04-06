/**
 * Picture-in-Picture broadcast viewer for NASA live stream.
 */

const BROADCAST_URL = 'https://www.youtube.com/embed/m3kR2KK8TEs?autoplay=1&mute=1'

let pipContainer: HTMLElement | null = null
let isOpen = false

export function createBroadcastPip(): HTMLElement {
  // Toggle button
  const btn = document.createElement('button')
  btn.className = 'telem-btn broadcast-btn'
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
    </svg>
    <span>Watch NASA Live</span>
  `
  btn.style.cssText = `
    position: fixed;
    top: 32px;
    left: 16px;
    z-index: 15;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border: 1px solid var(--glass-border);
    border-radius: 6px;
    background: var(--glass-bg);
    color: var(--text-primary);
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  `

  // PIP container
  pipContainer = document.createElement('div')
  pipContainer.style.cssText = `
    position: fixed;
    top: 64px;
    left: 16px;
    width: 380px;
    height: 214px;
    z-index: 15;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
    display: none;
    background: #000;
  `

  // Close button on PIP
  const closeBtn = document.createElement('button')
  closeBtn.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 16;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(0,0,0,0.6);
    border: 1px solid rgba(255,255,255,0.2);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  `
  closeBtn.innerHTML = '&times;'
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    closePip()
  })
  pipContainer.appendChild(closeBtn)

  // Iframe (loaded lazily on open)
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'width:100%;height:100%;border:none;'
  iframe.allow = 'autoplay; encrypted-media'
  iframe.setAttribute('allowfullscreen', '')
  pipContainer.appendChild(iframe)

  btn.addEventListener('click', () => {
    if (isOpen) {
      closePip()
    } else {
      openPip(iframe)
    }
  })

  document.body.appendChild(pipContainer)
  document.body.appendChild(btn)

  return btn
}

function openPip(iframe: HTMLIFrameElement) {
  if (!pipContainer) return
  iframe.src = BROADCAST_URL
  pipContainer.style.display = 'block'
  isOpen = true
}

function closePip() {
  if (!pipContainer) return
  // Remove iframe src to stop playback
  const iframe = pipContainer.querySelector('iframe')
  if (iframe) iframe.src = ''
  pipContainer.style.display = 'none'
  isOpen = false
}
