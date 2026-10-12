import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/store/useApp'
import { pondMoodFromEvents, pondEnergyFromMood, type PondEnergy } from '@/games/pondMood'
import { createPond, stepPond, type FishState } from '@/games/pondSim'

const FISH_COUNT = 5
const VIEW = 300 // svg viewBox is VIEW x VIEW; fish positions (0..1) are scaled into this

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

const ENERGY_COPY: Record<PondEnergy, string> = {
  agitated: 'The fish are darting about. A gentle break might help.',
  uneasy: 'The fish are moving quickly. There is no rush at all.',
  settled: 'The fish are swimming at ease.',
  content: 'The fish are gliding calmly.',
  joyful: 'The fish are gliding calmly, unhurried.',
}

/**
 * A living koi pond whose motion reflects how the last few answers went, the way real fish
 * dart when startled and glide when undisturbed. Driven by a small physics simulation
 * (src/games/pondSim.ts) so the motion has real inertia and curved paths rather than emoji
 * snapping between CSS keyframes. Purely decorative feedback: never shown as a score, and it
 * settles back to a calm glide on its own once a few right answers come in.
 */
export default function PondScene({ className = '' }: { className?: string }) {
  const events = useApp((s) => s.events)
  const mood = useMemo(() => pondMoodFromEvents(events), [events])
  const energy = pondEnergyFromMood(mood)
  const reduced = useMemo(prefersReducedMotion, [])

  const [fish, setFish] = useState<FishState[]>(() => createPond({ fishCount: FISH_COUNT, seed: 12 }))
  const moodRef = useRef(mood)
  moodRef.current = mood
  const frameRef = useRef<number>()
  const lastTsRef = useRef<number>()

  useEffect(() => {
    if (reduced) return // respect the person's OS-level motion preference; render a static pond instead
    function tick(ts: number) {
      const last = lastTsRef.current ?? ts
      const dt = Math.min(0.05, (ts - last) / 1000) // clamp so a dropped/backgrounded frame can't cause a jump
      lastTsRef.current = ts
      setFish((current) => stepPond(current, { dtSeconds: dt, mood: moodRef.current }))
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [reduced])

  return (
    <section
      className={`relative overflow-hidden rounded-card border-2 border-garden-700 ${className}`}
      role="img"
      aria-label={`A koi pond. ${ENERGY_COPY[energy]}`}
    >
      <div
        className="absolute inset-0 transition-colors duration-[2000ms]"
        style={{ background: energy === 'agitated' || energy === 'uneasy'
          ? 'linear-gradient(#BFE0EE 0%, #8FB9C9 100%)'
          : 'linear-gradient(#BFE6F3 0%, #6FA6B8 100%)' }}
        aria-hidden
      />
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="relative h-full w-full" aria-hidden preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="pond-glow" cx="50%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={VIEW} height={VIEW} fill="url(#pond-glow)" />
        {fish.map((f) => <Koi key={f.id} fish={f} energy={energy} />)}
        {/* lily pads: static, give the pond a sense of scale and depth */}
        <ellipse cx={VIEW * 0.18} cy={VIEW * 0.22} rx="16" ry="8" fill="#3F7A55" opacity="0.55" />
        <ellipse cx={VIEW * 0.82} cy={VIEW * 0.78} rx="20" ry="9" fill="#3F7A55" opacity="0.5" />
      </svg>
      <p className={`absolute bottom-2 left-3 right-3 text-center text-sm font-medium drop-shadow ${
        energy === 'agitated' || energy === 'uneasy' ? 'text-ink/80' : 'text-garden-900/70'}`}>
        {reduced ? 'The pond reflects how recent answers felt.' : ENERGY_COPY[energy]}
      </p>
    </section>
  )
}

function Koi({ fish, energy }: { fish: FishState; energy: PondEnergy }) {
  const cx = fish.x * VIEW
  const cy = fish.y * VIEW
  const angleDeg = (fish.heading * 180) / Math.PI
  const len = 22 * fish.sizeScale
  const bodyHue = 8 + fish.hue * 28 // warm koi orange/red range
  const finFlicker = energy === 'agitated' ? 0.35 : energy === 'uneasy' ? 0.55 : 1.1 // faster tail-flick when startled

  return (
    <g transform={`translate(${cx} ${cy}) rotate(${angleDeg})`}>
      <ellipse
        cx={-len * 0.32} cy={0} rx={len * 0.42} ry={len * 0.16}
        fill={`hsl(${bodyHue} 78% 56%)`}
        style={{ transformOrigin: `${-len * 0.7}px 0px`, animation: `koi-tail ${finFlicker}s ease-in-out infinite alternate` }}
      />
      <ellipse cx={0} cy={0} rx={len * 0.5} ry={len * 0.22} fill={`hsl(${bodyHue} 82% 62%)`} />
      <ellipse cx={len * 0.12} cy={-len * 0.05} rx={len * 0.16} ry={len * 0.09} fill="#fff" opacity="0.55" />
      <circle cx={len * 0.42} cy={0} r={len * 0.03} fill="#17313A" />
    </g>
  )
}
