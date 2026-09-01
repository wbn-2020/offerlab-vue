<template>
  <div class="admin-collaboration-page min-h-screen">
    <AppHeader />
    <main class="mx-auto max-w-7xl min-w-0 px-4 py-6 sm:px-6 sm:py-8">
      <header class="page-header">
        <div>
          <p>Stage 2 治理</p>
          <h1>公共共建治理</h1>
          <span>处理需求待验收产出、频道策展结果，以及合集、活动、讨论和经验交流相关举报与申诉。</span>
        </div>
        <div class="header-actions">
          <RouterLink to="/admin/collaboration/insights" class="secondary-button">
            查看协作洞察
          </RouterLink>
          <button type="button" class="secondary-button" :disabled="loadingAny" @click="refreshAll">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loadingAny }" />刷新队列
          </button>
        </div>
      </header>

      <section class="permission-band" :class="{ danger: permissionError }">
        <ShieldCheck v-if="!permissionError" class="h-5 w-5" />
        <ShieldAlert v-else class="h-5 w-5" />
        <div>
          <strong>{{ permissionError ? '权限核验失败' : permissionLabel }}</strong>
          <p>{{ permissionError || '服务端会按领域审核范围、案件自审限制和状态机再次校验。' }}</p>
        </div>
      </section>

      <section class="reason-band">
        <label>
          <span>{{ activeTab === 'needs' ? '退回修改理由' : '本次审核说明' }}</span>
          <textarea
            v-model.trim="reviewNote"
            class="field-control"
            rows="2"
            maxlength="1000"
            :placeholder="activeTab === 'needs'
              ? '退回修改时填写具体原因；验收通过无需填写。'
              : '通过或驳回前填写依据；成功后自动清空。'"
          />
        </label>
        <span
          :class="[
            'status-pill',
            activeTab === 'needs' || reviewNote.length >= 2 ? 'status-ok' : 'status-warn',
          ]"
        >
          {{ activeTab === 'needs'
            ? (reviewNote.length >= 2 ? '退回理由已填写' : '验收通过可直接操作')
            : (reviewNote.length >= 2 ? '说明已填写' : '说明未填写') }}
        </span>
      </section>

      <nav class="tab-bar" aria-label="共建治理队列">
        <button type="button" :class="{ active: activeTab === 'needs' }" @click="activeTab = 'needs'">
          <FileCheck2 class="h-4 w-4" />需求验收
        </button>
        <button type="button" :class="{ active: activeTab === 'curation' }" @click="activeTab = 'curation'">
          <ListChecks class="h-4 w-4" />策展审核
        </button>
        <button type="button" :class="{ active: activeTab === 'knowledge-relations' }" @click="activeTab = 'knowledge-relations'">
          <GitFork class="h-4 w-4" />知识关系
        </button>
        <button v-if="canReviewCases" type="button" :class="{ active: activeTab === 'cases' }" @click="activeTab = 'cases'">
          <ShieldAlert class="h-4 w-4" />举报与申诉
        </button>
      </nav>

      <section v-if="activeTab === 'needs'" class="queue-panel" data-need-review-queue>
        <div class="panel-heading">
          <div>
            <h2>需求待验收队列</h2>
            <p>仅展示认领者已提交的需求；验收通过后才会完成需求并结算贡献。</p>
          </div>
          <div class="filters">
            <select
              v-model.number="needDomain"
              class="field-control compact-control"
              aria-label="按领域筛选待验收需求"
              @change="loadNeedQueue()"
            >
              <option v-if="!isDomainOnlyModerator" value="">全部领域</option>
              <option
                v-for="domain in curationDomains"
                :key="domain.domain"
                :value="domain.domain"
              >
                {{ domain.domainName }}
              </option>
            </select>
          </div>
        </div>
        <QueueState
          :loading="needState.loading"
          :error="needState.error"
          :empty="needItems.length === 0"
          @retry="loadNeedQueue()"
        />
        <div v-if="!needState.loading && !needState.error" class="dense-list">
          <article v-for="item in needItems" :key="String(item.id)" class="dense-row">
            <div class="row-main">
              <div class="row-title">
                <span class="status-pill status-warn">待验收</span>
                <span class="meta-chip">{{ domainLabel(item.domain) }}</span>
                <strong>{{ item.title }}</strong>
              </div>
              <p>{{ item.description }}</p>
              <small>
                需求 #{{ item.id }}
                · 创建者 {{ item.creatorUid }}
                · 认领者 {{ item.submittedByUid || item.claimedByUid || '未知' }}
                · {{ submissionTargetLabel(item) }}
              </small>
              <small v-if="item.submissionNote">提交说明：{{ item.submissionNote }}</small>
              <small v-if="item.submittedAt">提交于 {{ formatDate(item.submittedAt) }}</small>
              <RouterLink
                :to="`/collaboration/needs/${item.id}`"
                class="submission-link"
              >
                查看需求详情
              </RouterLink>
            </div>
            <div class="row-actions">
              <span
                v-if="isSelfSubmittedNeed(item)"
                class="self-review-hint"
                role="note"
              >
                <ShieldAlert class="h-4 w-4" aria-hidden="true" />
                不能验收自己的提交
              </span>
              <template v-else>
                <button
                  type="button"
                  class="primary-button compact"
                  :disabled="!canAcceptNeed"
                  @click="reviewNeed(item, 'ACCEPT')"
                >
                  <Check class="h-4 w-4" />验收通过
                </button>
                <button
                  type="button"
                  class="danger-button compact"
                  :disabled="!canRejectNeed"
                  @click="reviewNeed(item, 'REJECT')"
                >
                  <X class="h-4 w-4" />退回修改
                </button>
              </template>
            </div>
          </article>
        </div>
        <button
          v-if="needState.hasMore && !needState.loading"
          type="button"
          class="secondary-button queue-more"
          :disabled="needState.loadingMore"
          @click="loadNeedQueue(true)"
        >
          <Loader2
            v-if="needState.loadingMore"
            class="h-4 w-4 animate-spin"
            aria-hidden="true"
          />
          {{ needState.loadingMore ? '加载中' : '加载更多待验收需求' }}
        </button>
      </section>

      <section v-else-if="activeTab === 'curation'" class="queue-panel">
        <div class="panel-heading">
          <div><h2>策展审核队列</h2><p>通过后会显示实际收录对象或待执行维护任务，不只停留在审核状态。</p></div>
          <div class="filters">
            <select v-model.number="curationFilters.domain" class="field-control compact-control" @change="loadCuration">
              <option v-if="!isDomainOnlyModerator" value="">全部领域</option>
              <option v-for="domain in curationDomains" :key="domain.domain" :value="domain.domain">{{ domain.domainName }}</option>
            </select>
            <select v-model="curationFilters.status" class="field-control compact-control" @change="loadCuration">
              <option value="PENDING">待审核</option><option value="APPROVED">已通过</option><option value="REJECTED">已拒绝</option><option value="">全部</option>
            </select>
          </div>
        </div>
        <QueueState :loading="curationState.loading" :error="curationState.error" :empty="curationItems.length === 0" @retry="loadCuration" />
        <div v-if="!curationState.loading && !curationState.error" class="dense-list">
          <article v-for="item in curationItems" :key="String(item.id)" class="dense-row">
            <div class="row-main">
              <div class="row-title">
                <span :class="['status-pill', statusClass(item.reviewStatus)]">{{ statusLabel(item.reviewStatus) }}</span>
                <span class="meta-chip">{{ domainLabel(item.domain) }}</span>
                <strong>{{ item.topicName || `话题 #${item.topicId}` }}</strong>
              </div>
              <p>{{ item.rationale }}</p>
              <small>建议 #{{ item.id }} · 帖子 #{{ item.postId }} · 提交人 {{ item.submitterUid }} · {{ item.suggestionType }}</small>
              <small v-if="item.resultType">结果：{{ item.resultType }}<template v-if="item.resultId"> #{{ item.resultId }}</template> · {{ item.resultStatus || '待确认' }}</small>
              <small v-if="item.reviewNote">审核说明：{{ item.reviewNote }}</small>
            </div>
            <div v-if="item.reviewStatus === 'PENDING'" class="row-actions">
              <button type="button" class="primary-button compact" :disabled="!canReview" @click="reviewCuration(item.id, 'APPROVED')"><Check class="h-4 w-4" />通过</button>
              <button type="button" class="danger-button compact" :disabled="!canReview" @click="reviewCuration(item.id, 'REJECTED')"><X class="h-4 w-4" />拒绝</button>
            </div>
          </article>
        </div>
      </section>

      <section v-else-if="activeTab === 'knowledge-relations'" class="queue-panel" data-knowledge-relation-review-queue>
        <div class="panel-heading">
          <div>
            <h2>知识关系审核队列</h2>
            <p>核对文章之间的延续、补充、前置、替代、重复或矛盾关系；通过或拒绝会同步更新关系状态。</p>
          </div>
          <div class="filters">
            <select
              v-model="knowledgeRelationFilters.status"
              class="field-control compact-control"
              aria-label="按状态筛选知识关系"
              @change="loadKnowledgeRelations"
            >
              <option value="pending">待处理</option>
              <option value="claimed">已认领</option>
              <option value="approved">已通过</option>
              <option value="rejected">已拒绝</option>
              <option value="closed">已关闭</option>
              <option value="">全部状态</option>
            </select>
            <select
              v-model="knowledgeRelationFilters.riskLevel"
              class="field-control compact-control"
              aria-label="按风险筛选知识关系"
              @change="loadKnowledgeRelations"
            >
              <option value="">全部风险</option>
              <option value="high">高风险</option>
              <option value="medium">中风险</option>
              <option value="low">低风险</option>
            </select>
          </div>
        </div>
        <QueueState
          :loading="knowledgeRelationState.loading"
          :error="knowledgeRelationState.error"
          :empty="knowledgeRelationRows.length === 0"
          @retry="loadKnowledgeRelations"
        />
        <div v-if="!knowledgeRelationState.loading && !knowledgeRelationState.error" class="dense-list">
          <article v-for="row in knowledgeRelationRows" :key="String(row.item.id)" class="dense-row">
            <div class="row-main">
              <div class="row-title">
                <span :class="['status-pill', knowledgeRelationStatusClass(row.item.queueStatus)]">
                  {{ knowledgeRelationStatusLabel(row.item.queueStatus) }}
                </span>
                <span :class="['status-pill', knowledgeRelationRiskClass(row.item.riskLevel)]">
                  {{ knowledgeRelationRiskLabel(row.item.riskLevel) }}
                </span>
                <span v-if="row.item.domain" class="meta-chip">{{ domainLabel(row.item.domain) }}</span>
                <strong>{{ knowledgeRelationTypeLabel(row.meta.relationType) }}</strong>
              </div>
              <div class="relation-route">
                <RouterLink
                  v-if="row.meta.sourcePostId"
                  :to="`/post/${row.meta.sourcePostId}`"
                  class="relation-post-link"
                >
                  {{ row.meta.sourceTitle || `文章 #${row.meta.sourcePostId}` }}
                </RouterLink>
                <span v-else>源文章待确认</span>
                <ArrowRight class="h-4 w-4 relation-arrow" aria-hidden="true" />
                <RouterLink
                  v-if="row.meta.targetPostId"
                  :to="`/post/${row.meta.targetPostId}`"
                  class="relation-post-link"
                >
                  {{ row.meta.targetTitle || `文章 #${row.meta.targetPostId}` }}
                </RouterLink>
                <span v-else>目标文章待确认</span>
              </div>
              <p>{{ row.item.summary || '未提供关系依据。' }}</p>
              <small>
                队列 #{{ row.item.id }}
                · 关系提案 #{{ row.item.sourceId || '未知' }}
                · 提议人 {{ row.item.creatorUid || '未知' }}
                · {{ formatDate(row.item.createTime) }}
              </small>
              <small v-if="row.item.assigneeUid">认领人 {{ row.item.assigneeUid }}</small>
              <small v-if="row.item.handleNote">处理说明：{{ row.item.handleNote }}</small>
            </div>
            <div class="row-actions">
              <span
                v-if="isSelfProposedKnowledgeRelation(row.item)"
                class="self-review-hint"
                role="note"
              >
                <ShieldAlert class="h-4 w-4" aria-hidden="true" />
                不能审核自己的关系提案
              </span>
              <button
                v-if="canKnowledgeRelationAction(row.item, 'claim')"
                type="button"
                class="secondary-button compact"
                :disabled="Boolean(pendingAction)"
                @click="handleKnowledgeRelationAction(row.item, 'claim')"
              >
                <Hand class="h-4 w-4" />认领
              </button>
              <button
                v-if="canKnowledgeRelationAction(row.item, 'release')"
                type="button"
                class="secondary-button compact"
                :disabled="Boolean(pendingAction)"
                @click="handleKnowledgeRelationAction(row.item, 'release')"
              >
                <Undo2 class="h-4 w-4" />释放
              </button>
              <button
                v-if="canKnowledgeRelationAction(row.item, 'approve')"
                type="button"
                class="primary-button compact"
                :disabled="!canReview"
                @click="handleKnowledgeRelationAction(row.item, 'approve')"
              >
                <Check class="h-4 w-4" />通过
              </button>
              <button
                v-if="canKnowledgeRelationAction(row.item, 'reject')"
                type="button"
                class="danger-button compact"
                :disabled="!canReview"
                @click="handleKnowledgeRelationAction(row.item, 'reject')"
              >
                <X class="h-4 w-4" />拒绝
              </button>
              <span
                v-if="isKnowledgeRelationClaimedByOther(row.item)"
                class="self-review-hint"
                role="note"
              >
                <ShieldCheck class="h-4 w-4" aria-hidden="true" />
                已由审核员 {{ row.item.assigneeUid }} 认领
              </span>
            </div>
          </article>
        </div>
      </section>

      <section v-else class="queue-panel">
        <div class="panel-heading">
          <div><h2>共建案件队列</h2><p>包括经验交流时段、预约与反馈案件。禁止审核自己提交的案件，申诉会校验原案件与对象归属。</p></div>
          <select v-model="caseStatus" class="field-control compact-control" @change="loadCases">
            <option value="PENDING">待审核</option><option value="UPHELD">已支持</option><option value="REJECTED">已驳回</option><option value="CLOSED">已关闭</option><option value="OVERTURNED">已推翻</option><option value="">全部</option>
          </select>
        </div>
        <QueueState :loading="caseState.loading" :error="caseState.error" :empty="caseItems.length === 0" @retry="loadCases" />
        <div v-if="!caseState.loading && !caseState.error" class="dense-list">
          <article v-for="item in caseItems" :key="String(item.id)" class="dense-row">
            <div class="row-main">
              <div class="row-title">
                <span :class="['status-pill', statusClass(item.status)]">{{ statusLabel(item.status) }}</span>
                <span class="meta-chip">{{ item.caseType === 'REPORT' ? '举报' : '申诉' }}</span>
                <strong>{{ targetLabel(item.targetType) }} #{{ item.targetId }}</strong>
              </div>
              <p>{{ item.detail }}</p>
              <small>案件 #{{ item.id }} · 提交人 {{ item.submitterUid }} · 原因 {{ item.reasonCode }}<template v-if="item.parentCaseId"> · 原案件 #{{ item.parentCaseId }}</template></small>
              <small v-if="item.reviewNote">审核说明：{{ item.reviewNote }}</small>
            </div>
            <div v-if="item.status === 'PENDING'" class="row-actions">
              <button type="button" class="primary-button compact" :disabled="!canReview" @click="reviewCase(item.id, 'UPHELD')"><Check class="h-4 w-4" />支持</button>
              <button type="button" class="danger-button compact" :disabled="!canReview" @click="reviewCase(item.id, 'REJECTED')"><X class="h-4 w-4" />驳回</button>
              <button type="button" class="secondary-button compact" :disabled="!canReview" @click="reviewCase(item.id, 'CLOSED')"><Archive class="h-4 w-4" />关闭</button>
            </div>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Archive,
  ArrowRight,
  Check,
  FileCheck2,
  GitFork,
  Hand,
  Inbox,
  ListChecks,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Undo2,
  X,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import AppHeader from '@/components/layout/AppHeader.vue'
