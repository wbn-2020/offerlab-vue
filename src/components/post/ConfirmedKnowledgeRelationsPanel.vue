<template>
  <section class="surface-card p-5" aria-labelledby="confirmed-relations-heading">
    <h2 id="confirmed-relations-heading" class="font-black">已确认内容关系</h2>
    <p class="mt-1 text-sm text-slate-500">这里只展示已审核且当前可见的帖子关系。</p>
    <p v-if="error" class="mt-3 text-sm text-red-600" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="mt-3 text-sm" role="status">正在读取关系...</p>
    <p v-else-if="!items.length" class="mt-3 text-sm text-slate-500">暂无已确认关系。</p>
    <ul v-else class="mt-4 space-y-3">
      <li v-for="item in items" :key="item.id">
        <RouterLink :to="`/post/${relatedPostId(item)}`" class="font-semibold text-primary-600">{{ relationLabel(item.relationType) }}</RouterLink>
        <p class="text-sm">{{ item.reasonText }}</p>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { getErrorMessage } from '@/api/client'
import { knowledgeRelationApi, type ConfirmedPostRelation } from '@/api/knowledgeRelations'
const props = defineProps<{ postId: string }>()
const items = ref<ConfirmedPostRelation[]>([])
const loading = ref(false)
const error = ref('')
const relatedPostId = (item: ConfirmedPostRelation) => (
  item.sourcePostId === props.postId ? item.targetPostId : item.sourcePostId
)
const relationLabel = (value: ConfirmedPostRelation['relationType']) => ({
  DUPLICATE_OF: '重复内容',
  SUPERSEDES: '后继与替代',
  CONTINUES: '延续内容',
  SUPPLEMENTS: '补充内容',
  PREREQUISITE_OF: '前置内容',
  CONTRADICTS: '观点冲突',
}[value])
const load = async () => {
  loading.value = true
  error.value = ''
  try { items.value = (await knowledgeRelationApi.list(props.postId)).data || [] } catch (cause) { error.value = getErrorMessage(cause, '正式关系暂时不可用。') } finally { loading.value = false }
}
onMounted(load)
watch(() => props.postId, load)
</script>
