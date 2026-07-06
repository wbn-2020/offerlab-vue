<template>
  <div class="app-shell">
    <AppHeader />

    <main class="mx-auto max-w-6xl px-4 py-8">
      <section class="surface-card p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="max-w-3xl">
            <span class="insight-kicker">Knowledge assets</span>
            <h1 class="mt-3 text-3xl font-black tracking-normal text-slate-950 dark:text-white">
              Community Knowledge Explore
            </h1>
            <p class="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Explore public posts, series, topics, tags, and search entries as community knowledge assets. This page only provides public reading suggestions and never creates personal routes or completion requirements.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <RouterLink to="/search?sort=hot" class="secondary-action">Search</RouterLink>
            <RouterLink to="/explore" class="secondary-action">Explore</RouterLink>
          </div>
        </div>
      </section>

      <section class="surface-card mt-6 p-6">
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_0.8fr]">
          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Domain seed</span>
            <select v-model.number="filters.domain" class="filter-input">
              <option :value="0">Any domain</option>
              <option v-for="domain in localDomainConfigs" :key="domain.domain" :value="domain.domain">
                {{ domain.icon }} {{ domain.domainName }}
              </option>
            </select>
          </label>

          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Limit</span>
            <select v-model.number="filters.limit" class="filter-input">
              <option :value="6">6</option>
              <option :value="8">8</option>
              <option :value="12">12</option>
            </select>
          </label>

          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <button type="button" class="primary-action" @click="applyFilters">Refresh</button>
            <button type="button" class="secondary-action" @click="resetFilters">Reset</button>
          </div>
        </div>

        <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Asset ID</span>
            <input v-model.trim="filters.assetId" class="filter-input" placeholder="optional" />
          </label>
          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Asset type</span>
            <select v-model="filters.assetType" class="filter-input">
              <option value="">Any type</option>
              <option value="post">Post</option>
              <option value="series">Series</option>
              <option value="collection">Collection</option>
              <option value="topic">Topic</option>
              <option value="tag">Tag</option>
              <option value="search_entry">Search entry</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Post ID</span>
            <input v-model.trim="filters.postId" class="filter-input" placeholder="optional" />
          </label>
          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Tag ID</span>
            <input v-model.trim="filters.tagId" class="filter-input" placeholder="optional" />
          </label>
          <label class="block">
            <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Topic ID</span>
            <input v-model.trim="filters.topicId" class="filter-input" placeholder="optional" />
          </label>
        </div>
      </section>

      <section class="mt-6">
        <LoadingSkeleton v-if="loading" />

        <div v-else-if="error" class="surface-card p-6">
          <h2 class="text-lg font-black text-slate-950 dark:text-white">Knowledge assets are unavailable</h2>
          <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{{ error }}</p>
          <button type="button" class="primary-action mt-4" @click="loadGraph">Retry</button>
        </div>

        <EmptyState
          v-else-if="!graph || (!graph.assets.length && !graph.paths.length && !visibleGaps.length && !graph.snapshots.length && !graph.nodes.length)"
          title="No public knowledge assets for this seed"
          description="Try another domain, post, tag, topic, or public asset seed."
        />

        <div v-else class="space-y-6">
          <section class="grid gap-4 sm:grid-cols-3">
            <article class="surface-card stat-card p-5">
              <span class="stat-label">公共知识资产 PublicKnowledgeAsset</span>
              <strong>{{ graph.assets.length }}</strong>
              <p>Formal assets only use active or archived lifecycle states.</p>
            </article>
            <article class="surface-card stat-card p-5">
              <span class="stat-label">知识关系 KnowledgeRelation</span>
              <strong>{{ visibleRelations.length }}</strong>
              <p>fallback/demo/local-only sources are read-only diagnostics. 只读诊断，不会写入正式资产。</p>
            </article>
            <article class="surface-card stat-card p-5">
              <span class="stat-label">Seed</span>
              <strong>{{ activeSeedSummary }}</strong>
              <p>Recent searches and saved searches stay personal convenience only.</p>
            </article>
          </section>

          <section v-if="graph.displayState !== 'normal' || graph.previewSource !== 'remote' || graph.excludedReason" class="knowledge-state-banner">
            <strong>{{ graph.displayState === 'degraded' ? 'Degraded display' : 'Response state' }}</strong>
            <span>{{ responseStateCopy }}</span>
          </section>

          <section v-if="graph.assets.length" class="surface-card p-6">
            <div class="mb-4">
              <h2 class="text-lg font-black text-slate-950 dark:text-white">公共知识资产 Public Assets</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Source notes, previewSource, and archived state are shown separately from persisted assetStatus.
              </p>
            </div>
            <div class="knowledge-asset-grid">
              <article v-for="asset in graph.assets" :key="asset.assetId" class="knowledge-asset-card">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="asset-type-chip">{{ assetTypeLabel(asset.assetType) }}</span>
                  <span :class="['asset-state-chip', asset.assetStatus === 'archived' ? 'asset-state-archived' : '']">
                    {{ asset.assetStatus === 'archived' ? 'archived revisit' : 'active public asset' }}
                  </span>
                  <span v-if="asset.previewSource !== 'remote'" class="asset-readonly-chip">
                    {{ previewSourceLabel(asset.previewSource) }} read-only
                  </span>
                </div>
                <h3>{{ asset.title }}</h3>
                <p>{{ asset.summary || asset.sourceNote }}</p>
                <small>sourceNote: {{ asset.sourceNote }}</small>
                <small v-if="asset.excludedReason">excludedReason: {{ asset.excludedReason }}</small>
                <RouterLink v-if="asset.targetHref && asset.visibilityState !== 'excluded'" :to="asset.targetHref" class="asset-link">
                  Open
                </RouterLink>
              </article>
            </div>
          </section>

          <section v-if="graph.paths.length || visibleGaps.length || graph.snapshots.length" class="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <article v-if="graph.paths.length" class="surface-card p-6">
              <h2 class="text-lg font-black text-slate-950 dark:text-white">知识路径 Knowledge Paths</h2>
              <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                KnowledgePath is a public reading suggestion. OFFLINE and DEGRADED are not lifecycle states, and fallback/demo/local-only nodes remain read-only.
              </p>
              <div class="mt-4 space-y-3">
                <div v-for="path in graph.paths" :key="path.pathId" class="knowledge-path-row">
                  <div class="flex flex-wrap items-center gap-2">
                    <strong>{{ path.title }}</strong>
                    <span class="asset-state-chip">{{ path.pathStatus }} / {{ path.displayState }}</span>
                  </div>
                  <p>{{ path.summary }}</p>
                  <ol>
                    <li v-for="step in path.steps" :key="`${path.pathId}:${step.assetId}:${step.title}`">
                      <RouterLink v-if="step.targetHref" :to="step.targetHref">{{ step.title }}</RouterLink>
                      <span v-else>{{ step.title }}</span>
                      <small v-if="step.previewSource && step.previewSource !== 'remote'">
                        ({{ previewSourceLabel(step.previewSource) }} read-only)
                      </small>
                    </li>
                  </ol>
                </div>
              </div>
            </article>

            <article v-if="visibleGaps.length" class="surface-card p-6">
              <h2 class="text-lg font-black text-slate-950 dark:text-white">公共缺口 Knowledge Gaps</h2>
              <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                KnowledgeGap only expresses aggregated public content coverage needs. It never exposes single-user behavior.
              </p>
              <div class="mt-4 space-y-3">
                <div v-for="gap in visibleGaps" :key="gap.gapId" class="knowledge-gap-row">
                  <strong>{{ gap.title }}</strong>
                  <p>{{ gap.reasonText }}</p>
                  <small>{{ gap.source }} / {{ gap.reviewStatus }}</small>
                </div>
              </div>
            </article>

            <article v-if="graph.snapshots.length" class="surface-card p-6">
              <h2 class="text-lg font-black text-slate-950 dark:text-white">归档快照 Archived Snapshots</h2>
              <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                KnowledgeAssetSnapshot is for public archived or stable assets and does not include drafts, internal notes, or preview tokens.
              </p>
              <div class="mt-4 space-y-3">
                <div v-for="snapshot in graph.snapshots" :key="snapshot.snapshotId" class="knowledge-gap-row">
                  <strong>{{ snapshot.title }}</strong>
                  <p>{{ snapshot.summary || snapshot.sourceNote }}</p>
                  <small>archivedAt: {{ snapshot.archivedAt || 'not provided' }}</small>
                </div>
              </div>
            </article>
          </section>

          <section v-if="groupedNodes.length || visibleRelations.length || graph.edges.length" class="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <article v-if="groupedNodes.length" class="surface-card p-6">
              <h2 class="text-lg font-black text-slate-950 dark:text-white">Graph Nodes</h2>
              <div class="mt-4 space-y-4">
                <div v-for="group in groupedNodes" :key="group.type">
                  <div class="mb-2 flex items-center justify-between gap-3">
                    <strong class="text-sm text-slate-900 dark:text-slate-100">{{ group.label }}</strong>
                    <span class="text-xs text-slate-500 dark:text-slate-400">{{ group.nodes.length }}</span>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <template v-for="node in group.nodes" :key="node.key">
                      <RouterLink v-if="nodeRoute(node)" :to="nodeRoute(node)" class="node-chip node-chip-link">
                        {{ node.label }}
                      </RouterLink>
                      <span v-else class="node-chip">{{ node.label }}</span>
                    </template>
                  </div>
                </div>
              </div>
            </article>

            <article class="surface-card p-6">
              <h2 class="text-lg font-black text-slate-950 dark:text-white">Relations</h2>
              <div class="mt-4 space-y-3">
                <div v-for="relation in visibleRelations" :key="relation.relationId" class="edge-row">
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {{ relation.sourceAssetId }} -> {{ relation.targetAssetId }}
                    </div>
                    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {{ relation.reasonText }}
                    </p>
                  </div>
                  <span class="relation-chip">{{ relationLabel(relation.relationType) }}</span>
                </div>
                <div v-for="edge in graph.edges" :key="edgeKey(edge)" class="edge-row">
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {{ nodeLabel(edge.source) }} -> {{ nodeLabel(edge.target) }}
                    </div>
                    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {{ relationLabel(edge.relation) }} / weight {{ edge.weight }}
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
import { localDomainConfigs } from '@/api/domains'
import {
  isDispatchableKnowledgeGap,
  isPersistableKnowledgeRelation,
  knowledgeApi,
  type KnowledgeAssetType,
  type KnowledgeExploreResponse,
  type KnowledgeGap,
  type KnowledgePreviewSource,
} from '@/api/knowledge'
import type { KnowledgeRelationEdge, KnowledgeRelationNode } from '@/api/types'
import { DOMAIN, getDomainLabel } from '@/utils/domains'

