import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Apple, Armchair, Bird, Camera, Circle, Flower2, Leaf, Pause, Play, RotateCcw, ShoppingBasket, Square, Sun, Triangle, Coffee, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { MemoryPhoto } from '@/components/MemoryMedia'
import {
  buildCategoryRounds, buildFacePrompts, buildPatternRounds, buildSequenceRounds, initials,
  type GameGlyph, type GameToken,
} from '@/games/content'
import type { ActivityId, Part2InteractionEvent, SessionExperience } from '@/lib/types'
import { useApp } from '@/store/useApp'
import { createActivitySession, finishActivitySession, recordActivityEvent } from '@/lib/sessionPersistence'
import { useAdaptiveDifficulty } from '@/hooks/useAdaptiveDifficulty'
import { selectChoicesWithRequired } from '@/lib/adaptiveDifficulty/choices'
import { AdvancedGamePage } from '@/games/cognitive/AdvancedGames'
import { useScreenContext } from '@/store/useScreenContext'
import { FeedbackPopup, HowToPlayCard, choiceStateClass, type FeedbackStatus } from '@/games/GameFeedback'

const ROUTE_ACTIVITY = {
  faces: 'faces',
  match: 'pattern',
  sequence: 'sequence',
  category: 'category',
  'dual-n-back': 'dual-n-back',
  'trail-making': 'trail-making',
  'category-association': 'category-association',
} as const
const TITLES: Record<ActivityId, string> = {
  faces: 'Familiar Faces',
  pattern: 'Pattern & Shape Match',
  sequence: 'Sequence Memory',
  category: 'Odd One Out',
  'dual-n-back': 'Dual N-Back',
  'trail-making': 'Trail Making',
  'category-association': 'Category Association',
}
const INSTRUCTIONS: Record<ActivityId, string> = {
  faces: 'Look at a familiar person and choose their name.',
  pattern: 'Look at the repeating pattern and choose what comes next.',
  sequence: 'Study the visual sequence, hide it, then build it in the same order.',
  category: 'Look at the group and choose the item that is different.',
  'dual-n-back': 'Watch the tile, then decide whether it matches the item from earlier in the sequence.',
  'trail-making': 'Follow the route in order: 1 → A → 2 → B → ...',
  'category-association': 'Choose the item that best matches the group.',
}
const EXAMPLES: Partial<Record<ActivityId, string>> = {
  faces: 'Look at the photo, then tap the name that matches.',
  pattern: 'If you see circle, square, circle, square — the next one is circle.',
  sequence: 'Study the items, then tap them back in the same order you saw them.',
  category: 'If three items are fruit and one is a cup, the cup is the different one.',
}

