<template>
  <div class="health-page min-h-screen">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <header class="page-header">
        <div>
          <p>社区健康</p>
          <h1>频道维护概览</h1>
          <span>查看公开内容的维护积压和可信覆盖。指标仅用于排查与协调，不参与排名或自动处罚。</span>
        </div>
        <button type="button" class="icon-button" title="刷新频道健康度" :disabled="loading" @click="load">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
        </button>
      </header>

      <div v-if="errorText" class="state state-error">{{ errorText }}</div>
      <div v-else-if="loading" class="state">正在读取频道健康数据</div>
      <section v-else class="health-grid">
        <article v-for="item in items" :key="item.domain" class="health-row">
          <div class="row-title">
            <div>
              <div class="title-line">
                <h2>{{ item.domainName }}</h2>
                <span :class="['status', item.healthStatus === 'STABLE' ? 'status-stable' : 'status-attention']">
                  {{ item.healthStatus === 'STABLE' ? '稳定' : item.healthStatus === 'DEGRADED' ? '部分不可用' : '需要关注' }}
                </span>
              </div>
              <p>{{ item.publicPostCount }} 篇公开内容 · {{ item.trustProfileCount }} 篇已补充经验背景</p>
            </div>
            <strong>{{ item.trustProfileCoveragePercent }}%</strong>
          </div>
          <div class="metric-grid">
            <div><span>经验背景覆盖</span><strong>{{ item.trustProfileCoveragePercent }}%</strong></div>
            <div><span>待确认时效</span><strong>{{ item.freshnessAwaitingConfirmation }}</strong></div>
            <div><span>待处理建议</span><strong>{{ item.pendingSuggestions }}</strong></div>
            <div><span>未闭环问题</span><strong>{{ item.unresolvedQuestions }}</strong></div>
            <div><span>开放内容需求</span><strong>{{ item.openContentNeeds }}</strong></div>
            <div>
              <span>内容改进线索</span>
              <strong>{{ item.qualitySignalAvailable ? (item.qualityReviewPostCount ?? 0) : '—' }}</strong>
              <small v-if="!item.qualitySignalAvailable">匿名质量信号暂不可用</small>
            </div>
          </div>
          <p v-if="item.attentionReasons.length" class="reason">{{ item.attentionReasons.join('；') }}</p>
          <p v-else class="reason reason-stable">当前未发现需要集中协调的维护积压。</p>
        </article>
        <div v-if="items.length === 0" class="state">当前治理范围没有可展示的频道数据。</div>
      </section>

      <ChannelHealthCandidatePanel
        :refresh-key="channelHealthRefreshKey"
        :channels="items"
        :can-create-globally="canCreateMaintenanceGlobally"
        :moderated-domains="moderatedMaintenanceDomains"
        @batch-created="handleBatchCreated"
      />

      <ChannelHealthRiskCaseWorkspace
        :refresh-key="riskCaseRefreshKey"
        :channels="items"
        :can-create-globally="canCreateMaintenanceGlobally"
        :moderated-domains="moderatedMaintenanceDomains"
        @open-batch-coordination="handleOpenBatchCoordination"
      />

      <ChannelHealthReviewBatchPanel
        ref="reviewBatchPanel"
        :refresh-key="batchRefreshKey"
        :channels="items"
        :can-create-globally="canCreateMaintenanceGlobally"
        :moderated-domains="moderatedMaintenanceDomains"
        @batch-coordinated="handleBatchCoordinated"
      />

      <section class="projection-workspace">
        <ProjectionHealthTable
          :can-inspect="canInspectProjections"
          :permission-loading="projectionPermissionLoading"
          :permission-error="projectionPermissionError"
          :refresh-key="projectionRefreshKey"
          :can-create-maintenance-globally="canCreateMaintenanceGlobally"
          :moderated-domains="moderatedMaintenanceDomains"
          @select="selectedProjection = $event"
        />
        <ReconciliationRunPanel
          :projection="selectedProjection"
          :can-operate="canInspectProjections"
          :permission-loading="projectionPermissionLoading"
          :permission-error="projectionPermissionError"
          @reconciled="projectionRefreshKey += 1"
        />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { getErrorMessage } from '@/api/client'
import { channelHealthApi, type ChannelHealth } from '@/api/channelHealth'
import { opsApi, type MyAdminPermissions } from '@/api/ops'
import type { ProjectionHealth } from '@/api/projectionHealth'
import type { ApiId } from '@/api/types'
import ProjectionHealthTable from '@/components/health/ProjectionHealthTable.vue'
import ReconciliationRunPanel from '@/components/health/ReconciliationRunPanel.vue'
import ChannelHealthCandidatePanel from '@/components/health/ChannelHealthCandidatePanel.vue'
import ChannelHealthRiskCaseWorkspace from '@/components/health/ChannelHealthRiskCaseWorkspace.vue'
import ChannelHealthReviewBatchPanel from '@/components/health/ChannelHealthReviewBatchPanel.vue'

type ChannelHealthReviewBatchPanelExposed = {
  openBatch: (batchId: ApiId) => Promise<void>
}

