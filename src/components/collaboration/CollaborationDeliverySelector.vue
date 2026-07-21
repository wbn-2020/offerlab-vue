<template>
  <section class="delivery-selector" data-collaboration-delivery-selector>
    <header class="selector-heading">
      <div>
        <p class="selector-kicker">公开交付</p>
        <h2>{{ title }}</h2>
        <span>{{ description }}</span>
      </div>
      <span v-if="selectedCandidate" class="selected-mark">
        <Check class="icon" aria-hidden="true" />
        已选择
      </span>
    </header>

    <div v-if="!authStore.ready" class="selector-state" aria-label="账号状态加载中">
      <Loader2 class="icon spin" aria-hidden="true" />
      正在确认当前账号…
    </div>

    <div v-else-if="!authStore.isLoggedIn" class="selector-state selector-state-login">
      <LogIn class="icon" aria-hidden="true" />
      <span>登录后才能读取当前任务的候选资源。</span>
      <button type="button" class="primary-action" @click="requireLogin()">
        <LogIn class="icon" aria-hidden="true" />
        登录
      </button>
    </div>

    <template v-else>
      <div v-if="showFilters" class="selector-controls">
        <label class="control-field">
          <span>资源类型</span>
          <select v-model="resolutionType" aria-label="按资源类型筛选">
            <option value="POST">帖子</option>
            <option value="QUESTION">问题</option>
            <option value="SERIES">合集</option>
          </select>
        </label>
        <label class="keyword-field">
          <span>关键词</span>
          <div class="input-with-icon">
            <Search class="icon" aria-hidden="true" />
            <input
              v-model.trim="keyword"
              type="search"
              maxlength="80"
              placeholder="搜索标题"
              aria-label="搜索候选资源标题"
            >
          </div>
        </label>
      </div>

      <div v-if="loading" class="candidate-list" aria-label="候选资源加载中">
        <div v-for="index in 3" :key="index" class="candidate-skeleton">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div v-else-if="initialError" class="selector-state selector-state-error" role="alert">
        <AlertCircle class="icon" aria-hidden="true" />
        <div>
          <strong>候选资源暂时无法读取</strong>
          <p>{{ initialError }}</p>
        </div>
        <button type="button" class="secondary-action" @click="refreshCandidates">
          <RefreshCw class="icon" aria-hidden="true" />
          重试
        </button>
      </div>

      <div v-else-if="!visibleItems.length" class="selector-state">
        <FileSearch class="icon" aria-hidden="true" />
        <div>
          <strong>暂时没有匹配的候选资源</strong>
          <p>{{ emptyDescription }}</p>
        </div>
      </div>

      <div v-else class="candidate-list">
        <div
          v-for="candidate in visibleItems"
          :key="String(candidate.id)"
          class="candidate-row"
          :class="{
            'candidate-row-selected': String(selectedCandidate?.id) === String(candidate.id),
            'candidate-row-disabled': !candidate.eligible,
          }"
        >
          <button
            type="button"
            class="candidate-select"
            :disabled="!candidate.eligible"
            :aria-pressed="candidate.eligible && String(selectedCandidate?.id) === String(candidate.id)"
            @click="selectCandidate(candidate)"
          >
            <span class="candidate-indicator" aria-hidden="true">
              <Check v-if="String(selectedCandidate?.id) === String(candidate.id)" class="icon" />
            </span>
            <span class="candidate-copy">
              <strong>{{ candidate.title }}</strong>
              <span>
                {{ labelNeedResolutionType(candidate.resolutionType) }}
                · {{ domainLabel(candidate.domain, domainLabels) }}
                <template v-if="candidate.postType"> · 类型 {{ candidate.postType }}</template>
              </span>
              <small v-if="!candidate.eligible">
                {{ candidate.ineligibleReason || '当前资源不满足提交条件' }}
              </small>
            </span>
          </button>
          <RouterLink
            v-if="candidate.publicPath && isSafeCollaborationPath(candidate.publicPath)"
            :to="candidate.publicPath"
            class="candidate-link"
            title="查看公开资源"
            aria-label="查看公开资源"
          >
            <ExternalLink class="icon" aria-hidden="true" />
          </RouterLink>
        </div>
      </div>

      <div v-if="loadMoreError" class="selector-more-error" role="alert">
        <span>{{ loadMoreError }}</span>
        <button type="button" class="secondary-action" @click="loadMoreCandidates">
          <RefreshCw class="icon" aria-hidden="true" />
          重试加载更多
        </button>
      </div>
      <button
        v-else-if="hasMore"
        type="button"
        class="load-more"
        :disabled="loadingMore"
        @click="loadMoreCandidates"
      >
        <Loader2 v-if="loadingMore" class="icon spin" aria-hidden="true" />
        <ChevronDown v-else class="icon" aria-hidden="true" />
        {{ loadingMore ? '加载中' : '加载更多候选' }}
      </button>

      <div v-if="selectedCandidate || showCreateAction" class="selector-footer">
        <span v-if="selectedCandidate">已选择：{{ selectedCandidate.title }}</span>
        <span v-else>也可以先创建新的公开内容，再回到需求详情选择交付。</span>
        <RouterLink
          v-if="showCreateAction"
          :to="editorPath"
          class="primary-action"
          @click="emit('create-content', selectedCandidate)"
        >
          <PenLine class="icon" aria-hidden="true" />
          {{ createActionLabel }}
        </RouterLink>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import {
  AlertCircle,
  Check,
  ChevronDown,
  ExternalLink,
  FileSearch,
  Loader2,
  LogIn,
  PenLine,
  RefreshCw,
  Search,
} from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import type { NeedDeliveryCandidate, NeedResolutionType } from '@/api/collaboration'
import type { ApiId } from '@/api/types'
import { useCollaborationDeliveryCandidates } from '@/composables/useCollaborationDeliveryCandidates'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import { useAuthStore } from '@/stores/auth'
import {
  domainLabel,
  isSafeCollaborationPath,
  isSafeCollaborationReturnPath,
  labelNeedResolutionType,
  needDetailPath,
} from '@/utils/collaborationNeedPresentation'
import { localDomainConfigs } from '@/api/domains'

