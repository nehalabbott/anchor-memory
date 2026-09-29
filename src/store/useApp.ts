import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatMessage, InteractionEvent, InteractionState, MediaReference, MemoryItem, MemoryKind, SessionExperience, SupportedPerson } from '@/lib/types'
import { mediaRepository } from '@/lib/mediaRepository'

type AssistantAction = 'clue' | 'easier' | 'break'
type PersistedAppState = Pick<AppState, 'userName' | 'supportedPerson' | 'memories' | 'chat' | 'speechEnabled' | 'largeText' | 'lastSessionExperience'>
type NewMemoryItem = Omit<MemoryItem, 'id' | 'createdAt' | 'kind'> & { kind?: MemoryKind }

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
  events: InteractionEvent[]          // Part 3 reads this
  interactionState: InteractionState  // Part 3 writes this
  speechEnabled: boolean              // read replies aloud
  largeText: boolean

  setUserName: (n: string) => void
  setSupportedPerson: (person: Pick<SupportedPerson, 'name' | 'personalDetails'>) => void
  addMemory: (m: NewMemoryItem) => void
  updateMemory: (id: string, m: NewMemoryItem) => void
  deleteMemory: (id: string) => void
  replaceMemories: (memories: MemoryItem[]) => void
  recordSessionExperience: (experience: SessionExperience) => void
  requestAssistantAction: (action: AssistantAction, prompt?: string) => void
  clearAssistantAction: () => void
  toggleAssistant: (open?: boolean) => void
  addChat: (m: Omit<ChatMessage, 'id' | 'at'>) => void
  clearChat: () => void
  logEvent: (e: InteractionEvent) => void
  setInteractionState: (s: InteractionState) => void
  setSpeechEnabled: (v: boolean) => void
  setLargeText: (v: boolean) => void
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
      events: [],
      interactionState: 'normal',
      speechEnabled: true,
      largeText: false,

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
      requestAssistantAction: (assistantAction, assistantPrompt) => set({ assistantOpen: true, assistantAction, assistantPrompt: assistantPrompt ?? null }),
      clearAssistantAction: () => set({ assistantAction: null, assistantPrompt: null }),
      toggleAssistant: (open) => set((s) => ({ assistantOpen: open ?? !s.assistantOpen })),
      addChat: (m) => set((s) => ({ chat: [...s.chat, { ...m, id: uid(), at: Date.now() }].slice(-60) })),
      clearChat: () => set({ chat: [] }),
      logEvent: (e) => set((s) => ({ events: [...s.events, e].slice(-200) })),
      setInteractionState: (interactionState) => set({ interactionState }),
      setSpeechEnabled: (speechEnabled) => set({ speechEnabled }),
      setLargeText: (largeText) => set({ largeText }),
    }),
    {
      name: 'anchor-v1',
      version: 2,
      migrate: (state) => migratePersistedAppState(state) as Promise<AppState>,
      // Don't persist transient signals
      partialize: (s) => ({
        userName: s.userName, supportedPerson: s.supportedPerson, memories: s.memories, chat: s.chat,
        lastSessionExperience: s.lastSessionExperience,
        speechEnabled: s.speechEnabled, largeText: s.largeText,
      }),
    },
  ),
)
