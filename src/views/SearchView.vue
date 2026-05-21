<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <div class="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6">
      <div class="max-w-6xl mx-auto flex gap-3">
        <input
          v-model="filters.q"
          type="text"
          placeholder="搜索面经、技术博客、公司或岗位..."
          class="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          @keyup.enter="runSearch"
        />
        <button
          @click="runSearch"
          :disabled="isLoading"
          class="px-5 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50"
        >
          搜索
        </button>
      </div>
    </div>

    <div class="max-w-6xl mx-auto p-6">
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside class="lg:col-span-1">
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 sticky top-24">
            <div>
              <h3 class="font-medium text-slate-900 dark:text-slate-100 mb-3">公司</h3>
              <select v-model="filters.company" class="filter-input">
                <option value="">全部公司</option>
                <option v-for="company in companies" :key="company" :value="company">{{ company }}</option>
              </select>
            </div>

            <div>
              <h3 class="font-medium text-slate-900 dark:text-slate-100 mb-3">岗位</h3>
              <select v-model="filters.position" class="filter-input">
                <option value="">全部岗位</option>
                <option v-for="position in positions" :key="position" :value="position">{{ position }}</option>
              </select>
            </div>

            <div>
              <h3 class="font-medium text-slate-900 dark:text-slate-100 mb-3">内容类型</h3>
              <select v-model.number="filters.type" class="filter-input">
                <option :value="undefined">全部类型</option>
                <option :value="1">面经</option>
                <option :value="2">技术博客</option>
                <option :value="3">题解</option>
                <option :value="4">求职问答</option>
              </select>
            </div>

            <button
              @click="resetFilters"
              class="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
            >
              清空筛选
            </button>

            <div>
              <h3 class="font-medium text-slate-900 dark:text-slate-100 mb-3">热门搜索</h3>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="word in hotWords"
                  :key="word"
                  @click="useHotWord(word)"
                  class="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:text-primary-600"
                >
                  {{ word }}
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main class="lg:col-span-3 space-y-4">
          <div v-if="isLoading" class="text-center py-12 text-slate-500 dark:text-slate-400">
            正在搜索...
          </div>

          <div v-else-if="searchResults.length === 0" class="text-center py-12">
            <p class="text-slate-500 dark:text-slate-400">{{ emptyText }}</p>
          </div>

          <div v-for="post in searchResults" :key="post.postId" class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold flex-shrink-0">
                {{ post.author.nickname.charAt(0) || '?' }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-2">
                  <span class="font-semibold text-slate-900 dark:text-slate-100">{{ post.author.nickname }}</span>
                  <span v-if="post.extension?.company" class="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                    {{ post.extension.company }}
                  </span>
                </div>
                <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 line-clamp-2">{{ stripHighlight(post.title) }}</h3>
                <p class="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">{{ stripHighlight(post.summary || post.content.substring(0, 100)) }}</p>
                <div class="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                  <div class="flex gap-4">
                    <span>浏览 {{ post.counter.view }}</span>
                    <span>点赞 {{ post.counter.like }}</span>
                    <span>评论 {{ post.counter.comment }}</span>
                  </div>
                  <router-link :to="`/post/${post.postId}`" class="text-primary-600 hover:text-primary-700 font-medium">
                    查看
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { searchApi } from '@/api/search'
import type { Post } from '@/api/types'

const filters = reactive<{
  q: string
  company: string
  position: string
  type?: number
}>({
  q: '',
  company: '',
  position: '',
  type: undefined,
})

const companies = ['字节跳动', '美团', '阿里巴巴', '腾讯', '百度']
const positions = ['Java 后端', 'Go 后端', 'Python 后端', 'C++ 后端', '前端']
const hotWords = ref<string[]>([])
const searchResults = ref<Post[]>([])
const isLoading = ref(false)
const emptyText = ref('输入关键词或筛选条件开始搜索')

const runSearch = async () => {
  isLoading.value = true
  try {
    const res = await searchApi.searchPosts({
      q: filters.q || undefined,
      company: filters.company || undefined,
      position: filters.position || undefined,
      type: filters.type,
      size: 20,
    })
    searchResults.value = res.data?.items || []
    emptyText.value = searchResults.value.length === 0 ? '没有匹配的搜索结果' : ''
  } catch (error) {
    console.error('Failed to search posts:', error)
    emptyText.value = '搜索接口暂不可用'
  } finally {
    isLoading.value = false
  }
}

const resetFilters = async () => {
  filters.q = ''
  filters.company = ''
  filters.position = ''
  filters.type = undefined
  searchResults.value = []
  emptyText.value = '输入关键词或筛选条件开始搜索'
}

const useHotWord = async (word: string) => {
  filters.q = word
  await runSearch()
}

const stripHighlight = (value: string) => value.replace(/<\/?em>/g, '')

onMounted(async () => {
  try {
    const hot = await searchApi.hotSearches()
    hotWords.value = hot.data || []
  } catch {
    hotWords.value = []
  }
})
</script>

<style scoped>
.filter-input {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: rgb(15 23 42);
}

:global(.dark) .filter-input {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(241 245 249);
}
</style>
