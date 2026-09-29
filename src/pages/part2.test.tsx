import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { DEMO_MEMORIES } from '@/demo/demoData'
import { useApp } from '@/store/useApp'

describe('Part 2 caregiver and activity flow', () => {
  beforeEach(() => {
    localStorage.clear()
    useApp.setState({ memories: [], chat: [], assistantOpen: false, assistantAction: null, assistantPrompt: null, events: [], lastSessionExperience: null })
  })

  const mount = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)

  it('lets a caregiver add, edit, and remove a personal memory', async () => {
    const user = userEvent.setup()
    mount('/memories')
    await user.click(screen.getByRole('button', { name: 'Add the first memory' }))
    await user.type(screen.getByLabelText('Name this memory or person'), 'Jo')
    await user.selectOptions(screen.getByLabelText('Relationship, if this is a person'), 'friend')
    await user.type(screen.getByLabelText('Personal story'), 'Jo and I walked by the lake.')
    await user.type(screen.getByLabelText('Places'), 'the lake')
    await user.click(screen.getByRole('button', { name: 'Save memory' }))

    expect(useApp.getState().memories[0]).toMatchObject({ name: 'Jo', relationship: 'friend', story: 'Jo and I walked by the lake.' })
    await user.click(screen.getByRole('button', { name: 'Edit Jo' }))
    const storyField = screen.getByLabelText('Personal story')
    await user.clear(storyField)
    await user.type(storyField, 'Jo and I sat beside the lake.')
    await user.click(screen.getByRole('button', { name: 'Save memory' }))
    expect(useApp.getState().memories[0].story).toBe('Jo and I sat beside the lake.')
    await user.click(screen.getByRole('button', { name: 'Remove memory' }))
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(useApp.getState().memories).toHaveLength(0)
    expect(screen.getByText(/A caregiver can add a person/)).toBeInTheDocument()
  })

  it('loads the clearly labeled fictional demo profile and materials', async () => {
    const user = userEvent.setup()
    mount('/memories')
    await user.click(screen.getByRole('button', { name: 'Load fictional demo memories' }))
    expect(useApp.getState().supportedPerson.name).toBe('Margaret')
    expect(useApp.getState().memories.some((memory) => memory.name === 'Anita')).toBe(true)
    expect(useApp.getState().memories.some((memory) => memory.events?.length === 4)).toBe(true)
    expect(screen.getByRole('status')).toHaveTextContent('Fictional demo memories loaded')
  })

  it('uses stored portraits and offers gentle identity clues in Familiar Faces', async () => {
    const user = userEvent.setup()
    useApp.setState({ memories: DEMO_MEMORIES })
    mount('/games/faces')
    await user.click(screen.getByRole('button', { name: 'Begin activity' }))
    expect(await screen.findByAltText('Fictional portrait of Anita')).toHaveAttribute('src', '/demo/anita.svg')
    await user.click(screen.getByRole('button', { name: /Rahul, grandchild/ }))
    expect(screen.getByRole('status')).toHaveTextContent("That's okay. Here's a clue")
    expect(screen.queryByText(/score|percentage|points|ranking|streak/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue together' }))
    expect(await screen.findByAltText('Fictional portrait of Rahul')).toBeInTheDocument()
    expect(useApp.getState().events.some((event) => event.type === 'memory_presented')).toBe(true)
  })

  it('completes a repeating visual pattern, not a personal-memory match', async () => {
    const user = userEvent.setup()
    useApp.setState({ memories: DEMO_MEMORIES })
    mount('/games/match')
    await user.click(screen.getByRole('button', { name: 'Begin activity' }))
    expect(screen.getByText('Pattern & Shape Match')).toBeInTheDocument()
    expect(screen.getByLabelText('Repeating pattern').children).toHaveLength(5)
    await user.click(screen.getByRole('button', { name: /watering can/ }))
    expect(screen.getByRole('status')).toHaveTextContent('noticed the repeating pattern')
    expect(screen.queryByText(/relationship:|belongs together/i)).not.toBeInTheDocument()
    expect(useApp.getState().events.some((event) => event.type === 'response_submitted' && event.activityId === 'pattern')).toBe(true)
  })

  it('hides a visual sequence and lets the user reconstruct it in order', async () => {
    const user = userEvent.setup()
    useApp.setState({ memories: DEMO_MEMORIES })
    mount('/games/sequence')
    await user.click(screen.getByRole('button', { name: 'Begin activity' }))
    expect(screen.getByLabelText('Sequence to remember')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hide sequence and begin' }))
    expect(screen.queryByLabelText('Sequence to remember')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Your sequence')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /watering can/ }))
    await user.click(screen.getByRole('button', { name: /^talking/ }))
    await user.click(screen.getByRole('button', { name: /^gardening/ }))
    await user.click(screen.getByRole('button', { name: 'Check sequence' }))
    expect(screen.getByRole('status')).toHaveTextContent('kept the items in order')
    expect(useApp.getState().events.some((event) => event.type === 'response_submitted' && event.activityId === 'sequence')).toBe(true)
  })

  it('asks the user to categorize visual items in Odd One Out', async () => {
    const user = userEvent.setup()
    useApp.setState({ memories: DEMO_MEMORIES })
    mount('/games/category')
    await user.click(screen.getByRole('button', { name: 'Begin activity' }))
    await user.click(screen.getByRole('button', { name: /chair/i }))
    expect(screen.getByRole('status')).toHaveTextContent('different group')
    expect(screen.queryByText(/relationship|personal story|what happened next/i)).not.toBeInTheDocument()
    expect(useApp.getState().events.some((event) => event.type === 'response_submitted' && event.activityId === 'category')).toBe(true)
  })

  it('keeps generic visual games usable with no personal memories', async () => {
    const user = userEvent.setup()
    for (const [route, marker] of [['/games/match', 'Repeating pattern'], ['/games/sequence', 'Sequence to remember'], ['/games/category', 'Apple']] as const) {
      const view = mount(route)
      await user.click(screen.getByRole('button', { name: 'Begin activity' }))
      if (route === '/games/category') expect(screen.getByRole('button', { name: marker })).toBeInTheDocument()
      else expect(screen.getByLabelText(marker)).toBeInTheDocument()
      view.unmount()
    }
    const facesView = mount('/games/faces')
    expect(screen.getByText('Add a familiar person to begin')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open personal memories' })).toHaveAttribute('href', '/memories')
    facesView.unmount()
  })

  it('sends game-specific clues through Mo and keeps the Garden reflection qualitative', async () => {
    const user = userEvent.setup()
    useApp.setState({ memories: DEMO_MEMORIES })
    mount('/games/match')
    await user.click(screen.getByRole('button', { name: 'Begin activity' }))
    await user.click(screen.getByRole('button', { name: 'Need a clue?' }))
    expect(await screen.findByRole('dialog', { name: 'Assistant' })).toBeInTheDocument()
    await waitFor(() => expect(useApp.getState().chat.some((message) => message.text.includes('items that repeat'))).toBe(true))
    expect(useApp.getState().events.some((event) => event.type === 'help_request')).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Close assistant' }))
    await user.click(screen.getByRole('button', { name: 'Finish activity' }))
    await user.click(screen.getByRole('button', { name: "I'd like a quiet moment" }))
    expect(useApp.getState().lastSessionExperience?.kind).toBe('calming')
    expect(await screen.findByText("Let's take a quiet moment in the garden.")).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /peaceful garden with gentle rain and a flowing river/i })).toBeInTheDocument()
  })
})
