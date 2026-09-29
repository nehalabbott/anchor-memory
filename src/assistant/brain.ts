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
