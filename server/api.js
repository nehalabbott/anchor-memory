import { SUPPORTED_PERSON_ID } from './repositories/personRepository.js'
import {
  ApiError, assertAllowedKeys, boundedJsonObject, optionalInteger, optionalString, requireObject,
  optionalTimestamp, readJson, requiredString, stringArray, validId,
} from './services/validation.js'
import {
  makeSessionClearedCookie,
  makeSessionCookie,
  sessionTokenFromCookie,
} from './repositories/authRepository.js'
import { hashPassword, normalizeEmail, safeUser, validateLogin, validateRegistration, verifyPassword } from './auth.js'

const API_BODY_LIMIT = 1_048_576
const ASSISTANT_BODY_LIMIT = 256_000
const EVENT_BODY_LIMIT = 512_000
const EVENT_ITEM_LIMIT = 16_384
const ASSESSMENT_DATA_LIMIT = 32_768
const RELATIONSHIPS = new Set(['son', 'daughter', 'spouse', 'grandchild', 'grandparent', 'friend', 'other'])
const MEMORY_KINDS = new Set(['person', 'story', 'place', 'activity', 'object', 'event', 'sequence'])
const EVENT_TYPES = new Set([
  'wrong_answer', 'help_request', 'restart', 'inactivity', 'rapid_taps', 'speech_cue',
  'activity_started', 'activity_paused', 'activity_resumed', 'activity_ended', 'memory_presented', 'response_submitted', 'difficulty_changed',
])
const EVENT_KEYS = [
  'id', 'eventId', 'sessionId', 'type', 'at', 'timestamp', 'activityId', 'promptId', 'responseId',
  'memoryId', 'reason', 'ms', 'count', 'phrase', 'correct', 'responseLatencyMs', 'difficultyTier', 'previousLevel', 'newLevel',
]
const MEDIA_KEYS = ['id', 'kind', 'storage', 'mimeType', 'altText']
const MEMORY_KEYS = [
  'id', 'kind', 'name', 'relationship', 'story', 'people', 'places', 'activities', 'objects', 'events', 'photo', 'voice', 'createdAt',
]
const PREFERENCE_KEYS = [
  'theme', 'favoriteColors', 'favoriteFlower', 'favoriteBird', 'favoriteAnimal', 'favoriteSong',
  'favoriteFoods', 'favoriteActivities', 'favoritePlaces', 'lifeActivityTags', 'calmingSongReference',
]
const ASSISTANT_SCREENS = new Set([
  'Home', 'Choose an Activity', 'Your Memory Garden', 'My Journey', 'Cognitive Check-in', 'Your Memories',
  'Familiar Faces', 'Pattern & Shape Match', 'Sequence Memory', 'Odd One Out', 'Dual N-Back', 'Trail Making', 'Category Association',
])
const ASSISTANT_GAMES = new Set(['faces', 'pattern', 'sequence', 'category', 'dual-n-back', 'trail-making', 'category-association'])
const ASSISTANT_DOMAINS = new Set(['Memory', 'Visual Reasoning', 'Working Memory', 'Executive Function', 'Language'])

function send(response, status, body) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(body))
}

function decodeId(value) {
  try { return validId(decodeURIComponent(value)) } catch { throw new ApiError(400, 'Identifier is malformed.') }
}

function parseMedia(value, expectedKind) {
  if (value === undefined || value === null) return value
  assertAllowedKeys(value, MEDIA_KEYS, 'Media reference')
  const reference = {
    id: requiredString(value.id, 'Media reference id', 500),
    kind: requiredString(value.kind, 'Media kind', 10),
    storage: requiredString(value.storage, 'Media storage', 16),
    mimeType: requiredString(value.mimeType, 'Media MIME type', 100),
  }
  if (reference.id.startsWith('data:') || reference.kind !== expectedKind || !['indexeddb', 'remote'].includes(reference.storage)) {
    throw new ApiError(400, 'Media reference is invalid; media bytes must remain in IndexedDB.')
  }
  const altText = optionalString(value.altText, 'Media alt text', 300)
  if (altText) reference.altText = altText
  return reference
}

