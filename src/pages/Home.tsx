import { Link } from 'react-router-dom'
import { Brain, Camera, Image, CalendarDays, PenLine, User, Flower2, Sun } from 'lucide-react'
import { useApp } from '@/store/useApp'

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }

const TILES = [
  { to: '/games',    label: 'Memory Game',      icon: Brain,        cls: 'bg-mint-100 border-garden-500 text-garden-900' },
  { to: '/memories', label: 'Upload Memory',    icon: Camera,       cls: 'bg-rose-soft border-rose-main text-rose-deep' },
  { to: '/memories', label: 'Your Memories',    icon: Image,        cls: 'bg-sky-soft border-sky-main text-sky-deep' },
  { to: '/games',    label: 'Daily Activities', icon: CalendarDays, cls: 'bg-sun-soft border-sun-main text-sun-deep' },
  { to: '/profile',  label: 'Enter Log',        icon: PenLine,      cls: 'bg-iris-soft border-iris-main text-iris-deep' },
  { to: '/profile',  label: 'My Profile',       icon: User,         cls: 'bg-garden-100 border-garden-500 text-garden-700' },
]

export default function Home() {
  const name = useApp((s) => s.userName)
  return (
    <>
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-3xl">{greeting()},<br /><span className="text-garden-700">{name}</span></h1>
        <div className="w-16 h-16 rounded-full bg-sun-soft flex items-center justify-center text-sun-main" aria-hidden><Sun size={34} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {TILES.map(({ to, label, icon: Icon, cls }) => (
          <Link key={label} to={to} className={`tile ${cls}`}>
            <span className="w-12 h-12 rounded-full bg-white flex items-center justify-center" aria-hidden><Icon size={26} /></span>
            <span className="font-display font-bold text-lg leading-tight mt-3">{label}</span>
          </Link>
        ))}
      </div>
      <Link to="/garden" className="mt-5 flex items-center gap-4 rounded-card border-2 border-garden-500 bg-garden-50 p-4">
        <span className="w-16 h-16 rounded-2xl bg-garden-100 flex items-center justify-center text-garden-600" aria-hidden><Flower2 size={34} /></span>
        <span>
          <span className="block font-display font-bold text-xl text-garden-700 leading-tight">Your Memory Garden</span>
          <span className="block text-ink/70">A place to pause and reflect</span>
        </span>
      </Link>
    </>
  )
}
