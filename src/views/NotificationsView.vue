<template>
  <div class="app-shell notifications-page">
    <AppHeader />

    <main class="community-page notifications-main">
      <header class="workspace-heading">
        <div>
          <p class="section-kicker">个人收件箱</p>
          <h1>通知</h1>
          <p class="workspace-heading-copy">所有社区回应集中在这里，按需筛选并回到相关内容。</p>
        </div>
        <div class="heading-status" aria-live="polite">
          <span class="heading-status-dot" aria-hidden="true" />
          <span>{{ unread.total > 0 ? `${unread.total} 条未读` : '已查看全部' }}</span>
        </div>
      </header>

      <section
        v-if="activeView === 'notifications'"
        :id="inboxViewPanelId('notifications')"
        aria-label="通知收件箱"
      >
        <div class="notification-filter-bar">
          <div class="notification-filter-copy">
            <strong>收件箱</strong>
            <span>按来源筛选</span>
          </div>
          <div class="overflow-x-auto notification-filter-scroll">
            <div class="flex min-w-max gap-2" role="tablist" aria-label="通知类型">
              <button
                v-for="(tab, index) in tabs"
                :id="notificationTypeTabId(tab.value)"
                :key="tab.value"
                type="button"
                role="tab"
                :class="[
                  'tab-button',
                  activeType === tab.value ? 'tab-button-active' : 'tab-button-idle'
                ]"
                :aria-controls="notificationTypePanelId"
                :aria-selected="activeType === tab.value"
                :tabindex="activeType === tab.value ? 0 : -1"
                @click="switchTab(tab.value)"
                @keydown="handleNotificationTypeKeydown($event, index)"
              >
                <component :is="tab.icon" class="h-4 w-4" aria-hidden="true" />
                <span>{{ tab.label }}</span>
                <span v-if="tab.count > 0" class="tab-count">{{ tab.count > 99 ? '99+' : tab.count }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="notification-actions-row">
          <p>{{ inboxStatusText }}</p>
          <div class="mark-read-actions">
            <RouterLink to="/me/settings" class="secondary-action">
              <Bell class="h-4 w-4" aria-hidden="true" />
              通知偏好
            </RouterLink>
            <button
              v-if="unread.total > 0"
              type="button"
              class="secondary-action"
              :disabled="markAllDisabled"
              :title="markAllHint"
              @click="markAllAsRead"
            >
              <CheckCheck class="h-4 w-4" aria-hidden="true" />
              {{ isMutating ? '处理中...' : '全部已读' }}
            </button>
          </div>
        </div>

        <p v-if="preferenceOffText" class="notice notice-warning">
          <BellOff class="h-4 w-4 shrink-0" aria-hidden="true" />
          {{ preferenceOffText }}
        </p>
        <p v-if="unreadErrorText" class="notice notice-error" role="alert">
          <span>{{ unreadErrorText }}</span>
          <button type="button" @click="loadUnread">重试</button>
        </p>
        <div
          v-if="hasPendingNotificationRefresh"
          class="notice notice-info"
          role="status"
        >
          <span>有新通知</span>
          <button type="button" :disabled="isLoading" @click="refreshNotifications">刷新列表</button>
        </div>

        <div
          :id="notificationTypePanelId"
          class="notifications-workspace"
          role="tabpanel"
          :aria-labelledby="notificationTypeTabId(activeType)"
          tabindex="0"
        >
          <div class="notifications-feed">
            <div v-if="isLoading && notifications.length === 0" class="notification-list-surface" aria-busy="true">
              <div v-for="item in 4" :key="item" class="notification-skeleton">
                <div class="skeleton-icon" />
                <div class="skeleton-copy">
                  <div class="skeleton-line skeleton-line-short" />
                  <div class="skeleton-line" />
                  <div class="skeleton-line skeleton-line-medium" />
                </div>
              </div>
            </div>

            <div v-else-if="notifications.length === 0" class="empty-state notification-list-surface">
              <div class="empty-icon" aria-hidden="true"><BellOff class="h-5 w-5" /></div>
              <h2>{{ emptyTitle }}</h2>
              <p class="max-w-lg text-sm leading-6">{{ emptyText }}</p>
              <button v-if="loadErrorText" type="button" class="primary-action" @click="loadNotifications">重新加载</button>
              <RouterLink v-else to="/explore" class="primary-action">去发现内容和作者</RouterLink>
            </div>

            <div v-else class="notification-list">
              <section v-if="hasFeedbackSummary" class="feedback-revisit-panel">
                <div>
                  <p class="section-kicker">轻反馈</p>
                  <h2>最近可以回访的社区回应</h2>
                  <span>{{ feedbackSummary }}</span>
                </div>
                <div class="feedback-revisit-actions">
                  <RouterLink to="/me?tab=posts">我的内容</RouterLink>
                  <RouterLink to="/me?tab=favorites">我的收藏</RouterLink>
                  <RouterLink to="/me?tab=followers">新增关注者</RouterLink>
                </div>
              </section>

              <nav class="related-inbox-groups" aria-label="与当前通知相关的个人分组">
                <button type="button" @click="switchInboxView('updates')">
                  <Newspaper class="h-4 w-4" aria-hidden="true" />
                  <span><strong>更新摘要</strong><small>查看与你关注内容有关的更新</small></span>
                </button>
                <button type="button" @click="switchInboxView('revisits')">
                  <History class="h-4 w-4" aria-hidden="true" />
                  <span><strong>回访事项</strong><small>继续处理已收藏或已关注的内容</small></span>
                </button>
              </nav>

              <!-- Accessibility static contract: :role="notif.targetPath ? 'button' : undefined" :tabindex="notif.targetPath ? 0 : undefined" -->
              <article
                v-for="notif in notifications"
                :key="notif.notificationId"
                :class="[
                  'notification-row',
                  notificationTargetPath(notif) ? 'notification-row-actionable' : '',
                  notif.read ? 'notification-row-read' : 'notification-row-unread'
                ]"
                :role="notificationTargetPath(notif) ? 'button' : undefined"
                :tabindex="notificationTargetPath(notif) ? 0 : undefined"
                :aria-label="notificationActionLabel(notif)"
                @click="openNotification(notif)"
                @keydown.enter.prevent="openNotification(notif)"
                @keydown.space.prevent="openNotification(notif)"
              >
                <div class="notification-item-inner">
                  <div :class="['notification-icon', iconClass(notif.type)]">
                    <component :is="iconFor(notif.type)" class="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="notification-row-heading">
                      <p class="notification-title">{{ notif.title }}</p>
                      <span class="notification-type">{{ labelFor(notif.type) }}</span>
                      <span v-if="!notif.read" class="notification-unread-badge">未读</span>
                      <span v-if="isMutedByPreference(notif)" class="notification-muted-badge">偏好静默</span>
                    </div>
                    <p class="notification-content">{{ notif.content }}</p>
                    <div v-if="curationFeedbackPayload(notif)" class="curation-feedback-card">
                      <div class="curation-feedback-heading">
                        <span class="curation-feedback-label">入选反馈</span>
                        <strong>内容标题：{{ curationFeedbackPayload(notif)?.contentTitle }}</strong>
                      </div>
                      <dl>
                        <div>
                          <dt>收录位置</dt>
                          <dd>{{ curationFeedbackPayload(notif)?.placementLabel }}</dd>
                        </div>
                        <div>
                          <dt>触发时间</dt>
                          <dd>{{ formatTime(curationFeedbackPayload(notif)?.triggeredAt || notif.createdAt) }}</dd>
                        </div>
                        <div class="curation-feedback-wide">
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
                    <div class="notification-row-meta">
                      <span>{{ formatTime(notif.createdAt) }}</span>
                      <span v-if="notificationTargetPath(notif)" class="notification-next-step">
                        {{ nextStepText(notif) }}
                      </span>
                    </div>
                  </div>
                  <button
                    v-if="!notif.read"
                    type="button"
                    class="notification-read-button"
                    :disabled="isMutating"
                    @click.stop="markAsRead(notif.notificationId, notif.notificationIds ?? [notif.notificationId])"
                  >
                    标记已读
                  </button>
                </div>
              </article>

              <div v-if="hasMore" class="load-more-row">
                <button type="button" class="secondary-action" :disabled="isLoading" @click="loadMore">
                  {{ isLoading ? '加载中...' : '加载更多' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        v-else-if="activeView === 'updates'"
        :id="inboxViewPanelId('updates')"
        aria-label="更新摘要"
      >
        <div class="related-view-heading">
          <button type="button" class="secondary-action" @click="switchInboxView('notifications')">返回收件箱</button>
          <p>更新摘要只整理与你已有关注关系有关的站内内容。</p>
        </div>
        <UpdateDigestPanel route-state title="与你有关的更新摘要" />
      </section>
      <section
        v-else
        :id="inboxViewPanelId('revisits')"
        aria-label="回访事项"
      >
        <div class="related-view-heading">
          <button type="button" class="secondary-action" @click="switchInboxView('notifications')">返回收件箱</button>
          <p>社区回访中心尊重通知偏好，只保留回到讨论和关联内容的入口，不会额外生成新的通知。</p>
        </div>
        <RevisitSummaryPanel route-state />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { AtSign, Bell, BellOff, Bookmark, CheckCheck, Heart, History, MessageCircle, Newspaper, UserPlus } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import { interactionPreferenceMuted, notificationApi, normalizeNotificationPreference } from '@/api/notification'
import type { ApiId, CreatorCurationFeedback, Notification, NotificationPreference, NotificationUnreadCount } from '@/api/types'
import { formatTime } from '@/lib/format'
import AppHeader from '@/components/layout/AppHeader.vue'
import RevisitSummaryPanel from '@/components/retention/RevisitSummaryPanel.vue'
import UpdateDigestPanel from '@/components/retention/UpdateDigestPanel.vue'
import { useAuthStore } from '@/stores/auth'
import { emptyUnreadCount, useRealtimeStore } from '@/stores/realtime'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const realtimeStore = useRealtimeStore()
const MAX_NOTIFICATION_ITEMS = 100

const activeType = ref('all')
const notifications = ref<Notification[]>([])
const isLoading = ref(false)
const isMutating = ref(false)
const loadErrorText = ref('')
const unreadErrorText = ref('')
const nextCursor = ref<string | undefined>()
const hasMore = ref(false)
const hasPendingNotificationRefresh = ref(false)
const unread = computed(() => realtimeStore.unreadCount)
const preferences = ref<NotificationPreference | null>(null)
let notificationLoadGeneration = 0
let notificationAccountGeneration = 0
let unreadRequestId = 0
let preferenceRequestId = 0
let observedNotificationAccountKey: string | null = null
let notificationListLoaded = false
let notificationListMarker: string | null = null

type NotificationType = 'all' | 'like' | 'comment' | 'favorite' | 'follower' | 'mention' | 'system'
type InboxView = 'notifications' | 'updates' | 'revisits'
const notificationUnreadKeys = ['like', 'comment', 'favorite', 'follower', 'mention', 'system'] as const
type NotificationUnreadKey = typeof notificationUnreadKeys[number]
const notificationTypes = new Set<NotificationType>(['all', ...notificationUnreadKeys])
const inboxViewValues = new Set<InboxView>(['notifications', 'updates', 'revisits'])
const firstQueryValue = (value: unknown) => Array.isArray(value) ? value[0] : value
const activeView = computed<InboxView>(() => {
  const value = String(firstQueryValue(route.query.view) || 'notifications') as InboxView
  return inboxViewValues.has(value) ? value : 'notifications'
})
const notificationTypePanelId = 'notification-type-panel'
const inboxViewPanelId = (view: InboxView) => `inbox-view-panel-${view}`
const notificationTypeTabId = (type: string) => `notification-type-tab-${type}`
const currentNotificationAccountKey = () => (
  `${String(authStore.user?.uid ?? '')}:${String(authStore.token ?? '')}`
)
const notificationAccountIsCurrent = (accountKey: string, generation: number) => (
  authStore.isLoggedIn
  && Boolean(authStore.user?.uid)
  && accountKey === currentNotificationAccountKey()
  && generation === notificationAccountGeneration
)

const tabs = computed(() => [
  { value: 'all', label: '全部', count: unread.value.total, icon: Bell },
  { value: 'like', label: '点赞', count: unread.value.like, icon: Heart },
  { value: 'comment', label: '评论', count: unread.value.comment, icon: MessageCircle },
  { value: 'favorite', label: '收藏', count: unread.value.favorite, icon: Bookmark },
  { value: 'follower', label: '关注', count: unread.value.follower, icon: UserPlus },
  { value: 'mention', label: '提及', count: unread.value.mention, icon: AtSign },
  { value: 'system', label: '系统', count: unread.value.system, icon: Bell },
])

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
    counts.comment ? `${counts.comment} 条评论` : '',
    counts.favorite ? `${counts.favorite} 次收藏` : '',
    counts.follower ? `${counts.follower} 位新增关注者` : '',
    counts.mention ? `${counts.mention} 次提及` : '',
  ].filter(Boolean)
  return parts.length
    ? `${parts.join('、')}，可以直接回到相关讨论或作者主页。`
    : '当前列表没有新的评论、收藏、关注或提及。'
})
const hasFeedbackSummary = computed(() => Object.values(feedbackCounts.value).some((count) => count > 0))
const inboxStatusText = computed(() => {
  if (isLoading.value && notifications.value.length === 0) return '正在同步最新通知'
  if (loadErrorText.value) return '收件箱暂时无法读取'
  if (notifications.value.length === 0) return '当前没有需要处理的通知'
  if (unread.value.total > 0) return `当前有 ${unread.value.total} 条未读通知`
  return `已加载 ${notifications.value.length} 条通知`
})
const emptyTitle = computed(() => activeType.value === 'all' ? '暂时没有通知' : `暂时没有${labelFor(activeType.value)}通知`)
const emptyText = computed(() => {
  if (loadErrorText.value) return loadErrorText.value
  if (preferenceOffText.value) return '当前提醒已静默，你仍然可以浏览内容并参与讨论。'
  if (activeType.value === 'all') return '评论、点赞、收藏、关注和提及会集中出现在这里。'
  if (activeType.value === 'follower') return '新增关注者会出现在这里，方便你回访对方主页。'
  if (activeType.value === 'system') return '社区公告和系统通知会出现在这里。'
  return '当前分类没有新的通知。'
})
const preferenceOffText = computed(() => {
  const pref = preferences.value
  if (!pref) return ''
  if (!pref.interactionNotification && !pref.systemNotification) return '互动通知和系统通知均已静默。'
  if (!pref.interactionNotification) return '互动通知已静默。'
  if (!pref.systemNotification) return '系统通知已静默。'
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

const clearNotificationListState = () => {
  notifications.value = []
  nextCursor.value = undefined
  hasMore.value = false
  loadErrorText.value = ''
}

const latestUnreadMarker = () => (
  realtimeStore.latestUnreadId == null ? null : String(realtimeStore.latestUnreadId)
)

const invalidateNotificationList = () => {
  notificationLoadGeneration += 1
  isLoading.value = false
  clearNotificationListState()
}

const resetNotificationAccountState = () => {
  notificationAccountGeneration += 1
  notificationLoadGeneration += 1
  unreadRequestId += 1
  preferenceRequestId += 1
  isLoading.value = false
  isMutating.value = false
  clearNotificationListState()
  unreadErrorText.value = ''
  preferences.value = null
  notificationViewInitialized = false
  notificationListLoaded = false
  notificationListMarker = null
  hasPendingNotificationRefresh.value = false
  realtimeStore.reset()
}

const loadUnread = async () => {
  if (!authStore.isLoggedIn || !authStore.user?.uid) return
  const accountKey = currentNotificationAccountKey()
  const generation = notificationAccountGeneration
  const requestId = ++unreadRequestId
  try {
    const res = await notificationApi.getUnreadCount()
    if (
      requestId !== unreadRequestId
      || !notificationAccountIsCurrent(accountKey, generation)
    ) return
    if (res.code === 0 && res.data) syncUnread(res.data)
    unreadErrorText.value = ''
  } catch (error) {
    if (
      requestId !== unreadRequestId
      || !notificationAccountIsCurrent(accountKey, generation)
    ) return
    unreadErrorText.value = getErrorMessage(error, '未读数暂时无法同步。')
  }
}

const loadNotifications = async () => {
  const requestGeneration = ++notificationLoadGeneration
  const requestedType = activeType.value
  const accountKey = currentNotificationAccountKey()
  const accountGeneration = notificationAccountGeneration
  const markerAtRequestStart = latestUnreadMarker()
  isLoading.value = true
  try {
    const type = requestedType === 'all' ? undefined : requestedType
    const res = await notificationApi.getList(type, undefined, 20)
    if (
      requestGeneration !== notificationLoadGeneration
      || requestedType !== activeType.value
      || !notificationAccountIsCurrent(accountKey, accountGeneration)
    ) return
    notifications.value = (res.data?.items || []).slice(0, MAX_NOTIFICATION_ITEMS)
    nextCursor.value = res.data?.nextCursor
    hasMore.value = Boolean(
      res.data?.hasMore
      && res.data?.nextCursor
      && notifications.value.length < MAX_NOTIFICATION_ITEMS,
    )
    loadErrorText.value = ''
    notificationListLoaded = true
    notificationListMarker = markerAtRequestStart
    hasPendingNotificationRefresh.value = latestUnreadMarker() !== markerAtRequestStart
  } catch {
    if (
      requestGeneration !== notificationLoadGeneration
      || requestedType !== activeType.value
      || !notificationAccountIsCurrent(accountKey, accountGeneration)
    ) return
    clearNotificationListState()
    loadErrorText.value = '通知暂时无法读取，请稍后重试。'
  } finally {
    if (
      requestGeneration === notificationLoadGeneration
      && notificationAccountIsCurrent(accountKey, accountGeneration)
    ) {
      isLoading.value = false
    }
  }
}

const refreshNotifications = () => {
  hasPendingNotificationRefresh.value = false
  void loadNotifications()
}

const loadMore = async () => {
  if (!hasMore.value || isLoading.value) return
  const requestGeneration = ++notificationLoadGeneration
  const requestedType = activeType.value
  const accountKey = currentNotificationAccountKey()
  const accountGeneration = notificationAccountGeneration
  isLoading.value = true
  try {
    const type = requestedType === 'all' ? undefined : requestedType
    const res = await notificationApi.getList(type, nextCursor.value, 20)
    if (
      requestGeneration !== notificationLoadGeneration
      || requestedType !== activeType.value
      || !notificationAccountIsCurrent(accountKey, accountGeneration)
    ) return
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
    if (
      requestGeneration !== notificationLoadGeneration
      || requestedType !== activeType.value
      || !notificationAccountIsCurrent(accountKey, accountGeneration)
    ) return
    toast.error(getErrorMessage(error, '加载更多通知失败'))
  } finally {
    if (
      requestGeneration === notificationLoadGeneration
      && notificationAccountIsCurrent(accountKey, accountGeneration)
    ) {
      isLoading.value = false
    }
  }
}

const switchInboxView = (view: InboxView) => {
  if (
    view !== activeView.value
    || (view === 'notifications' && activeType.value !== 'all')
  ) {
    invalidateNotificationList()
  }
  void router.replace({
    path: route.path,
    query: {
      view: view === 'notifications' ? undefined : view,
      type: undefined,
      sourceType: undefined,
      sourceId: undefined,
      status: undefined,
    },
  })
}

const switchTab = (type: NotificationType | string) => {
  const nextType = notificationTypes.has(type as NotificationType) ? type as NotificationType : 'all'
  if (nextType !== activeType.value) invalidateNotificationList()
  void router.replace({
    path: route.path,
    query: {
      ...route.query,
      view: undefined,
      type: nextType === 'all' ? undefined : nextType,
    },
  })
}

const rovingTabIndex = (key: string, currentIndex: number, itemCount: number) => {
  if (key === 'ArrowLeft') return (currentIndex - 1 + itemCount) % itemCount
  if (key === 'ArrowRight') return (currentIndex + 1) % itemCount
  if (key === 'Home') return 0
  if (key === 'End') return itemCount - 1
  return null
}

const focusTabById = (id: string) => {
  void nextTick(() => document.getElementById(id)?.focus())
}

const handleNotificationTypeKeydown = (event: KeyboardEvent, currentIndex: number) => {
  const nextIndex = rovingTabIndex(event.key, currentIndex, tabs.value.length)
  if (nextIndex === null) return
  event.preventDefault()
  const nextTab = tabs.value[nextIndex]
  if (!nextTab) return
  switchTab(nextTab.value)
  focusTabById(notificationTypeTabId(nextTab.value))
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
  const accountKey = currentNotificationAccountKey()
  const accountGeneration = notificationAccountGeneration
  if (!options.background) isMutating.value = true
  const original = applyReadLocally(id)
  try {
    await notificationApi.markAsRead(ids)
    if (!notificationAccountIsCurrent(accountKey, accountGeneration)) return
    await loadUnread()
  } catch (error) {
    if (!notificationAccountIsCurrent(accountKey, accountGeneration)) return
    if (original) restoreReadLocally(original)
    await loadUnread().catch(() => {})
    toast.error(getErrorMessage(error, '标记已读失败'))
  } finally {
    if (!options.background && notificationAccountIsCurrent(accountKey, accountGeneration)) {
      isMutating.value = false
    }
  }
}

const markAllAsRead = async () => {
  const accountKey = currentNotificationAccountKey()
  const accountGeneration = notificationAccountGeneration
  isMutating.value = true
  try {
    const res = await notificationApi.markAllAsRead()
    if (!notificationAccountIsCurrent(accountKey, accountGeneration)) return
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
    if (!notificationAccountIsCurrent(accountKey, accountGeneration)) return
    toast.error(getErrorMessage(error, '全部标记已读失败'))
  } finally {
    if (notificationAccountIsCurrent(accountKey, accountGeneration)) {
      isMutating.value = false
    }
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
  if (notif.action === 'answerAccepted') return '查看采纳回答'
  if (notif.action === 'contentSuggestionSubmitted') return '查看读者建议'
  if (notif.action === 'contentSuggestionDecided') return '查看建议处理结果'
  if (notif.type === 'follower') return '查看作者主页'
  if (notif.type === 'comment' || notif.type === 'mention') return '回到讨论'
  return '查看关联内容'
}

const isMutedByPreference = (notif: Notification) => (
  preferences.value ? interactionPreferenceMuted(notif.type, preferences.value) : false
)

const loadPreferences = async () => {
  if (!authStore.isLoggedIn || !authStore.user?.uid) return
  const accountKey = currentNotificationAccountKey()
  const generation = notificationAccountGeneration
  const requestId = ++preferenceRequestId
  try {
    const res = await notificationApi.getPreferences()
    if (
      requestId !== preferenceRequestId
      || !notificationAccountIsCurrent(accountKey, generation)
    ) return
    preferences.value = normalizeNotificationPreference(res.data)
  } catch {
    if (
      requestId !== preferenceRequestId
      || !notificationAccountIsCurrent(accountKey, generation)
    ) return
    preferences.value = null
  }
}

let notificationViewInitialized = false
watch(
  () => realtimeStore.latestUnreadId,
  () => {
    const marker = latestUnreadMarker()
    if (!marker) {
      notificationListMarker = null
      return
    }
    if (!notificationListLoaded) {
      notificationListMarker = marker
      return
    }
    if (marker !== notificationListMarker) {
      hasPendingNotificationRefresh.value = true
    }
  },
)

watch(
  () => [
    activeView.value,
    String(firstQueryValue(route.query.type) || ''),
    authStore.user?.uid,
    authStore.token,
  ] as const,
  ([view, routeType]) => {
    const accountKey = currentNotificationAccountKey()
    if (accountKey !== observedNotificationAccountKey) {
      observedNotificationAccountKey = accountKey
      resetNotificationAccountState()
    } else {
      invalidateNotificationList()
    }
    if (view !== 'notifications') {
      return
    }
    const normalizedType = routeType.toLowerCase() as NotificationType
    activeType.value = notificationTypes.has(normalizedType) ? normalizedType : 'all'
    if (!authStore.isLoggedIn || !authStore.user?.uid) return
    void loadNotifications()
    if (!notificationViewInitialized) {
      notificationViewInitialized = true
      void Promise.all([loadUnread(), loadPreferences()])
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  notificationAccountGeneration += 1
  notificationLoadGeneration += 1
  unreadRequestId += 1
  preferenceRequestId += 1
})
</script>

<style scoped>
.inbox-view-tabs {
  display: flex;
  gap: 0.35rem;
  margin-bottom: 1rem;
  overflow-x: auto;
}

.inbox-view-tabs button {
  display: inline-flex;
  min-height: 44px;
  flex: none;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  background: white;
  padding: 0 0.85rem;
  color: var(--text-primary);
  font-size: 0.8125rem;
  font-weight: 800;
}

.inbox-view-tabs button.active {
  border-color: rgb(33 154 112);
  background: rgb(232 243 237);
  color: rgb(18 99 74);
}

.dark .inbox-view-tabs button {
  border-color: var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-muted);
}

.dark .inbox-view-tabs button.active {
  border-color: rgb(18 99 74);
  background: rgb(7 31 24);
  color: rgb(169 216 195);
}

.metric-card {
  min-width: 6.5rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border-subtle);
  padding: 0.75rem 0.9rem;
}

.metric-card span {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}

.metric-card strong {
  display: block;
  margin-top: 0.2rem;
  font-size: 1.35rem;
  line-height: 1.8rem;
  color: var(--text-strong);
}

.tab-button {
  display: inline-flex;
  min-height: 44px;
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
  border-color: rgb(169 216 195);
  background: rgb(232 243 237);
  color: rgb(26 127 90);
}

.tab-button-idle {
  color: var(--text-primary);
}

.tab-button-idle:hover {
  background: var(--surface-soft);
  color: var(--text-strong);
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
  color: var(--text-muted);
}

.feedback-revisit-panel {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid rgb(169 216 195);
  border-radius: 0.75rem;
  background: rgb(232 243 237);
  padding: 1rem;
}

.feedback-revisit-panel h2 {
  margin-top: 0.15rem;
  font-size: 1rem;
  font-weight: 900;
  color: var(--text-strong);
}

.feedback-revisit-panel span {
  margin-top: 0.35rem;
  display: block;
  max-width: 42rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--text-primary);
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
  color: rgb(18 99 74);
}

.curation-feedback-card {
  border-radius: 0.75rem;
  border: 1px solid rgb(169 216 195);
  background: var(--surface-soft);
  padding: 0.85rem;
}

.curation-feedback-label {
  border-radius: 999px;
  background: rgb(205 232 220);
  padding: 0.2rem 0.55rem;
  font-size: 0.7rem;
  font-weight: 900;
  color: rgb(18 99 74);
}

.curation-feedback-card dt {
  font-weight: 900;
  color: var(--text-primary);
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
  background: rgb(26 127 90);
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 900;
  color: white;
}

.dark .metric-card {
  border-color: var(--border-subtle);
}

.dark .metric-card span {
  color: var(--text-muted);
}

.dark .metric-card strong {
  color: var(--text-strong);
}

.dark .tab-button-active {
  border-color: rgb(18 99 74);
  background: rgb(7 31 24);
  color: rgb(169 216 195);
}

.dark .tab-button-idle {
  color: var(--text-muted);
}

.dark .tab-button-idle:hover {
  background: var(--surface-1);
  color: var(--text-strong);
}

.dark .mark-read-hint {
  color: var(--text-muted);
}

.dark .feedback-revisit-panel {
  border-color: rgb(14 74 55);
  background: var(--surface-1);
}

.dark .feedback-revisit-panel h2 {
  color: var(--text-strong);
}

.dark .feedback-revisit-panel span {
  color: var(--text-muted);
}

.dark .feedback-revisit-actions a {
  background: var(--surface-1);
  color: rgb(169 216 195);
}

.dark .curation-feedback-card {
  border-color: rgb(14 74 55);
  background: var(--surface-1);
}

.dark .curation-feedback-label {
  background: rgb(10 52 39);
  color: rgb(169 216 195);
}

.dark .curation-feedback-card dt {
  color: var(--text-muted);
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

.notifications-page {
  min-height: 100vh;
  background: var(--surface-2);
}

.notifications-main {
  padding-top: 1.25rem;
  padding-bottom: 6rem;
}

.workspace-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.5rem 0 1rem;
}

.section-kicker {
  margin: 0;
  color: var(--primary-600);
  font-size: 0.75rem;
  font-weight: 700;
}

.workspace-heading h1 {
  margin: 0.2rem 0 0;
  color: var(--text-strong);
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.25;
}

.workspace-heading-copy {
  margin: 0.4rem 0 0;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.heading-status {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-1);
  padding: 0 0.75rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 700;
  white-space: nowrap;
}

.heading-status-dot {
  height: 0.5rem;
  width: 0.5rem;
  border-radius: 50%;
  background: var(--primary-600);
}

.inbox-view-tabs {
  width: fit-content;
  max-width: 100%;
  margin: 0 0 0.875rem;
  gap: 0.25rem;
  border-radius: var(--radius-surface);
  background: var(--surface-muted);
  padding: 0.25rem;
  scrollbar-width: none;
}

.inbox-view-tabs::-webkit-scrollbar {
  display: none;
}

.inbox-view-tabs button {
  min-height: 44px;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  padding: 0 0.9rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 700;
  transition: background-color 0.16s ease, color 0.16s ease;
}

.inbox-view-tabs button:hover {
  color: var(--text-strong);
}

.inbox-view-tabs button.active {
  border: 0;
  background: var(--surface-1);
  color: var(--text-strong);
  box-shadow: var(--shadow-card);
}

.notification-filter-bar {
  display: grid;
  grid-template-columns: 8.5rem minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface) var(--radius-surface) 0 0;
  background: var(--surface-1);
  padding: 0.75rem;
}

