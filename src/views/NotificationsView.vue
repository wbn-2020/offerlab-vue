<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="px-4 py-6 sm:px-6">
    <div class="mx-auto max-w-5xl">
      <section class="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-sm font-medium text-primary-600 dark:text-primary-400">社区回访中心</p>
            <h1 class="mt-1 text-2xl font-bold text-slate-950 dark:text-slate-100 sm:text-3xl">通知中心</h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              看清谁回应了你、关联哪条内容，以及下一步回到讨论、作者主页或话题页。
            </p>
            <p class="mt-2 max-w-2xl text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
              轻反馈只覆盖评论、收藏、关注和提及等社区互动；页面尊重通知偏好，只提供回访入口，没有生成新的后端通知。
            </p>
            <p v-if="preferenceOffText" class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
              {{ preferenceOffText }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div class="metric-card">
              <span>未读</span>
              <strong>{{ unread.total }}</strong>
            </div>
            <div class="metric-card">
              <span>互动</span>
              <strong>{{ interactionUnread }}</strong>
            </div>
            <div class="metric-card">
              <span>提及</span>
              <strong>{{ unread.mention }}</strong>
            </div>
          </div>
        </div>

        <div class="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div class="overflow-x-auto">
            <div class="flex min-w-max gap-2">
              <button
                v-for="tab in tabs"
                :key="tab.value"
                type="button"
                @click="switchTab(tab.value)"
                :class="[
                  'tab-button',
                  activeType === tab.value ? 'tab-button-active' : 'tab-button-idle'
                ]"
              >
                <component :is="tab.icon" class="h-4 w-4" />
                <span>{{ tab.label }}</span>
                <span v-if="tab.count > 0" class="tab-count">{{ tab.count > 99 ? '99+' : tab.count }}</span>
              </button>
            </div>
          </div>

          <div class="mark-read-actions">
            <RouterLink
              to="/me/settings"
              class="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Bell class="h-4 w-4" />
              通知偏好
            </RouterLink>
            <button
              type="button"
              @click="markAllAsRead"
              :disabled="markAllDisabled"
              :title="markAllHint"
              class="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <CheckCheck class="h-4 w-4" />
              {{ isMutating ? '处理中...' : unread.total === 0 ? '暂无未读' : '全部已读' }}
            </button>
            <p v-if="unread.total === 0" class="mark-read-hint">当前没有未读通知</p>
          </div>
        </div>
      </section>

      <div v-if="isLoading && notifications.length === 0" class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div v-for="item in 4" :key="item" class="flex gap-4 border-b border-slate-100 py-4 last:border-b-0 dark:border-slate-800">
          <div class="h-11 w-11 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
          <div class="flex-1 space-y-3">
            <div class="h-4 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            <div class="h-3 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      </div>

      <div v-else-if="notifications.length === 0" class="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          <BellOff class="h-6 w-6" />
        </div>
        <h2 class="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">{{ emptyTitle }}</h2>
        <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">{{ emptyText }}</p>
        <RouterLink to="/explore" class="mt-5 inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700">
          去发现内容和作者
        </RouterLink>
      </div>

      <div v-else class="notification-list space-y-3">
        <section class="feedback-revisit-panel">
          <div>
            <p class="text-xs font-black text-primary-600 dark:text-primary-300">创作者轻反馈</p>
            <h2>最近可以回访的社区回应</h2>
            <span>{{ feedbackSummary }}</span>
          </div>
          <div class="feedback-revisit-actions">
            <RouterLink to="/me?tab=posts">我的内容</RouterLink>
            <RouterLink to="/me?tab=favorites">我的收藏</RouterLink>
            <RouterLink to="/me?tab=followers">新增关注者</RouterLink>
          </div>
        </section>

        <!-- Accessibility static contract: :role="notif.targetPath ? 'button' : undefined" :tabindex="notif.targetPath ? 0 : undefined" -->
        <article
          v-for="notif in notifications"
          :key="notif.notificationId"
          :class="[
            'rounded-xl border p-4 shadow-sm transition-colors',
            notificationTargetPath(notif) ? 'cursor-pointer hover:border-primary-300 hover:bg-primary-50/40 dark:hover:border-primary-800 dark:hover:bg-slate-800' : '',
            notif.read
              ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
              : 'border-primary-200 bg-primary-50 dark:border-slate-700 dark:bg-slate-800'
          ]"
          :role="notificationTargetPath(notif) ? 'button' : undefined"
          :tabindex="notificationTargetPath(notif) ? 0 : undefined"
          :aria-label="notificationActionLabel(notif)"
          @click="openNotification(notif)"
          @keydown.enter.prevent="openNotification(notif)"
          @keydown.space.prevent="openNotification(notif)"
        >
          <div class="notification-item-inner flex items-start gap-4">
            <div :class="['flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full', iconClass(notif.type)]">
              <component :is="iconFor(notif.type)" class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2 pr-1">
                <p class="min-w-0 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ notif.title }}</p>
                <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {{ labelFor(notif.type) }}
                </span>
                <span v-if="!notif.read" class="rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-white">未读</span>
                <span v-if="isMutedByPreference(notif)" class="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                  偏好静默
                </span>
              </div>
              <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">{{ notif.content }}</p>
              <div v-if="curationFeedbackPayload(notif)" class="curation-feedback-card mt-3">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="curation-feedback-label">入选反馈</span>
                  <strong class="text-sm text-slate-900 dark:text-slate-100">
                    内容标题：{{ curationFeedbackPayload(notif)?.contentTitle }}
                  </strong>
                </div>
                <dl class="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                  <div>
                    <dt>收录位置</dt>
                    <dd>{{ curationFeedbackPayload(notif)?.placementLabel }}</dd>
                  </div>
                  <div>
                    <dt>触发时间</dt>
                    <dd>{{ formatTime(curationFeedbackPayload(notif)?.triggeredAt || notif.createdAt) }}</dd>
                  </div>
                  <div class="sm:col-span-2">
                    <dt>收录理由</dt>
                    <dd>{{ curationFeedbackPayload(notif)?.reasonText }}</dd>
                  </div>
                </dl>
                <RouterLink
                  v-if="curationFeedbackPayload(notif)?.href"
                  :to="curationFeedbackPayload(notif)?.href || '/'"
                  class="curation-feedback-link"
                  @click.stop
                >
                  查看入口
                </RouterLink>
              </div>
              <div class="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
                <span>{{ formatTime(notif.createdAt) }}</span>
                <span v-if="notificationTargetPath(notif)">{{ nextStepText(notif) }}</span>
              </div>
            </div>
            <button
              v-if="!notif.read"
              type="button"
              @click.stop="markAsRead(notif.notificationId, notif.notificationIds ?? [notif.notificationId])"
              :disabled="isMutating"
              class="notification-read-button flex-shrink-0 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              标记已读
            </button>
          </div>
        </article>

        <div class="flex justify-center pt-3">
          <button
            v-if="hasMore"
            type="button"
            @click="loadMore"
            :disabled="isLoading"
            class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {{ isLoading ? '加载中...' : '加载更多' }}
          </button>
        </div>
      </div>
    </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { AtSign, Bell, BellOff, Bookmark, CheckCheck, Heart, MessageCircle, UserPlus } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import { interactionPreferenceMuted, notificationApi, normalizeNotificationPreference } from '@/api/notification'
