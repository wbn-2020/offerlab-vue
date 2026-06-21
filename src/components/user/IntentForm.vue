<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <section class="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/50">
      <div>
        <h3 class="text-sm font-black text-slate-900 dark:text-slate-100">社区兴趣</h3>
        <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          选择你想长期看到的频道、内容标签和阅读偏好，用于首页兴趣推荐。
        </p>
      </div>

      <div class="space-y-3">
        <PreferenceChips
          label="兴趣频道"
          :options="interestTopicOptions"
          v-model="form.interestTopics"
        />
        <PreferenceChips
          label="内容标签"
          :options="interestTagOptions"
          v-model="form.interestTags"
        />
        <PreferenceChips
          label="内容偏好"
          :options="contentPreferenceOptions"
          v-model="form.contentPreferences"
        />
      </div>
    </section>

    <section class="space-y-4">
      <div>
        <h3 class="text-sm font-black text-slate-900 dark:text-slate-100">可选上下文</h3>
        <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          职业、城市和技术栈仍会作为辅助信号，但不再是唯一的推荐依据。
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-slate-700 dark:text-slate-300">关注领域</label>
        <div class="flex gap-2 mb-2">
          <input
            v-model="companyInput"
            type="text"
            placeholder="输入领域或公司名称，按 Enter 添加"
            @keydown.enter.prevent="addCompany"
            class="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="button"
            @click="addCompany"
            class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            添加
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="(company, idx) in form.targetCompanies"
            :key="company"
            class="flex items-center gap-2 px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm"
          >
            {{ company }}
            <button
              type="button"
              @click="removeCompany(idx)"
              class="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
              :aria-label="`移除${company}`"
            >
              x
            </button>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-slate-700 dark:text-slate-300">职业/技术方向</label>
        <div class="flex gap-2 mb-2">
          <input
            v-model="positionInput"
            type="text"
            placeholder="输入方向名称，按 Enter 添加"
            @keydown.enter.prevent="addPosition"
            class="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="button"
            @click="addPosition"
            class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            添加
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="(position, idx) in form.targetPositions"
            :key="position"
            class="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
          >
            {{ position }}
            <button
              type="button"
              @click="removePosition(idx)"
              class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              :aria-label="`移除${position}`"
            >
              x
            </button>
          </div>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">实战年限</label>
          <input
            v-model.number="form.yearsOfExp"
            type="number"
            min="0"
            max="50"
            placeholder="0-50"
            class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">所在城市</label>
          <input
            v-model="form.expectedCity"
            type="text"
            placeholder="如：北京、上海、杭州"
            class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-slate-700 dark:text-slate-300">技术栈</label>
        <div class="flex gap-2 mb-2">
          <input
            v-model="techInput"
            type="text"
            placeholder="输入技术名，按 Enter 添加"
            @keydown.enter.prevent="addTech"
            class="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="button"
            @click="addTech"
            class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            添加
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="(tech, idx) in form.techStack"
            :key="tech"
            class="flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-sm"
          >
            {{ tech }}
            <button
              type="button"
              @click="removeTech(idx)"
              class="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
              :aria-label="`移除${tech}`"
            >
              x
            </button>
          </div>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">最低预算</label>
          <input
            v-model.number="form.expectedSalaryRange.min"
            type="number"
            min="0"
            placeholder="25"
            class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">最高预算</label>
          <input
            v-model.number="form.expectedSalaryRange.max"
            type="number"
            min="0"
            placeholder="40"
            class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-slate-700 dark:text-slate-300">单位</label>
          <select
            v-model="form.expectedSalaryRange.unit"
            class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="K">K</option>
            <option value="W">W</option>
          </select>
        </div>
      </div>
    </section>

    <div class="flex gap-3 pt-4">
      <button
        type="submit"
        :disabled="isSubmitting"
        class="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {{ isSubmitting ? '保存中...' : '保存兴趣设置' }}
      </button>
      <button
        type="button"
        @click="resetForm"
        class="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
      >
        重置
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { defineComponent, h, ref, watch, type PropType } from 'vue'

const interestTopicOptions = ['职场成长', '城市生活', '效率工具', '学习成长', '消费决策', '生活方式']
const interestTagOptions = ['经验复盘', '避坑指南', '清单推荐', '工具分享', '深度讨论', '新手友好']
const contentPreferenceOptions = ['图文笔记', '长文经验', '问答讨论', '趋势观察']

