import type { AssistantContext, MemoryItem } from '@/lib/types'

/**
 * The assistant "brain" is an interface so the UI never cares where answers come from.
 *   Part 1 (now):  RuleBasedBrain  - works offline, no API key, safe defaults.
 *   Part 3:        RemoteBrain     - POST /api/assistant (Whisper + LLM, see server/index.js)
 */
export interface AssistantBrain {
  reply(input: string, ctx: AssistantContext, memories: MemoryItem[]): Promise<string>
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

const SAFETY_NOTE = 'I offer gentle wellbeing guidance, not medical advice.'

export class RuleBasedBrain implements AssistantBrain {
  async reply(input: string, ctx: AssistantContext, memories: MemoryItem[]): Promise<string> {
    const t = input.toLowerCase().trim()
    const name = ctx.userName

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

    // 3. Navigation / feature help
    if (/game|play|practice|exercise/.test(t)) return `Let's play something gentle. Tap "Games" at the bottom, and pick whichever feels right today.`
    if (/photo|memor|family|picture/.test(t)) return `Your memories are kept safe in "Your Memories". We will use them in games so they feel personal to you.`
    if (/garden|flower/.test(t)) return `Your Memory Garden grows a little each time you enjoy an activity. There is no way to do it wrong.`
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

/** Part 3 hook: swap RuleBasedBrain for this once the server has a Whisper + LLM key. */
export class RemoteBrain implements AssistantBrain {
  constructor(private fallback: AssistantBrain = new RuleBasedBrain()) {}
  async reply(input: string, ctx: AssistantContext, memories: MemoryItem[]): Promise<string> {
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, ctx, memories }),
      })
      if (!res.ok) throw new Error(String(res.status))
      const data = (await res.json()) as { reply: string }
      return data.reply
    } catch {
      return this.fallback.reply(input, ctx, memories) // always degrade gracefully
    }
  }
}

// Part 1 uses the offline brain. Change this single line in Part 3.
export const brain: AssistantBrain = new RuleBasedBrain()
