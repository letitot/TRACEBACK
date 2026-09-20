declare const chrome: {
  storage: {
    local: {
      get: (keys: string[], callback: (items: Record<string, unknown>) => void) => void
      set: (items: Record<string, unknown>, callback?: () => void) => void
    }
  }
  tabs: {
    query: (queryInfo: Record<string, unknown>, callback: (results: Array<{ url?: string; title?: string; id?: number; windowId?: number; active?: boolean }>) => void) => void
  }
  alarms: {
    create: (name: string, period: { periodInMinutes: number }) => void
    onAlarm: {
      addListener: (listener: (alarm: { name: string }) => void) => void
    }
  }
  runtime: {
    onInstalled: {
      addListener: (listener: () => void) => void
    }
  }
  windows: {
    onFocusChanged: {
      addListener: (listener: (windowId: number) => void) => void
    }
  }
  idle: {
    onStateChanged: {
      addListener: (listener: (state: string) => void) => void
    }
  }
  tabs: {
    onActivated: {
      addListener: (listener: (info: { tabId: number; windowId: number }) => void) => void
    }
    onUpdated: {
      addListener: (listener: (tabId: number, changeInfo: Record<string, unknown>, tab: { active?: boolean; url?: string; title?: string; id?: number; windowId?: number }) => void) => void
    }
  }
}
