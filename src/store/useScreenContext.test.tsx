import { beforeEach, describe, expect, it } from 'vitest'
import { render, renderHook } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useScreenContext, ScreenContextSync } from './useScreenContext'

beforeEach(() => {
  useScreenContext.setState({
    route: '/',
    screen: 'Home',
    activeGame: null,
    gameDomain: null,
    difficultyLevel: null,
    score: null,
    lastFailedAction: null,
    elapsedTimeMs: 0,
    activityState: 'idle',
  })
})

describe('screen context store', () => {
  it('starts with a safe initial state and updates route metadata', () => {
    expect(useScreenContext.getState().route).toBe('/')
    useScreenContext.getState().syncRoute('/games/dual-n-back')
    expect(useScreenContext.getState().activeGame).toBe('dual-n-back')
    expect(useScreenContext.getState().gameDomain).toBe('Working Memory')
    expect(useScreenContext.getState().screen).toBe('Dual N-Back')
  })

  it('updates difficulty, score, failed actions, and activity state', () => {
    useScreenContext.getState().setGameContext({ activeGame: 'trail-making', gameDomain: 'Executive Function', difficultyLevel: 3, activityState: 'active', score: null })
    useScreenContext.getState().setLastFailedAction('selected the wrong trail node')
    expect(useScreenContext.getState().difficultyLevel).toBe(3)
    expect(useScreenContext.getState().lastFailedAction).toBe('selected the wrong trail node')
    useScreenContext.getState().setActivityState('completed')
    expect(useScreenContext.getState().activityState).toBe('completed')
  })

  it('tracks elapsed time and resets route state cleanly', () => {
    useScreenContext.getState().setActivityState('active')
    useScreenContext.getState().tickElapsed(2000)
    expect(useScreenContext.getState().elapsedTimeMs).toBe(2000)
    useScreenContext.getState().reset('/games/category-association')
    expect(useScreenContext.getState().activeGame).toBe('category-association')
    expect(useScreenContext.getState().elapsedTimeMs).toBe(0)
  })
})

describe('route integration', () => {
  it('updates when navigation changes and clears game-specific state on non-game screens', () => {
    const { rerender } = renderHook(() => {
      const location = window.location
      return location.pathname
    })

    useScreenContext.getState().setGameContext({ activeGame: 'faces', difficultyLevel: 2, activityState: 'active' })
    expect(useScreenContext.getState().activeGame).toBe('faces')
    useScreenContext.getState().syncRoute('/profile')
    expect(useScreenContext.getState().activeGame).toBeNull()
    expect(useScreenContext.getState().screen).toBe('My Journey')
    rerender()
  })

  it('syncs from React Router location updates without duplicate timers', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/games/match']}>
        <Routes>
          <Route path="/games/:game" element={<ScreenContextSync />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(useScreenContext.getState().activeGame).toBe('match')
    unmount()
  })
})

describe('assistant context filtering', () => {
  it('only exposes structured, non-audio context to the assistant', () => {
    useScreenContext.getState().setGameContext({ activeGame: 'dual-n-back', gameDomain: 'Working Memory', difficultyLevel: 4, activityState: 'active', lastFailedAction: 'missed the dual n-back match' })
    const snapshot = useScreenContext.getState().snapshot()
    expect(snapshot).toMatchObject({ activeGame: 'dual-n-back', difficultyLevel: 4, lastFailedAction: 'missed the dual n-back match' })
    expect(snapshot).not.toHaveProperty('audio')
    expect(snapshot).not.toHaveProperty('transcript')
  })
})
