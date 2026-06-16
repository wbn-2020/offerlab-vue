<template>
  <div class="space-y-4">
    <template v-if="isLoading">
      <LoadingSkeleton />
    </template>
    <template v-else-if="posts.length > 0">
      <PostCard
        v-for="post in posts"
        :key="post.postId"
        :post="post"
        @like="$emit('like', post.postId)"
        @favorite="$emit('favorite', post.postId)"
        @follow-change="(authorUid, following) => $emit('follow-change', authorUid, following)"
      />
    </template>
    <template v-else>
      <EmptyState
        :title="emptyTitle"
        :description="emptyDescription"
        actionText="去发现"
        actionHref="/explore"
      />
    </template>

    <!-- Load More Button -->
    <div v-if="hasNextPage && !isFetching" class="mt-6 text-center">
      <button
        @click="$emit('load-more')"
        class="px-6 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 dark:hover:bg-slate-800 transition-colors font-medium"
      >
        加载更多
      </button>
    </div>

    <!-- Loading More -->
    <div v-if="isFetching" class="mt-6">
      <LoadingSkeleton />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Post } from '@/api/types'
import PostCard from '@/components/post/PostCard.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import EmptyState from '@/components/common/EmptyState.vue'

interface Props {
  posts: Post[]
  isLoading: boolean
  isFetching: boolean
  hasNextPage: boolean
  emptyTitle?: string
  emptyDescription?: string
}

withDefaults(defineProps<Props>(), {
  emptyTitle: '暂时没有内容',
  emptyDescription: '去发现页看看有价值的技术经验吧',
})

defineEmits<{
  'load-more': []
  like: [postId: Post['postId']]
  favorite: [postId: Post['postId']]
  'follow-change': [authorUid: Post['author']['uid'], following: boolean]
}>()
</script>