.notification-filter-copy {
  display: grid;
  gap: 0.1rem;
}

.notification-filter-copy strong {
  color: var(--text-strong);
  font-size: 0.8125rem;
  font-weight: 750;
}

.notification-filter-copy span {
  color: var(--text-muted);
  font-size: 0.6875rem;
}

.notification-filter-scroll {
  padding-bottom: 0.25rem;
  scrollbar-color: var(--border-strong) transparent;
  scrollbar-width: thin;
}

.tab-button {
  min-height: 36px;
  border-radius: var(--radius-control);
  padding: 0.4rem 0.7rem;
  font-size: 0.8125rem;
  font-weight: 650;
  white-space: nowrap;
}

.tab-button-active {
  border-color: #a9d8c3;
  background: var(--primary-50);
  color: var(--primary-700);
}

.tab-button-idle {
  border-color: transparent;
  color: var(--text-muted);
}

.tab-button-idle:hover {
  background: var(--surface-2);
  color: var(--text-strong);
}

.tab-count {
  min-width: 1.15rem;
  border-radius: var(--radius-pill);
  background: var(--danger);
  padding: 0.05rem 0.3rem;
  font-size: 0.625rem;
  font-weight: 750;
}

.notification-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid var(--border-subtle);
  border-top: 0;
  border-radius: 0 0 var(--radius-surface) var(--radius-surface);
  background: var(--surface-1);
  padding: 0.75rem;
}

