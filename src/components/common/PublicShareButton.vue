<template>
  <button
    type="button"
    class="public-share-button"
    aria-label="分享公开链接"
    :title="disabled ? disabledReasonText : '分享公开链接'"
    :aria-disabled="disabled"
    :disabled="disabled"
    @click="handleShare"
  >
    <Share2 class="h-4 w-4" />
    <span>{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Share2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { sharePublicLink } from '@/utils/share'

const props = withDefaults(defineProps<{
  title?: string
  text?: string
  canonical: string
  label?: string
  disabled?: boolean
  disabledReason?: string
}>(), {
  title: '',
  text: '',
  label: '分享',
  disabled: false,
  disabledReason: '',
})

const disabledReasonText = computed(() => props.disabledReason || '当前页面不可公开分享')

const handleShare = async () => {
  if (props.disabled) {
    toast.info(disabledReasonText.value)
    return
  }
  const result = await sharePublicLink({
    title: props.title,
    text: props.text,
    canonical: props.canonical,
  })
  if (result.status === 'shared') {
    toast.success('已打开系统分享')
  } else if (result.status === 'copied') {
    toast.success('链接已复制')
  } else if (result.status === 'failed') {
    toast.error('复制失败，可以手动复制地址栏链接')
  }
}
</script>

<style scoped>
.public-share-button {
  display: inline-flex;
  min-height: 40px;
  max-width: 100%;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: white;
  padding: 0.625rem 1rem;
  color: rgb(51 65 85);
  font-size: 0.875rem;
  font-weight: 800;
}

.public-share-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.dark .public-share-button {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

@media (max-width: 640px) {
  .public-share-button {
    width: 100%;
  }
}
</style>
