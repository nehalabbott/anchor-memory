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
  const gainRef = useRef<GainNode | null>(null)
  const oscillatorsRef = useRef<Array<OscillatorNode>>([])
  const noiseRef = useRef<AudioBufferSourceNode | null>(null)
  const noiseGainRef = useRef<GainNode | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const initRef = useRef(false)

  useEffect(() => {
    if (!enabled || reducedMotion) {
      setAudioReady(false)
      if (contextRef.current) {
        void contextRef.current.suspend().catch(() => undefined)
      }
      return
    }

    if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return
    if (!contextRef.current) {
      const AudioCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtor) return
      const context = new AudioCtor()
      const masterGain = context.createGain()
      masterGain.gain.value = 0.03
      masterGain.connect(context.destination)

      const oscillatorBase = context.createOscillator()
      oscillatorBase.type = 'sine'
      oscillatorBase.frequency.value = mood === 'agitated' ? 139.5 : 220
      const oscGain = context.createGain()
      oscGain.gain.value = mood === 'agitated' ? 0.025 : 0.015
      oscillatorBase.connect(oscGain)
      oscGain.connect(masterGain)
      oscillatorBase.start()

      const secondary = context.createOscillator()
      secondary.type = 'triangle'
      secondary.frequency.value = mood === 'agitated' ? 196 : 277
      const secondaryGain = context.createGain()
      secondaryGain.gain.value = mood === 'agitated' ? 0.012 : 0.008
      secondary.connect(secondaryGain)
      secondaryGain.connect(masterGain)
      secondary.start()

      const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * 0.12
      }
      const noiseSource = context.createBufferSource()
      noiseSource.buffer = buffer
      noiseSource.loop = true
      const noiseGain = context.createGain()
      noiseGain.gain.value = mood === 'agitated' ? 0.02 : 0.012
      noiseSource.connect(noiseGain)
      noiseGain.connect(masterGain)
      noiseSource.start()

      contextRef.current = context
      gainRef.current = masterGain
      oscillatorsRef.current = [oscillatorBase, secondary]
      noiseRef.current = noiseSource
      noiseGainRef.current = noiseGain
      masterGainRef.current = masterGain
      initRef.current = true
    }

    if (!contextRef.current || !gainRef.current || !masterGainRef.current) return

    const context = contextRef.current
    const masterGain = masterGainRef.current
    const targetGain = mood === 'agitated' ? 0.08 : mood === 'supportive' ? 0.045 : 0.03
    masterGain.gain.setTargetAtTime(targetGain, context.currentTime, 0.8)

    oscillatorsRef.current[0].frequency.setTargetAtTime(mood === 'agitated' ? 139.5 : 220, context.currentTime, 0.8)
    oscillatorsRef.current[1].frequency.setTargetAtTime(mood === 'agitated' ? 196 : 277, context.currentTime, 0.8)
    if (noiseGainRef.current) {
      noiseGainRef.current.gain.setTargetAtTime(mood === 'agitated' ? 0.03 : 0.012, context.currentTime, 1)
    }
    setAudioReady(true)
    void context.resume().catch(() => undefined)

    return () => {
      if (contextRef.current && initRef.current) {
        Object.values({}).length
      }
    }
  }, [enabled, mood, reducedMotion])

  useEffect(() => {
    return () => {
      if (contextRef.current) {
        void contextRef.current.close().catch(() => undefined)
        contextRef.current = null
        gainRef.current = null
        noiseRef.current = null
        noiseGainRef.current = null
        masterGainRef.current = null
        oscillatorsRef.current = []
      }
    }
  }, [])

  return { audioReady }
}
