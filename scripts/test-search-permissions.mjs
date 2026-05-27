import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const source = readFileSync(new URL('../src/views/SearchView.vue', import.meta.url), 'utf8')

assert.match(source, /opsApi\.myPermissions\(\)/, 'SearchView must load admin permissions from backend')
assert.match(source, /hasAdminPermission\(adminPermissions\.value,\s*\['ops',\s*'admin'\]\)/, 'index rebuild action must require ops or admin permission')
assert.doesNotMatch(source, /canRebuildIndex\s*=\s*computed\([^)]*localStorage\.getItem\(['"]token['"]\)/s, 'index rebuild action must not be shown from token presence alone')
assert.match(source, /if\s*\(!canRebuildIndex\.value\)/, 'rebuildIndex must defensively reject unauthorized calls')

console.log('search permission guard passed')
