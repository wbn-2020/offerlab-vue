<template>
  <div class="need-detail-page">
    <AppHeader />

    <main class="need-detail-shell">
      <div class="page-toolbar">
        <RouterLink to="/collaboration" class="back-link">
          <ArrowLeft class="icon" aria-hidden="true" />
          公共共建
        </RouterLink>
        <button
          type="button"
          class="icon-button"
          :disabled="detailState.loading || eventsState.loading"
          title="刷新需求详情"
          aria-label="刷新需求详情"
          @click="reloadAll"
        >
          <RefreshCw class="icon" :class="{ 'spin': detailState.loading || eventsState.loading }" aria-hidden="true" />
        </button>
      </div>

      <section v-if="detailState.loading" class="loading-panel" aria-label="需求详情加载中">
        <span class="skeleton skeleton-kicker" />
        <span class="skeleton skeleton-title" />
        <span class="skeleton skeleton-line" />
        <span class="skeleton skeleton-line skeleton-line-short" />
        <div class="skeleton-grid">
          <span v-for="index in 4" :key="index" class="skeleton skeleton-meta" />
        </div>
      </section>

      <section v-else-if="detailState.error" class="state-panel error-panel" role="alert">
        <AlertCircle class="state-icon" aria-hidden="true" />
        <div>
          <h1>需求详情加载失败</h1>
          <p>{{ detailState.error }}</p>
        </div>
        <button type="button" class="secondary-button" @click="loadDetail">
          <RefreshCw class="icon" aria-hidden="true" />
          重试
        </button>
      </section>

      <section v-else-if="!need" class="state-panel">
        <Inbox class="state-icon" aria-hidden="true" />
        <div>
          <h1>暂时找不到这项需求</h1>
          <p>需求可能已被隐藏，或者链接中的编号已经失效。</p>
        </div>
        <RouterLink to="/collaboration" class="secondary-button">
          返回需求区
          <ArrowRight class="icon" aria-hidden="true" />
        </RouterLink>
      </section>

      <template v-else>
        <section class="detail-header">
          <div class="eyebrow-row">
            <span class="status-badge" :data-status="need.status">
              <component :is="statusIcon(need.status)" class="icon-small" aria-hidden="true" />
              {{ statusLabel(need.status) }}
            </span>
            <span class="meta-label">{{ domainLabel(need.domain) }}</span>
            <span class="meta-label">{{ formatLabel(need.contentFormat) }}</span>
            <span class="meta-label">需求 #{{ need.id }}</span>
          </div>
          <h1>{{ need.title }}</h1>
          <p class="description">{{ need.description }}</p>

          <div class="detail-meta">
            <span><UserRound class="icon-small" aria-hidden="true" /> 发起者 UID {{ need.creatorUid }}</span>
            <span><CalendarDays class="icon-small" aria-hidden="true" /> 发布于 {{ formatDate(need.createTime) }}</span>
            <span><Heart class="icon-small" aria-hidden="true" /> {{ need.followerCount }} 人关注</span>
          </div>

          <div class="action-bar">
            <button
              v-if="canToggleFollow"
              type="button"
              class="secondary-button"
              :disabled="actionBusy"
              @click="toggleFollow"
            >
              <Loader2 v-if="pendingAction === 'follow'" class="icon spin" aria-hidden="true" />
              <BellOff v-else-if="need.followed" class="icon" aria-hidden="true" />
              <BellPlus v-else class="icon" aria-hidden="true" />
              {{ need.followed ? '取消关注' : '关注需求' }}
            </button>
            <button
              v-if="canClaim"
              type="button"
              class="primary-button"
              :disabled="actionBusy || (isHighRisk && !riskAcknowledged)"
              @click="claimNeed"
            >
              <Loader2 v-if="pendingAction === 'claim'" class="icon spin" aria-hidden="true" />
              <Hand v-else class="icon" aria-hidden="true" />
              认领需求
            </button>
            <span v-else-if="!authStore.isLoggedIn" class="login-hint">
              登录后可以关注、认领或提交公开交付
            </span>
          </div>
          <label v-if="canClaim && isHighRisk" class="risk-check">
            <input v-model="riskAcknowledged" type="checkbox">
            <span>我已了解该领域的风险提示，并会按公开、可核验的方式推进交付。</span>
          </label>
        </section>

        <div class="content-grid">
          <div class="main-column">
            <section class="content-section">
              <div class="section-heading">
                <div>
                  <span class="section-kicker">DELIVERY BRIEF</span>
                  <h2>交付说明</h2>
                </div>
                <FileText class="section-icon" aria-hidden="true" />
              </div>
              <div class="brief-block">
                <h3>验收标准</h3>
                <p v-if="need.acceptanceCriteria">{{ need.acceptanceCriteria }}</p>
                <p v-else class="muted-text">发起者暂未补充单独的验收标准，请结合需求说明交付。</p>
              </div>
              <div class="brief-block">
                <h3>来源与格式</h3>
                <dl class="detail-list">
                  <div>
                    <dt>来源</dt>
                    <dd>{{ sourceLabel(need.sourceType) }}<span v-if="need.sourceRefId"> · #{{ need.sourceRefId }}</span></dd>
                  </div>
                  <div>
                    <dt>交付格式</dt>
                    <dd>{{ formatLabel(need.contentFormat) }}</dd>
                  </div>
                  <div>
                    <dt>当前状态</dt>
                    <dd>{{ statusLabel(need.status) }}</dd>
                  </div>
                </dl>
              </div>
            </section>

            <section class="content-section">
              <div class="section-heading">
                <div>
                  <span class="section-kicker">PUBLIC DELIVERY</span>
                  <h2>公开交付</h2>
                </div>
                <ExternalLink class="section-icon" aria-hidden="true" />
              </div>
              <div v-if="deliveryPath" class="delivery-row">
                <div>
                  <strong>{{ deliveryLabel }}</strong>
                  <span>这项公开内容已作为需求交付结果记录。</span>
                </div>
                <RouterLink :to="deliveryPath" class="text-link">
                  查看交付
                  <ArrowRight class="icon" aria-hidden="true" />
                </RouterLink>
              </div>
              <div v-else-if="submissionPath" class="delivery-row" data-pending-submission>
                <div>
                  <strong>{{ submissionTargetLabel }}</strong>
                  <span>这份公开产出正在等待创建者或版主验收。</span>
                </div>
                <RouterLink
                  :to="submissionPath"
                  class="text-link"
                  data-pending-submission-link
                >
                  查看待验收产出
                  <ArrowRight class="icon" aria-hidden="true" />
                </RouterLink>
              </div>
              <div v-else class="empty-inline">
                <CircleDot class="icon" aria-hidden="true" />
                <span>{{ deliveryEmptyText }}</span>
              </div>
            </section>

            <section v-if="canViewParticipantDetails && (need.claimedAt || need.lastProgressAt || need.submittedAt || need.submissionResolutionId || need.submissionNote || need.rejectReason || need.closedReason)" class="content-section">
              <div class="section-heading">
                <div>
                  <span class="section-kicker">PARTICIPANT VIEW</span>
                  <h2>协作状态</h2>
                </div>
                <Clock3 class="section-icon" aria-hidden="true" />
              </div>
              <dl class="detail-list participant-list">
                <div v-if="need.claimedAt">
                  <dt>认领时间</dt>
                  <dd>{{ formatDate(need.claimedAt) }}</dd>
                </div>
                <div v-if="need.lastProgressAt">
                  <dt>最近进展</dt>
                  <dd>{{ formatDate(need.lastProgressAt) }}</dd>
                </div>
                <div v-if="need.submissionResolutionId">
                  <dt>提交交付</dt>
                  <dd>
                    <RouterLink
                      v-if="submissionPath"
                      :to="submissionPath"
                      class="text-link"
                    >
                      {{ submissionTargetLabel }}
                      <ExternalLink class="icon-small" aria-hidden="true" />
                    </RouterLink>
                    <template v-else>{{ submissionTargetLabel }}</template>
                  </dd>
                </div>
                <div v-if="need.submittedAt">
                  <dt>提交时间</dt>
                  <dd>{{ formatDate(need.submittedAt) }}</dd>
                </div>
                <div v-if="need.submissionNote">
                  <dt>提交说明</dt>
                  <dd>{{ need.submissionNote }}</dd>
                </div>
                <div v-if="need.rejectReason">
                  <dt>退回理由</dt>
                  <dd class="danger-text">{{ need.rejectReason }}</dd>
                </div>
                <div v-if="need.closedReason">
                  <dt>关闭说明</dt>
                  <dd>{{ need.closedReason }}</dd>
                </div>
              </dl>
            </section>

            <section
              v-if="canViewParticipantDetails && need.claimCycles?.length"
              class="content-section"
              data-need-claim-cycles
            >
              <div class="section-heading">
                <div>
                  <span class="section-kicker">CLAIM HISTORY</span>
                  <h2>认领周期与提交轮次</h2>
                </div>
                <History class="section-icon" aria-hidden="true" />
              </div>
              <div class="cycle-list">
                <article v-for="cycle in need.claimCycles" :key="String(cycle.id)" class="cycle-card">
                  <div class="cycle-heading">
                    <strong>第 {{ cycle.cycleNo }} 个认领周期</strong>
                    <span>{{ cycle.status }}</span>
                  </div>
                  <p>
                    认领于 {{ formatDate(cycle.claimedAt) }}
                    <template v-if="cycle.endedAt"> · 结束于 {{ formatDate(cycle.endedAt) }}</template>
                  </p>
                  <div v-if="cycle.revisions?.length" class="revision-list">
                    <div v-for="revision in cycle.revisions" :key="String(revision.id)" class="revision-row" data-need-revision>
                      <span>第 {{ revision.revisionNo }} 轮提交</span>
                      <strong>{{ revision.status }}</strong>
                      <time v-if="revision.submittedAt" :datetime="revision.submittedAt">
                        {{ formatDate(revision.submittedAt) }}
                      </time>
                      <RouterLink
                        v-if="revisionPath(revision)"
                        :to="revisionPath(revision)!"
                        class="text-link"
                      >
                        查看公开产出
                        <ExternalLink class="icon-small" aria-hidden="true" />
                      </RouterLink>
                    </div>
                  </div>
                </article>
              </div>
            </section>

            <CollaborationDeliverySelector
              v-if="canSubmit"
              v-model="selectedDeliveryCandidate"
              :need-id="need.id"
              :initial-resolution-type="submissionForm.resolutionType"
              :return-href="needDetailReturnHref"
              @select="selectDeliveryCandidate"
            />

            <section v-if="need.stalled && need.status === 'CLAIMED'" class="stalled-notice">
              <PauseCircle class="icon" aria-hidden="true" />
              <div>
                <strong>这项认领可能暂时没有新的进展</strong>
                <span>这是基于最近进展时间的克制提醒，不代表对认领者作出判断或自动改变需求状态。</span>
              </div>
            </section>

            <section class="timeline-section">
              <div class="section-heading">
                <div>
                  <span class="section-kicker">COLLABORATION LOG</span>
                  <h2>协作时间线</h2>
                </div>
                <History class="section-icon" aria-hidden="true" />
              </div>

              <div v-if="eventsState.loading && !events.length" class="timeline-loading">
                <span v-for="index in 3" :key="index" class="timeline-skeleton">
                  <i />
                  <b />
                </span>
              </div>
              <div v-else-if="eventsState.initialError" class="timeline-state error-panel" role="alert">
                <AlertCircle class="icon" aria-hidden="true" />
                <span>{{ eventsState.initialError }}</span>
                <button type="button" class="text-button" @click="loadEvents()">重试</button>
              </div>
              <div v-else-if="!events.length" class="timeline-state">
                <Inbox class="icon" aria-hidden="true" />
                <span>协作记录会在需求上线后的真实动作发生后出现在这里。</span>
              </div>
              <ol v-else class="timeline-list">
                <li v-for="event in events" :key="event.id" class="timeline-item">
                  <span class="timeline-marker"><component :is="eventIcon(event.eventType)" class="icon-small" aria-hidden="true" /></span>
                  <div class="timeline-content">
                    <div class="timeline-topline">
                      <strong>{{ eventLabel(event.eventType) }}</strong>
                      <time :datetime="event.createTime">{{ formatDate(event.createTime) }}</time>
                    </div>
                    <p v-if="event.fromStatus || event.toStatus" class="status-transition">
                      {{ event.fromStatus ? statusLabel(event.fromStatus) : '开始' }}
                      <ArrowRight class="icon-small" aria-hidden="true" />
                      {{ event.toStatus ? statusLabel(event.toStatus) : '记录' }}
                    </p>
                    <p v-if="event.note" class="event-note">{{ event.note }}</p>
                    <span v-if="event.actorUid" class="event-actor">参与者 UID {{ event.actorUid }}</span>
                  </div>
                </li>
              </ol>
              <div
                v-if="eventsState.loadMoreError"
                class="timeline-state error-panel timeline-load-more-error"
                role="alert"
              >
                <AlertCircle class="icon" aria-hidden="true" />
                <span>{{ eventsState.loadMoreError }}</span>
                <button type="button" class="text-button" @click="loadEvents(true)">
                  重试加载更早记录
                </button>
              </div>
              <button
                v-if="eventsState.hasMore && !eventsState.loadMoreError"
                type="button"
                class="load-more-button"
                :disabled="eventsState.loadingMore"
                @click="loadEvents(true)"
              >
                <Loader2 v-if="eventsState.loadingMore" class="icon spin" aria-hidden="true" />
                {{ eventsState.loadingMore ? '加载中' : '加载更早记录' }}
              </button>
            </section>
          </div>

          <aside class="side-column">
            <section v-if="canActOnClaimedNeed || canReviewSubmission" class="action-section">
              <div class="section-heading compact">
                <div>
                  <span class="section-kicker">NEXT ACTION</span>
                  <h2>处理这项需求</h2>
                </div>
                <Settings2 class="section-icon" aria-hidden="true" />
              </div>

              <form v-if="canSubmit" class="action-form" @submit.prevent="submitNeed">
                <label>
                  <span>公开交付类型</span>
                  <select v-model="submissionForm.resolutionType" class="field-control" @change="clearSelectedDeliveryCandidate">
                    <option value="POST">帖子</option>
                    <option value="QUESTION">问题</option>
                    <option value="SERIES">合集</option>
                  </select>
                </label>
                <label>
                  <span>公开内容 ID（兼容旧链接）</span>
                  <input v-model.trim="submissionForm.resolutionId" class="field-control" inputmode="numeric" required @input="clearSelectedDeliveryCandidate">
                </label>
                <label>
                  <span>提交说明</span>
                  <textarea v-model.trim="submissionForm.note" class="field-control" rows="3" maxlength="1000" placeholder="说明这份产出如何满足验收标准" />
                </label>
                <button type="submit" class="primary-button full-width" :disabled="actionBusy || !isPositiveId(submissionForm.resolutionId)">
                  <Loader2 v-if="pendingAction === 'submit'" class="icon spin" aria-hidden="true" />
                  <Send v-else class="icon" aria-hidden="true" />
                  提交公开交付
                </button>
              </form>

              <div v-if="canRelease || canWithdraw || canReviewSubmission" class="action-stack">
                <button v-if="canRelease" type="button" class="secondary-button full-width" :disabled="actionBusy" @click="releaseNeed">
                  <Loader2 v-if="pendingAction === 'release'" class="icon spin" aria-hidden="true" />
                  <Undo2 v-else class="icon" aria-hidden="true" />
                  释放认领
                </button>
                <button v-if="canWithdraw" type="button" class="secondary-button full-width" :disabled="actionBusy" @click="withdrawNeed">
                  <Loader2 v-if="pendingAction === 'withdraw'" class="icon spin" aria-hidden="true" />
                  <Undo2 v-else class="icon" aria-hidden="true" />
                  撤回提交
                </button>
                <RouterLink
                  v-if="canReviewSubmission && submissionPath"
                  :to="submissionPath"
                  class="secondary-button full-width"
                  data-pending-submission-link
                >
                  <ExternalLink class="icon" aria-hidden="true" />
                  检查待验收产出
                </RouterLink>
                <label v-if="canReviewSubmission">
                  <span>验收说明（可选）</span>
                  <textarea
                    v-model.trim="acceptNote"
                    class="field-control"
                    data-need-accept-note
                    rows="3"
                    maxlength="500"
                    placeholder="记录通过依据；提交后会写入协作时间线"
                  />
                </label>
                <button v-if="canReviewSubmission" type="button" class="primary-button full-width" :disabled="actionBusy" @click="acceptNeed">
                  <Loader2 v-if="pendingAction === 'accept'" class="icon spin" aria-hidden="true" />
                  <FileCheck2 v-else class="icon" aria-hidden="true" />
                  验收通过
                </button>
                <label v-if="canReviewSubmission">
                  <span>退回理由</span>
                  <textarea v-model.trim="rejectReason" class="field-control" rows="3" maxlength="500" placeholder="说明需要补充或修改的地方" />
                </label>
                <button v-if="canReviewSubmission" type="button" class="danger-button full-width" :disabled="actionBusy || !rejectReason.trim()" @click="rejectNeed">
                  <Loader2 v-if="pendingAction === 'reject'" class="icon spin" aria-hidden="true" />
                  <XCircle v-else class="icon" aria-hidden="true" />
                  退回修改
                </button>
              </div>
            </section>
          </aside>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, type RouteLocationRaw } from 'vue-router'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BellOff,
  BellPlus,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  ExternalLink,
  FileCheck2,
  FileText,
  Hand,
  Heart,
  History,
  Inbox,
  Loader2,
  LockKeyhole,
  PauseCircle,
  RefreshCw,
  Send,
  Settings2,
  Undo2,
  UserRound,
  XCircle,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import AppHeader from '@/components/layout/AppHeader.vue'
