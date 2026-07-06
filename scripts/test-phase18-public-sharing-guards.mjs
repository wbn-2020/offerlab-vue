import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const packageJson = JSON.parse(read('package.json'))
const seo = read('src/utils/seo.ts')
const interactionBar = read('src/components/post/InteractionBar.vue')
const postDetail = read('src/views/PostDetailView.vue')
const collectionDetail = read('src/views/CollectionDetailView.vue')
const userProfile = read('src/views/UserProfileView.vue')
const topicDetail = read('src/views/TopicDetailView.vue')
const tagDetail = read('src/views/TagDetailView.vue')
const sharePath = new URL('../src/utils/share.ts', import.meta.url)
const share = existsSync(sharePath) ? read('src/utils/share.ts') : ''

assert.equal(
  existsSync(new URL('test-phase18-public-sharing-guards.mjs', import.meta.url)),
  true,
  'Phase 18 public sharing guard must be runnable directly with node.',
)
assert.equal(
  packageJson.scripts['test:phase18-public-sharing'],
  'node scripts/test-phase18-public-sharing-guards.mjs',
  'package.json must expose the Phase 18 public sharing guard.',
)
has(packageJson.scripts['test:guards'], /test:phase18-public-sharing/, 'Full guard suite must include Phase 18 public sharing guard.')

has(seo, /export const SENSITIVE_CANONICAL_QUERY_KEYS/, 'SEO utilities must define an explicit sensitive canonical query denylist.')
for (const key of ['token', 'session', 'debug', 'preview', 'invite', 'utm_source', 'ref', 'q', 'page', 'sort', 'experiment']) {
  has(seo, new RegExp(`['"\`]${key}['"\`]`), `Canonical denylist must include ${key}.`)
}
has(seo, /export const buildCanonicalUrl/, 'SEO utilities must export a canonical URL builder.')
has(seo, /VITE_PUBLIC_SITE_URL|VITE_APP_PUBLIC_SITE_URL/, 'Canonical origin must come from public site URL configuration when available.')
missing(seo, /window\.location\.pathname\}\$\{window\.location\.search\}/, 'Default canonical must not preserve the current query string.')
missing(seo, /localhost|127\.0\.0\.1|192\.168\.|10\./, 'SEO utilities must not hard-code local, loopback, or private-network canonical domains.')

has(share, /export const sharePublicLink/, 'Shared public-link utility must expose sharePublicLink.')
has(share, /navigator\.share/, 'Public sharing must probe browser system share support.')
has(share, /navigator\.clipboard\.writeText/, 'Public sharing must fall back to copying the canonical link.')
has(share, /AbortError|abort/i, 'System share cancellation must be treated as a non-error outcome.')
has(share, /buildCanonicalUrl/, 'Sharing must use the same sanitized canonical URL builder as SEO.')
missing(share, /third-party share SDK|第三方分享 SDK|utm_|autoShare|automatic share/i, 'Sharing must not introduce third-party SDKs, UTM tracking, or automatic sharing.')

has(interactionBar, /sharePublicLink/, 'InteractionBar must use the shared public-link share utility.')
has(interactionBar, /isPublicPostVisible/, 'InteractionBar must gate share availability through public visibility.')
has(interactionBar, /aria-label="[^"]*分享/, 'Share button must have an explicit aria-label.')
has(interactionBar, /aria-disabled/, 'Share button must expose disabled state to assistive tech.')
has(interactionBar, /:disabled="[^"]*share/, 'Share button must have a real disabled state.')
has(interactionBar, /分享取消|cancelled|cancel/i, 'InteractionBar must avoid reporting system share cancellation as an error.')
missing(interactionBar, /window\.location\.href/, 'InteractionBar must not share raw window.location.href with private or tracking query parameters.')

has(postDetail, /canonical:\s*`\/post\/\$\{postId\.value\}`/, 'Post detail must publish a canonical path for public detail pages.')
for (const [name, source] of [
  ['CollectionDetailView', collectionDetail],
  ['UserProfileView', userProfile],
  ['TopicDetailView', topicDetail],
  ['TagDetailView', tagDetail],
]) {
  has(source, /applyPageSeo/, `${name} must apply basic title, description, and canonical metadata.`)
  has(source, /canonical:\s*`?\//, `${name} must provide a stable canonical path.`)
}

for (const [name, source] of [
  ['SEO utilities', seo],
  ['Public sharing utility', share],
  ['InteractionBar', interactionBar],
  ['PostDetailView', postDetail],
  ['CollectionDetailView', collectionDetail],
  ['UserProfileView', userProfile],
  ['TopicDetailView', topicDetail],
  ['TagDetailView', tagDetail],
]) {
  missing(source, /官方背书|平台担保|权威认证|限时购买|会员专享|赞助推荐|付费置顶|广告投放|收益分成|提现/i, `${name} must not contain commercial, paid, or endorsement copy.`)
}

console.log('Phase 18 public sharing guards passed.')
