import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import type { MemoryItem } from '@/lib/types'
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
    })
  })

  it('opens the existing Memory Garden route from Recent Memory Garden', async () => {
    const user = userEvent.setup()
    mountProfile()
    await user.click(screen.getByRole('link', { name: /Recent Memory Garden/ }))
    expect(await screen.findByRole('heading', { name: 'Your Memory Garden' })).toBeInTheDocument()
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
