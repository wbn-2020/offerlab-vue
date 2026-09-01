<template>
  <section class="prep-panel">
    <div class="prep-panel-heading">
      <h2 class="prep-panel-title">{{ title }}</h2>
      <RouterLink v-if="actionHref && actionText" :to="actionHref" class="prep-panel-action">{{ actionText }}</RouterLink>
    </div>
    <EmptyState v-if="empty" :title="emptyTitle" :description="emptyDescription" />
    <div v-else class="grid gap-4"><slot /></div>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import EmptyState from '@/components/common/EmptyState.vue'

interface Props {
  title: string
  empty?: boolean
  emptyTitle: string
  emptyDescription: string
  actionHref?: string
  actionText?: string
}

withDefaults(defineProps<Props>(), {
  empty: false,
  actionHref: '',
  actionText: '',
})
</script>

<style scoped>
.prep-panel {
  border-radius: 0.75rem;
  border: 1px solid var(--border-subtle);
  background: white;
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgba(20, 30, 25, 0.04);
}

.prep-panel-heading {
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.prep-panel-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-strong);
}

.prep-panel-action {
  flex-shrink: 0;
  font-size: 0.875rem;
  font-weight: 800;
  color: rgb(26 127 90);
}

.prep-panel-action:hover {
  color: rgb(18 99 74);
}

.dark .prep-panel {
  border-color: var(--border-subtle);
  background: var(--surface-1);
}

.dark .prep-panel-title {
  color: var(--text-strong);
}

.dark .prep-panel-action {
  color: rgb(124 195 165);
}
</style>
