import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import VoiceAwarenessController from './VoiceAwarenessController'
import GameplaySupportSuggestion from '@/components/GameplaySupportSuggestion'
import { useApp } from '@/store/useApp'
import type { InteractionEvent } from '@/lib/types'

function response(at: number, promptId: string): InteractionEvent {
  return {
    type: 'response_submitted',
    at,
    sessionId: 'game-session',
    activityId: 'pattern',
    promptId,
    responseId: 'wrong-choice',
    correct: false,
    responseLatencyMs: 2_000,
  }
}

function SupportHarness() {
  return (
    <MemoryRouter>
      <VoiceAwarenessController />
      <GameplaySupportSuggestion activityId="pattern" actions={['hint']} onChoose={() => {}} />
    </MemoryRouter>
  )
}

describe('gameplay-triggered support suggestion', () => {
  beforeEach(() => {
    useApp.setState({
      events: [],
      privacyShieldEnabled: true,
      voiceListeningEnabled: false,
      voiceListening: false,
      assistantOpen: false,
      gameplaySupportActivity: null,
    })
  })

  it('detects repeated gameplay struggles with listening disabled and supports a non-interrupting dismissal', async () => {
    const user = userEvent.setup()
    render(<SupportHarness />)
    const now = Date.now()

    act(() => {
      useApp.getState().logEvent(response(now - 3_000, 'prompt-1'))
      useApp.getState().logEvent(response(now - 2_000, 'prompt-2'))
      useApp.getState().logEvent({
        type: 'rapid_taps', at: now - 1_000, sessionId: 'game-session', activityId: 'pattern', count: 3,
      })
    })

    expect(await screen.findByText(/You seem to be having a difficult round/i)).toBeInTheDocument()
    expect(useApp.getState().voiceListeningEnabled).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.queryByText(/You seem to be having a difficult round/i)).not.toBeInTheDocument()
    expect(useApp.getState().assistantOpen).toBe(false)
    expect(useApp.getState().gameplaySupportActivity).toBeNull()
  })

  it('does not offer support for one error or prompt repeatedly during the cooldown', () => {
    render(<SupportHarness />)
    const now = Date.now()
    act(() => { useApp.getState().logEvent(response(now, 'prompt-1')) })
    expect(screen.queryByText(/difficult round/i)).not.toBeInTheDocument()

    act(() => {
      useApp.getState().logEvent(response(now + 1, 'prompt-2'))
      useApp.getState().logEvent({
        type: 'rapid_taps', at: now + 2, sessionId: 'game-session', activityId: 'pattern', count: 3,
      })
    })
    expect(screen.getByText(/difficult round/i)).toBeInTheDocument()
    act(() => {
      useApp.getState().setGameplaySupportActivity(null)
      useApp.getState().logEvent(response(now + 3, 'prompt-3'))
    })
    expect(screen.queryByText(/difficult round/i)).not.toBeInTheDocument()
  })
})
