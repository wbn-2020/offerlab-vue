<template>
  <section class="projection-panel" aria-label="跨投影健康">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">V8 · 跨投影诊断</p>
        <h2><Activity class="h-5 w-5" />投影健康状态</h2>
        <span>检查事实与通知、Feed、搜索、贡献、激励和角色读模型之间的差异。</span>
      </div>
      <button type="button" class="icon-button" title="刷新投影健康" :disabled="loading || !canInspect" @click="loadSummary">
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <div v-if="permissionLoading" class="state" data-projection-permission="loading">
      <Loader2 class="h-5 w-5 animate-spin" />正在核验投影诊断权限
    </div>
    <div v-else-if="permissionError" class="state state-error" data-projection-permission="error" role="alert">
      <AlertTriangle class="h-5 w-5" />{{ permissionError }}
    </div>
    <div v-else-if="!canInspect" class="state" data-projection-permission="denied">
      <ShieldAlert class="h-5 w-5" />当前账号没有运营诊断权限，问题明细不会加载。
    </div>
    <div v-else-if="errorText" class="state state-error" role="alert">
      <AlertTriangle class="h-5 w-5" />
      <span>{{ errorText }}</span>
      <button type="button" class="secondary-button compact" @click="loadSummary">重试</button>
    </div>
    <div v-else-if="loading && items.length === 0" class="state">
      <Loader2 class="h-5 w-5 animate-spin" />正在读取投影健康
    </div>
    <div v-else-if="items.length === 0" class="state">
      <Database class="h-5 w-5" />当前没有可展示的投影诊断项。
    </div>
    <template v-else>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>投影</th>
              <th>状态</th>
              <th>问题数</th>
              <th>修复能力</th>
              <th>检查时间</th>
              <th><span class="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in items"
              :key="item.projectionType"
              :class="{ 'selected-row': selectedType === item.projectionType }"
            >
              <td>
                <strong>{{ item.displayName }}</strong>
                <small>{{ item.projectionType }}</small>
              </td>
              <td>
                <span :class="['status-pill', healthClass(item.healthStatus)]">
                  {{ healthLabel(item.healthStatus) }}
                </span>
                <small v-if="item.attentionReasons.length">{{ item.attentionReasons.join('；') }}</small>
              </td>
              <td>
                <strong>{{ item.issueCountCapped ? `${item.issueCount}+` : item.issueCount }}</strong>
                <small v-if="item.backlogCount != null">积压 {{ item.backlogCount }}</small>
                <small v-if="item.overdueCount != null">超 SLA {{ item.overdueCount }}</small>
              </td>
              <td>
                <span :class="['status-pill', item.reconciliationSupported ? 'status-ok' : 'status-muted']">
                  {{ item.reconciliationSupported ? '支持有限批次' : '仅诊断' }}
                </span>
                <small v-if="item.repairMode">{{ repairModeLabel(item.repairMode) }}</small>
                <small v-if="item.slaMinutes">SLA {{ item.slaMinutes }} 分钟</small>
              </td>
              <td><small>{{ formatTime(item.checkedAt) }}</small></td>
              <td>
                <button type="button" class="secondary-button compact" @click="selectProjection(item)">
                  <ListTree class="h-4 w-4" />问题明细
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <section v-if="selected" class="issue-panel" aria-label="投影问题明细">
        <div class="issue-heading">
          <div>
            <h3>{{ selected.displayName }}问题明细</h3>
            <p>服务端返回的有界诊断样本；未支持的投影只能在所属领域入口处理。</p>
          </div>
          <span class="meta-chip">{{ selected.projectionType }}</span>
        </div>

        <div v-if="!selected.available" class="state compact-state">
          <CircleOff class="h-5 w-5" />依赖表不可用，暂时无法读取问题明细。
        </div>
        <div v-else-if="issueInitialError && issues.length === 0" class="state compact-state state-error" role="alert">
          <AlertTriangle class="h-5 w-5" />
          <span>{{ issueInitialError }}</span>
          <button type="button" class="secondary-button compact" @click="loadIssues(false)">重试</button>
        </div>
        <div v-else-if="issueLoading && issues.length === 0" class="state compact-state">
          <Loader2 class="h-5 w-5 animate-spin" />正在读取问题明细
        </div>
        <div v-else-if="issues.length === 0" class="state compact-state">
          <CheckCircle2 class="h-5 w-5" />当前批次未发现问题。
        </div>
        <div v-else class="issue-list">
          <article
            v-for="issue in issues"
            :key="`${issue.projectionType}:${issue.issueType}:${String(issue.issueId)}`"
            class="issue-row"
          >
            <div>
              <div class="badge-line">
                <span :class="['status-pill', severityClass(issue.severity)]">{{ issue.severity }}</span>
                <span class="meta-chip">{{ issue.issueType }}</span>
              </div>
              <strong>{{ issue.summary }}</strong>
              <small>{{ issue.subjectType }} {{ issue.subjectId }} · {{ formatTime(issue.detectedAt) }}</small>
              <RouterLink v-if="postContextPath(issue)" :to="postContextPath(issue)" class="issue-context-link">
                查看文章上下文
              </RouterLink>
              <span v-else class="issue-read-only">只读诊断</span>
            </div>
            <span class="issue-id">#{{ issue.issueId }}</span>
          </article>
        </div>
        <div v-if="issueSourceWarning" class="state compact-state issue-source-warning" role="status">
          <AlertTriangle class="h-5 w-5" />
          <span>{{ issueSourceWarning }}</span>
        </div>
        <div v-if="issueAppendError" class="state compact-state state-error issue-append-error" role="alert">
          <AlertTriangle class="h-5 w-5" />
          <span>{{ issueAppendError }}</span>
          <button
            v-if="issuePaginationStalled"
            type="button"
            class="secondary-button compact"
            @click="loadIssues(false)"
          >
            刷新问题列表
          </button>
          <button v-else type="button" class="secondary-button compact" @click="loadIssues(true)">重试追加</button>
        </div>
        <div v-if="issueHasMore && !issueAppendError" class="load-more-row">
          <button type="button" class="secondary-button" :disabled="issueLoadingMore" @click="loadIssues(true)">
            <Loader2 v-if="issueLoadingMore" class="h-4 w-4 animate-spin" />
            <ChevronDown v-else class="h-4 w-4" />
            {{ issueLoadingMore ? '正在加载' : '加载更多问题' }}
          </button>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleOff,
  Database,
  ListTree,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-vue-next'
