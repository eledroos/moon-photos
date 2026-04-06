import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import type { ServerState, FailedExif } from '../../shared/types.js'

const STATE_PATH = 'data/state.json'
const DATA_DIR = 'data'

export function defaultState(): ServerState {
  return {
    lastFetch: {
      trajectory: null,
      moon: null,
      sun: null,
      photos: null,
    },
    knownPhotoIds: [],
    failedExif: [],
    startedAt: new Date().toISOString(),
    totalPhotosFetched: 0,
    totalHorizonsCalls: 0,
  }
}

export function loadState(): ServerState {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
  if (existsSync(STATE_PATH)) {
    const raw = readFileSync(STATE_PATH, 'utf-8')
    return JSON.parse(raw) as ServerState
  }
  return defaultState()
}

export function saveState(state: ServerState): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8')
}

export function addKnownPhoto(state: ServerState, id: string): void {
  if (!state.knownPhotoIds.includes(id)) {
    state.knownPhotoIds.push(id)
  }
}

export function addFailedExif(state: ServerState, id: string, reason: string): void {
  const existing = state.failedExif.find(e => e.id === id)
  if (existing) {
    existing.attempts += 1
    existing.reason = reason
    existing.lastAttempt = new Date().toISOString()
  } else {
    state.failedExif.push({
      id,
      reason,
      attempts: 1,
      lastAttempt: new Date().toISOString(),
    })
  }
}

export function removeFailedExif(state: ServerState, id: string): void {
  state.failedExif = state.failedExif.filter(e => e.id !== id)
}

export function getFailedExifEntry(state: ServerState, id: string): FailedExif | undefined {
  return state.failedExif.find(e => e.id === id)
}
