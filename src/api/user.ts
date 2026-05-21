import client, { Result } from './client'
import type { User } from './types'
import { adaptUser } from './adapters'

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

export const userApi = {
  getProfile: async (uid: number): Promise<Result<User>> => {
    const res = await client.get(`/api/v1/users/${uid}`) as Result<any>
    return { ...res, data: res.data ? adaptUser(res.data) : null }
  },

  updateProfile: (req: UserProfileReq): Promise<Result<void>> =>
    client.patch('/api/v1/users/me', req),

  updateIntent: (req: IntentReq): Promise<Result<void>> =>
    client.put('/api/v1/users/me/intent', req),

  getFollowers: (uid: number, cursor?: string, size = 20): Promise<Result<any>> =>
    client.get(`/api/v1/users/${uid}/followers`, { params: { cursor, size } }),

  getFollowing: (uid: number, cursor?: string, size = 20): Promise<Result<any>> =>
    client.get(`/api/v1/users/${uid}/following`, { params: { cursor, size } }),

  follow: (uid: number): Promise<Result<void>> =>
    client.post(`/api/v1/users/${uid}/follow`),

  unfollow: (uid: number): Promise<Result<void>> =>
    client.delete(`/api/v1/users/${uid}/follow`),
}
