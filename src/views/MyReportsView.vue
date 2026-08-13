<template>
  <div class="app-shell reports-page">
    <AppHeader />

    <main class="community-page reports-main">
      <header class="reports-hero">
        <div>
          <p class="page-kicker">社区反馈</p>
          <h1>我的举报</h1>
          <span>查看帖子、评论和联系请求举报，以及平台向你公开的处理进度与结果。</span>
        </div>
        <RouterLink to="/me" class="secondary-action secondary-button">返回我的页面</RouterLink>
      </header>

      <section class="reports-panel surface-panel">
        <div class="reports-toolbar">
          <div>
            <strong>举报记录</strong>
            <span>当前已加载 {{ reports.length }} 条，点击记录查看完整回执。</span>
          </div>
          <button type="button" class="secondary-action secondary-button" :disabled="isLoading" @click="reloadReports">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" aria-hidden="true" />
            刷新
          </button>
        </div>

        <div class="reports-filters" role="tablist" aria-label="举报筛选">
          <button
            v-for="filter in filters"
            :key="filter.value"
            type="button"
            role="tab"
            :aria-selected="activeFilter === filter.value"
            :class="['filter-button', activeFilter === filter.value ? 'filter-button-active' : '']"
            @click="setFilter(filter.value)"
          >
            <component :is="filter.icon" class="h-4 w-4" aria-hidden="true" />
            <span>{{ filter.label }}</span>
          </button>
        </div>

        <div v-if="loadError" class="notice-error" role="alert">
          <div><strong>暂时无法加载举报记录</strong><span>{{ loadError }}</span></div>
          <button type="button" class="secondary-action secondary-button" @click="reloadReports">重试</button>
        </div>

        <div v-else-if="isLoading && reports.length === 0" class="loading-panel" role="status">
          <strong>正在加载举报记录</strong>
          <span>正在同步当前账号可见的举报回执。</span>
        </div>

        <div v-else-if="reports.length === 0" class="empty-panel">
          <div class="empty-icon"><Inbox class="h-6 w-6" aria-hidden="true" /></div>
          <h2>{{ emptyTitle }}</h2>
          <p>{{ emptyText }}</p>
          <RouterLink to="/explore" class="primary-action primary-button">浏览社区内容</RouterLink>
        </div>

        <div v-else class="reports-list">
          <article v-for="report in reports" :key="report.reportId" class="report-card">
            <button type="button" class="report-card-main" @click="openReport(report)">
              <div class="report-card-head">
                <div class="report-title">
                  <p class="report-object-type">{{ sourceTypeLabel(report.sourceType) }}</p>
                  <h2>{{ reportTitle(report) }}</h2>
                </div>
                <span :class="['status-chip', statusChipClass(report)]">{{ statusLabel(report) }}</span>
              </div>
              <p class="report-summary">{{ report.targetSummary || invisibleCopy(report) }}</p>
              <dl class="report-facts">
                <div><dt>举报类型</dt><dd>{{ report.reason }}</dd></div>
                <div><dt>提交时间</dt><dd>{{ formatReportTime(report.createTime) }}</dd></div>
                <div><dt>处理时间</dt><dd>{{ formatReportTime(report.reviewTime) }}</dd></div>
              </dl>
              <div class="result-summary">
                <strong>公开结果</strong>
                <p>{{ report.resultText || publicResultFallback(report) }}</p>
              </div>
            </button>
          </article>

          <div v-if="hasMore" class="load-more-row">
            <button type="button" class="secondary-action secondary-button" :disabled="isLoading" @click="loadMore">
              {{ isLoading ? '加载中...' : '加载更多' }}
            </button>
          </div>
        </div>
      </section>
    </main>

    <div v-if="drawerOpen" class="drawer-backdrop" @click.self="closeDrawer">
      <aside class="report-drawer" role="dialog" aria-modal="true" aria-labelledby="report-detail-title">
        <header class="drawer-head">
          <div>
            <p class="page-kicker">举报详情</p>
            <h2 id="report-detail-title">{{ selectedReport ? reportTitle(selectedReport) : '举报详情' }}</h2>
          </div>
          <button type="button" class="icon-button" aria-label="关闭详情" title="关闭详情" @click="closeDrawer">
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div v-if="detailLoading" class="loading-panel compact" role="status">正在加载详情...</div>
        <div v-else-if="detailError" class="notice-error compact" role="alert">
          <div><strong>详情加载失败</strong><span>{{ detailError }}</span></div>
        </div>

        <template v-if="selectedReport">
          <section class="detail-section detail-overview">
            <div class="detail-title-row">
              <span :class="['status-chip', statusChipClass(selectedReport)]">{{ statusLabel(selectedReport) }}</span>
              <span>{{ sourceTypeLabel(selectedReport.sourceType) }}</span>
            </div>
            <dl class="detail-grid">
              <div><dt>举报原因</dt><dd>{{ selectedReport.reason }}</dd></div>
              <div><dt>提交时间</dt><dd>{{ formatReportTime(selectedReport.createTime) }}</dd></div>
              <div><dt>处理时间</dt><dd>{{ formatReportTime(selectedReport.reviewTime) }}</dd></div>
              <div><dt>当前状态</dt><dd>{{ statusLabel(selectedReport) }}</dd></div>
            </dl>
          </section>

          <section class="detail-section">
            <h3>补充说明</h3>
            <p>{{ selectedReport.detail || '未填写补充说明' }}</p>
          </section>

          <section class="detail-section">
            <h3>公开结果</h3>
            <p>{{ selectedReport.resultText || publicResultFallback(selectedReport) }}</p>
          </section>

          <section class="detail-section">
            <h3>原内容</h3>
            <p>{{ selectedReport.targetSummary || invisibleCopy(selectedReport) }}</p>
            <RouterLink
              v-if="selectedReport.targetAvailable && selectedReport.targetPath"
              :to="selectedReport.targetPath"
              class="primary-action primary-button detail-link"
            >
              <ExternalLink class="h-4 w-4" aria-hidden="true" />
              查看原内容
            </RouterLink>
            <p v-else class="unavailable-copy">内容已不可见或已被处理</p>
          </section>
        </template>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ExternalLink, FileText, Flag, Inbox, MessageCircle, RefreshCw, X } from 'lucide-vue-next'
