import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const rootUrl = new URL('../', import.meta.url)
const read = relativePath => readFileSync(new URL(relativePath, rootUrl), 'utf8')

class FakeStorage {
  constructor() {
    this.values = new Map()
    this.throwQuota = false
  }

  get length() {
    return this.values.size
  }

  key(index) {
    return [...this.values.keys()][index] ?? null
  }

  getItem(key) {
    return this.values.get(String(key)) ?? null
  }

  setItem(key, value) {
    if (this.throwQuota) {
      const error = new Error('quota')
      error.name = 'QuotaExceededError'
      throw error
    }
    this.values.set(String(key), String(value))
  }

  removeItem(key) {
    this.values.delete(String(key))
  }
}

const localStorage = new FakeStorage()
const sessionStorage = new FakeStorage()
const storageEvents = []
const storageSource = read('src/utils/safeStorage.ts')
const compiledStorage = ts.transpileModule(storageSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText
const storageSandbox = {
  exports: {},
  module: { exports: {} },
  require: () => {
    throw new Error('safeStorage must not import runtime dependencies')
  },
  TextEncoder,
  setTimeout,
  clearTimeout,
  window: {
    localStorage,
    sessionStorage,
    dispatchEvent: event => storageEvents.push(event),
  },
  CustomEvent: class {
    constructor(type, options) {
      this.type = type
      this.detail = options?.detail
    }
  },
}
storageSandbox.module.exports = storageSandbox.exports
vm.runInNewContext(compiledStorage, storageSandbox)
const { safeStorage } = storageSandbox.module.exports

localStorage.setItem('legacy-draft', '{"content":"keep me"}')
assert.equal(
  safeStorage.getDraft('legacy-draft', { owner: '7', namespace: 'post-draft', ttlMs: 60_000 }),
  '{"content":"keep me"}',
  'legacy drafts must remain readable during metadata migration',
)
assert.match(
  localStorage.getItem('legacy-draft'),
  /^__offerlab_safe_storage_v2__:/,
  'legacy draft reads must best-effort migrate to the versioned envelope',
)
assert.equal(safeStorage.get('legacy-draft'), '{"content":"keep me"}')

assert.equal(
  safeStorage.setDraft('expiring-draft', 'temporary', { owner: '7', ttlMs: 1 }).ok,
  true,
)
await new Promise(resolve => setTimeout(resolve, 5))
assert.equal(safeStorage.get('expiring-draft'), null, 'expired drafts must be removed on read')
assert.equal(localStorage.getItem('expiring-draft'), null)

localStorage.setItem('preserved', 'old-value')
const totalFailure = safeStorage.set('preserved', 'new-value', { maxTotalBytes: 1 })
assert.equal(totalFailure.ok, false)
assert.equal(totalFailure.reason, 'total-limit')
assert.equal(localStorage.getItem('preserved'), 'old-value', 'failed writes must preserve the previous value')

localStorage.throwQuota = true
const quotaFailure = safeStorage.setDraft('quota-draft', 'payload', { owner: '7' })
localStorage.throwQuota = false
assert.equal(quotaFailure.ok, false)
assert.equal(quotaFailure.reason, 'quota')
assert.equal(safeStorage.getLastFailure().reason, 'quota')
assert.equal(storageEvents.at(-1)?.type, 'offerlab:storage-error')

safeStorage.setDraft('managed-owner-7', 'a', { owner: '7' })
safeStorage.setDraft('managed-owner-8', 'b', { owner: '8' })
localStorage.setItem('post_draft:7:new', '{"legacy":true}')
assert.equal(safeStorage.clearSensitive('7'), 3)
assert.equal(localStorage.getItem('managed-owner-7'), null)
assert.equal(localStorage.getItem('post_draft:7:new'), null)
assert.notEqual(localStorage.getItem('managed-owner-8'), null)

const userProfile = read('src/views/UserProfileView.vue')
assert.match(userProfile, /profileLoadGeneration/)
assert.match(userProfile, /profileLoadController\?\.abort\(\)/)
assert.match(userProfile, /isActiveProfileLoad/)

const postDetail = read('src/views/PostDetailView.vue')
assert.match(postDetail, /postRouteGeneration/)
assert.match(postDetail, /commentLoadGeneration/)
assert.match(postDetail, /signal: controller\.signal/)
assert.match(postDetail, /MAX_COMMENT_NODES = 400/)
assert.match(postDetail, /findRootComment\(rootId\) !== root/)

const search = read('src/views/SearchView.vue')
assert.match(search, /MAX_SEARCH_RESULTS = 100/)
assert.match(search, /uniqueItems\.slice\(0, MAX_SEARCH_RESULTS\)/)

const notifications = read('src/views/NotificationsView.vue')
assert.match(notifications, /MAX_NOTIFICATION_ITEMS = 100/)
assert.match(notifications, /notificationLoadGeneration/)

const authStore = read('src/stores/auth.ts')
assert.match(authStore, /safeStorage\.clearSensitive\(owner\)/)

for (const view of [read('src/views/EditorView.vue'), read('src/views/MockInterviewView.vue')]) {
  assert.match(view, /safeStorage\.setDraft\(/)
  assert.match(view, /safeStorage\.getDraft\(/)
  assert.match(view, /safeStorage\.clearSensitive\(prevOwner\)/)
}
const questionDetail = read('src/views/QuestionDetailView.vue')
assert.match(questionDetail, /safeStorage\.set\(noteDraftKey\.value/)
assert.match(questionDetail, /sensitive: true/)
assert.match(questionDetail, /safeStorage\.getDraft\(/)
assert.match(questionDetail, /safeStorage\.clearSensitive\(prevOwner\)/)

console.log('stability and managed storage tests passed')
