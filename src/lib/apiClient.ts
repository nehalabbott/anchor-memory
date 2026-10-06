import type {
  ApplicationSession, AssistantContext, CognitiveAssessment, InteractionEvent, MemoryItem, PersonalPreferences, SupportedPerson,
} from './types'

export class BackendApiError extends Error {
  constructor(message: string, readonly status: number, readonly code = 'api_error') {
    super(message)
    this.name = 'BackendApiError'
  }
}

type RequestOptions = { method?: string; body?: unknown; signal?: AbortSignal }

interface AuthUser {
  id: string
  email: string
  role: string
  createdAt: number
  updatedAt: number
}

interface AuthSession {
  user: AuthUser
  patient: SupportedPerson
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BackendApiError(`Backend returned an invalid ${label}.`, 502, 'invalid_response')
  return value as Record<string, unknown>
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new BackendApiError(`Backend returned an invalid ${label}.`, 502, 'invalid_response')
  return value
}

function entity<T>(value: unknown, label: string, textFields: string[], numberFields: string[] = []): T {
  const item = record(value, label)
  if (textFields.some((field) => typeof item[field] !== 'string') || numberFields.some((field) => typeof item[field] !== 'number')) {
    throw new BackendApiError(`Backend returned an invalid ${label}.`, 502, 'invalid_response')
  }
  return item as T
}

async function request(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      signal,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === 'TimeoutError')) {
      throw new BackendApiError('Assistant request timed out.', 0, 'request_timeout')
    }
    throw new BackendApiError('Anchor local data service is unavailable.', 0, 'backend_unavailable')
  }
  if (response.status === 204) return undefined

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new BackendApiError('Backend returned an invalid response.', 502, 'invalid_response')
  }
  if (!response.ok) {
    const body = record(payload, 'error response')
    throw new BackendApiError(
      typeof body.error === 'string' ? body.error : 'Backend request failed.',
      response.status,
      typeof body.code === 'string' ? body.code : 'api_error',
    )
  }
  return payload
}

export async function requestAssistant(input: {
  input: string
  ctx: AssistantContext
  memories: MemoryItem[]
  history: Array<{ role: 'user' | 'assistant'; text: string }>
}, signal?: AbortSignal): Promise<string> {
  const payload = record(await request('/assistant', { method: 'POST', body: input, signal }), 'assistant response')
  if (typeof payload.reply !== 'string' || !payload.reply.trim()) {
    throw new BackendApiError('Assistant returned an invalid response.', 502, 'invalid_response')
  }
  return payload.reply.trim()
}

function wrapped<T>(payload: unknown, key: string): T {
  const body = record(payload, 'response')
  if (!(key in body)) throw new BackendApiError(`Backend response is missing ${key}.`, 502, 'invalid_response')
  return body[key] as T
}

export async function getSession(): Promise<AuthSession | null> {
  try {
    const payload = record(await request('/auth/session'), 'session')
    const user = entity<AuthUser>(payload.user, 'user', ['id', 'email', 'role'], ['createdAt', 'updatedAt'])
    const patient = entity<SupportedPerson>(payload.patient, 'patient', ['id', 'name'], ['createdAt', 'updatedAt'])
    if (!Array.isArray(patient.personalDetails) || patient.personalDetails.some((detail) => typeof detail !== 'string')) {
      throw new BackendApiError('Backend returned an invalid patient profile.', 502, 'invalid_response')
    }
    return { user, patient }
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 401) return null
    throw error
  }
}

export async function login(input: { email: string; password: string }): Promise<AuthSession> {
  const payload = record(await request('/auth/login', { method: 'POST', body: input }), 'login response')
  const user = entity<AuthUser>(payload.user, 'user', ['id', 'email', 'role'], ['createdAt', 'updatedAt'])
  const patient = entity<SupportedPerson>(payload.patient, 'patient', ['id', 'name'], ['createdAt', 'updatedAt'])
  return { user, patient }
}

export async function register(input: { email: string; password: string; name: string }): Promise<AuthSession> {
  const payload = record(await request('/auth/register', { method: 'POST', body: input }), 'registration response')
  const user = entity<AuthUser>(payload.user, 'user', ['id', 'email', 'role'], ['createdAt', 'updatedAt'])
  const patient = entity<SupportedPerson>(payload.patient, 'patient', ['id', 'name'], ['createdAt', 'updatedAt'])
  return { user, patient }
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' })
}

export async function getPerson(): Promise<SupportedPerson | null> {
  const person = wrapped<SupportedPerson | null>(await request('/person'), 'person')
  if (person === null) return null
  const validPerson = entity<SupportedPerson>(person, 'person', ['id', 'name'], ['createdAt', 'updatedAt'])
  if (!Array.isArray(validPerson.personalDetails) || validPerson.personalDetails.some((detail) => typeof detail !== 'string')) {
    throw new BackendApiError('Backend returned an invalid person.', 502, 'invalid_response')
  }
  return validPerson
}

