import { randomUUID } from 'node:crypto'

function fromRow(row) {
  return {
    id: row.id,
    personId: row.person_id,
    instrumentId: row.instrument_id,
    instrumentVersion: row.instrument_version,
    consent: Boolean(row.consent),
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
    status: row.status,
    result: row.result_json === null ? undefined : JSON.parse(row.result_json),
    createdAt: row.created_at,
  }
}

export function createAssessmentRepository(database) {
  return {
    async list(personId, limit = 100) {
      const rows = await database.all(
        'SELECT * FROM cognitive_assessments WHERE person_id = ? ORDER BY created_at DESC LIMIT ?',
        personId,
        limit,
      )
      return rows.map(fromRow)
    },

    async create({ personId, instrumentId, instrumentVersion, consent, startedAt, completedAt, status, result }) {
      const assessment = {
        id: randomUUID(), personId, instrumentId, instrumentVersion, consent,
        startedAt, completedAt, status, result, createdAt: Date.now(),
      }
      await database.run(`
        INSERT INTO cognitive_assessments
          (id, person_id, instrument_id, instrument_version, consent, started_at, completed_at, status, result_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, assessment.id, personId, instrumentId, instrumentVersion, Number(consent), startedAt,
      completedAt ?? null, status, result === undefined ? null : JSON.stringify(result), assessment.createdAt)
      return assessment
    },
  }
}
