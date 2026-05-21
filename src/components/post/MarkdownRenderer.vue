<template>
  <div
    class="markdown-content text-slate-700 dark:text-slate-300 leading-relaxed"
    v-html="renderedContent"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import 'highlight.js/styles/atom-one-dark.css'

interface Props {
  content: string
}

const props = defineProps<Props>()

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

const renderedContent = computed(() => md.render(props.content || ''))
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
  color: rgb(15 23 42);
}

:deep(.dark .markdown-content h1) {
  color: rgb(226 232 240);
}

:deep(.markdown-content h2) {
  font-size: 22px;
  font-weight: bold;
  margin: 20px 0 12px 0;
  color: rgb(30 41 59);
}

:deep(.dark .markdown-content h2) {
  color: rgb(203 213 225);
}

:deep(.markdown-content h3) {
  font-size: 18px;
  font-weight: bold;
  margin: 16px 0 8px 0;
  color: rgb(51 65 85);
}

:deep(.dark .markdown-content h3) {
  color: rgb(203 213 225);
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
  background-color: rgb(241 245 249);
  color: rgb(15 23 42);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}

:deep(.dark .markdown-content code) {
  background-color: rgb(30 41 59);
  color: rgb(226 232 240);
}

:deep(.markdown-content pre) {
  background-color: rgb(15 23 42);
  color: rgb(226 232 240);
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
  border-left: 4px solid rgb(99 102 241);
  padding-left: 16px;
  margin: 16px 0;
  color: rgb(100 116 139);
  font-style: italic;
}

:deep(.dark .markdown-content blockquote) {
  color: rgb(148 163 184);
}

:deep(.markdown-content table) {
  border-collapse: collapse;
  width: 100%;
  margin: 16px 0;
}

:deep(.markdown-content th),
:deep(.markdown-content td) {
  border: 1px solid rgb(226 232 240);
  padding: 12px;
  text-align: left;
}

:deep(.dark .markdown-content th),
:deep(.dark .markdown-content td) {
  border-color: rgb(51 65 85);
}

:deep(.markdown-content th) {
  background-color: rgb(241 245 249);
  font-weight: bold;
}

:deep(.dark .markdown-content th) {
  background-color: rgb(30 41 59);
}

:deep(.markdown-content a) {
  color: rgb(99 102 241);
  text-decoration: underline;
}

:deep(.markdown-content a:hover) {
  color: rgb(79 70 229);
}

:deep(.dark .markdown-content a) {
  color: rgb(129 140 248);
}

:deep(.dark .markdown-content a:hover) {
  color: rgb(165 180 252);
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
