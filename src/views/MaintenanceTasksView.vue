<template>
  <div class="maintenance-page min-h-screen">
    <AppHeader />
    <main class="mx-auto max-w-5xl px-4 py-8">
      <header class="page-header">
        <div>
          <p>内容维护</p>
          <h1>我的维护任务</h1>
          <span>领取后提交公开内容交付，审核通过才会完成；这里不把维护行为换算成排名或积分。</span>
        </div>
        <button type="button" class="icon-button" title="刷新维护任务" :disabled="loading" @click="load()">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
        </button>
      </header>

      <div class="filter-bar">
        <select v-model="status" class="field-control" aria-label="按状态筛选维护任务" @change="changeStatus">
          <option value="">全部状态</option>
          <option v-for="item in statuses" :key="item" :value="item">{{ statusLabel(item) }}</option>
        </select>
      </div>

      <div v-if="errorText" class="state state-error">{{ errorText }}</div>
      <div v-else-if="loading" class="state">正在读取维护任务</div>
      <div v-else-if="items.length === 0" class="state">当前没有分配给你的维护任务。</div>
      <section v-else class="task-list">
        <article v-for="task in items" :key="String(task.id)" class="task-row">
          <div class="task-head">
            <div>
              <div class="badge-line">
                <span :class="['status', statusClass(task.status)]">{{ statusLabel(task.status) }}</span>
                <span class="source">{{ sourceLabel(task.sourceType) }}</span>
              </div>
              <h2>{{ task.title }}</h2>
            </div>
            <RouterLink v-if="task.sourcePostId" :to="`/post/${task.sourcePostId}`" class="open-link">查看原内容</RouterLink>
          </div>
          <p class="detail">{{ task.detail }}</p>
          <p class="meta">领域 {{ task.domain }} · 任务 #{{ task.id }} · 更新于 {{ formatTime(task.updateTime) }}</p>
          <p v-if="task.reviewNote" class="note">治理说明：{{ task.reviewNote }}</p>
          <p v-if="task.deliveryNote" class="note">交付说明：{{ task.deliveryNote }}</p>

          <div v-if="task.canClaim" class="action-row">
            <button type="button" class="primary-button" :disabled="busy" @click="claim(task)">领取任务</button>
          </div>

          <form v-if="task.canSubmit" class="submit-form" @submit.prevent="submit(task)">
            <CollaborationDeliverySelector
              class="maintenance-delivery-selector"
              :model-value="selectedDeliveryCandidate(task)"
              :candidates="deliveryCandidates(task)"
              :preferred-candidate-id="suggestedDelivery(task)?.deliveryRefId"
              title="选择维护交付资源"
              description="关联资源会排在首位；提交时服务端仍会校验归属、公开状态和领域。"
              empty-description="当前任务没有可直接带入的关联资源，可在下方手动填写已发布资源 ID。"
              :show-filters="false"
              :show-create-action="false"
              @select="applyDeliveryCandidate(task, $event)"
            />
            <details class="manual-delivery-fallback" :open="!suggestedDelivery(task)">
              <summary>关联资源不适用时手动填写</summary>
              <div class="manual-delivery-fields">
                <select v-model="draft(task).deliveryType" class="field-control">
                  <option value="POST">公开帖子</option>
                  <option value="QUESTION">公开问题</option>
                  <option value="SERIES">协作合集</option>
                </select>
                <input v-model.trim="draft(task).deliveryRefId" class="field-control" inputmode="numeric" placeholder="交付对象 ID">
              </div>
            </details>
            <textarea v-model.trim="draft(task).note" class="field-control note-input" rows="2" maxlength="1000" placeholder="说明本次更新解决了什么、还有哪些边界。" />
            <button type="submit" class="primary-button" :disabled="busy || !canSubmit(task)">提交治理审核</button>
          </form>
        </article>
      </section>
      <div v-if="hasMore && !loading" class="load-more-row">
        <button type="button" class="secondary-button" :disabled="loadingMore" @click="load(true)">
          {{ loadingMore ? '正在加载' : '加载更多' }}
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RefreshCw } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import AppHeader from '@/components/layout/AppHeader.vue'
import CollaborationDeliverySelector from '@/components/collaboration/CollaborationDeliverySelector.vue'
import type { NeedDeliveryCandidate } from '@/api/collaboration'
import { getErrorMessage } from '@/api/client'
import {
  contentMaintenanceApi,
  type ContentMaintenanceTask,
  type MaintenanceDeliveryType,
  type MaintenanceStatus,
} from '@/api/contentMaintenance'

