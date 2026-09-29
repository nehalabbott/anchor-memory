/** Shared domain types for the app, personalized activities, and the future adaptive loop. */

export type Relationship = 'son' | 'daughter' | 'spouse' | 'grandchild' | 'grandparent' | 'friend' | 'other'
export type MemoryKind = 'person' | 'story' | 'place' | 'activity' | 'object' | 'event' | 'sequence'

/** The person using Anchor, kept separate from people and events in their memories. */
export interface SupportedPerson {
  id: string
  name: string
  personalDetails: string[]
  createdAt: number
  updatedAt: number
}

export type MediaKind = 'photo' | 'voice'

/** Opaque media locator; file bytes live in a media repository, never in app/localStorage state. */
export interface MediaReference {
  id: string
  kind: MediaKind
  storage: 'indexeddb' | 'remote'
  mimeType: string
  altText?: string
}

/** A backend-neutral boundary that lets consumers resolve media without knowing its storage. */
export interface MediaRepository {
  save(blob: Blob, kind: MediaKind, altText?: string): Promise<MediaReference>
  resolve(reference: MediaReference): Promise<Blob | null>
  remove(reference: MediaReference): Promise<void>
}

/** A meaningful life event; sequenceOrder supports ordered recollection without a score. */
export interface MemoryEvent {
  id: string
  title: string
  story?: string
  occurredAt?: string
  people?: string[]
  place?: string
  activity?: string
  objects?: string[]
  sequenceOrder?: number
  photo?: MediaReference
  voice?: MediaReference
}

export interface MemoryItem {
  id: string
  kind: MemoryKind
  name: string
  relationship?: Relationship
  story: string
  people?: string[]
  places?: string[]
  activities?: string[]
  objects?: string[]
  events?: MemoryEvent[]
  photo?: MediaReference
  voice?: MediaReference
  createdAt: number
}

/** A qualitative check-in, explicitly reported rather than inferred from correctness. */
export interface SessionExperience {
  kind: 'flourishing' | 'calming'
  reportedBy: 'supported_person' | 'caregiver'
  at: number
  note?: string
}

export interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  text: string
  at: number
}

/** The five estimated states from the Lab 4 report (Section 4.2). Behavioural estimate, NOT a diagnosis. */
export type InteractionState = 'normal' | 'needs_help' | 'confusion' | 'possible_frustration' | 'high_frustration'

/** Activity identifiers are stable across UI changes and suitable for Part 3 event records. */
export type ActivityId = 'faces' | 'match' | 'story' | 'sequence'

/** Non-judgmental activity lifecycle and interaction signals for Part 2 and Part 3. */
export type Part2InteractionEvent =
  | { type: 'activity_started'; at: number; sessionId: string; activityId: ActivityId }
  | { type: 'activity_paused'; at: number; sessionId: string; activityId: ActivityId }
  | { type: 'activity_resumed'; at: number; sessionId: string; activityId: ActivityId }
  | { type: 'activity_ended'; at: number; sessionId: string; activityId: ActivityId; reason: 'finished' | 'left' | 'break' }
  | { type: 'memory_presented'; at: number; sessionId: string; activityId: ActivityId; memoryId: string }
  | { type: 'response_submitted'; at: number; sessionId: string; activityId: ActivityId; promptId: string }

/** Garden presentation is qualitative and never represents failure or performance. */
export interface GardenState {
  experience: SessionExperience['kind'] | 'settling'
  flowers: 'resting' | 'blooming' | 'abundant'
  butterflies: 'absent' | 'gentle'
  sunlight: 'soft' | 'bright'
  rain: 'none' | 'gentle'
  river: 'quiet' | 'noticeable'
  animation: 'slow' | 'lively'
  updatedAt: number
}

/** Signals logged during play; existing Part 1 variants remain stable. */
export type InteractionEvent =
  | { type: 'wrong_answer'; at: number }
  | { type: 'help_request'; at: number }
  | { type: 'restart'; at: number }
  | { type: 'inactivity'; at: number; ms: number }
  | { type: 'rapid_taps'; at: number; count: number }
  | { type: 'speech_cue'; at: number; phrase: string }
  | Part2InteractionEvent

/** Where the user currently is, so the assistant can be context-aware. */
export interface AssistantContext {
  route: string
  screenLabel: string
  userName: string
  state: InteractionState
}
