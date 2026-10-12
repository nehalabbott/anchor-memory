import type { InteractionEvent } from '@/lib/types'

/**
 * A live, moment-to-moment read on how the last few answers went, used only to drive the
 * koi pond's motion (see PondScene.tsx). This is a UX animation signal, not a clinical
 * measure: it looks at the last few answers, not the whole history, so a rough patch a
 * while ago doesn't linger, and it never appears as a score or number anywhere in the UI.
 *
 * mood: -1 (recent wrong answers) .. 0 (neutral/no data yet) .. +1 (recent right answers)
 */
export type PondMood = number

const WINDOW = 6          // how many recent answers count
const RECENCY_BIAS = 1.6  // >1 weights the most recent answers more heavily than older ones in the window

export function pondMoodFromEvents(events: InteractionEvent[]): PondMood {
  const answers = events.filter(
    (e): e is Extract<InteractionEvent, { type: 'response_submitted' }> =>
      e.type === 'response_submitted' && typeof e.correct === 'boolean',
  )
  if (answers.length === 0) return 0

  const recent = answers.slice(-WINDOW)
  let weightedSum = 0
  let weightTotal = 0
  recent.forEach((a, i) => {
    // later entries (more recent) get a larger weight
    const weight = Math.pow(RECENCY_BIAS, i)
    weightedSum += weight * (a.correct ? 1 : -1)
    weightTotal += weight
  })
  const mood = weightedSum / weightTotal
  return Math.max(-1, Math.min(1, mood))
}

/** Discrete bands used for the fish's swim state; keeps PondScene's logic readable. */
export type PondEnergy = 'agitated' | 'uneasy' | 'settled' | 'content' | 'joyful'

export function pondEnergyFromMood(mood: PondMood): PondEnergy {
  if (mood <= -0.6) return 'agitated'
  if (mood <= -0.15) return 'uneasy'
  if (mood < 0.4) return 'settled'
  if (mood < 0.75) return 'content'
  return 'joyful'
}
