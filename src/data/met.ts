import { formatMet, currentMet, utcToMet, flightDay, LAUNCH_EPOCH_MS } from '../../shared/met.js'

export { formatMet, currentMet, utcToMet, flightDay, LAUNCH_EPOCH_MS }

/**
 * Creates a MET ticker that calls the callback every second with the formatted MET string.
 * Returns a cleanup function to stop the ticker.
 */
export function createMetTicker(callback: (formatted: string, metSeconds: number) => void): () => void {
  const update = () => {
    const met = currentMet()
    callback(formatMet(met), met)
  }
  update() // Call immediately
  const id = setInterval(update, 1000)
  return () => clearInterval(id)
}
