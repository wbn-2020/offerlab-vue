<template>
  <form class="need-discovery-filters" data-need-discovery-filters @submit.prevent="$emit('submit')">
    <label class="keyword-field">
      <span>关键词</span>
      <div class="input-with-icon">
        <Search class="icon" aria-hidden="true" />
        <input
          :value="modelValue.keyword"
          type="search"
          maxlength="80"
          placeholder="搜索需求标题或说明"
          aria-label="搜索需求标题或说明"
          @input="update('keyword', ($event.target as HTMLInputElement).value)"
        >
      </div>
    </label>

    <label class="filter-field">
      <span>领域</span>
      <select
        :value="modelValue.domain"
        aria-label="按领域筛选需求"
        @change="update('domain', parseDomain(($event.target as HTMLSelectElement).value))"
      >
        <option value="">全部领域</option>
        <option v-for="domain in localDomainConfigs" :key="domain.domain" :value="domain.domain">
          {{ domain.domainName }}
        </option>
      </select>
    </label>

    <label class="filter-field">
      <span>内容形态</span>
      <select
        :value="modelValue.contentFormat"
        aria-label="按内容形态筛选需求"
        @change="update('contentFormat', ($event.target as HTMLSelectElement).value as NeedContentFormat | '')"
      >
        <option value="">全部形态</option>
        <option v-for="option in contentFormatOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </label>

    <label class="filter-field">
      <span>来源</span>
      <select
        :value="modelValue.sourceType"
        aria-label="按需求来源筛选"
        @change="update('sourceType', ($event.target as HTMLSelectElement).value as NeedSourceType | '')"
      >
        <option value="">全部来源</option>
        <option v-for="option in sourceTypeOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </label>

    <label class="filter-field">
      <span>状态</span>
      <select
        :value="modelValue.status"
        aria-label="按需求状态筛选"
        @change="update('status', ($event.target as HTMLSelectElement).value as NeedStatus | '')"
      >
        <option value="">全部状态</option>
        <option v-for="option in statusOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </label>

    <label class="filter-field">
      <span>排序</span>
      <select
        :value="modelValue.sort"
        aria-label="按需求排序"
        @change="update('sort', ($event.target as HTMLSelectElement).value as CollaborationNeedDiscoverySort)"
      >
        <option value="LATEST">最新发布</option>
        <option value="UPDATED">最近更新</option>
        <option value="STALLED_FIRST">停滞优先</option>
      </select>
    </label>

    <button
      type="button"
      class="reset-button"
      title="清空需求筛选"
      aria-label="清空需求筛选"
      @click="$emit('reset')"
    >
      <RotateCcw class="icon" aria-hidden="true" />
      清空
    </button>
    <button type="submit" class="submit-button">
      <Search class="icon" aria-hidden="true" />
      筛选
    </button>
  </form>
</template>

<script setup lang="ts">
import { RotateCcw, Search } from 'lucide-vue-next'
import type {
  CollaborationNeedDiscoverySort,
  NeedContentFormat,
  NeedSourceType,
  NeedStatus,
} from '@/api/collaboration'
import type { CollaborationNeedDiscoveryFilters } from '@/composables/useCollaborationDiscoveryQuery'
import { localDomainConfigs } from '@/api/domains'

const props = defineProps<{
  modelValue: CollaborationNeedDiscoveryFilters
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CollaborationNeedDiscoveryFilters]
  submit: []
  reset: []
}>()

const contentFormatOptions: Array<{ value: NeedContentFormat; label: string }> = [
  { value: 'ARTICLE', label: '文章' },
  { value: 'QUESTION', label: '问题' },
  { value: 'GUIDE', label: '指南' },
  { value: 'CHECKLIST', label: '清单' },
  { value: 'RESOURCE', label: '资源' },
]

const sourceTypeOptions: Array<{ value: NeedSourceType; label: string }> = [
  { value: 'COMMUNITY', label: '社区需求' },
  { value: 'POST', label: '帖子来源' },
  { value: 'TOPIC', label: '专题来源' },
  { value: 'ACTIVITY', label: '活动来源' },
  { value: 'EXTERNAL', label: '外部来源' },
  { value: 'SEARCH_GAP', label: '搜索缺口' },
]

const statusOptions: Array<{ value: NeedStatus; label: string }> = [
  { value: 'OPEN', label: '待认领' },
  { value: 'CLAIMED', label: '进行中' },
  { value: 'SUBMITTED', label: '待验收' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CLOSED', label: '已关闭' },
  { value: 'MERGED', label: '已合并' },
]

const parseDomain = (value: string): number | '' => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : ''
}

const update = <K extends keyof CollaborationNeedDiscoveryFilters>(
  key: K,
  value: CollaborationNeedDiscoveryFilters[K],
) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<style scoped>
.need-discovery-filters {
  display: grid;
  grid-template-columns: minmax(12rem, 1.8fr) repeat(5, minmax(7rem, 1fr)) auto auto;
  align-items: end;
  gap: 0.65rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  padding: 0.9rem;
}

.keyword-field,
.filter-field {
  display: grid;
  min-width: 0;
  gap: 0.3rem;
}

.keyword-field > span,
.filter-field > span {
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 750;
}

.filter-field select,
.input-with-icon {
  width: 100%;
  min-height: 2.45rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-2);
  color: var(--text-primary);
}

.filter-field select {
  padding: 0 0.55rem;
}

.input-with-icon {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.6rem;
}

.input-with-icon input {
  width: 100%;
  min-height: 2.35rem;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font-size: 0.82rem;
}

.input-with-icon .icon {
  color: var(--text-muted);
}

.reset-button,
.submit-button {
  display: inline-flex;
  min-height: 2.45rem;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border-radius: var(--radius-control);
  padding: 0 0.7rem;
  font-size: 0.76rem;
  font-weight: 800;
}

.reset-button {
  border: 1px solid var(--border-subtle);
  background: var(--surface);
  color: var(--text-primary);
}

.submit-button {
  border: 1px solid var(--primary-600);
  background: var(--primary-600);
  color: white;
}

.icon {
  width: 1rem;
  height: 1rem;
  flex: none;
}

@media (max-width: 1160px) {
  .need-discovery-filters {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .keyword-field {
    grid-column: span 3;
  }
}

@container (max-width: 980px) {
  .need-discovery-filters {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .keyword-field {
    grid-column: 1 / -1;
  }
}

@container (max-width: 560px) {
  .need-discovery-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .need-discovery-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .keyword-field {
    grid-column: span 2;
  }

  .reset-button,
  .submit-button {
    width: 100%;
  }
}
</style>
