import { useParams } from 'react-router-dom'
import { Sprout } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

/** Marks screens that arrive in Part 2 / Part 3, so no link in Part 1 is ever a dead end. */
export default function Placeholder({ title, part, note }: { title?: string; part: 2 | 3; note: string }) {
  const { game } = useParams()
  return (
    <>
      <PageHeader title={title ?? (game ? game.charAt(0).toUpperCase() + game.slice(1) : 'Coming soon')} />
      <div className="card p-6 text-center">
        <Sprout size={44} className="mx-auto text-garden-500" aria-hidden />
        <h2 className="text-xl mt-3">Growing in Part {part}</h2>
        <p className="mt-2 text-ink/70">{note}</p>
        <p className="mt-4 text-ink/70">In the meantime, Mo is always here. Tap <b>Talk to Assistant</b> below.</p>
      </div>
    </>
  )
}
