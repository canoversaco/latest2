export const API_BASE = ''

function normalizePath(p: string) {
  if (!p) return '/api'
  // Absolute URLs unverändert lassen
  if (/^https?:\/\//i.test(p)) return p
  let path = p.trim()
  // alle führenden / entfernen
  path = path.replace(/^\/+/, '')
  // ein evtl. vorangestelltes "api/" entfernen
  path = path.replace(/^api\/+/i, '')
  // genau einmal /api/ voranstellen
  return `/api/${path}`
}

export const API = {
  async req(path: string, init?: RequestInit) {
    const url = (API_BASE || '') + normalizePath(path)
    const headers = { 'Content-Type': 'application/json', ...(init?.headers || {}) }
    const res = await fetch(url, { credentials: 'same-origin', ...init, headers })
    const ct = res.headers.get('content-type') || ''
    if (!res.ok) {
      const txt = await res.text().catch(() => res.statusText)
      throw new Error(txt || `HTTP ${res.status}`)
    }
    return ct.includes('application/json') ? res.json() : res.text()
  }
}
