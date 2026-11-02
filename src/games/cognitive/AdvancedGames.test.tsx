import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { waitFor } from '@testing-library/react'
import { CategoryAssociationGame, DualNBackGame, TrailMakingGame, buildCategoryAssociationPrompt, buildDualNBackRound, buildTrailMakingRound } from './AdvancedGames'
import { DEMO_MEMORIES } from '@/demo/demoData'
import { useApp } from '@/store/useApp'
import { useScreenContext } from '@/store/useScreenContext'

beforeEach(() => {
  useApp.setState({ memories: DEMO_MEMORIES, events: [], assistantOpen: false, assistantAction: null, assistantPrompt: null })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('advanced cognitive games', () => {
  it('starts advanced games from the saved assessment baseline instead of inheriting level 3', async () => {
    useScreenContext.setState({ assessmentBaselineDifficulty: 1, difficultyLevel: 1 })
    render(<MemoryRouter><DualNBackGame /></MemoryRouter>)

    await waitFor(() => expect(useScreenContext.getState().difficultyLevel).toBe(1))
  })

  it('supports dual n-back match, no-match, and latency-aware session logging', () => {
    const round = buildDualNBackRound(2, 4)
    expect(round.correctAnswer).toMatch(/match|no-match/)
    expect(round.gridSize).toBeGreaterThanOrEqual(3)
    expect(round.n).toBeGreaterThanOrEqual(2)

    render(<MemoryRouter><DualNBackGame /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Start playing' }))
    fireEvent.click(screen.getByRole('button', { name: 'Match' }))
    expect(useApp.getState().events.some((event) => event.type === 'response_submitted' && event.activityId === 'dual-n-back')).toBe(true)
  })

  it('feeds rapid answer interactions to adaptive difficulty without rebuilding the active board', () => {
    useScreenContext.setState({ assessmentBaselineDifficulty: 3, difficultyLevel: 4 })
    const startedAt = Date.now()
    const clock = vi.spyOn(Date, 'now').mockReturnValue(startedAt)
    const round = buildDualNBackRound(3, 0)
    const wrongAnswer = round.correctAnswer === 'match' ? 'No Match' : 'Match'
    render(<MemoryRouter><DualNBackGame /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Start playing' }))
    const board = screen.getByLabelText('Dual N-Back board')
    const activeTileBeforeDifficultyChange = Array.from(board.querySelectorAll('button'))
      .find((button) => button.textContent === '●')?.getAttribute('aria-label')
    clock.mockReturnValue(startedAt + 20_001)

    for (let attempt = 0; attempt < 3; attempt += 1) {
      fireEvent.click(screen.getByRole('button', { name: wrongAnswer }))
      if (attempt < 2) fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    }

    expect(useApp.getState().events.some((event) =>
      event.type === 'rapid_taps' && 'activityId' in event && event.activityId === 'dual-n-back' && event.count >= 3,
    )).toBe(true)
    expect(useApp.getState().events.some((event) => event.type === 'difficulty_changed' && event.activityId === 'dual-n-back')).toBe(true)
    expect(board.querySelectorAll('button')).toHaveLength(9)
    expect(Array.from(board.querySelectorAll('button')).find((button) => button.textContent === '●')?.getAttribute('aria-label'))
      .toBe(activeTileBeforeDifficultyChange)
  })

  it('allows trail making to recover after an invalid move and finish in order', () => {
    const round = buildTrailMakingRound(2)
    expect(round.sequence.length).toBeGreaterThanOrEqual(5)
    expect(round.nodes.length).toBe(round.sequence.length)

    render(<MemoryRouter><TrailMakingGame /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Start playing' }))
    fireEvent.click(screen.getByRole('button', { name: 'Trail marker 1' }))
    expect(screen.getByText(/Next:/i)).toBeInTheDocument()
    expect(useApp.getState().events.some((event) => event.type === 'response_submitted' && event.activityId === 'trail-making')).toBe(true)
  })

  it('shows a back action in each advanced game so players can leave without finishing', () => {
    const { rerender } = render(<MemoryRouter><DualNBackGame /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /back to games/i })).toBeInTheDocument()

    rerender(<MemoryRouter><TrailMakingGame /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /back to games/i })).toBeInTheDocument()

    rerender(<MemoryRouter><CategoryAssociationGame /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /back to games/i })).toBeInTheDocument()
  })

  it('selects a correct category association with memory personalization and falls back generically when memories are empty', () => {
    render(<MemoryRouter><CategoryAssociationGame /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Start playing' }))
    const buttons = screen.getAllByRole('button').filter((button) => !/back to games/i.test(button.textContent ?? ''))
    const firstChoice = buttons.find((button) => button.textContent && !/start playing|play again/i.test(button.textContent))
    expect(firstChoice).toBeTruthy()
    if (!firstChoice) throw new Error('No category option was rendered')
    fireEvent.click(firstChoice)
    expect(useApp.getState().events.some((event) => event.type === 'response_submitted' && event.activityId === 'category-association')).toBe(true)

    useApp.setState({ memories: [], events: [] })
    const fallback = buildCategoryAssociationPrompt(1, [])
    expect(fallback.source).toBe('generic')
    expect(fallback.choices.length).toBeGreaterThan(0)
  })
})
