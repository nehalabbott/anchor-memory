import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MemoryItem } from './types'

const api = vi.hoisted(() => ({
  listMemories: vi.fn(),
  createMemory: vi.fn(),
  updateMemory: vi.fn(),
  updatePerson: vi.fn(),
  updatePreferences: vi.fn(),
}))

vi.mock('./apiClient', () => api)

import { LocalDataSyncError, syncLocalDataToBackend, syncStoredLocalDataToBackend } from './localDataSync'
import { useApp } from '@/store/useApp'

const memory = (id: string): MemoryItem => ({ id, kind: 'story', name: id, story: 'Local detail', createdAt: 1 })

afterEach(() => vi.resetAllMocks())

describe('explicit local-data sync', () => {
  it('upserts person, memories, and optional preferences without deleting local data', async () => {
    api.updatePerson.mockResolvedValue({ id: 'supported-person-1', name: 'M', personalDetails: [], createdAt: 1, updatedAt: 2 })
    api.listMemories.mockResolvedValue([memory('existing')])
    api.updateMemory.mockResolvedValue(memory('existing'))
    api.createMemory.mockResolvedValue(memory('new'))
    api.updatePreferences.mockResolvedValue({ favoriteFlower: 'Jasmine' })

    const result = await syncLocalDataToBackend({
      supportedPerson: { name: 'M', personalDetails: [] },
      memories: [memory('existing'), memory('new')],
      preferences: { favoriteFlower: 'Jasmine' },
    })

    expect(result).toEqual({ personId: 'supported-person-1', syncedMemories: 2, preferencesSynced: true })
    expect(api.updateMemory).toHaveBeenCalledWith('existing', memory('existing'))
    expect(api.createMemory).toHaveBeenCalledWith(memory('new'))
    expect(api.updatePreferences).toHaveBeenCalledWith({ favoriteFlower: 'Jasmine' })
    expect(api).not.toHaveProperty('deleteMemory')
  })

  it('throws an incomplete-stage error rather than reporting partial sync as complete', async () => {
    api.updatePerson.mockResolvedValue({ id: 'supported-person-1' })
    api.listMemories.mockResolvedValue([])
    api.createMemory.mockRejectedValue(new Error('backend unavailable'))

    await expect(syncLocalDataToBackend({
      supportedPerson: { name: 'M', personalDetails: [] }, memories: [memory('failed')],
    })).rejects.toMatchObject({ stage: 'memory failed', syncedMemories: 0 })
    expect(api.updatePreferences).not.toHaveBeenCalled()
  })

  it('snapshots the current Zustand profile and memories only when explicitly called', async () => {
    useApp.setState({
      supportedPerson: { id: 'supported-person-1', name: 'Stored', personalDetails: ['Familiar routine'], createdAt: 1, updatedAt: 1 },
      memories: [memory('stored-memory')],
    })
    api.updatePerson.mockResolvedValue({ id: 'supported-person-1', name: 'Stored', personalDetails: ['Familiar routine'] })
    api.listMemories.mockResolvedValue([])
    api.createMemory.mockResolvedValue(memory('stored-memory'))

    const result = await syncStoredLocalDataToBackend()

    expect(api.updatePerson).toHaveBeenCalledWith({ name: 'Stored', personalDetails: ['Familiar routine'] })
    expect(api.createMemory).toHaveBeenCalledWith(memory('stored-memory'))
    expect(result.syncedMemories).toBe(1)
  })
})
