<template>
  <Teleport to="body">
    <div v-if="state.open && state.request" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
      <article
        ref="dialogRef"
        class="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="risk-confirm-title"
        tabindex="-1"
      >
        <header class="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-rose-600 dark:text-rose-300">Risk confirmation</p>
              <h2 id="risk-confirm-title" class="mt-1 text-lg font-bold text-slate-950 dark:text-slate-50">
                {{ state.request.title }}
              </h2>
            </div>
            <div class="flex flex-wrap gap-2">
              <span :class="['risk-pill', levelClass]">{{ levelText }}</span>
              <span :class="['risk-pill', state.request.reversible ? 'risk-reversible' : 'risk-irreversible']">
                {{ state.request.reversible ? '可恢复' : '不可恢复' }}
              </span>
            </div>
          </div>
        </header>

        <section class="space-y-4 px-5 py-4">
          <div class="risk-summary-grid">
            <div class="risk-summary-item">
              <span>影响数量</span>
              <strong>{{ state.request.impactCount }}</strong>
            </div>
            <div class="risk-summary-item">
              <span>对象预览</span>
              <strong>{{ objectCountText }}</strong>
            </div>
          </div>

          <div v-if="state.request.objects?.length" class="risk-section">
            <h3>前 {{ state.request.objects.length }} 个 ID / 对象</h3>
            <div class="risk-object-list">
              <span v-for="item in state.request.objects" :key="item">{{ item }}</span>
            </div>
          </div>

          <div v-if="state.request.context?.length" class="risk-section">
            <h3>筛选 / 上下文</h3>
            <ul class="space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <li v-for="item in state.request.context" :key="item">{{ item }}</li>
            </ul>
          </div>

          <label class="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            {{ noteLabel }}
            <span v-if="requiresNote" class="risk-required">必填</span>
            <textarea
              ref="noteInput"
              v-model.trim="note"
              class="risk-note"
              rows="3"
              :aria-invalid="Boolean(error && requiresNote && !note.trim())"
              aria-describedby="risk-confirm-error"
              :placeholder="notePlaceholder"
            />
          </label>

          <label v-if="confirmationPhrase" class="grid gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            输入确认短语
            <input
              ref="phraseInput"
              v-model.trim="phrase"
              class="risk-phrase"
              :aria-invalid="Boolean(error && phrase.trim() !== confirmationPhrase)"
              aria-describedby="risk-confirm-error"
              :placeholder="confirmationPhrase"
            />
          </label>

          <p v-if="error" id="risk-confirm-error" class="risk-error">{{ error }}</p>
        </section>

        <footer class="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:justify-end">
          <button ref="cancelButton" type="button" class="risk-secondary-button" @click="cancel">
            取消
          </button>
          <button type="button" class="risk-danger-button" @click="confirm">
            {{ state.request.confirmText || '确认执行' }}
          </button>
        </footer>
      </article>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAccessibleDialog } from '@/composables/useAccessibleDialog'
import type { RiskConfirmRequest } from '@/composables/useRiskConfirm'

const props = defineProps<{
  state: {
    open: boolean
    request: RiskConfirmRequest | null
  }
}>()

const emit = defineEmits<{
  confirm: [note: string]
  cancel: []
}>()

const note = ref('')
const phrase = ref('')
const error = ref('')
const dialogRef = ref<HTMLElement | null>(null)
const noteInput = ref<HTMLTextAreaElement | null>(null)
const phraseInput = ref<HTMLInputElement | null>(null)
const cancelButton = ref<HTMLButtonElement | null>(null)

const levelText = computed(() => {
  if (props.state.request?.level === 'critical') return 'CRITICAL'
  if (props.state.request?.level === 'high') return 'HIGH'
  return 'MEDIUM'
})

const levelClass = computed(() => {
  if (props.state.request?.level === 'critical') return 'risk-critical'
  if (props.state.request?.level === 'high') return 'risk-high'
  return 'risk-medium'
})

