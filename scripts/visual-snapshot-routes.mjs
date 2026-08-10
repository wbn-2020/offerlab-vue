import { pathToFileURL } from 'node:url'

const runtimeProcess = globalThis.process
const baseUrl = runtimeProcess?.env?.OFFERLAB_VISUAL_BASE_URL || 'http://127.0.0.1:5173'
const outputDir = runtimeProcess?.env?.OFFERLAB_VISUAL_OUTPUT_DIR || 'visual-snapshots'
const useFixtureApi = runtimeProcess?.env?.OFFERLAB_VISUAL_FIXTURE_API === '1'
const visualReadyTimeoutMs = Math.max(5000, Number(runtimeProcess?.env?.OFFERLAB_VISUAL_READY_TIMEOUT_MS) || 20000)
const visualTheme = ['light', 'dark', 'auto'].includes(runtimeProcess?.env?.OFFERLAB_VISUAL_THEME)
  ? runtimeProcess.env.OFFERLAB_VISUAL_THEME
  : 'dark'
const browserExecutableCandidates = [
  runtimeProcess?.env?.OFFERLAB_PLAYWRIGHT_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Users\\Administrator\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Users\\Administrator\\AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean)
const authStorageKey = 'offerlab.auth.token'
const visualSnapshotAuth = {
  user: runtimeProcess?.env?.OFFERLAB_VISUAL_USER_TOKEN || runtimeProcess?.env?.OFFERLAB_VISUAL_AUTH_TOKEN || (useFixtureApi ? 'visual-fixture-user-token' : ''),
  admin: runtimeProcess?.env?.OFFERLAB_VISUAL_ADMIN_TOKEN || runtimeProcess?.env?.OFFERLAB_VISUAL_AUTH_TOKEN || (useFixtureApi ? 'visual-fixture-admin-token' : ''),
}

export const visualSnapshotRoutes = [
  { name: 'home', path: '/' },
  { name: 'post-detail', path: '/post/1' },
  { name: 'explore', path: '/explore' },
  { name: 'search', path: '/search?q=周报' },
  { name: 'trend', path: '/trend' },
  { name: 'questions', path: '/questions' },
  { name: 'question-detail', path: '/questions/1' },
  { name: 'company-prep-disabled', path: '/companies/example/prep', expectedPath: '/questions' },
  { name: 'editor', path: '/editor', auth: 'user' },
  { name: 'me', path: '/me', auth: 'user' },
  { name: 'creator-workbench', path: '/me/creator', auth: 'user' },
  { name: 'user-profile', path: '/u/10001' },
  { name: 'tag-detail', path: '/tag/weekly-report' },
  { name: 'topic-detail', path: '/topics/weekly-review' },
  { name: 'collection-detail', path: '/collections/1' },
  { name: 'favorite-folder-detail', path: '/favorite-folders/1' },
  { name: 'collaboration', path: '/collaboration' },
  { name: 'collaboration-need', path: '/collaboration/needs/1' },
  { name: 'collaboration-series', path: '/collaboration/series/1' },
  { name: 'collaboration-activity', path: '/collaboration/activities/1' },
  { name: 'collaboration-discussion', path: '/collaboration/discussions/1' },
  { name: 'collaboration-office-hour', path: '/collaboration/office-hours/1' },
  { name: 'series-workbench', path: '/series/workbench', auth: 'user' },
  { name: 'growth-profile', path: '/growth/profile', auth: 'user' },
  { name: 'growth-report', path: '/growth/report', auth: 'user' },
  { name: 'community-growth', path: '/growth/community', auth: 'user' },
  { name: 'knowledge-explore', path: '/knowledge/explore' },
  { name: 'certification-apply', path: '/certification/apply', auth: 'user' },
  { name: 'public-collaboration-contributions', path: '/u/10001/contributions' },
  { name: 'knowledge-maintenance', path: '/me/knowledge', auth: 'user' },
  { name: 'relationship-workspace', path: '/me/relationships', auth: 'user' },
  { name: 'collaboration-action-center', path: '/me/collaboration', auth: 'user' },
  { name: 'my-collaboration-contributions', path: '/me/collaboration/contributions', auth: 'user' },
  { name: 'contact-requests', path: '/me/contact-requests', auth: 'user' },
  { name: 'maintenance-tasks', path: '/me/maintenance', auth: 'user' },
  { name: 'governance-todos', path: '/me/governance-todos', auth: 'user' },
  { name: 'me-prep-disabled', path: '/me/prep', expectedPath: '/questions', auth: 'user' },
  { name: 'mock-interview-disabled', path: '/mock-interview', expectedPath: '/questions', auth: 'user' },
  { name: 'notifications', path: '/me/notifications', auth: 'user' },
  { name: 'my-reports', path: '/me/reports', auth: 'user' },
  { name: 'my-report-detail', path: '/me/reports/post/1', auth: 'user' },
  { name: 'settings', path: '/me/settings', auth: 'user' },
  { name: 'welcome', path: '/welcome', auth: 'user', onboarding: true },
  { name: 'about', path: '/about' },
  { name: 'forbidden', path: '/403' },
  { name: 'not-found', path: '/missing-ui-rebuild-route' },
  { name: 'admin-ops', path: '/admin/ops', auth: 'admin' },
  { name: 'admin-governance', path: '/admin/governance', auth: 'admin' },
]

