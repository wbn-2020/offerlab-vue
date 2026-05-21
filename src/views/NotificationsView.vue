<template>
  <div class="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
    <div class="mx-auto max-w-5xl">
      <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100">通知中心</h1>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
            查看点赞、评论、收藏、关注和提及消息
          </p>
        </div>
        <button
          type="button"
          @click="markAllAsRead"
          :disabled="isMutating || unread.total === 0"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          全部已读
        </button>
      </div>

      <div class="mb-6 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        <div class="flex min-w-max gap-2">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            @click="switchTab(tab.value)"
            :class="[
              'border-b-2 px-4 py-3 text-sm font-medium transition-colors',
              activeType === tab.value
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            ]"
          >
            {{ tab.label }}
            <span v-if="tab.count > 0" class="ml-2 rounded-full bg-danger px-2 py-0.5 text-xs text-white">
              {{ tab.count }}
            </span>
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="rounded-xl border border-slate-200 bg-white py-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        正在加载通知...
      </div>

      <div v-else-if="notifications.length === 0" class="rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center dark:border-slate-700 dark:bg-slate-900">
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ emptyText }}</p>
      </div>

      <div v-else class="space-y-3">
        <article
          v-for="notif in notifications"
          :key="notif.notificationId"
          :class="[
            'rounded-xl border p-4 transition-colors',
            notif.targetPath ? 'cursor-pointer hover:border-primary-300 hover:bg-primary-50/40 dark:hover:border-primary-800 dark:hover:bg-slate-800' : '',
            notif.read
              ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
              : 'border-primary-200 bg-primary-50 dark:border-slate-700 dark:bg-slate-800'
          ]"
          @click="openNotification(notif)"
        >
          <div class="flex items-start gap-4">
            <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">
              {{ iconFor(notif.type) }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ notif.title }}</p>
                <span v-if="!notif.read" class="h-2 w-2 rounded-full bg-danger" />
              </div>
              <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">{{ notif.content }}</p>
              <p class="mt-2 text-xs text-slate-500">{{ formatTime(notif.createdAt) }}</p>
            </div>
            <button
              v-if="!notif.read"
              type="button"
              @click.stop="markAsRead(notif.notificationId)"
              :disabled="isMutating"
              class="flex-shrink-0 rounded bg-primary-600 px-2 py-1 text-xs text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              标记已读
            </button>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { notificationApi } from '@/api/notification'
import type { ApiId, Notification } from '@/api/types'
import { formatTime } from '@/lib/format'
import { useRealtimeStore } from '@/stores/realtime'

const router = useRouter()
const realtimeStore = useRealtimeStore()

const activeType = ref('all')
const notifications = ref<Notification[]>([])
const isLoading = ref(false)
const isMutating = ref(false)
const emptyText = ref('暂无通知')
const unread = ref({ total: 0, like: 0, comment: 0, favorite: 0, follower: 0, mention: 0, system: 0 })

const tabs = computed(() => [
  { value: 'all', label: '全部', count: unread.value.total },
  { value: 'like', label: '点赞', count: unread.value.like },
  { value: 'comment', label: '评论', count: unread.value.comment },
  { value: 'favorite', label: '收藏', count: unread.value.favorite },
  { value: 'follower', label: '关注', count: unread.value.follower },
  { value: 'mention', label: '提及我', count: unread.value.mention },
  { value: 'system', label: '系统', count: unread.value.system },
])

const iconFor = (type: string) => {
  if (type === 'like') return '赞'
  if (type === 'comment') return '评'
  if (type === 'favorite') return '藏'
  if (type === 'follower') return '关'
  if (type === 'mention') return '@'
  return '信'
}

const syncUnread = (value: typeof unread.value) => {
  unread.value = { ...unread.value, ...value }
  realtimeStore.setUnreadCount(unread.value)
}

const loadUnread = async () => {
  const res = await notificationApi.getUnreadCount()
  if (res.code === 0 && res.data) syncUnread(res.data)
}

const loadNotifications = async () => {
  isLoading.value = true
  try {
    const type = activeType.value === 'all' ? undefined : activeType.value
    const res = await notificationApi.getList(type)
    notifications.value = res.data?.items || []
    emptyText.value = '暂无通知'
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

const openNotification = async (notif: Notification) => {
  if (!notif.read) await markAsRead(notif.notificationId)
  if (notif.targetPath) router.push(notif.targetPath)
}

onMounted(async () => {
  await Promise.all([loadUnread(), loadNotifications()])
})
</script>
