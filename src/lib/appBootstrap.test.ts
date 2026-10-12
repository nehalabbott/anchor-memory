import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BackendApiError } from './apiClient'

const api = vi.hoisted(() => ({
  getPerson: vi.fn(),
  getPreferences: vi.fn(),
  listMemories: vi.fn(),
  listAssessments: vi.fn(),
  createMemory: vi.fn(),
  updateMemory: vi.fn(),
  updatePerson: vi.fn(),
}))
vi.mock('./apiClient', async (importOriginal) => ({
  ...await importOriginal<typeof import('./apiClient')>(),
  ...api,
}))

import { initializeAppData, resetAppDataBootstrapForTests } from './appBootstrap'
import { useApp } from '@/store/useApp'
import { useScreenContext } from '@/store/useScreenContext'
import type { MemoryItem, SupportedPerson } from './types'

const localPerson: SupportedPerson = {
  id: 'supported-person-1', name: 'Local Name', personalDetails: ['Likes gardening'], createdAt: 1, updatedAt: 1,
}
const serverPerson: SupportedPerson = {
  id: 'supported-person-1', name: 'Server Name', personalDetails: ['Enjoys tea'], createdAt: 1, updatedAt: 2,
}
const localMemory: MemoryItem = { id: 'local-memory', kind: 'story', name: 'Local story', story: 'Local text', createdAt: 1 }
const serverMemory: MemoryItem = { id: 'server-memory', kind: 'place', name: 'Server place', story: 'From SQLite', createdAt: 2 }

function setCachedState(overrides: Partial<ReturnType<typeof useApp.getState>> = {}) {
  useApp.setState({
    supportedPerson: localPerson,
    userName: localPerson.name,
    memories: [localMemory],
    localDataImported: false,
    pendingPersonSync: false,
    pendingMemoryIds: [],
    dataSyncStatus: 'unknown',
    ...overrides,
  })
}

function resetMocks() {
  resetAppDataBootstrapForTests()
  vi.resetAllMocks()
  setCachedState()
  api.getPerson.mockResolvedValue(serverPerson)
  api.getPreferences.mockResolvedValue(null)
  api.listMemories.mockResolvedValue([serverMemory])
  api.listAssessments.mockResolvedValue([])
  api.createMemory.mockImplementation(async (memory: MemoryItem) => memory)
  api.updateMemory.mockImplementation(async (_id: string, memory: MemoryItem) => memory)
  api.updatePerson.mockResolvedValue(serverPerson)
}

beforeEach(() => resetMocks())
afterEach(() => resetMocks())

describe('application data bootstrap', () => {
  it('imports legacy person and stable memory IDs once, then hydrates from backend', async () => {
    api.getPerson.mockResolvedValueOnce(null).mockResolvedValue(serverPerson)
    api.updatePerson.mockResolvedValue(serverPerson)
    api.listMemories.mockResolvedValueOnce([]).mockResolvedValue([localMemory])
    api.createMemory.mockResolvedValue(localMemory)

    await initializeAppData({ hadLocalData: true })

    expect(api.updatePerson).toHaveBeenCalledOnce()
    expect(api.createMemory.mock.calls).toEqual([[localMemory]])
    expect(useApp.getState().localDataImported).toBe(true)
    expect(useApp.getState().supportedPerson.name).toBe('Server Name')
    expect(useApp.getState().userName).toBe('Server Name')
    expect(useApp.getState().memories).toEqual([localMemory])
  })

  it('keeps an existing backend person canonical while importing only missing local memory IDs', async () => {
    api.listMemories.mockResolvedValueOnce([localMemory]).mockResolvedValue([serverMemory, localMemory])
    api.getPreferences.mockResolvedValue({ theme: 'calming-pastels', favoriteColors: [], favoriteFlower: null, favoriteBird: null, favoriteSong: null, lifeActivityTags: [] })

    await initializeAppData({ hadLocalData: true })

    expect(api.updatePerson).not.toHaveBeenCalled()
    expect(api.createMemory).not.toHaveBeenCalled()
    expect(useApp.getState().supportedPerson).toEqual(serverPerson)
    expect(useApp.getState().memories).toEqual([serverMemory, localMemory])
    expect(useApp.getState().userName).toBe(serverPerson.name)
    expect(useApp.getState().preferences.theme).toBe('calming-pastels')
  })

  it('does not repeat legacy import after its marker is persisted', async () => {
    setCachedState({ localDataImported: true })

    await initializeAppData({ hadLocalData: true })

    expect(api.updatePerson).not.toHaveBeenCalled()
    expect(api.createMemory).not.toHaveBeenCalled()
    expect(useApp.getState().memories).toEqual([serverMemory])
  })

  it('preserves local cache and reports offline when the backend is unavailable', async () => {
    api.getPerson.mockRejectedValue(new BackendApiError('offline', 0, 'backend_unavailable'))

    await initializeAppData({ hadLocalData: true })

    expect(useApp.getState().supportedPerson).toEqual(localPerson)
    expect(useApp.getState().memories).toEqual([localMemory])
    expect(useApp.getState().dataSyncStatus).toBe('offline')
  })

  it('restores the latest completed assessment baseline without changing transient game difficulty', async () => {
    api.listAssessments.mockResolvedValue([{
      id: 'assessment-1', personId: serverPerson.id, instrumentId: 'anchor-cognitive-screening',
      instrumentVersion: '1.0-supportive-screening', consent: true, startedAt: 1,
      completedAt: 2, status: 'completed', result: { baselineDifficulty: 2 }, createdAt: 2,
    }])
    useScreenContext.setState({ assessmentBaselineDifficulty: null, difficultyLevel: 3 })

    await initializeAppData({ hadLocalData: false })

    expect(useApp.getState().supportedPerson).toEqual(serverPerson)
    expect(useScreenContext.getState().assessmentBaselineDifficulty).toBe(2)
    expect(useScreenContext.getState().difficultyLevel).toBe(3)
  })

  it('shares a single in-flight bootstrap across StrictMode-style repeated effects', async () => {
    const first = initializeAppData({ hadLocalData: false })
    const second = initializeAppData({ hadLocalData: false })
    expect(first).toBe(second)
    await first
    expect(api.getPerson).toHaveBeenCalledTimes(3)
  })
})
