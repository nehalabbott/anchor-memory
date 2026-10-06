import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getSession: vi.fn(), login: vi.fn(), logout: vi.fn(), register: vi.fn(),
}))
vi.mock('@/lib/apiClient', () => api)

import AuthGate from './AuthGate'
import { useApp } from '@/store/useApp'

describe('AuthGate patient context isolation', () => {
  beforeEach(() => {
    localStorage.clear()
    api.getSession.mockReset().mockResolvedValue({
      user: { id: 'user-b', email: 'b@example.com', role: 'caregiver', createdAt: 1, updatedAt: 1 },
      patient: { id: 'patient-b', name: 'Patient B', personalDetails: [], createdAt: 1, updatedAt: 1 },
    })
    useApp.setState({
      supportedPerson: { id: 'patient-a', name: 'Patient A', personalDetails: [], createdAt: 1, updatedAt: 1 },
      userName: 'Patient A',
      chat: [{ id: 'old-chat', role: 'user', text: 'A-PRIVATE-CHAT-MARKER', at: 1 }],
      memories: [{ id: 'a-memory', kind: 'story', name: 'A-only memory', story: 'A-PRIVATE-MEMORY-MARKER', createdAt: 1 }],
      preferences: { ...useApp.getState().preferences, favoriteFlower: 'A-only flower' },
      pendingMemoryIds: ['a-memory'],
    })
  })

  it('clears persisted assistant history before opening another patient account', async () => {
    render(<AuthGate><p>Private app</p></AuthGate>)

    expect(await screen.findByText('Private app')).toBeInTheDocument()
    await waitFor(() => expect(useApp.getState().supportedPerson.id).toBe('patient-b'))
    expect(useApp.getState().chat).toEqual([])
    expect(localStorage.getItem('anchor-v1')).not.toContain('A-PRIVATE-CHAT-MARKER')
    expect(useApp.getState().memories).toEqual([])
    expect(useApp.getState().preferences.favoriteFlower).toBeNull()
    expect(useApp.getState().pendingMemoryIds).toEqual([])
    expect(localStorage.getItem('anchor-v1')).not.toContain('A-PRIVATE-MEMORY-MARKER')
  })
})
