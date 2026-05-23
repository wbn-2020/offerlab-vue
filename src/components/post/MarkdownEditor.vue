<template>
  <div class="flex flex-col gap-4">
    <!-- Tab 切换 -->
    <div class="flex gap-2 border-b border-slate-200 dark:border-slate-800">
      <button
        @click="activeTab = 'edit'"
        :class="[
          'px-4 py-2 font-medium text-sm transition-colors',
          activeTab === 'edit'
            ? 'text-primary-600 border-b-2 border-primary-600'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        ]"
      >
        编辑
      </button>
      <button
        @click="activeTab = 'preview'"
        :class="[
          'px-4 py-2 font-medium text-sm transition-colors',
          activeTab === 'preview'
            ? 'text-primary-600 border-b-2 border-primary-600'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        ]"
      >
        预览
      </button>
    </div>

    <!-- 编辑模式 -->
    <div v-if="activeTab === 'edit'" class="flex flex-col gap-2">
      <textarea
        v-model="content"
        placeholder="用 Markdown 格式编写内容...&#10;&#10;支持：&#10;# 标题&#10;**粗体** *斜体*&#10;- 列表&#10;`代码` 和 ```代码块```&#10;[链接](url)"
        class="w-full h-96 p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      <div class="text-xs text-slate-500 dark:text-slate-400">
        字数：{{ content.length }} / 50000
      </div>
    </div>

    <!-- 预览模式 -->
    <div v-if="activeTab === 'preview'" class="border border-slate-200 dark:border-slate-800 rounded-lg p-6 bg-white dark:bg-slate-900 min-h-96 prose dark:prose-invert max-w-none">
      <div v-if="!content" class="text-slate-400 dark:text-slate-600 text-center py-12">
        预览内容将显示在这里
      </div>
      <div v-else class="markdown-preview" v-html="renderMarkdown(content)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import MarkdownIt from 'markdown-it'

interface Props {
  modelValue: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const activeTab = ref<'edit' | 'preview'>('edit')

const content = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

const renderMarkdown = (value: string) => md.render(value || '')
</script>

<style scoped>
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
</style>