function ActivityExampleVisual({ activityId }: { activityId: ActivityId }) {
  if (activityId === 'faces') {
    return (
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-mint-200 bg-white p-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-mint-100 text-xl font-bold text-garden-900">A</div>
        <div className="flex flex-col items-start">
          <span className="text-sm font-semibold text-ink/60">Who is this?</span>
          <div className="mt-1 flex gap-2">
            <span className="rounded-lg border border-garden-600 bg-mint-100 px-2 py-1 text-sm font-semibold text-garden-900">Anita</span>
            <span className="rounded-lg border border-garden-600 bg-white px-2 py-1 text-sm font-semibold text-garden-900">Rahul</span>
          </div>
        </div>
      </div>
    )
  }

  if (activityId === 'pattern') {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-mint-200 bg-white p-3">
        {[ 'circle', 'square', 'circle', 'square', 'circle' ].map((glyph, index) => (
          <div key={`${glyph}-${index}`} className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-garden-600 bg-mint-50 text-garden-900">
            <TokenIcon glyph={glyph as GameGlyph} />
          </div>
        ))}
        <span className="text-3xl text-garden-700">?</span>
      </div>
    )
  }

  if (activityId === 'sequence') {
    return (
      <div className="rounded-2xl border border-mint-200 bg-white p-3">
        <div className="flex items-center justify-center gap-2">
          {(['flower', 'apple', 'leaf', 'cup'] as GameGlyph[]).map((glyph, index) => (
            <div key={`${glyph}-${index}`} className="flex h-12 w-12 flex-col items-center justify-center rounded-xl border-2 border-garden-600 bg-mint-50 text-garden-900">
              <TokenIcon glyph={glyph} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-mint-200 bg-white p-3">
      {(['apple', 'apple', 'apple', 'cup'] as GameGlyph[]).map((glyph, index) => (
        <div key={`${glyph}-${index}`} className="flex h-14 items-center justify-center rounded-xl border-2 border-garden-600 bg-mint-50 text-garden-900">
          <TokenIcon glyph={glyph} />
        </div>
      ))}
    </div>
  )
}
const GAME_IDS = Object.keys(ROUTE_ACTIVITY) as (keyof typeof ROUTE_ACTIVITY)[]
const GLYPHS: Record<GameGlyph, LucideIcon> = {
  circle: Circle, square: Square, triangle: Triangle, flower: Flower2, leaf: Leaf,
  apple: Apple, sun: Sun, cup: Coffee, camera: Camera, basket: ShoppingBasket, bird: Bird, chair: Armchair,
}
const TOKEN_STYLE = {
  garden: 'border-garden-600 bg-mint-100 text-garden-900',
  fruit: 'border-rose-main bg-rose-soft text-rose-deep',
  kitchen: 'border-sun-main bg-sun-soft text-sun-deep',
  shape: 'border-sky-deep bg-sky-soft text-sky-deep',
  everyday: 'border-iris-main bg-iris-soft text-iris-deep',
}

const COLOR_MAP = {
  Blue: '#4F9AE8',
  Green: '#1E9A7A',
  Yellow: '#D8A93D',
  Pink: '#D77BA5',
  Purple: '#8C6AD8',
  Orange: '#D97A45',
  Red: '#D96161',
  White: '#F8F8F8',
} as const

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  const short = normalized.length === 3 ? normalized.split('').map((part) => part + part).join('') : normalized
  const numeric = Number.parseInt(short, 16)
  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  }
}

function mixHexColors(first: string, second: string, weight = 0.5) {
  const a = hexToRgb(first)
  const b = hexToRgb(second)
  const mix = (channelA: number, channelB: number) => Math.round(channelA + (channelB - channelA) * weight)
  return `rgb(${mix(a.r, b.r)}, ${mix(a.g, b.g)}, ${mix(a.b, b.b)})`
}

function getFavoriteColorPalette(colors: string[]) {
  const selected = colors
    .map((color) => color && color in COLOR_MAP ? COLOR_MAP[color as keyof typeof COLOR_MAP] : null)
    .filter((color): color is Exclude<(typeof COLOR_MAP)[keyof typeof COLOR_MAP], null> => Boolean(color))

  const primary = selected[0] ?? '#0B8A70'
  const secondary = selected[1] ?? primary
  return {
    primary,
    secondary,
    blended: mixHexColors(primary, secondary, 0.5),
  }
}

export default function ActivityRoute() {
  const { game } = useParams()
  if (!game || !GAME_IDS.includes(game as keyof typeof ROUTE_ACTIVITY)) return <UnknownActivity />
  const resolved = ROUTE_ACTIVITY[game as keyof typeof ROUTE_ACTIVITY]
  if (resolved === 'dual-n-back' || resolved === 'trail-making' || resolved === 'category-association') {
    return <AdvancedGamePage game={resolved} />
  }
  return <Activity key={game} activityId={resolved} />
}

function Activity({ activityId }: { activityId: ActivityId }) {
  const navigate = useNavigate()
  const { memories, logEvent, recordSessionExperience, requestAssistantAction } = useApp()
  const accentColor = useApp((s) => s.preferences.favoriteColors[0])
  const accent = accentColor && accentColor in COLOR_MAP ? COLOR_MAP[accentColor as keyof typeof COLOR_MAP] : '#0B8A70'
  const [session] = useState(() => createActivitySession(activityId))
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [showExperience, setShowExperience] = useState(false)
  const [roundIndex, setRoundIndex] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [status, setStatus] = useState<FeedbackStatus>(null)
  const [feedback, setFeedback] = useState('')
  const [hint, setHint] = useState<string | null>(null)
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null)
  const [simplerMode, setSimplerMode] = useState(false)
  const [sequenceVisible, setSequenceVisible] = useState(true)
  const [sequenceSelection, setSequenceSelection] = useState<string[]>([])
  const promptStartedAt = useRef(Date.now())
  const pausedAt = useRef<number | null>(null)
  const startedRef = useRef(false)
  const finishedRef = useRef(false)
  const unmountToken = useRef(0)

  useEffect(() => {
    const token = ++unmountToken.current
    return () => {
      queueMicrotask(() => {
        if (unmountToken.current === token && startedRef.current && !finishedRef.current) {
          finishedRef.current = true
          finishActivitySession(session, 'left', useApp.getState().logEvent)
        }
      })
    }
  }, [session])

  function recordEvent(event: Part2InteractionEvent) {
    recordActivityEvent(session, event, logEvent)
  }

  const setGameContext = useScreenContext((state) => state.setGameContext)
  const baselineDifficulty = useScreenContext((state) => state.assessmentBaselineDifficulty)
  const adaptive = useAdaptiveDifficulty({
    initialLevel: baselineDifficulty ?? 3,
    onLevelChange: (change) => recordEvent({
      type: 'difficulty_changed', at: change.at, sessionId: session.sessionId, activityId,
      previousLevel: change.previousLevel, newLevel: change.newLevel,
      reason: change.reason === 'multimodal_distress' ? 'sustained_difficulty' : change.reason,
    }),
  })

  useEffect(() => {
    setGameContext({
      activeGame: activityId,
      gameDomain: activityId === 'faces' ? 'Memory' : activityId === 'pattern' ? 'Visual Reasoning' : activityId === 'sequence' ? 'Working Memory' : 'Executive Function',
      difficultyLevel: adaptive.level,
      activityState: started ? (paused ? 'paused' : answered ? 'completed' : 'active') : 'idle',
      score: null,
    })
  }, [activityId, adaptive.level, answered, paused, setGameContext, started])
  const [roundDifficulty, setRoundDifficulty] = useState(() => adaptive.config)
  const difficulty = roundDifficulty

  function trackTap(event: PointerEvent<HTMLElement>) {
    if (!started || paused || showExperience || answered) return
    const target = event.target instanceof Element ? event.target : null
    const interactive = Boolean(target?.closest('button, a, input, select, textarea, [role="button"]'))
    const detection = adaptive.recordInteraction({ interactive, at: Date.now() })
    if (detection?.frustrationLike) {
      recordEvent({ type: 'rapid_taps', at: Date.now(), sessionId: session.sessionId, activityId, count: detection.count })
    }
  }

  const faces = buildFacePrompts(memories)
  const patterns = buildPatternRounds(memories)
  const sequences = buildSequenceRounds(memories, difficulty.sequenceLength)
  const categories = buildCategoryRounds(memories)
  const face = faces[roundIndex]
  const pattern = patterns[roundIndex]
  const sequence = sequences[roundIndex]
  const category = categories[roundIndex]
  const faceChoices = face ? selectChoicesWithRequired(face.choices, [face.memory.id], simplerMode ? 1 : difficulty.faceDistractors) : []
  const patternChoices = pattern ? selectChoicesWithRequired(pattern.choices, [pattern.answer.id], simplerMode ? 1 : difficulty.patternDistractors) : []
  const categoryChoices = category ? selectChoicesWithRequired(category.items, [category.answerId], simplerMode ? 1 : difficulty.categoryDistractors) : []
  const targetSequence = sequence?.items.slice(0, simplerMode ? 2 : difficulty.sequenceLength) ?? []
  const sequenceChoices = sequence
    ? selectChoicesWithRequired(sequence.choices, targetSequence.map((token) => token.id), simplerMode ? 1 : difficulty.sequenceDistractors)
    : []
  const currentSourceIds = activityId === 'faces' ? (face ? [face.memory.id] : [])
    : activityId === 'pattern' ? pattern?.sourceMemoryIds ?? []
      : activityId === 'sequence' ? sequence?.sourceMemoryIds ?? []
        : category?.sourceMemoryIds ?? []
  const roundCount = activityId === 'faces' ? faces.length
    : activityId === 'pattern' ? patterns.length
      : activityId === 'sequence' ? sequences.length : categories.length
  const hasContent = activityId !== 'faces' || faces.length > 0

  function presentCurrentMemory() {
    for (const memoryId of currentSourceIds) {
      recordEvent({ type: 'memory_presented', at: Date.now(), sessionId: session.sessionId, activityId, memoryId })
    }
  }

  function begin() {
    startedRef.current = true
    promptStartedAt.current = Date.now()
    setRoundDifficulty(adaptive.config)
    setStarted(true)
    setAnswered(false)
    setStatus(null)
    setFeedback('')
    setHint(null)
    setSelectedChoiceId(null)
    setSequenceSelection([])
    recordEvent({ type: 'activity_started', at: Date.now(), sessionId: session.sessionId, activityId })
    presentCurrentMemory()
  }

  function pause() {
    pausedAt.current = Date.now()
    setPaused(true)
    recordEvent({ type: 'activity_paused', at: Date.now(), sessionId: session.sessionId, activityId })
  }

  function resume() {
    if (pausedAt.current !== null) {
      promptStartedAt.current += Date.now() - pausedAt.current
      pausedAt.current = null
    }
    setPaused(false)
    recordEvent({ type: 'activity_resumed', at: Date.now(), sessionId: session.sessionId, activityId })
  }

  function finish(reason: 'finished' | 'left' | 'break') {
    if (finishedRef.current || showExperience) return
    finishedRef.current = true
    finishActivitySession(session, reason, logEvent)
    setShowExperience(true)
    setPaused(false)
  }

  function askMo(action: 'clue' | 'easier' | 'break') {
    if (action === 'break' && !paused) pause()
    if (action === 'easier') {
      adaptive.requestSupport()
      setSimplerMode(true)
      if (activityId === 'sequence') {
        setSequenceSelection([])
        setSequenceVisible(true)
      }
    }
    if (action === 'break') {
      requestAssistantAction(action)
      return
    }
    const prompt = action === 'easier'
      ? activityId === 'faces' ? 'Please suggest a gentle easier version for Familiar Faces, such as showing one person without choices.'
        : activityId === 'pattern' ? 'Please simplify this visual pattern to just two repeating items.'
          : activityId === 'sequence' ? 'Please offer a shorter sequence for this activity. Suggest using just two familiar items, then building them in order.'
            : 'Please reduce the choices in this categorization activity and explain the group gently.'
      : activityId === 'faces' ? `Please give a gentle clue for Familiar Faces: ${face?.identityClue ?? 'A caregiver can add a familiar person.'}`
        : activityId === 'pattern' ? `Please explain this repeating pattern gently: ${pattern?.clue ?? 'Look for the shapes that repeat.'}`
          : activityId === 'sequence' ? 'Please offer a shorter sequence for this activity. Suggest using just two familiar items, then building them in order.'
            : `Please explain the category gently: ${category?.explanation ?? 'Notice how the items are alike, then look for the different one.'}`
    requestAssistantAction(action, prompt)
  }

  function submitResponse(promptId: string, responseId: string, correct: boolean) {
    const at = Date.now()
    const responseLatencyMs = Math.max(0, at - promptStartedAt.current)
    recordEvent({ type: 'response_submitted', at, sessionId: session.sessionId, activityId, promptId, responseId, correct, responseLatencyMs, difficultyTier: difficulty.level })
    if (correct) adaptive.recordSuccess(responseLatencyMs, at)
    else adaptive.recordFailure(responseLatencyMs, at)
  }

  function finishRound() {
    setAnswered(false)
    setStatus(null)
    setFeedback('')
    setHint(null)
    setSelectedChoiceId(null)
    setSequenceVisible(true)
    setSequenceSelection([])
    setSimplerMode(false)
    if (roundIndex + 1 < roundCount) {
      promptStartedAt.current = Date.now()
      setRoundDifficulty(adaptive.config)
      setRoundIndex(roundIndex + 1)
      const nextSources = activityId === 'faces' ? [faces[roundIndex + 1]?.memory.id]
        : activityId === 'pattern' ? patterns[roundIndex + 1]?.sourceMemoryIds ?? []
          : activityId === 'sequence' ? sequences[roundIndex + 1]?.sourceMemoryIds ?? []
            : categories[roundIndex + 1]?.sourceMemoryIds ?? []
      for (const memoryId of nextSources) {
        if (memoryId) recordEvent({ type: 'memory_presented', at: Date.now(), sessionId: session.sessionId, activityId, memoryId })
      }
    } else finish('finished')
  }

  function retryRound() {
    setAnswered(false)
    setStatus(null)
    setFeedback('')
    setHint(null)
    setSelectedChoiceId(null)
    if (activityId === 'sequence') setSequenceSelection([])
  }

  function chooseFace(memoryId: string) {
    if (!face) return
    const correct = memoryId === face.memory.id
    submitResponse(face.id, memoryId, correct)
    setSelectedChoiceId(memoryId)
    setAnswered(true)
    setStatus(correct ? 'correct' : 'incorrect')
    setFeedback(correct
      ? "That's right. This person is part of your memories."
      : difficulty.hintsEnabled ? "That's okay. Let's look again." : "That's okay. We can look at the familiar names together.")
    setHint(correct ? null : face.identityClue)
  }

  function choosePattern(tokenId: string) {
    if (!pattern) return
    const correct = tokenId === pattern.answer.id
    if (!correct) useScreenContext.getState().setLastFailedAction('missed the sequence match')
    else useScreenContext.getState().setLastFailedAction(null)
    submitResponse(pattern.id, tokenId, correct)
    setSelectedChoiceId(tokenId)
    setAnswered(true)
    setStatus(correct ? 'correct' : 'incorrect')
    setFeedback(correct
      ? "That's right. You noticed the repeating pattern."
      : difficulty.hintsEnabled ? "That's okay. Look at the pattern again." : "That's okay. We can look for what repeats together.")
    setHint(correct ? null : pattern.clue)
  }

  function chooseCategory(tokenId: string) {
    if (!category) return
    const correct = tokenId === category.answerId
    if (!correct) useScreenContext.getState().setLastFailedAction('selected the wrong category')
    else useScreenContext.getState().setLastFailedAction(null)
    submitResponse(category.id, tokenId, correct)
    setSelectedChoiceId(tokenId)
    setAnswered(true)
    setStatus(correct ? 'correct' : 'incorrect')
    setFeedback(correct
      ? "That's right. You found the item from a different group."
      : difficulty.hintsEnabled ? "That's okay. Let's look again." : "That's okay. We can look at the group together.")
    setHint(correct ? null : category.explanation)
  }

  function chooseSequenceToken(tokenId: string) {
    if (sequenceSelection.length >= targetSequence.length || sequenceSelection.includes(tokenId)) return
    setSequenceSelection((current) => [...current, tokenId])
  }

  function checkSequence() {
    if (!sequence) return
    const responseId = sequenceSelection.join('|')
    const expected = targetSequence.map((token) => token.id).join('|')
    const correct = responseId === expected
    if (!correct) useScreenContext.getState().setLastFailedAction('missed the sequence match')
    else useScreenContext.getState().setLastFailedAction(null)
    submitResponse(sequence.id, responseId, correct)
    setAnswered(true)
    setStatus(correct ? 'correct' : 'incorrect')
    setFeedback(correct
      ? "That's right. You kept the items in order."
      : "That's okay. Let's look at the sequence together.")
    setHint(correct ? null : `Try the same order you just saw: ${targetSequence.map((token) => token.label).join(', ')}.`)
  }

  function chooseExperience(kind: SessionExperience['kind']) {
    recordSessionExperience({ kind, reportedBy: 'supported_person', at: Date.now() })
    navigate('/garden')
  }

  function hideSequence() {
    promptStartedAt.current = Date.now()
    setSequenceVisible(false)
  }

  const helpActions = (
    <section className="mt-4" aria-label="Ask Mo for help">
      <h2 className="text-lg">Mo can help</h2>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => askMo('clue')} className="min-h-[60px] rounded-xl border-2 px-2 font-semibold" style={{ borderColor: accent, background: `${accent}18`, color: accent }}>Need a clue?</button>
        <button type="button" onClick={() => askMo('easier')} className="min-h-[60px] rounded-xl border-2 px-2 font-semibold" style={{ borderColor: accent, background: `${accent}18`, color: accent }}>Easier version</button>
        <button type="button" onClick={() => askMo('break')} className="min-h-[60px] rounded-xl border-2 px-2 font-semibold" style={{ borderColor: accent, background: `${accent}18`, color: accent }}>I'm taking a break</button>
      </div>
    </section>
  )

  return (
    <>
      <PageHeader title={TITLES[activityId]} subtitle={INSTRUCTIONS[activityId]} />
      {!hasContent ? (
        <div className="card p-5 text-center">
          <h2 className="text-xl">Add a familiar person to begin</h2>
          <p className="mt-2 text-ink/75">A caregiver can add a person and photo, or load the fictional demo profile. Other activities are ready to explore without personal memories.</p>
          <Link to="/memories" className="btn-primary mt-4 w-full">Open personal memories</Link>
        </div>
      ) : !started ? (
        <div>
          <HowToPlayCard
            title={TITLES[activityId]}
            description={activityId === 'faces' ? 'These familiar people and portraits come from your caregiver’s memories.' : 'A simple visual activity using familiar themes where available. There is no timer, and you can pause whenever you like.'}
            instructions={INSTRUCTIONS[activityId]}
            example={EXAMPLES[activityId]}
            exampleVisual={<ActivityExampleVisual activityId={activityId} />}
            onStart={begin}
            startLabel="Begin activity"
          />
          <Link to="/games" className="btn-soft mt-3 w-full">Choose another activity</Link>
        </div>
      ) : showExperience ? (
        <section className="card p-5" aria-labelledby="experience-heading">
          <h2 id="experience-heading" className="text-2xl">How did that feel?</h2>
          <p className="mt-2 text-ink/75">Choose what feels right. This helps the garden respond; it is not a test.</p>
          <button type="button" onClick={() => chooseExperience('flourishing')} className="mt-5 min-h-[68px] w-full rounded-2xl border-2 px-4 text-left text-lg font-semibold" style={{ borderColor: accent, background: `${accent}18`, color: accent }}>That felt comfortable</button>
          <button type="button" onClick={() => chooseExperience('calming')} className="mt-3 min-h-[68px] w-full rounded-2xl border-2 px-4 text-left text-lg font-semibold" style={{ borderColor: accent, background: `${accent}18`, color: accent }}>I'd like a quiet moment</button>
        </section>
      ) : paused ? (
        <>
          <section className="card p-5" aria-live="polite">
            <h2 className="text-xl">We can pause here</h2>
            <p className="mt-2 text-ink/75">Take the time you need. Mo is here if you would like company.</p>
            <button type="button" onClick={resume} className="btn-primary mt-4 w-full"><Play size={21} /> Resume activity</button>
            <button type="button" onClick={() => finish('break')} className="btn-soft mt-3 w-full">I'm done for now</button>
          </section>
          {helpActions}
        </>
      ) : (
        <>
          <section className="card p-4" aria-live="polite" onPointerDownCapture={trackTap}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-garden-900">Take your time</p>
              <button type="button" onClick={pause} className="min-h-[48px] rounded-xl border-2 bg-white px-3 font-semibold flex items-center gap-2" style={{ borderColor: accent, color: accent }}><Pause size={19} /> Pause</button>
            </div>
            {activityId === 'faces' && face && <FacesActivity prompt={face} choices={faceChoices} targetScale={difficulty.targetScale} hintsEnabled={difficulty.hintsEnabled} answered={answered} status={status} selectedChoiceId={selectedChoiceId} correctChoiceId={face.memory.id} feedback={feedback} hint={hint} onChoose={chooseFace} onRetry={retryRound} onContinue={finishRound} />}
            {activityId === 'pattern' && pattern && <PatternActivity round={pattern} choices={patternChoices} simpler={simplerMode} targetScale={difficulty.targetScale} answered={answered} status={status} selectedChoiceId={selectedChoiceId} correctChoiceId={pattern.answer.id} feedback={feedback} hint={hint} onChoose={choosePattern} onRetry={retryRound} onContinue={finishRound} />}
            {activityId === 'sequence' && sequence && <SequenceActivity instruction={sequence.instruction} target={targetSequence} choices={sequenceChoices} simpler={simplerMode} targetScale={difficulty.targetScale} visible={sequenceVisible} selection={sequenceSelection} answered={answered} status={status} feedback={feedback} hint={hint} onHide={hideSequence} onChoose={chooseSequenceToken} onUndo={() => setSequenceSelection((current) => current.slice(0, -1))} onCheck={checkSequence} onRetry={retryRound} onContinue={finishRound} />}
            {activityId === 'category' && category && <CategoryActivity round={category} choices={categoryChoices} simpler={simplerMode} targetScale={difficulty.targetScale} answered={answered} status={status} selectedChoiceId={selectedChoiceId} correctChoiceId={category.answerId} feedback={feedback} hint={hint} onChoose={chooseCategory} onRetry={retryRound} onContinue={finishRound} />}
          </section>
          {helpActions}
          <button type="button" onClick={() => finish('left')} className="mt-4 min-h-[48px] w-full rounded-xl px-3 text-center font-semibold text-ink/70">Finish activity</button>
        </>
      )}
    </>
  )
}

