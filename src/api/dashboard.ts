import client, { Result } from './client'

export const dashboardApi = {
  getTrendDashboard: (period?: 'week' | 'month' | 'quarter'): Promise<Result<any>> =>
    client.get('/api/v1/dashboard/trend', { params: { period } }),

  getPersonalDashboard: (): Promise<Result<any>> =>
    client.get('/api/v1/dashboard/me'),
}
