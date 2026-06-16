import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const userApi = readFileSync(new URL('../src/api/user.ts', import.meta.url), 'utf8')
const metrics = readFileSync(new URL('../src/utils/communityMetrics.ts', import.meta.url), 'utf8')
const userProfile = readFileSync(new URL('../src/views/UserProfileView.vue', import.meta.url), 'utf8')
const meProfile = readFileSync(new URL('../src/views/MeProfileView.vue', import.meta.url), 'utf8')
const packageJson = readFileSync(new URL('../package.json', import.meta.url), 'utf8')

assert.match(metrics, /source\?:\s*string/, 'ContributionSummary must expose data source')
assert.match(metrics, /estimated\?:\s*boolean/, 'ContributionSummary must expose estimated marker')
assert.match(userApi, /export\s+interface\s+UserContribution/, 'user API must type backend contribution summary')
assert.match(userApi, /getContribution:\s*async/, 'user API must expose author contribution endpoint')
assert.match(userApi, /\/api\/v1\/users\/\$\{uid\}\/contribution/, 'author contribution endpoint path must be wired')
assert.match(userApi, /getMyContribution:\s*async/, 'user API must expose current user contribution endpoint')
assert.match(userApi, /\/api\/v1\/users\/me\/contribution/, 'current user contribution endpoint path must be wired')

for (const [name, source] of [['UserProfileView', userProfile], ['MeProfileView', meProfile]]) {
  assert.match(source, /backendContribution/, `${name} must store backend contribution`)
  assert.match(source, /buildContributionSummary/, `${name} must keep frontend estimation fallback`)
  assert.match(source, /source:\s*'frontend_estimate'/, `${name} fallback must label frontend estimate source`)
  assert.match(source, /contributionSourceText/, `${name} must show contribution data source`)
  assert.match(source, /backend_aggregate/, `${name} must recognize backend aggregate source`)
}

assert.match(packageJson, /"test:contribution-summary"/, 'package scripts must expose contribution summary guard')
assert.match(packageJson, /npm run test:contribution-summary/, 'test:guards must include contribution summary guard')

console.log('contribution summary frontend guard passed')