import type { ApiId, CreatorCurationFeedback, Notification, NotificationPreference, NotificationUnreadCount } from '@/api/types'
import { formatTime } from '@/lib/format'
import AppHeader from '@/components/layout/AppHeader.vue'
import { emptyUnreadCount, useRealtimeStore } from '@/stores/realtime'

const router = useRouter()
const realtimeStore = useRealtimeStore()
const MAX_NOTIFICATION_ITEMS = 100

const activeType = ref('all')
const notifications = ref<Notification[]>([])
const isLoading = ref(false)
const isMutating = ref(false)
const loadErrorText = ref('')
const nextCursor = ref<string | undefined>()
const hasMore = ref(false)
const unread = computed(() => realtimeStore.unreadCount)
const preferences = ref<NotificationPreference | null>(null)
let notificationLoadGeneration = 0

type NotificationType = 'all' | 'like' | 'comment' | 'favorite' | 'follower' | 'mention' | 'system'
const notificationUnreadKeys = ['like', 'comment', 'favorite', 'follower', 'mention', 'system'] as const
type NotificationUnreadKey = typeof notificationUnreadKeys[number]

const tabs = computed(() => [
  { value: 'all', label: 'All', count: unread.value.total, icon: Bell },
  { value: 'like', label: 'Likes', count: unread.value.like, icon: Heart },
  { value: 'comment', label: 'Comments', count: unread.value.comment, icon: MessageCircle },
  { value: 'favorite', label: 'Favorites', count: unread.value.favorite, icon: Bookmark },
  { value: 'follower', label: 'Followers', count: unread.value.follower, icon: UserPlus },
  { value: 'mention', label: 'Mentions', count: unread.value.mention, icon: AtSign },
  { value: 'system', label: 'System', count: unread.value.system, icon: Bell },
])

