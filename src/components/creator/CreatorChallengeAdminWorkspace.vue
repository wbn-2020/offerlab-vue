<!-- eslint-disable vue/html-self-closing -->
<template>
  <section id="creator-challenges-admin" class="creator-challenge-admin" aria-label="创作者挑战运营">
    <header class="creator-challenge-admin-header">
      <div>
        <div class="creator-challenge-admin-title">
          <Trophy class="h-5 w-5" />
          <h2>创作者挑战</h2>
        </div>
        <p>仅管理挑战定义和上线状态。完成和徽章授予必须由用户本人公开内容的服务端校验触发。</p>
      </div>
      <button
        type="button"
        class="icon-button"
        title="刷新创作者挑战"
        :disabled="loading || busy || pending"
        @click="loadChallenges"
      >
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
      </button>
    </header>

    <section v-if="!canOperate" class="creator-challenge-admin-state creator-challenge-admin-error" role="alert">
      <ShieldAlert class="h-4 w-4" />
      当前账号缺少 OPS 或管理员权限，服务端不会开放挑战定义和生命周期操作。
    </section>

    <template v-else>
      <div class="creator-challenge-admin-layout">
        <form class="creator-challenge-admin-form" @submit.prevent="saveDraft">
          <div class="form-heading">
            <div>
              <h3>{{ editingId ? '编辑挑战草稿' : '新建挑战草稿' }}</h3>
              <p>发布前可修改；发布后只可下线，避免改变已加入用户的完成条件。</p>
            </div>
            <button
              v-if="editingId"
              type="button"
              class="text-action"
              :disabled="busy || pending"
              @click="resetForm"
            >
              <X class="h-4 w-4" />
              新建草稿
            </button>
          </div>

          <label>
            <span>挑战编码</span>
            <input
              v-model.trim="form.challengeCode"
              class="field-control"
              maxlength="64"
              pattern="[A-Z][A-Z0-9_]{2,63}"
              placeholder="PUBLIC_WRITING_WEEK"
              :disabled="Boolean(editingId) || busy || pending"
              required
            />
            <small>创建后不可修改，仅支持大写字母、数字和下划线。</small>
          </label>

          <label>
            <span>标题</span>
            <input v-model.trim="form.title" class="field-control" maxlength="80" :disabled="busy || pending" required />
          </label>

          <label>
            <span>公开说明</span>
            <textarea
              v-model.trim="form.description"
              class="field-control"
              rows="4"
              maxlength="500"
              :disabled="busy || pending"
              required
            />
          </label>

          <div class="field-grid">
            <label>
              <span>限定频道</span>
              <select v-model="form.domain" class="field-control" :disabled="busy || pending">
                <option value="">不限定频道</option>
                <option v-for="domain in DOMAIN_OPTIONS" :key="domain.value" :value="String(domain.value)">
                  {{ domain.label }}
                </option>
              </select>
            </label>
            <label>
              <span>限定内容类型</span>
              <select v-model="form.postType" class="field-control" :disabled="busy || pending">
                <option value="">不限定内容类型</option>
                <option v-for="contentType in ALL_CONTENT_TYPES" :key="contentType.value" :value="String(contentType.value)">
                  {{ contentType.label }}
                </option>
              </select>
            </label>
          </div>

          <label>
            <span>可选写作模板编码</span>
            <input
              v-model.trim="form.assistTemplateCode"
              class="field-control"
              maxlength="64"
              placeholder="PUBLIC_REFLECTION"
              :disabled="busy || pending"
            />
          </label>

          <div class="field-grid">
            <label>
              <span>开始时间</span>
              <input v-model="form.startsAt" class="field-control" type="datetime-local" :disabled="busy || pending" required />
            </label>
            <label>
              <span>结束时间</span>
              <input v-model="form.endsAt" class="field-control" type="datetime-local" :disabled="busy || pending" required />
            </label>
          </div>

          <p v-if="!reasonReady" class="reason-warning">
            需要先在页面顶部填写至少 2 个字符的操作理由，保存、发布和下线都会写入审计。
          </p>

          <button type="submit" class="primary-button" :disabled="!canSaveDraft">
            <Loader2 v-if="busyKey === 'save'" class="h-4 w-4 animate-spin" />
            <Save v-else class="h-4 w-4" />
            {{ editingId ? '保存草稿' : '创建草稿' }}
          </button>
        </form>

        <section class="creator-challenge-admin-list">
          <div v-if="loading" class="creator-challenge-admin-state" role="status">
            <Loader2 class="h-4 w-4 animate-spin" />
            正在加载挑战定义…
          </div>
          <div v-else-if="error" class="creator-challenge-admin-state creator-challenge-admin-error" role="alert">
            <span>{{ error }}</span>
            <button type="button" class="secondary-button compact" @click="loadChallenges">重试</button>
          </div>
          <div v-else-if="!challenges.length" class="creator-challenge-admin-state">
            <ClipboardList class="h-4 w-4" />
            暂无挑战定义。新建草稿并确认范围、周期和公开说明后，再由 OPS 主动发布。
          </div>
          <article v-for="challenge in challenges" :key="String(challenge.id)" class="creator-challenge-admin-card">
            <div class="creator-challenge-admin-card-head">
              <div class="min-w-0">
                <div class="creator-challenge-admin-card-title">
                  <h3>{{ challenge.title }}</h3>
                  <span :class="['challenge-status', `challenge-status-${statusClass(challenge.status)}`]">
                    {{ statusLabel(challenge.status) }}
                  </span>
                </div>
                <p>{{ challenge.description }}</p>
              </div>
              <span class="challenge-code">{{ challenge.challengeCode }}</span>
            </div>

            <dl class="creator-challenge-admin-meta">
              <div><dt>范围</dt><dd>{{ contentScope(challenge) }}</dd></div>
              <div><dt>周期</dt><dd>{{ formatDateTime(challenge.startsAt) }} 至 {{ formatDateTime(challenge.endsAt) }}</dd></div>
              <div v-if="challenge.assistTemplateCode"><dt>模板</dt><dd>{{ challenge.assistTemplateCode }}</dd></div>
            </dl>

            <div class="creator-challenge-admin-actions">
              <button
                v-if="challenge.status === 'DRAFT'"
                type="button"
                class="secondary-button compact"
                :disabled="busy || pending"
                @click="startEditing(challenge)"
              >
                <Pencil class="h-4 w-4" />
                编辑草稿
              </button>
              <button
                v-if="challenge.status === 'DRAFT'"
                type="button"
                class="primary-button compact"
                :disabled="!canOperateLifecycle"
                @click="publish(challenge)"
              >
                <Loader2 v-if="busyKey === `publish:${challenge.id}`" class="h-4 w-4 animate-spin" />
                <Send v-else class="h-4 w-4" />
                发布
              </button>
              <button
                v-if="challenge.status === 'PUBLISHED'"
                type="button"
                class="secondary-button compact danger-button"
                :disabled="!canOperateLifecycle"
                @click="offline(challenge)"
              >
                <Loader2 v-if="busyKey === `offline:${challenge.id}`" class="h-4 w-4 animate-spin" />
                <Power class="h-4 w-4" />
                下线
              </button>
            </div>
          </article>
        </section>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  ClipboardList,
  Loader2,
  Pencil,
  Power,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  Trophy,
  X,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import {
  creatorChallengesApi,
  type CreatorChallenge,
  type CreatorChallengeAdminCommand,
} from '@/api/creatorChallenges'
import { ALL_CONTENT_TYPES, getContentTypeShortLabel } from '@/utils/contentTypes'
import { DOMAIN_OPTIONS, getDomainLabelSafe } from '@/utils/domains'

