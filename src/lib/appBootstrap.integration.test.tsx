import { StrictMode } from 'react'
import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

const api = vi.hoisted(() => ({ getPerson: vi.fn(), getPreferences: vi.fn(), listMemories: vi.fn(), listAssessments: vi.fn() }))
vi.mock('./apiClient', async (importOriginal) => ({ ...await importOriginal<typeof import('./apiClient')>(), ...api }))

import App from '@/App'
import { resetAppDataBootstrapForTests } from './appBootstrap'
import { useApp } from '@/store/useApp'

const person = { id: 'supported-person-1', name: 'Backend Person', personalDetails: [], createdAt: 1, updatedAt: 2 }

describe('StrictMode root data bootstrap', () => {
  beforeEach(() => {
    localStorage.clear()
    resetAppDataBootstrapForTests()
    useApp.setState({ localDataImported: true, pendingMemoryIds: [], pendingPersonSync: false, dataSyncStatus: 'unknown' })
    api.getPerson.mockReset().mockResolvedValue(person)
    api.getPreferences.mockReset().mockResolvedValue(null)
    api.listMemories.mockReset().mockResolvedValue([])
    api.listAssessments.mockReset().mockResolvedValue([])
  })

  afterEach(() => resetAppDataBootstrapForTests())

  it('runs one shared bootstrap through StrictMode effect setup/cleanup replay', async () => {
    render(<StrictMode><MemoryRouter initialEntries={['/']}><App /></MemoryRouter></StrictMode>)

    await waitFor(() => expect(useApp.getState().dataSyncStatus).toBe('synced'))

    expect(api.getPerson).toHaveBeenCalledTimes(3)
    expect(api.listMemories).toHaveBeenCalledOnce()
    expect(useApp.getState().supportedPerson.name).toBe('Backend Person')
  })
})
