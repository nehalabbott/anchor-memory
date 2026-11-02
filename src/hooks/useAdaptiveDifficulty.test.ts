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

describe('useAdaptiveDifficulty gameplay response adaptation', () => {
  it('keeps one failure at the current level and adapts repeated errors while private', () => {
    const { result } = renderHook(() => useAdaptiveDifficulty())
    act(() => { vi.advanceTimersByTime(30_000); result.current.recordFailure(2_000) })
    expect(result.current.level).toBe(3)
    act(() => { result.current.recordFailure(2_000) })
    expect(result.current.level).toBe(2)
  })

  it('adapts repeated long response times without microphone access', () => {
    const { result } = renderHook(() => useAdaptiveDifficulty())
    act(() => {
      vi.advanceTimersByTime(30_000)
      result.current.recordSuccess(12_000)
      result.current.recordSuccess(12_000)
    })
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
