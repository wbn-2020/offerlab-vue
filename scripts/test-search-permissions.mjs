import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const searchView = read('../src/views/SearchView.vue')
const opsView = read('../src/views/OpsView.vue')

const functionBody = (source, name) => {
  const start = source.indexOf(`const ${name} = async`)
  assert.notEqual(start, -1, `${name} must exist`)
  const next = source.indexOf('\nconst ', start + 1)
  return source.slice(start, next === -1 ? source.length : next)
}

assert.doesNotMatch(searchView, /opsApi\.myPermissions|canRebuildIndex|rebuildIndex|重建索引/, 'public SearchView must not expose search index rebuild controls')
assert.doesNotMatch(searchView, /searchApi\.rebuildIndex\(\)/, 'public SearchView must never call the admin rebuild API')

assert.match(opsView, /<RiskConfirmDialog[\s\S]*:state="riskConfirmState"/, 'OpsView must render structured risk confirmation')
assert.match(opsView, /const canOps = computed\(\(\) => Boolean\(permissions\.value\?\.ops \|\| permissions\.value\?\.admin\)\)/, 'OpsView rebuild controls must require ops or admin permission')

const submitRebuild = functionBody(opsView, 'submitRebuild')
const confirmIndex = submitRebuild.indexOf('requireRiskConfirm')
const rebuildIndex = submitRebuild.indexOf('searchApi.rebuildIndex(note)')
assert.ok(confirmIndex >= 0, 'search index rebuild must request risk confirmation')
assert.ok(rebuildIndex >= 0, 'search index rebuild must still call the backend rebuild API')
assert.ok(confirmIndex < rebuildIndex, 'search index rebuild must confirm before calling the backend API')

console.log('search permission guard passed')
