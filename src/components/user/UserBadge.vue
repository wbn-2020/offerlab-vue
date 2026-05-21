<template>
  <div class="flex items-center gap-2">
    <img :src="user.avatar" :alt="user.nickname" class="w-8 h-8 rounded-full" />
    <div>
      <div class="font-semibold text-sm text-slate-900 dark:text-slate-100">{{ user.nickname }}</div>
      <div v-if="user.isBigV" class="text-xs text-accent-500">大V</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { User } from '@/api/types'

interface Props {
  user: User
}

defineProps<Props>()
</script>
