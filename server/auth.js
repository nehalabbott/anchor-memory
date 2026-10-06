import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const PASSWORD_SALT_BYTES = 16
const PASSWORD_KEY_BYTES = 64

export function hashPassword(password) {
  const salt = randomBytes(PASSWORD_SALT_BYTES).toString('hex')
  const hash = scryptSync(password, salt, PASSWORD_KEY_BYTES).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, passwordHash) {
  if (typeof password !== 'string' || typeof passwordHash !== 'string') return false
  const [salt, expectedHash] = passwordHash.split(':')
  if (!salt || !expectedHash) return false
  const actual = scryptSync(password, salt, PASSWORD_KEY_BYTES)
  const expected = Buffer.from(expectedHash, 'hex')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function safeUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

export function safePatient(patient) {
  return {
    id: patient.id,
    name: patient.name,
    personalDetails: patient.personalDetails,
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
  }
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

export function validateRegistration(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Registration must be an object.')
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) throw new Error('Enter a valid email address.')
  if (password.length < 10) throw new Error('Password must be at least 10 characters.')
  if (name.length < 1 || name.length > 120) throw new Error('Patient name is required and must be at most 120 characters.')
  return { email, password, name }
}

export function validateLogin(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Login must be an object.')
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!/^\S+@\S+\.\S+$/.test(email) || !password) throw new Error('Invalid credentials.')
  return { email, password }
}

export function randomSessionToken() {
  return randomBytes(32).toString('base64url')
}
