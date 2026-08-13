import client, { type Result } from './client'
import type { ApiId, KnowledgeRelationEdge, KnowledgeRelationGraph, KnowledgeRelationNode } from './types'
import { localizeKnowledgeCopy } from '@/utils/publicDisplay'

export type KnowledgeAssetType = 'post' | 'series' | 'collection' | 'topic' | 'tag' | 'search_entry'
export type PublicKnowledgeAssetType = KnowledgeAssetType
export type KnowledgeAssetStatus = 'active' | 'archived'
export type PublicKnowledgeAssetStatus = KnowledgeAssetStatus
export type KnowledgeVisibilityState = 'visible' | 'archived' | 'excluded' | 'degraded'
export type KnowledgePreviewSource = 'remote' | 'local' | 'fallback' | 'demo'
export type KnowledgeAssetSource = 'post' | 'series' | 'collection' | 'topic' | 'tag' | 'search' | 'manual' | 'curation'
export type KnowledgeRelationType =
  | 'belongs_to'
  | 'references'
  | 'continues'
  | 'related'
  | 'fills_gap'
  | 'search_entry'
  | 'duplicate_of'
  | 'supersedes'
  | 'supplements'
  | 'prerequisite_of'
  | 'contradicts'
export type KnowledgeRelationSource = 'manual' | 'topic' | 'series' | 'search' | 'tag' | 'curation'
export type KnowledgeRelationReviewStatus = 'AUTO_SAFE' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
export type KnowledgeRelationVisibilityStatus = 'VISIBLE' | 'HIDDEN'
export type KnowledgeReviewStatus = KnowledgeRelationReviewStatus
export type KnowledgeRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export type KnowledgePathStatus = 'active' | 'archived'
export type KnowledgePathDisplayState = 'normal' | 'partial' | 'degraded'
export type KnowledgeGapSource = 'topic' | 'search' | 'series' | 'manual'
export type KnowledgeGapReviewStatus = 'CANDIDATE' | 'APPROVED' | 'IGNORED' | 'REVIEW_REQUIRED'
export type KnowledgeGapTargetStage = 'workspace' | 'editor' | 'topic' | 'knowledge'

export type KnowledgeSourceRef = string | {
  readonly source: KnowledgeAssetSource | KnowledgeRelationSource | KnowledgeGapSource
  readonly sourceId?: ApiId
  readonly sourceNote?: string
  readonly previewSource?: KnowledgePreviewSource
}

export interface KnowledgeExploreQuery {
  readonly postId?: ApiId
  readonly tagId?: ApiId
  readonly topicId?: ApiId
  readonly assetId?: ApiId
  readonly assetType?: KnowledgeAssetType
  readonly domain?: number
  readonly limit?: number
}

export interface PublicKnowledgeAsset {
  readonly assetId: string
  readonly assetType: KnowledgeAssetType
  readonly title: string
  readonly summary: string
  readonly assetStatus: KnowledgeAssetStatus
  readonly visibilityState: KnowledgeVisibilityState
  readonly source: KnowledgeAssetSource
  readonly previewSource: KnowledgePreviewSource
  readonly sourceNote: string
  readonly targetHref: string
  readonly updatedAt: string
  readonly excludedReason?: string
}

export interface KnowledgeRelation {
  readonly relationId: string
  readonly sourceAssetId: string
  readonly targetAssetId: string
  readonly relationType: KnowledgeRelationType
  readonly reasonText: string
  readonly source: KnowledgeRelationSource
  readonly reviewStatus: KnowledgeRelationReviewStatus
  readonly visibilityStatus: KnowledgeRelationVisibilityStatus
  readonly riskLevel: KnowledgeRiskLevel
  readonly createdAt: string
}

export type KnowledgeRelationDisplayState = 'CONFIRMED' | 'SUGGESTED' | 'DEGRADED'

export interface ConfirmedKnowledgeRelationDTO extends KnowledgeRelation {
  readonly relationState: 'CONFIRMED'
}

export interface DynamicKnowledgeSuggestionDTO extends KnowledgeRelation {
  readonly relationState: 'SUGGESTED' | 'DEGRADED'
  readonly degradedReason?: string
}

export type KnowledgeRelationProjection = ConfirmedKnowledgeRelationDTO | DynamicKnowledgeSuggestionDTO

