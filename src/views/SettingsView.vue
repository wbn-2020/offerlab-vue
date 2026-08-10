<template>
  <div class="app-shell settings-page">
    <AppHeader />

    <main class="community-page settings-main">
      <header class="workspace-heading">
        <div>
          <p class="section-kicker">个人空间</p>
          <h1>设置</h1>
          <p>管理账号、公开资料、通知与隐私边界。</p>
        </div>
      </header>

      <div class="settings-workspace">
        <nav class="settings-tabs" aria-label="设置分组">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            :class="['tab-button', activeTab === tab.value ? 'tab-button-active' : '']"
            :aria-current="activeTab === tab.value ? 'page' : undefined"
            @click="switchTab(tab.value)"
          >
            {{ tab.label }}
          </button>
        </nav>

        <div class="settings-content">
          <section v-if="activeTab === 'account'" class="panel">
            <header class="panel-heading">
              <div>
                <h2>账号与安全</h2>
                <p>查看登录邮箱，修改密码或结束全部设备会话。</p>
              </div>
            </header>

            <div class="settings-group">
              <div class="group-heading">
                <h3>登录邮箱</h3>
                <p>邮箱暂不支持修改。</p>
              </div>
              <label class="field-block">
                <span class="field-label">邮箱</span>
                <input :value="user?.email || ''" disabled class="form-input cursor-not-allowed">
              </label>
            </div>

            <form class="settings-group" @submit.prevent="changePassword">
              <div class="group-heading">
                <h3>修改密码</h3>
                <p>新密码至少 8 位，提交后立即生效。</p>
              </div>
              <div class="password-grid">
                <label class="field-block">
                  <span class="field-label">原密码</span>
                  <input
                    v-model="passwordForm.oldPassword"
                    type="password"
                    autocomplete="current-password"
                    class="form-input"
                    placeholder="输入原密码"
                  >
                </label>
                <label class="field-block">
                  <span class="field-label">新密码</span>
                  <input
                    v-model="passwordForm.newPassword"
                    type="password"
                    autocomplete="new-password"
                    class="form-input"
                    placeholder="至少 8 位"
                  >
                </label>
                <label class="field-block">
                  <span class="field-label">确认新密码</span>
                  <input
                    v-model="passwordForm.confirmPassword"
                    type="password"
                    autocomplete="new-password"
                    class="form-input"
                    placeholder="再次输入"
                  >
                </label>
              </div>
              <div class="form-actions">
                <button type="submit" class="primary-button" :disabled="isChangingPassword || !canSubmitPassword">
                  {{ isChangingPassword ? '提交中...' : '修改密码' }}
                </button>
              </div>
            </form>

            <div class="settings-group danger-group">
              <div class="group-heading">
                <h3>退出所有设备</h3>
                <p>其他设备上的登录态会失效，当前会话也会退出。</p>
              </div>
              <div class="form-actions">
                <button type="button" class="danger-button" :disabled="isLoggingOutAll" @click="logoutAllSessions">
                  {{ isLoggingOutAll ? '处理中...' : '退出所有设备' }}
                </button>
              </div>
            </div>
          </section>

          <section v-if="activeTab === 'profile'" class="panel">
            <header class="panel-heading">
              <div>
                <h2>公开资料</h2>
                <p>这些信息会用于作者主页和社区身份展示。</p>
              </div>
            </header>
            <form @submit.prevent="updateProfile">
              <div class="settings-group profile-form-grid">
                <div class="profile-fields">
                  <label class="field-block">
                    <span class="field-label">昵称</span>
                    <input v-model.trim="profileForm.nickname" type="text" placeholder="输入昵称" class="form-input">
                  </label>
                  <label class="field-block">
                    <span class="field-label">头像 URL</span>
                    <input v-model.trim="profileForm.avatarUrl" type="url" placeholder="https://..." class="form-input">
                  </label>
                  <label class="field-block">
                    <span class="field-label">个人简介</span>
                    <textarea v-model.trim="profileForm.bio" rows="5" placeholder="一句话介绍自己" class="form-input resize-none" />
                  </label>
                </div>
                <div class="avatar-preview">
                  <span class="field-label">头像预览</span>
                  <UserAvatar
                    v-if="profileForm.avatarUrl || profileForm.nickname"
                    :src="profileForm.avatarUrl"
                    :name="profileForm.nickname"
                    :alt="profileForm.nickname ? `${profileForm.nickname}的头像预览` : '头像预览'"
                    class="h-24 w-24 rounded-lg text-2xl font-bold"
                  />
                  <div v-else class="avatar-placeholder">未设置</div>
                </div>
              </div>
              <div class="panel-footer">
                <button type="submit" class="primary-button" :disabled="isUpdatingProfile">
                  {{ isUpdatingProfile ? '保存中...' : '保存资料' }}
                </button>
              </div>
            </form>
          </section>

          <section v-if="activeTab === 'intent'" class="panel">
            <header class="panel-heading">
              <div>
                <h2>关注方向</h2>
                <p>用于调整内容发现与个人资料中的兴趣信息。</p>
              </div>
            </header>
            <div class="embedded-form">
              <IntentForm :initial-data="intentFormData || undefined" @submit="updateIntent" />
            </div>
          </section>

          <section v-if="activeTab === 'theme'" class="panel">
            <header class="panel-heading">
              <div>
                <h2>主题</h2>
                <p>主题模式保存在当前浏览器。</p>
              </div>
              <span class="current-value">当前：{{ currentThemeLabel }}</span>
            </header>
            <div class="settings-group">
              <div class="theme-mode-grid" role="radiogroup" aria-label="主题模式">
                <button
                  v-for="option in themeOptions"
                  :key="option.value"
                  type="button"
                  :class="['theme-option', themeStore.mode === option.value ? 'theme-option-active' : '']"
                  :aria-pressed="themeStore.mode === option.value"
                  @click="themeStore.setMode(option.value)"
                >
                  <span>{{ option.label }}</span>
                  <small>{{ option.description }}</small>
                </button>
              </div>
              <div class="theme-preview">
                <div>
                  <span>界面预览</span>
                  <strong>{{ currentThemeLabel }}</strong>
                </div>
                <p>{{ themeStore.isDark() ? '当前使用深色界面。' : '当前使用亮色界面。' }}</p>
              </div>
            </div>
          </section>

          <section v-if="activeTab === 'privacy'" class="panel">
            <header class="panel-heading">
              <div>
                <h2>隐私</h2>
                <p>控制主页信息和搜索可见范围。</p>
              </div>
              <button type="button" class="secondary-button" :disabled="isPrivacyLoading" @click="loadPrivacy">
                {{ isPrivacyLoading ? '加载中...' : '重新加载' }}
              </button>
            </header>

            <div v-if="isPrivacyLoading" class="loading-state" role="status">正在加载隐私设置...</div>
            <form v-else @submit.prevent="updatePrivacy">
              <div class="settings-group">
                <div class="setting-row">
                  <div>
                    <h3 class="setting-title">主页可见性</h3>
                    <p class="setting-desc">控制其他用户查看你的主页资料范围。</p>
                  </div>
                  <select v-model="privacyForm.profileVisibility" class="form-select">
                    <option value="PUBLIC">所有人</option>
                    <option value="FOLLOWERS">仅关注关系</option>
                    <option value="PRIVATE">仅自己</option>
                  </select>
                </div>

                <div class="setting-row">
                  <div>
                    <h3 class="setting-title">关注方向可见性</h3>
                    <p class="setting-desc">控制关注领域、方向、城市等信息的展示范围。</p>
                  </div>
                  <select v-model="privacyForm.intentVisibility" class="form-select">
                    <option value="PUBLIC">所有人</option>
                    <option value="FOLLOWERS">仅关注关系</option>
                    <option value="PRIVATE">仅自己</option>
                  </select>
                </div>

                <label class="switch-row">
                  <div>
                    <h3 class="setting-title">允许被搜索</h3>
                    <p class="setting-desc">关闭后，用户搜索场景可以隐藏你的资料。</p>
                  </div>
                  <input v-model="privacyForm.searchable" type="checkbox" class="switch-input">
                </label>
              </div>
              <div class="panel-footer">
                <button type="submit" class="primary-button" :disabled="isUpdatingPrivacy">
                  {{ isUpdatingPrivacy ? '保存中...' : '保存隐私设置' }}
                </button>
              </div>
            </form>
          </section>

          <section v-if="activeTab === 'notifications'" class="panel">
            <header class="panel-heading panel-heading-top">
              <div>
                <h2>通知偏好</h2>
                <p>控制社区互动和系统提醒的打扰程度；关闭后事件仍会发生，只是不再提醒你。</p>
              </div>
              <button type="button" class="secondary-button" :disabled="isNotificationLoading" @click="loadNotificationPreferences">
                {{ isNotificationLoading ? '加载中...' : '重新加载' }}
              </button>
            </header>

            <div class="preference-notes">
              <p data-phase14-retention-preference-note data-existing-notification-preferences>
                讨论回访会跟随互动通知设置，关注作者和话题的更新会跟随系统通知设置。
              </p>
              <p data-phase15-suggestion-preference-note data-existing-notification-preferences>
                内容补充和纠错建议会按对应通知类型提醒；关闭提醒后，仍可在个人页面主动查看。
              </p>
            </div>

            <div v-if="isNotificationLoading" class="loading-state" role="status">正在加载通知偏好...</div>
            <form v-else @submit.prevent="updateNotificationPreferences">
              <div class="settings-group">
                <label class="switch-row">
                  <div>
                    <h3 class="setting-title">接收互动通知</h3>
                    <p class="setting-desc">包括点赞、评论、收藏、关注和提及等社区回应。</p>
                  </div>
                  <input v-model="notificationForm.interactionNotification" type="checkbox" class="switch-input">
                </label>
                <div
                  class="notification-grid"
                  :class="{ 'notification-grid-disabled': !notificationForm.interactionNotification }"
                >
                  <label
                    v-for="option in notificationPreferenceOptions"
                    :key="option.key"
                    class="notification-toggle"
                    :class="{ 'notification-toggle-disabled': !notificationForm.interactionNotification }"
                  >
                    <span>
                      <span class="notification-title">{{ option.label }}</span>
                      <span class="notification-desc">{{ option.description }}</span>
                    </span>
                    <input
                      v-model="notificationForm[option.key]"
                      type="checkbox"
                      class="switch-input"
                      :disabled="!notificationForm.interactionNotification"
                    >
                  </label>
                </div>
                <p v-if="!notificationForm.interactionNotification" class="setting-help">
                  关闭互动提醒后，别人仍然可以评论、点赞、收藏或关注你，只是这些事件不会再主动打扰。
                </p>

                <label class="switch-row">
                  <div>
                    <h3 class="setting-title">接收系统通知</h3>
                    <p class="setting-desc">包括社区公告、治理提示和话题更新等必要信息。</p>
                  </div>
                  <input v-model="notificationForm.systemNotification" type="checkbox" class="switch-input">
                </label>
                <p v-if="!notificationForm.systemNotification" class="setting-help">
                  关闭系统提醒后，社区公告和话题更新不会主动打扰；你仍可在站内页面查看相关内容。
                </p>
              </div>
              <div class="panel-footer">
                <button type="submit" class="primary-button" :disabled="isUpdatingNotifications">
                  {{ isUpdatingNotifications ? '保存中...' : '保存通知偏好' }}
                </button>
              </div>
            </form>
          </section>

          <section v-if="activeTab === 'feed-controls'" class="panel" data-v29-feed-control-manager>
            <header class="panel-heading panel-heading-top">
              <div>
                <h2>信息流控制</h2>
                <p>管理已隐藏的内容、减少展示的频道和已屏蔽的作者。这些设置只影响当前账号，不会通知其他用户。</p>
                <span class="panel-meta">{{ feedControlCountText }}</span>
              </div>
              <button type="button" class="secondary-button" :disabled="isFeedControlsLoading" @click="loadFeedControls()">
                {{ isFeedControlsLoading ? '加载中...' : '重新加载' }}
              </button>
            </header>

            <div class="settings-group">
              <div class="feed-control-filter" role="tablist" aria-label="信息流控制分类">
                <button
                  v-for="option in feedControlFilterOptions"
                  :key="option.value"
                  type="button"
                  :class="{ 'feed-control-filter-active': feedControlFilter === option.value }"
                  :aria-selected="feedControlFilter === option.value"
                  role="tab"
                  @click="feedControlFilter = option.value"
                >
                  {{ option.label }}
                </button>
              </div>

              <div v-if="isFeedControlsLoading && feedControls.length === 0" class="feed-control-state" role="status">
                正在读取个人信息流控制...
              </div>
              <div v-else-if="feedControlsError && feedControls.length === 0" class="feed-control-state feed-control-state-error" role="alert">
                <span>{{ feedControlsError }}</span>
                <button type="button" @click="loadFeedControls()">重试</button>
              </div>
              <div v-else-if="filteredFeedControls.length === 0" class="feed-control-state">
                当前分类下没有已保存的信息流控制。
              </div>
              <div v-else class="feed-control-list">
                <article v-for="control in filteredFeedControls" :key="control.id" class="feed-control-row">
                  <div class="feed-control-icon" aria-hidden="true">
                    <UserX v-if="control.controlType === 'AUTHOR'" class="h-4 w-4" />
                    <Layers3 v-else-if="control.controlType === 'DOMAIN'" class="h-4 w-4" />
                    <EyeOff v-else class="h-4 w-4" />
                  </div>
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3>{{ control.targetLabel }}</h3>
                      <span class="feed-control-type">{{ feedControlTypeLabel(control.controlType) }}</span>
                    </div>
                    <p>{{ feedControlTimeLabel(control) }}</p>
                  </div>
                  <button
                    type="button"
                    class="feed-control-remove"
                    :disabled="feedControlRemovingIds.has(control.id)"
                    :aria-label="`移除${control.targetLabel}`"
                    :title="`移除${control.targetLabel}`"
                    @click="removeFeedControl(control.id)"
                  >
                    <Loader2 v-if="feedControlRemovingIds.has(control.id)" class="h-4 w-4 animate-spin" />
                    <Trash2 v-else class="h-4 w-4" />
                  </button>
                </article>
              </div>
              <p v-if="feedControlsError && feedControls.length > 0" class="setting-help">{{ feedControlsError }}</p>
              <button
                v-if="feedControlsHasMore"
                type="button"
                class="secondary-button"
                :disabled="isFeedControlsLoadingMore"
                @click="loadFeedControls(true)"
              >
                {{ isFeedControlsLoadingMore ? '加载中...' : '加载更多' }}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { EyeOff, Layers3, Loader2, Trash2, UserX } from 'lucide-vue-next'
