import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, screen, cleanup } from '@testing-library/react'
import PondScene from './PondScene'
import { useApp } from '@/store/useApp'

function answer(correct: boolean, at: number): any {
  return { type: 'response_submitted', at, sessionId: 's', activityId: 'faces', promptId: 'p', responseId: 'r', correct }
}

describe('PondScene', () => {
  beforeEach(() => { useApp.setState({ events: [] }) })
  afterEach(() => { cleanup(); vi.restoreAllMocks() })

  it('renders a pond with fish and an accessible description', () => {
    const { container } = render(<PondScene />)
    expect(screen.getByRole('img', { name: /koi pond/i })).toBeInTheDocument()
    expect(container.querySelectorAll('svg g').length).toBeGreaterThan(0) // fish groups
  })

  it('describes the pond as calm by default, with no answers yet', () => {
    render(<PondScene />)
    expect(screen.getByRole('img', { name: /gliding calmly|swimming at ease/i })).toBeInTheDocument()
  })

  it('describes the pond as agitated after a run of wrong answers', () => {
    useApp.setState({ events: [answer(false, 1), answer(false, 2), answer(false, 3), answer(false, 4)] })
    render(<PondScene />)
    expect(screen.getByRole('img', { name: /darting|gentle break/i })).toBeInTheDocument()
  })

  it('describes the pond as content after a run of right answers', () => {
    useApp.setState({ events: [answer(true, 1), answer(true, 2), answer(true, 3), answer(true, 4)] })
    render(<PondScene />)
    expect(screen.getByRole('img', { name: /gliding calmly/i })).toBeInTheDocument()
  })

  it('falls back to a static description when the OS requests reduced motion', () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
      media: query, onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    })) as any
    render(<PondScene />)
    expect(screen.getByText(/reflects how recent answers felt/i)).toBeInTheDocument()
    window.matchMedia = original
  })

  it('animates fish position over time when motion is not reduced', () => {
    // Drive requestAnimationFrame manually: capture the callback instead of running it
    // immediately, so we can read the DOM between two distinct, controlled frames.
    let pendingCallback: FrameRequestCallback | null = null
    let clock = 0
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      pendingCallback = cb
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    const { container } = render(<PondScene />)
    const before = container.querySelector('svg g')?.getAttribute('transform')
    expect(before).toBeTruthy()

    // Run several large frames so movement is well above floating-point noise. Each frame's
    // setFish call happens outside a React event handler, so it must be wrapped in act()
    // for the resulting DOM update to actually flush before we read it back out.
    act(() => {
      for (let i = 0; i < 30; i++) {
        const cb = pendingCallback
        pendingCallback = null
        clock += 100 // 100ms per frame
        cb?.(clock)
      }
    })
    const after = container.querySelector('svg g')?.getAttribute('transform')
    expect(after).toBeTruthy()
    expect(after).not.toBe(before)
  })
})
