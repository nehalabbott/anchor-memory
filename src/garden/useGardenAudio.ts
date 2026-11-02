import { useCallback, useEffect, useRef, useState } from 'react'

export type GardenAudioMood = 'calm' | 'supportive' | 'agitated'

interface UseGardenAudioOptions {
  mood: GardenAudioMood
  enabled: boolean
}

export function useGardenAudio({ mood, enabled }: UseGardenAudioOptions) {
  const [audioReady, setAudioReady] = useState(false)
  const [audioError, setAudioError] = useState('')
  const [volume, setVolume] = useState(0.35)
  const contextRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const nodesRef = useRef<AudioNode[]>([])

  const stop = useCallback(() => {
    nodesRef.current.forEach((node) => {
      try { node.disconnect() } catch { /* already disconnected */ }
    })
    nodesRef.current = []
    masterRef.current?.disconnect()
    masterRef.current = null
    const context = contextRef.current
    contextRef.current = null
    setAudioReady(false)
    if (context && context.state !== 'closed') void context.close()
  }, [])

  const start = useCallback(async () => {
    try {
      const AudioContextConstructor = window.AudioContext
      if (!AudioContextConstructor) throw new Error('Audio playback is not supported on this device.')
      const context = contextRef.current ?? new AudioContextConstructor()
      contextRef.current = context
      if (context.state === 'suspended') await context.resume()
      const master = context.createGain()
      master.gain.value = volume
      master.connect(context.destination)

      const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate)
      const channel = buffer.getChannelData(0)
      for (let index = 0; index < channel.length; index += 1) channel[index] = (Math.random() * 2 - 1) * 0.25
      const noise = context.createBufferSource()
      noise.buffer = buffer
      noise.loop = true
      const filter = context.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = mood === 'agitated' ? 520 : 390
      const tide = context.createOscillator()
      const tideGain = context.createGain()
      tide.type = 'sine'
      tide.frequency.value = 0.08
      tideGain.gain.value = 0.08
      tide.connect(tideGain)
      tideGain.connect(master.gain)
      noise.connect(filter)
      filter.connect(master)
      noise.start()
      tide.start()
      nodesRef.current = [noise, filter, tide, tideGain]
      masterRef.current = master
      setAudioError('')
      setAudioReady(true)
      return true
    } catch (error) {
      stop()
      setAudioError(error instanceof Error ? error.message : 'Water ambience could not be played. Try again.')
      return false
    }
  }, [mood, stop, volume])

  useEffect(() => {
    if (!enabled) stop()
  }, [enabled, stop])

  useEffect(() => {
    if (masterRef.current) masterRef.current.gain.setTargetAtTime(volume, masterRef.current.context.currentTime, 0.08)
  }, [volume])

  useEffect(() => {
    return stop
  }, [stop])

  return { audioReady, audioError, volume, setVolume, start, stop }
}