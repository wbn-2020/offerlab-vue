import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import assert from 'node:assert/strict'

const source = fs.readFileSync(new URL('../src/utils/adminPermissions.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
})

const sandbox = { exports: {} }
vm.runInNewContext(compiled.outputText, sandbox)

const {
  adminPermissionRequirementText,
  createAdminPermissionCache,
  hasAdminPermission,
  isPermissionDeniedError,
} = sandbox.exports

const admin = { admin: true, ops: false, contentModerator: false, questionOperator: false }
const ops = { admin: false, ops: true, contentModerator: false, questionOperator: false }
const moderator = { admin: false, ops: false, contentModerator: true, questionOperator: false }

assert.equal(hasAdminPermission(null, 'ops'), false)
assert.equal(hasAdminPermission(ops, 'ops'), true)
assert.equal(hasAdminPermission(ops, 'questionOperator'), false)
assert.equal(hasAdminPermission(admin, ['ops', 'admin']), true)
assert.equal(hasAdminPermission(moderator, ['ops', 'contentModerator']), true)
assert.equal(adminPermissionRequirementText(['ops', 'contentModerator']), '运维管理员 / 内容审核员')

let now = 1000
let fetchCount = 0
const permissionResponses = [
  { admin: true, ops: false, contentModerator: false, domainModerator: false, questionOperator: false },
  { admin: false, ops: false, contentModerator: false, domainModerator: false, questionOperator: false },
]
const cache = createAdminPermissionCache(async () => {
  fetchCount += 1
  return permissionResponses.shift()
}, { ttlMs: 30_000, now: () => now })

assert.equal((await cache.getAdminPermissions('token-a')).admin, true)
assert.equal((await cache.getAdminPermissions('token-a')).admin, true)
assert.equal(fetchCount, 1, 'permission cache should reuse permissions within the TTL')

cache.invalidateAdminPermissions('token-a')
assert.equal((await cache.getAdminPermissions('token-a')).admin, false)
assert.equal(fetchCount, 2, 'explicit invalidation must force the next permission fetch')

let denyNextFetch = false
let refreshCount = 0
const refreshCache = createAdminPermissionCache(async () => {
  refreshCount += 1
  if (denyNextFetch) throw { response: { status: 403 } }
  return { admin: true, ops: false, contentModerator: false, domainModerator: false, questionOperator: false }
}, { ttlMs: 30_000, now: () => now })

await refreshCache.getAdminPermissions('token-b')
denyNextFetch = true
await assert.rejects(
  () => refreshCache.getAdminPermissions('token-b', { force: true }),
  (error) => error?.response?.status === 403,
)
denyNextFetch = false
await refreshCache.getAdminPermissions('token-b')
assert.equal(refreshCount, 3, '403 permission refresh failures must clear stale cached admin permissions')

assert.equal(isPermissionDeniedError({ code: 10403 }), true)
assert.equal(isPermissionDeniedError({ response: { status: 403 } }), true)
assert.equal(isPermissionDeniedError({ response: { status: 500 } }), false)

console.log('admin permission tests passed')
