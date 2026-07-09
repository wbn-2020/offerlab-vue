<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />

    <main class="mx-auto max-w-6xl px-4 py-8">
      <section class="reports-hero">
        <div>
          <p class="text-xs font-black text-primary-600 dark:text-primary-300">社区反馈</p>
          <h1>我的举报</h1>
          <span>查看你提交过的帖子、评论和联系请求举报，以及平台公开给你的处理进度。</span>
        </div>
        <RouterLink to="/me" class="secondary-button">返回我的页面</RouterLink>
      </section>

      <section class="reports-panel mt-6">
        <div class="reports-toolbar">
          <div class="reports-filters" aria-label="举报筛选">
            <button
              v-for="filter in filters"
              :key="filter.value"
              type="button"
              :class="['filter-button', activeFilter === filter.value ? 'filter-button-active' : '']"
              @click="setFilter(filter.value)"
            >
              <component :is="filter.icon" class="h-4 w-4" />
              <span>{{ filter.label }}</span>
            </button>
          </div>
          <button type="button" class="secondary-button" :disabled="isLoading" @click="reloadReports">
            <RefreshCw class="h-4 w-4" />
            刷新
          </button>
        </div>

        <div v-if="loadError" class="notice-error">
          <strong>暂时无法加载举报记录</strong>
          <span>{{ loadError }}</span>
          <button type="button" class="secondary-button" @click="reloadReports">重试</button>
        </div>

        <div v-else-if="isLoading && reports.length === 0" class="loading-panel">
          正在加载举报记录...
        </div>

        <div v-else-if="reports.length === 0" class="empty-panel">
          <div class="empty-icon"><Inbox class="h-6 w-6" /></div>
          <h2>{{ emptyTitle }}</h2>
          <p>{{ emptyText }}</p>
          <RouterLink to="/explore" class="primary-button">浏览社区内容</RouterLink>
        </div>

        <div v-else class="reports-list">
          <article v-for="report in reports" :key="report.reportId" class="report-card">
            <button type="button" class="report-card-main" @click="openReport(report)">
              <div class="report-card-head">
                <div class="min-w-0">
                  <p class="report-object-type">{{ sourceTypeLabel(report.sourceType) }}</p>
                  <h2>{{ reportTitle(report) }}</h2>
                </div>
                <span :class="['status-chip', statusChipClass(report)]">{{ statusLabel(report) }}</span>
              </div>
              <p class="report-summary">{{ report.targetSummary || invisibleCopy(report) }}</p>
              <dl class="report-facts">
                <div>
                  <dt>举报类型</dt>
                  <dd>{{ report.reason }}</dd>
                </div>
                <div>
                  <dt>提交时间</dt>
                  <dd>{{ formatReportTime(report.createTime) }}</dd>
                </div>
                <div>
                  <dt>处理时间</dt>
                  <dd>{{ formatReportTime(report.reviewTime) }}</dd>
                </div>
              </dl>
              <p class="result-summary">{{ report.resultText || publicResultFallback(report) }}</p>
            </button>
          </article>

          <div v-if="hasMore" class="load-more-row">
            <button type="button" class="secondary-button" :disabled="isLoading" @click="loadMore">
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
            <p class="text-xs font-black text-primary-600 dark:text-primary-300">举报详情</p>
            <h2 id="report-detail-title">{{ selectedReport ? reportTitle(selectedReport) : '举报详情' }}</h2>
          </div>
          <button type="button" class="icon-button" aria-label="关闭详情" @click="closeDrawer">
            <X class="h-5 w-5" />
          </button>
        </header>

        <div v-if="detailLoading" class="loading-panel compact">正在加载详情...</div>
        <div v-else-if="detailError" class="notice-error compact">
          <strong>详情加载失败</strong>
          <span>{{ detailError }}</span>
        </div>

        <template v-if="selectedReport">
          <section class="detail-section">
            <div class="detail-title-row">
              <span :class="['status-chip', statusChipClass(selectedReport)]">{{ statusLabel(selectedReport) }}</span>
              <span>{{ sourceTypeLabel(selectedReport.sourceType) }}</span>
            </div>
            <dl class="detail-grid">
              <div>
                <dt>举报原因</dt>
                <dd>{{ selectedReport.reason }}</dd>
              </div>
              <div>
                <dt>提交时间</dt>
                <dd>{{ formatReportTime(selectedReport.createTime) }}</dd>
              </div>
              <div>
                <dt>处理时间</dt>
                <dd>{{ formatReportTime(selectedReport.reviewTime) }}</dd>
              </div>
              <div>
                <dt>当前状态</dt>
                <dd>{{ statusLabel(selectedReport) }}</dd>
              </div>
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
              class="primary-button mt-3"
            >
              <ExternalLink class="h-4 w-4" />
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
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ExternalLink, FileText, Flag, Inbox, MessageCircle, RefreshCw, X } from 'lucide-vue-next'
import { getErrorMessage } from '@/api/client'
import { interactionApi, type UserReportListParams } from '@/api/interaction'
import type { UserReportReceipt, UserReportSourceType } from '@/api/types'
import AppHeader from '@/components/layout/AppHeader.vue'

