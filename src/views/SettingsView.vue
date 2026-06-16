<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="px-4 py-8">
    <div class="mx-auto max-w-5xl space-y-6">
      <section class="flex flex-col gap-2">
        <p class="text-sm font-medium text-primary-600 dark:text-primary-400">Account Settings</p>
        <h1 class="text-2xl font-bold text-slate-950 dark:text-slate-50">设置</h1>
        <p class="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          管理账号资料、关注方向和隐私偏好。
        </p>
      </section>

      <nav class="flex gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          :class="['tab-button', activeTab === tab.value ? 'tab-button-active' : '']"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
        </button>
      </nav>

      <section v-if="activeTab === 'account'" class="panel space-y-6">
        <div class="account-section">
          <label class="field-label">邮箱</label>
          <input :value="user?.email || ''" disabled class="form-input cursor-not-allowed bg-slate-50 text-slate-500 dark:bg-slate-800" />
          <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">邮箱暂不支持修改。</p>
        </div>

        <form class="account-section space-y-4" @submit.prevent="changePassword">
          <div>
            <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">修改密码</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">提交后会立即更新当前账号密码。</p>
          </div>
          <div class="grid gap-4 md:grid-cols-3">
            <label>
              <span class="field-label">原密码</span>
              <input
                v-model="passwordForm.oldPassword"
                type="password"
                autocomplete="current-password"
                class="form-input"
                placeholder="输入原密码"
              />
            </label>
            <label>
              <span class="field-label">新密码</span>
              <input
                v-model="passwordForm.newPassword"
                type="password"
                autocomplete="new-password"
                class="form-input"
                placeholder="至少 8 位"
              />
            </label>
            <label>
              <span class="field-label">确认新密码</span>
              <input
                v-model="passwordForm.confirmPassword"
                type="password"
                autocomplete="new-password"
                class="form-input"
                placeholder="再次输入"
              />
            </label>
          </div>
          <button type="submit" class="primary-button" :disabled="isChangingPassword || !canSubmitPassword">
            {{ isChangingPassword ? '提交中...' : '修改密码' }}
          </button>
        </form>

        <div class="account-section flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">退出所有设备</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">会使其他设备上的登录态失效，并退出当前会话。</p>
          </div>
          <button type="button" class="danger-button" :disabled="isLoggingOutAll" @click="logoutAllSessions">
            {{ isLoggingOutAll ? '处理中...' : '退出所有设备' }}
          </button>
        </div>
      </section>

      <section v-if="activeTab === 'profile'" class="panel">
        <form class="space-y-6" @submit.prevent="updateProfile">
          <div>
            <label class="field-label">昵称</label>
            <input v-model.trim="profileForm.nickname" type="text" placeholder="输入昵称" class="form-input" />
          </div>
          <div>
            <label class="field-label">头像 URL</label>
            <input v-model.trim="profileForm.avatarUrl" type="url" placeholder="https://..." class="form-input" />
            <img
              v-if="profileForm.avatarUrl"
              :src="profileForm.avatarUrl"
              :alt="profileForm.nickname"
              class="mt-3 h-24 w-24 rounded-lg object-cover"
            />
          </div>
          <div>
            <label class="field-label">个人简介</label>
            <textarea v-model.trim="profileForm.bio" rows="4" placeholder="一句话介绍自己" class="form-input resize-none" />
          </div>
          <button type="submit" class="primary-button" :disabled="isUpdatingProfile">
            {{ isUpdatingProfile ? '保存中...' : '保存资料' }}
          </button>
        </form>
      </section>

      <section v-if="activeTab === 'intent'" class="panel">
        <IntentForm @submit="updateIntent" />
      </section>

      <section v-if="activeTab === 'theme'" class="panel space-y-6">
        <div class="border-b border-slate-200 pb-5 dark:border-slate-800">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">主题设置</h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            选择亮色、深色或跟随系统，设置会保存在当前浏览器。
          </p>
        </div>
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
            <span>当前模式</span>
            <strong>{{ currentThemeLabel }}</strong>
          </div>
          <p>{{ themeStore.isDark() ? '页面会使用深色 surface 与高对比文本。' : '页面会使用亮色 surface 与浅色背景。' }}</p>
        </div>
      </section>

      <section v-if="activeTab === 'privacy'" class="panel space-y-6">
        <div class="flex flex-col gap-3 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">隐私设置</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">保存后会写入后端，刷新页面仍会保留。</p>
          </div>
          <button type="button" class="secondary-button" :disabled="isPrivacyLoading" @click="loadPrivacy">
            {{ isPrivacyLoading ? '加载中...' : '重新加载' }}
          </button>
        </div>

        <div v-if="isPrivacyLoading" class="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
          正在加载隐私设置...
        </div>
        <form v-else class="space-y-6" @submit.prevent="updatePrivacy">
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
            <input v-model="privacyForm.searchable" type="checkbox" class="switch-input" />
          </label>

          <label class="switch-row">
            <div>
              <h3 class="setting-title">接收互动通知</h3>
              <p class="setting-desc">包括关注、点赞、评论、收藏等通知。</p>
            </div>
            <input v-model="privacyForm.interactionNotification" type="checkbox" class="switch-input" />
          </label>
          <div
            class="notification-grid"
            :class="{ 'notification-grid-disabled': !privacyForm.interactionNotification }"
          >
            <label
              v-for="option in notificationPreferenceOptions"
              :key="option.key"
              class="notification-toggle"
              :class="{ 'notification-toggle-disabled': !privacyForm.interactionNotification }"
            >
              <span>
                <span class="notification-title">{{ option.label }}</span>
                <span class="notification-desc">{{ option.description }}</span>
              </span>
              <input
                v-model="privacyForm[option.key]"
                type="checkbox"
                class="switch-input"
                :disabled="!privacyForm.interactionNotification"
              />
            </label>
          </div>

          <label class="switch-row">
            <div>
              <h3 class="setting-title">接收系统通知</h3>
              <p class="setting-desc">包括系统公告、运维提示和产品消息。</p>
            </div>
            <input v-model="privacyForm.systemNotification" type="checkbox" class="switch-input" />
          </label>

          <button type="submit" class="primary-button" :disabled="isUpdatingPrivacy">
            {{ isUpdatingPrivacy ? '保存中...' : '保存隐私设置' }}
          </button>
        </form>
      </section>
    </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { getErrorMessage, getResultMessage } from '@/api/client'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore, type ThemeMode } from '@/stores/theme'
