<template>
  <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center text-center">
    <!-- 头像 -->
    <img
      :src="user.avatar"
      :alt="user.nickname"
      class="w-16 h-16 rounded-full mb-4 border-2 border-primary-500"
    />

    <!-- 昵称 + 大V徽章 -->
    <div class="flex items-center gap-2 justify-center mb-2">
      <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100">
        {{ user.nickname }}
      </h3>
      <span v-if="user.isBigV" class="text-xs bg-accent-500 text-white px-2 py-0.5 rounded">
        大V
      </span>
    </div>

    <!-- 个性签名 -->
    <p v-if="user.signature" class="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
      {{ user.signature }}
    </p>

    <!-- 数据统计 -->
    <div class="flex gap-6 mb-4 text-center w-full">
      <div class="flex-1">
        <div class="text-lg font-bold text-slate-900 dark:text-slate-100">0</div>
        <div class="text-xs text-slate-500 dark:text-slate-400">发帖</div>
      </div>
      <div class="flex-1">
        <div class="text-lg font-bold text-slate-900 dark:text-slate-100">0</div>
        <div class="text-xs text-slate-500 dark:text-slate-400">关注</div>
      </div>
      <div class="flex-1">
        <div class="text-lg font-bold text-slate-900 dark:text-slate-100">0</div>
        <div class="text-xs text-slate-500 dark:text-slate-400">粉丝</div>
      </div>
    </div>

    <!-- 关注按钮 -->
    <button
      v-if="!isOwnUser"
      @click="toggleFollow"
      :class="[
        'w-full px-4 py-2 rounded-lg font-medium text-sm transition-colors',
        user.isFollowing
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700'
          : 'bg-primary-600 text-white hover:bg-primary-700'
      ]"
    >
      {{ user.isFollowing ? '已关注' : '关注' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { User } from '@/api/types'
import { useAuthStore } from '@/stores/auth'

interface Props {
  user: User
}

const props = defineProps<Props>()

const authStore = useAuthStore()

const isOwnUser = computed(() => authStore.user?.uid === props.user.uid)

const toggleFollow = () => {
  // TODO: 实现关注/取关逻辑
}
</script>