import CollaborationDeliverySelector from '@/components/collaboration/CollaborationDeliverySelector.vue'
import { collaborationApi, type CollaborationNeed, type CollaborationNeedEvent, type NeedContentFormat, type NeedDeliveryCandidate, type NeedEventType, type NeedResolutionType, type NeedRevision, type NeedSourceType, type NeedStatus } from '@/api/collaboration'
import { getErrorMessage } from '@/api/client'
import { localDomainConfigs } from '@/api/domains'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import { useAuthStore } from '@/stores/auth'
import type { ApiId } from '@/api/types'
import { deliveryPath as buildCollaborationDeliveryPath } from '@/utils/collaborationNeedPresentation'

type NeedAction = 'follow' | 'claim' | 'submit' | 'withdraw' | 'release' | 'accept' | 'reject'
type NeedActionContext = {
  generation: number
  action: NeedAction
  needId: string
  targetNeedId: ApiId
  uid: string
  isLoggedIn: boolean
}

const route = useRoute()
const authStore = useAuthStore()
const { requireLogin } = useLoginRedirect()
const need = ref<CollaborationNeed | null>(null)
const events = ref<CollaborationNeedEvent[]>([])
const riskAcknowledged = ref(false)
const rejectReason = ref('')
const acceptNote = ref('')
const pendingAction = ref('')
const submissionForm = reactive({
  resolutionType: 'POST' as NeedResolutionType,
  resolutionId: '',
  note: '',
})
const selectedDeliveryCandidate = ref<NeedDeliveryCandidate | null>(null)
const detailState = reactive({ loading: false, error: '' })
const eventsState = reactive({
  loading: false,
  loadingMore: false,
  initialError: '',
  loadMoreError: '',
  nextCursor: '',
  hasMore: false,
})
let detailRequestId = 0
let eventsRequestId = 0
let actionGeneration = 0

