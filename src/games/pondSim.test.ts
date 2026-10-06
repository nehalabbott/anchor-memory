import { describe, it, expect } from 'vitest'
import { createPond, stepPond, speedMultiplierFromMood } from './pondSim'

function mulberryLike(seed: number) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('createPond', () => {
  it('creates the requested number of fish, all inside the pond bounds', () => {
    const pond = createPond({ fishCount: 5, seed: 1 })
    expect(pond).toHaveLength(5)
    for (const f of pond) {
      expect(f.x).toBeGreaterThanOrEqual(0); expect(f.x).toBeLessThanOrEqual(1)
      expect(f.y).toBeGreaterThanOrEqual(0); expect(f.y).toBeLessThanOrEqual(1)
    }
  })
  it('is deterministic for a given seed (stable layout across remounts)', () => {
    const a = createPond({ fishCount: 4, seed: 7 })
    const b = createPond({ fishCount: 4, seed: 7 })
    expect(a).toEqual(b)
  })
  it('gives each fish a distinct id', () => {
    const pond = createPond({ fishCount: 6, seed: 2 })
    expect(new Set(pond.map((f) => f.id)).size).toBe(6)
  })
})

describe('speedMultiplierFromMood', () => {
  it('is faster when mood is negative (wrong answers) than when neutral', () => {
    expect(speedMultiplierFromMood(-1)).toBeGreaterThan(speedMultiplierFromMood(0))
  })
  it('is slower when mood is positive (right answers) than when neutral', () => {
    expect(speedMultiplierFromMood(1)).toBeLessThan(speedMultiplierFromMood(0))
  })
  it('is monotonic across the mood range (no jumps or reversals)', () => {
    const samples = [-1, -0.6, -0.2, 0, 0.3, 0.7, 1].map(speedMultiplierFromMood)
    for (let i = 1; i < samples.length; i++) expect(samples[i]).toBeLessThanOrEqual(samples[i - 1])
  })
})

describe('stepPond', () => {
  it('moves fish smoothly: position changes by a bounded amount per tick, never teleports', () => {
    const pond = createPond({ fishCount: 3, seed: 3 })
    const next = stepPond(pond, { dtSeconds: 1 / 60, mood: 0, rand: mulberryLike(9) })
    pond.forEach((f, i) => {
      const dx = next[i].x - f.x
      const dy = next[i].y - f.y
      const dist = Math.hypot(dx, dy)
      expect(dist).toBeLessThan(0.02) // one 60fps frame shouldn't jump far
    })
  })
  it('covers noticeably more distance per second when mood is negative than when positive', () => {
    const pond = createPond({ fishCount: 4, seed: 4 })
    let calm = pond
    let agitated = pond
    const seconds = 2
    const steps = 120
    const dt = seconds / steps
    let calmDist = 0, agitatedDist = 0
    for (let i = 0; i < steps; i++) {
      const nextCalm = stepPond(calm, { dtSeconds: dt, mood: 0.9, rand: mulberryLike(100 + i) })
      const nextAgitated = stepPond(agitated, { dtSeconds: dt, mood: -0.9, rand: mulberryLike(200 + i) })
      calmDist += Math.hypot(nextCalm[0].x - calm[0].x, nextCalm[0].y - calm[0].y)
      agitatedDist += Math.hypot(nextAgitated[0].x - agitated[0].x, nextAgitated[0].y - agitated[0].y)
      calm = nextCalm; agitated = nextAgitated
    }
    expect(agitatedDist).toBeGreaterThan(calmDist * 1.5)
  })
  it('keeps fish within pond bounds indefinitely (no drifting off-screen)', () => {
    let pond = createPond({ fishCount: 5, seed: 5 })
    for (let i = 0; i < 600; i++) pond = stepPond(pond, { dtSeconds: 1 / 30, mood: -1, rand: mulberryLike(i) })
    for (const f of pond) {
      expect(f.x).toBeGreaterThanOrEqual(0); expect(f.x).toBeLessThanOrEqual(1)
      expect(f.y).toBeGreaterThanOrEqual(0); expect(f.y).toBeLessThanOrEqual(1)
    }
  })
  it('produces a different, non-degenerate path across many steps (fish actually wander, not stand still)', () => {
    let pond = createPond({ fishCount: 1, seed: 6 })
    const start = { x: pond[0].x, y: pond[0].y }
    for (let i = 0; i < 300; i++) pond = stepPond(pond, { dtSeconds: 1 / 30, mood: 0, rand: mulberryLike(i) })
    const moved = Math.hypot(pond[0].x - start.x, pond[0].y - start.y)
    expect(moved).toBeGreaterThan(0.05)
  })
  it('heading turns gradually toward the target rather than snapping instantly', () => {
    const fish = [{ id: 'f', x: 0.5, y: 0.5, heading: 0, targetX: 0.9, targetY: 0.9, hue: 0, sizeScale: 1, retargetIn: 5 }]
    const next = stepPond(fish, { dtSeconds: 1 / 60, mood: 0, rand: mulberryLike(1) })
    // desired heading toward (0.9,0.9) from (0.5,0.5) is ~45deg (PI/4); one 1/60s frame shouldn't reach it
    expect(Math.abs(next[0].heading)).toBeLessThan(Math.PI / 4)
    expect(Math.abs(next[0].heading)).toBeGreaterThan(0)
  })
  it('is a pure function: same input state and options produce the same output', () => {
    const pond = createPond({ fishCount: 3, seed: 8 })
    const a = stepPond(pond, { dtSeconds: 0.1, mood: -0.4, rand: mulberryLike(50) })
    const b = stepPond(pond, { dtSeconds: 0.1, mood: -0.4, rand: mulberryLike(50) })
    expect(a).toEqual(b)
  })
})
