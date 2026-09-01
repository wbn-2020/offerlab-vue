<template>
  <section
    class="my-collaborations-workspace"
    data-my-claimed-needs
    :data-my-created-needs="activeScope === 'created' ? '' : undefined"
    :data-my-followed-needs="activeScope === 'followed' ? '' : undefined"
    :data-participation-state="workspaceState"
  >
    <header class="workspace-heading">
      <div>
        <p>我的共建</p>
        <h2>{{ scopeTitle }}</h2>
        <span>{{ scopeDescription }}</span>
      </div>
      <div class="workspace-controls">
        <select
          v-model="statusFilter"
          class="status-select"
          :aria-label="statusFilterLabel"
          @change="handleStatusChange"
        >
          <option value="">全部状态</option>
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <button
          type="button"
          class="icon-button"
          :title="refreshLabel"
          :aria-label="refreshLabel"
          :disabled="state.loading"
          @click="loadNeeds()"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': state.loading }" aria-hidden="true" />
        </button>
      </div>
    </header>

    <nav class="scope-switch" aria-label="我的共建视图">
      <button
        type="button"
        :class="{ active: activeScope === 'claimed' }"
        :aria-pressed="activeScope === 'claimed'"
        @click="selectScope('claimed')"
      >
        <Hand class="h-4 w-4" aria-hidden="true" />
        我认领的
      </button>
      <button
        type="button"
        :class="{ active: activeScope === 'created' }"
        :aria-pressed="activeScope === 'created'"
        @click="selectScope('created')"
      >
        <ListPlus class="h-4 w-4" aria-hidden="true" />
        我发起的
      </button>
      <button
        type="button"
        :class="{ active: activeScope === 'followed' }"
        :aria-pressed="activeScope === 'followed'"
        @click="selectScope('followed')"
      >
        <Bell class="h-4 w-4" aria-hidden="true" />
        我关注的
      </button>
    </nav>

    <div v-if="!authStore.isLoggedIn" class="state-message">
      <LogIn class="h-5 w-5" aria-hidden="true" />
      <div>
        <strong>登录后查看我的共建</strong>
        <p>登录后可以回看自己认领或发起的需求和交付进度。</p>
      </div>
    </div>

    <div v-else-if="state.loading" class="loading-list" :aria-label="loadingLabel">
      <div v-for="index in 4" :key="index" class="skeleton-row">
        <span class="skeleton-line skeleton-line-short" />
        <span class="skeleton-line" />
        <span class="skeleton-line skeleton-line-medium" />
      </div>
    </div>

    <div v-else-if="state.initialError" class="state-message state-message-error" role="alert">
      <AlertCircle class="h-5 w-5" aria-hidden="true" />
      <div>
        <strong>我的共建加载失败</strong>
        <p>{{ state.initialError }}</p>
      </div>
      <button type="button" @click="loadNeeds()">重试</button>
    </div>

    <div v-else-if="!state.items.length" class="state-message">
      <Inbox class="h-6 w-6" aria-hidden="true" />
      <div>
        <strong>{{ emptyTitle }}</strong>
        <p>{{ emptyDescription }}</p>
      </div>
      <button type="button" @click="emit('browse-needs')">
        {{ emptyActionLabel }}
        <ArrowRight class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>

    <div v-else class="claimed-need-list">
      <article v-for="need in state.items" :key="need.id" class="claimed-need-row">
        <div class="row-heading">
          <div class="row-title">
            <div class="badge-line">
              <span class="status-badge" :data-status="need.status">{{ statusLabel(need.status) }}</span>
              <span v-if="isClaimedByCurrentUser(need)" class="claimant-badge">
                <Hand class="h-3.5 w-3.5" aria-hidden="true" />
                这是我认领的
              </span>
              <span v-if="isCreatedByCurrentUser(need)" class="creator-badge">
                <ListPlus class="h-3.5 w-3.5" aria-hidden="true" />
                这是我发起的
              </span>
              <span class="meta-badge">{{ domainLabel(need.domain) }}</span>
              <span class="meta-badge">{{ formatLabel(need.contentFormat) }}</span>
            </div>
            <h3>{{ need.title }}</h3>
          </div>
          <time :datetime="need.updateTime">{{ formatDate(need.updateTime) }}</time>
        </div>

        <p class="row-description">{{ need.description }}</p>

        <div class="delivery-state" :data-tone="deliveryState(need).tone">
          <component :is="deliveryState(need).icon" class="h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <strong>{{ deliveryState(need).title }}</strong>
            <span>{{ deliveryState(need).description }}</span>
          </div>
        </div>

        <div
          v-if="activeScope === 'created' && need.status === 'CLAIMED'"
          class="progress-note"
          :data-stalled="need.stalled ? '' : undefined"
        >
          <Clock3 class="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            最近进展：{{ formatDate(need.lastProgressAt || need.claimedAt || need.updateTime) }}
            <template v-if="need.stalled"> · 暂时没有新的公开进展，可以先查看详情确认情况</template>
          </span>
        </div>

        <div v-if="need.status === 'SUBMITTED'" class="submission-summary">
          <div>
            <strong>待验收产出</strong>
            <span>{{ submissionTargetLabel(need) }}</span>
            <small v-if="need.submissionNote">{{ need.submissionNote }}</small>
            <time v-if="need.submittedAt" :datetime="need.submittedAt">
              提交于 {{ formatDate(need.submittedAt) }}
            </time>
          </div>
          <RouterLink
            v-if="submissionPath(need)"
            :to="submissionPath(need)!"
            class="result-link"
          >
            查看产出
            <ArrowRight class="h-4 w-4" aria-hidden="true" />
          </RouterLink>
        </div>

        <div
          v-if="activeScope === 'created'
            && need.status === 'SUBMITTED'
            && isCreatedByCurrentUser(need)"
          class="creator-review"
        >
          <button
            type="button"
            class="primary-action"
            :disabled="actionBusy"
            @click="acceptNeed(need)"
          >
            <Loader2
              v-if="pendingAction === `accept:${need.id}`"
              class="h-4 w-4 animate-spin"
              aria-hidden="true"
            />
            <FileCheck2 v-else class="h-4 w-4" aria-hidden="true" />
            验收通过
          </button>
          <div class="review-reject">
            <input
              v-model.trim="rejectReasons[String(need.id)]"
              class="field-control"
              maxlength="500"
              placeholder="填写退回理由"
              :aria-label="`需求 ${need.title} 的退回理由`"
            >
            <button
              type="button"
              class="secondary-action"
              :disabled="actionBusy || !rejectReasons[String(need.id)]?.trim()"
              @click="rejectNeed(need)"
            >
              <Loader2
                v-if="pendingAction === `reject:${need.id}`"
                class="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              <X v-else class="h-4 w-4" aria-hidden="true" />
              退回修改
            </button>
          </div>
        </div>

        <div v-else-if="need.status === 'CLAIMED' && need.rejectReason" class="reject-notice">
          <AlertCircle class="h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <strong>{{ activeScope === 'created' ? '已退回认领者修改' : '创建者已退回' }}</strong>
            <span>{{ need.rejectReason }}</span>
          </div>
        </div>

        <form
          v-if="activeSubmissionNeedId === String(need.id)"
          class="submission-form"
          @submit.prevent="submitNeed(need)"
        >
          <CollaborationDeliverySelector
            v-model="selectedDeliveryCandidate"
            :need-id="need.id"
            :initial-resolution-type="submissionForm.resolutionType"
            :return-href="`/collaboration?tab=my-collaborations&scope=${activeScope}`"
            @select="applyDeliveryCandidate"
          />
          <details class="manual-delivery-fallback">
            <summary>候选中没有目标资源时手动填写</summary>
            <div class="field-grid">
              <label>
                <span>产出类型</span>
                <select v-model="submissionForm.resolutionType" class="field-control">
                  <option value="POST">帖子</option>
                  <option value="QUESTION">问题</option>
                  <option value="SERIES">合集</option>
                </select>
              </label>
              <label>
                <span>对象 ID</span>
                <input
                  v-model.trim="submissionForm.resolutionId"
                  class="field-control"
                  inputmode="numeric"
                >
              </label>
            </div>
          </details>
          <label>
            <span>提交说明</span>
            <textarea
              v-model.trim="submissionForm.note"
              class="field-control"
              rows="3"
              maxlength="1000"
              placeholder="说明这份产出如何满足验收标准"
            />
          </label>
          <div class="form-actions">
            <button
              type="button"
              class="secondary-action"
              :disabled="actionBusy"
              @click="cancelSubmission"
            >
              <X class="h-4 w-4" aria-hidden="true" />
              取消
            </button>
            <button
              type="submit"
              class="primary-action"
              :disabled="!canSubmitNeed"
            >
              <Loader2
                v-if="pendingAction === `submit:${need.id}`"
                class="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              <Send v-else class="h-4 w-4" aria-hidden="true" />
              提交验收
            </button>
          </div>
        </form>

        <form
          v-if="activeReleaseNeedId === String(need.id)"
          class="release-form"
          data-need-release-confirmation
          @submit.prevent="releaseNeed(need)"
        >
          <label>
            <span>释放说明（可选）</span>
            <textarea
              v-model.trim="releaseNote"
              class="field-control"
              rows="2"
              maxlength="500"
              placeholder="简要说明无法继续推进的情况"
            />
          </label>
          <p>确认后需求会重新开放，其他成员可以认领。</p>
          <div class="form-actions">
            <button
              type="button"
              class="secondary-action"
              :disabled="actionBusy"
              @click="cancelRelease"
            >
              <X class="h-4 w-4" aria-hidden="true" />
              取消
            </button>
            <button type="submit" class="danger-action" :disabled="actionBusy">
              <Loader2
                v-if="pendingAction === `release:${need.id}`"
                class="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              <LogOut v-else class="h-4 w-4" aria-hidden="true" />
              确认释放
            </button>
          </div>
        </form>

        <div class="row-footer">
          <span>公开协作需求</span>
          <div class="row-actions">
            <button
              v-if="activeScope === 'claimed'
                && need.status === 'CLAIMED'
                && isClaimedByCurrentUser(need)
                && activeSubmissionNeedId !== String(need.id)"
              type="button"
              class="primary-action"
              :disabled="actionBusy"
              @click="startSubmission(need)"
            >
              <Send class="h-4 w-4" aria-hidden="true" />
              {{ need.rejectReason ? '修改并重新提交' : '提交产出' }}
            </button>
            <button
              v-if="activeScope === 'claimed'
                && need.status === 'CLAIMED'
                && isClaimedByCurrentUser(need)
                && activeReleaseNeedId !== String(need.id)"
              type="button"
              class="secondary-action"
              :disabled="actionBusy"
              @click="startRelease(need)"
            >
              <LogOut class="h-4 w-4" aria-hidden="true" />
              释放认领
            </button>
            <button
              v-if="activeScope === 'claimed'
                && need.status === 'SUBMITTED'
                && isClaimedByCurrentUser(need)"
              type="button"
              class="secondary-action"
              :disabled="actionBusy"
              @click="withdrawNeed(need)"
            >
              <Loader2
                v-if="pendingAction === `withdraw:${need.id}`"
                class="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              <Undo2 v-else class="h-4 w-4" aria-hidden="true" />
              撤回提交
            </button>
            <RouterLink
              :to="`/collaboration/needs/${need.id}`"
              class="result-link need-detail-link"
            >
              查看详情
              <ArrowRight class="h-4 w-4" aria-hidden="true" />
            </RouterLink>
            <RouterLink
              v-if="resolutionPath(need)"
              :to="resolutionPath(need)!"
              class="result-link"
            >
              查看公开交付
              <ArrowRight class="h-4 w-4" aria-hidden="true" />
            </RouterLink>
          </div>
        </div>
      </article>
    </div>

    <div
      v-if="state.loadMoreError"
      class="state-message state-message-error"
      role="alert"
    >
      <AlertCircle class="h-5 w-5" aria-hidden="true" />
      <div>
        <strong>加载更多失败</strong>
        <p>{{ state.loadMoreError }}</p>
      </div>
      <button type="button" :disabled="state.loadingMore" @click="loadNeeds(true)">
        重试加载更多
      </button>
    </div>

    <button
      v-if="state.hasMore && !state.loading && !state.loadMoreError"
      type="button"
      class="load-more"
      :disabled="state.loadingMore"
      @click="loadNeeds(true)"
    >
      <Loader2 v-if="state.loadingMore" class="h-4 w-4 animate-spin" aria-hidden="true" />
      {{ state.loadingMore ? '加载中' : loadMoreLabel }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, type Component } from 'vue'
