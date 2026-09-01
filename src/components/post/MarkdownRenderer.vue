<template>
  <div
    class="markdown-content text-slate-700 dark:text-slate-300 leading-relaxed"
    v-html="renderedContent"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@/utils/markdown'
import 'highlight.js/styles/atom-one-dark.css'

interface Props {
  content: string
}

const props = defineProps<Props>()

const renderedContent = computed(() => renderMarkdown(props.content))
</script>

<style scoped>
:deep(.markdown-content) {
  font-size: 15px;
  line-height: 1.7;
}

:deep(.markdown-content h1) {
  font-size: 28px;
  font-weight: bold;
  margin: 24px 0 16px 0;
  color: var(--text-strong);
}

:deep(.dark .markdown-content h1) {
  color: var(--text-primary);
}

:deep(.markdown-content h2) {
  font-size: 22px;
  font-weight: bold;
  margin: 20px 0 12px 0;
  color: var(--text-strong);
}

:deep(.dark .markdown-content h2) {
  color: var(--text-muted);
}

:deep(.markdown-content h3) {
  font-size: 18px;
  font-weight: bold;
  margin: 16px 0 8px 0;
  color: var(--text-primary);
}

:deep(.dark .markdown-content h3) {
  color: var(--text-muted);
}

:deep(.markdown-content p) {
  margin: 12px 0;
}

:deep(.markdown-content ul),
:deep(.markdown-content ol) {
  margin: 12px 0 12px 24px;
}

:deep(.markdown-content li) {
  margin: 6px 0;
}

:deep(.markdown-content code) {
  background-color: var(--surface-soft);
  color: var(--text-strong);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}

:deep(.dark .markdown-content code) {
  background-color: var(--surface-1);
  color: var(--text-primary);
}

:deep(.markdown-content pre) {
  background-color: #0d1a15;
  color: #dbe8e0;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 16px 0;
}

:deep(.markdown-content pre code) {
  background-color: transparent;
  color: inherit;
  padding: 0;
  border-radius: 0;
}

:deep(.markdown-content blockquote) {
  border-left: 3px solid var(--primary-600);
  border-radius: 0 8px 8px 0;
  padding: 2px 16px;
  margin: 16px 0;
  background: var(--brand-soft);
  color: var(--text-muted);
  font-style: normal;
}

:deep(.dark .markdown-content blockquote) {
  color: var(--text-muted);
}

:deep(.markdown-content table) {
  border-collapse: collapse;
  width: 100%;
  margin: 16px 0;
}

:deep(.markdown-content th),
:deep(.markdown-content td) {
  border: 1px solid var(--border-subtle);
  padding: 12px;
  text-align: left;
}

:deep(.dark .markdown-content th),
:deep(.dark .markdown-content td) {
  border-color: var(--border-subtle);
}

:deep(.markdown-content th) {
  background-color: var(--surface-soft);
  font-weight: bold;
}

:deep(.dark .markdown-content th) {
  background-color: var(--surface-1);
}

:deep(.markdown-content a) {
  color: var(--primary-700);
  text-decoration-color: color-mix(in srgb, var(--primary-600) 45%, transparent);
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  text-decoration-line: underline;
}

:deep(.markdown-content a:hover) {
  color: var(--primary-600);
  text-decoration-color: var(--primary-600);
}

:deep(.dark .markdown-content a) {
  color: var(--brand-strong);
}

:deep(.dark .markdown-content a:hover) {
  color: rgb(169 216 195);
}

:deep(.markdown-content img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 16px 0;
}

:deep(.hljs) {
  background-color: transparent;
  color: inherit;
}
</style>
