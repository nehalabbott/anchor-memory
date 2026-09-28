import { Mic } from 'lucide-react'
import { useApp } from '@/store/useApp'

/**
 * The persistent "Talk to Assistant" toolbar (Lab 5: purple pill above the bottom nav).
 * Visible on every screen. Always paired with text + icon (never icon alone).
 */
export default function AssistantBar() {
  const toggle = useApp((s) => s.toggleAssistant)
  return (
    <div className="px-4 pb-2 pt-2 bg-mist/95">
      <button
        onClick={() => toggle(true)}
        aria-haspopup="dialog"
        aria-label="Talk to Assistant"
        className="w-full min-h-[60px] rounded-pill border-2 border-iris-main bg-iris-soft text-iris-deep
                   font-display font-semibold text-lg flex items-center justify-center gap-3 active:scale-[.98] transition"
      >
        <Mic size={24} aria-hidden /> Talk to Assistant
      </button>
    </div>
  )
}
