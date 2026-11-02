import type { MemoryItem, PersonalPreferences } from '@/lib/types'
import {
  GENERIC_TOKENS, getPersonalizedGameTokens, slug, tokenGroup,
} from './objectCatalog'
import type { GameCategory, GameGlyph, GameToken } from './objectCatalog'

export type { GameCategory, GameGlyph, GameToken } from './objectCatalog'

export interface FacePrompt {
  id: string
  memory: MemoryItem
  choices: MemoryItem[]
  identityClue: string
}

export interface PatternRound {
  id: string
  title: string
  instruction: string
  pattern: GameToken[]
  answer: GameToken
  choices: GameToken[]
  clue: string
  sourceMemoryIds: string[]
}

export interface SequenceRound {
  id: string
  title: string
  instruction: string
  items: GameToken[]
  choices: GameToken[]
  sourceMemoryIds: string[]
}

export interface CategoryRound {
  id: string
  title: string
  instruction: string
  items: GameToken[]
  answerId: string
  explanation: string
  sourceMemoryIds: string[]
}

const unique = (values: string[]) => [...new Set(values.filter(Boolean))]
const isRememberedPerson = (memory: MemoryItem) => memory.kind === 'person' || Boolean(memory.relationship)
const rotate = <T,>(items: T[], offset: number) => {
  const start = items.length ? offset % items.length : 0
  return [...items.slice(start), ...items.slice(0, start)]
}

export function buildFacePrompts(memories: MemoryItem[]): FacePrompt[] {
  const people = memories.filter(isRememberedPerson)
  return people.map((memory, index) => {
    const otherPeople = people.filter((person) => person.id !== memory.id)
    const offset = otherPeople.length ? index % otherPeople.length : 0
    const distractors = [...otherPeople.slice(offset), ...otherPeople.slice(0, offset)]
    return {
      id: `faces-${memory.id}`,
      memory,
      choices: rotate([memory, ...distractors], index),
      identityClue: memory.relationship
        ? `This person is saved as a ${memory.relationship}.`
        : 'Think of the people your caregiver added.',
    }
  })
}

function uniqueTokens(tokens: GameToken[]) {
  const ids = new Set<string>()
  return tokens.filter((token) => !ids.has(token.id) && Boolean(ids.add(token.id)))
}

function focusedTokens(tokens: GameToken[]) {
  const groups = new Map<string, GameToken[]>()
  for (const token of tokens) {
    const group = token.interestGroup ?? tokenGroup(token.label)
    if (group === 'everyday' || group === 'shape') continue
    groups.set(group, [...(groups.get(group) ?? []), token])
  }
  const sourceRank = (items: GameToken[]) => Math.min(...items.map((item) =>
    item.source === 'memory' ? 0 : item.source === 'preference' ? 1 : item.source === 'catalog' ? 2 : 3))
  const preferredGroup = [...groups.values()]
    .filter((items) => items.length >= 2)
    .sort((left, right) => sourceRank(left) - sourceRank(right) || right.length - left.length)[0]
  return preferredGroup ?? tokens
}

function distinctPatternPair(tokens: GameToken[]): [GameToken, GameToken] | null {
  const first = tokens[0]
  if (!first) return null
  const candidate = tokens.find((token) => token.id !== first.id && token.glyph !== first.glyph)
  if (candidate) return [first, candidate]
  const fallback = GENERIC_TOKENS.find((token) => token.id !== first.id && token.glyph !== first.glyph)
  return fallback ? [first, fallback] : null
}

export function buildPatternRounds(memories: MemoryItem[], preferences?: Partial<PersonalPreferences>): PatternRound[] {
  const personal = getPersonalizedGameTokens(memories, preferences)
  const groupedTokens = focusedTokens(personal)
  const personalGroups = new Map<string, GameToken[]>()
  for (const token of groupedTokens) {
    const group = token.interestGroup ?? tokenGroup(token.label)
    personalGroups.set(group, [...(personalGroups.get(group) ?? []), token])
  }
  const patternGroups = [...personalGroups.values()].filter((group) => group.length >= 2)
  const patterns = [
    { order: [0, 1, 0, 1], answerIndex: 0 },
    { order: [1, 0, 1, 0], answerIndex: 1 },
    { order: [0, 0, 1, 0, 0], answerIndex: 1 },
  ]
  return patterns.map(({ order, answerIndex }, index) => {
    const selectedGroup = patternGroups[index % Math.max(1, patternGroups.length)] ?? groupedTokens
    const pairOffset = patternGroups.length ? (Math.floor(index / patternGroups.length) * 2) % selectedGroup.length : 0
    const candidatePair = distinctPatternPair(rotate(selectedGroup, pairOffset)) ?? [GENERIC_TOKENS[0], GENERIC_TOKENS[1]]
    const [first, second] = candidatePair
    const values = order.map((position) => position === 0 ? first : second)
    const answer = candidatePair[answerIndex]
    const pair = candidatePair
    const title = personal.length
      ? `${(first.interestGroup ?? tokenGroup(first.label))[0].toLocaleUpperCase()}${(first.interestGroup ?? tokenGroup(first.label)).slice(1)} pattern`
      : 'Shape pattern'
    const sourceMemoryIds = unique(pair.map((token) => token.memoryId ?? ''))
    const paired = answer.id === first.id ? second : first
    const choices = rotate(uniqueTokens([
      answer,
      paired,
      ...personal.filter((token) => token.id !== answer.id && token.id !== paired.id && token.glyph !== answer.glyph),
      ...GENERIC_TOKENS.filter((token) => token.glyph !== answer.glyph),
    ]).slice(0, 4), index)
    return {
      id: `pattern-${index + 1}`,
      title,
      instruction: 'Look at the pattern. Which item comes next?',
      pattern: values,
      answer,
      choices,
      clue: 'Notice the items that repeat, and look at what follows the pair.',
      sourceMemoryIds,
    }
  })
}

