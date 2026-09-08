<template>
  <div class="auth-page min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="auth-page__main community-page">
      <div class="w-full max-w-md">
        <!-- Card -->
        <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <div class="auth-nav-row mb-6">
            <RouterLink to="/" class="auth-nav-link text-sm font-semibold text-slate-500 transition-colors hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-300">
              返回首页
            </RouterLink>
            <AuthThemeToggle />
          </div>
          <!-- Header -->
          <div class="text-center mb-8">
            <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">登录 {{ siteBrand.displayName }}</h1>
            <p class="text-sm text-slate-600 dark:text-slate-400">{{ siteBrand.description }}</p>
          </div>

          <section v-if="recoveryState" class="auth-recovery mb-6" :data-auth-recovery="recoveryState">
            <div>
              <strong>{{ recoveryTitle }}</strong>
              <p>{{ recoveryText }}</p>
            </div>
            <button
              v-if="recoveryState === 'hydrate_failed' && authStore.token"
              type="button"
              :disabled="isRetryingSession"
              @click="retrySession"
            >
              {{ isRetryingSession ? '重试中...' : '重试当前会话' }}
            </button>
          </section>

          <section v-if="loginFeedback" class="auth-feedback mb-6" role="status" aria-live="polite">
            <div>
              <strong>{{ loginFeedbackTitle }}</strong>
              <p>{{ loginFeedback }}</p>
            </div>
            <button v-if="loginFeedbackState === 'timeout'" type="button" :disabled="isLoading" @click="handleSubmit">重试登录</button>
          </section>

          <!-- Form -->
          <form class="space-y-4" @submit.prevent="handleSubmit">
            <!-- Account Field -->
            <div>
              <label for="login-account" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">账号或邮箱</label>
              <input
                id="login-account"
                v-model="form.email"
                type="text"
                name="account"
                autocomplete="username"
                aria-label="账号或邮箱"
                placeholder="输入账号或邮箱"
                class="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100"
                :disabled="isLoading || rateLimitSeconds > 0"
              >
              <p v-if="errors.email" class="text-xs text-danger mt-1">{{ errors.email }}</p>
            </div>

            <!-- Password Field -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label for="login-password" class="block text-sm font-medium text-slate-700 dark:text-slate-300">密码</label>
                <button
                  type="button"
                  class="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  @click="openForgotPassword"
                >
                  忘记密码？
                </button>
              </div>
              <input
                id="login-password"
                v-model="form.password"
                type="password"
                name="password"
                autocomplete="current-password"
                aria-label="密码"
                placeholder="输入密码"
                class="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100"
                :disabled="isLoading || rateLimitSeconds > 0"
              >
              <p v-if="errors.password" class="text-xs text-danger mt-1">{{ errors.password }}</p>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="isLoading || rateLimitSeconds > 0"
              class="auth-submit w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {{ isLoading ? '登录中...' : rateLimitSeconds > 0 ? `${rateLimitSeconds} 秒后重试` : '登录' }}
            </button>
          </form>

          <!-- Divider -->
          <div class="my-6 border-t border-slate-200 dark:border-slate-800" />

          <!-- Register Link -->
          <p class="text-center text-sm text-slate-600 dark:text-slate-400">
            还没有账号？
            <RouterLink :to="{ path: '/register', query: redirectQuery(route.query.redirect) }" class="auth-inline-link text-primary-600 hover:text-primary-700 font-medium">
              立即注册
            </RouterLink>
          </p>
        </div>

        <!-- Forgot Password Dialog -->
        <div
          v-if="forgotOpen"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="找回密码"
          @click.self="closeForgotPassword"
        >
          <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-lg">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">找回密码</h2>
              <button
                type="button"
                class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none"
                aria-label="关闭找回密码"
                @click="closeForgotPassword"
              >
                ×
              </button>
            </div>

            <!-- 第一步：填写邮箱获取验证码 -->
            <form v-if="forgotStep === 'email'" class="space-y-4" @submit.prevent="submitForgotEmail">
              <p class="text-sm text-slate-600 dark:text-slate-400">输入注册时使用的邮箱，我们将发送 6 位验证码（10 分钟内有效）。</p>
              <div>
                <label for="forgot-email" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">注册邮箱</label>
                <input
                  id="forgot-email"
                  v-model="forgotForm.email"
                  type="email"
                  autocomplete="email"
                  placeholder="you@example.com"
                  class="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100"
                  :disabled="forgotLoading"
                >
                <p v-if="forgotErrors.email" class="text-xs text-danger mt-1">{{ forgotErrors.email }}</p>
              </div>
              <button
                type="submit"
                :disabled="forgotLoading || forgotResendSeconds > 0"
                class="w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ forgotLoading ? '发送中...' : forgotResendSeconds > 0 ? `${forgotResendSeconds} 秒后可重发` : '获取验证码' }}
              </button>
            </form>

            <!-- 第二步：验证码 + 新密码 -->
            <form v-else-if="forgotStep === 'confirm'" class="space-y-4" @submit.prevent="submitForgotConfirm">
              <p class="text-sm text-slate-600 dark:text-slate-400">
                验证码已发送至 <strong>{{ maskedForgotEmail }}</strong><template v-if="forgotChannelHint">（{{ forgotChannelHint }}）</template>，10 分钟内有效。
              </p>
              <div>
                <label for="forgot-code" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">邮箱验证码</label>
                <input
                  id="forgot-code"
                  v-model="forgotForm.code"
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  autocomplete="one-time-code"
                  placeholder="6 位数字验证码"
                  class="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100 tracking-widest"
                  :disabled="forgotLoading"
                >
                <p v-if="forgotErrors.code" class="text-xs text-danger mt-1">{{ forgotErrors.code }}</p>
              </div>
              <div>
                <label for="forgot-new-password" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">新密码</label>
                <input
                  id="forgot-new-password"
                  v-model="forgotForm.newPassword"
                  type="password"
                  autocomplete="new-password"
                  placeholder="至少 8 位，包含字母和数字"
                  class="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100"
                  :disabled="forgotLoading"
                >
                <p v-if="forgotErrors.newPassword" class="text-xs text-danger mt-1">{{ forgotErrors.newPassword }}</p>
              </div>
              <div class="flex items-center justify-between text-xs">
                <button
                  type="button"
                  class="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium disabled:text-slate-400 disabled:cursor-not-allowed"
                  :disabled="forgotLoading || forgotResendSeconds > 0"
                  @click="submitForgotEmail"
                >
                  {{ forgotResendSeconds > 0 ? `${forgotResendSeconds} 秒后可重发` : '重新发送验证码' }}
                </button>
                <button type="button" class="text-slate-500 hover:text-slate-700 dark:text-slate-400" @click="forgotStep = 'email'">
                  换一个邮箱
                </button>
              </div>
              <button
                type="submit"
                :disabled="forgotLoading"
                class="w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ forgotLoading ? '提交中...' : '重置密码' }}
              </button>
            </form>

            <!-- 第三步：完成 -->
            <div v-else class="space-y-4 text-center">
              <div class="text-4xl" aria-hidden="true">✅</div>
              <p class="text-sm text-slate-700 dark:text-slate-300">密码已重置成功，旧登录状态已全部失效。请使用新密码登录。</p>
              <button
                type="button"
                class="w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                @click="finishForgotPassword"
              >
                返回登录
              </button>
            </div>
          </div>
        </div>

        <!-- Demo Hint -->
        <div v-if="showDemoAccounts" class="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
          <p class="text-xs text-primary-700 dark:text-primary-300">
            <strong>演示账号：</strong> admin / 123456，user1 / 123456
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, reactive } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'vue-sonner'
import { getErrorMessage, getRateLimitRetryAfterSeconds } from '@/api/client'
import { authApi } from '@/api/auth'
import { redirectQuery, safeRedirect } from '@/utils/navigation'
import AuthThemeToggle from '@/components/auth/AuthThemeToggle.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import { siteBrand } from '@/utils/brand'
import { z } from 'zod'

