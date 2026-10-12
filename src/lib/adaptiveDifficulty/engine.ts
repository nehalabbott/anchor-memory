import { DIFFICULTY_LEVELS } from './config'
import type {
  AdaptiveAcousticState, AdaptiveDifficultyState, AdaptiveResponse, AdaptiveTap,
  AdaptiveTransition, DifficultyChange, DifficultyLevel, DifficultyReason, RapidTapDetection,
} from './types'

const RESPONSE_WINDOW_MS = 120_000
const RAPID_TAP_WINDOW_MS = 600
const RAPID_EVIDENCE_WINDOW_MS = 90_000
const LATENCY_HIGH_MS = 10_000
const LATENCY_AVERAGE_LIMIT_MS = 8_000
const LEVEL_CHANGE_COOLDOWN_MS = 20_000
const RESPONSES_BETWEEN_CHANGES = 4
const MAX_RECENT_RESPONSES = 8

export function clampDifficultyLevel(level: number): DifficultyLevel {
  return Math.max(1, Math.min(5, Math.round(level))) as DifficultyLevel
}

export function createInitialAdaptiveState(level: DifficultyLevel = 3, now = Date.now()): AdaptiveDifficultyState {
  return {
    level: clampDifficultyLevel(level), recentResponses: [], recentTaps: [], recentRapidTaps: [],
    lastChangeAt: now, responsesSinceChange: RESPONSES_BETWEEN_CHANGES,
  }
}

export function detectRapidTapBurst(taps: AdaptiveTap[], now: number, recentFailedResponses: AdaptiveResponse[] = []): RapidTapDetection {
  const recentTaps = taps.filter((tap) => now >= tap.at && now - tap.at <= RAPID_TAP_WINDOW_MS)
  const nonInteractiveCount = recentTaps.filter((tap) => !tap.interactive).length
  const failedTargets = recentFailedResponses.filter((response) => !response.correct && now >= response.at && now - response.at <= RAPID_TAP_WINDOW_MS).length
  const burst = recentTaps.length >= 3
  return {
    burst,
    frustrationLike: burst && (nonInteractiveCount >= 2 || failedTargets >= 2),
    count: recentTaps.length,
    nonInteractiveCount,
  }
}

function withinWindow<T extends { at: number }>(items: T[], now: number, windowMs: number): T[] {
  return items.filter((item) => now >= item.at && now - item.at <= windowMs)
}

function changeLevel(state: AdaptiveDifficultyState, nextLevel: number, reason: DifficultyReason, at: number): AdaptiveTransition {
  const newLevel = clampDifficultyLevel(nextLevel)
  if (newLevel === state.level) return { state }
  const change: DifficultyChange = { previousLevel: state.level, newLevel, reason, at }
  return {
    state: { ...state, level: newLevel, lastChangeAt: at, responsesSinceChange: 0 },
    change,
  }
}

function cooldownReady(state: AdaptiveDifficultyState, now: number) {
  return state.responsesSinceChange >= RESPONSES_BETWEEN_CHANGES && now - state.lastChangeAt >= LEVEL_CHANGE_COOLDOWN_MS
}

