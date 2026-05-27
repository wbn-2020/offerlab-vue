<template>
  <div class="surface-card flex flex-col items-center justify-center px-6 py-12 text-center">
    <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:border dark:border-primary-500/20 dark:bg-slate-950/70 dark:text-primary-300">
      <Inbox class="h-7 w-7" />
    </div>
    <h3 class="mb-2 text-lg font-black text-slate-950 dark:text-slate-100">{{ title }}</h3>
    <p class="mb-6 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">{{ description }}</p>
    <button v-if="actionText && actionHref" @click="navigate" class="primary-action">
      {{ actionText }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Inbox } from 'lucide-vue-next'

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
