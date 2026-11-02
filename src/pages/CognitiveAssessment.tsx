/** Presents the consent-based cognitive check-in and saves its supportive result. */
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { ArrowLeft, RotateCcw, Sparkles } from 'lucide-react'
import { createAssessment, listAssessments } from '@/lib/apiClient'
import {
  ASSESSMENT_MAX_SCORE,
  assessmentResultFor,
  createAssessmentSession,
  scoreOrientationAnswer,
  scoreAssessment,
  stageForScore,
  type AssessmentDomain,
  type AssessmentSession,
} from '@/lib/cognitiveAssessment/engine'
import { ASSESSMENT_PROMPTS, ATTENTION_DIGITS, LANGUAGE_SENTENCE, MEMORY_WORDS, NAMING_OBJECTS } from '@/lib/cognitiveAssessment/tasks'
import { useScreenContext } from '@/store/useScreenContext'
import { useApp } from '@/store/useApp'
import PageHeader from '@/components/PageHeader'

const OBJECT_ILLUSTRATIONS: Record<string, string> = {
  chair: '🪑',
  flower: '🌼',
  window: '🪟',
  cup: '☕',
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
  const [namingAnswer, setNamingAnswer] = useState('')
  const [attentionVisible, setAttentionVisible] = useState(true)
  const [attentionAnswer, setAttentionAnswer] = useState('')
  const [languageVisible, setLanguageVisible] = useState(true)
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
    const nextScores = {
      ...domainScores,
      [domain]: domain === 'visuospatial' ? (domainScores.visuospatial ?? 0) + score : score,
    }
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
    setNamingAnswer('')
    setAttentionVisible(true)
    setAttentionAnswer('')
    setLanguageVisible(true)
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
          <AssessmentDrawingPad
            key={currentPrompt.id}
            title={currentPrompt.title}
            onComplete={(score) => finishTask(currentPrompt.domain, score)}
          />
        )}

        {currentPrompt.domain === 'naming' && (
          <div className="mt-5">
            <div className="grid grid-cols-2 gap-3" aria-label="Object pictures">
              {NAMING_OBJECTS.map((object) => (
                <div key={object.label} role="img" aria-label={object.label} className="grid min-h-24 place-items-center rounded-xl border-2 border-mint-200 bg-white text-5xl">
                  {OBJECT_ILLUSTRATIONS[object.image]}
                </div>
              ))}
            </div>
            <label className="mt-4 block">
              <span className="font-semibold">Type the names you remember</span>
              <input aria-label="Object names" value={namingAnswer} onChange={(event) => setNamingAnswer(event.target.value)} className="mt-2 min-h-[56px] w-full rounded-xl border-2 border-mint-200 bg-white px-4" placeholder="Separate names with commas" />
            </label>
            <button type="button" disabled={!namingAnswer.trim()} onClick={() => {
              const answer = new Set(namingAnswer.toLowerCase().match(/[a-z]+/g) ?? [])
              const score = NAMING_OBJECTS.filter((object) => answer.has(object.label)).length
              finishTask(currentPrompt.domain, score)
            }} className="btn-primary mt-4 w-full min-h-[56px]">Save object names</button>
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
                <button type="button" onClick={() => {
                  const words = memoryRecall.toLowerCase().match(/[a-z]+/g) ?? []
                  const recalled = new Set(words)
                  const correctCount = MEMORY_WORDS.filter((word) => recalled.has(word)).length
                  const recalledInOrder = MEMORY_WORDS.every((word, index) => words[index] === word)
                  finishTask(currentPrompt.domain, correctCount + Number(recalledInOrder) + Number(correctCount === MEMORY_WORDS.length))
                }} className="btn-primary mt-4 w-full min-h-[56px]">Save memory response</button>
              </label>
            )}
          </div>
        )}

        {currentPrompt.domain === 'attention' && (
          <div className="mt-5">
            {attentionVisible ? (
              <div className="rounded-2xl bg-white p-5 text-center">
                <p className="text-3xl font-bold tracking-[0.3em]" aria-label="Number to remember">{ATTENTION_DIGITS}</p>
                <button type="button" onClick={() => { setAttentionVisible(false); setAttentionAnswer('') }} className="btn-primary mt-5 w-full min-h-[56px]">Hide number</button>
              </div>
            ) : (
              <label className="block">
                <span className="font-semibold">Type the number you remember</span>
                <input aria-label="Digit span answer" inputMode="numeric" value={attentionAnswer} onChange={(event) => setAttentionAnswer(event.target.value)} className="mt-2 min-h-[56px] w-full rounded-xl border-2 border-mint-200 bg-white px-4 text-lg" />
                <button type="button" disabled={attentionAnswer.trim().length === 0} onClick={() => finishTask(currentPrompt.domain, attentionAnswer.trim() === ATTENTION_DIGITS ? 5 : 0)} className="btn-primary mt-4 w-full min-h-[56px]">Continue</button>
              </label>
            )}
          </div>
        )}

        {currentPrompt.domain === 'language' && (
          <div className="mt-5">
            {languageVisible ? (
              <div className="rounded-2xl bg-white p-5 text-center">
                <p className="text-xl font-semibold">{LANGUAGE_SENTENCE}</p>
                <button type="button" onClick={() => { setLanguageVisible(false); setLanguageAnswer('') }} className="btn-primary mt-5 w-full min-h-[56px]">Hide sentence</button>
              </div>
            ) : (
              <label className="block">
                <span className="font-semibold">Type the sentence you remember</span>
                <textarea aria-label="Language repetition answer" value={languageAnswer} onChange={(event) => setLanguageAnswer(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border-2 border-mint-200 bg-white p-4" />
                <button type="button" disabled={!languageAnswer.trim()} onClick={() => {
                  const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, ' ')
                  finishTask(currentPrompt.domain, normalize(languageAnswer) === normalize(LANGUAGE_SENTENCE) ? 5 : 0)
                }} className="btn-primary mt-4 w-full min-h-[56px]">Continue</button>
              </label>
            )}
          </div>
        )}

        {currentPrompt.domain === 'orientation' && (
          <label className="mt-5 block">
            <span className="font-semibold">Date, month, year, day, and place</span>
            <textarea aria-label="Orientation answer" value={orientationAnswer} onChange={(event) => setOrientationAnswer(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border-2 border-mint-200 bg-white p-4" placeholder="For example: 6 October 2026, Monday, at home" />
            <button type="button" disabled={orientationAnswer.trim().length === 0} onClick={() => finishTask(currentPrompt.domain, scoreOrientationAnswer(orientationAnswer))} className="btn-primary mt-4 w-full min-h-[56px]">Save orientation response</button>
          </label>
        )}
      </section>
    </>
  )
}

function AssessmentDrawingPad({ title, onComplete }: { title: string; onComplete: (score: number) => void }) {
  const [paths, setPaths] = useState<string[]>([])
  const [activePath, setActivePath] = useState('')
  const activePathRef = useRef('')
  const activePointerId = useRef<number | null>(null)

  function point(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const width = bounds.width || 240
    const height = bounds.height || 160
    return {
      x: Math.max(0, Math.min(240, ((event.clientX - bounds.left) / width) * 240)),
      y: Math.max(0, Math.min(160, ((event.clientY - bounds.top) / height) * 160)),
    }
  }

  function startStroke(event: PointerEvent<SVGSVGElement>) {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
    event.preventDefault()
    activePointerId.current = event.pointerId
    if (event.currentTarget.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId)
    const position = point(event)
    activePathRef.current = `M ${position.x} ${position.y}`
    setActivePath(activePathRef.current)
  }

  function continueStroke(event: PointerEvent<SVGSVGElement>) {
    if (activePointerId.current !== event.pointerId) return
    event.preventDefault()
    const position = point(event)
    activePathRef.current = `${activePathRef.current} L ${position.x} ${position.y}`
    setActivePath(activePathRef.current)
  }

  function finishStroke(event: PointerEvent<SVGSVGElement>) {
    if (activePointerId.current !== event.pointerId) return
    if (activePathRef.current) setPaths((current) => [...current, activePathRef.current])
    activePathRef.current = ''
    activePointerId.current = null
    setActivePath('')
  }

  function clearDrawing() {
    activePathRef.current = ''
    activePointerId.current = null
    setActivePath('')
    setPaths([])
  }

  const hasDrawing = paths.length > 0 || Boolean(activePath)

  return (
    <div className="mt-5 space-y-3">
      <p className="text-sm font-semibold">Touch and drag to draw. You can also use a mouse.</p>
      <svg
        viewBox="0 0 240 160"
        role="application"
        aria-label={`${title.replace(/ drawing$/, '')} drawing area`}
        onPointerDown={startStroke}
        onPointerMove={continueStroke}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
        onContextMenu={(event) => event.preventDefault()}
        className="block h-48 w-full rounded-2xl border-2 border-dashed border-garden-300 bg-white"
        style={{ touchAction: 'none', userSelect: 'none' }}
      >
        {[...paths, activePath].filter(Boolean).map((path, index) => (
          <path key={index} d={path} fill="none" stroke="#2f6654" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
      <div className="flex gap-3">
        <button type="button" onClick={clearDrawing} className="btn-soft flex-1 min-h-[56px]">Clear</button>
        <button type="button" disabled={!hasDrawing} onClick={() => onComplete(2)} className="btn-primary flex-1 min-h-[56px]">
          Save drawing
        </button>
      </div>
    </div>
  )
}