function parseMemoryEvent(value) {
  requireObject(value, 'Memory event')
  assertAllowedKeys(value, ['id', 'title', 'story', 'occurredAt', 'people', 'place', 'activity', 'objects', 'sequenceOrder', 'photo', 'voice'], 'Memory event')
  const event = {
    id: requiredString(value.id, 'Memory event id', 128),
    title: requiredString(value.title, 'Memory event title', 200),
  }
  for (const field of ['story', 'occurredAt', 'place', 'activity']) {
    const parsed = optionalString(value[field], `Memory event ${field}`, 2000)
    if (parsed) event[field] = parsed
  }
  for (const field of ['people', 'objects']) {
    const parsed = stringArray(value[field], `Memory event ${field}`)
    if (parsed) event[field] = parsed
  }
  const sequenceOrder = optionalInteger(value.sequenceOrder, 'Sequence order', { min: 1, max: 1000 })
  if (sequenceOrder !== undefined) event.sequenceOrder = sequenceOrder
  const photo = parseMedia(value.photo, 'photo')
  const voice = parseMedia(value.voice, 'voice')
  if (photo) event.photo = photo
  if (voice) event.voice = voice
  return event
}

function parseMemory(value, { patch = false } = {}) {
  assertAllowedKeys(value, MEMORY_KEYS, 'Memory')
  const memory = {}
  if (!patch || value.id !== undefined) memory.id = validId(value.id, 'Memory id')
  if (!patch || value.kind !== undefined) {
    const kind = requiredString(value.kind, 'Memory kind', 20)
    if (!MEMORY_KINDS.has(kind)) throw new ApiError(400, 'Memory kind is not supported.')
    memory.kind = kind
  }
  if (!patch || value.name !== undefined) memory.name = requiredString(value.name, 'Memory name', 160)
  if (!patch || value.story !== undefined) memory.story = value.story === null ? '' : (typeof value.story === 'string' && value.story.length <= 10000 ? value.story : (() => { throw new ApiError(400, 'Memory story must be at most 10000 characters.') })())
  if (value.relationship !== undefined) {
    if (value.relationship === null || value.relationship === '') memory.relationship = undefined
    else if (typeof value.relationship !== 'string' || !RELATIONSHIPS.has(value.relationship)) throw new ApiError(400, 'Memory relationship is not supported.')
    else memory.relationship = value.relationship
  }
  for (const field of ['people', 'places', 'activities', 'objects']) {
    if (value[field] !== undefined) memory[field] = stringArray(value[field], `Memory ${field}`)
  }
  if (value.events !== undefined) {
    if (value.events !== null && (!Array.isArray(value.events) || value.events.length > 100)) throw new ApiError(400, 'Memory events must be an array of at most 100 items.')
    memory.events = value.events === null ? undefined : value.events.map(parseMemoryEvent)
  }
  for (const field of ['photo', 'voice']) {
    if (value[field] !== undefined) memory[field] = parseMedia(value[field], field === 'photo' ? 'photo' : 'voice')
  }
  if (value.createdAt !== undefined) memory.createdAt = optionalTimestamp(value.createdAt, 'Memory createdAt', { required: true })
  return memory
}

function parsePreferences(value) {
  assertAllowedKeys(value, PREFERENCE_KEYS, 'Preferences')
  const preferences = {}
  for (const field of ['favoriteColors', 'favoriteFoods', 'favoriteActivities', 'favoritePlaces', 'lifeActivityTags']) {
    if (value[field] !== undefined) preferences[field] = stringArray(value[field], field)
  }
  for (const field of ['favoriteFlower', 'favoriteBird', 'favoriteAnimal', 'favoriteSong', 'calmingSongReference']) {
    if (value[field] !== undefined) preferences[field] = value[field] === null ? undefined : optionalString(value[field], field, field === 'calmingSongReference' ? 500 : 120)
  }
  if (value.theme !== undefined) {
    if (!['high-contrast', 'calming-pastels', 'warm-vintage'].includes(value.theme)) {
      throw new ApiError(400, 'Preference theme is not supported.')
    }
    preferences.theme = value.theme
  }
  return preferences
}

