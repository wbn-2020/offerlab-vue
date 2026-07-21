<template>
  <section id="outcomes" class="surface-card p-5" aria-labelledby="post-outcome-heading">
    <h2 id="post-outcome-heading" class="font-black">实践结果</h2>
    <p class="mt-1 text-sm text-slate-500">“有效”仅代表参与者的具体经验，不等于内容已被验证。</p>
    <p v-if="summary?.minimumSampleMet" class="mt-3 text-sm" role="status">已有 {{ summary.publicSampleCount }} 条公开样本。</p>
    <p v-else class="mt-3 text-sm text-slate-500">公开样本达到 {{ summary?.minimumSampleSize || 3 }} 条后才展示分布。</p>
    <ul v-if="summary?.minimumSampleMet && summary.samples.length" class="mt-4 grid gap-2">
      <li v-for="sample in summary.samples" :key="sample.id" class="border-l-2 border-slate-200 pl-3 text-sm dark:border-slate-700">
        <strong>{{ outcomeLabel(sample.outcomeType) }}</strong>
        <p>{{ sample.resultNote }}</p>
        <small v-if="sample.contributorUid" class="text-slate-500">贡献者 {{ sample.contributorUid }}</small>
      </li>
    </ul>
    <form v-if="auth.isLoggedIn && !isOwnPost" class="mt-4 grid gap-3" @submit.prevent="save">
      <fieldset class="grid gap-2">
        <legend class="text-sm font-semibold">我的结果</legend>
        <label v-for="option in options" :key="option.value" class="flex items-center gap-2 text-sm">
          <input v-model="draft.outcomeType" type="radio" name="outcome-type" :value="option.value" /> {{ option.label }}
        </label>
      </fieldset>
      <label class="grid gap-1 text-sm"><span>结果说明</span><textarea v-model="draft.resultNote" class="filter-input" maxlength="2000" /></label>
      <label class="grid gap-1 text-sm"><span>公开方式</span><select v-model="draft.visibility" class="filter-input"><option value="PRIVATE">仅自己</option><option value="PUBLIC_ANONYMOUS">匿名申请公开</option><option value="PUBLIC_ATTRIBUTED">署名申请公开</option></select></label>
      <label v-if="requiresRiskAcknowledgement && draft.visibility !== 'PRIVATE'" class="flex items-start gap-2 text-sm">
        <input v-model="riskAcknowledged" type="checkbox">
        <span>我理解这只是个人实践记录，不构成投资建议、收益承诺或专业结论。</span>
      </label>
      <div class="flex gap-2"><button class="primary-action" type="submit" :disabled="saving">保存</button><button v-if="mine" class="secondary-action" type="button" :disabled="saving" @click="withdraw">撤回</button></div>
    </form>
    <p v-if="error" class="mt-3 text-sm text-red-600" role="alert">{{ error }}</p>
    <p v-if="feedback" class="mt-3 text-sm" role="status">{{ feedback }}</p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { getErrorMessage } from '@/api/client'
import { postOutcomeApi, type PostOutcome, type PostOutcomeSummary, type PostOutcomeType, type PostOutcomeVisibility } from '@/api/postOutcomes'
import { useAuthStore } from '@/stores/auth'
const props = defineProps<{ postId: string; isOwnPost: boolean; requiresRiskAcknowledgement?: boolean }>()
const auth = useAuthStore()
const summary = ref<PostOutcomeSummary | null>(null)
const mine = ref<PostOutcome | null>(null)
const saving = ref(false)
const error = ref('')
const feedback = ref('')
const riskAcknowledged = ref(false)
const draft = reactive<{ outcomeType: PostOutcomeType; resultNote: string; visibility: PostOutcomeVisibility }>({ outcomeType: 'TRIED', resultNote: '', visibility: 'PRIVATE' })
const options: Array<{ value: PostOutcomeType; label: string }> = [
  { value: 'TRIED', label: '尝试过' }, { value: 'WORKED', label: '对我有效' }, { value: 'PARTIAL', label: '部分有效' },
  { value: 'DID_NOT_WORK', label: '对我无效' }, { value: 'NOT_APPLICABLE', label: '不适用' },
]
const outcomeLabel = (value: PostOutcomeType) => options.find((item) => item.value === value)?.label || value
const load = async () => {
  error.value = ''
  try {
    summary.value = (await postOutcomeApi.summary(props.postId)).data
    if (auth.isLoggedIn && !props.isOwnPost) {
      mine.value = (await postOutcomeApi.mine(props.postId)).data
      if (mine.value) Object.assign(draft, { outcomeType: mine.value.outcomeType, resultNote: mine.value.resultNote || '', visibility: mine.value.visibility })
    }
  } catch (cause) { error.value = getErrorMessage(cause, '实践结果暂时不可用。') }
}
const save = async () => {
  if (props.requiresRiskAcknowledgement && draft.visibility !== 'PRIVATE' && !riskAcknowledged.value) {
    error.value = '申请公开投资相关实践结果前，请先确认风险说明。'
    return
  }
  saving.value = true; error.value = ''; feedback.value = ''
  try {
    mine.value = (await postOutcomeApi.save(props.postId, {
      ...draft,
      expectedRevision: mine.value?.revision,
      riskAcknowledged: props.requiresRiskAcknowledgement ? riskAcknowledged.value : undefined,
    })).data
    feedback.value = '实践结果已保存。'; await load()
  } catch (cause) { error.value = getErrorMessage(cause, '保存失败。') } finally { saving.value = false }
}
const withdraw = async () => {
  if (!mine.value) return
  saving.value = true
  try { await postOutcomeApi.withdraw(props.postId, mine.value.revision); mine.value = null; feedback.value = '实践结果已撤回。'; await load() } catch (cause) { error.value = getErrorMessage(cause, '撤回失败。') } finally { saving.value = false }
}
onMounted(load)
watch(() => props.postId, load)
</script>
