<template>
  <div class="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium">
    <span class="w-2 h-2 bg-slate-400 dark:bg-slate-600 rounded-full" />
    {{ tag.name }}
  </div>
</template>

<script setup lang="ts">
import type { Tag } from '@/api/types'

interface Props {
  tag: Tag
}

defineProps<Props>()
</script>