function parseEvent(value, pathSessionId) {
  requireObject(value, 'Interaction event')
  assertAllowedKeys(value, EVENT_KEYS, 'Interaction event')
  const type = requiredString(value.type, 'Event type', 40)
  if (!EVENT_TYPES.has(type)) throw new ApiError(400, 'Event type is not supported.')
  if (value.sessionId !== undefined && validId(value.sessionId, 'Event session id') !== pathSessionId) {
    throw new ApiError(400, 'Event session id does not match the request path.')
  }
  const at = optionalTimestamp(value.at ?? value.timestamp, 'Event timestamp', { required: true })
  const event = { id: value.id === undefined && value.eventId === undefined ? undefined : validId(value.id ?? value.eventId, 'Event id'), type, at, sessionId: pathSessionId }
  const strings = ['activityId', 'promptId', 'responseId', 'memoryId', 'reason', 'phrase']
  for (const field of strings) {
    if (value[field] !== undefined) event[field] = optionalString(value[field], `Event ${field}`, field === 'phrase' ? 160 : 128)
  }
  if (value.correct !== undefined) {
    if (typeof value.correct !== 'boolean') throw new ApiError(400, 'Event correctness must be a boolean.')
    event.correct = value.correct
  }
  if (value.ms !== undefined) event.ms = optionalInteger(value.ms, 'Event duration', { max: 86_400_000 })
  if (value.count !== undefined) event.count = optionalInteger(value.count, 'Event count', { max: 100_000 })
  if (value.responseLatencyMs !== undefined) event.responseLatencyMs = optionalInteger(value.responseLatencyMs, 'Response latency', { max: 86_400_000 })
  if (value.difficultyTier !== undefined) event.difficultyTier = optionalInteger(value.difficultyTier, 'Difficulty tier')
  if (type === 'difficulty_changed') {
    event.previousLevel = optionalInteger(value.previousLevel, 'Previous difficulty', { min: 1, max: 5, required: true })
    event.newLevel = optionalInteger(value.newLevel, 'New difficulty', { min: 1, max: 5, required: true })
    if (event.previousLevel === event.newLevel) throw new ApiError(400, 'Difficulty change must move to a different level.')
    if (!['sustained_errors', 'slow_responses', 'repeated_rapid_taps', 'sustained_difficulty', 'sustained_accuracy', 'requested_support'].includes(value.reason)) {
      throw new ApiError(400, 'Difficulty change reason is not supported.')
    }
  }
  if (Buffer.byteLength(JSON.stringify(event)) > EVENT_ITEM_LIMIT) throw new ApiError(413, 'Interaction event payload is too large.', 'payload_too_large')
  return event
}

async function requirePerson(repositories, personId, userId) {
  if (userId && !await repositories.auth.getPatientById(userId, personId)) {
    throw new ApiError(404, 'Supported person was not found.', 'person_not_found')
  }
  const resolvedPersonId = personId ?? SUPPORTED_PERSON_ID
  const person = await repositories.person.get(resolvedPersonId)
  if (!person) throw new ApiError(404, 'Supported person has not been created.', 'person_not_found')
  return person
}

async function requireAuthenticatedContext(repositories, request) {
  const token = sessionTokenFromCookie(request.headers.cookie)
  const session = await repositories.auth.getSession(token)
  if (!session) throw new ApiError(401, 'Sign in to continue.', 'authentication_required')
  const user = await repositories.auth.getUserForSession(session)
  const patient = await repositories.auth.getPatientById(session.userId, session.patientId)
  if (!user || !patient) throw new ApiError(401, 'The session is no longer valid.', 'authentication_required')
  return { token, session, user, patient }
}

async function requireSession(repositories, sessionId) {
  const session = await repositories.sessions.get(sessionId)
  if (!session) throw new ApiError(404, 'Session was not found.', 'session_not_found')
  return session
}