const router = useRouter()
const route = useRoute()
const { login } = useAuth()
const authStore = useAuthStore()

const isLoading = ref(false)
const isRetryingSession = ref(false)
const loginFeedback = ref('')
const loginFeedbackState = ref<'waiting' | 'timeout' | ''>('')
const rateLimitSeconds = ref(0)
let rateLimitTimer: ReturnType<typeof setInterval> | undefined
let loginFeedbackTimer: ReturnType<typeof setTimeout> | undefined
const showDemoAccounts = import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true'
const form = reactive({
  email: '',
  password: '',
})

const errors = reactive({
  email: '',
  password: '',
})

const recoveryState = computed(() => {
  const reason = String(route.query.reason || '')
  if (reason === 'session_expired' || authStore.sessionExpired) return 'session_expired'
  if (reason === 'hydrate_failed' || authStore.hydrateFailed) return 'hydrate_failed'
  return ''
})
const recoveryTitle = computed(() => recoveryState.value === 'session_expired'
  ? '当前会话已过期'
  : '暂时无法确认当前会话')
const recoveryText = computed(() => recoveryState.value === 'session_expired'
  ? '请重新登录，完成后会返回刚才访问的页面。'
  : authStore.hydrationError || '账号服务暂时没有返回可信结果。你可以重试当前会话，或使用其他账号登录。')
