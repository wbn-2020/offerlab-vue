<template>
  <div class="collaboration-detail-page">
    <AppHeader />

    <main class="detail-shell">
      <div class="detail-toolbar">
        <RouterLink :to="collaborationHubLocation('activities')" class="back-link">
          <ArrowLeft class="icon" aria-hidden="true" />
          返回共创活动
        </RouterLink>
        <button
          type="button"
          class="icon-button"
          :disabled="loading"
          title="刷新活动详情"
          aria-label="刷新活动详情"
          @click="loadDetail"
        >
          <RefreshCw class="icon" :class="{ spin: loading }" aria-hidden="true" />
        </button>
      </div>

      <section v-if="loading" class="state-panel loading-panel" aria-label="活动详情加载中">
        <span class="skeleton skeleton-kicker" />
        <span class="skeleton skeleton-title" />
        <span class="skeleton skeleton-line" />
        <span class="skeleton skeleton-line short" />
        <div class="skeleton-grid">
          <span v-for="index in 4" :key="index" class="skeleton skeleton-meta" />
        </div>
      </section>

      <section v-else-if="errorMessage" class="state-panel error-panel" role="alert">
        <AlertCircle class="state-icon" aria-hidden="true" />
        <div>
          <h1>{{ invalidId ? '链接中的活动编号无效' : '活动详情暂时无法打开' }}</h1>
          <p>{{ errorMessage }}</p>
        </div>
        <button v-if="!invalidId" type="button" class="secondary-button" @click="loadDetail">
          <RefreshCw class="icon" aria-hidden="true" />
          重试
        </button>
        <RouterLink v-else :to="collaborationHubLocation('activities')" class="secondary-button">
          返回共创活动
        </RouterLink>
      </section>

      <template v-else-if="activity">
        <section class="detail-hero reading-header">
          <div class="eyebrow-row">
            <span class="status-badge" :data-status="activity.status">
              <CircleDot class="icon-small" aria-hidden="true" />
              {{ statusLabel(activity.status) }}
            </span>
            <span class="meta-label">{{ domainLabel(activity.domain) }}</span>
            <span class="meta-label">{{ typeLabel(activity.activityType) }}</span>
            <span class="meta-label">活动 #{{ activity.id }}</span>
          </div>
          <h1>{{ activity.title }}</h1>
          <p class="description">{{ activity.description }}</p>

          <div class="detail-meta">
            <PublicActorLink :uid="activity.ownerUid" role-label="负责人" />
            <span><CalendarDays class="icon-small" aria-hidden="true" />更新于 {{ formatDate(activity.updateTime) }}</span>
            <span><FileText class="icon-small" aria-hidden="true" />{{ activity.submissionCount }} 份投稿</span>
            <span v-if="activity.endsAt"><Clock3 class="icon-small" aria-hidden="true" />截止 {{ formatDate(activity.endsAt) }}</span>
          </div>
        </section>

        <div class="detail-grid">
          <div class="main-column">
            <section class="content-section">
              <div class="section-heading">
                <div>
                  <span class="section-kicker">先看这里</span>
                  <h2>活动在邀请什么</h2>
                </div>
                <CalendarDays class="section-icon" aria-hidden="true" />
              </div>
              <p class="long-copy">{{ activity.description || '该活动暂未补充详细说明。' }}</p>
            </section>

            <section class="content-section">
              <div class="section-heading">
                <div>
                  <span class="section-kicker">参与前确认</span>
                  <h2>投稿规则</h2>
                </div>
                <FileCheck2 class="section-icon" aria-hidden="true" />
              </div>
              <p v-if="activity.submissionRule" class="long-copy">{{ activity.submissionRule }}</p>
              <p v-else class="muted-text">负责人暂未补充单独的投稿规则。</p>
            </section>

            <section v-if="activity.resultSummary" class="content-section">
              <div class="section-heading">
                <div>
                  <span class="section-kicker">共建结果</span>
                  <h2>活动总结</h2>
                </div>
                <CheckCircle2 class="section-icon" aria-hidden="true" />
              </div>
              <p class="long-copy">{{ activity.resultSummary }}</p>
            </section>
          </div>

          <aside class="side-column">
            <section class="action-section">
              <div class="section-heading compact">
                <div>
                  <span class="section-kicker">参与方式</span>
                  <h2>加入这次共创</h2>
                </div>
                <Upload class="section-icon" aria-hidden="true" />
              </div>
              <p class="action-copy">投稿、审核和活动管理继续走现有工作台，详情页只负责把规则和结果讲清楚。</p>
              <RouterLink :to="collaborationHubLocation('activities')" class="primary-button full-width">
                <Upload class="icon" aria-hidden="true" />
                前往活动投稿
              </RouterLink>
              <RouterLink v-if="activity.canManage" :to="collaborationHubLocation('manage')" class="secondary-button full-width">
                <Settings2 class="icon" aria-hidden="true" />
                打开管理工作台
              </RouterLink>
            </section>

            <section class="facts-panel">
              <div class="section-heading compact">
                <div>
                  <span class="section-kicker">治理信息</span>
                  <h2>基本信息</h2>
                </div>
                <Info class="section-icon" aria-hidden="true" />
              </div>
              <dl class="detail-list">
                <div>
                  <dt>当前状态</dt>
                  <dd>{{ statusLabel(activity.status) }}</dd>
                </div>
                <div>
                  <dt>活动类型</dt>
                  <dd>{{ typeLabel(activity.activityType) }}</dd>
                </div>
                <div>
                  <dt>开始时间</dt>
                  <dd>{{ formatDate(activity.startsAt) }}</dd>
                </div>
                <div>
                  <dt>结束时间</dt>
                  <dd>{{ formatDate(activity.endsAt) }}</dd>
                </div>
                <div>
                  <dt>创建时间</dt>
                  <dd>{{ formatDate(activity.createTime) }}</dd>
                </div>
              </dl>
              <p class="readonly-note">
                <LockKeyhole class="icon-small" aria-hidden="true" />
                详情页只读展示活动记录，投稿和活动管理仍由现有工作台执行。
              </p>
            </section>
          </aside>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileCheck2,
  FileText,
  Info,
  LockKeyhole,
  RefreshCw,
  Settings2,
  Upload,
} from 'lucide-vue-next'
import { getErrorMessage } from '@/api/client'
import {
  collaborationApi,
  type CollaborationActivity,
  type CollaborationActivityStatus,
  type CollaborationActivityType,
} from '@/api/collaboration'
import { localDomainConfigs } from '@/api/domains'
import AppHeader from '@/components/layout/AppHeader.vue'
import PublicActorLink from '@/components/user/PublicActorLink.vue'
import {
  collaborationHubLocation,
  collaborationResourcePath,
  normalizeCollaborationId,
} from '@/utils/collaborationRoutes'
import { applyPageSeo } from '@/utils/seo'

