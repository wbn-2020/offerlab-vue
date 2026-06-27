<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <section class="preview-detail-card sm:col-span-2">
      <p class="preview-detail-label">{{ copy.summaryLabel }}</p>
      <p :class="['mt-2 text-sm leading-6', preview.summaryPlaceholder ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300']">
        {{ preview.summary }}
      </p>
      <span class="preview-inline-note">
        {{ summaryHint }}
      </span>
    </section>

    <section class="preview-detail-card">
      <p class="preview-detail-label">{{ copy.anonymousLabel }}</p>
      <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {{ preview.anonymous.label }}
      </p>
      <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
        {{ preview.anonymous.description }}
      </p>
    </section>

    <section class="preview-detail-card">
      <p class="preview-detail-label">{{ copy.seriesLabel }}</p>
      <p class="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {{ preview.series.title }}
      </p>
      <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
        {{ preview.series.description }}
      </p>
    </section>

    <section class="preview-detail-card sm:col-span-2">
      <p class="preview-detail-label">{{ copy.tagsLabel }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <span
          v-for="tag in preview.tags"
          :key="tag"
          class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          # {{ tag }}
        </span>
        <span
          v-if="!preview.tags.length"
          class="rounded-full border border-dashed border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-400 dark:border-slate-700"
        >
          {{ copy.pendingTags }}
        </span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EditorPreviewModel } from '@/utils/editorPreview'

const copy = {
  summaryLabel: '\u6458\u8981\u9884\u89c8',
  anonymousLabel: '\u533f\u540d\u72b6\u6001',
  seriesLabel: '\u7cfb\u5217\u5f52\u5c5e',
  tagsLabel: '\u6807\u7b7e\u5c55\u793a',
  pendingTags: '\u5f85\u8865\u5145\u6807\u7b7e',
  summaryExplicit: '\u5df2\u4f18\u5148\u4f7f\u7528\u8349\u7a3f\u4e2d\u7684\u663e\u5f0f\u6458\u8981\u6587\u6848\u3002',
  summaryDerived: '\u5f53\u524d\u6458\u8981\u7531\u6b63\u6587\u81ea\u52a8\u63d0\u70bc\uff0c\u7528\u4e8e\u53d1\u5e03\u5361\u7247\u7b2c\u4e00\u5c4f\u5c55\u793a\u3002',
  summaryPlaceholder: '\u8865\u5145\u6b63\u6587\u540e\u4f1a\u81ea\u52a8\u751f\u6210\u6458\u8981\u9884\u89c8\u3002',
} as const

const props = defineProps<{
  preview: EditorPreviewModel
}>()

const summaryHint = computed(() => {
  if (props.preview.summarySource === 'explicit') return copy.summaryExplicit
  if (props.preview.summarySource === 'derived') return copy.summaryDerived
  return copy.summaryPlaceholder
})
</script>

<style scoped>
.preview-detail-card {
  border-radius: 1rem;
  border: 1px solid rgb(226 232 240 / 0.9);
  background: rgb(255 255 255 / 0.86);
  padding: 1rem;
}

.preview-detail-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(100 116 139);
}

.preview-inline-note {
  margin-top: 0.75rem;
  display: inline-flex;
  border-radius: 999px;
  background: rgb(248 250 252);
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgb(71 85 105);
}

.dark .preview-detail-card {
  border-color: rgb(51 65 85 / 0.9);
  background: rgb(15 23 42 / 0.8);
}

.dark .preview-detail-label {
  color: rgb(148 163 184);
}

.dark .preview-inline-note {
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}
</style>
