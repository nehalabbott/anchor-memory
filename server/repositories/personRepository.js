export const SUPPORTED_PERSON_ID = 'supported-person-1'

function fromRow(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    personalDetails: JSON.parse(row.personal_details_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createPersonRepository(database) {
  return {
    async get(personId = SUPPORTED_PERSON_ID) {
      return fromRow(await database.get('SELECT * FROM supported_person WHERE id = ?', personId))
    },

    async update({ name, personalDetails }, personId = SUPPORTED_PERSON_ID) {
      const now = Date.now()
      await database.run(`
        INSERT INTO supported_person (id, name, personal_details_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          personal_details_json = excluded.personal_details_json,
          updated_at = excluded.updated_at
      `, personId, name, JSON.stringify(personalDetails), now, now)
      return fromRow(await database.get('SELECT * FROM supported_person WHERE id = ?', personId))
    },
  }
}
