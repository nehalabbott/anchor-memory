import { useEffect, useState } from 'react'
import type { MediaReference } from '@/lib/types'
import { mediaRepository } from '@/lib/mediaRepository'

function isMediaUrl(value: string) {
  return value.startsWith('https://') || value.startsWith('http://') || (value.startsWith('/') && !value.startsWith('//'))
}

function useMediaUrl(reference?: MediaReference) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    let objectUrl = ''
    let active = true
    setUrl('')
    if (!reference) return
    if (reference.storage === 'remote' && isMediaUrl(reference.id)) {
      setUrl(reference.id)
      return
    }
    void mediaRepository.resolve(reference).then((blob) => {
      if (!active || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    }).catch(() => setUrl(''))
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [reference])

  return url
}

export function MemoryPhoto({ reference, alt, className = '' }: { reference?: MediaReference; alt: string; className?: string }) {
  const src = useMediaUrl(reference)
  if (!src) return null
  return <img src={src} alt={alt} className={className} />
}

export function MemoryAudio({ reference }: { reference?: MediaReference }) {
  const src = useMediaUrl(reference)
  if (!src) return null
  return <audio className="w-full" controls preload="none" src={src}>Audio playback is not supported in this browser.</audio>
}