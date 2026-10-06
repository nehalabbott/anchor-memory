import type { MemoryItem } from '@/lib/types'

export interface FacePrompt {
  id: string
  memory: MemoryItem
  choices: MemoryItem[]
  identityClue: string
}

export type GameGlyph = 'circle' | 'square' | 'triangle' | 'flower' | 'leaf' | 'apple' | 'sun' | 'cup' | 'camera' | 'basket' | 'bird' | 'chair'
export type GameCategory = 'garden' | 'fruit' | 'kitchen' | 'shape' | 'everyday'

export interface GameToken {
  id: string
  label: string
  glyph: GameGlyph
  category: GameCategory
  memoryId?: string
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

interface PersonalToken {
  label: string
  category: GameCategory
  memoryId: string
}

const GENERIC_TOKENS: GameToken[] = [
  { id: 'generic-circle', label: 'Circle', glyph: 'circle', category: 'shape' },
  { id: 'generic-square', label: 'Square', glyph: 'square', category: 'shape' },
  { id: 'generic-triangle', label: 'Triangle', glyph: 'triangle', category: 'shape' },
  { id: 'generic-flower', label: 'Flower', glyph: 'flower', category: 'garden' },
  { id: 'generic-leaf', label: 'Leaf', glyph: 'leaf', category: 'garden' },
  { id: 'generic-apple', label: 'Apple', glyph: 'apple', category: 'fruit' },
  { id: 'generic-sun', label: 'Sun', glyph: 'sun', category: 'everyday' },
  { id: 'generic-cup', label: 'Cup', glyph: 'cup', category: 'kitchen' },
  { id: 'generic-camera', label: 'Camera', glyph: 'camera', category: 'everyday' },
  { id: 'generic-basket', label: 'Basket', glyph: 'basket', category: 'everyday' },
  { id: 'generic-bird', label: 'Bird', glyph: 'bird', category: 'everyday' },
  { id: 'generic-chair', label: 'Chair', glyph: 'chair', category: 'everyday' },
  { id: 'generic-plant', label: 'Plant', glyph: 'flower', category: 'garden' },
]

const unique = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))]
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

function categoryFor(label: string): GameCategory {
  const value = label.toLocaleLowerCase()
  if (/garden|flower|marigold|seed|leaf|plant|watering/.test(value)) return 'garden'
  if (/apple|banana|orange|mango|fruit|berry|grape|pear/.test(value)) return 'fruit'
  if (/tea|teapot|cup|cake|kitchen|plate|spoon|bake/.test(value)) return 'kitchen'
  return 'everyday'
}

function glyphFor(label: string, category = categoryFor(label)): GameGlyph {
  const value = label.toLocaleLowerCase()
  if (/flower|marigold|seed|plant/.test(value)) return 'flower'
  if (/leaf|tree|cedar/.test(value)) return 'leaf'
  if (/apple|mango|orange|banana|fruit/.test(value)) return 'apple'
  if (/sun/.test(value)) return 'sun'
  if (/tea|teapot|cup|cake|bake/.test(value)) return 'cup'
  if (/camera|photograph/.test(value)) return 'camera'
  if (/basket/.test(value)) return 'basket'
  if (/bird/.test(value)) return 'bird'
  if (/chair/.test(value)) return 'chair'
  if (category === 'garden') return 'leaf'
  if (category === 'fruit') return 'apple'
  if (category === 'kitchen') return 'cup'
  return 'circle'
}

function personalTokens(memories: MemoryItem[]): PersonalToken[] {
  return memories.flatMap((memory) => [
    ...(memory.objects ?? []),
    ...(memory.activities ?? []),
    ...(memory.places ?? []),
  ].map((label) => ({ label: label.trim(), category: categoryFor(label), memoryId: memory.id })))
    .filter((item) => item.label.length > 0)
    .filter((item, index, all) => all.findIndex((other) => other.label.toLocaleLowerCase() === item.label.toLocaleLowerCase()) === index)
}

function tokenFromPersonal(item: PersonalToken, index: number): GameToken {
  return {
    id: `personal-${item.memoryId}-${index}`,
    label: item.label,
    glyph: glyphFor(item.label, item.category),
    category: item.category,
    memoryId: item.memoryId,
  }
}

