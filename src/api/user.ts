import client, { Result } from './client'
import type { ApiId, PaginatedResponse, User } from './types'
import { adaptPage, adaptUser } from './adapters'

export interface UserProfileReq {
  nickname?: string
  avatarUrl?: string
  bio?: string
}

export interface IntentReq {
  targetCompanies: string[]
  targetPosition: string
  yearsOfExp: number
  targetCity: string
  techStack: string[]
}

export interface PrivacySetting {
  profileVisibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'
  intentVisibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'
  searchable: boolean
  interactionNotification: boolean
  systemNotification: boolean
}

export const userApi = {
  getProfile: async (uid: ApiId): Promise<Result<User>> => {
    const res = await client.get(`/api/v1/users/${uid}`) as Result<any>
    return { ...res, data: res.data ? adaptUser(res.data) : null }
  },

  updateProfile: (req: UserProfileReq): Promise<Result<void>> =>
    client.patch('/api/v1/users/me', req),

  updateIntent: (req: IntentReq): Promise<Result<void>> =>
    client.put('/api/v1/users/me/intent', req),

  getPrivacySettings: (): Promise<Result<PrivacySetting>> =>
    client.get('/api/v1/users/me/privacy-settings'),

  updatePrivacySettings: (req: PrivacySetting): Promise<Result<PrivacySetting>> =>
    client.put('/api/v1/users/me/privacy-settings', req),

  getFollowers: async (uid: ApiId, cursor?: string, size = 20): Promise<Result<PaginatedResponse<User>>> => {
    const res = await client.get(`/api/v1/users/${uid}/followers`, { params: { cursor, size } }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptUser) : null }
  },

  getFollowing: async (uid: ApiId, cursor?: string, size = 20): Promise<Result<PaginatedResponse<User>>> => {
    const res = await client.get(`/api/v1/users/${uid}/following`, { params: { cursor, size } }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptUser) : null }
  },

  follow: (uid: ApiId): Promise<Result<void>> =>
    client.post(`/api/v1/users/${uid}/follow`),

  unfollow: (uid: ApiId): Promise<Result<void>> =>
    client.delete(`/api/v1/users/${uid}/follow`),
}