export const visualSnapshotViewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile-390', width: 390, height: 900 },
]

const safeName = (value) => value.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
const routeExpectedPath = (route) => route.expectedPath || new URL(route.path, baseUrl).pathname
const routeAuthToken = (route) => route.auth ? visualSnapshotAuth[route.auth] : ''
const ok = (data) => ({ code: 0, message: 'visual fixture', data })
const page = (items = []) => ({ items, hasMore: false, total: items.length })

function fixtureDataFor(requestUrl) {
  const url = new URL(requestUrl)
  const path = url.pathname
  const now = Date.now()
  const detailPost = {
    postId: 1,
    postType: 1,
    domain: 2,
    title: '入职三个月，我把周报写成了可复用的工作档案',
    summary: '把目标、动作、证据和下周计划写成可复用的工作档案，方便协作与复盘。',
    content: [
      '## 为什么周报总是写成流水账',
      '',
      '刚开始时，我的周报只记录开会、跟需求和修问题。回头看时，自己和协作方都难以判断一件事到底推进到了哪里。',
      '',
      '后来我把周报固定成一份能被复用的工作档案：**目标、动作、证据、下周赌注**。',
      '',
      '## 四段式模板',
      '',
      '- **目标**：本周要推进或验证的一件事，尽量能判断是否完成。',
      '- **动作**：实际做了什么，用动词开头，避免只写“参与了”。',
      '- **证据**：链接、数据、截图或结论，让协作方不用继续追问。',
      '- **下周赌注**：下一周最想赌赢的一件事，以及需要的支持。',
      '',
      '## 三个踩坑',
      '',
      '目标写得太多、证据只有“沟通中”、下周计划只是需求列表，都会让周报重新变回流水账。',
    ].join('\n'),
    tags: [
      { id: 101, name: '周报', slug: 'weekly-report' },
      { id: 102, name: '新人上手', slug: 'newcomer' },
      { id: 103, name: '复盘模板', slug: 'retrospective-template' },
    ],
    author: {
      uid: 10001,
      nickname: '周可',
      avatar: '',
      signature: '写职场里可复用的小方法',
      followerCount: 1200,
      postCount: 36,
      profileVisible: true,
    },
    counter: { view: 1680, like: 128, comment: 23, favorite: 46 },
    myInteraction: { liked: false, favorited: false },
    visibility: 'PUBLIC',
    postStatus: 'PUBLISHED',
    status: 'PUBLISHED',
    createdAt: now - (2 * 60 * 60 * 1000),
    updatedAt: now - (2 * 60 * 60 * 1000),
  }
  const searchPosts = [
    {
      ...detailPost,
      postType: 15,
      highlightTitle: '入职三个月，我把<em>周报</em>写成了可复用的工作档案',
      highlightSummary: '以前写<em>周报</em>是交差，后来改成目标、动作、证据和下周计划四段。',
    },
    {
      ...detailPost,
      postId: 2,
      postType: 16,
      title: '团队周报没人看，问题可能不在格式',
      summary: '周报到底应该服务于同步、决策还是绩效记录？不同团队对有用的判断并不一样。',
      content: '周报真正的问题往往不是模板，而是团队没有先约定谁读、读完要做什么，以及哪些信息值得长期保留。',
      highlightTitle: '团队<em>周报</em>没人看，问题可能不在格式',
      highlightSummary: '<em>周报</em>到底应该服务于同步、决策还是绩效记录？',
      tags: [
        { id: 104, name: '团队协作', slug: 'team-collaboration' },
        { id: 105, name: '管理沟通', slug: 'management-communication' },
      ],
      author: {
        ...detailPost.author,
        uid: 10002,
        nickname: '苏晚',
        signature: '记录团队协作里的真实问题',
        followerCount: 860,
        postCount: 18,
      },
      counter: { view: 1320, like: 96, comment: 31, favorite: 22 },
      createdAt: now - (26 * 60 * 60 * 1000),
      updatedAt: now - (26 * 60 * 60 * 1000),
    },
    {
      ...detailPost,
      postId: 3,
      postType: 14,
      title: '我用一个轻量模板，减少了写周报的重复劳动',
      summary: '把固定字段、证据链接和下周计划拆开，保留真正需要思考的部分。',
      content: '这个模板不自动生成内容，只负责把固定字段和证据入口放在一起，让每次更新只处理真正变化的部分。',
      highlightTitle: '我用一个轻量模板，减少了写<em>周报</em>的重复劳动',
      highlightSummary: '把固定字段、证据链接和下周计划拆开，减少写<em>周报</em>的重复劳动。',
      tags: [
        { id: 106, name: '效率工具', slug: 'productivity-tools' },
        { id: 107, name: '模板', slug: 'template' },
      ],
      author: {
        ...detailPost.author,
        uid: 10003,
        nickname: '陈予',
        signature: '分享克制、可复用的效率工具',
        followerCount: 640,
        postCount: 24,
      },
      counter: { view: 980, like: 74, comment: 16, favorite: 39 },
      createdAt: now - (3 * 24 * 60 * 60 * 1000),
      updatedAt: now - (3 * 24 * 60 * 60 * 1000),
    },
  ]
  const user = {
    uid: 900001,
    email: 'offerlab-visual@example.com',
    nickname: '视觉验收账号',
    avatar: '',
    signature: '用于截图验收的技术社区账号',
    createdAt: now,
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    profileVisible: true,
    intentVisible: true,
  }

  if (path === '/api/v1/health/readiness') {
    return { status: 'UP', components: { db: { status: 'UP' }, redis: { status: 'UP' }, kafka: { status: 'UP' }, elasticsearch: { status: 'UP' } } }
  }
  if (path === '/api/v1/users/me') return ok(user)
  if (path === '/api/v1/users/me/contribution') {
    return ok({ score: 0, level: 'L1', badge: '技术社区新成员', featuredCount: 0, likeCount: 0, favoriteCount: 0, commentCount: 0, source: 'visual_fixture', estimated: true })
  }
  if (path === '/api/v1/ops/me/permissions') {
    return ok({ uid: user.uid, adminMode: 'RBAC', admin: true, ops: true, contentModerator: true, questionOperator: true, localOpen: false })
  }
  if (path === '/api/v1/ops/status') {
    return ok({
      adminWhitelistEnabled: true,
      adminRoleEnabled: true,
      adminMode: 'RBAC',
      search: { available: true, degraded: false, message: 'visual fixture ready' },
      searchIndexRetry: { status: 'ready', available: true, attentionRequired: false, byStatus: { pending: 0, done: 0, failed: 0, running: 0 }, duePending: 0 },
      notificationRetry: { status: 'ready', available: true, attentionRequired: false, byStatus: { pending: 0, done: 0, failed: 0, running: 0 }, duePending: 0 },
      outbox: { status: 'ready', available: true, attentionRequired: false, byStatus: { pending: 0, sent: 0, failed: 0 }, duePending: 0 },
      opsWindow: {
        windowMinutes: 15,
        thresholdBreached: false,
        failedTotal: 0,
        dueTotal: 0,
        pendingTotal: 0,
        impact: 'Visual fixture has no live queue impact.',
        suggestedAction: 'Use real tokens for production-like screenshots.',
        thresholds: { failedTotalWarn: 1, dueTotalWarn: 10, pendingQueueWarn: 50 },
      },
    })
  }
  if (path === '/api/v1/ops/migration/status') return ok({ ready: true, tables: {}, indexes: {} })
  if (path === '/api/v1/ops/search/analytics') return ok({ hotKeywords: [], noResultKeywords: [], prepClicks: [], recommendClicks: [] })
  if (path === '/api/v1/admin/ai-tasks/metrics') {
    return ok({ totalTasks: 0, successCount: 0, failedCount: 0, runningCount: 0, fallbackCount: 0, fallbackRate: 0, avgDurationMs: 0, p95DurationMs: 0, totalPromptTokens: 0, totalCompletionTokens: 0, totalTokens: 0, estimatedCostMicros: 0, providerStats: [], errorStats: [] })
  }
  if (path === '/api/v1/admin/review-queue/status') return ok({ available: true, status: 'ready', byStatus: {} })
  if (path === '/api/v1/notifications/unread-count') return ok({ total: 0, like: 0, comment: 0, favorite: 0, follower: 0, mention: 0, system: 0 })
  if (path === '/api/v1/notifications/realtime-status') {
    return ok({ unread: { total: 0, like: 0, comment: 0, favorite: 0, follower: 0, mention: 0, system: 0 }, serverTime: now, pollIntervalSeconds: 30, websocketEnabled: false })
  }
  if (path === '/api/v1/mock-interviews/stats') {
    return ok({ totalCount: 0, averageScore: 0, bestScore: 0, recentScores: [], focusTagStats: [] })
  }
  if (path === '/api/v1/me/prep/overview') return ok({ targets: [], reviewPlan: { todayQuestions: [] }, weakTags: [], stats: {} })
  if (path === '/api/v1/me/prep/weekly-report') return ok({ highlights: [], weakTags: [], nextActions: [] })
  if (path === '/api/v1/search/posts') {
    return ok({
      ...page(searchPosts),
      source: 'elasticsearch',
      degraded: false,
      diagnostics: {},
    })
  }
  if (path === '/api/v1/search/hot') return ok(['周报模板', '团队协作', '新人上手', '效率工具'])
  if (path === '/api/v1/search/suggest') return ok(['周报模板', '周报复盘', '团队周报'])
  if (path === '/api/v1/search/status') {
    return ok({
      status: 'ready',
      enabled: true,
      available: true,
      indexName: 'visual-fixture',
      indexExists: true,
      indexReady: true,
      publicSearchAvailable: true,
      publicSearchDegraded: false,
      publicSearchSource: 'elasticsearch',
      dbFallbackAvailable: true,
      message: 'visual fixture ready',
    })
  }
  if (path === '/api/v1/posts/1') return ok(detailPost)
  if (path === '/api/v1/posts' && url.searchParams.has('tagId')) {
    return ok(page([
      {
        ...detailPost,
        postId: 2,
        title: '带教清单：新人第一周只做三件事',
        counter: { view: 860, like: 63, comment: 12, favorite: 28 },
      },
      {
        ...detailPost,
        postId: 3,
        title: '晋升材料怎么从日常工作里长出来',
        counter: { view: 720, like: 51, comment: 9, favorite: 19 },
      },
    ]))
  }
  if (path.includes('/page') || path.includes('/posts') || path.includes('/questions') || path.includes('/notifications') || path.includes('/review-queue')) return ok(page())
  if (path.includes('/status') || path.includes('/summary')) return ok({})
  return ok([])
}