async function handlePerson(request, response, repositories, personId, userId) {
  if (userId) {
    const patient = await repositories.auth.getPatientById(userId, personId)
    if (!patient) throw new ApiError(404, 'Supported person was not found.', 'person_not_found')
    if (request.method === 'GET') return send(response, 200, { person: patient })
    if (request.method === 'PUT') {
      const body = await readJson(request, API_BODY_LIMIT)
      assertAllowedKeys(body, ['name', 'personalDetails'], 'Person')
      const name = requiredString(body.name, 'Name', 120)
      const personalDetails = stringArray(body.personalDetails, 'Personal details', { maxItems: 50, maxLength: 500, nullable: false })
      const updated = await repositories.auth.updatePatient(userId, patient.id, { name, personalDetails })
      if (!updated) throw new ApiError(404, 'Supported person was not found.', 'person_not_found')
      return send(response, 200, { person: updated })
    }
    throw new ApiError(405, 'Method not allowed.', 'method_not_allowed')
  }
  if (request.method === 'GET') return send(response, 200, { person: await repositories.person.get(personId ?? SUPPORTED_PERSON_ID) })
  if (request.method === 'PUT') {
    const body = await readJson(request, API_BODY_LIMIT)
    assertAllowedKeys(body, ['name', 'personalDetails'], 'Person')
    const name = requiredString(body.name, 'Name', 120)
    const personalDetails = stringArray(body.personalDetails, 'Personal details', { maxItems: 50, maxLength: 500, nullable: false })
    return send(response, 200, { person: await repositories.person.update({ name, personalDetails }, personId) })
  }
  throw new ApiError(405, 'Method not allowed.', 'method_not_allowed')
}

async function handlePreferences(request, response, repositories, personId) {
  const person = await requirePerson(repositories, personId)
  if (request.method === 'GET') return send(response, 200, { personId: person.id, preferences: await repositories.preferences.get(person.id) })
  if (request.method === 'PUT') {
    const body = parsePreferences(await readJson(request, API_BODY_LIMIT))
    return send(response, 200, { personId: person.id, preferences: await repositories.preferences.update(person.id, body) })
  }
  throw new ApiError(405, 'Method not allowed.', 'method_not_allowed')
}

async function handleMemories(request, response, repositories, personId, memoryId) {
  const person = await requirePerson(repositories, personId)
  if (!memoryId) {
    if (request.method === 'GET') return send(response, 200, { memories: await repositories.memories.list(person.id) })
    if (request.method === 'POST') {
      const memory = parseMemory(await readJson(request, API_BODY_LIMIT))
      if (await repositories.memories.get(person.id, memory.id)) throw new ApiError(409, 'Memory id already exists.', 'already_exists')
      return send(response, 201, { memory: await repositories.memories.create(person.id, memory) })
    }
    throw new ApiError(405, 'Method not allowed.', 'method_not_allowed')
  }
  const id = decodeId(memoryId)
  if (request.method === 'GET') {
    const memory = await repositories.memories.get(person.id, id)
    if (!memory) throw new ApiError(404, 'Memory was not found.', 'memory_not_found')
    return send(response, 200, { memory })
  }
  if (request.method === 'PATCH') {
    const patch = parseMemory(await readJson(request, API_BODY_LIMIT), { patch: true })
    if (patch.id !== undefined && patch.id !== id) throw new ApiError(400, 'Memory id cannot be changed.')
    delete patch.id
    const memory = await repositories.memories.update(person.id, id, patch)
    if (!memory) throw new ApiError(404, 'Memory was not found.', 'memory_not_found')
    return send(response, 200, { memory })
  }
  if (request.method === 'DELETE') {
    if (!await repositories.memories.delete(person.id, id)) throw new ApiError(404, 'Memory was not found.', 'memory_not_found')
    return send(response, 204)
  }
  throw new ApiError(405, 'Method not allowed.', 'method_not_allowed')
}