import { RouterLink, useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CircleDot,
  Clock3,
  FileCheck2,
  GitMerge,
  Hand,
  Inbox,
  ListPlus,
  Loader2,
  LockKeyhole,
  LogIn,
  LogOut,
  RefreshCw,
  Send,
  Undo2,
  X,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import {
  collaborationApi,
  type CollaborationNeed,
  type NeedDeliveryCandidate,
  type NeedContentFormat,
  type NeedResolutionType,
  type NeedStatus,
} from '@/api/collaboration'
import { getErrorMessage } from '@/api/client'
import { localDomainConfigs } from '@/api/domains'
import { useAuthStore } from '@/stores/auth'
import CollaborationDeliverySelector from './CollaborationDeliverySelector.vue'

const emit = defineEmits<{
  'browse-needs': []
}>()

type WorkspaceScope = 'claimed' | 'created' | 'followed'
type WorkspaceActionContext = {
  generation: number
  action: string
  uid: string
  scope: WorkspaceScope
}

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const workspaceScopes = new Set<WorkspaceScope>(['claimed', 'created', 'followed'])
const workspaceStatuses = new Set<NeedStatus>(['OPEN', 'CLAIMED', 'SUBMITTED', 'COMPLETED', 'CLOSED', 'MERGED'])
const firstQueryValue = (value: unknown) => Array.isArray(value) ? value[0] : value
const readRouteScope = () => {
  const value = String(firstQueryValue(route.query.scope) || '').toLowerCase() as WorkspaceScope
  return workspaceScopes.has(value) ? value : 'claimed'
}
const readRouteStatus = () => {
  const value = String(firstQueryValue(route.query.status) || '').toUpperCase() as NeedStatus
  return workspaceStatuses.has(value) ? value : ''
}
const activeScope = ref<WorkspaceScope>(readRouteScope())
const statusFilter = ref<NeedStatus | ''>(readRouteStatus())
const activeSubmissionNeedId = ref('')
const activeReleaseNeedId = ref('')
const releaseNote = ref('')
const pendingAction = ref('')
const selectedDeliveryCandidate = ref<NeedDeliveryCandidate | null>(null)
const rejectReasons = reactive<Record<string, string>>({})
const submissionForm = reactive({
  resolutionType: 'POST' as NeedResolutionType,
  resolutionId: '',
  note: '',
})
const state = reactive({
  items: [] as CollaborationNeed[],
  loading: false,
  loadingMore: false,
  initialError: '',
  loadMoreError: '',
  nextCursor: '',
  hasMore: false,
})
let requestId = 0
let actionGeneration = 0

const statusOptions: Array<{ value: NeedStatus; label: string }> = [
  { value: 'CLAIMED', label: '进行中' },
  { value: 'SUBMITTED', label: '待验收' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CLOSED', label: '已关闭' },
  { value: 'MERGED', label: '已合并' },
  { value: 'OPEN', label: '待处理' },
]

const statusLabels: Record<NeedStatus, string> = {
  OPEN: '待处理',
  CLAIMED: '进行中',
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

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const currentUid = () => String(authStore.user?.uid ?? '')
const actionBusy = computed(() => Boolean(pendingAction.value))
const beginActionContext = (action: string): WorkspaceActionContext => {
  const context = {
    generation: ++actionGeneration,
    action,
    uid: currentUid(),
    scope: activeScope.value,
  }
  pendingAction.value = action
  return context
}
const isActionContextCurrent = (context: WorkspaceActionContext) => (
  context.generation === actionGeneration
  && context.action === pendingAction.value
  && context.uid === currentUid()
  && context.scope === activeScope.value
)
const invalidateActionContext = () => {
  actionGeneration += 1
  pendingAction.value = ''
}
const finishActionContext = (context: WorkspaceActionContext) => {
  if (isActionContextCurrent(context)) pendingAction.value = ''
}
const refreshForAction = async (context: WorkspaceActionContext) => {
  if (!isActionContextCurrent(context)) return false
  await loadNeeds()
  return isActionContextCurrent(context)
}
const scopeTitle = computed(() => (
  activeScope.value === 'claimed'
    ? '我认领的需求'
    : activeScope.value === 'created'
      ? '我发起的需求'
      : '我关注的需求'
))
const scopeDescription = computed(() => (
  activeScope.value === 'claimed'
    ? '回看已经认领的内容需求，以及当前交付进度。'
    : activeScope.value === 'created'
      ? '跟进自己发起的内容需求，并处理认领者提交的公开产出。'
      : '从服务端读取仍在关注的需求，回看最新状态和公开进展。'
))
const statusFilterLabel = computed(() => (
  activeScope.value === 'claimed'
    ? '按状态筛选我认领的需求'
    : activeScope.value === 'created'
      ? '按状态筛选我发起的需求'
      : '按状态筛选我关注的需求'
))
const loadingLabel = computed(() => (
  activeScope.value === 'claimed'
    ? '我认领的需求加载中'
    : activeScope.value === 'created'
      ? '我发起的需求加载中'
      : '我关注的需求加载中'
))
const emptyTitle = computed(() => {
  if (statusFilter.value) return '当前状态下没有共建记录'
  if (activeScope.value === 'claimed') return '还没有认领的需求'
  if (activeScope.value === 'created') return '还没有发起需求'
  return '还没有关注需求'
})
const emptyDescription = computed(() => {
  if (statusFilter.value) return '可以切换状态查看其他共建记录。'
  return activeScope.value === 'claimed'
    ? '去看看社区需要什么，找到适合参与的内容需求。'
    : activeScope.value === 'created'
      ? '可以从公开需求区发起一个清晰、可验收的内容需求。'
      : '在公开需求列表关注感兴趣的需求后，会出现在这里。'
})
const emptyActionLabel = computed(() => (
  activeScope.value === 'created' ? '去发起需求' : '浏览公开需求'
))
const loadMoreLabel = computed(() => (
  activeScope.value === 'claimed'
    ? '加载更多认领记录'
    : activeScope.value === 'created'
      ? '加载更多发起记录'
      : '加载更多关注记录'
))
const refreshLabel = computed(() => (
  activeScope.value === 'claimed'
    ? '刷新我认领的需求'
    : activeScope.value === 'created'
      ? '刷新我发起的需求'
      : '刷新我关注的需求'
))
const workspaceState = computed(() => {
  if (!authStore.isLoggedIn || (!state.loading && !state.initialError && !state.items.length)) return 'empty'
  if (state.loading && !state.items.length) return 'loading'
  if (state.initialError && !state.items.length) return 'error'
  return 'ready'
})
const canSubmitNeed = computed(() => (
  !actionBusy.value
  && /^[1-9]\d*$/.test(submissionForm.resolutionId)
))
const isClaimedByCurrentUser = (need: CollaborationNeed) => (
  activeScope.value === 'claimed'
  && Boolean(currentUid())
  && String(need.claimedByUid ?? '') === currentUid()
)
const isCreatedByCurrentUser = (need: CollaborationNeed) => (
  activeScope.value === 'created'
  && Boolean(currentUid())
  && String(need.creatorUid ?? '') === currentUid()
)
const domainLabel = (domain: number) => (
  localDomainConfigs.find((item) => Number(item.domain) === Number(domain))?.domainName || `领域 ${domain}`
)
const statusLabel = (status: NeedStatus) => statusLabels[status] || status
const formatLabel = (format: NeedContentFormat) => formatLabels[format] || format
const formatDate = (value?: string | null) => {
  if (!value) return '更新时间待定'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

const deliveryState = (need: CollaborationNeed): {
  title: string
  description: string
  tone: string
  icon: Component
} => {
  if (need.status === 'SUBMITTED') {
    return {
      title: activeScope.value === 'created' ? '待你验收' : '已提交，等待创建者验收',
      description: submissionTargetLabel(need),
      tone: 'warning',
      icon: CircleDot,
    }
  }
  if (need.status === 'COMPLETED') {
    const target = need.resolutionId || need.resolutionPostId
    return {
      title: '公开交付已完成',
      description: target ? `${need.resolutionType || 'POST'} #${target}` : '需求已完成，交付信息以需求记录为准。',
      tone: 'success',
      icon: FileCheck2,
    }
  }
  if (need.status === 'CLOSED') {
    return {
      title: '需求已关闭',
      description: need.closedReason || '该需求已结束，不再等待新的公开交付。',
      tone: 'muted',
      icon: LockKeyhole,
    }
  }
  if (need.status === 'MERGED') {
    return {
      title: '需求已合并',
      description: '后续进展已转入合并后的需求。',
      tone: 'muted',
      icon: GitMerge,
    }
  }
  if (need.status === 'OPEN') {
    return {
      title: '等待认领',
      description: '需求仍然开放，社区成员可以认领并开始交付。',
      tone: 'active',
      icon: CircleDot,
    }
  }
  if (need.status === 'CLAIMED' && activeScope.value === 'created') {
    return {
      title: need.rejectReason ? '等待认领者修改后重新提交' : '交付进行中',
      description: need.rejectReason
        || (need.claimedByUid
          ? `认领者 UID ${need.claimedByUid} 正在推进这项需求。`
          : '需求已经认领，等待公开产出提交。'),
      tone: 'active',
      icon: CircleDot,
    }
  }
  return {
    title: need.status === 'CLAIMED'
      ? (need.rejectReason ? '产出已退回，请修改后重新提交' : '交付进行中')
      : '等待状态更新',
    description: need.status === 'CLAIMED'
      ? (need.rejectReason || '需求已经认领，可以在这里提交公开产出。')
      : '当前记录仍在认领关系中，请关注后续状态变化。',
    tone: 'active',
    icon: CircleDot,
  }
}

const resolutionPath = (need: CollaborationNeed): RouteLocationRaw | null => {
  if (need.resolutionType === 'QUESTION' && need.resolutionId) return `/questions/${need.resolutionId}`
  if (need.resolutionType === 'SERIES' && need.resolutionId) {
    return {
      path: '/collaboration',
      query: { tab: 'series', seriesId: String(need.resolutionId) },
    }
  }
  const postId = need.resolutionPostId || (need.resolutionType === 'POST' ? need.resolutionId : null)
  if (postId) return `/post/${postId}`
  return null
}

const submissionTargetLabel = (need: CollaborationNeed) => {
  const type = need.submissionResolutionType
  const id = need.submissionResolutionId
  if (!type || !id) return '提交记录待刷新'
  const label: Record<NeedResolutionType, string> = {
    POST: '帖子',
    QUESTION: '问题',
    SERIES: '合集',
  }
  return `${label[type]} #${id}`
}

const submissionPath = (need: CollaborationNeed): RouteLocationRaw | null => {
  if (!need.submissionResolutionId) return null
  if (need.submissionResolutionType === 'QUESTION') {
    return `/questions/${need.submissionResolutionId}`
  }
  if (need.submissionResolutionType === 'SERIES') {
    return {
      path: '/collaboration',
      query: { tab: 'series', seriesId: String(need.submissionResolutionId) },
    }
  }
  if (need.submissionResolutionType === 'POST') {
    return `/post/${need.submissionResolutionId}`
  }
  return null
}

const startSubmission = (need: CollaborationNeed) => {
  if (activeScope.value !== 'claimed'
    || actionBusy.value
    || need.status !== 'CLAIMED'
    || !isClaimedByCurrentUser(need)) return
  cancelRelease()
  activeSubmissionNeedId.value = String(need.id)
  selectedDeliveryCandidate.value = null
  submissionForm.resolutionType = need.submissionResolutionType || 'POST'
  submissionForm.resolutionId = need.submissionResolutionId
    ? String(need.submissionResolutionId)
    : ''
  submissionForm.note = need.submissionNote || ''
}

const cancelSubmission = () => {
  activeSubmissionNeedId.value = ''
  selectedDeliveryCandidate.value = null
  Object.assign(submissionForm, {
    resolutionType: 'POST',
    resolutionId: '',
    note: '',
  })
}

const applyDeliveryCandidate = (candidate: NeedDeliveryCandidate) => {
  selectedDeliveryCandidate.value = candidate
  submissionForm.resolutionType = candidate.resolutionType
  submissionForm.resolutionId = String(candidate.id)
}

const cancelRelease = () => {
  activeReleaseNeedId.value = ''
  releaseNote.value = ''
}

const startRelease = (need: CollaborationNeed) => {
  if (activeScope.value !== 'claimed'
    || actionBusy.value
    || need.status !== 'CLAIMED'
    || !isClaimedByCurrentUser(need)) return
  cancelSubmission()
  activeReleaseNeedId.value = String(need.id)
  releaseNote.value = ''
}

const submitNeed = async (need: CollaborationNeed) => {
  if (!canSubmitNeed.value
    || activeSubmissionNeedId.value !== String(need.id)
    || !isClaimedByCurrentUser(need)) return
  const action = `submit:${need.id}`
  const context = beginActionContext(action)
  const payload = {
    resolutionType: submissionForm.resolutionType,
    resolutionId: submissionForm.resolutionId,
    resolutionPostId: submissionForm.resolutionType === 'POST'
      ? submissionForm.resolutionId
      : undefined,
    note: submissionForm.note || undefined,
  }
  try {
    await collaborationApi.needs.submit(need.id, payload)
    if (!isActionContextCurrent(context)) return
    cancelSubmission()
    if (!await refreshForAction(context)) return
    toast.success('产出已提交，等待创建者验收')
  } catch (error) {
    if (isActionContextCurrent(context)) {
      toast.error(getErrorMessage(error, '产出提交失败'))
    }
  } finally {
    finishActionContext(context)
  }
}

const withdrawNeed = async (need: CollaborationNeed) => {
  if (activeScope.value !== 'claimed'
    || actionBusy.value
    || need.status !== 'SUBMITTED'
    || !isClaimedByCurrentUser(need)) return
  const context = beginActionContext(`withdraw:${need.id}`)
  try {
    await collaborationApi.needs.withdraw(need.id)
    if (!await refreshForAction(context)) return
    toast.success('提交已撤回，可以修改后再次提交')
  } catch (error) {
    if (isActionContextCurrent(context)) {
      toast.error(getErrorMessage(error, '撤回提交失败'))
    }
  } finally {
    finishActionContext(context)
  }
}

const releaseNeed = async (need: CollaborationNeed) => {
  if (activeScope.value !== 'claimed'
    || actionBusy.value
    || activeReleaseNeedId.value !== String(need.id)
    || need.status !== 'CLAIMED'
    || !isClaimedByCurrentUser(need)) return
  const note = releaseNote.value.trim()
  const context = beginActionContext(`release:${need.id}`)
  try {
    await collaborationApi.needs.release(need.id, {
      note: note || undefined,
    })
    if (!isActionContextCurrent(context)) return
    cancelRelease()
    if (!await refreshForAction(context)) return
    toast.success('认领已释放，需求已重新开放')
  } catch (error) {
    if (isActionContextCurrent(context)) {
      toast.error(getErrorMessage(error, '释放认领失败'))
    }
  } finally {
    finishActionContext(context)
  }
}

const acceptNeed = async (need: CollaborationNeed) => {
  if (activeScope.value !== 'created'
    || actionBusy.value
    || need.status !== 'SUBMITTED'
    || !isCreatedByCurrentUser(need)) return
  const context = beginActionContext(`accept:${need.id}`)
  try {
    await collaborationApi.needs.accept(need.id)
    if (!isActionContextCurrent(context)) return
    delete rejectReasons[String(need.id)]
    if (!await refreshForAction(context)) return
    toast.success('产出已验收，需求已完成')
  } catch (error) {
    if (isActionContextCurrent(context)) {
      toast.error(getErrorMessage(error, '产出验收失败'))
    }
  } finally {
    finishActionContext(context)
  }
}

const rejectNeed = async (need: CollaborationNeed) => {
  const reason = rejectReasons[String(need.id)]?.trim()
  if (activeScope.value !== 'created'
    || actionBusy.value
    || need.status !== 'SUBMITTED'
    || !isCreatedByCurrentUser(need)
    || !reason) return
  const context = beginActionContext(`reject:${need.id}`)
  try {
    await collaborationApi.needs.reject(need.id, { reason })
    if (!isActionContextCurrent(context)) return
    delete rejectReasons[String(need.id)]
    if (!await refreshForAction(context)) return
    toast.success('产出已退回认领者修改')
  } catch (error) {
    if (isActionContextCurrent(context)) {
      toast.error(getErrorMessage(error, '产出退回失败'))
    }
  } finally {
    finishActionContext(context)
  }
}

const clearState = () => {
  requestId += 1
  invalidateActionContext()
  cancelSubmission()
  cancelRelease()
  for (const needId of Object.keys(rejectReasons)) delete rejectReasons[needId]
  state.items = []
  state.loading = false
  state.loadingMore = false
  state.initialError = ''
  state.loadMoreError = ''
  state.nextCursor = ''
  state.hasMore = false
}

const selectScope = (scope: WorkspaceScope) => {
  if (activeScope.value === scope) return
  activeScope.value = scope
  statusFilter.value = ''
  clearState()
  void syncWorkspaceQuery()
  void loadNeeds()
}

const handleStatusChange = () => {
  const nextStatus = statusFilter.value
  clearState()
  statusFilter.value = nextStatus
  void syncWorkspaceQuery()
  void loadNeeds()
}

const syncWorkspaceQuery = () => router.replace({
  path: route.path,
  query: {
    ...route.query,
    scope: activeScope.value === 'claimed' ? undefined : activeScope.value,
    status: statusFilter.value || undefined,
  },
})

const loadNeeds = async (append = false) => {
  if (!authStore.isLoggedIn) {
    clearState()
    return
  }
  if (append && (!state.hasMore || state.loadingMore)) return
  const currentRequestId = ++requestId
  if (append) {
    state.loadingMore = true
    state.loadMoreError = ''
  } else {
    state.loading = true
    state.initialError = ''
    state.loadMoreError = ''
  }
  try {
    const query = {
      status: statusFilter.value || undefined,
      cursor: append ? state.nextCursor || 0 : 0,
      size: 20,
    }
    const res = activeScope.value === 'created'
      ? await collaborationApi.needs.createdMine(query)
      : activeScope.value === 'followed'
        ? await collaborationApi.needs.followed(query)
        : await collaborationApi.needs.mine(query)
    if (requestId !== currentRequestId) return
    const incoming = res.data?.items || []
    const merged = append ? [...state.items, ...incoming] : incoming
    state.items = Array.from(new Map(merged.map((item) => [String(item.id), item])).values())
    if (activeScope.value === 'claimed' && !append && activeSubmissionNeedId.value) {
      const activeNeed = state.items.find((item) => String(item.id) === activeSubmissionNeedId.value)
      if (!activeNeed || activeNeed.status !== 'CLAIMED') cancelSubmission()
    }
    if (activeScope.value === 'created') {
      const submittedIds = new Set(state.items
        .filter((item) => item.status === 'SUBMITTED')
        .map((item) => String(item.id)))
      for (const needId of Object.keys(rejectReasons)) {
        if (!submittedIds.has(needId)) delete rejectReasons[needId]
      }
    }
    state.nextCursor = res.data?.nextCursor ? String(res.data.nextCursor) : ''
    state.hasMore = Boolean(res.data?.hasMore && state.nextCursor)
  } catch (error) {
    if (requestId === currentRequestId) {
      const message = getErrorMessage(
        error,
        activeScope.value === 'claimed'
          ? '我认领的需求暂时无法读取'
          : activeScope.value === 'created'
            ? '我发起的需求暂时无法读取'
            : '我关注的需求暂时无法读取',
      )
      if (append) {
        state.loadMoreError = message
      } else {
        state.initialError = message
        state.items = []
        state.nextCursor = ''
        state.hasMore = false
      }
    }
  } finally {
    if (requestId === currentRequestId) {
      state.loading = false
      state.loadingMore = false
    }
  }
}

const refresh = () => loadNeeds()

watch(
  [() => authStore.isLoggedIn, () => authStore.user?.uid],
  ([isLoggedIn]) => {
    clearState()
    if (!isLoggedIn) return
    void loadNeeds()
  },
  { flush: 'sync' },
)

watch(
  () => [firstQueryValue(route.query.scope), firstQueryValue(route.query.status)] as const,
  () => {
    const nextScope = readRouteScope()
    const nextStatus = readRouteStatus()
    if (nextScope === activeScope.value && nextStatus === statusFilter.value) return
    activeScope.value = nextScope
    statusFilter.value = nextStatus
    clearState()
    if (authStore.isLoggedIn) void loadNeeds()
  },
)

onMounted(() => {
  void loadNeeds()
})

defineExpose({ refresh })
</script>

<style scoped>
.my-collaborations-workspace {
  min-width: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: white;
  padding: 1rem;
}

.workspace-heading,
.row-heading,
.row-footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.workspace-heading {
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-subtle);
}

.workspace-heading p {
  margin: 0;
  color: rgb(26 127 90);
  font-size: 0.72rem;
  font-weight: 900;
}

.workspace-heading h2 {
  margin: 0.2rem 0;
  color: var(--text-strong);
  font-size: 1.15rem;
  font-weight: 900;
}

.workspace-heading span {
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1.55;
}

.workspace-controls {
  display: flex;
  flex: 0 0 auto;
  gap: 0.5rem;
}

.scope-switch {
  display: inline-flex;
  gap: 0.2rem;
  margin-top: 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: 7px;
  background: var(--surface-soft);
  padding: 0.2rem;
}

.scope-switch button {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  gap: 0.35rem;
  border-radius: 5px;
  padding: 0.45rem 0.7rem;
  color: var(--text-primary);
  font-size: 0.76rem;
  font-weight: 850;
}

.scope-switch button.active {
  background: white;
  color: rgb(18 99 74);
  box-shadow: 0 1px 2px rgba(20, 30, 25, 0.08);
}

.status-select,
.icon-button {
  min-height: 40px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  background: white;
  color: var(--text-primary);
}

.status-select {
  min-width: 8rem;
  padding: 0 0.7rem;
  font-size: 0.78rem;
}

.icon-button {
  display: inline-flex;
  width: 40px;
  align-items: center;
  justify-content: center;
}

.icon-button:disabled,
.load-more:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.claimed-need-list {
  display: grid;
}

.claimed-need-row {
  min-width: 0;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-subtle);
}

.row-title {
  min-width: 0;
}

.badge-line {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.status-badge,
.claimant-badge,
.creator-badge,
.meta-badge {
  display: inline-flex;
  min-height: 1.55rem;
  align-items: center;
  gap: 0.25rem;
  border-radius: 5px;
  padding: 0.2rem 0.5rem;
  font-size: 0.68rem;
  font-weight: 850;
}

.status-badge {
  background: rgb(205 232 220);
  color: rgb(18 99 74);
}

.status-badge[data-status='COMPLETED'] {
  background: rgb(220 252 231);
  color: rgb(21 128 61);
}

.status-badge[data-status='CLOSED'],
.status-badge[data-status='MERGED'] {
  background: var(--surface-soft);
  color: var(--text-primary);
}

.claimant-badge {
  background: rgb(232 243 237);
  color: rgb(18 99 74);
}

.creator-badge {
  background: rgb(240 253 244);
  color: rgb(21 128 61);
}

.meta-badge {
  background: var(--surface-soft);
  color: var(--text-primary);
}

.row-title h3 {
  margin: 0.55rem 0 0;
  overflow-wrap: anywhere;
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 900;
  line-height: 1.45;
}

.row-heading time {
  flex: 0 0 auto;
  color: var(--text-muted);
  font-size: 0.7rem;
}

.row-description {
  margin: 0.65rem 0 0;
  color: var(--text-primary);
  font-size: 0.8rem;
  line-height: 1.65;
}

.delivery-state {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  margin-top: 0.8rem;
  border-left: 3px solid rgb(33 154 112);
  background: rgb(232 243 237);
  padding: 0.7rem 0.8rem;
  color: rgb(14 74 55);
}

.delivery-state[data-tone='success'] {
  border-left-color: rgb(34 197 94);
  background: rgb(240 253 244);
  color: rgb(21 128 61);
}

.delivery-state[data-tone='warning'] {
  border-left-color: rgb(245 158 11);
  background: rgb(255 251 235);
  color: rgb(146 64 14);
}

.delivery-state[data-tone='muted'] {
  border-left-color: var(--border-subtle);
  background: var(--surface-soft);
  color: var(--text-primary);
}

.delivery-state strong,
.delivery-state span {
  display: block;
}

.delivery-state strong {
  font-size: 0.78rem;
}

.delivery-state span {
  margin-top: 0.15rem;
  font-size: 0.72rem;
  line-height: 1.5;
}

.progress-note {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  margin-top: 0.65rem;
  color: var(--text-primary);
  font-size: 0.72rem;
  line-height: 1.5;
}

.progress-note[data-stalled] {
  color: rgb(146 64 14);
}

.submission-summary,
.reject-notice {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.65rem;
  margin-top: 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: 7px;
  padding: 0.75rem;
}

.submission-summary {
  justify-content: space-between;
  background: var(--surface-soft);
}

.submission-summary > div,
.reject-notice > div {
  min-width: 0;
  flex: 1;
}

.submission-summary strong,
.submission-summary span,
.submission-summary small,
.submission-summary time,
.reject-notice strong,
.reject-notice span {
  display: block;
}

.submission-summary strong,
.reject-notice strong {
  color: var(--text-strong);
  font-size: 0.76rem;
}

.submission-summary span,
.reject-notice span {
  margin-top: 0.2rem;
  overflow-wrap: anywhere;
  color: var(--text-primary);
  font-size: 0.74rem;
  line-height: 1.5;
}

.submission-summary small,
.submission-summary time {
  margin-top: 0.25rem;
  overflow-wrap: anywhere;
  color: var(--text-muted);
  font-size: 0.68rem;
  line-height: 1.45;
}

.reject-notice {
  border-color: rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(185 28 28);
}

.creator-review {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.65rem;
  margin-top: 0.75rem;
}

.review-reject {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 0.5rem;
}

.review-reject .field-control {
  flex: 1;
}

.submission-form {
  display: grid;
  min-width: 0;
  gap: 0.75rem;
  margin-top: 0.8rem;
  border-top: 1px solid var(--border-subtle);
  padding-top: 0.8rem;
}

.submission-form label,
.release-form label {
  display: grid;
  min-width: 0;
  gap: 0.35rem;
  color: var(--text-primary);
  font-size: 0.72rem;
  font-weight: 800;
}

.release-form {
  display: grid;
  gap: 0.65rem;
  margin-top: 0.8rem;
  border: 1px solid rgb(254 202 202);
  border-radius: 7px;
  background: rgb(254 242 242);
  padding: 0.8rem;
}

.release-form p {
  margin: 0;
  color: rgb(153 27 27);
  font-size: 0.72rem;
  line-height: 1.5;
}

.field-grid {
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

.field-control {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  background: white;
  padding: 0.58rem 0.65rem;
  color: var(--text-strong);
  font-size: 0.78rem;
  line-height: 1.45;
  outline: none;
}

.field-control:focus {
  border-color: rgb(26 127 90);
  box-shadow: 0 0 0 3px rgb(169 216 195 / 0.65);
}

.row-footer {
  align-items: center;
  margin-top: 0.8rem;
  color: var(--text-muted);
  font-size: 0.7rem;
}

.row-actions,
.form-actions {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.result-link,
.primary-action,
.secondary-action,
.danger-action,
.state-message button,
.load-more {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border-radius: 6px;
  font-size: 0.76rem;
  font-weight: 850;
}

.result-link {
  color: rgb(26 127 90);
}

.primary-action,
.secondary-action,
.danger-action {
  padding: 0.5rem 0.7rem;
}

.primary-action {
  border: 1px solid rgb(18 99 74);
  background: rgb(18 99 74);
  color: white;
}

.secondary-action {
  border: 1px solid var(--border-subtle);
  background: white;
  color: var(--text-primary);
}

.danger-action {
  border: 1px solid rgb(185 28 28);
  background: rgb(185 28 28);
  color: white;
}

.primary-action:disabled,
.secondary-action:disabled,
.danger-action:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.state-message {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-top: 1rem;
  border: 1px dashed var(--border-subtle);
  border-radius: 8px;
  padding: 1.4rem;
  color: var(--text-muted);
}

.state-message > div {
  min-width: 0;
  flex: 1;
}

.state-message strong {
  color: var(--text-primary);
  font-size: 0.85rem;
}

.state-message p {
  margin: 0.25rem 0 0;
  font-size: 0.76rem;
  line-height: 1.5;
}

.state-message button,
.load-more {
  border: 1px solid rgb(26 127 90);
  background: white;
  padding: 0.5rem 0.75rem;
  color: rgb(26 127 90);
}

.state-message-error {
  border-style: solid;
  border-color: rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(185 28 28);
}

.loading-list {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.skeleton-row {
  display: grid;
  gap: 0.5rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-subtle);
}

.skeleton-line {
  height: 0.7rem;
  border-radius: 4px;
  background: var(--surface-2);
}

.skeleton-line-short {
  width: 25%;
}

.skeleton-line-medium {
  width: 62%;
}

.load-more {
  margin: 1rem auto 0;
}

@media (max-width: 640px) {
  .workspace-heading,
  .row-heading,
  .submission-summary {
    flex-direction: column;
  }

  .workspace-controls,
  .status-select,
  .scope-switch {
    width: 100%;
  }

  .scope-switch button {
    min-height: 44px;
    flex: 1;
    justify-content: center;
  }

  .icon-button,
  .status-select,
  .result-link,
  .primary-action,
  .secondary-action,
  .danger-action,
  .state-message button,
  .load-more {
    min-height: 44px;
  }

  .field-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .row-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .row-actions,
  .form-actions,
  .creator-review,
  .review-reject {
    width: 100%;
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .review-reject .field-control,
  .creator-review .primary-action,
  .review-reject .secondary-action {
    width: 100%;
  }

  .state-message {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .state-message button {
    width: 100%;
  }
}

.dark .my-collaborations-workspace,
.dark .status-select,
.dark .icon-button,
.dark .field-control,
.dark .secondary-action {
  border-color: var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-muted);
}

.dark .release-form {
  border-color: rgb(127 29 29);
  background: rgb(69 10 10 / 0.35);
}

.dark .release-form p {
  color: rgb(254 202 202);
}

.dark .scope-switch {
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-1) 62%, transparent);
}

.dark .scope-switch button {
  color: var(--text-muted);
}

.dark .scope-switch button.active {
  background: var(--surface-1);
  color: rgb(124 195 165);
  box-shadow: none;
}

.dark .workspace-heading,
.dark .claimed-need-row,
.dark .skeleton-row {
  border-color: var(--border-subtle);
}

.dark .workspace-heading h2,
.dark .row-title h3,
.dark .state-message strong {
  color: var(--text-strong);
}

.dark .workspace-heading span,
.dark .row-description,
.dark .row-heading time,
.dark .row-footer,
.dark .state-message {
  color: var(--text-muted);
}

.dark .meta-badge,
.dark .delivery-state[data-tone='muted'],
.dark .state-message,
.dark .submission-summary {
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-1) 62%, transparent);
  color: var(--text-muted);
}

.dark .submission-form {
  border-color: var(--border-subtle);
}

.dark .submission-form label,
.dark .submission-summary span,
.dark .submission-summary small,
.dark .submission-summary time {
  color: var(--text-muted);
}

.dark .submission-summary strong {
  color: var(--text-strong);
}

.dark .delivery-state {
  background: rgb(10 52 39 / 0.35);
  color: rgb(169 216 195);
}

.dark .delivery-state[data-tone='success'] {
  background: rgb(20 83 45 / 0.35);
  color: rgb(187 247 208);
}

.dark .delivery-state[data-tone='warning'] {
  background: rgb(120 53 15 / 0.3);
  color: rgb(253 230 138);
}

.dark .reject-notice {
  border-color: rgb(127 29 29);
  background: rgb(69 10 10 / 0.45);
  color: rgb(254 202 202);
}

.dark .reject-notice strong,
.dark .reject-notice span {
  color: rgb(254 202 202);
}

.dark .skeleton-line {
  background: var(--surface-1);
}

.manual-delivery-fallback {
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 800;
}

.manual-delivery-fallback summary {
  cursor: pointer;
}

.manual-delivery-fallback .field-grid {
  margin-top: 0.75rem;
}

.dark .manual-delivery-fallback {
  color: var(--text-muted);
}
</style>