const needId = computed(() => {
  const value = route.params.needId
  return Array.isArray(value) ? value[0] || '' : String(value || '')
})
const currentUid = computed(() => String(authStore.user?.uid ?? ''))
const actionBusy = computed(() => Boolean(pendingAction.value))
const beginNeedActionContext = (
  action: NeedAction,
  targetNeedId: ApiId,
): NeedActionContext => {
  const context = {
    generation: ++actionGeneration,
    action,
    needId: needId.value,
    targetNeedId,
    uid: currentUid.value,
    isLoggedIn: authStore.isLoggedIn,
  }
  pendingAction.value = action
  return context
}
const isNeedActionContextCurrent = (context: NeedActionContext) => (
  context.generation === actionGeneration
  && context.action === pendingAction.value
  && context.needId === needId.value
  && context.uid === currentUid.value
  && context.isLoggedIn === authStore.isLoggedIn
)
const invalidateNeedActionContext = () => {
  actionGeneration += 1
  pendingAction.value = ''
}
const finishNeedActionContext = (context: NeedActionContext) => {
  if (isNeedActionContextCurrent(context)) pendingAction.value = ''
}
const resetActionForms = () => {
  riskAcknowledged.value = false
  rejectReason.value = ''
  acceptNote.value = ''
  Object.assign(submissionForm, {
    resolutionType: 'POST',
    resolutionId: '',
    note: '',
  })
  selectedDeliveryCandidate.value = null
}
const isClaimant = computed(() => Boolean(currentUid.value) && String(need.value?.claimedByUid ?? '') === currentUid.value)
const canViewParticipantDetails = computed(() => Boolean(need.value && (need.value.canManage || isClaimant.value)))
const canToggleFollow = computed(() => Boolean(
  need.value
  && authStore.isLoggedIn
  && (need.value.followed || ['OPEN', 'CLAIMED'].includes(need.value.status)),
))
const canClaim = computed(() => Boolean(need.value && authStore.isLoggedIn && need.value.status === 'OPEN' && !need.value.claimedByUid && String(need.value.creatorUid) !== currentUid.value))
const canActOnClaimedNeed = computed(() => Boolean(need.value && isClaimant.value && ['CLAIMED', 'SUBMITTED'].includes(need.value.status)))
const canSubmit = computed(() => Boolean(need.value && isClaimant.value && need.value.status === 'CLAIMED'))
const canRelease = computed(() => Boolean(need.value && isClaimant.value && need.value.status === 'CLAIMED'))
const canWithdraw = computed(() => Boolean(need.value && isClaimant.value && need.value.status === 'SUBMITTED'))
const canReviewSubmission = computed(() => Boolean(
  need.value?.canManage
  && need.value.status === 'SUBMITTED'
  && !isClaimant.value
))
const isHighRisk = computed(() => localDomainConfigs.find((item) => Number(item.domain) === Number(need.value?.domain))?.riskLevel === 'HIGH')
const needDetailReturnHref = computed(() => `/collaboration/needs/${encodeURIComponent(needId.value)}`)
const revisionPath = (revision: NeedRevision): RouteLocationRaw | null => {
  if (!revision.resolutionId) return null
  if (revision.resolutionType === 'QUESTION') return `/questions/${revision.resolutionId}`
  if (revision.resolutionType === 'SERIES') return `/collaboration/series/${revision.resolutionId}`
  return `/post/${revision.resolutionPostId || revision.resolutionId}`
}

