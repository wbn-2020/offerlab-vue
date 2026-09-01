import axios, { AxiosError, AxiosInstance } from 'axios'
import { authTokenStore } from '@/utils/authTokenStore'
import { useAuthStore } from '@/stores/auth'
import { safeRedirect } from '@/utils/navigation'
import { notifySessionExpired } from '@/utils/sessionExpiry'

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuthRedirect?: boolean
    authSessionVersion?: number
  }
}

export type ResultProvenanceSource = 'remote' | 'demo' | 'fallback' | 'unavailable'

export interface Result<T = any> {
  code: number
  message: string
  data: T | null
  traceId?: string
  source?: ResultProvenanceSource
  degraded?: boolean
  fallbackReason?: string
}

type ResultPayloadProvenance = {
  source?: unknown
  degraded?: unknown
  fallbackReason?: unknown
  degradationReasons?: unknown
}

const resultPayloadProvenance = (data: unknown): ResultPayloadProvenance | null => (
  data != null && typeof data === 'object' && !Array.isArray(data)
    ? data as ResultPayloadProvenance
    : null
)

export const withRemoteResultProvenance = <T>(result: Result<T>): Result<T> => {
  const metadata = resultPayloadProvenance(result.data)
  const rawSources = [result.source, metadata?.source].filter((value) => value != null)
  const sourceTexts = rawSources
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim().toLowerCase())
  const malformedSource = rawSources.some((value) => (
    typeof value !== 'string' || !value.trim()
  ))
  const rawDegradedMarkers = [result.degraded, metadata?.degraded]
    .filter((value) => value != null)
  const malformedDegraded = rawDegradedMarkers.some((value) => typeof value !== 'boolean')
  const rawFallbackReasons = [result.fallbackReason, metadata?.fallbackReason]
    .filter((value) => value != null)
  const malformedFallbackReason = rawFallbackReasons.some((value) => typeof value !== 'string')
  const fallbackReason = rawFallbackReasons
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .find(Boolean)
    || (malformedFallbackReason ? 'malformed_payload_fallback_reason' : '')
  const hasDegradationReasons = metadata?.degradationReasons != null
    && (!Array.isArray(metadata.degradationReasons) || metadata.degradationReasons.length > 0)
  const explicitlyNonRemote = sourceTexts.some((value) => value !== 'remote')
  const degraded = rawDegradedMarkers.some((value) => value === true)
    || malformedSource
    || malformedDegraded
    || explicitlyNonRemote
    || Boolean(fallbackReason)
    || hasDegradationReasons
  const source: ResultProvenanceSource = sourceTexts.some((value) => value.includes('demo'))
    ? 'demo'
    : sourceTexts.some((value) => value.includes('unavailable'))
      ? 'unavailable'
      : explicitlyNonRemote
        ? 'fallback'
        : 'remote'

  return {
    ...result,
    source,
    degraded,
    ...(fallbackReason ? { fallbackReason } : {}),
  }
}

export class BizException extends Error {
  constructor(
    public code: number,
    public message: string,
    public traceId?: string,
    public data?: unknown,
    public status?: number,
  ) {
    super(message)
    this.name = 'BizException'
  }
}

export const getRateLimitRetryAfterSeconds = (error: unknown): number | undefined => {
  const data = error instanceof BizException
    ? error.data
    : (error as { response?: { data?: { data?: unknown } } })?.response?.data?.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined
  const seconds = Number((data as { retryAfterSeconds?: unknown }).retryAfterSeconds)
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined
}

const isResultPayload = (value: unknown): value is Result<unknown> => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<Result<unknown>>
  return typeof candidate.code === 'number'
    && typeof candidate.message === 'string'
}

const toBizException = (result: Result<unknown>, status?: number) =>
  new BizException(result.code, result.message, result.traceId, result.data, status)

