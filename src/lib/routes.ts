/** Single source of truth for navigation. Adding a screen in Part 2/3 = add one line here + one <Route>. */
export const NAV = [
  { path: '/',        label: 'Home',    icon: 'home' },
  { path: '/games',   label: 'Games',   icon: 'brain' },
  { path: '/garden',  label: 'Garden',  icon: 'flower' },
  { path: '/profile', label: 'Profile', icon: 'user' },
] as const

const LABELS: Record<string, string> = {
  '/': 'Home', '/games': 'Choose an Activity', '/garden': 'Your Memory Garden',
  '/profile': 'My Journey', '/memories': 'Your Memories',
}
export const screenLabel = (path: string) => LABELS[path] ?? 'this'
