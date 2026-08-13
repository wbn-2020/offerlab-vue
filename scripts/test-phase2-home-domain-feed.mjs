import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const homeView = readFileSync(new URL('../src/views/HomeView.vue', import.meta.url), 'utf8')
const feedApi = readFileSync(new URL('../src/api/feed.ts', import.meta.url), 'utf8')
const infiniteFeed = readFileSync(new URL('../src/composables/useInfiniteFeed.ts', import.meta.url), 'utf8')
const domains = readFileSync(new URL('../src/utils/domains.ts', import.meta.url), 'utf8')
const adapters = readFileSync(new URL('../src/api/adapters.ts', import.meta.url), 'utf8')

assert.match(homeView, />\s*综合\s*</, 'HomeView must expose a 综合 entry')
assert.match(
  homeView,
  /<router-link[\s\S]*?:to="homeDomainLocation\(\)"[\s\S]*?>[\s\S]*?综合[\s\S]*?<\/router-link>/,
  'The 综合 entry must clear domain through the route-state helper',
)
assert.match(
  homeView,
  /const homeDomainLocation[\s\S]*feed:\s*activeFeed\.value[\s\S]*\.\.\.\(domain\s*\?\s*\{\s*domain:/,
  'Domain links must preserve the selected feed while omitting an empty domain query',
)
assert.match(
  homeView,
  /v-for="d in homeDomainOptions"/,
  'Domain/channel entries must be rendered from the shared enabled domain catalog',
)
assert.match(homeView, /useDomainCatalog/, 'HomeView must consume the shared domain catalog')
assert.match(
  homeView,
  /<div class="home-left-rail space-y-5">/,
  'HomeView must use its bounded left-rail container instead of a content-height Tailwind sticky wrapper',
)
assert.match(
  homeView,
  /\.community-feed-layout__left,\s*\.community-feed-layout__right\s*\{[\s\S]*?align-self:\s*stretch;/,
  'desktop rail grid items must stretch to the full feed height so sticky content does not end early',
)
assert.match(
  homeView,
  /\.home-left-rail,\s*\.home-right-rail\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?max-height:\s*calc\(100vh[\s\S]*?overflow-y:\s*auto;/,
  'desktop rails must stay useful within the viewport while remaining bounded by the feed row',
)
assert.match(
  homeView,
  /aria-label="移动频道导航，可横向滚动"[\s\S]*?tabindex="0"/,
  'mobile channel filters must expose their horizontal scrolling behavior to keyboard and assistive technology',
)
assert.match(
  homeView,
  /home-horizontal-scroll__cue/,
  'mobile horizontal filters must include a discoverable visual overflow cue',
)
assert.match(
  homeView,
  /class="home-task-disclosure"[\s\S]*?<summary>/,
  'desktop onboarding and daily actions must be secondary collapsed disclosures',
)
assert.match(
  homeView,
  /class="home-mobile-secondary lg:hidden"/,
  'mobile task actions must move below the primary reading path',
)
assert.doesNotMatch(
  homeView,
  /home-reading-pulse/,
  'the homepage must not duplicate Feed Tabs with a second feed-switching mechanism',
)
assert.match(
  homeView,
  /import \{ getDomainLabel \} from ['"]@\/utils\/domains['"]/,
  'homepage channel labels must use the shared domain vocabulary',
)
assert.match(
  homeView,
  /homeDomainName\(d\.domain\)/,
  'navigation and mobile channel labels must use the shared domain vocabulary',
)
assert.match(
  homeView,
  /\.home-feed-list :deep\(\.post-trust-panel\)[\s\S]*?display:\s*none;/,
  'repeated trust signal chips must be secondary on the homepage feed',
)
assert.match(
  homeView,
  /\.home-feed-list :deep\(\.post-feed-explanation__trigger\)[\s\S]*?min-height:\s*2rem;/,
  'recommendation explanations must remain available as a low-emphasis disclosure',
)
assert.match(
  homeView,
  /\.home-feed-list :deep\(\.post-card__author-row \.text-xs\)[\s\S]*?font-size:\s*0\.8125rem/,
  'homepage post metadata must remain readable in the light theme',
)
assert.match(
  homeView,
  /暂时没能更新内容/,
  'HomeView must present feed degradation in concise user-facing language',
)
assert.doesNotMatch(
  homeView,
  /channelHotBoardError\.value\s*=\s*getErrorMessage/,
  'channel hot-board degradation must not surface raw backend error details',
)
assert.match(
  homeView,
  /const activeDomain = computed\(\(\) => \{[\s\S]*homeDomainOptions\.value\.some\(\(item\) => Number\(item\.domain\) === q\) \? q : undefined[\s\S]*\}\)/,
  'activeDomain must reject query values outside the enabled shared domain catalog before API calls',
)
assert.match(
  infiniteFeed,
  /apiMap\[currentFeed\.value\]\(pageParam,\s*pageSize,\s*currentDomain\.value\)/,
  'useInfiniteFeed must pass currentDomain.value into the selected feed API call, including featured',
)
const maxPagesMatch = infiniteFeed.match(/const\s+maxPages\s*=\s*(\d+)/)
assert.ok(maxPagesMatch, 'useInfiniteFeed must define a maxPages cap to avoid unbounded feed memory growth')
const maxPagesValue = Number(maxPagesMatch[1])
assert.ok(
  maxPagesValue > 0 && maxPagesValue <= 50,
  'useInfiniteFeed maxPages must stay a bounded positive cap (retain enough pages for scroll-back without unbounded growth)',
)
assert.match(
  infiniteFeed,
  /getNextPageParam:[\s\S]*?\n\s*maxPages,/,
  'useInfiniteFeed must pass maxPages to TanStack Query so cached pages are actually evicted',
)
assert.match(
  infiniteFeed,
  /data\.value\?\.pages\.slice\(-maxPages\)\.flatMap/,
  'useInfiniteFeed must render only the capped recent pages instead of flattening every loaded page',
)
assert.match(
  feedApi,
  /getFeatured:\s*async\s*\(cursor\?:\s*string,\s*size\s*=\s*20,\s*domain\?:\s*number\)/,
  'feedApi.getFeatured must accept domain?: number',
)
assert.match(
  feedApi,
  /if\s*\(domain\s*!=\s*null\)\s*params\.domain\s*=\s*domain/,
  'feedApi.getFeatured must send domain in request params only when present',
)
assert.match(domains, /export\s+const\s+normalizeDomain\s*=/, 'domains.ts must expose a shared normalizeDomain helper')
assert.match(
  adapters,
  /import\s+\{[\s\S]*isKnownDomain[\s\S]*normalizeDomain[\s\S]*\}\s+from\s+['"]@\/utils\/domains['"]/,
  'adaptPost must import optional validation and normalization from the shared domain helper',
)
assert.match(
  adapters,
  /const rawDomain = source\?\.domain \?\? extension\?\.domain[\s\S]*const domain = isKnownDomain\(rawDomain\) \? normalizeDomain\(rawDomain\) : undefined/,
  'adaptPost must preserve missing or invalid domains as unclassified instead of normalizing them to TECH',
)

console.log('phase2 home domain feed guard passed')