import { getErrorMessage } from '@/api/client'
import {
  projectionHealthApi,
  type ProjectionHealth,
  type ProjectionIssue,
} from '@/api/projectionHealth'

const props = withDefaults(defineProps<{
  canInspect: boolean
  permissionLoading: boolean
  permissionError: string
  refreshKey?: number
}>(), {
  refreshKey: 0,
})

const emit = defineEmits<{
  select: [projection: ProjectionHealth | null]
}>()

const items = ref<ProjectionHealth[]>([])
const issues = ref<ProjectionIssue[]>([])
const selectedType = ref('')
const nextCursor = ref<string | null>(null)
const issueHasMore = ref(false)
const loading = ref(false)
const issueLoading = ref(false)
const issueLoadingMore = ref(false)
const errorText = ref('')
const issueInitialError = ref('')
const issueAppendError = ref('')
const issueSourceWarning = ref('')
const issuePaginationStalled = ref(false)
let summaryRequest = 0
let issueRequest = 0
let issueController: AbortController | null = null
const consumedIssueCursors = new Set<string>()

const selected = computed(() => items.value.find((item) => item.projectionType === selectedType.value) || null)

interface IssueRequestSnapshot {
  projectionType: string
  requestId: number
  cursor: string | null
  append: boolean
  controller: AbortController
}

const issueRequestOwnsState = (snapshot: IssueRequestSnapshot) => (
  snapshot.requestId === issueRequest
  && snapshot.projectionType === selectedType.value
  && snapshot.controller === issueController
)

const issueRequestIsCurrent = (snapshot: IssueRequestSnapshot) => (
  issueRequestOwnsState(snapshot)
  && !snapshot.controller.signal.aborted
  && snapshot.cursor === (snapshot.append ? nextCursor.value : null)
)

const isCanceledRequest = (error: unknown, signal: AbortSignal) => {
  const candidate = error as { name?: string; code?: string } | null
  return signal.aborted
    || candidate?.name === 'AbortError'
    || candidate?.name === 'CanceledError'
    || candidate?.code === 'ERR_CANCELED'
}

const cancelIssueRequest = () => {
  issueRequest += 1
  issueController?.abort()
  issueController = null
  issueLoading.value = false
  issueLoadingMore.value = false
}

