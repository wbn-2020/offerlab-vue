const STORAGE_KEY = 'offerlab.auth.token'

let memoryToken: string | null = readSessionToken()

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

  set(token: string) {
    memoryToken = token
    try {
      window.sessionStorage.setItem(STORAGE_KEY, token)
    } catch {
      // Auth still works for this tab from memory when session storage is unavailable.
    }
  },

  clear() {
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