import { getErrorMessage, getResultMessage } from '@/api/client'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore, type ThemeMode } from '@/stores/theme'
import { notificationApi } from '@/api/notification'
import { userApi, type PrivacySetting } from '@/api/user'
import { feedApi, type FeedControl, type FeedControlType } from '@/api/feed'
import AppHeader from '@/components/layout/AppHeader.vue'
import IntentForm from '@/components/user/IntentForm.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import type { NotificationPreference, UserIntent } from '@/api/types'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const route = useRoute()
const router = useRouter()

const tabs = [
  { value: 'account', label: '账号' },
  { value: 'profile', label: '资料' },
  { value: 'intent', label: '关注方向' },
  { value: 'theme', label: '主题' },
  { value: 'notifications', label: '通知偏好' },
  { value: 'privacy', label: '隐私' },
  { value: 'feed-controls', label: '信息流控制' },
]

const validTabValues = new Set(tabs.map((tab) => tab.value))
const normalizeTab = (tab: unknown) => (typeof tab === 'string' && validTabValues.has(tab) ? tab : 'account')

const activeTab = ref(normalizeTab(route.query.tab))
const user = ref(authStore.user)
const intentFormData = ref<UserIntent | null>(null)

const switchTab = (tab: string) => {
  const nextTab = normalizeTab(tab)
  activeTab.value = nextTab
  void router.replace({ query: { ...route.query, tab: nextTab } })
}

