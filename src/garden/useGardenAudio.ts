import { useEffect, useRef, useState } from 'react'

export type GardenAudioMood = 'calm' | 'supportive' | 'agitated'

const CALMING_AUDIO_URL = 'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3'

interface UseGardenAudioOptions {
  mood: GardenAudioMood
  enabled: boolean
  reducedMotion?: boolean
}

export function useGardenAudio({ mood, enabled, reducedMotion = false }: UseGardenAudioOptions) {
  const [audioReady, setAudioReady] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (typeof window.Audio !== 'function') return

    const audio = audioRef.current ?? new window.Audio(CALMING_AUDIO_URL)
    audioRef.current = audio
    audio.loop = true
    audio.preload = 'auto'
    
    // REMOVED: audio.crossOrigin = 'anonymous' (Causes CORS failures on standard URLs)
    
    audio.volume = mood === 'agitated' ? 0.5 : mood === 'supportive' ? 0.38 : 0.28

    if (!enabled || reducedMotion) {
      if (typeof audio.pause === 'function') audio.pause()
      setAudioReady(false)
      return
    }

    if (audio.paused) {
      if (typeof audio.play === 'function') {
        void audio.play()
          .then(() => setAudioReady(true))
          .catch((err) => {
            // Added logging so you can see Autoplay policy rejections in the console
            console.error("Audio playback failed (likely Autoplay Policy):", err)
            setAudioReady(false)
          })
        return
      }
    }

    setAudioReady(true)
  }, [enabled, mood, reducedMotion])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
    }
  }, [])

  return { audioReady }
}