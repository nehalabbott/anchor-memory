import { describe, expect, it } from 'vitest'
import { awarenessCooldownElapsed, detectAwareness } from './distressDetector'
import type { AwarenessSignals } from './distressDetector'

const now = 100_000
const base = (overrides: Partial<AwarenessSignals> = {}): AwarenessSignals => ({
  transcript: '', events: [], now, speechActivity: false, volumeSpike: false,
  fastSpeaking: false, frequencyVariation: 0, ...overrides,
})
const failedResponse = (at: number) => ({
  type: 'response_submitted' as const, at, sessionId: 'test-session', activityId: 'faces' as const,
  promptId: 'prompt', responseId: 'response', correct: false,
})

describe('conservative interaction awareness', () => {
  it('does not label one isolated weak signal as distress', () => {
    expect(detectAwareness(base({ events: [failedResponse(now - 100)] })).state).toBe('calm')
    expect(detectAwareness(base({ transcript: 'I feel frustrated' })).state).toBe('calm')
    expect(detectAwareness(base({ speechActivity: true, volumeSpike: true })).state).toBe('calm')
  })

  it('requires repeated difficulty combined with frustration language or interaction cues', () => {
    const result = detectAwareness(base({
      transcript: 'This is too hard',
      events: [failedResponse(now - 1_000), failedResponse(now - 2_000)],
    }))
    expect(result).toMatchObject({ state: 'possible_frustration', confidence: expect.any(Number) })
    expect(result.reasons).toContain('repeated unsuccessful responses')
  })

  it('combines confusion language with game difficulty', () => {
    const result = detectAwareness(base({ transcript: "I don't understand", events: [failedResponse(now - 1_000)] }))
    expect(result.state).toBe('possible_confusion')
  })

  it('requires anxiety language and a concurrent local speech signal', () => {
    expect(detectAwareness(base({ transcript: 'I am worried', speechActivity: true })).state).toBe('calm')
    expect(detectAwareness(base({ transcript: 'I am worried', speechActivity: true, volumeSpike: true })).state).toBe('possible_anxiety')
  })

  it('does not permit another Mo check-in until the cooldown has elapsed', () => {
    expect(awarenessCooldownElapsed(now, now + 89_999)).toBe(false)
    expect(awarenessCooldownElapsed(now, now + 90_000)).toBe(true)
  })
})