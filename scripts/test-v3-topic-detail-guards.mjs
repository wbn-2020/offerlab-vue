import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8')

assert.ok(existsSync(resolve(process.cwd(), 'src/api/topicDetail.ts')),
  'V3 topic detail must have a dedicated public adapter at src/api/topicDetail.ts')

const packageJson = read('package.json')
const topicDetailApi = read('src/api/topicDetail.ts')
const topicDetailView = read('src/views/TopicDetailView.vue')
const operationTopicDto = read('../offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/api/dto/OperationTopicDTO.java')
const operationTopicSectionDto = read('../offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/api/dto/OperationTopicSectionDTO.java')
const operationCurationService = read('../offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/application/OperationCurationService.java')

assert.match(packageJson, /"test:v3-topic-detail-guards":\s*"node scripts\/test-v3-topic-detail-guards\.mjs"/,
  'package.json must expose the V3 topic detail guard script')

for (const contract of [
  'CuratedTopicDetail',
  'CuratedTopicSection',
  'CuratedTopicItem',
  'TopicRelatedEntry',
  'TopicDetailSource',
  'DisplayableTopicDetailSource',
]) {
  assert.match(topicDetailApi, new RegExp(`export\\s+(?:type|interface)\\s+${contract}\\b`),
    `topic detail adapter must export ${contract}`)
}

assert.match(topicDetailApi, /client\.get\(`\/api\/v1\/operations\/topics\/\$\{encodeURIComponent\(slug\)\}`\)/,
  'topic detail adapter must read the public operation topic endpoint')
assert.match(topicDetailApi, /DisplayableTopicDetailSource\s*=\s*Exclude<TopicDetailSource,\s*'fallback-demo'\s*\|\s*'unavailable'>/,
  'displayable topic detail sources must exclude fallback-demo and unavailable')
assert.match(topicDetailApi, /isDisplayableSource\(source\)/,
  'real topic detail objects must pass the displayable source guard')
assert.match(operationTopicDto, /private String source;/,
  'backend OperationTopicDTO must expose source metadata for public topic detail')
assert.match(operationTopicDto, /private Boolean degraded;/,
  'backend OperationTopicDTO must expose degraded metadata for public topic detail')
assert.match(operationTopicDto, /private String fallbackReason;/,
  'backend OperationTopicDTO must expose fallbackReason metadata for public topic detail')
assert.match(operationTopicSectionDto, /private List<OperationTopicSectionDTO> items;/,
  'backend OperationTopicSectionDTO must make the section item model explicit')
assert.match(operationCurationService, /\.source\(OPERATION_SOURCE_REMOTE\)/,
  'operation topic DTO assembly must mark public remote operation source')
assert.match(topicDetailApi, /raw\.source/,
  'topic detail adapter must consume backend source metadata instead of hard-coding it')
assert.doesNotMatch(topicDetailApi, /const source:\s*TopicDetailSource = 'operation-curation'/,
  'topic detail adapter must not hard-code successful topic source metadata')
assert.match(topicDetailApi, /isSafeHref\(href\)/,
  'real topic detail items must require safe internal hrefs')
assert.match(topicDetailApi, /disabled:\s*!href/,
  'items without a safe href must be explicitly disabled instead of becoming broken links')
assert.match(topicDetailApi, /filter\(hasDisplayableItems\)/,
  'topic detail adapter must remove sections whose real items were fully filtered')
assert.match(topicDetailApi, /emptyTopicDetail/,
  'backend failures must become an overall unavailable state, not fake sections or items')
assert.doesNotMatch(topicDetailApi, /status === 404 \|\| status === 405 \|\| Boolean\(status && status >= 500\)/,
  'topic detail adapter must not treat backend 5xx as a recoverable community-topic fallback')
assert.doesNotMatch(topicDetailApi, /error\.code === 10404 \|\| error\.code >= 20000/,
  'topic detail adapter must not treat backend high-code failures as recoverable community-topic fallback')

const adaptItemBody = topicDetailApi.slice(topicDetailApi.indexOf('const adaptItem'), topicDetailApi.indexOf('const adaptSection'))
assert.doesNotMatch(adaptItemBody, /fallback-demo|unavailable/,
  'adaptItem must not allow fallback-demo or unavailable inside real item arrays')

assert.match(topicDetailView, /topicDetailApi\.getCuratedTopicDetail\(slug\)/,
  '/topics/:slug must try curated operation topic detail before community fallback')
assert.match(topicDetailView, /curatedTopic/,
  'TopicDetailView must render curated topic detail state')
assert.match(topicDetailView, /curatedTopic\.sections/,
  'TopicDetailView must render curated sections')
assert.match(topicDetailView, /curated-section/,
  'TopicDetailView must expose a stable curated section surface')
assert.match(topicDetailView, /curated-item/,
  'TopicDetailView must expose a stable curated item surface')
assert.match(topicDetailView, /item\.disabled/,
  'TopicDetailView must show a disabled state for items without a safe href')
assert.match(topicDetailView, /sourceNote|sortNote|reasonText/,
  'TopicDetailView must explain source, reason, or ordering for curated items')

assert.match(topicDetailView, /postApi\.getTopic\(slug\)/,
  'community topic fallback must remain available for non-curated topics')
assert.match(topicDetailView, /curatedTopicFallbackAllowed/,
  'TopicDetailView must explicitly gate community-topic fallback to curated topic not-found responses')

const publicTopicDetailSurface = `${topicDetailApi}\n${topicDetailView}`
for (const forbidden of [
  'CodeCoachAI',
  'mockInterview',
  'resumeMatch',
  'privateGoal',
  'applicationTask',
  'AI 教练',
  '私人训练',
  '训练计划',
  '模拟面试',
  '简历匹配',
  '简历/JD',
  'JD 分析',
  '投递任务',
]) {
  assert.doesNotMatch(publicTopicDetailSurface, new RegExp(forbidden, 'i'),
    `public topic detail surface must not include private training entry: ${forbidden}`)
}

console.log('V3 topic detail guards passed')