import { getErrorMessage, type Result } from '@/api/client'
import { localDomainConfigs } from '@/api/domains'
import {
  collaborationApi,
  type CollaborationNeed,
  type CurationSuggestion,
  type GovernanceCase,
  type GovernanceDecision,
  type GovernanceTargetType,
  type PageResult,
  type ReviewDecision,
} from '@/api/collaboration'
import {
  opsApi,
  type MyAdminPermissions,
  type ReviewQueueItem,
  type ReviewQueueRiskLevel,
  type ReviewQueueStatus,
} from '@/api/ops'
import type { ApiId } from '@/api/types'
import { useAuthStore } from '@/stores/auth'

type LoadState = { loading: boolean; error: string; requestId: number }
type NeedQueueState = LoadState & {
  loadingMore: boolean
  nextCursor: string
  hasMore: boolean
}
const loadState = (): LoadState => reactive({ loading: false, error: '', requestId: 0 })
const needQueueState = (): NeedQueueState => reactive({
  loading: false,
  loadingMore: false,
  error: '',
  requestId: 0,
  nextCursor: '',
  hasMore: false,
})
const QueueState = defineComponent({
  props: { loading: Boolean, error: { type: String, default: '' }, empty: Boolean },
  emits: ['retry'],
  setup(props, { emit }) {
    return () => {
      if (props.loading) return h('div', { class: 'state-block' }, [h(Loader2, { class: 'h-5 w-5 animate-spin' }), '正在加载队列'])
      if (props.error) return h('div', { class: 'state-block state-error' }, [
        h('div', [h('strong', '队列加载失败'), h('p', props.error)]),
        h('button', { type: 'button', class: 'secondary-button compact', onClick: () => emit('retry') }, '重试'),
      ])
      if (props.empty) return h('div', { class: 'state-block' }, [h(Inbox, { class: 'h-5 w-5' }), h('div', [h('strong', '当前队列为空'), h('p', '调整筛选或稍后刷新。')])])
      return null
    }
  },
})

