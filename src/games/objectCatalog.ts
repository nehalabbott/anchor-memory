import type { MemoryItem, PersonalPreferences } from '@/lib/types'

export type GameGlyph = 'circle' | 'square' | 'triangle' | 'flower' | 'leaf' | 'apple' | 'sun' | 'cup' | 'camera' | 'basket' | 'bird' | 'chair'
export type GameCategory = 'garden' | 'fruit' | 'kitchen' | 'shape' | 'everyday'
export type GameType = 'pattern' | 'sequence' | 'odd-one-out' | 'category-association'

export interface GameToken {
  id: string
  label: string
  glyph: GameGlyph
  category: GameCategory
  memoryId?: string
  interestGroup?: string
  source?: 'memory' | 'preference' | 'catalog' | 'generic'
}

export interface CatalogEntry {
  id: string
  label: string
  category: GameCategory
  interestGroup: string
  tags: string[]
  glyph: GameGlyph
  gameTypes: GameType[]
}

const ALL_GAMES: GameType[] = ['pattern', 'sequence', 'odd-one-out', 'category-association']
const entry = (id: string, label: string, group: string, category: GameCategory, glyph: GameGlyph, tags = [group]): CatalogEntry => ({
  id, label, interestGroup: group, category, glyph, tags, gameTypes: ALL_GAMES,
})

export const OBJECT_CATALOG: CatalogEntry[] = [
  entry('flower', 'Flower', 'gardening', 'garden', 'flower', ['garden', 'gardening']),
  entry('plant', 'Plant', 'gardening', 'garden', 'leaf', ['garden', 'gardening']),
  entry('watering-can', 'Watering can', 'gardening', 'garden', 'cup', ['garden', 'gardening']),
  entry('gloves', 'Gardening gloves', 'gardening', 'garden', 'chair', ['garden', 'gardening']),
  entry('flower-pot', 'Flower pot', 'gardening', 'garden', 'basket', ['garden', 'gardening']),
  entry('seeds', 'Seeds', 'gardening', 'garden', 'apple', ['garden', 'gardening']),
  entry('teapot', 'Teapot', 'cooking', 'kitchen', 'cup', ['cooking', 'kitchen']),
  entry('cup', 'Cup', 'cooking', 'kitchen', 'circle', ['cooking', 'kitchen']),
  entry('plate', 'Plate', 'cooking', 'kitchen', 'square', ['cooking', 'kitchen']),
  entry('spoon', 'Spoon', 'cooking', 'kitchen', 'triangle', ['cooking', 'kitchen']),
  entry('mixing-bowl', 'Mixing bowl', 'cooking', 'kitchen', 'basket', ['cooking', 'kitchen']),
  entry('cricket-bat', 'Cricket bat', 'cricket', 'everyday', 'chair'),
  entry('cricket-ball', 'Cricket ball', 'cricket', 'everyday', 'circle'),
  entry('stumps', 'Stumps', 'cricket', 'everyday', 'square'),
  entry('wicket', 'Wicket', 'cricket', 'everyday', 'triangle'),
  entry('helmet', 'Sports helmet', 'cricket', 'everyday', 'basket'),
  entry('scoreboard', 'Scoreboard', 'cricket', 'everyday', 'camera'),
  entry('radio', 'Radio', 'music', 'everyday', 'camera'),
  entry('instrument', 'Musical instrument', 'music', 'everyday', 'triangle'),
  entry('music-player', 'Music player', 'music', 'everyday', 'square'),
  entry('song', 'Song', 'music', 'everyday', 'bird'),
  entry('paintbrush', 'Paintbrush', 'painting', 'everyday', 'triangle'),
  entry('paint-pot', 'Paint pot', 'painting', 'everyday', 'cup'),
  entry('canvas', 'Canvas', 'painting', 'everyday', 'square'),
  entry('suitcase', 'Suitcase', 'travelling', 'everyday', 'basket', ['travel', 'travelling']),
  entry('map', 'Map', 'travelling', 'everyday', 'camera', ['travel', 'travelling']),
  entry('train', 'Train', 'travelling', 'everyday', 'chair', ['travel', 'travelling']),
  entry('sewing-needle', 'Sewing needle', 'sewing', 'everyday', 'triangle'),
  entry('thread', 'Thread', 'sewing', 'everyday', 'circle'),
  entry('fabric', 'Fabric', 'sewing', 'everyday', 'square'),
  entry('fishing-rod', 'Fishing rod', 'fishing', 'everyday', 'chair'),
  entry('fish', 'Fish', 'fishing', 'everyday', 'bird'),
  entry('fishing-basket', 'Fishing basket', 'fishing', 'everyday', 'basket'),
  entry('book', 'Book', 'reading', 'everyday', 'square'),
  entry('glasses', 'Reading glasses', 'reading', 'everyday', 'circle'),
  entry('bookmark', 'Bookmark', 'reading', 'everyday', 'triangle'),
]

