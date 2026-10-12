/** Thin wrappers over the Web Speech API. Both degrade silently if unsupported (e.g. Firefox). */

type Recognition = any
type RecognitionConstructor = new () => Recognition

function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  const speechWindow = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor }
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
}

export const canListen = !!recognitionConstructor()
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

export interface Listener { stop: () => void }
const activeListeners = new Set<Listener>()

export function speechRecognitionSupported() {
  return Boolean(recognitionConstructor())
}

export function stopAllSpeechListeners() {
  for (const listener of [...activeListeners]) listener.stop()
}

/** Start browser speech recognition; recognized text stays in the page unless a caller sends it. */
export function listen(opts: {
  lang?: string
  continuous?: boolean
  onText: (text: string, final: boolean) => void
  onEnd: () => void
  onError: (msg: string, code?: string) => void
}): Listener | null {
  const Ctor = recognitionConstructor()
  if (!Ctor) { opts.onError('Voice input is not supported in this browser. You can type instead.', 'unsupported'); return null }
  const rec = new Ctor()
  let stopped = false
  const listener: Listener = {
    stop: () => {
      if (stopped) return
      stopped = true
      activeListeners.delete(listener)
      rec.onresult = null
      rec.onerror = null
      rec.onend = null
      try { rec.stop() } catch { /* The browser may already have ended recognition. */ }
    },
  }
  rec.lang = opts.lang ?? 'en-IN'
  rec.interimResults = true
  rec.continuous = opts.continuous ?? false
  rec.onresult = (e: any) => {
    const r = e.results[e.results.length - 1]
    opts.onText(r[0].transcript, r.isFinal)
  }
  rec.onerror = (e: any) => {
    const denied = e.error === 'not-allowed' || e.error === 'service-not-allowed'
    const msg = denied ? 'Microphone permission was blocked. Mic is off and private.' : 'I could not hear that. Please try again.'
    opts.onError(msg, e.error)
    if (denied) listener.stop()
  }
  rec.onend = () => {
    activeListeners.delete(listener)
    if (stopped) return
    stopped = true
    opts.onEnd()
  }
  activeListeners.add(listener)
  try {
    rec.start()
  } catch {
    listener.stop()
    opts.onError('Voice listening could not start. You can type instead.', 'start-failed')
    return null
  }
  return listener
}

export function speak(text: string, lang = 'en-IN', onEnd?: () => void) {
  if (!canSpeak) { onEnd?.(); return }
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = 0.9   // slower, clearer for older listeners
  u.pitch = 1
  if (onEnd) {
    u.onend = onEnd
    u.onerror = onEnd
  }
  window.speechSynthesis.speak(u)
}

export function stopSpeaking() { if (canSpeak) window.speechSynthesis.cancel() }
