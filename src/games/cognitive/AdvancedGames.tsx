import { useEffect, useMemo, useRef, useState } from 'react'
import { Brain, Route, Sparkles, Tags } from 'lucide-react'
import { useAdaptiveDifficulty } from '@/hooks/useAdaptiveDifficulty'
import { createActivitySession, finishActivitySession, recordActivityEvent } from '@/lib/sessionPersistence'
import type { ActivityId, InteractionEvent, MemoryItem, Part2InteractionEvent } from '@/lib/types'
import { useApp } from '@/store/useApp'
import { useScreenContext } from '@/store/useScreenContext'

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
  const sequence = Array.from({ length }, (_, index) => {
    const position = seededInt(index * 23 + step * 11 + level, gridSize * gridSize) + 1
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

export function buildCategoryAssociationPrompt(level: number, memories: MemoryItem[]): CategoryAssociationPrompt {
  const personalItems = itemBuckets(memories)
  const groups = new Map<string, string[]>()
  for (const item of personalItems.length ? personalItems : [
    { label: 'watering can', group: 'gardening' },
    { label: 'marigold', group: 'gardening' },
    { label: 'teapot', group: 'kitchen' },
    { label: 'cake', group: 'kitchen' },
    { label: 'song', group: 'music' },
    { label: 'dance', group: 'music' },
    { label: 'Anita', group: 'family' },
    { label: 'Rahul', group: 'family' },
  ]) {
    const current = groups.get(item.group) ?? []
    current.push(item.label)
    groups.set(item.group, current)
  }
  const selectedGroup = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length)[0]
  const answer = selectedGroup?.[1]?.[0] ?? 'watering can'
  const distractors = Array.from(groups.values()).flat().filter((label) => label !== answer).slice(0, Math.max(2, level + 1))
  const choices = [...new Set([answer, ...distractors].slice(0, Math.min(5, 2 + level)))].map((label, index) => ({ id: `category-${label}-${index}`, label, group: selectedGroup?.[0] ?? 'gardening' }))
  const fallback = choices.length > 0 ? choices : [{ id: 'category-answer', label: 'watering can', group: 'gardening' }]
  return {
    id: `category-${level}`,
    category: selectedGroup?.[0] ?? 'gardening',
    instruction: `Choose the item that best fits the group: ${selectedGroup?.[0] ?? 'gardening'}`,
    choices: fallback,
    answerId: fallback[0].id,
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

export function DualNBackGame() {
  const { memories } = useApp()
  const setGameContext = useScreenContext((state) => state.setGameContext)
  const { adaptive, begin, session, submitResponse, record, promptStartedAt } = useSessionGame('dual-n-back')
  const [started, setStarted] = useState(false)
  const [round, setRound] = useState<DualNBackRound>(() => buildDualNBackRound(adaptive.level, 0))
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [complete, setComplete] = useState(false)

  const activePrompt = useMemo(() => buildDualNBackRound(adaptive.level, index), [adaptive.level, index])
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
    setStarted(true)
    setFeedback('')
    setComplete(false)
    setIndex(0)
    promptStartedAt.current = Date.now()
  }

  function answer(value: 'match' | 'no-match') {
    if (!started || complete) return
    const correct = value === round.correctAnswer
    const at = Date.now()
    const latencyMs = Math.max(0, at - promptStartedAt.current)
    submitResponse(`dual-n-back-${index}`, value, correct, latencyMs)
    record({ type: 'rapid_taps', at, sessionId: session.sessionId, activityId: 'dual-n-back', count: 1 })
    if (!correct) useScreenContext.getState().setLastFailedAction('missed the dual n-back match')
    else useScreenContext.getState().setLastFailedAction(null)
    setFeedback(correct ? 'Nice match. We can keep going.' : 'That is okay. Watch the position from a few steps earlier.')
    if (index >= 8) {
      setComplete(true)
      return
    }
    setIndex((current) => current + 1)
    promptStartedAt.current = Date.now()
  }

  return (
    <section className="card p-5">
      <h2 className="text-2xl font-display">Dual N-Back</h2>
      <p className="mt-2 text-ink/75">Watch the highlighted tile. Tap “Match” when the tile matches the one from {round.n} steps ago.</p>
      {!started ? (
        <button type="button" onClick={startGame} className="btn-primary mt-4 w-full">Begin activity</button>
      ) : (
        <>
          <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${round.gridSize}, minmax(0, 1fr))` }} aria-label="Dual N-Back board">
            {boardCells.map((cell) => {
              const active = cell === round.currentPosition
              return <button key={cell} type="button" aria-label={`Grid tile ${cell}`} className={`min-h-[58px] rounded-xl border-2 font-bold ${active ? 'border-garden-700 bg-garden-100 text-garden-900' : 'border-mint-200 bg-white text-ink/80'}`}>
                {active ? '●' : cell}
              </button>
            })}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => answer('match')} className="min-h-[60px] rounded-2xl border-2 border-garden-600 bg-mint-100 font-semibold text-garden-900">Match</button>
            <button type="button" onClick={() => answer('no-match')} className="min-h-[60px] rounded-2xl border-2 border-sky-deep bg-sky-soft font-semibold text-sky-deep">No Match</button>
          </div>
          {feedback && <p role="status" className="mt-4 rounded-xl bg-mint-100 p-3 text-garden-900">{feedback}</p>}
          {complete && <button type="button" onClick={() => { setStarted(false); setComplete(false); setIndex(0); setFeedback(''); }} className="btn-primary mt-4 w-full">Play again</button>}
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
  const [complete, setComplete] = useState(false)
  const promptStartedAt = useRef(Date.now())

  useEffect(() => {
    setRound(buildTrailMakingRound(adaptive.level))
    setSelected([])
    setIndex(0)
    setFeedback('')
    setComplete(false)
  }, [adaptive.level])

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
    setStarted(true)
    setSelected([])
    setIndex(0)
    setFeedback('')
    setComplete(false)
    promptStartedAt.current = Date.now()
  }

  function handleChoose(label: string) {
    if (!started || complete) return
    const expected = round.sequence[index]
    const correct = label === expected
    const at = Date.now()
    const latencyMs = Math.max(0, at - promptStartedAt.current)
    submitResponse(`trail-${index}`, label, correct, latencyMs)
    if (correct) {
      const nextSelected = [...selected, label]
      setSelected(nextSelected)
      if (index >= round.sequence.length - 1) {
        setComplete(true)
        setFeedback('Nice work. You followed the route.')
        return
      }
      setIndex((value) => value + 1)
      setFeedback('Keep going.')
      promptStartedAt.current = Date.now()
      return
    }
    setFeedback('That is okay. We can try the next step together.')
    record({ type: 'rapid_taps', at, sessionId: session.sessionId, activityId: 'trail-making', count: 1 })
  }

  return (
    <section className="card p-5">
      <h2 className="text-2xl font-display">Trail Making</h2>
      <p className="mt-2 text-ink/75">Follow the route in order: 1 → A → 2 → B → ...</p>
      {!started ? (
        <button type="button" onClick={handleStart} className="btn-primary mt-4 w-full">Begin activity</button>
      ) : (
        <>
          <div className="relative mt-4 min-h-[260px] rounded-2xl border-2 border-mint-200 bg-mint-50">
            {round.nodes.map((node) => {
              const active = selected.includes(node.label) || node.label === round.sequence[index]
              return <button key={node.id} type="button" onClick={() => handleChoose(node.label)} aria-label={`Trail marker ${node.label}`} className={`absolute flex h-14 w-14 items-center justify-center rounded-full border-2 font-bold ${active ? 'border-garden-700 bg-garden-100 text-garden-900' : 'border-sky-deep bg-white text-sky-deep'}`} style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}>
                {node.label}
              </button>
            })}
          </div>
          <p className="mt-4 font-semibold text-garden-900">Next: {round.sequence[index]}</p>
          {feedback && <p role="status" className="mt-3 rounded-xl bg-mint-100 p-3 text-garden-900">{feedback}</p>}
          {complete && <button type="button" onClick={() => { setStarted(false); setIndex(0); setSelected([]); setFeedback(''); setComplete(false); }} className="btn-primary mt-4 w-full">Play again</button>}
        </>
      )}
    </section>
  )
}

export function CategoryAssociationGame() {
  const { memories } = useApp()
  const setGameContext = useScreenContext((state) => state.setGameContext)
  const { adaptive, begin, submitResponse } = useSessionGame('category-association')
  const [started, setStarted] = useState(false)
  const [prompt, setPrompt] = useState<CategoryAssociationPrompt>(() => buildCategoryAssociationPrompt(adaptive.level, memories))
  const [feedback, setFeedback] = useState('')
  const [key, setKey] = useState(0)

  useEffect(() => {
    setPrompt(buildCategoryAssociationPrompt(adaptive.level, memories))
  }, [adaptive.level, memories])

  useEffect(() => {
    setGameContext({
      activeGame: 'category-association',
      gameDomain: 'Language',
      difficultyLevel: adaptive.level,
      activityState: started ? 'active' : 'idle',
      score: null,
    })
  }, [adaptive.level, setGameContext, started])

  function handleStart() {
    begin()
    setStarted(true)
    setFeedback('')
    setKey((value) => value + 1)
  }

  function handleChoose(choiceId: string) {
    if (!started) return
    const correct = choiceId === prompt.answerId
    if (!correct) useScreenContext.getState().setLastFailedAction('selected the wrong category')
    else useScreenContext.getState().setLastFailedAction(null)
    submitResponse(`category-${key}`, choiceId, correct)
    setFeedback(correct ? 'Nice choice. That fits the group.' : 'That is okay. We can look at the group together.')
    if (!correct) {
      setPrompt(buildCategoryAssociationPrompt(adaptive.level, memories))
      setKey((value) => value + 1)
    }
  }

  return (
    <section className="card p-5">
      <h2 className="text-2xl font-display">Category Association</h2>
      <p className="mt-2 text-ink/75">Choose the item that best fits the group.</p>
      {!started ? (
        <button type="button" onClick={handleStart} className="btn-primary mt-4 w-full">Begin activity</button>
      ) : (
        <>
          <div className="mt-4 rounded-2xl border-2 border-mint-200 bg-mint-50 p-4">
            <div className="flex items-center gap-2 text-garden-900"><Tags size={22} /> <span className="font-semibold">{prompt.category}</span></div>
            <p className="mt-2 text-lg">{prompt.instruction}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {prompt.choices.map((choice) => (
              <button key={choice.id} type="button" onClick={() => handleChoose(choice.id)} className="min-h-[64px] rounded-2xl border-2 border-garden-600 bg-white px-3 font-semibold text-garden-900">
                {choice.label}
              </button>
            ))}
          </div>
          {feedback && <p role="status" className="mt-4 rounded-xl bg-mint-100 p-3 text-garden-900">{feedback}</p>}
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
