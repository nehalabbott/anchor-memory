import { Link } from 'react-router-dom'
import { UserRound, Shapes, ListOrdered, ScanSearch } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

import { Brain, Route, Sparkles } from 'lucide-react'

const GAMES = [
  { id: 'faces',    title: 'Familiar Faces',         sub: 'Recognize familiar people', icon: UserRound, cls: 'bg-mint-100 border-garden-500 text-garden-900' },
  { id: 'match',    title: 'Pattern & Shape Match',  sub: 'Complete a visual pattern', icon: Shapes, cls: 'bg-rose-soft border-rose-main text-rose-deep' },
  { id: 'sequence', title: 'Sequence Memory',        sub: 'Study, hide, rebuild', icon: ListOrdered, cls: 'bg-sun-soft border-sun-main text-sun-deep' },
  { id: 'category', title: 'Odd One Out',             sub: 'Find the item from another group', icon: ScanSearch, cls: 'bg-iris-soft border-iris-main text-iris-deep' },
  { id: 'dual-n-back', title: 'Dual N-Back', sub: 'Working memory exercise', icon: Brain, cls: 'bg-mint-100 border-garden-500 text-garden-900' },
  { id: 'trail-making', title: 'Trail Making', sub: 'Follow the route in turns', icon: Route, cls: 'bg-sun-soft border-sun-main text-sun-deep' },
  { id: 'category-association', title: 'Category Association', sub: 'Match a word to its group', icon: Sparkles, cls: 'bg-iris-soft border-iris-main text-iris-deep' },
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
      <p className="mt-8 text-center text-ink/70">Activities use the personal photos and memories shared with Anchor.</p>
    </>
  )
}
