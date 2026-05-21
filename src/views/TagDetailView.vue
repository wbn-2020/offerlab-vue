<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <!-- 标签头部 -->
    <div class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-8">
      <div class="max-w-6xl mx-auto">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-16 h-16 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-2xl font-bold">
            {{ tagName.charAt(0).toUpperCase() }}
          </div>
          <div>
            <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100">{{ tagName }}</h1>
            <p class="text-slate-600 dark:text-slate-400 mt-1">{{ postCount }} 篇文章</p>
          </div>
        </div>
        <p class="text-slate-600 dark:text-slate-400">
          关于 {{ tagName }} 的所有面经、技术博客和讨论
        </p>
      </div>
    </div>

    <!-- 帖子列表 -->
    <div class="max-w-6xl mx-auto p-8">
      <div class="space-y-4">
        <div v-if="posts.length === 0" class="text-center py-12">
          <p class="text-slate-500 dark:text-slate-400">该标签下还没有帖子</p>
        </div>

        <div v-for="post in posts" :key="post.postId" class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div class="flex items-start gap-4">
            <img :src="post.author.avatar" :alt="post.author.nickname" class="w-12 h-12 rounded-full flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-2">
                <span class="font-semibold text-slate-900 dark:text-slate-100">{{ post.author.nickname }}</span>
                <span v-if="post.extension?.company" class="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                  {{ post.extension.company }}
                </span>
              </div>
              <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 line-clamp-2">
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { postApi } from '@/api/post'
import type { Post } from '@/api/types'

const route = useRoute()

const tagName = ref('')
const postCount = ref(0)
const posts = ref<Post[]>([])

onMounted(async () => {
  const slug = route.params.slug as string
  tagName.value = slug || '标签'

  try {
    // TODO: 根据 slug 获取标签 ID，然后加载帖子
    // 这里先用占位数据
    posts.value = []
  } catch (error) {
    console.error('Failed to load tag posts:', error)
  }
})
</script>
