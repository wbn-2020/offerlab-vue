<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8">发现</h1>

      <!-- 标签云 -->
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 mb-8">
        <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">热门标签</h2>
        <div class="flex flex-wrap gap-3">
          <router-link
            v-for="tag in popularTags"
            :key="tag.id"
            :to="`/tag/${tag.slug}`"
            class="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full hover:bg-primary-100 dark:hover:bg-primary-900 hover:text-primary-700 dark:hover:text-primary-300 transition-colors font-medium text-sm"
          >
            {{ tag.name }}
            <span class="text-xs text-slate-500 dark:text-slate-400 ml-2">{{ tag.count }}</span>
          </router-link>
        </div>
      </div>

      <!-- 推荐用户 -->
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 mb-8">
        <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">推荐用户</h2>
        <div class="grid grid-cols-4 gap-6">
          <div
            v-for="user in recommendedUsers"
            :key="user.uid"
            class="flex flex-col items-center text-center p-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <img
              :src="user.avatar"
              :alt="user.nickname"
              class="w-16 h-16 rounded-full mb-3 border-2 border-primary-500"
            />
            <h3 class="font-bold text-slate-900 dark:text-slate-100 mb-1">{{ user.nickname }}</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">{{ user.postCount }} 篇文章</p>
            <button
              class="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              关注
            </button>
          </div>
        </div>
      </div>

      <!-- 最新发布 -->
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8">
        <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">最新发布</h2>
        <div class="space-y-4">
          <div
            v-for="post in latestPosts"
            :key="post.postId"
            class="p-4 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
          >
            <div class="flex items-start gap-4">
              <img :src="post.author.avatar" :alt="post.author.nickname" class="w-10 h-10 rounded-full flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-semibold text-slate-900 dark:text-slate-100">{{ post.author.nickname }}</span>
                  <span v-if="post.extension?.company" class="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                    {{ post.extension.company }}
                  </span>
                </div>
                <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 line-clamp-1">
                  {{ post.title }}
                </h3>
                <p class="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                  {{ post.summary || post.content.substring(0, 80) }}
                </p>
              </div>
              <router-link
                :to="`/post/${post.postId}`"
                class="text-primary-600 hover:text-primary-700 font-medium text-sm flex-shrink-0"
              >
                查看
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Post } from '@/api/types'

const popularTags = [
  { id: 1, name: 'Java', slug: 'java', count: 234 },
  { id: 2, name: 'Python', slug: 'python', count: 189 },
  { id: 3, name: 'Go', slug: 'go', count: 156 },
  { id: 4, name: 'C++', slug: 'cpp', count: 143 },
  { id: 5, name: 'JavaScript', slug: 'javascript', count: 128 },
  { id: 6, name: 'React', slug: 'react', count: 112 },
  { id: 7, name: 'Vue', slug: 'vue', count: 98 },
  { id: 8, name: 'Spring', slug: 'spring', count: 87 },
  { id: 9, name: 'MySQL', slug: 'mysql', count: 76 },
  { id: 10, name: 'Redis', slug: 'redis', count: 65 }
]

const recommendedUsers = [
  { uid: 1, nickname: 'Tom', avatar: 'https://via.placeholder.com/64', postCount: 28 },
  { uid: 2, nickname: 'Alice', avatar: 'https://via.placeholder.com/64', postCount: 24 },
  { uid: 3, nickname: 'Bob', avatar: 'https://via.placeholder.com/64', postCount: 19 },
  { uid: 4, nickname: 'Carol', avatar: 'https://via.placeholder.com/64', postCount: 16 }
]

const latestPosts = ref<Post[]>([
  {
    postId: 1,
    postType: 1,
    title: '字节跳动后端二面经验分享',
    content: '一面 30min，主要问 JUC 和 JVM...',
    summary: '一面 30min，主要问 JUC 和 JVM...',
    tags: [],
    author: {
      uid: 1,
      nickname: 'Tom',
      avatar: 'https://via.placeholder.com/40',
      signature: '求职中',
      createdAt: 0,
      isFollowing: false,
      isBigV: false
    },
    counter: {
      view: 1234,
      like: 56,
      comment: 12,
      favorite: 8
    },
    extension: {
      company: '字节跳动',
      position: 'Java 后端'
    },
    myInteraction: {
      liked: false,
      favorited: false
    },
    createdAt: 0,
    updatedAt: 0
  }
])
</script>
