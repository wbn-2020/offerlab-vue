const STORAGE_KEY = 'offerlab.auth.token'

let memoryToken: string | null = readSessionToken()
let sessionVersion = 0

function readSessionToken() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export const authTokenStore = {
  get() {
    return memoryToken
  },

  getVersion() {
    return sessionVersion
  },

  set(token: string) {
    if (memoryToken !== token) {
      sessionVersion += 1
    }
    memoryToken = token
    try {
      window.sessionStorage.setItem(STORAGE_KEY, token)
    } catch {
      // Auth still works for this tab from memory when session storage is unavailable.
    }
  },

  clear() {
    if (memoryToken !== null) {
      sessionVersion += 1
    }
    memoryToken = null
    try {
      window.sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Storage may be disabled; clearing memory state is enough for this tab.
    }
  },

  clearLegacyLocalToken() {
    try {
      window.localStorage.removeItem('token')
    } catch {
      // Best-effort cleanup of the old persistent token key.
    }
  },
}