const route = useRoute()
const router = useRouter()
const statuses: MaintenanceStatus[] = ['OPEN', 'CLAIMED', 'SUBMITTED', 'COMPLETED', 'CLOSED']
const statusSet = new Set(statuses)
const firstQueryValue = (value: unknown) => Array.isArray(value) ? value[0] : value
const readRouteStatus = () => {
  const value = String(firstQueryValue(route.query.status) || '').toUpperCase() as MaintenanceStatus
  return statusSet.has(value) ? value : ''
}
const status = ref<MaintenanceStatus | ''>(readRouteStatus())
const items = ref<ContentMaintenanceTask[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const errorText = ref('')
const busy = ref(false)
const nextCursor = ref<string | null>(null)
const hasMore = ref(false)
const drafts = reactive<Record<string, { deliveryType: MaintenanceDeliveryType; deliveryRefId: string; note: string }>>({})

const suggestedDelivery = (task: ContentMaintenanceTask) => {
  if (task.sourcePostId) {
    return {
      deliveryType: task.sourceType === 'QUESTION' ? 'QUESTION' as const : 'POST' as const,
      deliveryRefId: String(task.sourcePostId),
    }
  }
  if (task.sourceType === 'QUESTION' && task.sourceRefId) {
    return { deliveryType: 'QUESTION' as const, deliveryRefId: String(task.sourceRefId) }
  }
  return null
}
const draft = (task: ContentMaintenanceTask) => {
  const suggestion = suggestedDelivery(task)
  return drafts[String(task.id)] ||= {
    deliveryType: suggestion?.deliveryType || 'POST',
    deliveryRefId: suggestion?.deliveryRefId || '',
    note: '',
  }
}
const deliveryCandidates = (task: ContentMaintenanceTask): NeedDeliveryCandidate[] => {
  const candidates: NeedDeliveryCandidate[] = []
  const suggestion = suggestedDelivery(task)
  if (suggestion) {
    candidates.push({
      id: suggestion.deliveryRefId,
      resolutionType: suggestion.deliveryType,
      title: `${task.title}（关联资源）`,
      domain: task.domain,
      publicPath: `/post/${encodeURIComponent(suggestion.deliveryRefId)}`,
      eligible: true,
      createTime: task.createTime,
      updateTime: task.updateTime,
    })
  }
  if (task.deliveryRefId && task.deliveryType) {
    const previousId = String(task.deliveryRefId)
    if (!candidates.some((candidate) => (
      String(candidate.id) === previousId && candidate.resolutionType === task.deliveryType
    ))) {
      candidates.push({
        id: previousId,
        resolutionType: task.deliveryType,
        title: `${task.title}（上次提交）`,
        domain: task.domain,
        publicPath: task.deliveryType === 'SERIES'
          ? `/collaboration/series/${encodeURIComponent(previousId)}`
          : `/post/${encodeURIComponent(previousId)}`,
        eligible: true,
        createTime: task.createTime,
        updateTime: task.updateTime,
      })
    }
  }
  return candidates
}
const selectedDeliveryCandidate = (task: ContentMaintenanceTask) => {
  const value = draft(task)
  return deliveryCandidates(task).find((candidate) => (
    String(candidate.id) === value.deliveryRefId && candidate.resolutionType === value.deliveryType
  )) || null
}
const applyDeliveryCandidate = (task: ContentMaintenanceTask, candidate: NeedDeliveryCandidate) => {
  Object.assign(draft(task), {
    deliveryType: candidate.resolutionType,
    deliveryRefId: String(candidate.id),
  })
}
const load = async (append = false) => {
  if (append && (!hasMore.value || loadingMore.value)) return
  if (append) loadingMore.value = true
  else loading.value = true
  errorText.value = ''
  try {
    const res = await contentMaintenanceApi.mine({
      status: status.value || undefined,
      cursor: append ? nextCursor.value || 0 : 0,
      size: 50,
    })
    const incoming = res.data?.items || []
    items.value = append ? [...items.value, ...incoming] : incoming
    nextCursor.value = res.data?.nextCursor || null
    hasMore.value = Boolean(res.data?.hasMore && nextCursor.value)
  } catch (error) {
    errorText.value = getErrorMessage(error, '维护任务暂时无法读取')
  } finally {
    if (append) loadingMore.value = false
    else loading.value = false
  }
}
const claim = async (task: ContentMaintenanceTask) => {
  busy.value = true
  try {
    await contentMaintenanceApi.claim(task.id)
    toast.success('任务已领取')
    await load()
  } catch (error) {
    toast.error(getErrorMessage(error, '领取任务失败'))
  } finally {
    busy.value = false
  }
}
const changeStatus = () => {
  void router.replace({
    path: route.path,
    query: {
      ...route.query,
      status: status.value || undefined,
    },
  })
  void load()
}
const canSubmit = (task: ContentMaintenanceTask) => {
  const value = draft(task)
  return /^[1-9]\d*$/.test(value.deliveryRefId) && value.note.length >= 5
}
const submit = async (task: ContentMaintenanceTask) => {
  if (!canSubmit(task)) return
  busy.value = true
  try {
    const value = draft(task)
    await contentMaintenanceApi.submit(task.id, {
      deliveryType: value.deliveryType,
      deliveryRefId: value.deliveryRefId,
      deliveryPostId: value.deliveryType === 'SERIES' ? undefined : value.deliveryRefId,
      note: value.note,
    })
    toast.success('交付已提交，等待治理审核')
    await load()
  } catch (error) {
    toast.error(getErrorMessage(error, '提交交付失败'))
  } finally {
    busy.value = false
  }
}
const statusLabel = (value: MaintenanceStatus) => ({
  OPEN: '待领取', CLAIMED: '处理中', SUBMITTED: '待审核', COMPLETED: '已完成', CLOSED: '已关闭',
}[value])
const sourceLabel = (value: string) => ({
  CHANNEL_HEALTH: '频道健康', SEARCH_GAP: '搜索缺口', SUGGESTION: '补充纠错',
  FRESHNESS: '时效确认', PROFILE_CONFIRMATION: '经验背景', QUESTION: '问题闭环', MANUAL: '人工创建',
}[value] || value)
const statusClass = (value: MaintenanceStatus) => (
  value === 'COMPLETED' ? 'status-ok' : value === 'SUBMITTED' ? 'status-warn' : value === 'CLOSED' ? 'status-muted' : 'status-active'
)
const formatTime = (value: string) => value?.replace('T', ' ').slice(0, 16) || '--'

watch(
  () => firstQueryValue(route.query.status),
  () => {
    const nextStatus = readRouteStatus()
    if (nextStatus === status.value) return
    status.value = nextStatus
    void load()
  },
)

onMounted(() => {
  void load()
})
</script>

<style scoped>
.maintenance-page { background: rgb(248 250 252); }
.page-header,.task-head,.action-row { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; }
.page-header { margin-bottom:1.25rem; }.page-header p { margin:0;color:rgb(8 145 178);font-size:.75rem;font-weight:900; }
.page-header h1 { margin:.2rem 0;color:rgb(15 23 42);font-size:1.5rem;font-weight:900; }.page-header span { color:rgb(100 116 139);font-size:.85rem;line-height:1.55; }
.icon-button { display:inline-flex;width:2.5rem;height:2.5rem;align-items:center;justify-content:center;border:1px solid rgb(203 213 225);border-radius:.5rem;background:white;color:rgb(51 65 85); }
.filter-bar { margin-bottom:1rem; }.field-control { width:100%;min-width:0;border:1px solid rgb(203 213 225);border-radius:.5rem;background:white;padding:.6rem .7rem;color:rgb(15 23 42);font-size:.8rem; }.filter-bar .field-control { width:auto;min-width:10rem; }
.task-list { display:grid;gap:.85rem; }.task-row { border:1px solid rgb(226 232 240);border-radius:.625rem;background:white;padding:1rem; }.badge-line { display:flex;flex-wrap:wrap;gap:.4rem; }.status,.source { display:inline-flex;border-radius:999px;padding:.2rem .5rem;font-size:.68rem;font-weight:900; }.status-active { background:rgb(224 231 255);color:rgb(67 56 202); }.status-warn { background:rgb(254 243 199);color:rgb(146 64 14); }.status-ok { background:rgb(220 252 231);color:rgb(21 128 61); }.status-muted,.source { background:rgb(241 245 249);color:rgb(71 85 105); }
.task-head h2 { margin:.55rem 0 0;color:rgb(15 23 42);font-size:1rem;font-weight:900; }.open-link { color:rgb(8 145 178);font-size:.76rem;font-weight:800;white-space:nowrap; }.detail,.note,.meta { margin:.7rem 0 0;color:rgb(71 85 105);font-size:.8rem;line-height:1.6; }.meta { color:rgb(100 116 139);font-size:.72rem; }.note { border-left:2px solid rgb(125 211 252);padding-left:.65rem; }
.action-row { margin-top:.9rem;justify-content:flex-start; }.submit-form { display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.65rem;margin-top:1rem;border-top:1px solid rgb(241 245 249);padding-top:1rem; }.maintenance-delivery-selector { grid-column:1 / -1;border:0;border-radius:0;background:transparent; }.manual-delivery-fallback { grid-column:1 / -1;color:rgb(100 116 139);font-size:.75rem;font-weight:800; }.manual-delivery-fallback summary { cursor:pointer; }.manual-delivery-fields { display:grid;grid-template-columns:10rem minmax(0,1fr);gap:.65rem;margin-top:.65rem; }.note-input { grid-column:1 / -1;resize:vertical; }.primary-button { display:inline-flex;min-height:38px;align-items:center;justify-content:center;border:1px solid rgb(8 145 178);border-radius:.5rem;background:rgb(8 145 178);padding:.5rem .75rem;color:white;font-size:.78rem;font-weight:900; }.primary-button:disabled,.icon-button:disabled { cursor:not-allowed;opacity:.5; }
.load-more-row { display:flex;justify-content:center;margin-top:1rem; }.secondary-button { display:inline-flex;min-height:38px;align-items:center;justify-content:center;border:1px solid rgb(203 213 225);border-radius:.5rem;background:white;padding:.5rem .85rem;color:rgb(51 65 85);font-size:.78rem;font-weight:900; }.secondary-button:disabled { cursor:not-allowed;opacity:.5; }
.state { border:1px dashed rgb(203 213 225);border-radius:.625rem;background:white;padding:2rem;color:rgb(100 116 139);text-align:center; }.state-error { border-style:solid;border-color:rgb(254 202 202);color:rgb(185 28 28); }
@media (max-width:720px) { .page-header,.task-head { flex-direction:column; }.submit-form,.manual-delivery-fields { grid-template-columns:1fr; }.note-input { grid-column:auto; } }
.dark .maintenance-page { background:rgb(2 6 23); }.dark .task-row,.dark .field-control,.dark .icon-button,.dark .secondary-button,.dark .state { border-color:rgb(51 65 85);background:rgb(15 23 42);color:rgb(203 213 225); }.dark .page-header h1,.dark .task-head h2 { color:rgb(248 250 252); }.dark .page-header span,.dark .detail,.dark .meta { color:rgb(148 163 184); }.dark .submit-form { border-color:rgb(51 65 85); }
</style>
