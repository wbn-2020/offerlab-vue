import client, { Result } from './client'
import type { Notification, PaginatedResponse } from './types'
import { adaptNotification, adaptPage } from './adapters'

export const notificationApi = {
  getList: async (type?: string, cursor?: string, size = 20): Promise<Result<PaginatedResponse<Notification>>> => {
    const res = await client.get('/api/v1/notifications', { params: { type, cursor, size } }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptNotification) : null }
  },

  getUnreadCount: (): Promise<Result<{ total: number; like: number; comment: number; follower: number; system: number }>> =>
    client.get('/api/v1/notifications/unread-count'),

  markAsRead: (ids: Array<string | number>): Promise<Result<void>> =>
    client.post('/api/v1/notifications/read', { ids }),

  markAllAsRead: (): Promise<Result<void>> =>
    client.post('/api/v1/notifications/read-all'),
}
