import { BackendApiError, createMemory, getPerson, getPreferences, listAssessments, listMemories, updateMemory, updatePerson } from './apiClient'
import { importLegacyLocalDataToBackend } from './localDataSync'
import { hadPersistedAppStateOnStartup, useApp } from '@/store/useApp'
import { useScreenContext } from '@/store/useScreenContext'

let bootstrapPromise: Promise<void> | null = null

function isOffline(error: unknown) {
  return error instanceof BackendApiError && error.status === 0
}

async function syncPendingWrites() {
  const initial = useApp.getState()
  let person = await getPerson()
  if (initial.pendingPersonSync || (!person && initial.pendingMemoryIds.length > 0)) {
    person = await updatePerson({ name: initial.supportedPerson.name, personalDetails: initial.supportedPerson.personalDetails })
    useApp.getState().setPendingPersonSync(false)
  }
  if (!person) return null

  const pendingIds = useApp.getState().pendingMemoryIds
  if (!pendingIds.length) return person
  const serverMemories = await listMemories()
  const serverIds = new Set(serverMemories.map((memory) => memory.id))
  const cache = useApp.getState()
  const completed: string[] = []
  for (const id of pendingIds) {
    const memory = cache.memories.find((item) => item.id === id)
    if (!memory) {
      completed.push(id)
      continue
    }
    if (serverIds.has(id)) await updateMemory(id, memory)
    else await createMemory(memory)
    completed.push(id)
  }
  useApp.getState().clearPendingMemoryIds(completed)
  return person
}

async function runBootstrap(hadLocalData: boolean) {
  useApp.getState().setDataSyncStatus('checking')
  try {
    let person = await getPerson()
    const current = useApp.getState()

    if (!current.localDataImported && hadLocalData) {
      await importLegacyLocalDataToBackend({
        supportedPerson: { name: current.supportedPerson.name, personalDetails: [...current.supportedPerson.personalDetails] },
        memories: current.memories.map((memory) => ({ ...memory })),
      }, person)
      useApp.getState().setLocalDataImported(true)
      person = await getPerson()
    }

    person = await syncPendingWrites() ?? person
    if (person) {
      const [serverPerson, memories, serverPreferences, assessments] = await Promise.all([
        getPerson(),
        listMemories(),
        getPreferences(),
        listAssessments(),
      ])
      if (serverPerson) useApp.getState().hydrateServerData(serverPerson, memories)
      if (serverPreferences) useApp.getState().setPreferences(serverPreferences)
      const latest = assessments
        .filter((assessment) => assessment.status === 'completed' && assessment.result)
        .sort((left, right) => right.createdAt - left.createdAt)[0]
      const baseline = latest?.result?.baselineDifficulty
      if (baseline === 1 || baseline === 2 || baseline === 3) {
        useScreenContext.getState().setAssessmentBaseline(baseline)
      }
    }
    useApp.getState().setDataSyncStatus('synced', person ? 'Connected' : 'Connected; profile will sync when saved.')
  } catch (error) {
    if (isOffline(error)) {
      useApp.getState().setDataSyncStatus('offline', 'Changes are kept on this device while the connection is unavailable.')
    } else {
      useApp.getState().setDataSyncStatus('error', 'Could not sync local data. Your on-device copy is unchanged.')
    }
  }
}

/** One shared initialization promise makes StrictMode effects and route mounts idempotent. */
export function initializeAppData({ retry = false, hadLocalData = hadPersistedAppStateOnStartup } = {}): Promise<void> {
  if (retry && (useApp.getState().dataSyncStatus === 'offline' || useApp.getState().dataSyncStatus === 'error')) {
    bootstrapPromise = null
  }
  if (!bootstrapPromise) bootstrapPromise = runBootstrap(hadLocalData)
  return bootstrapPromise
}

export function resetAppDataBootstrapForTests() {
  bootstrapPromise = null
}
