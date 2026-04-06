/**
 * Picture-in-Picture broadcast viewer for NASA live stream.
 */

const BROADCAST_URL = 'https://www.youtube.com/embed/m3kR2KK8TEs?autoplay=1&mute=1'

let pipContainer: HTMLElement | null = null
let isOpen = false

export function createBroadcastPip(): HTMLElement {
  // Toggle button
  const btn = document.createElement('button')
  btn.className = 'btn-icon broadcast-btn'
  btn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/>
    </svg>
  `
  btn.title = 'Watch NASA Broadcast'
  btn.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 24px;
    z-index: 15;
    width: 44px;
    height: 44px;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 8px;
    cursor: pointer;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  `

  // PIP container
  pipContainer = document.createElement('div')
  pipContainer.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 24px;
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
