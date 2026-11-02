import { describe, expect, it } from 'vitest'
import { gardenStateFor } from './gardenState'
import { buildCategoryRounds, buildFacePrompts, buildPatternRounds, buildSequenceRounds } from './content'
import { DEMO_MEMORIES, demoMemoriesFor } from '@/demo/demoData'
import { DEFAULT_PERSONAL_PREFERENCES, normalizePersonalPreferences } from '@/lib/personalization'
import { buildCategoryAssociationPrompt } from '@/games/cognitive/AdvancedGames'

describe('distinct personalized cognitive activities', () => {
  it('includes a complete fictional Indian demo with people, places, and stories', () => {
    expect(DEMO_MEMORIES).toHaveLength(21)
    expect(DEMO_MEMORIES.map((memory) => memory.name)).toEqual(expect.arrayContaining([
      'Kiran', 'Lakshmi', 'A morning walk at Lalbagh', 'A visit to the Basavanagudi market',
      'A family visit to Udupi', 'A Sunday at Cubbon Park', 'Ugadi at home', 'A slow Sunday breakfast',
    ]))
    expect(DEMO_MEMORIES.find((memory) => memory.id === 'fictional-demo-market')?.story).toContain('auto-rickshaw')
    expect(DEMO_MEMORIES.find((memory) => memory.id === 'fictional-demo-lalbagh')?.places).toContain('Lalbagh Botanical Garden')
    expect(DEMO_MEMORIES.find((memory) => memory.id === 'fictional-demo-ugadi')?.events).toHaveLength(3)
  })

  it('uses the profile name in fictional demo stories without changing the shared samples', () => {
    const personalized = demoMemoriesFor('Priya')
    const anita = personalized.find((memory) => memory.id === 'fictional-demo-anita')
    const market = personalized.find((memory) => memory.id === 'fictional-demo-market')

    expect(anita?.story).toContain('Anita calls Priya')
    expect(anita?.people).toContain('Priya')
    expect(market?.story).toContain('Priya and Meera')
    expect(market?.people).toContain('Priya')
    expect(market?.places).toContain("Priya's home")
    expect(DEMO_MEMORIES.find((memory) => memory.id === 'fictional-demo-anita')?.story).toContain('Anita calls Margaret')
  })

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

  it('uses editable interests to change real game pools without inventing personal memories', () => {
    const gardening = { ...DEFAULT_PERSONAL_PREFERENCES, lifeActivityTags: ['Gardening'] }
    const cricket = { ...DEFAULT_PERSONAL_PREFERENCES, lifeActivityTags: ['Cricket'] }
    const gardenPattern = buildPatternRounds([], gardening)
    const cricketPattern = buildPatternRounds([], cricket)
    const gardenSequence = buildSequenceRounds([], 4, gardening)[0]
    const cricketSequence = buildSequenceRounds([], 4, cricket)[0]

    expect(gardenPattern[0].pattern.map((token) => token.label)).toEqual(expect.arrayContaining(['Flower', 'Plant']))
    expect(cricketPattern[0].pattern.map((token) => token.label)).toEqual(expect.arrayContaining(['Cricket bat', 'Cricket ball']))
    expect(gardenSequence.items.map((token) => token.label)).not.toEqual(cricketSequence.items.map((token) => token.label))
    expect(cricketPattern[0].sourceMemoryIds).toEqual([])
  })

  it('keeps personalized rounds valid and coherent, and leaves faces caregiver-supplied', () => {
    const preferences = { ...DEFAULT_PERSONAL_PREFERENCES, lifeActivityTags: ['cricket'] }
    for (const round of buildPatternRounds([], preferences)) {
      expect(round.choices.map((token) => token.id)).toContain(round.answer.id)
      expect(new Set(round.choices.map((token) => token.id)).size).toBe(round.choices.length)
    }
    for (const round of buildSequenceRounds([], 4, preferences)) {
      expect(round.items.every((token) => round.choices.some((choice) => choice.id === token.id))).toBe(true)
      expect(new Set(round.items.map((token) => token.id)).size).toBe(round.items.length)
    }
    const oddRound = buildCategoryRounds([], preferences).find((round) => round.id === 'category-personal-cricket')
    expect(oddRound).toBeDefined()
    expect(oddRound?.items.filter((token) => token.interestGroup === 'cricket')).toHaveLength(3)
    expect(oddRound?.items.find((token) => token.id === oddRound.answerId)?.interestGroup).not.toBe('cricket')
    const association = buildCategoryAssociationPrompt(1, [], 42, preferences)
    const correctChoice = association.choices.find((choice) => choice.id === association.answerId)
    expect(association.category).toBe('cricket')
    expect(correctChoice?.group).toBe(association.category)
    expect(buildFacePrompts([])).toEqual([])
    expect(buildFacePrompts(DEMO_MEMORIES).map((prompt) => prompt.memory.id)).toEqual(
      DEMO_MEMORIES.filter((memory) => memory.kind === 'person' || memory.relationship).map((memory) => memory.id),
    )
  })

  it('uses safe generic game content for missing preferences and preserves favorite colour normalization', () => {
    expect(buildPatternRounds([])[0].title).toBe('Shape pattern')
    expect(buildSequenceRounds([])[0].items.length).toBeGreaterThanOrEqual(3)
    expect(buildCategoryRounds([])).toHaveLength(3)
    expect(normalizePersonalPreferences({ favoriteColors: ['Blue'], favoriteFlower: 'Jasmine' })).toMatchObject({
      favoriteColors: ['Blue'], favoriteFlower: 'Jasmine', lifeActivityTags: [],
    })
  })

  it('keeps new unlisted interests editable and uses a labeled fallback instead of claiming a memory', () => {
    const preferences = { ...DEFAULT_PERSONAL_PREFERENCES, lifeActivityTags: ['birdwatching'] }
    const sequence = buildSequenceRounds([], 4, preferences)[0]
    const prompt = buildCategoryAssociationPrompt(1, [], 24, preferences)
    expect(sequence.items.some((token) => token.label === 'birdwatching' && token.source === 'preference')).toBe(true)
    expect(prompt.source).toBe('preference')
    expect(prompt.choices.find((choice) => choice.id === prompt.answerId)?.label).toBe('birdwatching')
    expect(buildPatternRounds([], preferences)[0].sourceMemoryIds).toEqual([])
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
