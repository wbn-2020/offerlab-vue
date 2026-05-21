<template>
  <div class="flex gap-2 border-b border-slate-200 dark:border-slate-800">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      @click="handleTabChange(tab.value)"
      :disabled="tab.disabled"
      :class="[
        'px-4 py-3 font-medium text-sm transition-colors border-b-2 disabled:opacity-50 disabled:cursor-not-allowed',
        activeTab === tab.value
          ? 'border-primary-600 text-primary-600'
          : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100',
      ]"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Tab {
  label: string
  value: string
  disabled?: boolean
}

interface Props {
  tabs: Tab[]
  modelValue?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const activeTab = ref(props.modelValue || props.tabs[0]?.value)

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      activeTab.value = newValue
    }
  },
)

const handleTabChange = (value: string) => {
  activeTab.value = value
  emit('update:modelValue', value)
}
</script>