type KnowledgeRelationAction = 'claim' | 'release' | 'approve' | 'reject'
type KnowledgeRelationMeta = {
  sourcePostId?: string
  sourceTitle?: string
  targetPostId?: string
  targetTitle?: string
  relationType?: string
}

const activeTab = ref<'needs' | 'curation' | 'knowledge-relations' | 'cases'>('needs')
const authStore = useAuthStore()
const permissions = ref<MyAdminPermissions | null>(null)
const permissionError = ref('')
const reviewNote = ref('')
const pendingAction = ref('')
const needState = needQueueState()
const curationState = loadState()
const knowledgeRelationState = loadState()
const caseState = loadState()
const needItems = ref<CollaborationNeed[]>([])
const curationItems = ref<CurationSuggestion[]>([])
const knowledgeRelationItems = ref<ReviewQueueItem[]>([])
const caseItems = ref<GovernanceCase[]>([])
const needDomain = ref<number | ''>('')
const curationFilters = reactive<{ domain: number | ''; status: string }>({ domain: '', status: 'PENDING' })
const knowledgeRelationFilters = reactive<{
  status: ReviewQueueStatus | ''
  riskLevel: ReviewQueueRiskLevel | ''
}>({ status: 'pending', riskLevel: '' })
const caseStatus = ref('PENDING')
const currentUid = computed(() => String(authStore.user?.uid ?? ''))

