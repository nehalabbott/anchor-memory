import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { stopAllSpeechListeners } from '@/assistant/speech'
import { stopVoiceAwareness } from '@/assistant/voiceAwareness'
import type { ChatMessage, InteractionEvent, InteractionState, MediaReference, MemoryItem, MemoryKind, PersonalPreferences, SessionExperience, SupportedPerson } from '@/lib/types'
import { mediaRepository } from '@/lib/mediaRepository'
import { DEFAULT_PERSONAL_PREFERENCES, normalizePersonalPreferences } from '@/lib/personalization'

type AssistantAction = 'clue' | 'easier' | 'break'
export type DataSyncStatus = 'unknown' | 'checking' | 'synced' | 'offline' | 'syncing' | 'error'
type PersistedAppState = Pick<AppState, 'userName' | 'supportedPerson' | 'memories' | 'chat' | 'speechEnabled' | 'largeText' | 'lastSessionExperience' | 'privacyShieldEnabled' | 'localDataImported' | 'pendingPersonSync' | 'pendingMemoryIds'>
type NewMemoryItem = Omit<MemoryItem, 'id' | 'createdAt' | 'kind'> & { kind?: MemoryKind }

export const hadPersistedAppStateOnStartup = (() => {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem('anchor-v1') !== null } catch { return false }
})()

interface AppState {
  userName: string
  supportedPerson: SupportedPerson
  caregiverMode: boolean
  memories: MemoryItem[]
  lastSessionExperience: SessionExperience | null
  chat: ChatMessage[]
  assistantOpen: boolean
  assistantAction: AssistantAction | null
  assistantPrompt: string | null
  /** True while Mo is gently signalling "still there?" on the closed toolbar, before any auto-open. */
  assistantNudging: boolean
  events: InteractionEvent[]          // Part 3 reads this
  interactionState: InteractionState  // Part 3 writes this
  speechEnabled: boolean              // read replies aloud
  largeText: boolean
  preferences: PersonalPreferences
  gardenAudioEnabled: boolean
  privacyShieldEnabled: boolean
  voiceListeningEnabled: boolean
  voiceSupported: boolean
  voiceListening: boolean
  lastTranscript: string
  speechActivity: boolean
  voiceError: string
  dataSyncStatus: DataSyncStatus
  dataSyncMessage: string
  localDataImported: boolean
  pendingPersonSync: boolean
  pendingMemoryIds: string[]

  setUserName: (n: string) => void
  setSupportedPerson: (person: Pick<SupportedPerson, 'name' | 'personalDetails'>) => void
  addMemory: (m: NewMemoryItem) => void
  updateMemory: (id: string, m: NewMemoryItem) => void
  deleteMemory: (id: string) => void
  replaceMemories: (memories: MemoryItem[]) => void
  recordSessionExperience: (experience: SessionExperience) => void
  requestAssistantAction: (action: AssistantAction, prompt?: string) => void
  clearAssistantAction: () => void
  setAssistantNudging: (v: boolean) => void
  /** Mo opens on its own and speaks first (an unprompted check-in or hint), rather than
   *  echoing the message back as something the person said. */
  assistantSpeakFirst: string | null
  openAssistantWithMessage: (text: string) => void
  clearAssistantSpeakFirst: () => void
  toggleAssistant: (open?: boolean) => void
  addChat: (m: Omit<ChatMessage, 'id' | 'at'>) => void
  clearChat: () => void
  logEvent: (e: InteractionEvent) => void
  setInteractionState: (s: InteractionState) => void
  setSpeechEnabled: (v: boolean) => void
  setLargeText: (v: boolean) => void
  setPreferences: (prefs: Partial<PersonalPreferences>) => void
  setGardenAudioEnabled: (v: boolean) => void
  setPrivacyShieldEnabled: (v: boolean) => void
  setVoiceListeningEnabled: (v: boolean) => void
  setVoiceSupported: (v: boolean) => void
  setVoiceListening: (v: boolean) => void
  setLastTranscript: (v: string) => void
  setSpeechActivity: (v: boolean) => void
  setVoiceError: (v: string) => void
  setDataSyncStatus: (status: DataSyncStatus, message?: string) => void
  setLocalDataImported: (v: boolean) => void
  setPendingPersonSync: (v: boolean) => void
  addPendingMemoryId: (id: string) => void
  clearPendingMemoryIds: (ids: string[]) => void
  hydrateServerData: (person: SupportedPerson | null, memories: MemoryItem[]) => void
  setCachedPerson: (person: SupportedPerson) => void
  cacheMemory: (memory: MemoryItem) => void
  removeCachedMemory: (id: string) => void
}

