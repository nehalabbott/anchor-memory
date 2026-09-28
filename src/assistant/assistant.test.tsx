import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { RuleBasedBrain, detectStruggle } from './brain'
import { useApp } from '@/store/useApp'

const ctx = { route: '/games', screenLabel: 'Choose an Activity', userName: 'Margaret', state: 'normal' as const }
const mems = useApp.getState().memories

describe('RuleBasedBrain', () => {
  const b = new RuleBasedBrain()
  it('reassures and identifies family when user does not remember', async () => {
    const r = await b.reply("I don't remember who this is", ctx, mems)
    expect(r).toMatch(/That's okay, Margaret/); expect(r).toMatch(/Rahul, your son/)
  })
  it('stays out of medical territory', async () => {
    expect(await b.reply('what is my dementia score mean', ctx, mems)).toMatch(/not medical advice/)
  })
  it('detects struggle phrases from the Lab 4 report', () => {
    expect(detectStruggle("I can't remember")).toBeTruthy()
    expect(detectStruggle('lovely weather')).toBeNull()
  })
})

describe('App shell + assistant toolbar', () => {
  beforeEach(() => { localStorage.clear(); useApp.setState({ chat: [], assistantOpen: false, events: [] }) })
  const mount = (path = '/') => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)

  it('shows the assistant toolbar and bottom nav on every screen', async () => {
    for (const p of ['/', '/games', '/garden', '/profile', '/memories', '/games/faces']) {
      const { unmount } = mount(p)
      expect(screen.getByRole('button', { name: 'Talk to Assistant' })).toBeInTheDocument()
      expect(within(screen.getByRole('navigation', { name: 'Main' })).getAllByRole('link')).toHaveLength(4)
      unmount()
    }
  })

  it('opens the panel, greets by name, and replies to a typed message', async () => {
    const u = userEvent.setup(); mount('/games')
    await u.click(screen.getByRole('button', { name: 'Talk to Assistant' }))
    expect(await screen.findByRole('dialog', { name: 'Assistant' })).toBeInTheDocument()
    expect(screen.getByText(/Hi Margaret, I'm Mo/)).toBeInTheDocument()
    await u.type(screen.getByLabelText('Message to Mo'), 'I want to play a game{enter}')
    await waitFor(() => expect(screen.getByText(/Let's play something gentle/)).toBeInTheDocument())
  })

  it('logs a help_request event when "Give me a clue" is tapped (feeds Part 3)', async () => {
    const u = userEvent.setup(); mount('/')
    await u.click(screen.getByRole('button', { name: 'Talk to Assistant' }))
    await u.click(await screen.findByRole('button', { name: /Give me a clue/ }))
    expect(useApp.getState().events.some((e) => e.type === 'help_request')).toBe(true)
  })

  it('logs a speech_cue when the user says they do not remember', async () => {
    const u = userEvent.setup(); mount('/')
    await u.click(screen.getByRole('button', { name: 'Talk to Assistant' }))
    await u.type(await screen.findByLabelText('Message to Mo'), "i don't remember{enter}")
    await waitFor(() => expect(useApp.getState().events.some((e) => e.type === 'speech_cue')).toBe(true))
  })

  it('closes with the Close button and with Escape', async () => {
    const u = userEvent.setup(); mount('/')
    await u.click(screen.getByRole('button', { name: 'Talk to Assistant' }))
    await u.click(await screen.findByRole('button', { name: 'Close assistant' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await u.click(screen.getByRole('button', { name: 'Talk to Assistant' }))
    await u.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
