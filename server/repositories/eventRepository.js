import { randomUUID } from 'node:crypto'

function fromRow(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    at: row.timestamp,
    type: row.event_type,
    ...JSON.parse(row.payload_json),
    ...(row.correctness === null ? {} : { correct: Boolean(row.correctness) }),
    ...(row.response_latency_ms === null ? {} : { responseLatencyMs: row.response_latency_ms }),
    ...(row.difficulty_tier === null ? {} : { difficultyTier: row.difficulty_tier }),
  }
}

function toRow(sessionId, event) {
  const { id, eventId, sessionId: _sessionId, type, at, timestamp, correct, responseLatencyMs, difficultyTier, ...payload } = event
  if (type === 'speech_cue') delete payload.phrase
  return {
    id: id ?? eventId ?? randomUUID(),
    sessionId,
    at: at ?? timestamp ?? Date.now(),
    type,
    payload: JSON.stringify(payload),
    correctness: typeof correct === 'boolean' ? Number(correct) : null,
    responseLatencyMs: responseLatencyMs ?? null,
    difficultyTier: difficultyTier ?? null,
  }
}

export function createEventRepository(database) {
  return {
    async append(sessionId, events) {
      await database.exec('BEGIN IMMEDIATE')
      try {
        let inserted = 0
        for (const event of events) {
          const row = toRow(sessionId, event)
          const result = await database.run(`
            INSERT OR IGNORE INTO interaction_events
              (id, session_id, timestamp, event_type, payload_json, correctness, response_latency_ms, difficulty_tier)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, row.id, row.sessionId, row.at, row.type, row.payload, row.correctness, row.responseLatencyMs, row.difficultyTier)
          inserted += result.changes
        }
        await database.exec('COMMIT')
        return { inserted }
      } catch (error) {
        await database.exec('ROLLBACK')
        throw error
      }
    },

    async list(sessionId, limit = 200) {
      const rows = await database.all(
        'SELECT * FROM interaction_events WHERE session_id = ? ORDER BY timestamp, id LIMIT ?',
        sessionId,
        limit,
      )
      return rows.map(fromRow)
    },
  }
}
