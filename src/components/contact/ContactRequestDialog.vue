<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
    @click.self="closeDialog"
  >
    <form
      class="contact-dialog w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-request-title"
      @submit.prevent="submitContactRequest"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 id="contact-request-title" class="text-lg font-bold text-slate-950 dark:text-slate-50">联系作者</h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            发给 {{ receiverName || '作者' }} 的一次性联系请求。
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          :disabled="isSubmitting"
          @click="closeDialog"
        >
          关闭
        </button>
      </div>

      <fieldset class="mt-5">
        <legend class="text-sm font-semibold text-slate-800 dark:text-slate-100">选择场景</legend>
        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          <label
            v-for="item in sceneOptions"
            :key="item.value"
            class="contact-scene-option"
            :class="{ 'contact-scene-option--active': form.scene === item.value }"
          >
            <input v-model="form.scene" type="radio" name="contact-scene" :value="item.value" :disabled="isSubmitting || isSubmitted" />
            <span>{{ item.label }}</span>
          </label>
        </div>
      </fieldset>

      <label class="mt-5 block">
        <span class="text-sm font-semibold text-slate-800 dark:text-slate-100">简短说明</span>
        <textarea
          v-model="form.message"
          class="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-primary-900/40"
          rows="4"
          :maxlength="messageMaxLength"
          :disabled="isSubmitting || isSubmitted"
          placeholder="说明你想请教、补充或反馈的内容"
        />
        <span class="mt-1 block text-right text-xs text-slate-400">{{ messageLength }}/{{ messageMaxLength }}</span>
      </label>

      <div class="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
        <p>这是一次联系请求，对方同意前不会开启聊天。</p>
        <p>请勿发送广告、联系方式或骚扰内容。</p>
      </div>

      <p v-if="submitError" class="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
        {{ submitError }}
      </p>
      <p v-else-if="isSubmitted" class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
        已发送，作者可选择是否回应。
      </p>

      <div class="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          :disabled="isSubmitting"
          @click="closeDialog"
        >
          {{ isSubmitted ? '完成' : '取消' }}
        </button>
        <button
          type="submit"
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="!canSubmit"
        >
          {{ isSubmitting ? '发送中...' : isSubmitted ? '已发送' : '发送请求' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import { interactionApi, type ContactRequestScene, type ContactRequestSourceType } from '@/api/interaction'
import type { ApiId } from '@/api/types'

const messageMinLength = 20
const messageMaxLength = 500

const sceneOptions: Array<{ value: ContactRequestScene; label: string }> = [
  { value: 'ask', label: '请教问题' },
  { value: 'supplement', label: '补充资料' },
  { value: 'feedback', label: '内容反馈' },
  { value: 'collaboration', label: '合作讨论' },
]

const props = defineProps<{
  modelValue: boolean
  receiverUid: ApiId
  receiverName?: string
  sourceType: ContactRequestSourceType
  sourceId?: ApiId | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submitted: []
}>()

const form = reactive({
  scene: 'ask' as ContactRequestScene,
  message: '',
})
const isSubmitting = ref(false)
const isSubmitted = ref(false)
const submitError = ref('')

const trimmedMessage = computed(() => form.message.trim())
const messageLength = computed(() => form.message.length)
const canSubmit = computed(() => (
  trimmedMessage.value.length >= messageMinLength
  && trimmedMessage.value.length <= messageMaxLength
  && !isSubmitting.value
  && !isSubmitted.value
))

const resetForm = () => {
  form.scene = 'ask'
  form.message = ''
  isSubmitting.value = false
  isSubmitted.value = false
  submitError.value = ''
}

const closeDialog = () => {
  if (isSubmitting.value) return
  emit('update:modelValue', false)
}

const submitContactRequest = async () => {
  if (!canSubmit.value) return
  isSubmitting.value = true
  submitError.value = ''
  try {
    await interactionApi.createContactRequest({
      receiverUid: props.receiverUid,
      sourceType: props.sourceType,
      sourceId: props.sourceId ?? undefined,
      scene: form.scene,
      message: trimmedMessage.value,
    })
    isSubmitted.value = true
    toast.success('已发送，作者可选择是否回应。')
    emit('submitted')
  } catch (error: any) {
    submitError.value = getErrorMessage(error, '联系请求发送失败')
  } finally {
    isSubmitting.value = false
  }
}

watch(() => props.modelValue, (open) => {
  if (open) resetForm()
})
</script>

<style scoped>
.contact-scene-option {
  display: flex;
  min-height: 2.75rem;
  cursor: pointer;
  align-items: center;
  gap: 0.55rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border-subtle);
  background: var(--surface-soft);
  padding: 0.65rem 0.75rem;
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 700;
}

.contact-scene-option input {
  accent-color: rgb(26 127 90);
}

.contact-scene-option--active {
  border-color: rgb(124 195 165);
  background: rgb(232 243 237);
  color: rgb(18 99 74);
}

.dark .contact-scene-option {
  border-color: var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-muted);
}

.dark .contact-scene-option--active {
  border-color: rgb(124 195 165);
  background: rgb(10 52 39 / 0.45);
  color: rgb(169 216 195);
}
</style>
