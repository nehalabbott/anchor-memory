import { useRef, useState } from 'react'
import {
  createInitialAdaptiveState, recordAdaptiveResponse, recordAdaptiveTap, requestAdaptiveSupport,
} from '@/lib/adaptiveDifficulty/engine'
import { difficultyConfigFor } from '@/lib/adaptiveDifficulty/config'
import type {
  AdaptiveDifficultyState, AdaptiveTap, DifficultyChange, DifficultyLevel,
} from '@/lib/adaptiveDifficulty/types'

interface UseAdaptiveDifficultyOptions {
  initialLevel?: DifficultyLevel
  onLevelChange?: (change: DifficultyChange) => void
}

export function useAdaptiveDifficulty(options: UseAdaptiveDifficultyOptions = {}) {
  const onLevelChangeRef = useRef(options.onLevelChange)
  onLevelChangeRef.current = options.onLevelChange
  const stateRef = useRef<AdaptiveDifficultyState>(createInitialAdaptiveState(options.initialLevel ?? 3))
  const [state, setState] = useState(stateRef.current)

  function apply(next: AdaptiveDifficultyState, change?: DifficultyChange) {
    stateRef.current = next
    setState(next)
    if (change) onLevelChangeRef.current?.(change)
  }

  function recordResponse(correct: boolean, latencyMs: number, at = Date.now()) {
    const result = recordAdaptiveResponse(stateRef.current, { correct, latencyMs: Math.max(0, latencyMs), at })
    apply(result.state, result.change)
    return result.change
  }

  function recordSuccess(latencyMs: number, at = Date.now()) {
    return recordResponse(true, latencyMs, at)
  }

  function recordFailure(latencyMs: number, at = Date.now()) {
    return recordResponse(false, latencyMs, at)
  }

  function recordInteraction(tap: Omit<AdaptiveTap, 'at'> & { at?: number }) {
    const result = recordAdaptiveTap(stateRef.current, { ...tap, at: tap.at ?? Date.now() })
    apply(result.state, result.change)
    return result.rapidTap
  }

  function requestSupport(at = Date.now()) {
    const result = requestAdaptiveSupport(stateRef.current, at)
    apply(result.state, result.change)
    return result.change
  }

  function reset(level: DifficultyLevel = 3, at = Date.now()) {
    apply(createInitialAdaptiveState(level, at))
  }

  return {
    level: state.level,
    config: difficultyConfigFor(state.level),
    recordInteraction,
    recordSuccess,
    recordFailure,
    recordResponse,
    requestSupport,
    reset,
  }
}
