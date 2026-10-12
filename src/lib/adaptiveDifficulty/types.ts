export type DifficultyLevel = 1 | 2 | 3 | 4 | 5
export type AdaptiveAcousticState = 'calm' | 'possible_confusion' | 'possible_frustration' | 'possible_anxiety' | 'high_frustration'
export type DifficultyReason = 'sustained_errors' | 'slow_responses' | 'repeated_rapid_taps' | 'multimodal_distress' | 'sustained_accuracy' | 'requested_support'

export interface DifficultyConfig {
  level: DifficultyLevel
  targetScale: number
  distractorCount: number
  faceDistractors: number
  patternDistractors: number
  categoryDistractors: number
  sequenceLength: number
  sequenceDistractors: number
  timerMultiplier: number
  hintsEnabled: boolean
}

export interface AdaptiveResponse {
  correct: boolean
  latencyMs: number
  at: number
}

export interface AdaptiveTap {
  at: number
  interactive: boolean
}

export interface AdaptiveDifficultyState {
  level: DifficultyLevel
  recentResponses: AdaptiveResponse[]
  recentTaps: AdaptiveTap[]
  recentRapidTaps: number[]
  lastChangeAt: number
  responsesSinceChange: number
}

export interface DifficultyChange {
  previousLevel: DifficultyLevel
  newLevel: DifficultyLevel
  reason: DifficultyReason
  at: number
}

export interface RapidTapDetection {
  burst: boolean
  frustrationLike: boolean
  count: number
  nonInteractiveCount: number
}

export interface AdaptiveTransition {
  state: AdaptiveDifficultyState
  change?: DifficultyChange
  rapidTap?: RapidTapDetection
}
