<template>
  <section
    class="community-space-panel"
    data-v8-community-space
    :data-community-space-state="state"
  >
    <div class="space-head">
      <div class="min-w-0">
        <p class="space-eyebrow">公共空间</p>
        <h2>{{ spaceTitle }}</h2>
        <p class="space-intro">
          这里展示服务端确认仍然公开的内容、共建关系和知识入口；私密、草稿及治理隐藏项不会出现在此处。
        </p>
      </div>
      <RouterLink
        v-if="space?.canonicalPath && space.visibility === 'PUBLIC'"
        :to="space.canonicalPath"
        class="space-link"
      >
        查看公开入口
      </RouterLink>
    </div>

    <div v-if="loading" class="space-state" data-community-space-state="loading" role="status">
      <RefreshCcw class="h-4 w-4 animate-spin" />
      <span>正在读取公共空间...</span>
    </div>

    <div v-else-if="errorText && !space" class="space-state space-state-error" data-community-space-state="error">
      <AlertCircle class="h-4 w-4" />
      <div>
        <strong>公共空间暂时无法打开</strong>
        <p>{{ errorText }}</p>
      </div>
      <button type="button" class="space-button" @click="retry">重试</button>
    </div>

    <template v-else-if="space">
      <div v-if="partialNotice" class="space-notice" role="status">
        <AlertCircle class="h-4 w-4 flex-shrink-0" />
        <span>{{ partialNotice }}</span>
      </div>

      <div v-if="hasVisibleContent" class="space-content">
        <div class="space-metrics" aria-label="公开空间摘要">
          <div class="space-metric">
            <span>公开内容</span>
            <strong>{{ space.governanceSummary?.publicItemCount ?? space.representativeItems.length }}</strong>
          </div>
          <div class="space-metric">
            <span>公开贡献</span>
            <strong>{{ space.governanceSummary?.publicContributionCount ?? space.relatedContributions.length }}</strong>
          </div>
          <div class="space-metric">
            <span>空间状态</span>
            <strong>{{ space.governanceSummary?.publicStatus || '公开可浏览' }}</strong>
          </div>
        </div>

        <div v-if="space.representativeItems.length" class="space-section">
          <div class="space-section-head">
            <div>
              <h3><Layers3 class="h-4 w-4" />代表内容</h3>
              <p>按当前公开投影返回的内容样本。</p>
            </div>
          </div>
          <div class="space-item-list">
            <article v-for="item in space.representativeItems" :key="String(item.id)" class="space-item">
              <div class="min-w-0">
                <p class="space-item-kicker">公开内容<span v-if="item.anonymous"> · 匿名发布</span></p>
                <h4>{{ item.title }}</h4>
                <p v-if="item.summary">{{ item.summary }}</p>
              </div>
              <RouterLink :to="postPath(item.id)" class="space-button">阅读</RouterLink>
            </article>
          </div>
        </div>

        <div v-if="space.latestUpdates.length" class="space-section">
          <div class="space-section-head">
            <div>
              <h3><RefreshCcw class="h-4 w-4" />最近公开更新</h3>
              <p>只展示已发布更新摘要，不会在这里修改通知已读状态。</p>
            </div>
          </div>
          <div class="space-item-list">
            <article v-for="item in space.latestUpdates" :key="item.eventId" class="space-item">
              <div class="min-w-0">
                <p class="space-item-kicker">{{ item.sourceType || 'PUBLIC_UPDATE' }}<span v-if="item.resultVersion"> · v{{ item.resultVersion }}</span></p>
                <h4>{{ item.title }}</h4>
                <p v-if="item.summary">{{ item.summary }}</p>
                <small v-if="item.updatedAt">{{ formatOptionalTime(item.updatedAt) }}</small>
              </div>
              <RouterLink v-if="item.targetPath" :to="item.targetPath" class="space-button">查看</RouterLink>
            </article>
          </div>
        </div>

        <div v-if="space.relatedNeeds.length || space.relatedContributions.length" class="space-columns">
          <section v-if="space.relatedNeeds.length" class="space-section">
            <div class="space-section-head">
              <div>
                <h3><Compass class="h-4 w-4" />相关共建需求</h3>
                <p>需求仍需以公开状态为准。</p>
              </div>
            </div>
            <div class="space-item-list">
              <article v-for="item in space.relatedNeeds" :key="String(item.id)" class="space-item compact">
                <div class="min-w-0">
                  <h4>{{ item.title }}</h4>
                  <p v-if="item.description">{{ item.description }}</p>
                  <small>{{ item.status || '公开需求' }}</small>
                </div>
                <RouterLink v-if="item.targetPath" :to="item.targetPath" class="space-button">查看</RouterLink>
              </article>
            </div>
          </section>

          <section v-if="space.relatedContributions.length" class="space-section">
            <div class="space-section-head">
              <div>
                <h3><Sparkles class="h-4 w-4" />公开贡献</h3>
                <p>仅显示当前空间可归因的公开贡献。</p>
              </div>
            </div>
            <div class="space-item-list">
              <article v-for="item in space.relatedContributions" :key="String(item.contributionId)" class="space-item compact">
                <div class="min-w-0">
                  <h4>{{ item.title }}</h4>
                  <p>{{ item.contributionType || '社区共建' }}<span v-if="item.createTime"> · {{ formatOptionalTime(item.createTime) }}</span></p>
                </div>
                <RouterLink v-if="item.targetPath" :to="item.targetPath" class="space-button">查看</RouterLink>
              </article>
            </div>
          </section>
        </div>

        <div v-if="knowledgeCount || discoveryCount" class="space-supporting">
          <div v-if="knowledgeCount" class="supporting-item">
            <BookOpen class="h-4 w-4" />
            <span>知识入口 {{ knowledgeCount }} 个</span>
          </div>
          <div v-if="discoveryCount" class="supporting-item">
            <Compass class="h-4 w-4" />
            <span>发现入口 {{ discoveryCount }} 个</span>
          </div>
          <div v-if="space.governanceSummary?.hasPublicMaintenance" class="supporting-item">
            <Wrench class="h-4 w-4" />
            <span>部分内容正在维护</span>
          </div>
        </div>
      </div>

      <div v-else class="space-state" data-community-space-state="empty">
        <BookOpen class="h-4 w-4" />
        <div>
          <strong>{{ space.visibility === 'PUBLIC' ? '暂时没有可展示的公开条目' : '这个空间当前不可公开浏览' }}</strong>
          <p>{{ emptyStateCopy }}</p>
        </div>
      </div>

      <div v-if="hasMore" class="space-more">
        <button type="button" class="space-button" :disabled="loadingMore" @click="loadMore">
          {{ loadingMore ? '加载中...' : '加载更多公开内容' }}
        </button>
        <span v-if="loadMoreError" class="space-more-error">{{ loadMoreError }}</span>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertCircle, BookOpen, Compass, Layers3, RefreshCcw, Sparkles, Wrench } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { getErrorMessage } from '@/api/client'
