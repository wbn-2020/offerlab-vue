import client, { Result } from './client'

export interface UserTaskItem {
  taskCode: string
  title: string
  description: string
  actionText?: string
  actionRoute?: string
  manualCompletable: boolean
  completed: boolean
  completedAt?: string
}

export interface UserTaskOverview {
  taskType: 'ONBOARDING' | 'DAILY' | string
  title: string
  subtitle?: string
  active: boolean
  completedCount: number
  totalCount: number
  items: UserTaskItem[]
}

const adaptTaskItem = (raw: any): UserTaskItem => ({
  taskCode: String(raw?.taskCode || ''),
  title: String(raw?.title || ''),
  description: String(raw?.description || ''),
  actionText: raw?.actionText ? String(raw.actionText) : undefined,
  actionRoute: raw?.actionRoute ? String(raw.actionRoute) : undefined,
  manualCompletable: Boolean(raw?.manualCompletable),
  completed: Boolean(raw?.completed),
  completedAt: raw?.completedAt ? String(raw.completedAt) : undefined,
})

const adaptTaskOverview = (raw: any): UserTaskOverview => ({
  taskType: String(raw?.taskType || 'ONBOARDING'),
  title: String(raw?.title || '任务面板'),
  subtitle: raw?.subtitle ? String(raw.subtitle) : undefined,
  active: raw?.active !== false,
  completedCount: Number(raw?.completedCount || 0),
  totalCount: Number(raw?.totalCount || 0),
  items: Array.isArray(raw?.items) ? raw.items.map(adaptTaskItem) : [],
})

export const taskApi = {
  getOnboardingTasks: async (): Promise<Result<UserTaskOverview>> => {
    const res = await client.get('/api/v1/me/onboarding-tasks') as Result<any>
    return { ...res, data: res.data ? adaptTaskOverview(res.data) : null }
  },

  completeOnboardingTask: (taskCode: string): Promise<Result<void>> =>
    client.post(`/api/v1/me/onboarding-tasks/${encodeURIComponent(taskCode)}/complete`),

  getDailyTasks: async (): Promise<Result<UserTaskOverview>> => {
    const res = await client.get('/api/v1/me/daily-tasks') as Result<any>
    return { ...res, data: res.data ? adaptTaskOverview(res.data) : null }
  },

  completeDailyTask: (taskCode: string): Promise<Result<void>> =>
    client.post(`/api/v1/me/daily-tasks/${encodeURIComponent(taskCode)}/complete`),
}
