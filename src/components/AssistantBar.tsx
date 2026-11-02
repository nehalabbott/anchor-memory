/** Persistent entry point for opening Mo from any screen. */
import { Mic } from 'lucide-react'
import { useApp } from '@/store/useApp'

export default function AssistantBar() {
  const toggle = useApp((s) => s.toggleAssistant)
  const nudging = useApp((s) => s.assistantNudging)
  return (
    <div className="px-3 pb-1 pt-1 sm:px-4 sm:pb-2 sm:pt-2 bg-mist/95">
      <button
        onClick={() => toggle(true)}
        aria-haspopup="dialog"
        aria-label={nudging ? 'Talk to Assistant. Mo is checking in on you.' : 'Talk to Assistant'}
        className={`relative w-full min-h-[56px] rounded-pill border-2 font-display font-semibold text-lg
                   flex items-center justify-center gap-3 active:scale-[.98] transition
                   ${nudging ? 'border-iris-main bg-iris-main text-white' : 'border-iris-main bg-iris-soft text-iris-deep'}`}
      >
        {nudging && <span className="absolute inset-0 rounded-pill bg-iris-main animate-pulseRing" aria-hidden />}
        <Mic size={24} className="relative" aria-hidden />
        <span className="relative">{nudging ? "Still there? Tap to talk" : 'Talk to Assistant'}</span>
      </button>
      {/* Use alert so screen readers announce the check-in while Mo is closed. */}
      {nudging && <p role="alert" className="sr-only">Mo is checking in on you.</p>}
    </div>
  )
}