watch(() => route.query.tab, (tab) => {
  activeTab.value = normalizeTab(tab)
})

const themeOptions: Array<{ value: ThemeMode, label: string, description: string }> = [
  { value: 'dark', label: '深色', description: '适合夜间和后台运维场景' },
  { value: 'light', label: '亮色', description: '适合白天阅读和演示' },
  { value: 'auto', label: '跟随系统', description: '随系统偏好自动切换' },
]

const currentThemeLabel = computed(() => themeOptions.find((option) => option.value === themeStore.mode)?.label || '跟随系统')

const profileForm = ref({
  nickname: user.value?.nickname || '',
  avatarUrl: user.value?.avatar || '',
  bio: user.value?.signature || '',
})

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

type InteractionNotificationKey = 'likeNotification' | 'commentNotification' | 'followNotification' | 'favoriteNotification' | 'mentionNotification'

const defaultPrivacySetting = (): PrivacySetting => ({
  profileVisibility: 'PUBLIC',
  intentVisibility: 'PUBLIC',
  searchable: true,
  interactionNotification: true,
  systemNotification: true,
  likeNotification: true,
  commentNotification: true,
  followNotification: true,
  favoriteNotification: true,
  mentionNotification: true,
})

const defaultNotificationPreference = (): NotificationPreference => ({
  interactionNotification: true,
  systemNotification: true,
  likeNotification: true,
  commentNotification: true,
  followNotification: true,
  favoriteNotification: true,
  mentionNotification: true,
})

const notificationPreferenceOptions: Array<{ key: InteractionNotificationKey, label: string, description: string }> = [
  { key: 'likeNotification', label: '点赞', description: '帖子或评论被点赞时提醒' },
  { key: 'commentNotification', label: '评论', description: '收到评论、回复和讨论更新时提醒' },
  { key: 'followNotification', label: '关注', description: '有用户关注你时提醒' },
  { key: 'favoriteNotification', label: '收藏', description: '内容被收藏时提醒' },
  { key: 'mentionNotification', label: '提及', description: '被 @ 或内容提及时提醒' },
]

const privacyForm = ref<PrivacySetting>(defaultPrivacySetting())
const notificationForm = ref<NotificationPreference>(defaultNotificationPreference())
const feedControls = ref<FeedControl[]>([])
const feedControlFilter = ref<'ALL' | FeedControlType>('ALL')
const feedControlsNextCursor = ref('')
const feedControlsHasMore = ref(false)
const feedControlsLoaded = ref(false)
const feedControlsError = ref('')
const feedControlRemovingIds = ref(new Set<string>())

const isUpdatingProfile = ref(false)
const isChangingPassword = ref(false)
const isLoggingOutAll = ref(false)
const isPrivacyLoading = ref(false)
const isUpdatingPrivacy = ref(false)
const isNotificationLoading = ref(false)
const isUpdatingNotifications = ref(false)
const isFeedControlsLoading = ref(false)
const isFeedControlsLoadingMore = ref(false)