function FacesActivity({ prompt, choices, targetScale, hintsEnabled, answered, status, selectedChoiceId, correctChoiceId, feedback, hint, onChoose, onRetry, onContinue }: {
  prompt: ReturnType<typeof buildFacePrompts>[number]
  choices: ReturnType<typeof buildFacePrompts>[number]['choices']
  targetScale: number
  hintsEnabled: boolean
  answered: boolean
  status: FeedbackStatus
  selectedChoiceId: string | null
  correctChoiceId: string
  feedback: string
  hint: string | null
  onChoose: (memoryId: string) => void
  onRetry: () => void
  onContinue: () => void
}) {
  return (
    <div className="mt-4">
      <FeedbackPopup status={status} message={feedback} hint={hint ?? undefined} onRetry={onRetry} onContinue={onContinue} />
      <div className="mx-auto flex min-h-[220px] max-w-[320px] items-center justify-center overflow-hidden rounded-2xl border-2 border-mint-200 bg-mist">
        {prompt.memory.photo
          ? <MemoryPhoto reference={prompt.memory.photo} alt={prompt.memory.photo.altText ?? `Portrait from a memory`} className="h-[260px] w-full object-cover" />
          : <div className="p-5 text-center"><UserRound size={54} className="mx-auto text-garden-700" aria-hidden /><span className="mt-2 block text-3xl font-display font-bold text-garden-900" aria-hidden>{initials(prompt.memory.name)}</span><span className="mt-2 block text-lg text-ink/80">A person in your memories</span></div>}
      </div>
      <h2 className="mt-4 text-center text-2xl">Who is this person?</h2>
      {!prompt.memory.photo && hintsEnabled && <p className="mt-2 rounded-xl bg-sun-soft p-3 text-center text-sun-deep">{prompt.identityClue}</p>}
      <div className="mt-4 grid gap-3">
        {choices.map((choice) => {
          const isWrong = status === 'incorrect' && choice.id === selectedChoiceId
          const isCorrect = status !== null && choice.id === correctChoiceId
          const stateClass = isWrong ? choiceStateClass('wrong') : isCorrect ? choiceStateClass('correct') : choiceStateClass('default')
          return <button key={choice.id} type="button" disabled={answered} onClick={() => onChoose(choice.id)} style={{ minHeight: `${64 * targetScale}px` }} className={`rounded-2xl border-2 px-4 text-lg font-semibold disabled:opacity-80 ${stateClass}`}>{choice.name}{choice.relationship ? `, ${choice.relationship}` : ''}</button>
        })}
      </div>
    </div>
  )
}