const canModerate = computed(() => Boolean(
  permissions.value?.admin || permissions.value?.contentModerator || permissions.value?.domainModerator,
))
const canReviewCases = computed(() => Boolean(
  permissions.value?.admin || permissions.value?.contentModerator,
))
const isDomainOnlyModerator = computed(() => Boolean(
  permissions.value?.domainModerator
    && !permissions.value?.admin
    && !permissions.value?.contentModerator,
))
const curationDomains = computed(() => isDomainOnlyModerator.value
  ? localDomainConfigs.filter((item) => permissions.value?.moderatedDomains.includes(item.domain))
  : localDomainConfigs)
const canReview = computed(() => canModerate.value && reviewNote.value.length >= 2 && !pendingAction.value)
const canAcceptNeed = computed(() => canModerate.value && !pendingAction.value)
const canRejectNeed = computed(() => canAcceptNeed.value && reviewNote.value.length >= 2)
const permissionLabel = computed(() => {
  if (permissions.value?.admin) return '系统管理员'
  if (permissions.value?.contentModerator) return '内容审核员'
  if (permissions.value?.domainModerator) return `领域审核员（${permissions.value.moderatedDomains.join('、') || '范围由服务端判定'}）`
  return '当前账号没有共建治理权限'
})
const loadingAny = computed(() => (
  needState.loading
  || needState.loadingMore
  || curationState.loading
  || knowledgeRelationState.loading
  || caseState.loading
  || Boolean(pendingAction.value)
))
const isSelfSubmittedNeed = (item: CollaborationNeed) => {
  const uid = currentUid.value
  if (!uid) return false
  return String(item.submittedByUid ?? '') === uid
    || String(item.claimedByUid ?? '') === uid
}

