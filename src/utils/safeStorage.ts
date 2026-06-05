export const safeStorage = {
  get(key: string) {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },

  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Storage can be disabled or full; callers should continue without persistence.
    }
  },

  remove(key: string) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Storage can be disabled; auth and UI state should still degrade gracefully.
    }
  },

  sessionGet(key: string) {
    try {
      return window.sessionStorage.getItem(key)
    } catch {
      return null
    }
  },

  sessionSet(key: string, value: string) {
    try {
      window.sessionStorage.setItem(key, value)
    } catch {
      // Storage can be disabled or full; callers should continue without persistence.
    }
  },

  sessionRemove(key: string) {
    try {
      window.sessionStorage.removeItem(key)
    } catch {
      // Storage can be disabled; callers should continue without persistence.
    }
  },
}