async function handleSessions(request, response, repositories, personId) {
  if (request.method === 'POST') {
    const body = await readJson(request, API_BODY_LIMIT)
    assertAllowedKeys(body, ['personId', 'activityId', 'appVersion', 'baselineDifficultyTier'], 'Session')
    const person = await requirePerson(repositories, personId)
    if (body.personId !== undefined && validId(body.personId, 'Person id') !== person.id) throw new ApiError(404, 'Supported person was not found.', 'person_not_found')
    const activityId = requiredString(body.activityId, 'Activity id', 64)
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(activityId)) throw new ApiError(400, 'Activity id is invalid.')
    const appVersion = optionalString(body.appVersion, 'App version', 40)
    const baselineDifficultyTier = optionalInteger(body.baselineDifficultyTier, 'Baseline difficulty tier')
    return send(response, 201, { session: await repositories.sessions.create({ personId: person.id, activityId, appVersion, baselineDifficultyTier }) })
  }
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname
  const match = pathname.match(/^\/api\/sessions\/([^/]+)$/)
  if (match && request.method === 'GET') {
    const existing = await requireSession(repositories, decodeId(match[1]))
    if (personId && existing.personId !== personId) throw new ApiError(404, 'Session was not found.', 'session_not_found')
    return send(response, 200, { session: existing })
  }
  if (match && request.method === 'PATCH') {
    const id = decodeId(match[1])
    const body = await readJson(request, API_BODY_LIMIT)
    assertAllowedKeys(body, ['endedAt', 'currentDifficultyTier'], 'Session update')
    if (!Object.keys(body).length) throw new ApiError(400, 'At least one session field is required.')
    const existing = await requireSession(repositories, id)
    if (personId && existing.personId !== personId) throw new ApiError(404, 'Session was not found.', 'session_not_found')
    const endedAt = optionalTimestamp(body.endedAt, 'Ended at')
    if (endedAt !== undefined && endedAt < existing.startedAt) throw new ApiError(400, 'Ended at cannot be before the session start.')
    const currentDifficultyTier = optionalInteger(body.currentDifficultyTier, 'Current difficulty tier')
    return send(response, 200, { session: await repositories.sessions.update(id, { endedAt, currentDifficultyTier }) })
  }
  throw new ApiError(405, 'Method not allowed.', 'method_not_allowed')
}

async function handleSessionEvents(request, response, repositories, personId, sessionId, url) {
  const id = decodeId(sessionId)
  const session = await requireSession(repositories, id)
  if (personId && session.personId !== personId) throw new ApiError(404, 'Session was not found.', 'session_not_found')
  if (request.method === 'POST') {
    const body = await readJson(request, EVENT_BODY_LIMIT)
    assertAllowedKeys(body, ['events'], 'Events request')
    if (!Array.isArray(body.events) || body.events.length < 1 || body.events.length > 100) throw new ApiError(400, 'Events must be an array containing between 1 and 100 items.')
    const events = body.events.map((event) => parseEvent(event, id))
    return send(response, 201, await repositories.events.append(id, events))
  }
  if (request.method === 'GET') {
    const rawLimit = url.searchParams.get('limit')
    const limit = rawLimit === null ? 200 : Number(rawLimit)
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new ApiError(400, 'Event limit must be between 1 and 500.')
    return send(response, 200, { events: await repositories.events.list(id, limit) })
  }
  throw new ApiError(405, 'Method not allowed.', 'method_not_allowed')
}

