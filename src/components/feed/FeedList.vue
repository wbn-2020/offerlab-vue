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
        :show-recommend-feedback="showRecommendFeedback"
        :show-feed-controls="showFeedControls"
        :feed-feedback-action="feedbackActionFor(post.postId)"
        :feed-feedback-pending="feedFeedbackPendingIds.has(String(post.postId))"
        :feed-feedback-error="feedFeedbackErrors[String(post.postId)]"
        @like="$emit('like', post.postId)"
        @favorite="$emit('favorite', post.postId)"
        @not-interested="(postId, action, reason) => $emit('not-interested', postId, action, reason)"
        @feed-feedback="(postId, action) => $emit('feed-feedback', postId, action)"
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
import type { FeedControlAction, FeedFeedbackAction } from '@/api/feed'
import PostCard from '@/components/post/PostCard.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import EmptyState from '@/components/common/EmptyState.vue'

interface Props {
  posts: Post[]
  isLoading: boolean
  isFetching: boolean
  hasNextPage: boolean
  showRecommendFeedback?: boolean
  showFeedControls?: boolean
  feedFeedbackActions?: Record<string, FeedControlAction | undefined>
  feedFeedbackPendingIds?: Set<string>
  feedFeedbackErrors?: Record<string, string | undefined>
  emptyTitle?: string
  emptyDescription?: string
}

const props = withDefaults(defineProps<Props>(), {
  feedFeedbackActions: () => ({}),
  feedFeedbackPendingIds: () => new Set<string>(),
  feedFeedbackErrors: () => ({}),
  emptyTitle: '暂时没有内容',
  emptyDescription: '去发现页看看真实经验、有用见闻和正在发生的讨论吧',
})

const feedbackActionFor = (postId: Post['postId']) => props.feedFeedbackActions[String(postId)]

defineEmits<{
  'load-more': []
  like: [postId: Post['postId']]
  favorite: [postId: Post['postId']]
  'not-interested': [postId: Post['postId'], action: FeedFeedbackAction, reason: string]
  'feed-feedback': [postId: Post['postId'], action: FeedControlAction]
  'follow-change': [authorUid: Post['author']['uid'], following: boolean]
}>()
</script>
