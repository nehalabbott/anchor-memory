import { Mic } from 'lucide-react'
import { useApp } from '@/store/useApp'

/**
 * The persistent "Talk to Assistant" toolbar (Lab 5: purple pill above the bottom nav).
 * Visible on every screen. Always paired with text + icon (never icon alone).
 *
 * When the person has gone quiet for a while (useInactivityNudge), this pulses gently and
 * swaps its label to a soft check-in, without opening anything — a passer-by notices Mo is
 * there without anything popping up over what they were looking at.
 */
export default function AssistantBar() {
  const toggle = useApp((s) => s.toggleAssistant)
  const nudging = useApp((s) => s.assistantNudging)
  return (
    <div className="px-4 pb-2 pt-2 bg-mist/95">
      <button
        onClick={() => toggle(true)}
        aria-haspopup="dialog"
        aria-label={nudging ? 'Talk to Assistant. Mo is checking in on you.' : 'Talk to Assistant'}
        className={`relative w-full min-h-[60px] rounded-pill border-2 font-display font-semibold text-lg
                   flex items-center justify-center gap-3 active:scale-[.98] transition
                   ${nudging ? 'border-iris-main bg-iris-main text-white' : 'border-iris-main bg-iris-soft text-iris-deep'}`}
      >
        {nudging && <span className="absolute inset-0 rounded-pill bg-iris-main animate-pulseRing" aria-hidden />}
        <Mic size={24} className="relative" aria-hidden />
        <span className="relative">{nudging ? "Still there? Tap to talk" : 'Talk to Assistant'}</span>
      </button>
      {/* Announced to screen readers without needing the panel open. Only rendered when there's
          something to say, and role="alert" rather than "status" so it never collides with the
          per-activity feedback region that already uses role="status" on game screens. */}
      {nudging && <p role="alert" className="sr-only">Mo is checking in on you.</p>}
    </div>
  )
}
