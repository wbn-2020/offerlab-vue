import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const vueRoot = process.cwd()
const repoRoot = resolve(vueRoot, '..')
const javaDtoDir = 'offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/api/dto'
const javaServicePath = 'offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/application/KnowledgeRelationService.java'
const javaControllerPath = 'offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/controller/KnowledgeController.java'

const failures = []

const normalize = (source) => source.replace(/^\uFEFF/, '')
const readVue = (path) => readFileSync(resolve(vueRoot, path), 'utf8').replace(/^\uFEFF/, '')
const readVueIfExists = (path) => {
  const fullPath = resolve(vueRoot, path)
  if (!existsSync(fullPath)) {
    failures.push(`${path} must exist.`)
    return ''
  }
  return normalize(readFileSync(fullPath, 'utf8'))
}
const readRepoIfExists = (path) => {
  const fullPath = resolve(repoRoot, path)
  if (!existsSync(fullPath)) {
    failures.push(`${path} must exist.`)
    return ''
  }
  return normalize(readFileSync(fullPath, 'utf8'))
}
const check = (condition, message) => {
  if (!condition) failures.push(message)
}
const has = (source, pattern, message) => check(pattern.test(source), message)
const missing = (source, pattern, message) => check(!pattern.test(source), message)

const packageJson = JSON.parse(readVue('package.json'))
const knowledgeApi = readVueIfExists('src/api/knowledge.ts')
const knowledgeView = readVueIfExists('src/views/KnowledgeExploreView.vue')
const postDetailView = readVueIfExists('src/views/PostDetailView.vue')
const controller = readRepoIfExists(javaControllerPath)
const service = readRepoIfExists(javaServicePath)

const scriptCommand = packageJson.scripts['test:v4-knowledge-asset-guards']
check(
  scriptCommand === 'node scripts/test-v4-knowledge-asset-guards.mjs',
  'package.json must expose test:v4-knowledge-asset-guards as a node-only guard.',
)
missing(
  scriptCommand || '',
  /\b(vite|preview|playwright|cypress|docker|redis|kafka|elastic|serve|dev|browser)\b/i,
  'test:v4-knowledge-asset-guards must not start services, browsers, Docker, DB, Redis, Kafka, or ES.',
)

const contracts = {
  PublicKnowledgeAsset: [
    'assetId',
    'assetType',
    'title',
    'summary',
    'assetStatus',
    'visibilityState',
    'source',
    'previewSource',
    'sourceNote',
    'targetHref',
    'updatedAt',
  ],
  KnowledgeRelation: [
    'relationId',
    'sourceAssetId',
    'targetAssetId',
    'relationType',
    'reasonText',
    'source',
    'reviewStatus',
    'riskLevel',
    'createdAt',
  ],
  KnowledgePath: [
    'pathId',
    'title',
    'summary',
    'entryAssetId',
    'steps',
    'sourceRefs',
    'pathStatus',
    'displayState',
    'updatedAt',
  ],
  KnowledgeGap: [
    'gapId',
    'title',
    'reasonText',
    'source',
    'sourceRefs',
    'minSampleMet',
    'reviewStatus',
    'targetStage',
  ],
  KnowledgeAssetSnapshot: [
    'snapshotId',
    'assetId',
    'assetType',
    'title',
    'summary',
    'sections',
    'relations',
    'sourceNote',
    'archivedAt',
  ],
}

for (const [contract, fields] of Object.entries(contracts)) {
  has(knowledgeApi, new RegExp(`export\\s+interface\\s+${contract}\\b`), `knowledge.ts must export ${contract}.`)
  for (const field of fields) {
    has(
      knowledgeApi,
      new RegExp(`interface\\s+${contract}\\b[\\s\\S]*?readonly\\s+${field}\\??:`),
      `${contract} must include readonly ${field}.`,
    )
  }
}

for (const typeName of [
  'KnowledgeAssetStatus',
  'KnowledgeVisibilityState',
  'KnowledgePreviewSource',
  'KnowledgePathStatus',
  'KnowledgePathDisplayState',
]) {
  has(knowledgeApi, new RegExp(`export\\s+type\\s+${typeName}\\b`), `knowledge.ts must export ${typeName}.`)
}

