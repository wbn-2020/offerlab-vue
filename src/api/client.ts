import axios, { AxiosInstance, AxiosError } from 'axios'

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
  ) {
    super(message)
    this.name = 'BizException'
  }
}

export function getErrorMessage(error: unknown, fallback = '操作失败') {
  if (error instanceof BizException) {
    const message = error.code === 10403
      ? '当前账号没有权限执行该操作'
      : error.code === 10404
        ? '目标资源不存在或已被删除'
        : error.code === 30002
          ? '当前状态不允许执行该操作，请刷新后重试'
          : error.message || fallback
    return error.traceId ? `${message}（Trace: ${error.traceId}）` : message
  }
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403) return '当前账号没有权限执行该操作'
    if (error.response?.status === 404) return '接口或资源不存在'
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

// 请求拦截器
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
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
      const error = new BizException(result.code, result.message, result.traceId)
      return Promise.reject(error)
    }
    return result as any
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default client
