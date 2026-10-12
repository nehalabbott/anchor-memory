# Anchor

> Personalised memory games and a gentle AI assistant for people with early-stage dementia.

A senior-friendly web app that turns a person's own memories into gentle cognitive games. A caregiver adds photos, names and stories; the app builds activities from them; and a voice-enabled assistant (Mo) offers hints, easier questions or a calming break when it notices the person struggling. Built as an HCI course project by Nehal Abbott & Sonu, following high-contrast, low-pressure, non-scored design principles. The visual language follows the Lab 5 wireframes.

**Status: work in progress. Part 2 of 3 (personalised games + a living Memory Garden) complete.**

> Anchor gives behavioural estimates to guide the assistant, never a diagnosis. It is not a medical device.

## Run it

Run these from the folder that contains `package.json` and `src/`.

Requires **Node 20.17+** to run the local SQLite-backed server (tested on Node 24).

```bash
npm install
Copy-Item .env.example .env
# Set GROQ_API_KEY in .env, then run these in separate terminals:
npm run server       # local Groq proxy on :8787
npm run dev          # http://localhost:5173
```

Open it on a phone-sized window (or DevTools device mode). On desktop it renders as a centred phone column.

## Local application database

The Node server initializes a local SQLite database at `data/anchor.sqlite` and applies versioned migrations before it listens. The `data/` directory is ignored by Git because it can contain personal information. Set `ANCHOR_DATABASE_PATH` to use a different local database file.

The server owns durable APIs for the supported person, structured preferences, memory metadata, sessions, interaction events, and generic consented assessments. On startup, the app checks the server once; if a prior `anchor-v1` local store exists, it imports missing stable memory IDs without overwriting an existing server person. Zustand remains the UI/cache and offline fallback layer. Normal person and memory changes are server-first; unavailable-backend creates/edits are marked pending and retried when connectivity returns. Deletes only leave the cache after server confirmation. The import marker and pending identifiers persist locally; no localStorage or IndexedDB data is automatically deleted.

Starting an activity creates a backend session asynchronously. Existing typed activity events are buffered locally, sent in batches, and retried with stable event IDs. Ambient voice/acoustic data is not included. Photo/audio bytes remain in IndexedDB; SQLite stores media references only. `syncLocalDataToBackend` remains available as an explicit resumable migration helper and does not claim success if a request fails.

The current assessment API stores a generic instrument identifier and result; it is not an official MoCA implementation. The local server is intended for localhost use and does not provide accounts or authentication.

Other commands:

```bash
npm test             # assistant, games, backend/database, and UI tests
npm run typecheck
npm run build && npm run preview
npm run server       # Groq API proxy on :8787
```

## What's built so far

| Area | Files |
|---|---|
| App shell (content, persistent assistant toolbar, bottom nav) | `src/components/Layout.tsx`, `BottomNav.tsx` |
| **Assistant toolbar** (purple "Talk to Assistant" pill on every screen; pulses on its own after a quiet stretch) | `src/components/AssistantBar.tsx` |
| **Assistant panel** (chat, voice in, spoken replies, Clue / Easier / Break quick actions, safety notice) | `src/components/AssistantPanel.tsx` |
| **Proactive check-ins**: if the person goes quiet anywhere in the app, Mo first pulses the toolbar, then opens on its own with a concrete hint drawn from their memories | `src/assistant/useInactivityNudge.ts` |
| Pluggable assistant brain — sends recent conversation, current screen, and bounded memory context to Groq; handles personal details gently and avoids medical diagnosis | `src/assistant/brain.ts`, `server/index.js` |
| Voice input + text-to-speech (Web Speech API) | `src/assistant/speech.ts` |
| Caregiver memory profile (name, relationship, story, personal details) | `src/pages/Memories.tsx`, `src/store/useApp.ts` |
| Four games: Familiar Faces, Memory Match, Story Recall, Memory Sequence — non-scored, forgiving | `src/pages/Activity.tsx`, `src/games/*` |
| **Living Memory Garden**: a koi pond that swims calmly after right answers and darts faster and more erratically after wrong ones, the way startled fish actually move, plus the existing flower/rain garden that reflects how a session felt overall | `src/components/PondScene.tsx`, `src/games/pondMood.ts`, `src/games/pondSim.ts`, `src/pages/Garden.tsx` |
| State store (persisted to localStorage) | `src/store/useApp.ts` |
| Design tokens (mint/teal palette, 56px+ tap targets, AAA-contrast text) | `tailwind.config.js`, `src/styles/index.css` |
| Local Groq API proxy; keeps the API key server-side | `server/index.js` |

## How the pond works

Each right or wrong answer is logged with the game (`src/pages/Activity.tsx`). `pondMoodFromEvents` (`src/games/pondMood.ts`) turns the last few answers into a mood from -1 (recent mistakes) to +1 (recent successes), weighting the most recent answers more heavily so an old rough patch fades rather than lingering. `pondSim.ts` runs a small physics simulation — each fish steers gradually toward a wandering target rather than snapping between points — and mood scales the fish's speed and turning noise: calm and slow when things are going well, faster and more erratic when they aren't. It's purely a feel-good visual cue, never shown as a number or score, and it respects `prefers-reduced-motion`.

## Notes

- **Voice input** uses the browser's Web Speech API: works in Chrome/Edge/Safari, not Firefox. Typing always works as a fallback. It needs `localhost` or HTTPS and microphone permission.
- Mo can answer general questions and uses caregiver-entered details and memories for personal questions. It never invents personal facts, diagnoses, or gives medical instructions; health concerns should go to a trusted caregiver or clinician.
- The app stores profile, memories, and chat in browser localStorage. Chat context and a bounded text-only memory summary are sent to Groq through the local server when asking Mo. Keep `.env` private; it is ignored by Git and the API key is never sent to the browser.
- If the API key is missing or Groq is unavailable, Mo says that it cannot connect rather than silently switching to canned answers.
- The assistant **logs interaction signals** (`help_request`, `speech_cue`, `response_submitted` with correctness) into the store. Part 3 consumes these for frustration/confusion estimation.

## Roadmap

**Part 3 — Adaptive loop**
Frustration/confusion state estimation (the five states from the Lab 4 report), Whisper transcription, adaptive responses (simplify, calming activity, break), biweekly assessment, and privacy/consent.

## GitHub repo settings

**About:** Personalised memory games and a gentle AI assistant for people with early-stage dementia.

**Topics:** `dementia` `cognitive-training` `accessibility` `hci` `react` `typescript` `assistive-technology` `speech-recognition` `serious-games` `elderly-care`
