<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Card -->
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">加入面试圈</h1>
          <p class="text-sm text-slate-600 dark:text-slate-400">创建账号，开始分享面试经验</p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Nickname Field -->
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">昵称</label>
            <input
              v-model="form.nickname"
              type="text"
              placeholder="2-32 个字符"
              class="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100"
              :disabled="isLoading"
            />
            <p v-if="errors.nickname" class="text-xs text-danger mt-1">{{ errors.nickname }}</p>
          </div>

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
            class="auth-submit w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {{ isLoading ? '注册中...' : '注册' }}
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

        <!-- Login Link -->
        <p class="text-center text-sm text-slate-600 dark:text-slate-400">
          已有账号？
          <RouterLink to="/login" class="auth-inline-link text-primary-600 hover:text-primary-700 font-medium">
            立即登录
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import { z } from 'zod'

const router = useRouter()
const { register } = useAuth()

const isLoading = ref(false)
const form = reactive({
  nickname: '',
  email: '',
  password: '',
})

const errors = reactive({
  nickname: '',
  email: '',
  password: '',
})

// Validation schema
const registerSchema = z.object({
  nickname: z.string().min(2, '昵称至少 2 个字符').max(32, '昵称最多 32 个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少 6 位'),
})

const validateForm = () => {
  errors.nickname = ''
  errors.email = ''
  errors.password = ''

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
    toast.success('注册成功')
    router.push('/')
  } catch (error: any) {
    const message = getErrorMessage(error, '注册失败，请稍后重试')
    toast.error(message)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.auth-inline-link {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  padding-inline: 0.25rem;
}

.auth-submit {
  min-height: 44px;
}
</style>
