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
  const [session] = useState(() => createActivitySession(activityId))
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [showExperience, setShowExperience] = useState(false)
  const [roundIndex, setRoundIndex] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [feedback, setFeedback] = useState('')
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
    setFeedback('')
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

  function chooseFace(memoryId: string) {
    if (!face) return
    const correct = memoryId === face.memory.id
    submitResponse(face.id, memoryId, correct)
    setAnswered(true)
    setFeedback(correct
      ? "That's right. This person is part of your memories."
      : difficulty.hintsEnabled ? `That's okay. Here's a clue: ${face.identityClue}` : "That's okay. We can look at the familiar names together.")
  }

  function choosePattern(tokenId: string) {
    if (!pattern) return
    const correct = tokenId === pattern.answer.id
    if (!correct) useScreenContext.getState().setLastFailedAction('missed the sequence match')
    else useScreenContext.getState().setLastFailedAction(null)
    submitResponse(pattern.id, tokenId, correct)
    setAnswered(true)
    setFeedback(correct
      ? "That's right. You noticed the repeating pattern."
      : difficulty.hintsEnabled ? `That's okay. Look at the pattern again: ${pattern.clue}` : "That's okay. We can look for what repeats together.")
  }

  function chooseCategory(tokenId: string) {
    if (!category) return
    const correct = tokenId === category.answerId
    if (!correct) useScreenContext.getState().setLastFailedAction('selected the wrong category')
    else useScreenContext.getState().setLastFailedAction(null)
    submitResponse(category.id, tokenId, correct)
    setAnswered(true)
    setFeedback(correct
      ? "That's right. You found the item from a different group."
      : difficulty.hintsEnabled ? `That's okay. ${category.explanation}` : "That's okay. We can look at the group together.")
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
    setFeedback(correct
      ? "That's right. You kept the items in order."
      : "That's okay. Let's look at the sequence together.")
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
        <button type="button" onClick={() => askMo('clue')} className="min-h-[60px] rounded-xl border-2 border-garden-500 bg-mint-100 px-2 font-semibold text-garden-900">Need a clue?</button>
        <button type="button" onClick={() => askMo('easier')} className="min-h-[60px] rounded-xl border-2 border-rose-main bg-rose-soft px-2 font-semibold text-rose-deep">Easier version</button>
        <button type="button" onClick={() => askMo('break')} className="min-h-[60px] rounded-xl border-2 border-sky-deep bg-sky-soft px-2 font-semibold text-sky-deep">I'm taking a break</button>
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
        <div className="card p-5">
          <p className="text-lg">{activityId === 'faces' ? 'These familiar people and portraits come from your caregiver’s memories.' : 'We will explore a simple visual activity using familiar themes where available. There is no timer, and you can pause whenever you like.'}</p>
          <button type="button" onClick={begin} className="btn-primary mt-5 w-full">Begin activity</button>
          <Link to="/games" className="btn-soft mt-3 w-full">Choose another activity</Link>
        </div>
      ) : showExperience ? (
        <section className="card p-5" aria-labelledby="experience-heading">
          <h2 id="experience-heading" className="text-2xl">How did that feel?</h2>
          <p className="mt-2 text-ink/75">Choose what feels right. This helps the garden respond; it is not a test.</p>
          <button type="button" onClick={() => chooseExperience('flourishing')} className="mt-5 min-h-[68px] w-full rounded-2xl border-2 border-garden-600 bg-mint-100 px-4 text-left text-lg font-semibold text-garden-900">That felt comfortable</button>
          <button type="button" onClick={() => chooseExperience('calming')} className="mt-3 min-h-[68px] w-full rounded-2xl border-2 border-sky-deep bg-sky-soft px-4 text-left text-lg font-semibold text-sky-deep">I'd like a quiet moment</button>
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
              <button type="button" onClick={pause} className="min-h-[48px] rounded-xl border-2 border-mint-200 bg-white px-3 font-semibold flex items-center gap-2"><Pause size={19} /> Pause</button>
            </div>
            {activityId === 'faces' && face && <FacesActivity prompt={face} choices={faceChoices} targetScale={difficulty.targetScale} hintsEnabled={difficulty.hintsEnabled} answered={answered} feedback={feedback} onChoose={chooseFace} onContinue={finishRound} />}
            {activityId === 'pattern' && pattern && <PatternActivity round={pattern} choices={patternChoices} simpler={simplerMode} targetScale={difficulty.targetScale} answered={answered} feedback={feedback} onChoose={choosePattern} onContinue={finishRound} />}
            {activityId === 'sequence' && sequence && <SequenceActivity instruction={sequence.instruction} target={targetSequence} choices={sequenceChoices} simpler={simplerMode} targetScale={difficulty.targetScale} visible={sequenceVisible} selection={sequenceSelection} answered={answered} feedback={feedback} onHide={hideSequence} onChoose={chooseSequenceToken} onUndo={() => setSequenceSelection((current) => current.slice(0, -1))} onCheck={checkSequence} onContinue={finishRound} />}
            {activityId === 'category' && category && <CategoryActivity round={category} choices={categoryChoices} simpler={simplerMode} targetScale={difficulty.targetScale} answered={answered} feedback={feedback} onChoose={chooseCategory} onContinue={finishRound} />}
          </section>
          {helpActions}
          <button type="button" onClick={() => finish('left')} className="mt-4 min-h-[48px] w-full rounded-xl px-3 text-center font-semibold text-ink/70">Finish activity</button>
        </>
      )}
    </>
  )
}

