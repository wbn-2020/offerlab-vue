<template>
  <div class="markdown-editor-shell flex flex-col gap-4">
    <!-- Tab 切换 -->
    <div class="markdown-editor-toolbar flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div
        class="markdown-tabs"
        role="tablist"
        aria-label="Markdown 编辑模式"
      >
      <button
        @click="activeTab = 'edit'"
        role="tab"
        :aria-selected="activeTab === 'edit'"
        aria-controls="markdown-editor-panel"
        :class="[
          'markdown-tab-button',
          activeTab === 'edit'
            ? 'markdown-tab-button-active'
            : 'markdown-tab-button-idle'
        ]"
      >
        编辑
      </button>
      <button
        @click="activeTab = 'preview'"
        role="tab"
        :aria-selected="activeTab === 'preview'"
        aria-controls="markdown-preview-panel"
        :class="[
          'markdown-tab-button',
          activeTab === 'preview'
            ? 'markdown-tab-button-active'
            : 'markdown-tab-button-idle'
        ]"
      >
        预览
      </button>
      </div>
      <div :class="['markdown-counter text-xs', content.length > normalizedMaxLength ? 'text-danger' : 'text-slate-500 dark:text-slate-400']">
        字数：{{ content.length }} / {{ normalizedMaxLength }}
      </div>
    </div>

    <!-- 编辑模式 -->
    <div v-if="activeTab === 'edit'" class="flex flex-col gap-2">
      <textarea
        id="markdown-editor-panel"
        v-model="content"
        :maxlength="normalizedMaxLength"
        placeholder="用 Markdown 格式编写内容...&#10;&#10;支持：&#10;# 标题&#10;**粗体** *斜体*&#10;- 列表&#10;`代码` 和 ```代码块```&#10;[链接](url)"
        class="markdown-textarea w-full min-h-[18rem] h-[52vh] max-h-[36rem] sm:h-96 p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-sm leading-6 resize-y focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>

    <!-- 预览模式 -->
    <div id="markdown-preview-panel" v-if="activeTab === 'preview'" class="markdown-preview-panel border border-slate-200 dark:border-slate-800 rounded-lg p-6 bg-white dark:bg-slate-900 min-h-[18rem] sm:min-h-96 prose dark:prose-invert max-w-none">
      <div v-if="!content" class="text-slate-400 dark:text-slate-600 text-center py-12">
        预览内容将显示在这里
      </div>
      <div v-else class="markdown-preview" v-html="renderMarkdown(content)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { renderMarkdown } from '@/utils/markdown'

interface Props {
  modelValue: string
  maxLength?: number
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const activeTab = ref<'edit' | 'preview'>('edit')
const normalizedMaxLength = computed(() => Math.max(1, props.maxLength ?? 50000))

const content = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value.length > normalizedMaxLength.value ? value.slice(0, normalizedMaxLength.value) : value),
})
</script>

<style scoped>
.markdown-editor-toolbar {
  border-bottom: 1px solid rgb(226 232 240);
  padding-bottom: 0.5rem;
}

.dark .markdown-editor-toolbar {
  border-bottom-color: rgb(30 41 59);
}

.markdown-tabs {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.25rem;
  width: min(100%, 16rem);
  border: 1px solid rgb(226 232 240);
  border-radius: 0.5rem;
  background: rgb(248 250 252);
  padding: 0.25rem;
}

.dark .markdown-tabs {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.markdown-tab-button {
  min-height: 2.5rem;
  border-radius: 0.375rem;
  padding: 0 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  transition: color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.markdown-tab-button-active {
  background: #fff;
  color: rgb(37 99 235);
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.08);
}

.markdown-tab-button-idle {
  color: rgb(71 85 105);
}

.markdown-tab-button-idle:hover {
  color: rgb(15 23 42);
}

.dark .markdown-tab-button-active {
  background: rgb(30 41 59);
  color: rgb(96 165 250);
}

.dark .markdown-tab-button-idle {
  color: rgb(148 163 184);
}

.dark .markdown-tab-button-idle:hover {
  color: rgb(226 232 240);
}

.markdown-counter {
  min-height: 1.5rem;
  display: flex;
  align-items: center;
}

.markdown-preview :deep(h1) {
  @apply text-2xl font-bold mt-8 mb-4;
}

.markdown-preview :deep(h2) {
  @apply text-xl font-bold mt-6 mb-3;
}

.markdown-preview :deep(h3) {
  @apply text-lg font-bold mt-4 mb-2;
}

.markdown-preview :deep(p) {
  @apply my-4 leading-relaxed;
}

.markdown-preview :deep(code) {
  @apply bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-sm font-mono;
}

.markdown-preview :deep(ul) {
  @apply list-disc ml-6 my-2;
}

.markdown-preview :deep(li) {
  @apply ml-4;
}

@media (max-width: 640px) {
  .markdown-editor-shell {
    gap: 0.75rem;
  }

  .markdown-editor-toolbar {
    position: sticky;
    top: 0;
    z-index: 5;
    margin-inline: -0.25rem;
    padding: 0.25rem 0.25rem 0.625rem;
    background: rgb(255 255 255 / 0.96);
    backdrop-filter: blur(8px);
  }

  .dark .markdown-editor-toolbar {
    background: rgb(15 23 42 / 0.96);
  }

  .markdown-tabs {
    width: 100%;
  }

  .markdown-counter {
    justify-content: flex-end;
  }

  .markdown-textarea {
    min-height: clamp(16rem, 54dvh, 28rem);
    height: clamp(16rem, 54dvh, 28rem);
    max-height: calc(100dvh - 12rem);
    padding: 0.875rem;
    font-size: 16px;
    line-height: 1.65;
    overflow-y: auto;
  }

  .markdown-preview-panel {
    padding: 1rem;
    min-height: clamp(16rem, 54dvh, 28rem);
    overflow-x: auto;
  }
}
</style>