const props = withDefaults(defineProps<{
  canOperate: boolean
  operationReason: string
  pending?: boolean
}>(), {
  pending: false,
})

const emit = defineEmits<{
  (event: 'operation-completed'): void
}>()

type ChallengeForm = {
  challengeCode: string
  title: string
  description: string
  domain: string
  postType: string
  assistTemplateCode: string
  startsAt: string
  endsAt: string
}

const challenges = ref<CreatorChallenge[]>([])
const loading = ref(false)
const error = ref('')
const busyKey = ref('')
const editingId = ref<string | null>(null)

const localDateTime = (value: Date) => {
  const offset = value.getTimezoneOffset() * 60_000
  return new Date(value.getTime() - offset).toISOString().slice(0, 16)
}

const defaultForm = (): ChallengeForm => {
  const startsAt = new Date()
  startsAt.setMinutes(startsAt.getMinutes() + 30, 0, 0)
  const endsAt = new Date(startsAt)
  endsAt.setDate(endsAt.getDate() + 7)
  return {
    challengeCode: '',
    title: '',
    description: '',
    domain: '',
    postType: '',
    assistTemplateCode: '',
    startsAt: localDateTime(startsAt),
    endsAt: localDateTime(endsAt),
  }
}

const form = reactive<ChallengeForm>(defaultForm())
const busy = computed(() => Boolean(busyKey.value))
const reasonReady = computed(() => props.operationReason.trim().length >= 2)
const startBeforeEnd = computed(() => {
  const startsAt = Date.parse(form.startsAt)
  const endsAt = Date.parse(form.endsAt)
  return Number.isFinite(startsAt) && Number.isFinite(endsAt) && endsAt > startsAt
})
const challengeCodeReady = computed(() => /^[A-Z][A-Z0-9_]{2,63}$/.test(form.challengeCode.trim().toUpperCase()))
const canSaveDraft = computed(() => props.canOperate
  && !busy.value
  && !props.pending
  && reasonReady.value
  && challengeCodeReady.value
  && form.title.trim().length > 0
  && form.description.trim().length > 0
  && startBeforeEnd.value)