has(knowledgeApi, /KnowledgeAssetStatus\s*=\s*'active'\s*\|\s*'archived'/, 'assetStatus must only persist active/archived.')
has(knowledgeApi, /KnowledgePathStatus\s*=\s*'active'\s*\|\s*'archived'/, 'pathStatus must only persist active/archived.')
has(
  knowledgeApi,
  /KnowledgeVisibilityState\s*=[\s\S]*'visible'[\s\S]*'archived'[\s\S]*'excluded'[\s\S]*'degraded'/,
  'visibilityState must be a response display field with visible/archived/excluded/degraded.',
)
has(
  knowledgeApi,
  /KnowledgePathDisplayState\s*=[\s\S]*'normal'[\s\S]*'partial'[\s\S]*'degraded'/,
  'displayState must be a response display field with normal/partial/degraded.',
)
has(
  knowledgeApi,
  /KnowledgePreviewSource\s*=[\s\S]*'remote'[\s\S]*'local'[\s\S]*'fallback'[\s\S]*'demo'/,
  'previewSource must model response-only remote/local/fallback/demo metadata.',
)
const typeLine = (typeName) => knowledgeApi.match(new RegExp(`export\\s+type\\s+${typeName}\\s*=([^\\n]+)`))?.[1] || ''
missing(
  typeLine('KnowledgeAssetStatus'),
  /'visible'|'excluded'|'degraded'|'draft'|'reviewing'|'offline'/i,
  'assetStatus must not mix response, moderation, draft, or offline states.',
)
missing(
  typeLine('KnowledgePathStatus'),
  /'normal'|'partial'|'degraded'|'offline'/i,
  'pathStatus must not mix response display or offline states.',
)

for (const helper of [
  'isPersistablePublicKnowledgeAsset',
  'isPersistableKnowledgeRelation',
  'isPersistableKnowledgePath',
  'isDispatchableKnowledgeGap',
]) {
  has(knowledgeApi, new RegExp(`export\\s+const\\s+${helper}\\b`), `knowledge.ts must expose ${helper}.`)
}

has(
  knowledgeApi,
  /isPersistablePublicKnowledgeAsset[\s\S]*previewSource\s*!==\s*'remote'[\s\S]*return false/,
  'fallback/demo/local-only assets must be rejected before persistence.',
)
has(
  knowledgeApi,
  /isPersistablePublicKnowledgeAsset[\s\S]*(visibilityState\s*===\s*'degraded'|previewSource\s*===\s*'fallback'|previewSource\s*===\s*'demo'|previewSource\s*===\s*'local')[\s\S]*return false/,
  'DEGRADED and fallback/demo/local response assets must not write lifecycle state.',
)
has(
  knowledgeApi,
  /isPersistableKnowledgeRelation[\s\S]*(source\s*===\s*'fallback'|source\s*===\s*'demo'|source\s*===\s*'local')[\s\S]*return false/,
  'fallback/demo/local-only relations must be blocked from formal relation persistence.',
)
has(
  knowledgeApi,
  /isPersistableKnowledgePath[\s\S]*(displayState\s*===\s*'degraded'|fallback|demo|local|previewSource)[\s\S]*return false/,
  'DEGRADED or fallback/demo/local-only nodes must be blocked from formal paths.',
)
has(
  knowledgeApi,
  /isDispatchableKnowledgeGap[\s\S]*minSampleMet[\s\S]*REVIEW_REQUIRED[\s\S]*(single|user|private|fallback|demo|local)/i,
  'knowledge gaps must block under-sampled, review-required, single-user, private, fallback/demo/local-only origins.',
)
missing(
  `${typeLine('KnowledgeAssetSource')}\n${typeLine('KnowledgeRelationSource')}`,
  /fallback|demo|local|offline|degraded/i,
  'formal asset/relation sources must not include fallback/demo/local/offline/degraded.',
)

