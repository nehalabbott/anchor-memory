import type { MemoryItem, PersonalPreferences, SupportedPerson } from './types'
import { getPerson, listMemories, createMemory, updateMemory, updatePerson, updatePreferences } from './apiClient'
import { useApp } from '@/store/useApp'

export interface LocalDataSnapshot {
  supportedPerson: Pick<SupportedPerson, 'name' | 'personalDetails'>
  memories: MemoryItem[]
  preferences?: Partial<PersonalPreferences>
}

export interface LocalDataSyncResult {
  personId: string
  syncedMemories: number
  preferencesSynced: boolean
}

export class LocalDataSyncError extends Error {
  readonly cause?: unknown

  constructor(readonly stage: string, readonly syncedMemories: number, cause?: unknown) {
    super(`Local data sync stopped during ${stage}; local data was left unchanged.`)
    this.name = 'LocalDataSyncError'
    this.cause = cause
  }
}

/** Explicit, resumable upload of local metadata. It never deletes localStorage or IndexedDB data. */
export async function syncLocalDataToBackend(snapshot: LocalDataSnapshot): Promise<LocalDataSyncResult> {
  let person: SupportedPerson
  try {
    person = await updatePerson(snapshot.supportedPerson)
  } catch (error) {
    throw new LocalDataSyncError('supported-person sync', 0, error)
  }

  let existingMemories: MemoryItem[]
  try {
    existingMemories = await listMemories()
  } catch (error) {
    throw new LocalDataSyncError('memory inventory', 0, error)
  }

  let syncedMemories = 0
  const existingIds = new Set(existingMemories.map((memory) => memory.id))
  for (const memory of snapshot.memories) {
    try {
      if (existingIds.has(memory.id)) await updateMemory(memory.id, memory)
      else await createMemory(memory)
      syncedMemories += 1
    } catch (error) {
      throw new LocalDataSyncError(`memory ${memory.id}`, syncedMemories, error)
    }
  }

  let preferencesSynced = false
  if (snapshot.preferences !== undefined) {
    try {
      await updatePreferences(snapshot.preferences)
      preferencesSynced = true
    } catch (error) {
      throw new LocalDataSyncError('preferences sync', syncedMemories, error)
    }
  }

  return { personId: person.id, syncedMemories, preferencesSynced }
}

/** First-connection import: preserve an existing server person and only create missing stable memory IDs. */
export async function importLegacyLocalDataToBackend(
  snapshot: LocalDataSnapshot,
  existingPerson: SupportedPerson | null,
): Promise<LocalDataSyncResult> {
  let person = existingPerson
  if (!person) {
    try {
      person = await updatePerson(snapshot.supportedPerson)
    } catch (error) {
      throw new LocalDataSyncError('supported-person import', 0, error)
    }
  }

  let existingMemories: MemoryItem[]
  try {
    existingMemories = await listMemories()
  } catch (error) {
    throw new LocalDataSyncError('memory inventory', 0, error)
  }

  const existingIds = new Set(existingMemories.map((memory) => memory.id))
  let syncedMemories = 0
  for (const memory of snapshot.memories) {
    if (existingIds.has(memory.id)) continue
    try {
      await createMemory(memory)
      syncedMemories += 1
    } catch (error) {
      throw new LocalDataSyncError(`memory ${memory.id}`, syncedMemories, error)
    }
  }

  let preferencesSynced = false
  if (snapshot.preferences !== undefined) {
    try {
      await updatePreferences(snapshot.preferences)
      preferencesSynced = true
    } catch (error) {
      throw new LocalDataSyncError('preferences import', syncedMemories, error)
    }
  }
  return { personId: person.id, syncedMemories, preferencesSynced }
}

/** Explicit migration entry point for the current cache; never invoked automatically. */
export function syncStoredLocalDataToBackend(): Promise<LocalDataSyncResult> {
  const { supportedPerson, memories, preferences } = useApp.getState()
  return syncLocalDataToBackend({
    supportedPerson: { name: supportedPerson.name, personalDetails: [...supportedPerson.personalDetails] },
    memories: memories.map((memory) => ({ ...memory })),
    preferences,
  })
}
