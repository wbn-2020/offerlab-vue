import client, { Result } from './client'
import type { User } from './types'

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
  user: User
}

export const authApi = {
  login: (req: LoginReq): Promise<Result<AuthResp>> =>
    client.post('/api/v1/auth/login', req),

  register: (req: RegisterReq): Promise<Result<AuthResp>> =>
    client.post('/api/v1/auth/register', req),

  logout: (): Promise<Result<void>> =>
    client.post('/api/v1/auth/logout'),

  fetchMe: (): Promise<Result<User>> =>
    client.get('/api/v1/users/me'),
}
