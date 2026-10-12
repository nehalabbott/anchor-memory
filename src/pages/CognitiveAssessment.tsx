import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, RotateCcw, Sparkles } from 'lucide-react'
import { createAssessment, listAssessments } from '@/lib/apiClient'
import {
  ASSESSMENT_MAX_SCORE,
  assessmentResultFor,
  createAssessmentSession,
  scoreAssessment,
  stageForScore,
  type AssessmentDomain,
  type AssessmentSession,
} from '@/lib/cognitiveAssessment/engine'
import { ASSESSMENT_PROMPTS, MEMORY_WORDS, NAMING_OBJECTS } from '@/lib/cognitiveAssessment/tasks'
import { useScreenContext } from '@/store/useScreenContext'
import { useApp } from '@/store/useApp'
import PageHeader from '@/components/PageHeader'

const DOMAIN_LABELS: Record<AssessmentDomain, string> = {
  visuospatial: 'Visuospatial / Executive',
  naming: 'Naming',
  memory: 'Memory',
  attention: 'Attention',
  language: 'Language',
  orientation: 'Orientation',
}

const DISCLAIMER = 'This activity is inspired by common cognitive screening tasks and is not a medical diagnosis. A healthcare professional should interpret concerning results.'

export default function CognitiveAssessment() {
  const { setActivityState, setAssessmentBaseline } = useScreenContext()
  const { openAssistantWithMessage } = useApp()
  const [consent, setConsent] = useState(false)
  const [started, setStarted] = useState(false)
  const [session, setSession] = useState<AssessmentSession | null>(null)
  const [step, setStep] = useState(0)
  const [domainScores, setDomainScores] = useState<Partial<Record<AssessmentDomain, number>>>({})
  const [memoryVisible, setMemoryVisible] = useState(true)
  const [memoryRecall, setMemoryRecall] = useState('')
  const [attentionAnswer, setAttentionAnswer] = useState('')
  const [languageAnswer, setLanguageAnswer] = useState('')
  const [orientationAnswer, setOrientationAnswer] = useState('')
  const [completed, setCompleted] = useState(false)
  const [lastAssessment, setLastAssessment] = useState<{ score: number; stage: ReturnType<typeof stageForScore>; createdAt: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const prompts = useMemo(() => ASSESSMENT_PROMPTS, [])
  const currentPrompt = prompts[step]

  useEffect(() => {
    let active = true
    void listAssessments().then((assessments) => {
      const latest = assessments.find((assessment) => assessment.status === 'completed' && assessment.result)
      if (!active || !latest) return
      const result = latest.result as Record<string, unknown>
      setLastAssessment({
        score: Number(result.score ?? 0),
        stage: String(result.stage ?? stageForScore(Number(result.score ?? 0))) as ReturnType<typeof stageForScore>,
        createdAt: latest.createdAt,
      })
    }).catch(() => undefined)
    return () => { active = false }
  }, [])

  const finishTask = (domain: AssessmentDomain, score: number) => {
    const nextScores = { ...domainScores, [domain]: score }
    setDomainScores(nextScores)
    if (step + 1 >= prompts.length) {
      void complete(nextScores)
      return
    }
    setStep((current) => current + 1)
  }

  const start = () => {
    if (!consent) return
    setStarted(true)
    setSession(createAssessmentSession('anchor-cognitive-screening', Date.now()))
    setActivityState('active')
    setStep(0)
    setMemoryVisible(true)
    setMemoryRecall('')
    setAttentionAnswer('')
    setLanguageAnswer('')
    setOrientationAnswer('')
    openAssistantWithMessage('Take your time. The next activity is ready when you are.')
  }

  const complete = async (nextScores: Partial<Record<AssessmentDomain, number>>) => {
    if (!session) return
    const completed = scoreAssessment(session, nextScores)
    setSession(completed)
    setSaving(true)
    setError(null)
    try {
      const result = assessmentResultFor(completed)
      const assessment = await createAssessment({
        instrumentId: completed.instrumentId,
        instrumentVersion: completed.instrumentVersion,
        consent: completed.consent,
        startedAt: completed.startedAt,
        completedAt: completed.completedAt,
        status: completed.status,
        result: JSON.parse(JSON.stringify(result)),
      })
      setLastAssessment({ score: completed.score, stage: result.stage, createdAt: assessment.createdAt })
      setAssessmentBaseline(result.baselineDifficulty)
      setActivityState('completed')
      setCompleted(true)
    } catch (caught) {
      setError('The check-in could not be saved. Your result is still available for this visit.')
    } finally {
      setSaving(false)
    }
  }

  if (!started) {
    return (
      <>
        <PageHeader title="Cognitive Check-in" />
        <section className="card mt-5 p-5" aria-labelledby="assessment-intro">
          <span className="inline-flex rounded-full bg-mint-100 px-3 py-1 text-sm font-semibold text-garden-900">Support-oriented screening</span>
          <h2 id="assessment-intro" className="mt-4 text-2xl font-bold">A calm check-in together</h2>
          <p className="mt-3 text-ink/80">This is a short, optional activity inspired by common cognitive screening tasks. It is not a medical diagnosis.</p>
          <p className="mt-3 text-sm text-ink/70">{DISCLAIMER}</p>
          {lastAssessment && (
            <div className="mt-5 rounded-2xl bg-mint-100 p-4 text-left" aria-live="polite">
              <p className="text-sm font-semibold text-garden-900">Your most recent private result</p>
              <p className="mt-1 text-lg font-bold">{lastAssessment.score}/30 · {lastAssessment.stage}</p>
              <p className="mt-1 text-sm text-ink/70">This summary is qualitative only and is not a diagnosis.</p>
            </div>
          )}

          <label className="mt-5 block rounded-xl border-2 border-garden-200 bg-white p-4">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-6 w-6 accent-garden-700" />
            <span className="ml-3 font-semibold">I understand this is a screening activity and not a medical diagnosis.</span>
          </label>
          <button type="button" disabled={!consent} onClick={start} className="btn-primary mt-5 w-full min-h-[56px]">Start the check-in</button>
        </section>
      </>
    )
  }

  if (completed && session) {
    const result = assessmentResultFor(session)
    return (
      <>
        <PageHeader title="Check-in complete" />
        <section className="card mt-5 p-5 text-center" aria-labelledby="result-heading">
          <Sparkles className="mx-auto text-garden-600" size={42} />
          <h2 id="result-heading" className="mt-3 text-2xl font-bold">Thank you for taking your time</h2>
          <p className="mt-2 text-ink/75">Your support-oriented screening result is saved privately.</p>
          <div className="mt-5 rounded-2xl bg-mint-100 p-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-garden-900">Screening score</p>
            <p className="mt-1 text-5xl font-bold text-garden-900">{result.score}<span className="text-2xl">/30</span></p>
            <p className="mt-2 text-xl font-bold">{result.category}</p>
            <p className="mt-1 text-sm text-ink/75">Suggested starting support level: {result.baselineDifficulty}/3</p>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink/70">{DISCLAIMER}</p>
          <button type="button" onClick={() => setStarted(false)} className="btn-soft mt-5 w-full min-h-[56px]">Return to Profile</button>
        </section>
      </>
    )
  }

  if (!currentPrompt) return null

  return (
    <>
      <PageHeader title="Cognitive Check-in" />
      <section className="card mt-5 p-5" aria-labelledby="task-heading">
        <p className="text-sm font-semibold text-garden-700">Section {step + 1} of {prompts.length}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-mint-100" role="progressbar" aria-label="Assessment progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(((step + 1) / prompts.length) * 100)}>
          <div className="h-full rounded-full bg-garden-600" style={{ width: `${((step + 1) / prompts.length) * 100}%` }} />
        </div>
        <h2 id="task-heading" className="mt-5 text-2xl font-bold">{currentPrompt.title}</h2>
        <p className="mt-3 text-lg leading-relaxed text-ink/80">{currentPrompt.instruction}</p>
        <p className="mt-3 text-sm text-ink/65">{currentPrompt.helper}</p>

        {currentPrompt.domain === 'visuospatial' && (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border-2 border-dashed border-garden-300 bg-white p-4 text-center">
              <label className="block text-sm font-semibold">Drawing space</label>
              <svg viewBox="0 0 240 140" role="img" aria-label="A blank clock and cube drawing area" className="mt-3 h-auto w-full">
                <circle cx="120" cy="70" r="47" fill="white" stroke="#2f6654" strokeWidth="3" />
                <path d="M120 70L120 30M120 70L160 88" stroke="#2f6654" strokeWidth="5" strokeLinecap="round" />
                <path d="M120 70L120 30M120 70L160 88" stroke="#2f6654" strokeWidth="5" strokeLinecap="round" />
                <path d="M70 70h100M120 23v94" stroke="#d7e6df" strokeWidth="1" />
              </svg>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => finishTask(currentPrompt.domain, 3)} className="btn-soft flex-1 min-h-[56px]">Draw a simple shape</button>
              <button type="button" onClick={() => finishTask(currentPrompt.domain, 4)} className="btn-primary flex-1 min-h-[56px]">Continue</button>
            </div>
          </div>
        )}

        {currentPrompt.domain === 'naming' && (
          <div className="mt-5 grid gap-3">
            {NAMING_OBJECTS.map((object) => (
              <button key={object.label} type="button" onClick={() => finishTask(currentPrompt.domain, 4)} className="flex min-h-[72px] items-center gap-4 rounded-xl border-2 border-mint-200 bg-white p-4 text-left">
                <span className="text-4xl" aria-hidden>✦</span>
                <span className="text-lg font-bold">{object.label}</span>
                <Check className="ml-auto" size={24} />
              </button>
            ))}
          </div>
        )}

        {currentPrompt.domain === 'memory' && (
          <div className="mt-5">
            {memoryVisible ? (
              <div className="rounded-2xl bg-white p-5 text-center">
                {MEMORY_WORDS.map((word) => <span key={word} className="mx-2 inline-block rounded-full bg-mint-100 px-4 py-2 font-semibold">{word}</span>)}
                <button type="button" onClick={() => { setMemoryVisible(false); setMemoryRecall('') }} className="btn-primary mt-5 w-full min-h-[56px]">Continue to the next tasks</button>
              </div>
            ) : (
              <label className="block">
                <span className="font-semibold">Type the words you remember</span>
                <input aria-label="Remembered words" value={memoryRecall} onChange={(event) => setMemoryRecall(event.target.value)} className="mt-2 min-h-[56px] w-full rounded-xl border-2 border-mint-200 bg-white px-4" placeholder="For example: garden, sun" />
                <button type="button" onClick={() => finishTask(currentPrompt.domain, memoryRecall ? 5 : 0)} className="btn-primary mt-4 w-full min-h-[56px]">Save memory response</button>
              </label>
            )}
          </div>
        )}

        {currentPrompt.domain === 'attention' && (
          <label className="mt-5 block">
            <span className="font-semibold">Type the number you remember</span>
            <input aria-label="Digit span answer" inputMode="numeric" value={attentionAnswer} onChange={(event) => setAttentionAnswer(event.target.value)} className="mt-2 min-h-[56px] w-full rounded-xl border-2 border-mint-200 bg-white px-4 text-lg" />
            <button type="button" disabled={attentionAnswer.trim().length === 0} onClick={() => finishTask(currentPrompt.domain, attentionAnswer.trim() === '6428' ? 5 : 0)} className="btn-primary mt-4 w-full min-h-[56px]">Continue</button>
          </label>
        )}

        {currentPrompt.domain === 'language' && (
          <label className="mt-5 block">
            <span className="font-semibold">Type the sentence</span>
            <textarea aria-label="Language repetition answer" value={languageAnswer} onChange={(event) => setLanguageAnswer(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border-2 border-mint-200 bg-white p-4" />
            <button type="button" disabled={languageAnswer.trim().length === 0} onClick={() => finishTask(currentPrompt.domain, languageAnswer.trim().toLowerCase() === 'the garden is quiet today' ? 5 : 0)} className="btn-primary mt-4 w-full min-h-[56px]">Continue</button>
          </label>
        )}

        {currentPrompt.domain === 'orientation' && (
          <label className="mt-5 block">
            <span className="font-semibold">Date, month, year, day, and place</span>
            <textarea aria-label="Orientation answer" value={orientationAnswer} onChange={(event) => setOrientationAnswer(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border-2 border-mint-200 bg-white p-4" placeholder="For example: 6 October 2026, Monday, at home" />
            <button type="button" disabled={orientationAnswer.trim().length === 0} onClick={() => finishTask(currentPrompt.domain, 7)} className="btn-primary mt-4 w-full min-h-[56px]">Save orientation response</button>
          </label>
        )}
      </section>
    </>
  )
}
