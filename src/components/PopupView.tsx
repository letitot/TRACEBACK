import { useEffect, useMemo, useState } from 'react'
import { computeSummary, getStatusLight } from '../lib/traceback'
import { loadSessions, loadSettings, saveSettings } from '../services/storage'
import type { ActivitySession, TracebackSettings } from '../types'

const defaultSessionSeed: ActivitySession[] = [
  {
    id: 'demo-1',
    domain: 'github.com',
    startTime: Date.now() - 1000 * 60 * 60 * 2,
    endTime: Date.now() - 1000 * 60 * 60 * 1,
    category: 'PROGRAMMING',
    eventType: 'page_visit',
  },
  {
    id: 'demo-2',
    domain: 'youtube.com',
    startTime: Date.now() - 1000 * 60 * 45,
    endTime: Date.now() - 1000 * 60 * 10,
    category: 'ENTERTAINMENT',
    eventType: 'page_visit',
  },
]

export default function PopupView() {
  const [settings, setSettings] = useState<TracebackSettings>({
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
  })
  const [sessions, setSessions] = useState<ActivitySession[]>(defaultSessionSeed)
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false)

  useEffect(() => {
    void (async () => {
      const storedSettings = await loadSettings()
      const storedSessions = await loadSessions()
      setSettings(storedSettings)
      setSessions(storedSessions.length > 0 ? storedSessions : defaultSessionSeed)
    })()
  }, [])

  const summary = useMemo(() => computeSummary(sessions), [sessions])
  const isActive = settings.trackingEnabled && settings.chromeActivityConsent

  const persist = (next: TracebackSettings) => {
    setSettings(next)
    void saveSettings(next)
  }

  const handleConsentToggle = () => {
    persist({
      ...settings,
      chromeActivityConsent: !settings.chromeActivityConsent,
      trackingEnabled: false,
    })
  }

  const handleActivate = () => {
    if (!settings.chromeActivityConsent) return
    persist({ ...settings, trackingEnabled: true })
  }

  if (!isActive) {
    return (
      <div className="popup-shell">
        <div className="popup-header">
          <span>SUBJECT A-34</span>
          <button type="button" className="popup-mini-button" aria-label="status indicator" />
        </div>

        <div className="popup-status">STATUS: {settings.trackingEnabled ? 'ACTIVE' : 'STANDBY'}</div>
        <div className="popup-copy">
          {settings.chromeActivityConsent
            ? 'Activity tracking is paused.'
            : 'Turn on TRACEBACK and agree to Chrome activity collection to begin.'}
        </div>

        <label className="consent-box">
          <input type="checkbox" checked={settings.chromeActivityConsent} onChange={handleConsentToggle} />
          <span>I agree to allow TRACEBACK to collect Chrome activity data to generate my browsing timeline.</span>
        </label>

        <button type="button" className="popup-button primary" onClick={handleActivate} disabled={!settings.chromeActivityConsent}>
          {settings.chromeActivityConsent ? 'TURN ON TRACEBACK' : 'CONSENT REQUIRED'}
        </button>

        <button type="button" className="popup-button secondary" onClick={() => setShowPrivacyInfo((value) => !value)}>
          WHAT DATA IS COLLECTED?
        </button>

        {showPrivacyInfo && (
          <div className="popup-privacy">
            <h3>TRACEBACK MAY COLLECT</h3>
            <ul>
              <li>Website/domain visited</li>
              <li>Approximate visit duration</li>
              <li>Active tab changes</li>
              <li>Browser session information</li>
              <li>Idle periods</li>
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="popup-shell">
      <div className="popup-header">
        <span>SUBJECT A-34</span>
        <button type="button" className="popup-mini-button" aria-label="status indicator" />
      </div>

      <div className="popup-screen-grid">
        <div className="popup-panel portrait-panel">
          <div className="portrait-glow" />
        </div>

        <div className="popup-panel circuit-panel">
          <div className="circuit-board" />
        </div>
      </div>

      <div className="popup-info-panel">
        <div className="info-row">
          <span>NAME</span>
          <strong>TORRA.TAHA</strong>
        </div>
        <div className="info-row">
          <span>INCEPT DATE</span>
          <strong>03/65/2008</strong>
        </div>
        <div className="info-row">
          <span>FUNCTION</span>
          <strong>DESIGNER</strong>
        </div>
        <div className="info-row">
          <span>MENTAL STATE</span>
          <strong>UNSTABLE</strong>
        </div>
        <div className="info-row">
          <span>LAST KNOWN LOCATION</span>
          <strong>-----</strong>
        </div>
        <div className="info-row">
          <span>THREAT ASSESSMENT</span>
          <strong>★★★☆☆</strong>
        </div>
        <div className="info-row">
          <span>SPECIAL SKILLS</span>
          <strong>◎</strong>
        </div>
        <div className="popup-scan-panel">
          <div className="scan-grid" />
        </div>
      </div>

      <div className="popup-status-bar">
        <span>System status</span>
        <strong>{getStatusLight(settings)}</strong>
      </div>

      <div className="popup-row">
        <span>Top category</span>
        <strong>{summary.topCategories[0]?.category ?? 'OTHER'}</strong>
      </div>
      <div className="popup-row">
        <span>Top site</span>
        <strong>{summary.topDomains[0]?.domain ?? 'UNKNOWN'}</strong>
      </div>
      <div className="popup-row">
        <span>Largest block</span>
        <strong>{summary.longestSession ?? '0s'}</strong>
      </div>
    </div>
  )
}
