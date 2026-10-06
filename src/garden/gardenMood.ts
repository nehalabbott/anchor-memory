import { useApp } from '@/store/useApp'
import { useScreenContext } from '@/store/useScreenContext'

export type GardenMood = 'calm' | 'supportive' | 'agitated'

export function deriveGardenMood(): GardenMood {
  const screen = useScreenContext.getState()
  const interactionState = useApp.getState().interactionState
  const recentDifficulty = screen.difficultyLevel ?? 3
  const lastFailed = screen.lastFailedAction
  const isActive = screen.activityState === 'active'
  const paused = screen.activityState === 'paused'

  const signals = [
    interactionState === 'high_frustration' ? 1.0
      : interactionState === 'possible_frustration' ? 0.7
        : interactionState === 'needs_help' || interactionState === 'confusion' ? 0.45
          : 0,
    lastFailed ? 0.35 : 0,
    recentDifficulty >= 4 ? 0.4 : recentDifficulty >= 3 ? 0.2 : 0,
    isActive ? 0.2 : 0,
    paused ? -0.15 : 0,
  ].reduce((sum, value) => sum + value, 0)

  if (signals >= 1.5) return 'agitated'
  if (signals >= 0.45) return 'supportive'
  return 'calm'
}
