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

  const aquariumTone = mood === 'agitated' ? 'gentle ripples and soft movement' : mood === 'supportive' ? 'steady water and comforting motion' : 'calm water and easy drifting'
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
        {audio.audioReady ? `Garden mood: ${mood} · ${aquariumTone}` : `Garden mood: ${mood} · ${aquariumTone}`}
      </div>

      <div className="mt-4 rounded-card border-2 border-garden-500 bg-mint-100 p-4" aria-live="polite">
        <h2 className="text-xl text-garden-900">{state.experience === 'calming' ? 'Let the fish drift a little longer.' : state.experience === 'flourishing' ? 'The aquarium is full of gentle motion.' : 'A quiet place to rest and reflect.'}</h2>
        <p className="mt-2 text-ink/80">{state.experience === 'calming'
          ? 'The water is still and easy. There is no rush; the fish will keep swimming at their own pace.'
          : state.experience === 'flourishing'
            ? 'The fish are moving smoothly through the water, calm and comfortable. You can stay here as long as you like.'
            : 'After an activity, you can tell Anchor how the moment felt. The aquarium responds with care, never judgment.'}</p>
      </div>
    </>
  )
}
