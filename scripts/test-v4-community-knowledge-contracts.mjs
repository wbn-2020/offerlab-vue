import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const readVue = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const readRepo = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)
const typeLine = (source, name) => {
  const line = source.split(/\r?\n/).find((item) => item.startsWith(`export type ${name} = `))
  assert.ok(line, `${name} must be declared on an exported type line`)
  return line
}

const packageJson = JSON.parse(readVue('package.json'))
const knowledgeApi = readVue('src/api/knowledge.ts')
const dtoDir = 'offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/api/dto/'

assert.equal(
  existsSync(new URL('test-v4-community-knowledge-contracts.mjs', import.meta.url)),
  true,
  'V4 community knowledge contract guard must be runnable directly with node.',
)
assert.equal(
  packageJson.scripts['test:v4-community-knowledge-contracts'],
  'node scripts/test-v4-community-knowledge-contracts.mjs',
  'package.json must expose the V4 community knowledge contract guard without starting services.',
)

const tsContracts = {
  PublicKnowledgeAsset: [
    'assetId', 'assetType', 'title', 'summary', 'assetStatus', 'visibilityState',
    'source', 'previewSource', 'sourceNote', 'targetHref', 'updatedAt',
  ],
  KnowledgeRelation: [
    'relationId', 'sourceAssetId', 'targetAssetId', 'relationType', 'reasonText',
    'source', 'reviewStatus', 'riskLevel', 'createdAt',
  ],
  KnowledgePath: [
    'pathId', 'title', 'summary', 'entryAssetId', 'steps', 'sourceRefs',
    'pathStatus', 'displayState', 'updatedAt',
  ],
  KnowledgeGap: [
    'gapId', 'title', 'reasonText', 'source', 'sourceRefs', 'minSampleMet',
    'reviewStatus', 'targetStage',
  ],
  KnowledgeAssetSnapshot: [
    'snapshotId', 'assetId', 'assetType', 'title', 'summary', 'sections',
    'relations', 'sourceNote', 'archivedAt',
  ],
}

for (const [contract, fields] of Object.entries(tsContracts)) {
  has(knowledgeApi, new RegExp(`export\\s+interface\\s+${contract}\\b`), `${contract} must be exported from knowledge.ts`)
  for (const field of fields) {
    has(knowledgeApi, new RegExp(`${contract}[\\s\\S]*readonly\\s+${field}\\??:`), `${contract} must carry ${field}`)
  }
}

for (const contract of [
  'KnowledgeAssetStatus',
  'KnowledgeVisibilityState',
  'KnowledgePreviewSource',
  'KnowledgePathStatus',
  'KnowledgePathDisplayState',
]) {
  has(knowledgeApi, new RegExp(`export\\s+type\\s+${contract}\\b`), `knowledge.ts must export ${contract}`)
}

has(knowledgeApi, /KnowledgeAssetStatus\s*=\s*'active'\s*\|\s*'archived'/, 'assetStatus must be the persistence lifecycle only')
has(knowledgeApi, /KnowledgePathStatus\s*=\s*'active'\s*\|\s*'archived'/, 'pathStatus must be the persistence lifecycle only')
has(knowledgeApi, /KnowledgeVisibilityState\s*=[\s\S]*'visible'[\s\S]*'archived'[\s\S]*'excluded'[\s\S]*'degraded'/, 'visibilityState must be response display state')
has(knowledgeApi, /KnowledgePathDisplayState\s*=[\s\S]*'normal'[\s\S]*'partial'[\s\S]*'degraded'/, 'displayState must be path response display state')
has(knowledgeApi, /KnowledgePreviewSource\s*=[\s\S]*'remote'[\s\S]*'local'[\s\S]*'fallback'[\s\S]*'demo'/, 'previewSource must be response-only source metadata')

for (const helper of [
  'isPersistablePublicKnowledgeAsset',
  'isPersistableKnowledgeRelation',
  'isPersistableKnowledgePath',
  'isDispatchableKnowledgeGap',
]) {
  has(knowledgeApi, new RegExp(`export\\s+const\\s+${helper}\\b`), `knowledge.ts must expose ${helper}`)
}