interface KnowledgeExploreFilters {
  domain: number
  assetId: string
  assetType: KnowledgeAssetType | ''
  postId: string
  tagId: string
  topicId: string
  limit: number
}

const route = useRoute()
const router = useRouter()

const filters = reactive<KnowledgeExploreFilters>({
  domain: DOMAIN.TECH,
  assetId: '',
  assetType: '',
  postId: '',
  tagId: '',
  topicId: '',
  limit: 8,
})

const graph = ref<KnowledgeExploreResponse | null>(null)
const loading = ref(false)
const error = ref('')

const groupLabelMap: Record<string, string> = {
  domain: 'Domain',
  post: 'Post',
  tag: 'Tag',
  topic: 'Topic',
  series: 'Series',
  collection: 'Collection',
  search_entry: 'Search entry',
}

const assetTypeLabel = (type: KnowledgeAssetType) => groupLabelMap[type] || type
const previewSourceLabel = (source?: KnowledgePreviewSource) => {
  if (source === 'local') return 'local-only'
  if (source === 'fallback') return 'fallback'
  if (source === 'demo') return 'demo'
  return 'remote'
}

const relationLabel = (relation: string) => {
  switch (relation) {
    case 'domain_post':
      return 'domain to post'
    case 'post_tag':
      return 'post to tag'
    case 'topic_tag':
      return 'topic to tag'
    case 'belongs_to':
      return 'belongs to'
    case 'references':
      return 'references'
    case 'continues':
      return 'continues'
    case 'related':
      return 'related'
    case 'fills_gap':
      return 'fills gap'
    case 'search_entry':
      return 'search entry'
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
const visibleRelations = computed(() => (graph.value?.relations || []).filter((relation) => isPersistableKnowledgeRelation(relation)))
const visibleGaps = computed(() => (graph.value?.gaps || []).filter((gap: KnowledgeGap) => isDispatchableKnowledgeGap(gap)))
const responseStateCopy = computed(() => {
  if (!graph.value) return ''
  if (graph.value.previewSource !== 'remote') {
    return `${previewSourceLabel(graph.value.previewSource)} data is read-only diagnostic display and will not be written to formal assets, relations, paths, or gaps.`
  }
  if (graph.value.excludedReason) return graph.value.excludedReason
  return graph.value.sourceNote || 'Partial response display does not write DEGRADED into lifecycle state.'
})

const activeSeedSummary = computed(() => {
  const items = [
    filters.assetId && `asset:${filters.assetType || '*'}:${filters.assetId}`,
    filters.postId && `post:${filters.postId}`,
    filters.tagId && `tag:${filters.tagId}`,
    filters.topicId && `topic:${filters.topicId}`,
    filters.domain ? getDomainLabel(filters.domain) : '',
  ].filter(Boolean)
  return items.length ? items.join(' / ') : 'default domain'
})

const normalizePositiveInt = (value: unknown, fallback = 0) => {
  const next = Number(value)
  return Number.isFinite(next) && next > 0 ? Math.round(next) : fallback
}

const knowledgeAssetTypes: readonly KnowledgeAssetType[] = ['post', 'series', 'collection', 'topic', 'tag', 'search_entry']
const normalizeAssetType = (value: unknown): KnowledgeAssetType | '' => (
  typeof value === 'string' && knowledgeAssetTypes.includes(value as KnowledgeAssetType)
    ? value as KnowledgeAssetType
    : ''
)

const syncFromRoute = () => {
  filters.domain = normalizePositiveInt(route.query.domain, DOMAIN.TECH)
  filters.assetId = typeof route.query.assetId === 'string' ? route.query.assetId : ''
  filters.assetType = normalizeAssetType(route.query.assetType)
  filters.postId = typeof route.query.postId === 'string' ? route.query.postId : ''
  filters.tagId = typeof route.query.tagId === 'string' ? route.query.tagId : ''
  filters.topicId = typeof route.query.topicId === 'string' ? route.query.topicId : ''
  filters.limit = normalizePositiveInt(route.query.limit, 8) || 8
}

const queryFromFilters = () => ({
  ...(filters.domain ? { domain: String(filters.domain) } : {}),
  ...(filters.assetId ? { assetId: filters.assetId } : {}),
  ...(filters.assetType ? { assetType: filters.assetType } : {}),
  ...(filters.postId ? { postId: filters.postId } : {}),
  ...(filters.tagId ? { tagId: filters.tagId } : {}),
  ...(filters.topicId ? { topicId: filters.topicId } : {}),
  limit: String(filters.limit || 8),
})

const loadGraph = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await knowledgeApi.assets({
      domain: filters.domain || undefined,
      assetId: filters.assetId || undefined,
      assetType: filters.assetType || undefined,
      postId: filters.postId || undefined,
      tagId: filters.tagId || undefined,
      topicId: filters.topicId || undefined,
      limit: filters.limit || 8,
    })
    graph.value = res.data
  } catch (err) {
    graph.value = null
    error.value = getErrorMessage(err, 'Knowledge asset service is temporarily unavailable.')
  } finally {
    loading.value = false
  }
}

