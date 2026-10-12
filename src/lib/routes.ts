/**
 * Single source of truth for navigation. Kept to 3 items on purpose, so the app stays simple
 * for someone living with dementia to use: upload/view a memory, play a game, or visit the
 * memory aquarium. (Home and Profile still exist as routes for now — see routes.ts history —
 * they are just not in the main tab bar.)
 */
export const NAV = [
  { path: '/memories', label: 'Memories', icon: 'home' },
  { path: '/games',    label: 'Games',    icon: 'brain' },
  { path: '/garden',   label: 'Garden',   icon: 'flower' },
] as const

const LABELS: Record<string, string> = {
  '/': 'Home', '/games': 'Choose an Activity', '/garden': 'Your Memory Garden',
  '/profile': 'My Journey', '/profile/assessment': 'Cognitive Check-in', '/memories': 'Your Memories',
  '/games/faces': 'Familiar Faces', '/games/match': 'Pattern & Shape Match',
  '/games/sequence': 'Sequence Memory', '/games/category': 'Odd One Out',
  '/games/dual-n-back': 'Dual N-Back', '/games/trail-making': 'Trail Making',
  '/games/category-association': 'Category Association',
}
export const screenLabel = (path: string) => LABELS[path] ?? 'this'
