import type { PondMood } from './pondMood'

/**
 * A small, self-contained fish simulation — no DOM, no React, so it's easy to test and to
 * reason about. Each fish wanders toward a slowly-changing target point using a simple
 * steering behaviour (turn a little toward the target each tick, don't teleport), which
 * gives it a continuous, organic-looking path rather than snapping between waypoints.
 *
 * Mood changes the fish's PACE and JITTER, not its path logic:
 *   - Positive mood (recent right answers): fish glide, smooth and unhurried.
 *   - Negative mood (recent wrong answers): fish dart faster and turn more erratically,
 *     the way startled fish do — this is the "swim faster when wrong" behaviour requested.
 * Speed changes ease in over ~1.5s rather than snapping, so a single answer nudges the
 * pond's mood rather than visibly flicking a switch.
 */

export interface FishState {
  id: string
  x: number            // 0..1, normalized position within the pond
  y: number             // 0..1
  heading: number       // radians
  targetX: number
  targetY: number
  hue: number           // stable per-fish color variation
  sizeScale: number     // stable per-fish size variation
  retargetIn: number    // seconds until this fish picks a new wander target
}

export interface PondConfig {
  fishCount: number
  seed?: number
}

/** Deterministic PRNG so tests are reproducible and initial fish layout doesn't jump on remount. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createPond(config: PondConfig): FishState[] {
  const rand = mulberry32(config.seed ?? 42)
  return Array.from({ length: config.fishCount }, (_, i) => {
    const x = 0.15 + rand() * 0.7
    const y = 0.2 + rand() * 0.6
    return {
      id: `fish-${i}`,
      x, y,
      heading: rand() * Math.PI * 2,
      targetX: 0.15 + rand() * 0.7,
      targetY: 0.2 + rand() * 0.6,
      hue: rand(),
      sizeScale: 0.82 + rand() * 0.36,
      retargetIn: 1 + rand() * 3,
    }
  })
}

/** Base cruising speed (pond-widths per second) at neutral mood; mood scales this multiplicatively. */
const BASE_SPEED = 0.055
const MIN_SPEED_MULT = 0.55  // calm/joyful: unhurried glide
const MAX_SPEED_MULT = 2.35  // agitated: darting
const BASE_TURN_RATE = 2.4   // radians/sec the fish can steer toward its target
const AGITATED_TURN_JITTER = 3.2 // extra random heading noise/sec at very negative mood

/** Smoothly maps mood (-1..1) to a speed multiplier: fast when startled, slow and easy when content. */
export function speedMultiplierFromMood(mood: PondMood): number {
  // mood -1 -> MAX_SPEED_MULT (agitated/fast), mood +1 -> MIN_SPEED_MULT (calm/slow)
  const t = (1 - mood) / 2 // 0 (mood=1) .. 1 (mood=-1)
  return MIN_SPEED_MULT + t * (MAX_SPEED_MULT - MIN_SPEED_MULT)
}

export interface StepOptions {
  dtSeconds: number
  mood: PondMood
  rand?: () => number
  margin?: number // keep fish this far from pond edges (0..0.5)
}

/** Advances the whole pond by one animation-frame tick. Pure function: same inputs, same output. */
export function stepPond(fish: FishState[], opts: StepOptions): FishState[] {
  const { dtSeconds, mood } = opts
  const rand = opts.rand ?? Math.random
  const margin = opts.margin ?? 0.08
  const speedMult = speedMultiplierFromMood(mood)
  const agitation = Math.max(0, -mood) // 0 when calm/neutral, up to 1 when very negative

  return fish.map((f) => {
    let { x, y, heading, targetX, targetY, retargetIn } = f

    retargetIn -= dtSeconds
    if (retargetIn <= 0 || (Math.abs(x - targetX) < 0.03 && Math.abs(y - targetY) < 0.03)) {
      targetX = margin + rand() * (1 - margin * 2)
      targetY = margin + rand() * (1 - margin * 2)
      // agitated fish change their mind sooner (shorter, more frantic bursts)
      retargetIn = (1 + rand() * 3) / (1 + agitation)
    }

    const desiredHeading = Math.atan2(targetY - y, targetX - x)
    let diff = desiredHeading - heading
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    const turnRate = BASE_TURN_RATE * (1 + agitation * 0.6)
    const maxTurn = turnRate * dtSeconds
    heading += Math.max(-maxTurn, Math.min(maxTurn, diff))
    // startled fish wobble: extra random heading noise proportional to agitation
    if (agitation > 0) heading += (rand() - 0.5) * AGITATED_TURN_JITTER * agitation * dtSeconds

    const speed = BASE_SPEED * speedMult
    x += Math.cos(heading) * speed * dtSeconds
    y += Math.sin(heading) * speed * dtSeconds
    x = Math.max(margin * 0.4, Math.min(1 - margin * 0.4, x))
    y = Math.max(margin * 0.4, Math.min(1 - margin * 0.4, y))

    return { ...f, x, y, heading, targetX, targetY, retargetIn }
  })
}
