<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold mb-8">设置</h1>

      <!-- Tab 切换 -->
      <div class="flex gap-2 border-b border-slate-200 dark:border-slate-800 mb-8">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          @click="activeTab = tab.value"
          :class="[
            'px-4 py-3 font-medium text-sm transition-colors border-b-2',
            activeTab === tab.value
              ? 'text-primary-600 border-primary-600'
              : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
          ]"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 账号设置 -->
      <div v-if="activeTab === 'account'" class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 space-y-6">
        <div>
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">邮箱</label>
          <input
            type="email"
            :value="user?.email || ''"
            disabled
            class="mt-2 w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm cursor-not-allowed"
          />
          <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">邮箱不可修改</p>
        </div>

        <div>
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">修改密码</label>
          <button
            class="mt-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-sm"
          >
            修改密码
          </button>
          <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">修改密码功能开发中</p>
        </div>
      </div>

      <!-- 资料设置 -->
      <div v-if="activeTab === 'profile'" class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 space-y-6">
        <form @submit.prevent="updateProfile" class="space-y-6">
          <!-- 昵称 -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-slate-700 dark:text-slate-300">昵称</label>
            <input
              v-model="profileForm.nickname"
              type="text"
              placeholder="输入昵称"
              class="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <!-- 头像 URL -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-slate-700 dark:text-slate-300">头像 URL</label>
            <input
              v-model="profileForm.avatarUrl"
              type="url"
              placeholder="输入头像 URL"
              class="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div v-if="profileForm.avatarUrl" class="mt-2 rounded-lg overflow-hidden max-h-32">
              <img :src="profileForm.avatarUrl" :alt="profileForm.nickname" class="w-full h-auto object-cover" />
            </div>
          </div>

          <!-- 个性签名 -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-slate-700 dark:text-slate-300">个性签名</label>
            <textarea
              v-model="profileForm.bio"
              placeholder="输入个性签名"
              rows="3"
              class="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          <!-- 提交按钮 -->
          <div class="flex gap-3 pt-4">
            <button
              type="submit"
              :disabled="isUpdatingProfile"
              class="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {{ isUpdatingProfile ? '保存中...' : '保存资料' }}
            </button>
          </div>
        </form>
      </div>

      <!-- 求职意向 -->
      <div v-if="activeTab === 'intent'" class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8">
        <IntentForm @submit="updateIntent" />
      </div>

      <!-- 隐私设置 -->
      <div v-if="activeTab === 'privacy'" class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium text-slate-900 dark:text-slate-100">公开求职意向</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">允许其他用户查看你的求职意向</p>
          </div>
          <input
            v-model="privacyForm.publicIntent"
            type="checkbox"
            class="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium text-slate-900 dark:text-slate-100">公开发帖历史</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">允许其他用户查看你的所有发帖</p>
          </div>
          <input
            v-model="privacyForm.publicPosts"
            type="checkbox"
            class="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
        </div>

        <button
          @click="updatePrivacy"
          :disabled="isUpdatingPrivacy"
          class="mt-6 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {{ isUpdatingPrivacy ? '保存中...' : '保存隐私设置' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { userApi } from '@/api/user'
import IntentForm from '@/components/user/IntentForm.vue'

const authStore = useAuthStore()

const tabs = [
  { value: 'account', label: '账号' },
  { value: 'profile', label: '资料' },
  { value: 'intent', label: '求职意向' },
  { value: 'privacy', label: '隐私' }
]

const activeTab = ref('account')
const user = ref(authStore.user)

const profileForm = ref({
  nickname: user.value?.nickname || '',
  avatarUrl: user.value?.avatar || '',
  bio: user.value?.signature || ''
})

const privacyForm = ref({
  publicIntent: true,
  publicPosts: true
})

const isUpdatingProfile = ref(false)
const isUpdatingPrivacy = ref(false)

onMounted(() => {
  if (user.value) {
    profileForm.value = {
      nickname: user.value.nickname,
      avatarUrl: user.value.avatar,
      bio: user.value.signature
    }
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
      alert('资料已更新')
    } else {
      alert(`更新失败: ${res.message}`)
    }
  } catch (error) {
    console.error('Update profile error:', error)
    alert('更新失败，请重试')
  } finally {
    isUpdatingProfile.value = false
  }
}

const updateIntent = async (intentData: any) => {
  try {
    const res = await userApi.updateIntent(intentData)
    if (res.code === 0) {
      alert('求职意向已更新')
    } else {
      alert(`更新失败: ${res.message}`)
    }
  } catch (error) {
    console.error('Update intent error:', error)
    alert('更新失败，请重试')
  }
}

const updatePrivacy = async () => {
  isUpdatingPrivacy.value = true
  try {
    // TODO: 调用隐私设置 API
    alert('隐私设置已保存')
  } finally {
    isUpdatingPrivacy.value = false
  }
}
</script>
