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
  const blooms = state.flowers === 'abundant' ? ['🌷', '🌻', '🌸', '🌼', '🌺', '🌹', '🪻']
    : state.flowers === 'blooming' ? ['🌷', '🌻', '🌸', '🌼'] : ['🌱', '🌿', '🌱']

  const aquariumTone = mood === 'agitated' ? 'gentle ripples and soft movement' : mood === 'supportive' ? 'steady water and comforting motion' : 'calm water and easy drifting'
  const gardenLabel = state.experience === 'calming'
    ? 'A peaceful garden with gentle rain and a flowing river'
    : state.experience === 'flourishing'
      ? 'A bright garden with blooming flowers and butterflies'
      : 'A quiet garden waiting to welcome you'

  return (
    <>
      <PageHeader title="Your Memory Garden" />

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

      <PondScene className="h-48 mb-4" />

      <section className={`garden-scene garden-${state.experience} rounded-card border-2 border-garden-700`} role="img" aria-label={gardenLabel}>
        <div className={`garden-sun garden-sun-${state.sunlight}`} aria-hidden>☀</div>
        {state.rain === 'gentle' && <div className="garden-rain" aria-hidden>{Array.from({ length: 7 }, (_, index) => <span key={index} />)}</div>}
        {state.butterflies === 'gentle' && <><span className="garden-butterfly garden-butterfly-one" aria-hidden>🦋</span><span className="garden-butterfly garden-butterfly-two" aria-hidden>🦋</span></>}
        <div className={`garden-river garden-river-${state.river}`} aria-hidden />
        <div className="garden-blooms" aria-hidden>{blooms.map((flower, index) => <span key={`${flower}-${index}`} className={`garden-flower garden-flower-${state.animation}`}>{flower}</span>)}</div>
        <div className="garden-grass" aria-hidden>🌿　🌱　🌾　🌿　🌱　🌿</div>
        <div className="absolute inset-x-3 bottom-3 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-center text-xs font-medium text-garden-900 backdrop-blur-sm" aria-live="polite">
          {audio.audioReady ? `Garden mood: ${mood} · ${aquariumTone}` : `Garden mood: ${mood} · ${aquariumTone}`}
        </div>
      </section>

      <div className="mt-4 rounded-card border-2 border-garden-500 bg-mint-100 p-4" aria-live="polite">
        <h2 className="text-xl text-garden-900">{state.experience === 'calming' ? "Let's take a quiet moment in the garden." : state.experience === 'flourishing' ? 'The garden is blooming.' : 'A quiet place to rest and reflect.'}</h2>
        <p className="mt-2 text-ink/80">{state.experience === 'calming'
          ? 'Soft rain and the river are here. There is no rush; the garden will stay with you.'
          : state.experience === 'flourishing'
            ? 'A little sunshine and new blossoms fill the garden. You can stay here as long as you like.'
            : 'After an activity, you can tell Anchor how the moment felt. The garden responds with care, never judgment.'}</p>
      </div>
    </>
  )
}
