<template>
  <div class="admin-maintenance-page min-h-screen">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <header class="page-header">
        <div><p>频道维护</p><h1>维护任务治理</h1><span>将频道健康和内容问题协调为可审核的公开交付，不自动改变内容排序或作者身份。</span></div>
        <button type="button" class="icon-button" title="刷新维护任务队列" :disabled="loading" @click="load()"><RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" /></button>
      </header>
      <section class="layout">
        <aside class="create-panel">
          <h2>创建维护任务</h2>
          <form class="form-stack" @submit.prevent="create">
            <select v-model.number="form.domain" class="field-control"><option v-for="domain in domains" :key="domain.value" :value="domain.value">{{ domain.label }}</option></select>
            <select v-model="form.sourceType" class="field-control"><option v-for="source in sources" :key="source" :value="source">{{ sourceLabel(source) }}</option></select>
            <input v-model.trim="form.assigneeUid" class="field-control" inputmode="numeric" placeholder="负责人 UID">
            <input v-model.trim="form.sourcePostId" class="field-control" inputmode="numeric" placeholder="关联原帖子 ID（可选）">
            <input v-model.trim="form.sourceRefId" class="field-control" inputmode="numeric" placeholder="来源记录 ID（可选）">
            <input v-model.trim="form.title" class="field-control" maxlength="160" placeholder="任务标题">
            <textarea v-model.trim="form.detail" class="field-control" rows="5" maxlength="2000" placeholder="说明维护目标、公开边界与验收依据。" />
            <button type="submit" class="primary-button" :disabled="busy || !canCreate">创建并分派</button>
          </form>
        </aside>
        <section class="queue-panel">
          <div class="queue-head">
            <div><h2>维护队列</h2><p>提交交付后由同一领域的治理人员审核；驳回会退回负责人继续处理。</p></div>
            <div class="filters"><select v-model.number="filterDomain" class="field-control compact" @change="load()"><option value="">全部领域</option><option v-for="domain in domains" :key="domain.value" :value="domain.value">{{ domain.label }}</option></select><select v-model="filterStatus" class="field-control compact" @change="load()"><option value="">全部状态</option><option v-for="item in statuses" :key="item" :value="item">{{ statusLabel(item) }}</option></select></div>
          </div>
          <div v-if="errorText && items.length === 0" class="state state-error">
            <p>{{ errorText }}</p>
            <button type="button" class="secondary-button" :disabled="loading" @click="load()">重试</button>
          </div>
          <div v-else-if="loading" class="state">正在读取维护队列</div>
          <div v-else-if="items.length === 0" class="state">当前筛选下没有维护任务。</div>
          <div v-else class="task-list">
            <article v-for="task in items" :key="String(task.id)" class="task-row">
              <div class="task-head"><div><div class="badge-line"><span :class="['status', statusClass(task.status)]">{{ statusLabel(task.status) }}</span><span class="source">{{ sourceLabel(task.sourceType) }}</span><span class="source">领域 {{ task.domain }}</span></div><h3>{{ task.title }}</h3></div><RouterLink v-if="task.sourcePostId" :to="`/post/${task.sourcePostId}`" class="open-link">查看原内容</RouterLink></div>
              <p>{{ task.detail }}</p><small>任务 #{{ task.id }} · 负责人 {{ task.assigneeUid }} · {{ formatTime(task.updateTime) }}</small>
              <p v-if="task.deliveryNote" class="note">交付：{{ task.deliveryType }} #{{ task.deliveryRefId }} · {{ task.deliveryNote }}</p>
              <p v-if="task.reviewNote" class="note">治理说明：{{ task.reviewNote }}</p>
              <div v-if="task.canReassign" class="reassign-bar">
                <input v-model.trim="reassignDraft(task).replacementUid" class="field-control compact" inputmode="numeric" placeholder="接替者 UID">
                <input v-model.trim="reassignDraft(task).reason" class="field-control" maxlength="500" placeholder="说明转派原因">
                <button type="button" class="secondary-button compact-button" :disabled="busy || !canReassign(task)" @click="reassign(task)">转派</button>
              </div>
              <div v-if="task.canReview || task.canClose" class="review-bar"><input v-model.trim="notes[String(task.id)]" class="field-control" maxlength="1000" placeholder="审核或关闭说明"><button v-if="task.canReview" type="button" class="primary-button compact-button" :disabled="busy || note(task).length < 2" @click="review(task, 'APPROVED')">通过</button><button v-if="task.canReview" type="button" class="secondary-button compact-button" :disabled="busy || note(task).length < 2" @click="review(task, 'REJECTED')">退回</button><button v-if="task.canClose" type="button" class="danger-button compact-button" :disabled="busy || note(task).length < 2" @click="close(task)">关闭</button></div>
            </article>
          </div>
          <div v-if="loadMoreErrorText && items.length > 0" class="state state-error load-more-error">
            <p>{{ loadMoreErrorText }}</p>
            <button type="button" class="secondary-button" :disabled="loadingMore" @click="load(true)">重试加载更多</button>
          </div>
          <div v-else-if="hasMore && !loading" class="load-more-row">
            <button type="button" class="secondary-button" :disabled="loadingMore" @click="load(true)">
              {{ loadingMore ? '正在加载' : '加载更多' }}
            </button>
          </div>
        </section>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import AppHeader from '@/components/layout/AppHeader.vue'