.notification-actions-row > p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1.5;
}

.notification-counts {
  display: flex;
  align-items: center;
}

.notification-count {
  display: flex;
  min-width: 5.25rem;
  align-items: baseline;
  gap: 0.45rem;
  border-right: 1px solid var(--border-subtle);
  padding: 0 1rem;
}

.notification-count:first-child {
  padding-left: 0;
}

.notification-count:last-child {
  border-right: 0;
}

.notification-count span {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.notification-count strong {
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 800;
}

.mark-read-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.mark-read-actions .secondary-action {
  min-height: 38px;
  padding: 0.45rem 0.75rem;
}

.mark-read-hint {
  display: none;
}

.notice {
  display: flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0.75rem 0 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  padding: 0.65rem 0.8rem;
  font-size: 0.8125rem;
  font-weight: 650;
}

.notice button {
  flex: none;
  color: inherit;
  font-weight: 750;
  text-decoration: underline;
  text-underline-offset: 0.18em;
}

.notice-warning {
  border-color: #fed7aa;
  background: #fff7ed;
  color: #9a3412;
}

.notice-error {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b42318;
}

.notice-info {
  border-color: #a9d8c3;
  background: var(--primary-50);
  color: #12634a;
}

.notifications-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: 1rem;
  margin-top: 0.875rem;
}

