import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer, startServer } from './index.js'
import { openDatabase } from './db/database.js'

const TEST_ENV = { GROQ_API_KEY: 'unit-test-only-key', GROQ_MODEL: 'unit-test-model' }
const jsonHeaders = { 'Content-Type': 'application/json' }
let database
let server
let baseUrl
let directory
let mockFetch

async function listen(db = database) {
  server = createServer({ database: db, env: TEST_ENV, fetchImpl: mockFetch, schemaVersion: 5, authEnabled: false })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
}

async function closeServer() {
  if (server?.listening) await new Promise((resolve) => server.close(resolve))
  server = undefined
}

async function api(path, { method = 'GET', body, headers = jsonHeaders } = {}) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: body === undefined && method === 'GET' ? undefined : headers,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
}

async function payload(response) {
  if (response.status === 204) return undefined
  return response.json()
}

async function createPerson() {
  return api('/api/person', { method: 'PUT', body: { name: 'Margaret', personalDetails: ['Enjoys gardening'] } })
}

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'anchor-api-test-'))
  database = await openDatabase({ filename: join(directory, 'api.sqlite') })
  mockFetch = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'A gentle reply.' } }] }), {
    status: 200, headers: jsonHeaders,
  }))
  await listen()
})

afterEach(async () => {
  await closeServer()
  if (database) await database.close()
  database = undefined
  await rm(directory, { recursive: true, force: true })
})