async function handleAssessments(request, response, repositories, personId, url) {
  const person = await requirePerson(repositories, personId)
  if (request.method === 'GET') {
    const rawLimit = url.searchParams.get('limit')
    const limit = rawLimit === null ? 100 : Number(rawLimit)
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new ApiError(400, 'Assessment limit must be between 1 and 500.')
    return send(response, 200, { assessments: await repositories.assessments.list(person.id, limit) })
  }
  if (request.method === 'POST') {
    const body = await readJson(request, API_BODY_LIMIT)
    assertAllowedKeys(body, ['instrumentId', 'instrumentVersion', 'consent', 'startedAt', 'completedAt', 'status', 'result'], 'Assessment')
    if (body.consent !== true) throw new ApiError(403, 'Consent is required before an assessment can be stored.', 'consent_required')
    const instrumentId = requiredString(body.instrumentId, 'Instrument id', 80)
    const instrumentVersion = requiredString(body.instrumentVersion, 'Instrument version', 40)
    const startedAt = optionalTimestamp(body.startedAt, 'Started at', { required: true })
    const completedAt = optionalTimestamp(body.completedAt, 'Completed at')
    if (completedAt !== undefined && completedAt < startedAt) throw new ApiError(400, 'Completed at cannot be before the assessment start.')
    const status = requiredString(body.status, 'Assessment status', 20)
    if (!['in_progress', 'completed', 'abandoned'].includes(status)) throw new ApiError(400, 'Assessment status is not supported.')
    if (status === 'completed' && completedAt === undefined) throw new ApiError(400, 'Completed assessments require completedAt.')
    const result = body.result === undefined || body.result === null ? undefined : boundedJsonObject(body.result, 'Assessment result', ASSESSMENT_DATA_LIMIT)
    const assessment = await repositories.assessments.create({ personId: person.id, instrumentId, instrumentVersion, consent: true, startedAt, completedAt, status, result })
    return send(response, 201, { assessment })
  }
  throw new ApiError(405, 'Method not allowed.', 'method_not_allowed')
}

async function handleAuth(request, response, repositories) {
  if (request.method === 'GET' && request.url.endsWith('/session')) {
    const context = await requireAuthenticatedContext(repositories, request)
    return send(response, 200, { user: safeUser(context.user), patient: context.patient })
  }
  if (request.method === 'POST' && request.url.endsWith('/logout')) {
    const token = sessionTokenFromCookie(request.headers.cookie)
    if (token) await repositories.auth.deleteSession(token)
    response.setHeader('Set-Cookie', makeSessionClearedCookie())
    return send(response, 200, { loggedOut: true })
  }
  if (request.method !== 'POST') throw new ApiError(405, 'Method not allowed.', 'method_not_allowed')
  const body = await readJson(request, API_BODY_LIMIT)
  if (request.url.endsWith('/register')) {
    const registration = validateRegistration(body)
    const email = normalizeEmail(registration.email)
    if (await repositories.auth.findUserByEmail(email)) throw new ApiError(409, 'An account with that email already exists.', 'account_exists')
    const user = await repositories.auth.createUser({ email, passwordHash: hashPassword(registration.password) })
    const patient = await repositories.auth.createPatient({ userId: user.id, name: registration.name })
    return send(response, 201, { user: safeUser(user), patient })
  }
  if (request.url.endsWith('/login')) {
    const login = validateLogin(body)
    const user = await repositories.auth.findUserByEmail(login.email)
    if (!user || !verifyPassword(login.password, user.passwordHash)) throw new ApiError(401, 'Invalid email or password.', 'invalid_credentials')
    const patient = await repositories.auth.getPatientByUser(user.id)
    if (!patient) throw new ApiError(404, 'Patient profile was not found.', 'patient_not_found')
    const session = await repositories.auth.createSession(user.id, patient.id)
    response.setHeader('Set-Cookie', makeSessionCookie(session.token, session.expiresAt))
    return send(response, 200, { user: safeUser(user), patient })
  }
  throw new ApiError(404, 'Endpoint was not found.', 'not_found')
}