import { interactionApi, type UserReportListParams } from '@/api/interaction'
import type { ApiId, UserReportReceipt, UserReportSourceType, UserReportStatus } from '@/api/types'
import AppHeader from '@/components/layout/AppHeader.vue'
import { useAuthStore } from '@/stores/auth'

type FilterValue = 'all' | 'post' | 'comment' | 'contact' | 'pending' | 'processed' | 'unaccepted'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const filters = [
  { value: 'all', label: '全部', icon: Flag },
  { value: 'post', label: '帖子', icon: FileText },
  { value: 'comment', label: '评论', icon: MessageCircle },
  { value: 'contact', label: '联系请求', icon: Inbox },
  { value: 'pending', label: '处理中', icon: RefreshCw },
  { value: 'processed', label: '已处理', icon: Flag },
  { value: 'unaccepted', label: '未采纳', icon: Inbox },
] as const

const filterValues = new Set<FilterValue>(filters.map(item => item.value))
const reportSourceTypes = new Set<UserReportSourceType>(['POST_REPORT', 'COMMENT_REPORT', 'CONTACT_REQUEST_REPORT'])
const reportStatuses = new Set<UserReportStatus>(['PROCESSING', 'ACTION_TAKEN', 'NOT_ACCEPTED', 'CLOSED'])
const firstQueryValue = (value: unknown) => Array.isArray(value) ? value[0] : value
const readRouteFilter = (): FilterValue => {
  const value = String(firstQueryValue(route.query.filter) || '').toLowerCase()
  return filterValues.has(value as FilterValue) ? value as FilterValue : 'all'
}

const activeFilter = ref<FilterValue>(readRouteFilter())
const reports = ref<UserReportReceipt[]>([])
const selectedReport = ref<UserReportReceipt | null>(null)
const isLoading = ref(false)
const detailLoading = ref(false)
const drawerOpen = ref(false)
const loadError = ref('')
const detailError = ref('')
const nextCursor = ref<string | undefined>()
const hasMore = ref(false)
let reportListRequestId = 0
let reportDetailRequestId = 0
let reportAccountGeneration = 0

