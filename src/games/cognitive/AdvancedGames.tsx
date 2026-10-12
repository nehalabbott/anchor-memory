import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, ChevronLeft, Route, Sparkles, Tags } from 'lucide-react'
import { useAdaptiveDifficulty } from '@/hooks/useAdaptiveDifficulty'
import { createActivitySession, finishActivitySession, recordActivityEvent } from '@/lib/sessionPersistence'
import type { ActivityId, InteractionEvent, MemoryItem, Part2InteractionEvent } from '@/lib/types'
import { useApp } from '@/store/useApp'
import { useScreenContext } from '@/store/useScreenContext'
import { FeedbackPopup, HowToPlayCard, choiceStateClass, type FeedbackStatus } from '@/games/GameFeedback'

export type AdvancedGameId = 'dual-n-back' | 'trail-making' | 'category-association'

export interface DualNBackRound {
  id: string
  n: number
  gridSize: number
  sequence: Array<{ id: string; position: number; label: string }>
  correctAnswer: 'match' | 'no-match'
  currentPosition: number
  currentIndex: number
  stimLabel: string
}

export interface TrailNode {
  id: string
  label: string
  x: number
  y: number
}

export interface TrailMakingRound {
  id: string
  nodes: TrailNode[]
  sequence: string[]
  targetIndex: number
}

