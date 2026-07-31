<template>
  <section class="contribution-list" data-public-collaboration-contributions>
    <header class="section-header">
      <div class="heading">
        <span class="heading-icon" aria-hidden="true">
          <FileCheck2 class="icon-large" />
        </span>
        <div>
          <p class="eyebrow">协作事实</p>
          <h2>公开贡献记录</h2>
          <p>这里只展示已经发生、允许公开归因的协作事实。</p>
        </div>
      </div>
      <button
        v-if="canLoad"
        type="button"
        class="icon-button"
        title="重新读取公开贡献记录"
        aria-label="重新读取公开贡献记录"
        :disabled="loading"
        @click="load"
      >
        <RefreshCw class="icon" :class="{ spin: loading }" aria-hidden="true" />
      </button>
    </header>

    <section v-if="requiresLogin && !authStore.ready" class="state state-loading" aria-label="正在确认账号状态">
      <Loader2 class="icon spin" aria-hidden="true" />
      <span>正在确认当前账号</span>
    </section>

    <section v-else-if="requiresLogin && !authStore.isLoggedIn" class="state state-login" data-contribution-login>
      <LockKeyhole class="icon-large" aria-hidden="true" />
      <div>
        <strong>登录后查看你的公开贡献记录</strong>
        <p>公开展示范围仍由服务端事实和权限规则决定。</p>
      </div>
      <button type="button" class="primary-button" @click="requireLogin()">
        <LogIn class="icon" aria-hidden="true" />
        登录
      </button>
    </section>

    <template v-else>
      <div v-if="loading" class="fact-skeleton" aria-label="正在读取公开贡献记录">
        <div v-for="item in 3" :key="item" class="skeleton-row">
          <span class="skeleton-dot" />
          <span class="skeleton-line skeleton-line-wide" />
          <span class="skeleton-line" />
        </div>
      </div>

      <section v-else-if="errorText" class="state state-error" data-contribution-state-error>
        <AlertCircle class="icon-large" aria-hidden="true" />
        <div>
          <strong>{{ permissionDenied ? '当前账号没有查看权限' : '公开贡献记录暂时无法读取' }}</strong>
          <p>{{ errorText }}</p>
        </div>
        <button v-if="!permissionDenied" type="button" class="secondary-button" @click="load">
          <RefreshCw class="icon" aria-hidden="true" />
          重试
        </button>
      </section>

      <section v-else-if="!profile || profile.facts.length === 0" class="state state-empty" data-contribution-empty>
        <FileText class="icon-large" aria-hidden="true" />
        <strong>暂时没有可公开展示的协作事实</strong>
        <p>通过审核并允许公开归因的记录会在这里出现。</p>
      </section>

      <template v-else>
        <div class="list-meta">
          <span>已记录 {{ profile.factCount }} 条事实</span>
          <span v-if="profile.truncated">当前仅展示最近一部分记录</span>
          <span v-if="profile.generatedAt">读取于 {{ formatDate(profile.generatedAt) }}</span>
        </div>
        <div v-if="profile.degraded" class="notice notice-warning" data-contribution-degraded>
          <AlertTriangle class="icon" aria-hidden="true" />
          <span>{{ profile.degradationReasons.join('；') || '部分协作来源暂时不可用，当前记录可能不完整。' }}</span>
        </div>
        <ol class="fact-list">
          <li v-for="(fact, index) in profile.facts" :key="factKey(fact, index)" class="fact-row" data-public-contribution-fact>
            <span class="fact-index" aria-hidden="true">{{ index + 1 }}</span>
            <div class="fact-content">
              <div class="fact-title-line">
                <strong>{{ factTypeLabel(fact.factType) }}</strong>
                <span v-if="fact.domain != null" class="fact-domain">领域 {{ fact.domain }}</span>
              </div>
              <p>
                <span v-if="fact.referenceType">关联 {{ fact.referenceType }}</span>
                <span v-if="fact.referenceId != null"> #{{ fact.referenceId }}</span>
                <span v-if="fact.sourceId != null"> · 来源 #{{ fact.sourceId }}</span>
              </p>
            </div>
            <time v-if="fact.occurredAt" :datetime="fact.occurredAt">{{ formatDate(fact.occurredAt) }}</time>
          </li>
        </ol>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import {
  AlertCircle,
  AlertTriangle,
  FileCheck2,
  FileText,
  Loader2,
  LockKeyhole,
  LogIn,
  RefreshCw,
} from 'lucide-vue-next'
import { collaborationAnalyticsApi, type PublicCollaborationContributionFact, type PublicCollaborationContributionProfile } from '@/api/collaborationAnalytics'
import { BizException, getErrorMessage } from '@/api/client'
import type { ApiId } from '@/api/types'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import { useAuthStore } from '@/stores/auth'

