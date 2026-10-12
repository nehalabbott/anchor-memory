import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { create } from 'zustand'
import { screenLabel } from '@/lib/routes'

export type ScreenActivityState = 'idle' | 'active' | 'paused' | 'completed'

export interface ScreenContext {
  route: string
  screen: string
  activeGame: string | null
  gameDomain: string | null
  difficultyLevel: 1 | 2 | 3 | 4 | 5 | null
  assessmentBaselineDifficulty: 1 | 2 | 3 | null
  score: number | null
  lastFailedAction: string | null
  elapsedTimeMs: number
  activityState: ScreenActivityState
}

interface ScreenContextActions {
  syncRoute: (route: string) => void
  setGameContext: (patch: Partial<Pick<ScreenContext, 'activeGame' | 'gameDomain' | 'difficultyLevel' | 'score' | 'activityState' | 'lastFailedAction'>>) => void
  setDifficultyLevel: (level: 1 | 2 | 3 | 4 | 5 | null) => void
  setAssessmentBaseline: (level: 1 | 2 | 3) => void
  setScore: (score: number | null) => void
  setLastFailedAction: (value: string | null) => void
  setActivityState: (state: ScreenActivityState) => void
  setElapsedTimeMs: (value: number) => void
  tickElapsed: (stepMs?: number) => void
  reset: (route?: string) => void
  snapshot: () => Pick<ScreenContext, 'route' | 'screen' | 'activeGame' | 'gameDomain' | 'difficultyLevel' | 'score' | 'lastFailedAction' | 'elapsedTimeMs' | 'activityState'>
}

const GAME_DOMAIN_FOR: Record<string, string> = {
  faces: 'Memory',
  pattern: 'Visual Reasoning',
  sequence: 'Working Memory',
  category: 'Executive Function',
  'dual-n-back': 'Working Memory',
  'trail-making': 'Executive Function',
  'category-association': 'Language',
}

const DEFAULT_ROUTE = '/'

function resolveRouteMeta(route: string) {
  const normalized = route || DEFAULT_ROUTE
  const screen = screenLabel(normalized)
  if (normalized === '/games') return { screen: 'Choose an Activity', activeGame: null, gameDomain: null }
  if (normalized.startsWith('/games/')) {
    const activeGame = normalized.replace('/games/', '')
    return {
      screen: screen !== 'this' ? screen : 'Activity',
      activeGame: activeGame || null,
      gameDomain: GAME_DOMAIN_FOR[activeGame] ?? null,
    }
  }
  if (normalized === '/garden') return { screen: 'Your Memory Garden', activeGame: null, gameDomain: null }
  if (normalized === '/profile') return { screen: 'My Journey', activeGame: null, gameDomain: null }
  if (normalized === '/profile/assessment') return { screen: 'Cognitive Check-in', activeGame: null, gameDomain: null }
  if (normalized === '/memories') return { screen: 'Your Memories', activeGame: null, gameDomain: null }
  if (normalized === '/') return { screen: 'Home', activeGame: null, gameDomain: null }
  return { screen: screen !== 'this' ? screen : 'Screen', activeGame: null, gameDomain: null }
}

export const useScreenContext = create<ScreenContext & ScreenContextActions>()((set, get) => ({
  route: DEFAULT_ROUTE,
  screen: 'Home',
  activeGame: null,
  gameDomain: null,
  difficultyLevel: null,
  assessmentBaselineDifficulty: null,
  score: null,
  lastFailedAction: null,
  elapsedTimeMs: 0,
  activityState: 'idle',
  syncRoute: (route) => {
    const meta = resolveRouteMeta(route)
    set((state) => ({
      ...state,
      route,
      screen: meta.screen,
      activeGame: meta.activeGame,
      gameDomain: meta.gameDomain,
      difficultyLevel: meta.activeGame ? 3 : null,
      score: meta.activeGame ? state.score : null,
      lastFailedAction: meta.activeGame ? state.lastFailedAction : null,
      elapsedTimeMs: meta.activeGame ? state.elapsedTimeMs : 0,
      activityState: meta.activeGame ? state.activityState : 'idle',
    }))
  },
  setGameContext: (patch) => set((state) => {
    const next = {
      ...state,
      ...patch,
      activeGame: patch.activeGame ?? state.activeGame,
      gameDomain: patch.gameDomain ?? state.gameDomain,
      difficultyLevel: patch.difficultyLevel ?? state.difficultyLevel,
      activityState: patch.activityState ?? state.activityState,
      lastFailedAction: patch.lastFailedAction ?? state.lastFailedAction,
      score: patch.score ?? state.score,
    }
    const changed = Object.entries(patch).some(([key, value]) => next[key as keyof typeof next] !== state[key as keyof typeof state])
    if (!changed && state.activeGame === next.activeGame && state.gameDomain === next.gameDomain && state.difficultyLevel === next.difficultyLevel && state.score === next.score && state.activityState === next.activityState && state.lastFailedAction === next.lastFailedAction) return state
    return next
  }),
  setDifficultyLevel: (difficultyLevel) => set({ difficultyLevel }),
  setAssessmentBaseline: (assessmentBaselineDifficulty) => set({ assessmentBaselineDifficulty }),
  setScore: (score) => set({ score }),
  setLastFailedAction: (lastFailedAction) => set({ lastFailedAction }),
  setActivityState: (activityState) => set({ activityState }),
  setElapsedTimeMs: (elapsedTimeMs) => set({ elapsedTimeMs }),
  tickElapsed: (stepMs = 1_000) => set((state) => ({ elapsedTimeMs: state.activityState === 'active' ? state.elapsedTimeMs + stepMs : state.elapsedTimeMs })),
  reset: (route = DEFAULT_ROUTE) => set({
    route,
    screen: resolveRouteMeta(route).screen,
    activeGame: resolveRouteMeta(route).activeGame,
    gameDomain: resolveRouteMeta(route).gameDomain,
    difficultyLevel: null,
    score: null,
    lastFailedAction: null,
    elapsedTimeMs: 0,
    activityState: 'idle',
  }),
  snapshot: () => {
    const state = get()
    return {
      route: state.route,
      screen: state.screen,
      activeGame: state.activeGame,
      gameDomain: state.gameDomain,
      difficultyLevel: state.difficultyLevel,
      score: state.score,
      lastFailedAction: state.lastFailedAction,
      elapsedTimeMs: state.elapsedTimeMs,
      activityState: state.activityState,
    }
  },
}))

export function useScreenContextTicker() {
  const activityState = useScreenContext((state) => state.activityState)
  const tickElapsed = useScreenContext((state) => state.tickElapsed)

  useEffect(() => {
    if (activityState !== 'active') return
    const timer = window.setInterval(() => tickElapsed(1_000), 1_000)
    return () => window.clearInterval(timer)
  }, [activityState, tickElapsed])
}

export function ScreenContextSync() {
  const location = useLocation()
  const routeSync = useScreenContext((state) => state.syncRoute)

  useEffect(() => {
    routeSync(location.pathname)
  }, [location.pathname, routeSync])

  return null
}
