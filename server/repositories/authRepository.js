import { randomBytes, randomUUID, scryptSync } from 'node:crypto'
import { hashPassword, verifyPassword } from '../auth.js'

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

function hashSession(token) {
  return scryptSync(token, 'anchor-session', 64).toString('hex')
}

function fromUser(row) {
  if (!row) return null
  return { id: row.id, email: row.email, role: row.role, passwordHash: row.password_hash, createdAt: row.created_at, updatedAt: row.updated_at }
}

function fromSession(row) {
  if (!row) return null
  return { id: row.id, userId: row.user_id, patientId: row.patient_id, expiresAt: row.expires_at, createdAt: row.created_at }
}

export function createAuthRepository(database) {
  return {
    async createUser({ email, passwordHash, role = 'caregiver' }) {
      const user = { id: randomUUID(), email, passwordHash, role, createdAt: Date.now(), updatedAt: Date.now() }
      await database.run(`INSERT INTO users (id, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        user.id, email, passwordHash, role, user.createdAt, user.updatedAt)
      return fromUser(await database.get('SELECT * FROM users WHERE id = ?', user.id))
    },

    async findUserByEmail(email) {
      return fromUser(await database.get('SELECT * FROM users WHERE email = ?', email))
    },

    async createPatient({ userId, name, personalDetails = [] }) {
      const now = Date.now()
      const patientId = randomUUID()
      await database.run(`INSERT INTO patient_profiles (id, user_id, name, personal_details_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        patientId, userId, name, JSON.stringify(personalDetails), now, now)
      await database.run(`
        INSERT INTO supported_person (id, name, personal_details_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name, personal_details_json = excluded.personal_details_json, updated_at = excluded.updated_at
      `, patientId, name, JSON.stringify(personalDetails), now, now)
      return { id: patientId, userId, name, personalDetails, createdAt: now, updatedAt: now }
    },

    async getPatientByUser(userId) {
      const row = await database.get('SELECT * FROM patient_profiles WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', userId)
      if (!row) return null
      return { id: row.id, userId: row.user_id, name: row.name, personalDetails: JSON.parse(row.personal_details_json), createdAt: row.created_at, updatedAt: row.updated_at }
    },

    async getPatientById(userId, patientId) {
      const row = await database.get(`
        SELECT patient_profiles.* FROM patient_profiles
        WHERE patient_profiles.id = ? AND (
          patient_profiles.user_id = ? OR EXISTS (
            SELECT 1 FROM caregiver_patient_links
            WHERE caregiver_patient_links.caregiver_id = ?
              AND caregiver_patient_links.patient_id = patient_profiles.id
          )
        )
      `, patientId, userId, userId)
      if (!row) return null
      return { id: row.id, userId: row.user_id, name: row.name, personalDetails: JSON.parse(row.personal_details_json), createdAt: row.created_at, updatedAt: row.updated_at }
    },

    async updatePatient(userId, patientId, { name, personalDetails }) {
      const now = Date.now()
      const result = await database.run(`
        UPDATE patient_profiles SET name = ?, personal_details_json = ?, updated_at = ?
        WHERE id = ? AND (
          user_id = ? OR EXISTS (
            SELECT 1 FROM caregiver_patient_links
            WHERE caregiver_patient_links.caregiver_id = ?
              AND caregiver_patient_links.patient_id = patient_profiles.id
          )
        )
      `, name, JSON.stringify(personalDetails), now, patientId, userId, userId)
      if (!result.changes) return null
      await database.run(`
        UPDATE supported_person SET name = ?, personal_details_json = ?, updated_at = ?
        WHERE id = ?
      `, name, JSON.stringify(personalDetails), now, patientId)
      return this.getPatientById(userId, patientId)
    },

    async createSession(userId, patientId) {
      const token = randomBytes(32).toString('base64url')
      const id = randomUUID()
      const now = Date.now()
      await database.run(`INSERT INTO auth_sessions (id, token_hash, user_id, patient_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        id, hashSession(token), userId, patientId, now + SESSION_TTL_MS, now)
      return { token, expiresAt: now + SESSION_TTL_MS }
    },

    async getSession(token) {
      if (!token) return null
      const row = await database.get('SELECT * FROM auth_sessions WHERE token_hash = ? AND expires_at > ?', hashSession(token), Date.now())
      return fromSession(row)
    },

    async deleteSession(token) {
      if (!token) return
      await database.run('DELETE FROM auth_sessions WHERE token_hash = ?', hashSession(token))
    },

    async getUserForSession(session) {
      return fromUser(await database.get('SELECT * FROM users WHERE id = ?', session.userId))
    },
  }
}

export function sessionTokenFromCookie(cookieHeader = '') {
  const match = cookieHeader.match(/(?:^|;\s*)anchor_session=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function makeSessionCookie(token, expiresAt, secure = false) {
  const securePart = secure ? '; Secure' : ''
  return `anchor_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.max(1, Math.floor((expiresAt - Date.now()) / 1000))}${securePart}`
}

export function makeSessionClearedCookie() {
  return 'anchor_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
}

export { hashPassword, verifyPassword }