export interface KnowledgePathStep {
  readonly assetId: string
  readonly assetType: KnowledgeAssetType
  readonly title: string
  readonly summary?: string
  readonly targetHref?: string
  readonly sourceNote?: string
  readonly previewSource?: KnowledgePreviewSource
  readonly visibilityState?: KnowledgeVisibilityState
}

export interface KnowledgePath {
  readonly pathId: string
  readonly title: string
  readonly summary: string
  readonly entryAssetId: string
  readonly steps: readonly KnowledgePathStep[]
  readonly sourceRefs: readonly KnowledgeSourceRef[]
  readonly pathStatus: KnowledgePathStatus
  readonly displayState: KnowledgePathDisplayState
  readonly updatedAt: string
}

export interface KnowledgeGap {
  readonly gapId: string
  readonly title: string
  readonly reasonText: string
  readonly source: KnowledgeGapSource
  readonly sourceRefs: readonly KnowledgeSourceRef[]
  readonly minSampleMet: boolean
  readonly reviewStatus: KnowledgeGapReviewStatus
  readonly targetStage: KnowledgeGapTargetStage
}

export interface KnowledgeAssetSnapshot {
  readonly snapshotId: string
  readonly assetId: string
  readonly assetType: KnowledgeAssetType
  readonly title: string
  readonly summary: string
  readonly sections: readonly KnowledgePathStep[]
  readonly relations: readonly KnowledgeRelation[]
  readonly sourceNote: string
  readonly archivedAt: string
}

export interface KnowledgeExploreResponse extends KnowledgeRelationGraph {
  readonly assets: readonly PublicKnowledgeAsset[]
  readonly relations: readonly KnowledgeRelation[]
  readonly confirmedRelations: readonly ConfirmedKnowledgeRelationDTO[]
  readonly dynamicSuggestions: readonly DynamicKnowledgeSuggestionDTO[]
  readonly paths: readonly KnowledgePath[]
  readonly gaps: readonly KnowledgeGap[]
  readonly snapshots: readonly KnowledgeAssetSnapshot[]
  readonly displayState: KnowledgePathDisplayState
  readonly previewSource: KnowledgePreviewSource
  readonly sourceNote: string
  readonly excludedReason?: string
}

export type KnowledgeAssetBundle = KnowledgeExploreResponse

