import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '@/store/useApp'
import { useScreenContext } from '@/store/useScreenContext'
import { NUDGE_DELAY_MS, HINT_DELAY_MS, silenceHint } from './brain'

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart', 'wheel']

/** Uses a two-stage, activity-resetting timer for a gentle Mo check-in and optional hint. */
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
        const screenLabel = useScreenContext.getState().screen || 'this screen'
        if (alreadyOpen) return
        logEvent({ type: 'help_request', at: Date.now() })
        openAssistantWithMessage(silenceHint(userName, memories, screenLabel))
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
