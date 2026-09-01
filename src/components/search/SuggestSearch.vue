<template>
  <section class="suggest-search" aria-label="搜索建议">
    <div v-if="items.length" class="suggest-section">
      <div class="suggest-heading">
        <span>搜索建议</span>
        <small>suggest / hot</small>
      </div>
      <button
        v-for="item in items"
        :key="`${item.suggestionType}:${item.text}`"
        type="button"
        class="suggest-row"
        :data-source="item.source"
        :data-persistable="item.persistable"
        @click="emit('select', item)"
      >
        <span class="suggest-main">
          <strong>{{ item.text }}</strong>
          <small v-if="item.reasonText">{{ item.reasonText }}</small>
          <small v-if="isRepairSuggestion(item)">保留原始查询，仅作为纠错/同义词建议</small>
        </span>
        <span class="suggest-meta">
          <span>{{ typeLabel(item.suggestionType) }}</span>
          <span :class="['source-pill', sourceClass(item.source)]">{{ sourceLabel(item.source) }}</span>
          <span v-if="item.persistable" class="persist-pill">SAFE</span>
          <span v-else class="display-pill">展示</span>
        </span>
      </button>
    </div>

    <div v-if="zeroResultActions.length" class="suggest-section">
      <div class="suggest-heading">
        <span>零结果补救</span>
        <small>zero result</small>
      </div>
      <button
        v-for="action in zeroResultActions"
        :key="`${action.actionType}:${action.label}`"
        type="button"
        class="suggest-row"
        :data-source="action.source"
        @click="emit('zero-action', action)"
      >
        <span class="suggest-main">
          <strong>{{ action.label }}</strong>
          <small v-if="action.requiresReview">需要审核后进入缺口、同义词库或专题候选</small>
        </span>
        <span class="suggest-meta">
          <span>{{ actionLabel(action.actionType) }}</span>
          <span :class="['source-pill', sourceClass(action.source)]">{{ sourceLabel(action.source) }}</span>
          <span v-if="action.requiresLogin" class="display-pill">登录</span>
        </span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { SearchDiscoverySource, SearchSuggestionItem, SearchSuggestionType, ZeroResultAction, ZeroResultActionType } from '@/api/search'

withDefaults(defineProps<{
  items: SearchSuggestionItem[]
  zeroResultActions?: ZeroResultAction[]
}>(), {
  zeroResultActions: () => [],
})

const emit = defineEmits<{
  select: [item: SearchSuggestionItem]
  'zero-action': [action: ZeroResultAction]
}>()

const typeLabel = (type: SearchSuggestionType) => {
  const labels: Record<SearchSuggestionType, string> = {
    keyword: '关键词',
    tag: '标签',
    topic: '话题',
    collection: '合集',
    correction: '纠错',
    synonym: '同义词',
  }
  return labels[type]
}

const actionLabel = (type: ZeroResultActionType) => {
  const labels: Record<ZeroResultActionType, string> = {
    relax_filter: '放宽',
    try_keyword: '关键词',
    open_topic: '话题',
    open_tag: '标签',
    create_gap: '缺口',
    open_editor: '编辑',
  }
  return labels[type]
}

const sourceLabel = (source: SearchDiscoverySource) => {
  const labels: Record<SearchDiscoverySource, string> = {
    remote: 'remote',
    local: 'local',
    fallback: 'fallback',
    demo: 'demo',
  }
  return labels[source]
}

const sourceClass = (source: SearchDiscoverySource) => {
  return source === 'remote' ? 'source-remote' : source === 'local' ? 'source-local' : 'source-display'
}

const isRepairSuggestion = (item: SearchSuggestionItem) => {
  return item.suggestionType === 'correction' || item.suggestionType === 'synonym'
}
</script>

<style scoped>
.suggest-search {
  display: grid;
  gap: 0.75rem;
}

.suggest-section {
  display: grid;
  gap: 0.45rem;
}

.suggest-heading,
.suggest-row,
.suggest-meta,
.suggest-main {
  display: flex;
  align-items: center;
}

.suggest-heading {
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.8125rem;
  font-weight: 900;
  color: var(--text-strong);
}

.suggest-heading small {
  color: var(--text-muted);
}

.suggest-row {
  width: 100%;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  background: white;
  padding: 0.65rem 0.75rem;
  text-align: left;
  color: var(--text-strong);
}

.suggest-main {
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
}

.suggest-main strong {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
}

.suggest-main small {
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.4;
}

.suggest-meta {
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.35rem;
  font-size: 0.7rem;
  font-weight: 900;
  color: var(--text-primary);
}

.source-pill,
.persist-pill,
.display-pill {
  border-radius: 999px;
  padding: 0.15rem 0.45rem;
}

.source-remote {
  background: rgb(220 252 231);
  color: rgb(21 128 61);
}

.source-local {
  background: rgb(205 232 220);
  color: rgb(18 99 74);
}

.source-display,
.display-pill {
  background: var(--surface-soft);
  color: var(--text-muted);
}

.persist-pill {
  background: rgb(220 252 231);
  color: rgb(21 128 61);
}

.dark .suggest-heading,
.dark .suggest-row {
  color: var(--text-strong);
}

.dark .suggest-heading small,
.dark .suggest-main small {
  color: var(--text-muted);
}

.dark .suggest-row {
  border-color: var(--border-subtle);
  background: var(--surface-1);
}
</style>
