import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs'
import {
  defaultState, loadState, saveState,
  addKnownPhoto, addFailedExif, removeFailedExif, getFailedExifEntry
} from '../../server/utils/state.js'

const TEST_DATA_DIR = 'data'

describe('State manager', () => {
  beforeEach(() => {
    // Clean state file before each test
    if (existsSync(`${TEST_DATA_DIR}/state.json`)) {
      rmSync(`${TEST_DATA_DIR}/state.json`)
    }
  })

  it('defaultState returns valid initial state', () => {
    const state = defaultState()
    expect(state.lastFetch.trajectory).toBeNull()
    expect(state.knownPhotoIds).toEqual([])
    expect(state.failedExif).toEqual([])
    expect(state.totalPhotosFetched).toBe(0)
  })

  it('loadState returns default when no file exists', () => {
    const state = loadState()
    expect(state.knownPhotoIds).toEqual([])
  })

  it('saveState and loadState round-trip', () => {
    const state = defaultState()
    state.knownPhotoIds = ['art002e000001']
    state.totalPhotosFetched = 5
    saveState(state)
    const loaded = loadState()
    expect(loaded.knownPhotoIds).toEqual(['art002e000001'])
    expect(loaded.totalPhotosFetched).toBe(5)
  })

  it('addKnownPhoto adds unique IDs', () => {
    const state = defaultState()
    addKnownPhoto(state, 'art002e000001')
    addKnownPhoto(state, 'art002e000002')
    addKnownPhoto(state, 'art002e000001') // duplicate
    expect(state.knownPhotoIds).toEqual(['art002e000001', 'art002e000002'])
  })

  it('addFailedExif creates new entry', () => {
    const state = defaultState()
    addFailedExif(state, 'art002e000001', '404 not found')
    expect(state.failedExif).toHaveLength(1)
    expect(state.failedExif[0].attempts).toBe(1)
    expect(state.failedExif[0].reason).toBe('404 not found')
  })

  it('addFailedExif increments existing entry', () => {
    const state = defaultState()
    addFailedExif(state, 'art002e000001', '404')
    addFailedExif(state, 'art002e000001', 'timeout')
    expect(state.failedExif).toHaveLength(1)
    expect(state.failedExif[0].attempts).toBe(2)
    expect(state.failedExif[0].reason).toBe('timeout')
  })

  it('removeFailedExif removes entry', () => {
    const state = defaultState()
    addFailedExif(state, 'art002e000001', '404')
    removeFailedExif(state, 'art002e000001')
    expect(state.failedExif).toHaveLength(0)
  })

  it('getFailedExifEntry finds entry', () => {
    const state = defaultState()
    addFailedExif(state, 'art002e000001', '404')
    const entry = getFailedExifEntry(state, 'art002e000001')
    expect(entry).toBeDefined()
    expect(entry!.id).toBe('art002e000001')
  })

  it('getFailedExifEntry returns undefined for missing', () => {
    const state = defaultState()
    expect(getFailedExifEntry(state, 'nonexistent')).toBeUndefined()
  })
})
