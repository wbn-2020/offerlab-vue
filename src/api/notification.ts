import client, { Result } from './client'
import type { Notification, PaginatedResponse } from './types'

export const notificationApi = {
  getList: (type?: string, cursor?: string, size = 20): Promise<Result<PaginatedResponse<Notification>>> =>
    client.get('/api/v1/notifications', { params: { type, cursor, size } }),

  getUnreadCount: (): Promise<Result<{ total: number; like: number; comment: number; follower: number; system: number }>> =>
    client.get('/api/v1/notifications/unread-count'),

  markAsRead: (notificationIds: number[]): Promise<Result<void>> =>
    client.post('/api/v1/notifications/read', { notificationIds }),

  markAllAsRead: (): Promise<Result<void>> =>
    client.post('/api/v1/notifications/read-all'),
}
