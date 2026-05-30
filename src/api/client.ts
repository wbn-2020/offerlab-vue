import axios, { AxiosInstance, AxiosError } from 'axios'
import { safeStorage } from '@/utils/safeStorage'

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuthRedirect?: boolean
  }
}

export interface Result<T = any> {
  code: number
  message: string
  data: T | null
  traceId?: string
}

export class BizException extends Error {
  constructor(
    public code: number,
    public message: string,
    public traceId?: string,
    public data?: unknown,
  ) {
    super(message)
    this.name = 'BizException'
  }
}

const errorMessageMap: Record<number, string> = {
  10001: '参数不正确，请检查填写内容后重试',
  10002: '请求格式不正确，请刷新页面后重试',
  10401: '请先登录后再操作',
  10403: '当前账号没有权限执行该操作',
  10404: '目标资源不存在或已被删除',
  10429: '操作太频繁，请稍后再试',
  20000: '系统暂时开小差了，请稍后重试',
  20001: '数据库暂时不可用，请稍后重试',
  20002: '缓存服务暂时不可用，请稍后重试',
  20003: '消息队列暂时不可用，请稍后重试',
  20004: '搜索服务暂时不可用，已尽量使用降级能力',
  20500: '依赖服务暂时不可用，请稍后重试',
  30001: '请勿重复操作',
  30002: '当前状态不允许执行该操作，请刷新后重试',
  30101: '用户不存在或已注销',
  30102: '该账号已存在，请直接登录',
  30103: '账号或密码不正确',
  30201: '帖子不存在或已被删除',
  30202: '帖子已删除，无法继续操作',
  30301: '评论不存在或已被删除',
  30401: '已经关注过了',
  30402: '当前未关注该用户',
  30501: '已经点赞过了',
  30502: '当前未点赞',
  30601: '已经收藏过了',
  30602: '当前未收藏',
}

export function getErrorMessage(error: unknown, fallback = '操作失败') {
  if (error instanceof BizException) {
    const message = errorMessageMap[error.code] || error.message || fallback
    return error.traceId ? `${message}（Trace: ${error.traceId}）` : message
  }
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 400) return errorMessageMap[10001]
    if (error.response?.status === 401) return errorMessageMap[10401]
    if (error.response?.status === 403) return '当前账号没有权限执行该操作'
    if (error.response?.status === 404) return '接口或资源不存在'
    if (error.response?.status === 409) return errorMessageMap[30002]
    if (error.response?.status === 429) return errorMessageMap[10429]
    if (error.response?.status && error.response.status >= 500) return '服务暂时不可用，请稍后重试'
    if (error.code === 'ECONNABORTED') return '请求超时，请稍后重试'
    return error.message || fallback
  }
  if (error instanceof Error) {
    return error.message || fallback
  }
  return fallback
}

export function getResultMessage(result: Pick<Result, 'message' | 'traceId'> | null | undefined, fallback = '操作失败') {
  const message = result?.message || fallback
  return result?.traceId ? `${message}（Trace: ${result.traceId}）` : message
}

const client: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
})

const redirectToLogin = () => {
  if (window.location.pathname === '/login') return
  const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`
  const target = redirect && redirect !== '/' ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'
  window.location.assign(target)
}

// 请求拦截器
client.interceptors.request.use((config) => {
  const token = safeStorage.get('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // 生成或使用现有的 traceId
  const traceId = crypto.randomUUID()
  config.headers['X-Trace-Id'] = traceId

  return config
})

// 响应拦截器
client.interceptors.response.use(
  (response): any => {
    const result = response.data as Result
    if (result.code !== 0) {
      const error = new BizException(result.code, result.message, result.traceId, result.data)
      return Promise.reject(error)
    }
    return result as any
  },
  (error: AxiosError) => {
    if (error.response?.status === 401 && !error.config?.skipAuthRedirect) {
      safeStorage.remove('token')
      redirectToLogin()
    }
    return Promise.reject(error)
  },
)

export default client
