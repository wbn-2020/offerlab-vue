import client, { Result } from './client'
import type { ApiId, PaginatedResponse, User, UserBrief, UserIntent } from './types'
import { adaptPage, adaptUser, adaptUserIntent } from './adapters'
import type { ContributionSummary } from '@/utils/communityMetrics'

export interface UserProfileReq {
  nickname?: string
  avatarUrl?: string
  bio?: string
}

export interface IntentReq {
  targetCompanies: string[]
  targetPositions?: string[]
  targetPosition?: string
  yearsOfExp: number
  expectedCity?: string
  targetCity?: string
  techStack: string[]
  interestTopics?: string[]
  interestTags?: string[]
  contentPreferences?: string[]
  expectedSalaryRange?: {
    min: number
    max: number
    unit: string
  }
}

export interface PrivacySetting {
  profileVisibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'
  likeNotification: boolean
  commentNotification: boolean
  followNotification: boolean
  favoriteNotification: boolean
  mentionNotification: boolean
  intentVisibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'
  searchable: boolean
  interactionNotification: boolean
  systemNotification: boolean
}

export interface ChangePasswordReq {
  oldPassword: string
  newPassword: string
}

export interface UserContribution extends ContributionSummary {
  uid?: ApiId
  source?: 'backend_aggregate' | 'profile_restricted' | 'frontend_estimate' | string
  estimated?: boolean
  profileVisible?: boolean
}

const adaptContribution = (raw: any): UserContribution => ({
  uid: raw?.uid,
  score: Number(raw?.score || 0),
  level: String(raw?.level || 'L1 新作者'),
  badge: String(raw?.badge || '开始沉淀'),
  postCount: Number(raw?.postCount || 0),
  featuredCount: Number(raw?.featuredCount || 0),
  likeCount: Number(raw?.likeCount || 0),
  favoriteCount: Number(raw?.favoriteCount || 0),
  commentCount: Number(raw?.commentCount || 0),
  viewCount: Number(raw?.viewCount || 0),
  source: raw?.source || 'backend_aggregate',
  estimated: Boolean(raw?.estimated),
  profileVisible: raw?.profileVisible !== false,
})

export const userApi = {
  getProfile: async (uid: ApiId): Promise<Result<User>> => {
    const res = await client.get(`/api/v1/users/${uid}`) as Result<any>
    return { ...res, data: res.data ? adaptUser(res.data) : null }
  },

  getIntent: async (uid: ApiId): Promise<Result<UserIntent | null>> => {
    const res = await client.get(`/api/v1/users/${uid}/intent`) as Result<any>
    return { ...res, data: adaptUserIntent(res.data) }
  },

  getContribution: async (uid: ApiId): Promise<Result<UserContribution>> => {
    const res = await client.get(`/api/v1/users/${uid}/contribution`) as Result<any>
    return { ...res, data: res.data ? adaptContribution(res.data) : adaptContribution({}) }
  },

  getMyContribution: async (): Promise<Result<UserContribution>> => {
    const res = await client.get('/api/v1/users/me/contribution') as Result<any>
    return { ...res, data: res.data ? adaptContribution(res.data) : adaptContribution({}) }
  },

  searchUsers: async (q: string, size = 20): Promise<Result<UserBrief[]>> => {
    const res = await client.get('/api/v1/users/search', { params: { q, size } }) as Result<any>
    return { ...res, data: Array.isArray(res.data) ? res.data.map(adaptUser) : [] }
  },

  updateProfile: (req: UserProfileReq): Promise<Result<void>> =>
    client.patch('/api/v1/users/me', req),

  changePassword: (req: ChangePasswordReq): Promise<Result<void>> =>
    client.put('/api/v1/users/me/password', req),

  logoutAll: (): Promise<Result<void>> =>
    client.post('/api/v1/users/me/logout-all'),

  updateIntent: (req: IntentReq): Promise<Result<void>> => {
    const city = req.expectedCity ?? req.targetCity ?? ''
    return client.put('/api/v1/users/me/intent', {
      ...req,
      targetCompanies: req.targetCompanies || [],
      targetPositions: req.targetPositions || [],
      targetPosition: req.targetPosition,
      yearsOfExp: req.yearsOfExp,
      techStack: req.techStack || [],
      interestTopics: req.interestTopics || [],
      interestTags: req.interestTags || [],
      contentPreferences: req.contentPreferences || [],
      expectedCity: city,
      targetCity: city,
    })
  },

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