const canOperateLifecycle = computed(() => props.canOperate && !busy.value && !props.pending && reasonReady.value)

const formatDateTime = (value?: string | null) => {
  const timestamp = value ? Date.parse(String(value).replace(' ', 'T')) : Number.NaN
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleString('zh-CN', { hour12: false })
    : '时间未返回'
}

const contentScope = (challenge: CreatorChallenge) => {
  const parts = [
    challenge.domain == null ? '' : getDomainLabelSafe(challenge.domain),
    challenge.postType == null ? '' : getContentTypeShortLabel(challenge.postType),
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : '任意公开内容类型'
}

const statusLabel = (status: string) => ({
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  OFFLINE: '已下线',
}[status] || status || '未知')

const statusClass = (status: string) => ({
  DRAFT: 'pending',
  PUBLISHED: 'ok',
  OFFLINE: 'muted',
}[status] || 'muted')

const apiDateTime = (value: string) => value.length === 16 ? `${value}:00` : value
const positiveInteger = (value: string) => /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : null

const resetForm = () => {
  editingId.value = null
  Object.assign(form, defaultForm())
}

const startEditing = (challenge: CreatorChallenge) => {
  editingId.value = String(challenge.id)
  Object.assign(form, {
    challengeCode: challenge.challengeCode || '',
    title: challenge.title || '',
    description: challenge.description || '',
    domain: challenge.domain == null ? '' : String(challenge.domain),
    postType: challenge.postType == null ? '' : String(challenge.postType),
    assistTemplateCode: challenge.assistTemplateCode || '',
    startsAt: String(challenge.startsAt || '').slice(0, 16),
    endsAt: String(challenge.endsAt || '').slice(0, 16),
  })
}

const loadChallenges = async () => {
  if (!props.canOperate) return
  loading.value = true
  error.value = ''
  try {
    const response = await creatorChallengesApi.listAdminChallenges()
    challenges.value = Array.isArray(response.data) ? response.data : []
  } catch (requestError) {
    error.value = getErrorMessage(requestError, '创作者挑战加载失败')
  } finally {
    loading.value = false
  }
}

const runAction = async (key: string, task: () => Promise<void>, success: string) => {
  if (busy.value || props.pending || !props.canOperate || !reasonReady.value) return
  busyKey.value = key
  try {
    await task()
    await loadChallenges()
    emit('operation-completed')
    toast.success(success)
  } catch (requestError) {
    toast.error(getErrorMessage(requestError, '创作者挑战操作失败'))
  } finally {
    busyKey.value = ''
  }
}

const command = (): CreatorChallengeAdminCommand => ({
  ...(editingId.value ? { id: editingId.value } : {}),
  challengeCode: form.challengeCode.trim().toUpperCase(),
  title: form.title.trim(),
  description: form.description.trim(),
  domain: positiveInteger(form.domain),
  postType: positiveInteger(form.postType),
  assistTemplateCode: form.assistTemplateCode.trim() || null,
  startsAt: apiDateTime(form.startsAt),
  endsAt: apiDateTime(form.endsAt),
  reason: props.operationReason.trim(),
})

const saveDraft = () => {
  if (!canSaveDraft.value) return
  return runAction('save', async () => {
    await creatorChallengesApi.upsert(command())
    resetForm()
  }, editingId.value ? '挑战草稿已更新。' : '挑战草稿已创建。')
}

const publish = (challenge: CreatorChallenge) => runAction(
  `publish:${challenge.id}`,
  async () => { await creatorChallengesApi.publish(challenge.id, { reason: props.operationReason.trim() }) },
  '挑战已发布。',
)

const offline = (challenge: CreatorChallenge) => runAction(
  `offline:${challenge.id}`,
  async () => { await creatorChallengesApi.offline(challenge.id, { reason: props.operationReason.trim() }) },
  '挑战已下线。',
)

watch(() => props.canOperate, (canOperate) => {
  if (canOperate) loadChallenges()
  else challenges.value = []
}, { immediate: true })
</script>

<style scoped>
.creator-challenge-admin {
  border: 1px solid rgb(169 216 195);
  background: rgb(232 243 237);
  padding: 1.1rem;
}

.creator-challenge-admin-header,
.creator-challenge-admin-layout,
.creator-challenge-admin-card-head,
.creator-challenge-admin-card-title,
.creator-challenge-admin-actions,
.creator-challenge-admin-title,
.form-heading {
  display: flex;
  gap: 0.75rem;
}

.creator-challenge-admin-header,
.creator-challenge-admin-card-head,
.form-heading {
  align-items: flex-start;
  justify-content: space-between;
}

.creator-challenge-admin-title {
  align-items: center;
  color: rgb(18 99 74);
}

.creator-challenge-admin-title h2,
.form-heading h3,
.creator-challenge-admin-card h3 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 900;
}

