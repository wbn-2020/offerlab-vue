import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const source = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')
const guards = readFileSync(new URL('../src/router/guards.ts', import.meta.url), 'utf8')
const appHeader = readFileSync(new URL('../src/components/layout/AppHeader.vue', import.meta.url), 'utf8')
const editor = readFileSync(new URL('../src/views/EditorView.vue', import.meta.url), 'utf8')
const postDetail = readFileSync(new URL('../src/views/PostDetailView.vue', import.meta.url), 'utf8')
const settings = readFileSync(new URL('../src/views/SettingsView.vue', import.meta.url), 'utf8')
const forbidden = readFileSync(new URL('../src/views/ForbiddenView.vue', import.meta.url), 'utf8')
const mojibakeTitleMarkers = /�|Ã|Â|鏃|鏂|鐭|绀|鍙|鍦|閫|闂|棣|鎼|鍏|缂|鑱|鎶|闈|鍛|妗|\?{3,}/

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

const expectedRouteTitles = {
  '/': '首页',
  '/explore': '发现',
  '/trend': '趋势看板',
  '/search': '搜索',
  '/editor': '发布社区内容',
  '/editor/:id': '编辑社区内容',
  '/questions': '知识库',
  '/questions/:id': '知识卡详情',
  '/companies/:company/prep': '主题学习包',
  '/post/:id': '帖子详情',
  '/collections/:id': '合集详情',
  '/me': '我的主页',
  '/me/prep': '个人学习空间',
  '/mock-interview': '个人练习归档',
  '/growth/profile': '成长档案',
  '/growth/report': '成长周报月报',
  '/knowledge/explore': '知识关系探索',
  '/certification/apply': '认证作者申请',
}

const adminRoles = ['ops', 'questionOperator', 'contentModerator', 'domainModerator', 'admin']
const adminRouteAccess = {
  '/admin': { ops: true, questionOperator: true, contentModerator: true, domainModerator: false, admin: true },
  '/admin/ops': { ops: true, questionOperator: true, contentModerator: true, domainModerator: false, admin: true },
  '/admin/questions': { ops: false, questionOperator: true, contentModerator: false, domainModerator: false, admin: true },
  '/admin/company-aliases': { ops: false, questionOperator: true, contentModerator: false, domainModerator: false, admin: true },
  '/admin/governance': { ops: true, questionOperator: false, contentModerator: true, domainModerator: true, admin: true },
  '/admin/tags': { ops: false, questionOperator: false, contentModerator: true, domainModerator: false, admin: true },
}

const routedAdminPaths = [...source.matchAll(/path:\s*'([^']+)'/g)]
  .map((match) => match[1])
  .filter((path) => path === '/admin' || path.startsWith('/admin/'))
  .sort()

const routeTitles = [...source.matchAll(/title:\s*'([^']*)'/g)].map((match) => match[1])
assert.ok(routeTitles.length >= 20, 'router must declare visible page titles for the main routes')
for (const title of routeTitles) {
  assert.doesNotMatch(title, mojibakeTitleMarkers, `route title must not contain mojibake markers: ${title}`)
  assert.doesNotMatch(title, /\?{2,}/, `route title must not contain placeholder question marks: ${title}`)
}

for (const [path, title] of Object.entries(expectedRouteTitles)) {
  assert.match(routeBlock(path), new RegExp(`title:\\s*'${title}'`), `${path} must keep expected visible route title`)
}

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

{
  const block = routeBlock('/admin/governance')
  assert.match(block, /governanceDomainTabs:\s*\[[^\]]*'featured'[^\]]*'queue'[^\]]*'review'[^\]]*\]/, '/admin/governance must declare domain moderator visible tabs')
  assert.match(block, /governanceGlobalTabs:\s*\[[^\]]*'keywords'[^\]]*'users'[^\]]*'topics'[^\]]*'tags'[^\]]*\]/, '/admin/governance must declare global-only governance tabs')
}

for (const path of ['/editor', '/editor/:id', '/me', '/me/prep', '/mock-interview', '/me/notifications', '/me/settings']) {
  const block = routeBlock(path)
  assert.match(block, /requiresAuth:\s*true/, `${path} must require login`)
}

