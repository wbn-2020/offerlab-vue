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
                :disabled="isLoading"
              >
              <p v-if="errors.email" class="text-xs text-danger mt-1">{{ errors.email }}</p>
            </div>

            <!-- Password Field -->
            <div>
              <label for="login-password" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">密码</label>
              <input
                id="login-password"
                v-model="form.password"
                type="password"
                name="password"
                autocomplete="current-password"
                aria-label="密码"
                placeholder="至少 6 位"
                class="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100"
                :disabled="isLoading"
              >
              <p v-if="errors.password" class="text-xs text-danger mt-1">{{ errors.password }}</p>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="isLoading"
              class="auth-submit w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {{ isLoading ? '登录中...' : '登录' }}
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

        <!-- Demo Hint -->
        <div v-if="showDemoAccounts" class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p class="text-xs text-blue-700 dark:text-blue-300">
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
import { getErrorMessage } from '@/api/client'
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
  password: z.string().min(6, '密码至少 6 位'),
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
    await router.replace(safeRedirect(route.query.redirect))
    toast.success('登录成功')
  } catch (error: any) {
    if (isLoginTimeout(error)) {
      loginFeedbackState.value = 'timeout'
      loginFeedback.value = '本次登录未完成，账号和密码尚未被确认。请检查网络后重试。'
    }
    const message = getErrorMessage(error, '登录失败，请检查账号和密码')
    toast.error(message)
  } finally {
    clearLoginFeedbackTimer()
    isLoading.value = false
  }
}

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
      await router.replace(safeRedirect(route.query.redirect))
      toast.success('会话已恢复')
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
    await router.replace(safeRedirect(route.query.redirect))
  }
})

onBeforeUnmount(() => {
  clearLoginFeedbackTimer()
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
  border: 1px solid rgb(191 219 254);
  border-radius: 0.5rem;
  background: rgb(239 246 255);
  padding: 0.8rem;
  color: rgb(30 64 175);
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
  background: rgb(30 64 175);
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
  border-color: rgb(30 64 175);
  background: rgb(30 58 138 / 0.35);
  color: rgb(191 219 254);
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