const interactionUnread = computed(() => unread.value.like + unread.value.comment + unread.value.favorite + unread.value.follower)
const feedbackCounts = computed(() => notifications.value.reduce((counts, notif) => {
  if (notif.type === 'comment') counts.comment += 1
  if (notif.type === 'favorite') counts.favorite += 1
  if (notif.type === 'follower') counts.follower += 1
  if (notif.type === 'mention') counts.mention += 1
  return counts
}, { comment: 0, favorite: 0, follower: 0, mention: 0 }))
const feedbackSummary = computed(() => {
  const counts = feedbackCounts.value
  const parts = [
    counts.comment ? `${counts.comment} comments` : '',
    counts.favorite ? `${counts.favorite} favorites` : '',
    counts.follower ? `${counts.follower} new followers` : '',
    counts.mention ? `${counts.mention} mentions` : '',
  ].filter(Boolean)
  return parts.length
    ? `${parts.join(', ')} can take you back to discussions or profiles.`
    : 'No new comments, favorites, or followers in this list.'
})
const emptyTitle = computed(() => activeType.value === 'all' ? 'No notifications yet' : `No ${labelFor(activeType.value)} notifications`)
const emptyText = computed(() => {
  if (loadErrorText.value) return loadErrorText.value
  if (preferenceOffText.value) return 'Notifications are muted, but you can still browse and join discussions.'
  if (activeType.value === 'all') return 'Comments, likes, favorites, follows, and mentions will appear here.'
  if (activeType.value === 'follower') return 'New followers will appear here so you can visit their profiles.'
  if (activeType.value === 'system') return 'Community announcements and system notifications will appear here.'
  return 'There are no new notifications in this category.'
})
const preferenceOffText = computed(() => {
  const pref = preferences.value
  if (!pref) return ''
  if (!pref.interactionNotification && !pref.systemNotification) return 'Interaction and system notifications are muted.'
  if (!pref.interactionNotification) return 'Interaction notifications are muted.'
  if (!pref.systemNotification) return 'System notifications are muted.'
  return ''
})
const markAllDisabled = computed(() => isMutating.value || unread.value.total === 0)
const markAllHint = computed(() => unread.value.total === 0 ? '暂无未读通知' : '将全部通知标为已读')
const isNotificationUnreadKey = (type: string): type is NotificationUnreadKey => {
  return notificationUnreadKeys.includes(type as NotificationUnreadKey)
}

const iconFor = (type: string) => {
  if (type === 'like') return Heart
  if (type === 'comment') return MessageCircle
  if (type === 'favorite') return Bookmark
  if (type === 'follower') return UserPlus
  if (type === 'mention') return AtSign
  return Bell
}