has(knowledgeApi, /isPersistablePublicKnowledgeAsset[\s\S]*previewSource !== 'remote'[\s\S]*return false/, 'fallback/demo/local-only assets must be blocked from persistence')
has(knowledgeApi, /isPersistablePublicKnowledgeAsset[\s\S]*visibilityState === 'degraded'[\s\S]*return false/, 'degraded asset response state must not be written as lifecycle state')
has(knowledgeApi, /isPersistableKnowledgePath[\s\S]*displayState === 'degraded'[\s\S]*return false/, 'degraded path response state must not be written as pathStatus')
has(knowledgeApi, /isDispatchableKnowledgeGap[\s\S]*minSampleMet[\s\S]*REVIEW_REQUIRED[\s\S]*return false/, 'knowledge gaps must block under-sampled or review-required dispatch')
missing(typeLine(knowledgeApi, 'KnowledgeAssetSource'), /fallback|demo|local|OFFLINE|DEGRADED/, 'formal asset sources must not include response/demo/offline states')
missing(typeLine(knowledgeApi, 'KnowledgeRelationSource'), /fallback|demo|local|OFFLINE|DEGRADED/, 'formal relation sources must not include response/demo/offline states')

const javaContracts = {
  PublicKnowledgeAssetDTO: [
    'assetId', 'assetType', 'title', 'summary', 'assetStatus', 'visibilityState',
    'source', 'previewSource', 'sourceNote', 'targetHref', 'updatedAt',
  ],
  KnowledgeRelationDTO: [
    'relationId', 'sourceAssetId', 'targetAssetId', 'relationType', 'reasonText',
    'source', 'reviewStatus', 'riskLevel', 'createdAt',
  ],
  KnowledgePathDTO: [
    'pathId', 'title', 'summary', 'entryAssetId', 'steps', 'sourceRefs',
    'pathStatus', 'displayState', 'updatedAt',
  ],
  KnowledgeGapDTO: [
    'gapId', 'title', 'reasonText', 'source', 'sourceRefs', 'minSampleMet',
    'reviewStatus', 'targetStage',
  ],
  KnowledgeAssetSnapshotDTO: [
    'snapshotId', 'assetId', 'assetType', 'title', 'summary', 'sections',
    'relations', 'sourceNote', 'archivedAt',
  ],
}

for (const [contract, fields] of Object.entries(javaContracts)) {
  const source = readRepo(`${dtoDir}${contract}.java`)
  has(source, new RegExp(`public\\s+class\\s+${contract}\\b`), `${contract}.java must define ${contract}`)
  for (const field of fields) {
    has(source, new RegExp(`private\\s+[^;]+\\s+${field};`), `${contract} must carry ${field}`)
  }
}

for (const enumFile of [
  'KnowledgeAssetStatus',
  'KnowledgeVisibilityState',
  'KnowledgePreviewSource',
  'KnowledgePathStatus',
  'KnowledgePathDisplayState',
]) {
  const source = readRepo(`${dtoDir}${enumFile}.java`)
  has(source, /@JsonValue/, `${enumFile} must serialize explicit API values`)
}

has(readRepo(`${dtoDir}KnowledgeAssetStatus.java`), /ACTIVE\("active"\)[\s\S]*ARCHIVED\("archived"\)/, 'Java assetStatus enum must only model active/archived persistence states')
has(readRepo(`${dtoDir}KnowledgePathStatus.java`), /ACTIVE\("active"\)[\s\S]*ARCHIVED\("archived"\)/, 'Java pathStatus enum must only model active/archived persistence states')
missing(readRepo(`${dtoDir}KnowledgeAssetSource.java`), /FALLBACK|DEMO|LOCAL|OFFLINE|DEGRADED/, 'Java formal asset source enum must reject fallback/demo/local/offline/degraded')
missing(readRepo(`${dtoDir}KnowledgeRelationSource.java`), /FALLBACK|DEMO|LOCAL|OFFLINE|DEGRADED/, 'Java formal relation source enum must reject fallback/demo/local/offline/degraded')

console.log('V4 community knowledge contracts passed.')
