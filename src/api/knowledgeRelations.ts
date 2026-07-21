import client, { type Result } from './client'
import type { ApiId } from './types'

export type ConfirmedRelationType = 'DUPLICATE_OF' | 'SUPERSEDES' | 'CONTINUES' | 'SUPPLEMENTS' | 'PREREQUISITE_OF' | 'CONTRADICTS'

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

const adapt = (raw: any): ConfirmedPostRelation => ({
  id: String(raw?.id ?? ''),
  sourcePostId: String(raw?.sourcePostId ?? ''),
  targetPostId: String(raw?.targetPostId ?? ''),
  relationType: String(raw?.relationType ?? 'SUPPLEMENTS') as ConfirmedRelationType,
  reasonText: String(raw?.reasonText ?? ''),
  reviewStatus: String(raw?.reviewStatus ?? 'PENDING') as ConfirmedPostRelation['reviewStatus'],
  visibilityStatus: String(raw?.visibilityStatus ?? 'HIDDEN') as ConfirmedPostRelation['visibilityStatus'],
  riskLevel: String(raw?.riskLevel ?? 'HIGH') as ConfirmedPostRelation['riskLevel'],
  createdAt: raw?.createdAt ? String(raw.createdAt) : undefined,
})

export const knowledgeRelationApi = {
  list: async (postId: ApiId, limit = 20) => {
    const res = await client.get(`/api/v1/posts/${postId}/knowledge-relations`, {
      params: { limit },
      skipAuthRedirect: true,
    }) as Result<any>
    const items = Array.isArray(res.data) ? res.data.map(adapt) : []
    return {
      ...res,
      data: items.filter((item) => item.reviewStatus === 'APPROVED' && item.visibilityStatus === 'VISIBLE'),
    } as Result<ConfirmedPostRelation[]>
  },
  propose: async (postId: ApiId, body: { targetPostId: ApiId; relationType: ConfirmedRelationType; reasonText: string }) => {
    const res = await client.post(`/api/v1/posts/${postId}/knowledge-relations`, body) as Result<any>
    return { ...res, data: res.data ? adapt(res.data) : null } as Result<ConfirmedPostRelation>
  },
}
