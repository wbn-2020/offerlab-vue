<template>
  <div class="loading-skeleton" :class="`loading-skeleton--${variant}`" aria-label="内容加载中">
    <template v-for="i in rows" :key="i">
      <article v-if="variant === 'feed'" class="feed-skeleton-row">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div class="flex-1">
            <div class="mb-2 h-3.5 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div class="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
        <div class="mt-4 h-4 w-4/5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div class="mt-3 space-y-2">
          <div class="h-3.5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div class="h-3.5 w-5/6 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>
        <div class="mt-4 h-3 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </article>
      <div v-else class="surface-card p-5">
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
    </template>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'card' | 'feed'
  rows?: number
}>(), {
  variant: 'card',
  rows: 3,
})
</script>

<style scoped>
.loading-skeleton--feed {
  background: var(--surface);
}

.feed-skeleton-row {
  padding: 1.1rem;
  border-bottom: 1px solid var(--border-subtle);
}

.feed-skeleton-row:last-child {
  border-bottom: 0;
}

.dark .loading-skeleton--feed {
  background: rgb(24 26 32);
}

.dark .feed-skeleton-row {
  border-color: rgb(63 63 70);
}
</style>
