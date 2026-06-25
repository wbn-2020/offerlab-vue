<template>
  <div class="grid grid-cols-1 gap-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-800 sm:grid-cols-2">
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">内容难度</label>
      <select
        v-model="localMeta.difficulty"
        class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        @change="emitUpdate"
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
        placeholder="如：性能优化、部署运维、架构复盘"
        class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        @input="emitUpdate"
      />
    </div>

    <div class="flex flex-col gap-2 sm:col-span-2">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">技术栈</label>
      <input
        v-model="techStackText"
        type="text"
        placeholder="用逗号分隔，如：Spring Boot, Redis, Kafka"
        class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        @input="emitTechStacks"
      />
    </div>

    <div class="flex flex-col gap-2 sm:col-span-2">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">摘要（可选）</label>
      <textarea
        v-model="localMeta.summary"
        rows="3"
        maxlength="240"
        placeholder="用 1-2 句话概括这篇内容，后续可由 AI 辅助生成。"
        class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        @input="emitUpdate"
      />
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
        @input="emitUpdate"
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
        @input="emitUpdate"
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
        @input="emitUpdate"
      />
    </div>

    <!-- 历史结果 -->
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">历史结果</label>
      <select
        v-model.number="localMeta.interviewResult"
        class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        @change="emitUpdate"
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
        @input="emitUpdate"
      />
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

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
}

interface Emits {
  (e: 'update:modelValue', value: PostMetaData): void
}

const props = withDefaults(defineProps<Props>(), {
  type: 0,
  modelValue: () => ({})
})

const emit = defineEmits<Emits>()

const localMeta = ref<PostMetaData>({
  company: '',
  position: '',
  yearsOfExp: 0,
  interviewResult: 0,
  interviewRounds: 1,
  difficulty: '',
  scenario: '',
  techStacks: [],
  summary: '',
  ...props.modelValue
})
const techStackText = ref((props.modelValue?.techStacks || []).join(', '))

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    localMeta.value = { ...localMeta.value, ...newVal }
    techStackText.value = (newVal.techStacks || []).join(', ')
  }
}, { deep: true })

const emitUpdate = () => {
  emit('update:modelValue', localMeta.value)
}

const emitTechStacks = () => {
  localMeta.value.techStacks = techStackText.value
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12)
  emitUpdate()
}
</script>
