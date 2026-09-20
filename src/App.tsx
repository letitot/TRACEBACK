import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { buildDemoSessions, computeSummary, defaultSettings, formatDuration, getStatusLight, inferCategory } from './lib/traceback'
import { loadSessions, loadSettings, resetAllData, saveSettings } from './services/storage'
import type { ActivitySession, TracebackSettings } from './types'

const defaultSessions = buildDemoSessions()

function App() {
  const [settings, setSettings] = useState<TracebackSettings>(defaultSettings)
  const [sessions, setSessions] = useState<ActivitySession[]>(defaultSessions)
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false)
  const [booting, setBooting] = useState(false)

  useEffect(() => {
    void (async () => {
      const savedSettings = await loadSettings()
      const savedSessions = await loadSessions()
      const merged = { ...defaultSettings, ...savedSettings }
      setSettings(merged)
      setSessions(savedSessions.length > 0 ? savedSessions : defaultSessions)
    })()
  }, [])

  const isActive = settings.trackingEnabled && settings.chromeActivityConsent
  const summary = useMemo(() => computeSummary(sessions), [sessions])

  const persist = (next: TracebackSettings) => {
    setSettings(next)
    void saveSettings(next)
  }

  const handleConsentToggle = () => {
    const nextConsent = !settings.chromeActivityConsent
    persist({
      ...settings,
      chromeActivityConsent: nextConsent,
      trackingEnabled: nextConsent ? false : false,
    })
  }

  const handleActivate = () => {
    if (!settings.chromeActivityConsent) return
    const next = { ...settings, trackingEnabled: true }
    persist(next)
    setBooting(true)
    window.setTimeout(() => setBooting(false), 1200)
  }

  const handleDeactivate = () => {
    const next = { ...settings, trackingEnabled: false }
    persist(next)
  }

  const handleReset = async () => {
    await resetAllData()
    setSettings(defaultSettings)
    setSessions(defaultSessions)
  }

  if (!isActive && !booting) {
    return (
      <div className="traceback-root activation-screen">
        <div className="activation-panel panel">
          <div className="activation-brand">TRACEBACK</div>

          <div className={`retro-toggle ${settings.trackingEnabled ? 'on' : 'off'}`}>
            <span className="toggle-label">TRACEBACK</span>
            <span className="toggle-state">{settings.trackingEnabled ? 'ON' : 'OFF'}</span>
          </div>

          <div className="activation-copy">
            {settings.chromeActivityConsent
              ? 'Activity tracking is paused.'
              : 'TURN ON TRACEBACK'}
          </div>

          <label className="consent-checkbox">
            <input
              type="checkbox"
              checked={settings.chromeActivityConsent}
              onChange={handleConsentToggle}
            />
            <span>
              I agree to allow TRACEBACK to collect Chrome activity data to generate my browsing timeline.
            </span>
          </label>

          {!settings.chromeActivityConsent && (
            <div className="activation-hint">
              Please agree to the Chrome activity data collection terms before activating TRACEBACK.
            </div>
          )}

          <button
            className="primary-btn"
            type="button"
            onClick={handleActivate}
            disabled={!settings.chromeActivityConsent}
          >
            {settings.chromeActivityConsent ? 'TURN ON TRACEBACK' : 'CONSENT REQUIRED'}
          </button>

          <button className="secondary-btn" type="button" onClick={() => setShowPrivacyInfo((value) => !value)}>
            WHAT DATA IS COLLECTED?
          </button>

          {showPrivacyInfo && (
            <div className="privacy-panel">
              <h3>TRACEBACK MAY COLLECT</h3>
              <ul>
                <li>Website/domain visited</li>
                <li>Approximate visit duration</li>
                <li>Active tab changes</li>
                <li>Browser session information</li>
                <li>Idle periods</li>
              </ul>

              <h3>TRACEBACK DOES NOT COLLECT</h3>
              <ul>
                <li>Passwords</li>
                <li>Keystrokes</li>
                <li>Screenshots</li>
                <li>Webcam</li>
                <li>Microphone</li>
                <li>Clipboard contents</li>
                <li>Form inputs</li>
                <li>Private message contents</li>
              </ul>

              <p>Your activity data is stored locally in your browser by default.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (booting) {
    return (
      <div className="traceback-root activation-screen">
        <div className="boot-panel panel">
          <div className="boot-title">TRACEBACK</div>
          <div className="boot-lines">
            <span>INITIALIZING...</span>
            <span>ACTIVITY MONITOR ........ OK</span>
            <span>LOCAL DATABASE .......... OK</span>
            <span>TIMELINE ENGINE ......... OK</span>
            <span>PRIVACY MODULE .......... OK</span>
            <span>SYSTEM READY</span>
          </div>
          <button type="button" className="primary-btn" onClick={() => setBooting(false)}>
            ENTER TRACEBACK
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="traceback-root dashboard-shell">
      <header className="topbar">
        <div className="brand-block">
          <span className="brand">TRACEBACK</span>
        </div>
        <div className="status-strip">
          <span className="signal-dot" />
          <span>{getStatusLight(settings)}</span>
          <button type="button" className="mini-toggle" onClick={settings.trackingEnabled ? handleDeactivate : handleActivate}>
            {settings.trackingEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </header>

      <main className="traceback-shell">
        <aside className="panel rail">
          <div className="rail-title">SYSTEM // MENU</div>
          <button className="nav-btn active" type="button">TODAY</button>
          <button className="nav-btn" type="button">TIMELINE</button>
          <button className="nav-btn" type="button">REPORT</button>
          <button className="nav-btn" type="button">HISTORY</button>
          <button className="nav-btn" type="button">PRIVACY</button>
          <button className="nav-btn" type="button">SETTINGS</button>
          <div className="divider" />
          <button className="action-btn" type="button" onClick={settings.trackingEnabled ? handleDeactivate : handleActivate}>
            {settings.trackingEnabled ? 'TURN OFF' : 'TURN ON'}
          </button>
          <button className="action-btn danger" type="button" onClick={handleReset}>DELETE DATA</button>
        </aside>

        <section className="main-panel panel">
          <div className="window-header">
            <span>TRACEBACK</span>
            <span className="window-actions">{settings.trackingEnabled ? 'ON' : 'OFF'}</span>
          </div>

          <div className="hero-grid">
            <div className="stat-box">
              <div className="label">WEB TIME</div>
              <div className="value">{summary.totalLabel}</div>
            </div>
            <div className="stat-box">
              <div className="label">SESSIONS</div>
              <div className="value">{summary.totalSessions}</div>
            </div>
            <div className="stat-box">
              <div className="label">TAB SWITCHES</div>
              <div className="value">{summary.tabSwitches}</div>
            </div>
            <div className="stat-box">
              <div className="label">DOMAINS</div>
              <div className="value">{summary.domains}</div>
            </div>
          </div>

          <div className="feature-box">
            <div className="feature-title">WHERE DID MY TIME GO?</div>
            <div className="feature-summary">You were online for: {summary.totalLabel}</div>
            <div className="feature-list">
              {summary.topCategories.map((item) => (
                <div key={item.category} className="feature-row">
                  <span>{item.category}</span>
                  <strong>{formatDuration(item.duration)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="inspector-grid">
            <div className="panel card">
              <h3>TOP WEBSITES</h3>
              {summary.topDomains.map((item) => (
                <div className="list-row" key={item.domain}>
                  <span>{item.domain}</span>
                  <strong>{formatDuration(item.duration)}</strong>
                </div>
              ))}
            </div>

            <div className="panel card">
              <h3>CATEGORIES</h3>
              {summary.topCategories.map((item) => (
                <div className="list-row" key={item.category}>
                  <span>{item.category}</span>
                  <strong>{formatDuration(item.duration)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="panel timeline-panel">
            <h3>TRACEBACK // TIMELINE</h3>
            <div className="timeline-list">
              {sessions.slice(0, 8).map((session) => (
                <div key={session.id} className="timeline-item">
                  <div className="timeline-time">{new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="timeline-content">
                    <div className="timeline-category">{session.category ?? inferCategory(session.domain)}</div>
                    <div className="timeline-domain">{session.domain}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
