import { appendEvents, createSession, endSession } from './apiClient'
import type { ActivityId, InteractionEvent, Part2InteractionEvent } from './types'
import { useApp } from '@/store/useApp'

const BATCH_SIZE = 10
const FLUSH_INTERVAL_MS = 5_000
const RETRY_DELAYS_MS = [1_000, 3_000, 8_000, 15_000]

interface QueuedEvent {
  id: string
  event: Part2InteractionEvent
}

export interface ActivitySessionHandle {
  readonly sessionId: string
  readonly activityId: ActivityId
  readonly startedAt: number
  backendSessionId: string | null
  startPromise: Promise<void> | null
  pendingEvents: QueuedEvent[]
  flushPromise: Promise<void> | null
  retryTimer: number | null
  flushTimer: number | null
  retryCount: number
  endedAt: number | null
  disposed: boolean
}

const activeSessions = new Map<string, ActivitySessionHandle>()
const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

function setOfflineStatus() {
  useApp.getState().setDataSyncStatus('offline', 'Game progress will sync when the connection is available.')
}

function queueEvent(handle: ActivitySessionHandle, event: Part2InteractionEvent) {
  handle.pendingEvents.push({ id: newId(), event })
  if (handle.pendingEvents.length >= BATCH_SIZE || event.type === 'activity_started' || event.type === 'activity_ended') {
    void flushSessionEvents(handle)
  } else if (handle.flushTimer === null) {
    handle.flushTimer = window.setTimeout(() => {
      handle.flushTimer = null
      void flushSessionEvents(handle)
    }, FLUSH_INTERVAL_MS)
  }
}

function scheduleRetry(handle: ActivitySessionHandle) {
  if (handle.disposed || handle.retryTimer !== null) return
  const delay = RETRY_DELAYS_MS[Math.min(handle.retryCount, RETRY_DELAYS_MS.length - 1)]
  handle.retryCount += 1
  handle.retryTimer = window.setTimeout(() => {
    handle.retryTimer = null
    if (!handle.backendSessionId) void ensureBackendSession(handle)
    else void flushSessionEvents(handle)
  }, delay)
}

async function ensureBackendSession(handle: ActivitySessionHandle): Promise<void> {
  if (handle.backendSessionId) return
  if (handle.startPromise) return handle.startPromise
  activeSessions.set(handle.sessionId, handle)
  handle.startPromise = createSession({ activityId: handle.activityId, appVersion: '0.1.0' })
    .then(async (session) => {
      handle.backendSessionId = session.id
      handle.retryCount = 0
      useApp.getState().setDataSyncStatus('synced')
      await flushSessionEvents(handle)
    })
    .catch(() => {
      setOfflineStatus()
      handle.startPromise = null
      scheduleRetry(handle)
    })
  return handle.startPromise
}

export function createActivitySession(activityId: ActivityId): ActivitySessionHandle {
  const handle: ActivitySessionHandle = {
    sessionId: newId(), activityId, startedAt: Date.now(), backendSessionId: null,
    startPromise: null, pendingEvents: [], flushPromise: null, retryTimer: null, flushTimer: null,
    retryCount: 0, endedAt: null, disposed: false,
  }
  return handle
}

export function recordActivityEvent(handle: ActivitySessionHandle, event: Part2InteractionEvent, log: (event: InteractionEvent) => void) {
  log(event)
  if (handle.disposed || handle.endedAt !== null) return
  if (!handle.startPromise && !handle.backendSessionId && event.type === 'activity_started') void ensureBackendSession(handle)
  queueEvent(handle, event)
}

export async function flushSessionEvents(handle: ActivitySessionHandle): Promise<void> {
  if (handle.flushPromise) return handle.flushPromise
  if (!handle.pendingEvents.length) return
  if (!handle.backendSessionId) {
    if (!handle.startPromise) void ensureBackendSession(handle)
    return
  }
  const backendSessionId = handle.backendSessionId

  handle.flushPromise = (async () => {
    try {
      while (handle.pendingEvents.length) {
        const batch = handle.pendingEvents.slice(0, BATCH_SIZE)
        const wireEvents = batch.map(({ id, event }) => ({ ...event, id, sessionId: backendSessionId }))
        await appendEvents(backendSessionId, wireEvents)
        handle.pendingEvents.splice(0, batch.length)
        handle.retryCount = 0
      }
      if (handle.endedAt !== null) await persistSessionEnd(handle)
      else useApp.getState().setDataSyncStatus('synced')
    } catch {
      setOfflineStatus()
      scheduleRetry(handle)
    } finally {
      handle.flushPromise = null
      if (handle.endedAt !== null && handle.pendingEvents.length === 0 && handle.backendSessionId) cleanupSession(handle)
    }
  })()
  return handle.flushPromise
}

async function persistSessionEnd(handle: ActivitySessionHandle) {
  if (!handle.backendSessionId || handle.endedAt === null) return
  try {
    await endSession(handle.backendSessionId, handle.endedAt)
    if (handle.pendingEvents.length === 0) cleanupSession(handle)
  } catch {
    setOfflineStatus()
    scheduleRetry(handle)
  }
}

function cleanupSession(handle: ActivitySessionHandle) {
  handle.disposed = true
  if (handle.retryTimer !== null) window.clearTimeout(handle.retryTimer)
  if (handle.flushTimer !== null) window.clearTimeout(handle.flushTimer)
  activeSessions.delete(handle.sessionId)
}

export function finishActivitySession(handle: ActivitySessionHandle, reason: 'finished' | 'left' | 'break', log: (event: InteractionEvent) => void) {
  if (handle.endedAt !== null) return
  const endedAt = Date.now()
  handle.endedAt = endedAt
  const endedEvent: Part2InteractionEvent = {
    type: 'activity_ended', at: endedAt, sessionId: handle.sessionId, activityId: handle.activityId, reason,
  }
  log(endedEvent)
  queueEvent(handle, endedEvent)
  if (!handle.backendSessionId && !handle.startPromise) void ensureBackendSession(handle)
}

export function getPendingSessionEventCount(sessionId: string) {
  return activeSessions.get(sessionId)?.pendingEvents.length ?? 0
}

export function resetSessionPersistenceForTests() {
  for (const handle of activeSessions.values()) cleanupSession(handle)
}