export const GENERIC_TOKENS: GameToken[] = [
  { id: 'generic-circle', label: 'Circle', glyph: 'circle', category: 'shape', source: 'generic' },
  { id: 'generic-square', label: 'Square', glyph: 'square', category: 'shape', source: 'generic' },
  { id: 'generic-triangle', label: 'Triangle', glyph: 'triangle', category: 'shape', source: 'generic' },
  { id: 'generic-flower', label: 'Flower', glyph: 'flower', category: 'garden', interestGroup: 'gardening', source: 'generic' },
  { id: 'generic-leaf', label: 'Leaf', glyph: 'leaf', category: 'garden', interestGroup: 'gardening', source: 'generic' },
  { id: 'generic-apple', label: 'Apple', glyph: 'apple', category: 'fruit', source: 'generic' },
  { id: 'generic-sun', label: 'Sun', glyph: 'sun', category: 'everyday', source: 'generic' },
  { id: 'generic-cup', label: 'Cup', glyph: 'cup', category: 'kitchen', interestGroup: 'cooking', source: 'generic' },
  { id: 'generic-camera', label: 'Camera', glyph: 'camera', category: 'everyday', source: 'generic' },
  { id: 'generic-basket', label: 'Basket', glyph: 'basket', category: 'everyday', source: 'generic' },
  { id: 'generic-bird', label: 'Bird', glyph: 'bird', category: 'everyday', source: 'generic' },
  { id: 'generic-chair', label: 'Chair', glyph: 'chair', category: 'everyday', source: 'generic' },
  { id: 'generic-plant', label: 'Plant', glyph: 'flower', category: 'garden', interestGroup: 'gardening', source: 'generic' },
]

