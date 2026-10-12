import type { AssistantContext, ChatMessage, MemoryItem } from '@/lib/types'
import { BackendApiError, requestAssistant } from '@/lib/apiClient'

/**
 * The assistant "brain" is an interface so the UI never cares where answers come from.
 *   Part 1 (now):  RuleBasedBrain  - works offline, no API key, safe defaults.
 *   Part 3:        RemoteBrain     - POST /api/assistant (Whisper + LLM, see server/index.js)
 */
export interface AssistantBrain {
  reply(
    input: string,
    ctx: AssistantContext,
    memories: MemoryItem[],
    history?: Pick<ChatMessage, 'role' | 'text'>[],
  ): Promise<string>
}

/** Phrases from the Lab 4 report that signal the user may need help (Gap 3). */
export const STRUGGLE_PHRASES = [
  "i don't remember", 'i dont remember', "i can't remember", 'i cant remember',
  'i forgot', "i don't know", 'i dont know', 'i am confused', "i'm confused",
  'this is hard', 'too hard', 'i give up', 'help me', 'who is this',
]

export function detectStruggle(text: string): string | null {
  const t = text.toLowerCase()
  return STRUGGLE_PHRASES.find((p) => t.includes(p)) ?? null
}

/** Orientation questions ("who am I", "what am I doing", "where am I") are grounding requests,
 *  not struggle phrases, so they're matched and answered before the struggle branch. */
