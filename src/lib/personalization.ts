import { useApp } from '@/store/useApp'
import type { PersonalPreferences } from './types'

export const DEFAULT_PERSONAL_PREFERENCES: PersonalPreferences = {
  theme: 'high-contrast',
  favoriteColors: [],
  favoriteFlower: null,
  favoriteBird: null,
  favoriteSong: null,
  lifeActivityTags: [],
}

const ALLOWED_THEMES = new Set(['high-contrast', 'calming-pastels', 'warm-vintage'])
const normalizeList = (value: unknown, maxItems = 12): string[] => {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean).slice(0, maxItems))]
}

export function normalizePersonalPreferences(value?: Partial<PersonalPreferences> | null): PersonalPreferences {
  const next: PersonalPreferences = { ...DEFAULT_PERSONAL_PREFERENCES }
  if (!value || typeof value !== 'object') return next
  const theme = typeof value.theme === 'string' ? value.theme : null
  if (theme && ALLOWED_THEMES.has(theme)) next.theme = theme as PersonalPreferences['theme']
  next.favoriteColors = normalizeList(value.favoriteColors, 8)
  next.favoriteFlower = typeof value.favoriteFlower === 'string' && value.favoriteFlower.trim() ? value.favoriteFlower.trim() : null
  next.favoriteBird = typeof value.favoriteBird === 'string' && value.favoriteBird.trim() ? value.favoriteBird.trim() : null
  next.favoriteSong = typeof value.favoriteSong === 'string' && value.favoriteSong.trim() ? value.favoriteSong.trim() : null
  next.lifeActivityTags = normalizeList(value.lifeActivityTags, 12)
  return next
}

export function getPersonalizationContext() {
  const { preferences } = useApp.getState()
  return {
    theme: preferences.theme,
    favoriteColors: preferences.favoriteColors,
    favoriteFlower: preferences.favoriteFlower,
    favoriteBird: preferences.favoriteBird,
    favoriteSong: preferences.favoriteSong,
    lifeActivityTags: preferences.lifeActivityTags,
  }
}

export function getSafeAssistantPersonalization() {
  const { favoriteFlower, favoriteBird, favoriteSong, lifeActivityTags } = useApp.getState().preferences
  return {
    favoriteFlower,
    favoriteBird,
    favoriteSong,
    lifeActivityTags,
  }
}
