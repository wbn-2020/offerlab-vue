<template>
  <div v-if="type === 1" class="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
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

    <!-- 面试结果 -->
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">面试结果</label>
      <select
        v-model.number="localMeta.interviewResult"
        class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        @change="emitUpdate"
      >
        <option :value="0">未选择</option>
        <option :value="1">已 offer</option>
        <option :value="2">待结果</option>
        <option :value="3">已挂</option>
      </select>
    </div>

    <!-- 面试轮次 -->
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">面试轮次</label>
      <input
        v-model.number="localMeta.interviewRounds"
        type="number"
        min="1"
        placeholder="1"
        class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        @input="emitUpdate"
      />
    </div>
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
  ...props.modelValue
})

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    localMeta.value = { ...localMeta.value, ...newVal }
  }
}, { deep: true })

const emitUpdate = () => {
  emit('update:modelValue', localMeta.value)
}
</script>
