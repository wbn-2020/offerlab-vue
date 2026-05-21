<template>
  <div class="space-y-4">
    <div v-for="i in 3" :key="i" class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
        <div class="flex-1">
          <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24 mb-2 animate-pulse" />
          <div class="h-3 bg-slate-200 dark:bg-slate-800 rounded w-16 animate-pulse" />
        </div>
      </div>
      <div class="h-5 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-3 animate-pulse" />
      <div class="space-y-2 mb-4">
        <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6 animate-pulse" />
      </div>
      <div class="flex gap-2 mb-4">
        <div class="h-6 bg-slate-200 dark:bg-slate-800 rounded w-16 animate-pulse" />
        <div class="h-6 bg-slate-200 dark:bg-slate-800 rounded w-16 animate-pulse" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 骨架屏组件
</script>
