import { fireEvent, render, screen } from '@testing-library/react'
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

  it('accepts a touchscreen-style drawing gesture and requires a mark before saving', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/profile/assessment']}>
        <Routes>
          <Route path="/profile/assessment" element={<CognitiveAssessment />} />
        </Routes>
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('checkbox', { name: /I understand this is a screening activity/i }))
    await user.click(screen.getByRole('button', { name: 'Start the check-in' }))

    const drawingArea = screen.getByRole('application', { name: /clock drawing area/i })
    const saveDrawing = screen.getByRole('button', { name: 'Save drawing' })
    expect(drawingArea).toHaveStyle({ touchAction: 'none' })
    expect(saveDrawing).toBeDisabled()

    fireEvent.pointerDown(drawingArea, { pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, clientX: 20, clientY: 20 })
    fireEvent.pointerMove(drawingArea, { pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: 80, clientY: 70 })
    fireEvent.pointerUp(drawingArea, { pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: 80, clientY: 70 })

    expect(saveDrawing).toBeEnabled()
    await user.click(saveDrawing)
    expect(screen.getByRole('heading', { name: 'A simple cube drawing' })).toBeInTheDocument()
  })

  it('shows the digit span before asking for the answer and grades typed object names', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/profile/assessment']}>
        <Routes>
          <Route path="/profile/assessment" element={<CognitiveAssessment />} />
        </Routes>
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('checkbox', { name: /I understand this is a screening activity/i }))
    await user.click(screen.getByRole('button', { name: 'Start the check-in' }))

    for (let pointerId = 1; pointerId <= 2; pointerId += 1) {
      const drawingArea = screen.getByRole('application')
      fireEvent.pointerDown(drawingArea, { pointerId, pointerType: 'touch', isPrimary: true, button: 0, clientX: 20, clientY: 20 })
      fireEvent.pointerMove(drawingArea, { pointerId, pointerType: 'touch', isPrimary: true, clientX: 80, clientY: 70 })
      fireEvent.pointerUp(drawingArea, { pointerId, pointerType: 'touch', isPrimary: true, clientX: 80, clientY: 70 })
      await user.click(screen.getByRole('button', { name: 'Save drawing' }))
    }

    expect(screen.getByRole('img', { name: 'chair' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'flower' })).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Object names' }), 'chair, flower')
    await user.click(screen.getByRole('button', { name: 'Save object names' }))

    await user.click(screen.getByRole('button', { name: 'Continue to the next tasks' }))
    await user.type(screen.getByRole('textbox', { name: 'Remembered words' }), 'garden, bread')
    await user.click(screen.getByRole('button', { name: 'Save memory response' }))

    expect(screen.getByText('6428')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Digit span answer' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hide number' }))
    expect(screen.getByRole('textbox', { name: 'Digit span answer' })).toBeInTheDocument()
  })
})
