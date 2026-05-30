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
  const connected = ref(false)
  const unreadCount = ref<NotificationUnreadCount>(emptyUnreadCount())
  const latestUnreadId = ref<ApiId | undefined>()
  const latestUnreadAt = ref<number | undefined>()
  const lastSyncedAt = ref(0)
  const pollIntervalSeconds = ref(20)

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
    lastSyncedAt.value = Date.now()
    pollIntervalSeconds.value = Math.max(10, status.pollIntervalSeconds || 20)
  }

  const reset = () => {
    unreadCount.value = emptyUnreadCount()
    latestUnreadId.value = undefined
    latestUnreadAt.value = undefined
    lastSyncedAt.value = 0
    pollIntervalSeconds.value = 20
    connected.value = false
  }

  const pushNotification = (notification: Notification) => {
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
  }

  return {
    connected,
    unreadCount,
    latestUnreadId,
    latestUnreadAt,
    lastSyncedAt,
    pollIntervalSeconds,
    setConnected,
    setUnreadCount,
    setRealtimeStatus,
    reset,
    pushNotification,
  }
})