const isRecord = (value: unknown): value is Record<string, unknown> => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
)
const normalizeApiId = (value: unknown): ApiId | null => {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value
  if (typeof value === 'string' && value.trim()) return value.trim()
  return null
}
const optionalText = (value: unknown, maxLength = 500) => (
  typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : undefined
)
const safeTargetPath = (value: unknown) => {
  const path = optionalText(value, 500)
  return path?.startsWith('/') && !path.startsWith('//') ? path : undefined
}
const normalizeReportReceipt = (raw: unknown): UserReportReceipt | null => {
  if (!isRecord(raw)) return null
  const reportId = normalizeApiId(raw.reportId)
  const targetId = normalizeApiId(raw.targetId)
  const sourceType = String(raw.sourceType || '').toUpperCase() as UserReportSourceType
  const userStatus = String(raw.userStatus || '').toUpperCase() as UserReportStatus
  if (reportId === null || targetId === null || !reportSourceTypes.has(sourceType) || !reportStatuses.has(userStatus)) return null
  const createdAt = Number(raw.createdAt)
  const reviewedAt = raw.reviewedAt == null ? undefined : Number(raw.reviewedAt)
  return {
    reportId,
    sourceType,
    targetId,
    postId: normalizeApiId(raw.postId) ?? undefined,
    targetTitle: optionalText(raw.targetTitle, 200),
    targetSummary: optionalText(raw.targetSummary),
    reason: optionalText(raw.reason, 200) || '已提交举报',
    detail: optionalText(raw.detail, 2000),
    userStatus,
    resultText: optionalText(raw.resultText, 1000) || '',
    targetPath: safeTargetPath(raw.targetPath),
    createTime: optionalText(raw.createTime, 80),
    reviewTime: optionalText(raw.reviewTime, 80),
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    reviewedAt: reviewedAt != null && Number.isFinite(reviewedAt) ? reviewedAt : undefined,
    targetAvailable: raw.targetAvailable === true,
  }
}
const normalizeReportPage = (raw: unknown) => {
  if (!isRecord(raw) || !Array.isArray(raw.items)) return null
  const items = raw.items.map(normalizeReportReceipt).filter((item): item is UserReportReceipt => item !== null)
  if (raw.items.length > 0 && items.length === 0) return null
  const nextCursor = optionalText(raw.nextCursor, 500)
  return {
    items,
    nextCursor,
    hasMore: raw.hasMore === true && Boolean(nextCursor),
  }
}

const currentReportAccountKey = () => (
  `${String(authStore.user?.uid ?? '')}:${String(authStore.token ?? '')}`
)

const reportAccountIsCurrent = (accountKey: string, accountGeneration: number) => (
  authStore.isLoggedIn
  && Boolean(authStore.user?.uid)
  && accountGeneration === reportAccountGeneration
  && accountKey === currentReportAccountKey()
)

const emptyTitle = computed(() => activeFilter.value === 'all' ? '暂时没有举报记录' : '当前筛选下没有举报记录')
const emptyText = computed(() => {
  if (activeFilter.value === 'pending') return '没有正在处理中的举报。新的举报提交后，会先出现在这里。'
  if (activeFilter.value === 'processed') return '没有已处理的举报。平台完成核查后，会展示公开结果摘要。'
  if (activeFilter.value === 'unaccepted') return '没有未采纳的举报记录。'
  if (activeFilter.value === 'contact') return '没有联系请求举报记录。联系请求存在骚扰或违规时，处理回执会在这里汇总。'
  return '你提交的帖子、评论或联系请求举报会在这里汇总，便于回看处理进度。'
})

const paramsForFilter = (filter: FilterValue, cursor?: string): UserReportListParams => {
  const params: UserReportListParams = { limit: 20, cursor }
  if (filter === 'post') params.sourceType = 'POST_REPORT'
  if (filter === 'comment') params.sourceType = 'COMMENT_REPORT'
  if (filter === 'contact') params.sourceType = 'CONTACT_REQUEST_REPORT'
  if (filter === 'pending') params.status = 'PROCESSING'
  if (filter === 'processed') params.status = 'ACTION_TAKEN'
  if (filter === 'unaccepted') params.status = 'NOT_ACCEPTED'
  return params
}

const clearReportListState = () => {
  reports.value = []
  nextCursor.value = undefined
  hasMore.value = false
  loadError.value = ''
}

const invalidateReportList = () => {
  reportListRequestId += 1
  isLoading.value = false
  clearReportListState()
}

const resetReportAccountState = () => {
  reportAccountGeneration += 1
  reportDetailRequestId += 1
  invalidateReportList()
  detailLoading.value = false
  drawerOpen.value = false
  selectedReport.value = null
  detailError.value = ''
}