const IDENTITY_PATTERNS = [/\bwho am i\b/, /\bwho'?s? this\b.*\bme\b/, /\bwhat'?s my name\b/, /\bdo you know who i am\b/]
const ACTIVITY_PATTERNS = [/\bwhat am i doing\b/, /\bwhere am i\b/, /\bwhat is (this|going on)\b/, /\bwhat'?s happening\b/]

function detectIdentityQuestion(t: string): 'who' | 'what' | null {
  if (IDENTITY_PATTERNS.some((p) => p.test(t))) return 'who'
  if (ACTIVITY_PATTERNS.some((p) => p.test(t))) return 'what'
  return null
}

const SAFETY_NOTE = 'I offer gentle wellbeing guidance, not medical advice.'

export class RuleBasedBrain implements AssistantBrain {
  async reply(input: string, ctx: AssistantContext, memories: MemoryItem[]): Promise<string> {
    const t = input.toLowerCase().trim()
    const name = ctx.userName
    const details = (ctx.personalDetails ?? []).filter((d) => d.trim())

    // 0. Orientation questions ("who am I", "what am I doing") answer directly and gently,
    //    grounded only in facts the caregiver actually entered, never invented.
    const identity = detectIdentityQuestion(t)
    if (identity === 'who') {
      return details.length
        ? `You are ${name}. ${details.join(' ')}`
        : `You are ${name}. That's all I have written down about you right now, but I'm here with you.`
    }
    if (identity === 'what') {
      return `Right now you're with me on the "${ctx.screenLabel}" screen, just spending a quiet moment together. There is nothing you need to do. Would you like to look at a memory, play something gentle, or just rest here?`
    }

    // 1. Struggling: reassure first, never correct harshly (HCI: forgiving interaction)
    if (detectStruggle(t)) {
      const family = memories.find((m) => m.relationship === 'son' || m.relationship === 'daughter')
      if (family && /who|remember|know/.test(t)) {
        return `That's okay, ${name}. This is ${family.name}, your ${family.relationship}. ${family.story}`
      }
      return `That's perfectly okay, ${name}. There is no rush. Would you like a small clue, an easier question, or a gentle break?`
    }

    // 2. Medical / diagnosis questions: stay within scope
    if (/diagnos|medicine|medication|dose|doctor|dementia|alzheimer|score mean/.test(t)) {
      return `That is a good question for your doctor or carer. ${SAFETY_NOTE} I can help you practise gently, or we can look at your photos together.`
    }

    const faceClue = input.match(/please give a gentle clue for familiar faces:\s*(.+)/i)
    if (faceClue) return `Here's a gentle clue: ${faceClue[1]}`
    if (/please suggest a gentle easier version for familiar faces/i.test(t)) return `Let's look at one familiar person at a time, ${name}. A caregiver can help name the person together with you.`
    if (/please simplify this visual pattern/i.test(t)) return `Let's make it simpler: notice two items repeating, then choose what comes next.`
    if (/please reduce the choices in this categorization activity/i.test(t)) return `Let's look at just a couple of items. Notice which ones seem alike, then choose the one that feels different.`
    const patternClue = input.match(/please explain this repeating pattern gently:\s*(.+)/i)
    if (patternClue) return `Look for the items that repeat. ${patternClue[1]}`
    const categoryClue = input.match(/please explain the category gently:\s*(.+)/i)
    if (categoryClue) return `Notice how the familiar items are alike. ${categoryClue[1]}`
    if (/offer a shorter sequence/.test(t)) return `Of course. Let's use just two familiar items and build their order together. There is no rush.`

    if (/clue|hint/.test(t)) {
      const memory = memories.find((item) => item.story.trim())
      return memory
        ? `Let's look at one of your memories together: ${memory.name}. ${memory.story}`
        : `There is no rush, ${name}. We can ask your caregiver to add a memory to explore together.`
    }
    if (/easier/.test(t)) {
      const memory = memories.find((item) => item.story.trim())
      return memory
        ? `We can keep it simple, ${name}. Would you like to talk about ${memory.name}? ${memory.story}`
        : `We can take this gently, ${name}. Would you like to rest or look at a photo with your caregiver?`
    }
    if (/gentle break|need a break|take a break/.test(t)) {
      return `Of course, ${name}. There is no rush. Let's pause together; the garden will be here when you are ready.`
    }

    // 3. Navigation / feature help
    if (/game|play|practice|exercise/.test(t)) return `Let's play something gentle. Tap "Games" at the bottom, and pick whichever feels right today.`
    if (/photo|memor|family|picture/.test(t)) return `Your memories are kept safe in "Your Memories". We will use them in games so they feel personal to you.`
    if (/garden|flower/.test(t)) return `Your Memory Garden responds to how a moment felt. There is no right or wrong way to spend time there.`
    if (/break|tired|rest|calm|relax/.test(t)) return `Of course. Let's take a slow breath together. In through the nose... and out. The garden will be here when you are ready.`
    if (/hello|hi\b|hey|good (morning|afternoon|evening)/.test(t)) return `Hello ${name}. I'm Mo. It is lovely to hear from you. How would you like to spend a little time today?`
    if (/thank/.test(t)) return `You are very welcome, ${name}.`
    if (/what can you do|help\b|how do i/.test(t)) {
      return `I can help you find activities, talk about your memories, give a hint, or keep you company while you rest.`
    }

    // 4. Context-aware default
    return `Thank you for telling me, ${name}. You are on the "${ctx.screenLabel}" screen. Would you like a hint, an easier activity, or a short rest?`
  }
}

export class RemoteBrain implements AssistantBrain {
  async reply(
    input: string,
    ctx: AssistantContext,
    memories: MemoryItem[],
    history: Pick<ChatMessage, 'role' | 'text'>[] = [],
  ): Promise<string> {
    try {
      return await requestAssistant({ input, ctx, memories, history: history.slice(-8) }, AbortSignal.timeout(25_000))
    } catch (error) {
      if (error instanceof BackendApiError) {
        if (error.code === 'request_timeout' || error.code === 'groq_timeout') return `Mo is taking too long to respond, ${ctx.userName}. Please try again shortly.`
        if (error.code === 'backend_unavailable' || error.code === 'groq_network_error') return `Mo cannot reach the service just now, ${ctx.userName}. Please try again in a moment.`
        if (error.code === 'groq_rate_limited') return `Mo is busy right now, ${ctx.userName}. Please try again shortly.`
        if (error.code === 'authentication_required' || error.code === 'invalid_session') return 'Please sign in again before talking with Mo.'
        return error.message
      }
      return `Mo could not respond just now, ${ctx.userName}. Please try again in a moment.`
    }
  }
}

export const brain: AssistantBrain = new RemoteBrain()

/** How long Mo waits with no reply before checking in (ms). Two escalating steps, never more. */
export const NUDGE_DELAY_MS = 20_000
export const HINT_DELAY_MS = 40_000

/** First, gentle check-in when the person has gone quiet. Never implies something is wrong with them. */
export function silenceCheckIn(name: string): string {
  const variants = [
    `Still here with you, ${name}. No rush at all, take your time.`,
    `I'm right here, ${name}. Is everything okay, or would a hint help?`,
    `Take all the time you need, ${name}. I'm not going anywhere.`,
  ]
  return variants[Math.floor(Math.random() * variants.length)]
}

/** Second escalation: a concrete, specific hint drawn from the person's own memories, never generic. */
export function silenceHint(name: string, memories: MemoryItem[]): string {
  const memory = memories.find((m) => m.story.trim())
  if (memory) return `${name}, would this help? ${memory.name} — ${memory.story}`
  return `${name}, would you like to take a gentle break, or ask your caregiver to add a memory we can look at together?`
}
