import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const root = new URL('../', import.meta.url)
const backendRoot = new URL('../offerlab-java/', root)
const readSource = (path) => readFileSync(new URL(path, root), 'utf8')
const readBackend = (path) => readFileSync(new URL(path, backendRoot), 'utf8')

const contentTypes = readSource('src/utils/contentTypes.ts')
const editor = readSource('src/views/EditorView.vue')
const editorPreview = readSource('src/utils/editorPreview.ts')
const previewCard = readSource('src/components/editor-preview/EditorPreviewCard.vue')
const previewDetails = readSource('src/components/editor-preview/EditorPreviewDetails.vue')
const qualityChecklist = readSource('src/utils/editorQualityChecklist.ts')
const postMeta = readSource('src/components/post/PostMeta.vue')
const postCard = readSource('src/components/post/PostCard.vue')
const domainSurfaces = readSource('src/utils/domainPostSurfaces.ts')
const explore = readSource('src/views/ExploreView.vue')
const postDetail = readSource('src/views/PostDetailView.vue')
const contentSeriesApi = readSource('src/api/contentSeries.ts')
const collectionDetail = readSource('src/views/CollectionDetailView.vue')
const userProfile = readSource('src/views/UserProfileView.vue')
const postMapper = readBackend('community-domain-post/src/main/java/com/offerlab/community/post/infrastructure/persistence/mapper/PostMapper.java')
const contentSeriesService = readBackend('community-domain-post/src/main/java/com/offerlab/community/post/application/ContentSeriesService.java')
const contentSeriesPostMapper = readBackend('community-domain-post/src/main/java/com/offerlab/community/post/infrastructure/persistence/mapper/ContentSeriesPostMapper.java')

assert.match(contentTypes, /export const DEFAULT_POST_TYPE = POST_TYPE\.NOTE/, 'default publishing type must stay as lightweight experience sharing')
assert.match(contentTypes, /COMMUNITY_CONTENT_TYPE_CODES/, 'content type utility must expose the exact community type contract')
assert.match(contentTypes, /LEGACY_CONTENT_TYPE_CODES/, 'content type utility must expose the legacy compatibility contract')
assert.match(contentTypes, /isLegacyContentType/, 'content type utility must provide a generic legacy check')
assert.match(contentTypes, /hasCompleteCommunityContentTypes/, 'remote content type loading must verify all seven community types are present')
assert.match(contentTypes, /resetContentTypes\(\[\.\.\.FALLBACK_COMMUNITY_CONTENT_TYPES,\s*\.\.\.FALLBACK_LEGACY_CONTENT_TYPES\]\)/, 'remote content type loading must fall back instead of letting legacy types replace community defaults')

const communityCodes = ['NOTE', 'QUESTION', 'TECH_ARTICLE', 'RESOURCE', 'SYSTEM_DESIGN', 'PROJECT_REVIEW', 'PITFALL']
for (const code of communityCodes) {
  assert.match(contentTypes, new RegExp(`code:\\s*'${code}'`), `community publishing type ${code} must be available`)
  assert.match(editor, new RegExp(`${code}:\\s*\\{[\\s\\S]*?title:`), `editor must provide a lightweight template for ${code}`)
}

assert.match(editor, /legacyActive \? ALL_CONTENT_TYPES : COMMUNITY_CONTENT_TYPES/, 'default editor tabs must show only community content types')
assert.match(editor, /const COMMUNITY_PUBLISH_TEMPLATES/, 'community templates must be separated from legacy compatibility templates')
assert.match(editor, /const LEGACY_PUBLISH_TEMPLATES/, 'legacy templates must be compatibility-only')
assert.match(editor, /PUBLISH_TEMPLATES(?:\s*:\s*Record<[^>]+>)?\s*=\s*\{\s*\.\.\.COMMUNITY_PUBLISH_TEMPLATES,\s*\.\.\.LEGACY_PUBLISH_TEMPLATES,\s*\}/, 'publish templates should make the community/legacy split explicit')
assert.match(editor, /if \(form\.value\.content\.trim\(\)\) return/, 'templates must remain optional markdown starters and never overwrite existing content')
assert.match(editor, /templateCode: activeTypeCode\.value/, 'applying a template must persist templateCode in extension metadata')
assert.match(editor, /postType: form\.value\.postType/, 'draft and publish payloads must keep postType')
assert.match(editor, /coverUrl: form\.value\.coverUrl/, 'draft and publish payloads must keep coverUrl')
assert.match(editor, /contentType: contentTypeCodeOf\(form\.value\.postType\)/, 'draft and publish extJson must keep contentType')
assert.match(editor, /templateCode: contentTypeCodeOf\(form\.value\.postType\)/, 'draft and publish extJson must keep templateCode')
assert.match(editor, /服务端草稿同步失败/, 'draft save failure copy must clearly distinguish local protection from server sync failure')

