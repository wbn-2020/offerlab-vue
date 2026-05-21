<template>
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <div class="text-6xl mb-4">📭</div>
    <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{{ title }}</h3>
    <p class="text-slate-600 dark:text-slate-400 mb-6">{{ description }}</p>
    <button v-if="actionText && actionHref" @click="navigate" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
      {{ actionText }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

interface Props {
  title?: string
  description?: string
  actionText?: string
  actionHref?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '这里还是空的',
  description: '暂时没有内容',
})

const router = useRouter()

const navigate = () => {
  if (props.actionHref) {
    router.push(props.actionHref)
  }
}
</script>
