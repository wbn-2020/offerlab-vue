<template>
  <div class="app-shell">
    <AppHeader />

    <main class="mx-auto max-w-6xl px-4 py-8">
      <section class="surface-card p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="max-w-3xl">
            <span class="stage4-kicker">阶段 4 差异化品牌</span>
            <h1 class="mt-3 text-3xl font-black tracking-normal text-slate-950 dark:text-white">
              知识关系探索
            </h1>
            <p class="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              轻量查看内容、标签、专题、领域和系列之间的关系，用于发现结构化连接，而不是做重型知识图谱。
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <RouterLink to="/growth/profile" class="secondary-action">
              成长档案
            </RouterLink>
            <RouterLink to="/certification/apply" class="secondary-action">
              专家认证
            </RouterLink>
          </div>
        </div>
      </section>

      <section class="surface-card mt-6 p-6">
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.1fr_1.1fr_0.8fr]">
          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">领域种子</span>
            <select v-model.number="filters.domain" class="filter-input">
              <option :value="0">不限定领域</option>
              <option v-for="domain in localDomainConfigs" :key="domain.domain" :value="domain.domain">
                {{ domain.icon }} {{ domain.domainName }}
              </option>
            </select>
          </label>

          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">扩散上限</span>
            <select v-model.number="filters.limit" class="filter-input">
              <option :value="6">6</option>
              <option :value="8">8</option>
              <option :value="12">12</option>
            </select>
          </label>

          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <button type="button" class="primary-action" @click="applyFilters">
              更新关系图
            </button>
            <button type="button" class="secondary-action" @click="resetFilters">
              重置为默认种子
            </button>
          </div>
        </div>

        <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">帖子 ID</span>
            <input v-model.trim="filters.postId" class="filter-input" placeholder="可选" />
          </label>
          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">标签 ID</span>
            <input v-model.trim="filters.tagId" class="filter-input" placeholder="可选" />
          </label>
          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">专题 ID</span>
            <input v-model.trim="filters.topicId" class="filter-input" placeholder="可选" />
          </label>
          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">系列 ID</span>
            <input v-model.trim="filters.seriesId" class="filter-input" placeholder="可选" />
          </label>
        </div>
      </section>

      <section class="mt-6">
        <LoadingSkeleton v-if="loading" />

        <div v-else-if="error" class="surface-card p-6">
          <h2 class="text-lg font-black text-slate-950 dark:text-white">知识关系暂时不可用</h2>
          <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{{ error }}</p>
          <button type="button" class="primary-action mt-4" @click="loadGraph">
            重新加载
          </button>
        </div>

        <EmptyState
          v-else-if="!graph || !graph.nodes.length"
          title="当前种子下还没有关系数据"
          description="可以换一个领域，或者补充帖子、标签、专题、系列中的任一 ID 作为探索入口。"
        />

        <div v-else class="space-y-6">
          <section class="grid gap-4 sm:grid-cols-3">
            <article class="surface-card stat-card p-5">
              <span class="stat-label">节点</span>
              <strong>{{ graph.nodes.length }}</strong>
              <p>当前关系图中的实体数量</p>
            </article>
            <article class="surface-card stat-card p-5">
              <span class="stat-label">边</span>
              <strong>{{ graph.edges.length }}</strong>
              <p>当前种子扩散出来的轻量连接</p>
            </article>
            <article class="surface-card stat-card p-5">
              <span class="stat-label">种子提示</span>
              <strong>{{ activeSeedSummary }}</strong>
              <p>领域优先，其他 ID 会作为补充入口</p>
            </article>
          </section>

          <section class="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <article class="surface-card p-6">
              <div class="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 class="text-lg font-black text-slate-950 dark:text-white">节点分组</h2>
                  <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    按实体类型快速浏览当前关系图包含的主要节点。
                  </p>
                </div>
              </div>
              <div class="space-y-4">
                <div v-for="group in groupedNodes" :key="group.type">
                  <div class="mb-2 flex items-center justify-between gap-3">
                    <strong class="text-sm text-slate-900 dark:text-slate-100">{{ group.label }}</strong>
                    <span class="text-xs text-slate-500 dark:text-slate-400">{{ group.nodes.length }} 个</span>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <template v-for="node in group.nodes" :key="node.key">
                      <RouterLink
                        v-if="node.type === 'post'"
                        :to="postNodeLink(node.key)"
                        class="node-chip node-chip-link"
                      >
                        {{ node.label }}
                      </RouterLink>
                      <span v-else class="node-chip">
                        {{ node.label }}
                      </span>
                    </template>
                  </div>
                </div>
              </div>
            </article>

            <article class="surface-card p-6">
              <div class="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 class="text-lg font-black text-slate-950 dark:text-white">关系边</h2>
                  <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    当前 PoC 重点展示 domain-post、post-tag、topic-tag、series-post 这类轻量连接。
                  </p>
                </div>
              </div>
              <div class="space-y-3">
                <div v-for="edge in graph.edges" :key="edgeKey(edge)" class="edge-row">
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {{ nodeLabel(edge.source) }} -> {{ nodeLabel(edge.target) }}
                    </div>
                    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {{ relationLabel(edge.relation) }} / 权重 {{ edge.weight }}
                    </p>
                  </div>
                  <span class="relation-chip">{{ edge.relation }}</span>
                </div>
              </div>
            </article>
          </section>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import { getErrorMessage } from '@/api/client'
