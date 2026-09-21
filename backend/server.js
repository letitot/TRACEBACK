require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = Number(process.env.PORT || 3001);
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'traceback.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

function normalizeDomain(rawUrl) {
  if (!rawUrl) return 'unknown';
  const value = String(rawUrl).trim();
  try {
    const url = value.startsWith('http') ? new URL(value) : new URL(`https://${value}`);
    return (url.hostname || 'unknown').toLowerCase().replace(/^www\./, '');
  } catch {
    return value.toLowerCase().replace(/^www\./, '') || 'unknown';
  }
}

function inferCategory(domain) {
  const value = String(domain || '').toLowerCase();

  if (/github|stackoverflow|npmjs|developer\.mozilla|mdn|vscode|vercel|netlify|reactjs|nextjs|nodejs|python|typescript|rust|kubernetes|docker|gitlab|bitbucket|docs\./.test(value)) {
    return 'PROGRAMMING';
  }
  if (/scholar|ieeexplore|arxiv|research|wikipedia|science|acm|springer|nature|doi|medline/.test(value)) {
    return 'RESEARCH';
  }
  if (/youtube|netflix|twitch|spotify|hulu|disney|soundcloud|vimeo|music/.test(value)) {
    return 'ENTERTAINMENT';
  }
  if (/whatsapp|slack|discord|teams|telegram|gmail|outlook|mail|zoom/.test(value)) {
    return 'COMMUNICATION';
  }
  if (/facebook|instagram|x\.com|linkedin|reddit|threads|tiktok/.test(value)) {
    return 'SOCIAL';
  }
  if (/shop|amazon|ebay|etsy|nike|target|walmart|shopify/.test(value)) {
    return 'SHOPPING';
  }
  if (/news|cnn|bbc|nytimes|washingtonpost|reuters|apnews|theverge/.test(value)) {
    return 'NEWS';
  }
  if (/figma|canva|behance|dribbble|notion|adobe/.test(value)) {
    return 'CREATIVE';
  }
  if (/docs|drive|dropbox|calendar|todoist|asana/.test(value)) {
    return 'PRODUCTIVITY';
  }
  if (/office|microsoft|adobe|excel|word|powerpoint/.test(value)) {
    return 'WORK';
  }
  return 'OTHER';
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${seconds}s`;
}

function getAllowedOrigins() {
  const raw = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,chrome-extension://*').split(',');
  return raw.map((item) => item.trim()).filter(Boolean);
}

const allowedOrigins = getAllowedOrigins();

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    const matches = allowedOrigins.some((pattern) => {
      if (pattern === '*') return true;
      if (pattern.endsWith('://*')) {
        return origin.startsWith(pattern.slice(0, -1));
      }
      return origin === pattern;
    });

    if (matches) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '5mb' }));

const schemaSql = `
  CREATE TABLE IF NOT EXISTS user_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS permissions (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT DEFAULT 'OTHER',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activity_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    timestamp_start TEXT NOT NULL,
    timestamp_end TEXT NOT NULL,
    application TEXT NOT NULL,
    domain TEXT,
    window_title TEXT,
    activity_type TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'chrome',
    duration_seconds INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS daily_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    total_active_seconds INTEGER NOT NULL,
    total_idle_seconds INTEGER NOT NULL,
    sessions INTEGER NOT NULL,
    context_switches INTEGER NOT NULL,
    longest_session_seconds INTEGER NOT NULL,
    average_session_seconds INTEGER NOT NULL,
    summary_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_activity_events_date ON activity_events(date);
  CREATE INDEX IF NOT EXISTS idx_activity_events_application ON activity_events(application);
  CREATE INDEX IF NOT EXISTS idx_activity_events_timestamp ON activity_events(timestamp_start, timestamp_end);
`;

const initialSettings = [
  ['trackingLevel', 'BASIC'],
  ['idleThresholdMinutes', '5'],
  ['crtEffect', 'on'],
  ['scanlines', 'on'],
  ['glitchEffect', 'off'],
  ['pixelMode', 'off'],
  ['bootSequenceEnabled', 'on'],
  ['demoMode', 'off'],
  ['trackingEnabled', 'off'],
  ['privacyMode', 'local-only'],
];

const permissions = [
  ['activityAccess', 'granted'],
  ['localStorage', 'granted'],
  ['cloudSyncConsent', 'denied'],
  ['screenCapture', 'denied'],
  ['keyboardCapture', 'denied'],
  ['microphone', 'denied'],
  ['camera', 'denied'],
];

const seedSettings = db.transaction(() => {
  db.exec(schemaSql);

  for (const [key, value] of initialSettings) {
    const exists = db.prepare('SELECT 1 FROM user_settings WHERE key = ?').get(key);
    if (!exists) {
      db.prepare('INSERT INTO user_settings(key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(key, value);
    }
  }

  for (const [key, value] of permissions) {
    const exists = db.prepare('SELECT 1 FROM permissions WHERE key = ?').get(key);
    if (!exists) {
      db.prepare('INSERT INTO permissions(key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(key, value);
    }
  }
});
seedSettings();

function toSession(row) {
  const startTime = new Date(row.timestamp_start).getTime();
  const endTime = new Date(row.timestamp_end).getTime();
  const domain = row.domain ? normalizeDomain(row.domain) : 'unknown';
  return {
    id: String(row.id),
    domain,
    title: row.window_title || row.application || domain,
    startTime: Number.isFinite(startTime) ? startTime : Date.now(),
    endTime: Number.isFinite(endTime) ? endTime : Date.now(),
    category: row.domain ? inferCategory(domain) : 'OTHER',
    eventType: row.activity_type === 'idle' ? 'idle' : 'page_visit',
    tabId: undefined,
    windowId: undefined,
  };
}

function computeSummary(rows) {
  const ordered = [...rows]
    .map((row) => toSession(row))
    .sort((a, b) => a.startTime - b.startTime);

  const totalMs = ordered.reduce((sum, item) => {
    const duration = Math.max(0, item.endTime - item.startTime);
    return sum + duration;
  }, 0);

  const domainTotals = new Map();
  const categoryTotals = new Map();

  for (const session of ordered) {
    const duration = Math.max(0, session.endTime - session.startTime);
    domainTotals.set(session.domain, (domainTotals.get(session.domain) ?? 0) + duration);
    const category = session.category || inferCategory(session.domain);
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + duration);
  }

  const topDomains = [...domainTotals.entries()]
    .map(([domain, duration]) => ({ domain, duration }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5);

  const topCategories = [...categoryTotals.entries()]
    .map(([category, duration]) => ({ category, duration }))
    .sort((a, b) => b.duration - a.duration);

  const longest = ordered.reduce((current, item) => {
    if (!current) return item;
    return item.endTime - item.startTime > current.endTime - current.startTime ? item : current;
  }, null);

  return {
    totalMs,
    totalLabel: formatDuration(totalMs),
    totalSessions: ordered.length,
    domains: new Set(ordered.map((item) => item.domain)).size,
    tabSwitches: Math.max(0, ordered.length - 1),
    longestSession: longest ? formatDuration(longest.endTime - longest.startTime) : '0s',
    topDomains,
    topCategories,
  };
}

function readActivity(date) {
  return db.prepare(`
    SELECT *
    FROM activity_events
    WHERE ? IS NULL OR date = ?
    ORDER BY timestamp_start DESC
    LIMIT 250
  `).all(date ?? null, date ?? null);
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'TRACEBACK backend', timestamp: new Date().toISOString() });
});

app.get('/api/activity', (req, res) => {
  const limit = Math.min(Number(req.query.limit || 250), 500);
  const rows = db.prepare(`
    SELECT *
    FROM activity_events
    ORDER BY timestamp_start DESC
    LIMIT ?
  `).all(limit);

  res.json(rows.map((row) => toSession(row)));
});

app.post('/api/activity/bulk', (req, res) => {
  const events = Array.isArray(req.body?.events) ? req.body.events : [];

  if (!events.length) {
    return res.status(400).json({ error: 'No activity events were provided.' });
  }

  const insert = db.prepare(`
    INSERT INTO activity_events(
      date,
      timestamp_start,
      timestamp_end,
      application,
      domain,
      window_title,
      activity_type,
      source,
      duration_seconds
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    let count = 0;
    for (const event of events) {
      const normalizedDomain = normalizeDomain(event.domain || event.url || event.application || 'unknown');
      const start = new Date(event.startTime || event.timestamp_start || Date.now()).toISOString();
      const end = new Date(event.endTime || event.timestamp_end || Date.now()).toISOString();
      const durationSeconds = Math.max(0, Number(event.durationSeconds || event.duration || Math.round((new Date(end) - new Date(start)) / 1000) || 0));

      insert.run(
        start.slice(0, 10),
        start,
        end,
        String(event.application || event.title || event.domain || 'BROWSER'),
        normalizedDomain,
        event.title || event.window_title || event.domain || 'Browser activity',
        String(event.eventType || event.activity_type || 'active'),
        event.source || 'chrome',
        durationSeconds,
      );
      count += 1;
    }
    return count;
  });

  const saved = tx();
  res.status(201).json({ success: true, saved, source: 'TRACEBACK backend' });
});

