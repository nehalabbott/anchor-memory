// Part 3 placeholder server. Zero dependencies (Node 18+).
// Run with:  npm run server   (Vite proxies /api -> :8787)
//
// Part 3 will add:
//   POST /api/transcribe  -> Whisper speech-to-text
//   POST /api/assistant   -> LLM reply grounded in the patient's memory profile
import http from 'node:http'

const PORT = process.env.PORT || 8787

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json')
  if (req.url === '/api/health') return res.end(JSON.stringify({ ok: true, part: 1 }))
  // Not implemented yet: the client's RemoteBrain falls back to the offline brain on non-200.
  res.statusCode = 501
  res.end(JSON.stringify({ error: 'Not implemented until Part 3' }))
})

server.listen(PORT, () => console.log(`Anchor server stub on http://localhost:${PORT}`))