const props = withDefaults(defineProps<{
  uid?: ApiId | null
}>(), {
  uid: null,
})

const authStore = useAuthStore()
const { requireLogin } = useLoginRedirect()
const profile = ref<PublicCollaborationContributionProfile | null>(null)
const loading = ref(false)
const errorText = ref('')
const permissionDenied = ref(false)
const accountGeneration = ref(0)
const requestId = ref(0)
let controller: AbortController | null = null
let disposed = false

const targetUid = computed(() => props.uid ?? authStore.user?.uid ?? null)
const requiresLogin = computed(() => props.uid == null)
const currentUid = () => String(authStore.user?.uid ?? '')
const canLoad = computed(() => Boolean(
  targetUid.value != null
  && (!requiresLogin.value || authStore.isLoggedIn),
))

const abortRequest = () => {
  controller?.abort()
  controller = null
}

const clearState = () => {
  profile.value = null
  errorText.value = ''
  permissionDenied.value = false
  loading.value = false
}

const isCurrent = (generation: number, target: string, id: number) => (
  !disposed
  && generation === accountGeneration.value
  && id === requestId.value
  && target === String(targetUid.value ?? '')
)

const load = async () => {
  if (!canLoad.value) {
    clearState()
    return
  }

  const generation = accountGeneration.value
  const targetId = targetUid.value
  if (targetId == null) {
    clearState()
    return
  }
  const target = String(targetId)
  const id = requestId.value + 1
  requestId.value = id
  abortRequest()
  const nextController = new AbortController()
  controller = nextController
  loading.value = true
  errorText.value = ''
  permissionDenied.value = false
  profile.value = null

  try {
    const result = props.uid == null
      ? await collaborationAnalyticsApi.contributions.mine(targetId, { signal: nextController.signal })
      : await collaborationAnalyticsApi.contributions.forUser(targetId, { signal: nextController.signal })
    if (!isCurrent(generation, target, id)) return
    profile.value = result.data
  } catch (error) {
    if (!isCurrent(generation, target, id) || nextController.signal.aborted) return
    permissionDenied.value = error instanceof BizException
      ? error.code === 10403
      : Number((error as { response?: { status?: number } })?.response?.status) === 403
    errorText.value = getErrorMessage(error, '公开贡献记录暂时无法读取')
    profile.value = null
  } finally {
    if (isCurrent(generation, target, id)) loading.value = false
    if (controller === nextController) controller = null
  }
}

const invalidate = () => {
  accountGeneration.value += 1
  requestId.value += 1
  abortRequest()
  clearState()
}

const factKey = (fact: PublicCollaborationContributionFact, index: number) => (
  `${fact.factType}:${String(fact.sourceId ?? 'unknown')}:${String(fact.referenceId ?? 'unknown')}:${index}`
)

const factTypeLabel = (factType: string) => {
  const labels: Record<string, string> = {
    NEED_ACCEPTED: '需求交付已验收',
    SERIES_SUBMISSION_APPROVED: '合集投稿已通过',
    ACTIVITY_SUBMISSION_APPROVED: '共创活动投稿已通过',
    ACTIVITY_SUMMARY_CONTRIBUTION: '共创活动总结贡献',
    CURATION_SUGGESTION_ACCEPTED: '策展建议已通过',
    MAINTENANCE_TASK_COMPLETED: '内容维护任务已完成',
    TRUSTED_CONTENT_SUGGESTION_ACCEPTED: '可信内容补充已通过',
  }
  return labels[factType] || factType
}

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

watch(
  [() => authStore.ready, () => authStore.isLoggedIn, () => authStore.user?.uid, () => authStore.token, () => props.uid],
  () => {
    invalidate()
    if (canLoad.value) void load()
  },
  { immediate: true, flush: 'sync' },
)

onUnmounted(() => {
  disposed = true
  invalidate()
})
</script>

<style scoped>
.contribution-list {
  min-width: 0;
}

.section-header,
.heading,
.state,
.fact-title-line,
.notice,
.list-meta {
  display: flex;
  align-items: center;
}

.section-header {
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.heading {
  min-width: 0;
  align-items: flex-start;
  gap: 0.8rem;
}

.heading-icon {
  display: inline-flex;
  width: 2.6rem;
  height: 2.6rem;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 0.65rem;
  background: var(--primary-50);
  color: var(--primary-700);
}

.eyebrow {
  margin: 0 0 0.15rem;
  color: var(--primary-700);
  font-size: 0.72rem;
  font-weight: 800;
}

.heading h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1.25rem;
  font-weight: 900;
  text-wrap: balance;
}

.heading p:last-child {
  margin: 0.3rem 0 0;
  color: var(--text-muted);
  font-size: 0.82rem;
  line-height: 1.55;
}