const applyFilters = async () => {
  await router.push({ path: '/knowledge/explore', query: queryFromFilters() })
}

const resetFilters = async () => {
  filters.domain = DOMAIN.TECH
  filters.assetId = ''
  filters.assetType = ''
  filters.postId = ''
  filters.tagId = ''
  filters.topicId = ''
  filters.limit = 8
  await applyFilters()
}

const nodeIdentity = (key: string, fallback: string) => key.split(':')[1] || fallback
const edgeKey = (edge: KnowledgeRelationEdge) => `${edge.source}->${edge.target}:${edge.relation}`
const nodeRoute = (node: KnowledgeRelationNode) => {
  const identity = encodeURIComponent(nodeIdentity(node.key, node.label))
  if (!identity) return ''
  if (node.type === 'post') return `/post/${identity}`
  if (node.type === 'tag') return `/tag/${identity}`
  if (node.type === 'topic') return `/topics/${identity}`
  if (node.type === 'domain' && node.domain) return `/explore?domain=${node.domain}`
  return ''
}

watch(() => route.fullPath, async () => {
  syncFromRoute()
  await loadGraph()
}, { immediate: true })
</script>

<style scoped>
.insight-kicker,
.stat-label,
.node-chip,
.relation-chip,
.asset-type-chip,
.asset-state-chip,
.asset-readonly-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-weight: 800;
}

