import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '@/components/PageHeader'
import { gardenStateFor } from '@/games/gardenState'
import { useApp } from '@/store/useApp'
import { savePersonDetails, savePreferences } from '@/lib/appDataService'
import { DEFAULT_PERSONAL_PREFERENCES, normalizePersonalPreferences } from '@/lib/personalization'

export default function Profile() {
  const { memories, lastSessionExperience, largeText, setLargeText, speechEnabled, setSpeechEnabled, supportedPerson, preferences, setPreferences } = useApp()
  const [personName, setPersonName] = useState(supportedPerson.name)
  const [personNotice, setPersonNotice] = useState('')
  const gardenState = gardenStateFor(lastSessionExperience, memories.length)
  const safePreferences = useMemo(() => normalizePersonalPreferences(preferences ?? DEFAULT_PERSONAL_PREFERENCES), [preferences])
  const lastSavedPreferences = useRef<string | null>(null)

  useEffect(() => {
    const fingerprint = JSON.stringify(safePreferences)
    if (lastSavedPreferences.current === fingerprint) return
    lastSavedPreferences.current = fingerprint
    void savePreferences(safePreferences).catch(() => undefined)
  }, [safePreferences])

  useEffect(() => {
    setPersonName(supportedPerson.name)
  }, [supportedPerson.name])

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = personName.trim()
    if (!name) {
      setPersonNotice('Please enter a name.')
      return
    }
    try {
      const result = await savePersonDetails({ name, personalDetails: supportedPerson.personalDetails })
      setPersonName(result.value.name)
      setPersonNotice(result.persistence === 'device' ? 'Name saved on this device; it will sync when connected.' : 'Name saved.')
    } catch {
      setPersonNotice('Name could not be saved. Please try again.')
    }
  }

  return (
    <>
      <PageHeader title="My Journey" />

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

        <label className="mt-4 block">
          <span className="font-semibold">Helpful personal details</span>
          <textarea value={supportedPerson.personalDetails.join('\n')} onChange={(event) => {
            const details = event.target.value.split(/\n|,/).map((item) => item.trim()).filter(Boolean)
            void savePersonDetails({ name: supportedPerson.name, personalDetails: details }).catch(() => undefined)
          }} rows={4} className="mt-1 w-full rounded-xl border-2 border-mint-200 bg-white p-3" />
        </label>
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

      <h2 className="text-xl mt-8 mb-3">Comfort settings</h2>
      <div className="card p-4 space-y-4">
        <Toggle label="Larger text" on={largeText} set={setLargeText} />
        <Toggle label="Mo speaks replies aloud" on={speechEnabled} set={setSpeechEnabled} />
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
        </div>
      </section>
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