const props = withDefaults(defineProps<{
  needId?: ApiId
  modelValue?: NeedDeliveryCandidate | null
  candidates?: NeedDeliveryCandidate[]
  preferredCandidateId?: ApiId
  returnHref?: string
  initialResolutionType?: NeedResolutionType
  title?: string
  description?: string
  emptyDescription?: string
  showFilters?: boolean
  showCreateAction?: boolean
  createHref?: string
  createActionLabel?: string
}>(), {
  modelValue: null,
  candidates: () => [],
  returnHref: '',
  initialResolutionType: 'POST',
  title: '选择一份可提交的资源',
  description: '候选资格由协作服务端返回，提交时仍会再次校验。',
  emptyDescription: '可以换一种资源类型或关键词；没有候选时不会要求你手填资源编号。',
  showFilters: true,
  showCreateAction: true,
  createHref: '',
  createActionLabel: '基于此需求创建内容',
})

const emit = defineEmits<{
  'update:modelValue': [candidate: NeedDeliveryCandidate | null]
  select: [candidate: NeedDeliveryCandidate]
  'create-content': [candidate: NeedDeliveryCandidate | null]
}>()

const authStore = useAuthStore()
const { requireLogin } = useLoginRedirect()
const resolutionType = ref<NeedResolutionType>(props.initialResolutionType)
const keyword = ref('')
const needIdRef = toRef(props, 'needId')
const resolutionTypeRef = toRef(resolutionType)
const keywordRef = toRef(keyword)
const {
  visibleItems: remoteVisibleItems,
  loading,
  loadingMore,
  initialError,
  loadMoreError,
  hasMore,
  load: refresh,
  loadMore,
} = useCollaborationDeliveryCandidates(needIdRef, {
  resolutionType: resolutionTypeRef,
  keyword: keywordRef,
  enabled: computed(() => Boolean(props.needId)),
})

const refreshCandidates = () => refresh()
const loadMoreCandidates = () => loadMore()

