<template>
  <RouterLink
    :to="`/post/${post.postId}`"
    class="block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:border-primary-300 dark:hover:border-primary-700 transition-all hover:shadow-sm hover:-translate-y-0.5"
  >
    <!-- 头部：作者信息 -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold flex-shrink-0">
          {{ post.author.nickname[0] }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-slate-900 dark:text-slate-100 truncate">{{ post.author.nickname }}</span>
            <span v-if="post.author.isBigV" class="text-xs bg-accent-500 text-white px-2 py-0.5 rounded flex-shrink-0">大V</span>
          </div>
          <div class="text-xs text-slate-500 dark:text-slate-400">
            {{ formatTime(post.createdAt) }}
          </div>
        </div>
      </div>
      <button
        v-if="!isOwnPost"
        @click.prevent="handleFollow"
        class="px-3 py-1 text-sm border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
      >
        {{ post.author.isFollowing ? '已关注' : '关注' }}
      </button>
    </div>

    <!-- 标题 -->
    <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 line-clamp-2">
      {{ post.title }}
    </h3>

    <!-- 摘要 -->
    <p class="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
      {{ post.summary || post.content.substring(0, 100) }}
    </p>

    <!-- 元信息（公司、岗位等） -->
    <div v-if="post.extension" class="flex flex-wrap gap-2 mb-3">
      <span v-if="post.extension.company" class="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
        {{ post.extension.company }}
      </span>
      <span v-if="post.extension.position" class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
        {{ post.extension.position }}
      </span>
      <span v-if="post.extension.interviewResult" class="text-xs px-2 py-1 rounded" :class="getResultClass(post.extension.interviewResult)">
        {{ getResultText(post.extension.interviewResult) }}
      </span>
    </div>

    <!-- 标签 -->
    <div class="flex flex-wrap gap-2 mb-4">
      <span v-for="tag in post.tags" :key="tag.id" class="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">
        {{ tag.name }}
      </span>
    </div>

    <!-- 互动栏 -->
    <div class="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3">
      <div class="flex items-center gap-4">
        <button class="flex items-center gap-1 hover:text-primary-600 transition-colors">
          <span>👁</span>
          <span>{{ formatNumber(post.counter.view) }}</span>
        </button>
        <button @click.prevent="handleLike" class="flex items-center gap-1 hover:text-danger transition-colors">
          <span>{{ post.myInteraction?.liked ? '❤️' : '🤍' }}</span>
          <span>{{ formatNumber(post.counter.like) }}</span>
        </button>
        <button class="flex items-center gap-1 hover:text-primary-600 transition-colors">
          <span>💬</span>
          <span>{{ formatNumber(post.counter.comment) }}</span>
        </button>
        <button @click.prevent="handleFavorite" class="flex items-center gap-1 hover:text-accent-500 transition-colors">
          <span>{{ post.myInteraction?.favorited ? '⭐' : '☆' }}</span>
          <span>{{ formatNumber(post.counter.favorite) }}</span>
        </button>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Post } from '@/api/types'
import { formatTime, formatNumber } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'vue-sonner'

interface Props {
  post: Post
}

const props = defineProps<Props>()

const emit = defineEmits<{
  like: [postId: number]
  favorite: [postId: number]
}>()

const authStore = useAuthStore()

const isOwnPost = computed(() => authStore.user?.uid === props.post.author.uid)

const getResultClass = (result: number) => {
  const classes: Record<number, string> = {
    1: 'bg-success/10 text-success',
    2: 'bg-warning/10 text-warning',
    3: 'bg-danger/10 text-danger',
  }
  return classes[result] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
}

const getResultText = (result: number) => {
  const texts: Record<number, string> = {
    1: '已 offer',
    2: '待结果',
    3: '已挂',
  }
  return texts[result] || '未知'
}

const handleLike = () => {
  if (!authStore.isLoggedIn) {
    toast.error('请先登录')
    return
  }
  emit('like', props.post.postId)
}

const handleFavorite = () => {
  if (!authStore.isLoggedIn) {
    toast.error('请先登录')
    return
  }
  emit('favorite', props.post.postId)
}

const handleFollow = () => {
  if (!authStore.isLoggedIn) {
    toast.error('请先登录')
    return
  }
  toast.success(props.post.author.isFollowing ? '已取关' : '已关注')
}
</script>

