/** Shared domain types. Part 2 will extend MemoryItem; Part 3 will use InteractionEvent + InteractionState. */

export type Relationship = 'son' | 'daughter' | 'spouse' | 'grandchild' | 'grandparent' | 'friend' | 'other'

export interface MemoryItem {
  id: string
  name: string
  relationship: Relationship
  story: string
  photoUrl?: string   // data URL or remote URL (Part 2: caregiver upload)
  audioUrl?: string
  createdAt: number
}

export interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  text: string
  at: number
}

/** The five estimated states from the Lab 4 report (Section 4.2). Behavioural estimate, NOT a diagnosis. */
export type InteractionState = 'normal' | 'needs_help' | 'confusion' | 'possible_frustration' | 'high_frustration'

/** Signals logged during play (Part 3). Defined now so the assistant API is stable. */
export type InteractionEvent =
  | { type: 'wrong_answer'; at: number }
  | { type: 'help_request'; at: number }
  | { type: 'restart'; at: number }
  | { type: 'inactivity'; at: number; ms: number }
  | { type: 'rapid_taps'; at: number; count: number }
  | { type: 'speech_cue'; at: number; phrase: string }

/** Where the user currently is, so the assistant can be context-aware. */
export interface AssistantContext {
  route: string
  screenLabel: string
  userName: string
  state: InteractionState
}
