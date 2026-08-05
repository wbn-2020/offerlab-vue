<template>
  <section class="attempt-timeline" data-v38-maintenance-attempt-timeline="strict-contract">
    <button
      type="button"
      class="timeline-toggle"
      :aria-expanded="expanded"
      @click="toggle"
    >
      <span>交付回合</span>
      <ChevronDown class="h-4 w-4" :class="{ 'rotate-180': expanded }" />
    </button>

    <div v-if="expanded" class="timeline-content">
      <div v-if="loading" class="timeline-state">正在读取交付回合</div>

      <div v-else-if="loadFailed" class="timeline-state timeline-state-error">
        <p>交付回合暂不可读取</p>
        <button type="button" class="retry-button" @click="load">重试</button>
      </div>

      <div v-else-if="attempts.length === 0" class="timeline-state">
        当前任务尚未提交交付。
      </div>

      <ol v-else class="attempt-list">
        <li v-for="attempt in attempts" :key="attempt.attemptNo" class="attempt-item">
          <div class="attempt-marker" aria-hidden="true"></div>
          <article class="attempt-card">
            <header class="attempt-head">
              <div>
                <p>第 {{ attempt.attemptNo }} 次交付</p>
                <span>{{ deliveryLabel(attempt.deliveryType) }} #{{ attempt.deliveryRefId }}</span>
              </div>
              <time>{{ formatTime(attempt.submittedAt) }}</time>
            </header>
            <p class="attempt-meta">提交人 {{ attempt.submittedByUid }}</p>
            <p class="attempt-note">{{ attempt.note }}</p>

            <section v-if="attempt.decision" :class="['decision', decisionClass(attempt.decision)]">
              <div class="decision-head">
                <strong>{{ decisionLabel(attempt.decision) }}</strong>
                <time>{{ formatTime(attempt.reviewedAt) }}</time>
              </div>
              <p>原因：{{ reasonLabel(attempt.reasonCode) }}</p>
              <p>{{ attempt.reviewNote }}</p>
              <small>处理人 {{ attempt.reviewedByUid }}</small>
            </section>
            <p v-else class="pending-copy">等待治理审核</p>
          </article>
        </li>
      </ol>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import type { ApiId } from '@/api/types'
import {
  contentMaintenanceApi,
  type ContentMaintenanceAttemptDecision,
  type ContentMaintenanceTaskAttempt,
} from '@/api/contentMaintenance'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  taskId: ApiId
  timelineKey?: string
}>()

interface AttemptRequestSnapshot {
  requestId: number
  taskId: string
  timelineKey: string
  accountKey: string
  accountGeneration: number
  controller: AbortController
}

const authStore = useAuthStore()
const expanded = ref(false)
const loading = ref(false)
const loadFailed = ref(false)
const attempts = ref<ContentMaintenanceTaskAttempt[]>([])
let requestId = 0
let accountGeneration = 0
let controller: AbortController | null = null

const currentAccountKey = () => `${String(authStore.user?.uid ?? '')}:${String(authStore.token ?? '')}`
const currentTaskId = () => String(props.taskId)
const currentTimelineKey = () => props.timelineKey || ''
const accountIsReady = () => authStore.isLoggedIn && Boolean(authStore.user?.uid)

const abortLoad = () => {
  controller?.abort()
  controller = null
}

const requestIsCurrent = (snapshot: AttemptRequestSnapshot) => (
  snapshot.requestId === requestId
  && snapshot.taskId === currentTaskId()
  && snapshot.timelineKey === currentTimelineKey()
  && snapshot.accountKey === currentAccountKey()
  && snapshot.accountGeneration === accountGeneration
  && controller === snapshot.controller
  && !snapshot.controller.signal.aborted
  && accountIsReady()
)

const reset = (collapse = false) => {
  requestId += 1
  abortLoad()
  loading.value = false
  loadFailed.value = false
  attempts.value = []
  if (collapse) expanded.value = false
}

const isCanceledRequest = (error: unknown, signal: AbortSignal) => {
  if (signal.aborted) return true
  const candidate = error as { name?: unknown; code?: unknown } | null | undefined
  return candidate?.name === 'AbortError'
    || candidate?.name === 'CanceledError'
    || candidate?.code === 'ERR_CANCELED'
}

const load = async () => {
  if (loading.value || !accountIsReady()) return
  abortLoad()
  const nextController = new AbortController()
  const snapshot: AttemptRequestSnapshot = {
    requestId: ++requestId,
    taskId: currentTaskId(),
    timelineKey: currentTimelineKey(),
    accountKey: currentAccountKey(),
    accountGeneration,
    controller: nextController,
  }
  controller = nextController
  loading.value = true
  loadFailed.value = false
  try {
    const res = await contentMaintenanceApi.attempts(props.taskId, {
      signal: nextController.signal,
    })
    if (!requestIsCurrent(snapshot)) return
    if (!res.data) {
      attempts.value = []
      loadFailed.value = true
      return
    }
    attempts.value = res.data
  } catch (error) {
    if (isCanceledRequest(error, nextController.signal) || !requestIsCurrent(snapshot)) return
    attempts.value = []
    loadFailed.value = true
  } finally {
    if (requestIsCurrent(snapshot)) {
      loading.value = false
      controller = null
    }
  }
}

const toggle = () => {
  if (expanded.value) {
    expanded.value = false
    reset()
    return
  }
  expanded.value = true
  if (attempts.value.length === 0) void load()
}

const deliveryLabel = (value: string) => ({
  POST: '公开帖子',
  QUESTION: '公开问题',
  SERIES: '协作合集',
}[value] || value)

