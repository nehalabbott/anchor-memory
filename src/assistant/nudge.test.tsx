import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { useApp } from '@/store/useApp'
import { listen, speak } from './speech'
import { NUDGE_DELAY_MS, HINT_DELAY_MS } from './brain'

vi.mock('./speech', () => ({
  canListen: true,
  speechRecognitionSupported: () => false,
  listen: vi.fn(() => ({ stop: vi.fn() })),
  speak: vi.fn((_text, _lang, onEnd) => onEnd?.()),
  stopSpeaking: vi.fn(),
}))

function reset() {
  localStorage.clear()
  useApp.setState({
    chat: [], assistantOpen: false, events: [], assistantNudging: false, assistantSpeakFirst: null,
    memories: [{ id: 'm1', kind: 'story', name: 'Lily', story: 'She taught me to bake apple pie every Sunday.', createdAt: Date.now() } as any],
  })
}

describe('proactive inactivity nudge', () => {
  beforeEach(() => { reset(); vi.useFakeTimers({ shouldAdvanceTime: true }) })
  afterEach(() => { vi.useRealTimers() })

  it('pulses the closed toolbar after a silent stretch, without opening the panel', async () => {
    render(<MemoryRouter initialEntries={['/games']}><App /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Talk to Assistant' })).toBeInTheDocument()

    await act(async () => { await vi.advanceTimersByTimeAsync(NUDGE_DELAY_MS + 50) })

    expect(useApp.getState().assistantOpen).toBe(false)
    expect(useApp.getState().assistantNudging).toBe(true)
    expect(screen.getByRole('button', { name: /Mo is checking in on you/ })).toBeInTheDocument()
  })

  it('escalates to an auto-opened, concrete hint if still no response', async () => {
    render(<MemoryRouter initialEntries={['/games']}><App /></MemoryRouter>)

    await act(async () => { await vi.advanceTimersByTimeAsync(HINT_DELAY_MS + 50) })

    expect(useApp.getState().assistantOpen).toBe(true)
    await waitFor(() => expect(screen.getByText(/Lily/)).toBeInTheDocument())
    expect(useApp.getState().events.some((e) => e.type === 'help_request')).toBe(true)
  })

  it('a tap anywhere resets the clock so it does not nudge right after activity', async () => {
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<MemoryRouter initialEntries={['/games']}><App /></MemoryRouter>)

    await act(async () => { await vi.advanceTimersByTimeAsync(NUDGE_DELAY_MS - 500) })
    await u.click(screen.getByRole('heading', { name: 'Choose an Activity' }).closest('header') ?? document.body)
    await act(async () => { await vi.advanceTimersByTimeAsync(600) })

    expect(useApp.getState().assistantNudging).toBe(false)
  })

  it('does not nudge while the assistant panel is already open', async () => {
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<MemoryRouter initialEntries={['/games']}><App /></MemoryRouter>)
    await u.click(screen.getByRole('button', { name: 'Talk to Assistant' }))
    expect(useApp.getState().assistantOpen).toBe(true)

    await act(async () => { await vi.advanceTimersByTimeAsync(HINT_DELAY_MS + 50) })

    // still just the greeting, no unsolicited speak-first message stacked on top
    const assistantTurns = useApp.getState().chat.filter((m) => m.role === 'assistant')
    expect(assistantTurns).toHaveLength(1)
  })

  it('speak-first hint renders as Mo\'s own message, never as something the user said', async () => {
    useApp.getState().setPrivacyShieldEnabled(false)
    render(<MemoryRouter initialEntries={['/games']}><App /></MemoryRouter>)
    await act(async () => { await vi.advanceTimersByTimeAsync(HINT_DELAY_MS + 50) })
    const chat = useApp.getState().chat
    const last = chat[chat.length - 1]
    expect(last.role).toBe('assistant')
    expect(speak).toHaveBeenCalled()
    expect(listen).toHaveBeenCalled()
  })
})