assert.match(editorPreview, /postType\?: unknown/, 'preview input must accept postType')
assert.match(editorPreview, /coverUrl\?: unknown/, 'preview input must accept coverUrl')
assert.match(editorPreview, /contentType:\s*\{[\s\S]*?label:/, 'preview model must expose content type label')
assert.match(editorPreview, /cover:\s*\{[\s\S]*?url:/, 'preview model must expose cover state')
assert.match(editorPreview, /resolveContentType/, 'preview mapper must resolve content type from postType')
assert.match(editorPreview, /resolveCover/, 'preview mapper must resolve cover preview state')
assert.match(previewCard, /preview\.contentType\.shortLabel/, 'preview card must render the content type label')
assert.match(previewCard, /preview\.cover\.url/, 'preview card must render cover preview when present')
assert.match(previewCard, /@error="handleCoverError"/, 'preview card cover image must have an error fallback')
assert.match(previewDetails, /preview\.contentType\.label/, 'preview details must show content type context')
assert.match(previewDetails, /preview\.cover\.description/, 'preview details must show cover or fallback context')

assert.match(qualityChecklist, /'summary'/, 'quality checklist must include summary guidance')
assert.match(qualityChecklist, /'risk'/, 'quality checklist must include high-risk domain guidance')
assert.match(qualityChecklist, /summary\?: string \| null/, 'quality checklist input must accept summary text')
assert.match(qualityChecklist, /riskNotice\?: string \| null/, 'quality checklist input must accept risk notice text')
assert.match(qualityChecklist, /不构成专业建议/, 'high-risk guidance must keep the non-professional-advice disclaimer visible')

assert.doesNotMatch(postMeta, /技术栈|性能优化、部署运维、架构复盘|Spring Boot, Redis, Kafka/, 'PostMeta community fields must not force technical/interview copy')
assert.match(postMeta, /关键词|相关工具|适用场景/, 'PostMeta fields should be generic for a comprehensive community')

assert.match(postCard, /getContentTypeShortLabel/, 'PostCard must continue using the shared content type label utility')
assert.match(domainSurfaces, /post\.coverUrl[\s\S]*firstList\(extension, \['gallery', 'images', 'imageUrls', 'photoUrls', 'photos'\]\)/, 'domain card images must prioritize post.coverUrl before extension galleries')
assert.match(domainSurfaces, /imageUrl: images\[0\]/, 'domain card surface must expose a cover image for any post with coverUrl or first image')
assert.match(postCard, /failedImageUrl/, 'PostCard must remember failed cover URLs')
assert.match(postCard, /@error="handleCardImageError"/, 'PostCard cover image must have an error fallback')
assert.match(postDetail, /failedDetailImages/, 'Post detail gallery must remember failed image URLs')
assert.match(postDetail, /@error="handleDetailImageError(?:\(image\))?"/, 'Post detail gallery images must have an error fallback')
assert.match(explore, /getContentTypeShortLabel/, 'Explore latest posts must render shared content type labels')
assert.match(explore, /latestPostCoverUrl/, 'Explore latest posts must expose lightweight cover previews')

assert.match(contentSeriesApi, /coverUrl\?: string/, 'ContentSeriesRecord and draft payload must include coverUrl')
assert.match(contentSeriesApi, /coverUrl: safeText\(raw\?\.coverUrl/, 'content series adapter must read remote coverUrl')
assert.match(contentSeriesApi, /coverUrl: safeText\(payload\.coverUrl/, 'content series create/update payloads must preserve coverUrl locally')
assert.match(contentSeriesApi, /coverUrl: safeText\(payload\.coverUrl\) \|\| undefined/, 'content series remote payload must send coverUrl')
assert.doesNotMatch(contentSeriesApi, /未命名系列|系列归属|系列内容|已选择系列/, 'content series user-facing fallback copy must use 合集, not 系列')
assert.match(collectionDetail, /collection\.coverUrl/, 'public collection detail must render coverUrl or a stable fallback')
assert.match(userProfile, /collection\.coverUrl/, 'author public collection cards must render coverUrl or a stable fallback')
assert.match(postMapper, /ORDER BY sp\.sort_order ASC,\s*sp\.id ASC/, 'public collection posts must follow author series order instead of post id descending')
assert.match(postMapper, /cursor_sp\.id = #\{cursor\}[\s\S]*sp\.sort_order > cursor_sp\.sort_order[\s\S]*sp\.id > cursor_sp\.id/, 'public collection pagination must use the same series relation cursor as its sort order')
assert.match(contentSeriesService, /selectActiveRelationId\(seriesId,\s*pagePosts\.get\(pagePosts\.size\(\) - 1\)\.getId\(\)\)/, 'public collection nextCursor must return the series relation id, not the post id')
assert.match(contentSeriesPostMapper, /Long selectActiveRelationId/, 'content series relation mapper must expose active relation ids for stable public pagination')

const forbiddenCommercialCopy = /付费专栏|会员|订阅|打赏|提现|收益结算|revenue|settlement/i
for (const [name, source] of [
  ['editor', editor],
  ['editorPreview', editorPreview],
  ['postCard', postCard],
  ['contentSeriesApi', contentSeriesApi],
  ['collectionDetail', collectionDetail],
]) {
  assert.doesNotMatch(source, forbiddenCommercialCopy, `${name} must not introduce commercialized content-series language`)
}

console.log('phase9 publishing formats guard passed')
