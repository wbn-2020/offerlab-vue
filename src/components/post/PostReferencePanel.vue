<template>
  <section class="surface-card p-5" aria-labelledby="post-reference-heading">
    <div class="flex items-start justify-between gap-3">
      <div><h2 id="post-reference-heading" class="font-black">来源与证据</h2><p class="mt-1 text-sm text-slate-500">由作者维护，不代表平台背书。</p></div>
      <button type="button" class="secondary-action" :disabled="loading" @click="load">刷新</button>
    </div>
    <p v-if="highRisk" class="mt-3 text-sm text-amber-700" role="note">来源只说明公开依据，不构成投资建议、专业结论或平台认证。</p>
    <p v-if="error" class="mt-3 text-sm text-red-600" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="mt-3 text-sm" role="status">正在读取来源...</p>
    <p v-else-if="!items.length" class="mt-3 text-sm text-slate-500">作者尚未添加来源。</p>
    <template v-else>
      <div
        class="mt-4 rounded-lg border p-3 text-sm"
        :class="health.tone === 'attention' ? 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40'"
        role="status"
      >
        <p v-if="health.tone === 'attention'" class="text-amber-700">
          作者维护的 {{ health.total }} 条来源中，{{ health.broken }} 条已被作者标记为失效，其余请自行核对。
        </p>
        <p v-else class="text-slate-600 dark:text-slate-300">
          作者维护的 {{ health.total }} 条来源，暂无失效标记。
        </p>
        <p v-if="oldestConfirmedText" class="mt-1 text-xs text-slate-500">其中最早确认于 {{ oldestConfirmedText }}。</p>
        <p class="mt-1 text-xs text-slate-500">来源状态由作者自行维护，平台不代为验证链接是否可访问。</p>
      </div>
      <ul class="mt-4 space-y-3">
        <li v-for="item in items" :key="item.id" class="border-l-2 pl-3" :class="item.referenceStatus === 'BROKEN' ? 'border-amber-300 dark:border-amber-700' : 'border-slate-200 dark:border-slate-700'">
          <a :href="item.url" target="_blank" rel="noopener noreferrer" class="font-semibold text-primary-600">{{ item.title }}</a>
          <p class="text-xs text-slate-500">
            <span>{{ item.sourceDomain }} · {{ item.referenceType }} · </span>
            <span
              :class="item.referenceStatus === 'BROKEN' ? 'font-semibold text-amber-700' : 'text-slate-500'"
              :aria-label="item.referenceStatus === 'BROKEN' ? '该来源已被作者标记为失效' : '该来源由作者维护为有效'"
            >{{ statusLabel(item.referenceStatus) }}</span>
          </p>
          <p v-if="item.note" class="mt-1 text-sm">{{ item.note }}</p>
          <p v-if="item.brokenReason" class="mt-1 text-sm text-amber-700">{{ item.brokenReason }}</p>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getErrorMessage } from '@/api/client'
import { postReferenceApi, type PostReference } from '@/api/postReferences'
import { referenceStatusLabel, summarizeReferenceHealth } from '@/utils/referenceHealth'

const props = defineProps<{ postId: string; highRisk?: boolean }>()
const items = ref<PostReference[]>([])
const loading = ref(false)
const error = ref('')
let loadGeneration = 0
const health = computed(() => summarizeReferenceHealth(items.value))
const statusLabel = referenceStatusLabel
const oldestConfirmedText = computed(() => {
  const iso = health.value.oldestConfirmedAt
  if (!iso) return ''
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('zh-CN')
})
const load = async () => {
  const requestedPostId = props.postId
  const requestGeneration = ++loadGeneration
  loading.value = true
  error.value = ''
  try {
    const response = await postReferenceApi.list(requestedPostId)
    if (requestGeneration !== loadGeneration || props.postId !== requestedPostId) return
    items.value = response.data || []
  } catch (cause) {
    if (requestGeneration !== loadGeneration || props.postId !== requestedPostId) return
    items.value = []
    error.value = getErrorMessage(cause, '来源暂时不可用。')
  } finally {
    if (requestGeneration === loadGeneration && props.postId === requestedPostId) {
      loading.value = false
    }
  }
}
watch(() => props.postId, () => {
  items.value = []
  error.value = ''
  void load()
}, { immediate: true })
</script>
