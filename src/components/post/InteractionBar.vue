<template>
  <div class="flex items-center justify-between border-t border-slate-200 pt-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
    <div class="flex flex-wrap items-center gap-5">
      <span class="inline-flex items-center gap-2">
        <Eye class="h-4 w-4" />
        {{ formatNumber(post.counter.view) }}
      </span>

      <button
        type="button"
        :aria-label="likePending ? '点赞处理中' : '点赞帖子'"
        :aria-busy="likePending"
        :disabled="likePending"
        class="inline-flex items-center gap-2 transition-colors hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleLike"
      >
        <Heart class="h-4 w-4" :class="post.myInteraction?.liked ? 'fill-current text-rose-600' : ''" />
        {{ formatNumber(post.counter.like) }}
      </button>

      <span class="inline-flex items-center gap-2">
        <MessageCircle class="h-4 w-4" />
        {{ formatNumber(post.counter.comment) }}
      </span>

      <button
        type="button"
        :aria-label="favoritePending ? '收藏处理中' : '收藏帖子'"
        :aria-busy="favoritePending"
        :disabled="favoritePending"
        class="inline-flex items-center gap-2 transition-colors hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleFavorite"
      >
        <Star class="h-4 w-4" :class="post.myInteraction?.favorited ? 'fill-current text-amber-500' : ''" />
        {{ formatNumber(post.counter.favorite) }}
      </button>
    </div>

    <button type="button" class="inline-flex items-center gap-2 transition-colors hover:text-primary-600" aria-label="复制分享链接" @click="copyLink">
      <Share2 class="h-4 w-4" />
      分享
    </button>
  </div>
</template>

<script setup lang="ts">
import { Eye, Heart, MessageCircle, Share2, Star } from 'lucide-vue-next'
import type { Post } from '@/api/types'
import { formatNumber } from '@/lib/format'
import { toast } from 'vue-sonner'
import { useLoginRedirect } from '@/composables/useLoginRedirect'

const props = defineProps<{
  post: Post
  likePending?: boolean
  favoritePending?: boolean
}>()

const emit = defineEmits<{
  like: [postId: Post['postId']]
  favorite: [postId: Post['postId']]
}>()

const { requireLogin } = useLoginRedirect()

const handleLike = () => {
  if (!requireLogin()) return
  emit('like', props.post.postId)
}

const handleFavorite = () => {
  if (!requireLogin()) return
  emit('favorite', props.post.postId)
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href)
    toast.success('链接已复制')
  } catch {
    toast.error('复制失败')
  }
}
</script>