const route = useRoute()
const activityId = computed(() => normalizeCollaborationId(route.params.activityId))
const invalidId = computed(() => !activityId.value)
const activity = ref<CollaborationActivity | null>(null)
const loading = ref(false)
const errorMessage = ref('')

const statusLabels: Record<CollaborationActivityStatus, string> = {
  DRAFT: '草稿',
  OPEN: '开放投稿',
  REVIEWING: '评审中',
  SUMMARIZED: '已总结',
  ARCHIVED: '已归档',
}

const typeLabels: Record<CollaborationActivityType, string> = {
  OPEN_CALL: '公开征集',
  SPRINT: '协作冲刺',
  CHALLENGE: '主题挑战',
  RESEARCH: '共同研究',
  CURATION: '联合策展',
}

const domainLabel = (domain: number) => (
  localDomainConfigs.find((item) => Number(item.domain) === Number(domain))?.domainName
  || `领域 ${domain}`
)

const statusLabel = (status: CollaborationActivityStatus) => statusLabels[status] || status
const typeLabel = (type: CollaborationActivityType) => typeLabels[type] || type

const formatDate = (value?: string | null) => {
  if (!value) return '时间待定'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

const loadDetail = async () => {
  const id = activityId.value
  activity.value = null
  errorMessage.value = ''
  if (!id) {
    errorMessage.value = '请使用正整数活动编号打开详情。'
    return
  }

  loading.value = true
  try {
    const response = await collaborationApi.activities.detail(id)
    activity.value = response.data || null
    if (!activity.value) errorMessage.value = '服务端没有返回这项活动。'
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '共创活动加载失败')
  } finally {
    loading.value = false
  }
}

