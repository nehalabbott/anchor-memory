/** Thin wrappers over the Web Speech API. Both degrade silently if unsupported (e.g. Firefox). */

type SR = any
const Ctor: SR | undefined =
  typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined

export const canListen = !!Ctor
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

export interface Listener { stop: () => void }

/** Start one-shot speech recognition. Part 3 replaces this with MediaRecorder -> Whisper on the server. */
export function listen(opts: {
  lang?: string
  onText: (text: string, final: boolean) => void
  onEnd: () => void
  onError: (msg: string) => void
}): Listener | null {
  if (!Ctor) { opts.onError('Voice input is not supported in this browser. You can type instead.'); return null }
  const rec = new Ctor()
  rec.lang = opts.lang ?? 'en-IN'
  rec.interimResults = true
  rec.continuous = false
  rec.onresult = (e: any) => {
    const r = e.results[e.results.length - 1]
    opts.onText(r[0].transcript, r.isFinal)
  }
  rec.onerror = (e: any) => {
    const msg = e.error === 'not-allowed' ? 'Microphone permission was blocked. You can type instead.' : 'I could not hear that. Please try again.'
    opts.onError(msg)
  }
  rec.onend = opts.onEnd
  rec.start()
  return { stop: () => rec.stop() }
}

export function speak(text: string, lang = 'en-IN') {
  if (!canSpeak) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = 0.9   // slower, clearer for older listeners
  u.pitch = 1
  window.speechSynthesis.speak(u)
}

export function stopSpeaking() { if (canSpeak) window.speechSynthesis.cancel() }
