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

            <!-- 求职意向（如果公开） -->
            <div v-if="userIntent" class="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm">
              <div class="font-medium text-slate-900 dark:text-slate-100 mb-2">求职意向</div>
              <div class="flex flex-wrap gap-2">
                <span v-if="userIntent.targetCompanies" class="text-slate-600 dark:text-slate-400">
                  目标公司：{{ userIntent.targetCompanies.join('、') }}
                </span>
                <span v-if="userIntent.targetPositions" class="text-slate-600 dark:text-slate-400">
                  目标岗位：{{ userIntent.targetPositions.join('、') }}
                </span>
              </div>
            </div>

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
            </div>
          </div>

          <!-- 关注按钮 -->
          <button
            @click="toggleFollow"
            :class="[
              'px-4 py-2 rounded-lg font-medium transition-colors',
              user?.isFollowing
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            ]"
          >
            {{ user?.isFollowing ? '已关注' : '关注' }}
          </button>
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
        <!-- 发帖 -->
        <div v-if="activeTab === 'posts'" class="space-y-4">
          <div v-if="posts.length === 0" class="text-center py-12">
            <p class="text-slate-500 dark:text-slate-400">该用户还没有发布过帖子</p>
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

        <!-- 收到的赞 -->
        <div v-if="activeTab === 'likes'" class="text-center py-12">
          <p class="text-slate-500 dark:text-slate-400">收到的赞会出现在这里</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { userApi } from '@/api/user'
import { postApi } from '@/api/post'
import type { User, Post } from '@/api/types'

const route = useRoute()

const tabs = [
  { value: 'posts', label: '发帖' },
  { value: 'likes', label: '收到的赞' }
]

const activeTab = ref('posts')
const user = ref<User | null>(null)
const userIntent = ref<any>(null)
const posts = ref<Post[]>([])

onMounted(async () => {
  const uid = Number(route.params.uid)
  if (!uid) return

  try {
    // 加载用户信息
    const userRes = await userApi.getProfile(uid)
    if (userRes.code === 0) {
      user.value = userRes.data
    }

    // 加载用户发帖
    const postsRes = await postApi.list({ authorId: uid })
    if (postsRes.code === 0 && postsRes.data) {
      posts.value = postsRes.data.items
    }
  } catch (error) {
    console.error('Failed to load user profile:', error)
  }
})

const toggleFollow = async () => {
  if (!user.value) return

  try {
    if (user.value.isFollowing) {
      await userApi.unfollow(user.value.uid)
    } else {
      await userApi.follow(user.value.uid)
    }
    // 乐观更新
    user.value.isFollowing = !user.value.isFollowing
  } catch (error) {
    console.error('Failed to toggle follow:', error)
  }
}
</script>