function PatternActivity({ round, choices, simpler, targetScale, answered, status, selectedChoiceId, correctChoiceId, feedback, hint, onChoose, onRetry, onContinue }: {
  round: ReturnType<typeof buildPatternRounds>[number]
  choices: GameToken[]
  simpler: boolean
  targetScale: number
  answered: boolean
  status: FeedbackStatus
  selectedChoiceId: string | null
  correctChoiceId: string
  feedback: string
  hint: string | null
  onChoose: (tokenId: string) => void
  onRetry: () => void
  onContinue: () => void
}) {
  return (
    <div className="mt-4">
      <FeedbackPopup status={status} message={feedback} hint={hint ?? undefined} onRetry={onRetry} onContinue={onContinue} />
      <p className="text-lg">{round.instruction}</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2" aria-label="Repeating pattern">
        {round.pattern.map((token, index) => <TokenTile key={`${round.id}-pattern-${index}`} token={token} scale={targetScale} />)}
        <div style={{ width: `${80 * targetScale}px`, height: `${80 * targetScale}px` }} className="flex items-center justify-center rounded-2xl border-2 border-dashed border-ink/50 bg-white text-4xl font-bold" aria-label="Next item">?</div>
      </div>
      {simpler && <p className="mt-3 rounded-xl bg-sun-soft p-3 text-sun-deep">Look for the two items that repeat.</p>}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {choices.map((token) => {
          const isWrong = status === 'incorrect' && token.id === selectedChoiceId
          const isCorrect = status !== null && token.id === correctChoiceId
          const state = isWrong ? 'wrong' : isCorrect ? 'correct' : 'default'
          return <TokenButton key={token.id} token={token} scale={targetScale} state={state} disabled={answered} onClick={() => onChoose(token.id)} />
        })}
      </div>
    </div>
  )
}