function FacesActivity({ prompt, choices, targetScale, hintsEnabled, answered, feedback, onChoose, onContinue }: {
  prompt: ReturnType<typeof buildFacePrompts>[number]
  choices: ReturnType<typeof buildFacePrompts>[number]['choices']
  targetScale: number
  hintsEnabled: boolean
  answered: boolean
  feedback: string
  onChoose: (memoryId: string) => void
  onContinue: () => void
}) {
  return (
    <div className="mt-4">
      <div className="mx-auto flex min-h-[220px] max-w-[320px] items-center justify-center overflow-hidden rounded-2xl border-2 border-mint-200 bg-mist">
        {prompt.memory.photo
          ? <MemoryPhoto reference={prompt.memory.photo} alt={prompt.memory.photo.altText ?? `Portrait from a memory`} className="h-[260px] w-full object-cover" />
          : <div className="p-5 text-center"><UserRound size={54} className="mx-auto text-garden-700" aria-hidden /><span className="mt-2 block text-3xl font-display font-bold text-garden-900" aria-hidden>{initials(prompt.memory.name)}</span><span className="mt-2 block text-lg text-ink/80">A person in your memories</span></div>}
      </div>
      <h2 className="mt-4 text-center text-2xl">Who is this person?</h2>
      {!prompt.memory.photo && hintsEnabled && <p className="mt-2 rounded-xl bg-sun-soft p-3 text-center text-sun-deep">{prompt.identityClue}</p>}
      <div className="mt-4 grid gap-3">
        {choices.map((choice) => <button key={choice.id} type="button" disabled={answered} onClick={() => onChoose(choice.id)} style={{ minHeight: `${64 * targetScale}px` }} className="rounded-2xl border-2 border-garden-600 bg-white px-4 text-lg font-semibold text-garden-900 disabled:opacity-80">{choice.name}{choice.relationship ? `, ${choice.relationship}` : ''}</button>)}
      </div>
      {feedback && <p role="status" className="mt-4 rounded-xl bg-mint-100 p-3 text-center text-lg text-garden-900">{feedback}</p>}
      {answered && <button type="button" onClick={onContinue} className="btn-primary mt-3 w-full">Continue together</button>}
    </div>
  )
}

function PatternActivity({ round, choices, simpler, targetScale, answered, feedback, onChoose, onContinue }: {
  round: ReturnType<typeof buildPatternRounds>[number]
  choices: GameToken[]
  simpler: boolean
  targetScale: number
  answered: boolean
  feedback: string
  onChoose: (tokenId: string) => void
  onContinue: () => void
}) {
  return (
    <div className="mt-4">
      <p className="text-lg">{round.instruction}</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2" aria-label="Repeating pattern">
        {round.pattern.map((token, index) => <TokenTile key={`${round.id}-pattern-${index}`} token={token} scale={targetScale} />)}
        <div style={{ width: `${80 * targetScale}px`, height: `${80 * targetScale}px` }} className="flex items-center justify-center rounded-2xl border-2 border-dashed border-ink/50 bg-white text-4xl font-bold" aria-label="Next item">?</div>
      </div>
      {simpler && <p className="mt-3 rounded-xl bg-sun-soft p-3 text-sun-deep">Look for the two items that repeat.</p>}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {choices.map((token) => <TokenButton key={token.id} token={token} scale={targetScale} disabled={answered} onClick={() => onChoose(token.id)} />)}
      </div>
      {feedback && <p role="status" className="mt-4 rounded-xl bg-mint-100 p-3 text-lg text-garden-900">{feedback}</p>}
      {answered && <button type="button" onClick={onContinue} className="btn-primary mt-3 w-full">Continue together</button>}
    </div>
  )
}