async function installFixtureApi(context) {
  if (!useFixtureApi) return
  await context.route('**/api/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(fixtureDataFor(route.request().url())),
    })
  })
}

function trackApiRequests(page) {
  const pendingApiRequests = new Set()
  const shouldTrack = (request) => {
    const url = request.url()
    if (!url.includes('/api/v1/')) return false
    return !url.includes('/notifications/realtime-status') && !url.includes('/notifications/unread-count')
  }
  page.on('request', (request) => {
    if (shouldTrack(request)) pendingApiRequests.add(request)
  })
  page.on('requestfinished', (request) => pendingApiRequests.delete(request))
  page.on('requestfailed', (request) => pendingApiRequests.delete(request))
  return () => pendingApiRequests.size
}

async function waitForVisualReady(page, expectedPath, pendingApiCount) {
  await page.waitForFunction(
    (path) => window.location.pathname === path,
    expectedPath,
    { timeout: visualReadyTimeoutMs },
  )
  await page.waitForSelector('#app', { state: 'attached', timeout: visualReadyTimeoutMs })
  await page.waitForFunction(() => {
    const app = document.querySelector('#app')
    if (!(app instanceof HTMLElement)) return false
    const style = getComputedStyle(app)
    const text = (app.innerText || app.textContent || '').trim()
    return style.display !== 'none' && style.visibility !== 'hidden' && text.length >= 20
  }, undefined, { timeout: visualReadyTimeoutMs })
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })

  const deadline = Date.now() + visualReadyTimeoutMs
  let lastSignature = ''
  let stableSamples = 0
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => {
      const app = document.querySelector('#app')
      const bodyText = (document.body?.innerText || '').trim()
      return {
        appChildren: app?.childElementCount || 0,
        bodyChars: bodyText.length,
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth,
      }
    })
    const signature = JSON.stringify(state)
    if (pendingApiCount() === 0 && state.appChildren > 0 && state.bodyChars >= 20 && signature === lastSignature) {
      stableSamples += 1
      if (stableSamples >= 3) return
    } else {
      stableSamples = 0
    }
    lastSignature = signature
    await page.waitForTimeout(250)
  }
  throw new Error(`Visual route did not become stable within ${visualReadyTimeoutMs}ms (pending API requests: ${pendingApiCount()}).`)
}

