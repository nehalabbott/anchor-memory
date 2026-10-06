const ARRAY_FIELDS = {
  favoriteColors: 'favorite_colors_json',
  favoriteFoods: 'favorite_foods_json',
  favoriteActivities: 'favorite_activities_json',
  favoritePlaces: 'favorite_places_json',
  lifeActivityTags: 'life_activity_tags_json',
}
const TEXT_FIELDS = {
  theme: 'theme',
  favoriteFlower: 'favorite_flower',
  favoriteBird: 'favorite_bird',
  favoriteAnimal: 'favorite_animal',
  favoriteSong: 'favorite_song',
  calmingSongReference: 'calming_song_reference',
}

function fromRow(row) {
  if (!row) return null
  const result = {}
  for (const [field, column] of Object.entries(ARRAY_FIELDS)) {
    if (row[column] !== null) result[field] = JSON.parse(row[column])
  }
  for (const [field, column] of Object.entries(TEXT_FIELDS)) {
    if (row[column] !== null) result[field] = row[column]
  }
  return result
}

export function createPreferencesRepository(database) {
  return {
    async get(personId) {
      return fromRow(await database.get('SELECT * FROM personal_preferences WHERE person_id = ?', personId))
    },

    async update(personId, preferences) {
      const columns = [...Object.values(ARRAY_FIELDS), ...Object.values(TEXT_FIELDS)]
      const values = [
        ...Object.keys(ARRAY_FIELDS).map((field) => preferences[field] === undefined ? null : JSON.stringify(preferences[field])),
        ...Object.keys(TEXT_FIELDS).map((field) => preferences[field] ?? null),
      ]
      const now = Date.now()
      await database.run(`
        INSERT INTO personal_preferences (person_id, ${columns.join(', ')}, created_at, updated_at)
        VALUES (?, ${columns.map(() => '?').join(', ')}, ?, ?)
        ON CONFLICT(person_id) DO UPDATE SET
          ${columns.map((column) => `${column} = excluded.${column}`).join(', ')},
          updated_at = excluded.updated_at
      `, personId, ...values, now, now)
      return fromRow(await database.get('SELECT * FROM personal_preferences WHERE person_id = ?', personId))
    },
  }
}
