import { QueryClient } from '@tanstack/vue-query'
import axios from 'axios'

const errorStatus = (error: unknown) => {
  if (axios.isAxiosError(error)) return error.response?.status
  if (!error || typeof error !== 'object') return undefined
  const status = (error as { status?: unknown }).status
  return typeof status === 'number' ? status : undefined
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: unknown) => {
        if (failureCount >= 2) return false
        const status = errorStatus(error)
        if (typeof status === 'number' && status >= 400 && status < 500) return false
        return true
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
  },
})

export const resetSessionQueryState = () => {
  void queryClient.cancelQueries()
  queryClient.clear()
}
