import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  createMemory: vi.fn(), deleteMemory: vi.fn(), updateMemory: vi.fn(), updatePerson: vi.fn(),
}))
vi.mock('./apiClient', async (importOriginal) => ({
  ...await importOriginal<typeof import('./apiClient')>(),
  ...api,
}))

import { BackendApiError } from './apiClient'
import { editMemory, removeMemory, saveMemory, savePersonDetails } from './appDataService'
import { useApp } from '@/store/useApp'
import type { MemoryItem, SupportedPerson } from './types'

const originalPerson: SupportedPerson = {
  id: 'supported-person-1', name: 'Before', personalDetails: [], createdAt: 1, updatedAt: 1,
}
const savedMemory: MemoryItem = { id: 'memory-1', kind: 'story', name: 'Story', story: 'Original', createdAt: 1 }

beforeEach(() => {
  vi.resetAllMocks()
  useApp.setState({
    userName: originalPerson.name,
    supportedPerson: originalPerson,
    memories: [savedMemory],
    localDataImported: true,
    pendingPersonSync: false,
    pendingMemoryIds: [],
    dataSyncStatus: 'unknown',
    dataSyncMessage: '',
  })
  api.updatePerson.mockResolvedValue({ ...originalPerson, name: 'After', updatedAt: 2 })
  api.createMemory.mockImplementation(async (memory: MemoryItem) => memory)
  api.updateMemory.mockImplementation(async (id: string, patch: Partial<MemoryItem>) => ({ ...savedMemory, ...patch, id }))
  api.deleteMemory.mockResolvedValue(undefined)
})
afterEach(() => vi.resetAllMocks())

describe('application person and memory data service', () => {
  it('updates the canonical cached person only after the server responds', async () => {
    const pending = vi.fn()
    api.updatePerson.mockImplementation(async () => {
      pending()
      return { ...originalPerson, name: 'After', updatedAt: 2 }
    })

    const result = await savePersonDetails({ name: 'After', personalDetails: [] })

    expect(pending).toHaveBeenCalledOnce()
    expect(result.persistence).toBe('server')
    expect(useApp.getState().supportedPerson.name).toBe('After')
    expect(useApp.getState().userName).toBe('After')
  })

  it('creates server-first and reconciles the returned memory into Zustand', async () => {
    const result = await saveMemory({ name: 'New story', kind: 'story', story: 'Text' })
    expect(result.persistence).toBe('server')
    expect(useApp.getState().memories.some((memory) => memory.id === result.value.id)).toBe(true)
  })

  it('creates the supported person before the first server memory when needed', async () => {
    api.createMemory.mockRejectedValueOnce(new BackendApiError('person missing', 404, 'person_not_found'))
      .mockResolvedValueOnce({ ...savedMemory, id: 'first-memory' })

    const result = await saveMemory({ id: 'first-memory', name: 'First', kind: 'story', story: 'Text' })

    expect(api.updatePerson).toHaveBeenCalledWith({ name: 'Before', personalDetails: [] })
    expect(api.createMemory).toHaveBeenCalledTimes(2)
    expect(result.persistence).toBe('server')
  })

  it('uses the existing cache and marks pending state only when the backend is unavailable', async () => {
    api.createMemory.mockRejectedValue(new BackendApiError('offline', 0, 'backend_unavailable'))
    const result = await saveMemory({ id: 'offline-memory', name: 'Offline', kind: 'story', story: 'Local copy' })

    expect(result.persistence).toBe('device')
    expect(useApp.getState().memories.find((memory) => memory.id === 'offline-memory')?.story).toBe('Local copy')
    expect(useApp.getState().pendingMemoryIds).toContain('offline-memory')
    expect(useApp.getState().dataSyncStatus).toBe('offline')
  })

  it('updates cache from the response, and handles retry of an offline-created ID', async () => {
    useApp.setState({ pendingMemoryIds: ['memory-1'] })
    api.createMemory.mockRejectedValueOnce(new BackendApiError('exists', 409, 'already_exists'))
    api.updateMemory.mockResolvedValue({ ...savedMemory, story: 'Updated remotely' })

    const result = await editMemory('memory-1', { story: 'Updated remotely' })

    expect(api.updateMemory).toHaveBeenCalledWith('memory-1', expect.objectContaining({ story: 'Updated remotely' }))
    expect(result.value.story).toBe('Updated remotely')
    expect(useApp.getState().pendingMemoryIds).not.toContain('memory-1')
  })

  it('does not mutate cached memory when the server rejects an edit', async () => {
    api.updateMemory.mockRejectedValueOnce(new BackendApiError('invalid', 400, 'invalid_request'))

    await expect(editMemory('memory-1', { story: 'Rejected story' })).rejects.toBeInstanceOf(BackendApiError)

    expect(useApp.getState().memories[0]).toEqual(savedMemory)
    expect(useApp.getState().pendingMemoryIds).not.toContain('memory-1')
  })

  it('removes cache only after confirmed server delete and retains it on failure', async () => {
    api.deleteMemory.mockRejectedValueOnce(new BackendApiError('not found', 404, 'memory_not_found'))
    await expect(removeMemory('memory-1')).rejects.toBeInstanceOf(BackendApiError)
    expect(useApp.getState().memories).toContainEqual(savedMemory)

    api.deleteMemory.mockResolvedValueOnce(undefined)
    await removeMemory('memory-1')
    expect(useApp.getState().memories).toEqual([])
  })
})
