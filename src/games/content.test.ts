import { describe, expect, it } from 'vitest'
import { gardenStateFor } from './gardenState'
import { buildCategoryRounds, buildFacePrompts, buildPatternRounds, buildSequenceRounds } from './content'
import { DEMO_MEMORIES } from '@/demo/demoData'

describe('distinct personalized cognitive activities', () => {
  it('uses caregiver people and portraits for face recognition', () => {
    const prompts = buildFacePrompts(DEMO_MEMORIES)
    expect(prompts.map((prompt) => prompt.memory.name)).toContain('Anita')
    expect(prompts.find((prompt) => prompt.memory.name === 'Anita')?.memory.photo?.id).toBe('/demo/anita.svg')
    expect(prompts.find((prompt) => prompt.memory.name === 'Nisha')?.choices.length).toBeGreaterThan(1)
    const rahul = prompts.find((prompt) => prompt.memory.name === 'Rahul')
    expect(rahul?.choices[0].id).not.toBe(rahul?.memory.id)
  })

  it('creates repeating visual patterns rather than personal-memory pairs', () => {
    const rounds = buildPatternRounds(DEMO_MEMORIES)
    expect(rounds).toHaveLength(3)
    expect(rounds[0].pattern.map((token) => token.id)).toEqual([
      rounds[0].pattern[0].id, rounds[0].pattern[1].id, rounds[0].pattern[0].id, rounds[0].pattern[1].id,
    ])
    expect(rounds[0].answer.id).toBe(rounds[0].pattern[0].id)
    expect(rounds[0].sourceMemoryIds.length).toBeGreaterThan(0)
    expect(rounds[1].choices[0].id).not.toBe(rounds[1].answer.id)
    const sameIconMemory = [{ ...DEMO_MEMORIES[0], objects: ['mango'], activities: ['apple'], places: [] }]
    const sameIconPattern = buildPatternRounds(sameIconMemory)[0]
    expect(sameIconPattern.pattern[0].glyph).not.toBe(sameIconPattern.pattern[1].glyph)
    expect(buildPatternRounds([])[0].title).toBe('Shape pattern')
  })

  it('creates visual sequences that can be hidden and reconstructed', () => {
    const rounds = buildSequenceRounds(DEMO_MEMORIES)
    expect(rounds.length).toBeGreaterThan(1)
    expect(rounds[0].items.length).toBeGreaterThanOrEqual(3)
    expect(rounds[0].choices.map((token) => token.id)).toEqual(expect.arrayContaining(rounds[0].items.map((token) => token.id)))
    expect(buildSequenceRounds([])[0].items.length).toBeGreaterThanOrEqual(3)
    expect(rounds[0].items.some((token) => token.memoryId)).toBe(true)
  })

  it('creates category-based odd-one-out rounds and generic fallbacks', () => {
    const personalRounds = buildCategoryRounds(DEMO_MEMORIES)
    const genericRounds = buildCategoryRounds([])
    expect(personalRounds[0].sourceMemoryIds.length).toBeGreaterThan(0)
    expect(personalRounds[0].items.find((token) => token.id === personalRounds[0].answerId)?.category).not.toBe(personalRounds[0].items[0].category)
    expect(personalRounds[0].items[0].id).not.toBe(personalRounds[0].answerId)
    expect(personalRounds.some((round) => round.items.some((token) => token.label === 'mangoes'))).toBe(true)
    expect(genericRounds).toHaveLength(3)
    expect(genericRounds[0].items.filter((token) => token.category === 'fruit')).toHaveLength(3)
    expect(genericRounds[0].items.find((token) => token.id === genericRounds[0].answerId)?.category).not.toBe('fruit')
  })

  it('handles no memories, one incomplete memory, and demo personalization', () => {
    expect(buildFacePrompts([])).toEqual([])
    const sparse = [{ ...DEMO_MEMORIES[0], kind: 'story' as const, relationship: undefined, story: '', photo: undefined, people: [], places: [], activities: [], objects: [] }]
    expect(buildFacePrompts(sparse)).toEqual([])
    expect(buildPatternRounds(sparse)).toHaveLength(3)
    expect(buildSequenceRounds(sparse)).toHaveLength(3)
    expect(buildCategoryRounds(sparse)).toHaveLength(3)
    expect(buildPatternRounds(DEMO_MEMORIES)[0].pattern[0].label).not.toBe(buildPatternRounds([])[0].pattern[0].label)
    expect(buildSequenceRounds(DEMO_MEMORIES)[0].items.map((token) => token.label)).not.toEqual(buildSequenceRounds([])[0].items.map((token) => token.label))
  })
})

describe('qualitative Garden states', () => {
  it('shows lively elements for a comfortable check-in and soothing elements for a quiet moment', () => {
    const flourishing = gardenStateFor({ kind: 'flourishing', reportedBy: 'supported_person', at: 10 }, DEMO_MEMORIES.length)
    const calming = gardenStateFor({ kind: 'calming', reportedBy: 'supported_person', at: 11 }, DEMO_MEMORIES.length)

    expect(flourishing).toMatchObject({ flowers: 'abundant', butterflies: 'gentle', sunlight: 'bright', rain: 'none', animation: 'lively' })
    expect(calming).toMatchObject({ flowers: 'resting', butterflies: 'absent', sunlight: 'soft', rain: 'gentle', river: 'noticeable', animation: 'slow' })
  })
})
