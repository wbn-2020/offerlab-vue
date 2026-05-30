<template>
  <section class="panel">
    <div class="flex items-center justify-between gap-3">
      <h2 class="panel-title">最近记录</h2>
      <button type="button" class="mini-button" @click="$emit('refresh')">刷新</button>
    </div>
    <div v-if="sessions.length" class="mt-4 space-y-2">
      <button
        v-for="item in sessions"
        :key="item.id"
        type="button"
        class="recent-item"
        @click="$emit('select', item)"
      >
        <span class="font-bold">{{ sessionTitle(item) }}</span>
        <small>{{ item.answeredCount }}/{{ item.questionCount }} 题 · {{ item.totalScore }} 分</small>
      </button>
    </div>
    <p v-else class="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">还没有练习记录，先开始一场吧。</p>
  </section>
</template>

<script setup lang="ts">
import type { MockInterviewSession } from '@/api/question'
import { sessionTitle } from '@/utils/mockInterviewFormat'

defineProps<{
  sessions: MockInterviewSession[]
}>()

defineEmits<{
  refresh: []
  select: [session: MockInterviewSession]
}>()
</script>

<style scoped>
.panel {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.panel-title {
  font-size: 1rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.mini-button {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 0.65rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.55rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 800;
  color: rgb(51 65 85);
}

.recent-item {
  display: grid;
  width: 100%;
  gap: 0.25rem;
  border-radius: 0.65rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.75rem;
  text-align: left;
}

.recent-item small {
  color: rgb(100 116 139);
}

:global(.dark) .panel,
:global(.dark) .mini-button {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

:global(.dark) .panel-title {
  color: rgb(248 250 252);
}

:global(.dark) .recent-item {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23);
}
</style>