import { getErrorMessage } from '@/api/client'
import { contentMaintenanceApi, type ContentMaintenanceTask, type MaintenanceSourceType, type MaintenanceStatus } from '@/api/contentMaintenance'
import { useAuthStore } from '@/stores/auth'

const domains = [{ value: 1, label: '科技数码' }, { value: 2, label: '职场经验' }, { value: 3, label: '阅读成长' }, { value: 4, label: '生活方式' }, { value: 5, label: '投资理财' }]
const sources: MaintenanceSourceType[] = ['CHANNEL_HEALTH', 'SEARCH_GAP', 'SUGGESTION', 'FRESHNESS', 'PROFILE_CONFIRMATION', 'QUESTION', 'MANUAL']
const statuses: MaintenanceStatus[] = ['OPEN', 'CLAIMED', 'SUBMITTED', 'COMPLETED', 'CLOSED']
const route = useRoute()
const authStore = useAuthStore()
const form = reactive({ domain: 1, sourceType: 'MANUAL' as MaintenanceSourceType, assigneeUid: '', sourcePostId: '', sourceRefId: '', title: '', detail: '' })
const routeDomain = Number(route.query.domain)
const routeSourceType = String(route.query.sourceType || '')
if (Number.isInteger(routeDomain) && routeDomain >= 1 && routeDomain <= 5) form.domain = routeDomain
if (sources.includes(routeSourceType as MaintenanceSourceType)) form.sourceType = routeSourceType as MaintenanceSourceType
if (typeof route.query.title === 'string') form.title = route.query.title.slice(0, 160)
if (typeof route.query.detail === 'string') form.detail = route.query.detail.slice(0, 2000)
const filterDomain = ref<number | ''>('')
const filterStatus = ref<MaintenanceStatus | ''>('')
const items = ref<ContentMaintenanceTask[]>([])
const notes = reactive<Record<string, string>>({})
const reassignments = reactive<Record<string, { replacementUid: string; reason: string }>>({})
const loading = ref(false)
const loadingMore = ref(false)
const busy = ref(false)
const errorText = ref('')
const loadMoreErrorText = ref('')
const nextCursor = ref<string | null>(null)
const hasMore = ref(false)
let maintenanceQueueRequestId = 0
let maintenanceAccountGeneration = 0
let maintenanceQueueController: AbortController | null = null
let maintenanceWriteRequestId = 0

interface MaintenanceQueueSnapshot {
  requestId: number
  requestedDomain: number | ''
  requestedStatus: MaintenanceStatus | ''
  cursor: string | null
  append: boolean
  accountKey: string
  accountGeneration: number
  controller: AbortController
}

interface MaintenanceWriteSnapshot {
  requestId: number
  accountKey: string
  accountGeneration: number
}

const currentMaintenanceAccountKey = () => (
  `${String(authStore.user?.uid ?? '')}:${String(authStore.token ?? '')}`
)
const maintenanceAccountIsReady = () => authStore.isLoggedIn && Boolean(authStore.user?.uid)

const abortMaintenanceQueueLoad = () => {
  maintenanceQueueController?.abort()
  maintenanceQueueController = null
}

const clearRecord = (record: Record<string, unknown>) => {
  for (const key of Object.keys(record)) delete record[key]
}

const resetCreateForm = () => {
  Object.assign(form, {
    domain: 1,
    sourceType: 'MANUAL',
    assigneeUid: '',
    sourcePostId: '',
    sourceRefId: '',
    title: '',
    detail: '',
  })
}

const clearMaintenanceQueueState = (clearDrafts = false) => {
  maintenanceQueueRequestId += 1
  maintenanceWriteRequestId += 1
  abortMaintenanceQueueLoad()
  loading.value = false
  loadingMore.value = false
  busy.value = false
  items.value = []
  nextCursor.value = null
  hasMore.value = false
  errorText.value = ''
  loadMoreErrorText.value = ''
  if (clearDrafts) {
    clearRecord(notes)
    clearRecord(reassignments)
    resetCreateForm()
  }
}