import {
  communitySpacesApi,
  type CommunitySpace,
  type CommunitySpaceType,
} from '@/api/communitySpaces'
import { formatTime } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'

const props = withDefaults(defineProps<{
  spaceType: CommunitySpaceType
  identifier: string | number
  title?: string
}>(), {
  title: '',
})

const authStore = useAuthStore()
const identityKey = computed(() => `${String(authStore.user?.uid ?? 'anonymous')}:${authStore.token ? 'authenticated' : 'anonymous'}`)
const identifierText = computed(() => String(props.identifier || ''))
const space = ref<CommunitySpace | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const errorText = ref('')
const loadMoreError = ref('')
let requestGeneration = 0

const isCurrentRequest = (
  generation: number,
  kind: CommunitySpaceType,
  identifier: string,
  account: string,
) => generation === requestGeneration
  && kind === props.spaceType
  && identifier === identifierText.value
  && account === identityKey.value

const requestSpace = (cursor?: string) => {
  if (props.spaceType === 'topic') return communitySpacesApi.getTopic(identifierText.value, cursor, 10)
  if (props.spaceType === 'collection') return communitySpacesApi.getCollection(identifierText.value, cursor, 10)
  return communitySpacesApi.getSeries(identifierText.value, cursor, 10)
}

const mergeUnique = <T>(current: T[], incoming: T[], key: (item: T) => string) => {
  const values = new Map<string, T>()
  for (const item of current) values.set(key(item), item)
  for (const item of incoming) values.set(key(item), item)
  return [...values.values()]
}

const mergeSpace = (current: CommunitySpace, incoming: CommunitySpace): CommunitySpace => ({
  ...incoming,
  representativeItems: mergeUnique(
    current.representativeItems,
    incoming.representativeItems,
    (item) => String(item.id),
  ),
  latestUpdates: mergeUnique(
    current.latestUpdates,
    incoming.latestUpdates,
    (item) => item.dedupKey || item.eventId,
  ),
  relatedNeeds: mergeUnique(
    current.relatedNeeds,
    incoming.relatedNeeds,
    (item) => String(item.id),
  ),
  relatedContributions: mergeUnique(
    current.relatedContributions,
    incoming.relatedContributions,
    (item) => String(item.contributionId),
  ),
  degradedSources: [...new Set([...current.degradedSources, ...incoming.degradedSources])],
})