const loadReports = async (append = false) => {
  if (!authStore.isLoggedIn || !authStore.user?.uid) return
  if (append && (!hasMore.value || isLoading.value)) return
  const requestedFilter = activeFilter.value
  const accountKey = currentReportAccountKey()
  const accountGeneration = reportAccountGeneration
  const requestId = ++reportListRequestId
  if (!append) clearReportListState()
  isLoading.value = true
  try {
    const res = await interactionApi.listMyReports(
      paramsForFilter(requestedFilter, append ? nextCursor.value : undefined),
    )
    if (
      requestId !== reportListRequestId
      || requestedFilter !== activeFilter.value
      || !reportAccountIsCurrent(accountKey, accountGeneration)
    ) return
    const data = normalizeReportPage(res.data)
    if (!data) throw new Error('invalid-report-page')
    reports.value = append ? [...reports.value, ...data.items] : data.items
    nextCursor.value = data.nextCursor
    hasMore.value = data.hasMore
  } catch {
    if (
      requestId !== reportListRequestId
      || requestedFilter !== activeFilter.value
      || !reportAccountIsCurrent(accountKey, accountGeneration)
    ) return
    if (!append) reports.value = []
    loadError.value = '举报记录暂时无法读取，请稍后重试。'
  } finally {
    if (
      requestId === reportListRequestId
      && requestedFilter === activeFilter.value
      && reportAccountIsCurrent(accountKey, accountGeneration)
    ) {
      isLoading.value = false
    }
  }
}

const reloadReports = () => {
  invalidateReportList()
  return loadReports(false)
}

const loadMore = () => loadReports(true)

const routeReportSourceType = (): UserReportSourceType | null => {
  const value = String(route.params.sourceType || '').toUpperCase()
  if (value === 'POST_REPORT' || value === 'COMMENT_REPORT' || value === 'CONTACT_REQUEST_REPORT') return value
  return null
}

const routeReportId = () => {
  const value = route.params.reportId
  return Array.isArray(value) ? value[0] : value
}

const openRouteReport = async () => {
  const sourceType = routeReportSourceType()
  const reportId = routeReportId()
  if (!sourceType || !reportId || !authStore.isLoggedIn || !authStore.user?.uid) return
  const accountKey = currentReportAccountKey()
  const accountGeneration = reportAccountGeneration
  const requestId = ++reportDetailRequestId
  drawerOpen.value = true
  selectedReport.value = null
  detailError.value = ''
  detailLoading.value = true
  try {
    const res = await interactionApi.getMyReportDetail(sourceType, reportId)
    if (
      requestId !== reportDetailRequestId
      || !reportAccountIsCurrent(accountKey, accountGeneration)
    ) return
    const detail = normalizeReportReceipt(res.data)
    if (!detail) throw new Error('invalid-report-detail')
    selectedReport.value = detail
  } catch {
    if (
      requestId !== reportDetailRequestId
      || !reportAccountIsCurrent(accountKey, accountGeneration)
    ) return
    detailError.value = '举报详情暂时无法读取，请稍后重试。'
  } finally {
    if (
      requestId === reportDetailRequestId
      && reportAccountIsCurrent(accountKey, accountGeneration)
    ) {
      detailLoading.value = false
    }
  }
}

const setFilter = async (filter: FilterValue) => {
  if (activeFilter.value === filter && readRouteFilter() === filter) return
  await router.replace({ query: { ...route.query, filter: filter === 'all' ? undefined : filter } })
}

const openReport = async (report: UserReportReceipt) => {
  if (!authStore.isLoggedIn || !authStore.user?.uid) return
  const accountKey = currentReportAccountKey()
  const accountGeneration = reportAccountGeneration
  const requestId = ++reportDetailRequestId
  selectedReport.value = report
  drawerOpen.value = true
  detailError.value = ''
  detailLoading.value = true
  try {
    const res = await interactionApi.getMyReportDetail(report.sourceType, report.reportId)
    if (
      requestId !== reportDetailRequestId
      || !reportAccountIsCurrent(accountKey, accountGeneration)
    ) return
    const detail = normalizeReportReceipt(res.data)
    if (!detail) throw new Error('invalid-report-detail')
    selectedReport.value = detail
  } catch {
    if (
      requestId !== reportDetailRequestId
      || !reportAccountIsCurrent(accountKey, accountGeneration)
    ) return
    detailError.value = '举报详情暂时无法读取，请稍后重试。'
  } finally {
    if (
      requestId === reportDetailRequestId
      && reportAccountIsCurrent(accountKey, accountGeneration)
    ) {
      detailLoading.value = false
    }
  }
}

const closeDrawer = () => {
  reportDetailRequestId += 1
  drawerOpen.value = false
  selectedReport.value = null
  detailError.value = ''
}

const sourceTypeLabel = (type: UserReportSourceType) => {
  if (type === 'COMMENT_REPORT') return '评论举报'
  if (type === 'CONTACT_REQUEST_REPORT') return '联系请求举报'
  return '帖子举报'
}