const domainLabels = new Map(localDomainConfigs.map((item) => [Number(item.domain), item.domainName]))
const selectedCandidate = computed(() => props.modelValue || null)
const visibleItems = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  const presetItems = props.candidates.filter((candidate) => (
    (!props.showFilters || candidate.resolutionType === resolutionType.value)
    && (!normalizedKeyword || candidate.title.toLowerCase().includes(normalizedKeyword))
  ))
  const merged = Array.from(
    new Map(
      [...presetItems, ...remoteVisibleItems.value]
        .map((candidate) => [`${candidate.resolutionType}:${String(candidate.id)}`, candidate]),
    ).values(),
  )
  const preferredId = String(props.preferredCandidateId ?? '')
  return preferredId
    ? [...merged].sort((left, right) => Number(String(right.id) === preferredId) - Number(String(left.id) === preferredId))
    : merged
})
const editorPath = computed(() => {
  if (props.createHref) return props.createHref
  if (!props.needId) return '/editor'
  const returnHref = isSafeCollaborationReturnPath(props.returnHref)
    ? props.returnHref!
    : needDetailPath(props.needId)
  const query = new URLSearchParams({
    source: 'collaboration_need',
    action: 'fulfill',
    contextType: 'need',
    needId: String(props.needId),
    returnHref,
  })
  return `/editor?${query.toString()}`
})

const selectCandidate = (candidate: NeedDeliveryCandidate) => {
  if (!candidate.eligible) return
  emit('update:modelValue', candidate)
  emit('select', candidate)
}

</script>

<style scoped>
.delivery-selector {
  min-width: 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  color: var(--text-primary);
}

.selector-heading,
.selector-controls,
.selector-footer,
.selector-state,
.candidate-row,
.selector-more-error {
  display: flex;
  align-items: center;
}

.selector-heading {
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--border-subtle);
  padding: 1.15rem 1.25rem;
}

.selector-kicker {
  margin: 0 0 0.15rem;
  color: var(--primary-600);
  font-size: 0.75rem;
  font-weight: 800;
}

.selector-heading h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1.05rem;
  font-weight: 850;
}

.selector-heading span {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-muted);
  font-size: 0.78rem;
}

.selected-mark {
  display: inline-flex;
  min-height: 1.8rem;
  align-items: center;
  gap: 0.3rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--success) 12%, var(--surface));
  padding: 0.3rem 0.6rem;
  color: var(--success);
  font-size: 0.72rem;
  font-weight: 800;
}

.selector-controls {
  gap: 0.8rem;
  padding: 1rem 1.25rem 0.9rem;
}

.control-field,
.keyword-field {
  display: grid;
  gap: 0.3rem;
}

.control-field {
  width: 8rem;
  flex: none;
}

.keyword-field {
  min-width: 0;
  flex: 1;
}

.control-field > span,
.keyword-field > span {
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 750;
}

.control-field select,
.input-with-icon,
.input-with-icon input {
  min-height: 2.5rem;
}

.control-field select,
.input-with-icon {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-2);
  color: var(--text-primary);
}

.control-field select {
  width: 100%;
  padding: 0 0.6rem;
}

.input-with-icon {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0 0.65rem;
}

.input-with-icon .icon {
  color: var(--text-muted);
}

.input-with-icon input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font-size: 0.82rem;
}

.candidate-list {
  border-top: 1px solid var(--border-subtle);
}

.candidate-row {
  width: 100%;
  gap: 0.7rem;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--surface);
  color: inherit;
}

.candidate-select {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 0.7rem;
  border: 0;
  background: transparent;
  padding: 0.9rem 0 0.9rem 1.25rem;
  color: inherit;
  text-align: left;
}

.candidate-row:has(.candidate-select:not(:disabled)):hover {
  background: var(--surface-2);
}

.candidate-row-selected {
  background: var(--primary-50);
}

.candidate-row-disabled {
  opacity: 0.72;
}

.candidate-select:disabled {
  cursor: not-allowed;
}

.candidate-indicator {
  display: inline-flex;
  width: 1.25rem;
  height: 1.25rem;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-subtle);
  border-radius: 50%;
  color: var(--primary-600);
}

