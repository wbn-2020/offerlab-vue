import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const source = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')
const appHeader = readFileSync(new URL('../src/components/layout/AppHeader.vue', import.meta.url), 'utf8')
const editor = readFileSync(new URL('../src/views/EditorView.vue', import.meta.url), 'utf8')

function routeBlock(path) {
  const marker = `path: '${path}'`
  const start = source.indexOf(marker)
  assert.notEqual(start, -1, `route not found: ${path}`)
  const nextRoute = source.indexOf('\n  {\n    path:', start + marker.length)
  return source.slice(start, nextRoute === -1 ? source.indexOf('\n]', start) : nextRoute)
}

for (const path of ['/admin/ops', '/admin/questions', '/admin/company-aliases', '/admin/governance']) {
  const block = routeBlock(path)
  assert.match(block, /requiresAuth:\s*true/, `${path} must require login`)
  assert.match(block, /adminPermission:/, `${path} must declare adminPermission`)
}

for (const path of ['/editor', '/editor/:id', '/me', '/me/prep', '/me/notifications', '/me/settings', '/403']) {
  const block = routeBlock(path)
  assert.match(block, /requiresAuth:\s*true/, `${path} must require login`)
}

for (const path of ['/login', '/register']) {
  const block = routeBlock(path)
  assert.doesNotMatch(block, /requiresAuth:\s*true/, `${path} must stay public`)
  assert.doesNotMatch(block, /adminPermission:/, `${path} must not require admin permissions`)
}

for (const label of ['信息流', '发现', '题库', '模拟面试']) {
  assert.match(appHeader, new RegExp(label), `mobile/desktop navigation must expose ${label}`)
}

assert.match(appHeader, /showMobileMenu/, 'AppHeader must keep a mobile menu state')
assert.match(appHeader, /aria-controls="mobile-main-nav"/, 'mobile menu toggle must target the mobile navigation panel')
assert.match(appHeader, /data-mobile-backdrop/, 'mobile menu must render a backdrop to separate it from page content')
assert.match(appHeader, /mobile-menu-panel/, 'mobile menu must render as a layered panel instead of pushing page content')
assert.match(appHeader, /to="\/search"/, 'mobile header menu must expose search')
assert.match(appHeader, /to="\/editor"/, 'mobile header menu must expose publishing')
assert.match(appHeader, /to="\/me\/notifications"/, 'mobile header menu must expose notifications when logged in')
assert.match(appHeader, /authStore\.isLoggedIn \? '\/me' : '\/login'/, 'mobile header menu must expose profile/login entry')

for (const view of ['AboutView.vue', 'NotFoundView.vue', 'UserProfileView.vue', 'SettingsView.vue', 'NotificationsView.vue', 'TrendDashboardView.vue', 'EditorView.vue']) {
  const viewSource = readFileSync(new URL(`../src/views/${view}`, import.meta.url), 'utf8')
  assert.match(viewSource, /<AppHeader\s*\/>/, `${view} must render AppHeader`)
  assert.match(viewSource, /@\/components\/layout\/AppHeader\.vue/, `${view} must import AppHeader`)
}

assert.doesNotMatch(editor, /router\.back\(\)/, 'EditorView must not call router.back() blindly')
assert.match(editor, /safeReturnPath/, 'EditorView must resolve a safe return route')
assert.match(editor, /route\.query\.from/, 'EditorView must honor a same-site route query return target')
assert.match(editor, /window\.history\.state/, 'EditorView must consider Vue history state return targets')
assert.match(editor, /document\.referrer/, 'EditorView must consider same-origin document referrer')
assert.match(editor, /window\.location\.origin/, 'EditorView must reject cross-origin return targets')
assert.doesNotMatch(editor, /Number\(route\.params\.id\)/, 'EditorView must preserve long post ids as strings')
assert.match(editor, /只能编辑本人发布的内容/, 'EditorView must explain non-owner edit attempts')
assert.match(editor, /isForbiddenEdit/, 'EditorView must keep a visible forbidden-edit state')
assert.match(editor, /当前账号不是这篇帖子的作者/, 'EditorView must explain why a non-owner edit is blocked')

console.log('route meta guard passed')
