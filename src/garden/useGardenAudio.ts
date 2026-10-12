import { useEffect, useRef, useState } from 'react'

export type GardenAudioMood = 'calm' | 'supportive' | 'agitated'

interface UseGardenAudioOptions {
  mood: GardenAudioMood
  enabled: boolean
  reducedMotion?: boolean
}

export function useGardenAudio({ mood, enabled, reducedMotion = false }: UseGardenAudioOptions) {
  const [audioReady, setAudioReady] = useState(false)
  const contextRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const toneOscRef = useRef<OscillatorNode | null>(null)
  const toneGainRef = useRef<GainNode | null>(null)
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const noiseFilterRef = useRef<BiquadFilterNode | null>(null)
  const noiseGainRef = useRef<GainNode | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const AudioCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return

    if (!contextRef.current) {
      const context = new AudioCtor()
      const masterGain = context.createGain()
      masterGain.gain.value = 0
      masterGain.connect(context.destination)

      const toneOsc = context.createOscillator()
      toneOsc.type = 'sine'
      toneOsc.frequency.value = 180

      const toneGain = context.createGain()
      toneGain.gain.value = 0
      toneOsc.connect(toneGain)
      toneGain.connect(masterGain)
      toneOsc.start()

      const buffer = context.createBuffer(1, context.sampleRate * 6, context.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i += 1) {
        const slow = Math.sin(i / 120) * 0.7
        const rush = (Math.random() * 2 - 1) * 0.8
        data[i] = (slow + rush) * 0.9
      }

      const noiseSource = context.createBufferSource()
      noiseSource.buffer = buffer
      noiseSource.loop = true

      const noiseFilter = context.createBiquadFilter()
      noiseFilter.type = 'lowpass'
      noiseFilter.frequency.value = 700
      noiseFilter.Q.value = 0.9

      const noiseGain = context.createGain()
      noiseGain.gain.value = 0
      noiseSource.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(masterGain)
      noiseSource.start()

      contextRef.current = context
      masterGainRef.current = masterGain
      toneOscRef.current = toneOsc
      toneGainRef.current = toneGain
      noiseSourceRef.current = noiseSource
      noiseFilterRef.current = noiseFilter
      noiseGainRef.current = noiseGain
    }

    const context = contextRef.current
    const masterGain = masterGainRef.current
    const toneOsc = toneOscRef.current
    const toneGain = toneGainRef.current
    const noiseFilter = noiseFilterRef.current
    const noiseGain = noiseGainRef.current

    if (!context || !masterGain || !toneOsc || !toneGain || !noiseFilter || !noiseGain) return

    if (!enabled || reducedMotion) {
      masterGain.gain.setTargetAtTime(0, context.currentTime, 0.25)
      setAudioReady(false)
      void context.suspend().catch(() => undefined)
      return
    }

    const profiles = {
      calm: { master: 0.45, tone: 160, toneGain: 0.15, noise: 0.22, filter: 520, filterType: 'lowpass' as BiquadFilterType },
      supportive: { master: 0.6, tone: 220, toneGain: 0.2, noise: 0.28, filter: 820, filterType: 'lowpass' as BiquadFilterType },
      agitated: { master: 0.75, tone: 280, toneGain: 0.26, noise: 0.38, filter: 1500, filterType: 'bandpass' as BiquadFilterType },
    } as const

    const profile = profiles[mood]
    masterGain.gain.setTargetAtTime(profile.master, context.currentTime, 0.8)
    toneOsc.frequency.setTargetAtTime(profile.tone, context.currentTime, 1)
    toneGain.gain.setTargetAtTime(profile.toneGain, context.currentTime, 0.8)
    noiseFilter.type = profile.filterType
    noiseFilter.frequency.setTargetAtTime(profile.filter, context.currentTime, 1)
    noiseGain.gain.setTargetAtTime(profile.noise, context.currentTime, 1)
    setAudioReady(true)
    void context.resume().catch(() => undefined)
  }, [enabled, mood, reducedMotion])

  useEffect(() => {
    return () => {
      if (contextRef.current) {
        void contextRef.current.close().catch(() => undefined)
      }
    }
  }, [])

  return { audioReady }
}
