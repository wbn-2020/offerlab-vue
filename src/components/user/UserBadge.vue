<template>
  <div class="flex items-center gap-2">
    <UserAvatar
      :src="user.avatar"
      :name="user.nickname"
      alt=""
      class="h-8 w-8 rounded-full text-xs font-bold"
    />
    <div>
      <div class="font-semibold text-sm text-slate-900 dark:text-slate-100">{{ user.nickname }}</div>
      <div v-if="user.isBigV" class="text-xs text-accent-500">大V</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import UserAvatar from '@/components/user/UserAvatar.vue'
import type { User } from '@/api/types'

interface Props {
  user: User
}

defineProps<Props>()
</script>
