/** Connects voice-awareness signals and gameplay events to supportive prompts. */
import { useEffect, useRef } from 'react'
import { useApp } from '@/store/useApp'
import type { InteractionEvent, Part2InteractionEvent } from '@/lib/types'
import { awarenessCooldownElapsed, detectAwareness } from './distressDetector'
import { speechRecognitionSupported } from './speech'
import { startVoiceAwareness, stopVoiceAwareness, type LocalAudioSignals } from './voiceAwareness'

const RECENT_SIGNAL_MS = 8_000
const QUIET_SIGNALS: LocalAudioSignals = { amplitude: 0, speechActivity: false, volumeSpike: false, frequencyVariation: 0 }
type ScopedGameplayEvent =
  | Extract<Part2InteractionEvent, { type: 'response_submitted' }>
  | Extract<Part2InteractionEvent, { type: 'rapid_taps' }>

function isScopedGameplayEvent(event: InteractionEvent): event is ScopedGameplayEvent {
  return (event.type === 'response_submitted' || event.type === 'rapid_taps') &&
    'activityId' in event && 'sessionId' in event
}

export default function VoiceAwarenessController() {
  const privacyShieldEnabled = useApp((state) => state.privacyShieldEnabled)
  const voiceListeningEnabled = useApp((state) => state.voiceListeningEnabled)
  const assistantOpen = useApp((state) => state.assistantOpen)
  const lastPromptAt = useRef(0)
  const lastGameplayPromptAt = useRef(0)

  useEffect(() => {
    return useApp.subscribe((state, previous) => {
      const event = state.events[state.events.length - 1]
      if (!event || event === previous.events[previous.events.length - 1]) return
      if (event.type === 'activity_started') {
        state.setGameplaySupportActivity(null)
        return
      }
      if (!isScopedGameplayEvent(event)) return

      const relatedEvents = state.events.filter((candidate) =>
        isScopedGameplayEvent(candidate) &&
        candidate.activityId === event.activityId && candidate.sessionId === event.sessionId,
      )
      const now = Date.now()
      const detection = detectAwareness({
        transcript: '',
        events: relatedEvents,
        now,
        speechActivity: false,
        volumeSpike: false,
        fastSpeaking: false,
        frequencyVariation: 0,
      })
      if (detection.state !== 'possible_frustration' ||
        !awarenessCooldownElapsed(lastGameplayPromptAt.current, now)) return

      lastGameplayPromptAt.current = now
      state.setGameplaySupportActivity(event.activityId)
    })
  }, [])

  useEffect(() => {
    const supported = speechRecognitionSupported()
    useApp.getState().setVoiceSupported(supported)
    if (privacyShieldEnabled || !voiceListeningEnabled || assistantOpen || !supported) {
      stopVoiceAwareness()
      useApp.getState().setVoiceListening(false)
      useApp.getState().setSpeechActivity(false)
      return
    }

    const transcriptHistory: string[] = []
    let currentSignals = QUIET_SIGNALS
    let recentSpeechAt = 0

    const evaluate = (transcript: string, speakingRate = 0) => {
      const now = Date.now()
      const acoustic = now - recentSpeechAt <= RECENT_SIGNAL_MS ? currentSignals : QUIET_SIGNALS
      const detection = detectAwareness({
        transcript,
        recentTranscripts: transcriptHistory,
        events: useApp.getState().events,
        now,
        speechActivity: acoustic.speechActivity,
        volumeSpike: acoustic.volumeSpike,
        fastSpeaking: speakingRate >= 180,
        frequencyVariation: acoustic.frequencyVariation,
      })
      if (detection.state === 'calm' || detection.confidence < 0.7 || !awarenessCooldownElapsed(lastPromptAt.current, now)) return
      if (useApp.getState().assistantOpen || useApp.getState().privacyShieldEnabled) return

      lastPromptAt.current = now
      const latestGameResponse = [...useApp.getState().events].reverse().find(isScopedGameplayEvent)
      if (latestGameResponse) useApp.getState().setGameplaySupportActivity(latestGameResponse.activityId)
    }

    let stop: () => void = () => {}
    const startTimer = window.setTimeout(() => {
      stop = startVoiceAwareness({
        isAllowed: () => {
          const state = useApp.getState()
          return !state.privacyShieldEnabled && state.voiceListeningEnabled && !state.assistantOpen
        },
        onListening: (listening) => useApp.getState().setVoiceListening(listening),
        onTranscript: (transcript, speakingRate) => {
          const state = useApp.getState()
          state.setLastTranscript(transcript)
          transcriptHistory.push(transcript)
          if (transcriptHistory.length > 4) transcriptHistory.shift()
          evaluate(transcript, speakingRate)
        },
        onSignals: (signals) => {
          currentSignals = signals
          if (signals.speechActivity) recentSpeechAt = Date.now()
          useApp.getState().setSpeechActivity(signals.speechActivity)
        },
        onError: (message) => useApp.getState().setVoiceError(message),
        onPermissionDenied: () => useApp.getState().setVoiceListeningEnabled(false),
      })
    }, 0)
    return () => {
      window.clearTimeout(startTimer)
      stop()
      stopVoiceAwareness()
    }
  }, [privacyShieldEnabled, voiceListeningEnabled, assistantOpen])

  return null
}