const errorMessageMap: Record<number, string> = {
  10001: '参数不正确，请检查填写内容后重试',
  10002: '请求格式不正确，请刷新页面后重试',
  10401: '请先登录后再操作',
  10403: '当前账号没有权限执行该操作',
  10404: '目标资源不存在或已被删除',
  10429: '操作太频繁，请稍后再试',
  20000: '系统暂时开小差了，请稍后重试',
  20001: '内容服务暂时无法完成请求，请稍后重试',
  20002: '当前操作暂时无法完成，请稍后重试',
  20003: '异步处理暂时不可用，请稍后重试',
  20004: '搜索暂时无法完整返回结果，请稍后重试',
  20500: '依赖服务暂时不可用，请稍后重试',
  30001: '请勿重复操作',
  30002: '当前状态不允许执行该操作，请刷新后重试',
  30003: '该内容已被其他管理员修改，请刷新后重试',
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

const internalErrorText = /elasticsearch|mysql|redis|kafka|database|sql|jdbc|stack trace|exception|mapper|repository|connection refused|timed out while|uid\b|traceback/i

const safeApiMessage = (message: unknown, fallback: string) => {
  const text = typeof message === 'string' ? message.trim() : ''
  if (!text || text.length > 160 || internalErrorText.test(text)) return fallback
  return text
}

/**
 * Trace ID 只用于排查，不进入面向用户的提示文案。
 * 需要展示给支持人员时使用 getErrorTraceId 单独获取。
 */
export function getErrorTraceId(error: unknown): string | undefined {
  if (error instanceof BizException) return error.traceId
  if (axios.isAxiosError(error) && isResultPayload(error.response?.data)) {
    return error.response.data.traceId
  }
  return undefined
}

export function getErrorMessage(error: unknown, fallback = '操作失败') {
  if (error instanceof BizException) {
    const mapped = errorMessageMap[error.code]
    if (mapped) return mapped
    if (error.status && error.status < 500) return safeApiMessage(error.message, fallback)
    return fallback
  }
  if (axios.isAxiosError(error)) {
    if (error.code === 'ERR_CANCELED') return '请求已取消，请重新操作'
    if (error.response?.status === 400) return errorMessageMap[10001]
    if (error.response?.status === 401) return errorMessageMap[10401]
    if (error.response?.status === 403) return errorMessageMap[10403]
    if (error.response?.status === 404) return '接口或资源不存在'
    if (error.response?.status === 409) return errorMessageMap[30002]
    if (error.response?.status === 429) return errorMessageMap[10429]
    if (error.response?.status && error.response.status >= 500) return '服务暂时不可用，请稍后重试'
    if (['ECONNABORTED', 'ETIMEDOUT'].includes(String(error.code || '').toUpperCase())) {
      return '请求超时，请稍后重试'
    }
    if (!error.response) return '网络连接异常，请检查网络后重试'
    return fallback
  }
  return fallback
}

export function getResultMessage(result: Pick<Result, 'message' | 'traceId'> | null | undefined, fallback = '操作失败') {
  return safeApiMessage(result?.message, fallback)
}

const rawApiBaseURL = (import.meta.env.VITE_API_BASE_URL || '').trim()

const isDevLocalBackend = (value: string) => {
  if (!import.meta.env.DEV || !value) {
    return false
  }
  try {
    const url = new URL(value)
    return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && url.port === '8080'
  } catch {
    return false
  }
}

export const apiBaseURL = isDevLocalBackend(rawApiBaseURL) ? '' : rawApiBaseURL

const client: AxiosInstance = axios.create({
  baseURL: apiBaseURL,
  timeout: 30000,
  withCredentials: true,
})

let sessionExpiryRedirect: Promise<void> | null = null

const redirectToLogin = async () => {
  if (window.location.pathname === '/login') return
  if (sessionExpiryRedirect) return sessionExpiryRedirect
  sessionExpiryRedirect = (async () => {
    const redirect = safeRedirect(`${window.location.pathname}${window.location.search}${window.location.hash}`)
    // 优先交给已注册的 SPA 处理器（软导航 + 会话过期提示），避免整页硬刷新丢掉
    // 评论框 / 联系请求等尚未提交的内存态。没有处理器或导航失败时再兜底硬跳。
    if (await notifySessionExpired({ redirect: redirect && redirect !== '/' ? redirect : '' })) return
    const target = redirect && redirect !== '/' ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'
    window.location.assign(target)
  })().finally(() => {
    sessionExpiryRedirect = null
  })
  return sessionExpiryRedirect
}

// crypto.randomUUID 仅在安全上下文（HTTPS / localhost）可用。局域网 IP、旧 WebView、
// 部分 App 内置浏览器下为 undefined，若直接调用会导致每个请求在离开浏览器前抛错。
const safeTraceId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

const currentAuthSessionVersion = () => authTokenStore.getVersion?.() ?? 0

const requestBelongsToCurrentAuthSession = (requestVersion: unknown) =>
  typeof requestVersion === 'number'
  && Number.isSafeInteger(requestVersion)
  && requestVersion >= 0
  && requestVersion === currentAuthSessionVersion()

// 请求拦截器
client.interceptors.request.use((config) => {
  const token = authTokenStore.get()
  config.authSessionVersion = currentAuthSessionVersion()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // 生成或使用现有的 traceId
  config.headers['X-Trace-Id'] = safeTraceId()

  return config
})

// 响应拦截器
client.interceptors.response.use(
  (response): any => {
    const result = response.data as Result
    if (result.code !== 0) {
      const error = toBizException(result, response.status)
      return Promise.reject(error)
    }
    return result as any
  },
  async (error: AxiosError<Result<unknown>>) => {
    if (
      error.response?.status === 401
      && !error.config?.skipAuthRedirect
      && requestBelongsToCurrentAuthSession(error.config?.authSessionVersion)
    ) {
      try {
        useAuthStore().expireSession()
      } catch {
        // Pinia may not be active during very early boot; token cleanup is still authoritative.
        authTokenStore.clear()
      }
      await redirectToLogin()
    }
    if (isResultPayload(error.response?.data)) {
      return Promise.reject(toBizException(error.response.data, error.response?.status))
    }
    return Promise.reject(error)
  },
)

export default client