const loginFeedbackTitle = computed(() => loginFeedbackState.value === 'waiting'
  ? '正在确认账号信息'
  : '登录请求超时')

const clearLoginFeedbackTimer = () => {
  if (!loginFeedbackTimer) return
  clearTimeout(loginFeedbackTimer)
  loginFeedbackTimer = undefined
}

// Validation schema
const loginSchema = z.object({
  email: z.string().min(1, '请输入账号或邮箱'),
  // 登录需兼容密码策略升级前的存量账号；强度规则由注册和改密入口执行。
  password: z.string().min(1, '请输入密码'),
})

const validateForm = () => {
  errors.email = ''
  errors.password = ''

  try {
    loginSchema.parse(form)
    return true
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        const field = err.path[0] as string
        if (field === 'email') errors.email = err.message
        if (field === 'password') errors.password = err.message
      })
    }
    return false
  }
}

const navigateAfterLogin = () => {
  // 登录成功后使用同源硬导航，避免登录页等待异步路由组件或守卫 Promise。
  window.location.replace(safeRedirect(route.query.redirect))
}

const handleSubmit = async () => {
  if (!validateForm()) return

  isLoading.value = true
  loginFeedback.value = ''
  loginFeedbackState.value = ''
  clearLoginFeedbackTimer()
  loginFeedbackTimer = setTimeout(() => {
    if (!isLoading.value) return
    loginFeedbackState.value = 'waiting'
    loginFeedback.value = '登录请求仍在处理中，请保持当前页面。'
  }, 3_000)
  try {
    await login(form.email, form.password)
    navigateAfterLogin()
  } catch (error: any) {
    const retryAfterSeconds = getRateLimitRetryAfterSeconds(error)
    if (retryAfterSeconds) {
      rateLimitSeconds.value = retryAfterSeconds
      if (rateLimitTimer) clearInterval(rateLimitTimer)
      rateLimitTimer = setInterval(() => {
        rateLimitSeconds.value = Math.max(0, rateLimitSeconds.value - 1)
        if (rateLimitSeconds.value === 0 && rateLimitTimer) {
          clearInterval(rateLimitTimer)
          rateLimitTimer = undefined
        }
      }, 1000)
      toast.error(`操作过于频繁，请 ${retryAfterSeconds} 秒后重试`)
    } else if (isLoginTimeout(error)) {
      loginFeedbackState.value = 'timeout'
      loginFeedback.value = '本次登录未完成，账号和密码尚未被确认。请检查网络后重试。'
      toast.error('登录请求超时，请检查网络后重试')
    } else {
      const message = getErrorMessage(error, '登录失败，请检查账号和密码')
      toast.error(message)
    }
  } finally {
    clearLoginFeedbackTimer()
    isLoading.value = false
  }
}