const selectDeliveryCandidate = (candidate: NeedDeliveryCandidate) => {
  selectedDeliveryCandidate.value = candidate
  submissionForm.resolutionType = candidate.resolutionType
  submissionForm.resolutionId = String(candidate.id)
}

const clearSelectedDeliveryCandidate = () => {
  selectedDeliveryCandidate.value = null
}

const applyEditorDeliveryReturn = () => {
  const pendingReview = String(route.query.deliveryPendingReview ?? '') === '1'
  const type = String(route.query.deliveryType ?? '').toUpperCase()
  const id = String(route.query.deliveryId ?? '').trim()
  if (pendingReview || !isPositiveId(id) || !['POST', 'QUESTION', 'SERIES'].includes(type)) return
  submissionForm.resolutionType = type as NeedResolutionType
  submissionForm.resolutionId = id
  selectedDeliveryCandidate.value = null
}

const statusLabels: Record<NeedStatus, string> = {
  OPEN: '开放认领',
  CLAIMED: '交付进行中',
  SUBMITTED: '待验收',
  COMPLETED: '已完成',
  CLOSED: '已关闭',
  MERGED: '已合并',
}
const formatLabels: Record<NeedContentFormat, string> = {
  ARTICLE: '文章',
  QUESTION: '问题',
  GUIDE: '指南',
  CHECKLIST: '清单',
  RESOURCE: '资源',
}
const sourceLabels: Record<NeedSourceType, string> = {
  COMMUNITY: '社区需求',
  POST: '帖子',
  TOPIC: '专题',
  ACTIVITY: '活动',
  EXTERNAL: '外部来源',
  SEARCH_GAP: '搜索缺口',
}
const eventLabels: Record<NeedEventType, string> = {
  CREATED: '需求创建',
  CLAIMED: '开始认领',
  SUBMITTED: '提交交付',
  WITHDRAWN: '撤回提交',
  REJECTED: '退回修改',
  ACCEPTED: '验收通过',
  COMPLETED: '交付完成',
  CLOSED: '需求关闭',
  MERGED: '需求合并',
  RELEASED: '释放认领',
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
  if (!value) return '时间待定'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}
const domainLabel = (domain: number) => localDomainConfigs.find((item) => Number(item.domain) === Number(domain))?.domainName || `领域 ${domain}`
const statusLabel = (status: NeedStatus) => statusLabels[status] || status
const formatLabel = (format: NeedContentFormat) => formatLabels[format] || format
const sourceLabel = (source: NeedSourceType) => sourceLabels[source] || source
const eventLabel = (type: NeedEventType) => eventLabels[type] || type
const isPositiveId = (value: string) => /^[1-9]\d*$/.test(value.trim())
const statusIcon = (status: NeedStatus) => {
  if (status === 'COMPLETED') return CheckCircle2
  if (status === 'CLOSED') return LockKeyhole
  if (status === 'MERGED') return ArrowRight
  return status === 'SUBMITTED' ? Clock3 : CircleDot
}
const eventIcon = (type: NeedEventType) => {
  if (type === 'ACCEPTED' || type === 'COMPLETED') return CheckCircle2
  if (type === 'REJECTED') return XCircle
  if (type === 'RELEASED' || type === 'WITHDRAWN') return Undo2
  if (type === 'CLAIMED') return Hand
  return CircleDot
}

