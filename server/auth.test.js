import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServer } from './index.js'
import { openDatabase } from './db/database.js'

let database, server, baseUrl, cookie, groqFetch

async function request(path, options = {}, useCookie = true) {
  const headers = { 'Content-Type': 'application/json', ...(useCookie && cookie ? { Cookie: cookie } : {}) }
  const serializedOptions = {
    ...options,
    headers: { ...headers, ...options.headers },
    body: options.body === undefined ? undefined : typeof options.body === 'string' ? options.body : JSON.stringify(options.body),
  }
  const response = await fetch(`${baseUrl}${path}`, serializedOptions)
  return response
}

beforeEach(async () => {
  const directory = await mkdtemp(join(tmpdir(), 'anchor-auth-test-'))
  database = await openDatabase({ filename: join(directory, 'auth.sqlite') })
  groqFetch = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'A private, gentle reply.' } }] }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  }))
  server = createServer({ database, env: { GROQ_API_KEY: 'test-key-never-returned', GROQ_MODEL: 'test-model' }, fetchImpl: groqFetch, schemaVersion: 5 })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve))
  await database.close()
})

describe('authenticated account and ownership boundary', () => {
  it('registers, logs in, restores a session, and logs out', async () => {
    const registration = await request('/api/auth/register', { method: 'POST', body: { email: 'CAREFUL@EXAMPLE.COM', password: 'StrongPassword!42', name: 'Maya' } })
    expect(registration.status).toBe(201)
    const registrationBody = await registration.json()
    expect(registrationBody.user).not.toHaveProperty('passwordHash')
    expect(registrationBody.patient).toMatchObject({ name: 'Maya' })

    const login = await request('/api/auth/login', { method: 'POST', body: { email: 'careful@example.com', password: 'StrongPassword!42' } })
    expect(login.status).toBe(200)
    const loginCookieHeader = login.headers.get('set-cookie')
    cookie = loginCookieHeader?.split(';')[0]
    expect(loginCookieHeader).toContain('anchor_session=')
    expect(loginCookieHeader).toContain('HttpOnly')

    const restored = await request('/api/auth/session')
    expect(restored.status).toBe(200)
    expect((await restored.json()).user.email).toBe('careful@example.com')

    const logout = await request('/api/auth/logout', { method: 'POST' })
    expect(logout.status).toBe(200)
    expect(logout.headers.get('set-cookie')).toContain('Max-Age=0')
  })

  it('fails closed instead of serving legacy patient routes when auth storage is unavailable', async () => {
    await new Promise((resolve) => server.close(resolve))
    server = createServer({ database, env: { GROQ_API_KEY: 'test-key-never-returned' }, fetchImpl: groqFetch, schemaVersion: 4 })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    baseUrl = `http://127.0.0.1:${server.address().port}`

    const profile = await request('/api/person', {}, false)
    expect(profile.status).toBe(503)
    expect((await profile.json()).code).toBe('auth_unavailable')
    const assistant = await request('/api/assistant', { method: 'POST', body: { input: 'hello' } }, false)
    expect(assistant.status).toBe(503)
    expect(groqFetch).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated requests and prevents cross-patient access', async () => {
    const unauthenticated = await request('/api/person')
    expect(unauthenticated.status).toBe(401)

    const registrationA = await request('/api/auth/register', { method: 'POST', body: { email: 'a@example.com', password: 'Password123!', name: 'A' } })
    const userA = await registrationA.json()
    const loginA = await request('/api/auth/login', { method: 'POST', body: { email: 'a@example.com', password: 'Password123!' } })
    cookie = loginA.headers.get('set-cookie')?.split(';')[0]

    const registrationB = await request('/api/auth/register', { method: 'POST', body: { email: 'b@example.com', password: 'Password123!', name: 'B' } }, false)
    expect(registrationB.status).toBe(201)
    const userB = await registrationB.json()

    const blocked = await request(`/api/person/memories/${userB.patient.id}`, { method: 'GET' })
    expect(blocked.status).toBe(404)
    expect(userA.patient.id).not.toBe(userB.patient.id)
  })

  it('isolates every patient-owned API resource between two authenticated users', async () => {
    const registrationA = await request('/api/auth/register', { method: 'POST', body: { email: 'owner-a@example.com', password: 'Password123!', name: 'Owner A' } }, false)
    const userA = await registrationA.json()
    const loginA = await request('/api/auth/login', { method: 'POST', body: { email: 'owner-a@example.com', password: 'Password123!' } }, false)
    const cookieA = loginA.headers.get('set-cookie')?.split(';')[0]

    const registrationB = await request('/api/auth/register', { method: 'POST', body: { email: 'owner-b@example.com', password: 'Password123!', name: 'Owner B' } }, false)
    const userB = await registrationB.json()
    const loginB = await request('/api/auth/login', { method: 'POST', body: { email: 'owner-b@example.com', password: 'Password123!' } }, false)
    const cookieB = loginB.headers.get('set-cookie')?.split(';')[0]
    expect(userA.patient.id).not.toBe(userB.patient.id)

    cookie = cookieB
    const profileB = await request('/api/person', { method: 'PUT', body: { name: 'Private Owner B', personalDetails: ['B-only profile detail'] } })
    expect(profileB.status).toBe(200)
    await request('/api/person/preferences', { method: 'PUT', body: { favoriteFlower: 'B-only flower' } })
    const memoryBResponse = await request('/api/person/memories', { method: 'POST', body: {
      id: 'private-memory-b', kind: 'story', name: 'B-only memory', story: 'B-only private story', createdAt: 1,
    } })
    expect(memoryBResponse.status).toBe(201)
    const assessmentBResponse = await request('/api/person/assessments', { method: 'POST', body: {
      instrumentId: 'test-screen', instrumentVersion: '1', consent: true, startedAt: 1,
      completedAt: 2, status: 'completed', result: { baselineDifficulty: 1, marker: 'B-only assessment' },
    } })
    expect(assessmentBResponse.status).toBe(201)
    const sessionBResponse = await request('/api/sessions', { method: 'POST', body: { activityId: 'faces', baselineDifficultyTier: 1 } })
    const sessionB = (await sessionBResponse.json()).session
    const eventBResponse = await request(`/api/sessions/${sessionB.id}/events`, { method: 'POST', body: { events: [
      { type: 'help_request', sessionId: sessionB.id, activityId: 'faces', at: 1 },
    ] } })
    expect(eventBResponse.status).toBe(201)

    cookie = cookieA
    expect((await request('/api/person')).status).toBe(200)
    expect((await (await request('/api/person')).json()).person.name).toBe('Owner A')
    expect((await request('/api/person?patientId=' + encodeURIComponent(userB.patient.id))).status).toBe(200)
    expect((await request('/api/person', { method: 'PUT', body: {
      patientId: userB.patient.id, name: 'Hijacked', personalDetails: [],
    } })).status).toBe(400)
    expect((await request('/api/person/preferences')).status).toBe(200)
    expect((await (await request('/api/person/preferences')).json()).preferences).toBeNull()
    expect((await request('/api/person/preferences', { method: 'PUT', body: { patientId: userB.patient.id, favoriteFlower: 'Hijacked' } })).status).toBe(400)
    expect((await request('/api/sessions', { method: 'POST', body: {
      personId: userB.patient.id, activityId: 'faces', baselineDifficultyTier: 1,
    } })).status).toBe(404)

    expect((await (await request('/api/person/memories')).json()).memories).toEqual([])
    expect((await request('/api/person/memories/private-memory-b')).status).toBe(404)
    expect((await request('/api/person/memories/private-memory-b', { method: 'PATCH', body: { name: 'Hijacked' } })).status).toBe(404)
    expect((await request('/api/person/memories/private-memory-b', { method: 'DELETE' })).status).toBe(404)
    expect((await (await request('/api/person/assessments')).json()).assessments).toEqual([])
    expect((await request(`/api/sessions/${sessionB.id}`)).status).toBe(404)
    expect((await request(`/api/sessions/${sessionB.id}`, { method: 'PATCH', body: { endedAt: 3 } })).status).toBe(404)
    expect((await request(`/api/sessions/${sessionB.id}/events`)).status).toBe(404)
    expect((await request(`/api/sessions/${sessionB.id}/events`, { method: 'POST', body: { events: [
      { type: 'help_request', sessionId: sessionB.id, activityId: 'faces', at: 4 },
    ] } })).status).toBe(404)

    cookie = cookieB
    expect((await (await request('/api/person')).json()).person.name).toBe('Private Owner B')
    expect((await (await request('/api/person/preferences')).json()).preferences.favoriteFlower).toBe('B-only flower')
    expect((await (await request('/api/person/memories/private-memory-b')).json()).memory.story).toBe('B-only private story')
    expect((await (await request('/api/person/assessments')).json()).assessments[0].result.marker).toBe('B-only assessment')
  })

  it('requires authentication for assistant calls and only sends the session patient context to Groq', async () => {
    const unauthenticated = await request('/api/assistant', { method: 'POST', body: { input: 'hello', ctx: {}, memories: [] } }, false)
    expect(unauthenticated.status).toBe(401)
    expect(groqFetch).not.toHaveBeenCalled()

    const registrationA = await request('/api/auth/register', { method: 'POST', body: { email: 'mo-a@example.com', password: 'Password123!', name: 'Mo Owner A' } }, false)
    const userA = await registrationA.json()
    const loginA = await request('/api/auth/login', { method: 'POST', body: { email: 'mo-a@example.com', password: 'Password123!' } }, false)
    const cookieA = loginA.headers.get('set-cookie')?.split(';')[0]
    cookie = cookieA
    await request('/api/person', { method: 'PUT', body: { name: 'Authorized A', personalDetails: ['A-only grounding detail'] } })
    await request('/api/person/preferences', { method: 'PUT', body: { favoriteFlower: 'A flower' } })
    await request('/api/person/memories', { method: 'POST', body: {
      id: 'a-memory', kind: 'story', name: 'A garden', story: 'Authorized A memory', createdAt: 1,
    } })

    const registrationB = await request('/api/auth/register', { method: 'POST', body: { email: 'mo-b@example.com', password: 'Password123!', name: 'Mo Owner B' }, headers: { Cookie: '' } }, false)
    const userB = await registrationB.json()
    const loginB = await request('/api/auth/login', { method: 'POST', body: { email: 'mo-b@example.com', password: 'Password123!' } }, false)
    cookie = loginB.headers.get('set-cookie')?.split(';')[0]
    await request('/api/person', { method: 'PUT', body: { name: 'Private B Identity', personalDetails: ['B-PRIVATE-PROFILE-MARKER'] } })
    await request('/api/person/memories', { method: 'POST', body: {
      id: 'b-memory', kind: 'story', name: 'Private B memory', story: 'B-PRIVATE-MEMORY-MARKER', createdAt: 1,
    } })

    cookie = cookieA
    const response = await request('/api/assistant', { method: 'POST', body: {
      input: 'hello',
      ctx: {
        userName: 'Private B Identity',
        personalDetails: ['B-PRIVATE-PROFILE-MARKER'],
        personalization: { favoriteFlower: 'B-PRIVATE-PREFERENCE-MARKER' },
        screenLabel: 'Familiar Faces', activeGame: 'faces', difficultyLevel: 2, activityState: 'active',
      },
      memories: [{ id: 'b-memory', name: 'Private B memory', story: 'B-PRIVATE-MEMORY-MARKER' }],
      history: [],
    } })
    expect(response.status).toBe(200)
    expect((await response.json()).reply).toBe('A private, gentle reply.')
    expect(userA.patient.id).not.toBe(userB.patient.id)
    expect(groqFetch).toHaveBeenCalledOnce()
    const [url, options] = groqFetch.mock.calls[0]
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions')
    expect(options.method).toBe('POST')
    expect(options.headers.Authorization).toBe('Bearer test-key-never-returned')
    expect(options.headers['Content-Type']).toBe('application/json')
    const groqPayload = JSON.parse(options.body)
    expect(groqPayload.model).toBe('test-model')
    expect(groqPayload.max_tokens).toBe(180)
    const systemPrompt = groqPayload.messages[0].content
    expect(systemPrompt).toContain('Authorized A')
    expect(systemPrompt).toContain('A-only grounding detail')
    expect(systemPrompt).toContain('Authorized A memory')
    expect(systemPrompt).toContain('A flower')
    expect(systemPrompt).toContain('Familiar Faces')
    expect(systemPrompt).toContain('game faces')
    expect(systemPrompt).toContain('difficulty 2')
    expect(systemPrompt).not.toContain('Private B Identity')
    expect(systemPrompt).not.toContain('B-PRIVATE-PROFILE-MARKER')
    expect(systemPrompt).not.toContain('B-PRIVATE-MEMORY-MARKER')
    expect(systemPrompt).not.toContain('B-PRIVATE-PREFERENCE-MARKER')
    expect(systemPrompt).not.toContain('test-key-never-returned')
  })

  it('classifies malformed, authentication, rate-limit, upstream, timeout, and network Groq failures', async () => {
    const registration = await request('/api/auth/register', { method: 'POST', body: { email: 'groq-errors@example.com', password: 'Password123!', name: 'Groq Tester' } }, false)
    await registration.json()
    const login = await request('/api/auth/login', { method: 'POST', body: { email: 'groq-errors@example.com', password: 'Password123!' } }, false)
    cookie = login.headers.get('set-cookie')?.split(';')[0]
    const assistantRequest = () => request('/api/assistant', { method: 'POST', body: { input: 'hello', ctx: {}, memories: [], history: [] } })

    const cases = [
      { result: new Response('not-json', { status: 200 }), code: 'groq_malformed_response', status: 502 },
      { result: new Response(JSON.stringify({ choices: [] }), { status: 200 }), code: 'groq_malformed_response', status: 502 },
      { result: new Response('invalid key', { status: 401 }), code: 'groq_auth_failed', status: 503 },
      { result: new Response('forbidden', { status: 403 }), code: 'groq_auth_failed', status: 503 },
      { result: new Response('rate limited', { status: 429 }), code: 'groq_rate_limited', status: 503 },
      { result: new Response('unavailable', { status: 503 }), code: 'groq_upstream_error', status: 502 },
      { result: Object.assign(new Error('timeout'), { name: 'TimeoutError' }), code: 'groq_timeout', status: 504 },
      { result: new TypeError('network unavailable'), code: 'groq_network_error', status: 502 },
    ]

    for (const scenario of cases) {
      if (scenario.result instanceof Error) groqFetch.mockRejectedValueOnce(scenario.result)
      else groqFetch.mockResolvedValueOnce(scenario.result)
      const response = await assistantRequest()
      const body = await response.json()
      expect(response.status).toBe(scenario.status)
      expect(body.code).toBe(scenario.code)
      expect(body.error).not.toContain('invalid key')
      expect(body.error).not.toContain('test-key-never-returned')
    }
  })
})
