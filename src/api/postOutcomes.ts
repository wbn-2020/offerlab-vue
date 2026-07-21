import client, { type Result } from './client'
import type { ApiId } from './types'

export type PostOutcomeType = 'TRIED' | 'WORKED' | 'PARTIAL' | 'DID_NOT_WORK' | 'NOT_APPLICABLE'
export type PostOutcomeVisibility = 'PRIVATE' | 'PUBLIC_ANONYMOUS' | 'PUBLIC_ATTRIBUTED'

export interface PostOutcome {
  id: string
  postId: string
  outcomeType: PostOutcomeType
  contextNote?: string
  resultNote?: string
  visibility: PostOutcomeVisibility
  publicationStatus: string
  followUpAt?: string
  revision: number
}

export interface PostOutcomeSummary {
  postId: string
  minimumSampleSize: number
  minimumSampleMet: boolean
  publicSampleCount: string
  outcomeCounts: Partial<Record<PostOutcomeType, string>>
  samples: Array<{
    id: string
    outcomeType: PostOutcomeType
    resultNote: string
    contributorUid?: string
    createdAt?: string
  }>
}

const adapt = (raw: any): PostOutcome => ({
  id: String(raw?.id ?? ''),
  postId: String(raw?.postId ?? ''),
  outcomeType: String(raw?.outcomeType ?? 'TRIED') as PostOutcomeType,
  contextNote: raw?.contextNote ? String(raw.contextNote) : undefined,
  resultNote: raw?.resultNote ? String(raw.resultNote) : undefined,
  visibility: String(raw?.visibility ?? 'PRIVATE') as PostOutcomeVisibility,
  publicationStatus: String(raw?.publicationStatus ?? 'PRIVATE'),
  followUpAt: raw?.followUpAt ? String(raw.followUpAt) : undefined,
  revision: Number(raw?.revision ?? 1),
})

export const postOutcomeApi = {
  summary: async (postId: ApiId) => {
    const res = await client.get(`/api/v1/posts/${postId}/outcomes/summary`, { skipAuthRedirect: true }) as Result<any>
    return {
      ...res,
      data: res.data ? {
        postId: String(res.data.postId ?? postId),
        minimumSampleSize: Number(res.data.minimumSampleSize ?? 3),
        minimumSampleMet: res.data.minimumSampleMet === true,
        publicSampleCount: String(res.data.publicSampleCount ?? '0'),
        outcomeCounts: Object.fromEntries(Object.entries(res.data.outcomeCounts || {}).map(([key, value]) => [key, String(value)])),
        samples: Array.isArray(res.data.samples) ? res.data.samples.map((item: any) => ({
          id: String(item?.id ?? ''),
          outcomeType: String(item?.outcomeType ?? 'TRIED') as PostOutcomeType,
          resultNote: String(item?.resultNote ?? ''),
          contributorUid: item?.contributorUid == null ? undefined : String(item.contributorUid),
          createdAt: item?.createdAt ? String(item.createdAt) : undefined,
        })).filter((item: { id: string; resultNote: string }) => item.id && item.resultNote) : [],
      } : null,
    } as Result<PostOutcomeSummary>
  },
  mine: async (postId: ApiId) => {
    const res = await client.get(`/api/v1/posts/${postId}/outcomes/mine`) as Result<any>
    return { ...res, data: res.data ? adapt(res.data) : null } as Result<PostOutcome>
  },
  save: async (postId: ApiId, body: {
    outcomeType: PostOutcomeType
    contextNote?: string
    resultNote?: string
    visibility: PostOutcomeVisibility
    followUpAt?: string
    expectedRevision?: number
    riskAcknowledged?: boolean
  }) => {
    const res = await client.put(`/api/v1/posts/${postId}/outcomes/mine`, body) as Result<any>
    return { ...res, data: res.data ? adapt(res.data) : null } as Result<PostOutcome>
  },
  withdraw: (postId: ApiId, revision: number) =>
    client.delete(`/api/v1/posts/${postId}/outcomes/mine`, { params: { revision } }),
}
