<template>
  <div class="collaboration-detail-page">
    <AppHeader />

    <main class="detail-shell">
      <div class="detail-toolbar">
        <RouterLink :to="collaborationHubLocation('discussions')" class="back-link">
          <ArrowLeft class="icon" aria-hidden="true" />
          返回结构化讨论
        </RouterLink>
        <button
          type="button"
          class="icon-button"
          :disabled="loading"
          title="刷新讨论详情"
          aria-label="刷新讨论详情"
          @click="loadDetail"
        >
          <RefreshCw class="icon" :class="{ spin: loading }" aria-hidden="true" />
        </button>
      </div>

      <section v-if="loading" class="state-panel loading-panel" aria-label="讨论详情加载中">
        <span class="skeleton skeleton-kicker" />
        <span class="skeleton skeleton-title" />
        <span class="skeleton skeleton-line" />
        <span class="skeleton skeleton-line short" />
      </section>

      <section v-else-if="errorMessage" class="state-panel error-panel" role="alert">
        <AlertCircle class="state-icon" aria-hidden="true" />
        <div>
          <h1>{{ invalidId ? '链接中的讨论编号无效' : '讨论详情暂时无法打开' }}</h1>
          <p>{{ errorMessage }}</p>
        </div>
        <button v-if="!invalidId" type="button" class="secondary-button" @click="loadDetail">
          <RefreshCw class="icon" aria-hidden="true" />
          重试
        </button>
        <RouterLink v-else :to="collaborationHubLocation('discussions')" class="secondary-button">
          返回结构化讨论
        </RouterLink>
      </section>

      <template v-else-if="discussion">
        <section class="detail-hero">
          <div class="eyebrow-row">
            <span class="status-badge" :data-status="discussion.status">
              <CircleDot class="icon-small" aria-hidden="true" />
              {{ statusLabel(discussion.status) }}
            </span>
            <span class="meta-label">{{ domainLabel(discussion.domain) }}</span>
            <span class="meta-label">来源帖子 #{{ discussion.sourcePostId }}</span>
            <span class="meta-label">讨论 #{{ discussion.id }}</span>
          </div>
          <h1>{{ discussion.title }}</h1>
          <p class="description">{{ discussion.prompt }}</p>

          <div class="detail-meta">
            <span><UserRound class="icon-small" aria-hidden="true" />发起者 UID {{ discussion.creatorUid }}</span>
            <span><CalendarDays class="icon-small" aria-hidden="true" />更新于 {{ formatDate(discussion.updateTime) }}</span>
            <span><ListChecks class="icon-small" aria-hidden="true" />{{ discussion.voteCount }} 票</span>
          </div>

          <div class="action-bar">
            <RouterLink :to="collaborationHubLocation('discussions')" class="primary-button">
              <Scale class="icon" aria-hidden="true" />
              回到讨论区参与
            </RouterLink>
            <a
              v-if="sourcePostPath"
              :href="sourcePostPath"
              class="secondary-button"
            >
              <ExternalLink class="icon" aria-hidden="true" />
              查看来源帖子
            </a>
          </div>
        </section>

        <div class="detail-grid">
          <div class="main-column">
            <section class="content-section">
              <div class="section-heading">
                <div>
                  <span class="section-kicker">DISCUSSION OPTIONS</span>
                  <h2>投票选项</h2>
                </div>
                <ListChecks class="section-icon" aria-hidden="true" />
              </div>
              <div class="option-list" role="list">
                <div v-for="option in discussion.options" :key="option.id" class="option-row" role="listitem">
                  <div class="option-copy">
                    <span class="option-marker">{{ option.sortOrder + 1 }}</span>
                    <strong>{{ option.text }}</strong>
                  </div>
                  <span class="option-votes">
                    {{ option.voteCount }} 票
                    <span v-if="option.selected" class="selected-label">已选择</span>
                  </span>
                </div>
              </div>
            </section>

            <section v-if="discussion.summary || discussion.authorFollowUp" class="content-section">
              <div class="section-heading">
                <div>
                  <span class="section-kicker">OUTCOME</span>
                  <h2>讨论结论</h2>
                </div>
                <CheckCircle2 class="section-icon" aria-hidden="true" />
              </div>
              <p v-if="discussion.summary" class="long-copy">{{ discussion.summary }}</p>
              <p v-if="discussion.authorFollowUp" class="long-copy follow-up">
                <strong>后续行动：</strong>{{ discussion.authorFollowUp }}
              </p>
            </section>
          </div>

          <aside class="facts-panel">
            <div class="section-heading compact">
              <div>
                <span class="section-kicker">DETAILS</span>
                <h2>基本信息</h2>
              </div>
              <Info class="section-icon" aria-hidden="true" />
            </div>
            <dl class="detail-list">
              <div>
                <dt>当前状态</dt>
                <dd>{{ statusLabel(discussion.status) }}</dd>
              </div>
              <div>
                <dt>共识状态</dt>
                <dd>{{ consensusLabel(discussion.consensusState) }}</dd>
              </div>
              <div>
                <dt>创建时间</dt>
                <dd>{{ formatDate(discussion.createTime) }}</dd>
              </div>
              <div>
                <dt>最近更新</dt>
                <dd>{{ formatDate(discussion.updateTime) }}</dd>
              </div>
            </dl>
            <p class="readonly-note">
              <LockKeyhole class="icon-small" aria-hidden="true" />
              详情页不直接提交投票或总结，所有写动作仍由现有讨论工作台和权限校验负责。
            </p>
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
  ExternalLink,
  Info,
  ListChecks,
  LockKeyhole,
  RefreshCw,
  Scale,
  UserRound,
} from 'lucide-vue-next'
import { getErrorMessage } from '@/api/client'
import {
  collaborationApi,
  type DiscussionConsensusState,
  type StructuredDiscussion,
  type StructuredDiscussionStatus,
} from '@/api/collaboration'
import { localDomainConfigs } from '@/api/domains'
import AppHeader from '@/components/layout/AppHeader.vue'
import {
  collaborationHubLocation,
  collaborationResourcePath,
  normalizeCollaborationId,
} from '@/utils/collaborationRoutes'
import { applyPageSeo } from '@/utils/seo'