export async function updatePerson(person: Pick<SupportedPerson, 'name' | 'personalDetails'>): Promise<SupportedPerson> {
  const result = entity<SupportedPerson>(wrapped(await request('/person', { method: 'PUT', body: person }), 'person'), 'person', ['id', 'name'], ['createdAt', 'updatedAt'])
  if (!Array.isArray(result.personalDetails) || result.personalDetails.some((detail) => typeof detail !== 'string')) {
    throw new BackendApiError('Backend returned an invalid person.', 502, 'invalid_response')
  }
  return result
}

export async function getPreferences(): Promise<PersonalPreferences | null> {
  const preferences = wrapped<PersonalPreferences | null>(await request('/person/preferences'), 'preferences')
  return preferences === null ? null : entity<PersonalPreferences>(preferences, 'preferences', [])
}

export async function updatePreferences(preferences: Partial<PersonalPreferences>): Promise<Partial<PersonalPreferences>> {
  return entity<Partial<PersonalPreferences>>(wrapped(await request('/person/preferences', { method: 'PUT', body: preferences }), 'preferences'), 'preferences', [])
}

export async function listMemories(): Promise<MemoryItem[]> {
  return array(wrapped(await request('/person/memories'), 'memories'), 'memory list').map((item) =>
    entity<MemoryItem>(item, 'memory', ['id', 'kind', 'name', 'story'], ['createdAt']))
}

export async function createMemory(memory: MemoryItem): Promise<MemoryItem> {
  return entity<MemoryItem>(wrapped(await request('/person/memories', { method: 'POST', body: memory }), 'memory'), 'memory', ['id', 'kind', 'name', 'story'], ['createdAt'])
}

export async function updateMemory(memoryId: string, patch: Partial<MemoryItem>): Promise<MemoryItem> {
  return entity<MemoryItem>(wrapped(await request(`/person/memories/${encodeURIComponent(memoryId)}`, { method: 'PATCH', body: patch }), 'memory'), 'memory', ['id', 'kind', 'name', 'story'], ['createdAt'])
}

export async function deleteMemory(memoryId: string): Promise<void> {
  await request(`/person/memories/${encodeURIComponent(memoryId)}`, { method: 'DELETE' })
}

export async function createSession(input: {
  activityId: string
  appVersion?: string
  baselineDifficultyTier?: number
  personId?: string
}): Promise<ApplicationSession> {
  return entity<ApplicationSession>(wrapped(await request('/sessions', { method: 'POST', body: input }), 'session'), 'session', ['id', 'personId', 'activityId'], ['startedAt'])
}

export async function endSession(sessionId: string, endedAt = Date.now()): Promise<ApplicationSession> {
  return entity<ApplicationSession>(wrapped(await request(`/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'PATCH', body: { endedAt },
  }), 'session'), 'session', ['id', 'personId', 'activityId'], ['startedAt'])
}

export async function appendEvents(sessionId: string, events: InteractionEvent[]): Promise<{ inserted: number }> {
  const inserted = wrapped<number>(await request(`/sessions/${encodeURIComponent(sessionId)}/events`, {
    method: 'POST', body: { events },
  }), 'inserted')
  if (!Number.isInteger(inserted) || inserted < 0) throw new BackendApiError('Backend returned an invalid event count.', 502, 'invalid_response')
  return { inserted }
}

export async function getSessionEvents(sessionId: string, limit = 200): Promise<InteractionEvent[]> {
  return array(wrapped(await request(`/sessions/${encodeURIComponent(sessionId)}/events?limit=${limit}`), 'events'), 'event list').map((event) =>
    entity<InteractionEvent>(event, 'interaction event', ['id', 'sessionId', 'type'], ['at']))
}

export async function listAssessments(): Promise<CognitiveAssessment[]> {
  return array(wrapped(await request('/person/assessments'), 'assessments'), 'assessment list').map((assessment) =>
    entity<CognitiveAssessment>(assessment, 'assessment', ['id', 'personId', 'instrumentId', 'instrumentVersion', 'status'], ['startedAt', 'createdAt']))
}

export async function createAssessment(input: Omit<CognitiveAssessment, 'id' | 'personId' | 'createdAt'>): Promise<CognitiveAssessment> {
  return entity<CognitiveAssessment>(wrapped(await request('/person/assessments', { method: 'POST', body: input }), 'assessment'), 'assessment', ['id', 'personId', 'instrumentId', 'instrumentVersion', 'status'], ['startedAt', 'createdAt'])
}
