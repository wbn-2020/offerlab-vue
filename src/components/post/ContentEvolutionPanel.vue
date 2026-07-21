<template>
  <section id="content-evolution" class="space-y-4" aria-label="内容演进">
    <div class="flex items-center justify-between gap-3">
      <div><h2 class="font-black">内容演进</h2><p class="text-sm text-slate-500">审核后的后继、补充、重复和前置关系。</p></div>
      <RouterLink :to="{ path: '/knowledge/explore', query: { assetType: 'post', assetId: postId } }" class="secondary-action">探索</RouterLink>
    </div>
    <ConfirmedKnowledgeRelationsPanel :post-id="postId" />
    <form v-if="auth.isLoggedIn" class="surface-card grid gap-3 p-5" @submit.prevent="submitProposal">
      <div>
        <h3 class="font-bold">提交关系候选</h3>
        <p class="mt-1 text-sm text-slate-500">候选需经审核后才会成为公开确认关系。</p>
      </div>
      <label class="grid gap-1 text-sm">
        <span>目标帖子 ID</span>
        <input v-model.trim="draft.targetPostId" class="filter-input" inputmode="numeric" required>
      </label>
      <label class="grid gap-1 text-sm">
        <span>关系类型</span>
        <select v-model="draft.relationType" class="filter-input">
          <option v-for="option in relationOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <label class="grid gap-1 text-sm">
        <span>判断依据</span>
        <textarea v-model.trim="draft.reasonText" class="filter-input" rows="3" maxlength="2000" required />
      </label>
      <button type="submit" class="primary-action justify-self-start" :disabled="submitting">
        {{ submitting ? '提交中...' : '提交候选' }}
      </button>
      <p v-if="feedback" class="text-sm" role="status">{{ feedback }}</p>
      <p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
    </form>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ConfirmedKnowledgeRelationsPanel from './ConfirmedKnowledgeRelationsPanel.vue'
import { getErrorMessage } from '@/api/client'
import { knowledgeRelationApi, type ConfirmedRelationType } from '@/api/knowledgeRelations'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ postId: string }>()
const auth = useAuthStore()
const submitting = ref(false)
const feedback = ref('')
const error = ref('')
const draft = reactive<{ targetPostId: string; relationType: ConfirmedRelationType; reasonText: string }>({
  targetPostId: '',
  relationType: 'SUPPLEMENTS',
  reasonText: '',
})
const relationOptions: Array<{ value: ConfirmedRelationType; label: string }> = [
  { value: 'SUPPLEMENTS', label: '补充' },
  { value: 'CONTINUES', label: '延续' },
  { value: 'SUPERSEDES', label: '后继或替代' },
  { value: 'DUPLICATE_OF', label: '重复' },
  { value: 'PREREQUISITE_OF', label: '前置' },
  { value: 'CONTRADICTS', label: '观点冲突' },
]
const submitProposal = async () => {
  submitting.value = true
  feedback.value = ''
  error.value = ''
  try {
    await knowledgeRelationApi.propose(props.postId, {
      targetPostId: draft.targetPostId,
      relationType: draft.relationType,
      reasonText: draft.reasonText,
    })
    draft.targetPostId = ''
    draft.reasonText = ''
    feedback.value = '关系候选已提交审核。'
  } catch (cause) {
    error.value = getErrorMessage(cause, '关系候选提交失败。')
  } finally {
    submitting.value = false
  }
}
</script>