const route = useRoute()
const discussionId = computed(() => normalizeCollaborationId(route.params.discussionId))
const invalidId = computed(() => !discussionId.value)
const discussion = ref<StructuredDiscussion | null>(null)
const loading = ref(false)
const errorMessage = ref('')

const statusLabels: Record<StructuredDiscussionStatus, string> = {
  OPEN: '投票中',
  SUMMARIZED: '已总结',
  CLOSED: '已关闭',
}

const consensusLabels: Record<DiscussionConsensusState, string> = {
  REACHED: '已形成共识',
  PARTIAL: '形成部分共识',
  NOT_REACHED: '暂未形成共识',
}

const domainLabel = (domain: number) => (
  localDomainConfigs.find((item) => Number(item.domain) === Number(domain))?.domainName
  || `领域 ${domain}`
)

const statusLabel = (status: StructuredDiscussionStatus) => statusLabels[status] || status
const consensusLabel = (state?: DiscussionConsensusState | null) => state ? consensusLabels[state] : '暂未总结'
const sourcePostPath = computed(() => (
  normalizeCollaborationId(discussion.value?.sourcePostId)
    ? `/post/${encodeURIComponent(String(discussion.value?.sourcePostId))}`
    : ''
))

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
  const id = discussionId.value
  discussion.value = null
  errorMessage.value = ''
  if (!id) {
    errorMessage.value = '请使用正整数讨论编号打开详情。'
    return
  }

  loading.value = true
  try {
    const response = await collaborationApi.discussions.detail(id)
    discussion.value = response.data || null
    if (!discussion.value) errorMessage.value = '服务端没有返回这项讨论。'
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '结构化讨论加载失败')
  } finally {
    loading.value = false
  }
}

watch(discussionId, () => {
  void loadDetail()
}, { immediate: true })

watch([discussion, discussionId, errorMessage], () => {
  applyPageSeo({
    title: discussion.value?.title || (errorMessage.value ? '结构化讨论详情' : '结构化讨论'),
    description: discussion.value?.prompt || '结构化讨论详情。',
    canonical: collaborationResourcePath('discussion', discussionId.value) || '/collaboration/discussions',
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
.eyebrow-row,
.option-copy,
.option-votes {
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

.icon {
  width: 1rem;
  height: 1rem;
  flex: none;
}

.icon-small {
  width: 0.9rem;
  height: 0.9rem;
  flex: none;
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
  background: rgb(254 249 195);
  color: rgb(133 77 14);
}

.status-badge[data-status='CLOSED'] {
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

.option-list {
  display: grid;
  gap: 0.55rem;
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.5rem;
  padding: 0.75rem;
}

.option-copy {
  min-width: 0;
}

.option-copy strong {
  overflow-wrap: anywhere;
}

.option-marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: rgb(219 234 254);
  color: rgb(30 64 175);
  font-size: 0.76rem;
  font-weight: 900;
}

.option-votes {
  flex: none;
  color: rgb(100 116 139);
  font-size: 0.78rem;
}

.selected-label {
  border-radius: 999px;
  background: rgb(220 252 231);
  padding: 0.2rem 0.45rem;
  color: rgb(22 101 52);
  font-weight: 800;
}

.follow-up {
  margin-top: 0.8rem;
}

.muted-text {
  margin: 0;
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
  color: rgb(100 116 139);
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
.dark .detail-list dt,
.dark .option-votes {
  color: rgb(148 163 184);
}

.dark .detail-list div,
.dark .option-row {
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
</style>
