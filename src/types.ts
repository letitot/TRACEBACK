export type ActivityCategory =
  | 'RESEARCH'
  | 'PROGRAMMING'
  | 'WORK'
  | 'STUDY'
  | 'COMMUNICATION'
  | 'ENTERTAINMENT'
  | 'SOCIAL'
  | 'SHOPPING'
  | 'NEWS'
  | 'CREATIVE'
  | 'PRODUCTIVITY'
  | 'OTHER'

export type TrackingLevel = 'basic' | 'standard' | 'detailed'

export interface ActivitySession {
  id: string
  domain: string
  startTime: number
  endTime: number
  title?: string
  category?: ActivityCategory
  tabId?: number
  windowId?: number
  eventType?: 'page_visit' | 'tab_switch' | 'window_focus' | 'idle' | 'active'
}

export interface TracebackSettings {
  trackingEnabled: boolean
  chromeActivityConsent: boolean
  trackingLevel: TrackingLevel
  idleThreshold: number
  demoMode: boolean
  crtMode: boolean
  scanlines: boolean
  glitch: boolean
  bootAnimation: boolean
  reducedMotion: boolean
}

export interface CategorySummary {
  category: ActivityCategory
  duration: number
}

export interface DomainSummary {
  domain: string
  duration: number
}
