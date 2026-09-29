import { describe, expect, it } from 'vitest'
import { migratePersistedAppState } from './useApp'

describe('persisted app state migration', () => {
  it('preserves Part 1 settings, chat, and memories while separating the supported person', async () => {
    const migrated = await migratePersistedAppState({
      userName: 'Margaret',
      caregiverMode: true,
      speechEnabled: false,
      largeText: true,
      chat: [{ id: 'chat-1', role: 'assistant', text: 'Welcome back', at: 12 }],
      memories: [{ id: 'legacy-1', name: 'Rahul', relationship: 'son', story: 'We watched cricket together.', createdAt: 8 }],
    })

    expect(migrated.userName).toBe('Margaret')
    expect(migrated.supportedPerson.name).toBe('Margaret')
    expect(migrated.supportedPerson.personalDetails).toEqual([])
    expect(migrated.speechEnabled).toBe(false)
    expect(migrated.largeText).toBe(true)
    expect(migrated.chat).toHaveLength(1)
    expect(migrated.memories[0]).toMatchObject({
      id: 'legacy-1', kind: 'person', name: 'Rahul', relationship: 'son',
      story: 'We watched cricket together.', createdAt: 8,
    })
  })

  it('moves legacy remote media URLs into opaque references', async () => {
    const migrated = await migratePersistedAppState({
      userName: 'Margaret',
      memories: [{ id: 'legacy-2', name: 'Lily', story: 'Sunday baking', photoUrl: 'https://example.test/lily.jpg', audioUrl: 'https://example.test/story.ogg' }],
    })

    expect(migrated.memories[0].photo).toMatchObject({
      id: 'https://example.test/lily.jpg', kind: 'photo', storage: 'remote',
    })
    expect(migrated.memories[0].voice).toMatchObject({
      id: 'https://example.test/story.ogg', kind: 'voice', storage: 'remote',
    })
    expect(migrated.memories[0]).not.toHaveProperty('photoUrl')
    expect(migrated.memories[0]).not.toHaveProperty('audioUrl')
  })
})