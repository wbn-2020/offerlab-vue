<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Card -->
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">登录面试圈</h1>
          <p class="text-sm text-slate-600 dark:text-slate-400">分享面试经验，获取求职机会</p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Email Field -->
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">邮箱</label>
            <input
              v-model="form.email"
              type="email"
              placeholder="your@email.com"
              class="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100"
              :disabled="isLoading"
            />
            <p v-if="errors.email" class="text-xs text-danger mt-1">{{ errors.email }}</p>
          </div>

          <!-- Password Field -->
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">密码</label>
            <input
              v-model="form.password"
              type="password"
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
            class="w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
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
          <RouterLink to="/register" class="text-primary-600 hover:text-primary-700 font-medium">
            立即注册
          </RouterLink>
        </p>
      </div>

      <!-- Demo Hint -->
      <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p class="text-xs text-blue-700 dark:text-blue-300">
          <strong>演示账号：</strong> demo@example.com / password123
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import { z } from 'zod'

const router = useRouter()
const route = useRoute()
const { login } = useAuth()

const isLoading = ref(false)
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
  email: z.string().email('请输入有效的邮箱地址'),
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
    toast.success('登录成功')
    const redirect = route.query.redirect as string
    router.push(redirect || '/')
  } catch (error: any) {
    const message = getErrorMessage(error, '登录失败，请检查邮箱和密码')
    toast.error(message)
  } finally {
    isLoading.value = false
  }
}
</script>

