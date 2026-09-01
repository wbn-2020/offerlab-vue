<template>
  <section class="editor-quality-checklist" :class="[`editor-quality-checklist--${tone}`]">
    <header class="editor-quality-checklist__header">
      <div>
        <p v-if="eyebrow" class="editor-quality-checklist__eyebrow">{{ eyebrow }}</p>
        <h2 class="editor-quality-checklist__title">{{ title }}</h2>
        <p class="editor-quality-checklist__headline">{{ resolvedSummary.headline }}</p>
        <p class="editor-quality-checklist__hint">{{ resolvedSummary.hint }}</p>
      </div>
      <div class="editor-quality-checklist__score">
        <strong>{{ resolvedSummary.completed }}/{{ resolvedSummary.total }}</strong>
        <span>已完成</span>
      </div>
    </header>

    <div class="editor-quality-checklist__meta">
      <span
        v-if="resolvedSummary.blocking"
        class="editor-quality-checklist__meta-pill editor-quality-checklist__meta-pill--blocking"
      >
        边界 {{ resolvedSummary.blocking }}
      </span>
      <span class="editor-quality-checklist__meta-pill">
        待完善 {{ resolvedSummary.needsWork }}
      </span>
      <span class="editor-quality-checklist__meta-pill">
        提示 {{ resolvedSummary.tips }}
      </span>
      <span class="editor-quality-checklist__meta-pill">
        进度 {{ resolvedSummary.progressPercent }}%
      </span>
    </div>

    <div class="editor-quality-checklist__list">
      <article
        v-for="item in checklistItems"
        :key="item.key"
        class="editor-quality-checklist__item"
        :class="`editor-quality-checklist__item--${item.state}`"
      >
        <div class="editor-quality-checklist__item-icon" aria-hidden="true">
          {{ stateSymbol(item.state) }}
        </div>
        <div class="editor-quality-checklist__item-body">
          <div class="editor-quality-checklist__item-topline">
            <strong>{{ item.title }}</strong>
            <span
              v-if="item.required"
              class="editor-quality-checklist__required"
            >
              必填
            </span>
            <span
              v-else
              class="editor-quality-checklist__optional"
            >
              提示
            </span>
          </div>
          <p>{{ item.description }}</p>
        </div>
      </article>
    </div>

    <footer
      v-if="resolvedSummary.nextFocus.length"
      class="editor-quality-checklist__footer"
    >
      <span class="editor-quality-checklist__footer-label">下一步建议</span>
      <div class="editor-quality-checklist__focus-list">
        <span
          v-for="focus in resolvedSummary.nextFocus"
          :key="focus"
          class="editor-quality-checklist__focus-chip"
        >
          {{ focus }}
        </span>
      </div>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import {
  buildEditorQualityChecklist,
  type EditorQualityChecklistInput,
  type EditorQualityChecklistItem,
  type EditorQualityChecklistResult,
  type EditorQualityChecklistState,
  type EditorQualityChecklistSummary,
} from '@/utils/editorQualityChecklist'

interface Props {
  title?: string
  eyebrow?: string
  tone?: 'default' | 'soft'
  input?: EditorQualityChecklistInput | null
  result?: EditorQualityChecklistResult | null
  items?: EditorQualityChecklistItem[]
  summary?: EditorQualityChecklistSummary | null
}

const props = withDefaults(defineProps<Props>(), {
  title: '发布前检查',
  eyebrow: 'Quality Checklist Lite',
  tone: 'default',
  input: null,
  result: null,
  items: () => [],
  summary: null,
})

const fallbackResult = computed<EditorQualityChecklistResult>(() => {
  if (props.result) return props.result
  if (props.items.length && props.summary) {
    return {
      items: props.items,
      summary: props.summary,
      normalized: {
        title: '',
        content: '',
        summary: '',
        plainText: '',
        domain: undefined,
        domainLabel: '',
        tags: [],
        anonymous: false,
        hasSeries: false,
        riskNotice: '',
      },
    }
  }
  return buildEditorQualityChecklist(props.input || {})
})

const checklistItems = computed(() => fallbackResult.value.items)
const resolvedSummary = computed(() => fallbackResult.value.summary)

const stateSymbol = (state: EditorQualityChecklistState) => {
  if (state === 'complete') return '✓'
  if (state === 'blocking') return '×'
  if (state === 'needs-work') return '!'
  return '·'
}
</script>

<style scoped>
.editor-quality-checklist {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 20px;
  background: radial-gradient(circle at top right, rgba(33, 154, 112, 0.12), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), color-mix(in srgb, var(--surface-soft) 94%, transparent));
  padding: 20px;
  color: var(--text-strong);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
}

.editor-quality-checklist--soft {
  background: radial-gradient(circle at top right, rgba(16, 185, 129, 0.1), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 252, 251, 0.96));
}

.editor-quality-checklist__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.editor-quality-checklist__eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(18, 99, 74);
}

.editor-quality-checklist__title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.3;
}

.editor-quality-checklist__headline,
.editor-quality-checklist__hint {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
}

.editor-quality-checklist__score {
  flex-shrink: 0;
  min-width: 92px;
  border-radius: 16px;
  padding: 12px 14px;
  text-align: center;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.editor-quality-checklist__score strong {
  display: block;
  font-size: 24px;
  line-height: 1;
}

.editor-quality-checklist__score span {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-muted);
}

