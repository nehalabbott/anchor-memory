import { afterEach, describe, expect, it, vi } from 'vitest'
const api = vi.hoisted(() => ({
  appendEvents: vi.fn(),
  createSession: vi.fn(),
  endSession: vi.fn(),
}))
vi.mock('./apiClient', () => api)

import {
  createActivitySession, finishActivitySession, getPendingSessionEventCount,
  recordActivityEvent, resetSessionPersistenceForTests,
} from './sessionPersistence'
import type { ActivityId, InteractionEvent } from './types'

const startEvent = (sessionId: string, activityId: ActivityId) => ({
  type: 'activity_started' as const, at: Date.now(), sessionId, activityId,
})
const responseEvent = (sessionId: string, activityId: ActivityId, promptId: string) => ({
  type: 'response_submitted' as const, at: Date.now(), sessionId, activityId, promptId, responseId: 'answer', correct: true,
})

async function settle() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

async function start(activityId: ActivityId = 'faces') {
  const handle = createActivitySession(activityId)
  recordActivityEvent(handle, startEvent(handle.sessionId, activityId), vi.fn())
  await vi.waitFor(() => expect(api.appendEvents).toHaveBeenCalled())
  return handle
}

describe('backend game session and batched event persistence', () => {
  afterEach(() => {
    resetSessionPersistenceForTests()
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it('does not create a backend session until the user explicitly begins the activity', () => {
    createActivitySession('faces')
    expect(api.createSession).not.toHaveBeenCalled()
  })

  it('starts a backend session asynchronously and persists the existing start event', async () => {
    api.createSession.mockResolvedValue({ id: 'server-session-1' })
    api.appendEvents.mockResolvedValue({ inserted: 1 })
    const handle = createActivitySession('faces')
    const logged: InteractionEvent[] = []

    recordActivityEvent(handle, startEvent(handle.sessionId, 'faces'), (event) => logged.push(event))
    expect(logged[0]).toMatchObject({ type: 'activity_started', sessionId: handle.sessionId })
    await vi.waitFor(() => expect(api.appendEvents).toHaveBeenCalled())

    expect(api.createSession).toHaveBeenCalledWith({ activityId: 'faces', appVersion: '0.1.0' })
    expect(api.appendEvents.mock.calls[0][0]).toBe('server-session-1')
    expect(api.appendEvents.mock.calls[0][1][0]).toMatchObject({ type: 'activity_started', sessionId: 'server-session-1' })
  })

  it('batches several responses until the flush interval and bounds each request', async () => {
    vi.useFakeTimers()
    api.createSession.mockResolvedValue({ id: 'server-session-2' })
    api.appendEvents.mockResolvedValue({ inserted: 1 })
    const handle = await start()
    await settle()
    api.appendEvents.mockClear()

    for (let index = 0; index < 9; index += 1) {
      recordActivityEvent(handle, responseEvent(handle.sessionId, 'faces', `p-${index}`), vi.fn())
    }
    expect(api.appendEvents).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(5_000)

    expect(api.appendEvents).toHaveBeenCalledOnce()
    expect(api.appendEvents.mock.calls[0][1]).toHaveLength(9)
  })

  it('flushes queued events and ends the backend session at activity completion', async () => {
    api.createSession.mockResolvedValue({ id: 'server-session-3' })
    api.appendEvents.mockResolvedValue({ inserted: 1 })
    api.endSession.mockResolvedValue({ id: 'server-session-3', endedAt: Date.now() })
    const handle = await start()
    await settle()
    api.appendEvents.mockClear()
    const logged: InteractionEvent[] = []

    recordActivityEvent(handle, responseEvent(handle.sessionId, 'faces', 'p-1'), (event) => logged.push(event))
    finishActivitySession(handle, 'finished', (event) => logged.push(event))
    await vi.waitFor(() => expect(api.endSession).toHaveBeenCalledOnce())

    expect(logged.map((event) => event.type)).toEqual(['response_submitted', 'activity_ended'])
    expect(api.appendEvents).toHaveBeenCalledOnce()
    expect(api.appendEvents.mock.calls[0][1].map((event: InteractionEvent) => event.type)).toEqual(['response_submitted', 'activity_ended'])
    expect(api.endSession).toHaveBeenCalledWith('server-session-3', expect.any(Number))
  })

  it('retains a failed batch and retries with the same event IDs for server deduplication', async () => {
    vi.useFakeTimers()
    api.createSession.mockResolvedValue({ id: 'server-session-4' })
    api.appendEvents.mockResolvedValue({ inserted: 1 })
    const handle = await start()
    await settle()
    api.appendEvents.mockClear()
    api.appendEvents.mockRejectedValueOnce(new TypeError('backend unavailable'))
      .mockResolvedValueOnce({ inserted: 1 })
    recordActivityEvent(handle, responseEvent(handle.sessionId, 'faces', 'retry-prompt'), vi.fn())
    await vi.advanceTimersByTimeAsync(5_000)
    expect(getPendingSessionEventCount(handle.sessionId)).toBe(1)
    const firstId = api.appendEvents.mock.calls[0][1][0].id

    await vi.advanceTimersByTimeAsync(1_000)
    await settle()

    expect(api.appendEvents).toHaveBeenCalledTimes(2)
    expect(api.appendEvents.mock.calls[1][1][0].id).toBe(firstId)
    expect(getPendingSessionEventCount(handle.sessionId)).toBe(0)
  })

  it('does not upload unrelated speech/acoustic data as session events', async () => {
    api.createSession.mockResolvedValue({ id: 'server-session-5' })
    api.appendEvents.mockResolvedValue({ inserted: 1 })
    const handle = await start()
    await settle()
    const event = responseEvent(handle.sessionId, 'faces', 'p-1')
    recordActivityEvent(handle, event, vi.fn())
    finishActivitySession(handle, 'break', vi.fn())
    await vi.waitFor(() => expect(api.endSession).toHaveBeenCalled())
    const serialized = JSON.stringify(api.appendEvents.mock.calls)
    expect(serialized).not.toMatch(/transcript|amplitude|audioContext|MediaStream|speechActivity/i)
  })
})
