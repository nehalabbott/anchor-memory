import type { DifficultyConfig, DifficultyLevel } from './types'

export const DIFFICULTY_LEVELS: readonly DifficultyLevel[] = [1, 2, 3, 4, 5]

export const DIFFICULTY_CONFIG: Readonly<Record<DifficultyLevel, DifficultyConfig>> = {
  1: { level: 1, targetScale: 1.2, distractorCount: 1, faceDistractors: 1, patternDistractors: 1, categoryDistractors: 1, sequenceLength: 2, sequenceDistractors: 1, timerMultiplier: 1.6, hintsEnabled: true },
  2: { level: 2, targetScale: 1.1, distractorCount: 2, faceDistractors: 2, patternDistractors: 2, categoryDistractors: 2, sequenceLength: 3, sequenceDistractors: 2, timerMultiplier: 1.3, hintsEnabled: true },
  3: { level: 3, targetScale: 1, distractorCount: 3, faceDistractors: 2, patternDistractors: 2, categoryDistractors: 3, sequenceLength: 4, sequenceDistractors: 3, timerMultiplier: 1, hintsEnabled: true },
  4: { level: 4, targetScale: 1, distractorCount: 4, faceDistractors: 3, patternDistractors: 3, categoryDistractors: 3, sequenceLength: 5, sequenceDistractors: 4, timerMultiplier: 1, hintsEnabled: false },
  5: { level: 5, targetScale: 1, distractorCount: 5, faceDistractors: 4, patternDistractors: 4, categoryDistractors: 3, sequenceLength: 6, sequenceDistractors: 5, timerMultiplier: 1, hintsEnabled: false },
}

export function difficultyConfigFor(level: DifficultyLevel): DifficultyConfig {
  return DIFFICULTY_CONFIG[level]
}
