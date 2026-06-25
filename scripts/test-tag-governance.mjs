import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const has = (source, needle, message) => assert.ok(source.includes(needle), message)

const api = read('../src/api/post.ts')
const types = read('../src/api/types.ts')
const adapters = read('../src/api/adapters.ts')
const governanceView = read('../src/views/AdminGovernanceView.vue')

assert.match(api, /export\s+interface\s+TagGovernanceReq\b/, 'post API must define the tag governance request shape')
for (const fn of ['listAdminTags', 'updateTag', 'updateTagStatus', 'updateTagRecommended', 'updateTagSynonyms', 'mergeTag']) {
  assert.match(api, new RegExp(`${fn}:\\s*async`), `post API must expose ${fn}`)
}
has(api, '/api/v1/tags/admin', 'tag governance API must target the admin tag surface')
has(api, '/api/v1/tags/admin/${tagId}/status', 'tag API must expose status changes')
has(api, '/api/v1/tags/admin/${tagId}/recommend', 'tag API must expose recommendation changes')
has(api, '/api/v1/tags/admin/${tagId}/synonyms', 'tag API must expose synonym changes')
has(api, '/api/v1/tags/admin/${tagId}/merge', 'tag API must expose tag merge')
has(api, 'confirmationPhrase?: string', 'tag governance request must allow critical confirmation phrase')
has(api, "confirmationPhrase: 'CONFIRM'", 'tag merge API must send the backend critical confirmation phrase')

assert.match(types, /export\s+interface\s+Tag[\s\S]*status\?:\s*number/, 'Tag type must include status')
assert.match(types, /export\s+interface\s+Tag[\s\S]*recommended\?:\s*boolean/, 'Tag type must include recommended')
assert.match(types, /export\s+interface\s+Tag[\s\S]*mergeTargetId\?:\s*ApiId/, 'Tag type must include mergeTargetId')
assert.match(types, /export\s+interface\s+Tag[\s\S]*synonyms\?:\s*string\[\]/, 'Tag type must include synonyms')

has(adapters, 'status: raw?.status ?? raw?.tagStatus', 'tag adapter must normalize tag status')
has(adapters, 'recommended:', 'tag adapter must normalize recommended flag')
has(adapters, 'mergeTargetId:', 'tag adapter must normalize merge target id')
has(adapters, 'synonyms:', 'tag adapter must normalize synonyms')

const tagGovernanceLabel = '\u6807\u7b7e\u6cbb\u7406'
const disableTagConfirm = '\u786e\u8ba4\u7981\u7528\u6807\u7b7e'
const mergeTagConfirm = '\u786e\u8ba4\u5408\u5e76\u6807\u7b7e'

has(governanceView, `label: '${tagGovernanceLabel}', value: 'tags'`, 'governance center must include the Tag Governance tab')
for (const call of ['postApi.listAdminTags', 'postApi.updateTag', 'postApi.updateTagStatus', 'postApi.updateTagRecommended', 'postApi.updateTagSynonyms', 'postApi.mergeTag']) {
  has(governanceView, call, `governance center must call ${call}`)
}
has(governanceView, 'isTagActive', 'governance center must handle missing tag status as active')
has(governanceView, 'tagPage = ref(1)', 'tag governance must keep local page state')
has(governanceView, 'tagPageSize = ref(6)', 'tag governance must default to six tags per page')
has(governanceView, 'pagedTags = computed', 'tag governance must derive the current local page')
has(governanceView, 'tagPageCount = computed', 'tag governance must derive local page count')
has(governanceView, 'tagRangeText = computed', 'tag governance must show total and visible tag range')
has(governanceView, 'clampTagPage()', 'tag governance must clamp after refresh or mutation reloads')
has(governanceView, 'class="tag-scroll-list"', 'tag governance list must live in a fixed-height scroll region')
has(governanceView, 'v-for="tag in pagedTags"', 'tag governance list must render the paged tag slice')
has(governanceView, 'class="tag-name', 'long tag names must have a dedicated wrapping style')
has(governanceView, 'class="tag-meta-item tag-synonyms"', 'long synonyms must have a dedicated wrapping style')
has(governanceView, 'requireRiskConfirm', 'tag governance operations must use the shared risk confirmation dialog')
has(governanceView, disableTagConfirm, 'disabling tags must require explicit confirmation')
has(governanceView, mergeTagConfirm, 'merging tags must require explicit confirmation')
has(governanceView, '合并会迁移帖子和专题引用，并将源标签禁用', 'tag merge confirmation must state affected references')

console.log('Tag governance frontend guards passed')
