import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Flower2, HeartHandshake, Stethoscope } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '@/components/PageHeader'
import { gardenStateFor } from '@/games/gardenState'
import { useApp } from '@/store/useApp'
import { savePersonDetails, savePreferences } from '@/lib/appDataService'
import { DEFAULT_PERSONAL_PREFERENCES, normalizePersonalPreferences } from '@/lib/personalization'

const THEME_OPTIONS = [
  { value: 'high-contrast', label: 'High Contrast' },
  { value: 'calming-pastels', label: 'Calming Pastels' },
  { value: 'warm-vintage', label: 'Warm Vintage' },
] as const

const COLOR_OPTIONS = ['Blue', 'Green', 'Yellow', 'Pink', 'Purple', 'Orange', 'Red', 'White']
const FLOWER_OPTIONS = ['Rose', 'Marigold', 'Sunflower', 'Jasmine', 'Lilac']
const BIRD_OPTIONS = ['Sparrow', 'Parrot', 'Peacock', 'Robin', 'Canary']
const ACTIVITY_OPTIONS = ['Gardening', 'Cooking', 'Music', 'Carpentry', 'Reading', 'Painting', 'Walking', 'Family', 'Travel']

export default function Profile() {
  const { memories, lastSessionExperience, toggleAssistant, largeText, setLargeText, speechEnabled, setSpeechEnabled, supportedPerson, preferences, setPreferences } = useApp()
  const [nameDraft, setNameDraft] = useState(supportedPerson.name)
  useEffect(() => setNameDraft(supportedPerson.name), [supportedPerson.name])
  const gardenState = gardenStateFor(lastSessionExperience, memories.length)
  const gardenPreview = gardenState.experience === 'flourishing' ? 'The garden is blooming.'
    : gardenState.experience === 'calming' ? "A quiet moment is waiting in the garden."
      : 'A peaceful place to rest and reflect.'
  const safePreferences = useMemo(() => normalizePersonalPreferences(preferences ?? DEFAULT_PERSONAL_PREFERENCES), [preferences])
  const lastSavedPreferences = useRef<string | null>(null)

  useEffect(() => {
    const fingerprint = JSON.stringify(safePreferences)
    if (lastSavedPreferences.current === fingerprint) return
    lastSavedPreferences.current = fingerprint
    void savePreferences(safePreferences).catch(() => undefined)
  }, [safePreferences])

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

      <Link to="/profile/assessment" className="card mt-3 flex min-h-[88px] items-center gap-4 p-4" aria-label="Cognitive Check-in. Optional support-oriented screening">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sun-soft text-sun-deep" aria-hidden><Stethoscope size={28} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-bold">Cognitive Check-in</span>
          <span className="block text-ink/75">Optional, private screening for support and activity guidance.</span>
        </span>
        <ChevronRight size={24} aria-hidden />
      </Link>

      <section className="mt-8 card p-4" aria-labelledby="personalization-heading">
        <h2 id="personalization-heading" className="text-xl">Personalization</h2>
        <p className="mt-1 text-ink/75">Optional preferences for a more familiar, supportive experience.</p>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="font-semibold">Theme</span>
            <select aria-label="Theme" value={safePreferences.theme} onChange={(event) => setPreferences({ theme: event.target.value as typeof safePreferences.theme })} className="mt-1 w-full min-h-[52px] rounded-xl border-2 border-mint-200 bg-white px-4">
              {THEME_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <div>
            <span className="font-semibold">Favorite colors</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => {
                const on = safePreferences.favoriteColors.includes(color)
                return (
                  <button key={color} type="button" aria-pressed={on} aria-label={`Favorite color ${color}`} onClick={() => setPreferences({ favoriteColors: on ? safePreferences.favoriteColors.filter((entry) => entry !== color) : [...safePreferences.favoriteColors, color].slice(0, 8) })} className={`min-h-[48px] rounded-full border-2 px-3 font-semibold ${on ? 'border-garden-700 bg-mint-100 text-garden-900' : 'border-mint-200 bg-white text-ink'}`}>
                    {color}
                  </button>
                )
              })}
            </div>
          </div>

          <label className="block">
            <span className="font-semibold">Favorite flower</span>
            <select aria-label="Favorite flower" value={safePreferences.favoriteFlower ?? ''} onChange={(event) => setPreferences({ favoriteFlower: event.target.value || null })} className="mt-1 w-full min-h-[52px] rounded-xl border-2 border-mint-200 bg-white px-4">
              <option value="">No preference</option>
              {FLOWER_OPTIONS.map((flower) => <option key={flower} value={flower}>{flower}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="font-semibold">Favorite bird</span>
            <select aria-label="Favorite bird" value={safePreferences.favoriteBird ?? ''} onChange={(event) => setPreferences({ favoriteBird: event.target.value || null })} className="mt-1 w-full min-h-[52px] rounded-xl border-2 border-mint-200 bg-white px-4">
              <option value="">No preference</option>
              {BIRD_OPTIONS.map((bird) => <option key={bird} value={bird}>{bird}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="font-semibold">Favorite song</span>
            <input aria-label="Favorite song" value={safePreferences.favoriteSong ?? ''} onChange={(event) => setPreferences({ favoriteSong: event.target.value || null })} className="mt-1 w-full min-h-[52px] rounded-xl border-2 border-mint-200 px-4" placeholder="Song title or memory" />
          </label>

          <div>
            <span className="font-semibold">Life activities</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {ACTIVITY_OPTIONS.map((activity) => {
                const on = safePreferences.lifeActivityTags.includes(activity)
                return (
                  <button key={activity} type="button" aria-pressed={on} aria-label={`Life activity ${activity}`} onClick={() => setPreferences({ lifeActivityTags: on ? safePreferences.lifeActivityTags.filter((entry) => entry !== activity) : [...safePreferences.lifeActivityTags, activity].slice(0, 12) })} className={`min-h-[48px] rounded-full border-2 px-3 font-semibold ${on ? 'border-garden-700 bg-mint-100 text-garden-900' : 'border-mint-200 bg-white text-ink'}`}>
                    {activity}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <h2 className="text-xl mt-8 mb-3">Comfort settings</h2>
      <div className="card p-4 space-y-4">
        <label className="block">
          <span className="font-semibold">Name</span>
          <input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} onBlur={() => {
            const name = nameDraft.trim()
            if (name && name !== supportedPerson.name) {
              void savePersonDetails({ name, personalDetails: supportedPerson.personalDetails }).catch(() => undefined)
            }
          }} className="mt-1 w-full min-h-[52px] rounded-xl border-2 border-mint-200 px-4" />
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
