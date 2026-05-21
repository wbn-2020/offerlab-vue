<template>
  <div class="space-y-4">
    <template v-if="comments.length > 0">
      <div v-for="comment in comments" :key="comment.commentId" class="border-l-2 border-slate-200 dark:border-slate-800 pl-4">
        <!-- Comment Item -->
        <div class="flex gap-3">
          <div class="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
            {{ comment.author.nickname[0] }}
          </div>
          <div class="flex-1 min-w-0">
            <!-- Author Info -->
            <div class="flex items-center gap-2">
              <span class="font-semibold text-sm text-slate-900 dark:text-slate-100">{{ comment.author.nickname }}</span>
              <span class="text-xs text-slate-500 dark:text-slate-400">{{ formatTime(comment.createdAt) }}</span>
            </div>

            <!-- Comment Content -->
            <p class="text-sm text-slate-700 dark:text-slate-300 mt-1 break-words">{{ comment.content }}</p>

            <!-- Comment Actions -->
            <div class="flex items-center gap-4 mt-2">
              <button class="text-xs text-slate-500 dark:text-slate-400 hover:text-primary-600 transition-colors">
                回复
              </button>
              <button class="text-xs text-slate-500 dark:text-slate-400 hover:text-danger transition-colors">
                👍 {{ comment.likeCount }}
              </button>
            </div>

            <!-- Nested Replies -->
            <div v-if="comment.replies && comment.replies.length > 0" class="mt-4 space-y-3">
              <div v-for="reply in comment.replies" :key="reply.commentId" class="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-xs text-slate-900 dark:text-slate-100">{{ reply.author.nickname }}</span>
                  <span class="text-xs text-slate-500 dark:text-slate-400">{{ formatTime(reply.createdAt) }}</span>
                </div>
                <p class="text-xs text-slate-700 dark:text-slate-300 mt-1 break-words">{{ reply.content }}</p>
                <div class="flex items-center gap-4 mt-2">
                  <button class="text-xs text-slate-500 dark:text-slate-400 hover:text-primary-600 transition-colors">
                    回复
                  </button>
                  <button class="text-xs text-slate-500 dark:text-slate-400 hover:text-danger transition-colors">
                    👍 {{ reply.likeCount }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="text-center py-8">
        <p class="text-sm text-slate-500 dark:text-slate-400">还没有评论，来抢沙发吧</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Comment } from '@/api/types'
import { formatTime } from '@/lib/format'

interface Props {
  postId: number
  comments: Comment[]
}

defineProps<Props>()
</script>

