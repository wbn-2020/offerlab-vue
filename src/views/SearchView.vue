<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <!-- 搜索栏 -->
    <div class="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6">
      <div class="max-w-6xl mx-auto">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索面经、技术博客、用户..."
          class="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
    </div>

    <!-- 主体内容 -->
    <div class="max-w-6xl mx-auto p-6">
      <div class="grid grid-cols-4 gap-6">
        <!-- 左侧筛选 -->
        <div class="col-span-1">
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 sticky top-24">
            <div>
              <h3 class="font-medium text-slate-900 dark:text-slate-100 mb-3">公司</h3>
              <div class="space-y-2">
                <label v-for="company in companies" :key="company" class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" class="w-4 h-4 rounded border-slate-300 text-primary-600" />
                  <span class="text-sm text-slate-700 dark:text-slate-300">{{ company }}</span>
                </label>
              </div>
            </div>

            <div>
              <h3 class="font-medium text-slate-900 dark:text-slate-100 mb-3">岗位</h3>
              <div class="space-y-2">
                <label v-for="position in positions" :key="position" class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" class="w-4 h-4 rounded border-slate-300 text-primary-600" />
                  <span class="text-sm text-slate-700 dark:text-slate-300">{{ position }}</span>
                </label>
              </div>
            </div>

            <div>
              <h3 class="font-medium text-slate-900 dark:text-slate-100 mb-3">年限</h3>
              <div class="space-y-2">
                <label v-for="year in years" :key="year" class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" class="w-4 h-4 rounded border-slate-300 text-primary-600" />
                  <span class="text-sm text-slate-700 dark:text-slate-300">{{ year }}</span>
                </label>
              </div>
            </div>

            <div>
              <h3 class="font-medium text-slate-900 dark:text-slate-100 mb-3">面试结果</h3>
              <div class="space-y-2">
                <label v-for="result in results" :key="result" class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" class="w-4 h-4 rounded border-slate-300 text-primary-600" />
                  <span class="text-sm text-slate-700 dark:text-slate-300">{{ result }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧结果 -->
        <div class="col-span-3 space-y-4">
          <div v-if="searchResults.length === 0" class="text-center py-12">
            <p class="text-slate-500 dark:text-slate-400">搜索结果为空，试试其他关键词</p>
          </div>

          <div v-for="post in searchResults" :key="post.postId" class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
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
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Post } from '@/api/types'

const searchQuery = ref('')

const companies = ['字节跳动', '美团', '阿里巴巴', '腾讯', '百度']
const positions = ['Java 后端', 'Go 后端', 'Python 后端', 'C++ 后端', '前端']
const years = ['应届', '1-2 年', '2-3 年', '3-5 年', '5+ 年']
const results = ['已 offer', '待结果', '已挂']

const searchResults = ref<Post[]>([
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
