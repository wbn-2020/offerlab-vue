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
            <div class="auth-nav-actions">
              <RouterLink :to="{ path: '/login', query: redirectQuery(route.query.redirect) }" class="auth-nav-link text-sm font-semibold text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-200">
                登录
              </RouterLink>
              <AuthThemeToggle />
            </div>
          </div>
          <!-- Header -->
          <div class="text-center mb-8">
            <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">加入 {{ siteBrand.displayName }}</h1>
            <p class="text-sm text-slate-600 dark:text-slate-400">创建账号，分享见闻、参与讨论、收藏有用参考</p>
          </div>

          <!-- Form -->
          <form class="space-y-4" @submit.prevent="handleSubmit">
            <!-- Nickname Field -->
            <div>
              <label for="register-nickname" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">昵称</label>
              <input
                id="register-nickname"
                v-model="form.nickname"
                type="text"
                name="nickname"
                autocomplete="nickname"
                placeholder="2-32 个字符"
                class="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100"
                :disabled="isLoading"
              >
              <p v-if="errors.nickname" class="text-xs text-danger mt-1">{{ errors.nickname }}</p>
            </div>

            <!-- Email Field -->
            <div>
              <label for="register-email" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">邮箱</label>
              <input
                id="register-email"
                v-model="form.email"
                type="email"
                name="email"
                autocomplete="email"
                placeholder="your@email.com"
                class="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100"
                :disabled="isLoading"
              >
              <p v-if="errors.email" class="text-xs text-danger mt-1">{{ errors.email }}</p>
            </div>

            <!-- Password Field -->
            <div>
              <label for="register-password" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">密码</label>
              <input
                id="register-password"
                v-model="form.password"
                type="password"
                name="new-password"
                autocomplete="new-password"
                placeholder="至少 6 位"
                class="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100"
                :disabled="isLoading"
              >
              <div v-if="form.password" class="mt-2">
                <div class="flex gap-1" aria-hidden="true">
                  <span
                    v-for="level in 3"
                    :key="level"
                    class="h-1.5 flex-1 rounded-full transition-colors"
                    :class="level <= passwordStrength.score ? passwordStrength.barClass : 'bg-slate-200 dark:bg-slate-700'"
                  />
                </div>
                <p class="mt-1 text-xs" :class="passwordStrength.textClass">密码强度：{{ passwordStrength.label }}</p>
              </div>
              <p v-if="errors.password" class="text-xs text-danger mt-1">{{ errors.password }}</p>
            </div>

            <!-- Confirm Password Field -->
            <div>
              <label for="register-confirm-password" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">确认密码</label>
              <input
                id="register-confirm-password"
                v-model="form.confirmPassword"
                type="password"
                name="confirm-password"
                autocomplete="new-password"
                placeholder="再次输入密码"
                class="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100"
                :disabled="isLoading"
              >
              <p v-if="errors.confirmPassword" class="text-xs text-danger mt-1">{{ errors.confirmPassword }}</p>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="isLoading"
              class="auth-submit w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {{ isLoading ? '注册中...' : '注册' }}
            </button>
          </form>

          <!-- Divider -->
          <div class="my-6 border-t border-slate-200 dark:border-slate-800" />

          <!-- Login Link -->
          <p class="text-center text-sm text-slate-600 dark:text-slate-400">
            已有账号？
            <RouterLink :to="{ path: '/login', query: redirectQuery(route.query.redirect) }" class="auth-inline-link text-primary-600 hover:text-primary-700 font-medium">
              立即登录
            </RouterLink>
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import { redirectQuery, safeRedirect } from '@/utils/navigation'
import { beginWelcomeOnboarding } from '@/utils/welcomeOnboarding'
import AuthThemeToggle from '@/components/auth/AuthThemeToggle.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import { siteBrand } from '@/utils/brand'
import { z } from 'zod'

const router = useRouter()
const route = useRoute()
const { register } = useAuth()
const authStore = useAuthStore()

const isLoading = ref(false)
const form = reactive({
  nickname: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const errors = reactive({
  nickname: '',
  email: '',
  password: '',
  confirmPassword: '',
})

// 密码强度提示：长度 + 是否含字母/数字/符号的粗略估计，只做引导不做硬性拦截（后端只要求 6 位）。
const passwordStrength = computed(() => {
  const value = form.password
  if (!value) return { score: 0, label: '', barClass: '', textClass: '' }
  let raw = 0
  if (value.length >= 6) raw += 1
  if (value.length >= 10) raw += 1
  if (/[a-zA-Z]/.test(value) && /\d/.test(value)) raw += 1
  if (/[^a-zA-Z0-9]/.test(value)) raw += 1
  if (raw <= 1) return { score: 1, label: '较弱', barClass: 'bg-rose-500', textClass: 'text-rose-600 dark:text-rose-400' }
  if (raw === 2) return { score: 2, label: '一般', barClass: 'bg-amber-500', textClass: 'text-amber-600 dark:text-amber-400' }
  return { score: 3, label: '较强', barClass: 'bg-emerald-500', textClass: 'text-emerald-600 dark:text-emerald-400' }
})

// Validation schema
const registerSchema = z.object({
  nickname: z.string().min(2, '昵称至少 2 个字符').max(32, '昵称最多 32 个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少 6 位'),
  confirmPassword: z.string().min(1, '请再次输入密码'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
})

const validateForm = () => {
  errors.nickname = ''
  errors.email = ''
  errors.password = ''
  errors.confirmPassword = ''

  try {
    registerSchema.parse(form)
    return true
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        const field = err.path[0] as string
        if (field === 'nickname') errors.nickname = err.message
        if (field === 'email') errors.email = err.message
        if (field === 'password') errors.password = err.message
        if (field === 'confirmPassword') errors.confirmPassword = err.message
      })
    }
    return false
  }
}

const handleSubmit = async () => {
  if (!validateForm()) return

  isLoading.value = true
  try {
    await register(form.email, form.password, form.nickname)
    if (!authStore.user?.uid) {
      throw new Error('注册后的账号信息尚未就绪，请重新登录。')
    }
    beginWelcomeOnboarding(authStore.user.uid)
    toast.success('注册成功')
    // 注册成功后先进轻量兴趣引导；把原始 redirect 透传，引导完成或跳过后再回到目标页。
    const redirect = safeRedirect(route.query.redirect)
    await router.replace({ path: '/welcome', query: redirect && redirect !== '/' ? { redirect } : {} })
  } catch (error: any) {
    const message = getErrorMessage(error, '注册失败，请稍后重试')
    toast.error(message)
  } finally {
    isLoading.value = false
  }
}
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

.auth-nav-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.auth-nav-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.auth-nav-link {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
}

.auth-inline-link {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  padding-inline: 0.25rem;
}

.auth-submit {
  min-height: 44px;
}

@media (max-width: 720px) {
  .auth-page__main {
    min-height: auto;
    align-items: flex-start;
    padding-top: 1rem;
    padding-bottom: 2rem;
  }
}
</style>
