<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- 关注领域 -->
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">关注领域</label>
      <div class="flex gap-2 mb-2">
        <input
          v-model="companyInput"
          type="text"
          placeholder="输入领域名称，按 Enter 添加"
          @keydown.enter="addCompany"
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
          :key="idx"
          class="flex items-center gap-2 px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm"
        >
          {{ company }}
          <button
            type="button"
            @click="removeCompany(idx)"
            class="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <!-- 技术方向 -->
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">技术方向</label>
      <div class="flex gap-2 mb-2">
        <input
          v-model="positionInput"
          type="text"
          placeholder="输入方向名称，按 Enter 添加"
          @keydown.enter="addPosition"
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
          :key="idx"
          class="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
        >
          {{ position }}
          <button
            type="button"
            @click="removePosition(idx)"
            class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <!-- 实战年限 -->
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">实战年限</label>
      <input
        v-model.number="form.yearsOfExp"
        type="number"
        min="0"
        max="10"
        placeholder="0-10"
        class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>

    <!-- 所在城市 -->
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">所在城市</label>
      <input
        v-model="form.expectedCity"
        type="text"
        placeholder="如：北京、上海"
        class="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>

    <!-- 技术栈 -->
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium text-slate-700 dark:text-slate-300">技术栈</label>
      <div class="flex gap-2 mb-2">
        <input
          v-model="techInput"
          type="text"
          placeholder="输入技术名称，按 Enter 添加"
          @keydown.enter="addTech"
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
          :key="idx"
          class="flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-sm"
        >
          {{ tech }}
          <button
            type="button"
            @click="removeTech(idx)"
            class="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <!-- 预算偏好 -->
    <div class="grid grid-cols-3 gap-4">
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

    <!-- 提交按钮 -->
    <div class="flex gap-3 pt-4">
      <button
        type="submit"
        :disabled="isSubmitting"
        class="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {{ isSubmitting ? '保存中...' : '保存关注方向' }}
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
import { ref } from 'vue'

interface IntentForm {
  targetCompanies: string[]
  targetPositions: string[]
  yearsOfExp: number
  expectedCity: string
  techStack: string[]
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

defineProps<Props>()
const emit = defineEmits<Emits>()

const form = ref<IntentForm>({
  targetCompanies: [],
  targetPositions: [],
  yearsOfExp: 0,
  expectedCity: '',
  techStack: [],
  expectedSalaryRange: {
    min: 0,
    max: 0,
    unit: 'K'
  }
})

const companyInput = ref('')
const positionInput = ref('')
const techInput = ref('')
const isSubmitting = ref(false)

const addCompany = () => {
  if (companyInput.value.trim()) {
    form.value.targetCompanies.push(companyInput.value.trim())
    companyInput.value = ''
  }
}

const removeCompany = (idx: number) => {
  form.value.targetCompanies.splice(idx, 1)
}

const addPosition = () => {
  if (positionInput.value.trim()) {
    form.value.targetPositions.push(positionInput.value.trim())
    positionInput.value = ''
  }
}

const removePosition = (idx: number) => {
  form.value.targetPositions.splice(idx, 1)
}

const addTech = () => {
  if (techInput.value.trim()) {
    form.value.techStack.push(techInput.value.trim())
    techInput.value = ''
  }
}

const removeTech = (idx: number) => {
  form.value.techStack.splice(idx, 1)
}

const handleSubmit = async () => {
  isSubmitting.value = true
  try {
    emit('submit', form.value)
  } finally {
    isSubmitting.value = false
  }
}

const resetForm = () => {
  form.value = {
    targetCompanies: [],
    targetPositions: [],
    yearsOfExp: 0,
    expectedCity: '',
    techStack: [],
    expectedSalaryRange: {
      min: 0,
      max: 0,
      unit: 'K'
    }
  }
}
</script>
