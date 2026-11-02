# Anchor

Anchor is a phone-friendly memory and activity web app for older adults. It combines caregiver-added familiar memories, gentle games, the Mo assistant, and a reflective Memory Aquarium. It is a supportive tool, not a medical diagnostic product.

## App flow

1. Open Anchor in a browser and sign in or create an account. If the backend is unavailable, the sign-in screen can offer access to data already saved on that device.
2. Add or update the person’s details and memories. Entries can include names, relationships, stories, places, activities, events, photos, and voice recordings.
3. Choose an activity. Personal memories and preferences can supply familiar prompts and objects; the activities provide hints, retries, and support to take a break.
4. Open Mo for conversational help, a clue, a simpler prompt, or a pause. Mo can use the current screen and saved context to tailor its reply.
5. Visit the Memory Aquarium to revisit a saved story and optionally listen to water ambience. Profile settings control text size, voice, privacy, theme, and personalization.

## Support during activities

- **Adaptive difficulty:** Anchor tracks repeated rapid taps together with gameplay difficulty, such as incorrect or slow responses. When sustained struggle is detected, it can lower the difficulty for a later question or round; one tap or mistake alone does not trigger a frustration response.
- **Optional help:** When repeated gameplay struggle is detected, the activity can offer support such as a hint, an easier version, or a break. Choosing help can ask Mo for a game-specific clue or simpler prompt. Advanced activities offer a hint.
- **Inactivity check-ins:** After 20 seconds without interaction, Mo’s toolbar gives a gentle check-in. If there is still no activity after 40 seconds, Mo opens with a prompt grounded in the current screen. Touch, pointer, keyboard, and scroll activity reset the timers. Silence is treated as inactivity, not labeled as confusion.

## Personalization and self-check

- **Personalized games:** Profile settings let you choose a visual theme and favorite colors. Saved memories, interests, and favorite items can also supply familiar objects for game prompts.
- **MoCA-style self-check:** Profile includes a short, optional cognitive self-check inspired by common screening tasks. It provides a score and suggested starting support level; it is not a medical diagnosis.

## Design and technology decisions

- **React and TypeScript** provide a component-based interface and typed activity, memory, and API models.
- **Vite** serves the browser app, builds production assets, and proxies `/api` requests during local development.
- **Node.js** hosts the API and Mo endpoint. The Groq key stays on the server in `.env`; it is never built into browser assets.
- **SQLite** stores accounts and application data in the local backend. Database migrations and repository modules keep persistence separate from request handling.
- **Zustand and browser storage** keep app preferences and cached records available between browser visits. IndexedDB stores photo/audio blobs separately from small metadata records.
- **Large touch targets, readable text, simple instructions, multiple themes, and low-pressure feedback** prioritize phone use and accessibility.
- **Mo and browser speech features are optional.** Voice input depends on browser speech recognition support and microphone permission. Mo requires the backend and a configured Groq API key.
- **The phone preview is a browser session over the local network.** Keep the computer, backend, and Vite server running, and connect the phone to the same Wi-Fi.

## Setup

### Requirements

- Node.js 20.17 or later and npm.
- A Groq API key if you want Mo’s server-backed responses.
- Phone preview: phone and development computer connected to the same Wi-Fi network.

### Install and configure

In PowerShell, clone the submission branch and install packages:

```powershell
git clone --branch final-submission --single-branch https://github.com/nehalabbott/anchor-memory.git
Set-Location anchor-memory
npm ci
Copy-Item .env.example .env
```

Open `.env` and set `GROQ_API_KEY` to your own key. Keep it in this server-side file; do not put it in frontend variables or source code. The backend creates its SQLite database under `data/` when it starts.

### Run on the computer

Open two PowerShell terminals in the project directory. Keep both running:

```powershell
# Terminal 1: API, database, and Mo
npm run server
```

```powershell
# Terminal 2: browser app
npm run dev
```

Open `http://localhost:5173` on the computer.

### Run on a phone browser

Use the same backend command in Terminal 1. Start Vite with a network-accessible host in Terminal 2:

```powershell
npm run dev -- --host 0.0.0.0
```

Open the **Network** URL printed by Vite on the phone (for example, `http://192.168.1.25:5173`). Both devices must be on the same Wi-Fi, and the computer firewall must allow the development server. The address can change when the computer reconnects; use the current Network URL. Restart `npm run server` after changing `.env`.

## Useful commands

```powershell
npm run typecheck
npm test
npm run build
npm run preview
npm run server
```

`npm run preview` serves the production build on the computer; use the Vite development server with `--host 0.0.0.0` for phone testing on the local network.

## Project map

- `src/main.tsx` and `src/App.tsx` — browser entry point, authentication gate, and routes.
- `src/pages/` and `src/components/` — user-facing screens and shared interface.
- `src/games/` and `src/garden/` — activities, game content, aquarium simulation, and ambience.
- `src/assistant/` — Mo responses, voice support, and supportive prompts.
- `src/lib/` and `src/store/` — API client, data persistence/sync, domain types, and app state.
- `server/index.js` and `server/api.js` — Node server startup and HTTP endpoints.
- `server/db/` and `server/repositories/` — SQLite schema migrations and data access.
- `public/` — static images and browser assets.
- `.env.example` — server environment-variable template.

## GitHub collaboration and documentation

- **Lead:** Member A
- **Repository:** https://github.com/nehalabbott/anchor-memory
- **Working branch:** `final-submission`
- **Presentation (PPT):**
- **Demo video:**

README documentation covers the project overview, architecture and design decisions, setup, execution, phone-browser preview, and useful validation commands.