const uid = () => Math.random().toString(36).slice(2, 10)
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isMediaReference = (value: unknown): value is MediaReference =>
  isRecord(value) && typeof value.id === 'string' &&
  (value.kind === 'photo' || value.kind === 'voice') &&
  (value.storage === 'indexeddb' || value.storage === 'remote') &&
  typeof value.mimeType === 'string'
const isSessionExperience = (value: unknown): value is SessionExperience =>
  isRecord(value) && (value.kind === 'flourishing' || value.kind === 'calming') &&
  (value.reportedBy === 'supported_person' || value.reportedBy === 'caregiver') && typeof value.at === 'number'

function legacyMediaMimeType(url: string, kind: 'photo' | 'voice') {
  if (url.startsWith('data:')) return url.slice(5, url.indexOf(';') > -1 ? url.indexOf(';') : url.indexOf(',')) || 'application/octet-stream'
  return kind === 'photo' ? 'image/*' : 'audio/*'
}

async function migrateLegacyMedia(url: unknown, kind: 'photo' | 'voice') {
  if (typeof url !== 'string' || !url) return undefined
  if (url.startsWith('data:')) {
    const response = await fetch(url)
    return mediaRepository.save(await response.blob(), kind)
  }
  return { id: url, kind, storage: 'remote' as const, mimeType: legacyMediaMimeType(url, kind) }
}

async function normalizeMemory(value: unknown, index: number): Promise<MemoryItem> {
  const memory = isRecord(value) ? value : {}
  const legacyPhoto = memory.photoUrl
  const legacyVoice = memory.audioUrl
  const { photoUrl: _photoUrl, audioUrl: _audioUrl, ...storedFields } = memory
  const kind = memory.kind as MemoryKind | undefined
  return {
    ...storedFields,
    id: typeof memory.id === 'string' ? memory.id : `legacy-memory-${index}`,
    kind: kind ?? (memory.relationship ? 'person' : 'story'),
    name: typeof memory.name === 'string' ? memory.name : 'A memory',
    story: typeof memory.story === 'string' ? memory.story : '',
    relationship: memory.relationship as MemoryItem['relationship'],
    photo: isMediaReference(memory.photo) ? memory.photo : await migrateLegacyMedia(legacyPhoto, 'photo'),
    voice: isMediaReference(memory.voice) ? memory.voice : await migrateLegacyMedia(legacyVoice, 'voice'),
    createdAt: typeof memory.createdAt === 'number' ? memory.createdAt : Date.now(),
  }
}