function SequenceActivity({ instruction, target, choices, simpler, targetScale, visible, selection, answered, status, feedback, hint, onHide, onChoose, onUndo, onCheck, onRetry, onContinue }: {
  instruction: string
  target: GameToken[]
  choices: GameToken[]
  simpler: boolean
  targetScale: number
  visible: boolean
  selection: string[]
  answered: boolean
  status: FeedbackStatus
  feedback: string
  hint: string | null
  onHide: () => void
  onChoose: (tokenId: string) => void
  onUndo: () => void
  onCheck: () => void
  onRetry: () => void
  onContinue: () => void
}) {
  const preferred = useApp((s) => s.preferences.favoriteColors)
  const palette = getFavoriteColorPalette(preferred)
  const selectedTokens = selection.map((id) => choices.find((token) => token.id === id)).filter((token): token is GameToken => Boolean(token))
  return (
    <div className="mt-4">
      <FeedbackPopup status={status} message={feedback} hint={hint ?? undefined} onRetry={onRetry} onContinue={onContinue} />
      <p className="text-lg">{simpler ? 'Try a shorter sequence.' : instruction}</p>
      {visible ? (
        <>
          <div className="mt-4 flex flex-wrap justify-center gap-2 rounded-2xl bg-sun-soft p-4" aria-label="Sequence to remember">
            {target.map((token) => <TokenTile key={token.id} token={token} scale={targetScale} />)}
          </div>
          <button type="button" onClick={onHide} className="mt-4 w-full rounded-2xl border-2 font-semibold" style={{ borderColor: palette.primary, background: `linear-gradient(135deg, ${palette.primary}22, ${palette.secondary}18)`, color: palette.primary }}>Hide sequence and begin</button>
        </>
      ) : (
        <>
          <div className="mt-4 min-h-[104px] rounded-2xl border-2 border-mint-200 bg-white p-3" aria-label="Your sequence">
            <p className="mb-2 font-semibold text-garden-900">Your sequence</p>
            <div className="flex flex-wrap gap-2">
              {selectedTokens.map((token, index) => <TokenTile key={`${token.id}-${index}`} token={token} scale={targetScale} />)}
              {!selectedTokens.length && <p className="text-ink/65">Choose an item to begin.</p>}
            </div>
          </div>
          {!answered && <div className="mt-4 grid grid-cols-2 gap-3">{choices.map((token) => <TokenButton key={token.id} token={token} scale={targetScale} disabled={selection.includes(token.id) || selection.length >= target.length} onClick={() => onChoose(token.id)} />)}</div>}
          {!answered && <div className="mt-3 grid grid-cols-2 gap-3">
            <button type="button" disabled={!selection.length} onClick={onUndo} className="w-full rounded-2xl border-2 font-semibold" style={{ borderColor: palette.primary, background: `linear-gradient(135deg, ${palette.primary}10, ${palette.secondary}10)`, color: palette.primary }}><RotateCcw size={20} /> Remove last</button>
            <button type="button" disabled={selection.length !== target.length} onClick={onCheck} className="w-full rounded-2xl border-2 font-semibold" style={{ borderColor: palette.primary, background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`, color: '#fff' }}>Check sequence</button>
          </div>}
        </>
      )}
    </div>
  )
}

function CategoryActivity({ round, choices, simpler, targetScale, answered, status, selectedChoiceId, correctChoiceId, feedback, hint, onChoose, onRetry, onContinue }: {
  round: ReturnType<typeof buildCategoryRounds>[number]
  choices: GameToken[]
  simpler: boolean
  targetScale: number
  answered: boolean
  status: FeedbackStatus
  selectedChoiceId: string | null
  correctChoiceId: string
  feedback: string
  hint: string | null
  onChoose: (tokenId: string) => void
  onRetry: () => void
  onContinue: () => void
}) {
  return (
    <div className="mt-4">
      <FeedbackPopup status={status} message={feedback} hint={hint ?? undefined} onRetry={onRetry} onContinue={onContinue} />
      <p className="text-lg">{round.instruction}</p>
      {simpler && <p className="mt-3 rounded-xl bg-sun-soft p-3 text-sun-deep">Notice how some items are alike. Choose the one that seems different.</p>}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {choices.map((token) => {
          const isWrong = status === 'incorrect' && token.id === selectedChoiceId
          const isCorrect = status !== null && token.id === correctChoiceId
          const state = isWrong ? 'wrong' : isCorrect ? 'correct' : 'default'
          return <TokenButton key={token.id} token={token} scale={targetScale} state={state} disabled={answered} onClick={() => onChoose(token.id)} />
        })}
      </div>
    </div>
  )
}

function TokenButton({ token, scale = 1, disabled, state = 'default', onClick }: { token: GameToken; scale?: number; disabled?: boolean; state?: 'default' | 'wrong' | 'correct'; onClick: () => void }) {
  const preferred = useApp((s) => s.preferences.favoriteColors)
  const palette = getFavoriteColorPalette(preferred)
  const stateClass = state === 'wrong' ? choiceStateClass('wrong') : state === 'correct' ? choiceStateClass('correct') : choiceStateClass('default')
  const buttonStyle = state === 'default' ? { minHeight: `${92 * scale}px`, borderColor: palette.primary, background: `linear-gradient(135deg, ${palette.primary}18, ${palette.secondary}12)`, color: palette.primary } : undefined
  return <button type="button" disabled={disabled} onClick={onClick} style={buttonStyle} className={`rounded-2xl border-2 px-3 py-2 text-center font-semibold disabled:opacity-75 ${stateClass}`}>
    <TokenIcon glyph={token.glyph} />
    <span className="mt-1 block">{token.label}</span>
  </button>
}

function TokenTile({ token, scale = 1 }: { token: GameToken; scale?: number }) {
  const preferred = useApp((s) => s.preferences.favoriteColors)
  const palette = getFavoriteColorPalette(preferred)
  return <div style={{ minHeight: `${80 * scale}px`, minWidth: `${80 * scale}px`, borderColor: palette.primary, background: `linear-gradient(135deg, ${palette.primary}18, ${palette.secondary}10)`, color: palette.primary }} className="flex flex-col items-center justify-center rounded-2xl border-2 px-2 py-2 font-semibold">
    <TokenIcon glyph={token.glyph} />
    <span className="mt-1 max-w-28 text-center text-sm leading-tight">{token.label}</span>
  </div>
}

function TokenIcon({ glyph }: { glyph: GameGlyph }) {
  const art = {
    circle: <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden><circle cx="32" cy="32" r="16" fill="#7FC7D6" stroke="#1B4E59" strokeWidth="3" /></svg>,
    square: <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden><rect x="17" y="17" width="30" height="30" rx="6" fill="#C2D5FF" stroke="#3D4A8C" strokeWidth="3" /></svg>,
    triangle: <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden><path d="M32 12L51 48H13L32 12Z" fill="#F8D4A5" stroke="#8A5A2B" strokeWidth="3" /></svg>,
    flower: <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden>
      <circle cx="32" cy="18" r="7" fill="#F9B8D7" stroke="#AF4575" strokeWidth="2.5" />
      <circle cx="18" cy="32" r="7" fill="#F9B8D7" stroke="#AF4575" strokeWidth="2.5" />
      <circle cx="46" cy="32" r="7" fill="#F9B8D7" stroke="#AF4575" strokeWidth="2.5" />
      <circle cx="24" cy="22" r="7" fill="#F9B8D7" stroke="#AF4575" strokeWidth="2.5" />
      <circle cx="40" cy="22" r="7" fill="#F9B8D7" stroke="#AF4575" strokeWidth="2.5" />
      <circle cx="24" cy="42" r="7" fill="#F9B8D7" stroke="#AF4575" strokeWidth="2.5" />
      <circle cx="40" cy="42" r="7" fill="#F9B8D7" stroke="#AF4575" strokeWidth="2.5" />
      <path d="M32 29V46" stroke="#2E7D32" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 46C26 48 24 54 32 56C40 54 38 48 32 46Z" fill="#4AAE62" stroke="#2E7D32" strokeWidth="2" />
    </svg>,
    leaf: <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden><path d="M14 35C17 20 33 13 49 16C48 35 35 47 18 50C14 45 12 41 14 35Z" fill="#8EDD8A" stroke="#2D7A40" strokeWidth="2.5" /><path d="M18 35C29 35 36 28 42 18" stroke="#2D7A40" strokeWidth="2.5" strokeLinecap="round" /></svg>,
    apple: <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden><path d="M24 18C18 23 18 35 27 41C34 46 42 44 45 36C48 28 43 18 36 16C31 15 27 16 24 18Z" fill="#E74A4A" stroke="#8F2020" strokeWidth="2.5" /><path d="M32 12C33 17 38 18 38 23" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" /><path d="M32 18c-1-5 2-9 7-10" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" /></svg>,
    sun: <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden><circle cx="32" cy="32" r="15" fill="#F6D365" stroke="#B47A19" strokeWidth="3" /><g stroke="#B47A19" strokeWidth="3" strokeLinecap="round"><path d="M32 6v8M32 50v8M6 32h8M50 32h8M13 13l6 6M45 45l6 6M13 51l6-6M45 19l6-6" /></g></svg>,
    cup: <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden><path d="M18 22h28v18c0 7-6 12-14 12S18 47 18 40V22Z" fill="#D9F0FF" stroke="#345E76" strokeWidth="3" /><path d="M46 27h6c3 0 6 3 6 6s-3 6-6 6h-6" fill="none" stroke="#345E76" strokeWidth="3" strokeLinecap="round" /><path d="M22 22V16h20v6" fill="none" stroke="#345E76" strokeWidth="3" strokeLinecap="round" /><path d="M24 26h16" stroke="#345E76" strokeWidth="2.5" strokeLinecap="round" /></svg>,
    camera: <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden><rect x="11" y="18" width="42" height="28" rx="6" fill="#9AC8D7" stroke="#294A5F" strokeWidth="3" /><circle cx="32" cy="32" r="11" fill="#CDEAEF" stroke="#294A5F" strokeWidth="3" /><circle cx="48" cy="25" r="4" fill="#F6D365" stroke="#A26708" strokeWidth="2" /><path d="M19 18l5-7h16l5 7" fill="none" stroke="#294A5F" strokeWidth="3" strokeLinecap="round" /></svg>,
    basket: <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden><path d="M18 24h28l-4 22H22L18 24Z" fill="#D8A76D" stroke="#7A4F2E" strokeWidth="3" /><path d="M22 24l4-8h12l4 8" fill="none" stroke="#7A4F2E" strokeWidth="3" strokeLinecap="round" /><path d="M18 24c2 3 6 4 8 4m20-4c-2 3-6 4-8 4" stroke="#7A4F2E" strokeWidth="2.5" strokeLinecap="round" /></svg>,
    bird: <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden><path d="M18 36c0-13 10-22 22-22 12 0 18 8 18 18 0 10-6 17-17 19l-9 4-4-9 8-10H18Z" fill="#6DCCFF" stroke="#375D93" strokeWidth="3" /><path d="M35 23l10-8" stroke="#375D93" strokeWidth="3" strokeLinecap="round" /><circle cx="25" cy="30" r="3.5" fill="#375D93" /></svg>,
    chair: <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden><rect x="22" y="18" width="20" height="16" rx="4" fill="#C6B3FF" stroke="#5F4EA0" strokeWidth="3" /><path d="M18 33h28v9H18z" fill="#D7CCFF" stroke="#5F4EA0" strokeWidth="3" /><path d="M22 42v11M42 42v11M18 33l-6 11M46 33l6 11" stroke="#5F4EA0" strokeWidth="3" strokeLinecap="round" /></svg>,
  }
  return art[glyph] ?? art.circle
}

function UnknownActivity() {
  return <div className="card p-5"><h1 className="text-xl">Activity not found</h1><Link className="btn-primary mt-4 w-full" to="/games">Choose an activity</Link></div>
}
