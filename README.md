# Anchor
To do: (Tasks left)
1. add sound in memory aquarium
2. add personalization (stuff the person likes in games and all)
3. frustration detection (vocal/visual/screen)

> Personalised memory games and a gentle AI assistant for older adults with early-stage dementia.

Anchor is a senior-friendly app designed to support memory recall, confidence, and calm engagement through a small set of personalised activities. A caregiver can add memories, names, routines, and stories; the app turns them into gentle, familiar games. A voice-enabled assistant called Mo responds with prompts, simpler hints, and supportive breaks when the person seems stuck or overwhelmed.

This project uses a high-contrast, low-pressure design with large touch targets, simple language, and no score-based pressure. It is intended as a supportive memory tool, not a diagnosis or medical assessment.

## Current app structure

The app now follows a simple three-part flow:

- Memories: add and review memories, people, routines, and meaningful details
- Games: play seven memory-based activities, from simple recognition tasks to more demanding working-memory exercises
- Memory Aquarium: a calm reflective place that responds to recent activity and mood

The app intentionally keeps older routes for compatibility while redirecting to this modern flow.

## What is included

### Memory capture and personalisation

- Caregiver memory profile with names, relationships, stories, and important details
- Personalised prompts and clues drawn from saved memories
- Gentle, non-judgmental activity flow with retry and easier help options

### Games

The activity library includes both easy and more advanced cognitive games:

- Familiar Faces
- Pattern & Shape Match
- Sequence Memory
- Odd One Out
- Dual N-Back
- Trail Making
- Category Association

The simple games include feedback states, retry paths, and clearer correct/incorrect cues. The last three advanced games include a consistent Back to games action so a user can leave without feeling stuck.

### Memory Aquarium

The garden view has been renamed to Memory Aquarium and is intended as a calm reflection area rather than a decorative garden section. It reflects recent game experience through mood and movement, without presenting a numeric score or judgment.

### Assistant and voice support

- Persistent assistant bar and panel
- Voice input and spoken responses via the browser Web Speech API
- Quick actions such as clue, easier version, and break
- Context-aware guidance using recent conversation, current screen, and memory summaries
- Safety-first responses that avoid diagnosis and redirect to trusted carers or clinicians when needed

## Run locally

Requires Node 20.17+.

```bash
npm install
cp .env.example .env
```

Set `GROQ_API_KEY` in `.env`, then run the app in separate terminals:

```bash
npm run server
npm run dev
```

The app runs in the browser at http://localhost:5173. The local proxy serves the AI assistant on port 8787.

## Local data and backend

The app uses a local SQLite-backed server in the `server/` folder and stores data under `data/`.

Important details:

- `data/anchor.sqlite` is used for local durable storage
- migrations are applied automatically on startup
- structured person, memory, session, and interaction data are persisted locally
- the app keeps activity events and retry logic for backend sync
- local media references are retained while backend data remains designed for local-only use during development

This project is intended for local development and testing, not for production deployment or account-backed secure use.

## Useful commands

```bash
npm test
npm run typecheck
npm run build
npm run preview
npm run server
```

## Project notes

- The app stores profile, memories, and chat in browser state and local storage patterns suitable for development and prototype use.
- The assistant sends a bounded memory summary and recent conversation to the local Groq proxy when needed.
- If Groq is unavailable or the API key is missing, the app handles this gracefully rather than silently pretending it can answer.
- Anchor is a research and prototype app. It is designed to be supportive and accessible, but it is not a medical device or a diagnostic tool.

## Repository summary

This repo contains:

- the React + TypeScript front end in `src/`
- local server logic in `server/`
- SQLite database logic in `server/db/`
- memory and assessment repositories in `server/repositories/`
- tests across assistant, UI, and game flows

## Roadmap

Current work focuses on finishing the memory support loop, refining the assistant experience, and making the game flow feel consistent and calm across all activities. Future work includes more adaptive behaviour, richer assessments, and deeper personalization based on the user’s interaction patterns.

## GitHub metadata

**About:** Personalised memory games and a gentle AI assistant for people with early-stage dementia.

**Topics:** `dementia` `cognitive-training` `accessibility` `hci` `react` `typescript` `assistive-technology` `speech-recognition` `serious-games` `elderly-care`