import { knowledgeApi } from '@/api/knowledge'
import { localDomainConfigs } from '@/api/domains'
import type { KnowledgeRelationEdge, KnowledgeRelationGraph, KnowledgeRelationNode } from '@/api/types'
import { DOMAIN, getDomainLabel } from '@/utils/domains'

const route = useRoute()
const router = useRouter()

interface KnowledgeExploreFilters {
  domain: number
  postId: string
  tagId: string
  topicId: string
  seriesId: string
  limit: number
}

const filters = reactive<KnowledgeExploreFilters>({
  domain: DOMAIN.TECH,
  postId: '',
  tagId: '',
  topicId: '',
  seriesId: '',
  limit: 8,
})

const graph = ref<KnowledgeRelationGraph | null>(null)
const loading = ref(false)
const error = ref('')

const groupLabelMap: Record<string, string> = {
  domain: '领域',
  post: '内容',
  tag: '标签',
  topic: '专题',
  series: '系列',
}

const relationLabel = (relation: string) => {
  switch (relation) {
    case 'domain_post':
      return '领域 -> 内容'
    case 'post_tag':
      return '内容 -> 标签'
    case 'topic_tag':
      return '专题 -> 标签'
    case 'series_post':
      return '系列 -> 内容'
    default:
      return relation
  }
}

const groupedNodes = computed(() => {
  const grouped = new Map<string, KnowledgeRelationNode[]>()
  for (const node of graph.value?.nodes || []) {
    const bucket = grouped.get(node.type) || []
    bucket.push(node)
    grouped.set(node.type, bucket)
  }
  return [...grouped.entries()].map(([type, nodes]) => ({
    type,
    label: groupLabelMap[type] || type,
    nodes,
  }))
})

const nodeMap = computed(() => new Map((graph.value?.nodes || []).map((item) => [item.key, item])))
const nodeLabel = (key: string) => nodeMap.value.get(key)?.label || key

const activeSeedSummary = computed(() => {
  const items = [
    filters.postId && `post:${filters.postId}`,
    filters.tagId && `tag:${filters.tagId}`,
    filters.topicId && `topic:${filters.topicId}`,
    filters.seriesId && `series:${filters.seriesId}`,
    filters.domain ? getDomainLabel(filters.domain) : '',
  ].filter(Boolean)
  return items.length ? items.join(' / ') : '默认领域'
})

