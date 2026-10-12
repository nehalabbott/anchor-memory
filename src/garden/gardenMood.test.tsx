import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Garden from '@/pages/Garden'
import { useApp } from '@/store/useApp'
import { useScreenContext } from '@/store/useScreenContext'
import { deriveGardenMood } from './gardenMood'

beforeEach(() => {
  useApp.setState({ memories: [], lastSessionExperience: null, gardenAudioEnabled: false })
  useScreenContext.setState({
    route: '/garden',
    screen: 'Your Memory Garden',
    activeGame: null,
    gameDomain: null,
    difficultyLevel: null,
    score: null,
    lastFailedAction: null,
    elapsedTimeMs: 0,
    activityState: 'idle',
  })
})

describe('garden mood derivation', () => {
  it('defaults to calm when no game is active', () => {
    expect(deriveGardenMood()).toBe('calm')
  })

  it('supports mild uncertainty with supportive context', () => {
    useScreenContext.setState({ activityState: 'active', difficultyLevel: 3, lastFailedAction: 'selected the wrong category' })
    expect(deriveGardenMood()).toBe('supportive')
  })

  it('requires sustained signals before becoming agitated', () => {
    useScreenContext.setState({ activityState: 'active', difficultyLevel: 5, lastFailedAction: 'selected the wrong trail node', elapsedTimeMs: 60000 })
    useApp.setState({ interactionState: 'high_frustration' })
    expect(deriveGardenMood()).toBe('agitated')
  })
})

describe('garden rendering', () => {
  it('renders with existing memories and no breakage', () => {
    useApp.setState({ memories: [{ id: 'm1', kind: 'person', name: 'Rahul', relationship: 'son', story: 'talking in the garden', createdAt: Date.now() }] })
    render(<MemoryRouter><Garden /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: /Your Memory Garden/i })).toBeInTheDocument()
    expect(screen.getByText(/quiet|blooming/i)).toBeInTheDocument()
  })

  it('renders safely without memories', () => {
    render(<MemoryRouter><Garden /></MemoryRouter>)
    expect(screen.getByRole('img', { name: /A peaceful garden|A quiet garden|A bright garden/i })).toBeInTheDocument()
  })

  it('provides an accessible sound toggle', () => {
    render(<MemoryRouter><Garden /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /sounds off|sounds on/i })).toBeInTheDocument()
  })
})