function SequenceActivity({ instruction, target, choices, simpler, targetScale, visible, selection, answered, feedback, onHide, onChoose, onUndo, onCheck, onContinue }: {
  instruction: string
  target: GameToken[]
  choices: GameToken[]
  simpler: boolean
  targetScale: number
  visible: boolean
  selection: string[]
  answered: boolean
  feedback: string
  onHide: () => void
  onChoose: (tokenId: string) => void
  onUndo: () => void
  onCheck: () => void
  onContinue: () => void
}) {
  const selectedTokens = selection.map((id) => choices.find((token) => token.id === id)).filter((token): token is GameToken => Boolean(token))
  return (
    <div className="mt-4">
      <p className="text-lg">{simpler ? 'Try a shorter sequence.' : instruction}</p>
      {visible ? (
        <>
          <div className="mt-4 flex flex-wrap justify-center gap-2 rounded-2xl bg-sun-soft p-4" aria-label="Sequence to remember">
            {target.map((token) => <TokenTile key={token.id} token={token} scale={targetScale} />)}
          </div>
          <button type="button" onClick={onHide} className="btn-primary mt-4 w-full">Hide sequence and begin</button>
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
            <button type="button" disabled={!selection.length} onClick={onUndo} className="btn-soft w-full"><RotateCcw size={20} /> Remove last</button>
            <button type="button" disabled={selection.length !== target.length} onClick={onCheck} className="btn-primary w-full">Check sequence</button>
          </div>}
          {feedback && <p role="status" className="mt-4 rounded-xl bg-mint-100 p-3 text-lg text-garden-900">{feedback}</p>}
          {answered && <><div className="mt-3 flex flex-wrap justify-center gap-2" aria-label="Sequence to review">{target.map((token) => <TokenTile key={token.id} token={token} scale={targetScale} />)}</div><button type="button" onClick={onContinue} className="btn-primary mt-3 w-full">Continue together</button></>}
        </>
      )}
    </div>
  )
}

function CategoryActivity({ round, choices, simpler, targetScale, answered, feedback, onChoose, onContinue }: {
  round: ReturnType<typeof buildCategoryRounds>[number]
  choices: GameToken[]
  simpler: boolean
  targetScale: number
  answered: boolean
  feedback: string
  onChoose: (tokenId: string) => void
  onContinue: () => void
}) {
  return (
    <div className="mt-4">
      <p className="text-lg">{round.instruction}</p>
      {simpler && <p className="mt-3 rounded-xl bg-sun-soft p-3 text-sun-deep">Notice how some items are alike. Choose the one that seems different.</p>}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {choices.map((token) => <TokenButton key={token.id} token={token} scale={targetScale} disabled={answered} onClick={() => onChoose(token.id)} />)}
      </div>
      {feedback && <p role="status" className="mt-4 rounded-xl bg-mint-100 p-3 text-lg text-garden-900">{feedback}</p>}
      {answered && <button type="button" onClick={onContinue} className="btn-primary mt-3 w-full">Continue together</button>}
    </div>
  )
}

function TokenButton({ token, scale = 1, disabled, onClick }: { token: GameToken; scale?: number; disabled?: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} style={{ minHeight: `${92 * scale}px` }} className={`rounded-2xl border-2 px-3 py-2 text-center font-semibold disabled:opacity-75 ${TOKEN_STYLE[token.category]}`}>
    <TokenIcon glyph={token.glyph} />
    <span className="mt-1 block">{token.label}</span>
  </button>
}

function TokenTile({ token, scale = 1 }: { token: GameToken; scale?: number }) {
  return <div style={{ minHeight: `${80 * scale}px`, minWidth: `${80 * scale}px` }} className={`flex flex-col items-center justify-center rounded-2xl border-2 px-2 py-2 font-semibold ${TOKEN_STYLE[token.category]}`}>
    <TokenIcon glyph={token.glyph} />
    <span className="mt-1 max-w-28 text-center text-sm leading-tight">{token.label}</span>
  </div>
}

function TokenIcon({ glyph }: { glyph: GameGlyph }) {
  const Icon = GLYPHS[glyph]
  return <Icon size={38} strokeWidth={2.5} aria-hidden />
}

function UnknownActivity() {
  return <div className="card p-5"><h1 className="text-xl">Activity not found</h1><Link className="btn-primary mt-4 w-full" to="/games">Choose an activity</Link></div>
}
