<template>
  <div class="app-shell notifications-page">
    <AppHeader />

    <main class="community-page notifications-main">
      <header class="workspace-heading">
        <div>
          <p class="section-kicker">社区回访中心</p>
          <h1>通知</h1>
          <p class="workspace-heading-copy">查看回应、回到讨论，也可以按类型快速筛选。</p>
        </div>
        <div class="heading-status" aria-live="polite">
          <span class="heading-status-dot" aria-hidden="true" />
          <span>{{ unread.total }} 条未读</span>
        </div>
      </header>

      <nav class="inbox-view-tabs" role="tablist" aria-label="参与收件箱视图">
        <button
          v-for="(view, index) in inboxViews"
          :id="inboxViewTabId(view.value)"
          :key="view.value"
          type="button"
          role="tab"
          :class="{ active: activeView === view.value }"
          :aria-controls="inboxViewPanelId(view.value)"
          :aria-selected="activeView === view.value"
          :tabindex="activeView === view.value ? 0 : -1"
          @click="switchInboxView(view.value)"
          @keydown="handleInboxViewKeydown($event, index)"
        >
          <component :is="view.icon" class="h-4 w-4" aria-hidden="true" />
          {{ view.label }}
        </button>
      </nav>

      <section
        v-if="activeView === 'notifications'"
        :id="inboxViewPanelId('notifications')"
        role="tabpanel"
        :aria-labelledby="inboxViewTabId('notifications')"
        tabindex="0"
      >
        <div class="notification-filter-bar">
          <div>
            <span class="filter-label">通知类型</span>
            <span class="filter-caption">按互动来源查看</span>
          </div>
          <div class="overflow-x-auto">
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
          <div class="notification-counts" aria-label="通知统计">
            <div class="notification-count">
              <span>未读</span>
              <strong>{{ unread.total }}</strong>
            </div>
            <div class="notification-count">
              <span>互动</span>
              <strong>{{ interactionUnread }}</strong>
            </div>
            <div class="notification-count">
              <span>提及</span>
              <strong>{{ unread.mention }}</strong>
            </div>
          </div>
          <div class="mark-read-actions">
            <RouterLink to="/me/settings" class="secondary-action">
              <Bell class="h-4 w-4" aria-hidden="true" />
              通知偏好
            </RouterLink>
            <button
              type="button"
              class="secondary-action"
              :disabled="markAllDisabled"
              :title="markAllHint"
              @click="markAllAsRead"
            >
              <CheckCheck class="h-4 w-4" aria-hidden="true" />
              {{ isMutating ? '处理中...' : unread.total === 0 ? '暂无未读' : '全部已读' }}
            </button>
            <p v-if="unread.total === 0" class="mark-read-hint">当前没有未读通知</p>
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
              <RouterLink to="/explore" class="primary-action">去发现内容和作者</RouterLink>
            </div>

            <div v-else class="notification-list">
              <section class="feedback-revisit-panel">
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

          <aside class="notification-context">
            <section class="context-block">
              <div class="context-block-heading">
                <span>收件箱概览</span>
                <Bell class="h-4 w-4" aria-hidden="true" />
              </div>
              <dl class="context-stats">
                <div><dt>全部未读</dt><dd>{{ unread.total }}</dd></div>
                <div><dt>互动回应</dt><dd>{{ interactionUnread }}</dd></div>
                <div><dt>提及我的内容</dt><dd>{{ unread.mention }}</dd></div>
              </dl>
            </section>
            <section class="context-block">
              <div class="context-block-heading">
                <span>回访入口</span>
                <History class="h-4 w-4" aria-hidden="true" />
              </div>
              <p>页面尊重通知偏好，只保留回到公开讨论、作者主页和关联内容的入口，没有生成新的后端通知。</p>
              <div class="context-links">
                <RouterLink to="/me?tab=posts">我的内容</RouterLink>
                <RouterLink to="/explore">发现内容</RouterLink>
              </div>
            </section>
          </aside>
        </div>
      </section>

      <section
        v-else-if="activeView === 'updates'"
        :id="inboxViewPanelId('updates')"
        role="tabpanel"
        :aria-labelledby="inboxViewTabId('updates')"
        tabindex="0"
      >
        <UpdateDigestPanel route-state title="与你有关的更新摘要" />
      </section>
      <section
        v-else
        :id="inboxViewPanelId('revisits')"
        role="tabpanel"
        :aria-labelledby="inboxViewTabId('revisits')"
        tabindex="0"
      >
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
const inboxViews = [
  { value: 'notifications' as const, label: '通知', icon: Bell },
  { value: 'updates' as const, label: '更新摘要', icon: Newspaper },
  { value: 'revisits' as const, label: '回访', icon: History },
]
const notificationTypePanelId = 'notification-type-panel'
const inboxViewTabId = (view: InboxView) => `inbox-view-tab-${view}`
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
    counts.comment ? `${counts.comment} 条评论` : '',
    counts.favorite ? `${counts.favorite} 次收藏` : '',
    counts.follower ? `${counts.follower} 位新增关注者` : '',
    counts.mention ? `${counts.mention} 次提及` : '',
  ].filter(Boolean)
  return parts.length
    ? `${parts.join('、')}，可以直接回到相关讨论或作者主页。`
    : '当前列表没有新的评论、收藏、关注或提及。'
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
  } catch (error) {
    if (
      requestGeneration !== notificationLoadGeneration
      || requestedType !== activeType.value
      || !notificationAccountIsCurrent(accountKey, accountGeneration)
    ) return
    clearNotificationListState()
    loadErrorText.value = getErrorMessage(error, 'Notifications are temporarily unavailable.')
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

const handleInboxViewKeydown = (event: KeyboardEvent, currentIndex: number) => {
  const nextIndex = rovingTabIndex(event.key, currentIndex, inboxViews.length)
  if (nextIndex === null) return
  event.preventDefault()
  const nextView = inboxViews[nextIndex]
  if (!nextView) return
  switchInboxView(nextView.value)
  focusTabById(inboxViewTabId(nextView.value))
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
  border: 1px solid rgb(226 232 240);
  border-radius: 0.5rem;
  background: white;
  padding: 0 0.85rem;
  color: rgb(71 85 105);
  font-size: 0.8125rem;
  font-weight: 800;
}

.inbox-view-tabs button.active {
  border-color: rgb(14 165 233);
  background: rgb(240 249 255);
  color: rgb(3 105 161);
}

.dark .inbox-view-tabs button {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .inbox-view-tabs button.active {
  border-color: rgb(14 116 144);
  background: rgb(8 47 73);
  color: rgb(186 230 253);
}

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

.filter-label,
.filter-caption {
  display: block;
}

.filter-label {
  color: var(--text-strong);
  font-size: 0.8125rem;
  font-weight: 750;
}

.filter-caption {
  margin-top: 0.1rem;
  color: var(--text-muted);
  font-size: 0.6875rem;
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
  border-color: #bfdbfe;
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
  border-color: #bfdbfe;
  background: var(--primary-50);
  color: #1d4ed8;
}

.notifications-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 17rem;
  align-items: start;
  gap: 1rem;
  margin-top: 0.875rem;
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
  border-bottom: 1px solid #dbeafe;
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
  border: 1px solid #bfdbfe;
  border-radius: var(--radius-control);
  background: var(--surface-1);
  padding: 0.35rem 0.65rem;
  color: #1d4ed8;
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
  border: 1px solid #bfdbfe;
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
  border-color: #93c5fd;
  background: var(--primary-50);
}

.notification-read-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.curation-feedback-card {
  margin-top: 0.75rem;
  border: 1px solid #dbeafe;
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
  background: #dbeafe;
  color: #1d4ed8;
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
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
}

.dark .inbox-view-tabs {
  background: rgb(30 41 59);
}

.dark .inbox-view-tabs button,
.dark .tab-button-idle {
  color: rgb(148 163 184);
}

.dark .inbox-view-tabs button:hover,
.dark .inbox-view-tabs button.active {
  color: rgb(248 250 252);
}

.dark .tab-button-active {
  border-color: rgb(30 64 175);
  background: rgb(23 37 84);
  color: rgb(191 219 254);
}

.dark .tab-button-idle:hover,
.dark .context-links a {
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}

.dark .notification-count,
.dark .notification-skeleton,
.dark .notification-row,
.dark .context-stats div,
.dark .load-more-row {
  border-color: rgb(30 41 59);
}

.dark .notification-row-unread,
.dark .notification-row-actionable:hover,
.dark .notification-row-actionable:focus-visible {
  background: rgb(22 34 53);
}

.dark .feedback-revisit-panel {
  border-color: rgb(30 64 175);
  background: rgb(17 34 63);
}

.dark .feedback-revisit-actions a {
  color: rgb(191 219 254);
}

.dark .notification-title,
.dark .feedback-revisit-panel h2,
.dark .curation-feedback-heading strong,
.dark .workspace-heading h1,
.dark .notification-count strong,
.dark .context-block-heading,
.dark .context-stats dd {
  color: rgb(248 250 252);
}

.dark .notification-content,
.dark .notification-row-meta,
.dark .workspace-heading-copy,
.dark .filter-caption,
.dark .notification-count span,
.dark .feedback-revisit-panel span,
.dark .context-stats dt,
.dark .context-block p {
  color: rgb(148 163 184);
}

.dark .notification-type,
.dark .empty-icon,
.dark .skeleton-icon,
.dark .skeleton-line {
  background: rgb(30 41 59);
}

.dark .curation-feedback-card {
  border-color: rgb(30 64 175);
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
  border-color: rgb(30 64 175);
  background: rgb(23 37 84);
  color: rgb(191 219 254);
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

  .filter-caption {
    display: inline;
    margin-left: 0.4rem;
  }

  .notification-actions-row {
    align-items: stretch;
    flex-direction: column;
  }

  .notification-counts {
    justify-content: space-between;
  }

  .notification-count {
    min-width: 0;
    flex: 1;
    justify-content: center;
    padding: 0 0.5rem;
  }

  .notification-count:first-child {
    justify-content: flex-start;
  }

  .notification-count:last-child {
    justify-content: flex-end;
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
