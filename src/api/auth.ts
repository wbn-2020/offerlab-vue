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
  termsAccepted: boolean
  privacyAccepted: boolean
  termsVersion: string
  privacyVersion: string
}

export interface LoginResp {
  token: string
  user?: User
}

export interface RegisterResp {
  uid: ApiId
  token?: string
}

export const AUTH_LOGIN_TIMEOUT_MS = 12_000
export const AUTH_PROFILE_TIMEOUT_MS = 8_000
export const AUTH_ROUTE_HYDRATION_TIMEOUT_MS = 3_500
export const CURRENT_TERMS_VERSION = '2026-09-01'
export const CURRENT_PRIVACY_VERSION = '2026-09-01'

export const authApi = {
  login: (req: LoginReq, timeoutMs = AUTH_LOGIN_TIMEOUT_MS): Promise<Result<LoginResp>> =>
    client.post('/api/v1/auth/login', { ...req, email: req.email || req.account }, {
      skipAuthRedirect: true,
      timeout: timeoutMs,
    }),

  register: (req: RegisterReq): Promise<Result<RegisterResp>> =>
    client.post('/api/v1/auth/register', req, {
      skipAuthRedirect: true,
    }),

  logout: (): Promise<Result<void>> =>
    client.post('/api/v1/auth/logout'),

  logoutAll: (): Promise<Result<void>> =>
    client.post('/api/v1/users/me/logout-all'),

  // 路由守卫会 await hydrate，若沿用共享的 30s 超时，后端慢/挂时首跳会白屏最多 30s。
  // 传入 timeoutMs 给这一路请求单独设更短超时，超时后守卫可尽快落到登录恢复页。
  fetchMe: async (timeoutMs?: number): Promise<Result<User>> => {
    const res = await client.get('/api/v1/users/me', timeoutMs ? { timeout: timeoutMs } : undefined) as Result<any>
    return { ...res, data: res.data ? adaptUser(res.data) : null }
  },
}
