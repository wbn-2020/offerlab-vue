<template>
  <main class="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950">
    <div class="mx-auto max-w-6xl space-y-6">
      <section class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-sm font-medium text-primary-600 dark:text-primary-400">Admin Ops</p>
          <h1 class="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">运维中心</h1>
          <p class="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            查看搜索索引、Outbox 消息积压，并异步触发帖子搜索索引重建。
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" class="secondary-button" :disabled="isLoading" @click="loadStatus">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
            刷新状态
          </button>
          <button type="button" class="primary-button" :disabled="isSubmitting || isTaskActive" @click="submitRebuild">
            <RotateCcw class="h-4 w-4" :class="{ 'animate-spin': isSubmitting || isTaskActive }" />
            {{ isTaskActive ? '重建中' : '重建索引' }}
          </button>
        </div>
      </section>

      <section v-if="loadError" class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        {{ loadError }}
      </section>

      <section class="grid gap-4 md:grid-cols-3">
        <article class="metric-card">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="metric-label">搜索服务</p>
              <h2 class="metric-value">{{ searchOnlineText }}</h2>
            </div>
            <span :class="['status-pill', status?.search.available ? 'status-ok' : 'status-warn']">
              {{ status?.search.available ? 'Online' : 'Fallback' }}
            </span>
          </div>
          <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {{ status?.search.indexName || '--' }} / {{ status?.search.indexReady ? '索引可用' : '索引未就绪' }}
          </p>
        </article>

        <article class="metric-card">
          <p class="metric-label">待投递 Outbox</p>
          <h2 class="metric-value">{{ status?.outbox.byStatus.pending ?? '--' }}</h2>
          <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">
            当前到期可投递 {{ status?.outbox.duePending ?? '--' }} 条
          </p>
        </article>

        <article class="metric-card">
          <p class="metric-label">失败 Outbox</p>
          <h2 class="metric-value">{{ status?.outbox.byStatus.failed ?? '--' }}</h2>
          <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">
            已发送 {{ status?.outbox.byStatus.sent ?? '--' }} 条
          </p>
        </article>
      </section>

      <section class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article class="panel">
          <div class="flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">索引重建任务</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">提交后后台执行，页面会自动轮询任务状态。</p>
            </div>
            <span v-if="task" :class="['status-pill', taskStatusClass]">{{ task.status }}</span>
          </div>

          <div v-if="!task" class="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            暂无进行中的重建任务。
          </div>
          <div v-else class="space-y-5 pt-5">
            <div class="grid gap-4 sm:grid-cols-4">
              <div class="task-stat">
                <span>总数</span>
                <strong>{{ task.total }}</strong>
              </div>
              <div class="task-stat">
                <span>已索引</span>
                <strong>{{ task.indexed }}</strong>
              </div>
              <div class="task-stat">
                <span>失败</span>
                <strong>{{ task.failed }}</strong>
              </div>
              <div class="task-stat">
                <span>索引</span>
                <strong class="truncate text-sm">{{ task.indexName || '--' }}</strong>
              </div>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div class="h-full rounded-full bg-primary-600 transition-all" :style="{ width: taskProgress + '%' }" />
            </div>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ task.message || taskTimeText }}
            </p>
          </div>
        </article>

        <article class="panel">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">权限状态</h2>
          <div class="mt-5 space-y-4">
            <div class="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-950">
              <span class="text-sm text-slate-600 dark:text-slate-300">Admin 白名单</span>
              <span :class="['status-pill', status?.adminWhitelistEnabled ? 'status-ok' : 'status-warn']">
                {{ status?.adminWhitelistEnabled ? '已启用' : '本地宽松模式' }}
              </span>
            </div>
            <p class="text-sm leading-6 text-slate-500 dark:text-slate-400">
              生产环境可通过 <code>offerlab.admin.uid-whitelist</code> 或 <code>OFFERLAB_ADMIN_UIDS</code> 限制可访问用户。
            </p>
          </div>
        </article>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RefreshCw, RotateCcw } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { opsApi, type OpsStatus } from '@/api/ops'
import { searchApi, type SearchIndexTask } from '@/api/search'

const status = ref<OpsStatus | null>(null)
const task = ref<SearchIndexTask | null>(null)
const isLoading = ref(false)
const isSubmitting = ref(false)
const loadError = ref('')
let pollTimer: number | undefined