app.get('/api/analytics/summary', (req, res) => {
  const date = req.query.date ? String(req.query.date) : new Date().toISOString().slice(0, 10);
  const rows = readActivity(date);
  res.json({
    date,
    ...computeSummary(rows),
  });
});

app.get('/api/analytics/daily', (req, res) => {
  const rows = db.prepare(`
    SELECT date, SUM(duration_seconds) AS active_seconds
    FROM activity_events
    WHERE activity_type IN ('active', 'page_visit', 'window_focus')
    GROUP BY date
    ORDER BY date DESC
    LIMIT 7
  `).all();

  res.json(rows.map((row) => ({
    date: row.date,
    activeSeconds: Number(row.active_seconds || 0),
    label: row.date ? row.date.slice(5) : '',
    total: formatDuration(Number(row.active_seconds || 0) * 1000),
    percent: Math.min(100, (Number(row.active_seconds || 0) / 28800) * 100),
  })));
});

app.get('/api/reports', (req, res) => {
  const rows = db.prepare(`
    SELECT date, application, domain, activity_type, duration_seconds
    FROM activity_events
    ORDER BY timestamp_start DESC
    LIMIT 100
  `).all();

  res.json(rows);
});

app.delete('/api/activity', (req, res) => {
  db.prepare('DELETE FROM activity_events').run();
  res.json({ success: true, removed: true });
});

app.use((error, req, res, next) => {
  if (error && error.message === 'CORS not allowed') {
    return res.status(403).json({ error: 'Origin not permitted for TRACEBACK.' });
  }
  console.error('Unhandled backend error:', error);
  res.status(500).json({ error: 'An unexpected TRACEBACK backend error occurred.' });
});

app.listen(PORT, () => {
  console.log(`TRACEBACK backend listening on http://localhost:${PORT}`);
});
