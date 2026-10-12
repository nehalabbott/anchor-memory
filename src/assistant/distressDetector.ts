import type { InteractionEvent } from '@/lib/types'

export type AwarenessState = 'calm' | 'possible_confusion' | 'possible_frustration' | 'possible_anxiety'

export interface AwarenessDetection {
  state: AwarenessState
  confidence: number
  reasons: string[]
}

export interface AwarenessSignals {
  transcript: string
  recentTranscripts?: string[]
  events: InteractionEvent[]
  now: number
  speechActivity: boolean
  volumeSpike: boolean
  fastSpeaking: boolean
  frequencyVariation: number
}

const WINDOW_MS = 90_000
const CALM: AwarenessDetection = { state: 'calm', confidence: 0, reasons: [] }
export const AWARENESS_COOLDOWN_MS = 90_000

export function awarenessCooldownElapsed(lastPromptAt: number, now: number) {
  return now - lastPromptAt >= AWARENESS_COOLDOWN_MS
}

export function detectAwareness(signals: AwarenessSignals): AwarenessDetection {
  const normalized = [signals.transcript, ...(signals.recentTranscripts ?? [])].join(' ').toLowerCase()
  const repeatedTranscript = (phrase: RegExp) =>
    [signals.transcript, ...(signals.recentTranscripts ?? [])].filter((text) => phrase.test(text.toLowerCase())).length
  const recentEvents = signals.events.filter((event) => signals.now - event.at <= WINDOW_MS && signals.now >= event.at)
  const failedResponses = recentEvents.filter((event) => event.type === 'response_submitted' && event.correct === false).length
  const rapidInteractions = recentEvents.some((event) => event.type === 'rapid_taps' && event.count >= 4)
  const frustrationWords = /\b(frustrated|too hard|give up|can't do this|cannot do this)\b/.test(normalized)
  const confusionWords = /\b(confused|don't understand|do not understand|what do i do|i forgot)\b/.test(normalized)
  const anxietyWords = /\b(anxious|worried|nervous|scared|afraid)\b/.test(normalized)
  const repeatedConfusion = repeatedTranscript(/\b(confused|don't understand|do not understand|what do i do|i forgot)\b/) >= 2
  const repeatedAnxiety = repeatedTranscript(/\b(anxious|worried|nervous|scared|afraid)\b/) >= 2
  const acousticChange = signals.speechActivity && (signals.volumeSpike || signals.fastSpeaking || signals.frequencyVariation >= 0.65)

  if (failedResponses >= 2 && (frustrationWords || rapidInteractions || (signals.volumeSpike && signals.fastSpeaking))) {
    const reasons = ['repeated unsuccessful responses']
    if (frustrationWords) reasons.push('frustration-related words')
    if (rapidInteractions) reasons.push('repeated rapid interactions')
    if (signals.volumeSpike && signals.fastSpeaking) reasons.push('combined volume and speaking-rate change')
    return { state: 'possible_frustration', confidence: 0.78, reasons }
  }

  if ((confusionWords && (failedResponses >= 1 || rapidInteractions || repeatedConfusion)) || (failedResponses >= 3 && rapidInteractions)) {
    const reasons = ['repeated confusion-related language or activity difficulty']
    if (failedResponses) reasons.push('unsuccessful responses')
    if (rapidInteractions) reasons.push('repeated rapid interactions')
    return { state: 'possible_confusion', confidence: 0.72, reasons }
  }

  if ((anxietyWords || repeatedAnxiety) && acousticChange) {
    const reasons = ['anxiety-related language', 'a concurrent local speech-signal change']
    return { state: 'possible_anxiety', confidence: 0.7, reasons }
  }

  return CALM
}