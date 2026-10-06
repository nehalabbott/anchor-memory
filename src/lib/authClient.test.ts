import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSession, login, logout, register } from './apiClient'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

describe('browser authentication client', () => {
  it('restores a session with same-origin cookie handling', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('/api/auth/session')
      expect(init?.credentials).toBe('same-origin')
      return new Response(JSON.stringify({
        user: { id: 'user-1', email: 'maya@example.com', role: 'caregiver', createdAt: 1, updatedAt: 1 },
        patient: { id: 'patient-1', name: 'Maya', personalDetails: [], createdAt: 1, updatedAt: 1 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    globalThis.fetch = fetchMock as typeof fetch

    const session = await getSession()
    expect(session?.patient.name).toBe('Maya')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('reports anonymous sessions without treating a 401 as a network failure', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ error: 'Unauthenticated.', code: 'invalid_session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch

    await expect(getSession()).resolves.toBeNull()
  })

  it('logs in and registers through the authenticated API', async () => {
    const responses = [
      { user: { id: 'user-1', email: 'maya@example.com', role: 'caregiver', createdAt: 1, updatedAt: 1 }, patient: { id: 'patient-1', name: 'Maya', personalDetails: [], createdAt: 1, updatedAt: 1 } },
      { user: { id: 'user-2', email: 'leo@example.com', role: 'caregiver', createdAt: 2, updatedAt: 2 }, patient: { id: 'patient-2', name: 'Leo', personalDetails: [], createdAt: 2, updatedAt: 2 } },
    ]
    const calls: Array<{ path: string; init?: RequestInit }> = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ path: String(input), init })
      return new Response(JSON.stringify(responses.shift()!), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    globalThis.fetch = fetchMock as typeof fetch

    expect((await login({ email: 'maya@example.com', password: 'StrongPassword!42' })).patient.id).toBe('patient-1')
    expect((await register({ email: 'leo@example.com', password: 'StrongPassword!42', name: 'Leo' })).patient.id).toBe('patient-2')
    expect(calls.map((call) => call.path)).toEqual(['/api/auth/login', '/api/auth/register'])
  })

  it('clears the server session with logout', async () => {
    const calls: Array<{ path: string; init?: RequestInit }> = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ path: String(input), init })
      return new Response(JSON.stringify({ loggedOut: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    globalThis.fetch = fetchMock as typeof fetch

    await logout()
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(calls[0].init?.method).toBe('POST')
  })
})