const canSubmitPassword = computed(() => Boolean(
  passwordForm.value.oldPassword
  && passwordForm.value.newPassword
  && passwordForm.value.confirmPassword,
))

const feedControlFilterOptions: Array<{ value: 'ALL' | FeedControlType, label: string }> = [
  { value: 'ALL', label: '全部' },
  { value: 'POST', label: '内容' },
  { value: 'DOMAIN', label: '频道' },
  { value: 'AUTHOR', label: '作者' },
]

const filteredFeedControls = computed(() => (
  feedControlFilter.value === 'ALL'
    ? feedControls.value
    : feedControls.value.filter((control) => control.controlType === feedControlFilter.value)
))

const feedControlCountText = computed(() => (
  feedControlsHasMore.value
    ? `已加载 ${feedControls.value.length} 项控制`
    : `当前共 ${feedControls.value.length} 项控制`
))

const feedControlTypeLabel = (controlType: FeedControlType) => {
  if (controlType === 'AUTHOR') return '作者'
  if (controlType === 'DOMAIN') return '频道'
  return '内容'
}

const formatFeedControlTime = (value: string | number | null | undefined) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

const feedControlTimeLabel = (control: FeedControl) => {
  const updatedAt = formatFeedControlTime(control.updatedAt || control.createdAt)
  const expiresAt = formatFeedControlTime(control.expiresAt)
  if (expiresAt) return `${updatedAt ? `更新于 ${updatedAt}，` : ''}有效至 ${expiresAt}`
  return updatedAt ? `更新于 ${updatedAt}，持续生效` : '持续生效'
}

const loadPrivacy = async () => {
  isPrivacyLoading.value = true
  try {
    const res = await userApi.getPrivacySettings()
    if (res.data) {
      privacyForm.value = { ...defaultPrivacySetting(), ...res.data }
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '隐私设置加载失败'))
  } finally {
    isPrivacyLoading.value = false
  }
}

const loadNotificationPreferences = async () => {
  isNotificationLoading.value = true
  try {
    const res = await notificationApi.getPreferences()
    if (res.data) {
      notificationForm.value = { ...defaultNotificationPreference(), ...res.data }
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '通知偏好加载失败'))
  } finally {
    isNotificationLoading.value = false
  }
}

const loadIntent = async () => {
  const uid = user.value?.uid
  if (!uid) return

  try {
    const res = await userApi.getIntent(uid)
    intentFormData.value = res.data ? { ...res.data } : null
  } catch (error: any) {
    toast.error(getErrorMessage(error, '关注方向加载失败'))
  }
}

const loadFeedControls = async (append = false) => {
  if (append && (!feedControlsHasMore.value || isFeedControlsLoadingMore.value)) return
  if (append) isFeedControlsLoadingMore.value = true
  else isFeedControlsLoading.value = true
  feedControlsError.value = ''
  try {
    const res = await feedApi.listControls(append ? feedControlsNextCursor.value || undefined : undefined, 30)
    const incoming = res.data?.items || []
    const merged = append ? [...feedControls.value, ...incoming] : incoming
    feedControls.value = Array.from(new Map(
      merged
        .filter((control) => Boolean(control.id))
        .map((control) => [control.id, control]),
    ).values())
    feedControlsNextCursor.value = res.data?.nextCursor || ''
    feedControlsHasMore.value = Boolean(res.data?.hasMore && feedControlsNextCursor.value)
    feedControlsLoaded.value = true
  } catch (error: unknown) {
    feedControlsError.value = getErrorMessage(error, '信息流控制暂时无法读取。')
  } finally {
    isFeedControlsLoading.value = false
    isFeedControlsLoadingMore.value = false
  }
}

const removeFeedControl = async (controlId: string) => {
  if (!controlId || feedControlRemovingIds.value.has(controlId)) return
  const nextPending = new Set(feedControlRemovingIds.value)
  nextPending.add(controlId)
  feedControlRemovingIds.value = nextPending
  try {
    await feedApi.deleteControl(controlId)
    feedControls.value = feedControls.value.filter((control) => control.id !== controlId)
    toast.success('信息流控制已移除')
  } catch (error: unknown) {
    toast.error(getErrorMessage(error, '移除信息流控制失败'))
  } finally {
    const next = new Set(feedControlRemovingIds.value)
    next.delete(controlId)
    feedControlRemovingIds.value = next
  }
}

onMounted(() => {
  if (user.value) {
    profileForm.value = {
      nickname: user.value.nickname,
      avatarUrl: user.value.avatar,
      bio: user.value.signature,
    }
  }
  loadPrivacy()
  loadNotificationPreferences()
  loadIntent()
  if (activeTab.value === 'feed-controls') void loadFeedControls()
})

watch(activeTab, (tab) => {
  if (tab === 'feed-controls' && !feedControlsLoaded.value) {
    void loadFeedControls()
  }
})

const updateProfile = async () => {
  isUpdatingProfile.value = true
  try {
    const payload = {
      nickname: profileForm.value.nickname.trim(),
      avatarUrl: profileForm.value.avatarUrl.trim(),
      bio: profileForm.value.bio.trim(),
      signature: profileForm.value.bio.trim(),
    }
    const res = await userApi.updateProfile(payload)
    if (res.code === 0) {
      if (authStore.user) {
        authStore.setUser({
          ...authStore.user,
          nickname: payload.nickname,
          avatar: payload.avatarUrl,
          signature: payload.bio,
        })
      }
      toast.success('资料已更新')
    } else {
      toast.error(getResultMessage(res, '资料更新失败'))
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '资料更新失败'))
  } finally {
    isUpdatingProfile.value = false
  }
}

const changePassword = async () => {
  const oldPassword = passwordForm.value.oldPassword
  const newPassword = passwordForm.value.newPassword
  const confirmPassword = passwordForm.value.confirmPassword

  if (newPassword.length < 8) {
    toast.error('新密码至少需要 8 位')
    return
  }
  if (newPassword !== confirmPassword) {
    toast.error('两次输入的新密码不一致')
    return
  }

  isChangingPassword.value = true
  try {
    await userApi.changePassword({ oldPassword, newPassword })
    passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
    toast.success('密码已更新')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '密码修改失败'))
  } finally {
    isChangingPassword.value = false
  }
}

