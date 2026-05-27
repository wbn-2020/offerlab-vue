<template>
  <div class="space-y-4">
    <div v-for="i in 3" :key="i" class="surface-card p-5">
      <div class="mb-4 flex items-center gap-3">
        <div class="h-11 w-11 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div class="flex-1">
          <div class="mb-2 h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div class="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
      <div class="mb-3 h-5 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div class="mb-4 space-y-2">
        <div class="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div class="h-4 w-5/6 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </div>
      <div class="mb-4 flex gap-2">
        <div class="h-7 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
        <div class="h-7 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
        <div class="h-7 w-14 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 骨架屏组件
</script>
