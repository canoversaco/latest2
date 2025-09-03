const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const path = require('path')

if (!global.app) {
  const app = express()

  // CORS + Body Parser
  app.use(cors())
  app.use(bodyParser.json({ limit: '2mb' }))
  app.use(bodyParser.urlencoded({ extended: true }))

  // 🔁 Rewrite: /api/api/...  -> /api/...
  app.use((req, _res, next) => {
    if (req.url.startsWith('/api/api/')) {
      req.url = req.url.replace(/^\/api\/api\//, '/api/')
    }
    // Doppelte Slashes reduzieren
    req.url = req.url.replace(/^\/{2,}/, '/')
    next()
  })

  // Preflight für alle /api/* Endpoints
  app.options('/api/*', (req, res) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    })
    res.status(204).end()
  })

  // Static (PWA)
  try { app.use(express.static(path.join(__dirname, '..', 'web', 'dist'))) } catch {}

  // Health
  app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }))

  global.app = app
}

if (!global._plugServer) {
  const port = process.env.PORT || 8080
  global._plugServer = global.app.listen(port, () => console.log('[BOOT] Plug läuft auf Port', port))
}

module.exports = { app: global.app }
