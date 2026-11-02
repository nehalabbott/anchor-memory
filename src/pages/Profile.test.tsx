import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import type { MemoryItem } from '@/lib/types'
import { DEFAULT_PERSONAL_PREFERENCES } from '@/lib/personalization'
import { useApp } from '@/store/useApp'

function makeMemory(id: string, name: string, fields: Partial<MemoryItem> = {}): MemoryItem {
  return {
    id,
    kind: 'person',
    name,
    story: '',
    createdAt: 1,
    ...fields,
  }
}

function mountProfile() {
  return render(<MemoryRouter initialEntries={['/profile']}><App /></MemoryRouter>)
}

describe('Profile Part 2 connections', () => {
  beforeEach(() => {
    localStorage.clear()
    useApp.setState({
      memories: [],
      lastSessionExperience: null,
      chat: [],
      assistantOpen: false,
      assistantAction: null,
      assistantPrompt: null,
      events: [],
      privacyShieldEnabled: true,
      voiceListeningEnabled: false,
      preferences: DEFAULT_PERSONAL_PREFERENCES,
    })
  })

  it('opens the existing Memory Aquarium route from Recent Memory Aquarium', async () => {
    const user = userEvent.setup()
    mountProfile()
    await user.click(screen.getByRole('link', { name: /Recent Memory Aquarium/ }))
    expect(await screen.findByRole('heading', { name: 'Memory Aquarium' })).toBeInTheDocument()
  })

  it('shows a quick sign-out action on My Journey', () => {
    mountProfile()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('makes voice privacy controls reachable from Profile and starts with listening off', () => {
    mountProfile()
    expect(screen.getByRole('region', { name: 'Voice and privacy controls' })).toBeInTheDocument()
    expect(screen.getByText('Mic Off / Private')).toBeInTheDocument()
    expect(useApp.getState().voiceListeningEnabled).toBe(false)
  })

  it('lets the person using Anchor change and save their name', async () => {
    const user = userEvent.setup()
    mountProfile()

    const nameInput = screen.getByRole('textbox', { name: 'Name' })
    await user.clear(nameInput)
    await user.type(nameInput, 'Priya')
    await user.click(screen.getByRole('button', { name: 'Save name' }))

    expect(useApp.getState().supportedPerson.name).toBe('Priya')
    expect(screen.getByRole('status')).toHaveTextContent(/Name and details saved/)
  })

  it('saves helpful personal details only after the save button is tapped', async () => {
    const user = userEvent.setup()
    mountProfile()

    const details = screen.getByRole('textbox', { name: 'Helpful personal details' })
    await user.clear(details)
    await user.type(details, 'Enjoys morning walks')
    expect(useApp.getState().supportedPerson.personalDetails).not.toContain('Enjoys morning walks')

    await user.click(screen.getByRole('button', { name: 'Save details' }))
    await waitFor(() => expect(useApp.getState().supportedPerson.personalDetails).toContain('Enjoys morning walks'))
    expect(await screen.findByRole('status')).toHaveTextContent(/Details saved/)
  })

  it('lets caregivers save a new free-text interest for personalized games', async () => {
    const user = userEvent.setup()
    mountProfile()
    const interests = screen.getByLabelText(/Interests and activities/)
    await user.type(interests, 'cricket')
    expect(useApp.getState().preferences.lifeActivityTags).toContain('cricket')
  })

  it('lets the person using Anchor enable the dark theme', async () => {
    const user = userEvent.setup()
    mountProfile()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Theme' }), 'dark')

    expect(useApp.getState().preferences.theme).toBe('dark')
    await waitFor(() => expect(document.body).toHaveAttribute('data-theme', 'dark'))
  })

  it('opens the shared Mo assistant from A Helping Hand', async () => {
    const user = userEvent.setup()
    mountProfile()
    await user.click(screen.getByRole('button', { name: 'A Helping Hand. Open Mo assistant' }))
    expect(await screen.findByRole('dialog', { name: 'Assistant' })).toBeInTheDocument()
    expect(useApp.getState().assistantOpen).toBe(true)
  })

  it('keeps the Profile memory section as a concise entry point without rendering memory cards', async () => {
    useApp.setState({ memories: [
      makeMemory('private-memory-one', 'Anita', {
        relationship: 'daughter', story: 'We talk about the garden.', people: ['Margaret'], places: ['the garden'],
        photo: { id: '/demo/anita.svg', kind: 'photo', storage: 'remote', mimeType: 'image/svg+xml', altText: 'Fictional portrait of Anita' },
      }),
      makeMemory('private-memory-two', 'Shimla trip', { kind: 'event', story: 'A train ride through the hills.' }),
      makeMemory('private-memory-three', 'Tea together', { kind: 'activity', activities: ['sharing tea'], objects: ['teapot'] }),
    ] })
    mountProfile()

    expect(screen.getByRole('heading', { name: 'Personal Memories' })).toBeInTheDocument()
    expect(screen.getByText('Familiar details shared with Anchor.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View all memories' })).toHaveAttribute('href', '/memories')
    expect(screen.queryByRole('heading', { name: 'Anita' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Shimla trip' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Tea together' })).not.toBeInTheDocument()
    expect(screen.queryByText('Relationship: daughter')).not.toBeInTheDocument()
    expect(screen.queryByText('We talk about the garden.')).not.toBeInTheDocument()
    expect(screen.queryByAltText('Fictional portrait of Anita')).not.toBeInTheDocument()
    expect(screen.queryByText(/private-memory|indexeddb|image\/svg\+xml/i)).not.toBeInTheDocument()
  })

  it('keeps the Profile entry point stable as memories are added or removed', async () => {
    mountProfile()
    expect(screen.getByText('Your personal memories will appear on the memories page.')).toBeInTheDocument()

    let newMemoryId = ''
    act(() => {
      useApp.getState().addMemory({ name: 'Nisha', relationship: 'friend', story: 'We enjoyed a walk.', people: [], places: [], activities: [], objects: [] })
      const memories = useApp.getState().memories
      newMemoryId = memories[memories.length - 1]?.id ?? ''
    })
    expect(await screen.findByRole('link', { name: 'View all memories' })).toHaveAttribute('href', '/memories')
    expect(screen.queryByRole('heading', { name: 'Nisha' })).not.toBeInTheDocument()

    act(() => useApp.getState().deleteMemory(newMemoryId))
    expect(await screen.findByText('Your personal memories will appear on the memories page.')).toBeInTheDocument()
  })

  it('shows the empty overview message and opens memory management', async () => {
    const user = userEvent.setup()
    mountProfile()
    expect(screen.getByText('Your personal memories will appear on the memories page.')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'View all memories' }))
    expect(await screen.findByRole('heading', { name: 'Personal Memories' })).toBeInTheDocument()
  })

  it('opens /memories with the complete stored collection', async () => {
    const user = userEvent.setup()
    useApp.setState({ memories: [
      makeMemory('mem-one', 'Rahul', { relationship: 'grandchild', story: 'We planted seeds.', objects: ['watering can'] }),
      makeMemory('mem-two', 'Lily', { kind: 'story', story: 'We baked together.' }),
      makeMemory('mem-three', 'The lake', { kind: 'place', story: 'A favorite walk.' }),
    ] })
    mountProfile()
    await user.click(screen.getByRole('link', { name: 'View all memories' }))
    expect(await screen.findByRole('heading', { name: 'Personal Memories' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Rahul · grandchild' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Lily' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'The lake' })).toBeInTheDocument()
    expect(screen.getByText('We planted seeds.')).toBeInTheDocument()
    expect(screen.getByText('We baked together.')).toBeInTheDocument()
    expect(screen.getByText('A favorite walk.')).toBeInTheDocument()
  })
})
