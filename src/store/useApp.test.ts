import { beforeEach, describe, expect, it } from 'vitest'
import { migratePersistedAppState, useApp } from './useApp'

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

describe('Privacy Shield persistence and transient voice state', () => {
  beforeEach(() => {
    localStorage.clear()
    useApp.setState({
      privacyShieldEnabled: true,
      voiceListeningEnabled: false,
      voiceListening: false,
      voiceSupported: false,
      lastTranscript: '',
      speechActivity: false,
      voiceError: '',
    })
  })

  it('defaults to private with listening off', () => {
    expect(useApp.getState().privacyShieldEnabled).toBe(true)
    expect(useApp.getState().voiceListeningEnabled).toBe(false)
  })

  it('turning Privacy Shield on stops and clears transient voice state', () => {
    useApp.setState({
      privacyShieldEnabled: false,
      voiceListeningEnabled: true,
      voiceListening: true,
      lastTranscript: 'temporary words',
      speechActivity: true,
    })

    useApp.getState().setPrivacyShieldEnabled(true)

    expect(useApp.getState()).toMatchObject({
      privacyShieldEnabled: true,
      voiceListeningEnabled: false,
      voiceListening: false,
      lastTranscript: '',
      speechActivity: false,
    })
  })

  it('persists the Privacy Shield choice without persisting voice transcripts or signals', async () => {
    useApp.getState().setPrivacyShieldEnabled(false)
    useApp.getState().setLastTranscript('temporary transcript')
    useApp.getState().setSpeechActivity(true)
    const persisted = JSON.parse(localStorage.getItem('anchor-v1') ?? '{}')

    expect(persisted.state.privacyShieldEnabled).toBe(false)
    expect(persisted.state).not.toHaveProperty('lastTranscript')
    expect(persisted.state).not.toHaveProperty('speechActivity')
    expect(persisted.state).not.toHaveProperty('voiceListeningEnabled')
    expect(persisted.state).not.toHaveProperty('audio')

    localStorage.setItem('anchor-v1', JSON.stringify({ state: { privacyShieldEnabled: false }, version: 3 }))
    await useApp.persist.rehydrate()
    expect(useApp.getState().privacyShieldEnabled).toBe(false)
    expect(useApp.getState().voiceListeningEnabled).toBe(false)
    expect(useApp.getState().lastTranscript).toBe('')
  })

  it('defaults migrated app state to the Privacy Shield enabled', async () => {
    const migrated = await migratePersistedAppState({ userName: 'Margaret' })
    expect(migrated.privacyShieldEnabled).toBe(true)
  })
})