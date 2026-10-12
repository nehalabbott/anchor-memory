const JSON_FIELDS = {
  people: 'people_json',
  places: 'places_json',
  activities: 'activities_json',
  objects: 'objects_json',
  events: 'events_json',
  photo: 'photo_reference_json',
  voice: 'voice_reference_json',
}

function fromRow(row) {
  if (!row) return null
  const memory = {
    id: row.id,
    kind: row.kind,
    name: row.name,
    story: row.story,
    createdAt: row.created_at,
  }
  if (row.relationship !== null) memory.relationship = row.relationship
  for (const [field, column] of Object.entries(JSON_FIELDS)) {
    if (row[column] !== null) memory[field] = JSON.parse(row[column])
  }
  return memory
}

function jsonValue(value) {
  return value === undefined || value === null ? null : JSON.stringify(value)
}

export function createMemoryRepository(database) {
  return {
    async list(personId) {
      const rows = await database.all('SELECT * FROM memories WHERE person_id = ? ORDER BY created_at, id', personId)
      return rows.map(fromRow)
    },

    async get(personId, memoryId) {
      return fromRow(await database.get('SELECT * FROM memories WHERE person_id = ? AND id = ?', personId, memoryId))
    },

    async create(personId, memory) {
      const now = Date.now()
      await database.run(`
        INSERT INTO memories (
          id, person_id, kind, name, relationship, story, people_json, places_json,
          activities_json, objects_json, events_json, photo_reference_json,
          voice_reference_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      memory.id, personId, memory.kind, memory.name, memory.relationship ?? null, memory.story,
      jsonValue(memory.people), jsonValue(memory.places), jsonValue(memory.activities), jsonValue(memory.objects),
      jsonValue(memory.events), jsonValue(memory.photo), jsonValue(memory.voice), memory.createdAt ?? now, now)
      return this.get(personId, memory.id)
    },

    async update(personId, memoryId, memory) {
      const existing = await this.get(personId, memoryId)
      if (!existing) return null
      const merged = { ...existing, ...memory, id: memoryId, createdAt: existing.createdAt }
      const now = Date.now()
      await database.run(`
        UPDATE memories SET
          kind = ?, name = ?, relationship = ?, story = ?, people_json = ?, places_json = ?,
          activities_json = ?, objects_json = ?, events_json = ?, photo_reference_json = ?,
          voice_reference_json = ?, updated_at = ?
        WHERE person_id = ? AND id = ?
      `,
      merged.kind, merged.name, merged.relationship ?? null, merged.story,
      jsonValue(merged.people), jsonValue(merged.places), jsonValue(merged.activities), jsonValue(merged.objects),
      jsonValue(merged.events), jsonValue(merged.photo), jsonValue(merged.voice), now, personId, memoryId)
      return this.get(personId, memoryId)
    },

    async delete(personId, memoryId) {
      const result = await database.run('DELETE FROM memories WHERE person_id = ? AND id = ?', personId, memoryId)
      return result.changes > 0
    },
  }
}