.candidate-row-selected .candidate-indicator {
  border-color: var(--primary-600);
  background: var(--primary-600);
  color: white;
}

.candidate-copy {
  display: grid;
  min-width: 0;
  gap: 0.2rem;
}

.candidate-copy strong {
  overflow-wrap: anywhere;
  color: var(--text-strong);
  font-size: 0.86rem;
}

.candidate-copy > span,
.candidate-copy small {
  color: var(--text-muted);
  font-size: 0.74rem;
  line-height: 1.45;
}

.candidate-copy small {
  color: var(--danger);
}

.candidate-link {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  flex: none;
  align-items: center;
  justify-content: center;
  margin: 0 1.25rem 0 auto;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  color: var(--text-muted);
}

.selector-state {
  min-height: 8rem;
  justify-content: center;
  gap: 0.7rem;
  border-top: 1px solid var(--border-subtle);
  padding: 1.25rem;
  color: var(--text-muted);
}

.selector-state strong {
  display: block;
  color: var(--text-strong);
  font-size: 0.88rem;
}

.selector-state p {
  margin: 0.25rem 0 0;
  font-size: 0.76rem;
  line-height: 1.5;
}

.selector-state-login,
.selector-state-error {
  justify-content: flex-start;
}

.selector-state .primary-action,
.selector-state .secondary-action {
  margin-left: auto;
}

.selector-state-error {
  background: color-mix(in srgb, var(--danger) 8%, var(--surface));
}

.selector-state-error > .icon {
  color: var(--danger);
}

.candidate-skeleton {
  display: grid;
  gap: 0.55rem;
  border-bottom: 1px solid var(--border-subtle);
  padding: 1rem 1.25rem;
  animation: candidate-pulse 1.2s ease-in-out infinite;
}

.candidate-skeleton span {
  display: block;
  width: 26%;
  height: 0.65rem;
  border-radius: 3px;
  background: var(--surface-3);
}

.candidate-skeleton span:nth-child(2) { width: 62%; height: 0.9rem; }
.candidate-skeleton span:nth-child(3) { width: 42%; }

.selector-more-error {
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.8rem 1.25rem 0;
  color: var(--danger);
  font-size: 0.75rem;
}

.load-more {
  display: flex;
  width: calc(100% - 2.5rem);
  min-height: 2.4rem;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin: 0.9rem 1.25rem 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-2);
  color: var(--text-primary);
  font-size: 0.76rem;
  font-weight: 750;
}

.selector-footer {
  justify-content: space-between;
  gap: 0.8rem;
  border-top: 1px solid var(--border-subtle);
  margin-top: 1rem;
  padding: 1rem 1.25rem 1.15rem;
}

.selector-footer > span {
  min-width: 0;
  color: var(--text-muted);
  font-size: 0.76rem;
  overflow-wrap: anywhere;
}

.primary-action,
.secondary-action {
  display: inline-flex;
  min-height: 2.4rem;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: var(--radius-control);
  padding: 0.5rem 0.75rem;
  font-size: 0.76rem;
  font-weight: 800;
}

.primary-action {
  border: 1px solid var(--primary-600);
  background: var(--primary-600);
  color: white;
}

.secondary-action {
  border: 1px solid var(--border-subtle);
  background: var(--surface);
  color: var(--text-primary);
}

.icon {
  width: 1rem;
  height: 1rem;
  flex: none;
}

.spin {
  animation: selector-spin 0.9s linear infinite;
}

@keyframes candidate-pulse {
  50% { opacity: 0.55; }
}

@keyframes selector-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .candidate-skeleton,
  .spin { animation: none; }
}

@media (max-width: 560px) {
  .selector-heading,
  .selector-controls,
  .selector-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .control-field,
  .keyword-field,
  .selector-footer .primary-action,
  .selector-state .primary-action,
  .selector-state .secondary-action {
    width: 100%;
  }

  .selector-state-login,
  .selector-state-error {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .selector-state .primary-action,
  .selector-state .secondary-action {
    margin-left: 0;
  }
}
</style>
