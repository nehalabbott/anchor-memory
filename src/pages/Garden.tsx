import PageHeader from '@/components/PageHeader'
import { gardenStateFor } from '@/games/gardenState'
import { useApp } from '@/store/useApp'

export default function Garden() {
  const { memories, lastSessionExperience } = useApp()
  const state = gardenStateFor(lastSessionExperience, memories.length)
  const blooms = state.flowers === 'abundant' ? ['🌷', '🌻', '🌸', '🌼', '🌺', '🌹', '🪻']
    : state.flowers === 'blooming' ? ['🌷', '🌻', '🌸', '🌼'] : ['🌱', '🌿', '🌱']
  return (
    <>
      <PageHeader title="Your Memory Garden" />
      <section className={`garden-scene garden-${state.experience} rounded-card border-2 border-garden-700`} role="img" aria-label={state.experience === 'calming' ? 'A peaceful garden with gentle rain and a flowing river' : state.experience === 'flourishing' ? 'A bright garden with blooming flowers and butterflies' : 'A quiet garden waiting to welcome you'}>
        <div className={`garden-sun garden-sun-${state.sunlight}`} aria-hidden>☀</div>
        {state.rain === 'gentle' && <div className="garden-rain" aria-hidden>{Array.from({ length: 7 }, (_, index) => <span key={index} />)}</div>}
        {state.butterflies === 'gentle' && <><span className="garden-butterfly garden-butterfly-one" aria-hidden>🦋</span><span className="garden-butterfly garden-butterfly-two" aria-hidden>🦋</span></>}
        <div className={`garden-river garden-river-${state.river}`} aria-hidden />
        <div className="garden-blooms" aria-hidden>{blooms.map((flower, index) => <span key={`${flower}-${index}`} className={`garden-flower garden-flower-${state.animation}`}>{flower}</span>)}</div>
        <div className="garden-grass" aria-hidden>🌿　🌱　🌾　🌿　🌱　🌿</div>
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
