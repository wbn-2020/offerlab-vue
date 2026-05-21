<template>
  <div class="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-4">
    <div class="flex items-center gap-6">
      <!-- View Count -->
      <button class="flex items-center gap-2 hover:text-primary-600 transition-colors">
        <span>👁</span>
        <span>{{ formatNumber(post.counter.view) }}</span>
      </button>

      <!-- Like Button -->
      <button
        @click="handleLike"
        :disabled="!isLoggedIn"
        class="flex items-center gap-2 hover:text-danger transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>{{ post.myInteraction?.liked ? '❤️' : '🤍' }}</span>
        <span>{{ formatNumber(post.counter.like) }}</span>
      </button>

      <!-- Comment Button -->
      <button class="flex items-center gap-2 hover:text-primary-600 transition-colors">
        <span>💬</span>
        <span>{{ formatNumber(post.counter.comment) }}</span>
      </button>

      <!-- Favorite Button -->
      <button
        @click="handleFavorite"
        :disabled="!isLoggedIn"
        class="flex items-center gap-2 hover:text-accent-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>{{ post.myInteraction?.favorited ? '⭐' : '☆' }}</span>
        <span>{{ formatNumber(post.counter.favorite) }}</span>
      </button>
    </div>

    <!-- Share Button -->
    <button class="flex items-center gap-2 hover:text-primary-600 transition-colors">
      <span>🔗</span>
      <span>分享</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Post } from '@/api/types'
import { formatNumber } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { interactionApi } from '@/api/interaction'
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

const isLoggedIn = computed(() => authStore.isLoggedIn)

const handleLike = async () => {
  if (!isLoggedIn.value) {
    toast.error('请先登录')
    return
  }

  try {
    if (props.post.myInteraction?.liked) {
      await interactionApi.unlike(props.post.postId)
    } else {
      await interactionApi.like(props.post.postId)
    }
    emit('like', props.post.postId)
  } catch (error: any) {
    toast.error(error?.message || '操作失败')
  }
}

const handleFavorite = async () => {
  if (!isLoggedIn.value) {
    toast.error('请先登录')
    return
  }

  try {
    if (props.post.myInteraction?.favorited) {
      await interactionApi.unfavorite(props.post.postId)
    } else {
      await interactionApi.favorite(props.post.postId)
    }
    emit('favorite', props.post.postId)
  } catch (error: any) {
    toast.error(error?.message || '操作失败')
  }
}
</script>

