const SETTINGS_KEY = 'traceback-settings-v1'
const SESSION_KEY = 'traceback-sessions-v1'

function normalizeDomain(rawUrl) {
  try {
    const url = rawUrl.startsWith('http') ? new URL(rawUrl) : new URL(`https://${rawUrl}`)
    return (url.hostname || 'unknown').toLowerCase().replace(/^www\./, '')
  } catch {
    return (rawUrl || 'unknown').trim().toLowerCase().replace(/^www\./, '') || 'unknown'
  }
}

function inferCategory(domain) {
  const value = (domain || '').toLowerCase()

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

async function readState(key, fallback) {
  return await new Promise((resolve) => {
    chrome.storage.local.get([key], (items) => {
      resolve(items[key] ?? fallback)
    })
  })
}

async function writeState(key, value) {
  return await new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve())
  })
}

async function isTrackingActive() {
  const settings = await readState(SETTINGS_KEY, {
    trackingEnabled: false,
    chromeActivityConsent: false,
  })

  return Boolean(settings.trackingEnabled) && Boolean(settings.chromeActivityConsent)
}

async function captureCurrentTab() {
  if (!(await isTrackingActive())) return

  const tabs = await new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (results) => resolve(results || []))
  })

  const tab = tabs[0]
  if (!tab || !tab.url) return

  const domain = normalizeDomain(tab.url)
  const startTime = Date.now()
  const session = {
    id: `chrome-${tab.id ?? 'unknown'}-${startTime}`,
    domain,
    title: tab.title || domain,
    startTime,
    endTime: startTime,
    category: inferCategory(domain),
    tabId: tab.id,
    windowId: tab.windowId,
    eventType: 'page_visit',
  }

  const existing = (await readState(SESSION_KEY, [])) || []
  const next = [...existing, session].slice(-250)
  await writeState(SESSION_KEY, next)
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ traceback_initialized: true })
})

chrome.tabs.onActivated.addListener(() => {
  captureCurrentTab()
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && (changeInfo.status === 'complete' || changeInfo.url)) {
    captureCurrentTab()
  }
})

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== -1) {
    captureCurrentTab()
  }
})

chrome.idle.onStateChanged.addListener((state) => {
  if (state === 'idle' || state === 'locked') {
    captureCurrentTab()
  }
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'traceback-heartbeat') {
    captureCurrentTab()
  }
})

chrome.alarms.create('traceback-heartbeat', { periodInMinutes: 1 })
