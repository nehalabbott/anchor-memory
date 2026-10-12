import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Volume2 } from 'lucide-react'

/**
 * Shown before a game starts. Gives a short, plain-language "how to play" demo with an
 * optional read-aloud, so a person does not have to start playing cold to understand what
 * to do. `onStart` is only called once the person chooses to begin.
 */
export function HowToPlayCard({
  title,
  description,
  instructions,
  example,
  onStart,
  startLabel = 'Start playing',
}: {
  title: string
  description: string
  instructions: string
  example?: string
  onStart: () => void
  startLabel?: string
}) {
  const [reading, setReading] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  function readAloud() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(`${instructions}${example ? `. For example, ${example}` : ''}`)
    utterance.rate = 0.85
    utterance.onend = () => setReading(false)
    utteranceRef.current = utterance
    setReading(true)
    window.speechSynthesis.speak(utterance)
  }

  function stopReading() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    setReading(false)
  }

  return (
    <section className="card p-5" aria-label={`How to play ${title}`}>
      <h2 className="text-2xl font-display">{title}</h2>
      <p className="mt-1 text-ink/70">{description}</p>
      <div className="mt-4 rounded-2xl border-2 border-mint-200 bg-mint-50 p-4">
        <p className="text-lg font-semibold text-garden-900">How to play</p>
        <p className="mt-2 text-lg leading-relaxed text-ink/85">{instructions}</p>
        {example && <p className="mt-2 text-base text-ink/70">{example}</p>}
      </div>
      <div className="mt-4 grid gap-3">
        <button
          type="button"
          onClick={reading ? stopReading : readAloud}
          aria-pressed={reading}
          className="btn-soft flex w-full items-center justify-center gap-2"
        >
          <Volume2 size={20} aria-hidden />
          {reading ? 'Stop reading' : 'Hear the instructions'}
        </button>
        <button type="button" onClick={onStart} className="btn-primary w-full">
          {startLabel}
        </button>
      </div>
    </section>
  )
}

export type FeedbackStatus = 'correct' | 'incorrect' | null

/**
 * A high-contrast popup for the result of an answer. Wrong answers get a clearly different
 * color from correct ones and, critically, a "Try again" action so the person can retry the
 * same prompt right after seeing the hint, instead of being forced straight to a new one.
 */
export function FeedbackPopup({
  status,
  message,
  hint,
  onRetry,
  onContinue,
}: {
  status: FeedbackStatus
  message: string
  hint?: string
  onRetry?: () => void
  onContinue?: () => void
}) {
  if (!status) return null
  const isCorrect = status === 'correct'
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`sticky top-2 z-30 mx-auto mt-4 max-w-md rounded-2xl border-2 p-4 shadow-lg ${
        isCorrect ? 'border-garden-600 bg-mint-100 text-garden-900' : 'border-rose-main bg-rose-soft text-rose-deep'
      }`}
    >
      <div className="flex items-start gap-3">
        {isCorrect ? <CheckCircle2 size={28} aria-hidden /> : <AlertCircle size={28} aria-hidden />}
        <div>
          <p className="text-lg font-semibold">{message}</p>
          {hint && <p className="mt-1 text-base opacity-90">{hint}</p>}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {!isCorrect && onRetry && (
          <button type="button" onClick={onRetry} className="min-h-[52px] flex-1 rounded-xl bg-white font-semibold text-rose-deep border-2 border-rose-main">
            Try again
          </button>
        )}
        {isCorrect && onContinue && (
          <button type="button" onClick={onContinue} className="btn-primary min-h-[52px] flex-1">
            Continue
          </button>
        )}
      </div>
    </div>
  )
}

/** Classnames to mark a choice button as wrong (clearly different color) or correct. */
export function choiceStateClass(state: 'default' | 'wrong' | 'correct' | 'selected'): string {
  if (state === 'wrong') return 'border-rose-main bg-rose-soft text-rose-deep'
  if (state === 'correct') return 'border-garden-700 bg-mint-100 text-garden-900'
  if (state === 'selected') return 'border-sky-deep bg-sky-soft text-sky-deep'
  return 'border-garden-600 bg-white text-garden-900'
}
