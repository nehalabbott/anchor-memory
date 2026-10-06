export class ApiError extends Error {
  constructor(status, message, code = 'invalid_request') {
    super(message)
    this.status = status
    this.code = code
  }
}

export function requireObject(value, label = 'Request body') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, `${label} must be a JSON object.`)
  return value
}

export function assertAllowedKeys(value, allowed, label = 'Request body') {
  const unexpected = Object.keys(value).find((key) => !allowed.includes(key))
  if (unexpected) throw new ApiError(400, `${label} contains an unsupported field.`)
}

export function requiredString(value, label, maxLength) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new ApiError(400, `${label} is required and must be at most ${maxLength} characters.`)
  }
  return value.trim()
}

export function optionalString(value, label, maxLength) {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string' || value.length > maxLength) throw new ApiError(400, `${label} must be a string of at most ${maxLength} characters.`)
  const trimmed = value.trim()
  return trimmed || undefined
}

export function optionalTimestamp(value, label, { required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) throw new ApiError(400, `${label} is required.`)
    return undefined
  }
  if (!Number.isSafeInteger(value) || value < 0) throw new ApiError(400, `${label} must be a valid timestamp in milliseconds.`)
  return value
}

export function optionalInteger(value, label, { min = 0, max = 10, required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) throw new ApiError(400, `${label} is required.`)
    return undefined
  }
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new ApiError(400, `${label} must be an integer between ${min} and ${max}.`)
  return value
}

export function validId(value, label = 'id') {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)) {
    throw new ApiError(400, `${label} is not a valid identifier.`)
  }
  return value
}

export function stringArray(value, label, { maxItems = 100, maxLength = 120, nullable = true } = {}) {
  if (value === undefined || value === null) return nullable ? undefined : []
  if (!Array.isArray(value) || value.length > maxItems) throw new ApiError(400, `${label} must be an array of at most ${maxItems} strings.`)
  return value.map((item) => {
    if (typeof item !== 'string' || !item.trim() || item.trim().length > maxLength) {
      throw new ApiError(400, `Each ${label} item must be a non-empty string of at most ${maxLength} characters.`)
    }
    return item.trim()
  })
}

export async function readJson(request, maxBytes) {
  const contentType = request.headers['content-type'] ?? ''
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) throw new ApiError(415, 'Content-Type must be application/json.', 'unsupported_media_type')
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += Buffer.byteLength(chunk)
    if (size > maxBytes) throw new ApiError(413, 'Request body is too large.', 'request_too_large')
    chunks.push(chunk)
  }
  if (size === 0) throw new ApiError(400, 'Request body is required.')
  try {
    return requireObject(JSON.parse(Buffer.concat(chunks).toString('utf8')))
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(400, 'Request body must contain valid JSON.', 'invalid_json')
  }
}

export function boundedJsonObject(value, label, maxBytes) {
  requireObject(value, label)
  let size
  try { size = Buffer.byteLength(JSON.stringify(value)) } catch { throw new ApiError(400, `${label} must be JSON serializable.`) }
  if (size > maxBytes) throw new ApiError(413, `${label} is too large.`, 'payload_too_large')
  return value
}
