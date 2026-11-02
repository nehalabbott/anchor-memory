/** Defines cognitive check-in sessions, domain scores, and result recommendations. */
export const ASSESSMENT_MAX_SCORE = 30
export const ASSESSMENT_DOMAINS = [
  'visuospatial',
  'naming',
  'memory',
  'attention',
  'language',
  'orientation',
] as const

export type AssessmentDomain = typeof ASSESSMENT_DOMAINS[number]
export type AssessmentStage = 'normal' | 'mci' | 'dementia'
export type DifficultyRecommendation = 1 | 2 | 3

export interface AssessmentDomainScore {
  score: number
  maxScore: number
  completed: boolean
}

export interface AssessmentSession {
  id: string
  instrumentId: string
  instrumentVersion: string
  consent: true
  startedAt: number
  completedAt?: number
  status: 'in_progress' | 'completed'
  score: number
  domains: Record<AssessmentDomain, AssessmentDomainScore>
}

export interface AssessmentResult {
  score: number
  stage: AssessmentStage
  category: string
  domainScores: Record<AssessmentDomain, AssessmentDomainScore>
  baselineDifficulty: DifficultyRecommendation
}

export const DOMAIN_CONFIG: Record<AssessmentDomain, { maxScore: number }> = {
  visuospatial: { maxScore: 4 },
  naming: { maxScore: 4 },
  memory: { maxScore: 5 },
  attention: { maxScore: 5 },
  language: { maxScore: 5 },
  orientation: { maxScore: 7 },
}

export function scoreOrientationAnswer(answer: string, date = new Date()): number {
  const tokens: string[] = answer.toLowerCase().match(/[a-z]+|\d+(?:st|nd|rd|th)?/g) ?? []
  const day = String(date.getDate())
  const monthNumber = String(date.getMonth() + 1)
  const year = String(date.getFullYear())
  const monthNames = new Intl.DateTimeFormat('en', { month: 'long' }).format(date).toLowerCase()
  const monthShort = new Intl.DateTimeFormat('en', { month: 'short' }).format(date).toLowerCase().replace('.', '')
  const weekday = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(date).toLowerCase()
  const weekdayShort = new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date).toLowerCase().replace('.', '')
  const normalizedTokens = tokens.map((token) => token.replace(/(?:st|nd|rd|th)$/, ''))
  const hasDay = normalizedTokens.includes(day)
  const hasMonth = normalizedTokens.includes(monthNumber) || tokens.includes(monthNames) || tokens.includes(monthShort)
  const hasYear = tokens.includes(year)
  const hasWeekday = tokens.includes(weekday) || tokens.includes(weekdayShort)
  const monthWords = new Set<string>(Array.from({ length: 12 }, (_, index) => {
    const monthDate = new Date(2024, index, 1)
    return [
      new Intl.DateTimeFormat('en', { month: 'long' }).format(monthDate).toLowerCase(),
      new Intl.DateTimeFormat('en', { month: 'short' }).format(monthDate).toLowerCase().replace('.', ''),
    ]
  }).flat())
  const weekdayWords = new Set<string>(Array.from({ length: 7 }, (_, index) => {
    const weekdayDate = new Date(2024, 0, index + 1)
    return [
      new Intl.DateTimeFormat('en', { weekday: 'long' }).format(weekdayDate).toLowerCase(),
      new Intl.DateTimeFormat('en', { weekday: 'short' }).format(weekdayDate).toLowerCase().replace('.', ''),
    ]
  }).flat())
  const dateWords = new Set<string>([
    ...monthWords, ...weekdayWords,
    day, monthNumber, year, 'st', 'nd', 'rd', 'th', 'at', 'in', 'on', 'the', 'place',
  ])
  const hasPlace = tokens.some((token) => !/^\d/.test(token) && !dateWords.has(token))

  return Number(hasDay) * 2 + Number(hasMonth) + Number(hasYear) + Number(hasWeekday) + Number(hasPlace) * 2
}

export const STAGE_CONFIG: Record<AssessmentStage, { label: string; scoreMin: number; baseline: DifficultyRecommendation }> = {
  normal: { label: 'Normal Cognition', scoreMin: 24, baseline: 3 },
  mci: { label: 'Mild Cognitive Impairment (MCI)', scoreMin: 16, baseline: 2 },
  dementia: { label: 'Early/Moderate Dementia', scoreMin: 0, baseline: 1 },
}

export function createAssessmentSession(instrumentId = 'anchor-cognitive-screening', startedAt = Date.now()): AssessmentSession {
  return {
    id: `assessment-${startedAt}-${Math.random().toString(36).slice(2, 8)}`,
    instrumentId,
    instrumentVersion: '1.0-supportive-screening',
    consent: true,
    startedAt,
    status: 'in_progress',
    score: 0,
    domains: Object.fromEntries(ASSESSMENT_DOMAINS.map((domain) => [domain, { score: 0, maxScore: DOMAIN_CONFIG[domain].maxScore, completed: false }])) as AssessmentSession['domains'],
  }
}

export function scoreAssessment(session: AssessmentSession, partialScores: Partial<Record<AssessmentDomain, number>>): AssessmentSession {
  const domains = Object.fromEntries(ASSESSMENT_DOMAINS.map((domain) => {
    const score = Math.max(0, Math.min(DOMAIN_CONFIG[domain].maxScore, Math.round(partialScores[domain] ?? 0)))
    return [domain, { score, maxScore: DOMAIN_CONFIG[domain].maxScore, completed: score > 0 }]
  })) as AssessmentSession['domains']
  const score = ASSESSMENT_DOMAINS.reduce((total, domain) => total + domains[domain].score, 0)
  return {
    ...session,
    score: Math.min(ASSESSMENT_MAX_SCORE, score),
    status: 'completed',
    completedAt: Date.now(),
    domains,
  }
}

export function stageForScore(score: number): AssessmentStage {
  const safeScore = Math.max(0, Math.min(ASSESSMENT_MAX_SCORE, Math.round(score)))
  if (safeScore >= STAGE_CONFIG.normal.scoreMin) return 'normal'
  if (safeScore >= STAGE_CONFIG.mci.scoreMin) return 'mci'
  return 'dementia'
}

export function baselineDifficultyForStage(stage: AssessmentStage): DifficultyRecommendation {
  return STAGE_CONFIG[stage].baseline
}

export function assessmentResultFor(session: AssessmentSession): AssessmentResult {
  const stage = stageForScore(session.score)
  return {
    score: session.score,
    stage,
    category: STAGE_CONFIG[stage].label,
    domainScores: session.domains,
    baselineDifficulty: baselineDifficultyForStage(stage),
  }
}