const reportTitle = (report: UserReportReceipt) => {
  if (report.targetTitle) return report.targetTitle
  if (report.targetSummary) return report.targetSummary
  if (report.sourceType === 'CONTACT_REQUEST_REPORT') return '联系请求'
  return report.sourceType === 'COMMENT_REPORT' ? '评论内容' : '帖子内容'
}

const statusNumber = (report: UserReportReceipt) => {
  const value = report.userStatus
  if (value === 'ACTION_TAKEN' || value === 'CLOSED') return 1
  if (value === 'NOT_ACCEPTED') return 2
  return 0
}

const statusLabel = (report: UserReportReceipt) => {
  const value = statusNumber(report)
  if (value === 1) return '已处理'
  if (value === 2) return '未采纳'
  return '处理中'
}

const statusChipClass = (report: UserReportReceipt) => {
  const value = statusNumber(report)
  if (value === 1) return 'status-chip-ok'
  if (value === 2) return 'status-chip-muted'
  return 'status-chip-warn'
}

const publicResultFallback = (report: UserReportReceipt) => {
  const value = statusNumber(report)
  if (value === 1) return '平台已完成处理，感谢你帮助维护社区讨论环境。'
  if (value === 2) return '平台已完成核查，暂未采纳本次举报。'
  return '平台已收到举报，正在结合上下文核查。'
}

const invisibleCopy = (report: UserReportReceipt) => report.targetAvailable ? '原内容摘要暂未返回' : '内容已不可见或已被处理'

