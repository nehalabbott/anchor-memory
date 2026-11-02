/** Shared types for memory, activity, personalization, and backend data. */

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

export type PersonalTheme = 'high-contrast' | 'calming-pastels' | 'warm-vintage' | 'dark'

export interface PersonalPreferences {
  theme: PersonalTheme
  favoriteColors: string[]
  favoriteFlower: string | null
  favoriteBird: string | null
  favoriteSong: string | null
  lifeActivityTags: string[]
  favoriteAnimal?: string
  favoriteFoods?: string[]
  favoriteActivities?: string[]
  favoritePlaces?: string[]
  calmingSongReference?: string
}

export interface ApplicationSession {
  id: string
  personId: string
  activityId: string
  startedAt: number
  endedAt?: number
  appVersion?: string
  baselineDifficultyTier?: number
  currentDifficultyTier?: number
}

export interface CognitiveAssessment {
  id: string
  personId: string
  instrumentId: string
  instrumentVersion: string
  consent: boolean
  startedAt: number
  completedAt?: number
  status: 'in_progress' | 'completed' | 'abandoned'
  result?: Record<string, unknown>
  createdAt: number
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

/** Non-clinical interaction states used to adapt support. */
export type InteractionState = 'normal' | 'needs_help' | 'confusion' | 'possible_frustration' | 'high_frustration'

/** Stable identifiers for supported activities. */
export type ActivityId = 'faces' | 'pattern' | 'sequence' | 'category' | 'dual-n-back' | 'trail-making' | 'category-association'

/** Scoped events associated with an activity session. */
export type Part2InteractionEvent =
  | { type: 'rapid_taps'; at: number; sessionId: string; activityId: ActivityId; count: number }
  | { type: 'activity_started'; at: number; sessionId: string; activityId: ActivityId }
  | { type: 'activity_paused'; at: number; sessionId: string; activityId: ActivityId }
  | { type: 'activity_resumed'; at: number; sessionId: string; activityId: ActivityId }
  | { type: 'activity_ended'; at: number; sessionId: string; activityId: ActivityId; reason: 'finished' | 'left' | 'break' }
  | { type: 'memory_presented'; at: number; sessionId: string; activityId: ActivityId; memoryId: string }
  | { type: 'response_submitted'; at: number; sessionId: string; activityId: ActivityId; promptId: string; responseId: string; correct?: boolean; responseLatencyMs?: number; difficultyTier?: number }
  | { type: 'difficulty_changed'; at: number; sessionId: string; activityId: ActivityId; previousLevel: number; newLevel: number; reason: string }

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

/** Interaction signals used by support logic and activity history. */
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
  activeGame?: string | null
  gameDomain?: string | null
  difficultyLevel?: number | null
  score?: number | null
  lastFailedAction?: string | null
  elapsedTimeMs?: number
  activityState?: 'idle' | 'active' | 'paused' | 'completed'
  /** Caregiver-entered facts for grounding replies; Mo must not invent them. */
  personalDetails?: string[]
  /** Minimal, opt-in personalization. Never includes private memories or arbitrary content. */
  personalization?: Pick<PersonalPreferences, 'favoriteFlower' | 'favoriteBird' | 'favoriteSong' | 'lifeActivityTags'>
}
