import client, { type Result } from './client'
import type { ApiId } from './types'

export const CONFIRMED_RELATION_TYPES = [
  'DUPLICATE_OF',
  'SUPERSEDES',
  'CONTINUES',
  'SUPPLEMENTS',
  'PREREQUISITE_OF',
  'CONTRADICTS',
] as const
export type ConfirmedRelationType = typeof CONFIRMED_RELATION_TYPES[number]

export const normalizeConfirmedRelationType = (value: unknown): ConfirmedRelationType | null => {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toUpperCase()
  return (CONFIRMED_RELATION_TYPES as readonly string[]).includes(normalized)
    ? normalized as ConfirmedRelationType
    : null
}

export interface ConfirmedPostRelation {
  id: string
  sourcePostId: string
  targetPostId: string
  relationType: ConfirmedRelationType
  reasonText: string
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  visibilityStatus: 'VISIBLE' | 'HIDDEN'
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  createdAt?: string
}

const adapt = (raw: any): ConfirmedPostRelation | null => {
  const relationType = normalizeConfirmedRelationType(raw?.relationType)
  if (!relationType) return null
  return {
    id: String(raw?.id ?? ''),
    sourcePostId: String(raw?.sourcePostId ?? ''),
    targetPostId: String(raw?.targetPostId ?? ''),
    relationType,
    reasonText: String(raw?.reasonText ?? ''),
    reviewStatus: String(raw?.reviewStatus ?? 'PENDING') as ConfirmedPostRelation['reviewStatus'],
    visibilityStatus: String(raw?.visibilityStatus ?? 'HIDDEN') as ConfirmedPostRelation['visibilityStatus'],
    riskLevel: String(raw?.riskLevel ?? 'HIGH') as ConfirmedPostRelation['riskLevel'],
    createdAt: raw?.createdAt ? String(raw.createdAt) : undefined,
  }
}

/** Chain relation types that can order a reading thread. Lateral types stay out. */
export const THREAD_RELATION_TYPES = ['PREREQUISITE_OF', 'CONTINUES', 'SUPERSEDES'] as const
export type ThreadRelationType = typeof THREAD_RELATION_TYPES[number]

export const normalizeThreadRelationType = (value: unknown): ThreadRelationType | null => {
  const normalized = normalizeConfirmedRelationType(value)
  return normalized && (THREAD_RELATION_TYPES as readonly string[]).includes(normalized)
    ? normalized as ThreadRelationType
    : null
}

export interface ReadingThreadNode {
  postId: string
  title: string
  /** May be null when the backend has no known channel — never defaulted. */
  domain: number | null
  relationType: ThreadRelationType | null
  hop: number
}

export interface ReadingThread {
  anchorPostId: string
  upstream: ReadingThreadNode[]
  downstream: ReadingThreadNode[]
  /** true when the walk stopped at a bound rather than the end of the chain. */
  truncated: boolean
}

const adaptThreadNode = (raw: any): ReadingThreadNode => {
  return {
    postId: String(raw?.postId ?? ''),
    title: String(raw?.title ?? ''),
    domain: typeof raw?.domain === 'number' ? raw.domain : null,
    relationType: normalizeThreadRelationType(raw?.relationType),
    hop: Number(raw?.hop ?? 0),
  }
}

const adaptThreadNodes = (raw: any): ReadingThreadNode[] => (
  (Array.isArray(raw) ? raw.map(adaptThreadNode) : []).filter((node) => node.postId && node.relationType)
)

const adaptThread = (raw: any, fallbackAnchor: ApiId): ReadingThread => ({
  anchorPostId: String(raw?.anchorPostId ?? fallbackAnchor),
  upstream: adaptThreadNodes(raw?.upstream),
  downstream: adaptThreadNodes(raw?.downstream),
  truncated: raw?.truncated === true,
})

export const knowledgeRelationApi = {
  thread: async (postId: ApiId) => {
    const res = await client.get(`/api/v1/posts/${postId}/knowledge-relations/thread`, {
      skipAuthRedirect: true,
    }) as Result<any>
    return { ...res, data: adaptThread(res.data, postId) } as Result<ReadingThread>
  },
  list: async (postId: ApiId, limit = 20) => {
    const res = await client.get(`/api/v1/posts/${postId}/knowledge-relations`, {
      params: { limit },
      skipAuthRedirect: true,
    }) as Result<any>
    const items = Array.isArray(res.data)
      ? res.data.map(adapt).filter((item): item is ConfirmedPostRelation => item !== null)
      : []
    return {
      ...res,
      data: items.filter((item) => item.reviewStatus === 'APPROVED' && item.visibilityStatus === 'VISIBLE'),
    } as Result<ConfirmedPostRelation[]>
  },
  propose: async (postId: ApiId, body: { targetPostId: ApiId; relationType: ConfirmedRelationType; reasonText: string }) => {
    const res = await client.post(`/api/v1/posts/${postId}/knowledge-relations`, body) as Result<any>
    return { ...res, data: res.data ? adapt(res.data) : null } as Result<ConfirmedPostRelation | null>
  },
}