const maintenanceQueueRequestIsCurrent = (snapshot: MaintenanceQueueSnapshot) => (
  snapshot.requestId === maintenanceQueueRequestId
  && snapshot.requestedDomain === filterDomain.value
  && snapshot.requestedStatus === filterStatus.value
  && snapshot.accountGeneration === maintenanceAccountGeneration
  && snapshot.accountKey === currentMaintenanceAccountKey()
  && snapshot.cursor === (snapshot.append ? nextCursor.value : null)
  && maintenanceQueueController === snapshot.controller
  && !snapshot.controller.signal.aborted
  && maintenanceAccountIsReady()
)

const beginMaintenanceWrite = (): MaintenanceWriteSnapshot | null => {
  if (busy.value || !maintenanceAccountIsReady()) return null
  const snapshot: MaintenanceWriteSnapshot = {
    requestId: ++maintenanceWriteRequestId,
    accountKey: currentMaintenanceAccountKey(),
    accountGeneration: maintenanceAccountGeneration,
  }
  busy.value = true
  return snapshot
}

const maintenanceWriteIsCurrent = (snapshot: MaintenanceWriteSnapshot) => (
  snapshot.requestId === maintenanceWriteRequestId
  && snapshot.accountGeneration === maintenanceAccountGeneration
  && snapshot.accountKey === currentMaintenanceAccountKey()
  && maintenanceAccountIsReady()
)

const isCanceledRequest = (error: unknown, signal: AbortSignal) => {
  if (signal.aborted) return true
  const candidate = error as { name?: unknown; code?: unknown } | null | undefined
  return candidate?.name === 'AbortError'
    || candidate?.name === 'CanceledError'
    || candidate?.code === 'ERR_CANCELED'
}

