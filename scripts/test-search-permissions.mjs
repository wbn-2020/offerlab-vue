import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const source = readFileSync(new URL('../src/views/SearchView.vue', import.meta.url), 'utf8')

assert.match(source, /opsApi\.myPermissions\(\{\s*skipAuthRedirect:\s*true\s*\}\)/, 'SearchView must load admin permissions without breaking public search')
assert.match(source, /if\s*\(!authStore\.token\)\s*\{[^}]*adminPermissions\.value\s*=\s*null/s, 'public SearchView must skip admin permission lookup for guests')
assert.match(source, /authStore\.token\s*\?\s*loadAdminPermissions\(\)\s*:\s*Promise\.resolve\(\)/, 'SearchView mounted hook must not call admin permissions for guests')
assert.match(source, /hasAdminPermission\(adminPermissions\.value,\s*'admin'\)/, 'index rebuild action must require admin permission')
assert.doesNotMatch(source, /canRebuildIndex\s*=\s*computed\([^)]*localStorage\.getItem\(['"]token['"]\)/s, 'index rebuild action must not be shown from token presence alone')
assert.match(source, /if\s*\(!canRebuildIndex\.value\)/, 'rebuildIndex must defensively reject unauthorized calls')

console.log('search permission guard passed')
