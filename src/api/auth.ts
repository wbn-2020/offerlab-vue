import client, { Result } from './client'
import type { ApiId, User } from './types'
import { adaptUser } from './adapters'

export interface LoginReq {
  email: string
  password: string
}

export interface RegisterReq {
  email: string
  password: string
  nickname: string
}

export interface AuthResp {
  token: string
  user?: User
  uid?: ApiId
}

export const authApi = {
  login: (req: LoginReq): Promise<Result<AuthResp>> =>
    client.post('/api/v1/auth/login', req),

  register: (req: RegisterReq): Promise<Result<AuthResp>> =>
    client.post('/api/v1/auth/register', req),

  logout: (): Promise<Result<void>> =>
    client.post('/api/v1/auth/logout'),

  logoutAll: (): Promise<Result<void>> =>
    client.post('/api/v1/users/me/logout-all'),

  fetchMe: async (): Promise<Result<User>> => {
    const res = await client.get('/api/v1/users/me') as Result<any>
    return { ...res, data: res.data ? adaptUser(res.data) : null }
  },
}