describe('local application API', () => {
  it('reports health without revealing configuration values', async () => {
    const response = await api('/api/health')
    const body = await payload(response)
    expect(response.status).toBe(200)
    expect(body).toMatchObject({ ok: true, groqConfigured: true, databaseReady: true, schemaVersion: 5 })
    expect(JSON.stringify(body)).not.toContain(TEST_ENV.GROQ_API_KEY)
  })

  it('gets an empty person then creates and updates the stable supported person', async () => {
    expect((await payload(await api('/api/person'))).person).toBeNull()
    const created = await payload(await createPerson())
    expect(created.person).toMatchObject({ id: 'supported-person-1', name: 'Margaret', personalDetails: ['Enjoys gardening'] })
    const updated = await payload(await api('/api/person', { method: 'PUT', body: { name: 'M. Anchor', personalDetails: [] } }))
    expect(updated.person.name).toBe('M. Anchor')
  })

  it('stores unset and populated structured preferences without fabricated defaults', async () => {
    await createPerson()
    expect((await payload(await api('/api/person/preferences'))).preferences).toBeNull()
    const written = await payload(await api('/api/person/preferences', {
      method: 'PUT', body: {
        theme: 'calming-pastels', favoriteColors: ['green'], favoriteFlower: 'Jasmine', favoriteBird: 'Robin', favoriteSong: 'Morning Light',
        lifeActivityTags: ['gardening', 'cooking'], favoriteFoods: ['Mango'], calmingSongReference: 'local-track-1',
      },
    }))
    expect(written.preferences).toMatchObject({
      theme: 'calming-pastels', favoriteColors: ['green'], favoriteFlower: 'Jasmine', favoriteBird: 'Robin', favoriteSong: 'Morning Light',
      lifeActivityTags: ['gardening', 'cooking'], favoriteFoods: ['Mango'], calmingSongReference: 'local-track-1',
    })
    expect((await payload(await api('/api/person/preferences'))).preferences.favoriteFlower).toBe('Jasmine')
  })

  it('supports memory metadata CRUD while preserving media references only', async () => {
    await createPerson()
    const memory = {
      id: 'memory-1', kind: 'person', name: 'Lily', relationship: 'friend', story: 'We shared tea.',
      people: ['Lily'], places: ['garden'], activities: ['tea'], objects: ['cup'],
      events: [{ id: 'event-1', title: 'Shared tea', sequenceOrder: 1 }],
      photo: { id: 'indexed-photo-1', kind: 'photo', storage: 'indexeddb', mimeType: 'image/jpeg' },
      createdAt: 10,
    }
    const created = await payload(await api('/api/person/memories', { method: 'POST', body: memory }))
    expect(created.memory).toMatchObject(memory)
    expect(created.memory.photo.id).toBe('indexed-photo-1')

    const listed = await payload(await api('/api/person/memories'))
    expect(listed.memories).toHaveLength(1)
    expect((await payload(await api('/api/person/memories/memory-1'))).memory.name).toBe('Lily')
    const patched = await payload(await api('/api/person/memories/memory-1', { method: 'PATCH', body: { name: 'Lily M.' } }))
    expect(patched.memory.name).toBe('Lily M.')
    expect(patched.memory.photo).toEqual(memory.photo)
    expect((await api('/api/person/memories/memory-1', { method: 'DELETE' })).status).toBe(204)
    expect((await api('/api/person/memories/memory-1')).status).toBe(404)
  })

  it('creates and ends sessions and inserts/retrieves existing interaction event shapes', async () => {
    await createPerson()
    const created = await payload(await api('/api/sessions', { method: 'POST', body: { activityId: 'faces', appVersion: '0.1.0', baselineDifficultyTier: 1 } }))
    expect(created.session).toMatchObject({ personId: 'supported-person-1', activityId: 'faces', baselineDifficultyTier: 1, currentDifficultyTier: 1 })
    const at = Date.now()
    const response = await api(`/api/sessions/${created.session.id}/events`, { method: 'POST', body: { events: [
      { type: 'response_submitted', sessionId: created.session.id, activityId: 'faces', promptId: 'p1', responseId: 'r1', correct: false, at, responseLatencyMs: 1800, difficultyTier: 1 },
      { type: 'speech_cue', sessionId: created.session.id, phrase: 'help me', at: at + 1 },
      { type: 'difficulty_changed', sessionId: created.session.id, activityId: 'faces', previousLevel: 3, newLevel: 2, reason: 'sustained_errors', at: at + 2 },
    ] } })
    expect(response.status).toBe(201)
    expect(await payload(response)).toEqual({ inserted: 3 })
    const events = (await payload(await api(`/api/sessions/${created.session.id}/events`))).events
    expect(events[0]).toMatchObject({ type: 'response_submitted', correct: false, responseLatencyMs: 1800, difficultyTier: 1 })
    expect(events[1]).not.toHaveProperty('phrase')
    expect(events[2]).toMatchObject({ type: 'difficulty_changed', previousLevel: 3, newLevel: 2, reason: 'sustained_errors' })
    const endedAt = Date.now()
    const ended = await payload(await api(`/api/sessions/${created.session.id}`, { method: 'PATCH', body: { endedAt, currentDifficultyTier: 2 } }))
    expect(ended.session).toMatchObject({ endedAt, currentDifficultyTier: 2 })
  })

  it('creates and retrieves consented generic assessment records', async () => {
    await createPerson()
    expect((await payload(await api('/api/person/assessments'))).assessments).toEqual([])
    const now = Date.now()
    const created = await payload(await api('/api/person/assessments', { method: 'POST', body: {
      instrumentId: 'anchor-demo-screen', instrumentVersion: '1', consent: true,
      startedAt: now, completedAt: now + 1000, status: 'completed', result: { domains: { recall: 3 } },
    } }))
    expect(created.assessment).toMatchObject({ instrumentId: 'anchor-demo-screen', consent: true, status: 'completed', result: { domains: { recall: 3 } } })
    expect((await payload(await api('/api/person/assessments'))).assessments).toHaveLength(1)
    expect((await api('/api/person/assessments', { method: 'POST', body: { instrumentId: 'x', instrumentVersion: '1', consent: false, startedAt: now, status: 'in_progress' } })).status).toBe(403)
  })

  it('rejects malformed bodies, invalid enums, oversized event payloads, and unknown IDs safely', async () => {
    expect((await api('/api/person', { method: 'PUT', body: '{bad json' })).status).toBe(400)
    expect((await api('/api/assistant', { method: 'POST', body: '{bad json' })).status).toBe(400)
    expect((await api('/api/person', { method: 'PUT', headers: { 'Content-Type': 'text/plain' }, body: '{}' })).status).toBe(415)
    expect((await api('/api/person', { method: 'PUT', body: { name: 'M', personalDetails: ['x'.repeat(1_100_000)] } })).status).toBe(413)
    expect((await api('/api/person', { method: 'PUT', body: { name: '  ', personalDetails: [] } })).status).toBe(400)
    await createPerson()
    expect((await api('/api/person/assessments', { method: 'POST', body: {
      instrumentId: 'generic', instrumentVersion: '1', consent: true, startedAt: Date.now(),
      status: 'in_progress', result: { note: 'x'.repeat(33_000) },
    } })).status).toBe(413)
    expect((await api('/api/person/memories', { method: 'POST', body: { id: 'bad', kind: 'unknown', name: 'Bad', story: '' } })).status).toBe(400)
    expect((await api('/api/person/memories/not-found')).status).toBe(404)
    expect((await api('/api/sessions/unknown/events')).status).toBe(404)
    expect((await api('/api/not-a-route')).status).toBe(404)
  })

  it('uses bound SQL parameters for injection-shaped text and rejects unsafe IDs', async () => {
    await createPerson()
    const injectedText = "Lily' OR 1=1 --"
    const created = await api('/api/person/memories', { method: 'POST', body: { id: 'safe-id', kind: 'story', name: injectedText, story: 'text' } })
    expect(created.status).toBe(201)
    expect((await payload(await api('/api/person/memories'))).memories[0].name).toBe(injectedText)
    expect((await api("/api/person/memories/x' OR 1=1 --")).status).toBe(400)
  })

  it('keeps /api/assistant on the existing Groq contract without calling an external service in tests', async () => {
    const response = await api('/api/assistant', { method: 'POST', body: {
      input: 'Hello', ctx: { screenLabel: 'Home' }, memories: [], history: [],
    } })
    expect(response.status).toBe(200)
    expect(await payload(response)).toEqual({ reply: 'A gentle reply.' })
    expect(mockFetch).toHaveBeenCalledOnce()
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.groq.com/openai/v1/chat/completions')
  })

  it('preserves database data after the server is stopped and reopened', async () => {
    await createPerson()
    await closeServer()
    await database.close()
    database = await openDatabase({ filename: join(directory, 'api.sqlite') })
    await listen()
    expect((await payload(await api('/api/person'))).person.name).toBe('Margaret')
  })

  it('initializes and migrates the database before startServer accepts requests', async () => {
    await closeServer()
    await database.close()
    const result = await startServer({ filename: join(directory, 'startup.sqlite'), port: 0 })
    server = result.server
    database = result.database
    baseUrl = `http://127.0.0.1:${server.address().port}`

    const health = await payload(await api('/api/health'))
    expect(health).toMatchObject({ ok: true, databaseReady: true, schemaVersion: 5 })
  })
})