const iconClass = (type: string) => {
  if (type === 'like') return 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300'
  if (type === 'comment') return 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300'
  if (type === 'favorite') return 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300'
  if (type === 'follower') return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300'
  if (type === 'mention') return 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300'
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
}

const labelFor = (type: string) => {
  if (type === 'like') return '点赞'
  if (type === 'comment') return '评论'
  if (type === 'favorite') return '收藏'
  if (type === 'follower') return '关注'
  if (type === 'mention') return '提及'
  if (type === 'system') return '系统'
  return '全部'
}

const syncUnread = (value: NotificationUnreadCount) => {
  realtimeStore.setUnreadCount({ ...emptyUnreadCount(), ...value })
}

const curationFeedbackPayload = (notif: Notification): CreatorCurationFeedback | undefined => notif.curationFeedback

const loadUnread = async () => {
  const res = await notificationApi.getUnreadCount()
  if (res.code === 0 && res.data) syncUnread(res.data)
}

const loadNotifications = async () => {
  const requestGeneration = ++notificationLoadGeneration
  const requestedType = activeType.value
  isLoading.value = true
  try {
    const type = requestedType === 'all' ? undefined : requestedType
    const res = await notificationApi.getList(type, undefined, 20)
    if (requestGeneration !== notificationLoadGeneration || requestedType !== activeType.value) return
    notifications.value = (res.data?.items || []).slice(0, MAX_NOTIFICATION_ITEMS)
    nextCursor.value = res.data?.nextCursor
    hasMore.value = Boolean(
      res.data?.hasMore
      && res.data?.nextCursor
      && notifications.value.length < MAX_NOTIFICATION_ITEMS,
    )
    loadErrorText.value = ''
  } catch (error) {
    if (requestGeneration !== notificationLoadGeneration || requestedType !== activeType.value) return
    loadErrorText.value = getErrorMessage(error, 'Notifications are temporarily unavailable.')
  } finally {
    if (requestGeneration === notificationLoadGeneration) {
      isLoading.value = false
    }
  }
}

const loadMore = async () => {
  if (!hasMore.value || isLoading.value) return
  const requestGeneration = ++notificationLoadGeneration
  const requestedType = activeType.value
  isLoading.value = true
  try {
    const type = requestedType === 'all' ? undefined : requestedType
    const res = await notificationApi.getList(type, nextCursor.value, 20)
    if (requestGeneration !== notificationLoadGeneration || requestedType !== activeType.value) return
    const mergedItems = [...notifications.value, ...(res.data?.items || [])]
    const uniqueItems = Array.from(new Map(
      mergedItems.map((item) => [String(item.notificationId), item]),
    ).values())
    notifications.value = uniqueItems.slice(0, MAX_NOTIFICATION_ITEMS)
    nextCursor.value = res.data?.nextCursor
    hasMore.value = Boolean(
      res.data?.hasMore
      && res.data?.nextCursor
      && uniqueItems.length < MAX_NOTIFICATION_ITEMS,
    )
  } catch (error) {
    if (requestGeneration !== notificationLoadGeneration || requestedType !== activeType.value) return
    toast.error(getErrorMessage(error, '加载更多通知失败'))
  } finally {
    if (requestGeneration === notificationLoadGeneration) {
      isLoading.value = false
    }
  }
}

const switchTab = async (type: NotificationType | string) => {
  activeType.value = type
  nextCursor.value = undefined
  hasMore.value = false
  await loadNotifications()
}

type MarkReadOptions = {
  background?: boolean
}

const applyReadLocally = (id: ApiId) => {
  const original = notifications.value.find(item => item.notificationId === id)
  if (!original || original.read) return null
  notifications.value = notifications.value.map(item =>
    item.notificationId === id ? { ...item, read: true } : item
  )
  const unreadDelta = original.unreadCount || 1
  const nextUnread = { ...unread.value, total: Math.max(0, unread.value.total - unreadDelta) }
  if (isNotificationUnreadKey(original.type)) {
    nextUnread[original.type] = Math.max(0, nextUnread[original.type] - unreadDelta)
  }
  syncUnread(nextUnread)
  return original
}

