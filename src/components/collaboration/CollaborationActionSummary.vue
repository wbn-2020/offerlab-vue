<template>
  <section class="action-summary" aria-labelledby="collaboration-action-summary-title">
    <div class="summary-heading">
      <div>
        <p class="summary-kicker">协作行动</p>
        <h2 id="collaboration-action-summary-title">下一步该处理什么</h2>
      </div>
      <time v-if="summary?.generatedAt" :datetime="summary.generatedAt">
        更新于 {{ formatCollaborationDate(summary.generatedAt) }}
      </time>
    </div>

    <div v-if="loading" class="summary-grid" aria-label="行动摘要加载中">
      <div v-for="index in 4" :key="index" class="summary-skeleton">
        <span />
        <span />
      </div>
    </div>

    <div v-else-if="error" class="summary-state summary-state-error" role="alert">
      <AlertCircle class="icon" aria-hidden="true" />
      <div>
        <strong>行动摘要暂时无法读取</strong>
        <p>{{ error }}</p>
      </div>
    </div>

    <div v-else-if="!summary || Number(summary.total) === 0" class="summary-state">
      <CheckCircle2 class="icon" aria-hidden="true" />
      <div>
        <strong>目前没有待处理协作事项</strong>
        <p>未读通知不会自动变成待办；有明确的下一步动作时，它会出现在这里。</p>
      </div>
    </div>

    <div v-else class="summary-grid">
      <button
        v-for="item in visibleCounts"
        :key="item.type"
        type="button"
        class="summary-tile"
        :class="{ 'summary-tile-active': item.type === activeType }"
        :aria-pressed="item.type === activeType"
        @click="$emit('select', item.type)"
      >
        <span class="summary-tile-label">{{ labelCollaborationActionType(item.type) }}</span>
        <strong>{{ item.count }}</strong>
      </button>
    </div>

    <p v-if="summary?.degraded" class="degraded-note">
      <Info class="icon" aria-hidden="true" />
      部分协作来源暂不可用，当前数字可能不完整。
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AlertCircle, CheckCircle2, Info } from 'lucide-vue-next'
import type {
  CollaborationActionSummary as ActionSummary,
  CollaborationActionType,
} from '@/api/collaboration'
import {
  formatCollaborationDate,
  labelCollaborationActionType,
} from '@/utils/collaborationNeedPresentation'

const props = withDefaults(defineProps<{
  summary: ActionSummary | null
  loading?: boolean
  error?: string
  activeType?: CollaborationActionType | ''
}>(), {
  loading: false,
  error: '',
  activeType: '',
})

defineEmits<{
  select: [type: CollaborationActionType]
}>()

const actionOrder: CollaborationActionType[] = [
  'NEED_SUBMIT',
  'NEED_REVISE',
  'NEED_REVIEW',
  'NEED_STALLED',
  'OFFICE_HOUR_REVIEW',
  'CURATION_REVIEW',
  'GOVERNANCE_REVIEW',
]

const visibleCounts = computed(() => actionOrder
  .map((type) => ({ type, count: Number(props.summary?.counts?.[type] || 0) }))
  .filter((item) => item.count > 0))
</script>

<style scoped>
.action-summary {
  border-bottom: 1px solid var(--border-subtle);
  padding: 1.35rem 1.4rem 1.1rem;
}

.summary-heading,
.summary-state,
.degraded-note {
  display: flex;
  align-items: center;
}

.summary-heading {
  justify-content: space-between;
  gap: 1rem;
}

.summary-kicker {
  margin: 0 0 0.15rem;
  color: var(--primary-600);
  font-size: 0.75rem;
  font-weight: 800;
}

.summary-heading h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1.25rem;
  font-weight: 850;
}

.summary-heading time {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
  gap: 0.65rem;
  margin-top: 1rem;
}

.summary-tile,
.summary-skeleton {
  min-height: 4.8rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-2);
  padding: 0.75rem 0.85rem;
  text-align: left;
}

.summary-tile {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: var(--text-primary);
  cursor: pointer;
  transition: border-color 150ms ease, background-color 150ms ease, transform 150ms ease;
}

.summary-tile:hover {
  border-color: var(--primary-500);
  background: var(--primary-50);
}

.summary-tile:active {
  transform: translateY(1px);
}

.summary-tile-active {
  border-color: var(--primary-500);
  background: var(--primary-50);
  color: var(--primary-700);
}

.summary-tile-label {
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 750;
}

.summary-tile strong {
  font-size: 1.55rem;
  line-height: 1;
}

.summary-state {
  min-height: 6rem;
  gap: 0.75rem;
  margin-top: 1rem;
  border-radius: var(--radius-control);
  background: var(--surface-2);
  padding: 1rem;
  color: var(--text-muted);
}

.summary-state strong {
  display: block;
  color: var(--text-strong);
  font-size: 0.9rem;
}

.summary-state p,
.degraded-note {
  margin: 0.25rem 0 0;
  font-size: 0.78rem;
  line-height: 1.55;
}

.summary-state-error {
  background: color-mix(in srgb, var(--danger) 8%, var(--surface-2));
}

.summary-state-error .icon {
  color: var(--danger);
}

.degraded-note {
  gap: 0.35rem;
  color: var(--warning);
}

.summary-skeleton {
  display: grid;
  align-content: space-between;
  animation: summary-pulse 1.25s ease-in-out infinite;
}

.summary-skeleton span {
  display: block;
  width: 58%;
  height: 0.7rem;
  border-radius: 3px;
  background: var(--surface-3);
}

.summary-skeleton span:last-child {
  width: 30%;
  height: 1.4rem;
}

.icon {
  width: 1.15rem;
  height: 1.15rem;
  flex: none;
}

@keyframes summary-pulse {
  50% { opacity: 0.55; }
}

@media (prefers-reduced-motion: reduce) {
  .summary-tile { transition: none; }
  .summary-skeleton { animation: none; }
}

@media (max-width: 520px) {
  .summary-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
