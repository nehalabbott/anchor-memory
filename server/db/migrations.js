export const migrations = [
  {
    version: 1,
    name: 'initial-application-schema',
    sql: `
      CREATE TABLE supported_person (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL CHECK(length(name) <= 120),
        personal_details_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(personal_details_json)),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE personal_preferences (
        person_id TEXT PRIMARY KEY REFERENCES supported_person(id) ON DELETE CASCADE,
        favorite_colors_json TEXT CHECK(favorite_colors_json IS NULL OR json_valid(favorite_colors_json)),
        favorite_flower TEXT CHECK(favorite_flower IS NULL OR length(favorite_flower) <= 120),
        favorite_bird TEXT CHECK(favorite_bird IS NULL OR length(favorite_bird) <= 120),
        favorite_animal TEXT CHECK(favorite_animal IS NULL OR length(favorite_animal) <= 120),
        favorite_foods_json TEXT CHECK(favorite_foods_json IS NULL OR json_valid(favorite_foods_json)),
        favorite_activities_json TEXT CHECK(favorite_activities_json IS NULL OR json_valid(favorite_activities_json)),
        favorite_places_json TEXT CHECK(favorite_places_json IS NULL OR json_valid(favorite_places_json)),
        calming_song_reference TEXT CHECK(calming_song_reference IS NULL OR length(calming_song_reference) <= 500),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE memories (
        id TEXT PRIMARY KEY,
        person_id TEXT NOT NULL REFERENCES supported_person(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK(kind IN ('person', 'story', 'place', 'activity', 'object', 'event', 'sequence')),
        name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 160),
        relationship TEXT CHECK(relationship IS NULL OR relationship IN ('son', 'daughter', 'spouse', 'grandchild', 'grandparent', 'friend', 'other')),
        story TEXT NOT NULL DEFAULT '' CHECK(length(story) <= 10000),
        people_json TEXT CHECK(people_json IS NULL OR json_valid(people_json)),
        places_json TEXT CHECK(places_json IS NULL OR json_valid(places_json)),
        activities_json TEXT CHECK(activities_json IS NULL OR json_valid(activities_json)),
        objects_json TEXT CHECK(objects_json IS NULL OR json_valid(objects_json)),
        events_json TEXT CHECK(events_json IS NULL OR json_valid(events_json)),
        photo_reference_json TEXT CHECK(photo_reference_json IS NULL OR json_valid(photo_reference_json)),
        voice_reference_json TEXT CHECK(voice_reference_json IS NULL OR json_valid(voice_reference_json)),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        person_id TEXT NOT NULL REFERENCES supported_person(id) ON DELETE CASCADE,
        activity_id TEXT NOT NULL CHECK(length(activity_id) BETWEEN 1 AND 64),
        started_at INTEGER NOT NULL,
        ended_at INTEGER
      );

      CREATE TABLE interaction_events (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        timestamp INTEGER NOT NULL,
        event_type TEXT NOT NULL CHECK(event_type IN (
          'wrong_answer', 'help_request', 'restart', 'inactivity', 'rapid_taps',
          'speech_cue', 'activity_started', 'activity_paused', 'activity_resumed',
          'activity_ended', 'memory_presented', 'response_submitted'
        )),
        payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
        correctness INTEGER CHECK(correctness IS NULL OR correctness IN (0, 1))
      );

      CREATE TABLE cognitive_assessments (
        id TEXT PRIMARY KEY,
        person_id TEXT NOT NULL REFERENCES supported_person(id) ON DELETE CASCADE,
        instrument_id TEXT NOT NULL CHECK(length(instrument_id) BETWEEN 1 AND 80),
        instrument_version TEXT NOT NULL CHECK(length(instrument_version) BETWEEN 1 AND 40),
        consent INTEGER NOT NULL CHECK(consent IN (0, 1)),
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        status TEXT NOT NULL CHECK(status IN ('in_progress', 'completed', 'abandoned')),
        result_json TEXT CHECK(result_json IS NULL OR json_valid(result_json)),
        created_at INTEGER NOT NULL
      );
    `,
  },
  {
    version: 2,
    name: 'session-metadata-and-event-latency',
    sql: `
      ALTER TABLE sessions ADD COLUMN app_version TEXT CHECK(app_version IS NULL OR length(app_version) <= 40);
      ALTER TABLE sessions ADD COLUMN baseline_difficulty_tier INTEGER CHECK(baseline_difficulty_tier IS NULL OR baseline_difficulty_tier BETWEEN 0 AND 10);
      ALTER TABLE sessions ADD COLUMN current_difficulty_tier INTEGER CHECK(current_difficulty_tier IS NULL OR current_difficulty_tier BETWEEN 0 AND 10);
      ALTER TABLE interaction_events ADD COLUMN response_latency_ms INTEGER CHECK(response_latency_ms IS NULL OR response_latency_ms BETWEEN 0 AND 86400000);
      ALTER TABLE interaction_events ADD COLUMN difficulty_tier INTEGER CHECK(difficulty_tier IS NULL OR difficulty_tier BETWEEN 0 AND 10);
      CREATE INDEX memories_person_created_idx ON memories(person_id, created_at);
      CREATE INDEX sessions_person_started_idx ON sessions(person_id, started_at);
      CREATE INDEX interaction_events_session_time_idx ON interaction_events(session_id, timestamp);
      CREATE INDEX assessments_person_created_idx ON cognitive_assessments(person_id, created_at);
    `,
  },
  {
    version: 3,
    name: 'adaptive-difficulty-events',
    sql: `
      ALTER TABLE interaction_events RENAME TO interaction_events_v2;
      CREATE TABLE interaction_events (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        timestamp INTEGER NOT NULL,
        event_type TEXT NOT NULL CHECK(event_type IN (
          'wrong_answer', 'help_request', 'restart', 'inactivity', 'rapid_taps',
          'speech_cue', 'activity_started', 'activity_paused', 'activity_resumed',
          'activity_ended', 'memory_presented', 'response_submitted', 'difficulty_changed'
        )),
        payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
        correctness INTEGER CHECK(correctness IS NULL OR correctness IN (0, 1)),
        response_latency_ms INTEGER CHECK(response_latency_ms IS NULL OR response_latency_ms BETWEEN 0 AND 86400000),
        difficulty_tier INTEGER CHECK(difficulty_tier IS NULL OR difficulty_tier BETWEEN 0 AND 10)
      );
      INSERT INTO interaction_events
        (id, session_id, timestamp, event_type, payload_json, correctness, response_latency_ms, difficulty_tier)
      SELECT id, session_id, timestamp, event_type, payload_json, correctness, response_latency_ms, difficulty_tier
      FROM interaction_events_v2;
      DROP TABLE interaction_events_v2;
      CREATE INDEX interaction_events_session_time_idx ON interaction_events(session_id, timestamp);
    `,
  },
  {
    version: 4,
    name: 'personalization-preferences',
    sql: `
      ALTER TABLE personal_preferences ADD COLUMN theme TEXT CHECK(theme IN ('high-contrast', 'calming-pastels', 'warm-vintage'));
      ALTER TABLE personal_preferences ADD COLUMN life_activity_tags_json TEXT CHECK(life_activity_tags_json IS NULL OR json_valid(life_activity_tags_json));
      ALTER TABLE personal_preferences ADD COLUMN favorite_song TEXT CHECK(favorite_song IS NULL OR length(favorite_song) <= 120);
    `,
  },
  {
    version: 5,
    name: 'authenticated-patient-ownership',
    sql: `
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'caregiver' CHECK(role IN ('caregiver', 'patient')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE patient_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 120),
        personal_details_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(personal_details_json)),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE caregiver_patient_links (
        caregiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        patient_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL,
        PRIMARY KEY(caregiver_id, patient_id)
      );
      CREATE TABLE auth_sessions (
        id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        patient_id TEXT NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX patient_profiles_user_idx ON patient_profiles(user_id);
      CREATE INDEX caregiver_patient_links_caregiver_idx ON caregiver_patient_links(caregiver_id);
      CREATE INDEX auth_sessions_expires_idx ON auth_sessions(expires_at);
    `,
  },
]