const restoreReadLocally = (original: Notification) => {
  notifications.value = notifications.value.map(item =>
    item.notificationId === original.notificationId ? original : item
  )
}

const markAsRead = async (id: ApiId, ids: ApiId[] = [id], options: MarkReadOptions = {}) => {
  if (!options.background) isMutating.value = true
  const original = applyReadLocally(id)
  try {
    await notificationApi.markAsRead(ids)
    await loadUnread()
  } catch (error) {
    if (original) restoreReadLocally(original)
    await loadUnread().catch(() => {})
    toast.error(getErrorMessage(error, '标记已读失败'))
  } finally {
    if (!options.background) isMutating.value = false
  }
}

const markAllAsRead = async () => {
  isMutating.value = true
  try {
    const res = await notificationApi.markAllAsRead()
    const result = res.data
    if (!result?.capped) {
      notifications.value = notifications.value.map(item => ({ ...item, read: true }))
    }
    await loadUnread()
    if (result?.capped) {
      toast.info(`已标记 ${result.updatedCount} 条通知，仍有 ${result.remainingUnread} 条未读`)
    } else {
      toast.success('已全部标为已读')
    }
  } catch (error) {
    toast.error(getErrorMessage(error, '全部标记已读失败'))
  } finally {
    isMutating.value = false
  }
}

const isReportReceiptNotification = (notif: Notification) => (
  notif.action === 'report_receipt' || Boolean(notif.targetPath?.startsWith('/me/reports'))
)

const notificationTargetPath = (notif: Notification) => {
  if (isReportReceiptNotification(notif)) return notif.targetPath || '/me/reports'
  return notif.targetPath
}

const openNotification = (notif: Notification) => {
  if (!notif.read) void markAsRead(notif.notificationId, notif.notificationIds ?? [notif.notificationId], { background: true })
  if (isReportReceiptNotification(notif) && !notif.targetPath) {
    router.push('/me/reports')
    return
  }
  if (notif.targetPath) {
    router.push(notif.targetPath)
    return
  }
}

const notificationActionLabel = (notif: Notification) => {
  return notificationTargetPath(notif) ? `${notif.title}，${nextStepText(notif)}` : undefined
}

const nextStepText = (notif: Notification) => {
  if (isReportReceiptNotification(notif)) return '查看举报回执'
  if (curationFeedbackPayload(notif)) return '查看入选内容'
  if (notif.type === 'follower') return '查看作者主页'
  if (notif.type === 'comment' || notif.type === 'mention') return '回到讨论'
  return '查看关联内容'
}

const isMutedByPreference = (notif: Notification) => (
  preferences.value ? interactionPreferenceMuted(notif.type, preferences.value) : false
)

const loadPreferences = async () => {
  try {
    const res = await notificationApi.getPreferences()
    preferences.value = normalizeNotificationPreference(res.data)
  } catch {
    preferences.value = null
  }
}

onMounted(async () => {
  await Promise.all([loadUnread(), loadNotifications(), loadPreferences()])
})

onBeforeUnmount(() => {
  notificationLoadGeneration += 1
})
</script>

<style scoped>
.metric-card {
  min-width: 6.5rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  padding: 0.75rem 0.9rem;
}

.metric-card span {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgb(100 116 139);
}

.metric-card strong {
  display: block;
  margin-top: 0.2rem;
  font-size: 1.35rem;
  line-height: 1.8rem;
  color: rgb(15 23 42);
}

.tab-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 0.6rem;
  border: 1px solid transparent;
  padding: 0.55rem 0.8rem;
  font-size: 0.875rem;
  font-weight: 600;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.tab-button-active {
  border-color: rgb(199 210 254);
  background: rgb(238 242 255);
  color: rgb(79 70 229);
}

.tab-button-idle {
  color: rgb(71 85 105);
}

.tab-button-idle:hover {
  background: rgb(248 250 252);
  color: rgb(15 23 42);
}