const deliveryPath = computed(() => {
  if (!need.value?.resolutionId) return null
  return buildCollaborationDeliveryPath(
    need.value.resolutionType,
    need.value.resolutionPostId || need.value.resolutionId,
  )
})
const deliveryLabel = computed(() => {
  if (!need.value?.resolutionId) return ''
  const label = need.value.resolutionType === 'QUESTION' ? '问题' : need.value.resolutionType === 'SERIES' ? '合集' : '帖子'
  return `${label} #${need.value.resolutionId}`
})
const submissionPath = computed<RouteLocationRaw | null>(() => {
  const resolutionId = need.value?.submissionResolutionId
  if (!resolutionId) return null
  return buildCollaborationDeliveryPath(need.value?.submissionResolutionType, resolutionId)
})
const submissionTargetLabel = computed(() => {
  if (!need.value?.submissionResolutionId) return ''
  const label = need.value.submissionResolutionType === 'QUESTION'
    ? '问题'
    : need.value.submissionResolutionType === 'SERIES'
      ? '合集'
      : '帖子'
  return `${label} #${need.value.submissionResolutionId}`
})
const deliveryEmptyText = computed(() => {
  if (need.value?.status === 'SUBMITTED') return '已有公开交付提交，等待创建者验收。'
  if (need.value?.status === 'OPEN') return '需求尚未有公开交付，等待社区成员认领。'
  if (need.value?.status === 'CLAIMED') return '认领正在推进，公开交付尚未提交。'
  return '当前需求没有可公开访问的交付链接。'
})

const resetEvents = () => {
  eventsRequestId += 1
  events.value = []
  eventsState.loading = false
  eventsState.loadingMore = false
  eventsState.initialError = ''
  eventsState.loadMoreError = ''
  eventsState.nextCursor = ''
  eventsState.hasMore = false
}

const loadDetail = async () => {
  const requestId = ++detailRequestId
  detailState.loading = true
  detailState.error = ''
  need.value = null
  riskAcknowledged.value = false
  try {
    if (!isPositiveId(needId.value)) throw new Error('需求编号无效')
    const result = await collaborationApi.needs.detail(needId.value as ApiId)
    if (requestId !== detailRequestId) return
    need.value = result.data || null
    if (!need.value) detailState.error = '需求不存在或当前不可见'
    else if (canSubmit.value) applyEditorDeliveryReturn()
  } catch (error) {
    if (requestId === detailRequestId) detailState.error = getErrorMessage(error, '需求详情暂时无法读取')
  } finally {
    if (requestId === detailRequestId) detailState.loading = false
  }
}

const loadEvents = async (append = false) => {
  if (!needId.value || (append && (!eventsState.hasMore || eventsState.loadingMore))) return
  const requestId = ++eventsRequestId
  if (append) {
    eventsState.loadingMore = true
    eventsState.loadMoreError = ''
  } else {
    eventsState.loading = true
    eventsState.initialError = ''
    eventsState.loadMoreError = ''
  }
  try {
    const result = await collaborationApi.needs.events(needId.value as ApiId, {
      cursor: append ? eventsState.nextCursor || 0 : 0,
      size: 20,
    })
    if (requestId !== eventsRequestId) return
    const incoming = result.data?.items || []
    const merged = append ? [...events.value, ...incoming] : incoming
    events.value = Array.from(new Map(merged.map((event) => [String(event.id), event])).values())
    eventsState.nextCursor = result.data?.nextCursor ? String(result.data.nextCursor) : ''
    eventsState.hasMore = Boolean(result.data?.hasMore && eventsState.nextCursor)
  } catch (error) {
    if (requestId === eventsRequestId) {
      const message = getErrorMessage(error, '协作时间线暂时无法读取')
      if (append) {
        eventsState.loadMoreError = message
      } else {
        eventsState.initialError = message
        events.value = []
      }
    }
  } finally {
    if (requestId === eventsRequestId) {
      eventsState.loading = false
      eventsState.loadingMore = false
    }
  }
}

const reloadAll = async () => {
  resetEvents()
  await Promise.all([loadDetail(), loadEvents()])
}

const ensureLoggedIn = () => {
  if (authStore.isLoggedIn) return true
  toast.info('登录后可参与公共共建')
  return requireLogin()
}

const refreshAfterAction = async (context: NeedActionContext) => {
  if (!isNeedActionContextCurrent(context)) return false
  resetEvents()
  await Promise.all([loadDetail(), loadEvents()])
  return isNeedActionContextCurrent(context)
}

const toggleFollow = async () => {
  if (!ensureLoggedIn() || !need.value || !canToggleFollow.value || actionBusy.value) return
  const targetNeed = need.value
  const wasFollowed = targetNeed.followed
  const context = beginNeedActionContext('follow', targetNeed.id)
  try {
    if (wasFollowed) await collaborationApi.needs.unfollow(context.targetNeedId)
    else await collaborationApi.needs.follow(context.targetNeedId)
    if (!await refreshAfterAction(context)) return
    toast.success(wasFollowed ? '已取消关注需求' : '已关注需求')
  } catch (error) {
    if (isNeedActionContextCurrent(context)) {
      toast.error(getErrorMessage(error, '需求关注操作失败'))
    }
  } finally {
    finishNeedActionContext(context)
  }
}

const claimNeed = async () => {
  if (!ensureLoggedIn() || !need.value || !canClaim.value || actionBusy.value) return
  if (isHighRisk.value && !riskAcknowledged.value) {
    toast.warning('请先确认该领域的风险提示')
    return
  }
  if (!window.confirm('确认认领这项公开需求，并按验收标准推进交付？')) return
  const targetNeed = need.value
  const riskConfirmed = riskAcknowledged.value
  const context = beginNeedActionContext('claim', targetNeed.id)
  try {
    await collaborationApi.needs.claim(context.targetNeedId, { riskAcknowledged: riskConfirmed })
    if (!await refreshAfterAction(context)) return
    toast.success('需求已认领')
  } catch (error) {
    if (isNeedActionContextCurrent(context)) {
      toast.error(getErrorMessage(error, '需求认领失败'))
    }
  } finally {
    finishNeedActionContext(context)
  }
}

