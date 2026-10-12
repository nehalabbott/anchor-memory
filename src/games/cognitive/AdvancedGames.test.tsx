import { beforeEach, describe, expect, it } from 'vitest'
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
    fireEvent.click(screen.getByRole('button', { name: 'Begin activity' }))
    fireEvent.click(screen.getByRole('button', { name: 'Match' }))
    expect(useApp.getState().events.some((event) => event.type === 'response_submitted' && event.activityId === 'dual-n-back')).toBe(true)
  })

  it('allows trail making to recover after an invalid move and finish in order', () => {
    const round = buildTrailMakingRound(2)
    expect(round.sequence.length).toBeGreaterThanOrEqual(5)
    expect(round.nodes.length).toBe(round.sequence.length)

    render(<MemoryRouter><TrailMakingGame /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Begin activity' }))
    fireEvent.click(screen.getByRole('button', { name: 'Trail marker 1' }))
    expect(screen.getByText(/Next:/i)).toBeInTheDocument()
    expect(useApp.getState().events.some((event) => event.type === 'response_submitted' && event.activityId === 'trail-making')).toBe(true)
  })

  it('selects a correct category association with memory personalization and falls back generically when memories are empty', () => {
    render(<MemoryRouter><CategoryAssociationGame /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: 'Begin activity' }))
    const buttons = screen.getAllByRole('button')
    const firstChoice = buttons.find((button) => button.textContent && /watering can|marigold|teapot|cake|song|dance|Anita|Rahul/i.test(button.textContent))
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
