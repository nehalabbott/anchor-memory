export function createPatientRepository(database) {
  return {
    async getByUser(userId) {
      const row = await database.get(`
        SELECT * FROM patient_profiles WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
      `, userId)
      if (!row) return null
      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        personalDetails: JSON.parse(row.personal_details_json),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    },

    async getById(patientId) {
      const row = await database.get('SELECT * FROM patient_profiles WHERE id = ?', patientId)
      if (!row) return null
      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        personalDetails: JSON.parse(row.personal_details_json),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    },

    async create({ userId, name, personalDetails = [] }) {
      const now = Date.now()
      const id = `patient-${userId}-${now}`
      await database.run(`
        INSERT INTO patient_profiles (id, user_id, name, personal_details_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, id, userId, name, JSON.stringify(personalDetails), now, now)
      return this.getByUser(userId)
    },

    async updateByUser(userId, { name, personalDetails }) {
      const patient = await this.getByUser(userId)
      if (!patient) return null
      const now = Date.now()
      await database.run(`
        UPDATE patient_profiles SET name = ?, personal_details_json = ?, updated_at = ? WHERE id = ?
      `, name, JSON.stringify(personalDetails), now, patient.id)
      return this.getById(patient.id)
    },
  }
}