const submitNeed = async () => {
  if (!need.value || !canSubmit.value || actionBusy.value || !isPositiveId(submissionForm.resolutionId)) return
  const targetNeed = need.value
  const payload = {
    resolutionType: submissionForm.resolutionType,
    resolutionId: submissionForm.resolutionId,
    resolutionPostId: submissionForm.resolutionType === 'POST' ? submissionForm.resolutionId : undefined,
    note: submissionForm.note || undefined,
  }
  const context = beginNeedActionContext('submit', targetNeed.id)
  try {
    await collaborationApi.needs.submit(context.targetNeedId, payload)
    if (!await refreshAfterAction(context)) return
    Object.assign(submissionForm, { resolutionType: 'POST', resolutionId: '', note: '' })
    toast.success('公开交付已提交，等待创建者验收')
  } catch (error) {
    if (isNeedActionContextCurrent(context)) {
      toast.error(getErrorMessage(error, '公开交付提交失败'))
    }
  } finally {
    finishNeedActionContext(context)
  }
}

const withdrawNeed = async () => {
  if (!need.value || !canWithdraw.value || actionBusy.value) return
  if (!window.confirm('确认撤回这次公开交付？撤回后可以修改并重新提交。')) return
  const context = beginNeedActionContext('withdraw', need.value.id)
  try {
    await collaborationApi.needs.withdraw(context.targetNeedId)
    if (!await refreshAfterAction(context)) return
    toast.success('提交已撤回，可以修改后再次提交')
  } catch (error) {
    if (isNeedActionContextCurrent(context)) {
      toast.error(getErrorMessage(error, '撤回提交失败'))
    }
  } finally {
    finishNeedActionContext(context)
  }
}

const releaseNeed = async () => {
  if (!need.value || !canRelease.value || actionBusy.value) return
  const note = window.prompt('可选：说明这次释放认领的原因。留空也可以。', '')
  if (note === null) return
  if (!window.confirm('确认释放认领？需求会重新开放给其他社区成员。')) return
  const context = beginNeedActionContext('release', need.value.id)
  try {
    await collaborationApi.needs.release(context.targetNeedId, { note: note.trim() || undefined })
    if (!await refreshAfterAction(context)) return
    toast.success('已释放认领，需求重新开放')
  } catch (error) {
    if (isNeedActionContextCurrent(context)) {
      toast.error(getErrorMessage(error, '释放认领失败'))
    }
  } finally {
    finishNeedActionContext(context)
  }
}

const acceptNeed = async () => {
  if (!need.value || !canReviewSubmission.value || actionBusy.value) return
  if (!window.confirm('确认验收这份公开交付？验收通过后需求将标记为已完成。')) return
  const note = acceptNote.value.trim()
  const context = beginNeedActionContext('accept', need.value.id)
  try {
    await collaborationApi.needs.accept(context.targetNeedId, {
      note: note || undefined,
    })
    if (!await refreshAfterAction(context)) return
    acceptNote.value = ''
    toast.success('产出已验收，需求已完成')
  } catch (error) {
    if (isNeedActionContextCurrent(context)) {
      toast.error(getErrorMessage(error, '产出验收失败'))
    }
  } finally {
    finishNeedActionContext(context)
  }
}

const rejectNeed = async () => {
  if (!need.value || !canReviewSubmission.value || actionBusy.value || !rejectReason.value.trim()) return
  if (!window.confirm('确认退回这份公开交付，并要求认领者修改？')) return
  const reason = rejectReason.value.trim()
  const context = beginNeedActionContext('reject', need.value.id)
  try {
    await collaborationApi.needs.reject(context.targetNeedId, { reason })
    if (!await refreshAfterAction(context)) return
    rejectReason.value = ''
    toast.success('产出已退回认领者修改')
  } catch (error) {
    if (isNeedActionContextCurrent(context)) {
      toast.error(getErrorMessage(error, '产出退回失败'))
    }
  } finally {
    finishNeedActionContext(context)
  }
}

watch([needId, () => authStore.isLoggedIn, () => authStore.user?.uid], () => {
  invalidateNeedActionContext()
  resetActionForms()
  void reloadAll()
}, { flush: 'sync' })

onMounted(() => {
  void reloadAll()
})
</script>

<style scoped>
.need-detail-page {
  min-height: 100vh;
  background: rgb(248 250 252);
  color: rgb(15 23 42);
}

.need-detail-shell {
  width: min(1180px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1.5rem 0 4rem;
}

.page-toolbar,
.eyebrow-row,
.detail-meta,
.action-bar,
.section-heading,
.delivery-row,
.timeline-topline,
.state-panel,
.timeline-state,
.stalled-notice {
  display: flex;
  align-items: center;
}

.page-toolbar {
  justify-content: space-between;
  margin-bottom: 1rem;
}

.back-link,
.text-link,
.text-button {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: rgb(14 116 144);
  font-size: 0.78rem;
  font-weight: 850;
}

.icon {
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
}

.icon-small {
  width: 0.85rem;
  height: 0.85rem;
  flex: 0 0 auto;
}

.icon-button,
.primary-button,
.secondary-button,
.danger-button,
.load-more-button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 6px;
  font-size: 0.76rem;
  font-weight: 850;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, opacity 160ms ease;
}

.icon-button {
  width: 40px;
  border: 1px solid rgb(203 213 225);
  background: white;
  color: rgb(71 85 105);
}

.primary-button,
.secondary-button,
.danger-button {
  padding: 0.5rem 0.75rem;
}

.primary-button {
  border: 1px solid rgb(14 116 144);
  background: rgb(14 116 144);
  color: white;
}

.secondary-button {
  border: 1px solid rgb(203 213 225);
  background: white;
  color: rgb(51 65 85);
}

.danger-button {
  border: 1px solid rgb(220 38 38);
  background: white;
  color: rgb(185 28 28);
}

.icon-button:disabled,
.primary-button:disabled,
.secondary-button:disabled,
.danger-button:disabled,
.load-more-button:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.detail-header,
.content-section,
.action-section,
.loading-panel,
.state-panel {
  border: 1px solid rgb(226 232 240);
  border-radius: 8px;
  background: white;
}

.detail-header {
  padding: clamp(1.1rem, 3vw, 2rem);
}

.eyebrow-row {
  flex-wrap: wrap;
  gap: 0.45rem;
}

.status-badge,
.meta-label {
  display: inline-flex;
  min-height: 1.55rem;
  align-items: center;
  gap: 0.3rem;
  border-radius: 5px;
  padding: 0.2rem 0.55rem;
  font-size: 0.68rem;
  font-weight: 850;
}

