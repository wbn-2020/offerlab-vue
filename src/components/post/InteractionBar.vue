<template>
  <div class="flex items-center justify-between border-t border-slate-200 pt-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
    <div class="interaction-actions">
      <span class="interaction-action" title="浏览量">
        <Eye class="h-4 w-4" />
        <span class="action-label">浏览</span>
        {{ formatNumber(post.counter.view) }}
      </span>

      <button
        type="button"
        :aria-label="likePending ? '点赞处理中' : post.myInteraction?.liked ? '取消点赞' : '点赞帖子'"
        :title="likePending ? '点赞处理中' : post.myInteraction?.liked ? '取消点赞' : '点赞帖子'"
        :aria-pressed="Boolean(post.myInteraction?.liked)"
        :aria-busy="likePending"
        :disabled="likePending"
        class="interaction-action transition-colors hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleLike"
      >
        <Heart class="h-4 w-4" :class="post.myInteraction?.liked ? 'fill-current text-rose-600' : ''" />
        <span class="action-label">{{ post.myInteraction?.liked ? '已点赞' : '点赞' }}</span>
        {{ formatNumber(post.counter.like) }}
      </button>

      <span class="interaction-action" title="评论数">
        <MessageCircle class="h-4 w-4" />
        <span class="action-label">评论</span>
        {{ formatNumber(post.counter.comment) }}
      </span>

      <button
        type="button"
        :aria-label="favoritePending ? '收藏处理中' : post.myInteraction?.favorited ? '取消收藏' : '收藏帖子'"
        :title="favoritePending ? '收藏处理中' : post.myInteraction?.favorited ? '取消收藏' : '收藏内容，不默认提醒新回复'"
        :aria-pressed="Boolean(post.myInteraction?.favorited)"
        :aria-busy="favoritePending"
        :disabled="favoritePending"
        class="interaction-action transition-colors hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleFavorite"
      >
        <Star class="h-4 w-4" :class="post.myInteraction?.favorited ? 'fill-current text-amber-500' : ''" />
        <span class="action-label">{{ post.myInteraction?.favorited ? '已收藏' : '收藏内容' }}</span>
        {{ formatNumber(post.counter.favorite) }}
      </button>
    </div>

    <button
      type="button"
      class="interaction-action transition-colors hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="分享公开帖子"
      :title="shareUnavailable ? shareDisabledReasonText : '分享公开链接'"
      :aria-disabled="shareUnavailable"
      :disabled="shareUnavailable"
      @click="shareLink"
    >
      <Share2 class="h-4 w-4" />
      分享
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Eye, Heart, MessageCircle, Share2, Star } from 'lucide-vue-next'
import type { Post } from '@/api/types'
import { formatNumber } from '@/lib/format'
import { toast } from 'vue-sonner'
import { isPublicPostVisible } from '@/utils/recommendationGovernance'
import { sharePublicLink } from '@/utils/share'

const props = defineProps<{
  post: Post
  likePending?: boolean
  favoritePending?: boolean
  shareTitle?: string
  shareText?: string
  shareCanonical?: string
  shareDisabled?: boolean
  shareDisabledReason?: string
}>()

const emit = defineEmits<{
  like: [postId: Post['postId']]
  favorite: [postId: Post['postId']]
}>()

const shareDisabledReasonText = computed(() => props.shareDisabledReason || '这篇内容当前不可公开分享')
const shareUnavailable = computed(() => props.shareDisabled || !isPublicPostVisible(props.post))

const handleLike = () => {
  emit('like', props.post.postId)
}

const handleFavorite = () => {
  emit('favorite', props.post.postId)
}

const shareLink = async () => {
  if (shareUnavailable.value) {
    toast.info(shareDisabledReasonText.value)
    return
  }
  const result = await sharePublicLink({
    title: props.shareTitle || props.post.title,
    text: props.shareText || props.post.summary || props.post.content,
    canonical: props.shareCanonical || `/post/${props.post.postId}`,
  })
  if (result.status === 'shared') {
    toast.success('已打开系统分享')
  } else if (result.status === 'copied') {
    toast.success('链接已复制')
  } else if (result.status === 'cancelled') {
    // 分享取消是用户主动选择，不作为错误打扰。
  } else {
    toast.error('复制失败，可以手动复制地址栏链接')
  }
}
</script>

<style scoped>
.interaction-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
}

.interaction-action {
  display: inline-flex;
  min-height: 2rem;
  flex-shrink: 0;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  padding: 0.25rem 0.45rem;
  white-space: nowrap;
}

.action-label {
  font-size: 0.75rem;
  font-weight: 700;
}

@media (max-width: 420px) {
  .interaction-actions {
    gap: 0.4rem;
  }

  .interaction-action {
    gap: 0.25rem;
    min-height: 44px;
    padding-inline: 0.35rem;
  }

  .action-label {
    font-size: 0.7rem;
  }
}
</style>
