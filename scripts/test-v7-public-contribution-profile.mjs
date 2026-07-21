import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const files = [
  'src/api/collaborationAnalytics.ts',
  'src/components/collaboration/PublicCollaborationContributionList.vue',
  'src/views/CollaborationContributionView.vue',
]

for (const path of files) {
  assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), true, `${path} must exist.`)
}

const api = read(files[0])
const list = read(files[1])
const view = read(files[2])
const ui = `${list}\n${view}`
const router = read('src/router/index.ts')

has(api, /GET|client\.get/, 'Public contribution API must use read-only GET requests.')
has(api, /\/api\/v1\/users[\s\S]*public-contributions/, 'Public contribution API must support the user public-contributions endpoint.')
has(api, /PublicCollaborationContributionProfile[\s\S]*factCount[\s\S]*truncated[\s\S]*degraded/, 'Public contribution API types must allow empty and degraded states.')
has(api, /adaptPublicContributionProfile[\s\S]*facts[\s\S]*degradationReasons/, 'Public contribution API must normalize nullable fact payloads.')
has(api, /signal:\s*options\.signal[\s\S]*skipAuthRedirect:\s*true/, 'Public contribution requests must be cancellable without forcing a global login redirect.')

has(list, /targetUid[\s\S]*props\.uid[\s\S]*canLoad/, 'Public contribution list must distinguish public profiles from the current-account boundary.')
has(list, /AbortController[\s\S]*accountGeneration[\s\S]*requestId/, 'Public contribution list must protect against stale requests and account switches.')
has(list, /getErrorMessage[\s\S]*permissionDenied/, 'Public contribution list must expose permission and request failures.')
has(list, /data-contribution-empty|暂时没有可公开展示/, 'Public contribution list must expose an empty state.')
has(list, /data-contribution-degraded|profile\.degraded/, 'Public contribution list must expose a degraded state.')
has(list, /factTypeLabel[\s\S]*occurredAt[\s\S]*fact\.sourceId/, 'Public contribution list must render fact fields without deriving a score.')
has(list, /profile\.truncated/, 'Public contribution list must preserve backend truncation semantics.')
missing(ui, /leaderboard|ranking|rank\b|score\b|badge\b|level\b|reward\b|排行榜|积分榜|积分|等级|奖励/i, 'Public contribution UI must not expose ranking, score, level, or reward language.')
has(ui, /uid\?: ApiId[\s\S]*showContributions/, 'Contribution view must accept a public profile target without coupling to a specific user page.')
has(router, /path:\s*['"]\/me\/collaboration\/contributions['"][\s\S]*MyCollaborationContributions[\s\S]*meta:\s*\{[^}]*requiresAuth:\s*true/, 'The current-user contribution route must remain authenticated.')
assert.doesNotMatch(
  router.match(/path:\s*['"]\/me\/collaboration\/contributions['"][\s\S]*?meta:\s*\{[^}]*\}/)?.[0] || '',
  /showAnalytics:\s*true/,
  'The current-user contribution route must not mount the privileged operations analytics panel.',
)

console.log('V7 public contribution profile guard passed')
