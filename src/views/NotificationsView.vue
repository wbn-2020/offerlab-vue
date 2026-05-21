<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100">通知</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">点赞、评论、关注和系统消息</p>
        </div>
        <button
          @click="markAllAsRead"
          :disabled="isMutating || unread.total === 0"
          class="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          全部已读
        </button>
      </div>

      <div class="flex gap-2 border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          @click="switchTab(tab.value)"
          :class="[
            'px-4 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap',
            activeType === tab.value
              ? 'text-primary-600 border-primary-600'
              : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
          ]"
        >
          {{ tab.label }}
          <span v-if="tab.count > 0" class="ml-2 text-xs bg-danger text-white px-2 py-0.5 rounded-full">
            {{ tab.count }}
          </span>
        </button>
      </div>

      <div v-if="isLoading" class="text-center py-12 text-slate-500 dark:text-slate-400">
        正在加载通知...
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="notif in notifications"
          :key="notif.notificationId"
          :class="[
            'p-4 rounded-lg border transition-colors',
            notif.read
              ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              : 'bg-primary-50 dark:bg-slate-800 border-primary-200 dark:border-slate-700'
          ]"
        >
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full flex-shrink-0 bg-primary-600 text-white flex items-center justify-center font-semibold">
              {{ iconFor(notif.type) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-900 dark:text-slate-100">{{ notif.title }}</p>
              <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">{{ notif.content }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-500 mt-2">{{ formatTime(notif.createdAt) }}</p>
            </div>
            <button
              v-if="!notif.read"
              @click.stop="markAsRead(notif.notificationId)"
              :disabled="isMutating"
              class="text-xs px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors flex-shrink-0 disabled:opacity-50"
            >
              标记已读
            </button>
          </div>
        </div>

        <div v-if="notifications.length === 0" class="text-center py-12">
          <p class="text-slate-500 dark:text-slate-400">{{ emptyText }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { notificationApi } from '@/api/notification'
import type { ApiId, Notification } from '@/api/types'
import { formatTime } from '@/lib/format'

const activeType = ref('all')
const notifications = ref<Notification[]>([])
const isLoading = ref(false)
const isMutating = ref(false)
const emptyText = ref('暂无通知')
const unread = ref({ total: 0, like: 0, comment: 0, follower: 0, system: 0 })

const tabs = computed(() => [
  { value: 'all', label: '全部', count: unread.value.total },
  { value: 'like', label: '点赞', count: unread.value.like },
  { value: 'comment', label: '评论', count: unread.value.comment },
  { value: 'follower', label: '关注', count: unread.value.follower },
  { value: 'system', label: '系统', count: unread.value.system },
])

const iconFor = (type: string) => {
  if (type === 'like') return '赞'
  if (type === 'comment') return '评'
  if (type === 'follower') return '关'
  return '信'
}

const loadUnread = async () => {
  const res = await notificationApi.getUnreadCount()
  if (res.code === 0 && res.data) unread.value = { ...unread.value, ...res.data }
}

const loadNotifications = async () => {
  isLoading.value = true
  try {
    const type = activeType.value === 'all' ? undefined : activeType.value
    const res = await notificationApi.getList(type)
    notifications.value = res.data?.items || []
    emptyText.value = notifications.value.length === 0 ? '暂无通知' : ''
  } catch (error) {
    console.error('Failed to load notifications:', error)
    emptyText.value = '通知接口暂不可用'
  } finally {
    isLoading.value = false
  }
}

const switchTab = async (type: string) => {
  activeType.value = type
  await loadNotifications()
}

const markAsRead = async (id: ApiId) => {
  isMutating.value = true
  try {
    await notificationApi.markAsRead([id])
    notifications.value = notifications.value.map(item =>
      item.notificationId === id ? { ...item, read: true } : item
    )
    await loadUnread()
  } finally {
    isMutating.value = false
  }
}

const markAllAsRead = async () => {
  isMutating.value = true
  try {
    await notificationApi.markAllAsRead()
    notifications.value = notifications.value.map(item => ({ ...item, read: true }))
    await loadUnread()
  } finally {
    isMutating.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadUnread(), loadNotifications()])
})
</script>