for (const path of ['/questions', '/companies/:company/prep', '/growth/profile', '/growth/report', '/knowledge/explore', '/mock-interview']) {
  assert.notEqual(routeBlock(path).length, 0, `${path} legacy-compatible route must remain directly reachable`)
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

{
  const block = routeBlock('/collections/:id')
  assert.doesNotMatch(block, /requiresAuth:\s*true/, '/collections/:id must stay public')
  assert.doesNotMatch(block, /adminPermission:/, '/collections/:id must not require admin permissions')
}

for (const label of ['首页', '发现', '知识库', '发布']) {
  assert.match(appHeader, new RegExp(`label:\\s*'${label}'`), `primary navigation must expose ${label}`)
}
for (const label of ['资源库', '题库', '模拟面试', '成长报告']) {
  assert.doesNotMatch(appHeader, new RegExp(`label:\\s*'${label}'`), `core navigation must not expose old tool as top-level item: ${label}`)
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
assert.match(settings, /useThemeStore/, 'settings page must expose the shared theme store')
assert.match(settings, /value: 'theme'/, 'settings page must expose a theme settings tab')
assert.match(settings, /themeStore\.setMode\(option\.value\)/, 'settings page must let users choose light, dark, or system theme')
assert.match(appHeader, /to="\/search"/, 'mobile header menu must expose search')
assert.match(appHeader, /to="\/editor"/, 'mobile header menu must expose publishing')
assert.match(appHeader, /to="\/me\/notifications"/, 'mobile header menu must expose notifications when logged in')
assert.match(appHeader, /authStore\.isLoggedIn \? '\/me' : '\/login'/, 'mobile header menu must expose profile/login entry')

for (const view of ['AboutView.vue', 'NotFoundView.vue', 'UserProfileView.vue', 'SettingsView.vue', 'NotificationsView.vue', 'TrendDashboardView.vue', 'EditorView.vue', 'ForbiddenView.vue']) {
  const viewSource = readFileSync(new URL(`../src/views/${view}`, import.meta.url), 'utf8')
  assert.match(viewSource, /<AppHeader\s*\/>/, `${view} must render AppHeader`)
  assert.match(viewSource, /@\/components\/layout\/AppHeader\.vue/, `${view} must import AppHeader`)
}

assert.match(editor, /safeReturnPath/, 'EditorView must resolve a safe return route')
assert.match(editor, /route\.query\.from/, 'EditorView must honor a same-site route query return target')
assert.match(editor, /window\.history\.state/, 'EditorView must consider Vue history state return targets')
assert.match(editor, /document\.referrer/, 'EditorView must consider same-origin document referrer')
assert.match(editor, /window\.location\.origin/, 'EditorView must reject cross-origin return targets')
assert.doesNotMatch(editor, /router\.back\(\)/, 'EditorView must not call router.back() blindly')
assert.doesNotMatch(editor, /Number\(route\.params\.id\)/, 'EditorView must preserve long post ids as strings')
assert.match(editor, /只能编辑本人发布的内容/, 'EditorView must explain non-owner edit attempts')
assert.match(editor, /isForbiddenEdit/, 'EditorView must keep a visible forbidden-edit state')
assert.match(editor, /当前账号不是这篇帖子的作者/, 'EditorView must explain why a non-owner edit is blocked')
assert.match(editor, /code === 10403 \|\| code === 403/, 'EditorView must treat both business and HTTP forbidden errors as blocked edits')
assert.match(editor, /String\(post\.author\?\.uid[\s\S]*redirectForbiddenEdit\(\)/, 'EditorView must show the forbidden edit state for non-owner posts')
assert.match(editor, /isForbiddenEdit\.value = true/, 'EditorView forbidden redirect must stay on a visible explanation state')

assert.match(postDetail, /const showStageTwoDetailPanels = false/, 'post detail must keep stage-2 detail panels hidden during stage 1')
assert.match(postDetail, /showStageTwoDetailPanels &&/, 'post detail knowledge and material panels must be gated off during stage 1')
assert.match(postDetail, /applyPageSeo/, 'post detail must own minimal SEO metadata updates')

assert.match(forbidden, /useAuthStore/, 'ForbiddenView must distinguish unauthenticated users from logged-in users without enough permission')
assert.match(forbidden, /path: '\/login'[\s\S]*redirect: fromPath/, 'ForbiddenView must offer login with the blocked path preserved')
assert.match(forbidden, /switchAccount: '1'/, 'ForbiddenView must offer a switch-account recovery path')
assert.match(forbidden, /permission_check_failed/, 'ForbiddenView must explain temporary permission-check failures')
assert.match(forbidden, /adminRecoveryPath/, 'ForbiddenView must route admins back to a likely accessible admin entry')
assert.match(forbidden, /safeRedirect\(route\.query\.from, '\/admin'\)/, 'ForbiddenView must sanitize the blocked source path')
assert.match(forbidden, /当前账号缺少对应角色/, 'ForbiddenView must explain post-login permission failures')

assert.match(guards, /applyPageSeo/, 'router guards must delegate title/meta updates to the SEO helper')
assert.match(guards, /reason: 'permission_check_failed'/, 'router guard must mark permission API failures distinctly from missing roles')

console.log('route meta guard passed')
