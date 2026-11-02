/** Shows the Memory Aquarium and a rotating story from saved memories. */
import { useEffect, useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import PondScene from '@/components/PondScene'
import { demoMemoriesFor } from '@/demo/demoData'
import { gardenStateFor } from '@/games/gardenState'
import { deriveGardenMood } from '@/garden/gardenMood'
import { useGardenAudio } from '@/garden/useGardenAudio'
import { useApp } from '@/store/useApp'
import { useScreenContext } from '@/store/useScreenContext'

export default function Garden() {
  const { memories, supportedPerson, lastSessionExperience, gardenAudioEnabled, setGardenAudioEnabled } = useApp()
  const screen = useScreenContext((state) => state)
  const mood = useMemo(() => deriveGardenMood(), [screen.activityState, screen.difficultyLevel, screen.lastFailedAction, screen.activeGame, screen.elapsedTimeMs])
  const audio = useGardenAudio({ mood, enabled: gardenAudioEnabled })
  const state = gardenStateFor(lastSessionExperience, memories.length)

  useEffect(() => () => setGardenAudioEnabled(false), [setGardenAudioEnabled])

  const storyCards = useMemo(() => {
    const source = memories.length > 0 ? memories : demoMemoriesFor(supportedPerson.name)
    return source
      .filter((memory) => Boolean(memory.story))
      .map((memory) => ({
        id: memory.id,
        name: memory.name,
        relationship: memory.relationship ? `${memory.name} · ${memory.relationship}` : memory.kind,
        place: memory.places?.[0] ?? 'home',
        story: memory.story,
      }))
  }, [memories, supportedPerson.name])

  const [storyIndex, setStoryIndex] = useState(0)

  useEffect(() => {
    if (storyCards.length <= 1) return
    const timer = window.setInterval(() => {
      setStoryIndex((current) => (current + 1) % storyCards.length)
    }, 8000)
    return () => window.clearInterval(timer)
  }, [storyCards.length])

  const activeStory = storyCards[storyIndex] ?? {
    id: 'default-story',
    name: supportedPerson.name,
    relationship: 'memory · family',
    place: 'Bengaluru',
    story: `${supportedPerson.name} and the family meet every evening for tea, and the children gather in the courtyard to tell stories about school, work, and temple mornings.`,
  }

  const moodCopy = {
    calm: {
      tone: 'soft breeze and easy drifting',
    },
    supportive: {
      tone: 'steady hum and reassuring motion',
    },
    agitated: {
      tone: 'quick shimmer and bright motion',
    }
  } as const

  const aquariumTone = moodCopy[mood].tone
  const gardenLabel = state.experience === 'calming'
    ? 'A peaceful aquarium with fish moving calmly through the water'
    : state.experience === 'flourishing'
      ? 'A bright aquarium with fish gliding steadily and comfortably'
      : 'A quiet memory aquarium with fishes drifting gently in the water'

  return (
    <>
      <PageHeader title="Memory Aquarium" />

      <div className="mb-3 flex justify-end">
        <button
          type="button"
          aria-label={gardenAudioEnabled ? 'Garden sounds on' : 'Garden sounds off'}
          aria-pressed={gardenAudioEnabled}
          onClick={() => {
            if (gardenAudioEnabled) {
              audio.stop()
              setGardenAudioEnabled(false)
            } else {
              void audio.start().then((started) => setGardenAudioEnabled(started))
            }
          }}
          className="min-h-[48px] rounded-full border-2 border-garden-600 bg-white px-4 font-semibold text-garden-900"
        >
          {gardenAudioEnabled ? 'Sounds on' : 'Sounds off'}
        </button>
      </div>
      <label className="mb-3 block rounded-xl border border-mint-200 bg-white px-4 py-3">
        <span className="flex items-center justify-between font-semibold">
          <span>Water sound volume</span><span>{Math.round(audio.volume * 100)}%</span>
        </span>
        <input aria-label="Water sound volume" type="range" min="0" max="1" step="0.05" value={audio.volume} onChange={(event) => audio.setVolume(Number(event.target.value))} className="mt-2 min-h-[44px] w-full accent-garden-700" />
      </label>

      <PondScene className="h-48 mb-4" label={gardenLabel} />

      <div className="mb-4 rounded-full border border-garden-500 bg-mint-100 px-4 py-2 text-center text-sm font-medium text-garden-900" aria-live="polite">
        {audio.audioError ? audio.audioError : audio.audioReady ? `Water ambience is playing · Aquarium mood: ${mood}` : `Aquarium mood: ${mood} · ${aquariumTone}`}
      </div>

      <section className="mt-4 rounded-card border-2 border-garden-500 bg-mint-100 p-4" aria-live="polite">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl text-garden-900">Story to revisit</h2>
          {storyCards.length > 1 && (
            <button
              type="button"
              onClick={() => setStoryIndex((current) => (current + 1) % storyCards.length)}
              className="min-h-[44px] rounded-full border border-garden-600 bg-white px-3 text-sm font-semibold text-garden-900"
              aria-label="Show another memory story"
            >
              Next story
            </button>
          )}
        </div>

        <div className="mt-3 rounded-2xl border border-garden-300 bg-white/70 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-garden-700">Memory card</p>
          <h3 className="mt-2 text-lg font-semibold text-garden-900">{activeStory.name}</h3>
          <p className="mt-1 text-sm text-garden-700">{activeStory.relationship}</p>
          <p className="mt-2 text-sm text-garden-800">A quiet, blooming memory can feel like a gentle place to rest.</p>
          <p className="mt-3 text-base text-ink/80">{activeStory.story}</p>
          <div className="mt-3 flex items-center justify-between text-xs font-medium text-garden-800">
            <span>{activeStory.place}</span>
            <span>{storyCards.length > 1 ? `${storyIndex + 1}/${storyCards.length}` : '1/1'}</span>
          </div>
        </div>
      </section>

    </>
  )
}
