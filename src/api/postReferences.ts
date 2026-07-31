import client, { type Result } from './client'
import type { ApiId } from './types'

export type PostReferenceType = 'SOURCE' | 'EXAMPLE' | 'DATA' | 'FOLLOW_UP'
export type PostReferenceStatus = 'ACTIVE' | 'BROKEN'

export interface PostReference {
  id: string
  postId: string
  ownerUid: string
  referenceType: PostReferenceType
  title: string
  url: string
  sourceDomain: string
  note?: string
  brokenReason?: string
  referenceStatus: PostReferenceStatus
  sortOrder: number
  revision: number
  lastConfirmedAt?: string
}

export interface PostReferenceWrite {
  referenceType: PostReferenceType
  title: string
  url: string
  note?: string
  referenceStatus?: PostReferenceStatus
  brokenReason?: string
  expectedRevision?: number
}

export interface PostReferenceReorderItem {
  referenceId: ApiId
  expectedRevision: number
}

const adapt = (raw: any): PostReference => ({
  id: String(raw?.id ?? ''),
  postId: String(raw?.postId ?? ''),
  ownerUid: String(raw?.ownerUid ?? ''),
  referenceType: String(raw?.referenceType ?? 'SOURCE') as PostReferenceType,
  title: String(raw?.title ?? ''),
  url: String(raw?.url ?? ''),
  sourceDomain: String(raw?.sourceDomain ?? ''),
  note: raw?.note ? String(raw.note) : undefined,
  brokenReason: raw?.brokenReason ? String(raw.brokenReason) : undefined,
  referenceStatus: String(raw?.referenceStatus ?? 'ACTIVE') as PostReferenceStatus,
  sortOrder: Number(raw?.sortOrder ?? 0),
  revision: Number(raw?.revision ?? 1),
  lastConfirmedAt: raw?.lastConfirmedAt ? String(raw.lastConfirmedAt) : undefined,
})

const listResult = (res: Result<any>): Result<PostReference[]> => ({
  ...res,
  data: Array.isArray(res.data) ? res.data.map(adapt) : [],
})

export const postReferenceApi = {
  list: async (postId: ApiId) => listResult(await client.get(`/api/v1/posts/${postId}/references`, { skipAuthRedirect: true }) as Result<any>),
  create: async (postId: ApiId, body: PostReferenceWrite) => {
    const res = await client.post(`/api/v1/posts/${postId}/references`, body) as Result<any>
    return { ...res, data: res.data ? adapt(res.data) : null } as Result<PostReference>
  },
  update: async (postId: ApiId, referenceId: ApiId, body: PostReferenceWrite) => {
    const res = await client.put(`/api/v1/posts/${postId}/references/${referenceId}`, body) as Result<any>
    return { ...res, data: res.data ? adapt(res.data) : null } as Result<PostReference>
  },
  remove: (postId: ApiId, referenceId: ApiId, revision: number) =>
    client.delete(`/api/v1/posts/${postId}/references/${referenceId}`, { params: { revision } }),
  reorder: async (postId: ApiId, items: PostReferenceReorderItem[]) => {
    const res = await client.put(`/api/v1/posts/${postId}/references/reorder`, { items }) as Result<any>
    return listResult(res)
  },
}
