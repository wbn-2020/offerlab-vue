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
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
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
  color: rgb(15 23 42);
}

.prep-panel-action {
  flex-shrink: 0;
  font-size: 0.875rem;
  font-weight: 800;
  color: rgb(37 99 235);
}

.prep-panel-action:hover {
  color: rgb(29 78 216);
}

:global(.dark) .prep-panel {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

:global(.dark) .prep-panel-title {
  color: rgb(248 250 252);
}

:global(.dark) .prep-panel-action {
  color: rgb(147 197 253);
}
</style>
