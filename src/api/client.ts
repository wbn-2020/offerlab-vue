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
  (response) => {
    const result = response.data as Result
    if (result.code !== 0) {
      const error = new BizException(result.code, result.message, result.traceId)
      return Promise.reject(error)
    }
    return result
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