const resetIssueState = () => {
  cancelIssueRequest()
  issues.value = []
  nextCursor.value = null
  issueHasMore.value = false
  issueInitialError.value = ''
  issueAppendError.value = ''
  issueSourceWarning.value = ''
  issuePaginationStalled.value = false
  consumedIssueCursors.clear()
}

const issueIdentity = (issue: ProjectionIssue) => (
  `${issue.projectionType}:${issue.issueType}:${String(issue.issueId)}`
)

const mergeIssuePage = (incoming: ProjectionIssue[], append: boolean) => {
  const merged = append ? [...issues.value] : []
  const seen = new Set(merged.map(issueIdentity))
  let addedCount = 0
  for (const issue of incoming) {
    const identity = issueIdentity(issue)
    if (seen.has(identity)) continue
    seen.add(identity)
    merged.push(issue)
    addedCount += 1
  }
  return { items: merged, addedCount }
}

const selectProjection = (item: ProjectionHealth) => {
  resetIssueState()
  selectedType.value = item.projectionType
  emit('select', item)
  if (item.available) void loadIssues(false)
}

const loadSummary = async () => {
  if (!props.canInspect) return
  const requestId = ++summaryRequest
  resetIssueState()
  loading.value = true
  errorText.value = ''
  try {
    const response = await projectionHealthApi.summary()
    if (requestId !== summaryRequest) return
    resetIssueState()
    items.value = Array.isArray(response.data) ? response.data : []
    const next = items.value.find((item) => item.projectionType === selectedType.value) || items.value[0] || null
    if (next) {
      selectedType.value = next.projectionType
      emit('select', next)
      if (next.available) await loadIssues(false)
    } else {
      selectedType.value = ''
      emit('select', null)
    }
  } catch (error) {
    if (requestId === summaryRequest) errorText.value = getErrorMessage(error, '投影健康暂时无法读取')
  } finally {
    if (requestId === summaryRequest) loading.value = false
  }
}

const loadIssues = async (append = false) => {
  const projection = selected.value
  if (!projection || !projection.available || !props.canInspect) return
  if (append && (!issueHasMore.value || !nextCursor.value || issueLoadingMore.value)) return

  const projectionType = projection.projectionType
  const cursorSnapshot = append ? nextCursor.value : null
  const requestCursorKey = cursorSnapshot || '0'
  if (append && consumedIssueCursors.has(requestCursorKey)) {
    issueHasMore.value = false
    nextCursor.value = null
    issuePaginationStalled.value = true
    issueAppendError.value = '分页游标已被消费，已停止继续加载。请刷新问题列表后重试。'
    return
  }
  issueController?.abort()
  const controller = new AbortController()
  const requestId = ++issueRequest
  const snapshot: IssueRequestSnapshot = {
    projectionType,
    requestId,
    cursor: cursorSnapshot,
    append,
    controller,
  }
  issueController = controller

  if (append) {
    issueLoadingMore.value = true
    issueAppendError.value = ''
    issuePaginationStalled.value = false
  } else {
    issueLoading.value = true
    issueLoadingMore.value = false
    issueInitialError.value = ''
    issueAppendError.value = ''
    issueSourceWarning.value = ''
    issuePaginationStalled.value = false
    issues.value = []
    nextCursor.value = null
    issueHasMore.value = false
    consumedIssueCursors.clear()
  }

  try {
    const response = await projectionHealthApi.issues(projectionType, {
      cursor: append ? cursorSnapshot || 0 : 0,
      size: 20,
    }, {
      signal: controller.signal,
    })
    if (!issueRequestIsCurrent(snapshot)) return
    const page = response.data
    const incoming = Array.isArray(page?.items) ? page.items : []
    const merged = mergeIssuePage(incoming, append)
    const responseCursor = page?.nextCursor ? String(page.nextCursor) : null
    const pageHasMore = Boolean(page?.hasMore)
    consumedIssueCursors.add(requestCursorKey)
    const cursorRepeated = Boolean(
      responseCursor && consumedIssueCursors.has(responseCursor),
    )
    const paginationStalled = pageHasMore && (
      !responseCursor
      || cursorRepeated
      || (append && merged.addedCount === 0)
    )
    issues.value = merged.items
    issueSourceWarning.value = formatSourceWarning(page)
    if (paginationStalled) {
      nextCursor.value = null
      issueHasMore.value = false
      issuePaginationStalled.value = true
      const stallMessage = '分页游标未推进或没有新增问题，已停止继续加载。请刷新问题列表后重试。'
      if (!append && merged.items.length === 0) issueInitialError.value = stallMessage
      else issueAppendError.value = stallMessage
    } else {
      issuePaginationStalled.value = false
      nextCursor.value = responseCursor
      issueHasMore.value = Boolean(pageHasMore && responseCursor)
    }
  } catch (error) {
    if (!issueRequestIsCurrent(snapshot) || isCanceledRequest(error, controller.signal)) return
    const message = getErrorMessage(error, '投影问题明细暂时无法读取')
    issuePaginationStalled.value = false
    if (append) {
      issueAppendError.value = message
    } else {
      issues.value = []
      nextCursor.value = null
      issueHasMore.value = false
      issueInitialError.value = message
    }
  } finally {
    if (issueRequestOwnsState(snapshot)) {
      if (append) issueLoadingMore.value = false
      else issueLoading.value = false
    }
    if (issueController === controller) issueController = null
  }
}

