import { describe, expect, it } from 'vitest'
import {
  ASSESSMENT_MAX_SCORE,
  ASSESSMENT_DOMAINS,
  createAssessmentSession,
  scoreAssessment,
  stageForScore,
  baselineDifficultyForStage,
} from './engine'

describe('MoCA-style screening assessment engine', () => {
  it('creates a consented session containing all six domains and a 30-point ceiling', () => {
    const session = createAssessmentSession('anchor-demo-screen', 1_000)
    expect(session.status).toBe('in_progress')
    expect(session.consent).toBe(true)
    expect(session.score).toBe(0)
    expect(ASSESSMENT_MAX_SCORE).toBe(30)
    expect(Object.keys(session.domains)).toEqual(ASSESSMENT_DOMAINS)
  })

  it('scores every implemented domain and never exceeds 30', () => {
    const session = createAssessmentSession('anchor-demo-screen', 1_000)
    const scored = scoreAssessment(session, {
      visuospatial: 4,
      naming: 4,
      memory: 5,
      attention: 5,
      language: 5,
      orientation: 7,
    })
    expect(scored.score).toBe(30)
    expect(scored.status).toBe('completed')
    expect(scored.domains).toMatchObject({
      visuospatial: { score: 4, maxScore: 4 },
      naming: { score: 4, maxScore: 4 },
      memory: { score: 5, maxScore: 5 },
      attention: { score: 5, maxScore: 5 },
      language: { score: 5, maxScore: 5 },
      orientation: { score: 7, maxScore: 7 },
    })
  })

  it('clamps partial domain results and maps score bands to support-oriented stages', () => {
    expect(stageForScore(30)).toBe('normal')
    expect(stageForScore(24)).toBe('normal')
    expect(stageForScore(18)).toBe('mci')
    expect(stageForScore(10)).toBe('dementia')
    expect(stageForScore(0)).toBe('dementia')
    expect(baselineDifficultyForStage('normal')).toBe(3)
    expect(baselineDifficultyForStage('mci')).toBe(2)
    expect(baselineDifficultyForStage('dementia')).toBe(1)
  })
})
