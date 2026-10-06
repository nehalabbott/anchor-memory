import { randomUUID } from 'node:crypto'

function fromRow(row) {
  if (!row) return null
  return {
    id: row.id,
    personId: row.person_id,
    activityId: row.activity_id,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    appVersion: row.app_version ?? undefined,
    baselineDifficultyTier: row.baseline_difficulty_tier ?? undefined,
    currentDifficultyTier: row.current_difficulty_tier ?? undefined,
  }
}

export function createSessionRepository(database) {
  return {
    async get(sessionId) {
      return fromRow(await database.get('SELECT * FROM sessions WHERE id = ?', sessionId))
    },

    async create({ personId, activityId, appVersion, baselineDifficultyTier }) {
      const session = {
        id: randomUUID(), personId, activityId, startedAt: Date.now(),
        appVersion, baselineDifficultyTier, currentDifficultyTier: baselineDifficultyTier,
      }
      await database.run(`
        INSERT INTO sessions (id, person_id, activity_id, started_at, app_version, baseline_difficulty_tier, current_difficulty_tier)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, session.id, personId, activityId, session.startedAt, appVersion ?? null, baselineDifficultyTier ?? null, baselineDifficultyTier ?? null)
      return session
    },

    async update(sessionId, updates) {
      const existing = await this.get(sessionId)
      if (!existing) return null
      const endedAt = updates.endedAt ?? existing.endedAt ?? null
      const currentTier = updates.currentDifficultyTier ?? existing.currentDifficultyTier ?? null
      await database.run('UPDATE sessions SET ended_at = ?, current_difficulty_tier = ? WHERE id = ?', endedAt, currentTier, sessionId)
      return this.get(sessionId)
    },
  }
}
