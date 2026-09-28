import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

/** Persistent location anchor: back button + clear title on every sub-screen (HCI goal 4). */
export default function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const nav = useNavigate()
  return (
    <header className="mb-5">
      <div className="flex items-center gap-3">
        <button onClick={() => nav(-1)} aria-label="Go back"
          className="w-14 h-14 rounded-full bg-white border border-mint-200 flex items-center justify-center shrink-0"><ChevronLeft size={28} /></button>
        <h1 className="text-2xl">{title}</h1>
      </div>
      {subtitle && <p className="mt-2 text-ink/70 text-lg">{subtitle}</p>}
    </header>
  )
}