const positive = (value: string) => /^[1-9]\d*$/.test(value)
const canCreate = computed(() => positive(form.assigneeUid) && form.title.length >= 2 && form.detail.length >= 5)
const note = (task: ContentMaintenanceTask) => notes[String(task.id)] || ''
const reassignDraft = (task: ContentMaintenanceTask) => {
  const key = String(task.id)
  return reassignments[key] || (reassignments[key] = { replacementUid: '', reason: '' })
}
const canReassign = (task: ContentMaintenanceTask) => {
  const draft = reassignDraft(task)
  return positive(draft.replacementUid) && draft.reason.length >= 2
}
const load = async (append = false) => {
  if (!maintenanceAccountIsReady()) return
  if (append && (!hasMore.value || loadingMore.value)) return
  const requestedDomain = filterDomain.value
  const requestedStatus = filterStatus.value
  const cursor = append ? nextCursor.value : null
  if (append && !cursor) return
  const accountKey = currentMaintenanceAccountKey()
  const accountGeneration = maintenanceAccountGeneration
  abortMaintenanceQueueLoad()
  const controller = new AbortController()
  const requestId = ++maintenanceQueueRequestId
  const snapshot: MaintenanceQueueSnapshot = {
    requestId,
    requestedDomain,
    requestedStatus,
    cursor,
    append,
    accountKey,
    accountGeneration,
    controller,
  }
  maintenanceQueueController = controller
  if (append) {
    loadingMore.value = true
    loadMoreErrorText.value = ''
  } else {
    loading.value = true
    loadingMore.value = false
    items.value = []
    nextCursor.value = null
    hasMore.value = false
    errorText.value = ''
    loadMoreErrorText.value = ''
  }
  try {
    const res = await contentMaintenanceApi.queue({
      domain: requestedDomain || undefined,
      status: requestedStatus || undefined,
      cursor: cursor || 0,
      size: 50,
    }, {
      signal: controller.signal,
    })
    if (!maintenanceQueueRequestIsCurrent(snapshot)) return
    const incoming = res.data?.items || []
    items.value = append ? [...items.value, ...incoming] : incoming
    nextCursor.value = res.data?.nextCursor || null
    hasMore.value = Boolean(res.data?.hasMore && nextCursor.value)
  } catch (error) {
    if (isCanceledRequest(error, controller.signal) || !maintenanceQueueRequestIsCurrent(snapshot)) return
    const message = getErrorMessage(error, append ? '加载更多维护任务失败' : '维护队列暂时无法读取')
    if (append) loadMoreErrorText.value = message
    else errorText.value = message
  } finally {
    if (maintenanceQueueController === controller && requestId === maintenanceQueueRequestId) {
      if (append) loadingMore.value = false
      else loading.value = false
      maintenanceQueueController = null
    }
  }
}
const create = async () => {
  if (!canCreate.value) return
  const snapshot = beginMaintenanceWrite()
  if (!snapshot) return
  try {
    await contentMaintenanceApi.create({ domain: form.domain, sourceType: form.sourceType, assigneeUid: form.assigneeUid, sourcePostId: positive(form.sourcePostId) ? form.sourcePostId : undefined, sourceRefId: positive(form.sourceRefId) ? form.sourceRefId : undefined, title: form.title, detail: form.detail })
    if (!maintenanceWriteIsCurrent(snapshot)) return
    resetCreateForm()
    toast.success('维护任务已创建')
    await load()
  } catch (error) {
    if (!maintenanceWriteIsCurrent(snapshot)) return
    toast.error(getErrorMessage(error, '创建维护任务失败'))
  } finally {
    if (maintenanceWriteIsCurrent(snapshot)) busy.value = false
  }
}
const review = async (task: ContentMaintenanceTask, decision: 'APPROVED' | 'REJECTED') => {
  const snapshot = beginMaintenanceWrite()
  if (!snapshot) return
  try {
    await contentMaintenanceApi.review(task.id, { decision, note: note(task) })
    if (!maintenanceWriteIsCurrent(snapshot)) return
    toast.success(decision === 'APPROVED' ? '任务已完成' : '任务已退回负责人')
    await load()
  } catch (error) {
    if (!maintenanceWriteIsCurrent(snapshot)) return
    toast.error(getErrorMessage(error, '审核维护任务失败'))
  } finally {
    if (maintenanceWriteIsCurrent(snapshot)) busy.value = false
  }
}
const reassign = async (task: ContentMaintenanceTask) => {
  const draft = reassignDraft(task)
  if (!canReassign(task)) return
  const snapshot = beginMaintenanceWrite()
  if (!snapshot) return
  try {
    await contentMaintenanceApi.reassign(task.id, {
      replacementUid: draft.replacementUid,
      reason: draft.reason,
    })
    if (!maintenanceWriteIsCurrent(snapshot)) return
    delete reassignments[String(task.id)]
    toast.success('维护任务已转派')
    await load()
  } catch (error) {
    if (!maintenanceWriteIsCurrent(snapshot)) return
    toast.error(getErrorMessage(error, '转派维护任务失败'))
  } finally {
    if (maintenanceWriteIsCurrent(snapshot)) busy.value = false
  }
}
const close = async (task: ContentMaintenanceTask) => {
  const snapshot = beginMaintenanceWrite()
  if (!snapshot) return
  try {
    await contentMaintenanceApi.close(task.id, note(task))
    if (!maintenanceWriteIsCurrent(snapshot)) return
    toast.success('任务已关闭')
    await load()
  } catch (error) {
    if (!maintenanceWriteIsCurrent(snapshot)) return
    toast.error(getErrorMessage(error, '关闭维护任务失败'))
  } finally {
    if (maintenanceWriteIsCurrent(snapshot)) busy.value = false
  }
}
const statusLabel = (value: MaintenanceStatus) => ({ OPEN: '待领取', CLAIMED: '处理中', SUBMITTED: '待审核', COMPLETED: '已完成', CLOSED: '已关闭' }[value])
const sourceLabel = (value: string) => ({ CHANNEL_HEALTH: '频道健康', SEARCH_GAP: '搜索缺口', SUGGESTION: '补充纠错', FRESHNESS: '时效确认', PROFILE_CONFIRMATION: '经验背景', QUESTION: '问题闭环', MANUAL: '人工创建' }[value] || value)
const statusClass = (value: MaintenanceStatus) => value === 'COMPLETED' ? 'status-ok' : value === 'SUBMITTED' ? 'status-warn' : value === 'CLOSED' ? 'status-muted' : 'status-active'
const formatTime = (value: string) => value?.replace('T', ' ').slice(0, 16) || '--'

watch(
  [() => authStore.user?.uid, () => authStore.token],
  ([uid, token], [previousUid, previousToken]) => {
    if (uid === previousUid && token === previousToken) return
    maintenanceAccountGeneration += 1
    clearMaintenanceQueueState(true)
    if (uid && token) void load()
  },
)

void load()

onBeforeUnmount(() => {
  maintenanceQueueRequestId += 1
  maintenanceWriteRequestId += 1
  abortMaintenanceQueueLoad()
})
</script>

