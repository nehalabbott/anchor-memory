import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startVoiceAwareness } from './voiceAwareness'
import { useApp } from '@/store/useApp'

type RecognitionLike = {
  continuous: boolean
  lang: string
  interimResults: boolean
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  onresult: ((event: unknown) => void) | null
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
}

class FakeRecognition implements RecognitionLike {
  static instances: FakeRecognition[] = []
  continuous = false
  lang = ''
  interimResults = false
  onend: (() => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onresult: ((event: unknown) => void) | null = null
  start = vi.fn()
  stop = vi.fn()

  constructor() { FakeRecognition.instances.push(this) }
}

function fakeStream() {
  const track = { stop: vi.fn() }
  const stream = { getTracks: () => [track] } as unknown as MediaStream
  return { stream, track }
}

function setupAudioContext() {
  const source = { connect: vi.fn(), disconnect: vi.fn() }
  const analyser = {
    fftSize: 0,
    getFloatTimeDomainData: vi.fn((samples: Float32Array) => samples.fill(0)),
    disconnect: vi.fn(),
  }
  const context = {
    createMediaStreamSource: vi.fn(() => source),
    createAnalyser: vi.fn(() => analyser),
    close: vi.fn(() => Promise.resolve()),
  }
  class FakeAudioContext { constructor() { return context as unknown as AudioContext } }
  Object.defineProperty(window, 'AudioContext', { configurable: true, value: FakeAudioContext })
  return { context, source, analyser }
}

function setupMedia(stream: MediaStream) {
  const getUserMedia = vi.fn().mockResolvedValue(stream)
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
  return getUserMedia
}

const callbacks = () => ({
  onListening: vi.fn(),
  onTranscript: vi.fn(),
  onSignals: vi.fn(),
  onError: vi.fn(),
  onPermissionDenied: vi.fn(),
})

describe('global voice-awareness resource lifecycle', () => {
  beforeEach(() => {
    FakeRecognition.instances = []
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: FakeRecognition })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    delete (window as Window & { SpeechRecognition?: unknown }).SpeechRecognition
    delete (window as Window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    delete (window as Window & { AudioContext?: unknown }).AudioContext
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
  })

  it('stops recognition, tracks, analyser nodes, and AudioContext when permission is withdrawn', async () => {
    const { stream, track } = fakeStream()
    setupMedia(stream)
    const { context, source, analyser } = setupAudioContext()
    const handlers = callbacks()
    useApp.setState({ privacyShieldEnabled: false, voiceListeningEnabled: true })
    startVoiceAwareness({ isAllowed: () => !useApp.getState().privacyShieldEnabled && useApp.getState().voiceListeningEnabled, ...handlers })
    await Promise.resolve()
    await Promise.resolve()

    expect(FakeRecognition.instances).toHaveLength(1)
    useApp.getState().setPrivacyShieldEnabled(true)

    expect(FakeRecognition.instances[0].stop).toHaveBeenCalledOnce()
    expect(track.stop).toHaveBeenCalledOnce()
    expect(source.disconnect).toHaveBeenCalledOnce()
    expect(analyser.disconnect).toHaveBeenCalledOnce()
    expect(context.close).toHaveBeenCalledOnce()
    expect(handlers.onListening).toHaveBeenLastCalledWith(false)
    vi.advanceTimersByTime(1_000)
    expect(FakeRecognition.instances).toHaveLength(1)
  })

  it('does not restart recognition when the shield changes during the restart delay', async () => {
    const { stream, track } = fakeStream()
    setupMedia(stream)
    const handlers = callbacks()
    let allowed = true
    startVoiceAwareness({ isAllowed: () => allowed, ...handlers })
    await Promise.resolve()
    await Promise.resolve()

    FakeRecognition.instances[0].onend?.()
    allowed = false
    vi.advanceTimersByTime(400)

    expect(FakeRecognition.instances).toHaveLength(1)
    expect(track.stop).toHaveBeenCalledOnce()
  })

  it('does not request microphone permission in browsers without SpeechRecognition', async () => {
    delete (window as Window & { SpeechRecognition?: unknown }).SpeechRecognition
    delete (window as Window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    const { stream } = fakeStream()
    const getUserMedia = setupMedia(stream)
    const handlers = callbacks()

    startVoiceAwareness({ isAllowed: () => true, ...handlers })
    await Promise.resolve()

    expect(getUserMedia).not.toHaveBeenCalled()
    expect(handlers.onError).toHaveBeenCalledWith(expect.stringContaining('unavailable in this browser'))
  })

  it('reports microphone permission denial without starting recognition', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' }))
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
    const handlers = callbacks()

    startVoiceAwareness({ isAllowed: () => true, ...handlers })
    await Promise.resolve()
    await Promise.resolve()

    expect(handlers.onPermissionDenied).toHaveBeenCalledOnce()
    expect(handlers.onError).toHaveBeenCalledWith(expect.stringContaining('Mic is off and private'))
    expect(FakeRecognition.instances).toHaveLength(0)
  })

  it('reports SpeechRecognition permission denial and releases the media track', async () => {
    const { stream, track } = fakeStream()
    setupMedia(stream)
    const handlers = callbacks()
    startVoiceAwareness({ isAllowed: () => true, ...handlers })
    await Promise.resolve()
    await Promise.resolve()

    FakeRecognition.instances[0].onerror?.({ error: 'not-allowed' })

    expect(handlers.onPermissionDenied).toHaveBeenCalledOnce()
    expect(handlers.onError).toHaveBeenCalledWith(expect.stringContaining('permission was blocked'))
    expect(track.stop).toHaveBeenCalledOnce()
  })
})