const load = async (append = false) => {
  const kind = props.spaceType
  const identifier = identifierText.value
  const account = identityKey.value
  if (!identifier) {
    space.value = null
    errorText.value = '缺少公共空间标识。'
    return
  }
  if (append) {
    if (!space.value?.hasMore || !space.value.nextCursor || loadingMore.value) return
    loadingMore.value = true
    loadMoreError.value = ''
  } else {
    requestGeneration += 1
    space.value = null
    errorText.value = ''
    loadMoreError.value = ''
    loading.value = true
  }
  const generation = requestGeneration
  try {
    const res = await requestSpace(append ? space.value?.nextCursor : undefined)
    if (!isCurrentRequest(generation, kind, identifier, account)) return
    if (!res.data) {
      if (append) loadMoreError.value = '服务端没有返回下一页。'
      else errorText.value = '服务端没有返回公共空间数据。'
      return
    }
    space.value = append && space.value ? mergeSpace(space.value, res.data) : res.data
  } catch (error) {
    if (!isCurrentRequest(generation, kind, identifier, account)) return
    const message = getErrorMessage(error, '公共空间加载失败')
    if (append) loadMoreError.value = message
    else errorText.value = message
  } finally {
    if (isCurrentRequest(generation, kind, identifier, account)) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

const loadMore = () => {
  void load(true)
}

const hasMore = computed(() => Boolean(space.value?.hasMore && space.value?.nextCursor))
const spaceTitle = computed(() => space.value?.title || props.title || '公共社区空间')
const state = computed(() => {
  if (loading.value && !space.value) return 'loading'
  if (errorText.value && !space.value) return 'error'
  if (space.value && !hasVisibleContent.value) return 'empty'
  return 'ready'
})
const partialNotice = computed(() => {
  if (space.value?.visibility !== 'PUBLIC') return '服务端当前未将这个空间标记为公开，内容条目已停止展示。'
  const sources = space.value?.degradedSources || []
  if (loadMoreError.value) return `部分公开内容加载失败：${loadMoreError.value}，已保留当前可见结果。`
  if (!sources.length) return ''
  return `部分辅助来源暂时不可用（${sources.join('、')}），当前仍展示已确认公开的内容。`
})
const knowledgeCount = computed(() => {
  const knowledge = space.value?.knowledge
  return (knowledge?.assets?.length || 0) + (knowledge?.paths?.length || 0) + (knowledge?.snapshots?.length || 0)
})
const discoveryCount = computed(() => {
  const discovery = space.value?.discovery
  return (discovery?.featuredTopics?.length || 0)
    + (discovery?.channels?.length || 0)
    + (discovery?.contentForms?.length || 0)
    + (discovery?.activeTopics?.length || 0)
    + (discovery?.searchEntrypoints?.length || 0)
})
const hasVisibleContent = computed(() => {
  const value = space.value
  if (!value || value.visibility !== 'PUBLIC') return false
  return value.representativeItems.length > 0
    || value.latestUpdates.length > 0
    || value.relatedNeeds.length > 0
    || value.relatedContributions.length > 0
    || knowledgeCount.value > 0
    || discoveryCount.value > 0
})
const emptyStateCopy = computed(() => space.value?.visibility === 'PUBLIC'
  ? '这个空间目前没有通过公开性和治理过滤的内容，后续更新后会自动出现在这里。'
  : '私密、草稿或治理隐藏状态不会在公共空间中展示。')

const postPath = (id: string | number) => `/post/${encodeURIComponent(String(id))}`
const formatOptionalTime = (value: string) => {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && timestamp > 0 ? formatTime(timestamp) : value
}

const retry = () => {
  void load()
}

watch(
  [() => props.spaceType, identifierText, identityKey],
  () => {
    void load()
  },
  { immediate: true },
)
</script>

<style scoped>
.community-space-panel {
  margin-top: 1.5rem;
  border: 1px solid rgb(169 216 195);
  border-radius: 0.75rem;
  background: var(--surface-soft);
  padding: 1rem;
}

.space-head,
.space-section-head,
.space-item,
.space-state,
.space-notice,
.space-supporting {
  display: flex;
  gap: 0.75rem;
}

.space-head {
  align-items: flex-start;
  justify-content: space-between;
}

.space-eyebrow {
  color: rgb(26 127 90);
  font-size: 0.75rem;
  font-weight: 900;
}

.space-head h2 {
  margin-top: 0.15rem;
  color: var(--text-strong);
  font-size: 1.05rem;
  font-weight: 900;
}

.space-intro,
.space-section-head p,
.space-item p,
.space-item small,
.space-state p,
.space-more-error {
  color: var(--text-primary);
  font-size: 0.8rem;
  line-height: 1.55;
}

.space-intro {
  margin-top: 0.35rem;
  max-width: 58rem;
}

.space-link,
.space-button {
  display: inline-flex;
  min-height: 2.15rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.45rem;
  padding: 0.4rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 800;
}

.space-link {
  background: rgb(205 232 220);
  color: rgb(18 99 74);
}

.space-button {
  border: 1px solid var(--border-subtle);
  background: white;
  color: var(--text-primary);
}

.space-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.space-state {
  margin-top: 1rem;
  min-height: 3.5rem;
  align-items: center;
  border-radius: 0.6rem;
  background: white;
  padding: 0.9rem;
  color: var(--text-primary);
  font-size: 0.85rem;
  font-weight: 700;
}

.space-state strong {
  color: var(--text-strong);
  font-weight: 900;
}

.space-state p {
  margin-top: 0.2rem;
  font-weight: 500;
}

.space-state-error {
  border: 1px solid rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(185 28 28);
}

.space-state-error strong {
  color: rgb(153 27 27);
}

.space-state-error .space-button {
  margin-left: auto;
}

.space-notice {
  margin-top: 1rem;
  align-items: flex-start;
  border-radius: 0.6rem;
  background: rgb(255 251 235);
  padding: 0.7rem 0.8rem;
  color: rgb(146 64 14);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.5;
}

.space-content {
  margin-top: 1rem;
  display: grid;
  gap: 0.85rem;
}

.space-metrics {
  display: grid;
  gap: 0.6rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.space-metric {
  min-width: 0;
  border-radius: 0.6rem;
  background: white;
  padding: 0.7rem;
}

.space-metric span {
  display: block;
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 700;
}

.space-metric strong {
  display: block;
  overflow: hidden;
  margin-top: 0.2rem;
  color: var(--text-strong);
  font-size: 0.9rem;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.space-section {
  min-width: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 0.6rem;
  background: white;
  padding: 0.8rem;
}

.space-section-head {
  align-items: flex-start;
}

.space-section-head h3 {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-strong);
  font-size: 0.86rem;
  font-weight: 900;
}

.space-section-head p {
  margin-top: 0.2rem;
}

.space-item-list {
  margin-top: 0.65rem;
  display: grid;
  gap: 0.5rem;
}

.space-item {
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--border-subtle);
  padding-top: 0.6rem;
}

.space-item:first-child {
  border-top: 0;
  padding-top: 0;
}

.space-item.compact {
  align-items: flex-start;
}

.space-item-kicker {
  color: rgb(26 127 90) !important;
  font-size: 0.7rem !important;
  font-weight: 900;
}

.space-item h4 {
  margin-top: 0.15rem;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 0.84rem;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.space-item p {
  margin-top: 0.18rem;
}

.space-item small {
  display: block;
  margin-top: 0.18rem;
}

.space-columns {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.space-supporting {
  flex-wrap: wrap;
  align-items: center;
  color: var(--text-primary);
  font-size: 0.78rem;
  font-weight: 800;
}

.supporting-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  background: white;
  padding: 0.35rem 0.6rem;
}

.space-more {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  margin-top: 0.9rem;
}

@media (max-width: 720px) {
  .space-head {
    flex-direction: column;
  }

  .space-link {
    width: 100%;
  }

  .space-metrics,
  .space-columns {
    grid-template-columns: 1fr;
  }

  .space-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .space-item .space-button {
    width: 100%;
  }
}

.dark .community-space-panel {
  border-color: rgb(10 52 39);
  background: var(--surface-1);
}

.dark .space-head h2,
.dark .space-section-head h3,
.dark .space-item h4,
.dark .space-state strong,
.dark .space-metric strong {
  color: var(--text-strong);
}

.dark .space-intro,
.dark .space-section-head p,
.dark .space-item p,
.dark .space-item small,
.dark .space-state p,
.dark .space-supporting,
.dark .space-more-error {
  color: var(--text-muted);
}

.dark .space-link,
.dark .space-metric,
.dark .space-section,
.dark .space-state,
.dark .supporting-item,
.dark .space-button {
  border-color: var(--border-subtle);
  background: var(--surface-1);
}

.dark .space-link {
  color: rgb(169 216 195);
}

.dark .space-button {
  color: var(--text-primary);
}

.dark .space-notice {
  background: rgb(69 26 3);
  color: rgb(253 186 116);
}

.dark .space-state-error {
  border-color: rgb(127 29 29);
  background: rgb(69 10 10);
  color: rgb(254 202 202);
}

.dark .space-state-error strong {
  color: rgb(254 202 202);
}

.dark .space-item {
  border-color: var(--border-subtle);
}

.dark .space-metric span {
  color: var(--text-muted);
}
</style>