export function buildPatternRounds(memories: MemoryItem[]): PatternRound[] {
  const personalPair = personalTokens(memories).slice(0, 2).map(tokenFromPersonal)
  const first = personalPair[0] ?? GENERIC_TOKENS[0]
  const secondCandidate = personalPair[1] ?? (first.category === 'garden' ? GENERIC_TOKENS[4]
    : first.category === 'fruit' ? GENERIC_TOKENS[7]
      : first.category === 'kitchen' ? GENERIC_TOKENS[9]
        : GENERIC_TOKENS[1])
  const second = secondCandidate.glyph === first.glyph
    ? GENERIC_TOKENS.find((token) => token.glyph !== first.glyph) ?? GENERIC_TOKENS[1]
    : secondCandidate
  const title = personalPair.length ? `${first.category === 'garden' ? 'Garden' : first.category === 'fruit' ? 'Fruit' : first.category === 'kitchen' ? 'Familiar object' : 'Familiar'} pattern` : 'Shape pattern'
  const sourceMemoryIds = unique(personalPair.map((token) => token.memoryId ?? ''))
  const patterns = [
    { values: [first, second, first, second], answer: first },
    { values: [second, first, second, first], answer: second },
    { values: [first, first, second, first, first], answer: second },
  ]
  return patterns.map(({ values, answer }, index) => ({
    id: `pattern-${index + 1}`,
    title,
    instruction: 'Look at the pattern. Which item comes next?',
    pattern: values,
    answer,
    choices: rotate([
      answer,
      answer.id === first.id ? second : first,
      ...GENERIC_TOKENS.filter((token) => token.id !== answer.id && token.id !== first.id && token.id !== second.id && token.glyph !== answer.glyph),
    ].filter((token, tokenIndex, tokens) => tokens.findIndex((candidate) => candidate.id === token.id) === tokenIndex), index),
    clue: 'Notice the items that repeat, and look at what follows the pair.',
    sourceMemoryIds,
  }))
}

function sequencePool(memories: MemoryItem[]): GameToken[] {
  const personal = personalTokens(memories).map(tokenFromPersonal)
  const pool = [...personal, ...GENERIC_TOKENS].filter((token, index, all) => all.findIndex((other) => other.label.toLocaleLowerCase() === token.label.toLocaleLowerCase()) === index)
  return pool.slice(0, 6)
}

export function buildSequenceRounds(memories: MemoryItem[], maxSequenceLength = 4): SequenceRound[] {
  const pool = sequencePool(memories)
  const length = Math.max(2, Math.min(pool.length, maxSequenceLength))
  const sequences = [
    pool.slice(0, Math.min(3, length)),
    [pool[2], pool[0], pool[3], pool[1], pool[4], pool[5]].filter((token): token is GameToken => Boolean(token)).slice(0, length),
    [pool[1], pool[3], pool[0], pool[4], pool[2], pool[5]].filter((token): token is GameToken => Boolean(token)).slice(0, length),
  ]
  return sequences.map((items, index) => ({
    id: `sequence-${index + 1}`,
    title: 'A familiar sequence',
    instruction: 'Study the items, hide them, then build the same order.',
    items,
    choices: pool,
    sourceMemoryIds: unique(items.map((token) => token?.memoryId ?? '')),
  }))
}

function makeCategoryItem(id: string, label: string, glyph: GameGlyph, category: GameCategory, memoryId?: string): GameToken {
  return { id, label, glyph, category, memoryId }
}

export function buildCategoryRounds(memories: MemoryItem[]): CategoryRound[] {
  const tokens = personalTokens(memories)
  const personalGroups = (['garden', 'fruit', 'kitchen'] as const).map((category) => ({
    category,
    items: tokens.filter((token) => token.category === category).slice(0, 3),
  })).filter(({ items }) => items.length >= 2)
  const rounds: CategoryRound[] = personalGroups.map((personalRound) => {
    const items = personalRound.items.map((item, index) => makeCategoryItem(
      `personal-category-${personalRound.category}-${item.memoryId}-${index}`,
      item.label, glyphFor(item.label, item.category), item.category, item.memoryId,
    ))
    const oddOneOut = personalRound.category === 'garden' ? GENERIC_TOKENS[11]
      : personalRound.category === 'fruit' ? GENERIC_TOKENS[9] : GENERIC_TOKENS[10]
    const groupName = personalRound.category === 'garden' ? 'garden-related items'
      : personalRound.category === 'fruit' ? 'fruits' : 'kitchen items'
    items.push(oddOneOut)
    return {
      id: `category-personal-${personalRound.category}`,
      title: personalRound.category === 'garden' ? 'Garden group' : personalRound.category === 'fruit' ? 'Fruit group' : 'Kitchen group',
      instruction: 'Which one does not belong with the others?', items, answerId: oddOneOut.id,
      explanation: `The other items are all ${groupName}.`,
      sourceMemoryIds: unique(personalRound.items.map((item) => item.memoryId)),
    }
  })

  const genericRounds: CategoryRound[] = [
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
  return [...rounds, ...genericRounds].map((round, index) => ({ ...round, items: rotate(round.items, index + 1) }))
}

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toLocaleUpperCase()).join('') || '?'
}