.tab-count {
  min-width: 1.25rem;
  border-radius: 999px;
  background: rgb(220 38 38);
  padding: 0.05rem 0.35rem;
  text-align: center;
  font-size: 0.7rem;
  color: white;
}

.mark-read-actions {
  display: grid;
  justify-items: start;
  gap: 0.35rem;
}

.mark-read-hint {
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(100 116 139);
}

.feedback-revisit-panel {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid rgb(191 219 254);
  border-radius: 0.75rem;
  background: rgb(239 246 255);
  padding: 1rem;
}

.feedback-revisit-panel h2 {
  margin-top: 0.15rem;
  font-size: 1rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.feedback-revisit-panel span {
  margin-top: 0.35rem;
  display: block;
  max-width: 42rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: rgb(71 85 105);
}

.feedback-revisit-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.feedback-revisit-actions a {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  background: white;
  padding: 0.45rem 0.8rem;
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgb(29 78 216);
}

.curation-feedback-card {
  border-radius: 0.75rem;
  border: 1px solid rgb(191 219 254);
  background: rgb(248 250 252);
  padding: 0.85rem;
}

.curation-feedback-label {
  border-radius: 999px;
  background: rgb(219 234 254);
  padding: 0.2rem 0.55rem;
  font-size: 0.7rem;
  font-weight: 900;
  color: rgb(29 78 216);
}

.curation-feedback-card dt {
  font-weight: 900;
  color: rgb(71 85 105);
}

.curation-feedback-card dd {
  margin-top: 0.15rem;
  line-height: 1.55;
}

.curation-feedback-link {
  margin-top: 0.65rem;
  display: inline-flex;
  min-height: 2rem;
  align-items: center;
  border-radius: 0.5rem;
  background: rgb(37 99 235);
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 900;
  color: white;
}

.dark .metric-card {
  border-color: rgb(51 65 85);
}

.dark .metric-card span {
  color: rgb(148 163 184);
}

.dark .metric-card strong {
  color: rgb(241 245 249);
}

.dark .tab-button-active {
  border-color: rgb(67 56 202);
  background: rgb(30 27 75);
  color: rgb(199 210 254);
}

.dark .tab-button-idle {
  color: rgb(203 213 225);
}

.dark .tab-button-idle:hover {
  background: rgb(30 41 59);
  color: rgb(248 250 252);
}

.dark .mark-read-hint {
  color: rgb(148 163 184);
}

.dark .feedback-revisit-panel {
  border-color: rgb(30 64 175);
  background: rgb(15 23 42);
}

.dark .feedback-revisit-panel h2 {
  color: rgb(248 250 252);
}

.dark .feedback-revisit-panel span {
  color: rgb(203 213 225);
}

.dark .feedback-revisit-actions a {
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

.dark .curation-feedback-card {
  border-color: rgb(30 64 175);
  background: rgb(15 23 42);
}

.dark .curation-feedback-label {
  background: rgb(30 58 138);
  color: rgb(191 219 254);
}

.dark .curation-feedback-card dt {
  color: rgb(148 163 184);
}

@media (max-width: 640px) {
  .metric-card {
    min-width: 0;
    padding: 0.65rem;
  }

  .metric-card strong {
    font-size: 1.1rem;
    line-height: 1.35rem;
  }

  .tab-button {
    min-height: 44px;
    white-space: nowrap;
  }

  .mark-read-actions {
    width: 100%;
  }

  .mark-read-actions button {
    width: 100%;
  }

  .feedback-revisit-panel {
    flex-direction: column;
  }

  .feedback-revisit-actions,
  .feedback-revisit-actions a {
    width: 100%;
  }

  .notification-list article {
    padding: 0.875rem;
  }

  .notification-item-inner {
    display: grid;
    grid-template-columns: 2.75rem minmax(0, 1fr);
    gap: 0.75rem;
  }

  .notification-read-button {
    grid-column: 1 / -1;
    min-height: 44px;
    width: 100%;
  }
}
</style>
