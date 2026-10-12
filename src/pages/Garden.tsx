import { useMemo } from 'react'
import PageHeader from '@/components/PageHeader'
import PondScene from '@/components/PondScene'
import { gardenStateFor } from '@/games/gardenState'
import { deriveGardenMood } from '@/garden/gardenMood'
import { useGardenAudio } from '@/garden/useGardenAudio'
import { useApp } from '@/store/useApp'
import { useScreenContext } from '@/store/useScreenContext'

export default function Garden() {
  const { memories, lastSessionExperience, gardenAudioEnabled, setGardenAudioEnabled } = useApp()
  const screen = useScreenContext((state) => state)
  const mood = useMemo(() => deriveGardenMood(), [screen.activityState, screen.difficultyLevel, screen.lastFailedAction, screen.activeGame, screen.elapsedTimeMs])
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const audio = useGardenAudio({ mood, enabled: gardenAudioEnabled, reducedMotion })
  const state = gardenStateFor(lastSessionExperience, memories.length)

  const moodCopy = {
    calm: {
      tone: 'soft breeze and easy drifting',
      headline: 'The aquarium is full of gentle motion.',
      body: 'The fish are moving slowly and comfortably. The pace feels safe, quiet, and easy to settle into.'
    },
    supportive: {
      tone: 'steady hum and reassuring motion',
      headline: 'The aquarium feels steady and kind.',
      body: 'The fish are keeping a calm rhythm. You can stay here as long as you like.'
    },
    agitated: {
      tone: 'quick shimmer and bright motion',
      headline: 'The fish are darting about. A gentle pause might help.',
      body: 'The motion feels quick today. A slower moment may help the aquarium settle and feel more comfortable.'
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
          onClick={() => setGardenAudioEnabled(!gardenAudioEnabled)}
          className="min-h-[48px] rounded-full border-2 border-garden-600 bg-white px-4 font-semibold text-garden-900"
        >
          {gardenAudioEnabled ? 'Sounds on' : 'Sounds off'}
        </button>
      </div>

      <PondScene className="h-48 mb-4" label={gardenLabel} />

      <div className="mb-4 rounded-full border border-garden-500 bg-mint-100 px-4 py-2 text-center text-sm font-medium text-garden-900" aria-live="polite">
        {audio.audioReady ? `Aquarium mood: ${mood} · ${aquariumTone}` : `Aquarium mood: ${mood} · ${aquariumTone}`}
      </div>

      <div className="mt-4 rounded-card border-2 border-garden-500 bg-mint-100 p-4" aria-live="polite">
        <h2 className="text-xl text-garden-900">{moodCopy[mood].headline}</h2>
        <p className="mt-2 text-ink/80">{moodCopy[mood].body}</p>
      </div>
    </>
  )
}