const logoutAllSessions = async () => {
  const confirmed = window.confirm('确认退出所有设备？当前页面也会跳转到登录页。')
  if (!confirmed) return

  isLoggingOutAll.value = true
  try {
    await authApi.logoutAll()
    authStore.logout()
    toast.success('已退出所有设备')
    router.push('/login')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '退出所有设备失败'))
  } finally {
    isLoggingOutAll.value = false
  }
}

const updateIntent = async (intentData: any) => {
  try {
    const res = await userApi.updateIntent(intentData)
    if (res.code === 0) {
      intentFormData.value = {
        ...intentData,
        targetCompanies: [...(intentData.targetCompanies || [])],
        targetPositions: [...(intentData.targetPositions || [])],
        techStack: [...(intentData.techStack || [])],
        interestTopics: [...(intentData.interestTopics || [])],
        interestTags: [...(intentData.interestTags || [])],
        contentPreferences: [...(intentData.contentPreferences || [])],
        expectedSalaryRange: intentData.expectedSalaryRange ? { ...intentData.expectedSalaryRange } : undefined,
      }
      toast.success('关注方向已更新')
    } else {
      toast.error(getResultMessage(res, '关注方向更新失败'))
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '关注方向更新失败'))
  }
}

const updatePrivacy = async () => {
  isUpdatingPrivacy.value = true
  try {
    const res = await userApi.updatePrivacySettings(privacyForm.value)
    if (res.data) {
      privacyForm.value = { ...defaultPrivacySetting(), ...res.data }
    }
    toast.success('隐私设置已保存')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '隐私设置保存失败'))
  } finally {
    isUpdatingPrivacy.value = false
  }
}

const updateNotificationPreferences = async () => {
  isUpdatingNotifications.value = true
  try {
    const res = await notificationApi.updatePreferences(notificationForm.value)
    if (res.data) {
      notificationForm.value = { ...defaultNotificationPreference(), ...res.data }
    }
    toast.success('通知偏好已保存')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '通知偏好保存失败'))
  } finally {
    isUpdatingNotifications.value = false
  }
}
</script>

<style scoped>
.panel {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 2rem;
}

.tab-button {
  min-height: 44px;
  border-bottom: 2px solid transparent;
  padding: 0.75rem 1rem;
  color: rgb(71 85 105);
  font-size: 0.875rem;
  font-weight: 600;
  transition: color 0.15s ease, border-color 0.15s ease;
  white-space: nowrap;
}

.tab-button:hover,
.tab-button-active {
  border-color: rgb(79 70 229);
  color: rgb(79 70 229);
}

.field-label {
  display: block;
  margin-bottom: 0.5rem;
  color: rgb(51 65 85);
  font-size: 0.875rem;
  font-weight: 600;
}

.form-input,
.form-select {
  min-height: 40px;
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.625rem 0.75rem;
  color: rgb(15 23 42);
  font-size: 0.875rem;
  outline: none;
}

.form-input:focus,
.form-select:focus {
  border-color: rgb(79 70 229);
  box-shadow: 0 0 0 3px rgb(199 210 254 / 0.7);
}

.form-select {
  max-width: 220px;
}

.primary-button,
.secondary-button,
.danger-button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.primary-button {
  background: rgb(79 70 229);
  color: white;
}

.primary-button:hover:not(:disabled) {
  background: rgb(67 56 202);
}

.secondary-button {
  border: 1px solid rgb(226 232 240);
  background: white;
  color: rgb(51 65 85);
}

.secondary-button:hover:not(:disabled) {
  background: rgb(248 250 252);
}

.danger-button {
  border: 1px solid rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(185 28 28);
}

.danger-button:hover:not(:disabled) {
  background: rgb(254 226 226);
}

.account-section {
  border-bottom: 1px solid rgb(241 245 249);
  padding-bottom: 1.5rem;
}

.primary-button:disabled,
.secondary-button:disabled,
.danger-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.setting-row,
.switch-row {
  display: flex;
  min-height: 72px;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  border-bottom: 1px solid rgb(241 245 249);
  padding-bottom: 1.25rem;
}

.setting-title {
  color: rgb(15 23 42);
  font-size: 0.95rem;
  font-weight: 700;
}

.setting-desc {
  margin-top: 0.25rem;
  color: rgb(100 116 139);
  font-size: 0.875rem;
}

.setting-help {
  border-radius: 0.5rem;
  background: rgb(248 250 252);
  padding: 0.75rem 0.9rem;
  color: rgb(100 116 139);
  font-size: 0.8125rem;
  font-weight: 600;
}

.notification-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  border-bottom: 1px solid rgb(241 245 249);
  padding: 0 0 1.25rem 0;
}

.notification-grid-disabled {
  opacity: 0.72;
}

.notification-toggle {
  display: flex;
  min-height: 76px;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.5rem;
  background: rgb(248 250 252);
  padding: 0.875rem;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.notification-toggle:not(.notification-toggle-disabled):hover {
  border-color: rgb(165 180 252);
  background: white;
}

.notification-toggle-disabled {
  cursor: not-allowed;
}

.notification-title,
.notification-desc {
  display: block;
}

.notification-title {
  color: rgb(15 23 42);
  font-size: 0.875rem;
  font-weight: 700;
}

.notification-desc {
  margin-top: 0.2rem;
  color: rgb(100 116 139);
  font-size: 0.75rem;
  line-height: 1.35;
}

.switch-input {
  height: 1.25rem;
  width: 1.25rem;
  flex: 0 0 auto;
  accent-color: rgb(79 70 229);
}

.theme-mode-grid {
  display: grid;
  gap: 0.875rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.theme-option {
  min-height: 92px;
  border-radius: 0.625rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 1rem;
  text-align: left;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.theme-option span,
.theme-option small {
  display: block;
}

.theme-option span {
  color: rgb(15 23 42);
  font-size: 0.95rem;
  font-weight: 800;
}

.theme-option small {
  margin-top: 0.375rem;
  color: rgb(100 116 139);
  font-size: 0.8125rem;
  line-height: 1.45;
}

.theme-option-active {
  border-color: rgb(99 102 241);
  background: rgb(238 242 255);
  box-shadow: 0 0 0 3px rgb(199 210 254 / 0.65);
}

.theme-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 0.625rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 1rem;
}

.theme-preview span,
.theme-preview p {
  color: rgb(100 116 139);
  font-size: 0.8125rem;
}

.theme-preview strong {
  display: block;
  margin-top: 0.25rem;
  color: rgb(15 23 42);
  font-size: 1.125rem;
}

.feed-control-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.feed-control-filter button {
  min-height: 36px;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.5rem;
  background: white;
  padding: 0.4rem 0.75rem;
  color: rgb(71 85 105);
  font-size: 0.8125rem;
  font-weight: 700;
}

.feed-control-filter button:hover,
.feed-control-filter-active {
  border-color: rgb(129 140 248) !important;
  background: rgb(238 242 255) !important;
  color: rgb(67 56 202) !important;
}

.feed-control-state {
  border: 1px dashed rgb(203 213 225);
  border-radius: 0.5rem;
  padding: 1.25rem;
  color: rgb(100 116 139);
  font-size: 0.875rem;
}

.feed-control-state-error {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-color: rgb(253 186 116);
  color: rgb(154 52 18);
}

.feed-control-state-error button {
  color: inherit;
  font-size: 0.8125rem;
  font-weight: 700;
  text-decoration: underline;
}

.feed-control-list {
  border-top: 1px solid rgb(241 245 249);
}

.feed-control-row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) 36px;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 1px solid rgb(241 245 249);
  padding: 0.875rem 0;
}

