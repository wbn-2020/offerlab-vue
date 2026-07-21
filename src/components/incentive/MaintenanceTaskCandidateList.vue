<template>
  <section class="candidate-panel" aria-label="公共维护候选">
    <div class="panel-heading">
      <div>
        <h3><Wrench class="h-5 w-5" />公共维护候选</h3>
        <p>候选范围、领域和可领取状态由服务端按当前有效角色过滤。</p>
      </div>
      <button type="button" class="icon-button" title="刷新维护候选" :disabled="loading" @click="load()">
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <div class="filters">
      <label>
        <span>领域</span>
        <select v-model="filters.domain" class="field-control" @change="load()">
          <option :value="undefined">全部可用领域</option>
          <option v-for="domain in domains" :key="domain" :value="domain">领域 {{ domain }}</option>
        </select>
      </label>
      <label>
        <span>来源类型</span>
        <select v-model="filters.sourceType" class="field-control" @change="load()">
          <option value="">全部来源</option>
          <option v-for="sourceType in sourceTypes" :key="sourceType" :value="sourceType">{{ sourceType }}</option>
        </select>
      </label>
      <label>
        <span>内容类型</span>
        <input v-model.number="filters.contentType" class="field-control" type="number" min="1" placeholder="可选">
      </label>
      <button type="button" class="secondary-button filter-button" :disabled="loading" @click="load()">
        <Filter class="h-4 w-4" />应用筛选
      </button>
    </div>

    <div v-if="errorText" class="state state-error" role="alert">
      <AlertTriangle class="h-5 w-5" />
      <span>{{ errorText }}</span>
      <button type="button" class="secondary-button compact" @click="load()">重试</button>
    </div>
    <div v-else-if="loading && items.length === 0" class="state">
      <Loader2 class="h-5 w-5 animate-spin" />正在读取维护候选
    </div>
    <div v-else-if="items.length === 0" class="state">
      <Inbox class="h-5 w-5" />当前角色范围内没有可展示的候选。
    </div>
    <div v-else class="candidate-list">
      <article v-for="item in items" :key="String(item.id)" class="candidate-row">
        <div class="candidate-main">
          <div class="badge-line">
            <span :class="['status-pill', statusClass(item.status)]">{{ statusLabel(item.status) }}</span>
            <span class="meta-chip">{{ item.sourceType }}</span>
            <span :class="['meta-chip', item.canClaim ? 'meta-chip-ok' : '']">
              {{ item.canClaim ? '服务端标记可领取' : item.assignmentStatus }}
            </span>
          </div>
          <h4>{{ item.title }}</h4>
          <p>候选 #{{ item.id }} · 领域 {{ item.domain }} · 来源 {{ item.sourceRefId || '--' }}</p>
          <small>更新于 {{ formatTime(item.updateTime) }}</small>
        </div>
        <RouterLink v-if="item.sourcePostId" :to="`/post/${item.sourcePostId}`" class="open-link">
          查看来源
        </RouterLink>
      </article>
    </div>

    <div v-if="hasMore" class="load-more-row">
      <button type="button" class="secondary-button" :disabled="loadingMore" @click="load(true)">
        <Loader2 v-if="loadingMore" class="h-4 w-4 animate-spin" />
        <ChevronDown v-else class="h-4 w-4" />
        {{ loadingMore ? '正在加载' : '加载更多' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  AlertTriangle,
  ChevronDown,
  Filter,
  Inbox,
  Loader2,
  RefreshCw,
  Wrench,
} from 'lucide-vue-next'
import { getErrorMessage } from '@/api/client'
import {
  communityRolesApi,
  type MaintenanceTaskCandidate,
} from '@/api/communityRoles'

const domains = [1, 2, 3, 4, 5]
const sourceTypes = [
  'CHANNEL_HEALTH',
  'SEARCH_GAP',
  'SUGGESTION',
  'FRESHNESS',
  'PROFILE_CONFIRMATION',
  'QUESTION',
  'MANUAL',
]
const items = ref<MaintenanceTaskCandidate[]>([])
const nextCursor = ref<string | null>(null)
const hasMore = ref(false)
const loading = ref(false)
const loadingMore = ref(false)
const errorText = ref('')
let requestGeneration = 0
const filters = reactive<{
  domain?: number
  sourceType: string
  contentType?: number
}>({
  domain: undefined,
  sourceType: '',
  contentType: undefined,
})

const load = async (append = false) => {
  if (append && (!hasMore.value || loadingMore.value || loading.value)) return
  const generation = append ? requestGeneration : ++requestGeneration
  const query = {
    domain: filters.domain,
    sourceType: filters.sourceType || undefined,
    contentType: filters.contentType || undefined,
    cursor: append ? nextCursor.value || 0 : 0,
    size: 20,
  }
  if (append) {
    loadingMore.value = true
  } else {
    loading.value = true
    loadingMore.value = false
    items.value = []
    nextCursor.value = null
    hasMore.value = false
  }
  errorText.value = ''
  try {
    const response = await communityRolesApi.maintenanceCandidates(query)
    if (generation !== requestGeneration) return
    const page = response.data
    const incoming = Array.isArray(page?.items) ? page.items : []
    items.value = append ? [...items.value, ...incoming] : incoming
    nextCursor.value = page?.nextCursor || null
    hasMore.value = Boolean(page?.hasMore && nextCursor.value)
  } catch (error) {
    if (generation !== requestGeneration) return
    errorText.value = getErrorMessage(error, '公共维护候选暂时无法读取')
  } finally {
    if (generation === requestGeneration) {
      if (append) loadingMore.value = false
      else loading.value = false
    }
  }
}

const statusLabel = (value: string) => ({
  OPEN: '开放',
  CLAIMED: '已领取',
  SUBMITTED: '待审核',
  COMPLETED: '已完成',
  CLOSED: '已关闭',
}[value] || value)

const statusClass = (value: string) => {
  if (['OPEN', 'COMPLETED'].includes(value)) return 'status-ok'
  if (['CLAIMED', 'SUBMITTED'].includes(value)) return 'status-warn'
  return 'status-muted'
}

const formatTime = (value?: string | null) => {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

onMounted(() => load())
</script>

<style scoped>
.candidate-panel { min-width: 0; border: 1px solid rgb(226 232 240); border-radius: .625rem; background: white; padding: 1rem; }
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; }
.panel-heading h3 { display: flex; align-items: center; gap: .4rem; margin: 0; color: rgb(15 23 42); font-size: .95rem; font-weight: 900; }
.panel-heading p { margin: .3rem 0 0; color: rgb(100 116 139); font-size: .73rem; line-height: 1.5; }
.icon-button { display: inline-flex; height: 2.25rem; width: 2.25rem; flex: none; align-items: center; justify-content: center; border: 1px solid rgb(203 213 225); border-radius: .45rem; background: white; color: rgb(51 65 85); }
.filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: .6rem; margin-top: 1rem; }
.filters label { display: grid; min-width: 9rem; gap: .25rem; }
.filters label span { color: rgb(71 85 105); font-size: .68rem; font-weight: 800; }
.field-control { width: 100%; min-height: 34px; border: 1px solid rgb(203 213 225); border-radius: .45rem; background: white; padding: .4rem .55rem; color: rgb(15 23 42); font-size: .72rem; }
.secondary-button { display: inline-flex; min-height: 34px; align-items: center; justify-content: center; gap: .35rem; border: 1px solid rgb(203 213 225); border-radius: .45rem; background: white; padding: .4rem .65rem; color: rgb(51 65 85); font-size: .7rem; font-weight: 900; }
.filter-button { flex: none; }
.state { display: flex; min-height: 6rem; align-items: center; justify-content: center; gap: .5rem; border: 1px dashed rgb(203 213 225); border-radius: .5rem; margin-top: 1rem; padding: 1rem; color: rgb(100 116 139); font-size: .76rem; text-align: center; }
.state-error { border-style: solid; border-color: rgb(254 202 202); color: rgb(185 28 28); }
.candidate-list { display: grid; gap: .65rem; margin-top: 1rem; }
.candidate-row { display: flex; min-width: 0; align-items: flex-start; justify-content: space-between; gap: .8rem; border-top: 1px solid rgb(226 232 240); padding-top: .75rem; }
.candidate-row:first-child { border-top: 0; padding-top: 0; }
.candidate-main { min-width: 0; }
.badge-line { display: flex; flex-wrap: wrap; gap: .35rem; }
.status-pill, .meta-chip { display: inline-flex; align-items: center; border-radius: 999px; padding: .2rem .48rem; font-size: .64rem; font-weight: 900; }
.status-ok, .meta-chip-ok { background: rgb(220 252 231); color: rgb(21 128 61); }
.status-warn { background: rgb(254 243 199); color: rgb(146 64 14); }
.status-muted, .meta-chip { background: rgb(241 245 249); color: rgb(71 85 105); }
.candidate-row h4 { margin: .42rem 0 0; color: rgb(30 41 59); font-size: .8rem; font-weight: 900; overflow-wrap: anywhere; }
.candidate-row p, .candidate-row small { display: block; margin: .25rem 0 0; color: rgb(100 116 139); font-size: .69rem; line-height: 1.45; }
.open-link { flex: none; color: rgb(8 145 178); font-size: .7rem; font-weight: 900; white-space: nowrap; }
.load-more-row { display: flex; justify-content: center; margin-top: .9rem; }
button:disabled { cursor: not-allowed; opacity: .5; }
.dark .candidate-panel, .dark .icon-button, .dark .secondary-button, .dark .field-control { border-color: rgb(51 65 85); background: rgb(15 23 42); color: rgb(203 213 225); }
.dark .panel-heading h3, .dark .candidate-row h4 { color: rgb(248 250 252); }
.dark .panel-heading p, .dark .filters label span, .dark .candidate-row p, .dark .candidate-row small, .dark .state { color: rgb(148 163 184); }
.dark .candidate-row { border-color: rgb(51 65 85); }
.dark .status-muted, .dark .meta-chip { background: rgb(30 41 59); color: rgb(203 213 225); }
@media (max-width: 620px) { .candidate-row { flex-direction: column; } .open-link { align-self: flex-start; } }
</style>
