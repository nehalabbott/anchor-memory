import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useGardenAudio } from './useGardenAudio'

class MockNode {
  context: MockAudioContext
  gain = { value: 0, setTargetAtTime: vi.fn() }
  connect = vi.fn()
  disconnect = vi.fn()
  start = vi.fn()
  buffer?: AudioBuffer
  loop?: boolean
  type?: string
  frequency = { value: 0 }

  constructor(context: MockAudioContext) { this.context = context }
}

class MockAudioContext {
  state: AudioContextState = 'running'
  currentTime = 0
  sampleRate = 8
  destination = new MockNode(this)
  close = vi.fn(async () => { this.state = 'closed' })
  resume = vi.fn(async () => { this.state = 'running' })
  createGain() { return new MockNode(this) }
  createBufferSource() { return new MockNode(this) }
  createBiquadFilter() { return new MockNode(this) }
  createOscillator() { return new MockNode(this) }
  createBuffer(_channels: number, length: number) {
    return {
      duration: length / this.sampleRate,
      length,
      numberOfChannels: _channels,
      sampleRate: this.sampleRate,
      getChannelData: () => new Float32Array(length),
      copyFromChannel: () => undefined,
      copyToChannel: () => undefined,
    }
  }
}

const originalAudioContext = window.AudioContext

afterEach(() => {
  Object.defineProperty(window, 'AudioContext', { configurable: true, value: originalAudioContext })
})

describe('aquarium water ambience', () => {
  it('does not start without interaction and can be started, adjusted, and stopped', async () => {
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: MockAudioContext })
    const { result, unmount } = renderHook(() => useGardenAudio({ mood: 'calm', enabled: false }))

    expect(result.current.audioReady).toBe(false)
    let started = false
    await act(async () => { started = await result.current.start() })
    expect(started).toBe(true)
    expect(result.current.audioReady).toBe(true)

    act(() => result.current.setVolume(0.6))
    expect(result.current.volume).toBe(0.6)
    act(() => result.current.stop())
    expect(result.current.audioReady).toBe(false)
    unmount()
  })
})