const decisionLabel = (value: ContentMaintenanceAttemptDecision) => ({
  APPROVED: '已通过',
  REJECTED: '需要返工',
  CLOSED: '已关闭',
}[value])

const decisionClass = (value: ContentMaintenanceAttemptDecision) => ({
  APPROVED: 'decision-approved',
  REJECTED: 'decision-rejected',
  CLOSED: 'decision-closed',
}[value])

const reasonLabel = (value: string | null) => ({
  QUALITY_VERIFIED: '质量已核验',
  EVIDENCE_SUFFICIENT: '公开依据充分',
  CONTENT_INCOMPLETE: '交付内容不完整',
  PUBLIC_EVIDENCE_MISSING: '缺少公开依据',
  SCOPE_MISMATCH: '交付范围不匹配',
  OUT_OF_SCOPE: '不在维护范围内',
  DUPLICATE: '重复维护',
  NO_LONGER_RELEVANT: '不再相关',
  AUTHOR_UNRESPONSIVE: '维护者未响应',
  OTHER: '其他',
}[value || ''] || '未提供')

const formatTime = (value: string | null) => value?.replace('T', ' ').slice(0, 16) || '--'

watch(
  [currentTaskId, currentTimelineKey],
  ([taskId, timelineKey], [previousTaskId, previousTimelineKey]) => {
    if (taskId === previousTaskId && timelineKey === previousTimelineKey) return
    reset(true)
  },
)

watch(
  [() => authStore.user?.uid, () => authStore.token],
  ([uid, token], [previousUid, previousToken]) => {
    if (uid === previousUid && token === previousToken) return
    accountGeneration += 1
    reset(true)
  },
)

onBeforeUnmount(() => {
  requestId += 1
  abortLoad()
})
</script>

<style scoped>
.attempt-timeline { margin-top: .9rem; border-top: 1px solid rgb(226 232 240); padding-top: .8rem; }
.timeline-toggle { display: inline-flex; min-height: 32px; align-items: center; gap: .35rem; border: 0; background: transparent; padding: .2rem 0; color: rgb(8 145 178); font-size: .76rem; font-weight: 900; }
.timeline-toggle svg { transition: transform .15s ease; }
.timeline-content { margin-top: .65rem; }
.timeline-state { border: 1px dashed rgb(203 213 225); border-radius: .5rem; padding: .85rem; color: rgb(100 116 139); font-size: .76rem; text-align: center; }
.timeline-state p { margin: 0; }
.timeline-state-error { border-style: solid; border-color: rgb(254 202 202); color: rgb(185 28 28); }
.retry-button { display: inline-flex; min-height: 32px; align-items: center; justify-content: center; margin-top: .55rem; border: 1px solid rgb(203 213 225); border-radius: .5rem; background: white; padding: .35rem .65rem; color: rgb(51 65 85); font-size: .73rem; font-weight: 900; }
.attempt-list { display: grid; gap: .7rem; margin: 0; padding: 0; list-style: none; }
.attempt-item { position: relative; padding-left: 1rem; }
.attempt-item::before { position: absolute; top: 1rem; bottom: -1.15rem; left: .2rem; width: 1px; background: rgb(203 213 225); content: ''; }
.attempt-item:last-child::before { display: none; }
.attempt-marker { position: absolute; top: .75rem; left: 0; width: .45rem; height: .45rem; border: 2px solid rgb(14 116 144); border-radius: 999px; background: white; }
.attempt-card { border: 1px solid rgb(226 232 240); border-radius: .5rem; padding: .7rem; }
.attempt-head,.decision-head { display: flex; align-items: flex-start; justify-content: space-between; gap: .65rem; }
.attempt-head p,.attempt-head span,.attempt-head time,.attempt-meta,.attempt-note,.decision p,.decision small,.pending-copy { display: block; margin: 0; color: rgb(71 85 105); font-size: .74rem; line-height: 1.55; }
.attempt-head p { color: rgb(15 23 42); font-weight: 900; }.attempt-head span,.attempt-head time,.attempt-meta,.decision small { color: rgb(100 116 139); font-size: .69rem; }
.attempt-meta { margin-top: .35rem; }.attempt-note { margin-top: .5rem; white-space: pre-wrap; }
.decision { margin-top: .65rem; border-left: 2px solid rgb(203 213 225); padding-left: .6rem; }
.decision strong { font-size: .73rem; }.decision p { margin-top: .3rem; white-space: pre-wrap; }.decision small { margin-top: .3rem; }
.decision-approved { border-color: rgb(34 197 94); }.decision-approved strong { color: rgb(21 128 61); }
.decision-rejected { border-color: rgb(245 158 11); }.decision-rejected strong { color: rgb(146 64 14); }
.decision-closed { border-color: rgb(100 116 139); }.decision-closed strong { color: rgb(71 85 105); }
.pending-copy { margin-top: .65rem; color: rgb(146 64 14); font-weight: 800; }
@media (max-width: 640px) { .attempt-head,.decision-head { flex-direction: column; gap: .25rem; } }
.dark .attempt-timeline,.dark .attempt-item::before { border-color: rgb(51 65 85); background-color: rgb(51 65 85); }
.dark .attempt-marker,.dark .attempt-card,.dark .retry-button,.dark .timeline-state { border-color: rgb(51 65 85); background: rgb(15 23 42); }
.dark .attempt-head p,.dark .attempt-head span,.dark .attempt-head time,.dark .attempt-meta,.dark .attempt-note,.dark .decision p,.dark .decision small,.dark .timeline-state { color: rgb(148 163 184); }
.dark .retry-button { color: rgb(203 213 225); }
