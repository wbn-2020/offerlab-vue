<template>
  <section class="editor-preview-panel rounded-[1.75rem] border border-slate-200/90 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.2),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-5 shadow-[0_28px_80px_-44px_rgba(15,23,42,0.45)] dark:border-slate-800/90 dark:bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.16),transparent_36%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))]">
    <div class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-300">
          {{ eyebrow }}
        </p>
        <h2 class="mt-2 text-xl font-bold text-slate-950 dark:text-slate-50">
          {{ title }}
        </h2>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          {{ description }}
        </p>
      </div>
      <span class="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900/70 dark:text-slate-300 dark:ring-slate-700">
        {{ preview.domain.icon }} {{ preview.domain.label }}
      </span>
    </div>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div class="min-w-0">
        <EmptyState
          v-if="preview.isEmpty"
          :title="preview.placeholder.title"
          :description="preview.placeholder.description"
        />
        <EditorPreviewDetails v-else :preview="preview" />
      </div>

      <aside class="preview-device-shell rounded-[1.5rem] border border-slate-200/80 bg-slate-950 p-3 shadow-inner shadow-slate-950/25 dark:border-slate-700/80">
        <div class="mb-3 flex items-center justify-between px-1 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-slate-300">
          <span>{{ copy.mobileCard }}</span>
          <span>{{ preview.isEmpty ? copy.placeholderState : copy.previewState }}</span>
        </div>
        <div class="preview-device-screen rounded-[1.9rem] bg-[linear-gradient(180deg,#f8fafc,#eff6ff_42%,#f8fafc)] p-3 dark:bg-[linear-gradient(180deg,#0f172a,#111827_42%,#020617)]">
          <div class="mx-auto mb-4 h-1.5 w-20 rounded-full bg-slate-300/90 dark:bg-slate-700/80" />
          <EditorPreviewCard :preview="preview" />
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import EditorPreviewCard from '@/components/editor-preview/EditorPreviewCard.vue'
import EditorPreviewDetails from '@/components/editor-preview/EditorPreviewDetails.vue'
import type { EditorPreviewModel } from '@/utils/editorPreview'

const copy = {
  mobileCard: '\u79fb\u52a8\u7aef\u5361\u7247',
  placeholderState: '\u5360\u4f4d\u6001',
  previewState: '\u9884\u89c8\u4e2d',
} as const

withDefaults(defineProps<{
  preview: EditorPreviewModel
  title?: string
  description?: string
  eyebrow?: string
}>(), {
  title: '\u53d1\u5e03\u524d\u9884\u89c8',
  description: '\u8fd9\u91cc\u5c55\u793a\u53d1\u5e03\u540e\u7684\u79fb\u52a8\u7aef\u5361\u7247\u6548\u679c\uff0c\u4ee5\u53ca\u6458\u8981\u3001\u533f\u540d\u548c\u7cfb\u5217\u5f52\u5c5e\u7b49\u5173\u952e\u4fe1\u606f\u3002',
  eyebrow: 'Editor Preview',
})
</script>

<style scoped>
.preview-device-shell {
  position: relative;
}

.preview-device-shell::before {
  position: absolute;
  inset: 0.9rem;
  border-radius: 1.6rem;
  border: 1px solid rgb(255 255 255 / 0.08);
  content: '';
  pointer-events: none;
}

.preview-device-screen {
  min-height: 100%;
}
</style>