async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch (error) {
    const bundledModuleDir = runtimeProcess?.env?.OFFERLAB_PLAYWRIGHT_MODULE_DIR
    if (bundledModuleDir) {
      try {
        const path = await import('node:path')
        const bundledPlaywright = await import(pathToFileURL(path.join(bundledModuleDir, 'playwright/index.js')).href)
        return bundledPlaywright.default || bundledPlaywright
      } catch {
        // Fall through to the actionable error below.
      }
    }
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Playwright is not installed or incomplete. Install it before running visual snapshots or set OFFERLAB_PLAYWRIGHT_MODULE_DIR to a local node_modules directory containing Playwright. ${message}`)
    process.exitCode = 2
    return null
  }
}

async function fileExists(fs, filename) {
  try {
    const stats = await fs.stat(filename)
    return stats.isFile()
  } catch {
    return false
  }
}

async function launchChromium(playwright, fs) {
  const explicitExecutable = runtimeProcess?.env?.OFFERLAB_PLAYWRIGHT_EXECUTABLE_PATH
  if (explicitExecutable) {
    if (await fileExists(fs, explicitExecutable)) {
      return playwright.chromium.launch({ executablePath: explicitExecutable })
    }
    throw new Error(`OFFERLAB_PLAYWRIGHT_EXECUTABLE_PATH does not point to an existing browser executable: ${explicitExecutable}`)
  }

  try {
    return await playwright.chromium.launch()
  } catch (error) {
    for (const executablePath of browserExecutableCandidates) {
      if (await fileExists(fs, executablePath)) {
        return playwright.chromium.launch({ executablePath })
      }
    }
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Playwright Chromium executable is missing and no local Chrome/Edge fallback was found. Set OFFERLAB_PLAYWRIGHT_EXECUTABLE_PATH to a browser executable before running visual snapshots. ${message}`,
      { cause: error },
    )
  }
}

