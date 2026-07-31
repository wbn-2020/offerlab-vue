<template>
  <section class="action-list" aria-labelledby="collaboration-action-list-title">
    <div class="list-heading">
      <div>
        <h2 id="collaboration-action-list-title">待处理事项</h2>
        <p>{{ items.length ? `已加载 ${items.length} 项` : '服务端只返回当前账号真正需要处理的事项。' }}</p>
      </div>
      <button
        v-if="activeType"
        type="button"
        class="clear-filter"
        title="清除行动类型筛选"
        aria-label="清除行动类型筛选"
        @click="$emit('clear-filter')"
      >
        <X class="icon" aria-hidden="true" />
      </button>
    </div>

    <div v-if="loading" class="list-loading" aria-label="待办加载中">
      <div v-for="index in 3" :key="index" class="action-skeleton">
        <span />
        <span />
        <span />
      </div>
    </div>

    <div v-else-if="error" class="list-state list-state-error" role="alert">
      <AlertCircle class="icon" aria-hidden="true" />
      <div>
        <strong>待办列表暂时无法读取</strong>
        <p>{{ error }}</p>
      </div>
      <button type="button" class="secondary-action" @click="$emit('retry')">
        <RefreshCw class="icon" aria-hidden="true" />
        重试
      </button>
    </div>

    <div v-else-if="!items.length" class="list-state">
      <CheckCircle2 class="icon" aria-hidden="true" />
      <div>
        <strong>{{ activeType ? '这个行动类型目前没有待办' : '目前没有待处理事项' }}</strong>
        <p>{{ activeType ? '可以清除筛选，查看其他协作事项。' : '有明确可执行动作时，它会在服务端生成一条记录。' }}</p>
      </div>
    </div>

    <div v-else class="action-items">
      <article v-for="item in items" :key="collaborationActionKey(item)" class="action-item">
        <div class="action-item-main">
          <div class="action-item-topline">
            <span class="action-badge">{{ labelCollaborationActionType(item.actionType) }}</span>
            <span v-if="item.sourceStatus" class="meta-label">
              {{ labelCollaborationActionSourceStatus(item.sourceStatus) }}
            </span>
            <time :datetime="item.updatedAt">{{ formatCollaborationDate(item.updatedAt) }}</time>
          </div>
          <h3>{{ item.title }}</h3>
          <p>{{ collaborationActionReason(item) }}</p>
        </div>
        <RouterLink
          v-if="item.canAct && targetPath(item)"
          :to="targetPath(item)!"
          class="primary-action"
        >
          <ArrowRight class="icon" aria-hidden="true" />
          去处理
        </RouterLink>
        <RouterLink
          v-else-if="targetPath(item)"
          :to="targetPath(item)!"
          class="secondary-action"
          data-read-only-context
        >
          <Eye class="icon" aria-hidden="true" />
          查看上下文
        </RouterLink>
        <span v-else class="read-only-label">等待来源更新</span>
      </article>
    </div>

    <div v-if="loadMoreError" class="load-more-error" role="alert">
      <span>{{ loadMoreError }}</span>
      <button type="button" class="secondary-action" @click="$emit('retry-more')">
        <RefreshCw class="icon" aria-hidden="true" />
        重试加载更多
      </button>
    </div>
    <button
      v-if="hasMore && !loadingMore && !loadMoreError"
      type="button"
      class="load-more"
      @click="$emit('load-more')"
    >
      <ChevronDown class="icon" aria-hidden="true" />
      加载更多
    </button>
    <span v-else-if="loadingMore" class="loading-more">
      <Loader2 class="icon spin" aria-hidden="true" />
      加载中
    </span>
  </section>
</template>

<script setup lang="ts">
import { AlertCircle, ArrowRight, CheckCircle2, ChevronDown, Eye, Loader2, RefreshCw, X } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import type { CollaborationActionItem, CollaborationActionType } from '@/api/collaboration'
import {
  actionTargetPath,
  collaborationActionKey,
  collaborationActionReason,
  formatCollaborationDate,
  labelCollaborationActionSourceStatus,
  labelCollaborationActionType,
} from '@/utils/collaborationNeedPresentation'

withDefaults(defineProps<{
  items: CollaborationActionItem[]
  loading?: boolean
  loadingMore?: boolean
  error?: string
  loadMoreError?: string
  hasMore?: boolean
  activeType?: CollaborationActionType | ''
}>(), {
  loading: false,
  loadingMore: false,
  error: '',
  loadMoreError: '',
  hasMore: false,
  activeType: '',
})