<style scoped>
.admin-maintenance-page{background:rgb(248 250 252)}.page-header,.queue-head,.task-head,.review-bar,.reassign-bar{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}.page-header{margin-bottom:1.25rem}.page-header p{margin:0;color:rgb(8 145 178);font-size:.75rem;font-weight:900}.page-header h1{margin:.2rem 0;color:rgb(15 23 42);font-size:1.5rem;font-weight:900}.page-header span{color:rgb(100 116 139);font-size:.85rem;line-height:1.55}.icon-button{display:inline-flex;width:2.5rem;height:2.5rem;align-items:center;justify-content:center;border:1px solid rgb(203 213 225);border-radius:.5rem;background:white}.layout{display:grid;grid-template-columns:minmax(17rem,22rem) minmax(0,1fr);gap:1rem;align-items:start}.create-panel,.queue-panel{border:1px solid rgb(226 232 240);border-radius:.625rem;background:white;padding:1rem}.create-panel{position:sticky;top:5rem}.create-panel h2,.queue-head h2,.task-head h3{margin:0;color:rgb(15 23 42);font-size:1rem;font-weight:900}.queue-head p{margin:.3rem 0 0;color:rgb(100 116 139);font-size:.76rem;line-height:1.5}.form-stack{display:grid;gap:.65rem;margin-top:1rem}.field-control{width:100%;min-width:0;border:1px solid rgb(203 213 225);border-radius:.5rem;background:white;padding:.58rem .65rem;color:rgb(15 23 42);font-size:.78rem}.filters{display:flex;flex-wrap:wrap;gap:.5rem}.compact{width:auto;min-width:8rem}.task-list{display:grid;gap:.75rem;margin-top:1rem}.task-row{border-top:1px solid rgb(226 232 240);padding-top:.85rem}.task-row:first-child{border-top:0;padding-top:0}.badge-line{display:flex;flex-wrap:wrap;gap:.4rem}.status,.source{display:inline-flex;border-radius:999px;padding:.2rem .5rem;font-size:.66rem;font-weight:900}.status-active{background:rgb(224 231 255);color:rgb(67 56 202)}.status-warn{background:rgb(254 243 199);color:rgb(146 64 14)}.status-ok{background:rgb(220 252 231);color:rgb(21 128 61)}.status-muted,.source{background:rgb(241 245 249);color:rgb(71 85 105)}.task-head h3{margin-top:.5rem}.task-row p,.task-row small{display:block;margin:.55rem 0 0;color:rgb(71 85 105);font-size:.78rem;line-height:1.55}.task-row small{color:rgb(100 116 139);font-size:.7rem}.open-link{color:rgb(8 145 178);font-size:.72rem;font-weight:800;white-space:nowrap}.note{border-left:2px solid rgb(125 211 252);padding-left:.6rem}.review-bar,.reassign-bar{align-items:center;margin-top:.75rem}.review-bar .field-control,.reassign-bar .field-control:not(.compact){flex:1}.load-more-row{display:flex;justify-content:center;margin-top:1rem}.primary-button,.secondary-button,.danger-button{display:inline-flex;min-height:38px;align-items:center;justify-content:center;border-radius:.5rem;padding:.45rem .7rem;font-size:.76rem;font-weight:900}.primary-button{border:1px solid rgb(8 145 178);background:rgb(8 145 178);color:white}.secondary-button{border:1px solid rgb(203 213 225);background:white;color:rgb(51 65 85)}.danger-button{border:1px solid rgb(220 38 38);background:rgb(254 242 242);color:rgb(185 28 28)}button:disabled{cursor:not-allowed;opacity:.5}.state{border:1px dashed rgb(203 213 225);border-radius:.625rem;background:white;padding:2rem;color:rgb(100 116 139);text-align:center}.state p{margin:0}.state .secondary-button{margin-top:.75rem}.state-error{border-style:solid;border-color:rgb(254 202 202);color:rgb(185 28 28)}.load-more-error{margin-top:1rem;padding:1rem}@media(max-width:900px){.layout{grid-template-columns:1fr}.create-panel{position:static}}@media(max-width:650px){.page-header,.queue-head,.task-head,.review-bar,.reassign-bar{flex-direction:column}.compact{width:100%}}.dark .admin-maintenance-page{background:rgb(2 6 23)}.dark .create-panel,.dark .queue-panel,.dark .field-control,.dark .secondary-button,.dark .icon-button,.dark .state{border-color:rgb(51 65 85);background:rgb(15 23 42);color:rgb(203 213 225)}.dark .page-header h1,.dark .create-panel h2,.dark .queue-head h2,.dark .task-head h3{color:rgb(248 250 252)}.dark .page-header span,.dark .queue-head p,.dark .task-row p,.dark .task-row small{color:rgb(148 163 184)}.dark .task-row{border-color:rgb(51 65 85)}
</style>