const isTaskActive = computed(() => task.value?.status === 'PENDING' || task.value?.status === 'RUNNING')
const searchOnlineText = computed(() => {
  if (!status.value) return '--'
  if (!status.value.search.enabled) return '未启用'
  return status.value.search.available ? '在线' : '降级'
})
const taskStatusClass = computed(() => {
  if (task.value?.status === 'SUCCEEDED') return 'status-ok'
  if (task.value?.status === 'FAILED') return 'status-danger'
  return 'status-warn'
})
const taskProgress = computed(() => {
  if (!task.value) return 0
  if (task.value.status === 'SUCCEEDED') return 100
  if (task.value.total > 0) {
    return Math.min(100, Math.round(((task.value.indexed + task.value.failed) / task.value.total) * 100))
  }
  return task.value.status === 'RUNNING' ? 35 : 8
})
const taskTimeText = computed(() => {
  if (!task.value?.updatedAt) return '等待任务状态更新'
  return `最近更新：${task.value.updatedAt.replace('T', ' ')}`
})

const loadStatus = async () => {
  isLoading.value = true
  loadError.value = ''
  try {
    const res = await opsApi.status()
    status.value = res.data
  } catch (error: any) {
    loadError.value = error?.message || '运维状态接口暂不可用'
  } finally {
    isLoading.value = false
  }
}

const stopPolling = () => {
  if (pollTimer) {
    window.clearInterval(pollTimer)
    pollTimer = undefined
  }
}

const pollTask = (taskId: string) => {
  stopPolling()
  pollTimer = window.setInterval(async () => {
    try {
      const res = await searchApi.getRebuildTask(taskId)
      task.value = res.data
      if (!res.data || res.data.status === 'SUCCEEDED' || res.data.status === 'FAILED') {
        stopPolling()
        await loadStatus()
      }
    } catch {
      stopPolling()
    }
  }, 1500)
}

const submitRebuild = async () => {
  isSubmitting.value = true
  try {
    const res = await searchApi.rebuildIndex()
    task.value = res.data
    if (res.data?.taskId) {
      pollTask(res.data.taskId)
      toast.success('索引重建任务已提交')
    }
  } catch (error: any) {
    toast.error(error?.message || '提交重建任务失败')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(loadStatus)
onBeforeUnmount(stopPolling)
</script>

<style scoped>
.primary-button,
.secondary-button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.5rem;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.primary-button {
  background: rgb(79 70 229);
  color: white;
}

.primary-button:hover:not(:disabled) {
  background: rgb(67 56 202);
}

.secondary-button {
  border: 1px solid rgb(226 232 240);
  background: white;
  color: rgb(51 65 85);
}

.secondary-button:hover:not(:disabled) {
  background: rgb(248 250 252);
}

.primary-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.metric-card,
.panel {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 1.25rem;
}

.metric-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgb(100 116 139);
}

.metric-value {
  margin-top: 0.5rem;
  font-size: 1.75rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.status-ok {
  background: rgb(220 252 231);
  color: rgb(21 128 61);
}

.status-warn {
  background: rgb(254 243 199);
  color: rgb(180 83 9);
}

.status-danger {
  background: rgb(254 226 226);
  color: rgb(185 28 28);
}

.task-stat {
  min-width: 0;
  border-radius: 0.5rem;
  background: rgb(248 250 252);
  padding: 0.875rem;
}

.task-stat span {
  display: block;
  font-size: 0.75rem;
  color: rgb(100 116 139);
}

.task-stat strong {
  margin-top: 0.35rem;
  display: block;
  color: rgb(15 23 42);
  font-size: 1.125rem;
}

:global(.dark) .secondary-button,
:global(.dark) .metric-card,
:global(.dark) .panel {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

:global(.dark) .secondary-button {
  color: rgb(203 213 225);
}

:global(.dark) .secondary-button:hover:not(:disabled) {
  background: rgb(30 41 59);
}

:global(.dark) .metric-label,
:global(.dark) .task-stat span {
  color: rgb(148 163 184);
}

:global(.dark) .metric-value,
:global(.dark) .task-stat strong {
  color: rgb(248 250 252);
}

:global(.dark) .task-stat {
  background: rgb(2 6 23);
}
</style>