watch(activityId, () => {
  void loadDetail()
}, { immediate: true })

watch([activity, activityId, errorMessage], () => {
  applyPageSeo({
    title: activity.value?.title || (errorMessage.value ? '共创活动详情' : '共创活动'),
    description: activity.value?.description || '共创活动详情。',
    canonical: collaborationResourcePath('activity', activityId.value) || '/collaboration/activities',
  })
}, { immediate: true })
</script>

<style scoped>
.collaboration-detail-page {
  min-height: 100vh;
  background: rgb(248 250 252);
  color: rgb(15 23 42);
}

.detail-shell {
  width: min(1120px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1.5rem 0 4rem;
}

.detail-toolbar,
.action-bar,
.detail-meta,
.eyebrow-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.detail-toolbar {
  justify-content: space-between;
  margin-bottom: 1rem;
}

.back-link,
.text-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: rgb(37 99 235);
  font-weight: 700;
  text-decoration: none;
}

.back-link:hover,
.text-link:hover {
  text-decoration: underline;
}

.icon,
.icon-small {
  flex: none;
}

.icon {
  width: 1rem;
  height: 1rem;
}

.icon-small {
  width: 0.9rem;
  height: 0.9rem;
}

.icon-button,
.primary-button,
.secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 0.5rem;
  border: 1px solid transparent;
  padding: 0.6rem 0.85rem;
  font-size: 0.86rem;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
}

.icon-button {
  width: 2.25rem;
  height: 2.25rem;
  border-color: rgb(226 232 240);
  background: white;
  color: rgb(71 85 105);
}

.primary-button {
  background: rgb(37 99 235);
  color: white;
}

.secondary-button {
  border-color: rgb(203 213 225);
  background: white;
  color: rgb(30 41 59);
}

.detail-hero,
.content-section,
.facts-panel,
.state-panel {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.7rem;
  background: white;
  box-shadow: 0 10px 30px rgb(15 23 42 / 0.04);
}

.detail-hero {
  padding: clamp(1.25rem, 3vw, 2rem);
}

.detail-hero h1 {
  margin: 0.75rem 0 0;
  font-size: clamp(1.7rem, 4vw, 2.7rem);
  line-height: 1.15;
}

.description,
.long-copy {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.8;
  color: rgb(71 85 105);
}

.description {
  max-width: 78ch;
  margin: 0.9rem 0 0;
}

.detail-meta {
  margin-top: 1.1rem;
  color: rgb(100 116 139);
  font-size: 0.82rem;
}

.detail-meta span {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.action-bar {
  margin-top: 1.25rem;
}

.status-badge,
.meta-label {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border-radius: 999px;
  padding: 0.3rem 0.6rem;
  font-size: 0.76rem;
  font-weight: 800;
}

.status-badge {
  background: rgb(219 234 254);
  color: rgb(30 64 175);
}

.status-badge[data-status='ARCHIVED'] {
  background: rgb(241 245 249);
  color: rgb(71 85 105);
}

.meta-label {
  background: rgb(239 246 255);
  color: rgb(30 64 175);
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 1rem;
  margin-top: 1rem;
}

.main-column {
  display: grid;
  gap: 1rem;
}

.content-section,
.facts-panel {
  padding: 1.25rem;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.8rem;
}

.section-heading.compact {
  margin-bottom: 0.35rem;
}

.section-kicker {
  color: rgb(37 99 235);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.section-heading h2 {
  margin: 0.2rem 0 0;
  font-size: 1.08rem;
}

.section-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: rgb(96 165 250);
}

.long-copy,
.muted-text {
  margin: 0;
}

.muted-text,
.state-panel p {
  color: rgb(100 116 139);
}

.detail-list {
  display: grid;
  gap: 0;
  margin: 0;
}

.detail-list div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid rgb(241 245 249);
  padding: 0.7rem 0;
}

