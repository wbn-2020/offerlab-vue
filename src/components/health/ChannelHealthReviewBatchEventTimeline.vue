<template>
  <section class="event-timeline" aria-labelledby="channel-quality-batch-events-heading">
    <header class="timeline-header">
      <div>
        <p>协调记录</p>
        <h4 id="channel-quality-batch-events-heading">不可变事件</h4>
      </div>
      <button
        type="button"
        class="refresh-button"
        :disabled="loading || loadingMore"
        @click="reloadFirstPage"
      >
        {{ loading ? '读取中' : '刷新' }}
      </button>
    </header>

    <div v-if="errorText" class="timeline-state timeline-state-error">
      <span>{{ errorText }}</span>
      <button type="button" class="retry-button" :disabled="loading || loadingMore" @click="reloadFirstPage">
        重试
      </button>
    </div>
    <div v-else-if="loading" class="timeline-state">正在读取协调记录</div>
    <div v-else-if="items.length === 0" class="timeline-state">当前批次还没有协调记录。</div>
    <ol v-else class="event-list">
      <li v-for="event in items" :key="event.id" class="event-row">
        <div class="event-marker" aria-hidden="true"></div>
        <div class="event-content">
          <div class="event-title">
            <strong>{{ eventTitle(event) }}</strong>
            <time>{{ formatTime(event.createTime) }}</time>
          </div>
          <p>{{ redactSensitiveIdentifiers(event.note) }}</p>
          <span class="event-meta">{{ eventMeta(event) }}</span>
        </div>
      </li>
    </ol>

    <div v-if="loadMoreErrorText" class="load-more-error">
      <span>{{ loadMoreErrorText }}</span>
      <button type="button" class="retry-button" :disabled="loadingMore" @click="loadMore">重试</button>
    </div>
    <button
      v-if="nextCursor"
      type="button"
      class="load-more-button"
      :disabled="loading || loadingMore"
      @click="loadMore"
    >
      {{ loadingMore ? '正在读取' : '加载更多' }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getErrorMessage } from '@/api/client'
import {
  channelHealthReviewBatchesApi,
  type ChannelHealthReviewBatchEvent,
} from '@/api/channelHealthReviewBatches'
import type { ApiId } from '@/api/types'

const props = defineProps<{
  batchId: ApiId
}>()

const items = ref<ChannelHealthReviewBatchEvent[]>([])
const nextCursor = ref<ApiId | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const errorText = ref('')
const loadMoreErrorText = ref('')
let requestVersion = 0

const formatTime = (value: string) => {
  if (value.endsWith('Z')) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toLocaleString('zh-CN', { hour12: false })
  }
  return value.replace('T', ' ').replace(/(\.\d{1,9})?Z?$/, '')
}

const redactSensitiveIdentifiers = (value: string) => value
  .replace(/((?:uid|用户\s*(?:id|编号)?|负责人(?:\s*uid)?)\s*[：:]?\s*)\d+/gi, '$1已隐藏')
  .replace(/(?<!\d)[1-9]\d{5,18}(?!\d)/g, '已隐藏编号')

const riskCodeLabel = (value: NonNullable<ChannelHealthReviewBatchEvent['riskCode']>) => ({
  BLOCKER: '阻塞问题',
  CAPACITY_RISK: '容量风险',
  REVIEW_DELAY: '复核延迟',
  OVERDUE_ESCALATION: '逾期升级',
})[value]

const withdrawReasonLabel = (value: NonNullable<ChannelHealthReviewBatchEvent['withdrawReasonCode']>) => ({
  SCOPE_INVALID: '范围无效',
  DUPLICATE_SCOPE: '范围重复',
  PRIORITY_REPLACED: '优先级调整',
  OTHER: '其他原因',
})[value]

const eventTitle = (event: ChannelHealthReviewBatchEvent) => {
  if (event.eventType === 'DEADLINE_EXTENDED') return '已延长有效截止时间'
  if (event.eventType === 'ACTIVE_TASKS_REASSIGNED') {
    return event.previousAssigneeUid == null ? '多个原负责人已统一改派' : '已统一改派活动任务'
  }
  if (event.eventType === 'RISK_NOTE_ADDED') return `已记录${riskCodeLabel(event.riskCode!)}`
  return `已撤回开放任务（${withdrawReasonLabel(event.withdrawReasonCode!)}）`
}

const eventMeta = (event: ChannelHealthReviewBatchEvent) => {
  if (event.eventType === 'DEADLINE_EXTENDED') {
    return `原截止 ${formatTime(event.previousDueAt!)} · 有效截止 ${formatTime(event.effectiveDueAt!)} · 影响 ${event.affectedTaskCount} 条任务`
  }
  if (event.eventType === 'ACTIVE_TASKS_REASSIGNED') return `影响 ${event.affectedTaskCount} 条活动任务`
  if (event.eventType === 'RISK_NOTE_ADDED') return `协调版本 ${event.coordinationVersion}`
  return `撤回 ${event.affectedTaskCount} 条开放任务`
}

