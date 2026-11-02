/** Provides personal details, accessibility, privacy, and personalization settings. */
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { gardenStateFor } from '@/games/gardenState'
import { useApp } from '@/store/useApp'
import { logout } from '@/lib/apiClient'
import { savePersonDetails, savePreferences } from '@/lib/appDataService'
import { DEFAULT_PERSONAL_PREFERENCES, normalizePersonalPreferences } from '@/lib/personalization'
import VoicePrivacyControl from '@/components/VoicePrivacyControl'

export default function Profile() {
  const { memories, lastSessionExperience, largeText, setLargeText, speechEnabled, setSpeechEnabled, supportedPerson, preferences, setPreferences, toggleAssistant } = useApp()
  const [personName, setPersonName] = useState(supportedPerson.name)
  const [personalDetails, setPersonalDetails] = useState(supportedPerson.personalDetails.join('\n'))
  const [personNotice, setPersonNotice] = useState('')
  const [detailsNotice, setDetailsNotice] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const gardenState = gardenStateFor(lastSessionExperience, memories.length)
  const safePreferences = useMemo(() => normalizePersonalPreferences(preferences ?? DEFAULT_PERSONAL_PREFERENCES), [preferences])
  const lastSavedPreferences = useRef<string | null>(null)

  useEffect(() => {
    const fingerprint = JSON.stringify(safePreferences)
    if (lastSavedPreferences.current === fingerprint) return
    const timer = window.setTimeout(() => {
      lastSavedPreferences.current = fingerprint
      void savePreferences(safePreferences).catch(() => undefined)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [safePreferences])

  useEffect(() => {
    setPersonName(supportedPerson.name)
  }, [supportedPerson.name])

  useEffect(() => {
    setPersonalDetails(supportedPerson.personalDetails.join('\n'))
  }, [supportedPerson.personalDetails])

  function detailLines(value: string) {
    return [...new Set(value.split(/\n|,/).map((item) => item.trim()).filter(Boolean))]
  }

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = personName.trim()
    if (!name) {
      setPersonNotice('Please enter a name.')
      return
    }
    try {
      const result = await savePersonDetails({ name, personalDetails: detailLines(personalDetails) })
      setPersonName(result.value.name)
      setPersonNotice(result.persistence === 'device' ? 'Name and details saved on this device; they will sync when connected.' : 'Name and details saved.')
    } catch {
      setPersonNotice('Name and details could not be saved. Please try again.')
    }
  }

  async function saveDetails() {
    setDetailsNotice('')
    try {
      const result = await savePersonDetails({ name: supportedPerson.name, personalDetails: detailLines(personalDetails) })
      setPersonalDetails(result.value.personalDetails.join('\n'))
      setDetailsNotice(result.persistence === 'device'
        ? 'Details saved on this device; they will sync when connected.'
        : 'Details saved.')
    } catch {
      setDetailsNotice('Details could not be saved. Please try again.')
    }
  }

  async function signOut() {
    setSigningOut(true)
    setSignOutError('')
    try {
      await logout()
      window.location.reload()
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'Unable to sign out. Please try again.')
      setSigningOut(false)
    }
  }

  return (
    <>
      <header className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl">My Journey</h1>
        <button type="button" onClick={() => void signOut()} disabled={signingOut} className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-mint-200 bg-white px-3 font-semibold text-ink disabled:opacity-60">
          <LogOut size={18} aria-hidden />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </header>
      {signOutError && <p role="alert" className="mb-4 rounded-xl bg-rose-soft px-3 py-2 text-sm text-rose-deep">{signOutError}</p>}

      <section className="mt-6 card p-4" aria-labelledby="profile-person-heading">
        <h2 id="profile-person-heading" className="text-xl">Person using Anchor</h2>
        <p className="mt-1 text-ink/75">Keep their details separate from the memories and activities they enjoy.</p>

        <form onSubmit={(event) => void saveName(event)} className="mt-4">
          <label className="block" htmlFor="profile-person-name">
            <span className="font-semibold">Name</span>
            <input
              id="profile-person-name"
              value={personName}
              onChange={(event) => { setPersonName(event.target.value); setPersonNotice('') }}
              required
              className="mt-1 min-h-[56px] w-full rounded-xl border-2 border-mint-200 bg-white px-4"
            />
          </label>
          <button type="submit" className="mt-3 min-h-[48px] rounded-xl bg-garden-700 px-4 font-semibold text-white">Save name</button>
          {personNotice && <p role="status" className="mt-2 text-sm text-garden-900">{personNotice}</p>}
        </form>

        <div className="mt-4">
          <label className="block">
            <span className="font-semibold">Helpful personal details</span>
            <textarea aria-label="Helpful personal details" value={personalDetails} onChange={(event) => { setPersonalDetails(event.target.value); setDetailsNotice('') }} rows={4} className="mt-1 w-full rounded-xl border-2 border-mint-200 bg-white p-3" />
          </label>
          <button type="button" onClick={() => void saveDetails()} className="mt-3 min-h-[48px] rounded-xl border-2 border-garden-700 bg-white px-4 font-semibold text-garden-900">Save details</button>
          {detailsNotice && <p role="status" className="mt-2 text-sm text-garden-900">{detailsNotice}</p>}
        </div>
      </section>

      <section className="mt-6 card p-4" aria-labelledby="profile-checkin-heading">
        <h2 id="profile-checkin-heading" className="text-xl">Check-in & progress</h2>
        <p className="mt-1 text-ink/75">Self-checks, recent scores, and how the day is going.</p>

        <div className="mt-4 space-y-3">
          <Link to="/profile/assessment" className="block rounded-xl border-2 border-garden-500 bg-mint-100 px-4 py-3 font-semibold text-garden-900 text-center">Take a quick MoCA-style self check</Link>
          <Link to="/profile/assessment" className="block rounded-xl border-2 border-mint-200 bg-white px-4 py-3 font-semibold text-garden-900 text-center">View previous scores</Link>
          <div className="rounded-xl border-2 border-sun-main bg-sun-soft px-4 py-3 text-sun-deep">
            <span className="block text-sm font-semibold uppercase tracking-wide">Daily performance</span>
            <span className="mt-1 block text-base font-semibold">{gardenState.experience === 'calming' ? 'Steady and calm today.' : gardenState.experience === 'flourishing' ? 'Doing well and feeling supported today.' : 'Recent routines are still being gathered.'}</span>
          </div>
        </div>
      </section>

      <section className="mt-6 card p-4" aria-labelledby="profile-memory-overview-heading">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="profile-memory-overview-heading" className="text-xl">Personal Memories</h2>
            <p className="mt-1 text-ink/75">{memories.length ? 'Familiar details shared with Anchor.' : 'Your personal memories will appear on the memories page.'}</p>
          </div>
          <Link to="/garden" className="text-sm font-semibold text-garden-700 underline-offset-2 hover:underline">Recent Memory Aquarium</Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link to="/memories" className="inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-garden-500 bg-garden-50 px-4 font-semibold text-garden-900">View all memories</Link>
          <button type="button" aria-label="A Helping Hand. Open Mo assistant" onClick={() => toggleAssistant(true)} className="inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-mint-200 bg-white px-4 font-semibold text-garden-900"><span>A Helping Hand</span></button>
        </div>
      </section>

      <h2 className="text-xl mt-8 mb-3">Comfort settings</h2>
      <div className="card p-4 space-y-4">
        <Toggle label="Larger text" on={largeText} set={setLargeText} />
        <Toggle label="Mo speaks replies aloud" on={speechEnabled} set={setSpeechEnabled} />
      </div>
      <div className="mt-4 card p-4">
        <h2 className="mb-2 text-lg font-semibold">Voice and privacy</h2>
        <VoicePrivacyControl />
      </div>

      <section className="mt-8 card p-4" aria-labelledby="personalization-heading">
        <h2 id="personalization-heading" className="text-xl">Personalization</h2>
        <div className="mt-3 space-y-4">
          <label className="block">
            <span className="font-semibold">Theme</span>
            <select aria-label="Theme" value={safePreferences.theme} onChange={(event) => setPreferences({ theme: event.target.value as typeof safePreferences.theme })} className="mt-1 w-full min-h-[52px] rounded-xl border-2 border-mint-200 bg-white px-4">
              <option value="high-contrast">High contrast</option>
              <option value="calming-pastels">Calming pastels</option>
              <option value="warm-vintage">Warm vintage</option>
              <option value="dark">Dark</option>
            </select>
          </label>

          <div>
            <span className="font-semibold">Favorite colours</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {['Blue', 'Green', 'Yellow', 'Pink', 'Purple', 'Orange', 'Red', 'White'].map((color) => {
                const active = safePreferences.favoriteColors.includes(color)
                return (
                  <button key={color} type="button" aria-pressed={active} onClick={() => setPreferences({ favoriteColors: active ? safePreferences.favoriteColors.filter((entry) => entry !== color) : [...safePreferences.favoriteColors, color].slice(0, 8) })} className={`min-h-[42px] rounded-full border-2 px-3 font-semibold ${active ? 'border-garden-700 bg-mint-100 text-garden-900' : 'border-mint-200 bg-white text-ink'}`}>
                    {color}
                  </button>
                )
              })}
            </div>
          </div>
          <InterestField label="Favourite flower" value={safePreferences.favoriteFlower ?? ''} onChange={(value) => setPreferences({ favoriteFlower: value || null })} />
          <InterestField label="Favourite bird" value={safePreferences.favoriteBird ?? ''} onChange={(value) => setPreferences({ favoriteBird: value || null })} />
          <InterestField label="Favourite animal" value={safePreferences.favoriteAnimal ?? ''} onChange={(value) => setPreferences({ favoriteAnimal: value })} />
          <InterestField label="Favourite song" value={safePreferences.favoriteSong ?? ''} onChange={(value) => setPreferences({ favoriteSong: value || null })} />
          <InterestListField label="Interests and activities" help="Add any interests, separated by commas. These help choose familiar game objects." value={safePreferences.lifeActivityTags} onChange={(value) => setPreferences({ lifeActivityTags: value })} />
          <InterestListField label="Favourite activities" value={safePreferences.favoriteActivities ?? []} onChange={(value) => setPreferences({ favoriteActivities: value })} />
          <InterestListField label="Favourite foods" value={safePreferences.favoriteFoods ?? []} onChange={(value) => setPreferences({ favoriteFoods: value })} />
          <InterestListField label="Favourite places" value={safePreferences.favoritePlaces ?? []} onChange={(value) => setPreferences({ favoritePlaces: value })} />
        </div>
      </section>
    </>
  )
}

function InterestField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = `preference-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <label htmlFor={id} className="block">
      <span className="font-semibold">{label}</span>
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-[52px] w-full rounded-xl border-2 border-mint-200 bg-white px-4" />
    </label>
  )
}

function InterestListField({ label, help, value, onChange }: { label: string; help?: string; value: string[]; onChange: (value: string[]) => void }) {
  const id = `preference-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <label htmlFor={id} className="block">
      <span className="font-semibold">{label}</span>
      {help && <span className="mt-1 block text-sm text-ink/70">{help}</span>}
      <textarea id={id} value={value.join(', ')} onChange={(event) => onChange([...new Set(event.target.value.split(',').map((item) => item.trim()).filter(Boolean))].slice(0, 12))} rows={2} className="mt-1 w-full rounded-xl border-2 border-mint-200 bg-white p-3" />
    </label>
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