defineEmits<{
  retry: []
  'retry-more': []
  'load-more': []
  'clear-filter': []
}>()

const targetPath = (item: CollaborationActionItem) => actionTargetPath(item)
</script>

<style scoped>
.action-list {
  padding: 1.25rem 1.4rem 1.5rem;
}

.list-heading,
.action-item,
.action-item-topline,
.list-state,
.load-more-error,
.loading-more {
  display: flex;
  align-items: center;
}

.list-heading {
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.8rem;
}

.list-heading h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1.05rem;
  font-weight: 850;
}

.list-heading p {
  margin: 0.25rem 0 0;
  color: var(--text-muted);
  font-size: 0.78rem;
}

.clear-filter {
  display: inline-flex;
  width: 2.35rem;
  height: 2.35rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-2);
  color: var(--text-muted);
}

.action-items {
  border-top: 1px solid var(--border-subtle);
}

.action-item {
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--border-subtle);
  padding: 1rem 0;
}

.action-item-main {
  min-width: 0;
}

.action-item-topline {
  flex-wrap: wrap;
  gap: 0.45rem;
}

.action-item-topline time {
  margin-left: auto;
  color: var(--text-muted);
  font-size: 0.72rem;
}

.action-badge,
.meta-label {
  display: inline-flex;
  align-items: center;
  min-height: 1.55rem;
  border-radius: 999px;
  padding: 0.25rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 750;
}

.action-badge {
  background: var(--primary-50);
  color: var(--primary-700);
}

.meta-label {
  background: var(--surface-3);
  color: var(--text-muted);
}

.action-item h3 {
  margin: 0.55rem 0 0.25rem;
  color: var(--text-strong);
  font-size: 0.95rem;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.action-item p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.82rem;
  line-height: 1.6;
}

.primary-action,
.secondary-action {
  display: inline-flex;
  min-height: 2.35rem;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: var(--radius-control);
  padding: 0.5rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 750;
}

.primary-action {
  border: 1px solid var(--primary-600);
  background: var(--primary-600);
  color: white;
}

.secondary-action {
  border: 1px solid var(--border-subtle);
  background: var(--surface);
  color: var(--text-primary);
}

.read-only-label {
  flex: none;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.list-state {
  min-height: 9rem;
  justify-content: center;
  gap: 0.75rem;
  border: 1px dashed var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-2);
  padding: 1.25rem;
  color: var(--text-muted);
}

.list-state strong {
  display: block;
  color: var(--text-strong);
  font-size: 0.9rem;
}

.list-state p {
  margin: 0.25rem 0 0;
  font-size: 0.78rem;
  line-height: 1.55;
}

.list-state-error {
  justify-content: flex-start;
  border-style: solid;
  background: color-mix(in srgb, var(--danger) 8%, var(--surface-2));
}

.list-state-error .icon {
  color: var(--danger);
}

.list-state-error .secondary-action {
  margin-left: auto;
}

.action-skeleton {
  display: grid;
  gap: 0.65rem;
  border-bottom: 1px solid var(--border-subtle);
  padding: 1rem 0;
  animation: action-pulse 1.25s ease-in-out infinite;
}

.action-skeleton span {
  display: block;
  width: 18%;
  height: 0.65rem;
  border-radius: 3px;
  background: var(--surface-3);
}

.action-skeleton span:nth-child(2) { width: 55%; height: 0.9rem; }
.action-skeleton span:nth-child(3) { width: 82%; }

.load-more,
.loading-more,
.load-more-error {
  justify-content: center;
  gap: 0.45rem;
  margin-top: 1rem;
  color: var(--text-muted);
  font-size: 0.78rem;
}

.load-more {
  width: 100%;
  min-height: 2.5rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-2);
}

.load-more-error {
  flex-wrap: wrap;
}

.icon {
  width: 1rem;
  height: 1rem;
  flex: none;
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes action-pulse {
  50% { opacity: 0.55; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .action-skeleton,
  .spin { animation: none; }
}

@media (max-width: 560px) {
  .action-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .action-item-topline time {
    margin-left: 0;
  }

  .primary-action,
  .secondary-action {
    width: 100%;
  }
}
</style>
