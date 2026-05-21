<template>
  <div class="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium">
    <span class="w-2 h-2 bg-slate-400 dark:bg-slate-600 rounded-full" />
    {{ company }}
  </div>
</template>

<script setup lang="ts">
interface Props {
  company: string
}

defineProps<Props>()
</script>
