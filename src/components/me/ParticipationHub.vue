<template>
  <section class="participation-hub" aria-labelledby="participation-hub-title" data-participation-hub>
    <div class="participation-hub__head">
      <div>
        <p class="participation-hub__eyebrow">我的参与</p>
        <h2 id="participation-hub-title">当前参与概览</h2>
        <p>当前待处理事项、最近更新与回访提醒。</p>
      </div>
      <button
        type="button"
        class="participation-hub__refresh"
        :disabled="isRefreshing"
        title="刷新参与总览"
        aria-label="刷新参与总览"
        @click="loadAll"
      >
        <RefreshCw :class="['h-4 w-4', { 'animate-spin': isRefreshing }]" />
      </button>
    </div>

    <p v-if="failedSourceCount" class="participation-hub__partial-error" role="alert">
      {{ failedSourceCount }} 个来源暂时无法读取；其余入口仍可使用。
    </p>

    <div class="participation-hub__grid">
      <article
        v-for="entry in entries"
        :key="entry.key"
        class="participation-hub__card"
        :data-participation-source="entry.key"
        :data-participation-state="entry.state"
      >
        <div class="participation-hub__card-head">
          <component :is="entry.icon" class="participation-hub__icon" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <h3>{{ entry.title }}</h3>
            <p>{{ entry.description }}</p>
          </div>
          <span class="participation-hub__state" :class="`participation-hub__state--${entry.state}`">
            {{ stateLabel(entry.state) }}
          </span>
        </div>

        <div class="participation-hub__metric">
          <strong>{{ entry.metric }}</strong>
          <span>{{ entry.metricLabel }}</span>
        </div>

        <p v-if="entry.detail" class="participation-hub__detail">{{ entry.detail }}</p>

        <div class="participation-hub__actions">
          <RouterLink :to="entry.to">
            {{ entry.actionLabel }}
            <ArrowUpRight class="h-4 w-4" aria-hidden="true" />
          </RouterLink>
          <button
            type="button"
            :disabled="entry.state === 'loading'"
            :title="`重新读取${entry.title}`"
            :aria-label="`重新读取${entry.title}`"
            @click="retrySource(entry.key)"
          >
            <RefreshCw :class="['h-4 w-4', { 'animate-spin': entry.state === 'loading' }]" />
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Flag,
  HeartHandshake,
  History,
  Link2,
  ListChecks,
  Newspaper,
  RefreshCw,
} from 'lucide-vue-next'
import {
  type ParticipationSourceKey,
  type ParticipationSourceStatus,
  useParticipationHub,
} from '@/composables/useParticipationHub'
import {
  buildCollaborationTarget,
  buildKnowledgeTarget,
  buildMaintenanceTarget,
  buildNotificationTarget,
  buildRelationshipTarget,
  buildReportsTarget,
  buildRevisitTarget,
  buildUpdateDigestTarget,
  collaborationActionLabel,
  knowledgeActionLabel,
  maintenanceActionLabel,
  notificationActionLabel,
  relationshipActionLabel,
  reportActionLabel,
  revisitActionLabel,
  selectCollaborationActionType,
  selectKnowledgeActionType,
  selectMaintenanceStatus,
  selectNotificationType,
  selectRelationshipMode,
  selectReportFilter,
  selectRevisitStatus,
  selectUpdateDigestFocus,
  updateDigestActionLabel,
} from '@/utils/participationNavigation'

interface ParticipationEntry {
  key: ParticipationSourceKey
  title: string
  description: string
  detail: string
  metric: string
  metricLabel: string
  state: ParticipationSourceStatus
  icon: Component
  to: RouteLocationRaw
  actionLabel: string
}

const {
  sources,
  isRefreshing,
  failedSourceCount,
  loadAll,
  retrySource,
} = useParticipationHub()

const asCount = (value: unknown) => {
  const text = String(value ?? '').trim()
  if (!/^\d+$/.test(text)) return 0
  const parsed = Number(text)
  return Number.isSafeInteger(parsed) ? Math.max(0, parsed) : 0
}

const countText = (value: unknown) => {
  const text = String(value ?? '').trim()
  if (!/^\d+$/.test(text)) return '0'
  const parsed = Number(text)
  return Number.isSafeInteger(parsed) ? parsed.toLocaleString('zh-CN') : text
}

