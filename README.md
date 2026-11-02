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

## Human-computer interaction

Anchor explores accessible, personalized, and adaptive interaction while keeping assistance optional and preserving user control. See [Why this for our HCI project?](./WHY-THIS-FOR-OUR-HCI-PROJECT.md) for the project rationale.

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

## Support during activities

- **Adaptive difficulty:** Anchor tracks repeated rapid taps together with gameplay difficulty, such as incorrect or slow responses. When sustained struggle is detected, it can lower the difficulty for a later question or round; one tap or mistake alone does not trigger a frustration response.
- **Optional help:** When repeated gameplay struggle is detected, the activity can offer support such as a hint, an easier version, or a break. Choosing help can ask Mo for a game-specific clue or simpler prompt. Advanced activities offer a hint.
  <img width="736" height="930" alt="image" src="https://github.com/user-attachments/assets/d95d3b95-3ef9-48ab-91f9-035280a23cbb" />

- **Inactivity check-ins:** After 20 seconds without interaction, Mo’s toolbar gives a gentle check-in. If there is still no activity after 40 seconds, Mo opens with a prompt grounded in the current screen. Touch, pointer, keyboard, and scroll activity reset the timers. Silence is treated as inactivity, not labeled as confusion.
<img width="1066" height="955" alt="image" src="https://github.com/user-attachments/assets/9b1680e1-c873-496d-bcf2-20a3566a1df0" />

<img width="1054" height="1696" alt="mermaid-diagram" src="https://github.com/user-attachments/assets/2fa5db80-bd8c-47dc-879f-d8033f49a4a9" />

## Personalization and self-check

- **Personalized games:** Profile settings let you choose a visual theme and favorite colors. Saved memories, interests, and favorite items can also supply familiar objects for game prompts.
 <img width="726" height="930" alt="image" src="https://github.com/user-attachments/assets/94cf172c-fdf2-4e34-9c4b-5c8d101fc3f1" />

- **MoCA-style self-check:** Profile includes a short, optional cognitive self-check inspired by common screening tasks. It provides a score and suggested starting support level; it is not a medical diagnosis.

## Technologies used

- **React and TypeScript** — component-based interface and typed activity, memory, and API models.
- **Vite and Tailwind CSS** — frontend development server, production bundling, API proxy, and styling.
- **Node.js** — API and Mo endpoint. The Groq key stays on the server in `.env`; it is never built into browser assets.
- **SQLite** — local backend persistence, with migrations and repository modules separating storage from request handling.
- **Zustand, browser storage, and IndexedDB** — app state and preferences, cached records, and photo/audio blobs.
- **Groq API and browser speech features** — optional server-backed Mo responses and optional voice input. Voice input depends on browser support and microphone permission; Mo requires the backend and a configured Groq API key.
- **Accessibility and design** — large touch targets, readable text, simple instructions, multiple themes, and low-pressure feedback prioritize phone use.
- **Phone preview** — a browser session over the local network. Keep the computer, backend, and Vite server running, and connect the phone to the same Wi-Fi.

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
