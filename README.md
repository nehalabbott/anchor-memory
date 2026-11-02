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

### 5. Android

The existing React/Vite app is packaged with Capacitor; the web application and routes remain available. Android builds use `com.anchor.memory`.

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

### Restart the app for phone browser preview (Windows PowerShell)

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

## Android build and run (Windows PowerShell)

Install Android Studio and its Android SDK (including platform tools, Android platform 35, and Android build tools), plus JDK 17 or newer (JDK 21 is recommended). A physical phone needs Developer options and USB debugging enabled, or create an Android Studio emulator. The existing `android/` project is already configured; do not add the Android platform again.

From the project directory:

```powershell
npm ci
npm run typecheck
npm run android:sync
Set-Location android
.\gradlew.bat assembleDebug
```

`npm run android:sync` builds the web app and copies it into the existing Android project. `npm run android:add` is only for adding the platform to a project that does not already have an `android/` directory. To build, install, and launch on a connected device/emulator, run `npm run android:run`.

The debug APK is written to `android\app\build\outputs\apk\debug\app-debug.apk`. Transfer it to the phone over USB (file transfer) or another trusted file-sharing method, open the APK on the phone, allow that file manager/browser to install unknown apps if Android requests it, and confirm **Install**. Release signing and Play Store packaging require separate Android signing configuration and are not set up here.

### Backend access from Android

Web development keeps using relative `/api` requests through the Vite proxy. For Android, set `VITE_API_BASE_URL` before building the web assets, for example in `.env.local`:

```text
VITE_API_BASE_URL=https://your-reachable-api.example
```

Use the real HTTPS backend address, not `localhost` or a permanently hard-coded laptop/LAN address. Build and sync again after changing it. The API server defaults to loopback; for development on a trusted network, set `HOST=0.0.0.0` and `PORT=8787` in the backend environment, allow the port through the computer firewall, and configure `CORS_ORIGINS` with the exact app origin (`https://localhost` for the default Android scheme). Local Vite origins on port 5173 are allowed by default. Do not expose this development server to the public internet.

Android-to-HTTP local testing is opt-in. Before building/syncing, set `CAPACITOR_ANDROID_SCHEME=http`, `CAPACITOR_ALLOW_CLEARTEXT=true`, and `VITE_API_BASE_URL` to an explicitly reachable device address. This is development-only; return to HTTPS/default settings for normal builds. Android authentication cookies require HTTPS; set `COOKIE_SECURE=true` only when the API is served over HTTPS. Keep `GROQ_API_KEY` only in the Node server's `.env`, never in a `VITE_` variable or frontend source.

If the backend cannot be reached at startup, the sign-in screen offers **Continue with on-device data**. This opens the locally saved memories and games without signing in; account access, server sync, and Mo remain unavailable until the backend is reachable. The app shows an offline sync status and keeps local data on the device.

### Android and voice limitations

Capacitor packages the existing browser API features; speech recognition and speech synthesis availability depends on the Android System WebView and installed speech services. Users must grant microphone permission through an explicit voice action; if permission is denied or speech APIs are unavailable, Anchor can still be used without voice. Test photo/audio playback and IndexedDB persistence on the target device. Android Studio, a JDK, the SDK, a device/emulator, network/firewall access, and any HTTPS backend certificate/hosting must be provided by the build/deployment environment.

## Useful Commands

```bash
npm test
npm run typecheck
npm run build
npm run preview
npm run server
```

`npm run android:add`, `npm run android:sync`, `npm run android:open`, and `npm run android:run` provide the corresponding Capacitor workflows.

## Team Members

-Nehal Abbott
-Sonu 
