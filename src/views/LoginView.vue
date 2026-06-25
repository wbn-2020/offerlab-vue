<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
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
          <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">登录 OfferLab</h1>
          <p class="text-sm text-slate-600 dark:text-slate-400">分享技术经验，沉淀项目知识</p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="space-y-4">
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
              placeholder="admin / user1 / your@email.com"
              class="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100"
              :disabled="isLoading"
            />
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
            />
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
        <div class="relative my-6">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div class="relative flex justify-center text-xs">
            <span class="px-2 bg-white dark:bg-slate-900 text-slate-500">或</span>
          </div>
        </div>

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
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import { redirectQuery, safeRedirect } from '@/utils/navigation'
import AuthThemeToggle from '@/components/auth/AuthThemeToggle.vue'
import { z } from 'zod'

const router = useRouter()
const route = useRoute()
const { login } = useAuth()
const authStore = useAuthStore()

const isLoading = ref(false)
const showDemoAccounts = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true'
const form = reactive({
  email: '',
  password: '',
})

const errors = reactive({
  email: '',
  password: '',
})

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
  try {
    await login(form.email, form.password)
    await router.replace(safeRedirect(route.query.redirect))
    toast.success('登录成功')
  } catch (error: any) {
    const message = getErrorMessage(error, '登录失败，请检查账号和密码')
    toast.error(message)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (route.query.switchAccount === '1') {
    authStore.logout()
    return
  }
  if (authStore.token && !authStore.user) {
    await authStore.hydrate()
  }
  if (authStore.isLoggedIn) {
    await router.replace(safeRedirect(route.query.redirect))
  }
})
</script>

<style scoped>
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
</style>
