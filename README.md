# Anchor
To do: (Tasks left)
1. add sound in memory aquarium
2. add personalization (stuff the person likes in games and all)
3. frustration detection (vocal/visual/screen)


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

Memory Aquarium is a calm reflection space that responds to recent activity and mood. It is designed to encourage reflection without displaying numeric scores or judgmental feedback.

### 4. Voice-Enabled Assistant — Mo

- Voice input and spoken responses using the browser Web Speech API.
- Quick actions for hints, easier versions, and breaks.
- Context-aware guidance using the current screen, recent conversation, and memory summaries.
- Supportive responses that avoid diagnosis and encourage contacting trusted caregivers or clinicians when appropriate.

## Pending Improvements

The following features remain under development:

1. **Memory Aquarium sound:** Add suitable ambient sounds and optional sound controls to improve the reflective experience.
2. **Deeper personalisation:** Adapt games, themes, images, objects, and activities to the user's interests and preferences.
3. **Frustration detection:** Explore vocal, visual, and interaction-based indicators of possible frustration and respond with appropriate hints or breaks.

These features will be implemented and evaluated as part of the ongoing development process.

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

## Useful Commands

```bash
npm test
npm run typecheck
npm run build
npm run preview
npm run server
```

## Data and Privacy

Anchor uses a local SQLite database at `data/anchor.sqlite` for persistent development data. Database migrations run automatically on server startup. Profile, memory, session, and interaction data are managed locally during development.

The AI assistant sends a limited memory summary and recent conversation to the local Groq proxy when required. Users should avoid entering unnecessary sensitive information. The current prototype is intended for local development and testing, not production deployment or secure, account-backed use.

## Team Members

- [Add team member name 1]
- [Add team member name 2]
- [Add team member name 3]
- [Add team member name 4]

*Replace the placeholders with your actual team members and contributions.*

## Future Scope

- Complete ambient audio and sound controls in Memory Aquarium.
- Expand preference-based personalisation across games.
- Evaluate multimodal frustration indicators and appropriate supportive responses.
- Improve accessibility, usability, and consistency across activities.
- Evaluate the prototype with appropriate usability and accessibility methods.

## Disclaimer

Anchor is a research and HCI prototype intended to support memory-related activities and engagement. It does not diagnose, treat, or replace professional medical care.

## Repository

GitHub: https://github.com/nehalabbott/anchor-memory

**GitHub description:** Personalised memory games and a gentle AI assistant for older adults with early-stage dementia.

**Suggested topics:** `dementia` `cognitive-training` `accessibility` `hci` `react` `typescript` `assistive-technology` `speech-recognition` `serious-games` `elderly-care`
