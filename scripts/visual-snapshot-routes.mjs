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
  { name: 'explore', path: '/explore' },
  { name: 'search', path: '/search?q=Redis' },
  { name: 'questions', path: '/questions' },
  { name: 'editor', path: '/editor', auth: 'user' },
  { name: 'me', path: '/me', auth: 'user' },
  { name: 'mock-interview-disabled', path: '/mock-interview', expectedPath: '/questions', auth: 'user' },
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
  if (path === '/api/v1/search/hot') return ok([])
  if (path === '/api/v1/search/suggest') return ok([])
  if (path === '/api/v1/search/status') return ok({ available: true, degraded: false, message: 'visual fixture ready' })
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
    throw new Error(`Playwright Chromium executable is missing and no local Chrome/Edge fallback was found. Set OFFERLAB_PLAYWRIGHT_EXECUTABLE_PATH to a browser executable before running visual snapshots. ${message}`)
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
  await fs.mkdir(outputDir, { recursive: true })

  const browser = await launchChromium(playwright, fs)
  const results = []
  try {
    for (const viewport of visualSnapshotViewports) {
      for (const route of visualSnapshotRoutes) {
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
        await context.addInitScript(({ key, token, theme }) => {
          if (token) {
            window.sessionStorage.setItem(key, token)
          }
          if (theme === 'dark' || theme === 'light' || theme === 'auto') {
            window.localStorage.setItem('theme', theme)
          }
        }, { key: authStorageKey, token: authToken, theme: visualTheme })
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
    JSON.stringify({ baseUrl, visualTheme, useFixtureApi, capturedAt: new Date().toISOString(), results }, null, 2),
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