const unavailableMetric = (state: ParticipationSourceStatus) => (
  state === 'idle' || state === 'loading' || state === 'error'
)

const summaryCountText = (state: ParticipationSourceStatus, value: unknown) => (
  unavailableMetric(state) ? '—' : countText(value)
)

const previewCountText = (state: ParticipationSourceStatus, items: unknown[], hasMore?: boolean) => (
  unavailableMetric(state) ? '—' : `${items.length}${hasMore ? '+' : ''}`
)

const previewLabel = (kind: string, hasMore?: boolean) => (
  hasMore ? `本页可见${kind}；仍有更多` : `本页可见${kind}`
)

const errorOrDegradedDetail = (
  status: ParticipationSourceStatus,
  error: string,
  degradedDetail: string,
) => {
  if (status === 'error') return error
  if (status === 'degraded') return degradedDetail
  return ''
}

const entries = computed<ParticipationEntry[]>(() => {
  const collaboration = sources.collaboration
  const knowledge = sources.knowledge
  const maintenance = sources.maintenance
  const notifications = sources.notifications
  const updates = sources.updates
  const revisits = sources.revisits
  const relationships = sources.relationships
  const reports = sources.reports
  const collaborationActionType = selectCollaborationActionType(collaboration.data?.counts)
  const knowledgeActionType = selectKnowledgeActionType(knowledge.data?.counts)
  const maintenanceStatus = selectMaintenanceStatus(maintenance.data?.items)
  const notificationType = selectNotificationType(notifications.data)
  const updateDigestFocus = selectUpdateDigestFocus(updates.data?.items)
  const revisitStatus = selectRevisitStatus(revisits.data?.items)
  const relationshipMode = selectRelationshipMode(relationships.data)
  const reportFilter = selectReportFilter(reports.data?.items)

  return [
    {
      key: 'collaboration',
      title: '协作行动',
      description: '认领、提交、审核和停滞提醒。',
      detail: errorOrDegradedDetail(
        collaboration.status,
        collaboration.error,
        `${Object.keys(collaboration.data?.sourceErrors || {}).length} 个协作来源暂时降级。`,
      ),
      metric: summaryCountText(collaboration.status, collaboration.data?.total),
      metricLabel: asCount(collaboration.data?.total) === 0 ? '当前行动' : '项当前行动',
      state: collaboration.status,
      icon: HeartHandshake,
      to: buildCollaborationTarget(collaborationActionType),
      actionLabel: collaborationActionLabel(collaborationActionType),
    },
    {
      key: 'knowledge',
      title: '知识维护',
      description: '建议、时效、来源、关系和维护任务。',
      detail: errorOrDegradedDetail(
        knowledge.status,
        knowledge.error,
        `${Object.keys(knowledge.data?.sourceErrors || {}).length} 个知识来源暂时降级。`,
      ),
      metric: summaryCountText(knowledge.status, knowledge.data?.total),
      metricLabel: asCount(knowledge.data?.total) === 0 ? '当前事项' : '项当前事项',
      state: knowledge.status,
      icon: BookOpen,
      to: buildKnowledgeTarget(knowledgeActionType),
      actionLabel: knowledgeActionLabel(knowledgeActionType),
    },
    {
      key: 'maintenance',
      title: '内容维护任务',
      description: '已分配给你的内容维护交付。',
      detail: errorOrDegradedDetail(maintenance.status, maintenance.error, '维护任务当前处于降级读取状态。'),
      metric: previewCountText(maintenance.status, maintenance.data?.items || [], maintenance.data?.hasMore),
      metricLabel: previewLabel('任务', maintenance.data?.hasMore),
      state: maintenance.status,
      icon: ListChecks,
      to: buildMaintenanceTarget(maintenanceStatus),
      actionLabel: maintenanceActionLabel(maintenanceStatus),
    },
    {
      key: 'notifications',
      title: '通知',
      description: '互动、提及和系统通知的未读状态。',
      detail: errorOrDegradedDetail(notifications.status, notifications.error, ''),
      metric: summaryCountText(notifications.status, notifications.data?.total),
      metricLabel: '条未读通知',
      state: notifications.status,
      icon: Bell,
      to: buildNotificationTarget(notificationType),
      actionLabel: notificationActionLabel(notificationType),
    },
    {
      key: 'updates',
      title: '更新摘要',
      description: '近期公开内容变化，不等同未读通知。',
      detail: errorOrDegradedDetail(updates.status, updates.error, '更新摘要当前处于降级读取状态。'),
      metric: previewCountText(updates.status, updates.data?.items || [], updates.data?.hasMore),
      metricLabel: previewLabel('更新', updates.data?.hasMore),
      state: updates.status,
      icon: Newspaper,
      to: buildUpdateDigestTarget(updateDigestFocus),
      actionLabel: updateDigestActionLabel(updateDigestFocus),
    },
    {
      key: 'revisits',
      title: '回访',
      description: '需要回看或跟进的站内内容。',
      detail: errorOrDegradedDetail(revisits.status, revisits.error, '回访事项当前处于降级读取状态。'),
      metric: previewCountText(revisits.status, revisits.data?.items || [], revisits.data?.hasMore),
      metricLabel: previewLabel('回访', revisits.data?.hasMore),
      state: revisits.status,
      icon: History,
      to: buildRevisitTarget(revisitStatus),
      actionLabel: revisitActionLabel(revisitStatus),
    },
    {
      key: 'relationships',
      title: '关系与订阅',
      description: '关注的用户、话题和共建资源。',
      detail: errorOrDegradedDetail(relationships.status, relationships.error, ''),
      metric: summaryCountText(relationships.status, relationships.data?.active),
      metricLabel: relationships.data?.total ? `项活跃关系 / 共 ${countText(relationships.data.total)} 项` : '项活跃关系',
      state: relationships.status,
      icon: Link2,
      to: buildRelationshipTarget(relationshipMode),
      actionLabel: relationshipActionLabel(relationshipMode),
    },
    {
      key: 'reports',
      title: '举报回执',
      description: '你提交的举报处理进度。',
      detail: errorOrDegradedDetail(reports.status, reports.error, '举报回执当前处于降级读取状态。'),
      metric: previewCountText(reports.status, reports.data?.items || [], reports.data?.hasMore),
      metricLabel: previewLabel('回执', reports.data?.hasMore),
      state: reports.status,
      icon: Flag,
      to: buildReportsTarget(reportFilter),
      actionLabel: reportActionLabel(reportFilter),
    },
  ]
})