.related-inbox-groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--border-subtle);
}

.related-inbox-groups button {
  display: flex;
  min-width: 0;
  min-height: 3.75rem;
  align-items: center;
  gap: 0.65rem;
  border: 0;
  background: var(--surface-1);
  padding: 0.75rem 1rem;
  color: var(--primary-700);
  text-align: left;
}

.related-inbox-groups button:hover {
  background: var(--surface-2);
}

.related-inbox-groups span {
  display: grid;
  min-width: 0;
  gap: 0.1rem;
}

.related-inbox-groups strong {
  color: var(--text-strong);
  font-size: 0.8rem;
  font-weight: 750;
}

.related-inbox-groups small {
  overflow-wrap: anywhere;
  color: var(--text-muted);
  font-size: 0.7rem;
  line-height: 1.45;
}

.related-view-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.875rem;
}

.related-view-heading p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1.5;
}

.notifications-feed {
  min-width: 0;
}

.notification-list,
.notification-list-surface {
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface-1);
}

.notification-list {
  display: flex;
  flex-direction: column;
}

.feedback-revisit-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 0;
  border-bottom: 1px solid #cde8dc;
  border-radius: 0;
  background: var(--primary-50);
  padding: 0.85rem 1rem;
}

.feedback-revisit-panel h2 {
  margin-top: 0.15rem;
  font-size: 0.9375rem;
  font-weight: 750;
  color: var(--text-strong);
}

