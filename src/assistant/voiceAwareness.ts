import { listen, speechRecognitionSupported, type Listener } from './speech'

export interface LocalAudioSignals {
  amplitude: number
  speechActivity: boolean
  volumeSpike: boolean
  frequencyVariation: number
}

interface VoiceAwarenessOptions {
  isAllowed: () => boolean
  onListening: (listening: boolean) => void
  onTranscript: (transcript: string, speakingRate: number) => void
  onSignals: (signals: LocalAudioSignals) => void
  onError: (message: string) => void
  onPermissionDenied: () => void
}

let activeCleanup: (() => void) | null = null

export function stopVoiceAwareness() {
  activeCleanup?.()
}

/** Owns one ambient recognizer and optional local-only analyser for the whole app shell. */
export function startVoiceAwareness(options: VoiceAwarenessOptions): () => void {
  stopVoiceAwareness()
  let disposed = false
  let recognition: Listener | null = null
  let mediaStream: MediaStream | null = null
  let audioContext: AudioContext | null = null
  let source: MediaStreamAudioSourceNode | null = null
  let analyser: AnalyserNode | null = null
  let animationFrame: number | null = null
  let restartTimer: number | null = null
  let lastPublishedAt = 0
  let volumeBaseline = 0.025
  let previousCrossingRate = 0
  let interimWordCount = 0
  let interimUpdatedAt = 0
  let speakingRate = 0

  const isActive = () => !disposed && options.isAllowed()
  const cleanup = () => {
    if (disposed) return
    disposed = true
    if (activeCleanup === cleanup) activeCleanup = null
    if (restartTimer !== null) window.clearTimeout(restartTimer)
    if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
    recognition?.stop()
    recognition = null
    source?.disconnect()
    source = null
    analyser?.disconnect()
    analyser = null
    mediaStream?.getTracks().forEach((track) => track.stop())
    mediaStream = null
    if (audioContext) {
      const context = audioContext
      audioContext = null
      void context.close().catch(() => undefined)
    }
    options.onListening(false)
    options.onSignals({ amplitude: 0, speechActivity: false, volumeSpike: false, frequencyVariation: 0 })
  }
  activeCleanup = cleanup

  function startAnalyser() {
    if (!mediaStream || typeof window === 'undefined') return
    const AudioContextConstructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextConstructor) return
    try {
      audioContext = new AudioContextConstructor()
      source = audioContext.createMediaStreamSource(mediaStream)
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)
      const samples = new Float32Array(analyser.fftSize)
      const sample = (timestamp: number) => {
        if (!isActive() || !analyser) return
        animationFrame = window.requestAnimationFrame(sample)
        if (timestamp - lastPublishedAt < 250) return
        lastPublishedAt = timestamp
        analyser.getFloatTimeDomainData(samples)
        let squareSum = 0
        let crossings = 0
        for (let index = 0; index < samples.length; index += 1) {
          squareSum += samples[index] * samples[index]
          if (index > 0 && Math.sign(samples[index]) !== Math.sign(samples[index - 1])) crossings += 1
        }
        const amplitude = Math.sqrt(squareSum / samples.length)
        const crossingRate = crossings / samples.length
        const frequencyVariation = previousCrossingRate
          ? Math.min(1, Math.abs(crossingRate - previousCrossingRate) / Math.max(previousCrossingRate, 0.015))
          : 0
        const speechActivity = amplitude >= 0.018
        const volumeSpike = speechActivity && amplitude >= Math.max(0.09, volumeBaseline * 2.2)
        if (!volumeSpike) volumeBaseline = volumeBaseline * 0.94 + amplitude * 0.06
        previousCrossingRate = crossingRate
        options.onSignals({ amplitude, speechActivity, volumeSpike, frequencyVariation })
      }
      animationFrame = window.requestAnimationFrame(sample)
    } catch {
      source?.disconnect()
      source = null
      analyser?.disconnect()
      analyser = null
      if (audioContext) void audioContext.close().catch(() => undefined)
      audioContext = null
    }
  }

  function startRecognition() {
    if (!isActive()) return cleanup()
    recognition = listen({
      continuous: true,
      onText: (text, final) => {
        const words = text.trim().split(/\s+/).filter(Boolean).length
        const now = Date.now()
        if (interimUpdatedAt && now > interimUpdatedAt && words > interimWordCount) {
          const instantRate = ((words - interimWordCount) / (now - interimUpdatedAt)) * 60_000
          speakingRate = speakingRate ? speakingRate * 0.65 + instantRate * 0.35 : instantRate
        }
        interimWordCount = words
        interimUpdatedAt = now
        if (final && text.trim()) {
          options.onTranscript(text.trim().slice(0, 240), speakingRate)
          interimWordCount = 0
          interimUpdatedAt = 0
          speakingRate = 0
        }
      },
      onEnd: () => {
        recognition = null
        options.onListening(false)
        if (isActive()) restartTimer = window.setTimeout(startRecognition, 400)
      },
      onError: (message, code) => {
        if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'unsupported' || code === 'start-failed') {
          if (code === 'not-allowed' || code === 'service-not-allowed') options.onPermissionDenied()
          cleanup()
        }
        options.onError(message)
      },
    })
    if (recognition) options.onListening(true)
  }

  async function initialize() {
    if (!speechRecognitionSupported()) {
      options.onError('Voice listening is unavailable in this browser. You can continue using Anchor without it.')
      cleanup()
      return
    }
    if (!isActive()) return cleanup()
    try {
      const getUserMedia = navigator.mediaDevices?.getUserMedia
      if (!getUserMedia) {
        options.onError('This browser cannot provide microphone access. You can continue using Anchor without it.')
        cleanup()
        return
      }
      mediaStream = await getUserMedia.call(navigator.mediaDevices, { audio: true })
      if (!isActive()) return cleanup()
      startAnalyser()
      startRecognition()
    } catch (error) {
      const errorName = typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : ''
      const denied = errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError'
      if (denied) options.onPermissionDenied()
      options.onError(denied
        ? 'Microphone permission was blocked. Mic is off and private.'
        : 'Microphone access is unavailable right now. You can continue using Anchor without it.')
      cleanup()
    }
  }

  void initialize()
  return cleanup
}
