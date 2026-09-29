import type { GardenState, SessionExperience } from '@/lib/types'

/** Map an explicit personal check-in to a gentle visual state; never infer from answers. */
export function gardenStateFor(experience: SessionExperience | null, memoryCount: number): GardenState {
  if (experience?.kind === 'calming') {
    return {
      experience: 'calming', flowers: 'resting', butterflies: 'absent', sunlight: 'soft',
      rain: 'gentle', river: 'noticeable', animation: 'slow', updatedAt: experience.at,
    }
  }
  if (experience?.kind === 'flourishing') {
    return {
      experience: 'flourishing', flowers: memoryCount >= 4 ? 'abundant' : 'blooming', butterflies: 'gentle', sunlight: 'bright',
      rain: 'none', river: 'quiet', animation: 'lively', updatedAt: experience.at,
    }
  }
  return {
    experience: 'settling', flowers: 'resting', butterflies: 'absent', sunlight: 'soft',
    rain: 'none', river: 'quiet', animation: 'slow', updatedAt: Date.now(),
  }
}