.status-badge {
  background: rgb(224 231 255);
  color: rgb(67 56 202);
}

.status-badge[data-status='COMPLETED'] {
  background: rgb(220 252 231);
  color: rgb(21 128 61);
}

.status-badge[data-status='CLOSED'],
.status-badge[data-status='MERGED'] {
  background: rgb(241 245 249);
  color: rgb(71 85 105);
}

.status-badge[data-status='SUBMITTED'] {
  background: rgb(255 251 235);
  color: rgb(146 64 14);
}

.meta-label {
  background: rgb(248 250 252);
  color: rgb(71 85 105);
}

.detail-header h1 {
  max-width: 850px;
  margin: 0.75rem 0 0;
  overflow-wrap: anywhere;
  color: rgb(15 23 42);
  font-size: clamp(1.45rem, 3vw, 2.2rem);
  font-weight: 900;
  line-height: 1.2;
}

.description {
  max-width: 850px;
  margin: 0.8rem 0 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: rgb(71 85 105);
  font-size: 0.92rem;
  line-height: 1.75;
}

.detail-meta {
  flex-wrap: wrap;
  gap: 0.8rem 1.1rem;
  margin-top: 1rem;
  color: rgb(100 116 139);
  font-size: 0.72rem;
}

.detail-meta span {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.action-bar {
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 1.25rem;
}

.login-hint,
.muted-text,
.empty-inline,
.timeline-state {
  color: rgb(100 116 139);
  font-size: 0.76rem;
  line-height: 1.55;
}

.risk-check {
  display: flex;
  max-width: 600px;
  align-items: flex-start;
  gap: 0.45rem;
  margin-top: 0.7rem;
  color: rgb(146 64 14);
  font-size: 0.72rem;
  line-height: 1.5;
}

.risk-check input {
  margin-top: 0.15rem;
  accent-color: rgb(14 116 144);
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  align-items: start;
  gap: 1rem;
  margin-top: 1rem;
}

.main-column,
.side-column {
  display: grid;
  min-width: 0;
  gap: 1rem;
}

.content-section,
.action-section {
  min-width: 0;
  padding: 1.15rem;
}

.section-heading {
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid rgb(226 232 240);
}

.section-heading.compact {
  align-items: flex-start;
}

.section-kicker {
  display: block;
  color: rgb(8 145 178);
  font-size: 0.65rem;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.section-heading h2 {
  margin: 0.2rem 0 0;
  color: rgb(30 41 59);
  font-size: 1rem;
  font-weight: 900;
}

.section-icon {
  width: 1.1rem;
  height: 1.1rem;
  color: rgb(14 116 144);
}

.brief-block {
  padding-top: 1rem;
}

.brief-block + .brief-block {
  margin-top: 1rem;
  border-top: 1px solid rgb(241 245 249);
}

.brief-block h3 {
  margin: 0;
  color: rgb(51 65 85);
  font-size: 0.78rem;
  font-weight: 900;
}

.brief-block p {
  margin: 0.55rem 0 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: rgb(71 85 105);
  font-size: 0.8rem;
  line-height: 1.7;
}

.detail-list {
  display: grid;
  gap: 0.7rem;
  margin: 0.8rem 0 0;
}

.detail-list > div {
  display: grid;
  grid-template-columns: 6rem minmax(0, 1fr);
  gap: 0.75rem;
}

.detail-list dt {
  color: rgb(100 116 139);
  font-size: 0.72rem;
}

.detail-list dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  color: rgb(51 65 85);
  font-size: 0.78rem;
  line-height: 1.55;
}

.delivery-row {
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1rem;
}

.delivery-row > div {
  min-width: 0;
}

.delivery-row strong,
.delivery-row span {
  display: block;
}

.delivery-row strong {
  color: rgb(30 41 59);
  font-size: 0.8rem;
}

.delivery-row span {
  margin-top: 0.25rem;
  color: rgb(100 116 139);
  font-size: 0.73rem;
}

.empty-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 1rem;
}

.participant-list {
  padding-top: 0.2rem;
}

.cycle-list,
.revision-list {
  display: grid;
  gap: 0.65rem;
}

.cycle-list {
  margin-top: 0.9rem;
}

.cycle-card {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.6rem;
  background: rgb(248 250 252);
  padding: 0.8rem;
}

.cycle-heading,
.revision-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.cycle-heading {
  justify-content: space-between;
}

.cycle-heading strong {
  color: rgb(30 41 59);
  font-size: 0.8rem;
}

.cycle-heading span,
.revision-row strong {
  color: rgb(71 85 105);
  font-size: 0.7rem;
}

.cycle-card > p {
  margin: 0.35rem 0 0;
  color: rgb(100 116 139);
  font-size: 0.72rem;
}

.revision-list {
  margin-top: 0.7rem;
}

.revision-row {
  min-width: 0;
  flex-wrap: wrap;
  border-top: 1px solid rgb(226 232 240);
  padding-top: 0.6rem;
  color: rgb(71 85 105);
  font-size: 0.72rem;
}

.revision-row time {
  margin-left: auto;
  color: rgb(100 116 139);
}

.danger-text {
  color: rgb(185 28 28) !important;
}

.stalled-notice {
  align-items: flex-start;
  gap: 0.65rem;
  border-left: 3px solid rgb(245 158 11);
  background: rgb(255 251 235);
  padding: 0.85rem 1rem;
  color: rgb(146 64 14);
}

.stalled-notice strong,
.stalled-notice span {
  display: block;
}

.stalled-notice strong {
  font-size: 0.78rem;
}

.stalled-notice span {
  margin-top: 0.2rem;
  font-size: 0.72rem;
  line-height: 1.5;
}

.timeline-section {
  min-width: 0;
  padding: 0.15rem 0.2rem;
}

.timeline-list {
  position: relative;
  display: grid;
  gap: 0;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
}

.timeline-list::before {
  position: absolute;
  top: 0.7rem;
  bottom: 0.7rem;
  left: 0.65rem;
  width: 1px;
  background: rgb(203 213 225);
  content: '';
}

.timeline-item {
  position: relative;
  display: flex;
  min-width: 0;
  gap: 0.75rem;
  padding: 0 0 1.1rem;
}

.timeline-marker {
  z-index: 1;
  display: inline-flex;
  width: 1.3rem;
  height: 1.3rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(165 243 252);
  border-radius: 50%;
  background: rgb(236 254 255);
  color: rgb(14 116 144);
}

