import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BackendApiError, getPerson, updatePerson, getPreferences, updatePreferences, listMemories, deleteMemory,
  createSession, endSession, appendEvents, getSessionEvents, listAssessments, createAssessment, requestAssistant,
} from './apiClient'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

describe('frontend backend API client', () => {
  it('uses the centralized same-origin API and returns validated person envelope', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(input).toBe('/api/person')
      return new Response(JSON.stringify({ person: { id: 'supported-person-1', name: 'M', personalDetails: [], createdAt: 1, updatedAt: 1 } }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    })
    globalThis.fetch = fetchMock as typeof fetch

    expect((await getPerson())?.id).toBe('supported-person-1')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('sends JSON for updates and propagates API status/code safely', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe('PUT')
      expect(JSON.parse(String(init?.body))).toEqual({ name: 'M', personalDetails: [] })
      return new Response(JSON.stringify({ person: { id: 'supported-person-1', name: 'M', personalDetails: [], createdAt: 1, updatedAt: 1 } }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    })
    globalThis.fetch = fetchMock as typeof fetch
    await updatePerson({ name: 'M', personalDetails: [] })

    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ error: 'Not found.', code: 'memory_not_found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch
    await expect(deleteMemory('absent')).rejects.toMatchObject({ status: 404, code: 'memory_not_found' })
  })

  it('handles unavailable backend and malformed success/error JSON', async () => {
    globalThis.fetch = vi.fn(async () => { throw new TypeError('connection refused') }) as typeof fetch
    await expect(getPerson()).rejects.toMatchObject({ status: 0, code: 'backend_unavailable' })

    globalThis.fetch = vi.fn(async () => new Response('<html>', { status: 200 })) as typeof fetch
    await expect(listMemories()).rejects.toMatchObject({ status: 502, code: 'invalid_response' })

    globalThis.fetch = vi.fn(async () => new Response('not-json', { status: 503 })) as typeof fetch
    await expect(getPerson()).rejects.toBeInstanceOf(BackendApiError)
  })

  it('rejects malformed successful response shapes', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ memories: {} }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch
    await expect(listMemories()).rejects.toMatchObject({ status: 502, code: 'invalid_response' })

    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ person: 17 }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch
    await expect(getPerson()).rejects.toMatchObject({ status: 502, code: 'invalid_response' })
  })

  it('sends assistant requests with same-origin credentials and validates the reply', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(input).toBe('/api/assistant')
      expect(init?.method).toBe('POST')
      expect(init?.credentials).toBe('same-origin')
      expect(init?.headers).toEqual({ 'Content-Type': 'application/json' })
      expect(JSON.parse(String(init?.body))).toMatchObject({ input: 'hello', ctx: { route: '/', screenLabel: 'Home', userName: 'M', state: 'normal' } })
      return new Response(JSON.stringify({ reply: 'Hello there.' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    globalThis.fetch = fetchMock as typeof fetch
    const context = { route: '/', screenLabel: 'Home', userName: 'M', state: 'normal' as const }
    await expect(requestAssistant({ input: 'hello', ctx: context, memories: [], history: [] })).resolves.toBe('Hello there.')

    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ reply: '' }), { status: 200 })) as typeof fetch
    await expect(requestAssistant({ input: 'hello', ctx: context, memories: [], history: [] })).rejects.toMatchObject({ code: 'invalid_response' })
  })

  it('maps preferences, session, event, and assessment service calls to the documented routes', async () => {
    const responses = [
      { preferences: null },
      { preferences: { favoriteFlower: 'Jasmine' } },
      { session: { id: 's1', personId: 'supported-person-1', activityId: 'faces', startedAt: 10 } },
      { session: { id: 's1', personId: 'supported-person-1', activityId: 'faces', startedAt: 10, endedAt: 20 } },
      { inserted: 1 },
      { events: [{ id: 'e1', sessionId: 's1', type: 'help_request', at: 11 }] },
      { assessments: [] },
      { assessment: { id: 'a1', personId: 'supported-person-1', instrumentId: 'generic', instrumentVersion: '1', consent: true, startedAt: 10, status: 'in_progress', createdAt: 10 } },
    ]
    const calls: Array<{ path: string; init?: RequestInit }> = []
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ path: String(input), init })
      return new Response(JSON.stringify(responses.shift()), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }) as typeof fetch

    expect(await getPreferences()).toBeNull()
    expect(await updatePreferences({ favoriteFlower: 'Jasmine' })).toEqual({ favoriteFlower: 'Jasmine' })
    const session = await createSession({ activityId: 'faces' })
    expect((await endSession(session.id, 20)).endedAt).toBe(20)
    expect(await appendEvents(session.id, [{ type: 'help_request', at: 11 }])).toEqual({ inserted: 1 })
    expect((await getSessionEvents(session.id))[0].type).toBe('help_request')
    expect(await listAssessments()).toEqual([])
    expect((await createAssessment({ instrumentId: 'generic', instrumentVersion: '1', consent: true, startedAt: 10, status: 'in_progress' })).id).toBe('a1')
    expect(calls.map((call) => call.path)).toEqual([
      '/api/person/preferences', '/api/person/preferences', '/api/sessions', '/api/sessions/s1',
      '/api/sessions/s1/events', '/api/sessions/s1/events?limit=200', '/api/person/assessments', '/api/person/assessments',
    ])
  })
})