.insight-kicker {
  background: rgb(224 242 254);
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  color: rgb(3 105 161);
}

.stat-card strong {
  display: block;
  margin-top: 0.65rem;
  font-size: 1.9rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.stat-card p,
.knowledge-state-banner span,
.knowledge-asset-card p,
.knowledge-asset-card small,
.knowledge-path-row p,
.knowledge-path-row small,
.knowledge-gap-row p,
.knowledge-gap-row small {
  margin-top: 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: rgb(100 116 139);
}

.stat-label,
.node-chip,
.relation-chip {
  background: rgb(241 245 249);
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  color: rgb(51 65 85);
}

.node-chip-link:hover {
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.knowledge-state-banner,
.knowledge-asset-card,
.knowledge-path-row,
.knowledge-gap-row,
.edge-row {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: rgb(255 255 255 / 0.82);
}

.knowledge-state-banner,
.knowledge-asset-card,
.knowledge-path-row,
.knowledge-gap-row {
  display: grid;
  gap: 0.65rem;
  padding: 1rem;
}

.knowledge-state-banner strong,
.knowledge-asset-card h3,
.knowledge-path-row strong,
.knowledge-gap-row strong {
  color: rgb(15 23 42);
  font-weight: 900;
}

.knowledge-asset-grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.asset-type-chip,
.asset-state-chip,
.asset-readonly-chip {
  padding: 0.25rem 0.6rem;
  font-size: 0.72rem;
}

.asset-type-chip {
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.asset-state-chip {
  background: rgb(240 253 244);
  color: rgb(22 101 52);
}

.asset-state-archived,
.asset-readonly-chip {
  background: rgb(241 245 249);
  color: rgb(71 85 105);
}

.asset-link {
  justify-self: start;
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgb(37 99 235);
}

.knowledge-path-row ol {
  margin: 0;
  padding-left: 1.25rem;
  color: rgb(51 65 85);
  font-size: 0.875rem;
}

.edge-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.95rem 1rem;
}

.relation-chip {
  flex-shrink: 0;
}

.dark .insight-kicker {
  background: rgb(8 47 73);
  color: rgb(125 211 252);
}

.dark .stat-card strong,
.dark .knowledge-state-banner strong,
.dark .knowledge-asset-card h3,
.dark .knowledge-path-row strong,
.dark .knowledge-gap-row strong {
  color: rgb(241 245 249);
}

.dark .stat-card p,
.dark .knowledge-state-banner span,
.dark .knowledge-asset-card p,
.dark .knowledge-asset-card small,
.dark .knowledge-path-row p,
.dark .knowledge-path-row small,
.dark .knowledge-gap-row p,
.dark .knowledge-gap-row small,
.dark .knowledge-path-row ol {
  color: rgb(148 163 184);
}

.dark .knowledge-state-banner,
.dark .knowledge-asset-card,
.dark .knowledge-path-row,
.dark .knowledge-gap-row,
.dark .edge-row {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42 / 0.82);
}

.dark .stat-label,
.dark .node-chip,
.dark .relation-chip {
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}
</style>