.feed-control-icon {
  display: grid;
  height: 36px;
  width: 36px;
  place-items: center;
  border-radius: 0.5rem;
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.feed-control-row h3 {
  color: rgb(15 23 42);
  font-size: 0.875rem;
  font-weight: 700;
}

.feed-control-row p {
  margin-top: 0.25rem;
  color: rgb(100 116 139);
  font-size: 0.75rem;
  line-height: 1.4;
}

.feed-control-type {
  border-radius: 999px;
  background: rgb(241 245 249);
  padding: 0.15rem 0.45rem;
  color: rgb(71 85 105);
  font-size: 0.6875rem;
  font-weight: 700;
}

.feed-control-remove {
  display: grid;
  height: 36px;
  width: 36px;
  place-items: center;
  border-radius: 0.5rem;
  color: rgb(100 116 139);
}

.feed-control-remove:hover:not(:disabled) {
  background: rgb(254 242 242);
  color: rgb(185 28 28);
}

.feed-control-remove:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.dark .panel,
.dark .form-input,
.dark .form-select,
.dark .secondary-button,
.dark .danger-button {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .field-label,
.dark .setting-title,
.dark .form-input,
.dark .form-select,
.dark .secondary-button {
  color: rgb(226 232 240);
}

.dark .feed-control-filter button {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .feed-control-filter-active {
  background: rgb(49 46 129 / 0.45) !important;
  color: rgb(199 210 254) !important;
}

.dark .feed-control-state {
  border-color: rgb(51 65 85);
  color: rgb(148 163 184);
}

.dark .feed-control-state-error {
  border-color: rgb(154 52 18);
  color: rgb(253 186 116);
}

.dark .feed-control-list,
.dark .feed-control-row {
  border-color: rgb(30 41 59);
}

.dark .feed-control-icon {
  background: rgb(49 46 129 / 0.45);
  color: rgb(199 210 254);
}

.dark .feed-control-row h3 {
  color: rgb(241 245 249);
}

.dark .feed-control-row p {
  color: rgb(148 163 184);
}

.dark .feed-control-type {
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}

.dark .feed-control-remove {
  color: rgb(148 163 184);
}

.dark .feed-control-remove:hover:not(:disabled) {
  background: rgb(76 5 25 / 0.45);
  color: rgb(253 164 175);
}

.dark .tab-button {
  color: rgb(148 163 184);
}

.dark .tab-button:hover,
.dark .tab-button-active {
  color: rgb(129 140 248);
}

.dark .setting-row,
.dark .switch-row {
  border-bottom-color: rgb(30 41 59);
}

.dark .setting-desc {
  color: rgb(148 163 184);
}

.dark .setting-help {
  background: rgb(2 6 23);
  color: rgb(148 163 184);
}

.dark .notification-grid {
  border-bottom-color: rgb(30 41 59);
}

.dark .notification-toggle {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .notification-toggle:not(.notification-toggle-disabled):hover {
  border-color: rgb(99 102 241);
  background: rgb(30 41 59);
}

.dark .notification-title {
  color: rgb(226 232 240);
}

.dark .notification-desc {
  color: rgb(148 163 184);
}

.dark .theme-option,
.dark .theme-preview {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .theme-option-active {
  border-color: rgb(129 140 248);
  background: rgb(49 46 129 / 0.45);
  box-shadow: 0 0 0 3px rgb(79 70 229 / 0.28);
}

.dark .theme-option span,
.dark .theme-preview strong {
  color: rgb(248 250 252);
}

.dark .theme-option small,
.dark .theme-preview span,
.dark .theme-preview p {
  color: rgb(148 163 184);
}

.dark .secondary-button:hover:not(:disabled) {
  background: rgb(30 41 59);
}

.dark .account-section {
  border-bottom-color: rgb(30 41 59);
}

.dark .danger-button {
  border-color: rgb(127 29 29);
  background: rgb(69 10 10);
  color: rgb(254 202 202);
}

@media (max-width: 640px) {
  .panel {
    padding: 1.25rem;
  }

  .setting-row,
  .switch-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .form-select {
    max-width: none;
  }
  .notification-grid {
    grid-template-columns: 1fr;
  }

  .theme-mode-grid {
    grid-template-columns: 1fr;
  }

  .theme-preview {
    align-items: flex-start;
    flex-direction: column;
  }
}

.settings-page {
  min-height: 100vh;
  background: var(--surface-2);
}

.settings-main {
  padding-top: 1.25rem;
  padding-bottom: 6rem;
}

.workspace-heading {
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

.workspace-heading > div > p:last-child {
  margin: 0.4rem 0 0;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.settings-workspace {
  display: grid;
  grid-template-columns: 11rem minmax(0, 1fr);
  align-items: start;
  gap: 1rem;
}

.settings-tabs {
  position: sticky;
  top: calc(var(--community-header-height) + 1rem);
  display: grid;
  gap: 0.2rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface-1);
  padding: 0.35rem;
}

.settings-tabs .tab-button {
  display: flex;
  min-height: 42px;
  align-items: center;
  border: 0;
  border-radius: var(--radius-control);
  padding: 0 0.75rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
}

.settings-tabs .tab-button:hover {
  border-color: transparent;
  background: var(--surface-2);
  color: var(--text-strong);
}

.settings-tabs .tab-button-active {
  border-color: transparent;
  background: var(--primary-50);
  color: var(--primary-700);
}

.settings-content {
  min-width: 0;
}

.panel {
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface-1);
  padding: 0;
}

.panel-heading {
  display: flex;
  min-height: 5rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--border-subtle);
  padding: 1.1rem 1.25rem;
}

.panel-heading-top {
  align-items: flex-start;
}

.panel-heading h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1.0625rem;
  font-weight: 800;
}

.panel-heading p {
  max-width: 48rem;
  margin: 0.3rem 0 0;
  color: var(--text-muted);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.panel-meta,
.current-value {
  display: inline-flex;
  min-height: 1.75rem;
  align-items: center;
  margin-top: 0.45rem;
  border-radius: var(--radius-pill);
  background: var(--surface-muted);
  padding: 0 0.55rem;
  color: var(--text-muted);
  font-size: 0.6875rem;
  font-weight: 700;
}

.current-value {
  flex: none;
  margin-top: 0;
}

.settings-group {
  border-bottom: 1px solid var(--border-subtle);
  padding: 1.25rem;
}

.settings-group:last-child {
  border-bottom: 0;
}

.group-heading {
  margin-bottom: 1rem;
}

.group-heading h3 {
  margin: 0;
  color: var(--text-strong);
  font-size: 0.875rem;
  font-weight: 750;
}

.group-heading p {
  margin: 0.25rem 0 0;
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.55;
}

.field-block {
  display: block;
}

.field-label {
  margin-bottom: 0.4rem;
  color: var(--text-primary);
  font-size: 0.8125rem;
  font-weight: 650;
}

.form-input,
.form-select {
  min-height: 42px;
  border-radius: var(--radius-control);
  border-color: var(--border-subtle);
  color: var(--text-strong);
  font-size: 0.8125rem;
}

.form-input:disabled {
  background: var(--surface-2);
  color: var(--text-muted);
}

.form-input:focus,
.form-select:focus {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgb(37 99 235 / 0.12);
}

.form-select {
  width: 13rem;
  max-width: 100%;
}

.password-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.primary-button,
.secondary-button,
.danger-button {
  min-height: 40px;
  border-radius: var(--radius-control);
  padding: 0.55rem 0.9rem;
  font-size: 0.8125rem;
  font-weight: 700;
}

.primary-button {
  background: var(--primary-600);
}

.primary-button:hover:not(:disabled) {
  background: var(--primary-700);
}

.secondary-button {
  border-color: var(--border-subtle);
  color: var(--text-primary);
}

.secondary-button:hover:not(:disabled) {
  border-color: #bfdbfe;
  background: var(--primary-50);
  color: var(--primary-700);
}

.danger-group {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
}

.danger-group .group-heading,
.danger-group .form-actions {
  margin: 0;
}

.danger-button {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b42318;
}

.profile-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 10rem;
  align-items: start;
  gap: 1.5rem;
}

.profile-fields {
  display: grid;
  gap: 1rem;
}

.avatar-preview {
  display: flex;
  min-height: 10rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-surface);
  background: var(--surface-2);
  padding: 1rem;
}

.avatar-preview .field-label {
  align-self: stretch;
  text-align: center;
}

.avatar-placeholder {
  display: grid;
  height: 6rem;
  width: 6rem;
  place-items: center;
  border: 1px dashed var(--border-subtle);
  border-radius: var(--radius-surface);
  color: var(--text-muted);
  font-size: 0.75rem;
}

.panel-footer {
  display: flex;
  justify-content: flex-end;
  background: var(--surface-2);
  padding: 0.75rem 1.25rem;
}

.embedded-form {
  padding: 1.25rem;
}

.theme-mode-grid {
  gap: 0.65rem;
}

.theme-option {
  min-height: 82px;
  border-radius: var(--radius-surface);
  border-color: var(--border-subtle);
  background: var(--surface-2);
  padding: 0.85rem;
}

.theme-option:hover {
  border-color: #bfdbfe;
  background: var(--surface-1);
}

.theme-option-active {
  border-color: #93c5fd;
  background: var(--primary-50);
  box-shadow: none;
}

.theme-option span {
  color: var(--text-strong);
  font-size: 0.875rem;
  font-weight: 750;
}

.theme-option small {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.theme-preview {
  margin-top: 0.75rem;
  border: 0;
  border-radius: var(--radius-surface);
  background: var(--surface-muted);
  padding: 0.8rem 0.9rem;
}

.theme-preview strong {
  font-size: 1rem;
}

.setting-row,
.switch-row {
  min-height: 4.75rem;
  border-bottom-color: var(--border-subtle);
  padding: 0.9rem 0;
}

.settings-group > .setting-row:first-child,
.settings-group > .switch-row:first-child {
  padding-top: 0;
}

.settings-group > .setting-row:last-child,
.settings-group > .switch-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.setting-title {
  color: var(--text-strong);
  font-size: 0.875rem;
  font-weight: 750;
}

.setting-desc {
  margin-top: 0.2rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.5;
}

.switch-input {
  position: relative;
  height: 1.4rem;
  width: 2.5rem;
  appearance: none;
  flex: 0 0 auto;
  border-radius: var(--radius-pill);
  background: #cbd5e1;
  cursor: pointer;
  transition: background-color 0.16s ease;
}

.switch-input::after {
  position: absolute;
  top: 0.2rem;
  left: 0.2rem;
  height: 1rem;
  width: 1rem;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.2);
  content: "";
  transition: transform 0.16s ease;
}

.switch-input:checked {
  background: var(--primary-600);
}

.switch-input:checked::after {
  transform: translateX(1.1rem);
}

.switch-input:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.switch-input:focus-visible {
  outline: 2px solid rgb(21 94 239 / 0.7);
  outline-offset: 2px;
}

.preference-notes {
  display: grid;
  gap: 0.35rem;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--surface-2);
  padding: 0.8rem 1.25rem;
}

.preference-notes p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.6875rem;
  line-height: 1.55;
}

