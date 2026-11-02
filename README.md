# Anchor
**Personalised memory games and a gentle AI assistant for older adults with early-stage dementia.**

Anchor is a senior-friendly application designed to support memory recall, confidence, and calm engagement through personalised activities. Caregivers can add memories, names, routines, and stories, which are used to create familiar memory games. A voice-enabled assistant named **Mo** provides prompts, simpler hints, and supportive breaks when users need help.

The application uses a high-contrast, low-pressure interface with large touch targets and simple language. It is intended as a supportive memory tool, not a diagnostic or medical assessment tool.

## Problem Statement

Older adults with early-stage dementia may experience difficulties recalling familiar people, events, and routines. Generic cognitive games may lack personal relevance, while complex interfaces and score-based feedback can create frustration. Anchor aims to make memory activities more familiar, accessible, and emotionally supportive through personalisation and gentle assistance.

## Objectives

- Provide personalised memory games using caregiver-provided memories and meaningful details.
- Support memory recall through familiar people, routines, stories, and visual cues.
- Offer voice-enabled assistance with hints, simpler instructions, and breaks.
- Create a calm, accessible experience without score-based pressure.
- Explore adaptive responses to signs of frustration during activities.
- Encourage engagement through a reflective Memory Aquarium.

## Current Features

### 1. Memories and Personalisation

- Caregiver-managed memory profiles containing names, relationships, stories, and important details.
- Personalised prompts and clues based on saved memories.
- Retry options and easier hints to support users who need additional help.

### 2. Memory Games

The application includes seven activities:

- Familiar Faces
- Pattern & Shape Match
- Sequence Memory
- Odd One Out
- Dual N-Back
- Trail Making
- Category Association

Games include feedback, retry options, and navigation designed to help users leave an activity without feeling stuck.

### 3. Memory Aquarium

Memory Aquarium is a calm reflection space that responds to recent activity and mood. It is designed to encourage reflection without displaying numeric scores or judgmental feedback. Optional generated water ambience starts only when enabled by the user, and includes a volume control.

### 4. Voice-Enabled Assistant — Mo

- Voice input and spoken responses using the browser Web Speech API.
- Quick actions for hints, easier versions, and breaks.
- Context-aware guidance using the current screen, recent conversation, and memory summaries.
- Supportive responses that avoid diagnosis and encourage contacting trusted caregivers or clinicians when appropriate.

### 5. Use on a phone

Anchor runs in a phone browser over the same Wi-Fi network as the computer running the app. No phone app installation or Android build tools are needed. Keep the frontend and backend terminals running while using Anchor.

## Technologies Used

- **Frontend:** React, TypeScript
- **Development tools:** Node.js, npm
- **AI assistant:** Groq API through a local proxy server
- **Voice interaction:** Browser Web Speech API
- **Backend:** Local Node.js server
- **Database:** SQLite
- **Testing:** npm test, TypeScript type checking
- **Version control:** Git and GitHub

## Application Structure

- `src/` — React and TypeScript frontend
- `server/` — Local server logic
- `server/db/` — Database logic and migrations
- `server/repositories/` — Data repositories
- `public/` — Static assets
- `data/` — Local development data

## Setup and Installation

**Prerequisites:** Node.js 20.17 or later and npm.

1. Clone the repository and switch to the development branch:

   ```bash
   git clone https://github.com/nehalabbott/anchor-memory.git
   cd anchor-memory
   git checkout update-codebase
   ```

2. Install dependencies and configure the environment:

   ```bash
   npm install
   cp .env.example .env
   ```

3. Add your `GROQ_API_KEY` to `.env`.

4. Start the application in separate terminals:

   ```bash
   npm run server
   ```

   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

The frontend communicates with the local proxy server for AI assistant functionality.

### Use Anchor in a phone browser (Windows PowerShell)

From the project directory, start the backend and Vite preview in two separate PowerShell terminals:

```powershell
# Terminal 1: backend API and Mo
npm run server
```

```powershell
# Terminal 2: frontend, reachable by devices on the local network
npm run dev -- --host 0.0.0.0
```

Open the **Network** URL printed by Vite on the phone, for example `http://192.168.1.25:5173`. The phone and computer must be on the same Wi-Fi network. If Mo does not respond after changing `.env`, stop and restart the backend terminal so it reloads `GROQ_API_KEY`. Keep both terminals running while using Anchor.

On-device storage is available in the phone browser. Sign-in, server sync, and Mo require the backend; voice features depend on browser speech support and microphone permission. Keep `GROQ_API_KEY` only in the Node server's `.env`, never in frontend code.

## Useful Commands

```bash
npm test
npm run typecheck
npm run build
npm run preview
npm run server
```

## Team Members

-Nehal Abbott
-Sonu 