/** Normalize earlier anchor-v1 payloads in-place without changing the persistence key. */
export async function migratePersistedAppState(value: unknown): Promise<PersistedAppState> {
  const state = isRecord(value) ? value : {}
  const userName = typeof state.userName === 'string' ? state.userName : 'Margaret'
  const previousPerson = isRecord(state.supportedPerson) ? state.supportedPerson : {}
  const supportedPerson: SupportedPerson = {
    id: typeof previousPerson.id === 'string' ? previousPerson.id : 'supported-person-1',
    name: typeof previousPerson.name === 'string' ? previousPerson.name : userName,
    personalDetails: Array.isArray(previousPerson.personalDetails)
      ? previousPerson.personalDetails.filter((detail): detail is string => typeof detail === 'string')
      : [],
    createdAt: typeof previousPerson.createdAt === 'number' ? previousPerson.createdAt : Date.now(),
    updatedAt: typeof previousPerson.updatedAt === 'number' ? previousPerson.updatedAt : Date.now(),
  }
  const memories = Array.isArray(state.memories)
    ? await Promise.all(state.memories.map(normalizeMemory))
    : []

  return {
    ...state,
    userName,
    supportedPerson,
    memories,
    chat: Array.isArray(state.chat) ? state.chat as ChatMessage[] : [],
    speechEnabled: typeof state.speechEnabled === 'boolean' ? state.speechEnabled : true,
    largeText: typeof state.largeText === 'boolean' ? state.largeText : false,
    preferences: normalizePersonalPreferences(state.preferences as Partial<PersonalPreferences> | undefined),
    privacyShieldEnabled: typeof state.privacyShieldEnabled === 'boolean' ? state.privacyShieldEnabled : true,
    localDataImported: typeof state.localDataImported === 'boolean' ? state.localDataImported : false,
    pendingPersonSync: typeof state.pendingPersonSync === 'boolean' ? state.pendingPersonSync : false,
    pendingMemoryIds: Array.isArray(state.pendingMemoryIds) ? state.pendingMemoryIds.filter((id): id is string => typeof id === 'string') : [],
    lastSessionExperience: isSessionExperience(state.lastSessionExperience) ? state.lastSessionExperience : null,
  } as PersistedAppState
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      userName: 'Margaret',
      supportedPerson: { id: 'supported-person-1', name: 'Margaret', personalDetails: [], createdAt: Date.now(), updatedAt: Date.now() },
      caregiverMode: false,
      memories: [
        { id: 'seed-1', kind: 'person', name: 'Rahul', relationship: 'son', story: 'Loves cricket and lives in Bangalore.', createdAt: Date.now() },
        { id: 'seed-2', kind: 'person', name: 'Lily', relationship: 'grandparent', story: 'Taught me to bake apple pie every Sunday morning.', createdAt: Date.now() },
      ],
      lastSessionExperience: null,
      chat: [],
      assistantOpen: false,
      assistantAction: null,
      assistantPrompt: null,
      assistantNudging: false,
      assistantSpeakFirst: null,
      events: [],
      interactionState: 'normal',
      speechEnabled: true,
      largeText: false,
      preferences: DEFAULT_PERSONAL_PREFERENCES,
      gardenAudioEnabled: false,
      privacyShieldEnabled: true,
      voiceListeningEnabled: false,
      voiceSupported: false,
      voiceListening: false,
      lastTranscript: '',
      speechActivity: false,
      voiceError: '',
      dataSyncStatus: 'unknown',
      dataSyncMessage: '',
      localDataImported: false,
      pendingPersonSync: false,
      pendingMemoryIds: [],

      setUserName: (userName) => set((s) => ({ userName, supportedPerson: { ...s.supportedPerson, name: userName, updatedAt: Date.now() } })),
      setSupportedPerson: ({ name, personalDetails }) => set((s) => ({
        userName: name,
        supportedPerson: { ...s.supportedPerson, name, personalDetails, updatedAt: Date.now() },
      })),
      addMemory: (m) => set((s) => ({ memories: [...s.memories, { ...m, kind: m.kind ?? (m.relationship ? 'person' : 'story'), id: uid(), createdAt: Date.now() }] })),
      updateMemory: (id, m) => set((s) => ({ memories: s.memories.map((memory) => memory.id === id
        ? { ...memory, ...m, kind: m.kind ?? (m.relationship ? 'person' : 'story'), id, createdAt: memory.createdAt }
        : memory) })),
      deleteMemory: (id) => set((s) => ({ memories: s.memories.filter((memory) => memory.id !== id) })),
      replaceMemories: (memories) => set({ memories }),
      recordSessionExperience: (lastSessionExperience) => set({ lastSessionExperience }),
      requestAssistantAction: (assistantAction, assistantPrompt) =>
        set({ assistantOpen: true, assistantAction, assistantPrompt: assistantPrompt ?? null, assistantNudging: false }),
      clearAssistantAction: () => set({ assistantAction: null, assistantPrompt: null }),
      setAssistantNudging: (assistantNudging) => set({ assistantNudging }),
      openAssistantWithMessage: (text) => set({ assistantOpen: true, assistantSpeakFirst: text, assistantNudging: false }),
      clearAssistantSpeakFirst: () => set({ assistantSpeakFirst: null }),
      toggleAssistant: (open) => set((s) => ({ assistantOpen: open ?? !s.assistantOpen, assistantNudging: false })),
      addChat: (m) => set((s) => ({ chat: [...s.chat, { ...m, id: uid(), at: Date.now() }].slice(-60) })),
      clearChat: () => set({ chat: [] }),
      logEvent: (e) => set((s) => ({ events: [...s.events, e].slice(-200) })),
      setInteractionState: (interactionState) => set({ interactionState }),
      setSpeechEnabled: (speechEnabled) => set({ speechEnabled }),
      setLargeText: (largeText) => set({ largeText }),
      setPreferences: (update) => set((state) => ({ preferences: normalizePersonalPreferences({ ...state.preferences, ...update }) })),
      setGardenAudioEnabled: (gardenAudioEnabled) => set({ gardenAudioEnabled }),
      setPrivacyShieldEnabled: (privacyShieldEnabled) => {
        if (privacyShieldEnabled) {
          stopVoiceAwareness()
          stopAllSpeechListeners()
          set({ privacyShieldEnabled, voiceListeningEnabled: false, voiceListening: false, lastTranscript: '', speechActivity: false, voiceError: '' })
        } else set({ privacyShieldEnabled })
      },
      setVoiceListeningEnabled: (voiceListeningEnabled) => set((s) => s.privacyShieldEnabled && voiceListeningEnabled
        ? {}
        : { voiceListeningEnabled, voiceListening: false, lastTranscript: '', speechActivity: false, voiceError: '' }),
      setVoiceSupported: (voiceSupported) => set({ voiceSupported }),
      setVoiceListening: (voiceListening) => set({ voiceListening }),
      setLastTranscript: (lastTranscript) => set({ lastTranscript }),
      setSpeechActivity: (speechActivity) => set({ speechActivity }),
      setVoiceError: (voiceError) => set({ voiceError }),
      setDataSyncStatus: (dataSyncStatus, dataSyncMessage = '') => set({ dataSyncStatus, dataSyncMessage }),
      setLocalDataImported: (localDataImported) => set({ localDataImported }),
      setPendingPersonSync: (pendingPersonSync) => set({ pendingPersonSync }),
      addPendingMemoryId: (id) => set((s) => ({ pendingMemoryIds: s.pendingMemoryIds.includes(id) ? s.pendingMemoryIds : [...s.pendingMemoryIds, id] })),
      clearPendingMemoryIds: (ids) => set((s) => ({ pendingMemoryIds: s.pendingMemoryIds.filter((id) => !ids.includes(id)) })),
      hydrateServerData: (person, memories) => set((s) => ({
        userName: person?.name ?? s.userName,
        supportedPerson: person ?? s.supportedPerson,
        memories,
        pendingPersonSync: false,
        pendingMemoryIds: [],
      })),
      setCachedPerson: (supportedPerson) => set({ userName: supportedPerson.name, supportedPerson }),
      cacheMemory: (memory) => set((s) => ({ memories: [...s.memories.filter((item) => item.id !== memory.id), memory] })),
      removeCachedMemory: (id) => set((s) => ({ memories: s.memories.filter((memory) => memory.id !== id) })),
    }),
    {
      name: 'anchor-v1',
      version: 3,
      migrate: (state) => migratePersistedAppState(state) as Promise<AppState>,
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<AppState>),
        voiceListeningEnabled: false,
        voiceListening: false,
        voiceSupported: false,
        lastTranscript: '',
        speechActivity: false,
        voiceError: '',
        dataSyncStatus: 'unknown',
        dataSyncMessage: '',
      }),
      // Don't persist transient signals
      partialize: (s) => ({
        userName: s.userName, supportedPerson: s.supportedPerson, memories: s.memories, chat: s.chat,
        lastSessionExperience: s.lastSessionExperience,
        privacyShieldEnabled: s.privacyShieldEnabled,
        localDataImported: s.localDataImported,
        pendingPersonSync: s.pendingPersonSync,
        pendingMemoryIds: s.pendingMemoryIds,
        speechEnabled: s.speechEnabled, largeText: s.largeText,
        preferences: normalizePersonalPreferences(s.preferences),
        gardenAudioEnabled: s.gardenAudioEnabled,
      }),
    },
  ),
)