.notification-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
  border-bottom-color: var(--border-subtle);
  padding: 0 0 1rem;
}

.notification-toggle {
  min-height: 68px;
  border-radius: var(--radius-surface);
  border-color: var(--border-subtle);
  background: var(--surface-2);
  padding: 0.75rem;
}

.notification-toggle:not(.notification-toggle-disabled):hover {
  border-color: #bfdbfe;
  background: var(--surface-1);
}

.notification-title {
  color: var(--text-strong);
  font-size: 0.8125rem;
  font-weight: 750;
}

.notification-desc {
  color: var(--text-muted);
  font-size: 0.6875rem;
  line-height: 1.45;
}

.setting-help {
  border-radius: var(--radius-control);
  background: var(--surface-muted);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 600;
}

.loading-state {
  display: grid;
  min-height: 14rem;
  place-items: center;
  color: var(--text-muted);
  font-size: 0.8125rem;
}

.feed-control-filter {
  gap: 0.35rem;
  margin-bottom: 1rem;
}

.feed-control-filter button {
  min-height: 36px;
  border-radius: var(--radius-control);
  border-color: var(--border-subtle);
  padding: 0.4rem 0.7rem;
  font-size: 0.75rem;
}

.feed-control-filter button:hover,
.feed-control-filter-active {
  border-color: #bfdbfe !important;
  background: var(--primary-50) !important;
  color: var(--primary-700) !important;
}

