import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '@/store/useApp'
import { NUDGE_DELAY_MS, HINT_DELAY_MS, silenceHint } from './brain'

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart', 'wheel']

/**
 * Watches for real user activity anywhere in the app (not just inside the assistant panel).
 * After a stretch of silence it first pulses the closed "Talk to Assistant" toolbar as a gentle
 * "still there?" cue, so the person notices Mo without anything popping open. If they still don't
 * respond, Mo escalates once by opening with a concrete hint drawn from their own memories.
 * Any tap, key press or route change resets the clock; it never nudges twice in a row without
 * a fresh sign of activity, and it stands down completely while the person is mid-conversation.
 */
export function useInactivityNudge() {
  const loc = useLocation()
  const nudgeTimer = useRef<ReturnType<typeof setTimeout>>()
  const hintTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    function clearTimers() {
      clearTimeout(nudgeTimer.current)
      clearTimeout(hintTimer.current)
    }

    function arm() {
      clearTimers()
      const { assistantOpen } = useApp.getState()
      useApp.getState().setAssistantNudging(false)
      if (assistantOpen) return // mid-conversation: let AssistantPanel's own pacing handle it

      nudgeTimer.current = setTimeout(() => {
        if (!useApp.getState().assistantOpen) useApp.getState().setAssistantNudging(true)
      }, NUDGE_DELAY_MS)

      hintTimer.current = setTimeout(() => {
        const { assistantOpen: alreadyOpen, userName, memories, openAssistantWithMessage, logEvent } = useApp.getState()
        if (alreadyOpen) return
        logEvent({ type: 'help_request', at: Date.now() })
        openAssistantWithMessage(silenceHint(userName, memories))
      }, HINT_DELAY_MS)
    }

    const onActivity = () => arm()
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }))
    arm() // start the clock on mount and whenever the route changes

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity))
      clearTimers()
    }
  }, [loc.pathname])
}