type FilterValue = 'all' | 'post' | 'comment' | 'contact' | 'pending' | 'processed' | 'unaccepted'

const route = useRoute()
const router = useRouter()

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
const queryFilter = typeof route.query.filter === 'string' && filterValues.has(route.query.filter as FilterValue)
  ? route.query.filter as FilterValue
  : 'all'

const activeFilter = ref<FilterValue>(queryFilter)
const reports = ref<UserReportReceipt[]>([])
const selectedReport = ref<UserReportReceipt | null>(null)
const isLoading = ref(false)
const detailLoading = ref(false)
const drawerOpen = ref(false)
const loadError = ref('')
const detailError = ref('')
const nextCursor = ref<string | undefined>()
const hasMore = ref(false)

const emptyTitle = computed(() => activeFilter.value === 'all' ? '暂时没有举报记录' : '当前筛选下没有举报记录')
const emptyText = computed(() => {
  if (activeFilter.value === 'pending') return '没有正在处理中的举报。新的举报提交后，会先出现在这里。'
  if (activeFilter.value === 'processed') return '没有已处理的举报。平台完成核查后，会展示公开结果摘要。'
  if (activeFilter.value === 'unaccepted') return '没有未采纳的举报记录。'
  if (activeFilter.value === 'contact') return '没有联系请求举报记录。联系请求存在骚扰或违规时，处理回执会在这里汇总。'
  return '你提交的帖子、评论或联系请求举报会在这里汇总，便于回看处理进度。'
})

const paramsForFilter = (cursor?: string): UserReportListParams => {
  const params: UserReportListParams = { limit: 20, cursor }
  if (activeFilter.value === 'post') params.sourceType = 'POST_REPORT'
  if (activeFilter.value === 'comment') params.sourceType = 'COMMENT_REPORT'
  if (activeFilter.value === 'contact') params.sourceType = 'CONTACT_REQUEST_REPORT'
  if (activeFilter.value === 'pending') params.status = 'PROCESSING'
  if (activeFilter.value === 'processed') params.status = 'ACTION_TAKEN'
  if (activeFilter.value === 'unaccepted') params.status = 'NOT_ACCEPTED'
  return params
}

const loadReports = async (append = false) => {
  if (isLoading.value) return
  isLoading.value = true
  loadError.value = ''
  try {
    const res = await interactionApi.listMyReports(paramsForFilter(append ? nextCursor.value : undefined))
    const data = res.data
    reports.value = append ? [...reports.value, ...(data?.items || [])] : (data?.items || [])
    nextCursor.value = data?.nextCursor
    hasMore.value = Boolean(data?.hasMore)
  } catch (error) {
    if (!append) reports.value = []
    loadError.value = getErrorMessage(error, '举报记录暂时不可用，请稍后再试。')
  } finally {
    isLoading.value = false
  }
}

const reloadReports = () => {
  nextCursor.value = undefined
  hasMore.value = false
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
  if (!sourceType || !reportId) return
  drawerOpen.value = true
  selectedReport.value = null
  detailError.value = ''
  detailLoading.value = true
  try {
    const res = await interactionApi.getMyReportDetail(sourceType, reportId)
    if (res.data) selectedReport.value = res.data
  } catch (error) {
    detailError.value = getErrorMessage(error, '详情暂时不可用，请稍后再试。')
  } finally {
    detailLoading.value = false
  }
}

const setFilter = async (filter: FilterValue) => {
  if (activeFilter.value === filter) return
  activeFilter.value = filter
  await router.replace({ query: { ...route.query, filter: filter === 'all' ? undefined : filter } })
  await reloadReports()
}

const openReport = async (report: UserReportReceipt) => {
  selectedReport.value = report
  drawerOpen.value = true
  detailError.value = ''
  detailLoading.value = true
  try {
    const res = await interactionApi.getMyReportDetail(report.sourceType, report.reportId)
    if (res.data) selectedReport.value = res.data
  } catch (error) {
    detailError.value = getErrorMessage(error, '详情暂时不可用，请稍后再试。')
  } finally {
    detailLoading.value = false
  }
}

const closeDrawer = () => {
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

onMounted(() => {
  void loadReports(false)
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
</style>
