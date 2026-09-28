import { NavLink } from 'react-router-dom'
import { Home, Brain, Flower2, User } from 'lucide-react'
import { NAV } from '@/lib/routes'

const ICONS = { home: Home, brain: Brain, flower: Flower2, user: User }

/** Text + icon on every item (redundant cues); active tab is a filled mint pill as in Lab 5. */
export default function BottomNav() {
  return (
    <nav aria-label="Main" className="bg-white border-t border-mint-200 px-2 pt-2 pb-[max(10px,env(safe-area-inset-bottom))]">
      <ul className="grid grid-cols-4 gap-1">
        {NAV.map(({ path, label, icon }) => {
          const Icon = ICONS[icon]
          return (
            <li key={path}>
              <NavLink to={path} end={path === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 min-h-[64px] rounded-2xl font-display font-semibold text-base transition ${
                    isActive ? 'bg-mint-100 text-garden-900' : 'text-ink/70 hover:bg-mint-100/60'}`}>
                <Icon size={26} aria-hidden />{label}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
