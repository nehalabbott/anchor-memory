/** Main navigation for memories, games, aquarium, and profile. */
import { NavLink } from 'react-router-dom'
import { Home, Brain, Fish, User } from 'lucide-react'
import { NAV } from '@/lib/routes'

const ICONS = { home: Home, brain: Brain, fish: Fish, user: User }

export default function BottomNav() {
  return (
    <nav aria-label="Main" className="bg-white border-t border-mint-200 px-2 pt-1 sm:pt-2 pb-[max(10px,env(safe-area-inset-bottom))]">
      <ul className="grid grid-cols-4 gap-1">
        {NAV.map(({ path, label, icon }) => {
          const Icon = ICONS[icon]
          return (
            <li key={path}>
              <NavLink to={path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 min-h-[56px] rounded-2xl font-display font-semibold text-base transition ${
                    isActive ? 'bg-mint-100 text-garden-900' : 'text-ink/70 hover:bg-mint-100/60'}`}>
                <Icon size={24} aria-hidden />{label}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