.detail-list dt {
  color: rgb(100 116 139);
  font-size: 0.8rem;
}

.detail-list dd {
  margin: 0;
  text-align: right;
  color: rgb(30 41 59);
  font-size: 0.82rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.readonly-note {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  margin: 1rem 0 0;
  border-radius: 0.5rem;
  background: rgb(248 250 252);
  padding: 0.75rem;
  color: rgb(71 85 105);
  font-size: 0.78rem;
  line-height: 1.6;
}

.state-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  min-height: 220px;
  padding: 2rem;
}

.state-panel h1 {
  margin: 0;
  font-size: 1.25rem;
}

.state-panel p {
  margin: 0.35rem 0 0;
}

.error-panel {
  border-color: rgb(254 202 202);
}

.state-icon {
  width: 1.5rem;
  height: 1.5rem;
  flex: none;
  color: rgb(220 38 38);
}

.loading-panel {
  display: grid;
  align-content: center;
  justify-items: start;
}

.skeleton {
  display: block;
  border-radius: 0.35rem;
  background: rgb(226 232 240);
  animation: pulse 1.4s ease-in-out infinite;
}

.skeleton-kicker {
  width: 7rem;
  height: 0.8rem;
}

.skeleton-title {
  width: min(70%, 32rem);
  height: 2.2rem;
  margin-top: 0.8rem;
}

.skeleton-line {
  width: min(90%, 48rem);
  height: 0.9rem;
  margin-top: 0.8rem;
}

.skeleton-line.short {
  width: min(60%, 30rem);
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
  width: 100%;
  margin-top: 1.2rem;
}

.skeleton-meta {
  height: 1.8rem;
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  50% { opacity: 0.55; }
}