.feedback-revisit-panel span {
  margin-top: 0.2rem;
  max-width: 38rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  line-height: 1.55;
}

.feedback-revisit-actions {
  flex: none;
  gap: 0.35rem;
}

.feedback-revisit-actions a {
  min-height: 2rem;
  border: 1px solid #a9d8c3;
  border-radius: var(--radius-control);
  background: var(--surface-1);
  padding: 0.35rem 0.65rem;
  color: #12634a;
  font-size: 0.75rem;
  font-weight: 700;
}

.notification-row {
  border-bottom: 1px solid var(--border-subtle);
  background: var(--surface-1);
  padding: 1rem;
  outline: none;
  transition: background-color 0.16s ease;
}

.notification-row:last-of-type {
  border-bottom: 0;
}

.notification-row-unread {
  background: #f8fbff;
}

.notification-row-actionable:hover,
.notification-row-actionable:focus-visible {
  background: #f1f6ff;
}

.notification-row-actionable {
  cursor: pointer;
}

.notification-item-inner {
  display: grid;
  grid-template-columns: 2.75rem minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.8rem;
}

.notification-icon {
  display: grid;
  height: 2.5rem;
  width: 2.5rem;
  place-items: center;
  border-radius: var(--radius-control);
}

.notification-row-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  padding-right: 0.25rem;
}