interface IntentForm {
  targetCompanies: string[]
  targetPositions: string[]
  yearsOfExp: number
  expectedCity: string
  techStack: string[]
  interestTopics: string[]
  interestTags: string[]
  contentPreferences: string[]
  expectedSalaryRange: {
    min: number
    max: number
    unit: string
  }
}

interface Props {
  initialData?: Partial<IntentForm>
}

interface Emits {
  (e: 'submit', data: IntentForm): void
}

const PreferenceChips = defineComponent({
  name: 'PreferenceChips',
  props: {
    label: {
      type: String,
      required: true,
    },
    options: {
      type: Array as PropType<string[]>,
      required: true,
    },
    modelValue: {
      type: Array as PropType<string[]>,
      required: true,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const toggle = (option: string) => {
      const selected = props.modelValue.includes(option)
      emit(
        'update:modelValue',
        selected
          ? props.modelValue.filter((item) => item !== option)
          : [...props.modelValue, option],
      )
    }

    return () => h('div', { class: 'space-y-2' }, [
      h('div', { class: 'text-xs font-bold text-slate-600 dark:text-slate-300' }, props.label),
      h('div', { class: 'flex flex-wrap gap-2' }, props.options.map((option) => {
        const selected = props.modelValue.includes(option)
        return h(
          'button',
          {
            key: option,
            type: 'button',
            class: [
              'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
              selected
                ? 'border-primary-300 bg-primary-600 text-white dark:border-primary-500'
                : 'border-slate-200 bg-white text-slate-600 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-primary-700 dark:hover:bg-primary-950/50',
            ],
            'aria-pressed': selected,
            onClick: () => toggle(option),
          },
          option,
        )
      })),
    ])
  },
})

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const createDefaultForm = (): IntentForm => ({
  targetCompanies: [],
  targetPositions: [],
  yearsOfExp: 0,
  expectedCity: '',
  techStack: [],
  interestTopics: [],
  interestTags: [],
  contentPreferences: [],
  expectedSalaryRange: {
    min: 0,
    max: 0,
    unit: 'K',
  },
})

const mergeInitialData = (initialData?: Partial<IntentForm>): IntentForm => {
  const base = createDefaultForm()
  if (!initialData) return base
  return {
    ...base,
    ...initialData,
    targetCompanies: initialData.targetCompanies || [],
    targetPositions: initialData.targetPositions || [],
    techStack: initialData.techStack || [],
    interestTopics: initialData.interestTopics || [],
    interestTags: initialData.interestTags || [],
    contentPreferences: initialData.contentPreferences || [],
    expectedSalaryRange: {
      ...base.expectedSalaryRange,
      ...initialData.expectedSalaryRange,
    },
  }
}

const form = ref<IntentForm>(mergeInitialData(props.initialData))
const companyInput = ref('')
const positionInput = ref('')
const techInput = ref('')
const isSubmitting = ref(false)

watch(
  () => props.initialData,
  (initialData) => {
    form.value = mergeInitialData(initialData)
  },
)

const addUniqueValue = (items: string[], value: string) => {
  const normalized = value.trim()
  if (normalized && !items.includes(normalized)) {
    items.push(normalized)
  }
}

const addCompany = () => {
  addUniqueValue(form.value.targetCompanies, companyInput.value)
  companyInput.value = ''
}

const removeCompany = (idx: number) => {
  form.value.targetCompanies.splice(idx, 1)
}

const addPosition = () => {
  addUniqueValue(form.value.targetPositions, positionInput.value)
  positionInput.value = ''
}

const removePosition = (idx: number) => {
  form.value.targetPositions.splice(idx, 1)
}

const addTech = () => {
  addUniqueValue(form.value.techStack, techInput.value)
  techInput.value = ''
}

const removeTech = (idx: number) => {
  form.value.techStack.splice(idx, 1)
}

const handleSubmit = async () => {
  isSubmitting.value = true
  try {
    emit('submit', {
      ...form.value,
      targetCompanies: [...form.value.targetCompanies],
      targetPositions: [...form.value.targetPositions],
      techStack: [...form.value.techStack],
      interestTopics: [...form.value.interestTopics],
      interestTags: [...form.value.interestTags],
      contentPreferences: [...form.value.contentPreferences],
      expectedSalaryRange: { ...form.value.expectedSalaryRange },
    })
  } finally {
    isSubmitting.value = false
  }
}

const resetForm = () => {
  form.value = createDefaultForm()
}
</script>
