<template>
  <div class="operations-page min-h-screen">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <section class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-sm font-black text-cyan-700 dark:text-cyan-300">社区运营编排</p>
          <h1 class="mt-2 text-2xl font-black text-slate-950 dark:text-white">运营整理入口</h1>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            组织公开可见内容、精选池、运营位和专题/活动草稿。后端能力不可用时只展示不可用或降级视图，不提供本地假发布。
          </p>
        </div>
        <button type="button" class="secondary-button" :disabled="isLoading" @click="refreshAll">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
          刷新
        </button>
      </section>

      <section v-if="loadError" class="notice notice-warn mb-6">{{ loadError }}</section>
      <section v-if="!canEnter" class="notice notice-warn mb-6">
        当前账号不能进入运营编排后台。路由已要求管理员权限，本页也会在本地关闭操作入口。
      </section>

      <section class="operations-metric-grid mb-6 grid gap-4 md:grid-cols-4">
        <article class="metric-card">
          <span>候选池</span>
          <strong>{{ candidates.items.length }}</strong>
          <small>{{ sourceLabel(candidates) }}</small>
        </article>
        <article class="metric-card">
          <span>精选池</span>
          <strong>{{ curationPool.items.length }}</strong>
          <small>{{ sourceLabel(curationPool) }}</small>
        </article>
        <article class="metric-card">
          <span>运营位</span>
          <strong>{{ slots.items.length }}</strong>
          <small>{{ sourceLabel(slots) }}</small>
        </article>
        <article class="metric-card">
          <span>专题/活动草稿</span>
          <strong>{{ topics.items.length }}</strong>
          <small>{{ sourceLabel(topics) }}</small>
        </article>
      </section>

      <section class="notice mb-6">
        <ShieldCheck class="h-5 w-5 shrink-0 text-emerald-600" />
        <div>
          <strong>边界说明</strong>
          <p>运营入口只消费公开、合规、当前可见的社区内容。前台会明确展示为运营整理，不伪装成自然推荐，也不提供商业化分发能力。</p>
        </div>
      </section>

      <section class="tabs mb-6">
        <button v-for="tab in tabs" :key="tab.key" type="button" :class="['tab-button', activeTab === tab.key ? 'tab-active' : '']" @click="activeTab = tab.key">
          <component :is="tab.icon" class="h-4 w-4" />
          {{ tab.label }}
        </button>
      </section>

      <section v-if="activeTab === 'overview'" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <article class="panel">
          <div class="panel-head">
            <div>
              <h2>状态流转</h2>
              <p>覆盖草稿、预览、发布、下线、回滚。发布类操作需要管理员和运营权限，并通过风险确认。</p>
            </div>
          </div>
          <div class="status-flow">
            <div v-for="item in statusFlow" :key="item.status" class="status-flow-item">
              <span :class="['status-pill', statusClass(item.status)]">{{ item.label }}</span>
              <strong>{{ item.title }}</strong>
              <p>{{ item.description }}</p>
            </div>
          </div>
        </article>

        <aside class="panel">
          <h2>能力接入</h2>
          <div class="capability-list">
            <div v-for="item in capabilityCards" :key="item.label" class="capability-row">
              <span :class="['status-dot', item.available ? 'status-dot-ok' : 'status-dot-warn']" />
              <div>
                <strong>{{ item.label }}</strong>
                <p>{{ item.text }}</p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section v-else-if="activeTab === 'candidates'" class="panel">
        <div class="panel-head">
          <div>
            <h2>运营候选池</h2>
            <p>{{ candidates.degraded ? '当前为公开内容查询降级视图，不能直接加入正式运营位。' : '来自运营候选接口，可进入精选池或专题编排。' }}</p>
          </div>
          <span :class="['status-pill', candidates.available ? 'status-ok' : 'status-warn']">{{ sourceLabel(candidates) }}</span>
        </div>
        <div v-if="candidates.items.length" class="content-grid">
          <article v-for="item in candidates.items" :key="String(item.id)" class="content-card">
            <span class="meta-chip">{{ item.sourceType }}</span>
            <h3>{{ item.title }}</h3>
            <p>{{ item.summary || item.reason || '暂无摘要' }}</p>
            <div class="card-footer">
              <span>{{ item.governanceState || 'eligible' }}</span>
              <RouterLink v-if="item.href" :to="item.href">查看</RouterLink>
            </div>
          </article>
        </div>
        <div v-else class="empty-panel">暂无可运营候选；接口未接通时页面不会生成本地候选。</div>
      </section>

      <section v-else-if="activeTab === 'curation'" class="panel">
        <div class="panel-head">
          <div>
            <h2>精选池</h2>
            <p>{{ curationPool.degraded ? '当前复用既有公开精选作为只读降级视图。' : '维护精选池条目、排序、状态和备注。' }}</p>
          </div>
          <span :class="['status-pill', curationPool.available ? 'status-ok' : 'status-warn']">{{ sourceLabel(curationPool) }}</span>
        </div>
        <div v-if="curationPool.items.length" class="table-shell">
          <table class="data-table">
            <thead>
              <tr><th>内容</th><th>来源</th><th>状态</th><th>排序</th><th>备注</th></tr>
            </thead>
            <tbody>
              <tr v-for="item in curationPool.items" :key="String(item.id)">
                <td><RouterLink v-if="item.href" :to="item.href">{{ item.title }}</RouterLink><span v-else>{{ item.title }}</span></td>
                <td>{{ item.sourceType }} {{ item.sourceId }}</td>
                <td><span :class="['status-pill', statusClass(item.status)]">{{ statusLabel(item.status) }}</span></td>
                <td>{{ item.sortOrder ?? '--' }}</td>
                <td>{{ item.note || (item.fallback ? '降级只读' : '--') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-panel">暂无精选池条目；未接通后端时不提供本地维护表单。</div>
      </section>

      <section v-else-if="activeTab === 'slots'" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <article class="panel">
          <div class="panel-head">
            <div>
              <h2>运营位</h2>
              <p>P0 只支持少量社区运营入口，前台组件保留稳定尺寸、空状态和降级状态。</p>
            </div>
            <span :class="['status-pill', slots.available ? 'status-ok' : 'status-warn']">{{ sourceLabel(slots) }}</span>
          </div>
          <div v-if="slots.items.length" class="slot-list">
            <article v-for="slot in slots.items" :key="String(slot.id)" class="row-card">
              <div class="row-main">
                <span :class="['status-pill', statusClass(slot.status)]">{{ statusLabel(slot.status) }}</span>
                <h3>{{ slot.title }}</h3>
                <p>{{ slot.description || slot.explanation || '暂无说明' }}</p>
                <small>{{ slot.slotCode }} · {{ slot.items.length }} 个条目</small>
              </div>
            </article>
          </div>
          <div v-else class="empty-panel">运营位接口未接通或暂无配置；不会在后台伪造可发布配置。</div>
        </article>

        <aside class="panel">
          <h2>前台展示约束</h2>
          <ul class="constraint-list">
            <li>固定高度，条目数变化不会撑乱首页布局。</li>
            <li>接口失败时展示降级或空状态。</li>
            <li>明确标识运营整理、示例/fallback 来源。</li>
            <li>不绕过治理过滤和用户反馈边界。</li>
          </ul>
        </aside>
      </section>

      <section v-else-if="activeTab === 'topics'" class="panel">
        <div class="panel-head">
          <div>
            <h2>专题/活动草稿</h2>
            <p>支持预览、发布、下线和回滚。发布、下线、回滚需要管理员与运营权限。</p>
          </div>
          <span :class="['status-pill', topics.available ? 'status-ok' : 'status-warn']">{{ sourceLabel(topics) }}</span>
        </div>
        <div v-if="topics.items.length" class="slot-list">
          <article v-for="topic in topics.items" :key="String(topic.id)" class="row-card">
            <div class="row-main">
              <span :class="['status-pill', statusClass(topic.status)]">{{ statusLabel(topic.status) }}</span>
              <h3>{{ topic.title }}</h3>
              <p>{{ topic.summary || '暂无说明' }}</p>
              <small>{{ topic.activityType || 'TOPIC' }} · {{ topic.itemCount ?? 0 }} 个内容区块</small>
            </div>
            <div class="action-row">
              <button type="button" class="icon-button" :disabled="isActing || !topics.available" title="预览" @click="runLifecycleAction('topic', topic.id, 'preview')">
                <Eye class="h-4 w-4" />
              </button>
              <button type="button" class="icon-button" :disabled="isActing || !canMutate('publish')" title="发布" @click="runLifecycleAction('topic', topic.id, 'publish')">
                <UploadCloud class="h-4 w-4" />
              </button>
              <button type="button" class="icon-button" :disabled="isActing || !canMutate('offline')" title="下线" @click="runLifecycleAction('topic', topic.id, 'offline')">
                <Archive class="h-4 w-4" />
              </button>
              <button type="button" class="icon-button" :disabled="isActing || !canMutate('rollback')" title="回滚" @click="runLifecycleAction('topic', topic.id, 'rollback')">
                <RotateCcw class="h-4 w-4" />
              </button>
            </div>
          </article>
        </div>
        <div v-else class="empty-panel">暂无专题/活动草稿；未接通后端时不提供看似可配置的假后台。</div>
      </section>

      <section v-else class="panel">
        <div class="panel-head">
          <div>
            <h2>审计留痕</h2>
            <p>展示运营编排最近的管理动作，便于追溯内容进入入口的来源。</p>
          </div>
          <span :class="['status-pill', auditLogs.available ? 'status-ok' : 'status-warn']">{{ sourceLabel(auditLogs) }}</span>
        </div>
        <div v-if="auditLogs.items.length" class="table-shell">
          <table class="data-table">
            <thead>
              <tr><th>动作</th><th>资源</th><th>操作人</th><th>备注</th><th>时间</th></tr>
            </thead>
            <tbody>
              <tr v-for="item in auditLogs.items" :key="String(item.id)">
                <td>{{ item.action }}</td>
                <td>{{ item.resourceType }} {{ item.resourceId || '' }}</td>
                <td>{{ item.operatorUid || '--' }}</td>
                <td>{{ item.remark || '--' }}</td>
                <td>{{ item.createTime || '--' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-panel">暂无可展示审计记录；审计接口不可用时关闭为只读空态。</div>
      </section>
    </main>

    <RiskConfirmDialog
      :state="riskConfirmState"
      @confirm="resolveRiskConfirm"
      @cancel="cancelRiskConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Archive, Eye, RefreshCw, RotateCcw, ShieldCheck, UploadCloud } from 'lucide-vue-next'
import AppHeader from '@/components/layout/AppHeader.vue'
import RiskConfirmDialog from '@/components/admin/RiskConfirmDialog.vue'
import { useRiskConfirm, type RiskConfirmRequest } from '@/composables/useRiskConfirm'
import { opsApi, type MyAdminPermissions } from '@/api/ops'
import {
  operationsApi,
  type CurationPoolItem,
  type OperationAction,
  type OperationAuditLog,
  type OperationCandidate,
  type OperationCapability,
  type OperationResourceKind,
  type OperationSlot,
  type OperationStatus,
  type OperationTopic,
} from '@/api/operations'
import { canAccessOpsOrchestrationAdmin, canMutateOpsOrchestration, type OpsOrchestrationAction, type OpsOrchestrationPermissions } from '@/utils/opsOrchestrationGuard'

const emptyCapability = <T,>(): OperationCapability<T> => ({
  available: false,
  source: 'unavailable',
  degraded: true,
  items: [],
})

const tabs = [
  { key: 'overview', label: '总览', icon: ShieldCheck },
  { key: 'candidates', label: '候选池', icon: Eye },
  { key: 'curation', label: '精选池', icon: UploadCloud },
  { key: 'slots', label: '运营位', icon: Archive },
  { key: 'topics', label: '专题活动', icon: RotateCcw },
  { key: 'audit', label: '审计', icon: ShieldCheck },
] as const

const statusFlow = [
  { status: 'DRAFT', label: '草稿', title: '编辑中', description: '只能在后台查看，不进入前台展示。' },
  { status: 'PREVIEW', label: '预览', title: '上线前检查', description: '用于运营和治理人员确认内容边界。' },
  { status: 'PUBLISHED', label: '发布', title: '前台可见', description: '只展示公开、合规、仍然可见的条目。' },
  { status: 'OFFLINE', label: '下线', title: '停止展示', description: '配置保留，前台不再读取。' },
  { status: 'ROLLBACK', label: '回滚', title: '恢复快照', description: '从已发布快照恢复到上一个稳定版本。' },
]

const activeTab = ref<(typeof tabs)[number]['key']>('overview')
const isLoading = ref(false)
const isActing = ref(false)
const loadError = ref('')
const permissions = ref<MyAdminPermissions | null>(null)
const candidates = ref<OperationCapability<OperationCandidate>>(emptyCapability())
const curationPool = ref<OperationCapability<CurationPoolItem>>(emptyCapability())
const slots = ref<OperationCapability<OperationSlot>>(emptyCapability())
const topics = ref<OperationCapability<OperationTopic>>(emptyCapability())
const auditLogs = ref<OperationCapability<OperationAuditLog>>(emptyCapability())
const { riskConfirmState, confirmRisk, resolveRiskConfirm, cancelRiskConfirm } = useRiskConfirm()

const opsPermissions = computed(() => permissions.value as OpsOrchestrationPermissions | null)
const canEnter = computed(() => canAccessOpsOrchestrationAdmin(permissions.value))
const capabilityCards = computed(() => [
  { label: '候选池', available: candidates.value.available, text: sourceLabel(candidates.value) },
  { label: '精选池', available: curationPool.value.available, text: sourceLabel(curationPool.value) },
  { label: '运营位', available: slots.value.available, text: sourceLabel(slots.value) },
  { label: '专题/活动', available: topics.value.available, text: sourceLabel(topics.value) },
  { label: '审计', available: auditLogs.value.available, text: sourceLabel(auditLogs.value) },
])

function sourceLabel<T>(value: OperationCapability<T>) {
  if (value.source === 'remote') return '后端已接入'
  if (value.source === 'public-content-query') return '公开内容降级'
  if (value.source === 'legacy-featured') return '既有精选降级'
  if (value.source === 'fallback-demo') return '示例/fallback'
  return value.fallbackReason || '能力未接入'
}

function statusLabel(status?: OperationStatus) {
  const map: Record<string, string> = {
    DRAFT: '草稿',
    PREVIEW: '预览',
    PUBLISHED: '已发布',
    OFFLINE: '已下线',
    ACTIVE: '启用',
    PAUSED: '暂停',
    HIDDEN: '隐藏',
  }
  return map[String(status || '').toUpperCase()] || status || '--'
}

function statusClass(status?: OperationStatus) {
  const value = String(status || '').toUpperCase()
  if (value === 'PUBLISHED' || value === 'ACTIVE') return 'status-ok'
  if (value === 'PREVIEW') return 'status-info'
  if (value === 'OFFLINE' || value === 'PAUSED' || value === 'HIDDEN') return 'status-warn'
  return 'status-muted'
}

const refreshAll = async () => {
  isLoading.value = true
  loadError.value = ''
  try {
    const [permissionRes, candidateRes, curationRes, slotRes, topicRes, auditRes] = await Promise.allSettled([
      opsApi.myPermissions({ skipAuthRedirect: true }),
      operationsApi.listOperationCandidates({ limit: 20 }),
      operationsApi.listCurationPool({ limit: 20 }),
      operationsApi.listOperationSlots(),
      operationsApi.listOperationTopics(),
      operationsApi.listOperationAudit({ limit: 20 }),
    ])
    if (permissionRes.status === 'fulfilled') permissions.value = permissionRes.value.data
    if (candidateRes.status === 'fulfilled') candidates.value = candidateRes.value.data || emptyCapability()
    if (curationRes.status === 'fulfilled') curationPool.value = curationRes.value.data || emptyCapability()
    if (slotRes.status === 'fulfilled') slots.value = slotRes.value.data || emptyCapability()
    if (topicRes.status === 'fulfilled') topics.value = topicRes.value.data || emptyCapability()
    if (auditRes.status === 'fulfilled') auditLogs.value = auditRes.value.data || emptyCapability()
    const rejected = [candidateRes, curationRes, slotRes, topicRes, auditRes].find((item) => item.status === 'rejected')
    if (rejected?.status === 'rejected') loadError.value = rejected.reason instanceof Error ? rejected.reason.message : '运营编排能力读取失败'
  } finally {
    isLoading.value = false
  }
}

const canMutate = (action: OpsOrchestrationAction) => canMutateOpsOrchestration(opsPermissions.value, action)

const actionLabel = (action: OperationAction) => {
  const labels: Record<OperationAction, string> = {
    preview: '预览',
    publish: '发布',
    offline: '下线',
    rollback: '回滚',
  }
  return labels[action]
}

const requireRiskConfirm = (request: RiskConfirmRequest) => confirmRisk(request)

const runLifecycleAction = async (resourceKind: OperationResourceKind, resourceId: string | number, action: OperationAction) => {
  if (isActing.value) return
  if (action !== 'preview' && !canMutateOpsOrchestration(opsPermissions.value, action as OpsOrchestrationAction)) {
    loadError.value = '当前账号缺少运营编排变更权限'
    return
  }
  const note = await requireRiskConfirm({
    title: `${actionLabel(action)}专题/活动`,
    level: action === 'preview' ? 'medium' : 'critical',
    reversible: action !== 'publish',
    impactCount: 1,
    objects: [`${resourceKind}:${resourceId}`],
    context: ['改变专题/活动在前台的展示状态', '写入后台审计日志'],
    confirmText: actionLabel(action),
    requireNote: action !== 'preview',
    notePlaceholder: '记录本次运营编排操作原因',
    confirmationPhrase: action === 'preview' ? undefined : 'CONFIRM',
  })
  if (note === null) return
  isActing.value = true
  try {
    await operationsApi.runLifecycleAction(resourceKind, resourceId, action, note, opsPermissions.value)
    await refreshAll()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '生命周期操作失败'
  } finally {
    isActing.value = false
  }
}

onMounted(refreshAll)
</script>

<style scoped>
.operations-page {
  background: rgb(248 250 252);
}

.metric-card,
.panel {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  box-shadow: 0 14px 32px rgb(15 23 42 / 0.04);
}

.metric-card {
  padding: 1rem;
}

.metric-card span,
.metric-card small {
  display: block;
  color: rgb(100 116 139);
}

.metric-card strong {
  display: block;
  margin: 0.3rem 0;
  font-size: 1.8rem;
  color: rgb(15 23 42);
}

.panel {
  padding: 1rem;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.panel h2,
.row-card h3,
.content-card h3 {
  font-weight: 900;
  color: rgb(15 23 42);
}

.panel p,
.row-card p,
.content-card p,
.constraint-list {
  color: rgb(71 85 105);
  line-height: 1.6;
}

.notice {
  display: flex;
  gap: 0.75rem;
  border: 1px solid rgb(187 247 208);
  border-radius: 0.75rem;
  background: rgb(240 253 244);
  padding: 1rem;
  color: rgb(22 101 52);
}

.notice-warn {
  border-color: rgb(253 230 138);
  background: rgb(255 251 235);
  color: rgb(146 64 14);
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tab-button,
.secondary-button,
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.625rem;
  background: white;
  color: rgb(15 23 42);
  font-weight: 800;
}

.tab-button,
.secondary-button {
  padding: 0.55rem 0.8rem;
}

.tab-active {
  border-color: rgb(14 165 233);
  background: rgb(240 249 255);
  color: rgb(3 105 161);
}

.icon-button {
  width: 2.2rem;
  height: 2.2rem;
}

.icon-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.status-flow,
.capability-list,
.slot-list {
  display: grid;
  gap: 0.75rem;
}

.status-flow {
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
}

.status-flow-item,
.capability-row,
.row-card,
.content-card,
.empty-panel {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.9rem;
}

.capability-row,
.row-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.row-main {
  min-width: 0;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 0.75rem;
}

.card-footer,
.action-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.card-footer {
  justify-content: space-between;
}

.meta-chip,
.status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 900;
}

.meta-chip,
.status-muted {
  background: rgb(241 245 249);
  color: rgb(71 85 105);
}

.status-ok {
  background: rgb(220 252 231);
  color: rgb(22 101 52);
}

.status-info {
  background: rgb(224 242 254);
  color: rgb(3 105 161);
}

.status-warn {
  background: rgb(254 243 199);
  color: rgb(146 64 14);
}

.status-dot {
  margin-top: 0.35rem;
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 999px;
  background: rgb(245 158 11);
}

.status-dot-ok {
  background: rgb(16 185 129);
}

.status-dot-warn {
  background: rgb(245 158 11);
}

.table-shell {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 46rem;
}

.data-table th,
.data-table td {
  border-bottom: 1px solid rgb(226 232 240);
  padding: 0.65rem;
  text-align: left;
  vertical-align: top;
}

.data-table th {
  color: rgb(71 85 105);
  font-size: 0.8rem;
}

.constraint-list {
  padding-left: 1rem;
}

@media (max-width: 760px) {
  .capability-row,
  .row-card,
  .panel-head {
    flex-direction: column;
  }
}
</style>
