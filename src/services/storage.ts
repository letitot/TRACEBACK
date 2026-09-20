import { defaultSettings, SESSION_KEY, STORAGE_KEY } from '../lib/traceback'
import type { ActivitySession, TracebackSettings } from '../types'

function getChromeStorage(): { get: (keys: string[], callback: (items: Record<string, unknown>) => void) => void; set: (items: Record<string, unknown>, callback?: () => void) => void } | null {
  const api = (globalThis as typeof globalThis & { chrome?: { storage?: { local?: { get: (keys: string[], callback: (items: Record<string, unknown>) => void) => void; set: (items: Record<string, unknown>, callback?: () => void) => void } } } }).chrome
  return api?.storage?.local ?? null
}

async function safeReadAsync<T>(key: string, fallback: T): Promise<T> {
  const chromeStore = getChromeStorage()
  if (chromeStore) {
    return await new Promise<T>((resolve) => {
      chromeStore.get([key], (items: Record<string, unknown>) => {
        const value = items[key]
        resolve(value !== undefined ? (value as T) : fallback)
      })
    })
  }

  if (typeof window === 'undefined') return fallback
  try {
    const value = window.localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

async function safeWriteAsync<T>(key: string, value: T): Promise<void> {
  const chromeStore = getChromeStorage()
  if (chromeStore) {
    await new Promise<void>((resolve) => {
      chromeStore.set({ [key]: value }, () => resolve())
    })
  }

  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage issues gracefully
  }
}

export async function loadSettings(): Promise<TracebackSettings> {
  const saved = await safeReadAsync<Partial<TracebackSettings>>(STORAGE_KEY, {})
  const merged = {
    ...defaultSettings,
    ...saved,
  }

  merged.trackingEnabled = Boolean(merged.trackingEnabled) && Boolean(merged.chromeActivityConsent)
  return merged
}

export async function saveSettings(settings: TracebackSettings): Promise<void> {
  await safeWriteAsync(STORAGE_KEY, settings)
}

export async function loadSessions(): Promise<ActivitySession[]> {
  return await safeReadAsync<ActivitySession[]>(SESSION_KEY, [])
}

export async function saveSessions(sessions: ActivitySession[]): Promise<void> {
  await safeWriteAsync(SESSION_KEY, sessions)
}

export async function resetAllData(): Promise<void> {
  await safeWriteAsync(SESSION_KEY, [])
  await safeWriteAsync(STORAGE_KEY, defaultSettings)
}
