<template>
  <RouterLink
    :to="`/post/${post.postId}`"
    class="block rounded-xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-700"
  >
    <div class="mb-4 flex items-center justify-between gap-4">
      <div class="flex min-w-0 items-center gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-600 text-sm font-bold text-white">
          <img v-if="post.author.avatar" :src="post.author.avatar" :alt="post.author.nickname" class="h-full w-full object-cover" />
          <span v-else>{{ authorInitial }}</span>
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="truncate font-semibold text-slate-900 dark:text-slate-100">{{ post.author.nickname || '未知用户' }}</span>
            <span v-if="post.author.isBigV" class="shrink-0 rounded bg-accent-500 px-2 py-0.5 text-xs text-white">大V</span>
          </div>
          <div class="text-xs text-slate-500 dark:text-slate-400">{{ formatTime(post.createdAt) }}</div>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <button
          v-if="!isOwnPost"
          type="button"
          class="rounded-lg border border-primary-600 px-3 py-1 text-sm text-primary-600 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-800"
          :disabled="isFollowing"
          @click.prevent="handleFollow"
        >
          {{ post.author.isFollowing ? '已关注' : '关注' }}
        </button>

        <div v-if="props.showRecommendFeedback" class="relative" data-feedback-menu>
          <button
            type="button"
            class="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label="推荐反馈"
            title="推荐反馈"
            @click.prevent="showFeedbackMenu = !showFeedbackMenu"
          >
            <MoreHorizontal class="h-4 w-4" />
          </button>
          <div
            v-if="showFeedbackMenu"
            class="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-slate-200 bg-white py-2 shadow-lg dark:border-slate-800 dark:bg-slate-900"
            @click.prevent
          >
            <button
              v-for="reason in feedbackReasons"
              :key="reason.value"
              type="button"
              class="feedback-menu-item"
              @click.stop.prevent="handleNotInterested(reason.value)"
            >
              <EyeOff class="h-4 w-4" />
              <span>{{ reason.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <h3 class="mb-2 line-clamp-2 text-lg font-bold text-slate-900 dark:text-slate-100">
      {{ post.title }}
    </h3>

    <p class="mb-3 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
      {{ post.summary || post.content.substring(0, 100) }}
    </p>

    <div v-if="post.extension" class="mb-3 flex flex-wrap gap-2">
      <span v-if="post.extension.company" class="rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
        {{ post.extension.company }}
      </span>
      <span v-if="post.extension.position" class="rounded bg-sky-50 px-2 py-1 text-xs text-sky-700 dark:bg-sky-950 dark:text-sky-300">
        {{ post.extension.position }}
      </span>
      <span v-if="post.extension.interviewResult" class="rounded px-2 py-1 text-xs" :class="getResultClass(post.extension.interviewResult)">
        {{ getResultText(post.extension.interviewResult) }}
      </span>
    </div>

    <div v-if="post.tags.length" class="mb-4 flex flex-wrap gap-2">
      <span v-for="tag in post.tags" :key="tag.id" class="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {{ tag.name }}
      </span>
    </div>

    <div class="flex items-center justify-between border-t border-slate-200 pt-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
      <div class="flex flex-wrap items-center gap-4">
        <span class="inline-flex items-center gap-1">
          <Eye class="h-4 w-4" />
          {{ formatNumber(post.counter.view) }}
        </span>
        <button type="button" class="inline-flex items-center gap-1 transition-colors hover:text-rose-600" aria-label="点赞帖子" @click.prevent="handleLike">
          <Heart class="h-4 w-4" :class="post.myInteraction?.liked ? 'fill-current text-rose-600' : ''" />
          {{ formatNumber(post.counter.like) }}
        </button>
        <span class="inline-flex items-center gap-1">
          <MessageCircle class="h-4 w-4" />
          {{ formatNumber(post.counter.comment) }}
        </span>
        <button type="button" class="inline-flex items-center gap-1 transition-colors hover:text-amber-600" aria-label="收藏帖子" @click.prevent="handleFavorite">
          <Star class="h-4 w-4" :class="post.myInteraction?.favorited ? 'fill-current text-amber-500' : ''" />
          {{ formatNumber(post.counter.favorite) }}
        </button>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Eye, EyeOff, Heart, MessageCircle, MoreHorizontal, Star } from 'lucide-vue-next'
import type { Post } from '@/api/types'
import { formatTime, formatNumber } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { userApi } from '@/api/user'
import { toast } from 'vue-sonner'

const props = defineProps<{
  post: Post
  showRecommendFeedback?: boolean
}>()

const emit = defineEmits<{
  like: [postId: Post['postId']]
  favorite: [postId: Post['postId']]
  notInterested: [postId: Post['postId'], reason: string]
}>()

const authStore = useAuthStore()
const isFollowing = ref(false)
const showFeedbackMenu = ref(false)
const feedbackReasons = [
  { value: 'irrelevant', label: '内容不相关' },
  { value: 'seen', label: '已经看过' },
  { value: 'low_quality', label: '质量不高' },
]

const authorInitial = computed(() => props.post.author.nickname?.charAt(0) || '?')
const isOwnPost = computed(() => String(authStore.user?.uid ?? '') === String(props.post.author.uid))

const getResultClass = (result: number) => {
  const classes: Record<number, string> = {
    1: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    2: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    3: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  }
  return classes[result] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
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

const handleNotInterested = (reason: string) => {
  if (!authStore.isLoggedIn) {
    toast.error('登录后才能调整推荐')
    return
  }
  showFeedbackMenu.value = false
  emit('notInterested', props.post.postId, reason)
}

const handleFollow = async () => {
  if (!authStore.isLoggedIn) {
    toast.error('请先登录')
    return
  }
  isFollowing.value = true
  try {
    if (props.post.author.isFollowing) {
      await userApi.unfollow(props.post.author.uid)
      props.post.author.isFollowing = false
      toast.success('已取消关注')
    } else {
      await userApi.follow(props.post.author.uid)
      props.post.author.isFollowing = true
      toast.success('已关注')
    }
  } catch (error: any) {
    toast.error(error?.message || '关注操作失败')
  } finally {
    isFollowing.value = false
  }
}
</script>

<style scoped>
.feedback-menu-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  text-align: left;
  font-size: 0.875rem;
  color: rgb(71 85 105);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.feedback-menu-item:hover {
  background: rgb(248 250 252);
  color: rgb(15 23 42);
}

:global(.dark) .feedback-menu-item {
  color: rgb(203 213 225);
}

:global(.dark) .feedback-menu-item:hover {
  background: rgb(30 41 59);
  color: rgb(248 250 252);
}
</style>