const runLoad = async (
  state: LoadState,
  task: (isCurrent: () => boolean) => Promise<void>,
  fallback: string,
) => {
  const requestId = ++state.requestId
  const isCurrent = () => state.requestId === requestId
  state.loading = true
  state.error = ''
  try {
    await task(isCurrent)
  } catch (error) {
    if (isCurrent()) state.error = getErrorMessage(error, fallback)
  } finally {
    if (isCurrent()) state.loading = false
  }
}
const runReview = async (key: string, task: () => Promise<void>, success: string) => {
  if (!canReview.value) return
  pendingAction.value = key
  try {
    await task()
    toast.success(success)
    reviewNote.value = ''
  } catch (error) {
    toast.error(getErrorMessage(error, '审核操作失败'))
  } finally {
    pendingAction.value = ''
  }
}

const loadPermissions = async () => {
  permissionError.value = ''
  try {
    const response = await opsApi.myPermissions()
    permissions.value = response.data
    if (isDomainOnlyModerator.value) {
      const moderatedDomains = permissions.value?.moderatedDomains || []
      const firstDomain = moderatedDomains[0] || ''
      if (!moderatedDomains.includes(Number(curationFilters.domain))) {
        curationFilters.domain = firstDomain
      }
      if (!moderatedDomains.includes(Number(needDomain.value))) {
        needDomain.value = firstDomain
      }
    }
  } catch (error) {
    permissionError.value = getErrorMessage(error, '后台权限核验失败')
  }
}
const QUEUE_RETENTION_LIMIT = 300
const QUEUE_PAGE_SIZE = 50
const collectQueuePages = async <T,>(
  request: (cursor: string | number) => Promise<Result<PageResult<T>>>,
): Promise<T[]> => {
  const items: T[] = []
  let cursor: string | number = 0
  for (let page = 0; page < QUEUE_RETENTION_LIMIT / QUEUE_PAGE_SIZE; page += 1) {
    const response = await request(cursor)
    const data = response.data
    if (!data) break
    items.push(...data.items)
    if (!data.hasMore || !data.nextCursor || items.length >= QUEUE_RETENTION_LIMIT) break
    cursor = data.nextCursor
  }
  return items.slice(0, QUEUE_RETENTION_LIMIT)
}
const loadNeedQueue = async (append = false) => {
  if (!canModerate.value || (isDomainOnlyModerator.value && !needDomain.value)) {
    needState.requestId += 1
    needItems.value = []
    needState.loading = false
    needState.loadingMore = false
    needState.error = isDomainOnlyModerator.value
      ? '当前账号没有可用的领域审核范围'
      : ''
    needState.nextCursor = ''
    needState.hasMore = false
    return
  }
  if (append && (!needState.hasMore || needState.loadingMore)) return
  const requestId = ++needState.requestId
  if (append) needState.loadingMore = true
  else needState.loading = true
  needState.error = ''
  try {
    const response = await collaborationApi.needs.reviewQueue({
      domain: needDomain.value || undefined,
      cursor: append ? needState.nextCursor || 0 : 0,
      size: QUEUE_PAGE_SIZE,
    })
    if (requestId !== needState.requestId) return
    const data = response.data
    const incoming = data?.items || []
    const merged = append ? [...needItems.value, ...incoming] : incoming
    needItems.value = Array.from(
      new Map(merged.map((item) => [String(item.id), item])).values(),
    )
    needState.nextCursor = data?.nextCursor ? String(data.nextCursor) : ''
    needState.hasMore = Boolean(data?.hasMore && needState.nextCursor)
  } catch (error) {
    if (requestId === needState.requestId) {
      needState.error = getErrorMessage(error, '需求待验收队列加载失败')
      if (!append) {
        needItems.value = []
        needState.nextCursor = ''
        needState.hasMore = false
      }
    }
  } finally {
    if (requestId === needState.requestId) {
      needState.loading = false
      needState.loadingMore = false
    }
  }
}
const loadCuration = () => runLoad(curationState, async (isCurrent) => {
  const items = await collectQueuePages((cursor) => collaborationApi.curation.reviewQueue({
    domain: curationFilters.domain || undefined,
    status: curationFilters.status || undefined,
    cursor,
    size: QUEUE_PAGE_SIZE,
  }))
  if (isCurrent()) curationItems.value = items
}, '策展审核队列加载失败')
const loadKnowledgeRelations = () => runLoad(knowledgeRelationState, async (isCurrent) => {
  if (!canModerate.value) {
    knowledgeRelationItems.value = []
    return
  }
  const response = await opsApi.listReviewQueue({
    sourceType: 'KNOWLEDGE_RELATION',
    status: knowledgeRelationFilters.status || undefined,
    riskLevel: knowledgeRelationFilters.riskLevel || undefined,
    limit: 100,
  })
  if (isCurrent()) {
    knowledgeRelationItems.value = Array.isArray(response.data) ? response.data : []
  }
}, '知识关系审核队列加载失败')
const loadCases = () => runLoad(caseState, async (isCurrent) => {
  if (!canReviewCases.value) {
    caseItems.value = []
    return
  }
  const items = await collectQueuePages((cursor) => collaborationApi.governance.reviewQueue({
    status: caseStatus.value || undefined,
    cursor,
    size: QUEUE_PAGE_SIZE,
  }))
  if (isCurrent()) caseItems.value = items
}, '共建案件队列加载失败')
const refreshAll = async () => {
  await loadPermissions()
  if (!canReviewCases.value && activeTab.value === 'cases') activeTab.value = 'curation'
  await Promise.all([
    canModerate.value ? loadNeedQueue() : Promise.resolve(),
    loadCuration(),
    canModerate.value ? loadKnowledgeRelations() : Promise.resolve(),
    canReviewCases.value ? loadCases() : Promise.resolve(),
  ])
}

