import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Notification } from '@/api/types'

export const useRealtimeStore = defineStore('realtime', () => {
  const connected = ref(false)
  const unreadCount = ref({
    total: 0,
    like: 0,
    comment: 0,
    favorite: 0,
    follower: 0,
    mention: 0,
    system: 0,
  })

  const setConnected = (value: boolean) => {
    connected.value = value
  }

  const setUnreadCount = (counts: typeof unreadCount.value) => {
    unreadCount.value = counts
  }

  const pushNotification = (notification: Notification) => {
    // 处理推送的通知
    unreadCount.value.total++
  }

  return {
    connected,
    unreadCount,
    setConnected,
    setUnreadCount,
    pushNotification,
  }
})