const formatReportTime = (value?: string | number) => {
  if (!value) return '--'
  const date = typeof value === 'number' ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

watch(
  () => firstQueryValue(route.query.filter),
  () => {
    activeFilter.value = readRouteFilter()
    invalidateReportList()
    void loadReports(false)
  },
  { immediate: true },
)

watch(
  [() => authStore.user?.uid, () => authStore.token],
  ([uid, token], [previousUid, previousToken]) => {
    if (uid === previousUid && token === previousToken) return
    resetReportAccountState()
    if (uid && token) {
      void loadReports(false)
      void openRouteReport()
    }
  },
)

onMounted(() => {
  void openRouteReport()
})
</script>

<style scoped>
.reports-hero,
.reports-panel {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 1.5rem;
}

.reports-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.reports-hero h1 {
  margin-top: 0.2rem;
  color: rgb(15 23 42);
  font-size: 1.65rem;
  font-weight: 900;
}

.reports-hero span {
  margin-top: 0.4rem;
  display: block;
  color: rgb(71 85 105);
  font-size: 0.9rem;
  line-height: 1.6;
}

.reports-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.reports-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.filter-button,
.primary-button,
.secondary-button,
.icon-button {
  display: inline-flex;
  min-height: 2.375rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: 0.5rem;
  padding: 0.5rem 0.8rem;
  font-size: 0.875rem;
  font-weight: 800;
}

.filter-button,
.secondary-button {
  border: 1px solid rgb(226 232 240);
  background: white;
  color: rgb(51 65 85);
}

.filter-button-active {
  border-color: rgb(191 219 254);
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.primary-button {
  background: rgb(37 99 235);
  color: white;
}

.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.reports-list {
  margin-top: 1rem;
  display: grid;
  gap: 0.85rem;
}

.report-card {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: rgb(248 250 252);
}

.report-card-main {
  display: block;
  width: 100%;
  padding: 1rem;
  text-align: left;
}

.report-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.report-object-type {
  color: rgb(37 99 235);
  font-size: 0.72rem;
  font-weight: 900;
}

.report-card h2 {
  margin-top: 0.25rem;
  color: rgb(15 23 42);
  font-size: 1rem;
  font-weight: 900;
  line-height: 1.45;
}

.report-summary,
.result-summary,
.detail-section p,
.unavailable-copy {
  color: rgb(71 85 105);
  font-size: 0.875rem;
  line-height: 1.6;
}

.report-summary {
  margin-top: 0.65rem;
}

.result-summary {
  margin-top: 0.8rem;
  border-radius: 0.625rem;
  background: white;
  padding: 0.75rem;
  font-weight: 700;
}

.report-facts,
.detail-grid {
  margin-top: 0.85rem;
  display: grid;
  gap: 0.65rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.report-facts dt,
.detail-grid dt {
  color: rgb(100 116 139);
  font-size: 0.72rem;
  font-weight: 900;
}

.report-facts dd,
.detail-grid dd {
  margin-top: 0.2rem;
  color: rgb(30 41 59);
  font-size: 0.82rem;
  font-weight: 800;
}

.status-chip {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 0.28rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 900;
}

.status-chip-warn {
  background: rgb(254 243 199);
  color: rgb(146 64 14);
}

.status-chip-ok {
  background: rgb(220 252 231);
  color: rgb(22 101 52);
}

.status-chip-muted {
  background: rgb(241 245 249);
  color: rgb(71 85 105);
}

.empty-panel,
.loading-panel,
.notice-error {
  margin-top: 1rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 2rem 1.25rem;
  text-align: center;
}

.empty-icon {
  margin: 0 auto;
  display: flex;
  height: 3rem;
  width: 3rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgb(239 246 255);
  color: rgb(37 99 235);
}

.empty-panel h2 {
  margin-top: 0.9rem;
  color: rgb(15 23 42);
  font-size: 1rem;
  font-weight: 900;
}

.empty-panel p,
.loading-panel {
  margin-top: 0.5rem;
  color: rgb(100 116 139);
}

.empty-panel .primary-button {
  margin-top: 1rem;
}

.notice-error {
  display: grid;
  gap: 0.55rem;
  justify-items: center;
  border-color: rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(185 28 28);
}

.notice-error span {
  font-size: 0.875rem;
  line-height: 1.5;
}

.compact {
  margin-top: 0;
  padding: 1rem;
}

.load-more-row {
  display: flex;
  justify-content: center;
  padding-top: 0.5rem;
}

.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  justify-content: flex-end;
  background: rgb(15 23 42 / 0.55);
}

.report-drawer {
  display: flex;
  width: min(100%, 32rem);
  height: 100%;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  background: white;
  padding: 1.25rem;
  box-shadow: -20px 0 50px rgb(15 23 42 / 0.18);
}

.drawer-head,
.detail-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.drawer-head h2 {
  margin-top: 0.2rem;
  color: rgb(15 23 42);
  font-size: 1.15rem;
  font-weight: 900;
  line-height: 1.45;
}

.icon-button {
  width: 2.375rem;
  padding: 0;
  border: 1px solid rgb(226 232 240);
  background: white;
  color: rgb(51 65 85);
}

.detail-section {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: rgb(248 250 252);
  padding: 1rem;
}

.detail-section h3 {
  margin-bottom: 0.45rem;
  color: rgb(15 23 42);
  font-size: 0.95rem;
  font-weight: 900;
}

.detail-title-row {
  margin-bottom: 0.8rem;
  align-items: center;
  color: rgb(100 116 139);
  font-size: 0.8rem;
  font-weight: 900;
}

.unavailable-copy {
  margin-top: 0.75rem;
  border-radius: 0.625rem;
  background: rgb(241 245 249);
  padding: 0.7rem;
  font-weight: 800;
}

.dark .reports-hero,
.dark .reports-panel,
.dark .filter-button,
.dark .secondary-button,
.dark .empty-panel,
.dark .loading-panel,
.dark .report-drawer,
.dark .icon-button {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .reports-hero h1,
.dark .report-card h2,
.dark .empty-panel h2,
.dark .drawer-head h2,
.dark .detail-section h3 {
  color: rgb(248 250 252);
}

.dark .reports-hero span,
.dark .report-summary,
.dark .detail-section p,
.dark .unavailable-copy {
  color: rgb(203 213 225);
}

.dark .filter-button-active {
  border-color: rgb(30 64 175);
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

.dark .report-card,
.dark .detail-section {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

.dark .result-summary,
.dark .unavailable-copy {
  background: rgb(15 23 42);
}

.dark .report-facts dd,
.dark .detail-grid dd {
  color: rgb(226 232 240);
}

.dark .status-chip-muted {
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}

@media (max-width: 640px) {
  .reports-hero,
  .reports-toolbar,
  .report-card-head {
    flex-direction: column;
  }

  .reports-hero .secondary-button,
  .reports-toolbar .secondary-button,
  .filter-button {
    width: 100%;
  }

  .reports-filters {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .report-facts,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .report-drawer {
    width: 100%;
  }
}

/* Current community workspace baseline. */
.reports-page {
  min-width: 0;
}

.reports-main {
  padding-top: 2rem;
  padding-bottom: 4rem;
}

.reports-hero {
  align-items: flex-start;
  margin: 0 0 1.25rem;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 0;
}

.page-kicker {
  margin: 0;
  color: var(--primary-600);
  font-size: 0.75rem;
  font-weight: 800;
}

.reports-hero h1 {
  margin: 0.2rem 0 0;
  color: var(--text-strong);
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: 0;
  text-wrap: balance;
}

.reports-hero > div > span {
  max-width: 68ch;
  margin-top: 0.35rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.65;
  text-wrap: pretty;
}

.reports-panel {
  margin: 0;
  border-radius: var(--radius-surface);
  background: var(--surface-1);
  padding: 0;
}

.reports-toolbar {
  align-items: center;
  border-bottom: 1px solid var(--border-subtle);
  padding: 1rem;
}

.reports-toolbar > div {
  display: grid;
  gap: 0.2rem;
}

.reports-toolbar strong {
  color: var(--text-strong);
  font-size: 0.92rem;
}

.reports-toolbar span {
  color: var(--text-muted);
  font-size: 0.76rem;
  line-height: 1.5;
}

.reports-filters {
  flex-wrap: nowrap;
  gap: 0.25rem;
  overflow-x: auto;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 1rem;
}

.filter-button {
  flex: none;
  min-height: 2.85rem;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  background: transparent;
  padding: 0 0.7rem;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 700;
  transition: color 180ms ease, border-color 180ms ease;
}

.filter-button:hover,
.filter-button-active {
  border-color: var(--primary-600);
  background: transparent;
  color: var(--primary-700);
}

.reports-list {
  margin: 0;
  gap: 0;
}

.report-card {
  border: 0;
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 0;
  background: transparent;
}

.report-card:last-of-type {
  border-bottom: 0;
}

.report-card-main {
  padding: 1rem;
  transition: background-color 180ms ease;
}

.report-card-main:hover {
  background: var(--surface-2);
}

.report-title {
  min-width: 0;
}

.report-object-type {
  margin: 0;
  color: var(--primary-700);
  font-size: 0.7rem;
  font-weight: 800;
}

.report-card h2 {
  max-width: 52rem;
  margin: 0.2rem 0 0;
  overflow-wrap: anywhere;
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.45;
  text-wrap: pretty;
}

.status-chip {
  display: inline-flex;
  flex: none;
  align-items: center;
  min-height: 1.6rem;
  border-radius: var(--radius-pill);
  padding: 0.25rem 0.6rem;
  font-size: 0.7rem;
  font-weight: 800;
}

.status-chip-warn {
  background: #fffaeb;
  color: #93370d;
}

.status-chip-ok {
  background: #ecfdf3;
  color: #027a48;
}

.status-chip-muted {
  background: var(--surface-3);
  color: var(--text-muted);
}

.report-summary {
  max-width: 72ch;
  margin-top: 0.55rem;
  color: var(--text-primary);
  font-size: 0.82rem;
  line-height: 1.6;
  text-wrap: pretty;
}

.report-facts {
  grid-template-columns: minmax(0, 1.35fr) repeat(2, minmax(0, 1fr));
  gap: 0;
  margin-top: 0.8rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-2);
}

.report-facts div {
  min-width: 0;
  padding: 0.65rem 0.75rem;
}

.report-facts div + div {
  border-left: 1px solid var(--border-subtle);
}

.report-facts dt,
.detail-grid dt {
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 700;
}

.report-facts dd,
.detail-grid dd {
  margin: 0.18rem 0 0;
  overflow-wrap: anywhere;
  color: var(--text-primary);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.45;
}

.result-summary {
  display: grid;
  grid-template-columns: 5rem minmax(0, 1fr);
  gap: 0.7rem;
  margin-top: 0.75rem;
  border-radius: var(--radius-control);
  background: var(--surface-2);
  padding: 0.65rem 0.75rem;
}

.result-summary strong {
  color: var(--text-muted);
  font-size: 0.72rem;
}

.result-summary p {
  margin: 0;
  color: var(--text-primary);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.5;
}

.empty-panel,
.loading-panel,
.notice-error {
  margin: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 2rem 1.25rem;
}

.loading-panel {
  display: grid;
  gap: 0.25rem;
  color: var(--text-muted);
  text-align: center;
}

.loading-panel strong {
  color: var(--text-strong);
  font-size: 0.9rem;
}

.loading-panel span {
  font-size: 0.78rem;
}

.empty-icon {
  border-radius: var(--radius-surface);
  background: var(--primary-50);
  color: var(--primary-700);
}

.empty-panel h2 {
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 800;
}

.empty-panel p {
  max-width: 54ch;
  margin-right: auto;
  margin-left: auto;
  color: var(--text-muted);
  font-size: 0.82rem;
  line-height: 1.6;
}

.notice-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid #fecdca;
  background: #fffbfa;
  color: #b42318;
  text-align: left;
}

.notice-error > div {
  display: grid;
  gap: 0.2rem;
}

.notice-error span {
  font-size: 0.8rem;
}

.load-more-row {
  border-top: 1px solid var(--border-subtle);
  padding: 1rem;
}

.drawer-backdrop {
  z-index: 60;
  background: rgba(16, 24, 40, 0.48);
}

.report-drawer {
  width: min(100%, 34rem);
  gap: 0;
  background: var(--surface-1);
  padding: 0;
  box-shadow: -8px 0 8px rgba(16, 24, 40, 0.08);
}

.drawer-head {
  position: sticky;
  top: 0;
  z-index: 1;
  align-items: center;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--surface-1);
  padding: 1rem 1.1rem;
}

.drawer-head h2 {
  max-width: 26rem;
  margin: 0.15rem 0 0;
  overflow-wrap: anywhere;
  color: var(--text-strong);
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.45;
  text-wrap: pretty;
}

.icon-button {
  width: 2.35rem;
  height: 2.35rem;
  min-height: 0;
  flex: none;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-1);
  padding: 0;
  color: var(--text-muted);
}

.icon-button:hover {
  background: var(--surface-2);
  color: var(--text-strong);
}

.report-drawer > .loading-panel,
.report-drawer > .notice-error,
.report-drawer > .detail-section {
  margin: 0 1.1rem;
}

.report-drawer > .loading-panel,
.report-drawer > .notice-error {
  margin-top: 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
}

.detail-section {
  border: 0;
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 0;
  background: transparent;
  padding: 1rem 0;
}

.detail-section:last-child {
  border-bottom: 0;
  padding-bottom: 2rem;
}

.detail-section h3 {
  margin: 0 0 0.4rem;
  color: var(--text-strong);
  font-size: 0.88rem;
  font-weight: 800;
}

.detail-section p {
  margin: 0;
  color: var(--text-primary);
  font-size: 0.82rem;
  line-height: 1.65;
  text-wrap: pretty;
}

.detail-title-row {
  margin-bottom: 0.8rem;
}

.detail-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  margin: 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-2);
}