const reviewNeed = async (item: CollaborationNeed, decision: 'ACCEPT' | 'REJECT') => {
  if (isSelfSubmittedNeed(item)) {
    toast.info('不能验收自己的提交')
    return
  }
  if (decision === 'ACCEPT' ? !canAcceptNeed.value : !canRejectNeed.value) return
  const id = item.id
  pendingAction.value = `need:${decision}:${id}`
  try {
    if (decision === 'ACCEPT') {
      await collaborationApi.needs.accept(id)
    } else {
      await collaborationApi.needs.reject(id, { reason: reviewNote.value })
    }
    reviewNote.value = ''
    toast.success(decision === 'ACCEPT' ? '产出已验收，需求已完成' : '产出已退回认领者修改')
    await loadNeedQueue()
  } catch (error) {
    toast.error(getErrorMessage(error, decision === 'ACCEPT' ? '产出验收失败' : '产出退回失败'))
  } finally {
    pendingAction.value = ''
  }
}
const reviewCuration = (id: ApiId, decision: ReviewDecision) => runReview(`curation:${id}`, async () => {
  await collaborationApi.curation.decide(id, { decision, note: reviewNote.value })
  await loadCuration()
}, decision === 'APPROVED' ? '策展建议已通过并生成结果' : '策展建议已拒绝')
const reviewCase = (id: ApiId, decision: GovernanceDecision) => runReview(`case:${id}`, async () => {
  await collaborationApi.governance.decide(id, { decision, note: reviewNote.value })
  await loadCases()
}, decision === 'UPHELD' ? '案件已支持' : decision === 'REJECTED' ? '案件已驳回' : '案件已关闭')

const queueExtText = (value: unknown) => {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const text = String(value).trim()
  return text || undefined
}
const queueExtId = (value: unknown) => {
  const text = queueExtText(value)
  return text && /^[1-9]\d*$/.test(text) ? text : undefined
}
const knowledgeRelationMeta = (item: ReviewQueueItem): KnowledgeRelationMeta => {
  if (!item.extJson) return {}
  try {
    const parsed = JSON.parse(item.extJson)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const value = parsed as Record<string, unknown>
    return {
      sourcePostId: queueExtId(value.sourcePostId),
      sourceTitle: queueExtText(value.sourceTitle),
      targetPostId: queueExtId(value.targetPostId),
      targetTitle: queueExtText(value.targetTitle),
      relationType: queueExtText(value.relationType),
    }
  } catch {
    return {}
  }
}
const knowledgeRelationRows = computed(() => knowledgeRelationItems.value.map((item) => ({
  item,
  meta: knowledgeRelationMeta(item),
})))
const isKnowledgeRelationAssignee = (item: ReviewQueueItem) => Boolean(
  currentUid.value && String(item.assigneeUid ?? '') === currentUid.value,
)
const isSelfProposedKnowledgeRelation = (item: ReviewQueueItem) => Boolean(
  ['pending', 'claimed'].includes(item.queueStatus)
  && currentUid.value
  && String(item.creatorUid ?? '') === currentUid.value,
)
const isKnowledgeRelationClaimedByOther = (item: ReviewQueueItem) => Boolean(
  item.queueStatus === 'claimed'
  && item.assigneeUid
  && !isKnowledgeRelationAssignee(item),
)
const canKnowledgeRelationAction = (item: ReviewQueueItem, action: KnowledgeRelationAction) => {
  if (!canModerate.value) return false
  if (action === 'release') return item.queueStatus === 'claimed' && isKnowledgeRelationAssignee(item)
  if (isSelfProposedKnowledgeRelation(item)) return false
  if (action === 'claim') return item.queueStatus === 'pending' && !item.assigneeUid
  return ['pending', 'claimed'].includes(item.queueStatus)
    && (!item.assigneeUid || isKnowledgeRelationAssignee(item))
}
const handleKnowledgeRelationAction = async (
  item: ReviewQueueItem,
  action: KnowledgeRelationAction,
) => {
  if (!canKnowledgeRelationAction(item, action) || pendingAction.value) return
  if ((action === 'approve' || action === 'reject') && reviewNote.value.length < 2) {
    toast.info('请先填写至少 2 个字的审核说明')
    return
  }
  pendingAction.value = `knowledge-relation:${action}:${item.id}`
  const actionLabels: Record<KnowledgeRelationAction, string> = {
    claim: '认领',
    release: '释放',
    approve: '通过',
    reject: '拒绝',
  }
  try {
    if (action === 'claim') await opsApi.claimReviewQueueItem(item.id)
    if (action === 'release') await opsApi.releaseReviewQueueItem(item.id, reviewNote.value || undefined)
    if (action === 'approve') await opsApi.approveReviewQueueItem(item.id, reviewNote.value)
    if (action === 'reject') await opsApi.rejectReviewQueueItem(item.id, reviewNote.value)
    if (action !== 'claim') reviewNote.value = ''
    toast.success(`知识关系已${actionLabels[action]}`)
    await loadKnowledgeRelations()
  } catch (error) {
    toast.error(getErrorMessage(error, `知识关系${actionLabels[action]}失败`))
  } finally {
    pendingAction.value = ''
  }
}

