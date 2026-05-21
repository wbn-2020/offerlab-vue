<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <!-- 顶部 Banner -->
    <div class="bg-gradient-to-br from-primary-500 to-primary-700 h-48 relative">
      <div class="absolute inset-0 opacity-10 bg-pattern" />
    </div>

    <!-- 主体内容 -->
    <div class="max-w-6xl mx-auto px-6 -mt-24 relative z-10">
      <!-- 用户信息卡片 -->
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 mb-8">
        <div class="flex items-start gap-6">
          <!-- 头像 -->
          <img
            :src="user?.avatar || 'https://via.placeholder.com/120'"
            :alt="user?.nickname"
            class="w-24 h-24 rounded-full border-4 border-primary-500"
          />

          <!-- 用户信息 -->
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {{ user?.nickname || '加载中...' }}
              </h1>
              <span v-if="user?.isBigV" class="text-xs bg-accent-500 text-white px-3 py-1 rounded">
                大V
              </span>
            </div>
            <p v-if="user?.signature" class="text-slate-600 dark:text-slate-400 mb-4">
              {{ user.signature }}
            </p>

            <!-- 数据统计 -->
            <div class="flex gap-8">
              <div>
                <div class="text-2xl font-bold text-slate-900 dark:text-slate-100">0</div>
                <div class="text-sm text-slate-500 dark:text-slate-400">发帖</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-slate-900 dark:text-slate-100">0</div>
                <div class="text-sm text-slate-500 dark:text-slate-400">关注</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-slate-900 dark:text-slate-100">0</div>
                <div class="text-sm text-slate-500 dark:text-slate-400">粉丝</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-slate-900 dark:text-slate-100">0</div>
                <div class="text-sm text-slate-500 dark:text-slate-400">收到的赞</div>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex gap-3">
            <router-link
              to="/me/settings"
              class="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
            >
              编辑资料
            </router-link>
          </div>
        </div>
      </div>

      <!-- Tab 切换 -->
      <div class="flex gap-2 border-b border-slate-200 dark:border-slate-800 mb-6">
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

      <!-- 内容区 -->
      <div class="space-y-4">
        <!-- 我的发帖 -->
        <div v-if="activeTab === 'posts'" class="space-y-4">
          <div v-if="posts.length === 0" class="text-center py-12">
            <p class="text-slate-500 dark:text-slate-400 mb-4">还没有发布过帖子</p>
            <router-link
              to="/editor"
              class="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              发布第一篇
            </router-link>
          </div>
          <div v-else>
            <div v-for="post in posts" :key="post.postId" class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                {{ post.title }}
              </h3>
              <p class="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                {{ post.summary || post.content.substring(0, 100) }}
              </p>
              <div class="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                <div class="flex gap-4">
                  <span>👁 {{ post.counter.view }}</span>
                  <span>👍 {{ post.counter.like }}</span>
                  <span>💬 {{ post.counter.comment }}</span>
                </div>
                <router-link
                  :to="`/post/${post.postId}`"
                  class="text-primary-600 hover:text-primary-700 font-medium"
                >
                  查看
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <!-- 我的收藏 -->
        <div v-if="activeTab === 'favorites'" class="text-center py-12">
          <p class="text-slate-500 dark:text-slate-400">收藏的内容会出现在这里</p>
        </div>

        <!-- 我的关注 -->
        <div v-if="activeTab === 'following'" class="text-center py-12">
          <p class="text-slate-500 dark:text-slate-400">关注的用户会出现在这里</p>
        </div>

        <!-- 我的粉丝 -->
        <div v-if="activeTab === 'followers'" class="text-center py-12">
          <p class="text-slate-500 dark:text-slate-400">粉丝会出现在这里</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { postApi } from '@/api/post'
import type { Post } from '@/api/types'

const authStore = useAuthStore()

const tabs = [
  { value: 'posts', label: '我的发帖' },
  { value: 'favorites', label: '我的收藏' },
  { value: 'following', label: '我的关注' },
  { value: 'followers', label: '我的粉丝' }
]

const activeTab = ref('posts')
const user = ref(authStore.user)
const posts = ref<Post[]>([])

onMounted(async () => {
  if (user.value?.uid) {
    try {
      const res = await postApi.list({ authorId: user.value.uid })
      if (res.code === 0 && res.data) {
        posts.value = res.data.items
      }
    } catch (error) {
      console.error('Failed to load posts:', error)
    }
  }
})
</script>