.timeline-content {
  min-width: 0;
  flex: 1;
  padding-top: 0.05rem;
}

.timeline-topline {
  justify-content: space-between;
  gap: 0.75rem;
}

.timeline-topline strong {
  color: rgb(30 41 59);
  font-size: 0.8rem;
}

.timeline-topline time {
  flex: 0 0 auto;
  color: rgb(100 116 139);
  font-size: 0.68rem;
}

.status-transition,
.event-note,
.event-actor {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin: 0.3rem 0 0;
  overflow-wrap: anywhere;
  color: rgb(71 85 105);
  font-size: 0.73rem;
  line-height: 1.5;
}

.event-note {
  white-space: pre-wrap;
}

.event-actor {
  color: rgb(100 116 139);
  font-size: 0.67rem;
}

.action-form,
.action-stack {
  display: grid;
  gap: 0.75rem;
  padding-top: 1rem;
}

.action-form label,
.action-stack label {
  display: grid;
  gap: 0.35rem;
  color: rgb(51 65 85);
  font-size: 0.72rem;
  font-weight: 800;
}

.field-control {
  width: 100%;
  min-width: 0;
  border: 1px solid rgb(203 213 225);
  border-radius: 6px;
  background: white;
  padding: 0.58rem 0.65rem;
  color: rgb(15 23 42);
  font-size: 0.78rem;
  line-height: 1.45;
  outline: none;
}

.field-control:focus {
  border-color: rgb(8 145 178);
  box-shadow: 0 0 0 3px rgb(165 243 252 / 0.65);
}

.full-width {
  width: 100%;
}

.timeline-loading {
  display: grid;
  gap: 1rem;
  padding: 1rem 0.15rem;
}

.timeline-skeleton {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.timeline-skeleton i,
.timeline-skeleton b {
  display: block;
  border-radius: 4px;
  background: rgb(226 232 240);
}

.timeline-skeleton i {
  width: 1.3rem;
  height: 1.3rem;
  border-radius: 50%;
}

.timeline-skeleton b {
  width: 65%;
  height: 0.7rem;
}

.state-panel,
.timeline-state {
  gap: 0.8rem;
  border-radius: 8px;
  padding: 1.25rem;
}

.state-panel > div {
  min-width: 0;
  flex: 1;
}

.state-panel h1 {
  margin: 0;
  color: rgb(51 65 85);
  font-size: 0.95rem;
  font-weight: 900;
}

.state-panel p {
  margin: 0.25rem 0 0;
  color: rgb(100 116 139);
  font-size: 0.76rem;
  line-height: 1.5;
}

.state-icon {
  width: 1.3rem;
  height: 1.3rem;
  flex: 0 0 auto;
  color: rgb(14 116 144);
}

.error-panel {
  border-color: rgb(254 202 202);
  background: rgb(254 242 242);
}

.error-panel .state-icon,
.error-panel > .icon,
.error-panel span {
  color: rgb(185 28 28);
}

.loading-panel {
  display: grid;
  gap: 0.75rem;
  padding: clamp(1.1rem, 3vw, 2rem);
}

.skeleton {
  display: block;
  height: 0.8rem;
  border-radius: 4px;
  background: rgb(226 232 240);
}

.skeleton-kicker {
  width: 25%;
  height: 0.6rem;
}

.skeleton-title {
  width: 68%;
  height: 2rem;
  margin-top: 0.35rem;
}

.skeleton-line {
  width: 82%;
}

.skeleton-line-short {
  width: 52%;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
  margin-top: 0.4rem;
}

.skeleton-meta {
  height: 1.4rem;
}

.load-more-button {
  margin: 0.5rem auto 0;
  border: 1px solid rgb(14 116 144);
  background: white;
  padding: 0.5rem 0.75rem;
  color: rgb(14 116 144);
}

.spin {
  animation: spin 900ms linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 820px) {
  .content-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .side-column {
    order: -1;
  }
}

@media (max-width: 600px) {
  .need-detail-shell {
    width: min(100% - 1rem, 1180px);
    padding-top: 1rem;
  }

  .detail-header,
  .content-section,
  .action-section,
  .state-panel,
  .loading-panel {
    border-radius: 7px;
    padding: 1rem;
  }

  .action-bar,
  .detail-meta {
    align-items: flex-start;
    flex-direction: column;
  }

  .action-bar > .primary-button,
  .action-bar > .secondary-button {
    width: 100%;
  }

  .delivery-row,
  .state-panel,
  .timeline-topline {
    align-items: flex-start;
    flex-direction: column;
  }

  .timeline-topline time {
    margin-top: 0.1rem;
  }

  .detail-list > div {
    grid-template-columns: minmax(5rem, 0.35fr) minmax(0, 1fr);
  }

  .skeleton-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.dark .need-detail-page {
  background: rgb(2 6 23);
  color: rgb(226 232 240);
}

.dark .detail-header,
.dark .content-section,
.dark .action-section,
.dark .loading-panel,
.dark .state-panel,
.dark .icon-button,
.dark .secondary-button,
.dark .danger-button,
.dark .load-more-button,
.dark .field-control {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .detail-header h1,
.dark .section-heading h2,
.dark .brief-block h3,
.dark .delivery-row strong,
.dark .timeline-topline strong,
.dark .state-panel h1 {
  color: rgb(248 250 252);
}

.dark .description,
.dark .detail-meta,
.dark .brief-block p,
.dark .detail-list dd,
.dark .delivery-row span,
.dark .timeline-topline time,
.dark .status-transition,
.dark .event-note,
.dark .event-actor,
.dark .state-panel p,
.dark .muted-text,
.dark .empty-inline,
.dark .timeline-state {
  color: rgb(148 163 184);
}

.dark .meta-label,
.dark .status-badge[data-status='CLOSED'],
.dark .status-badge[data-status='MERGED'] {
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}

.dark .section-heading,
.dark .brief-block + .brief-block {
  border-color: rgb(51 65 85);
}

.dark .stalled-notice {
  border-left-color: rgb(245 158 11);
  background: rgb(120 53 15 / 0.28);
  color: rgb(253 230 138);
}

.dark .timeline-list::before {
  background: rgb(51 65 85);
}

.dark .timeline-marker {
  border-color: rgb(21 94 117);
  background: rgb(8 47 73);
}

.dark .timeline-skeleton i,
.dark .timeline-skeleton b,
.dark .skeleton {
  background: rgb(30 41 59);
}

.dark .error-panel {
  border-color: rgb(127 29 29);
  background: rgb(69 10 10 / 0.45);
}
</style>