function sequencePool(memories: MemoryItem[], preferences?: Partial<PersonalPreferences>): GameToken[] {
  const personal = getPersonalizedGameTokens(memories, preferences)
  return uniqueTokens([...focusedTokens(personal), ...personal, ...GENERIC_TOKENS]).slice(0, 6)
}

export function buildSequenceRounds(memories: MemoryItem[], maxSequenceLength = 4, preferences?: Partial<PersonalPreferences>): SequenceRound[] {
  const pool = sequencePool(memories, preferences)
  const length = Math.max(2, Math.min(pool.length, maxSequenceLength))
  const sequences = [
    pool.slice(0, Math.min(3, length)),
    rotate(pool, 2).slice(0, length),
    rotate(pool, 4).slice(0, length),
  ]
  return sequences.map((items, index) => ({
    id: `sequence-${index + 1}`,
    title: 'A familiar sequence',
    instruction: 'Study the items, hide them, then build the same order.',
    items,
    choices: pool,
    sourceMemoryIds: unique(items.map((token) => token.memoryId ?? '')),
  }))
}

function makeCategoryItem(id: string, label: string, glyph: GameGlyph, category: GameCategory, interestGroup?: string, memoryId?: string): GameToken {
  return { id, label, glyph, category, interestGroup, memoryId }
}

function genericCategoryRounds(): CategoryRound[] {
  return [
    {
      id: 'category-fruit', title: 'Everyday groups', instruction: 'Which one does not belong with the others?',
      items: [GENERIC_TOKENS[5], makeCategoryItem('generic-banana', 'Banana', 'apple', 'fruit'), makeCategoryItem('generic-orange', 'Orange', 'apple', 'fruit'), GENERIC_TOKENS[11]],
      answerId: GENERIC_TOKENS[11].id, explanation: 'Three are fruits; the chair belongs to a different group.', sourceMemoryIds: [],
    },
    {
      id: 'category-kitchen', title: 'Everyday groups', instruction: 'Which one does not belong with the others?',
      items: [GENERIC_TOKENS[7], makeCategoryItem('generic-plate', 'Plate', 'circle', 'kitchen'), makeCategoryItem('generic-spoon', 'Spoon', 'triangle', 'kitchen'), GENERIC_TOKENS[10]],
      answerId: GENERIC_TOKENS[10].id, explanation: 'Three are kitchen items; the bird belongs to a different group.', sourceMemoryIds: [],
    },
    {
      id: 'category-garden', title: 'Everyday groups', instruction: 'Which one does not belong with the others?',
      items: [GENERIC_TOKENS[3], GENERIC_TOKENS[4], GENERIC_TOKENS[12], GENERIC_TOKENS[11]],
      answerId: GENERIC_TOKENS[11].id, explanation: 'Three are garden things; the chair belongs to a different group.', sourceMemoryIds: [],
    },
  ]
}

export function buildCategoryRounds(memories: MemoryItem[], preferences?: Partial<PersonalPreferences>): CategoryRound[] {
  const tokens = getPersonalizedGameTokens(memories, preferences)
  const groups = new Map<string, GameToken[]>()
  for (const token of tokens) {
    const group = token.interestGroup ?? tokenGroup(token.label)
    if (group === 'everyday' || group === 'shape') continue
    groups.set(group, [...(groups.get(group) ?? []), token])
  }
  const personalizedRounds: CategoryRound[] = []
  for (const [group, entries] of groups) {
    const uniqueEntries = uniqueTokens(entries).slice(0, 3)
    if (uniqueEntries.length < 3) continue
    const groupCategory = uniqueEntries[0].category
    const outlier = GENERIC_TOKENS.find((token) => token.category !== groupCategory && token.id === 'generic-chair')
      ?? GENERIC_TOKENS.find((token) => token.category !== groupCategory && !uniqueEntries.some((item) => item.label.toLocaleLowerCase() === token.label.toLocaleLowerCase()))
    if (!outlier) continue
    const label = group.replace(/-/g, ' ')
    personalizedRounds.push({
      id: `category-personal-${slug(group)}`,
      title: `${label[0]?.toLocaleUpperCase() ?? ''}${label.slice(1)} group`,
      instruction: 'Which one does not belong with the others?',
      items: [...uniqueEntries, outlier],
      answerId: outlier.id,
      explanation: `The other items are all related to ${label}.`,
      sourceMemoryIds: unique(uniqueEntries.map((token) => token.memoryId ?? '')),
    })
  }
  const rounds = [...personalizedRounds, ...genericCategoryRounds()]
  return rounds.map((round, index) => ({ ...round, items: rotate(round.items, index + 1) }))
}

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toLocaleUpperCase()).join('') || '?'
}
