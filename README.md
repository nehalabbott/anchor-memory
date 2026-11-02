# Anchor

## Project introduction

### Every memory has a story. Give it a place to stay.

Memories are more than facts to remember, they are people, places, conversations, and little moments that make up who we are. Yet, for individuals experiencing memory difficulties, holding on to these connections can become increasingly challenging.
**Anchor** is a personalized memory companion that helps individuals with memory difficulties preserve meaningful connections through memory management and interactive cognitive activities. Guided by Mo, a gentle conversational assistant, users can safely revisit familiar stories, play recall games, or unwind in the calming Memory Aquarium. 
While not a medical tool, Anchor provides a comforting, approachable space to keep cherished memories alive.

## Problem statement

Generic cognitive activities often lack the personal context needed to make them familiar and engaging for individuals experiencing memory or cognitive difficulties. Activities that feel unfamiliar or too challenging can also lead to frustration and disengagement.

Caregivers need accessible ways to incorporate meaningful personal memories into everyday activities while providing appropriate support without taking away user independence.

Anchor addresses these challenges by combining personalized memory-based activities, adaptive assistance, and familiar experiences in a low-pressure, user-controlled environment.

## Objectives

- **Make memory support personal:** Ground everyday cognitive engagement in experiences, relationships and information that are meaningful to each individual.
- **Encourage independent participation:** Create an environment where users can engage at their own pace, make choices and seek assistance when needed.
- **Reduce interaction-related frustration:** Make activities approachable through responsive difficulty adjustments and supportive feedback.
- **Promote familiarity and continuity:** Help users maintain connections with meaningful people, experiences and personal stories.
- **Prioritize accessibility and usability:** Design an intuitive, inclusive interface that accommodates different interaction needs and levels of familiarity with technology.

# How to run
[Check out this document](./setup.md) 

## Team members

Post project contribution: 

- **Nehal** : Documentation & Github
- **Sonu** : PPT & Video

In project contribution:
- **Nehal** : Upload and load memories, AI assistant, Aquarium
- **Sonu** : Personalization (themes, colors, objects), Phone browser preview, memory games

## App Flow

Anchor guides users through a simple journey, from preserving personal memories to engaging with them through familiar activities.

1. **Get Started:** Sign in and access a personalized space.
2. **Build a Memory Collection:** Add meaningful memories, including people, relationships, experiences and familiar details.
3. **Explore Cognitive Activities:** Choose from memory-based games designed around recognition, recall and pattern-based tasks.
4. **Receive Support When Needed:** Mo provides optional hints, simpler prompts or break suggestions when users encounter difficulty.
5. **Revisit and Reflect:** Return to saved memories through familiar stories and the Memory Aquarium.
6. **Continue at Your Own Pace:** Move between activities, revisit memories or take a break whenever desired.

The experience is designed to remain flexible and user-controlled rather than following a rigid sequence.

## Human-computer interaction

Anchor explores accessible, personalized, and adaptive interaction while keeping assistance optional and preserving user control. See [Why this for our HCI project?](./WHY-THIS-FOR-OUR-HCI-PROJECT.md) for the project rationale.

## Technologies used

- **React and TypeScript** — component-based interface and typed activity, memory, and API models.
- **Vite and Tailwind CSS** — frontend development server, production bundling, API proxy, and styling.
- **Node.js** — API and Mo endpoint. The Groq key stays on the server in `.env`; it is never built into browser assets.
- **SQLite** — local backend persistence, with migrations and repository modules separating storage from request handling.
- **Zustand, browser storage, and IndexedDB** — app state and preferences, cached records, and photo/audio blobs.
- **Groq API and browser speech features** — optional server-backed Mo responses and optional voice input. Voice input depends on browser support and microphone permission; Mo requires the backend and a configured Groq API key.
- **Accessibility and design** — large touch targets, readable text, simple instructions, multiple themes, and low-pressure feedback prioritize phone use.
- **Phone preview** — a browser session over the local network. Keep the computer, backend, and Vite server running, and connect the phone to the same Wi-Fi.

## Project structure

```text
.
├── public/                         # Static browser assets
│   ├── demo/                       # Demo profile illustrations
│   └── favicon.svg
├── server/                         # Node API and SQLite backend
│   ├── db/                         # Database setup and migrations
│   │   ├── database.js
│   │   └── migrations.js
│   ├── repositories/               # Data access modules
│   ├── services/                   # Server-side validation
│   ├── api.js                      # API endpoints
│   ├── auth.js                     # Authentication
│   └── index.js                    # Server entry point
├── src/                            # React application
│   ├── assistant/                  # Mo assistant and voice support
│   ├── components/                 # Shared UI components
│   ├── demo/                       # Demo data
│   ├── games/                      # Games and simulation logic
│   │   └── cognitive/              # Cognitive activities
│   ├── garden/                     # Memory Aquarium and ambience
│   ├── hooks/                      # Shared React hooks
│   ├── lib/                        # API, sync, and domain logic
│   │   ├── adaptiveDifficulty/     # Difficulty adjustment
│   │   └── cognitiveAssessment/    # Self-check logic
│   │   ├── apiClient.ts
│   │   ├── appDataService.ts
│   │   ├── localDataSync.ts
│   │   └── types.ts
│   ├── pages/                      # App screens
│   ├── store/                      # App state
│   ├── styles/                     # Global styles
│   ├── App.tsx                     # App routes and composition
│   └── main.tsx                    # Browser entry point
├── .env.example                    # Server environment template
├── index.html                      # Vite HTML entry
├── package.json                    # Scripts and dependencies
├── package-lock.json               # Locked dependency versions
├── setup.md                        # Setup instructions
├── vite.config.ts                  # Vite configuration
├── vitest.config.ts                # Test configuration
└── README.md                       # Project documentation
```

## GitHub collaboration and documentation

- **Repository:** https://github.com/nehalabbott/anchor-memory
- **Presentation (PPT):** 
- **Demo video:**
