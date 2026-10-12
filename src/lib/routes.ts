/**
 * Shared navigation for the main app. The profile option stays visible so users can reach
 * their personal details and progress without needing to hunt through the home screen.
 */
export const NAV = [
  { path: '/memories', label: 'Memories', icon: 'home' },
  { path: '/games', label: 'Games', icon: 'brain' },
  { path: '/garden', label: 'Memory Aquarium', icon: 'flower' },
  { path: '/profile', label: 'My Journey', icon: 'user' },
] as const

const LABELS: Record<string, string> = {
  '/': 'Home', '/games': 'Choose an Activity', '/garden': 'Memory Aquarium',
  '/profile': 'My Journey', '/profile/assessment': 'Cognitive Check-in', '/memories': 'Your Memories',
  '/games/faces': 'Familiar Faces', '/games/match': 'Pattern & Shape Match',
  '/games/sequence': 'Sequence Memory', '/games/category': 'Odd One Out',
  '/games/dual-n-back': 'Dual N-Back', '/games/trail-making': 'Trail Making',
  '/games/category-association': 'Category Association',
}
export const screenLabel = (path: string) => LABELS[path] ?? 'this'