const domainLabel = (domain: number) => localDomainConfigs.find((item) => item.domain === domain)?.domainName || `领域 ${domain}`
const submissionTargetLabel = (item: CollaborationNeed) => {
  if (!item.submissionResolutionType || !item.submissionResolutionId) return '提交对象待确认'
  const labels = { POST: '帖子', QUESTION: '问题', SERIES: '合集' }
  return `${labels[item.submissionResolutionType]} #${item.submissionResolutionId}`
}
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
const formatDate = (value?: string | null) => {
  if (!value) return '时间待确认'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}
const targetLabel = (value: GovernanceTargetType) => ({
  NEED: '内容需求',
  SERIES: '协作合集',
  ACTIVITY: '共创活动',
  CURATION: '策展建议',
  DISCUSSION: '结构化讨论',
  OFFICE_HOUR: '经验交流时段',
  RESERVATION: '经验交流预约',
  FEEDBACK: '经验交流反馈',
}[value] || value)
const statusLabel = (value: string) => ({
  PENDING: '待审核',
  APPROVED: '已通过',
  UPHELD: '已支持',
  REJECTED: '已驳回',
  CLOSED: '已关闭',
  OVERTURNED: '已推翻',
}[value] || value)
const statusClass = (value: string) => {
  if (['APPROVED', 'UPHELD'].includes(value)) return 'status-ok'
  if (['REJECTED'].includes(value)) return 'status-danger'
  if (['PENDING'].includes(value)) return 'status-warn'
  return 'status-muted'
}
const knowledgeRelationTypeLabel = (value?: string) => ({
  CONTINUES: '延续',
  SUPPLEMENTS: '补充',
  PREREQUISITE_OF: '前置知识',
  SUPERSEDES: '替代',
  DUPLICATE_OF: '重复',
  CONTRADICTS: '矛盾',
}[value || ''] || value || '知识关系')
const knowledgeRelationStatusLabel = (value: ReviewQueueStatus) => ({
  pending: '待处理',
  claimed: '已认领',
  approved: '已通过',
  rejected: '已拒绝',
  closed: '已关闭',
}[value] || value)
const knowledgeRelationStatusClass = (value: ReviewQueueStatus) => {
  if (value === 'approved') return 'status-ok'
  if (value === 'rejected') return 'status-danger'
  if (value === 'pending' || value === 'claimed') return 'status-warn'
  return 'status-muted'
}
const knowledgeRelationRiskLabel = (value: ReviewQueueRiskLevel) => ({
  critical: '严重风险',
  high: '高风险',
  medium: '中风险',
  low: '低风险',
}[value])
const knowledgeRelationRiskClass = (value: ReviewQueueRiskLevel) => {
  if (value === 'critical' || value === 'high') return 'status-danger'
  if (value === 'medium') return 'status-warn'
  return 'status-muted'
}

onMounted(refreshAll)
</script>

<style scoped>
.admin-collaboration-page {
  background: var(--surface-soft);
  color: var(--text-strong);
}

.page-header,
.permission-band,
.reason-band,
.panel-heading,
.filters,
.header-actions,
.row-title,
.row-actions {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.65rem;
}

.page-header {
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.header-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.page-header p {
  color: rgb(18 99 74);
  font-size: 0.8rem;
  font-weight: 900;
}

.page-header h1 {
  margin-top: 0.2rem;
  color: var(--text-strong);
  font-size: 1.5rem;
  font-weight: 900;
}

.page-header span {
  display: block;
  margin-top: 0.45rem;
  max-width: 72ch;
  color: var(--text-primary);
  font-size: 0.82rem;
  line-height: 1.55;
}

.permission-band,
.reason-band {
  margin-bottom: 1rem;
  border: 1px solid rgb(169 216 195);
  border-radius: 0.75rem;
  background: rgb(232 243 237);
  padding: 0.85rem 1rem;
  color: rgb(18 99 74);
}

.permission-band > div {
  min-width: 0;
}

.permission-band strong {
  font-size: 0.82rem;
  font-weight: 900;
}

.permission-band p {
  margin-top: 0.2rem;
  font-size: 0.75rem;
  line-height: 1.45;
}

.permission-band.danger {
  border-color: rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(153 27 27);
}

.reason-band {
  align-items: flex-end;
  border-color: rgb(253 230 138);
  background: rgb(255 251 235);
}

.reason-band label {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 0.35rem;
  color: rgb(120 53 15);
  font-size: 0.76rem;
  font-weight: 800;
}

.tab-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 1rem;
}

