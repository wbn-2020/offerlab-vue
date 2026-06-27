<template>
  <article
    :class="[
      'preview-card rounded-[1.5rem] border border-slate-200/90 bg-white/95 p-4 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.45)] backdrop-blur',
      preview.isEmpty ? 'preview-card-empty' : '',
    ]"
  >
    <div class="mb-4 flex items-start justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <span class="preview-pill preview-pill-domain">
          {{ preview.domain.icon }} {{ preview.domain.label }}
        </span>
        <span :class="['preview-pill', preview.anonymous.enabled ? 'preview-pill-anonymous' : 'preview-pill-public']">
          {{ preview.anonymous.label }}
        </span>
      </div>
      <span :class="['preview-series-chip', preview.series.tone === 'accent' ? 'preview-series-chip-active' : 'preview-series-chip-idle']">
        {{ preview.series.selected ? copy.seriesContent : copy.standaloneContent }}
      </span>
    </div>

    <h3 :class="['mb-3 line-clamp-2 text-[1.05rem] font-bold leading-7 text-slate-950', preview.titlePlaceholder ? 'text-slate-400' : '']">
      {{ preview.title }}
    </h3>

    <p :class="['mb-4 line-clamp-4 min-h-[5.5rem] text-sm leading-6 text-slate-600', preview.summaryPlaceholder ? 'text-slate-400' : '']">
      {{ preview.summary }}
    </p>

    <div class="mb-4 flex flex-wrap gap-2">
      <span
        v-for="tag in visibleTags"
        :key="tag"
        class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
      >
        # {{ tag }}
      </span>
      <span v-if="!visibleTags.length" class="rounded-full border border-dashed border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-400">
        {{ copy.pendingTags }}
      </span>
    </div>

    <div class="rounded-2xl bg-slate-50/90 p-3">
      <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
        {{ copy.footerLabel }}
      </p>
      <p class="mt-2 text-sm font-semibold text-slate-800">
        {{ preview.series.title }}
      </p>
      <p class="mt-1 text-xs leading-5 text-slate-500">
        {{ preview.series.description }}
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EditorPreviewModel } from '@/utils/editorPreview'

const copy = {
  seriesContent: '\u7cfb\u5217\u5185\u5bb9',
  standaloneContent: '\u72ec\u7acb\u5185\u5bb9',
  pendingTags: '\u5f85\u8865\u5145\u6807\u7b7e',
  footerLabel: '\u53d1\u5e03\u5361\u7247\u5e95\u90e8\u4fe1\u606f',
} as const

const props = defineProps<{
  preview: EditorPreviewModel
}>()

const visibleTags = computed(() => props.preview.tags.slice(0, 4))
</script>

<style scoped>
.preview-card {
  position: relative;
}

.preview-card::after {
  position: absolute;
  inset: 0;
  border-radius: 1.5rem;
  background:
    radial-gradient(circle at top right, rgb(56 189 248 / 0.16), transparent 34%),
    linear-gradient(180deg, rgb(255 255 255 / 0.35), transparent 18%);
  content: '';
  pointer-events: none;
}

.preview-card-empty::after {
  background:
    radial-gradient(circle at top right, rgb(148 163 184 / 0.2), transparent 34%),
    linear-gradient(180deg, rgb(255 255 255 / 0.3), transparent 18%);
}

.preview-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
}

.preview-pill-domain {
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.preview-pill-anonymous {
  background: rgb(238 242 255);
  color: rgb(79 70 229);
}

.preview-pill-public {
  background: rgb(240 253 244);
  color: rgb(22 101 52);
}

.preview-series-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
}

.preview-series-chip-active {
  background: rgb(254 240 138);
  color: rgb(133 77 14);
}

.preview-series-chip-idle {
  background: rgb(241 245 249);
  color: rgb(71 85 105);
}

.dark .preview-card {
  border-color: rgb(51 65 85 / 0.9);
  background: rgb(15 23 42 / 0.95);
}

.dark .preview-card::after {
  background:
    radial-gradient(circle at top right, rgb(14 165 233 / 0.16), transparent 34%),
    linear-gradient(180deg, rgb(255 255 255 / 0.04), transparent 18%);
}

.dark .preview-card-empty::after {
  background:
    radial-gradient(circle at top right, rgb(100 116 139 / 0.16), transparent 34%),
    linear-gradient(180deg, rgb(255 255 255 / 0.04), transparent 18%);
}

.dark .preview-pill-domain {
  background: rgb(30 64 175 / 0.28);
  color: rgb(191 219 254);
}

.dark .preview-pill-anonymous {
  background: rgb(67 56 202 / 0.24);
  color: rgb(199 210 254);
}

.dark .preview-pill-public {
  background: rgb(21 128 61 / 0.2);
  color: rgb(187 247 208);
}

.dark .preview-series-chip-active {
  background: rgb(120 53 15 / 0.6);
  color: rgb(253 230 138);
}

.dark .preview-series-chip-idle {
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}

.dark .bg-slate-50\/90 {
  background: rgb(15 23 42 / 0.72);
}

.dark .text-slate-950 {
  color: rgb(248 250 252);
}

.dark .text-slate-800 {
  color: rgb(226 232 240);
}

.dark .text-slate-600 {
  color: rgb(148 163 184);
}

.dark .text-slate-500 {
  color: rgb(148 163 184);
}

.dark .border-slate-200 {
  border-color: rgb(51 65 85);
}

.dark .bg-slate-50 {
  background: rgb(30 41 59 / 0.75);
}

.dark .text-slate-400 {
  color: rgb(100 116 139);
}
</style>