const javaContractFiles = {
  PublicKnowledgeAssetDTO: contracts.PublicKnowledgeAsset,
  KnowledgeRelationDTO: contracts.KnowledgeRelation,
  KnowledgePathDTO: contracts.KnowledgePath,
  KnowledgeGapDTO: contracts.KnowledgeGap,
  KnowledgeAssetSnapshotDTO: contracts.KnowledgeAssetSnapshot,
}

const contractSurfaceParts = [knowledgeApi]
for (const [fileBase, fields] of Object.entries(javaContractFiles)) {
  const source = readRepoIfExists(`${javaDtoDir}/${fileBase}.java`)
  contractSurfaceParts.push(source)
  has(source, new RegExp(`public\\s+class\\s+${fileBase}\\b`), `${fileBase}.java must define ${fileBase}.`)
  for (const field of fields) {
    has(source, new RegExp(`private\\s+[^;]+\\s+${field};`), `${fileBase} must include ${field}.`)
  }
}

for (const enumName of [
  'KnowledgeAssetStatus',
  'KnowledgeVisibilityState',
  'KnowledgePreviewSource',
  'KnowledgePathStatus',
  'KnowledgePathDisplayState',
  'KnowledgeAssetSource',
  'KnowledgeRelationSource',
]) {
  const source = readRepoIfExists(`${javaDtoDir}/${enumName}.java`)
  contractSurfaceParts.push(source)
  has(source, /@JsonValue/, `${enumName} must serialize explicit API values.`)
}

has(
  readRepoIfExists(`${javaDtoDir}/KnowledgeAssetStatus.java`),
  /ACTIVE\("active"\)[\s\S]*ARCHIVED\("archived"\)/,
  'Java assetStatus enum must only model active/archived persistence states.',
)
has(
  readRepoIfExists(`${javaDtoDir}/KnowledgePathStatus.java`),
  /ACTIVE\("active"\)[\s\S]*ARCHIVED\("archived"\)/,
  'Java pathStatus enum must only model active/archived persistence states.',
)
missing(
  readRepoIfExists(`${javaDtoDir}/KnowledgeAssetStatus.java`),
  /DEGRADED|OFFLINE|DRAFT|REVIEW|VISIBLE|EXCLUDED/i,
  'Java assetStatus enum must not include DEGRADED/OFFLINE/DRAFT/REVIEW/VISIBLE/EXCLUDED.',
)
missing(
  readRepoIfExists(`${javaDtoDir}/KnowledgePathStatus.java`),
  /DEGRADED|OFFLINE|NORMAL|PARTIAL/i,
  'Java pathStatus enum must not include DEGRADED/OFFLINE/NORMAL/PARTIAL.',
)
missing(
  readRepoIfExists(`${javaDtoDir}/KnowledgeAssetSource.java`),
  /FALLBACK|DEMO|LOCAL|OFFLINE|DEGRADED/i,
  'Java formal asset source enum must reject fallback/demo/local/offline/degraded.',
)
missing(
  readRepoIfExists(`${javaDtoDir}/KnowledgeRelationSource.java`),
  /FALLBACK|DEMO|LOCAL|OFFLINE|DEGRADED/i,
  'Java formal relation source enum must reject fallback/demo/local/offline/degraded.',
)