.editor-quality-checklist__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.editor-quality-checklist__meta-pill,
.editor-quality-checklist__focus-chip,
.editor-quality-checklist__required,
.editor-quality-checklist__optional {
  border-radius: 999px;
  font-size: 11px;
  line-height: 1;
  padding: 6px 10px;
}

.editor-quality-checklist__meta-pill {
  background: color-mix(in srgb, var(--surface-2) 90%, transparent);
  color: var(--text-primary);
}

.editor-quality-checklist__meta-pill--blocking {
  background: rgba(254, 226, 226, 0.92);
  color: rgb(185, 28, 28);
}

.editor-quality-checklist__list {
  margin-top: 16px;
  display: grid;
  gap: 10px;
}

.editor-quality-checklist__item {
  display: flex;
  gap: 12px;
  border-radius: 16px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--border-subtle) 78%, transparent);
  background: rgba(255, 255, 255, 0.7);
}

.editor-quality-checklist__item--complete {
  border-color: rgba(16, 185, 129, 0.22);
  background: rgba(236, 253, 245, 0.82);
}

.editor-quality-checklist__item--needs-work {
  border-color: rgba(245, 158, 11, 0.3);
  background: rgba(255, 251, 235, 0.9);
}

.editor-quality-checklist__item--blocking {
  border-color: rgba(220, 38, 38, 0.34);
  background: rgba(254, 242, 242, 0.92);
}

.editor-quality-checklist__item--tip {
  border-color: rgba(33, 154, 112, 0.22);
  background: rgba(232, 243, 237, 0.72);
}

.editor-quality-checklist__item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 999px;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.92);
}

.editor-quality-checklist__item-body {
  min-width: 0;
  flex: 1;
}

.editor-quality-checklist__item-topline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.editor-quality-checklist__item-topline strong {
  font-size: 14px;
  font-weight: 700;
}

.editor-quality-checklist__item-body p {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
}

.editor-quality-checklist__required {
  background: rgba(254, 226, 226, 0.9);
  color: rgb(185, 28, 28);
}

.editor-quality-checklist__optional {
  background: color-mix(in srgb, var(--surface-2) 90%, transparent);
  color: var(--text-primary);
}

.editor-quality-checklist__footer {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid color-mix(in srgb, var(--border-subtle) 72%, transparent);
}

.editor-quality-checklist__footer-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
}

.editor-quality-checklist__focus-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.editor-quality-checklist__focus-chip {
  background: rgba(15, 23, 42, 0.06);
  color: var(--text-strong);
}

.dark .editor-quality-checklist {
  border-color: color-mix(in srgb, var(--border-subtle) 90%, transparent);
  background: radial-gradient(circle at top right, rgba(33, 154, 112, 0.18), transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--surface-1) 96%, transparent), color-mix(in srgb, var(--surface-1) 92%, transparent));
  color: var(--text-primary);
  box-shadow: none;
}

.dark .editor-quality-checklist--soft {
  background: radial-gradient(circle at top right, rgba(16, 185, 129, 0.16), transparent 34%),
    linear-gradient(180deg, color-mix(in srgb, var(--surface-1) 96%, transparent), color-mix(in srgb, var(--surface-1) 92%, transparent));
}

.dark .editor-quality-checklist__eyebrow {
  color: rgb(124, 195, 165);
}

.dark .editor-quality-checklist__headline,
.dark .editor-quality-checklist__hint,
.dark .editor-quality-checklist__item-body p,
.dark .editor-quality-checklist__footer-label,
.dark .editor-quality-checklist__score span {
  color: var(--text-muted);
}

.dark .editor-quality-checklist__score,
.dark .editor-quality-checklist__item,
.dark .editor-quality-checklist__item-icon {
  background: color-mix(in srgb, var(--surface-1) 76%, transparent);
  border-color: color-mix(in srgb, var(--border-subtle) 90%, transparent);
}

.dark .editor-quality-checklist__meta-pill,
.dark .editor-quality-checklist__optional,
.dark .editor-quality-checklist__focus-chip {
  background: color-mix(in srgb, var(--surface-1) 92%, transparent);
  color: var(--text-primary);
}

.dark .editor-quality-checklist__meta-pill--blocking {
  background: rgba(127, 29, 29, 0.75);
  color: rgb(254, 202, 202);
}

.dark .editor-quality-checklist__required {
  background: rgba(127, 29, 29, 0.75);
  color: rgb(254, 202, 202);
}

.dark .editor-quality-checklist__item--complete {
  background: rgba(6, 78, 59, 0.36);
  border-color: rgba(16, 185, 129, 0.38);
}

.dark .editor-quality-checklist__item--needs-work {
  background: rgba(120, 53, 15, 0.34);
  border-color: rgba(245, 158, 11, 0.42);
}

.dark .editor-quality-checklist__item--blocking {
  background: rgba(127, 29, 29, 0.4);
  border-color: rgba(248, 113, 113, 0.42);
}

.dark .editor-quality-checklist__item--tip {
  background: rgba(14, 74, 55, 0.25);
  border-color: rgba(70, 172, 134, 0.32);
}

.dark .editor-quality-checklist__footer {
  border-top-color: color-mix(in srgb, var(--border-subtle) 90%, transparent);
}

@media (max-width: 640px) {
  .editor-quality-checklist {
    padding: 16px;
    border-radius: 18px;
  }

  .editor-quality-checklist__header {
    flex-direction: column;
  }

  .editor-quality-checklist__score {
    width: 100%;
  }
}
</style>
