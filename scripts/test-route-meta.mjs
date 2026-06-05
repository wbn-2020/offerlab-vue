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

function adminPermissionsFor(path) {
  const block = routeBlock(path)
  const match = block.match(/adminPermission:\s*(\[[^\]]+\]|'[^']+')/)
  assert.ok(match, `${path} must declare adminPermission`)
  return [...match[1].matchAll(/'([^']+)'/g)].map((permission) => permission[1])
}

const adminRoles = ['ops', 'questionOperator', 'contentModerator', 'admin']
const adminRouteAccess = {
  '/admin/ops': { ops: true, questionOperator: true, contentModerator: true, admin: true },
  '/admin/questions': { ops: false, questionOperator: true, contentModerator: false, admin: true },
  '/admin/company-aliases': { ops: false, questionOperator: true, contentModerator: false, admin: true },
  '/admin/governance': { ops: true, questionOperator: false, contentModerator: true, admin: true },
}

const routedAdminPaths = [...source.matchAll(/path:\s*'([^']+)'/g)]
  .map((match) => match[1])
  .filter((path) => path.startsWith('/admin/'))
  .sort()

assert.deepEqual(routedAdminPaths, Object.keys(adminRouteAccess).sort(), 'every admin route must be covered by the access matrix')

for (const [path, expectedAccess] of Object.entries(adminRouteAccess)) {
  const block = routeBlock(path)
  assert.match(block, /requiresAuth:\s*true/, `${path} must require login`)
  const allowedRoles = adminPermissionsFor(path)
  assert.deepEqual(
    Object.fromEntries(adminRoles.map((role) => [role, allowedRoles.includes(role)])),
    expectedAccess,
    `${path} must keep the expected admin role access matrix`,
  )
}

for (const path of ['/editor', '/editor/:id', '/me', '/me/prep', '/me/notifications', '/me/settings']) {
  const block = routeBlock(path)
  assert.match(block, /requiresAuth:\s*true/, `${path} must require login`)
}

{
  const block = routeBlock('/403')
  assert.doesNotMatch(block, /requiresAuth:\s*true/, '/403 must stay directly readable so unauthenticated users see a clear permission explanation')
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
assert.match(appHeader, /\.mobile-nav-link[\s\S]*background:\s*rgb\(248 250 252\)/, 'mobile navigation links must look enabled in light mode')
assert.match(appHeader, /\.mobile-nav-link[\s\S]*color:\s*rgb\(30 41 59\)/, 'mobile navigation links must keep readable light-mode text')
assert.match(appHeader, /themeStore\.isDark\(\) \? 'mobile-nav-link-dark'/, 'mobile navigation links must apply readable dark-mode classes directly')
assert.match(appHeader, /themeStore\.isDark\(\) \? 'mobile-quick-action-dark'/, 'mobile quick actions must apply readable dark-mode classes directly')
assert.match(appHeader, /\.mobile-nav-link-dark[\s\S]*background:\s*rgb\(15 23 42\)/, 'mobile navigation links must not become transparent in dark mode')
assert.match(appHeader, /\.mobile-nav-link-dark[\s\S]*color:\s*rgb\(203 213 225\)/, 'mobile navigation links must keep readable dark-mode text')
assert.match(appHeader, /\.mobile-nav-link-active\.mobile-nav-link-dark[\s\S]*color:\s*rgb\(191 219 254\)/, 'active mobile navigation must keep a distinct dark-mode highlight')
assert.match(appHeader, /to="\/search"/, 'mobile header menu must expose search')
assert.match(appHeader, /to="\/editor"/, 'mobile header menu must expose publishing')
assert.match(appHeader, /to="\/me\/notifications"/, 'mobile header menu must expose notifications when logged in')
assert.match(appHeader, /authStore\.isLoggedIn \? '\/me' : '\/login'/, 'mobile header menu must expose profile/login entry')

for (const view of ['AboutView.vue', 'NotFoundView.vue', 'UserProfileView.vue', 'SettingsView.vue', 'NotificationsView.vue', 'TrendDashboardView.vue', 'EditorView.vue', 'ForbiddenView.vue']) {
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
assert.match(editor, /code === 10403 \|\| code === 403/, 'EditorView must treat both business and HTTP forbidden errors as blocked edits')
assert.match(editor, /String\(post\.author\?\.uid[\s\S]*redirectForbiddenEdit\(\)/, 'EditorView must show the forbidden edit state for non-owner posts')
assert.match(editor, /isForbiddenEdit\.value = true/, 'EditorView forbidden redirect must stay on a visible explanation state')

const forbidden = readFileSync(new URL('../src/views/ForbiddenView.vue', import.meta.url), 'utf8')
assert.match(forbidden, /useAuthStore/, 'ForbiddenView must distinguish unauthenticated users from logged-in users without enough permission')
assert.match(forbidden, /path: '\/login'[\s\S]*redirect: fromPath/, 'ForbiddenView must offer login with the blocked path preserved')
assert.match(forbidden, /当前账号缺少对应角色/, 'ForbiddenView must explain post-login permission failures')

console.log('route meta guard passed')