.creator-challenge-admin-header p,
.form-heading p,
.creator-challenge-admin-card p {
  margin: 0.35rem 0 0;
  color: var(--text-primary);
  font-size: 0.8rem;
  line-height: 1.55;
}

.creator-challenge-admin-layout {
  align-items: flex-start;
  margin-top: 1rem;
}

.creator-challenge-admin-form,
.creator-challenge-admin-list {
  min-width: 0;
}

.creator-challenge-admin-form {
  display: grid;
  flex: 0 1 25rem;
  gap: 0.8rem;
  border: 1px solid rgb(169 216 195);
  background: rgb(255 255 255);
  padding: 0.9rem;
}

.creator-challenge-admin-form label {
  display: grid;
  gap: 0.35rem;
  color: var(--text-strong);
  font-size: 0.76rem;
  font-weight: 800;
}

.creator-challenge-admin-form small {
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 500;
}

.creator-challenge-admin-form .field-control {
  width: 100%;
  min-height: 2.35rem;
  border: 1px solid var(--border-subtle);
  background: rgb(255 255 255);
  padding: 0.45rem 0.55rem;
  color: var(--text-strong);
  font-size: 0.82rem;
}

.creator-challenge-admin-form textarea.field-control {
  min-height: 6rem;
  resize: vertical;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.reason-warning {
  margin: 0;
  color: rgb(154 52 18);
  font-size: 0.74rem;
  line-height: 1.5;
}

.creator-challenge-admin-list {
  display: grid;
  flex: 1 1 32rem;
  gap: 0.75rem;
}

.creator-challenge-admin-state {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 4.25rem;
  border: 1px dashed rgb(124 195 165);
  padding: 0.9rem;
  color: var(--text-primary);
  font-size: 0.82rem;
}

.creator-challenge-admin-error {
  border-color: rgb(253 186 116);
  color: rgb(154 52 18);
}

.creator-challenge-admin-card {
  border: 1px solid rgb(169 216 195);
  background: rgb(255 255 255);
  padding: 0.9rem;
}

.creator-challenge-admin-card-title {
  align-items: center;
  flex-wrap: wrap;
}

.challenge-status,
.challenge-code {
  display: inline-flex;
  align-items: center;
  min-height: 1.5rem;
  border: 1px solid var(--border-subtle);
  padding: 0.1rem 0.45rem;
  font-size: 0.7rem;
  font-weight: 800;
}

.challenge-status-ok {
  border-color: rgb(134 239 172);
  background: rgb(240 253 244);
  color: rgb(22 101 52);
}

.challenge-status-pending {
  border-color: rgb(169 216 195);
  background: rgb(232 243 237);
  color: rgb(18 99 74);
}

.challenge-status-muted,
.challenge-code {
  background: var(--surface-soft);
  color: var(--text-primary);
}

.challenge-code {
  max-width: 40%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.creator-challenge-admin-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem 0.8rem;
  margin: 0.85rem 0;
}

.creator-challenge-admin-meta dt {
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 800;
}

.creator-challenge-admin-meta dd {
  margin: 0.2rem 0 0;
  color: var(--text-strong);
  font-size: 0.77rem;
  line-height: 1.45;
}

.creator-challenge-admin-actions {
  align-items: center;
  flex-wrap: wrap;
}

.text-action {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 2.2rem;
  border: 0;
  background: transparent;
  color: rgb(18 99 74);
  font-size: 0.77rem;
  font-weight: 800;
}

.text-action:disabled {
  opacity: 0.5;
}

.danger-button {
  border-color: rgb(253 164 175);
  color: rgb(190 24 93);
}

.dark .creator-challenge-admin {
  border-color: rgb(26 127 90);
  background: rgb(7 31 24);
}

.dark .creator-challenge-admin-form,
.dark .creator-challenge-admin-card,
.dark .creator-challenge-admin-form .field-control {
  border-color: rgb(14 74 55);
  background: var(--surface-1);
  color: var(--text-primary);
}

.dark .creator-challenge-admin-title,
.dark .creator-challenge-admin-title h2,
.dark .form-heading h3,
.dark .creator-challenge-admin-card h3 {
  color: rgb(205 232 220);
}

.dark .creator-challenge-admin-header p,
.dark .form-heading p,
.dark .creator-challenge-admin-card p,
.dark .creator-challenge-admin-form label,
.dark .creator-challenge-admin-meta dd {
  color: var(--text-muted);
}

.dark .challenge-status-muted,
.dark .challenge-code {
  border-color: var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-muted);
}

@media (max-width: 900px) {
  .creator-challenge-admin-layout {
    flex-direction: column;
  }

  .creator-challenge-admin-form,
  .creator-challenge-admin-list {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .field-grid,
  .creator-challenge-admin-meta {
    grid-template-columns: 1fr;
  }

  .challenge-code {
    max-width: 100%;
  }
}
</style>
