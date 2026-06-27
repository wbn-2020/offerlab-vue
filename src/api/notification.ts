import client, { Result } from './client'
import type { Notification, NotificationPreference, NotificationRealtimeStatus, NotificationUnreadCount, PaginatedResponse } from './types'
import { adaptNotification, adaptPage } from './adapters'

const adaptUnreadCount = (raw: any): NotificationUnreadCount => ({
  total: Number(raw?.total || 0),
  like: Number(raw?.like || 0),
  comment: Number(raw?.comment || 0),
  favorite: Number(raw?.favorite || 0),
  follower: Number(raw?.follower || 0),
  mention: Number(raw?.mention || 0),
  system: Number(raw?.system || 0),
})

const adaptRealtimeStatus = (raw: any): NotificationRealtimeStatus => ({
  unread: adaptUnreadCount(raw?.unread || raw?.unreadCount || raw || {}),
  latestUnreadId: raw?.latestUnreadId ?? undefined,
  latestUnreadAt: raw?.latestUnreadAt ? new Date(raw.latestUnreadAt).getTime() : undefined,
  serverTime: Number(raw?.serverTime || Date.now()),
  pollIntervalSeconds: Math.max(10, Number(raw?.pollIntervalSeconds || 20)),
  websocketEnabled: raw?.websocketEnabled === true,
})

export const notificationApi = {
  getList: async (type?: string, cursor?: string, size = 20): Promise<Result<PaginatedResponse<Notification>>> => {
    const res = await client.get('/api/v1/notifications', { params: { type, cursor, size } }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptNotification) : null }
  },

  getUnreadCount: async (): Promise<Result<NotificationUnreadCount>> => {
    const res = await client.get('/api/v1/notifications/unread-count') as Result<any>
    return { ...res, data: res.data ? adaptUnreadCount(res.data) : null }
  },

  getRealtimeStatus: async (): Promise<Result<NotificationRealtimeStatus>> => {
    const res = await client.get('/api/v1/notifications/realtime-status', { skipAuthRedirect: true }) as Result<any>
    return { ...res, data: res.data ? adaptRealtimeStatus(res.data) : null }
  },

  getPreferences: (): Promise<Result<NotificationPreference>> =>
    client.get('/api/v1/notifications/preferences'),

  updatePreferences: (req: NotificationPreference): Promise<Result<NotificationPreference>> =>
    client.put('/api/v1/notifications/preferences', req),

  markAsRead: (ids: Array<string | number>): Promise<Result<void>> =>
    client.post('/api/v1/notifications/read', { ids }),

  markAllAsRead: (): Promise<Result<void>> =>
    client.post('/api/v1/notifications/read-all'),
}