const stateLabel = (state: ParticipationSourceStatus) => {
  if (state === 'loading') return '读取中'
  if (state === 'ready') return '可查看'
  if (state === 'empty') return '暂无事项'
  if (state === 'degraded') return '部分降级'
  if (state === 'error') return '暂不可用'
  return '等待读取'
}

</script>

<style scoped>
.participation-hub {
  border-top: 1px solid rgb(191 219 254);
  padding-top: 1.25rem;
}

.participation-hub__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.participation-hub__eyebrow {
  margin: 0;
  color: rgb(37 99 235);
  font-size: 0.75rem;
  font-weight: 900;
}

.participation-hub__head h2 {
  margin-top: 0.2rem;
  color: rgb(15 23 42);
  font-size: 1.05rem;
  font-weight: 900;
}

.participation-hub__head p:not(.participation-hub__eyebrow) {
  margin-top: 0.45rem;
  max-width: 48rem;
  color: rgb(100 116 139);
  font-size: 0.8125rem;
  font-weight: 650;
  line-height: 1.6;
}

.participation-hub__refresh,
.participation-hub__actions button {
  display: inline-flex;
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(191 219 254);
  border-radius: 6px;
  background: rgb(239 246 255);
  color: rgb(37 99 235);
}

.participation-hub__refresh:hover,
.participation-hub__actions button:hover {
  border-color: rgb(147 197 253);
  background: rgb(219 234 254);
}

.participation-hub__refresh:disabled,
.participation-hub__actions button:disabled {
  cursor: wait;
  opacity: 0.62;
}

.participation-hub__partial-error {
  margin-top: 1rem;
  border: 1px solid rgb(254 202 202);
  border-radius: 6px;
  background: rgb(254 242 242);
  padding: 0.65rem 0.75rem;
  color: rgb(185 28 28);
  font-size: 0.8125rem;
  font-weight: 750;
}