import { userApi, type PrivacySetting } from '@/api/user'
import AppHeader from '@/components/layout/AppHeader.vue'
import IntentForm from '@/components/user/IntentForm.vue'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const router = useRouter()

const tabs = [
  { value: 'account', label: '账号' },
  { value: 'profile', label: '资料' },
  { value: 'intent', label: '关注方向' },
  { value: 'theme', label: '主题' },
  { value: 'privacy', label: '隐私' },
]

const activeTab = ref('account')
const user = ref(authStore.user)

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

const notificationPreferenceOptions: Array<{ key: InteractionNotificationKey, label: string, description: string }> = [
  { key: 'likeNotification', label: '点赞', description: '收到帖子或评论点赞时提醒' },
  { key: 'commentNotification', label: '评论', description: '收到评论、回复和讨论更新时提醒' },
  { key: 'followNotification', label: '关注', description: '有用户关注你时提醒' },
  { key: 'favoriteNotification', label: '收藏', description: '内容被收藏时提醒' },
  { key: 'mentionNotification', label: '提及', description: '被 @ 或内容提及时提醒' },
]

const privacyForm = ref<PrivacySetting>(defaultPrivacySetting())

const isUpdatingProfile = ref(false)
const isChangingPassword = ref(false)
const isLoggingOutAll = ref(false)
const isPrivacyLoading = ref(false)
const isUpdatingPrivacy = ref(false)

const canSubmitPassword = computed(() => Boolean(
  passwordForm.value.oldPassword
  && passwordForm.value.newPassword
  && passwordForm.value.confirmPassword,
))

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

onMounted(() => {
  if (user.value) {
    profileForm.value = {
      nickname: user.value.nickname,
      avatarUrl: user.value.avatar,
      bio: user.value.signature,
    }
  }
  loadPrivacy()
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
</style>