.notification-title {
  min-width: 0;
  color: var(--text-strong);
  font-size: 0.875rem;
  font-weight: 750;
  line-height: 1.45;
}

.notification-type,
.notification-unread-badge,
.notification-muted-badge {
  display: inline-flex;
  min-height: 1.25rem;
  align-items: center;
  border-radius: var(--radius-pill);
  padding: 0 0.45rem;
  font-size: 0.6875rem;
  font-weight: 700;
  white-space: nowrap;
}

.notification-type {
  background: var(--surface-muted);
  color: var(--text-muted);
}

.notification-unread-badge {
  background: var(--danger);
  color: white;
}

.notification-muted-badge {
  background: #fff7ed;
  color: #9a3412;
}

.notification-content {
  margin: 0.3rem 0 0;
  color: var(--text-muted);
  font-size: 0.8125rem;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.notification-row-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.55rem;
  color: var(--text-muted);
  font-size: 0.6875rem;
}

.notification-next-step {
  color: var(--primary-600);
  font-weight: 700;
}

.notification-read-button {
  min-height: 34px;
  border: 1px solid #a9d8c3;
  border-radius: var(--radius-control);
  background: var(--surface-1);
  padding: 0.35rem 0.65rem;
  color: var(--primary-700);
  font-size: 0.75rem;
  font-weight: 750;
  white-space: nowrap;
  transition: background-color 0.16s ease, border-color 0.16s ease;
}

