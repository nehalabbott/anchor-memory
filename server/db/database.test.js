import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase, migrateDatabase } from './database.js'
import { migrations } from './migrations.js'

const temporaryDirectories = []

async function temporaryDatabasePath() {
  const directory = await mkdtemp(join(tmpdir(), 'anchor-db-test-'))
  temporaryDirectories.push(directory)
  return join(directory, 'test.sqlite')
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('SQLite initialization and migrations', () => {
  it('initializes a fresh database with all required tables and schema version', async () => {
    const database = await openDatabase({ filename: ':memory:' })
    const tables = await database.all("SELECT name FROM sqlite_master WHERE type = 'table'")
    const version = await database.get('PRAGMA user_version')
    const names = new Set(tables.map((table) => table.name))

    expect(version.user_version).toBe(5)
    for (const name of ['schema_migrations', 'supported_person', 'personal_preferences', 'memories', 'sessions', 'interaction_events', 'cognitive_assessments']) {
      expect(names.has(name)).toBe(true)
    }
    await database.close()
  })

  it('upgrades an existing v1 schema without losing its person record', async () => {
    const filename = await temporaryDatabasePath()
    const oldDatabase = await openDatabase({ filename, throughVersion: 1 })
    await oldDatabase.run(
      'INSERT INTO supported_person (id, name, personal_details_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      'supported-person-1', 'Existing', '[]', 1, 1,
    )
    await oldDatabase.close()

    const upgradedV2 = await openDatabase({ filename, throughVersion: 2 })
    const person = await upgradedV2.get('SELECT name FROM supported_person WHERE id = ?', 'supported-person-1')
    const sessionColumns = await upgradedV2.all('PRAGMA table_info(sessions)')
    await upgradedV2.run(
      'INSERT INTO sessions (id, person_id, activity_id, started_at) VALUES (?, ?, ?, ?)',
      'upgrade-session', 'supported-person-1', 'faces', 5,
    )
    await upgradedV2.run(`
      INSERT INTO interaction_events (id, session_id, timestamp, event_type, payload_json)
      VALUES (?, ?, ?, ?, ?)
    `, 'upgrade-event', 'upgrade-session', 6, 'response_submitted', JSON.stringify({ responseId: 'r1' }))
    await upgradedV2.run('UPDATE interaction_events SET correctness = 1 WHERE id = ?', 'upgrade-event')
    await upgradedV2.close()

    const upgraded = await openDatabase({ filename })
    const preservedEvent = await upgraded.get('SELECT event_type, correctness FROM interaction_events WHERE id = ?', 'upgrade-event')
    const version = await upgraded.get('PRAGMA user_version')

    expect(person.name).toBe('Existing')
    expect(sessionColumns.map((column) => column.name)).toContain('current_difficulty_tier')
    expect(preservedEvent).toMatchObject({ event_type: 'response_submitted', correctness: 1 })
    expect(version.user_version).toBe(5)
    await upgraded.close()
  })

  it('keeps repeated startup idempotent and preserves file-backed data', async () => {
    const filename = await temporaryDatabasePath()
    const first = await openDatabase({ filename })
    await first.run(
      'INSERT INTO supported_person (id, name, personal_details_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      'supported-person-1', 'Persisted', '[]', 2, 2,
    )
    await first.close()

    const second = await openDatabase({ filename })
    const count = await second.get('SELECT COUNT(*) AS count FROM schema_migrations')
    const person = await second.get('SELECT name FROM supported_person WHERE id = ?', 'supported-person-1')

    expect(count.count).toBe(migrations.length)
    expect(person.name).toBe('Persisted')
    await second.close()
  })

  it('rolls a failed migration back and reports its version clearly', async () => {
    const database = await openDatabase({ filename: ':memory:', throughVersion: 0 })
    await expect(migrateDatabase(database, [{
      version: 1,
      name: 'broken-test-migration',
      sql: 'CREATE TABLE should_rollback (id INTEGER); SELECT * FROM table_that_does_not_exist;',
    }])).rejects.toThrow('Database migration 1 (broken-test-migration) failed.')
    const table = await database.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'should_rollback'")
    expect(table).toBeUndefined()
    await database.close()
  })
})
