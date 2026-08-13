import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const knowledgeApi = read('src/api/knowledge.ts')
const exploreView = read('src/views/KnowledgeExploreView.vue')
const postDetail = read('src/views/PostDetailView.vue')
const topicDetail = read('src/views/TopicDetailView.vue')
const seriesWorkbench = read('src/views/SeriesWorkbenchView.vue')
const contentSeries = read('src/api/contentSeries.ts')

for (const token of [
  'PublicKnowledgeAsset',
  'KnowledgeRelation',
  'KnowledgePath',
  'KnowledgeGap',
  'KnowledgeAssetSnapshot',
  'previewSource',
  'visibilityState',
  'adaptKnowledgeExploreResponse',
]) {
  assert(knowledgeApi.includes(token), `knowledge.ts missing ${token}`)
}

for (const [label, patterns] of [
  ['公开内容入口', ['公开内容入口', 'PublicKnowledgeAsset']],
  ['关系来源解释', ['关系来源解释', 'sourceNote', 'relation source notes']],
  ['知识路径', ['知识路径', 'Knowledge Paths']],
  ['待补内容方向', ['待补内容方向', 'Knowledge Gaps']],
  ['本次阅读整理', ['本次阅读整理', 'request-time projection']],
  ['只读展示', ['只读', 'read-only']],
]) {
  assert(patterns.some((token) => exploreView.includes(token)), `KnowledgeExploreView missing ${label}`)
}
assert(!exploreView.includes('归档快照 Archived Snapshots'), 'KnowledgeExploreView must not label request-time projections as archived snapshots')

for (const [label, patterns] of [
  ['相关公开内容', ['相关公开内容', 'postKnowledgeAssets']],
  ['所属系列', ['所属系列', 'series']],
  ['相关专题', ['相关专题', 'topic']],
  ['来源解释', ['来源解释', 'sourceNote']],
]) {
  assert(patterns.some((token) => postDetail.includes(token)), `PostDetailView missing ${label}`)
}

for (const [label, patterns] of [
  ['归档话题集合', ['已归档话题集合', '归档话题集合']],
  ['归档时间', ['归档时间', 'archivedAt']],
  ['来源解释', ['来源解释', 'sourceNote']],
]) {
  assert(patterns.some((token) => topicDetail.includes(token)), `TopicDetailView missing ${label}`)
}
assert(topicDetail.includes("curatedTopic.status === 'ARCHIVED'"), 'TopicDetailView must preserve the real archived topic lifecycle')
assert(!topicDetail.includes('归档知识资产'), 'TopicDetailView must not rename an archived topic as an archived knowledge asset')
assert(!topicDetail.includes('归档快照'), 'TopicDetailView must not describe the archived topic version as a request-time knowledge snapshot')

for (const [label, patterns] of [
  ['本次关联建议', ['本次关联建议', 'SUGGESTED']],
  ['已确认关系', ['已确认关系', 'CONFIRMED']],
  ['关联依据不足', ['关联依据不足', 'DEGRADED']],
  ['本机暂存', ['本机暂存']],
  ['只读展示', ['只读展示', 'read-only']],
]) {
  assert(patterns.some((token) => seriesWorkbench.includes(token)), `SeriesWorkbenchView missing ${label}`)
}
assert(!seriesWorkbench.includes('公开知识资产'), 'SeriesWorkbenchView must not present a public series as a persisted knowledge asset')
assert(!seriesWorkbench.includes('PublicKnowledgeAsset'), 'SeriesWorkbenchView must not reuse the formal asset DTO name for request-time projection')

assert(contentSeries.includes('previewSource'), 'contentSeries.ts missing previewSource adapter field')
assert(contentSeries.includes('ContentSeriesKnowledgeProjectionState'), 'contentSeries.ts missing explicit knowledge projection state')
for (const state of ['CONFIRMED', 'SUGGESTED', 'DEGRADED']) {
  assert(contentSeries.includes(`'${state}'`), `contentSeries.ts missing ${state} projection state`)
}
assert(contentSeries.includes("relationReviewStatus === 'APPROVED'"), 'contentSeries.ts must require dedicated approved relation-review evidence')
assert(contentSeries.includes('knowledgeRelationSources.has'), 'contentSeries.ts must require a known formal relation source')
assert(contentSeries.includes('hasConfirmedEvidence'), 'contentSeries.ts must fail closed before accepting confirmed relation state')
assert(!contentSeries.includes('assetStatus'), 'contentSeries.ts must not invent a persisted knowledge asset lifecycle for content series')

for (const [path, source] of [
  ['src/views/KnowledgeExploreView.vue', exploreView],
  ['src/views/PostDetailView.vue', postDetail],
  ['src/views/TopicDetailView.vue', topicDetail],
  ['src/views/SeriesWorkbenchView.vue', seriesWorkbench],
]) {
  assert(!source.includes('加入知识路径'), `${path} contains forbidden formal path action`)
  assert(!source.includes('保存关系'), `${path} contains forbidden formal relation action`)
  assert(!source.includes('下发创作者'), `${path} contains forbidden creator dispatch action`)
  assert(!source.includes('官方背书'), `${path} contains forbidden endorsement copy`)
  assert(!source.includes('权威认证'), `${path} contains forbidden authority copy`)
  assert(!source.includes('个人复盘空间'), `${path} contains private review-space copy`)
}

console.log('V4 knowledge asset frontend static guards passed')