.detail-grid div {
  min-width: 0;
  padding: 0.7rem;
}

.detail-grid div:nth-child(even) {
  border-left: 1px solid var(--border-subtle);
}

.detail-grid div:nth-child(n + 3) {
  border-top: 1px solid var(--border-subtle);
}

.detail-link {
  margin-top: 0.8rem;
}

.unavailable-copy {
  margin-top: 0.75rem !important;
  border-radius: var(--radius-control);
  background: var(--surface-2);
  padding: 0.65rem 0.75rem;
  color: var(--text-muted) !important;
  font-weight: 700;
}

:global(html.dark) .filter-button-active {
  border-color: #60a5fa;
  background: transparent;
  color: #bfdbfe;
}

:global(html.dark) .status-chip-warn {
  background: rgba(120, 53, 15, 0.34);
  color: #fdba74;
}

:global(html.dark) .status-chip-ok {
  background: rgba(6, 78, 59, 0.42);
  color: #a7f3d0;
}

:global(html.dark) .notice-error {
  border-color: #7f1d1d;
  background: rgba(69, 10, 10, 0.28);
  color: #fecaca;
}

@media (max-width: 700px) {
  .reports-main {
    padding-top: 1.25rem;
  }

  .reports-hero,
  .reports-toolbar,
  .notice-error,
  .report-card-head {
    align-items: stretch;
    flex-direction: column;
  }

  .reports-hero .secondary-action,
  .reports-toolbar .secondary-action,
  .notice-error .secondary-action {
    width: 100%;
  }

  .reports-filters {
    padding: 0 0.75rem;
  }

  .report-facts {
    grid-template-columns: 1fr;
  }

  .report-facts div + div {
    border-top: 1px solid var(--border-subtle);
    border-left: 0;
  }

  .result-summary {
    grid-template-columns: 1fr;
    gap: 0.2rem;
  }

  .report-drawer {
    width: 100%;
  }
}

@media (max-width: 420px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-grid div:nth-child(even) {
    border-left: 0;
  }

  .detail-grid div:nth-child(n + 2) {
    border-top: 1px solid var(--border-subtle);
  }
}

@media (prefers-reduced-motion: reduce) {
  .report-card-main,
  .filter-button {
    transition: none;
  }

  .animate-spin {
    animation: none;
  }
}
</style>