// ---------- 找回密码（三步：邮箱 → 验证码+新密码 → 完成） ----------
const forgotOpen = ref(false)
const forgotStep = ref<'email' | 'confirm' | 'done'>('email')
const forgotLoading = ref(false)
const forgotResendSeconds = ref(0)
const forgotChannelHint = ref('')
let forgotResendTimer: ReturnType<typeof setInterval> | undefined

const forgotForm = reactive({ email: '', code: '', newPassword: '' })
const forgotErrors = reactive({ email: '', code: '', newPassword: '' })

const maskedForgotEmail = computed(() => {
  const email = forgotForm.email.trim()
  const at = email.indexOf('@')
  if (at <= 0) return email
  const local = email.slice(0, at)
  const domain = email.slice(at)
  const shown = local.slice(0, Math.min(2, local.length))
  return `${shown}${'*'.repeat(Math.max(1, local.length - shown.length))}${domain}`
})

const openForgotPassword = () => {
  forgotOpen.value = true
  forgotStep.value = 'email'
  forgotForm.email = ''
  forgotForm.code = ''
  forgotForm.newPassword = ''
  forgotErrors.email = ''
  forgotErrors.code = ''
  forgotErrors.newPassword = ''
  forgotChannelHint.value = ''
}

const closeForgotPassword = () => {
  forgotOpen.value = false
  if (forgotResendTimer) {
    clearInterval(forgotResendTimer)
    forgotResendTimer = undefined
  }
}

const finishForgotPassword = () => {
  closeForgotPassword()
  forgotStep.value = 'email'
}

const startForgotResendCooldown = () => {
  forgotResendSeconds.value = 60
  if (forgotResendTimer) clearInterval(forgotResendTimer)
  forgotResendTimer = setInterval(() => {
    forgotResendSeconds.value = Math.max(0, forgotResendSeconds.value - 1)
    if (forgotResendSeconds.value === 0 && forgotResendTimer) {
      clearInterval(forgotResendTimer)
      forgotResendTimer = undefined
    }
  }, 1000)
}

const validateForgotEmail = () => {
  forgotErrors.email = ''
  const email = forgotForm.email.trim()
  if (!email) {
    forgotErrors.email = '请输入注册时使用的邮箱'
    return false
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    forgotErrors.email = '请输入有效的邮箱地址'
    return false
  }
  return true
}

const submitForgotEmail = async () => {
  if (!validateForgotEmail() || forgotLoading.value) return
  forgotLoading.value = true
  try {
    const res = await authApi.requestPasswordReset(forgotForm.email.trim())
    startForgotResendCooldown()
    forgotChannelHint.value = res.data?.channel === 'ops'
      ? '当前环境未接入邮件服务，验证码已交给运维通道，请联系管理员获取'
      : '请查收邮箱'
    forgotStep.value = 'confirm'
    toast.success('验证码已发送')
  } catch (error: any) {
    const retryAfterSeconds = getRateLimitRetryAfterSeconds(error)
    if (retryAfterSeconds) {
      forgotResendSeconds.value = retryAfterSeconds
      startForgotResendCooldown()
      forgotResendSeconds.value = retryAfterSeconds
      toast.error(`操作过于频繁，请 ${retryAfterSeconds} 秒后重试`)
    } else {
      toast.error(getErrorMessage(error, '验证码发送失败，请稍后重试'))
    }
  } finally {
    forgotLoading.value = false
  }
}

const validateForgotConfirm = () => {
  forgotErrors.code = ''
  forgotErrors.newPassword = ''
  let ok = true
  if (!/^\d{6}$/.test(forgotForm.code.trim())) {
    forgotErrors.code = '请输入 6 位数字验证码'
    ok = false
  }
  if (forgotForm.newPassword.length < 8 || !/[a-zA-Z]/.test(forgotForm.newPassword) || !/\d/.test(forgotForm.newPassword)) {
    forgotErrors.newPassword = '密码至少 8 位，且需同时包含字母和数字'
    ok = false
  }
  return ok
}