.notification-read-button:hover:not(:disabled) {
  border-color: #7cc3a5;
  background: var(--primary-50);
}

.notification-read-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.curation-feedback-card {
  margin-top: 0.75rem;
  border: 1px solid #cde8dc;
  border-radius: var(--radius-control);
  background: #f8fbff;
  padding: 0.75rem;
}

.curation-feedback-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.curation-feedback-heading strong {
  color: var(--text-strong);
  font-size: 0.8125rem;
}

.curation-feedback-label {
  background: #cde8dc;
  color: #12634a;
}

.curation-feedback-card dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem 1rem;
  margin-top: 0.65rem;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.curation-feedback-wide {
  grid-column: 1 / -1;
}

.curation-feedback-card dt {
  color: var(--text-muted);
  font-weight: 700;
}

.curation-feedback-card dd {
  margin-top: 0.15rem;
  line-height: 1.55;
}

.curation-feedback-link {
  min-height: 2rem;
  border-radius: var(--radius-control);
  background: var(--primary-600);
  padding: 0.35rem 0.65rem;
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
}

.load-more-row {
  display: flex;
  justify-content: center;
  border-top: 1px solid var(--border-subtle);
  padding: 0.75rem;
}

.notification-skeleton {
  display: flex;
  gap: 0.8rem;
  border-bottom: 1px solid var(--border-subtle);
  padding: 1rem;
}

.notification-skeleton:last-child {
  border-bottom: 0;
}

.skeleton-icon,
.skeleton-line {
  animation: notification-pulse 1.4s ease-in-out infinite;
  background: var(--surface-muted);
}

.skeleton-icon {
  height: 2.5rem;
  width: 2.5rem;
  flex: none;
  border-radius: var(--radius-control);
}

.skeleton-copy {
  flex: 1;
  padding-top: 0.1rem;
}

.skeleton-line {
  height: 0.6rem;
  width: 100%;
  border-radius: 3px;
}

.skeleton-line + .skeleton-line {
  margin-top: 0.55rem;
}

.skeleton-line-short {
  width: 34%;
}

.skeleton-line-medium {
  width: 62%;
}

@keyframes notification-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

.empty-state {
  display: flex;
  min-height: 22rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.empty-icon {
  display: grid;
  height: 2.75rem;
  width: 2.75rem;
  place-items: center;
  border-radius: var(--radius-control);
  background: var(--surface-muted);
  color: var(--text-muted);
}

.empty-state h2 {
  margin: 0.9rem 0 0;
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 750;
}

.empty-state p {
  margin: 0.35rem auto 0;
  color: var(--text-muted);
}

.empty-state .primary-action {
  margin-top: 1rem;
}

.notification-context {
  position: sticky;
  top: calc(var(--community-header-height) + 1rem);
  display: grid;
  gap: 0.75rem;
}

.context-block {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface-1);
  padding: 0.9rem;
}

.context-block-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  color: var(--text-strong);
  font-size: 0.8125rem;
  font-weight: 750;
}

.context-stats {
  margin-top: 0.5rem;
}

