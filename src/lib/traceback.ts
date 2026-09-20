import type { ActivityCategory, ActivitySession, CategorySummary, DomainSummary, TracebackSettings } from '../types'

export const STORAGE_KEY = 'traceback-settings-v1'
export const SESSION_KEY = 'traceback-sessions-v1'

export const defaultSettings: TracebackSettings = {
  trackingEnabled: false,
  chromeActivityConsent: false,
  trackingLevel: 'standard',
  idleThreshold: 5,
  demoMode: true,
  crtMode: true,
  scanlines: true,
  glitch: false,
  bootAnimation: true,
  reducedMotion: false,
}

export function normalizeDomain(rawUrl: string): string {
  try {
    const url = rawUrl.startsWith('http') ? new URL(rawUrl) : new URL(`https://${rawUrl}`)
    return (url.hostname || 'unknown').toLowerCase().replace(/^www\./, '')
  } catch {
    return rawUrl.trim().toLowerCase().replace(/^www\./, '') || 'unknown'
  }
}

export function inferCategory(domain: string): ActivityCategory {
  const value = domain.toLowerCase()

  if (/github|stackoverflow|npmjs|developer\.mozilla|mdn|vscode|vercel|netlify|reactjs|nextjs|nodejs|python|typescript|rust|kubernetes|docker|gitlab|bitbucket|docs\./.test(value)) {
    return 'PROGRAMMING'
  }
  if (/scholar|ieeexplore|arxiv|research|wikipedia|science|acm|springer|nature|doi|medline/.test(value)) {
    return 'RESEARCH'
  }
  if (/youtube|netflix|twitch|spotify|hulu|disney|soundcloud|vimeo|music/.test(value)) {
    return 'ENTERTAINMENT'
  }
  if (/whatsapp|slack|discord|teams|telegram|gmail|outlook|mail|zoom/.test(value)) {
    return 'COMMUNICATION'
  }
  if (/facebook|instagram|x\.com|linkedin|reddit|threads|tiktok/.test(value)) {
    return 'SOCIAL'
  }
  if (/shop|amazon|ebay|etsy|nike|target|walmart|shopify/.test(value)) {
    return 'SHOPPING'
  }
  if (/news|cnn|bbc|nytimes|washingtonpost|reuters|apnews|theverge/.test(value)) {
    return 'NEWS'
  }
  if (/figma|canva|behance|dribbble|notion|adobe/.test(value)) {
    return 'CREATIVE'
  }
  if (/docs|drive|dropbox|calendar|todoist|asana/.test(value)) {
    return 'PRODUCTIVITY'
  }
  if (/office|microsoft|adobe|excel|word|powerpoint/.test(value)) {
    return 'WORK'
  }
  return 'OTHER'
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
  }
  return `${seconds}s`
}

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function buildDemoSessions(): ActivitySession[] {
  const today = new Date()
  const startOfDay = new Date(today)
  startOfDay.setHours(0, 0, 0, 0)

  const demoRecords = [
    { domain: 'google.com', start: 9 * 60 + 2, end: 9 * 60 + 9 },
    { domain: 'scholar.google.com', start: 9 * 60 + 8, end: 9 * 60 + 17 },
    { domain: 'ieeexplore.ieee.org', start: 9 * 60 + 17, end: 9 * 60 + 43 },
    { domain: 'github.com', start: 9 * 60 + 43, end: 10 * 60 + 2 },
    { domain: 'stackoverflow.com', start: 10 * 60 + 2, end: 10 * 60 + 18 },
    { domain: 'chatgpt.com', start: 10 * 60 + 18, end: 10 * 60 + 51 },
    { domain: 'youtube.com', start: 10 * 60 + 51, end: 11 * 60 + 9 },
    { domain: 'github.com', start: 11 * 60 + 9, end: 11 * 60 + 42 },
    { domain: 'web.whatsapp.com', start: 11 * 60 + 42, end: 12 * 60 + 3 },
    { domain: 'github.com', start: 13 * 60 + 17, end: 14 * 60 + 2 },
    { domain: 'figma.com', start: 14 * 60 + 2, end: 15 * 60 + 14 },
    { domain: 'youtube.com', start: 15 * 60 + 14, end: 16 * 60 + 0 },
  ]

  return demoRecords.map((record, index) => {
    const start = new Date(startOfDay.getTime() + record.start * 60 * 1000)
    const end = new Date(startOfDay.getTime() + record.end * 60 * 1000)
    return {
      id: `demo-${index + 1}`,
      domain: normalizeDomain(record.domain),
      title: record.domain,
      startTime: start.getTime(),
      endTime: end.getTime(),
      category: inferCategory(record.domain),
      eventType: 'page_visit',
    }
  })
}

export function computeSummary(sessions: ActivitySession[]) {
  const ordered = [...sessions].sort((a, b) => a.startTime - b.startTime)
  const totalMs = ordered.reduce((sum, session) => {
    const duration = Math.max(0, session.endTime - session.startTime)
    return sum + duration
  }, 0)

  const domainTotals = new Map<string, number>()
  const categoryTotals = new Map<ActivityCategory, number>()

  for (const session of ordered) {
    const domain = session.domain
    const duration = Math.max(0, session.endTime - session.startTime)
    domainTotals.set(domain, (domainTotals.get(domain) ?? 0) + duration)

    const category = session.category ?? inferCategory(domain)
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + duration)
  }

  const topDomains = [...domainTotals.entries()]
    .map(([domain, duration]) => ({ domain, duration }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5)

  const topCategories = [...categoryTotals.entries()]
    .map(([category, duration]) => ({ category, duration }))
    .sort((a, b) => b.duration - a.duration)

  const longest = ordered.reduce<ActivitySession | null>((current, item) => {
    if (!current) return item
    return item.endTime - item.startTime > current.endTime - current.startTime ? item : current
  }, null)

  return {
    totalMs,
    totalLabel: formatDuration(totalMs),
    totalSessions: ordered.length,
    domains: new Set(ordered.map((item) => item.domain)).size,
    tabSwitches: Math.max(0, ordered.length - 1),
    longestSession: longest ? formatDuration(longest.endTime - longest.startTime) : '0s',
    topDomains: topDomains as DomainSummary[],
    topCategories: topCategories as CategorySummary[],
  }
}

export function getStatusLight(settings: TracebackSettings): string {
  return settings.trackingEnabled ? 'TRACEBACK ACTIVE' : 'TRACEBACK PAUSED'
}
