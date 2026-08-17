import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const catalogUrl = new URL('../src/composables/useDomainCatalog.ts', import.meta.url)
assert.equal(existsSync(catalogUrl), true, 'shared domain catalog composable must exist')

const catalog = read('../src/composables/useDomainCatalog.ts')
const domainsApi = read('../src/api/domains.ts')
const domains = read('../src/utils/domains.ts')
const searchApi = read('../src/api/search.ts')
const home = read('../src/views/HomeView.vue')
const header = read('../src/components/layout/AppHeader.vue')
const editor = read('../src/views/EditorView.vue')
const editorValidation = read('../src/utils/editorValidation.ts')
const explore = read('../src/views/ExploreView.vue')
const discovery = read('../src/api/discovery.ts')
const search = read('../src/views/SearchView.vue')
const topic = read('../src/views/TopicDetailView.vue')
const packageJson = read('../package.json')

assert.match(domainsApi, /client\.get\('\/api\/v1\/domains'/, 'domain API must keep the public domain endpoint')
assert.match(catalog, /let\s+catalogRequest:\s*Promise<[^>]+>\s*\|\s*null\s*=\s*null/, 'shared domain catalog must keep one in-flight request')
assert.match(catalog, /if\s*\(catalogRequest\)\s*return\s+catalogRequest/, 'shared domain catalog must deduplicate concurrent requests')
assert.match(catalog, /domainApi\.listPublic\(\)/, 'shared domain catalog must load the public domain API')
assert.match(catalog, /export\s+const\s+useDomainCatalog\s*=/, 'shared domain catalog must expose a composable')
assert.doesNotMatch(catalog, /return\s*\{[\s\S]{0,400}\bsource\b/, 'remote/fallback source is internal and must not be exposed to views')

for (const [name, source] of [
  ['HomeView', home],
  ['AppHeader', header],
  ['EditorView', editor],
  ['ExploreView', explore],
]) {
  assert.match(source, /useDomainCatalog/, `${name} must consume the shared domain catalog`)
  assert.doesNotMatch(source, /domainApi\.listPublic\(/, `${name} must not issue its own domain catalog request`)
}

for (const [name, source] of [
  ['HomeView', home],
  ['AppHeader', header],
  ['EditorView', editor],
]) {
  assert.doesNotMatch(source, /\/api\/v1\/domains|本地 fallback|接口未返回|领域来源口径|频道来源已同步/, `${name} must not expose domain implementation details`)
}

assert.match(editor, /const\s+selectedDomain\s*=\s*ref<number\s*\|\s*undefined>\(\)/, 'new posts must start without a default channel')
assert.match(editor, /<option\s+:value="undefined">请选择频道<\/option>/, 'editor must render an explicit channel placeholder')
assert.match(editor, /const\s+editorValidation\s*=\s*computed\(\(\)\s*=>\s*validateEditorPublish\(/, 'editor publish validation must flow through the shared validator')
assert.match(editorValidation, /if\s*\(!input\.domain\)\s*errors\.domain\s*=\s*'请选择频道'/, 'publishing without a channel must be blocked with a clear message')
assert.match(editor, /domain:\s*selectedDomain\.value/, 'draft and publish payloads must preserve the selected channel')
assert.doesNotMatch(editor, /DOMAIN\.LIFESTYLE\)\s*$/, 'editor restore paths must not silently default to lifestyle')

assert.match(explore, /activeChannelDomain/, 'explore must derive an effective channel domain')
assert.match(explore, /domainQueryValue\.value\s*===\s*undefined\s*\?\s*activeChannel\.value\?\.domain\s*:\s*activeDomain\.value/, 'explore may fall back to the channel domain only when the URL domain is absent')
assert.match(explore, /hasInvalidDomainQuery/, 'explore must distinguish an invalid URL domain from an absent URL domain')
assert.match(explore, /ALL_COMMUNITY_CHANNELS/, 'explore must include every configured domain channel')
assert.match(explore, /domain:\s*activeChannelDomain\.value/, 'channel requests must send the effective domain')
assert.match(explore, /activeEntryPostTypes\.value\.map/, 'channel and content-form requests must fan out over configured post types')
assert.match(explore, /COMMUNITY_CONTENT_TYPES\.map\(\(item\)\s*=>\s*item\.value\)/, 'domain channels must cover every public community content type')
assert.match(explore, /activeContentFormQuery/, 'legacy channel queries must resolve through content-form query state')
assert.match(explore, /activeChannel \|\| activeContentForm/, 'content-form routes must render the same scoped latest-post list as channel routes')
assert.match(explore, /activeEntryName/, 'content-form routes must expose a stable active-entry label')
assert.doesNotMatch(explore, /postTypes\?\.\[0\]/, 'multi-type entries must not route through only the first post type')
assert.match(domains, /COMMUNITY_CONTENT_FORMS/, 'resource and question entries must be modeled as content forms')
assert.match(domains, /key:\s*'investment'/, 'investment must be in the formal channel catalog')
assert.match(discovery, /contentForms/, 'discovery map must expose contentForms')
assert.match(home, /contentTypeHref/, 'home content-form filters must navigate through a URL/search contract')
assert.doesNotMatch(home, /activeContentType\.value\s*=\s*type\.value/, 'home content-form filters must not be client-only state')
assert.doesNotMatch(explore, /OfferLab Discovery Map|Cross-domain discovery|Public discovery/, 'explore must not expose development-stage English labels')

assert.match(searchApi, /domain\?:\s*number/, 'SearchParams must support domain')
assert.match(searchApi, /domain:\s*params\.domain/, 'search API must forward domain')
assert.match(search, /v-model\.number="filters\.domain"/, 'search must render a real domain selector')
assert.match(search, /captureQueryState[\s\S]*domain:\s*searchMode\.value === 'posts' \? filters\.domain : undefined/, 'search snapshots must capture the selected domain')
assert.match(search, /const params = \{[\s\S]*domain:\s*query\.domain/, 'search requests must include the applied domain snapshot')
assert.match(search, /const queryToRouteQuery\s*=\s*\(query:\s*SearchQueryState\)\s*=>\s*\(\{[\s\S]*\.\.\.\(query\.mode === 'posts' && query\.domain\s*\?\s*\{\s*domain:\s*String\(query\.domain\)\s*\}\s*:\s*\{\}\)/, 'post search URLs must retain the applied domain snapshot')
assert.doesNotMatch(search, /if\s*\(filters\.domain\)\s*\{\s*filters\.domain\s*=\s*undefined/, 'route sync must not erase a valid domain')
assert.doesNotMatch(search, /频道\s*\/\s*场景/, 'position must not be presented as the channel selector')

assert.match(topic, /const\s+publishToTopicQuery\s*=\s*computed/, 'topic detail must build contextual publish navigation')
for (const key of ['topic', 'domain', 'postType', 'returnHref']) {
  assert.match(topic, new RegExp(`${key}:`), `topic publish context must include ${key}`)
}
assert.match(topic, /source:\s*'manual_publish'/, 'topic publish entry must use an editor-supported source')
assert.match(topic, /action:\s*'topic'/, 'topic publish entry must identify the topic action')
assert.match(topic, /contextType:\s*'topic'/, 'topic publish entry must identify topic context')
assert.match(topic, /:to="\{\s*path:\s*'\/editor',\s*query:\s*publishToTopicQuery\s*\}"/, 'topic publish actions must use the contextual editor route')
assert.match(editor, /resolveOptionalDomain\(topicIdeaQueryValue\('domain'\)\)/, 'editor must restore the topic entry channel')

assert.match(packageJson, /"test:comprehensive-channel-loop"/, 'package scripts must expose the comprehensive channel loop guard')
assert.match(packageJson, /npm run test:comprehensive-channel-loop/, 'test:guards must include the comprehensive channel loop guard')

console.log('comprehensive channel loop guard passed')