const postContextPath = (issue: ProjectionIssue) => (
  issue.subjectType === 'POST' && /^[1-9]\d*$/.test(issue.subjectId)
    ? `/post/${issue.subjectId}#trusted-content`
    : ''
)

const formatSourceWarning = (page: {
  degraded?: boolean | null
  diagnostics?: { sourceErrors?: Record<string, string> } | null
} | null | undefined) => {
  if (!page?.degraded) return ''
  const sourceErrors = page.diagnostics?.sourceErrors
  const details = sourceErrors
    ? Object.entries(sourceErrors)
        .map(([source, reason]) => `${source}: ${reason}`)
        .join('；')
    : ''
  return details
    ? `部分问题来源暂时不可用（${details}），本次只展示已读取的有限样本；请刷新后重新检查。`
    : '部分问题来源暂时不可用，本次只展示已读取的有限样本；请刷新后重新检查。'
}

const healthLabel = (value: string) => ({
  STABLE: '稳定',
  ATTENTION: '需要关注',
  UNKNOWN: '待建立基线',
  UNAVAILABLE: '不可用',
}[value] || value)

const healthClass = (value: string) => {
  if (value === 'STABLE') return 'status-ok'
  if (value === 'ATTENTION') return 'status-warn'
  if (value === 'UNAVAILABLE') return 'status-danger'
  return 'status-muted'
}

const severityClass = (value: string) => {
  if (['CRITICAL', 'HIGH'].includes(value)) return 'status-danger'
  if (value === 'MEDIUM') return 'status-warn'
  return 'status-muted'
}

const repairModeLabel = (value: string) => ({
  DIAGNOSTIC_SCAN_AND_DIFFERENCE_RECORDING: '诊断扫描与差异记录',
  BOUNDED_EXISTING_INBOX_PROCESSING: '复用既有 Inbox 有限处理',
  BOUNDED_MANUAL: '有限人工修复',
  DIAGNOSIS_ONLY: '仅诊断',
  EXISTING_OUTBOX_OPS: '使用既有 Outbox 运维入口',
}[value] || value)

