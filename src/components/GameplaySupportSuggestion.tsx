import type { ActivityId } from '@/lib/types'
import { useApp } from '@/store/useApp'

export type GameplaySupportAction = 'hint' | 'easier' | 'break'

interface GameplaySupportSuggestionProps {
  activityId: ActivityId
  actions: GameplaySupportAction[]
  onChoose: (action: GameplaySupportAction) => void
}

const ACTION_LABELS: Record<GameplaySupportAction, string> = {
  hint: 'A gentle hint',
  easier: 'An easier round',
  break: 'Take a short break',
}

export default function GameplaySupportSuggestion({ activityId, actions, onChoose }: GameplaySupportSuggestionProps) {
  const suggestedActivity = useApp((state) => state.gameplaySupportActivity)
  const setSuggestedActivity = useApp((state) => state.setGameplaySupportActivity)
  if (suggestedActivity !== activityId) return null

  return (
    <section aria-label="Optional game support" className="mt-4 rounded-2xl border-2 border-mint-300 bg-mint-50 p-4">
      <p className="font-semibold text-garden-900">You seem to be having a difficult round. Would you like some help?</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            className="min-h-11 rounded-xl border-2 border-garden-700 bg-white px-3 font-semibold text-garden-900"
            onClick={() => {
              setSuggestedActivity(null)
              onChoose(action)
            }}
          >
            {ACTION_LABELS[action]}
          </button>
        ))}
        <button
          type="button"
          className="min-h-11 rounded-xl px-3 font-semibold text-ink/75 underline"
          onClick={() => setSuggestedActivity(null)}
        >
          Not now
        </button>
      </div>
    </section>
  )
}
