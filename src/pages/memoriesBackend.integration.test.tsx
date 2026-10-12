import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

const api = vi.hoisted(() => ({
  getPerson: vi.fn(), getPreferences: vi.fn(), listMemories: vi.fn(), listAssessments: vi.fn(), createMemory: vi.fn(), updateMemory: vi.fn(), deleteMemory: vi.fn(), updatePerson: vi.fn(),
}))
vi.mock('@/lib/apiClient', async (importOriginal) => ({ ...await importOriginal<typeof import('@/lib/apiClient')>(), ...api }))

import App from '@/App'
import { resetAppDataBootstrapForTests } from '@/lib/appBootstrap'
import { useApp } from '@/store/useApp'
import type { MemoryItem } from '@/lib/types'
import { BackendApiError } from '@/lib/apiClient'

const person = { id: 'supported-person-1', name: 'Margaret', personalDetails: [], createdAt: 1, updatedAt: 1 }

describe('caregiver UI backed by the application API', () => {
  beforeEach(() => {
    localStorage.clear()
    resetAppDataBootstrapForTests()
    useApp.setState({
      supportedPerson: person, userName: person.name, memories: [], localDataImported: true,
      pendingPersonSync: false, pendingMemoryIds: [], dataSyncStatus: 'unknown',
    })
    api.getPerson.mockReset().mockResolvedValue(person)
    api.getPreferences.mockReset().mockResolvedValue(null)
    api.listMemories.mockReset().mockResolvedValue([])
    api.listAssessments.mockReset().mockResolvedValue([])
    api.createMemory.mockReset().mockImplementation(async (memory: MemoryItem) => memory)
    api.updateMemory.mockReset().mockImplementation(async (id: string, patch: Partial<MemoryItem>) => ({
      ...(useApp.getState().memories.find((memory) => memory.id === id) as MemoryItem), ...patch, id,
    }))
    api.deleteMemory.mockReset().mockResolvedValue(undefined)
    api.updatePerson.mockReset().mockImplementation(async (input: Pick<typeof person, 'name' | 'personalDetails'>) => ({ ...person, ...input, updatedAt: Date.now() }))
  })

  afterEach(() => resetAppDataBootstrapForTests())

  it('uses API create, update, and delete before reconciling the visible cache', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/memories']}><App /></MemoryRouter>)
    await waitFor(() => expect(useApp.getState().dataSyncStatus).toBe('synced'))

    await user.click(screen.getByRole('button', { name: 'Add the first memory' }))
    await user.type(screen.getByLabelText('Name this memory or person'), 'A garden story')
    await user.type(screen.getByLabelText('Personal story'), 'We planted flowers together.')
    await user.click(screen.getByRole('button', { name: 'Save memory' }))
    await waitFor(() => expect(api.createMemory).toHaveBeenCalledOnce())
    const created = useApp.getState().memories[0]
    expect(created.name).toBe('A garden story')

    await user.click(screen.getByRole('button', { name: 'Edit A garden story' }))
    await user.clear(screen.getByLabelText('Personal story'))
    await user.type(screen.getByLabelText('Personal story'), 'We tended marigolds.')
    await user.click(screen.getByRole('button', { name: 'Save memory' }))
    await waitFor(() => expect(api.updateMemory).toHaveBeenCalledOnce())
    expect(useApp.getState().memories[0].story).toBe('We tended marigolds.')

    await user.click(screen.getByRole('button', { name: 'Remove memory' }))
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(api.deleteMemory).toHaveBeenCalledWith(created.id))
    expect(useApp.getState().memories).toEqual([])
  })

  it('persists the supported-person name from the existing caregiver form', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/memories']}><App /></MemoryRouter>)
    await waitFor(() => expect(useApp.getState().dataSyncStatus).toBe('synced'))
    await user.clear(screen.getByLabelText('Name', { selector: 'input' }))
    await user.type(screen.getByLabelText('Name', { selector: 'input' }), 'Margaret S.')
    await user.click(screen.getByRole('button', { name: 'Save person details' }))
    await waitFor(() => expect(api.updatePerson).toHaveBeenCalledWith({ name: 'Margaret S.', personalDetails: [] }))
    expect(useApp.getState().userName).toBe('Margaret S.')
    expect(useApp.getState().supportedPerson.name).toBe('Margaret S.')
  })

  it('persists Profile name edits on blur without a request per keystroke', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/profile']}><App /></MemoryRouter>)
    await waitFor(() => expect(useApp.getState().dataSyncStatus).toBe('synced'))
    const name = screen.getByLabelText('Name', { selector: 'input' })
    await user.clear(name)
    await user.type(name, 'Profile Name')
    expect(api.updatePerson).not.toHaveBeenCalled()
    await user.tab()
    await waitFor(() => expect(api.updatePerson).toHaveBeenCalledWith({ name: 'Profile Name', personalDetails: [] }))
    expect(useApp.getState().supportedPerson.name).toBe('Profile Name')
  })

  it('keeps the existing cache and form open when a server memory mutation is rejected', async () => {
    const user = userEvent.setup()
    api.createMemory.mockRejectedValueOnce(new BackendApiError('Invalid memory', 400, 'invalid_request'))
    render(<MemoryRouter initialEntries={['/memories']}><App /></MemoryRouter>)
    await waitFor(() => expect(useApp.getState().dataSyncStatus).toBe('synced'))
    await user.click(screen.getByRole('button', { name: 'Add the first memory' }))
    await user.type(screen.getByLabelText('Name this memory or person'), 'Rejected memory')
    await user.click(screen.getByRole('button', { name: 'Save memory' }))

    expect(await screen.findByText(/Existing saved memories were kept/)).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'Add memory' })).toBeInTheDocument()
    expect(useApp.getState().memories).toEqual([])
  })
})
