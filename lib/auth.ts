const SESSION_KEY = 'dh_pos_session'
const SESSION_TTL_MS = 24 * 60 * 60 * 1000

export const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD

export function isSessionValid(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) return false
    const session = JSON.parse(raw) as { loggedIn?: boolean; timestamp?: number }
    if (!session.loggedIn || typeof session.timestamp !== 'number') return false
    return Date.now() - session.timestamp < SESSION_TTL_MS
  } catch {
    return false
  }
}

export function startSession() {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ loggedIn: true, timestamp: Date.now() }))
}

export function endSession() {
  window.localStorage.removeItem(SESSION_KEY)
}
