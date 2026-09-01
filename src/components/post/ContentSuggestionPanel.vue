<template>
  <div class="content-suggestion-structured">
    <p class="content-suggestion-detail">{{ suggestion.detail }}</p>
    <a
      v-if="sourceUrl"
      class="content-suggestion-source"
      :href="sourceUrl"
      target="_blank"
      rel="noreferrer"
    >
      查看补充链接
    </a>

    <dl class="content-suggestion-target">
      <div data-target-scope>
        <dt>建议范围</dt>
        <dd>{{ targetScopeText }}</dd>
      </div>
      <div data-target-locator>
        <dt>具体位置</dt>
        <dd>{{ suggestion.targetLocator || '未指定具体位置' }}</dd>
      </div>
      <div class="content-suggestion-expected" data-expected-change>
        <dt>预期改动</dt>
        <dd>{{ suggestion.expectedChange || '以建议正文为准' }}</dd>
      </div>
    </dl>

    <div class="content-suggestion-state" aria-label="建议版本与交付状态">
      <span data-base-version>基于版本：{{ baseVersionText }}</span>
      <span data-resolution>处理结论：{{ resolutionText }}</span>
      <span data-delivery-status>交付状态：{{ deliveryStatusText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  normalizeHttpUrl,
  type ContentSuggestionRecord,
  type ContentSuggestionResolution,
  type ContentSuggestionTargetScope,
} from '@/api/contentSuggestions'

const props = defineProps<{
  suggestion: ContentSuggestionRecord
}>()

const TARGET_SCOPE_LABELS: Record<ContentSuggestionTargetScope, string> = {
  TITLE: '标题',
  CONTENT: '正文整体',
  SECTION: '指定段落',
  REFERENCE: '引用与来源',
  FRESHNESS: '时效信息',
  OTHER: '其他位置',
}

const RESOLUTION_LABELS: Record<ContentSuggestionResolution, string> = {
  PENDING: '待处理',
  ACCEPTED: '已采纳',
  PARTIAL: '部分采纳',
  REJECTED: '未采纳',
  PLANNED: '计划处理',
}

const DECISION_RESOLUTION: Partial<Record<NonNullable<ContentSuggestionRecord['decision']>, ContentSuggestionResolution>> = {
  ACCEPTED: 'ACCEPTED',
  PARTIAL_ACCEPTED: 'PARTIAL',
  REJECTED: 'REJECTED',
  PLANNED: 'PLANNED',
}

const sourceUrl = computed(() => normalizeHttpUrl(props.suggestion.sourceUrl))
const targetScopeText = computed(() => (
  props.suggestion.targetScope
    ? TARGET_SCOPE_LABELS[props.suggestion.targetScope] || props.suggestion.targetScope
    : '未指定'
))
const baseVersionText = computed(() => (
  Number.isFinite(props.suggestion.baseVersion)
    ? `v${props.suggestion.baseVersion}`
    : '未返回'
))
const resolutionText = computed(() => {
  const resolution = props.suggestion.resolution
    || (props.suggestion.decision ? DECISION_RESOLUTION[props.suggestion.decision] : undefined)
    || (props.suggestion.status === 'PENDING' ? 'PENDING' : undefined)
  return resolution ? RESOLUTION_LABELS[resolution] || resolution : '未返回'
})
const deliveryStatusText = computed(() => {
  if (props.suggestion.deliveryStatus === 'LINKED') return '已关联内容版本'
  if (props.suggestion.deliveryStatus === 'UNLINKED') return '尚未关联内容版本'
  return '未返回'
})
</script>

<style scoped>
.content-suggestion-structured {
  display: grid;
  gap: 0.75rem;
}

.content-suggestion-detail {
  margin: 0;
}

.content-suggestion-source {
  justify-self: start;
  color: rgb(26 127 90);
  font-size: 0.8125rem;
  font-weight: 800;
}

.content-suggestion-target {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.625rem;
  margin: 0;
}

.content-suggestion-target > div {
  min-width: 0;
  border-radius: 0.5rem;
  background: var(--surface-soft);
  padding: 0.7rem 0.75rem;
}

.content-suggestion-target dt {
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 800;
}

.content-suggestion-target dd {
  margin: 0.25rem 0 0;
  overflow-wrap: anywhere;
  color: var(--text-strong);
  font-size: 0.8125rem;
  line-height: 1.55;
}

.content-suggestion-expected {
  grid-column: 1 / -1;
}

.content-suggestion-state {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.content-suggestion-state span {
  display: inline-flex;
  min-height: 1.75rem;
  align-items: center;
  border-radius: 999px;
  background: var(--surface-soft);
  padding: 0.25rem 0.6rem;
  color: var(--text-primary);
  font-size: 0.72rem;
  font-weight: 800;
}

:global(.dark .content-suggestion-structured) .content-suggestion-source {
  color: rgb(124 195 165);
}

:global(.dark .content-suggestion-structured) .content-suggestion-target > div,
:global(.dark .content-suggestion-structured) .content-suggestion-state span {
  background: var(--surface-1);
}

:global(.dark .content-suggestion-structured) .content-suggestion-target dt {
  color: var(--text-muted);
}

:global(.dark .content-suggestion-structured) .content-suggestion-target dd,
:global(.dark .content-suggestion-structured) .content-suggestion-state span {
  color: var(--text-primary);
}

@media (max-width: 640px) {
  .content-suggestion-target {
    grid-template-columns: 1fr;
  }

  .content-suggestion-expected {
    grid-column: auto;
  }
}
</style>