.feed-control-state {
  border-radius: var(--radius-surface);
  border-color: var(--border-subtle);
  padding: 1.25rem;
}

.feed-control-list {
  border-top-color: var(--border-subtle);
}

.feed-control-row {
  grid-template-columns: 2.25rem minmax(0, 1fr) 2.25rem;
  border-bottom-color: var(--border-subtle);
}

.feed-control-icon,
.feed-control-remove {
  height: 2.25rem;
  width: 2.25rem;
  border-radius: var(--radius-control);
}

.feed-control-icon {
  background: var(--primary-50);
  color: var(--primary-700);
}

.feed-control-type {
  background: var(--surface-muted);
}

.dark .settings-page {
  background: #0f1115;
}

.dark .settings-tabs,
.dark .panel,
.dark .form-input,
.dark .form-select,
.dark .secondary-button,
.dark .danger-button {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
}

.dark .settings-tabs .tab-button {
  color: rgb(148 163 184);
}

.dark .settings-tabs .tab-button:hover {
  background: rgb(30 41 59);
  color: rgb(248 250 252);
}

.dark .settings-tabs .tab-button-active {
  background: rgb(23 37 84);
  color: rgb(191 219 254);
}

.dark .panel-heading,
.dark .settings-group,
.dark .preference-notes,
.dark .setting-row,
.dark .switch-row,
.dark .notification-grid {
  border-color: rgb(30 41 59);
}

.dark .panel-heading h2,
.dark .group-heading h3,
.dark .setting-title,
.dark .field-label,
.dark .theme-option span,
.dark .notification-title,
.dark .workspace-heading h1 {
  color: rgb(248 250 252);
}

.dark .panel-heading p,
.dark .group-heading p,
.dark .setting-desc,
.dark .preference-notes p,
.dark .workspace-heading > div > p:last-child,
.dark .theme-option small,
.dark .notification-desc {
  color: rgb(148 163 184);
}

.dark .panel-meta,
.dark .current-value,
.dark .panel-footer,
.dark .avatar-preview,
.dark .theme-preview,
.dark .setting-help,
.dark .feed-control-type {
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}

.dark .form-input:disabled {
  background: rgb(30 41 59);
}

.dark .theme-option,
.dark .notification-toggle {
  border-color: rgb(51 65 85);
  background: rgb(17 24 39);
}

.dark .theme-option:hover,
.dark .notification-toggle:not(.notification-toggle-disabled):hover {
  border-color: rgb(59 130 246);
  background: rgb(30 41 59);
}

.dark .theme-option-active {
  border-color: rgb(59 130 246);
  background: rgb(23 37 84);
  box-shadow: none;
}

.dark .feed-control-filter-active {
  background: rgb(23 37 84) !important;
  color: rgb(191 219 254) !important;
}

.dark .feed-control-icon {
  background: rgb(23 37 84);
  color: rgb(191 219 254);
}

.dark .danger-button {
  border-color: rgb(127 29 29);
  background: rgb(69 10 10);
  color: rgb(254 202 202);
}

@media (max-width: 960px) {
  .settings-workspace {
    grid-template-columns: minmax(0, 1fr);
  }

  .settings-tabs {
    position: sticky;
    top: var(--community-header-height);
    z-index: 10;
    display: flex;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .settings-tabs::-webkit-scrollbar {
    display: none;
  }

  .settings-tabs .tab-button {
    flex: none;
  }

  .password-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .settings-main {
    padding-top: 0.75rem;
  }

  .settings-workspace {
    gap: 0.75rem;
  }

  .settings-tabs {
    margin-right: calc(var(--community-page-gutter) * -1);
    margin-left: calc(var(--community-page-gutter) * -1);
    border-right: 0;
    border-left: 0;
    border-radius: 0;
    padding-right: var(--community-page-gutter);
    padding-left: var(--community-page-gutter);
  }

  .settings-tabs .tab-button {
    min-height: 44px;
  }

  .panel-heading {
    min-height: 0;
    align-items: flex-start;
    flex-direction: column;
    padding: 1rem;
  }

  .panel-heading .secondary-button {
    width: 100%;
  }

  .settings-group,
  .embedded-form {
    padding: 1rem;
  }

  .password-grid,
  .profile-form-grid,
  .notification-grid,
  .theme-mode-grid {
    grid-template-columns: 1fr;
  }

  .profile-form-grid {
    gap: 1rem;
  }

  .avatar-preview {
    min-height: 8rem;
    align-items: flex-start;
  }

  .avatar-preview .field-label {
    align-self: auto;
    text-align: left;
  }

  .setting-row,
  .switch-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.75rem;
  }

  .switch-row .switch-input {
    align-self: flex-end;
    margin-top: -2.5rem;
  }

  .form-select {
    width: 100%;
  }

  .danger-group {
    grid-template-columns: minmax(0, 1fr);
  }

  .danger-group .form-actions,
  .form-actions,
  .panel-footer {
    justify-content: stretch;
  }

  .form-actions button,
  .panel-footer button {
    width: 100%;
  }

  .panel-footer,
  .preference-notes {
    padding-right: 1rem;
    padding-left: 1rem;
  }

  .theme-preview {
    align-items: flex-start;
    flex-direction: column;
  }

  .notification-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 390px) {
  .workspace-heading h1 {
    font-size: 1.35rem;
  }

  .workspace-heading > div > p:last-child {
    max-width: 21rem;
    font-size: 0.8125rem;
  }

  .settings-tabs .tab-button {
    padding: 0 0.65rem;
  }

  .feed-control-row {
    gap: 0.6rem;
  }
}
</style>
