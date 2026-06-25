import client, { Result } from './client'
import type { ApiId, User } from './types'
import { adaptUser } from './adapters'

export interface LoginReq {
  account: string
  email?: string
  password: string
}

export interface RegisterReq {
  email: string
  password: string
  nickname: string
}

export interface LoginResp {
  token: string
  user?: User
}

export interface RegisterResp {
  uid: ApiId
}

export const authApi = {
  login: (req: LoginReq): Promise<Result<LoginResp>> =>
    client.post('/api/v1/auth/login', { ...req, email: req.email || req.account }),

  register: (req: RegisterReq): Promise<Result<RegisterResp>> =>
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
