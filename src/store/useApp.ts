import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatMessage, InteractionEvent, InteractionState, MemoryItem } from '@/lib/types'

interface AppState {
  userName: string
  caregiverMode: boolean
  memories: MemoryItem[]
  chat: ChatMessage[]
  assistantOpen: boolean
  events: InteractionEvent[]          // Part 3 reads this
  interactionState: InteractionState  // Part 3 writes this
  speechEnabled: boolean              // read replies aloud
  largeText: boolean

  setUserName: (n: string) => void
  toggleAssistant: (open?: boolean) => void
  addChat: (m: Omit<ChatMessage, 'id' | 'at'>) => void
  clearChat: () => void
  logEvent: (e: InteractionEvent) => void
  setInteractionState: (s: InteractionState) => void
  setSpeechEnabled: (v: boolean) => void
  setLargeText: (v: boolean) => void
  addMemory: (m: Omit<MemoryItem, 'id' | 'createdAt'>) => void
}

const uid = () => Math.random().toString(36).slice(2, 10)

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      userName: 'Margaret',
      caregiverMode: false,
      memories: [
        { id: 'seed-1', name: 'Rahul', relationship: 'son', story: 'Loves cricket and lives in Bangalore.', createdAt: Date.now() },
        { id: 'seed-2', name: 'Lily', relationship: 'grandparent', story: 'Taught me to bake apple pie every Sunday morning.', createdAt: Date.now() },
      ],
      chat: [],
      assistantOpen: false,
      events: [],
      interactionState: 'normal',
      speechEnabled: true,
      largeText: false,

      setUserName: (userName) => set({ userName }),
      toggleAssistant: (open) => set((s) => ({ assistantOpen: open ?? !s.assistantOpen })),
      addChat: (m) => set((s) => ({ chat: [...s.chat, { ...m, id: uid(), at: Date.now() }].slice(-60) })),
      clearChat: () => set({ chat: [] }),
      logEvent: (e) => set((s) => ({ events: [...s.events, e].slice(-200) })),
      setInteractionState: (interactionState) => set({ interactionState }),
      setSpeechEnabled: (speechEnabled) => set({ speechEnabled }),
      setLargeText: (largeText) => set({ largeText }),
      addMemory: (m) => set((s) => ({ memories: [...s.memories, { ...m, id: uid(), createdAt: Date.now() }] })),
    }),
    {
      name: 'anchor-v1',
      // Don't persist transient signals
      partialize: (s) => ({
        userName: s.userName, memories: s.memories, chat: s.chat,
        speechEnabled: s.speechEnabled, largeText: s.largeText,
      }),
    },
  ),
)
