import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CognitiveAssessment from './CognitiveAssessment'
import { useScreenContext } from '@/store/useScreenContext'

vi.mock('@/lib/apiClient', () => ({
  createAssessment: vi.fn(),
  listAssessments: vi.fn().mockResolvedValue([]),
}))

describe('CognitiveAssessment', () => {
  beforeEach(() => {
    useScreenContext.setState({
      route: '/profile/assessment',
      screen: 'Cognitive Check-in',
      activeGame: null,
      gameDomain: null,
      difficultyLevel: 2,
      score: null,
      lastFailedAction: null,
      elapsedTimeMs: 0,
      activityState: 'idle',
    })
  })

  it('shows a consent gate and only starts after explicit consent', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/profile/assessment']}>
        <Routes>
          <Route path="/profile/assessment" element={<CognitiveAssessment />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'A calm check-in together' })).toBeInTheDocument()
    expect(screen.getByText('This activity is inspired by common cognitive screening tasks and is not a medical diagnosis. A healthcare professional should interpret concerning results.')).toBeInTheDocument()
    const start = screen.getByRole('button', { name: 'Start the check-in' })
    expect(start).toBeDisabled()

    await user.click(screen.getByRole('checkbox', { name: /I understand this is a screening activity/i }))
    await user.click(start)
    expect(screen.getByText('Section 1 of 7')).toBeInTheDocument()
  })
})