@media (max-width: 760px) {
  .detail-shell {
    width: min(100% - 1rem, 1120px);
    padding-top: 1rem;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .facts-panel {
    order: -1;
  }

  .skeleton-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.dark .collaboration-detail-page {
  background: rgb(15 23 42);
  color: rgb(241 245 249);
}

.dark .detail-hero,
.dark .content-section,
.dark .facts-panel,
.dark .state-panel,
.dark .icon-button,
.dark .secondary-button {
  border-color: rgb(51 65 85);
  background: rgb(30 41 59);
  color: rgb(226 232 240);
}

.dark .description,
.dark .long-copy,
.dark .detail-meta,
.dark .muted-text,
.dark .state-panel p,
.dark .detail-list dt {
  color: rgb(148 163 184);
}

.dark .detail-list div {
  border-color: rgb(51 65 85);
}

.dark .detail-list dd {
  color: rgb(226 232 240);
}

.dark .readonly-note {
  background: rgb(15 23 42);
  color: rgb(148 163 184);
}

.dark .skeleton {
  background: rgb(51 65 85);
}

/* Community reading layout */
.collaboration-detail-page {
  background: var(--surface-2);
  color: var(--text-primary);
}

.detail-shell {
  width: min(1080px, calc(100% - 2.5rem));
  padding: 1.25rem 0 4.5rem;
}

.detail-toolbar {
  margin-bottom: 1.5rem;
}

.back-link {
  color: var(--text-muted);
  font-size: 0.86rem;
  font-weight: 650;
}

.back-link:hover {
  color: var(--primary-600);
  text-decoration: none;
}

.icon-button,
.primary-button,
.secondary-button {
  min-height: 2.5rem;
  border-radius: var(--radius-control);
  transition: border-color 180ms ease, background-color 180ms ease, color 180ms ease;
}

.icon-button {
  border-color: var(--border-subtle);
  background: var(--surface);
  color: var(--text-muted);
}

.icon-button:hover:not(:disabled),
.secondary-button:hover {
  border-color: color-mix(in srgb, var(--primary-500) 45%, var(--border-subtle));
  background: var(--primary-50);
  color: var(--primary-700);
}

.primary-button {
  background: var(--primary-600);
}

.primary-button:hover {
  background: var(--primary-700);
}

.reading-header {
  border: 0;
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  padding: 1rem 0 2rem;
}

.reading-header h1 {
  max-width: 24ch;
  margin-top: 0.85rem;
  color: var(--text-strong);
  font-size: 2.35rem;
  line-height: 1.2;
  letter-spacing: 0;
  text-wrap: balance;
}

.description,
.long-copy {
  max-width: 72ch;
  color: var(--text-primary);
  font-size: 1rem;
  line-height: 1.85;
  text-wrap: pretty;
}

.description {
  margin-top: 1rem;
  font-size: 1.06rem;
}

.detail-meta {
  margin-top: 1.25rem;
  color: var(--text-muted);
  row-gap: 0.5rem;
}

.status-badge,
.meta-label {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--text-muted);
  font-weight: 700;
}

.status-badge {
  border-color: color-mix(in srgb, var(--success) 28%, var(--border-subtle));
  background: color-mix(in srgb, var(--success) 8%, var(--surface));
  color: color-mix(in srgb, var(--success) 72%, var(--text-strong));
}

.detail-grid {
  grid-template-columns: minmax(0, 1fr) 292px;
  gap: 2rem;
  margin-top: 2rem;
}

.main-column {
  gap: 0;
}

.content-section,
.facts-panel,
.action-section {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  box-shadow: none;
}

.content-section {
  margin-bottom: 1rem;
  padding: 1.5rem;
}

.side-column {
  display: grid;
  align-content: start;
  gap: 1rem;
}

.action-section,
.facts-panel {
  padding: 1.15rem;
}

.action-section {
  position: sticky;
  top: calc(var(--community-header-height) + 1rem);
  border-color: color-mix(in srgb, var(--primary-500) 24%, var(--border-subtle));
}

.section-heading {
  margin-bottom: 1rem;
}

.section-heading h2 {
  margin-top: 0.18rem;
  color: var(--text-strong);
  font-size: 1.12rem;
  letter-spacing: 0;
  text-wrap: balance;
}

.section-kicker {
  color: var(--text-muted);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0;
}

.section-icon {
  color: var(--primary-500);
}

.action-copy {
  margin: 0 0 1rem;
  color: var(--text-muted);
  font-size: 0.84rem;
  line-height: 1.7;
}

.full-width {
  width: 100%;
}

.action-section .secondary-button {
  margin-top: 0.65rem;
}

.detail-list div {
  border-color: var(--border-subtle);
}

.detail-list dt,
.muted-text {
  color: var(--text-muted);
}

.detail-list dd {
  color: var(--text-strong);
}

.readonly-note {
  border: 1px solid var(--border-subtle);
  background: var(--surface-2);
  color: var(--text-muted);
}

.state-panel {
  border-color: var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  box-shadow: none;
}

@media (max-width: 760px) {
  .detail-shell {
    width: min(100% - 1.25rem, 1080px);
    padding-top: 0.75rem;
  }

  .detail-toolbar {
    margin-bottom: 0.75rem;
  }

  .reading-header {
    padding: 0.75rem 0 1.5rem;
  }

  .reading-header h1 {
    max-width: none;
    font-size: 1.8rem;
    line-height: 1.25;
  }

  .description {
    font-size: 1rem;
    line-height: 1.75;
  }

  .detail-meta {
    align-items: flex-start;
    flex-direction: column;
  }

  .detail-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-top: 1rem;
  }

  .content-section,
  .action-section,
  .facts-panel {
    padding: 1rem;
  }

  .side-column {
    order: -1;
  }

  .action-section {
    position: static;
  }

  .facts-panel {
    order: initial;
  }

  .primary-button,
  .secondary-button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .icon-button,
  .primary-button,
  .secondary-button {
    transition: none;
  }

  .spin,
  .skeleton {
    animation: none;
  }
}
</style>
