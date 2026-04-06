/**
 * Update loading progress bar and status text.
 */
export function updateLoadingProgress(percent: number, statusText: string): void {
  const bar = document.getElementById('loading-bar')
  const text = document.getElementById('loading-text')
  if (bar) bar.style.width = `${percent}%`
  if (text) text.textContent = statusText
}

/**
 * Hide loading screen with fade animation.
 */
export function hideLoadingScreen(): void {
  const screen = document.getElementById('loading-screen')
  if (!screen) return
  screen.classList.add('hidden')
  // Remove from DOM after transition
  setTimeout(() => {
    screen.style.display = 'none'
  }, 800)
}