const formatTime = (value?: string | null) => {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

watch(
  [() => props.canInspect, () => props.refreshKey],
  ([canInspect]) => {
    if (canInspect) void loadSummary()
    else {
      summaryRequest += 1
      resetIssueState()
      items.value = []
      selectedType.value = ''
      emit('select', null)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  summaryRequest += 1
  cancelIssueRequest()
})
</script>

<style scoped>
.projection-panel { display: grid; gap: 1rem; border: 1px solid rgb(226 232 240); border-radius: .625rem; background: white; padding: 1rem; }
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: .8rem; }
.panel-heading h2 { display: flex; align-items: center; gap: .4rem; margin: .2rem 0 0; color: rgb(15 23 42); font-size: 1rem; font-weight: 900; }
.panel-heading span { display: block; margin-top: .3rem; color: rgb(100 116 139); font-size: .73rem; line-height: 1.5; }
.eyebrow { margin: 0; color: rgb(8 145 178); font-size: .66rem; font-weight: 900; letter-spacing: .05em; }
.icon-button { display: inline-flex; height: 2.25rem; width: 2.25rem; flex: none; align-items: center; justify-content: center; border: 1px solid rgb(203 213 225); border-radius: .45rem; background: white; color: rgb(51 65 85); }
.table-wrap { max-width: 100%; overflow-x: auto; }
table { width: 100%; min-width: 760px; border-collapse: collapse; font-size: .72rem; }
th { border-bottom: 1px solid rgb(203 213 225); padding: .55rem; color: rgb(71 85 105); font-size: .65rem; text-align: left; }
td { border-bottom: 1px solid rgb(241 245 249); padding: .65rem .55rem; vertical-align: top; }
tr.selected-row td { background: rgb(240 249 255); }
td strong, td small { display: block; max-width: 18rem; overflow-wrap: anywhere; }
td strong { color: rgb(30 41 59); font-weight: 900; }
td small { margin-top: .22rem; color: rgb(100 116 139); font-size: .65rem; line-height: 1.4; }
.status-pill, .meta-chip { display: inline-flex; align-items: center; border-radius: 999px; padding: .2rem .48rem; font-size: .63rem; font-weight: 900; }
.status-ok { background: rgb(220 252 231); color: rgb(21 128 61); }
.status-warn { background: rgb(254 243 199); color: rgb(146 64 14); }
.status-danger { background: rgb(254 226 226); color: rgb(185 28 28); }
.status-muted, .meta-chip { background: rgb(241 245 249); color: rgb(71 85 105); }
.secondary-button { display: inline-flex; min-height: 32px; align-items: center; justify-content: center; gap: .35rem; border: 1px solid rgb(203 213 225); border-radius: .45rem; background: white; padding: .35rem .6rem; color: rgb(51 65 85); font-size: .68rem; font-weight: 900; white-space: nowrap; }
.state { display: flex; min-height: 6rem; align-items: center; justify-content: center; gap: .5rem; border: 1px dashed rgb(203 213 225); border-radius: .5rem; padding: 1rem; color: rgb(100 116 139); font-size: .75rem; text-align: center; }
.compact-state { min-height: 4.5rem; margin-top: .7rem; }
.state-error { border-style: solid; border-color: rgb(254 202 202); color: rgb(185 28 28); }
.issue-panel { min-width: 0; border-top: 1px solid rgb(226 232 240); padding-top: 1rem; }
.issue-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: .6rem; }
.issue-heading h3 { margin: 0; color: rgb(30 41 59); font-size: .86rem; font-weight: 900; }
.issue-heading p { margin: .25rem 0 0; color: rgb(100 116 139); font-size: .68rem; line-height: 1.45; }
.issue-list { display: grid; gap: .6rem; margin-top: .8rem; }
.issue-row { display: flex; min-width: 0; align-items: flex-start; justify-content: space-between; gap: .7rem; border-top: 1px solid rgb(241 245 249); padding-top: .65rem; }
.issue-row:first-child { border-top: 0; padding-top: 0; }
.issue-row > div { min-width: 0; }
.badge-line { display: flex; flex-wrap: wrap; gap: .35rem; }
.issue-row strong, .issue-row small { display: block; overflow-wrap: anywhere; }
.issue-row strong { margin-top: .4rem; color: rgb(30 41 59); font-size: .75rem; }
.issue-row small { margin-top: .2rem; color: rgb(100 116 139); font-size: .66rem; }
.issue-context-link, .issue-read-only { display: inline-flex; margin-top: .45rem; font-size: .68rem; font-weight: 800; }
.issue-context-link { color: rgb(8 145 178); text-decoration: underline; text-underline-offset: 2px; }
.issue-read-only { color: rgb(100 116 139); }
.issue-id { flex: none; color: rgb(100 116 139); font-size: .66rem; font-weight: 800; }
.issue-append-error { min-height: 3.5rem; }
.load-more-row { display: flex; justify-content: center; margin-top: .8rem; }
button:disabled { cursor: not-allowed; opacity: .5; }
.dark .projection-panel, .dark .icon-button, .dark .secondary-button { border-color: rgb(51 65 85); background: rgb(15 23 42); color: rgb(203 213 225); }
.dark .panel-heading h2, .dark td strong, .dark .issue-heading h3, .dark .issue-row strong { color: rgb(248 250 252); }
.dark .panel-heading span, .dark th, .dark td small, .dark .state, .dark .issue-heading p, .dark .issue-row small, .dark .issue-id, .dark .issue-read-only { color: rgb(148 163 184); }
.dark th, .dark .issue-panel { border-color: rgb(51 65 85); }
.dark td, .dark .issue-row { border-color: rgb(30 41 59); }
.dark tr.selected-row td { background: rgb(8 47 73 / .35); }
.dark .status-muted, .dark .meta-chip { background: rgb(30 41 59); color: rgb(203 213 225); }
</style>