.tab-bar button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  background: white;
  padding: 0.5rem 0.75rem;
  color: var(--text-primary);
  font-size: 0.78rem;
  font-weight: 900;
}

.tab-bar button.active {
  border-color: rgb(26 127 90);
  background: rgb(232 243 237);
  color: rgb(18 99 74);
}

.queue-panel {
  min-width: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 0.75rem;
  background: white;
  padding: 1rem;
}

.panel-heading {
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.panel-heading h2 {
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 900;
}

.panel-heading p {
  margin-top: 0.25rem;
  color: var(--text-muted);
  font-size: 0.78rem;
  line-height: 1.5;
}

.field-control {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  background: white;
  padding: 0.58rem 0.65rem;
  color: var(--text-strong);
  font-size: 0.8rem;
  line-height: 1.45;
  outline: none;
}

.compact-control {
  width: auto;
  min-width: 9rem;
}

.dense-list {
  display: grid;
  gap: 0.75rem;
}

.dense-row {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid var(--border-subtle);
  padding-top: 0.8rem;
}

.dense-row:first-child {
  border-top: 0;
  padding-top: 0;
}

.row-main {
  min-width: 0;
  flex: 1;
}

.row-title {
  flex-wrap: wrap;
}

.row-title strong {
  overflow-wrap: anywhere;
  color: var(--text-strong);
  font-size: 0.85rem;
  font-weight: 900;
}

.row-main p,
.row-main small {
  display: block;
  margin-top: 0.35rem;
  overflow-wrap: anywhere;
  color: var(--text-muted);
  font-size: 0.74rem;
  line-height: 1.5;
}

.relation-route {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.55rem;
  color: var(--text-primary);
  font-size: 0.78rem;
  font-weight: 800;
}

.relation-post-link {
  min-width: 0;
  overflow-wrap: anywhere;
  color: rgb(18 99 74);
  text-decoration: underline;
  text-decoration-color: rgb(124 195 165);
  text-underline-offset: 0.18rem;
}

.relation-arrow {
  flex: 0 0 auto;
  color: var(--text-muted);
}

.self-review-hint {
  display: inline-flex;
  max-width: 14rem;
  align-items: center;
  gap: 0.4rem;
  color: rgb(146 64 14);
  font-size: 0.74rem;
  font-weight: 800;
  line-height: 1.4;
}

.status-pill,
.meta-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  font-size: 0.68rem;
  font-weight: 900;
}

.meta-chip,
.status-muted {
  background: var(--surface-soft);
  color: var(--text-primary);
}

.status-ok {
  background: rgb(220 252 231);
  color: rgb(21 128 61);
}

.status-warn {
  background: rgb(254 243 199);
  color: rgb(146 64 14);
}

.status-danger {
  background: rgb(254 226 226);
  color: rgb(185 28 28);
}

.primary-button,
.secondary-button,
.danger-button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 900;
}

.primary-button {
  border: 1px solid rgb(18 99 74);
  background: rgb(18 99 74);
  color: white;
}

.secondary-button {
  border: 1px solid var(--border-subtle);
  background: white;
  color: var(--text-primary);
}

.danger-button {
  border: 1px solid rgb(220 38 38);
  background: rgb(254 242 242);
  color: rgb(185 28 28);
}

.compact {
  min-height: 34px;
  padding: 0.35rem 0.55rem;
}

.queue-more {
  margin-top: 1rem;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.state-block {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.65rem;
  border: 1px dashed var(--border-subtle);
  border-radius: 0.625rem;
  background: var(--surface-soft);
  padding: 0.8rem;
  color: var(--text-primary);
  font-size: 0.78rem;
}

.state-block strong {
  color: var(--text-strong);
  font-weight: 900;
}

.state-block p {
  margin-top: 0.2rem;
}

.state-error {
  justify-content: space-between;
  border-style: solid;
  border-color: rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(153 27 27);
}

@media (max-width: 760px) {
  .page-header,
  .reason-band,
  .panel-heading,
  .dense-row {
    align-items: stretch;
    flex-direction: column;
  }

  .filters,
  .row-actions {
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .compact-control {
    width: 100%;
  }

  .relation-route {
    align-items: flex-start;
    flex-direction: column;
  }

  .relation-arrow {
    transform: rotate(90deg);
  }
}

.dark .admin-collaboration-page {
  background: var(--surface-1);
}

.dark .queue-panel,
.dark .tab-bar button,
.dark .field-control,
.dark .secondary-button {
  border-color: var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-primary);
}

.dark .page-header h1,
.dark .panel-heading h2,
.dark .row-title strong,
.dark .state-block strong {
  color: var(--text-strong);
}

.dark .page-header span,
.dark .panel-heading p {
  color: var(--text-muted);
}

.dark .dense-row {
  border-color: var(--border-subtle);
}

.dark .relation-route {
  color: var(--text-muted);
}

.dark .relation-post-link {
  color: rgb(124 195 165);
  text-decoration-color: rgb(18 99 74);
}
</style>
