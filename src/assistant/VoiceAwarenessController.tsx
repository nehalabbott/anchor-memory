import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '@/store/useApp'
import { brain } from './brain'
import { awarenessCooldownElapsed, detectAwareness } from './distressDetector'
import { speechRecognitionSupported } from './speech'
import { startVoiceAwareness, stopVoiceAwareness, type LocalAudioSignals } from './voiceAwareness'
import { screenLabel } from '@/lib/routes'

const RECENT_SIGNAL_MS = 8_000
const QUIET_SIGNALS: LocalAudioSignals = { amplitude: 0, speechActivity: false, volumeSpike: false, frequencyVariation: 0 }

export default function VoiceAwarenessController() {
  const location = useLocation()
  const privacyShieldEnabled = useApp((state) => state.privacyShieldEnabled)
  const voiceListeningEnabled = useApp((state) => state.voiceListeningEnabled)
  const assistantOpen = useApp((state) => state.assistantOpen)
  const lastPromptAt = useRef(0)
  const routeRef = useRef(location.pathname)
  routeRef.current = location.pathname

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
      const state = useApp.getState()
      const situation = `The user may benefit from a gentle check-in. Local interaction signals suggest ${detection.state.replace(/_/g, ' ')} (${detection.reasons.join('; ')}). Offer one short, reassuring sentence or an optional pause. Do not mention monitoring, detection, emotions as facts, or diagnosis.`
      void brain.reply(situation, {
        route: routeRef.current,
        screenLabel: screenLabel(routeRef.current),
        userName: state.userName,
        state: state.interactionState,
        personalDetails: state.supportedPerson.personalDetails,
      }, state.memories, state.chat.map(({ role, text }) => ({ role, text }))).then((reply) => {
        const current = useApp.getState()
        if (current.privacyShieldEnabled || current.assistantOpen) return
        useApp.getState().openAssistantWithMessage(reply)
      }).catch(() => {
        const current = useApp.getState()
        if (!current.privacyShieldEnabled && !current.assistantOpen) {
          useApp.getState().openAssistantWithMessage('It is okay. We can take this slowly, or pause for a moment.')
        }
      })
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