const normal = (value: string) => value.trim().toLocaleLowerCase()
const slug = (value: string) => normal(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'interest'

function categoryFor(label: string): GameCategory {
  const value = normal(label)
  if (/flower|plant|seed|garden|watering|glove|pot/.test(value)) return 'garden'
  if (/apple|banana|orange|mango|fruit|berry|grape|pear/.test(value)) return 'fruit'
  if (/tea|teapot|cup|cake|kitchen|plate|spoon|bake|bowl|cook/.test(value)) return 'kitchen'
  return 'everyday'
}

function matchingCatalog(label: string) {
  const value = normal(label)
  return OBJECT_CATALOG.find((item) => normal(item.label) === value || item.tags.some((tag) => value.includes(tag)))
}

function memoryTokens(memories: MemoryItem[]): GameToken[] {
  return memories.flatMap((memory) => [
    ...(memory.objects ?? []),
    ...(memory.activities ?? []),
    ...(memory.places ?? []),
    ...(memory.events ?? []).flatMap((event) => [...(event.objects ?? []), event.activity ?? '', event.place ?? '']),
  ].filter(Boolean).map((label, index) => {
    const text = label.trim()
    const known = matchingCatalog(text)
    return {
      id: `memory-${slug(memory.id)}-${slug(text)}-${index}`,
      label: text,
      glyph: known?.glyph ?? (categoryFor(text) === 'garden' ? 'leaf' : categoryFor(text) === 'fruit' ? 'apple' : categoryFor(text) === 'kitchen' ? 'cup' : 'circle'),
      category: known?.category ?? categoryFor(text),
      memoryId: memory.id,
      interestGroup: known?.interestGroup,
      source: 'memory' as const,
    }
  }))
}

function preferenceTokens(preferences: Partial<PersonalPreferences> = {}): GameToken[] {
  const interests = [
    ...(preferences.lifeActivityTags ?? []),
    ...(preferences.favoriteActivities ?? []),
    ...(preferences.favoriteFlower ? ['gardening'] : []),
    ...(preferences.favoriteSong ? ['music'] : []),
  ]
  const matched = interests.flatMap<GameToken>((interest) => {
    const key = normal(interest)
    const entries = OBJECT_CATALOG.filter((item) => item.tags.some((tag) => key.includes(tag) || tag.includes(key)))
    if (entries.length) return entries.map((item) => ({ ...item, source: 'catalog' as const }))
    return [{
      id: `preference-${slug(interest)}`, label: interest.trim(), glyph: 'circle' as const,
      category: categoryFor(interest), interestGroup: slug(interest), source: 'preference' as const,
    }]
  })
  const individual = [
    ...(preferences.favoriteFlower ? [{ label: preferences.favoriteFlower, group: 'gardening', glyph: 'flower' as const, category: 'garden' as const }] : []),
    ...(preferences.favoriteBird ? [{ label: preferences.favoriteBird, group: 'birds', glyph: 'bird' as const, category: 'everyday' as const }] : []),
    ...(preferences.favoriteAnimal ? [{ label: preferences.favoriteAnimal, group: 'animals', glyph: 'bird' as const, category: 'everyday' as const }] : []),
    ...(preferences.favoriteSong ? [{ label: preferences.favoriteSong, group: 'music', glyph: 'bird' as const, category: 'everyday' as const }] : []),
    ...(preferences.favoriteFoods ?? []).map((label) => ({ label, group: 'food', glyph: 'apple' as const, category: categoryFor(label) === 'everyday' ? 'fruit' as const : categoryFor(label) })),
  ].map((item) => ({
    id: `preference-${slug(item.group)}-${slug(item.label)}`, label: item.label.trim(),
    glyph: item.glyph, category: item.category, interestGroup: item.group, source: 'preference' as const,
  }))
  const memories = [...(preferences.favoritePlaces ?? [])].map((label) => ({
    id: `preference-place-${slug(label)}`, label: label.trim(), glyph: 'camera' as const,
    category: 'everyday' as const, interestGroup: 'places', source: 'preference' as const,
  }))
  const seen = new Set<string>()
  return [...matched, ...individual, ...memories].filter((token) => {
    const key = normal(token.label)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function getPersonalizedGameTokens(memories: MemoryItem[], preferences?: Partial<PersonalPreferences>): GameToken[] {
  const seen = new Set<string>()
  return [...memoryTokens(memories), ...preferenceTokens(preferences)].filter((token) => {
    const key = normal(token.label)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function getInterestCatalogTokens(interest: string): GameToken[] {
  return OBJECT_CATALOG.filter((item) => item.tags.some((tag) => normal(interest).includes(tag) || tag.includes(normal(interest))))
    .map((item) => ({ id: `catalog-${item.id}`, label: item.label, glyph: item.glyph, category: item.category, interestGroup: item.interestGroup, source: 'catalog' }))
}

export function tokenGroup(label: string) {
  const known = matchingCatalog(label)?.interestGroup
  if (known) return known
  const category = categoryFor(label)
  if (category === 'garden') return 'gardening'
  if (category === 'kitchen') return 'cooking'
  return category
}

export function tokenGlyph(label: string): GameGlyph {
  return matchingCatalog(label)?.glyph ?? (categoryFor(label) === 'garden' ? 'leaf' : categoryFor(label) === 'fruit' ? 'apple' : categoryFor(label) === 'kitchen' ? 'cup' : 'circle')
}

export { categoryFor, slug }
