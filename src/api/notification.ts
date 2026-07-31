import client, { Result } from './client'
import type { Notification, NotificationPreference, NotificationRealtimeStatus, NotificationUnreadCount, PaginatedResponse } from './types'
import { adaptNotification, adaptPage } from './adapters'

export const normalizeNotificationPreference = (raw?: Partial<NotificationPreference> | null): NotificationPreference => ({
  interactionNotification: raw?.interactionNotification !== false,
  systemNotification: raw?.systemNotification !== false,
  likeNotification: raw?.likeNotification !== false,
  commentNotification: raw?.commentNotification !== false,
  followNotification: raw?.followNotification !== false,
  favoriteNotification: raw?.favoriteNotification !== false,
  mentionNotification: raw?.mentionNotification !== false,
})

export const interactionPreferenceMuted = (
  type: string,
  preference?: Partial<NotificationPreference> | null,
) => {
  const pref = normalizeNotificationPreference(preference)
  if (['like', 'comment', 'favorite', 'follower', 'mention'].includes(type) && !pref.interactionNotification) return true
  if (type === 'like') return !pref.likeNotification
  if (type === 'comment') return !pref.commentNotification
  if (type === 'favorite') return !pref.favoriteNotification
  if (type === 'follower') return !pref.followNotification
  if (type === 'mention') return !pref.mentionNotification
  if (type === 'system') return !pref.systemNotification
  return false
}

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

export interface NotificationReadAllResult {
  updatedCount: number
  capped: boolean
  remainingUnread: number
}

export interface NotificationRequestOptions {
  signal?: AbortSignal
  skipAuthRedirect?: boolean
}

const adaptReadAllResult = (raw: any): NotificationReadAllResult => ({
  updatedCount: Number(raw?.updatedCount || 0),
  capped: raw?.capped === true,
  remainingUnread: Number(raw?.remainingUnread || 0),
})

export const notificationApi = {
  getList: async (type?: string, cursor?: string, size = 20): Promise<Result<PaginatedResponse<Notification>>> => {
    const res = await client.get('/api/v1/notifications', { params: { type, cursor, size } }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptNotification) : null }
  },

  getUnreadCount: async (options?: NotificationRequestOptions): Promise<Result<NotificationUnreadCount>> => {
    const res = await client.get('/api/v1/notifications/unread-count', {
      signal: options?.signal,
      skipAuthRedirect: options?.skipAuthRedirect,
    }) as Result<any>
    return { ...res, data: res.data ? adaptUnreadCount(res.data) : null }
  },

  getRealtimeStatus: async (options?: Pick<NotificationRequestOptions, 'signal'>): Promise<Result<NotificationRealtimeStatus>> => {
    const res = await client.get('/api/v1/notifications/realtime-status', {
      signal: options?.signal,
      skipAuthRedirect: true,
    }) as Result<any>
    return { ...res, data: res.data ? adaptRealtimeStatus(res.data) : null }
  },

  getPreferences: (): Promise<Result<NotificationPreference>> =>
    client.get('/api/v1/notifications/preferences'),

  updatePreferences: (req: NotificationPreference): Promise<Result<NotificationPreference>> =>
    client.put('/api/v1/notifications/preferences', req),

  markAsRead: (ids: Array<string | number>): Promise<Result<void>> =>
    client.post('/api/v1/notifications/read', { ids }),

  markAllAsRead: async (): Promise<Result<NotificationReadAllResult>> => {
    const res = await client.post('/api/v1/notifications/read-all') as Result<any>
    return { ...res, data: res.data ? adaptReadAllResult(res.data) : null }
  },
}
