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

Open the **Network** URL printed by Vite on the phone (for example, `http://192.168.1.25:5173`). Both devices must be on the same Wi-Fi, and the computer firewall must allow the development server. The API accepts HTTP requests from private-network addresses on Vite's development port, so the changing phone URL does not need to be added to `CORS_ORIGINS`. The address can change when the computer reconnects; use the current Network URL. Restart `npm run server` after changing `.env`.

## Useful commands

```powershell
npm run typecheck
npm test
npm run build
npm run preview
npm run server
```

`npm run preview` serves the production build on the computer; use the Vite development server with `--host 0.0.0.0` for phone testing on the local network.