export function createApiHandler({ repositories, assistantHandler, groqConfigured = false, schemaVersion = 0, authEnabled = true }) {
  return async function handle(request, response) {
    const url = new URL(request.url, 'http://127.0.0.1')
    const path = url.pathname
    try {
      if (path === '/api/health') {
        if (request.method !== 'GET') throw new ApiError(405, 'Method not allowed.', 'method_not_allowed')
        return send(response, 200, { ok: true, groqConfigured, databaseReady: true, schemaVersion })
      }
      if (path.startsWith('/api/auth/')) {
        if (!authEnabled || schemaVersion < 5) throw new ApiError(404, 'Authentication is not available in this database schema.', 'auth_unavailable')
        return await handleAuth(request, response, repositories)
      }
      if (authEnabled && schemaVersion < 5) {
        throw new ApiError(503, 'Authentication storage is not ready. Please retry after database migration.', 'auth_unavailable')
      }
      if (path === '/api/assistant') {
        if (request.method !== 'POST') throw new ApiError(405, 'Method not allowed.', 'method_not_allowed')
        const context = authEnabled ? await requireAuthenticatedContext(repositories, request) : null
        if (!context) return await assistantHandler(request, response)
        const body = await readJson(request, ASSISTANT_BODY_LIMIT)
        const patientId = context.patient.id
        const [preferences, memories] = await Promise.all([
          repositories.preferences.get(patientId),
          repositories.memories.list(patientId),
        ])
        const clientContext = body.ctx && typeof body.ctx === 'object' ? body.ctx : {}
        const requestedScreen = optionalString(clientContext.screenLabel, 'Screen label', 80)
        const requestedGame = optionalString(clientContext.activeGame, 'Active game', 80)
        const requestedDomain = optionalString(clientContext.gameDomain, 'Game domain', 80)
        const requestedActivityState = optionalString(clientContext.activityState, 'Activity state', 20)
        const requestedInteractionState = optionalString(clientContext.state, 'Interaction state', 40)
        const safeContext = {
          screenLabel: ASSISTANT_SCREENS.has(requestedScreen) ? requestedScreen : 'the app',
          activeGame: ASSISTANT_GAMES.has(requestedGame) ? requestedGame : undefined,
          gameDomain: ASSISTANT_DOMAINS.has(requestedDomain) ? requestedDomain : undefined,
          difficultyLevel: optionalInteger(clientContext.difficultyLevel, 'Difficulty level', { min: 1, max: 5 }),
          activityState: ['idle', 'active', 'paused', 'completed'].includes(requestedActivityState) ? requestedActivityState : undefined,
          state: ['normal', 'needs_help', 'confusion', 'possible_frustration', 'high_frustration'].includes(requestedInteractionState) ? requestedInteractionState : 'normal',
          elapsedTimeMs: optionalInteger(clientContext.elapsedTimeMs, 'Elapsed time', { max: 86_400_000 }),
          score: optionalInteger(clientContext.score, 'Score', { min: 0, max: 1_000_000 }),
          userName: context.patient.name,
          personalDetails: context.patient.personalDetails,
          personalization: {
            favoriteFlower: preferences?.favoriteFlower ?? null,
            favoriteBird: preferences?.favoriteBird ?? null,
            favoriteSong: preferences?.favoriteSong ?? null,
            lifeActivityTags: preferences?.lifeActivityTags ?? [],
          },
        }
        return await assistantHandler({ bodyPayload: {
          input: body.input,
          ctx: safeContext,
          memories,
          history: body.history,
        } }, response)
      }
      const context = authEnabled ? await requireAuthenticatedContext(repositories, request) : null
      const personId = context?.patient?.id
      if (path === '/api/person') return await handlePerson(request, response, repositories, personId, context?.user?.id)
      if (path === '/api/person/preferences') return await handlePreferences(request, response, repositories, personId)
      if (path === '/api/person/memories') return await handleMemories(request, response, repositories, personId)
      const memoryMatch = path.match(/^\/api\/person\/memories\/([^/]+)$/)
      if (memoryMatch) return await handleMemories(request, response, repositories, personId, memoryMatch[1])
      if (path === '/api/sessions') return await handleSessions(request, response, repositories, personId)
      const eventMatch = path.match(/^\/api\/sessions\/([^/]+)\/events$/)
      if (eventMatch) return await handleSessionEvents(request, response, repositories, personId, eventMatch[1], url)
      if (path === '/api/sessions' || /^\/api\/sessions\/[^/]+$/.test(path)) return await handleSessions(request, response, repositories, personId)
      if (path === '/api/person/assessments') return await handleAssessments(request, response, repositories, personId, url)
      throw new ApiError(404, 'Endpoint was not found.', 'not_found')
    } catch (error) {
      if (response.headersSent) return response.destroy()
      if (error instanceof ApiError) return send(response, error.status, { error: error.message, code: error.code })
      return send(response, 500, { error: 'The request could not be completed.', code: 'internal_error' })
    }
  }
}