.icon,
.icon-large {
  flex: none;
}

.icon {
  width: 1rem;
  height: 1rem;
}

.icon-large {
  width: 1.35rem;
  height: 1.35rem;
}

.icon-button,
.primary-button,
.secondary-button {
  display: inline-flex;
  min-height: 2.4rem;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: var(--radius-control);
  padding: 0 0.7rem;
  font-size: 0.76rem;
  font-weight: 800;
}

.icon-button {
  width: 2.4rem;
  border: 1px solid var(--border-subtle);
  background: var(--surface);
  color: var(--text-primary);
}

.primary-button {
  border: 1px solid var(--primary-600);
  background: var(--primary-600);
  color: white;
}

.secondary-button {
  border: 1px solid var(--border-subtle);
  background: var(--surface);
  color: var(--text-primary);
}

button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.state {
  min-height: 8rem;
  justify-content: center;
  gap: 0.8rem;
  border: 1px dashed var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  padding: 1.4rem;
  color: var(--text-muted);
  text-align: left;
}

.state strong {
  display: block;
  color: var(--text-strong);
  font-size: 0.92rem;
}

.state p {
  margin: 0.3rem 0 0;
  color: var(--text-muted);
  font-size: 0.78rem;
  line-height: 1.55;
}

.state-login {
  justify-content: flex-start;
}

.state-login > .icon-large,
.state-empty > .icon-large {
  color: var(--primary-600);
}

.state-error {
  border-style: solid;
  border-color: rgb(254 202 202);
  color: rgb(185 28 28);
}

.state-error .icon-large {
  color: rgb(220 38 38);
}

.fact-skeleton {
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
}

.skeleton-row {
  display: grid;
  grid-template-columns: 1.5rem minmax(0, 1fr) 5rem;
  align-items: center;
  gap: 0.7rem;
  min-height: 4.4rem;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0.75rem 1rem;
}

.skeleton-row:last-child {
  border-bottom: 0;
}

.skeleton-dot,
.skeleton-line {
  display: block;
  height: 0.8rem;
  border-radius: 0.35rem;
  background: var(--surface-3);
  animation: pulse 1.4s ease-in-out infinite;
}

.skeleton-dot {
  width: 1.25rem;
  height: 1.25rem;
}

.skeleton-line {
  width: 100%;
}

.skeleton-line-wide {
  width: min(20rem, 80%);
}

.list-meta {
  flex-wrap: wrap;
  gap: 0.35rem 0.8rem;
  margin: 0 0 0.7rem;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.list-meta span + span::before {
  content: '·';
  margin-right: 0.8rem;
  color: var(--border-strong);
}

.notice {
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.7rem;
  border: 1px solid rgb(253 230 138);
  border-radius: 0.55rem;
  background: rgb(254 252 232);
  padding: 0.7rem 0.8rem;
  color: rgb(133 77 14);
  font-size: 0.76rem;
  line-height: 1.5;
}

.fact-list {
  overflow: hidden;
  margin: 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  padding: 0;
  list-style: none;
}

.fact-row {
  display: grid;
  grid-template-columns: 1.5rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0.85rem 1rem;
}

.fact-row:last-child {
  border-bottom: 0;
}

.fact-index {
  display: inline-flex;
  width: 1.35rem;
  height: 1.35rem;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--surface-3);
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 800;
}

.fact-content {
  min-width: 0;
}

.fact-title-line {
  flex-wrap: wrap;
  gap: 0.45rem;
}

.fact-title-line strong {
  overflow-wrap: anywhere;
  color: var(--text-strong);
  font-size: 0.84rem;
}

.fact-domain {
  border-radius: 999px;
  background: var(--primary-50);
  padding: 0.16rem 0.45rem;
  color: var(--primary-700);
  font-size: 0.68rem;
  font-weight: 800;
}

.fact-content p {
  overflow-wrap: anywhere;
  margin: 0.25rem 0 0;
  color: var(--text-muted);
  font-size: 0.74rem;
}

.fact-row time {
  color: var(--text-muted);
  font-size: 0.72rem;
  white-space: nowrap;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes pulse {
  50% { opacity: 0.45; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .spin,
  .skeleton-dot,
  .skeleton-line {
    animation: none;
  }
}

@media (max-width: 620px) {
  .state-login {
    flex-wrap: wrap;
  }

  .state-login > div {
    flex: 1 1 calc(100% - 2.5rem);
  }

  .state-login .primary-button {
    margin-left: 2.15rem;
  }

  .fact-row {
    grid-template-columns: 1.5rem minmax(0, 1fr);
  }

  .fact-row time {
    grid-column: 2;
  }
}
</style>
