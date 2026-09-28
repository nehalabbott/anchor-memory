import { Link } from 'react-router-dom'
import { User, Brain, Home, Flower2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

const GAMES = [
  { id: 'faces',    title: 'Familiar Faces',  sub: 'Who is this person?', icon: User,    cls: 'bg-mint-100 border-garden-500 text-garden-900' },
  { id: 'match',    title: 'Memory Match',    sub: 'Match the pairs',     icon: Brain,   cls: 'bg-rose-soft border-rose-main text-rose-deep' },
  { id: 'story',    title: 'Story Recall',    sub: 'Remember the tale',   icon: Home,    cls: 'bg-iris-soft border-iris-main text-iris-deep' },
  { id: 'sequence', title: 'Memory Sequence', sub: 'Follow the pattern',  icon: Flower2, cls: 'bg-sun-soft border-sun-main text-sun-deep' },
]

export default function Games() {
  return (
    <>
      <PageHeader title="Choose an Activity" subtitle="Pick something that feels right today" />
      <div className="grid grid-cols-2 gap-4">
        {GAMES.map(({ id, title, sub, icon: Icon, cls }) => (
          <Link key={id} to={`/games/${id}`} className={`tile ${cls}`}>
            <span className="w-12 h-12 rounded-full bg-white flex items-center justify-center" aria-hidden><Icon size={26} /></span>
            <span className="mt-3">
              <span className="block font-display font-bold text-lg leading-tight">{title}</span>
              <span className="block text-base opacity-80">{sub}</span>
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-8 text-center text-ink/70">Activities use your personal photos and memories</p>
    </>
  )
}
