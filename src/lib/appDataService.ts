import { BackendApiError, createMemory, deleteMemory, updateMemory, updatePerson, updatePreferences } from './apiClient'
import { importLegacyLocalDataToBackend } from './localDataSync'
import type { MemoryItem, MemoryKind, PersonalPreferences, SupportedPerson } from './types'
import { useApp } from '@/store/useApp'

export type MemoryInput = Omit<MemoryItem, 'id' | 'createdAt' | 'kind'> & {
  id?: string
  createdAt?: number
  kind?: MemoryKind
}

export interface PersistenceResult<T> {
  value: T
  persistence: 'server' | 'device'
}

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

function unavailable(error: unknown): error is BackendApiError {
  return error instanceof BackendApiError && error.status === 0
}

function statusForError(error: unknown) {
  if (unavailable(error)) {
    useApp.getState().setDataSyncStatus('offline', 'Changes are kept on this device while the connection is unavailable.')
  } else {
    useApp.getState().setDataSyncStatus('error', 'This change could not be saved. Please try again.')
  }
}

export async function savePreferences(preferences: PersonalPreferences): Promise<PersistenceResult<PersonalPreferences>> {
  useApp.getState().setDataSyncStatus('syncing')
  try {
    const saved = await updatePreferences(preferences)
    useApp.getState().setPreferences(saved)
    useApp.getState().setDataSyncStatus('synced')
    return { value: useApp.getState().preferences, persistence: 'server' }
  } catch (error) {
    if (unavailable(error)) {
      useApp.getState().setDataSyncStatus('offline', 'Preferences remain safely on this device while the connection is unavailable.')
      return { value: preferences, persistence: 'device' }
    }
    statusForError(error)
    throw error
  }
}

export async function savePersonDetails(input: Pick<SupportedPerson, 'name' | 'personalDetails'>): Promise<PersistenceResult<SupportedPerson>> {
  useApp.getState().setDataSyncStatus('syncing')
  try {
    const person = await updatePerson(input)
    const state = useApp.getState()
    state.setCachedPerson(person)
    state.setPendingPersonSync(false)
    if (!state.localDataImported) {
      try {
        await importLegacyLocalDataToBackend({
          supportedPerson: { name: person.name, personalDetails: person.personalDetails },
          memories: state.memories.map((memory) => ({ ...memory })),
        }, person)
        useApp.getState().setLocalDataImported(true)
        useApp.getState().setDataSyncStatus('synced')
      } catch {
        useApp.getState().setDataSyncStatus('error', 'Your profile was saved; some existing memories still need to sync.')
      }
    } else useApp.getState().setDataSyncStatus('synced')
    return { value: person, persistence: 'server' }
  } catch (error) {
    if (unavailable(error)) {
      const current = useApp.getState().supportedPerson
      const person = { ...current, ...input, updatedAt: Date.now() }
      useApp.getState().setCachedPerson(person)
      useApp.getState().setPendingPersonSync(true)
      statusForError(error)
      return { value: person, persistence: 'device' }
    }
    statusForError(error)
    throw error
  }
}

async function createOrUpdateMemory(memory: MemoryItem) {
  try {
    return await createMemory(memory)
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 409) return updateMemory(memory.id, memory)
    throw error
  }
}

export async function saveMemory(input: MemoryInput): Promise<PersistenceResult<MemoryItem>> {
  const current = useApp.getState()
  const memory: MemoryItem = {
    ...input,
    id: input.id ?? makeId(),
    kind: input.kind ?? (input.relationship ? 'person' : 'story'),
    createdAt: input.createdAt ?? Date.now(),
    story: input.story ?? '',
  }
  current.setDataSyncStatus('syncing')
  try {
    let saved: MemoryItem
    try {
      saved = await createOrUpdateMemory(memory)
    } catch (error) {
      if (!(error instanceof BackendApiError) || error.code !== 'person_not_found') throw error
      const personState = useApp.getState().supportedPerson
      const person = await updatePerson({ name: personState.name, personalDetails: personState.personalDetails })
      useApp.getState().setCachedPerson(person)
      saved = await createOrUpdateMemory(memory)
    }
    useApp.getState().cacheMemory(saved)
    useApp.getState().clearPendingMemoryIds([saved.id])
    useApp.getState().setDataSyncStatus('synced')
    return { value: saved, persistence: 'server' }
  } catch (error) {
    if (unavailable(error)) {
      useApp.getState().cacheMemory(memory)
      useApp.getState().addPendingMemoryId(memory.id)
      statusForError(error)
      return { value: memory, persistence: 'device' }
    }
    statusForError(error)
    throw error
  }
}

export async function editMemory(memoryId: string, patch: Partial<MemoryItem>): Promise<PersistenceResult<MemoryItem>> {
  const before = useApp.getState().memories.find((memory) => memory.id === memoryId)
  if (!before) throw new Error('Memory is no longer available in the local cache.')
  useApp.getState().setDataSyncStatus('syncing')
  try {
    const pending = useApp.getState().pendingMemoryIds.includes(memoryId)
    const saved = pending
      ? await createOrUpdateMemory({ ...before, ...patch, id: memoryId, createdAt: before.createdAt })
      : await updateMemory(memoryId, patch)
    useApp.getState().cacheMemory(saved)
    useApp.getState().clearPendingMemoryIds([memoryId])
    useApp.getState().setDataSyncStatus('synced')
    return { value: saved, persistence: 'server' }
  } catch (error) {
    if (unavailable(error)) {
      const updated = { ...before, ...patch, id: memoryId, createdAt: before.createdAt }
      useApp.getState().cacheMemory(updated)
      useApp.getState().addPendingMemoryId(memoryId)
      statusForError(error)
      return { value: updated, persistence: 'device' }
    }
    statusForError(error)
    throw error
  }
}

export async function removeMemory(memoryId: string): Promise<PersistenceResult<string>> {
  useApp.getState().setDataSyncStatus('syncing')
  try {
    await deleteMemory(memoryId)
    useApp.getState().removeCachedMemory(memoryId)
    useApp.getState().clearPendingMemoryIds([memoryId])
    useApp.getState().setDataSyncStatus('synced')
    return { value: memoryId, persistence: 'server' }
  } catch (error) {
    statusForError(error)
    throw error
  }
}
