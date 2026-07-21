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
    <ul v-else class="mt-4 space-y-3">
      <li v-for="item in items" :key="item.id" class="border-l-2 border-slate-200 pl-3 dark:border-slate-700">
        <a :href="item.url" target="_blank" rel="noopener noreferrer" class="font-semibold text-primary-600">{{ item.title }}</a>
        <p class="text-xs text-slate-500">{{ item.sourceDomain }} · {{ item.referenceType }} · {{ item.referenceStatus }}</p>
        <p v-if="item.note" class="mt-1 text-sm">{{ item.note }}</p>
        <p v-if="item.brokenReason" class="mt-1 text-sm text-amber-700">{{ item.brokenReason }}</p>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { getErrorMessage } from '@/api/client'
import { postReferenceApi, type PostReference } from '@/api/postReferences'

const props = defineProps<{ postId: string; highRisk?: boolean }>()
const items = ref<PostReference[]>([])
const loading = ref(false)
const error = ref('')
const load = async () => {
  loading.value = true
  error.value = ''
  try { items.value = (await postReferenceApi.list(props.postId)).data || [] } catch (cause) { error.value = getErrorMessage(cause, '来源暂时不可用。') } finally { loading.value = false }
}
onMounted(load)
watch(() => props.postId, load)
</script>
