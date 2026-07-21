<template>
  <div class="feed-tabs-shell">
    <div class="feed-tabs-list" role="tablist" :aria-label="ariaLabel">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.value"
        :aria-controls="tab.panelId"
        :disabled="tab.disabled"
        :class="{ 'feed-tab-active': activeTab === tab.value }"
        @click="handleTabChange(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>
    <div v-if="loading" class="feed-tabs-status" role="status" aria-live="polite">
      正在同步你的信息流设置...
    </div>
    <div v-else-if="error" class="feed-tabs-status feed-tabs-status-error" role="alert">
      <span>{{ error }}</span>
      <button type="button" @click="$emit('retry')">重试</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FeedType } from '@/composables/useInfiniteFeed'

interface Tab {
  label: string
  value: FeedType
  disabled?: boolean
  panelId?: string
}

interface Props {
  tabs: Tab[]
  modelValue?: FeedType
  loading?: boolean
  error?: string
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  loading: false,
  error: '',
  ariaLabel: '内容流排序',
})

const emit = defineEmits<{
  'update:modelValue': [value: FeedType]
  retry: []
}>()

const activeTab = computed(() => props.modelValue || props.tabs[0]?.value)

const handleTabChange = (value: FeedType) => {
  if (value === activeTab.value) return
  emit('update:modelValue', value)
}
</script>

<style scoped>
.feed-tabs-shell {
  min-width: 0;
}

.feed-tabs-list {
  display: flex;
  gap: 0.15rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.feed-tabs-list::-webkit-scrollbar {
  display: none;
}

.feed-tabs-list button {
  min-height: 2.25rem;
  flex: 0 0 auto;
  border-radius: 5px;
  padding: 0 0.72rem;
  color: rgb(100 116 139);
  font-size: 0.8125rem;
  font-weight: 800;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.feed-tabs-list button:hover:not(:disabled),
.feed-tabs-list button.feed-tab-active {
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.feed-tabs-list button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.feed-tabs-status {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding-top: 0.55rem;
  color: rgb(100 116 139);
  font-size: 0.75rem;
  font-weight: 700;
}

.feed-tabs-status-error {
  color: rgb(190 24 93);
}

.feed-tabs-status button {
  min-height: 2rem;
  border-radius: 5px;
  border: 1px solid rgb(254 205 211);
  padding: 0 0.6rem;
  color: rgb(190 24 93);
}

.dark .feed-tabs-list button {
  color: rgb(148 163 184);
}

.dark .feed-tabs-list button:hover:not(:disabled),
.dark .feed-tabs-list button.feed-tab-active {
  background: rgb(30 58 138 / 0.35);
  color: rgb(147 197 253);
}

.dark .feed-tabs-status {
  color: rgb(148 163 184);
}

.dark .feed-tabs-status-error,
.dark .feed-tabs-status-error button {
  color: rgb(251 113 133);
}

.dark .feed-tabs-status-error button {
  border-color: rgb(159 18 57 / 0.72);
}
</style>