export interface CategoryAssociationPrompt {
  id: string
  category: string
  instruction: string
  choices: Array<{ id: string; label: string; group: string }>
  answerId: string
  source: 'memory' | 'generic'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function seededInt(seed: number, max: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return Math.abs(Math.floor((x - Math.floor(x)) * max)) % max
}

export function buildDualNBackRound(level: number, step = 0): DualNBackRound {
  const n = clamp(level <= 2 ? 2 : level <= 4 ? 3 : 4, 1, 4)
  const gridSize = level >= 4 ? 4 : 3
  const length = 10
  // The sequence must depend only on `level` (not `step`): this function is called once per
  // step with the step number, and the "n steps ago" check only works if every call agrees on
  // what was shown at every earlier index. Mixing `step` into the seed made each call regenerate
  // a different sequence, so "match" was being judged against tiles that were never actually shown.
  const sequence = Array.from({ length }, (_, index) => {
    const position = seededInt(index * 23 + level * 97, gridSize * gridSize) + 1
    return {
      id: `dual-${index}-${position}`,
      position,
      label: `${position}`,
    }
  })
  const currentIndex = clamp(step, 0, sequence.length - 1)
  const current = sequence[currentIndex]
  const prior = sequence[currentIndex - n]
  const correctAnswer = prior && prior.position === current.position ? 'match' : 'no-match'
  return {
    id: `dual-${level}-${step}`,
    n,
    gridSize,
    sequence,
    correctAnswer,
    currentPosition: current.position,
    currentIndex,
    stimLabel: `Tile ${current.position}`,
  }
}

export function buildTrailMakingRound(level: number): TrailMakingRound {
  const nodeCount = clamp(5 + Math.max(0, level - 1), 5, 9)
  const labels = Array.from({ length: nodeCount }, (_, index) => {
    const isLetter = index % 2 === 1
    const value = isLetter ? String.fromCharCode(65 + (index - 1) / 2) : `${(index / 2) + 1}`
    return value
  })
  const sequence = labels.slice(0, nodeCount)
  const nodes = labels.map((label, index) => ({
    id: `trail-${label}-${index}`,
    label,
    x: 12 + ((index % 3) * 26) + (level % 2 === 0 ? (index % 2) * 4 : 0),
    y: 16 + (Math.floor(index / 3) * 26) + ((index * 7) % 8),
  }))
  return { id: `trail-${level}`, nodes, sequence, targetIndex: 0 }
}

function itemBuckets(memories: MemoryItem[]) {
  const items: Array<{ label: string; group: string }> = []
  for (const memory of memories) {
    const labels = [...(memory.objects ?? []), ...(memory.activities ?? []), ...(memory.places ?? [])]
    for (const label of labels) {
      const value = label.trim()
      if (!value) continue
      const group = /garden|flower|plant|seed|watering|marigold|leaf/.test(value.toLowerCase()) ? 'gardening'
        : /tea|cake|cup|mango|apple|kitchen|cook|tea/.test(value.toLowerCase()) ? 'kitchen'
        : /music|song|piano|radio|dance|sing/.test(value.toLowerCase()) ? 'music'
        : /family|grandchild|daughter|son|walk|trip|visit/.test(value.toLowerCase()) ? 'family'
        : 'daily life'
      items.push({ label: value, group })
    }
  }
  return items
}

const GENERIC_ITEMS: Array<{ label: string; group: string }> = [
  { label: 'watering can', group: 'gardening' },
  { label: 'marigold', group: 'gardening' },
  { label: 'teapot', group: 'kitchen' },
  { label: 'cake', group: 'kitchen' },
  { label: 'song', group: 'music' },
  { label: 'dance', group: 'music' },
  { label: 'Anita', group: 'family' },
  { label: 'Rahul', group: 'family' },
]

function shuffle<T>(items: T[], seed: number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = seededInt(seed + i * 17 + 3, i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function buildCategoryAssociationPrompt(level: number, memories: MemoryItem[], seed = Date.now()): CategoryAssociationPrompt {
  const personalItems = itemBuckets(memories)
  const source: Array<{ label: string; group: string }> = personalItems.length ? personalItems : GENERIC_ITEMS
  const groups = new Map<string, string[]>()
  for (const item of source) {
    const current = groups.get(item.group) ?? []
    if (!current.includes(item.label)) current.push(item.label)
    groups.set(item.group, current)
  }
  const groupEntries = Array.from(groups.entries())
  // Pick the answer group, preferring the one with the most items (more ways to vary it round to round).
  const ranked = [...groupEntries].sort((a, b) => b[1].length - a[1].length)
  const groupIndex = groupEntries.length > 1 ? seededInt(seed, ranked.length) : 0
  const selectedGroup = ranked[groupIndex] ?? ranked[0] ?? ['gardening', ['watering can']] as [string, string[]]
  const [groupName, groupItems] = selectedGroup
  const answer = groupItems[seededInt(seed + 1, groupItems.length)] ?? groupItems[0]

  // Distractors must come strictly from OTHER groups, otherwise more than one choice can be "correct".
  let otherItems = groupEntries.filter(([name]) => name !== groupName).flatMap(([, items]) => items)
  if (otherItems.length < 2) {
    // Not enough variety in personal data alone — top up with generic items from other categories.
    const extra = GENERIC_ITEMS.filter((item) => item.group !== groupName && !otherItems.includes(item.label)).map((item) => item.label)
    otherItems = [...new Set([...otherItems, ...extra])]
  }
  const distractorCount = clamp(level + 1, 2, 4)
  const distractors = shuffle(otherItems, seed + 5).slice(0, distractorCount)

  const choiceLabels = shuffle([...new Set([answer, ...distractors])], seed + 11)
  const choices = choiceLabels.map((label, index) => ({
    id: `category-${label}-${index}-${seed}`,
    label,
    group: groupItems.includes(label) ? groupName : (groupEntries.find(([, items]) => items.includes(label))?.[0]
      ?? GENERIC_ITEMS.find((item) => item.label === label)?.group ?? 'daily life'),
  }))
  const answerChoice = choices.find((choice) => choice.label === answer) ?? choices[0]

  return {
    id: `category-${level}-${seed}`,
    category: groupName,
    instruction: `Choose the item that best fits the group: ${groupName}`,
    choices,
    answerId: answerChoice.id,
    source: personalItems.length ? 'memory' : 'generic',
  }
}

function useSessionGame(activityId: ActivityId, onLevelChange?: (change: { previousLevel: number; newLevel: number; reason: string; at: number }) => void) {
  const { logEvent } = useApp()
  const assessmentBaselineDifficulty = useScreenContext((state) => state.assessmentBaselineDifficulty)
  const [session] = useState(() => createActivitySession(activityId))
  const startedRef = useRef(false)
  const finishedRef = useRef(false)
  const promptStartedAt = useRef(Date.now())

  useEffect(() => {
    return () => {
      if (startedRef.current && !finishedRef.current) {
        finishedRef.current = true
        finishActivitySession(session, 'left', logEvent)
      }
    }
  }, [logEvent, session])

  const adaptive = useAdaptiveDifficulty({
    initialLevel: assessmentBaselineDifficulty ?? 3,
    onLevelChange: (change) => {
      onLevelChange?.(change)
      recordActivityEvent(session, {
        type: 'difficulty_changed',
        at: change.at,
        sessionId: session.sessionId,
        activityId,
        previousLevel: change.previousLevel,
        newLevel: change.newLevel,
        reason: change.reason === 'multimodal_distress' ? 'sustained_difficulty' : change.reason,
      }, logEvent)
    },
  })

  function record(gameEvent: Part2InteractionEvent) {
    recordActivityEvent(session, gameEvent, logEvent)
  }

  function begin() {
    startedRef.current = true
    promptStartedAt.current = Date.now()
    record({ type: 'activity_started', at: Date.now(), sessionId: session.sessionId, activityId })
  }

  function submitResponse(promptId: string, responseId: string, correct: boolean, latencyMs?: number) {
    const at = Date.now()
    const responseLatencyMs = latencyMs ?? Math.max(0, at - promptStartedAt.current)
    record({
      type: 'response_submitted',
      at,
      sessionId: session.sessionId,
      activityId,
      promptId,
      responseId,
      correct,
      responseLatencyMs,
      difficultyTier: adaptive.level,
    })
    if (correct) adaptive.recordSuccess(responseLatencyMs, at)
    else adaptive.recordFailure(responseLatencyMs, at)
  }

  return { session, adaptive, startedRef, promptStartedAt, begin, record, submitResponse } as const
}

function HowToPlayVisual({ variant }: { variant: 'dual-n-back' | 'trail-making' | 'category-association' }) {
  if (variant === 'dual-n-back') {
    return (
      <div className="rounded-2xl border border-mint-200 bg-white p-3">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className={`flex h-12 items-center justify-center rounded-xl border-2 ${index === 4 ? 'border-garden-700 bg-mint-100' : 'border-mint-200 bg-mint-50'}`}>
              {index === 4 ? '●' : index + 1}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'trail-making') {
    return (
      <div className="rounded-2xl border border-mint-200 bg-white p-3">
        <div className="relative h-24 w-full rounded-xl bg-mint-50">
          <span className="absolute left-[12%] top-[52%] flex h-8 w-8 items-center justify-center rounded-full border-2 border-garden-600 bg-white">1</span>
          <span className="absolute left-[35%] top-[18%] flex h-8 w-8 items-center justify-center rounded-full border-2 border-garden-600 bg-white">A</span>
          <span className="absolute left-[58%] top-[52%] flex h-8 w-8 items-center justify-center rounded-full border-2 border-garden-600 bg-white">2</span>
          <span className="absolute right-[15%] top-[25%] flex h-8 w-8 items-center justify-center rounded-full border-2 border-garden-600 bg-white">B</span>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-mint-200 bg-white p-3">
      {['flower', 'flower', 'flower', 'cup'].map((glyph, index) => (
        <div key={`${glyph}-${index}`} className="flex h-12 items-center justify-center rounded-xl border-2 border-garden-600 bg-mint-50 text-garden-900">
          {glyph === 'cup' ? '☕' : '🌼'}
        </div>
      ))}
    </div>
  )
}

function BackToGamesButton() {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      aria-label="Back to games"
      onClick={() => navigate('/games')}
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-mint-200 bg-white text-garden-900 shadow-soft transition active:scale-[.98]"
    >
      <ChevronLeft size={28} />
    </button>
  )
}

export function DualNBackGame() {
  const { memories } = useApp()
  const setGameContext = useScreenContext((state) => state.setGameContext)
  const { adaptive, begin, session, submitResponse, record, promptStartedAt } = useSessionGame('dual-n-back')
  const [started, setStarted] = useState(false)
  // The level used to build this round's tile sequence is snapshotted at game start and held
  // fixed for the whole playthrough. If the adaptive engine changes `adaptive.level` mid-round
  // (exactly what it is meant to do), rebuilding the sequence with the new level would silently
  // regenerate every earlier tile too, so "n steps ago" would no longer match what was shown.
  // The new level only takes effect the next time the person presses "Play again".
  const [gameLevel, setGameLevel] = useState(adaptive.level)
  const [round, setRound] = useState<DualNBackRound>(() => buildDualNBackRound(adaptive.level, 0))
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [status, setStatus] = useState<FeedbackStatus>(null)
  const [complete, setComplete] = useState(false)

  const activePrompt = useMemo(() => buildDualNBackRound(gameLevel, index), [gameLevel, index])
  const boardCells = useMemo(() => Array.from({ length: activePrompt.gridSize * activePrompt.gridSize }, (_, cellIndex) => cellIndex + 1), [activePrompt.gridSize])

  useEffect(() => {
    setRound(activePrompt)
  }, [activePrompt])

  useEffect(() => {
    setGameContext({
      activeGame: 'dual-n-back',
      gameDomain: 'Working Memory',
      difficultyLevel: adaptive.level,
      activityState: started ? (complete ? 'completed' : 'active') : 'idle',
      score: null,
    })
  }, [adaptive.level, complete, setGameContext, started])

  function startGame() {
    begin()
    setGameLevel(adaptive.level)
    setStarted(true)
    setFeedback('')
    setStatus(null)
    setComplete(false)
    setIndex(0)
    promptStartedAt.current = Date.now()
  }

  function answer(value: 'match' | 'no-match') {
    if (!started || complete || status) return
    const correct = value === round.correctAnswer
    const at = Date.now()
    const latencyMs = Math.max(0, at - promptStartedAt.current)
    submitResponse(`dual-n-back-${index}`, value, correct, latencyMs)
    record({ type: 'rapid_taps', at, sessionId: session.sessionId, activityId: 'dual-n-back', count: 1 })
    if (!correct) useScreenContext.getState().setLastFailedAction('missed the dual n-back match')
    else useScreenContext.getState().setLastFailedAction(null)
    setStatus(correct ? 'correct' : 'incorrect')
    setFeedback(correct ? 'Nice match! That is right.' : `Not quite. Watch the tile from ${round.n} steps earlier — it did${round.correctAnswer === 'match' ? '' : ' not'} match this one.`)
  }

  function advance() {
    setStatus(null)
    setFeedback('')
    if (index >= 8) {
      setComplete(true)
      return
    }
    setIndex((current) => current + 1)
    promptStartedAt.current = Date.now()
  }

  function retry() {
    // Retry the same tile/step again rather than jumping ahead, so the hint just shown is useful.
    setStatus(null)
    setFeedback('')
    promptStartedAt.current = Date.now()
  }

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center gap-3">
        <BackToGamesButton />
        <h2 className="text-2xl font-display">Dual N-Back</h2>
      </div>
      {!started ? (
        <div className="mt-4">
          <HowToPlayCard
            title="Dual N-Back"
            description="Working memory"
            instructions={`Watch the tile that lights up on the grid. Tap "Match" if it is in the same spot as the tile from ${round.n} turns earlier, or "No Match" if it is not.`}
            example="If the lit tile is in the same corner it was a few turns ago, that is a match."
            exampleVisual={<HowToPlayVisual variant="dual-n-back" />}
            onStart={startGame}
          />
        </div>
      ) : (
        <>
          <FeedbackPopup status={status} message={feedback} onRetry={retry} onContinue={advance} />
          <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${round.gridSize}, minmax(0, 1fr))` }} aria-label="Dual N-Back board">
            {boardCells.map((cell) => {
              const active = cell === round.currentPosition
              return <button key={cell} type="button" aria-label={`Grid tile ${cell}`} className={`min-h-[58px] rounded-xl border-2 font-bold ${active ? 'border-garden-700 bg-garden-100 text-garden-900' : 'border-mint-200 bg-white text-ink/80'}`}>
                {active ? '●' : cell}
              </button>
            })}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" disabled={Boolean(status)} onClick={() => answer('match')} className="min-h-[60px] rounded-2xl border-2 border-garden-600 bg-mint-100 font-semibold text-garden-900 disabled:opacity-60">Match</button>
            <button type="button" disabled={Boolean(status)} onClick={() => answer('no-match')} className="min-h-[60px] rounded-2xl border-2 border-sky-deep bg-sky-soft font-semibold text-sky-deep disabled:opacity-60">No Match</button>
          </div>
          {complete && <button type="button" onClick={() => { setStarted(false); setComplete(false); setIndex(0); setFeedback(''); setStatus(null); }} className="btn-primary mt-4 w-full">Play again</button>}
        </>
      )}
      {!memories.length && <p className="mt-4 text-sm text-ink/70">No personal memory data is needed for this activity. The visual cue stays simple and supportive.</p>}
    </section>
  )
}

export function TrailMakingGame() {
  const setGameContext = useScreenContext((state) => state.setGameContext)
  const { adaptive, begin, session, submitResponse, record } = useSessionGame('trail-making')
  const [started, setStarted] = useState(false)
  const [round, setRound] = useState<TrailMakingRound>(() => buildTrailMakingRound(adaptive.level))
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [feedback, setFeedback] = useState('')
  const [status, setStatus] = useState<FeedbackStatus>(null)
  const [wrongLabel, setWrongLabel] = useState<string | null>(null)
  const [complete, setComplete] = useState(false)
  const promptStartedAt = useRef(Date.now())

  // Deliberately does NOT depend on adaptive.level: the board used to regenerate mid-game every
  // time the difficulty engine adjusted the level, wiping out progress. A new board is only built
  // when a game actually starts (see handleStart), using whatever level is current at that moment.
  useEffect(() => {
    setGameContext({
      activeGame: 'trail-making',
      gameDomain: 'Executive Function',
      difficultyLevel: adaptive.level,
      activityState: started ? (complete ? 'completed' : 'active') : 'idle',
      score: null,
    })
  }, [adaptive.level, complete, setGameContext, started])

  function handleStart() {
    begin()
    setRound(buildTrailMakingRound(adaptive.level))
    setStarted(true)
    setSelected([])
    setIndex(0)
    setFeedback('')
    setStatus(null)
    setWrongLabel(null)
    setComplete(false)
    promptStartedAt.current = Date.now()
  }

  function handleChoose(label: string) {
    if (!started || complete || status) return
    const expected = round.sequence[index]
    const correct = label === expected
    const at = Date.now()
    const latencyMs = Math.max(0, at - promptStartedAt.current)
    submitResponse(`trail-${index}`, label, correct, latencyMs)
    if (correct) {
      setSelected((value) => [...value, label])
      setWrongLabel(null)
      setStatus('correct')
      setFeedback(index >= round.sequence.length - 1 ? 'Nice work. You followed the whole route.' : 'That is right. Keep going.')
      return
    }
    setWrongLabel(label)
    setStatus('incorrect')
    setFeedback('Not quite.')
    record({ type: 'rapid_taps', at, sessionId: session.sessionId, activityId: 'trail-making', count: 1 })
  }

  function advance() {
    setStatus(null)
    setFeedback('')
    setWrongLabel(null)
    if (index >= round.sequence.length - 1) {
      setComplete(true)
      return
    }
    setIndex((value) => value + 1)
    promptStartedAt.current = Date.now()
  }

  function retry() {
    setStatus(null)
    setFeedback('')
    setWrongLabel(null)
    promptStartedAt.current = Date.now()
  }

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center gap-3">
        <BackToGamesButton />
        <h2 className="text-2xl font-display">Trail Making</h2>
      </div>
      {!started ? (
        <div className="mt-4">
          <HowToPlayCard
            title="Trail Making"
            description="Executive function"
            instructions="Tap the circles in order: 1, then A, then 2, then B, and so on, counting and spelling as you go."
            example="Start by tapping the circle marked 1."
            exampleVisual={<HowToPlayVisual variant="trail-making" />}
            onStart={handleStart}
          />
        </div>
      ) : (
        <>
          <FeedbackPopup status={status} message={feedback} onRetry={retry} onContinue={advance} />
          <p className="mt-2 text-ink/75">Follow the route in order: 1 → A → 2 → B → ...</p>
          <div className="relative mt-4 min-h-[260px] rounded-2xl border-2 border-mint-200 bg-mint-50">
            {round.nodes.map((node) => {
              const isSelected = selected.includes(node.label)
              const isNext = node.label === round.sequence[index]
              const isWrong = node.label === wrongLabel
              const stateClass = isWrong ? choiceStateClass('wrong') : (isSelected || isNext) ? choiceStateClass('correct') : 'border-sky-deep bg-white text-sky-deep'
              return <button key={node.id} type="button" disabled={Boolean(status)} onClick={() => handleChoose(node.label)} aria-label={`Trail marker ${node.label}`} className={`absolute flex h-14 w-14 items-center justify-center rounded-full border-2 font-bold disabled:opacity-90 ${stateClass}`} style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}>
                {node.label}
              </button>
            })}
          </div>
          <p className="mt-4 font-semibold text-garden-900">Next: {round.sequence[index]}</p>
          {complete && <button type="button" onClick={() => { setStarted(false); setIndex(0); setSelected([]); setFeedback(''); setStatus(null); setComplete(false); }} className="btn-primary mt-4 w-full">Play again</button>}
        </>
      )}
    </section>
  )
}

const CATEGORY_ROUND_COUNT = 8

export function CategoryAssociationGame() {
  const { memories } = useApp()
  const setGameContext = useScreenContext((state) => state.setGameContext)
  const { adaptive, begin, submitResponse } = useSessionGame('category-association')
  const [started, setStarted] = useState(false)
  const [prompt, setPrompt] = useState<CategoryAssociationPrompt>(() => buildCategoryAssociationPrompt(adaptive.level, memories))
  const [feedback, setFeedback] = useState('')
  const [status, setStatus] = useState<FeedbackStatus>(null)
  const [wrongChoiceId, setWrongChoiceId] = useState<string | null>(null)
  const [key, setKey] = useState(0)
  const [round, setRound] = useState(1)
  const [complete, setComplete] = useState(false)

  // The prompt used to rebuild itself whenever adaptive.level changed, which could swap the
  // question out from under the person mid-answer. It now only changes when a round actually
  // advances (see advance/retryRound), using whatever level is current at that moment.

  useEffect(() => {
    setGameContext({
      activeGame: 'category-association',
      gameDomain: 'Language',
      difficultyLevel: adaptive.level,
      activityState: started ? (complete ? 'completed' : 'active') : 'idle',
      score: null,
    })
  }, [adaptive.level, complete, setGameContext, started])

  function handleStart() {
    begin()
    setStarted(true)
    setPrompt(buildCategoryAssociationPrompt(adaptive.level, memories))
    setFeedback('')
    setStatus(null)
    setWrongChoiceId(null)
    setRound(1)
    setComplete(false)
    setKey((value) => value + 1)
  }

  function handleChoose(choiceId: string) {
    if (!started || complete || status) return
    const correct = choiceId === prompt.answerId
    if (!correct) useScreenContext.getState().setLastFailedAction('selected the wrong category')
    else useScreenContext.getState().setLastFailedAction(null)
    submitResponse(`category-${key}`, choiceId, correct)
    if (correct) {
      setStatus('correct')
      setWrongChoiceId(null)
      setFeedback('Nice choice — that fits the group.')
    } else {
      const answerLabel = prompt.choices.find((choice) => choice.id === prompt.answerId)?.label
      setStatus('incorrect')
      setWrongChoiceId(choiceId)
      setFeedback(answerLabel ? `Not quite. "${answerLabel}" is the one that fits ${prompt.category}.` : 'Not quite. Let’s look again.')
    }
  }

  function advance() {
    setStatus(null)
    setFeedback('')
    setWrongChoiceId(null)
    if (round >= CATEGORY_ROUND_COUNT) {
      setComplete(true)
      return
    }
    setRound((value) => value + 1)
    setPrompt(buildCategoryAssociationPrompt(adaptive.level, memories))
    setKey((value) => value + 1)
  }

  function retry() {
    // Keep the same prompt so the hint just shown (the answer label) is immediately useful.
    setStatus(null)
    setFeedback('')
    setWrongChoiceId(null)
  }

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center gap-3">
        <BackToGamesButton />
        <h2 className="text-2xl font-display">Category Association</h2>
      </div>
      {!started ? (
        <div className="mt-4">
          <HowToPlayCard
            title="Category Association"
            description="Language"
            instructions="Look at the group name, then tap the item below that belongs with it."
            example="If the group is gardening, choose a watering can rather than a teapot."
            exampleVisual={<HowToPlayVisual variant="category-association" />}
            onStart={handleStart}
          />
        </div>
      ) : (
        <>
          <FeedbackPopup status={status} message={feedback} onRetry={retry} onContinue={advance} />
          <p className="mt-2 text-sm text-ink/60">Round {round} of {CATEGORY_ROUND_COUNT}</p>
          <div className="mt-2 rounded-2xl border-2 border-mint-200 bg-mint-50 p-4">
            <div className="flex items-center gap-2 text-garden-900"><Tags size={22} /> <span className="font-semibold">{prompt.category}</span></div>
            <p className="mt-2 text-lg">{prompt.instruction}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {prompt.choices.map((choice) => {
              const isWrong = choice.id === wrongChoiceId
              const isCorrectReveal = status === 'incorrect' && choice.id === prompt.answerId
              const stateClass = isWrong ? choiceStateClass('wrong') : isCorrectReveal ? choiceStateClass('correct') : choiceStateClass('default')
              return (
                <button key={choice.id} type="button" disabled={Boolean(status)} onClick={() => handleChoose(choice.id)} className={`min-h-[64px] rounded-2xl border-2 px-3 font-semibold disabled:opacity-90 ${stateClass}`}>
                  {choice.label}
                </button>
              )
            })}
          </div>
          {complete && <button type="button" onClick={() => { setStarted(false); setComplete(false); setStatus(null); setFeedback(''); }} className="btn-primary mt-4 w-full">Play again</button>}
        </>
      )}
      {prompt.source === 'memory' && <p className="mt-4 text-sm text-ink/70">This example uses familiar items from your memories.</p>}
    </section>
  )
}

export function AdvancedGamePage({ game }: { game: AdvancedGameId }) {
  if (game === 'dual-n-back') return <DualNBackGame />
  if (game === 'trail-making') return <TrailMakingGame />
  return <CategoryAssociationGame />
}

export function AdvancedGameHeader({ game }: { game: AdvancedGameId }) {
  const meta: Record<AdvancedGameId, { title: string; description: string; Icon: typeof Brain }> = {
    'dual-n-back': { title: 'Dual N-Back', description: 'Working Memory', Icon: Brain },
    'trail-making': { title: 'Trail Making', description: 'Executive Function', Icon: Route },
    'category-association': { title: 'Category Association', description: 'Language', Icon: Sparkles },
  }
  const { title, description, Icon } = meta[game]
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mint-100 text-garden-900"><Icon size={22} /></span>
        <div>
          <h1 className="text-2xl font-display">{title}</h1>
          <p className="text-ink/70">{description}</p>
        </div>
      </div>
    </div>
  )
}