const normalizePositiveInt = (value: unknown, fallback = 0) => {
  const next = Number(value)
  return Number.isFinite(next) && next > 0 ? Math.round(next) : fallback
}

const syncFromRoute = () => {
  filters.domain = normalizePositiveInt(route.query.domain, DOMAIN.TECH)
  filters.postId = typeof route.query.postId === 'string' ? route.query.postId : ''
  filters.tagId = typeof route.query.tagId === 'string' ? route.query.tagId : ''
  filters.topicId = typeof route.query.topicId === 'string' ? route.query.topicId : ''
  filters.seriesId = typeof route.query.seriesId === 'string' ? route.query.seriesId : ''
  filters.limit = normalizePositiveInt(route.query.limit, 8) || 8
}

const queryFromFilters = () => ({
  ...(filters.domain ? { domain: String(filters.domain) } : {}),
  ...(filters.postId ? { postId: filters.postId } : {}),
  ...(filters.tagId ? { tagId: filters.tagId } : {}),
  ...(filters.topicId ? { topicId: filters.topicId } : {}),
  ...(filters.seriesId ? { seriesId: filters.seriesId } : {}),
  limit: String(filters.limit || 8),
})

const loadGraph = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await knowledgeApi.explore({
      domain: filters.domain || undefined,
      postId: filters.postId || undefined,
      tagId: filters.tagId || undefined,
      topicId: filters.topicId || undefined,
      seriesId: filters.seriesId || undefined,
      limit: filters.limit || 8,
    })
    graph.value = res.data
  } catch (err) {
    graph.value = null
    error.value = getErrorMessage(err, '加载知识关系失败')
  } finally {
    loading.value = false
  }
}

const applyFilters = async () => {
  await router.push({ path: '/knowledge/explore', query: queryFromFilters() })
}

const resetFilters = async () => {
  filters.domain = DOMAIN.TECH
  filters.postId = ''
  filters.tagId = ''
  filters.topicId = ''
  filters.seriesId = ''
  filters.limit = 8
  await applyFilters()
}

const edgeKey = (edge: KnowledgeRelationEdge) => `${edge.source}->${edge.target}:${edge.relation}`
const postNodeLink = (key: string) => `/post/${key.split(':')[1] || ''}`

watch(() => route.fullPath, async () => {
  syncFromRoute()
  await loadGraph()
}, { immediate: true })
</script>

<style scoped>
.stage4-kicker {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgb(224 242 254);
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(3 105 161);
}

.stat-card strong {
  display: block;
  margin-top: 0.65rem;
  font-size: 1.9rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.stat-card p {
  margin-top: 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: rgb(100 116 139);
}

.stat-label,
.node-chip,
.relation-chip {
  border-radius: 999px;
  font-weight: 800;
}

.stat-label {
  display: inline-flex;
  background: rgb(241 245 249);
  padding: 0.3rem 0.65rem;
  font-size: 0.75rem;
  color: rgb(71 85 105);
}

.node-chip,
.relation-chip {
  display: inline-flex;
  align-items: center;
  background: rgb(241 245 249);
  padding: 0.45rem 0.75rem;
  font-size: 0.75rem;
  color: rgb(51 65 85);
}

.node-chip-link {
  transition: background-color 0.15s ease, color 0.15s ease;
}

.node-chip-link:hover {
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.edge-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 1rem;
  background: rgb(255 255 255 / 0.82);
  padding: 0.95rem 1rem;
}

.relation-chip {
  flex-shrink: 0;
}

.dark .stage4-kicker {
  background: rgb(8 47 73);
  color: rgb(125 211 252);
}

.dark .stat-card strong {
  color: rgb(241 245 249);
}

.dark .stat-card p {
  color: rgb(148 163 184);
}

.dark .stat-label,
.dark .node-chip,
.dark .relation-chip {
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}

.dark .node-chip-link:hover {
  background: rgb(15 23 42);
  color: rgb(191 219 254);
}

.dark .edge-row {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42 / 0.88);
}
</style>