const objectCountText = computed(() => {
  const count = props.state.request?.objects?.length || 0
  return count > 0 ? `${count} 个` : '无预览'
})

const requiresNote = computed(() => {
  if (!props.state.request) return false
  return props.state.request.requireNote ?? props.state.request.level !== 'medium'
})
const noteLabel = computed(() => props.state.request?.noteLabel || '备注')
const notePlaceholder = computed(() => props.state.request?.notePlaceholder || '记录本次操作原因、工单号或影响范围')
const confirmationPhrase = computed(() => {
  const explicitPhrase = props.state.request?.confirmationPhrase?.trim()
  if (explicitPhrase) return explicitPhrase
  return props.state.request?.level === 'critical' ? 'CONFIRM' : ''
})

const cancel = () => emit('cancel')
const confirm = () => {
  const cleanNote = note.value.trim()
  if (requiresNote.value && !cleanNote) {
    error.value = '请填写本次操作原因或工单号'
    noteInput.value?.focus({ preventScroll: true })
    return
  }
  if (confirmationPhrase.value && phrase.value.trim() !== confirmationPhrase.value) {
    error.value = `请输入确认短语：${confirmationPhrase.value}`
    phraseInput.value?.focus({ preventScroll: true })
    return
  }
  emit('confirm', cleanNote)
}

watch(() => props.state.open, (open) => {
  if (open) {
    note.value = ''
    phrase.value = ''
    error.value = ''
  }
})

useAccessibleDialog(() => props.state.open, {
  close: cancel,
  initialFocus: noteInput,
  dialogRef,
})
</script>

<style scoped>
.risk-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 800;
}

.risk-critical,
.risk-irreversible {
  background: rgb(254 226 226);
  color: rgb(185 28 28);
}

.risk-high {
  background: rgb(255 237 213);
  color: rgb(194 65 12);
}

.risk-medium,
.risk-reversible {
  background: rgb(219 234 254);
  color: rgb(29 78 216);
}

.risk-summary-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.risk-summary-item,
.risk-section {
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.875rem;
}

.risk-summary-item span,
.risk-section h3 {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(100 116 139);
}

.risk-summary-item strong {
  margin-top: 0.35rem;
  display: block;
  font-size: 1.25rem;
  color: rgb(15 23 42);
}

.risk-object-list {
  margin-top: 0.65rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.risk-object-list span {
  max-width: 100%;
  overflow-wrap: anywhere;
  border-radius: 999px;
  background: white;
  padding: 0.25rem 0.6rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(51 65 85);
}

.risk-note {
  width: 100%;
  resize: vertical;
  border-radius: 0.5rem;
  border: 1px solid rgb(203 213 225);
  background: white;
  padding: 0.75rem;
  color: rgb(15 23 42);
  font-size: 0.875rem;
  outline: none;
}

.risk-phrase {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid rgb(203 213 225);
  background: white;
  padding: 0.75rem;
  color: rgb(15 23 42);
  font-size: 0.875rem;
  outline: none;
}

.risk-note:focus {
  border-color: rgb(79 70 229);
  box-shadow: 0 0 0 3px rgb(199 210 254 / 0.8);
}

.risk-phrase:focus {
  border-color: rgb(79 70 229);
  box-shadow: 0 0 0 3px rgb(199 210 254 / 0.8);
}

.risk-required,
.risk-error {
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(220 38 38);
}

.risk-error {
  margin: 0;
}

.risk-secondary-button,
.risk-danger-button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 800;
}

.risk-secondary-button {
  border: 1px solid rgb(226 232 240);
  background: white;
  color: rgb(51 65 85);
}

.risk-danger-button {
  background: rgb(220 38 38);
  color: white;
}

.risk-danger-button:hover {
  background: rgb(185 28 28);
}

@media (max-width: 640px) {
  .risk-summary-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.dark .risk-summary-item,
.dark .risk-section,
.dark .risk-secondary-button,
.dark .risk-note {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .risk-summary-item strong {
  color: rgb(248 250 252);
}

.dark .risk-object-list span {
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}
</style>
