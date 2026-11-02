# Why Anchor for Our HCI Project?

Anchor is a useful human-computer interaction (HCI) project because it explores how an interface can make digital activities feel understandable, familiar, and supportive for older adults, including people experiencing memory or cognitive changes.

## The interaction problem

Many digital games rely on unfamiliar content, small controls, time pressure, or feedback that can feel discouraging. For someone who finds memory or attention challenging, these design choices may make an activity harder to approach. Caregivers also need a practical way to bring personal context into digital experiences.

Anchor responds to this interaction problem by centering the experience on the person: familiar memories and interests inform activities, and Mo offers optional assistance without framing difficulty as failure.

## HCI ideas explored in Anchor

- **User-centered and accessible interaction:** Phone-friendly layouts, large touch targets, readable text, simple instructions, multiple themes, and low-pressure feedback aim to reduce interaction barriers.
- **Personalization and familiarity:** Caregiver-added memories, preferred colors, themes, interests, and favorite items can shape game prompts and objects, making interactions more personally meaningful.
- **Feedback and adaptation:** Games provide hints and retries, track sustained interaction difficulty, and can adjust difficulty. A single tap or mistake is not treated as evidence of frustration.
- **User control:** Support is optional. Players can ask Mo for a clue, choose an easier version, take a break, or dismiss an offer. Voice features are optional, and privacy controls are provided.
- **Gentle timing and interruption:** After a period without interaction, Mo first offers a quiet check-in, then may open with a screen-aware prompt. Interaction resets these timers, and silence is treated as inactivity rather than assumed confusion.
- **Transparent boundaries:** The optional MoCA-style self-check is presented as support-oriented and not as a medical diagnosis.

## Nielsen's 10 usability heuristics in Anchor

These are examples of how the prototype applies Nielsen's heuristics; they are design intentions and implemented patterns, not proof of formal usability validation.

| Heuristic | Where Anchor applies it |
|---|---|
| **1. Visibility of system status** | Game answers receive immediate correct/incorrect feedback and next-step actions. Mo shows when it is thinking, voice controls show microphone status, and the app reports when data is offline or could not sync. |
| **2. Match between the system and the real world** | The interface uses familiar language and activities, such as “Take a short break” and “Familiar Faces.” Caregiver-added people, stories, photos, and interests can shape activity prompts around the person's life. |
| **3. User control and freedom** | Players can pause or leave an activity, decline Mo's offer, ask for a different level of help, or close the assistant. Voice listening and spoken replies are optional, and the Privacy Shield lets users turn off microphone use. |
| **4. Consistency and standards** | Main destinations stay in a shared bottom navigation. Pages use clear titles, and games reuse shared instruction and answer-feedback patterns so common controls and messages behave consistently. |
| **5. Error prevention** | Removing a memory requires a separate confirmation, with a “Keep” option. Required fields and file-size checks catch common input problems, and the self-check cannot start until the user gives consent. |
| **6. Recognition rather than recall** | Activities show instructions, examples, and visual prompts instead of requiring users to remember rules. Saved memory details and photos provide recognizable cues, while Mo offers visible quick actions such as a clue or an easier question. |
| **7. Flexibility and efficiency of use** | Users can adjust text size, theme, favorite colors, and personal interests. They can hear game instructions, use optional voice features, or request hints, an easier round, or a break. |
| **8. Aesthetic and minimalist design** | The phone-sized layout presents a small set of primary destinations and uses short activity instructions. Memory entry is staged: users choose a memory type first and then see the relevant detail fields. |
| **9. Help users recognize, diagnose, and recover from errors** | Game feedback explains whether an answer was correct and offers a retry when appropriate. Save and sync failures explain what happened and whether the existing on-device copy remains unchanged, with a prompt to try again where applicable. |
| **10. Help and documentation** | Each activity has a “How to play” explanation, a worked example where useful, and an option to hear instructions aloud. Mo provides in-context suggestions and quick help actions; the self-check also explains its non-diagnostic purpose. |

## Why this matters

The project lets us examine how interface choices affect comfort, confidence, and a person's ability to continue or stop an activity. It also highlights the importance of designing proactive assistance carefully: an interface should offer help at a useful moment while preserving the user's control and avoiding assumptions about what silence or an incorrect answer means.

Anchor is a prototype and does not establish clinical effectiveness. Its HCI value is in implementing and evaluating interaction patterns—personalization, accessible presentation, adaptive support, and user control—in a concrete, testable application.
