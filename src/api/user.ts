import client, { Result } from './client'
import type { User } from './types'

export interface UserProfileReq {
  nickname?: string
  avatar?: string
  signature?: string
}

export interface IntentReq {
  targetCompanies: string[]
  targetPosition: string
  yearsOfExp: number
  targetCity: string
  techStack: string[]
}

export const userApi = {
  getProfile: (uid: number): Promise<Result<User>> =>
    client.get(`/api/v1/users/${uid}`),

  updateProfile: (req: UserProfileReq): Promise<Result<User>> =>
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
