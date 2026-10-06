import { describe, expect, it } from 'vitest'
import { DIFFICULTY_CONFIG } from './config'
import { selectChoicesWithRequired } from './choices'
import {
  clampDifficultyLevel, createInitialAdaptiveState, detectRapidTapBurst, recordAdaptiveResponse, recordAdaptiveTap,
} from './engine'
import type { AdaptiveDifficultyState } from './types'

const at = 100_000

function respond(state: AdaptiveDifficultyState, correct: boolean, latencyMs = 2_000, timestamp = at) {
  return recordAdaptiveResponse(state, { correct, latencyMs, at: timestamp })
}

describe('central adaptive difficulty engine', () => {
  it('provides one monotonic five-level configuration and preserves required correct choices', () => {
    expect(DIFFICULTY_CONFIG[1].targetScale).toBeGreaterThan(DIFFICULTY_CONFIG[3].targetScale)
    expect(DIFFICULTY_CONFIG[1].sequenceLength).toBeLessThan(DIFFICULTY_CONFIG[5].sequenceLength)
    expect(DIFFICULTY_CONFIG[1].faceDistractors).toBeLessThan(DIFFICULTY_CONFIG[5].faceDistractors)
    const selected = selectChoicesWithRequired([
      { id: 'wrong-1' }, { id: 'correct' }, { id: 'wrong-2' }, { id: 'wrong-3' },
    ], ['correct'], DIFFICULTY_CONFIG[1].patternDistractors)
    expect(selected.map((choice) => choice.id)).toContain('correct')
    expect(selected).toHaveLength(2)
  })

  it('clamps levels to the 1–5 boundary', () => {
    expect(clampDifficultyLevel(-3)).toBe(1)
    expect(clampDifficultyLevel(99)).toBe(5)
  })

  it('does not decrease for one failure, but sustained errors lower only one level', () => {
    const initial = createInitialAdaptiveState(3, at - 30_000)
    const oneFailure = respond(initial, false)
    expect(oneFailure.change).toBeUndefined()
    const sustained = respond(oneFailure.state, false, 2_500, at + 100)
    expect(sustained.change).toMatchObject({ previousLevel: 3, newLevel: 2, reason: 'sustained_errors' })
  })

  it('never decreases below level one', () => {
    let state = createInitialAdaptiveState(1, at - 30_000)
    for (let index = 0; index < 4; index += 1) state = respond(state, false, 2_000, at + index).state
    expect(state.level).toBe(1)
  })

  it('requires sustained accurate, timely, calm responses to increase by one level', () => {
    let state = createInitialAdaptiveState(2, at - 30_000)
    let lastChange
    for (let index = 0; index < 5; index += 1) {
      const result = respond(state, true, 2_000, at + index * 100)
      state = result.state
      lastChange = result.change ?? lastChange
    }
    expect(lastChange).toMatchObject({ previousLevel: 2, newLevel: 3, reason: 'sustained_accuracy' })
    expect(state.level).toBe(3)
  })

  it('can gradually increase after three calm successes in a short game session', () => {
    let state = createInitialAdaptiveState(3, at - 30_000)
    let changed = false
    for (let index = 0; index < 3; index += 1) {
      const result = respond(state, true, 2_500, at + index * 100)
      state = result.state
      changed ||= Boolean(result.change)
    }
    expect(changed).toBe(true)
    expect(state.level).toBe(4)
  })

  it('does not classify one slow response as failure, but repeated high latency can lower one level', () => {
    let state = createInitialAdaptiveState(3, at - 30_000)
    for (let index = 0; index < 2; index += 1) state = respond(state, true, 2_000, at + index * 100).state
    const oneSlow = respond(state, true, 15_000, at + 200)
    expect(oneSlow.change).toBeUndefined()
    const secondSlow = respond(oneSlow.state, true, 16_000, at + 300)
    expect(secondSlow.change).toMatchObject({ newLevel: 2, reason: 'slow_responses' })
  })

  it('detects a rapid burst, but ordinary interactive taps are not frustration evidence', () => {
    const nonInteractive = [0, 120, 260].map((delta) => ({ at: at + delta, interactive: false }))
    expect(detectRapidTapBurst(nonInteractive, at + 260)).toMatchObject({ burst: true, frustrationLike: true, count: 3 })
    const ordinary = [0, 120, 260].map((delta) => ({ at: at + delta, interactive: true }))
    expect(detectRapidTapBurst(ordinary, at + 260)).toMatchObject({ burst: true, frustrationLike: false, count: 3 })
    expect(detectRapidTapBurst(ordinary.slice(0, 2), at + 120).burst).toBe(false)
  })

  it('combines repeated rapid bursts and failures conservatively', () => {
    let state = createInitialAdaptiveState(3, at - 30_000)
    for (const base of [at, at + 1_000]) {
      for (const delta of [0, 100, 200]) {
        state = recordAdaptiveTap(state, { at: base + delta, interactive: false }).state
      }
    }
    expect(state.level).toBe(2)
    expect(state.recentResponses).toHaveLength(0)
  })

  it('uses an available structured frustration signal only with corroborating difficulty evidence', () => {
    const initial = createInitialAdaptiveState(3, at - 30_000)
    const isolated = recordAdaptiveResponse(initial, { correct: true, latencyMs: 2_000, at }, 'possible_frustration')
    expect(isolated.change).toBeUndefined()
    const corroborated = recordAdaptiveResponse(initial, { correct: false, latencyMs: 2_000, at }, 'possible_frustration')
    expect(corroborated.change).toMatchObject({ newLevel: 2, reason: 'multimodal_distress' })
  })

  it('applies response-count/time hysteresis between changes', () => {
    const initial = createInitialAdaptiveState(3, at - 30_000)
    const first = respond(respond(initial, false).state, false)
    expect(first.change?.newLevel).toBe(2)
    let state = first.state
    for (let index = 0; index < 3; index += 1) state = respond(state, false, 2_000, at + 100 + index).state
    expect(state.level).toBe(2)
    const cooled = respond(state, false, 2_000, at + 30_000)
    expect(cooled.state.level).toBe(1)
  })
})
