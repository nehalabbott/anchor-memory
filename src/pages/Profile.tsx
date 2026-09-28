import { Home, Brain, Flower2, Lightbulb } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { useApp } from '@/store/useApp'

export default function Profile() {
  const { memories, events, largeText, setLargeText, speechEnabled, setSpeechEnabled, userName, setUserName } = useApp()
  const hints = events.filter((e) => e.type === 'help_request').length
  const rows = [
    { icon: Home,      t: 'Memories Explored', s: `${memories.length} memories saved`, cls: 'bg-sky-soft text-sky-main' },
    { icon: Brain,     t: 'Games Enjoyed',     s: 'Games arrive in Part 2',           cls: 'bg-rose-soft text-rose-main' },
    { icon: Flower2,   t: 'Garden Growth',     s: 'Your garden is blooming',          cls: 'bg-garden-100 text-garden-600' },
    { icon: Lightbulb, t: 'Gentle Moments',    s: `${hints} times you asked for a hint, and that's perfectly okay`, cls: 'bg-sun-soft text-sun-main' },
  ]
  return (
    <>
      <PageHeader title="My Journey" />
      <ul className="space-y-3">
        {rows.map(({ icon: Icon, t, s, cls }) => (
          <li key={t} className="card p-4 flex items-center gap-4">
            <span className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${cls}`} aria-hidden><Icon size={26} /></span>
            <span><span className="block font-display font-bold text-lg">{t}</span><span className="text-ink/70">{s}</span></span>
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-card border-2 border-garden-500 bg-mint-100 p-4 text-garden-900">
        Every step you take is a gift to yourself. There is no wrong way to explore your memories.
      </p>

      <h2 className="text-xl mt-8 mb-3">Comfort settings</h2>
      <div className="card p-4 space-y-4">
        <label className="block">
          <span className="font-semibold">Name</span>
          <input value={userName} onChange={(e) => setUserName(e.target.value)} className="mt-1 w-full min-h-[52px] rounded-xl border-2 border-mint-200 px-4" />
        </label>
        <Toggle label="Larger text" on={largeText} set={setLargeText} />
        <Toggle label="Mo speaks replies aloud" on={speechEnabled} set={setSpeechEnabled} />
      </div>
    </>
  )
}

function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => set(!on)} className="w-full flex items-center justify-between min-h-[52px]">
      <span className="font-semibold">{label}</span>
      <span className={`w-16 h-9 rounded-full p-1 transition ${on ? 'bg-garden-600' : 'bg-ink/25'}`}>
        <span className={`block w-7 h-7 rounded-full bg-white transition ${on ? 'translate-x-7' : ''}`} />
      </span>
    </button>
  )
}
