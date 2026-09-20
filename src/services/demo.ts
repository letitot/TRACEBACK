import { buildDemoSessions } from '../lib/traceback'
import { loadSessions, saveSessions } from './storage'

export async function seedDemoDataIfNeeded() {
  const sessions = await loadSessions()
  if (sessions.length === 0) {
    await saveSessions(buildDemoSessions())
  }
}
