import { useRef, useState } from 'react'
import { useApp } from '@/store/useApp'
import {
  createInitialAdaptiveState, recordAdaptiveResponse, recordAdaptiveTap, requestAdaptiveSupport,
} from '@/lib/adaptiveDifficulty/engine'
import { difficultyConfigFor } from '@/lib/adaptiveDifficulty/config'
import type {
  AdaptiveAcousticState, AdaptiveDifficultyState, AdaptiveTap, DifficultyChange, DifficultyLevel,
} from '@/lib/adaptiveDifficulty/types'

interface UseAdaptiveDifficultyOptions {
  initialLevel?: DifficultyLevel
  onLevelChange?: (change: DifficultyChange) => void
}

function currentAcousticState(interactionState: ReturnType<typeof useApp.getState>['interactionState'], privateMode: boolean, listening: boolean): AdaptiveAcousticState | undefined {
  if (privateMode || !listening) return undefined
  if (interactionState === 'high_frustration') return 'high_frustration'
  if (interactionState === 'possible_frustration') return 'possible_frustration'
  if (interactionState === 'confusion' || interactionState === 'needs_help') return 'possible_confusion'
  return undefined
}

export function useAdaptiveDifficulty(options: UseAdaptiveDifficultyOptions = {}) {
  const privacyShieldEnabled = useApp((state) => state.privacyShieldEnabled)
  const voiceListening = useApp((state) => state.voiceListening)
  const interactionState = useApp((state) => state.interactionState)
  const onLevelChangeRef = useRef(options.onLevelChange)
  onLevelChangeRef.current = options.onLevelChange
  const stateRef = useRef<AdaptiveDifficultyState>(createInitialAdaptiveState(options.initialLevel ?? 3))
  const [state, setState] = useState(stateRef.current)
  const acousticState = currentAcousticState(interactionState, privacyShieldEnabled, voiceListening)

  function apply(next: AdaptiveDifficultyState, change?: DifficultyChange) {
    stateRef.current = next
    setState(next)
    if (change) onLevelChangeRef.current?.(change)
  }

  function recordResponse(correct: boolean, latencyMs: number, at = Date.now()) {
    const result = recordAdaptiveResponse(stateRef.current, { correct, latencyMs: Math.max(0, latencyMs), at }, acousticState)
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
    const result = recordAdaptiveTap(stateRef.current, { ...tap, at: tap.at ?? Date.now() }, acousticState)
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