function evaluate(state: AdaptiveDifficultyState, now: number, acousticState?: AdaptiveAcousticState): AdaptiveTransition {
  const responses = withinWindow(state.recentResponses, now, RESPONSE_WINDOW_MS)
  const recent = responses.slice(-5)
  const recentFour = responses.slice(-4)
  const recentThree = responses.slice(-3)
  const failures = recentFour.filter((response) => !response.correct).length
  const slowResponses = recentThree.filter((response) => response.latencyMs >= LATENCY_HIGH_MS)
  const meanRecentLatency = recentThree.length
    ? recentThree.reduce((total, response) => total + response.latencyMs, 0) / recentThree.length
    : 0
  const slowEvidence = slowResponses.length >= 2 && meanRecentLatency >= LATENCY_AVERAGE_LIMIT_MS
  const rapidCount = withinWindow(state.recentRapidTaps.map((at) => ({ at })), now, RAPID_EVIDENCE_WINDOW_MS).length
  const rapidEvidence = rapidCount >= 2 || (rapidCount >= 1 && failures >= 1)
  const acousticDistress = acousticState !== undefined && acousticState !== 'calm'
  const corroboratedAcoustic = acousticDistress && (failures >= 1 || slowEvidence || rapidCount >= 1)

  let decreaseReason: DifficultyReason | undefined
  if (failures >= 2) decreaseReason = 'sustained_errors'
  else if (slowEvidence) decreaseReason = 'slow_responses'
  else if (rapidEvidence) decreaseReason = 'repeated_rapid_taps'
  else if (corroboratedAcoustic) decreaseReason = 'multimodal_distress'

  if (decreaseReason && cooldownReady(state, now) && state.level > 1) {
    return changeLevel(state, state.level - 1, decreaseReason, now)
  }

  const noRecentRapidTaps = rapidCount === 0
  const calmAcoustic = acousticState === undefined || acousticState === 'calm'
  const successWindow = recent.slice(-3)
  const sustainedAccuracy = successWindow.length === 3 && successWindow.every((response) => response.correct)
  const reasonableLatency = successWindow.length === 3 &&
    successWindow.every((response) => response.latencyMs < LATENCY_HIGH_MS) &&
    successWindow.reduce((total, response) => total + response.latencyMs, 0) / successWindow.length <= LATENCY_AVERAGE_LIMIT_MS
  if (sustainedAccuracy && reasonableLatency && noRecentRapidTaps && calmAcoustic && cooldownReady(state, now) && state.level < 5) {
    return changeLevel(state, state.level + 1, 'sustained_accuracy', now)
  }

  return { state }
}

export function recordAdaptiveResponse(
  current: AdaptiveDifficultyState,
  response: Omit<AdaptiveResponse, 'at'> & { at?: number },
  acousticState?: AdaptiveAcousticState,
): AdaptiveTransition {
  const at = response.at ?? Date.now()
  const recentResponses = [...withinWindow(current.recentResponses, at, RESPONSE_WINDOW_MS), { ...response, at }]
    .slice(-MAX_RECENT_RESPONSES)
  const state = {
    ...current,
    recentResponses,
    recentTaps: withinWindow(current.recentTaps, at, RAPID_TAP_WINDOW_MS),
    recentRapidTaps: withinWindow(current.recentRapidTaps.map((tapAt) => ({ at: tapAt })), at, RAPID_EVIDENCE_WINDOW_MS).map((tap) => tap.at),
    responsesSinceChange: current.responsesSinceChange + 1,
  }
  return evaluate(state, at, acousticState)
}

export function recordAdaptiveTap(
  current: AdaptiveDifficultyState,
  tap: AdaptiveTap,
  acousticState?: AdaptiveAcousticState,
): AdaptiveTransition {
  const recentTaps = [...withinWindow(current.recentTaps, tap.at, RAPID_TAP_WINDOW_MS), tap]
  const state = { ...current, recentTaps }
  const failed = withinWindow(current.recentResponses, tap.at, RAPID_TAP_WINDOW_MS).filter((response) => !response.correct)
  const detection = detectRapidTapBurst(recentTaps, tap.at, failed)
  let recentRapidTaps = current.recentRapidTaps
  if (detection.frustrationLike && !current.recentRapidTaps.some((at) => tap.at - at <= RAPID_TAP_WINDOW_MS)) {
    recentRapidTaps = [...withinWindow(current.recentRapidTaps.map((at) => ({ at })), tap.at, RAPID_EVIDENCE_WINDOW_MS).map((entry) => entry.at), tap.at]
  }
  const transition = evaluate({ ...state, recentRapidTaps }, tap.at, acousticState)
  return { ...transition, rapidTap: detection }
}

export function requestAdaptiveSupport(current: AdaptiveDifficultyState, at = Date.now()): AdaptiveTransition {
  if (current.level === DIFFICULTY_LEVELS[0]) return { state: current }
  return changeLevel(current, current.level - 1, 'requested_support', at)
}

export function resetAdaptiveDifficulty(level: DifficultyLevel = 3, at = Date.now()): AdaptiveDifficultyState {
  return createInitialAdaptiveState(level, at)
}