async function collectPageMetrics(page) {
  return page.evaluate(({ theme }) => {
    const rgb = (value) => {
      const match = String(value || '').match(/rgba?\(([^)]+)\)/)
      if (!match) return null
      const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()))
      return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 }
    }
    const channel = (value) => {
      const next = value / 255
      return next <= 0.03928 ? next / 12.92 : ((next + 0.055) / 1.055) ** 2.4
    }
    const luminance = (color) => color ? (0.2126 * channel(color.r)) + (0.7152 * channel(color.g)) + (0.0722 * channel(color.b)) : 0
    const contrast = (foreground, background) => {
      const light = Math.max(luminance(foreground), luminance(background))
      const dark = Math.min(luminance(foreground), luminance(background))
      return (light + 0.05) / (dark + 0.05)
    }
    const effectiveBackground = (element) => {
      let current = element
      while (current && current.nodeType === 1) {
        const color = rgb(getComputedStyle(current).backgroundColor)
        if (color && color.a > 0.2) return color
        current = current.parentElement
      }
      return document.documentElement.classList.contains('dark') ? { r: 2, g: 6, b: 23, a: 1 } : { r: 255, g: 255, b: 255, a: 1 }
    }
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
    }
    const isAllowedHorizontalScroll = (element) => {
      let current = element.parentElement
      while (current && current !== document.body && current !== document.documentElement) {
        const style = getComputedStyle(current)
        const overflowX = style.overflowX
        if ((overflowX === 'auto' || overflowX === 'scroll') && current.scrollWidth > current.clientWidth + 2) {
          return true
        }
        current = current.parentElement
      }
      return false
    }
    const textOf = (element) => (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim()
    const doc = document.documentElement
    const expectsDarkSurface = theme === 'dark' || (theme === 'auto' && doc.classList.contains('dark'))
    const selectorChecks = [
      { selector: '.metric-value', name: 'home metric value', minContrast: 4.5, noLightSurface: false },
      { selector: '.metric-label', name: 'home metric label', minContrast: 4.5, noLightSurface: false },
      { selector: '.recommended-user-card', name: 'recommended user card', minContrast: 4.5, noLightSurface: true },
      { selector: '.user-stat-chip', name: 'recommended user stat chip', minContrast: 4.5, noLightSurface: true },
      { selector: '.follow-button--primary', name: 'primary follow button', minContrast: 4.5, noLightSurface: false },
      { selector: '.follow-button--active', name: 'active follow button', minContrast: 4.5, noLightSurface: true },
      { selector: '.topic-row', name: 'topic row', minContrast: 4.5, noLightSurface: true },
      { selector: '.topic-count', name: 'topic count badge', minContrast: 4.5, noLightSurface: true },
      { selector: '.governance-page .tabs', name: 'governance tabs', minContrast: 4.5, noLightSurface: true },
      { selector: '.governance-page .tab-button', name: 'governance tab button', minContrast: 4.5, noLightSurface: true },
      { selector: '.governance-page .panel', name: 'governance panel', minContrast: 4.5, noLightSurface: true },
      { selector: '.governance-page .metric-card', name: 'governance metric card', minContrast: 4.5, noLightSurface: true },
      { selector: '.governance-page .review-metric', name: 'governance review metric', minContrast: 4.5, noLightSurface: true },
      { selector: '.governance-page .violation-card', name: 'governance violation card', minContrast: 4.5, noLightSurface: true },
      { selector: '.governance-page .field-input', name: 'governance field input', minContrast: 4.5, noLightSurface: true },
    ]
    const bodyText = (document.body?.innerText || '').trim()
    const mojibakeHits = ['鐧', '鎶', '娴', '�', '锛', '绠', '诲'].filter((item) => bodyText.includes(item))
    const overflowCandidates = Array.from(document.querySelectorAll('body *'))
      .slice(0, 1200)
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          tag: element.tagName,
          className: String(element.className || '').slice(0, 80),
          text: (element.textContent || '').trim().slice(0, 80),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          allowedHorizontalScroll: isAllowedHorizontalScroll(element),
        }
      })
      .filter((item) => item.right > window.innerWidth + 2 && item.width > 20)
      .filter((item) => !item.allowedHorizontalScroll)
      .slice(0, 6)
    const keyComponentChecks = selectorChecks.flatMap((check) => {
      return Array.from(document.querySelectorAll(check.selector))
        .filter(isVisible)
        .slice(0, 4)
        .map((element) => {
          const style = getComputedStyle(element)
          const foreground = rgb(style.color)
          const background = effectiveBackground(element)
          const renderedText = textOf(element)
          const ratio = foreground && background && renderedText ? contrast(foreground, background) : null
          const rect = element.getBoundingClientRect()
          const lightSurface = expectsDarkSurface && check.noLightSurface && luminance(background) > 0.62
          const lowContrast = ratio !== null && ratio < check.minContrast
          const clippedText = element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2
          return {
            selector: check.selector,
            name: check.name,
            text: renderedText.slice(0, 80),
            foreground: style.color,
            background: style.backgroundColor,
            effectiveBackground: `rgb(${Math.round(background.r)} ${Math.round(background.g)} ${Math.round(background.b)})`,
            contrastRatio: ratio ? Number(ratio.toFixed(2)) : null,
            minContrast: check.minContrast,
            lightSurface,
            lowContrast,
            clippedText,
            box: {
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
          }
        })
    })
    const keyComponentFailures = keyComponentChecks
      .filter((item) => item.lightSurface || item.lowContrast || item.clippedText)
      .slice(0, 12)

    return {
      title: document.title,
      finalUrl: location.href,
      requestedTheme: theme,
      expectsDarkSurface,
      darkMode: doc.classList.contains('dark'),
      bodyChars: bodyText.length,
      bodyTextSample: bodyText.replace(/\s+/g, ' ').slice(0, 220),
      mojibakeHits,
      hasAppRoot: Boolean(document.querySelector('#app')),
      viewportWidth: window.innerWidth,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      horizontalOverflow: doc.scrollWidth > doc.clientWidth + 2,
      overflowCandidates,
      keyComponentChecks,
      keyComponentFailures,
    }
  }, { theme: visualTheme })
}

