# Anchor

## Project introduction

### Every memory has a story. Give it a place to stay.

Memories are more than facts to remember, they are people, places, conversations, and little moments that make up who we are. Yet, for individuals experiencing memory difficulties, holding on to these connections can become increasingly challenging.

**Anchor** is a personalized memory companion designed to make remembering more familiar, engaging, and comforting. It brings together personal memory management, interactive cognitive activities, and conversational assistance in one space.

Users can preserve meaningful memories, revisit familiar stories, and engage with cognitive games built around recognition, patterns, and recall. At the heart of the experience is **Mo**, a context-aware conversational companion that offers gentle guidance, optional hints, simplified questions, and breaks when activities become challenging.

The experience extends beyond games through **Memory Aquarium** — a calming interactive environment where users can pause, unwind, and reconnect with their saved memories.

Rather than treating memory support as a series of isolated exercises, Anchor brings together personal context, cognitive engagement, and supportive interaction to create an experience that feels familiar and personal.

**Anchor is not a medical or diagnostic tool. It is a space for preserving meaningful connections and making everyday interactions with memories more approachable.**

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

Anchor uses a full-stack architecture combining web technologies, persistent storage, AI integration and browser-native capabilities.

### Frontend
- **React** – Component-based UI development.
- **TypeScript** – Type safety and maintainable application logic.
- **CSS** – Responsive layouts and interface styling.

### Backend
- **Node.js** – Server-side JavaScript runtime.
- **Express.js** – REST API development and request handling.

### Database & Storage
- **SQLite** – Persistent storage for structured application data.
- **IndexedDB** – Browser-side storage for locally persisted data.

### AI Integration
- **Groq API** – LLM-powered conversational assistance and contextual interactions through Mo.

### Browser APIs & Integrations
- **Web Speech API** – Browser-based speech recognition and synthesis, where supported.
- **Browser Audio APIs** – Audio playback and interaction within the application.

### Development Tools
- **Git & GitHub** – Version control and source code management.
- **npm** – Dependency management and project scripts.
- **Vite** – Frontend development and build tooling.

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

- **Repository:** https://github.com/nehalabbott/anchor-memory
- **Presentation (PPT):**
- **Demo video:**
