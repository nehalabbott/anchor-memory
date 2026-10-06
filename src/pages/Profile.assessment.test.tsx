import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { useApp } from '@/store/useApp'

vi.mock('@/lib/apiClient', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/apiClient')>()
  return {
    ...original,
    listAssessments: vi.fn().mockResolvedValue([]),
    createAssessment: vi.fn(),
  }
})

describe('Profile assessment entry point', () => {
  beforeEach(() => {
    localStorage.clear()
    useApp.setState({ memories: [], lastSessionExperience: null, chat: [], assistantOpen: false })
  })

  it('opens the consent-gated cognitive check-in from Profile', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/profile']}><App /></MemoryRouter>)

    await user.click(screen.getByRole('link', { name: /Cognitive Check-in/i }))
    expect(await screen.findByRole('heading', { name: 'A calm check-in together' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /I understand this is a screening activity/i })).toBeInTheDocument()
  })
})
