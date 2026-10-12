import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FeedbackPopup, choiceStateClass } from './GameFeedback'

describe('game feedback styling', () => {
  it('uses theme-driven classes for button states', () => {
    expect(choiceStateClass('default')).toContain('choice-default')
    expect(choiceStateClass('correct')).toContain('choice-correct')
    expect(choiceStateClass('wrong')).toContain('choice-wrong')
  })

  it('renders correct and incorrect feedback with distinct status classes', () => {
    const { rerender } = render(
      <FeedbackPopup status="correct" message="Nice work" onContinue={() => undefined} />,
    )
    expect(screen.getByRole('alert')).toHaveClass('feedback-correct')

    rerender(<FeedbackPopup status="incorrect" message="Not quite" onRetry={() => undefined} />)
    expect(screen.getByRole('alert')).toHaveClass('feedback-wrong')
  })
})