export async function runVisualSnapshots() {
  const playwright = await loadPlaywright()
  if (!playwright) return

  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const routeNameFilter = new Set(
    String(runtimeProcess?.env?.OFFERLAB_VISUAL_ROUTE_NAMES || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )
  const activeRoutes = routeNameFilter.size
    ? visualSnapshotRoutes.filter((route) => routeNameFilter.has(route.name))
    : visualSnapshotRoutes
  if (activeRoutes.length === 0) {
    throw new Error('OFFERLAB_VISUAL_ROUTE_NAMES did not match any configured visual route names.')
  }
  await fs.mkdir(outputDir, { recursive: true })

  const browser = await launchChromium(playwright, fs)
  const results = []
  try {
    for (const viewport of visualSnapshotViewports) {
      for (const route of activeRoutes) {
        const expectedPath = routeExpectedPath(route)
        const authToken = routeAuthToken(route)
        if (route.auth && !authToken) {
          results.push({
            route: route.path,
            routeName: route.name,
            viewport: viewport.name,
            viewportSize: viewport,
            auth: route.auth,
            expectedPath,
            skipped: true,
            missingAuth: true,
            reason: `Missing OFFERLAB_VISUAL_${route.auth.toUpperCase()}_TOKEN or OFFERLAB_VISUAL_AUTH_TOKEN`,
          })
          continue
        }

        const context = await browser.newContext({ viewport })
        await installFixtureApi(context)
        await context.addInitScript(({ key, token, theme, onboarding }) => {
          if (token) {
            window.sessionStorage.setItem(key, token)
          }
          if (onboarding) {
            window.sessionStorage.setItem('welcome-onboarding', '900001')
          }
          if (theme === 'dark' || theme === 'light' || theme === 'auto') {
            window.localStorage.setItem('theme', theme)
          }
        }, { key: authStorageKey, token: authToken, theme: visualTheme, onboarding: route.onboarding === true })
        const page = await context.newPage()
        const pendingApiCount = trackApiRequests(page)
        const url = new URL(route.path, baseUrl).toString()
        const screenshotPath = path.join(outputDir, `${safeName(route.name)}-${viewport.name}.png`)
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
          await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined)
          await waitForVisualReady(page, expectedPath, pendingApiCount)
          const metrics = await collectPageMetrics(page)
          const finalPath = new URL(metrics.finalUrl).pathname
          await page.screenshot({
            path: screenshotPath,
            fullPage: true,
          })
          results.push({
            route: route.path,
            routeName: route.name,
            viewport: viewport.name,
            viewportSize: viewport,
            auth: route.auth || 'public',
            expectedPath,
            finalPath,
            unexpectedRoute: finalPath !== expectedPath,
            screenshotPath,
            ...metrics,
          })
        } catch (error) {
          let metrics = {}
          try {
            metrics = await collectPageMetrics(page)
          } catch {
            // Navigation failures can leave the page without an executable document.
          }
          try {
            await page.screenshot({ path: screenshotPath, fullPage: true })
          } catch {
            // Keep the route-level failure in summary.json even when Chromium cannot capture it.
          }
          const finalPath = metrics.finalUrl ? new URL(metrics.finalUrl).pathname : ''
          results.push({
            route: route.path,
            routeName: route.name,
            viewport: viewport.name,
            viewportSize: viewport,
            auth: route.auth || 'public',
            expectedPath,
            finalPath,
            unexpectedRoute: finalPath !== expectedPath,
            screenshotPath,
            captureError: error instanceof Error ? error.message : String(error),
            ...metrics,
          })
        } finally {
          await context.close()
        }
      }
    }
  } finally {
    await browser.close()
  }

  await fs.writeFile(
    path.join(outputDir, 'summary.json'),
    JSON.stringify({
      baseUrl,
      visualTheme,
      useFixtureApi,
      routeNames: activeRoutes.map((route) => route.name),
      capturedAt: new Date().toISOString(),
      results,
    }, null, 2),
    'utf8',
  )

  const failures = results.filter((item) => (
    item.missingAuth
    || item.captureError
    || item.unexpectedRoute
    || !item.hasAppRoot
    || item.bodyChars < 20
    || item.horizontalOverflow
    || (visualTheme === 'dark' && item.darkMode !== true)
    || (visualTheme === 'light' && item.darkMode !== false)
    || item.mojibakeHits?.length > 0
    || item.keyComponentFailures?.length > 0
  ))
  if (failures.length > 0) {
    console.error(JSON.stringify({ visualSnapshotFailures: failures }, null, 2))
    process.exitCode = 1
  }
}

if (runtimeProcess?.argv?.[1] && import.meta.url === pathToFileURL(runtimeProcess.argv[1]).href) {
  await runVisualSnapshots()
}