const submitForgotConfirm = async () => {
  if (!validateForgotConfirm() || forgotLoading.value) return
  forgotLoading.value = true
  try {
    await authApi.confirmPasswordReset(forgotForm.email.trim(), forgotForm.code.trim(), forgotForm.newPassword)
    forgotStep.value = 'done'
    if (forgotResendTimer) {
      clearInterval(forgotResendTimer)
      forgotResendTimer = undefined
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '重置失败，请确认验证码后重试'))
  } finally {
    forgotLoading.value = false
  }
}

onBeforeUnmount(() => {
  if (forgotResendTimer) clearInterval(forgotResendTimer)
})

const isLoginTimeout = (error: unknown) => {
  const requestError = error as { code?: string, message?: string, response?: unknown }
  if (requestError.response) return false
  if (['ECONNABORTED', 'ETIMEDOUT'].includes(String(requestError.code || '').toUpperCase())) return true
  return /timeout|timed out|超时/i.test(String(requestError.message || ''))
}

const retrySession = async () => {
  isRetryingSession.value = true
  await authStore.hydrate()
  try {
    if (authStore.isLoggedIn) {
      navigateAfterLogin()
    } else if (authStore.sessionExpired) {
      await router.replace({
        path: '/login',
        query: { redirect: safeRedirect(route.query.redirect), reason: 'session_expired' },
      })
    } else {
      toast.error(authStore.hydrationError || '当前会话仍无法确认，请稍后重试。')
    }
  } finally {
    isRetryingSession.value = false
  }
}

onMounted(async () => {
  if (route.query.switchAccount === '1') {
    authStore.logout()
    return
  }
  if (authStore.token && !authStore.user && !authStore.hydrateFailed) {
    await authStore.hydrate()
  }
  if (authStore.isLoggedIn) {
    navigateAfterLogin()
  }
})

onBeforeUnmount(() => {
  clearLoginFeedbackTimer()
  if (rateLimitTimer) clearInterval(rateLimitTimer)
})
</script>

<style scoped>
.auth-page__main {
  display: flex;
  min-height: calc(100vh - var(--community-header-height));
  align-items: center;
  justify-content: center;
  padding-top: 2rem;
  padding-bottom: 3rem;
}

.auth-nav-link,
.auth-inline-link {
  min-height: 44px;
  align-items: center;
}

.auth-nav-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.auth-nav-link {
  display: inline-flex;
}

.auth-inline-link {
  display: inline-flex;
  padding-inline: 0.25rem;
}

.auth-submit {
  min-height: 44px;
}

.auth-recovery {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid rgb(253 230 138);
  border-radius: 0.5rem;
  background: rgb(255 251 235);
  padding: 0.8rem;
  color: rgb(146 64 14);
}

.auth-recovery strong,
.auth-recovery p {
  display: block;
}

.auth-recovery p {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  line-height: 1.5;
}

.auth-recovery button {
  flex: none;
  min-height: 2.25rem;
  border-radius: 0.375rem;
  background: rgb(146 64 14);
  padding: 0 0.75rem;
  color: white;
  font-size: 0.75rem;
  font-weight: 800;
}

.auth-feedback {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid rgb(169 216 195);
  border-radius: 0.5rem;
  background: rgb(232 243 237);
  padding: 0.8rem;
  color: rgb(14 74 55);
}

.auth-feedback strong,
.auth-feedback p {
  display: block;
}

.auth-feedback p {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  line-height: 1.5;
}

.auth-feedback button {
  flex: none;
  min-height: 2.25rem;
  border-radius: 0.375rem;
  background: rgb(14 74 55);
  padding: 0 0.75rem;
  color: white;
  font-size: 0.75rem;
  font-weight: 800;
}

.dark .auth-recovery {
  border-color: rgb(146 64 14);
  background: rgb(69 26 3 / 0.45);
  color: rgb(253 230 138);
}

.dark .auth-feedback {
  border-color: rgb(14 74 55);
  background: rgb(10 52 39 / 0.35);
  color: rgb(169 216 195);
}

@media (max-width: 720px) {
  .auth-page__main {
    min-height: auto;
    align-items: flex-start;
    padding-top: 1rem;
    padding-bottom: 2rem;
  }

  .auth-recovery,
  .auth-feedback {
    flex-direction: column;
  }
}
</style>
