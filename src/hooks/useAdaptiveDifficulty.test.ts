import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdaptiveDifficulty } from './useAdaptiveDifficulty'
import { useApp } from '@/store/useApp'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
  useApp.setState({
    privacyShieldEnabled: true,
    voiceListening: false,
    interactionState: 'possible_frustration',
  })
})
afterEach(() => vi.useRealTimers())

describe('useAdaptiveDifficulty acoustic privacy boundary', () => {
  it('omits acoustic state while Privacy Shield is on or voice listening is unavailable', () => {
    const { result, rerender } = renderHook(() => useAdaptiveDifficulty())
    act(() => { vi.advanceTimersByTime(30_000); result.current.recordFailure(2_000) })
    expect(result.current.level).toBe(3)

    act(() => useApp.setState({ privacyShieldEnabled: false, voiceListening: false }))
    rerender()
    act(() => result.current.reset(3, Date.now()))
    act(() => { result.current.recordFailure(2_000) })
    expect(result.current.level).toBe(3)
  })

  it('uses the existing structured frustration state only when capture is active and private mode is off', () => {
    useApp.setState({ privacyShieldEnabled: false, voiceListening: true })
    const { result } = renderHook(() => useAdaptiveDifficulty())
    act(() => { vi.advanceTimersByTime(30_000); result.current.recordFailure(2_000) })
    expect(result.current.level).toBe(2)
  })

  it('allows an explicit support request to lower at most one level', () => {
    const changes: Array<{ previousLevel: number; newLevel: number }> = []
    const { result } = renderHook(() => useAdaptiveDifficulty({ onLevelChange: (change) => changes.push(change) }))
    act(() => result.current.requestSupport())
    expect(result.current.level).toBe(2)
    expect(changes).toEqual([{ previousLevel: 3, newLevel: 2, reason: 'requested_support', at: 0 }])
  })
})
