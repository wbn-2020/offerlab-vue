import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { visualSnapshotRoutes, visualSnapshotViewports } from './visual-snapshot-routes.mjs'

const packageJson = readFileSync(new URL('../package.json', import.meta.url), 'utf8')
const runner = readFileSync(new URL('./visual-snapshot-routes.mjs', import.meta.url), 'utf8')

const requiredRoutes = ['/', '/explore', '/search', '/questions', '/editor', '/me', '/mock-interview', '/admin/ops', '/admin/governance']
const routePaths = visualSnapshotRoutes.map((item) => item.path.split('?')[0])
for (const route of requiredRoutes) {
  assert.ok(routePaths.includes(route), `visual snapshot route missing: ${route}`)
}

assert.ok(visualSnapshotViewports.some((item) => item.name === 'desktop' && item.width >= 1280), 'visual snapshots must include a desktop viewport')
assert.ok(visualSnapshotViewports.some((item) => item.name === 'mobile-390' && item.width === 390), 'visual snapshots must include the 390px mobile viewport')
for (const route of visualSnapshotRoutes.filter((item) => ['/editor', '/me', '/mock-interview'].includes(item.path))) {
  assert.equal(route.auth, 'user', `${route.path} visual snapshot must require a logged-in community user token`)
}
for (const route of visualSnapshotRoutes.filter((item) => item.path.startsWith('/admin/'))) {
  assert.equal(route.auth, 'admin', `${route.path} visual snapshot must require an admin token`)
}
assert.match(runner, /page\.screenshot\(/, 'visual snapshot runner must capture screenshots')
assert.match(runner, /summary\.json/, 'visual snapshot runner must write a machine-readable summary')
assert.match(runner, /horizontalOverflow/, 'visual snapshot runner must detect horizontal overflow')
assert.match(runner, /bodyChars < 20/, 'visual snapshot runner must fail blank or near-blank pages')
assert.match(runner, /OFFERLAB_VISUAL_THEME/, 'visual snapshot runner must allow explicit light/dark theme selection')
assert.match(runner, /window\.localStorage\.setItem\('theme', theme\)/, 'visual snapshot runner must inject the selected app theme before route load')
assert.match(runner, /darkMode/, 'visual snapshot runner must record whether html.dark is active')
assert.match(runner, /keyComponentFailures/, 'visual snapshot runner must fail key dark-mode component regressions')
assert.match(runner, /mojibakeHits/, 'visual snapshot runner must catch visible mojibake regressions')
assert.match(runner, /\.metric-value/, 'visual snapshot runner must check home metric value contrast')
assert.match(runner, /\.recommended-user-card/, 'visual snapshot runner must check recommended user card surfaces')
assert.match(runner, /\.topic-count/, 'visual snapshot runner must check topic count badge surfaces')
assert.match(runner, /\.governance-page \.panel/, 'visual snapshot runner must check governance panel surfaces')
assert.match(runner, /\.governance-page \.review-metric/, 'visual snapshot runner must check governance review metric surfaces')
assert.match(runner, /offerlab\.auth\.token/, 'visual snapshot runner must inject the session auth token used by the app')
assert.match(runner, /OFFERLAB_VISUAL_USER_TOKEN/, 'visual snapshot runner must document the user-token environment variable')
assert.match(runner, /OFFERLAB_VISUAL_ADMIN_TOKEN/, 'visual snapshot runner must document the admin-token environment variable')
assert.match(runner, /OFFERLAB_VISUAL_FIXTURE_API/, 'visual snapshot runner must support explicit fixture API mode for offline route captures')
assert.match(runner, /context\.route\('\*\*\/api\/v1\/\*\*'/, 'fixture visual snapshots must intercept app API calls inside Playwright')
assert.match(runner, /\/api\/v1\/users\/me/, 'fixture visual snapshots must keep authenticated routes hydrated')
assert.match(runner, /\/api\/v1\/ops\/me\/permissions/, 'fixture visual snapshots must keep admin route permission guards hydrated')
assert.match(runner, /missingAuth/, 'visual snapshot runner must fail protected route captures when tokens are missing')
assert.match(runner, /unexpectedRoute/, 'visual snapshot runner must fail when protected routes redirect to login or forbidden pages')
assert.match(runner, /waitForLoadState\('networkidle'[\s\S]*catch/, 'visual snapshot runner must tolerate long-polling pages after DOM load')
assert.match(runner, /Playwright is not installed/, 'visual snapshot runner must explain the missing dependency clearly')
assert.match(runner, /OFFERLAB_PLAYWRIGHT_MODULE_DIR/, 'visual snapshot runner must support a preinstalled local Playwright module directory')
assert.match(runner, /bundledPlaywright\.default \|\| bundledPlaywright/, 'visual snapshot runner must support CommonJS Playwright fallback exports')
assert.match(runner, /OFFERLAB_PLAYWRIGHT_EXECUTABLE_PATH/, 'visual snapshot runner must support an explicit local browser executable path')
assert.match(runner, /C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome\.exe/, 'visual snapshot runner must fall back to locally installed Chrome on Windows')
assert.match(runner, /C:\\\\Program Files \(x86\)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge\.exe/, 'visual snapshot runner must fall back to locally installed Edge on Windows')
assert.match(packageJson, /"playwright": "\^1\.60\.0"/, 'package devDependencies must declare Playwright for screenshot evidence')
assert.match(packageJson, /"test:visual-snapshots": "node scripts\/visual-snapshot-routes\.mjs"/, 'package scripts must expose visual snapshots')
assert.match(packageJson, /"verify:visual": "npm run test:visual-snapshots"/, 'package scripts must expose a real visual verification entry')
assert.match(packageJson, /npm run test:visual-snapshot-config/, 'test:guards must include the visual snapshot config guard')

console.log('visual snapshot config guard passed')
