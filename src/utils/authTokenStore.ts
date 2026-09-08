const STORAGE_KEY = 'offerlab.auth.token'
const LEGACY_SESSION_KEY = STORAGE_KEY

let memoryToken: string | null = readSharedTokenWithMigration()
let sessionVersion = 0
let storageListenerAttached = false
let notifyScheduled = false
let lastDeliveredToken: string | null = memoryToken
const externalChangeListeners = new Set<(token: string | null) => void>()

function readSharedToken() {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

// 旧版本把 token 存在 per-tab sessionStorage,导致新开标签页掉登录。
// 升级到 localStorage 共享后做一次性迁移:本地无共享 token 而 sessionStorage 还有
// 旧 token 时,把它提升为共享登录态,避免所有已登录用户升级后被迫重登一次。
function readSharedTokenWithMigration() {
  const shared = readSharedToken()
  if (shared) {
    return shared
  }
  try {
    const legacy = window.sessionStorage.getItem(LEGACY_SESSION_KEY)
    if (!legacy) {
      return null
    }
    window.localStorage.setItem(STORAGE_KEY, legacy)
    window.sessionStorage.removeItem(LEGACY_SESSION_KEY)
    return legacy
  } catch {
    return null
  }
}

// token 存放在 localStorage 的独立键中,让同一浏览器的所有标签页共享同一登录态;
// 登出/过期时清除。遗留 'token' 键与旧 sessionStorage 键在使用时顺带清理。
function attachStorageListener() {
  if (storageListenerAttached) return
  try {
    if (typeof window.addEventListener !== 'function') return
    window.addEventListener('storage', event => {
      if (event.key !== null && event.key !== STORAGE_KEY) return
      const sharedToken = readSharedToken()
      if (sharedToken === memoryToken) return
      sessionVersion += 1
      memoryToken = sharedToken
      scheduleExternalNotify()
    })
    storageListenerAttached = true
  } catch {
    // Environments without storage events keep per-tab behavior.
  }
}

/**
 * 另一标签页的连续多次写入(例如"同 token 重登"的 clear→set 序列)在 storage 事件里
 * 表现为一串独立变更。监听方只关心最终共享值:这里把通知合并到微任务,投递时以
 * 当前 memoryToken(始终与共享存储一致)为准,并跳过与上次已投递值相同的通知,
 * 避免中间态(null)触发监听方登出分支误清本地敏感数据(如编辑器草稿)。
 */
function scheduleExternalNotify() {
  if (notifyScheduled) return
  notifyScheduled = true
  const flush = () => {
    notifyScheduled = false
    if (memoryToken === lastDeliveredToken) return
    lastDeliveredToken = memoryToken
    externalChangeListeners.forEach(listener => listener(memoryToken))
  }
  if (typeof window.queueMicrotask === 'function') {
    window.queueMicrotask(flush)
  } else {
    Promise.resolve().then(flush)
  }
}

export const authTokenStore = {
  get() {
    attachStorageListener()
    return memoryToken
  },

  getVersion() {
    return sessionVersion
  },

  set(token: string) {
    attachStorageListener()
    if (memoryToken !== token) {
      sessionVersion += 1
    }
    memoryToken = token
    try {
      window.localStorage.setItem(STORAGE_KEY, token)
      window.sessionStorage.removeItem(LEGACY_SESSION_KEY)
    } catch {
      // Auth still works for this tab from memory when storage is unavailable.
    }
  },

  clear() {
    attachStorageListener()
    if (memoryToken !== null) {
      sessionVersion += 1
    }
    memoryToken = null
    try {
      window.localStorage.removeItem(STORAGE_KEY)
      window.sessionStorage.removeItem(LEGACY_SESSION_KEY)
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

  /** 其他标签页写入/清除登录态时触发;返回取消订阅函数。 */
  onExternalChange(listener: (token: string | null) => void) {
    attachStorageListener()
    externalChangeListeners.add(listener)
    return () => {
      externalChangeListeners.delete(listener)
    }
  },

  /** 仅供测试/守卫使用:重置模块级状态,隔离多实例间的状态泄漏。 */
  resetForTesting() {
    externalChangeListeners.clear()
    storageListenerAttached = false
    notifyScheduled = false
    lastDeliveredToken = memoryToken
  },
}
