import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Send, X, Volume2, VolumeX, Lightbulb, Star, Leaf, HeartHandshake, ShieldAlert } from 'lucide-react'
import { useApp } from '@/store/useApp'
import { useScreenContext } from '@/store/useScreenContext'
import { brain, detectStruggle } from '@/assistant/brain'
import { speak, stopSpeaking } from '@/assistant/speech'
import { screenLabel } from '@/lib/routes'
import { getSafeAssistantPersonalization } from '@/lib/personalization'

const SUGGESTIONS = ['What can you do?', 'I want to play a game', 'Tell me about my photos', 'I need a rest']

/** Slide-up assistant sheet: chat + voice + quick actions from the Lab 5 "How can I help?" screen. */
export default function AssistantPanel() {
  const { assistantOpen, toggleAssistant, chat, addChat, userName, memories, interactionState, supportedPerson,
      speechEnabled, setSpeechEnabled, logEvent, assistantAction, assistantPrompt, clearAssistantAction,
      assistantSpeakFirst, clearAssistantSpeakFirst, privacyShieldEnabled } = useApp()
  const loc = useLocation()
  const [text, setText] = useState('')
  const [thinking, setThinking] = useState(false)
  const [notice, setNotice] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Greeting on first open
  useEffect(() => {
    if (assistantOpen && chat.length === 0) {
      addChat({ role: 'assistant', text: `Hi ${userName}, I'm Mo. I can help you reflect, give a gentle hint, or just keep you company.` })
    }
    if (assistantOpen && window.matchMedia?.('(pointer: fine)').matches) inputRef.current?.focus()
    if (!assistantOpen) {
      stopSpeaking()
    }
  }, [assistantOpen])

  useEffect(() => () => {
    stopSpeaking()
  }, [])

  useEffect(() => {
    if (!assistantOpen || !assistantAction) return
    const action = assistantAction
    const prompt = assistantPrompt
    clearAssistantAction()
    quick(action, prompt ?? undefined)
  }, [assistantOpen, assistantAction, assistantPrompt])

  // Mo speaks first: an unprompted check-in or hint after a stretch of silence elsewhere in the app.
  // Rendered as Mo's own message, never as something the person said.
  useEffect(() => {
    if (!assistantOpen || !assistantSpeakFirst) return
    const message = assistantSpeakFirst
    clearAssistantSpeakFirst()
    if (chat.length === 0) addChat({ role: 'assistant', text: `Hi ${userName}, I'm Mo.` })
    addChat({ role: 'assistant', text: message })
    if (speechEnabled) speak(message, 'en-IN')
  }, [assistantOpen, assistantSpeakFirst])

  useEffect(() => {
    if (!privacyShieldEnabled) return
    setNotice('Mic Off / Private. Turn off Privacy Shield before using voice input.')
  }, [privacyShieldEnabled])

  const visibleChat = chat.slice(-4)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chat, thinking])

  // Escape closes the sheet
  useEffect(() => {
    if (!assistantOpen) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && toggleAssistant(false)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [assistantOpen])

  async function send(raw: string) {
    const input = raw.trim()
    if (!input || thinking) return
    setText(''); setNotice('')
    addChat({ role: 'user', text: input })

    // Feed Part 3: log struggle cues from speech/text
    const cue = detectStruggle(input)
    if (cue) logEvent({ type: 'speech_cue', at: Date.now(), phrase: cue })

    setThinking(true)
    const screen = useScreenContext.getState().snapshot()
    const reply = await brain.reply(input, {
      route: screen.route || loc.pathname,
      screenLabel: screen.screen || screenLabel(loc.pathname),
      userName,
      state: interactionState,
      activeGame: screen.activeGame,
      gameDomain: screen.gameDomain,
      difficultyLevel: screen.difficultyLevel,
      score: screen.score,
      lastFailedAction: screen.lastFailedAction,
      elapsedTimeMs: screen.elapsedTimeMs,
      activityState: screen.activityState,
      personalDetails: supportedPerson.personalDetails,
      personalization: getSafeAssistantPersonalization(),
    }, memories, chat.map(({ role, text }) => ({ role, text })))
    setThinking(false)
    addChat({ role: 'assistant', text: reply })
    if (speechEnabled) speak(reply)
  }

  function quick(kind: 'clue' | 'easier' | 'break', contextualPrompt?: string) {
    if (kind === 'clue' || kind === 'easier') logEvent({ type: 'help_request', at: Date.now() })
    const prompts = { clue: 'Give me a clue', easier: 'Try an easier question', break: 'I need a gentle break' }
    send(contextualPrompt ?? prompts[kind])
  }

  if (!assistantOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Assistant">
      <div className="absolute inset-0 bg-ink/40" onClick={() => toggleAssistant(false)} aria-hidden />
      <section className="relative w-full max-w-[480px] h-[88%] bg-mist rounded-t-[2rem] shadow-soft flex flex-col animate-rise">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 pt-4 pb-3">
          <div className="w-12 h-12 rounded-full bg-mint-100 flex items-center justify-center text-garden-700"><HeartHandshake size={26} aria-hidden /></div>
          <div className="flex-1">
            <h2 className="text-xl leading-tight">Talk with Mo</h2>
            <p className="text-sm text-ink/70 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-garden-500" aria-hidden /> Here with you</p>
          </div>
          <button onClick={() => { setSpeechEnabled(!speechEnabled); stopSpeaking() }}
            aria-pressed={speechEnabled} aria-label={speechEnabled ? 'Turn off spoken replies' : 'Turn on spoken replies'}
            className="w-12 h-12 rounded-full bg-white border border-mint-200 flex items-center justify-center">
            {speechEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}
          </button>
          <button onClick={() => toggleAssistant(false)} aria-label="Close assistant"
            className="w-12 h-12 rounded-full bg-white border border-mint-200 flex items-center justify-center"><X size={24} /></button>
        </header>

        {/* Quick actions (from Lab 5 "How can I help?") */}
        <div className="px-4 grid grid-cols-3 gap-2">
          <QuickBtn icon={<Lightbulb size={22} />} label="Give me a clue" cls="bg-mint-100 border-garden-500 text-garden-900" onClick={() => quick('clue')} />
          <QuickBtn icon={<Star size={22} />} label="Easier question" cls="bg-rose-soft border-rose-main text-rose-deep" onClick={() => quick('easier')} />
          <QuickBtn icon={<Leaf size={22} />} label="Gentle break" cls="bg-garden-100 border-garden-500 text-garden-700" onClick={() => quick('break')} />
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" aria-live="polite">
          {visibleChat.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div className={`max-w-[85%] rounded-card px-4 py-3 text-lg leading-snug shadow-soft ${
                m.role === 'user' ? 'bg-garden-600 text-white rounded-br-md' : 'bg-white text-ink border border-mint-200 rounded-bl-md'}`}>
                {m.role === 'assistant' && <p className="font-display font-semibold text-iris-deep text-sm mb-1">Mo</p>}
                {m.text}
              </div>
            </div>
          ))}
          {chat.length > visibleChat.length && <p className="text-xs text-ink/60 px-2">Earlier messages are hidden.</p>}
          {thinking && <div className="text-ink/60 px-2">Mo is thinking…</div>}
          {visibleChat.length <= 1 && !thinking && (
            <div className="pt-2">
              <p className="text-sm text-ink/70 mb-2">You could say</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="min-h-[48px] px-4 rounded-pill bg-white border-2 border-mint-200 text-garden-700 font-semibold">{s}</button>
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Safety notice (from Lab 5) */}
        <p className="mx-4 mb-2 flex items-start gap-2 rounded-xl bg-rose-soft/60 px-3 py-2 text-sm text-rose-deep">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden /> Mo offers wellbeing guidance, not medical advice or diagnosis.
        </p>
        {notice && <p role="alert" className="mx-4 mb-2 rounded-xl bg-sun-soft px-3 py-2 text-sun-deep">{notice}</p>}

        {/* Input */}
        <form className="px-4 pb-5 pt-1 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); send(text) }}>
          <label htmlFor="mo-input" className="sr-only">Message to Mo</label>
          <input id="mo-input" ref={inputRef} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Ask Mo anything…"
            className="flex-1 min-h-[56px] rounded-pill bg-white border-2 border-mint-200 px-5 text-lg" />
          <button type="submit" aria-label="Send" className="w-14 h-14 rounded-full bg-garden-600 text-white flex items-center justify-center disabled:opacity-60" disabled={!text.trim()}>
            <Send size={22} />
          </button>
        </form>
      </section>
    </div>
  )
}

function QuickBtn({ icon, label, cls, onClick }: { icon: React.ReactNode; label: string; cls: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`min-h-[76px] rounded-2xl border-2 px-2 py-2 flex flex-col items-center justify-center gap-1 text-center font-display font-semibold text-sm leading-tight ${cls}`}>
      {icon}{label}
    </button>
  )
}
