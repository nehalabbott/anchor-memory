import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import { migrations } from './migrations.js'

const DATABASE_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../../data/anchor.sqlite')

export async function migrateDatabase(database, availableMigrations = migrations) {
  await database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `)

  const applied = await database.all('SELECT version FROM schema_migrations ORDER BY version')
  const latestApplied = applied.at(-1)?.version ?? 0
  const latestAvailable = availableMigrations.at(-1)?.version ?? 0
  if (latestApplied > latestAvailable) throw new Error('Database schema is newer than this application supports.')

  for (const migration of availableMigrations) {
    const exists = await database.get('SELECT version FROM schema_migrations WHERE version = ?', migration.version)
    if (exists) continue
    try {
      await database.exec('BEGIN IMMEDIATE')
      await database.exec(migration.sql)
      await database.run(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
        migration.version,
        migration.name,
        Date.now(),
      )
      await database.exec(`PRAGMA user_version = ${migration.version}`)
      await database.exec('COMMIT')
    } catch (error) {
      try { await database.exec('ROLLBACK') } catch { /* Preserve the migration error. */ }
      throw new Error(`Database migration ${migration.version} (${migration.name}) failed.`, { cause: error })
    }
  }

  return latestAvailable
}

export async function openDatabase({ filename = process.env.ANCHOR_DATABASE_PATH || DATABASE_FILE, throughVersion } = {}) {
  if (filename !== ':memory:') await mkdir(dirname(resolve(filename)), { recursive: true })
  const database = await open({ filename, driver: sqlite3.Database })
  try {
    await database.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')
    if (filename !== ':memory:') await database.exec('PRAGMA journal_mode = WAL;')
    const selectedMigrations = throughVersion === undefined
      ? migrations
      : migrations.filter((migration) => migration.version <= throughVersion)
    await migrateDatabase(database, selectedMigrations)
    return database
  } catch (error) {
    await database.close()
    throw error
  }
}

export { DATABASE_FILE }