const items = ref<ChannelHealth[]>([])
const loading = ref(false)
const errorText = ref('')
const projectionPermissions = ref<MyAdminPermissions | null>(null)
const projectionPermissionLoading = ref(false)
const projectionPermissionError = ref('')
const selectedProjection = ref<ProjectionHealth | null>(null)
const projectionRefreshKey = ref(0)
const channelHealthRefreshKey = ref(0)
const batchRefreshKey = ref(0)
const riskCaseRefreshKey = ref(0)
const reviewBatchPanel = ref<ChannelHealthReviewBatchPanelExposed | null>(null)
const canInspectProjections = computed(() => Boolean(
  projectionPermissions.value?.admin
  || projectionPermissions.value?.ops
  || projectionPermissions.value?.localOpen,
))
const canCreateMaintenanceGlobally = computed(() => Boolean(
  projectionPermissions.value?.admin
  || projectionPermissions.value?.contentModerator
  || projectionPermissions.value?.localOpen,
))
const moderatedMaintenanceDomains = computed(() => {
  if (!projectionPermissions.value?.domainModerator) return []
  return (projectionPermissions.value.moderatedDomains || [])
    .filter((domain) => Number.isInteger(domain) && domain >= 1 && domain <= 5)
})

const handleBatchCreated = () => {
  batchRefreshKey.value += 1
}

const handleBatchCoordinated = () => {
  batchRefreshKey.value += 1
  riskCaseRefreshKey.value += 1
}

const handleOpenBatchCoordination = async (batchId: ApiId) => {
  await reviewBatchPanel.value?.openBatch(batchId)
}

const load = async () => {
  loading.value = true
  errorText.value = ''
  try {
    const res = await channelHealthApi.list()
    items.value = res.data || []
    channelHealthRefreshKey.value += 1
    batchRefreshKey.value += 1
    riskCaseRefreshKey.value += 1
  } catch (error) {
    errorText.value = getErrorMessage(error, '频道健康数据暂时无法读取')
  } finally {
    loading.value = false
  }
}

const loadProjectionPermissions = async () => {
  projectionPermissionLoading.value = true
  projectionPermissionError.value = ''
  try {
    const response = await opsApi.myPermissions({ skipAuthRedirect: true })
    projectionPermissions.value = response.data
  } catch (error) {
    projectionPermissions.value = null
    projectionPermissionError.value = getErrorMessage(error, '投影诊断权限暂时无法确认')
  } finally {
    projectionPermissionLoading.value = false
  }
}

onMounted(() => {
  void Promise.all([load(), loadProjectionPermissions()])
})
</script>

<style scoped>
.health-page { background: rgb(248 250 252); }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
.page-header p { margin: 0; color: rgb(8 145 178); font-size: .75rem; font-weight: 800; }
.page-header h1 { margin: .25rem 0; color: rgb(15 23 42); font-size: 1.5rem; font-weight: 900; }
.page-header span { display: block; max-width: 58rem; color: rgb(100 116 139); font-size: .875rem; line-height: 1.6; }
.icon-button { display: inline-flex; height: 2.5rem; width: 2.5rem; flex: none; align-items: center; justify-content: center; border: 1px solid rgb(203 213 225); border-radius: .5rem; background: white; color: rgb(51 65 85); }
.health-grid { display: grid; gap: 1rem; }
.health-row { border: 1px solid rgb(226 232 240); border-radius: .625rem; background: white; padding: 1.15rem; }
.row-title { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.title-line { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.title-line h2 { margin: 0; color: rgb(15 23 42); font-size: 1rem; font-weight: 900; }
.row-title p, .reason { margin: .35rem 0 0; color: rgb(100 116 139); font-size: .78rem; line-height: 1.55; }
.row-title > strong { color: rgb(8 145 178); font-size: 1.5rem; font-weight: 900; }
.status { border-radius: 999px; padding: .2rem .55rem; font-size: .68rem; font-weight: 900; }
.status-stable { background: rgb(220 252 231); color: rgb(21 128 61); }
.status-attention { background: rgb(254 243 199); color: rgb(146 64 14); }
.metric-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .65rem; margin-top: 1rem; }
.metric-grid div { min-width: 0; border: 1px solid rgb(226 232 240); border-radius: .5rem; background: rgb(248 250 252); padding: .7rem; }
.metric-grid span { display: block; color: rgb(100 116 139); font-size: .7rem; font-weight: 700; }
.metric-grid strong { display: block; margin-top: .3rem; color: rgb(15 23 42); font-size: 1.2rem; font-weight: 900; }
.metric-grid small { display: block; margin-top: .25rem; color: rgb(100 116 139); font-size: .68rem; line-height: 1.35; }
.reason { border-top: 1px solid rgb(241 245 249); padding-top: .75rem; }
.reason-stable { color: rgb(21 128 61); }
.row-actions { display: flex; justify-content: flex-end; margin-top: .75rem; }
.create-task-link { display: inline-flex; min-height: 36px; align-items: center; justify-content: center; border: 1px solid rgb(8 145 178); border-radius: .5rem; padding: .45rem .7rem; color: rgb(8 145 178); font-size: .75rem; font-weight: 900; }
.state { border: 1px dashed rgb(203 213 225); border-radius: .625rem; background: white; padding: 2rem; color: rgb(100 116 139); text-align: center; }
.state-error { border-style: solid; border-color: rgb(254 202 202); color: rgb(185 28 28); }
.projection-workspace { display: grid; gap: 1rem; margin-top: 1rem; }
@media (max-width: 800px) { .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.dark .health-page { background: rgb(2 6 23); }
.dark .page-header h1, .dark .title-line h2, .dark .metric-grid strong { color: rgb(248 250 252); }
.dark .page-header span, .dark .row-title p, .dark .reason, .dark .metric-grid span, .dark .metric-grid small { color: rgb(148 163 184); }
.dark .icon-button, .dark .health-row, .dark .state { border-color: rgb(51 65 85); background: rgb(15 23 42); color: rgb(203 213 225); }
.dark .metric-grid div { border-color: rgb(51 65 85); background: rgb(2 6 23 / .6); }
.dark .reason { border-color: rgb(30 41 59); }
</style>
