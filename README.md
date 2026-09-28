# Anchor

> Personalised memory games and a gentle AI assistant for people with early-stage dementia.

A senior-friendly web app that turns a person's own memories into gentle cognitive games. A caregiver adds photos, names and stories; the app builds activities from them; and a voice-enabled assistant (Mo) offers hints, easier questions or a calming break when it notices the person struggling. Built as an HCI course project by Nehal Abbott & Sonu, following high-contrast, low-pressure, non-scored design principles. The visual language follows the Lab 5 wireframes.

**Status: work in progress. Part 1 of 3 (framework + assistant toolbar).**

> Anchor gives behavioural estimates to guide the assistant, never a diagnosis. It is not a medical device.

## Run it

Run these from the folder that contains `package.json` and `src/`.

Requires **Node 18+** (tested on Node 22).

```bash
npm install
npm run dev          # http://localhost:5173
```

Open it on a phone-sized window (or DevTools device mode). On desktop it renders as a centred phone column.

Other commands:

```bash
npm test             # 8 tests: assistant logic + shell + toolbar behaviour
npm run typecheck
npm run build && npm run preview
npm run server       # optional: Part 3 API stub on :8787 (not needed yet)
```

## What Part 1 contains

| Area | Files |
|---|---|
| App shell (content, persistent assistant toolbar, bottom nav) | `src/components/Layout.tsx`, `BottomNav.tsx` |
| **Assistant toolbar** (purple "Talk to Assistant" pill on every screen) | `src/components/AssistantBar.tsx` |
| **Assistant panel** (chat, voice in, spoken replies, Clue / Easier / Break quick actions, safety notice) | `src/components/AssistantPanel.tsx` |
| Pluggable assistant brain (offline rules now; remote LLM in Part 3) | `src/assistant/brain.ts` |
| Voice input + text-to-speech (Web Speech API) | `src/assistant/speech.ts` |
| State store (persisted to localStorage) | `src/store/useApp.ts` |
| Screens: Home, Games hub, Garden, Profile (+ comfort settings) | `src/pages/*` |
| Design tokens (mint/teal palette, 56px+ tap targets, AAA-contrast text) | `tailwind.config.js`, `src/styles/index.css` |
| Part 3 API stub | `server/index.js` |

Screens that arrive later (`/games/:game`, `/memories`) show a friendly "Growing in Part N" card, so no link is a dead end.

## Notes

- **Voice input** uses the browser's Web Speech API: works in Chrome/Edge/Safari, not Firefox. Typing always works as a fallback. It needs `localhost` or HTTPS and microphone permission.
- The assistant gives **wellbeing guidance only** and declines medical questions (per the Lab 4 ethics section). State estimates are behavioural, never diagnostic.
- Data lives in your browser's localStorage. Clear it via DevTools to reset. No backend or API key is needed for Part 1.
- The assistant already **logs interaction signals** (`help_request`, `speech_cue`) into the store. Part 3 consumes them.

## Roadmap

**Part 2 — Personalised content and games**
Caregiver memory profile (upload photo, name, relationship, story, voice), the four games (Familiar Faces, Memory Match with the alternating trail, Story Recall, Memory Sequence), non-scored "calm" results, Memory Garden growth.

**Part 3 — Adaptive loop**
Interaction logging, frustration/confusion state estimation (the five states from the Lab 4 report), Whisper transcription and LLM replies via `server/`, adaptive responses (simplify, calming activity, break), biweekly assessment, and privacy/consent. Switch `brain` to `RemoteBrain` in `src/assistant/brain.ts`.

## GitHub repo settings

**About:** Personalised memory games and a gentle AI assistant for people with early-stage dementia.

**Topics:** `dementia` `cognitive-training` `accessibility` `hci` `react` `typescript` `assistive-technology` `speech-recognition` `serious-games` `elderly-care`