has(controller, /@GetMapping\("\/assets"\)/, 'KnowledgeController must expose /api/v1/knowledge/assets.')
has(service, /knowledgeAssets\(/, 'KnowledgeRelationService must aggregate phase-5 knowledge assets.')
has(service, /previewSource[\s\S]*remote/, 'formal backend assets must use remote previewSource.')
has(service, /assetStatus[\s\S]*active[\s\S]*archived/, 'backend must model active/archived assetStatus.')
has(service, /displayState[\s\S]*normal[\s\S]*degraded/, 'backend must keep path displayState as response state only.')
has(service, /(OFFLINE|STATUS_OFFLINE|offline)[\s\S]*(excluded|ordinary|path|filter|skip)/i, 'backend guard must exclude OFFLINE from ordinary paths.')
has(service, /(ARCHIVED|archived)[\s\S]*(visibilityState|archived|revisit|snapshot)/i, 'backend guard must allow archived revisit while marking archived state.')
has(service, /(fallback|demo|local)[\s\S]*(asset|relation|path|gap)[\s\S]*(reject|filter|skip|return false)/i, 'backend guard must reject fallback/demo/local-only from formal assets, relations, paths, and gaps.')
has(service, /(draft|review|private|visibility|post_status|topicStatus)[\s\S]*(filter|skip|return false|selectPublic|batchGetPosts)/i, 'backend aggregation must filter draft, reviewing, private, and invisible content before formal assets.')

has(knowledgeApi, /assets:\s*async[\s\S]*\/api\/v1\/knowledge\/assets/, 'frontend must call the phase-5 knowledge assets endpoint.')
has(
  knowledgeApi,
  /explore:\s*async[\s\S]*client\.get\('\/api\/v1\/knowledge\/assets'/,
  'frontend knowledge exploration must consistently use the assets endpoint.',
)
const exploreMethod = knowledgeApi.match(/explore:\s*async[\s\S]*?\n\s*},\n}/)?.[0] || ''
missing(
  exploreMethod,
  /\/api\/v1\/knowledge\/relations/,
  'frontend knowledge exploration must not fall back to the legacy relations-only endpoint.',
)
has(knowledgeView, /(assets|knowledgeAssets|publicAssets)/, 'KnowledgeExploreView must render public knowledge assets.')
has(knowledgeView, /(paths|knowledgePaths)/, 'KnowledgeExploreView must render public knowledge paths.')
has(knowledgeView, /(previewSource|sourceNote|来源)/, 'KnowledgeExploreView must display source explanation and preview source.')
has(knowledgeView, /(归档|archived)/, 'KnowledgeExploreView must display archived state for revisits.')
has(knowledgeView, /请求时公开投影/, 'KnowledgeExploreView must label snapshot-shaped response data as a request-time projection.')
has(knowledgeView, /不代表已保存的资产历史/, 'KnowledgeExploreView must disclose that request-time projections are not persisted asset history.')
missing(knowledgeView, /归档快照 Archived Snapshots/, 'KnowledgeExploreView must not claim that request-time projections are persisted archived snapshots.')
has(
  knowledgeView,
  /const knowledgeAssetTypes:[^=]+=\s*\['post',\s*'series'\]/,
  'assetId filters must only expose backend-supported post and series types.',
)
has(knowledgeView, /(不会写入正式资产|只读|诊断|临时展示)/, 'KnowledgeExploreView must explain fallback/demo/local-only display-only boundaries.')
missing(knowledgeView, /(保存关系|加入知识路径|下发创作者)/, 'fallback/demo/local-only UI must not expose formal save/path/dispatch actions.')
has(postDetailView, /knowledge\/explore[\s\S]*(postId|post\.postId|currentPost)/, 'Post detail must expose a knowledge explore entry for public content.')

const contractSurface = contractSurfaceParts.join('\n')
for (const forbidden of [
  'uid',
  'userId',
  'ipAddress',
  'clientIp',
  'deviceId',
  'fingerprint',
  'singleUser',
  'singleSearch',
  'singleUserSearch',
  'privateFavorite',
  'privateCollection',
  'privateLearningRecord',
  'learningRecord',
  'draftBody',
  'previewToken',
]) {
  missing(contractSurface, new RegExp(`\\b${forbidden}\\b`, 'i'), `formal knowledge asset contracts must not expose private/single-user field: ${forbidden}.`)
}

for (const source of [knowledgeApi, knowledgeView, postDetailView]) {
  for (const forbidden of [
    '课程售卖',
    '付费资料包',
    '官方背书',
    '权威认证',
    '保证曝光',
    '保证精选',
    '保证收益',
    '保证排名',
    '私人学习计划',
    '私人知识库',
    '私人求职训练',
    '简历',
    'JD',
    '投递',
    'AI 教练',
    'AI教练',
  ]) {
    missing(source, new RegExp(forbidden.replace(/ /g, '\\s*')), `Phase-5 public knowledge copy must not contain red-line wording: ${forbidden}.`)
  }
}

if (failures.length) {
  throw new Error(`V4 knowledge asset guard failed:\n- ${failures.join('\n- ')}`)
}

console.log('V4 knowledge asset guards passed.')
