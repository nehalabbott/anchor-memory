import { ChevronRight, Flower2, HeartHandshake } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '@/components/PageHeader'
import { gardenStateFor } from '@/games/gardenState'
import { useApp } from '@/store/useApp'

export default function Profile() {
  const { memories, lastSessionExperience, toggleAssistant, largeText, setLargeText, speechEnabled, setSpeechEnabled, userName, setUserName } = useApp()
  const gardenState = gardenStateFor(lastSessionExperience, memories.length)
  const gardenPreview = gardenState.experience === 'flourishing' ? 'The garden is blooming.'
    : gardenState.experience === 'calming' ? "A quiet moment is waiting in the garden."
      : 'A peaceful place to rest and reflect.'
  return (
    <>
      <PageHeader title="My Journey" />

      <button type="button" onClick={() => toggleAssistant(true)} aria-label="A Helping Hand. Open Mo assistant" className="card mt-3 flex min-h-[88px] w-full items-center gap-4 p-4 text-left">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sun-soft text-sun-deep" aria-hidden><HeartHandshake size={28} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-bold">A Helping Hand</span>
          <span className="block text-ink/75">Open Mo for a clue, an easier prompt, or a quiet break.</span>
        </span>
        <ChevronRight size={24} aria-hidden />
      </button>

      <section className="mt-6" aria-labelledby="profile-memories-heading">
        <div className="card p-4">
          <h2 id="profile-memories-heading" className="text-xl">Personal Memories</h2>
          <p className="mt-1 text-ink/75">Familiar details shared with Anchor.</p>
          {memories.length === 0 && <p className="mt-2 text-ink/70">Your personal memories will appear on the memories page.</p>}
          <Link to="/memories" className="btn-primary mt-3 w-full">View all memories</Link>
        </div>
      </section>

      <Link to="/garden" aria-label={`Recent Memory Garden. ${gardenPreview}`} className="card mt-3 flex min-h-[88px] items-center gap-4 p-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-garden-100 text-garden-700" aria-hidden><Flower2 size={28} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-bold">Recent Memory Garden</span>
          <span className="block text-ink/75">Take a quiet look at your garden.</span>
          <span className="mt-1 block font-semibold text-garden-900">Open Garden</span>
        </span>
        <ChevronRight size={24} aria-hidden />
      </Link>

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