.participation-hub__grid {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.participation-hub__card {
  display: flex;
  min-width: 0;
  min-height: 12.5rem;
  flex-direction: column;
  border: 1px solid rgb(226 232 240);
  border-radius: 8px;
  background: rgb(248 250 252);
  padding: 0.9rem;
}

.participation-hub__card-head {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
}

.participation-hub__icon {
  width: 1.1rem;
  height: 1.1rem;
  flex: 0 0 auto;
  margin-top: 0.1rem;
  color: rgb(37 99 235);
}

.participation-hub__card h3 {
  color: rgb(15 23 42);
  font-size: 0.875rem;
  font-weight: 900;
  line-height: 1.35;
}

.participation-hub__card-head p {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 0.25rem;
  color: rgb(100 116 139);
  font-size: 0.75rem;
  font-weight: 650;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.participation-hub__state {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 0.2rem 0.45rem;
  background: rgb(226 232 240);
  color: rgb(71 85 105);
  font-size: 0.625rem;
  font-weight: 900;
  line-height: 1.2;
}

.participation-hub__state--loading {
  background: rgb(219 234 254);
  color: rgb(29 78 216);
}

.participation-hub__state--degraded {
  background: rgb(254 243 199);
  color: rgb(146 64 14);
}

.participation-hub__state--error {
  background: rgb(254 226 226);
  color: rgb(185 28 28);
}

.participation-hub__metric {
  display: grid;
  gap: 0.2rem;
  margin-top: 1rem;
}

.participation-hub__metric strong {
  overflow: hidden;
  color: rgb(15 23 42);
  font-size: 1.45rem;
  font-weight: 900;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.participation-hub__metric span,
.participation-hub__detail {
  color: rgb(100 116 139);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.45;
}

.participation-hub__detail {
  display: -webkit-box;
  overflow: hidden;
  min-height: 2.2rem;
  margin-top: 0.55rem;
  color: rgb(180 83 9);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.participation-hub__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  margin-top: auto;
  padding-top: 0.8rem;
}

.participation-hub__actions a {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.3rem;
  color: rgb(37 99 235);
  font-size: 0.75rem;
  font-weight: 900;
}

.participation-hub__actions a:hover {
  color: rgb(30 64 175);
}

.dark .participation-hub {
  border-color: rgb(30 64 175);
}

.dark .participation-hub__head h2,
.dark .participation-hub__card h3,
.dark .participation-hub__metric strong {
  color: rgb(248 250 252);
}

.dark .participation-hub__head p:not(.participation-hub__eyebrow),
.dark .participation-hub__card-head p,
.dark .participation-hub__metric span {
  color: rgb(148 163 184);
}

.dark .participation-hub__card {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

.dark .participation-hub__refresh,
.dark .participation-hub__actions button {
  border-color: rgb(30 64 175);
  background: rgb(30 58 138 / 0.32);
  color: rgb(147 197 253);
}

.dark .participation-hub__refresh:hover,
.dark .participation-hub__actions button:hover {
  background: rgb(30 64 175 / 0.56);
}

.dark .participation-hub__partial-error {
  border-color: rgb(127 29 29);
  background: rgb(69 10 10 / 0.55);
  color: rgb(254 202 202);
}

.dark .participation-hub__state {
  background: rgb(51 65 85);
  color: rgb(203 213 225);
}

.dark .participation-hub__state--loading {
  background: rgb(30 58 138 / 0.6);
  color: rgb(191 219 254);
}

.dark .participation-hub__state--degraded {
  background: rgb(120 53 15 / 0.55);
  color: rgb(253 230 138);
}

.dark .participation-hub__state--error {
  background: rgb(127 29 29 / 0.55);
  color: rgb(254 202 202);
}

.dark .participation-hub__detail {
  color: rgb(253 230 138);
}

.dark .participation-hub__actions a {
  color: rgb(147 197 253);
}

@media (max-width: 1024px) {
  .participation-hub__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .participation-hub {
    padding-top: 1rem;
  }

  .participation-hub__grid {
    grid-template-columns: 1fr;
  }

  .participation-hub__card {
    min-height: 11.5rem;
  }
}
</style>