const assetTypes = ['post', 'series', 'collection', 'topic', 'tag', 'search_entry'] as const
const assetStatuses = ['active', 'archived'] as const
const visibilityStates = ['visible', 'archived', 'excluded', 'degraded'] as const
const previewSources = ['remote', 'local', 'fallback', 'demo'] as const
const assetSources = ['post', 'series', 'collection', 'topic', 'tag', 'search', 'manual', 'curation'] as const
const relationTypes = [
  'belongs_to',
  'references',
  'continues',
  'related',
  'fills_gap',
  'search_entry',
  'duplicate_of',
  'supersedes',
  'supplements',
  'prerequisite_of',
  'contradicts',
] as const
const relationSources = ['manual', 'topic', 'series', 'search', 'tag', 'curation'] as const
const relationReviewStatuses = ['AUTO_SAFE', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'] as const
const riskLevels = ['LOW', 'MEDIUM', 'HIGH'] as const
const pathDisplayStates = ['normal', 'partial', 'degraded'] as const
const gapSources = ['topic', 'search', 'series', 'manual'] as const
const gapReviewStatuses = ['CANDIDATE', 'APPROVED', 'IGNORED', 'REVIEW_REQUIRED'] as const
const gapTargetStages = ['workspace', 'editor', 'topic', 'knowledge'] as const

const safeText = (value: unknown, fallback = '') => {
  if (typeof value !== 'string') return fallback
  const next = value.trim()
  return next || fallback
}

const toNumber = (value: unknown, fallback = 0) => {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => {
  const next = safeText(value)
  return allowed.includes(next as T) ? next as T : fallback
}

const toAssetType = (value: unknown): KnowledgeAssetType => oneOf(value, assetTypes, 'post')
const toAssetStatus = (value: unknown): KnowledgeAssetStatus => oneOf(safeText(value).toLowerCase(), assetStatuses, 'active')
const toVisibilityState = (value: unknown): KnowledgeVisibilityState => oneOf(safeText(value).toLowerCase(), visibilityStates, 'visible')
const toAssetSource = (value: unknown, fallback: KnowledgeAssetSource = 'manual'): KnowledgeAssetSource => oneOf(value, assetSources, fallback)
const toPreviewSource = (value: unknown): KnowledgePreviewSource => oneOf(safeText(value).toLowerCase(), previewSources, 'remote')
const toRelationType = (value: unknown): KnowledgeRelationType => oneOf(value, relationTypes, 'related')
const toRelationSource = (value: unknown): KnowledgeRelationSource => oneOf(value, relationSources, 'manual')
const toReviewStatus = (value: unknown): KnowledgeRelationReviewStatus => oneOf(value, relationReviewStatuses, 'AUTO_SAFE')
const toRiskLevel = (value: unknown): KnowledgeRiskLevel => oneOf(value, riskLevels, 'LOW')
const toPathDisplayState = (value: unknown): KnowledgePathDisplayState => oneOf(safeText(value).toLowerCase(), pathDisplayStates, 'normal')
const toGapSource = (value: unknown): KnowledgeGapSource => oneOf(value, gapSources, 'manual')
const toGapReviewStatus = (value: unknown): KnowledgeGapReviewStatus => oneOf(value, gapReviewStatuses, 'CANDIDATE')
const toGapTargetStage = (value: unknown): KnowledgeGapTargetStage => oneOf(value, gapTargetStages, 'knowledge')

const isBlockedResponseOrigin = (value: unknown) => {
  const normalized = safeText(value).toLowerCase()
  return normalized.includes('fallback') || normalized.includes('demo') || normalized.includes('local')
}

export const isPersistablePublicKnowledgeAsset = (
  asset: Pick<PublicKnowledgeAsset, 'assetStatus' | 'visibilityState' | 'previewSource'>,
) => {
  if (asset.previewSource === 'fallback' || asset.previewSource === 'demo' || asset.previewSource === 'local') return false
  if (asset.previewSource !== 'remote') return false
  if (asset.visibilityState === 'degraded' || asset.visibilityState === 'excluded') return false
  return asset.assetStatus === 'active' || asset.assetStatus === 'archived'
}

export const isPersistableKnowledgeRelation = (
  relation: Pick<KnowledgeRelation, 'reasonText' | 'reviewStatus' | 'riskLevel' | 'source'>,
) => {
  const source = String(relation.source)
  if (source === 'fallback' || source === 'demo' || source === 'local') return false
  if (!relation.reasonText.trim()) return false
  if (relation.reviewStatus === 'REJECTED') return false
  if (relation.riskLevel === 'HIGH' && relation.reviewStatus !== 'APPROVED') return false
  return true
}

export const isConfirmedKnowledgeRelation = (
  relation: Pick<KnowledgeRelation, 'source' | 'reviewStatus' | 'reasonText'> & Partial<ConfirmedKnowledgeRelationDTO>,
): relation is ConfirmedKnowledgeRelationDTO => relation.relationState === 'CONFIRMED'
  && relationSources.includes(relation.source)
  && relation.reviewStatus === 'APPROVED'
  && Boolean(relation.reasonText.trim() && relation.sourceAssetId?.trim() && relation.targetAssetId?.trim())

export const isDynamicKnowledgeSuggestion = (
  relation: Pick<KnowledgeRelation, 'source' | 'reviewStatus' | 'reasonText'>
    & Partial<Pick<DynamicKnowledgeSuggestionDTO, 'relationState'>>,
): relation is DynamicKnowledgeSuggestionDTO => (
  relation.relationState === 'SUGGESTED' || relation.relationState === 'DEGRADED'
)

export const isPersistableKnowledgePath = (
  path: Pick<KnowledgePath, 'pathStatus' | 'displayState' | 'steps'>,
) => {
  if (path.displayState === 'degraded') return false
  if (path.steps.some((step) => isBlockedResponseOrigin(step.previewSource))) return false
  if (!path.steps.length) return false
  return path.pathStatus === 'active' || path.pathStatus === 'archived'
}

export const isDispatchableKnowledgeGap = (
  gap: Pick<KnowledgeGap, 'minSampleMet' | 'reviewStatus' | 'source' | 'reasonText'>,
) => {
  if (!gap.minSampleMet) return false
  if (gap.reviewStatus === 'REVIEW_REQUIRED') return false
  const origin = `${gap.source} ${gap.reasonText}`.toLowerCase()
  if (origin.includes('single') || origin.includes('user') || origin.includes('private')) return false
  if (origin.includes('fallback') || origin.includes('demo') || origin.includes('local')) return false
  return gap.reviewStatus === 'APPROVED' || gap.reviewStatus === 'CANDIDATE'
}

const safeHref = (value: unknown) => {
  const href = safeText(value)
  if (!href || !href.startsWith('/') || href.startsWith('//')) return ''
  return href
}

const adaptNode = (raw: any): KnowledgeRelationNode => ({
  key: safeText(raw?.key),
  type: safeText(raw?.type),
  label: safeText(raw?.label),
  domain: raw?.domain == null ? undefined : toNumber(raw.domain),
})

const adaptEdge = (raw: any): KnowledgeRelationEdge => ({
  source: safeText(raw?.source),
  target: safeText(raw?.target),
  relation: safeText(raw?.relation),
  weight: toNumber(raw?.weight, 1),
})

const adaptGraph = (raw: any): KnowledgeRelationGraph => ({
  limit: toNumber(raw?.limit, 8),
  nodes: Array.isArray(raw?.nodes) ? raw.nodes.map(adaptNode) : [],
  edges: Array.isArray(raw?.edges) ? raw.edges.map(adaptEdge) : [],
})

const toSourceRefs = (value: unknown): KnowledgeSourceRef[] => Array.isArray(value)
  ? value.map((item) => {
    if (typeof item === 'string') return safeText(item)
    if (!item || typeof item !== 'object') return ''
    const raw = item as any
    return {
      source: oneOf(raw.source, [...assetSources, ...relationSources, ...gapSources], 'manual'),
      sourceId: raw.sourceId,
      sourceNote: raw.sourceNote == null ? undefined : localizeKnowledgeCopy(raw.sourceNote, ''),
      previewSource: raw.previewSource == null ? undefined : oneOf(raw.previewSource, previewSources, 'remote'),
    }
  }).filter(Boolean) as KnowledgeSourceRef[]
  : []

const adaptAsset = (raw: any): PublicKnowledgeAsset => {
  const assetType = toAssetType(raw?.assetType ?? raw?.type)
  const assetId = safeText(raw?.assetId ?? raw?.id ?? raw?.key)
  return {
    assetId,
    assetType,
    title: localizeKnowledgeCopy(raw?.title ?? raw?.label, assetId || '未命名公开内容'),
    summary: localizeKnowledgeCopy(raw?.summary ?? raw?.description, ''),
    assetStatus: toAssetStatus(raw?.assetStatus ?? raw?.status),
    visibilityState: toVisibilityState(raw?.visibilityState ?? raw?.displayState),
    source: toAssetSource(raw?.source, assetType === 'search_entry' ? 'search' : assetType),
    previewSource: toPreviewSource(raw?.previewSource),
    sourceNote: localizeKnowledgeCopy(raw?.sourceNote ?? raw?.reasonText, '来源：公开可见内容关系。'),
    targetHref: safeHref(raw?.targetHref ?? raw?.href),
    updatedAt: safeText(raw?.updatedAt ?? raw?.updateTime),
    excludedReason: safeText(raw?.excludedReason) || undefined,
  }
}

const hasKnownRelationSource = (value: unknown): value is KnowledgeRelationSource => (
  typeof value === 'string' && relationSources.includes(value as KnowledgeRelationSource)
)

const hasKnownReviewStatus = (value: unknown): value is KnowledgeRelationReviewStatus => (
  typeof value === 'string' && relationReviewStatuses.includes(value as KnowledgeRelationReviewStatus)
)

const hasConfirmedRelationEvidence = (
  relation: KnowledgeRelation,
  sourceKnown: boolean,
  reviewKnown: boolean,
) => sourceKnown
  && reviewKnown
  && relation.reviewStatus === 'APPROVED'
  && relation.visibilityStatus === 'VISIBLE'
  && Boolean(relation.reasonText.trim() && relation.sourceAssetId.trim() && relation.targetAssetId.trim())

const adaptRelation = (raw: any, allowConfirmed = true): KnowledgeRelationProjection => {
  const sourceValue = raw?.source
  const reviewValue = raw?.reviewStatus
  const sourceKnown = hasKnownRelationSource(sourceValue)
  const reviewKnown = hasKnownReviewStatus(reviewValue)
  const relation: KnowledgeRelation = {
    relationId: safeText(
      raw?.relationId ?? raw?.id,
      `${safeText(raw?.sourceAssetId ?? raw?.source)}:${safeText(raw?.targetAssetId ?? raw?.target)}:${safeText(raw?.relationType ?? raw?.relation)}`,
    ),
    sourceAssetId: safeText(raw?.sourceAssetId ?? raw?.source),
    targetAssetId: safeText(raw?.targetAssetId ?? raw?.target),
    relationType: toRelationType(raw?.relationType ?? raw?.relation),
    reasonText: localizeKnowledgeCopy(raw?.reasonText ?? raw?.sourceNote, '暂无更多关系说明。'),
    source: sourceKnown ? sourceValue : 'manual',
    reviewStatus: reviewKnown ? reviewValue : 'PENDING_REVIEW',
    visibilityStatus: raw?.visibilityStatus === 'VISIBLE' ? 'VISIBLE' : 'HIDDEN',
    riskLevel: toRiskLevel(raw?.riskLevel),
    createdAt: safeText(raw?.createdAt ?? raw?.createTime),
  }
  if (allowConfirmed && hasConfirmedRelationEvidence(relation, sourceKnown, reviewKnown)) {
    return { ...relation, relationState: 'CONFIRMED' }
  }
  const degradedReason = !sourceKnown
    ? '关系来源暂不明确。'
    : !reviewKnown
      ? '关系核对状态暂不明确。'
      : undefined
  return {
    ...relation,
    relationState: degradedReason ? 'DEGRADED' : 'SUGGESTED',
    degradedReason,
  }
}

const adaptGraphEdgeSuggestion = (raw: any): DynamicKnowledgeSuggestionDTO => ({
  relationId: `graph:${safeText(raw?.source)}:${safeText(raw?.target)}:${safeText(raw?.relation)}`,
  sourceAssetId: safeText(raw?.source),
  targetAssetId: safeText(raw?.target),
  relationType: toRelationType(raw?.relation),
  reasonText: '这是待核对的关联建议，暂缺完整来源依据。',
  source: 'manual',
  reviewStatus: 'PENDING_REVIEW',
  visibilityStatus: 'HIDDEN',
  riskLevel: 'MEDIUM',
  createdAt: '',
  relationState: 'DEGRADED',
  degradedReason: '当前关联建议暂缺核对和来源依据。',
})

const adaptPathStep = (raw: any): KnowledgePathStep => {
  if (typeof raw === 'string') {
    return {
      assetId: '',
      assetType: 'post',
      title: localizeKnowledgeCopy(raw, '未命名阅读步骤'),
    }
  }
  return {
    assetId: safeText(raw?.assetId ?? raw?.id),
    assetType: toAssetType(raw?.assetType ?? raw?.type),
    title: localizeKnowledgeCopy(raw?.title ?? raw?.label, '未命名阅读步骤'),
    summary: raw?.summary == null && raw?.description == null
      ? undefined
      : localizeKnowledgeCopy(raw?.summary ?? raw?.description, ''),
    targetHref: safeHref(raw?.targetHref ?? raw?.href) || undefined,
    sourceNote: raw?.sourceNote == null && raw?.reasonText == null
      ? undefined
      : localizeKnowledgeCopy(raw?.sourceNote ?? raw?.reasonText, ''),
    previewSource: raw?.previewSource == null ? undefined : toPreviewSource(raw.previewSource),
    visibilityState: raw?.visibilityState == null && raw?.displayState == null
      ? undefined
      : toVisibilityState(raw?.visibilityState ?? raw?.displayState),
  }
}

const adaptPath = (raw: any): KnowledgePath => ({
  pathId: safeText(raw?.pathId ?? raw?.id),
  title: localizeKnowledgeCopy(raw?.title, '公开内容阅读路径'),
  summary: localizeKnowledgeCopy(raw?.summary ?? raw?.description, '根据公开内容关系整理的阅读建议。'),
  entryAssetId: safeText(raw?.entryAssetId),
  steps: Array.isArray(raw?.steps) ? raw.steps.map(adaptPathStep) : [],
  sourceRefs: toSourceRefs(raw?.sourceRefs),
  pathStatus: toAssetStatus(raw?.pathStatus ?? raw?.status),
  displayState: toPathDisplayState(raw?.displayState),
  updatedAt: safeText(raw?.updatedAt ?? raw?.updateTime),
})

const adaptGap = (raw: any): KnowledgeGap => ({
  gapId: safeText(raw?.gapId ?? raw?.id),
  title: localizeKnowledgeCopy(raw?.title, '公开内容待补方向'),
  reasonText: localizeKnowledgeCopy(raw?.reasonText ?? raw?.summary, '当前公开内容覆盖仍不完整。'),
  source: toGapSource(raw?.source),
  sourceRefs: toSourceRefs(raw?.sourceRefs),
  minSampleMet: raw?.minSampleMet !== false,
  reviewStatus: toGapReviewStatus(raw?.reviewStatus),
  targetStage: toGapTargetStage(raw?.targetStage),
})

const adaptSnapshot = (raw: any): KnowledgeAssetSnapshot => ({
  snapshotId: safeText(raw?.snapshotId ?? raw?.id),
  assetId: safeText(raw?.assetId),
  assetType: toAssetType(raw?.assetType ?? 'topic'),
  title: localizeKnowledgeCopy(raw?.title, '公开内容关系整理结果'),
  summary: localizeKnowledgeCopy(raw?.summary ?? raw?.description, ''),
  sections: Array.isArray(raw?.sections) ? raw.sections.map(adaptPathStep) : [],
  relations: Array.isArray(raw?.relations) ? raw.relations.map(adaptRelation) : [],
  sourceNote: localizeKnowledgeCopy(raw?.sourceNote, '根据当前可见的公开内容即时整理。'),
  archivedAt: safeText(raw?.archivedAt ?? raw?.archiveTime),
})

export const adaptKnowledgeExploreResponse = (raw: any): KnowledgeExploreResponse => {
  const graphRaw = raw?.graph && typeof raw.graph === 'object' ? raw.graph : raw
  const graph = adaptGraph(graphRaw)
  const relationInputs = Array.isArray(raw?.relations) ? raw.relations.map((item: any) => adaptRelation(item)) : []
  const confirmedInputs = Array.isArray(raw?.confirmedRelations) ? raw.confirmedRelations.map((item: any) => adaptRelation(item)) : []
  const suggestionInputs = Array.isArray(raw?.dynamicSuggestions)
    ? raw.dynamicSuggestions.map((item: any) => adaptRelation(item, false))
    : []
  const adaptedRelations = [...relationInputs, ...confirmedInputs, ...suggestionInputs]
  const confirmedRelations = adaptedRelations.filter(isConfirmedKnowledgeRelation)
  const dynamicSuggestions = [
    ...adaptedRelations.filter(isDynamicKnowledgeSuggestion),
    ...graph.edges.map(adaptGraphEdgeSuggestion),
  ]
  return {
    ...graph,
    assets: Array.isArray(raw?.assets) ? raw.assets.map(adaptAsset) : [],
    relations: adaptedRelations,
    confirmedRelations,
    dynamicSuggestions,
    paths: Array.isArray(raw?.paths) ? raw.paths.map(adaptPath) : [],
    gaps: Array.isArray(raw?.gaps) ? raw.gaps.map(adaptGap) : [],
    snapshots: Array.isArray(raw?.snapshots) ? raw.snapshots.map(adaptSnapshot) : [],
    displayState: toPathDisplayState(raw?.displayState),
    previewSource: toPreviewSource(raw?.previewSource),
    sourceNote: localizeKnowledgeCopy(raw?.sourceNote, '仅展示公开可见内容、关系来源说明和当前响应状态。'),
    excludedReason: safeText(raw?.excludedReason) || undefined,
  }
}

export const knowledgeApi = {
  assets: async (query: KnowledgeExploreQuery): Promise<Result<KnowledgeExploreResponse>> => {
    const res = await client.get('/api/v1/knowledge/assets', {
      params: query,
      skipAuthRedirect: true,
    }) as Result<any>
    return {
      ...res,
      data: res.data ? adaptKnowledgeExploreResponse(res.data) : null,
    }
  },
  explore: async (query: KnowledgeExploreQuery): Promise<Result<KnowledgeExploreResponse>> => {
    const res = await client.get('/api/v1/knowledge/assets', {
      params: query,
      skipAuthRedirect: true,
    }) as Result<any>
    return {
      ...res,
      data: res.data ? adaptKnowledgeExploreResponse(res.data) : null,
    }
  },
}
