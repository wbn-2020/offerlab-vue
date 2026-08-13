<template>
  <div class="grid grid-cols-1 gap-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-800 sm:grid-cols-2">
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">内容难度</label>
      <select
        v-model="localMeta.difficulty"
        class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        @change="emitUpdate('difficulty')"
      >
        <option value="">未选择</option>
        <option value="入门">入门</option>
        <option value="中级">中级</option>
        <option value="进阶">进阶</option>
        <option value="实战">实战</option>
      </select>
    </div>

    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">场景</label>
      <input
        v-model="localMeta.scenario"
        type="text"
        placeholder="如：旅行准备、效率工具、读书复盘"
        class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        @input="emitUpdate('scenario')"
      />
    </div>

    <div class="flex flex-col gap-2 sm:col-span-2">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">关键词/相关工具</label>
      <input
        v-model="techStackText"
        type="text"
        placeholder="用逗号分隔，如：Notion, 清单模板, 周末计划"
        class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        @input="emitTechStacks"
      />
    </div>

    <div class="flex flex-col gap-2 sm:col-span-2">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">摘要（可选）</label>
      <textarea
        v-model="localMeta.summary"
        rows="3"
        :maxlength="EDITOR_LIMITS.summaryMax"
        data-field="summary"
        :aria-invalid="Boolean(errors?.summary)"
        :aria-describedby="errors?.summary ? 'editor-summary-error' : undefined"
        placeholder="用 1-2 句话概括这篇内容，后续可由 AI 辅助生成。"
        class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        @input="emitUpdate('summary')"
      />
      <p v-if="errors?.summary" id="editor-summary-error" class="text-sm text-rose-600 dark:text-rose-300">{{ errors.summary }}</p>
    </div>

    <template v-if="type === 1">
    <!-- 公司 -->
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">公司</label>
      <input
        v-model="localMeta.company"
        type="text"
        placeholder="如：字节跳动"
        class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        @input="emitUpdate('company')"
      />
    </div>

    <!-- 岗位 -->
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">岗位</label>
      <input
        v-model="localMeta.position"
        type="text"
        placeholder="如：Java 后端"
        class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        @input="emitUpdate('position')"
      />
    </div>

    <!-- 年限 -->
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">工作年限</label>
      <input
        v-model.number="localMeta.yearsOfExp"
        type="number"
        min="0"
        max="10"
        placeholder="0-10"
        class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        @input="emitUpdate('yearsOfExp')"
      />
    </div>

    <!-- 历史结果 -->
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">历史结果</label>
      <select
        v-model.number="localMeta.interviewResult"
        class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        @change="emitUpdate('interviewResult')"
      >
        <option :value="0">未选择</option>
        <option :value="1">已通过</option>
        <option :value="2">待反馈</option>
        <option :value="3">未通过</option>
      </select>
    </div>

    <!-- 记录轮次 -->
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">记录轮次</label>
      <input
        v-model.number="localMeta.interviewRounds"
        type="number"
        min="1"
        placeholder="1"
        class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        @input="emitUpdate('interviewRounds')"
      />
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { EDITOR_LIMITS } from '@/utils/editorValidation'

interface PostMetaData {
  company?: string
  position?: string
  yearsOfExp?: number
  interviewResult?: number
  interviewRounds?: number
  difficulty?: string
  scenario?: string
  techStacks?: string[]
  summary?: string
  contentType?: string
}

interface Props {
  modelValue?: PostMetaData
  type?: number
  errors?: Partial<Record<'summary', string>>
}

interface Emits {
  (e: 'update:modelValue', value: PostMetaData): void
  (e: 'field-change', field: keyof PostMetaData): void
}

const props = withDefaults(defineProps<Props>(), {
  type: 0,
  modelValue: () => ({})
})

const emit = defineEmits<Emits>()

const emptyMeta = (): PostMetaData => ({
  company: '',
  position: '',
  yearsOfExp: 0,
  interviewResult: 0,
  interviewRounds: 1,
  difficulty: '',
  scenario: '',
  techStacks: [],
  summary: '',
})

const localMeta = ref<PostMetaData>({
  ...emptyMeta(),
  ...props.modelValue
})
const techStackText = ref((props.modelValue?.techStacks || []).join(', '))

watch(() => props.modelValue, (newVal) => {
  localMeta.value = { ...emptyMeta(), ...(newVal || {}) }
  techStackText.value = (newVal?.techStacks || []).join(', ')
}, { deep: true })

const emitUpdate = (field: keyof PostMetaData) => {
  emit('update:modelValue', {
    ...localMeta.value,
    techStacks: [...(localMeta.value.techStacks || [])],
  })
  emit('field-change', field)
}

const emitTechStacks = () => {
  localMeta.value.techStacks = techStackText.value
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12)
  emitUpdate('techStacks')
}
</script>