.context-stats div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0.55rem 0;
}

.context-stats div:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.context-stats dt,
.context-block p {
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.55;
}

.context-stats dd {
  color: var(--text-strong);
  font-size: 0.8125rem;
  font-weight: 800;
}

.context-block p {
  margin: 0.55rem 0 0;
}

.context-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.75rem;
}

.context-links a {
  min-height: 2rem;
  border-radius: var(--radius-control);
  background: var(--surface-2);
  padding: 0.35rem 0.6rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.context-links a:hover {
  background: var(--primary-50);
  color: var(--primary-700);
}

.dark .notifications-page {
  background: #0f1115;
}

.dark .heading-status,
.dark .inbox-view-tabs button.active,
.dark .notification-filter-bar,
.dark .notification-actions-row,
.dark .notification-list,
.dark .notification-list-surface,
.dark .notification-row,
.dark .context-block,
.dark .notification-read-button,
.dark .feedback-revisit-actions a {
  border-color: var(--border-subtle);
  background: var(--surface-1);
}

.dark .inbox-view-tabs {
  background: var(--surface-1);
}

.dark .inbox-view-tabs button,
.dark .tab-button-idle {
  color: var(--text-muted);
}

.dark .inbox-view-tabs button:hover,
.dark .inbox-view-tabs button.active {
  color: var(--text-strong);
}

.dark .tab-button-active {
  border-color: rgb(14 74 55);
  background: rgb(7 31 24);
  color: rgb(169 216 195);
}

.dark .tab-button-idle:hover,
.dark .context-links a {
  background: var(--surface-1);
  color: var(--text-muted);
}

.dark .notification-count,
.dark .notification-skeleton,
.dark .notification-row,
.dark .context-stats div,
.dark .load-more-row {
  border-color: var(--border-subtle);
}

.dark .notification-row-unread,
.dark .notification-row-actionable:hover,
.dark .notification-row-actionable:focus-visible {
  background: rgb(22 34 53);
}

.dark .feedback-revisit-panel {
  border-color: rgb(14 74 55);
  background: rgb(17 34 63);
}

.dark .feedback-revisit-actions a {
  color: rgb(169 216 195);
}

.dark .notification-title,
.dark .feedback-revisit-panel h2,
.dark .curation-feedback-heading strong,
.dark .workspace-heading h1,
.dark .notification-count strong,
.dark .context-block-heading,
.dark .context-stats dd {
  color: var(--text-strong);
}

.dark .notification-content,
.dark .notification-row-meta,
.dark .workspace-heading-copy,
.dark .filter-caption,
.dark .notification-count span,
.dark .feedback-revisit-panel span,
.dark .context-stats dt,
.dark .context-block p {
  color: var(--text-muted);
}

.dark .notification-type,
.dark .empty-icon,
.dark .skeleton-icon,
.dark .skeleton-line {
  background: var(--surface-1);
}

.dark .curation-feedback-card {
  border-color: rgb(14 74 55);
  background: rgb(15 31 55);
}

.dark .notice-warning {
  border-color: rgb(154 52 18);
  background: rgb(67 28 12);
  color: rgb(254 215 170);
}

.dark .notice-error {
  border-color: rgb(127 29 29);
  background: rgb(69 10 10);
  color: rgb(254 202 202);
}

.dark .notice-info {
  border-color: rgb(14 74 55);
  background: rgb(7 31 24);
  color: rgb(169 216 195);
}

@media (max-width: 960px) {
  .notifications-workspace {
    grid-template-columns: minmax(0, 1fr);
  }

  .notification-context {
    position: static;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .notification-filter-bar {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.55rem;
  }

  .notification-actions-row {
    align-items: stretch;
    flex-direction: column;
  }

  .mark-read-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mark-read-actions .secondary-action {
    width: 100%;
  }

  .notification-context {
    display: none;
  }
}

@media (max-width: 640px) {
  .notifications-main {
    padding-top: 0.75rem;
  }

  .workspace-heading {
    align-items: flex-start;
  }

  .workspace-heading-copy {
    max-width: 21rem;
  }

  .heading-status {
    min-height: 2rem;
    padding: 0 0.55rem;
    font-size: 0.75rem;
  }

  .inbox-view-tabs {
    width: 100%;
  }

  .inbox-view-tabs button {
    flex: 1;
    justify-content: center;
    padding: 0 0.65rem;
  }

  .notification-filter-bar,
  .notification-actions-row {
    padding: 0.65rem;
  }

  .related-inbox-groups {
    grid-template-columns: 1fr;
  }

  .related-view-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .related-view-heading .secondary-action {
    width: 100%;
  }

  .feedback-revisit-panel {
    align-items: flex-start;
    flex-direction: column;
    padding: 0.8rem;
  }

  .feedback-revisit-actions,
  .feedback-revisit-actions a {
    width: 100%;
  }

  .feedback-revisit-actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .feedback-revisit-actions a {
    padding: 0.35rem 0.3rem;
    text-align: center;
  }

  .notification-row {
    padding: 0.875rem;
  }

  .notification-item-inner {
    grid-template-columns: 2.75rem minmax(0, 1fr);
    gap: 0.75rem;
  }

  .notification-read-button {
    grid-column: 1 / -1;
    min-height: 44px;
    width: 100%;
  }

  .curation-feedback-card dl {
    grid-template-columns: minmax(0, 1fr);
  }

  .curation-feedback-wide {
    grid-column: auto;
  }
}

@media (max-width: 420px) {
  .workspace-heading {
    gap: 0.75rem;
  }

  .workspace-heading h1 {
    font-size: 1.35rem;
  }

  .workspace-heading-copy {
    font-size: 0.8125rem;
  }

  .heading-status {
    align-self: flex-start;
  }

  .feedback-revisit-actions {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
