# Why Anchor for Our HCI Project?

Anchor is a useful human-computer interaction (HCI) project because it explores how an interface can make digital activities feel understandable, familiar, and supportive for older adults, including people experiencing memory or cognitive changes.

## The interaction problem

Many digital games rely on unfamiliar content, small controls, time pressure, or feedback that can feel discouraging. For someone who finds memory or attention challenging, these design choices may make an activity harder to approach. Caregivers also need a practical way to bring personal context into digital experiences.

Anchor responds to this interaction problem by centering the experience on the person: familiar memories and interests inform activities, and Mo offers optional assistance without framing difficulty as failure.

## HCI ideas explored in Anchor

- **Accessible, familiar interaction:** Large controls, readable text, short instructions, and multiple themes support phone use. Saved memories, interests, and preferences can supply familiar prompts and objects.
- **Feedback with user control:** Games give answer feedback and retries. Help remains optional: users can ask Mo for a clue, choose an easier version, take a break, or dismiss a support offer.
- **Privacy and transparent limits:** Voice input is off by default, and the Privacy Shield disables microphone listening. The optional MoCA-style self-check is an unvalidated activity inspired by screening tasks, not a validated clinical assessment or diagnosis.

## Support during activities

- **Automatic difficulty adjustment:** The game tracks response accuracy and latency alongside bursts of rapid taps. Sustained errors, slow responses, or corroborated rapid-tap patterns can lower difficulty for a later round; sustained accurate, reasonably paced responses can raise it. A single mistake or tap is not enough. Changes are rate-limited.
- **Optional Mo assistance:** Separately, a support detector can offer a dismissible hint, easier round, or break after a pattern of difficult interactions; optional voice-awareness signals can also inform support. Mo acts only when the user chooses an option. Choosing an easier round also requests a lower game difficulty, while hints and breaks do not automatically change it.

  ![Gameplay screen offering optional hint, easier-round, and break actions](https://github.com/user-attachments/assets/d95d3b95-3ef9-48ab-91f9-035280a23cbb)

  *Optional in-game support choices preserve the player's control.*

- **Inactivity check-ins:** After 20 seconds without activity, Mo’s toolbar displays a “Still there? Tap to talk” check-in. At 40 seconds from the last activity, if Mo is still closed, it opens with a prompt grounded in the current screen. Pointer, keyboard, touch-start, and wheel events reset both timers; changing screens also restarts them. Silence is treated as inactivity, not as evidence of confusion.

  ![Mo's inactivity check-in in the app](https://github.com/user-attachments/assets/9b1680e1-c873-496d-bcf2-20a3566a1df0)

  *The check-in progresses from a toolbar cue to an in-context prompt.*

  ![Anchor interaction-flow diagram](https://github.com/user-attachments/assets/2fa5db80-bd8c-47dc-879f-d8033f49a4a9)

  *Interaction flow for the project’s support experience.*

- **Offline behavior:** The app reports when its server connection is unavailable. Memory and person changes can be kept on the device and retried when connectivity returns; queued activity events retry while the page remains open. This is not a guarantee that every data type has a durable offline queue.

## Personalization and self-check

- Profile settings include theme, text-size, and favorite-color preferences. Memory details and preferences can personalize activity prompts.

  ![Profile settings for personalization](https://github.com/user-attachments/assets/94cf172c-fdf2-4e34-9c4b-5c8d101fc3f1)

  *Profile controls for personalizing the experience.*

- **MoCA-style self-check:** The optional activity uses tasks inspired by common cognitive screening activities and returns a score and suggested starting support level. It is not a validated clinical assessment and cannot diagnose a condition.

## Nielsen's 10 usability heuristics in Anchor

These examples describe implemented patterns, not evidence of formal usability validation.

| Heuristic | Where Anchor applies it |
|---|---|
| **1. Visibility of system status** | Games show answer feedback; Mo shows when it is thinking; voice controls and the app’s offline banner show their current status. |
| **2. Match between the system and the real world** | Familiar names, portraits, personal memories, and plain-language prompts connect activities to users’ lives. |
| **3. User control and freedom** | Players can pause or leave a game, dismiss help, close Mo, and disable microphone listening with Privacy Shield. |
| **4. Consistency and standards** | Shared bottom navigation and reusable game instruction and feedback components keep common interactions consistent. |
| **5. Error prevention** | Memory deletion requires confirmation; the self-check requires consent; media uploads are size-checked. |
| **6. Recognition rather than recall** | Games display instructions, examples, visual choices, and familiar memory cues. |
| **7. Flexibility and efficiency of use** | Users can change text size and theme, hear instructions, or choose optional hints and breaks. |
| **8. Aesthetic and minimalist design** | Short game instructions and staged memory entry reveal relevant fields after the user chooses a memory type. |
| **9. Help users recognize, diagnose, and recover from errors** | Answer feedback offers a retry; save errors explain when existing data is unchanged, and offline status explains device-only saving. |
| **10. Help and documentation** | Each game has “How to play” guidance, examples where useful, and optional read-aloud instructions; Mo offers contextual quick actions. |

## Why this matters

The project makes it possible to examine how personalization, feedback, and optional support affect comfort and users’ control over whether to continue. Its timing and adaptation mechanisms are deliberately based on observable interaction patterns rather than treating silence or one incorrect answer as proof of difficulty.

Anchor is a prototype, not a clinically validated intervention. Its HCI value lies in implementing interaction patterns that can be evaluated with users.