const reloadFirstPage = async () => {
  const version = ++requestVersion
  loading.value = true
  loadingMore.value = false
  errorText.value = ''
  loadMoreErrorText.value = ''
  try {
    const response = await channelHealthReviewBatchesApi.events(props.batchId, { size: 10 })
    if (version !== requestVersion) return
    const page = response.data
    if (!page) throw new Error('协调记录未返回可信远端数据')
    items.value = page.items
    nextCursor.value = page.nextCursor
  } catch (error) {
    if (version !== requestVersion) return
    items.value = []
    nextCursor.value = null
    errorText.value = getErrorMessage(error, '协调记录暂时无法读取')
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

const loadMore = async () => {
  const cursor = nextCursor.value
  if (!cursor || loading.value || loadingMore.value) return
  const version = ++requestVersion
  loadingMore.value = true
  loadMoreErrorText.value = ''
  try {
    const response = await channelHealthReviewBatchesApi.events(props.batchId, { cursor, size: 10 })
    if (version !== requestVersion) return
    const page = response.data
    if (!page) throw new Error('协调记录未返回可信远端数据')
    const seenIds = new Set(items.value.map((event) => String(event.id)))
    const moreItems = page.items.filter((event) => !seenIds.has(String(event.id)))
    if (moreItems.length !== page.items.length) {
      throw new Error('协调记录分页存在重复事件')
    }
    items.value = [...items.value, ...moreItems]
    nextCursor.value = page.nextCursor
  } catch (error) {
    if (version !== requestVersion) return
    loadMoreErrorText.value = getErrorMessage(error, '协调记录暂时无法读取')
  } finally {
    if (version === requestVersion) loadingMore.value = false
  }
}

watch(() => String(props.batchId), () => {
  void reloadFirstPage()
}, { immediate: true })

defineExpose({
  reloadFirstPage,
})
</script>

<style scoped>
.event-timeline { margin-top: 1rem; border-top: 1px solid rgb(226 232 240); padding-top: 1rem; }
.timeline-header { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; }
.timeline-header p { margin: 0; color: rgb(8 145 178); font-size: .7rem; font-weight: 800; }
.timeline-header h4 { margin: .2rem 0 0; color: rgb(15 23 42); font-size: .86rem; font-weight: 900; }
.refresh-button, .retry-button, .load-more-button { min-height: 30px; border: 1px solid rgb(203 213 225); border-radius: .5rem; background: white; padding: .3rem .5rem; color: rgb(51 65 85); font-size: .7rem; font-weight: 800; }
.refresh-button:disabled, .retry-button:disabled, .load-more-button:disabled { cursor: not-allowed; opacity: .55; }
.timeline-state { display: flex; align-items: center; justify-content: center; gap: .65rem; margin-top: .7rem; border: 1px dashed rgb(203 213 225); border-radius: .5rem; background: rgb(248 250 252); padding: .9rem; color: rgb(100 116 139); font-size: .74rem; text-align: center; }
.timeline-state-error { border-style: solid; border-color: rgb(254 202 202); color: rgb(185 28 28); }
.event-list { display: grid; gap: .75rem; margin: .85rem 0 0; padding: 0; list-style: none; }
.event-row { display: grid; grid-template-columns: 12px minmax(0, 1fr); gap: .6rem; }
.event-marker { width: 8px; height: 8px; margin: .35rem 0 0 2px; border-radius: 999px; background: rgb(8 145 178); box-shadow: 0 0 0 3px rgb(207 250 254); }
.event-content { min-width: 0; border-bottom: 1px solid rgb(241 245 249); padding-bottom: .7rem; }
.event-title { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: .45rem; }
.event-title strong { color: rgb(15 23 42); font-size: .76rem; font-weight: 900; }
.event-title time, .event-meta { color: rgb(100 116 139); font-size: .66rem; font-weight: 700; }
.event-content p { margin: .28rem 0; color: rgb(71 85 105); font-size: .74rem; line-height: 1.5; white-space: pre-wrap; }
.load-more-error { display: flex; align-items: center; justify-content: center; gap: .6rem; margin-top: .7rem; color: rgb(185 28 28); font-size: .7rem; }
.load-more-button { display: block; margin-top: .7rem; }
.dark .event-timeline, .dark .event-content { border-color: rgb(30 41 59); }
.dark .timeline-header h4, .dark .event-title strong { color: rgb(248 250 252); }
.dark .refresh-button, .dark .retry-button, .dark .load-more-button { border-color: rgb(51 65 85); background: rgb(2 6 23); color: rgb(203 213 225); }
.dark .timeline-state { border-color: rgb(51 65 85); background: rgb(2 6 23 / .55); color: rgb(148 163 184); }
.dark .timeline-state-error { border-color: rgb(127 29 29); color: rgb(252 165 165); }
.dark .event-marker { background: rgb(34 211 238); box-shadow: 0 0 0 3px rgb(8 47 73); }
.dark .event-title time, .dark .event-meta { color: rgb(148 163 184); }
.dark .event-content p { color: rgb(203 213 225); }
</style>
