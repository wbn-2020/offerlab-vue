import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ApiId, Notification, NotificationRealtimeStatus, NotificationUnreadCount } from '@/api/types'

export const emptyUnreadCount = (): NotificationUnreadCount => ({
  total: 0,
  like: 0,
  comment: 0,
  favorite: 0,
  follower: 0,
  mention: 0,
  system: 0,
})

export const useRealtimeStore = defineStore('realtime', () => {
  const recentNotificationIds = new Set<string>()
  const maxRecentNotificationIds = 200
  const connected = ref(false)
  const unreadCount = ref<NotificationUnreadCount>(emptyUnreadCount())
  const latestUnreadId = ref<ApiId | undefined>()
  const latestUnreadAt = ref<number | undefined>()
  const lastSyncedAt = ref(0)
  const pollIntervalSeconds = ref(20)
  const websocketEnabled = ref(false)

  const setConnected = (value: boolean) => {
    connected.value = value
  }

  const setUnreadCount = (counts: NotificationUnreadCount) => {
    unreadCount.value = { ...emptyUnreadCount(), ...counts }
  }

  const setRealtimeStatus = (status: NotificationRealtimeStatus) => {
    setUnreadCount(status.unread)
    latestUnreadId.value = status.latestUnreadId
    latestUnreadAt.value = status.latestUnreadAt
    if (status.latestUnreadId != null) {
      rememberNotificationId(status.latestUnreadId)
    }
    lastSyncedAt.value = Date.now()
    pollIntervalSeconds.value = Math.max(10, status.pollIntervalSeconds || 20)
    websocketEnabled.value = status.websocketEnabled === true
  }

  const reset = () => {
    unreadCount.value = emptyUnreadCount()
    latestUnreadId.value = undefined
    latestUnreadAt.value = undefined
    lastSyncedAt.value = 0
    pollIntervalSeconds.value = 20
    websocketEnabled.value = false
    connected.value = false
    recentNotificationIds.clear()
  }

  const rememberNotificationId = (notificationId: ApiId) => {
    const key = String(notificationId)
    if (recentNotificationIds.has(key)) return false
    recentNotificationIds.add(key)
    if (recentNotificationIds.size > maxRecentNotificationIds) {
      const oldestKey = recentNotificationIds.values().next().value
      if (oldestKey !== undefined) recentNotificationIds.delete(oldestKey)
    }
    return true
  }

  const pushNotification = (notification: Notification) => {
    if (notification.notificationId === null || notification.notificationId === undefined || notification.notificationId === '') {
      return false
    }
    if (!rememberNotificationId(notification.notificationId)) return false
    const type = notification.type as keyof NotificationUnreadCount
    const typedCount = type in unreadCount.value ? unreadCount.value[type] + 1 : 0
    unreadCount.value = {
      ...unreadCount.value,
      total: unreadCount.value.total + 1,
      ...(type in unreadCount.value ? { [type]: typedCount } : {}),
    }
    latestUnreadId.value = notification.notificationId
    latestUnreadAt.value = notification.createdAt
    lastSyncedAt.value = Date.now()
    return true
  }

  return {
    connected,
    unreadCount,
    latestUnreadId,
    latestUnreadAt,
    lastSyncedAt,
    pollIntervalSeconds,
    websocketEnabled,
    setConnected,
    setUnreadCount,
    setRealtimeStatus,
    reset,
    pushNotification,
  }
})
