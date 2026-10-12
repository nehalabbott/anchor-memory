import { describe, it, expect } from 'vitest'
import { pondMoodFromEvents, pondEnergyFromMood } from './pondMood'
import type { InteractionEvent } from '@/lib/types'

function answer(correct: boolean, at = Date.now()): InteractionEvent {
  return { type: 'response_submitted', at, sessionId: 's1', activityId: 'faces', promptId: 'p', responseId: 'r', correct }
}

describe('pondMoodFromEvents', () => {
  it('is neutral with no answers yet', () => {
    expect(pondMoodFromEvents([])).toBe(0)
  })
  it('ignores events with no recorded correctness (legacy/other event types)', () => {
    const events: InteractionEvent[] = [
      { type: 'help_request', at: 1 },
      { type: 'response_submitted', at: 2, sessionId: 's', activityId: 'faces', promptId: 'p', responseId: 'r' }, // no `correct`
    ]
    expect(pondMoodFromEvents(events)).toBe(0)
  })
  it('is strongly positive after several right answers in a row', () => {
    const mood = pondMoodFromEvents([answer(true), answer(true), answer(true), answer(true)])
    expect(mood).toBeGreaterThan(0.9)
  })
  it('is strongly negative after several wrong answers in a row', () => {
    const mood = pondMoodFromEvents([answer(false), answer(false), answer(false), answer(false)])
    expect(mood).toBeLessThan(-0.9)
  })
  it('weights recent answers more than older ones', () => {
    const recoveredAfterStruggle = pondMoodFromEvents([answer(false), answer(false), answer(false), answer(true), answer(true)])
    const stillStrugglingAfterOneWin = pondMoodFromEvents([answer(true), answer(false), answer(false), answer(false), answer(false)])
    expect(recoveredAfterStruggle).toBeGreaterThan(stillStrugglingAfterOneWin)
  })
  it('only looks at a recent window, so an old rough patch does not linger forever', () => {
    const longAgoWrong = Array.from({ length: 20 }, () => answer(false))
    const thenManyRight = Array.from({ length: 6 }, () => answer(true))
    expect(pondMoodFromEvents([...longAgoWrong, ...thenManyRight])).toBeGreaterThan(0.9)
  })
  it('stays within [-1, 1]', () => {
    const mood = pondMoodFromEvents(Array.from({ length: 50 }, () => answer(true)))
    expect(mood).toBeLessThanOrEqual(1)
    expect(mood).toBeGreaterThanOrEqual(-1)
  })
})

describe('pondEnergyFromMood', () => {
  it('maps mood bands to the right energy label', () => {
    expect(pondEnergyFromMood(-1)).toBe('agitated')
    expect(pondEnergyFromMood(-0.3)).toBe('uneasy')
    expect(pondEnergyFromMood(0)).toBe('settled')
    expect(pondEnergyFromMood(0.5)).toBe('content')
    expect(pondEnergyFromMood(0.9)).toBe('joyful')
  })
})
