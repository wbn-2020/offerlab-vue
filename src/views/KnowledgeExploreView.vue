<template>
  <div class="app-shell">
    <AppHeader />

    <main class="community-page knowledge-page">
      <header class="knowledge-intro">
        <nav class="knowledge-breadcrumb" aria-label="知识发现路径">
          <RouterLink to="/explore">
            <ArrowLeft class="h-4 w-4" aria-hidden="true" />
            返回发现
          </RouterLink>
          <span>知识发现</span>
        </nav>

        <div class="knowledge-intro__layout">
          <div class="knowledge-intro__copy">
            <p class="page-kicker">公开知识关系</p>
            <h1>从公开内容中探索知识脉络</h1>
            <p>
              这里是根据当前可见公开内容即时生成的只读知识投影，不是持久化知识库或人工审核关系。页面只提供阅读建议，不创建个人路线或完成要求。
            </p>
          </div>
          <div class="knowledge-intro__actions">
            <RouterLink to="/search?sort=hot" class="secondary-action">
              <Search class="h-4 w-4" aria-hidden="true" />
              搜索内容
            </RouterLink>
            <RouterLink to="/certification/apply" class="secondary-action">
              <BadgeCheck class="h-4 w-4" aria-hidden="true" />
              认证作者申请
            </RouterLink>
          </div>
        </div>
      </header>

      <div class="knowledge-layout">
        <aside class="knowledge-filter surface-panel" aria-label="知识关系筛选">
          <div class="knowledge-filter__heading">
            <div>
              <span class="section-icon"><SlidersHorizontal class="h-4 w-4" aria-hidden="true" /></span>
              <div>
                <h2>选择探索起点</h2>
                <p>先选感兴趣的领域，需要精确定位时再展开高级选项。</p>
              </div>
            </div>
            <button type="button" class="icon-action" title="重置筛选" aria-label="重置筛选" @click="resetFilters">
              <RotateCcw class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div class="knowledge-filter__body">
            <label class="field-group">
              <span>领域</span>
              <select v-model.number="filters.domain" class="filter-input">
                <option :value="0">全部领域</option>
                <option v-for="domain in localDomainConfigs" :key="domain.domain" :value="domain.domain">
                  {{ domain.icon }} {{ getDomainLabelSafe(domain.domain) }}
                </option>
              </select>
            </label>

            <label class="field-group">
              <span>展示数量</span>
              <select v-model.number="filters.limit" class="filter-input">
                <option :value="6">6 条</option>
                <option :value="8">8 条</option>
                <option :value="12">12 条</option>
              </select>
            </label>

            <details class="advanced-filter">
              <summary>
                <span>高级：按内容编号精确定位</span>
                <ChevronDown class="h-4 w-4" aria-hidden="true" />
              </summary>
              <div class="advanced-filter__fields">
                <label class="field-group">
                  <span>对象类型</span>
                  <select v-model="filters.assetType" class="filter-input">
                    <option value="">不指定对象</option>
                    <option value="post">内容</option>
                    <option value="series">合集</option>
                  </select>
                </label>
                <label class="field-group">
                  <span>对象编号</span>
                  <input
                    v-model.trim="filters.assetId"
                    class="filter-input"
                    :disabled="!filters.assetType"
                    :placeholder="filters.assetType ? '输入公开对象编号' : '请先选择对象类型'"
                  >
                </label>
                <label class="field-group">
                  <span>内容编号</span>
                  <input v-model.trim="filters.postId" class="filter-input" placeholder="可选">
                </label>
                <label class="field-group">
                  <span>标签编号</span>
                  <input v-model.trim="filters.tagId" class="filter-input" placeholder="可选">
                </label>
                <label class="field-group">
                  <span>话题编号</span>
                  <input v-model.trim="filters.topicId" class="filter-input" placeholder="可选">
                </label>
              </div>
            </details>

            <button type="button" class="primary-action knowledge-filter__submit" @click="applyFilters">
              <RefreshCw class="h-4 w-4" aria-hidden="true" />
              更新关系视图
            </button>
          </div>

          <div class="knowledge-filter__note">
            <Info class="h-4 w-4" aria-hidden="true" />
            <p>筛选只改变本次公开投影，不会写入关系数据、路径数据或个人学习记录。</p>
          </div>
        </aside>

        <section class="knowledge-results" aria-live="polite">
          <LoadingSkeleton v-if="loading" />

          <div v-else-if="error" class="surface-panel state-panel state-panel--error" role="alert">
            <AlertCircle class="h-6 w-6" aria-hidden="true" />
            <div>
              <h2>知识关系暂不可用</h2>
              <p>{{ error }}</p>
              <button type="button" class="primary-action" @click="loadGraph">
                <RefreshCw class="h-4 w-4" aria-hidden="true" />
                重新加载
              </button>
            </div>
          </div>

          <EmptyState
            v-else-if="!graph || (!graph.assets.length && !graph.paths.length && !visibleGaps.length && !graph.snapshots.length && !graph.nodes.length && !confirmedRelations.length && !dynamicSuggestions.length)"
            title="当前起点暂无公开知识资产"
            description="可以切换频道，或改用帖子、标签、话题和公开资产作为探索起点。"
          />

          <div v-else class="knowledge-result-stack">
            <section class="surface-panel knowledge-summary" aria-label="当前知识投影概览">
              <div class="knowledge-summary__seed">
                <Compass class="h-5 w-5" aria-hidden="true" />
                <div>
                  <span>当前探索起点</span>
                  <strong>{{ activeSeedSummary }}</strong>
                </div>
              </div>
              <dl>
                <div>
                  <dt>公开内容投影</dt>
                  <dd>{{ graph.assets.length }}</dd>
                </div>
                <div>
                  <dt>已确认关系</dt>
                  <dd>{{ confirmedRelations.length }}</dd>
                </div>
                <div>
                  <dt>阅读路径</dt>
                  <dd>{{ graph.paths.length }}</dd>
                </div>
              </dl>
            </section>

            <section v-if="graph.displayState !== 'normal' || graph.previewSource !== 'remote' || graph.excludedReason" class="knowledge-state-banner">
              <AlertCircle class="h-5 w-5" aria-hidden="true" />
              <div>
                <strong>部分内容暂未完整展示</strong>
                <span>{{ responseStateCopy }}</span>
              </div>
            </section>

            <section
              v-if="groupedNodes.length || confirmedRelations.length || dynamicSuggestions.length"
              class="surface-panel knowledge-module knowledge-relation-module"
            >
              <header class="module-heading">
                <div>
                  <span class="section-icon"><Network class="h-4 w-4" aria-hidden="true" /></span>
                  <div>
                    <h2>{{ graph.nodes.length ? '关联浏览' : '本次关联整理' }}</h2>
                    <p>{{ graph.nodes.length ? '先查看公开对象之间的连接，再进入具体内容继续阅读。' : '当前没有可独立浏览的公开节点，以下仅展示本次整理的关联依据，不构成知识层级。' }}</p>
                  </div>
                </div>
                <span class="module-count">{{ graph.nodes.length ? `${graph.nodes.length} 个节点` : '无可浏览节点' }}</span>
              </header>

              <div :class="['knowledge-relation-layout', { 'knowledge-relation-layout--evidence-only': !groupedNodes.length }]">
                <div v-if="groupedNodes.length" class="node-browser">
                  <h3>可浏览节点</h3>
                  <div class="node-groups">
                    <div v-for="group in groupedNodes" :key="group.type" class="node-group">
                      <div class="node-group__heading">
                        <strong>{{ group.label }}</strong>
                        <span>{{ group.nodes.length }}</span>
                      </div>
                      <div class="node-group__items">
                        <template v-for="node in group.nodes" :key="node.key">
                          <RouterLink v-if="nodeRoute(node)" :to="nodeRoute(node)" class="node-chip node-chip-link">
                            {{ node.label }}
                            <ArrowUpRight class="h-3.5 w-3.5" aria-hidden="true" />
                          </RouterLink>
                          <span v-else class="node-chip">{{ node.label }}</span>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>

                <details v-if="confirmedRelations.length || dynamicSuggestions.length" class="relation-evidence advanced-filter">
                  <summary>
                    <span>高级：查看关系来源解释</span>
                    <ChevronDown class="h-4 w-4" aria-hidden="true" />
                  </summary>
                  <div class="relation-evidence__body">
                  <div v-if="confirmedRelations.length" class="relation-group">
                    <div class="relation-group__heading">
                      <div>
                        <strong>已确认关系</strong>
                        <p>仅展示来源明确、审核通过且公开可见的关系。</p>
                      </div>
                      <span class="relation-status relation-status--confirmed">已核对</span>
                    </div>
                    <div v-for="relation in confirmedRelations" :key="relation.relationId" class="edge-row">
                      <div>
                        <strong>{{ nodeLabel(relation.sourceAssetId) }}</strong>
                        <span><ArrowRight class="h-3.5 w-3.5" aria-hidden="true" /></span>
                        <strong>{{ nodeLabel(relation.targetAssetId) }}</strong>
                      </div>
                      <p>{{ localizeKnowledgeCopy(relation.reasonText, '暂无更多关系说明。') }}</p>
                      <small>{{ relationLabel(relation.relationType) }}</small>
                    </div>
                  </div>

                  <div v-if="suggestedDynamicRelations.length" class="relation-group">
                    <div class="relation-group__heading">
                      <div>
                        <strong>请求时关系建议</strong>
                        <p>只读建议，不作为已经确认的关系事实。</p>
                      </div>
                      <span class="relation-status relation-status--suggested">建议</span>
                    </div>
                    <div v-for="relation in suggestedDynamicRelations" :key="relation.relationId" class="edge-row">
                      <div>
                        <strong>{{ nodeLabel(relation.sourceAssetId) }}</strong>
                        <span><ArrowRight class="h-3.5 w-3.5" aria-hidden="true" /></span>
                        <strong>{{ nodeLabel(relation.targetAssetId) }}</strong>
                      </div>
                      <p>{{ localizeKnowledgeCopy(relation.degradedReason || relation.reasonText, '这条关系建议仍待核对。') }}</p>
                    </div>
                  </div>

                  <div v-if="degradedRelations.length" class="relation-group relation-group--degraded">
                    <div class="relation-group__heading">
                      <div>
                        <strong>关联依据不足</strong>
                        <p>来源或审核依据不足，因此不会被视为确认事实。</p>
                      </div>
                      <span class="relation-status relation-status--degraded">依据不足</span>
                    </div>
                    <div v-for="relation in degradedRelations" :key="relation.relationId" class="edge-row">
                      <div>
                        <strong>{{ nodeLabel(relation.sourceAssetId) }}</strong>
                        <span><ArrowRight class="h-3.5 w-3.5" aria-hidden="true" /></span>
                        <strong>{{ nodeLabel(relation.targetAssetId) }}</strong>
                      </div>
                      <p>{{ localizeKnowledgeCopy(relation.degradedReason || relation.reasonText, '当前关系依据不足。') }}</p>
                    </div>
                  </div>
                  </div>
                </details>
              </div>
            </section>

            <section v-if="graph.assets.length" class="surface-panel knowledge-module">
              <header class="module-heading">
                <div>
                  <span class="section-icon"><BookOpen class="h-4 w-4" aria-hidden="true" /></span>
                  <div>
                    <h2>公开内容入口</h2>
                    <p>从当前可见内容中整理出的阅读入口。</p>
                  </div>
                </div>
                <span class="module-count">{{ graph.assets.length }} 项</span>
              </header>
              <div class="knowledge-asset-list">
                <article v-for="asset in graph.assets" :key="asset.assetId" class="knowledge-asset-row">
                  <div class="knowledge-asset-row__main">
                    <div class="asset-meta">
                      <span class="asset-type-chip">{{ assetTypeLabel(asset.assetType) }}</span>
                    </div>
                    <h3>{{ localizeKnowledgeCopy(asset.title, '未命名公开内容') }}</h3>
                    <p>{{ localizeKnowledgeCopy(asset.summary || asset.sourceNote, '来自公开可见内容。') }}</p>
                  </div>
                  <RouterLink
                    v-if="asset.targetHref && asset.visibilityState !== 'excluded'"
                    :to="asset.targetHref"
                    class="asset-link"
                    aria-label="打开公开内容"
                  >
                    <ArrowUpRight class="h-4 w-4" aria-hidden="true" />
                  </RouterLink>
                </article>
              </div>
            </section>

            <div v-if="graph.paths.length || visibleGaps.length" class="knowledge-dual-modules">
              <section v-if="graph.paths.length" class="surface-panel knowledge-module">
                <header class="module-heading">
                  <div>
                    <span class="section-icon"><Route class="h-4 w-4" aria-hidden="true" /></span>
                    <div>
                      <h2>知识路径</h2>
                      <p>按内容关联整理的只读建议，可从任一步开始阅读。</p>
                    </div>
                  </div>
                </header>
                <div class="knowledge-path-list">
                  <article v-for="path in graph.paths" :key="path.pathId" class="knowledge-path-row">
                    <div class="knowledge-path-row__heading">
                      <strong>{{ localizeKnowledgeCopy(path.title, '公开内容阅读路径') }}</strong>
                    </div>
                    <p>{{ localizeKnowledgeCopy(path.summary, '根据公开内容关系整理的阅读建议。') }}</p>
                    <ol>
                      <li v-for="(step, index) in path.steps" :key="`${path.pathId}:${step.assetId}:${step.title}`">
                        <span class="path-index">{{ index + 1 }}</span>
                        <div>
                          <RouterLink v-if="step.targetHref" :to="step.targetHref">{{ localizeKnowledgeCopy(step.title, '未命名阅读步骤') }}</RouterLink>
                          <span v-else>{{ localizeKnowledgeCopy(step.title, '未命名阅读步骤') }}</span>
                        </div>
                      </li>
                    </ol>
                  </article>
                </div>
              </section>

              <section v-if="visibleGaps.length" class="surface-panel knowledge-module">
                <header class="module-heading">
                  <div>
                    <span class="section-icon"><CircleDashed class="h-4 w-4" aria-hidden="true" /></span>
                    <div>
                      <h2>待补内容方向</h2>
                      <p>仅表达聚合后的公开内容覆盖需求，不展示单个用户行为。</p>
                    </div>
                  </div>
                </header>
                <div class="knowledge-gap-list">
                  <article v-for="gap in visibleGaps" :key="gap.gapId" class="knowledge-gap-row">
                    <strong>{{ localizeKnowledgeCopy(gap.title, '公开内容待补方向') }}</strong>
                    <p>{{ localizeKnowledgeCopy(gap.reasonText, '当前公开内容覆盖仍不完整。') }}</p>
                  </article>
                </div>
              </section>
            </div>

            <section v-if="graph.snapshots.length" class="surface-panel knowledge-module">
              <header class="module-heading">
                <div>
                  <span class="section-icon"><Clock3 class="h-4 w-4" aria-hidden="true" /></span>
                  <div>
                    <h2>本次阅读整理</h2>
                    <p>根据当前可见公开内容即时整理，仅用于帮助继续阅读。</p>
                  </div>
                </div>
              </header>
              <div class="snapshot-list">
                <article v-for="snapshot in graph.snapshots" :key="snapshot.snapshotId" class="snapshot-row">
                  <div>
                    <strong>{{ localizeKnowledgeCopy(snapshot.title, '公开内容关系整理结果') }}</strong>
                    <p>{{ localizeKnowledgeCopy(snapshot.summary || snapshot.sourceNote, '根据当前可见的公开内容即时整理。') }}</p>
                  </div>
                </article>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  ChevronDown,
  CircleDashed,
  Clock3,
  Compass,
  Info,
  Network,
  RefreshCw,
  RotateCcw,
  Route,
  Search,
  SlidersHorizontal,
} from 'lucide-vue-next'
import AppHeader from '@/components/layout/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import { getErrorMessage } from '@/api/client'
import { localDomainConfigs } from '@/api/domains'
import {
  isDispatchableKnowledgeGap,
  isConfirmedKnowledgeRelation,
  knowledgeApi,
  type KnowledgeAssetType,
  type KnowledgeExploreResponse,
  type KnowledgeGap,
} from '@/api/knowledge'
import type { KnowledgeRelationNode } from '@/api/types'
import { DOMAIN, getDomainLabel, getDomainLabelSafe, resolveDomainValue } from '@/utils/domains'
import { localizeKnowledgeCopy } from '@/utils/publicDisplay'

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
  domain: '领域',
  post: '内容',
  tag: '标签',
  topic: '话题',
  series: '合集',
  collection: '收藏',
  search_entry: '搜索结果',
}

const assetTypeLabel = (type: KnowledgeAssetType) => groupLabelMap[type] || type

const relationLabel = (relation: string) => {
  switch (relation) {
    case 'domain_post':
      return '频道关联内容'
    case 'post_tag':
      return '内容关联标签'
    case 'topic_tag':
      return '话题关联标签'
    case 'belongs_to':
      return '归属于'
    case 'references':
      return '引用'
    case 'continues':
      return '延续阅读'
    case 'related':
      return '相关内容'
    case 'fills_gap':
      return '补充缺口'
    case 'search_entry':
      return '搜索入口'
    case 'duplicate_of':
      return '内容重复'
    case 'supersedes':
      return '替代旧内容'
    case 'supplements':
      return '补充说明'
    case 'prerequisite_of':
      return '前置阅读'
    case 'contradicts':
      return '观点相反'
    default:
      return '其他关联'
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
const nodeLabel = (key: string) => localizeKnowledgeCopy(nodeMap.value.get(key)?.label || key, '未命名节点')
const confirmedRelations = computed(() => (graph.value?.confirmedRelations || []).filter(isConfirmedKnowledgeRelation))
const dynamicSuggestions = computed(() => graph.value?.dynamicSuggestions || [])
const suggestedDynamicRelations = computed(() => dynamicSuggestions.value.filter((relation) => relation.relationState === 'SUGGESTED'))
const degradedRelations = computed(() => dynamicSuggestions.value.filter((relation) => relation.relationState === 'DEGRADED'))
const visibleGaps = computed(() => (graph.value?.gaps || []).filter((gap: KnowledgeGap) => isDispatchableKnowledgeGap(gap)))
const responseStateCopy = computed(() => {
  if (!graph.value) return ''
  if (graph.value.previewSource !== 'remote') return '当前仍可浏览已有结果，稍后刷新可获取更完整的关联内容。'
  if (graph.value.excludedReason) return '部分关联内容暂不可见，已自动隐藏不完整结果。'
  return '部分关联内容暂未返回，不影响继续阅读当前结果。'
})

const activeSeedSummary = computed(() => {
  const items = [
    filters.assetId && `精确内容：${filters.assetId}`,
    filters.postId && `内容：${filters.postId}`,
    filters.tagId && `标签：${filters.tagId}`,
    filters.topicId && `话题：${filters.topicId}`,
    filters.domain ? getDomainLabel(filters.domain) : '',
  ].filter(Boolean)
  return items.length ? items.join(' / ') : '全部公开内容'
})

const normalizePositiveInt = (value: unknown, fallback = 0) => {
  const next = Number(value)
  return Number.isFinite(next) && next > 0 ? Math.round(next) : fallback
}

const knowledgeAssetTypes: readonly KnowledgeAssetType[] = ['post', 'series']
const normalizeAssetType = (value: unknown): KnowledgeAssetType | '' => (
  typeof value === 'string' && knowledgeAssetTypes.includes(value as KnowledgeAssetType)
    ? value as KnowledgeAssetType
    : ''
)

const syncFromRoute = () => {
  filters.domain = resolveDomainValue(route.query.domain) ?? DOMAIN.TECH
  filters.assetType = normalizeAssetType(route.query.assetType)
  filters.assetId = filters.assetType && typeof route.query.assetId === 'string' ? route.query.assetId : ''
  filters.postId = typeof route.query.postId === 'string' ? route.query.postId : ''
  filters.tagId = typeof route.query.tagId === 'string' ? route.query.tagId : ''
  filters.topicId = typeof route.query.topicId === 'string' ? route.query.topicId : ''
  filters.limit = normalizePositiveInt(route.query.limit, 8) || 8
}

const queryFromFilters = () => ({
  ...(filters.domain ? { domain: String(filters.domain) } : {}),
  ...(filters.assetType && filters.assetId ? { assetId: filters.assetId } : {}),
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
    const res = await knowledgeApi.explore({
      domain: filters.domain || undefined,
      assetId: filters.assetType && filters.assetId ? filters.assetId : undefined,
      assetType: filters.assetType || undefined,
      postId: filters.postId || undefined,
      tagId: filters.tagId || undefined,
      topicId: filters.topicId || undefined,
      limit: filters.limit || 8,
    })
    graph.value = res.data
  } catch (err) {
    graph.value = null
    error.value = getErrorMessage(err, '知识关系暂时无法加载，请稍后重试。')
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
.knowledge-page {
  padding-top: 1.5rem;
  padding-bottom: 5rem;
}

.knowledge-intro {
  padding: 0.25rem 0 1.5rem;
}

.knowledge-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 1.15rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 600;
}

.knowledge-breadcrumb a {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-primary);
}

.knowledge-breadcrumb a:hover {
  color: var(--primary-600);
}

.knowledge-breadcrumb span::before {
  content: "/";
  margin-right: 0.65rem;
  color: #cbd5e1;
}

.knowledge-intro__layout {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
}

.knowledge-intro__copy {
  max-width: 46rem;
}

.page-kicker {
  margin: 0 0 0.5rem;
  color: var(--primary-600);
  font-size: 0.8125rem;
  font-weight: 700;
}

.knowledge-intro h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.25;
  text-wrap: balance;
}

.knowledge-intro__copy > p:last-child {
  max-width: 70ch;
  margin: 0.7rem 0 0;
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.75;
  text-wrap: pretty;
}

.knowledge-intro__actions {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.knowledge-layout {
  display: grid;
  grid-template-columns: minmax(14rem, 16rem) minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}

.knowledge-filter {
  position: sticky;
  top: calc(var(--community-header-height) + 1rem);
  overflow: hidden;
}

.knowledge-filter__heading,
.module-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.1rem;
  border-bottom: 1px solid var(--border-subtle);
}

.knowledge-filter__heading > div,
.module-heading > div {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  min-width: 0;
}

.section-icon {
  display: inline-grid;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  place-items: center;
  border-radius: var(--radius-control);
  background: var(--primary-50);
  color: var(--primary-600);
}

.knowledge-filter h2,
.module-heading h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.4;
}

.knowledge-filter__heading p,
.module-heading p {
  margin: 0.25rem 0 0;
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.55;
}

.icon-action {
  display: inline-grid;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  place-items: center;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  color: var(--text-muted);
  transition: 160ms ease;
}

.icon-action:hover {
  border-color: #bfdbfe;
  background: var(--primary-50);
  color: var(--primary-600);
}

.knowledge-filter__body {
  display: grid;
  gap: 1rem;
  padding: 1rem 1.1rem;
}

.field-group {
  display: grid;
  gap: 0.45rem;
}

.field-group > span {
  color: var(--text-primary);
  font-size: 0.78rem;
  font-weight: 700;
}

.filter-input {
  width: 100%;
  min-height: 2.55rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-1);
  padding: 0.62rem 0.75rem;
  color: var(--text-primary);
  font-size: 0.84rem;
  outline: none;
  transition: 160ms ease;
}

.filter-input:focus {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.filter-input:disabled {
  cursor: not-allowed;
  background: var(--surface-3);
  color: var(--text-muted);
}

.advanced-filter {
  border-top: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
}

.advanced-filter summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.8rem 0;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 700;
  list-style: none;
}

.advanced-filter summary::-webkit-details-marker {
  display: none;
}

.advanced-filter summary svg {
  transition: transform 160ms ease;
}

.advanced-filter[open] summary svg {
  transform: rotate(180deg);
}

.advanced-filter__fields {
  display: grid;
  gap: 0.9rem;
  padding-bottom: 1rem;
}

.knowledge-filter__submit {
  width: 100%;
}

.knowledge-filter__note {
  display: flex;
  gap: 0.6rem;
  padding: 0.85rem 1.1rem;
  border-top: 1px solid var(--border-subtle);
  background: var(--surface-2);
  color: var(--text-muted);
}

.knowledge-filter__note svg {
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.knowledge-filter__note p {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.55;
}

.knowledge-results,
.knowledge-result-stack {
  min-width: 0;
}

.knowledge-result-stack {
  display: grid;
  gap: 1rem;
}

.state-panel {
  display: flex;
  gap: 0.9rem;
  padding: 1.25rem;
}

.state-panel--error {
  border-color: #fecaca;
  color: #b42318;
}

.state-panel h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 800;
}

.state-panel p {
  margin: 0.35rem 0 1rem;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.knowledge-summary {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem;
}

.knowledge-summary__seed {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
}

.knowledge-summary__seed svg {
  flex-shrink: 0;
  color: var(--primary-600);
}

.knowledge-summary__seed span,
.knowledge-summary dt {
  display: block;
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 600;
}

.knowledge-summary__seed strong {
  display: block;
  max-width: 30rem;
  margin-top: 0.15rem;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 0.82rem;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.knowledge-summary dl {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin: 0;
}

.knowledge-summary dl > div {
  min-width: 5.8rem;
  padding: 0 1rem;
  border-left: 1px solid var(--border-subtle);
}

.knowledge-summary dd {
  margin: 0.15rem 0 0;
  color: var(--text-strong);
  font-size: 1.05rem;
  font-weight: 800;
}

.knowledge-state-banner {
  display: flex;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border: 1px solid #fed7aa;
  border-radius: var(--radius-surface);
  background: #fff7ed;
  color: #9a3412;
}

.knowledge-state-banner svg {
  flex-shrink: 0;
}

.knowledge-state-banner strong,
.knowledge-state-banner span {
  display: block;
}

.knowledge-state-banner strong {
  font-size: 0.8rem;
  font-weight: 800;
}

.knowledge-state-banner span {
  margin-top: 0.2rem;
  font-size: 0.76rem;
  line-height: 1.55;
}

.knowledge-module {
  overflow: hidden;
}

.module-heading {
  padding: 1rem 1.2rem;
}

.module-heading p {
  max-width: 70ch;
}

.module-count {
  flex-shrink: 0;
  padding-top: 0.2rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 650;
}

.knowledge-relation-layout {
  display: grid;
  grid-template-columns: minmax(13rem, 0.8fr) minmax(0, 1.2fr);
}

.knowledge-relation-layout--evidence-only {
  grid-template-columns: minmax(0, 1fr);
}

.node-browser,
.relation-evidence {
  min-width: 0;
  padding: 1rem 1.2rem 1.2rem;
}

.node-browser {
  border-right: 1px solid var(--border-subtle);
}

.node-browser > h3,
.relation-evidence > h3 {
  margin: 0 0 0.9rem;
  color: var(--text-strong);
  font-size: 0.82rem;
  font-weight: 800;
}

.node-groups {
  display: grid;
  gap: 1rem;
}

.node-group__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.55rem;
}

.node-group__heading strong {
  color: var(--text-primary);
  font-size: 0.75rem;
  font-weight: 750;
}

.node-group__heading span {
  color: var(--text-muted);
  font-size: 0.7rem;
}

.node-group__items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.node-chip,
.asset-type-chip,
.asset-state-chip,
.asset-readonly-chip,
.relation-status {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: var(--radius-pill);
  font-weight: 700;
}

.node-chip {
  max-width: 100%;
  padding: 0.35rem 0.65rem;
  background: var(--surface-3);
  color: var(--text-primary);
  font-size: 0.72rem;
}

.node-chip-link:hover {
  background: var(--primary-50);
  color: var(--primary-700);
}

.relation-evidence {
  display: grid;
  align-content: start;
  gap: 1rem;
}

.relation-group + .relation-group {
  padding-top: 1rem;
  border-top: 1px solid var(--border-subtle);
}

.relation-group__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.65rem;
}

.relation-group__heading strong {
  color: var(--text-strong);
  font-size: 0.8rem;
  font-weight: 800;
}

.relation-group__heading p {
  margin: 0.2rem 0 0;
  color: var(--text-muted);
  font-size: 0.72rem;
  line-height: 1.5;
}

.relation-status {
  flex-shrink: 0;
  padding: 0.3rem 0.55rem;
  font-size: 0.65rem;
}

.relation-status--confirmed {
  background: #ecfdf3;
  color: #027a48;
}

.relation-status--suggested {
  background: var(--primary-50);
  color: var(--primary-700);
}

.relation-status--degraded {
  background: #fff7ed;
  color: #c2410c;
}

.edge-row {
  padding: 0.65rem 0;
  border-top: 1px solid var(--border-subtle);
}

.edge-row > div {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  color: var(--text-primary);
}

.edge-row > div strong {
  min-width: 0;
  overflow: hidden;
  font-size: 0.76rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edge-row > div span {
  flex-shrink: 0;
  color: var(--text-muted);
}

.edge-row p {
  margin: 0.3rem 0 0;
  color: var(--text-muted);
  font-size: 0.72rem;
  line-height: 1.5;
}

.edge-row small {
  display: block;
  margin-top: 0.25rem;
  color: var(--primary-600);
  font-size: 0.68rem;
}

.knowledge-asset-list,
.knowledge-path-list,
.knowledge-gap-list,
.snapshot-list {
  padding: 0 1.2rem;
}

.knowledge-asset-row,
.snapshot-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 0;
}

.knowledge-asset-row + .knowledge-asset-row,
.snapshot-row + .snapshot-row {
  border-top: 1px solid var(--border-subtle);
}

.knowledge-asset-row__main {
  display: grid;
  min-width: 0;
  gap: 0.45rem;
}

.asset-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.asset-type-chip,
.asset-state-chip,
.asset-readonly-chip {
  padding: 0.25rem 0.55rem;
  font-size: 0.65rem;
}

.asset-type-chip {
  background: var(--primary-50);
  color: var(--primary-700);
}

.asset-state-chip {
  background: #ecfdf3;
  color: #027a48;
}

.asset-state-archived,
.asset-readonly-chip {
  background: var(--surface-3);
  color: var(--text-muted);
}

.knowledge-asset-row h3,
.snapshot-row strong,
.knowledge-path-row strong,
.knowledge-gap-row strong {
  margin: 0;
  color: var(--text-strong);
  font-size: 0.88rem;
  font-weight: 800;
}

.knowledge-asset-row p,
.snapshot-row p,
.knowledge-path-row p,
.knowledge-gap-row p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.78rem;
  line-height: 1.6;
}

.knowledge-asset-row small,
.snapshot-row small,
.knowledge-gap-row small,
.knowledge-path-row small {
  color: var(--text-muted);
  font-size: 0.68rem;
  line-height: 1.5;
}

.asset-link {
  display: inline-grid;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  place-items: center;
  border-radius: var(--radius-control);
  color: var(--primary-600);
}

.asset-link:hover {
  background: var(--primary-50);
}

.knowledge-dual-modules {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  align-items: start;
}

.knowledge-path-row,
.knowledge-gap-row {
  padding: 1rem 0;
}

.knowledge-path-row + .knowledge-path-row,
.knowledge-gap-row + .knowledge-gap-row {
  border-top: 1px solid var(--border-subtle);
}

.knowledge-path-row__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.4rem;
}

.knowledge-path-row ol {
  display: grid;
  gap: 0.6rem;
  margin: 0.8rem 0 0;
  padding: 0;
  list-style: none;
}

.knowledge-path-row li {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  color: var(--text-primary);
  font-size: 0.76rem;
}

.knowledge-path-row li > div {
  display: grid;
  gap: 0.1rem;
}

.path-index {
  display: inline-grid;
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
  place-items: center;
  border-radius: 50%;
  background: var(--surface-3);
  color: var(--text-muted);
  font-size: 0.65rem;
  font-weight: 800;
}

.knowledge-path-row a {
  color: var(--primary-600);
  font-weight: 700;
}

.knowledge-gap-row {
  display: grid;
  gap: 0.35rem;
}

.snapshot-row {
  align-items: center;
}

.snapshot-row > div {
  display: grid;
  gap: 0.3rem;
  min-width: 0;
}

.snapshot-row > small {
  flex-shrink: 0;
}

:global(.dark .section-icon),
:global(.dark .node-chip),
:global(.dark .asset-state-archived),
:global(.dark .asset-readonly-chip),
:global(.dark .path-index) {
  background: var(--surface-3);
}

:global(.dark .knowledge-state-banner),
:global(.dark .relation-status--degraded) {
  border-color: #9a3412;
  background: rgba(124, 45, 18, 0.32);
  color: #fdba74;
}

:global(.dark .relation-status--confirmed),
:global(.dark .asset-state-chip) {
  background: rgba(6, 78, 59, 0.45);
  color: #6ee7b7;
}

:global(.dark .relation-status--suggested),
:global(.dark .asset-type-chip) {
  background: rgba(30, 64, 175, 0.32);
  color: #bfdbfe;
}

@media (max-width: 1023px) {
  .knowledge-layout {
    grid-template-columns: 1fr;
  }

  .knowledge-filter {
    position: static;
  }

  .knowledge-filter__body {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .advanced-filter,
  .knowledge-filter__submit {
    grid-column: 1 / -1;
  }
}

@media (max-width: 767px) {
  .knowledge-page {
    padding-top: 1rem;
  }

  .knowledge-intro__layout,
  .knowledge-summary,
  .knowledge-summary dl {
    align-items: stretch;
    flex-direction: column;
  }

  .knowledge-intro__actions {
    width: 100%;
  }

  .knowledge-intro__actions a {
    flex: 1 1 10rem;
  }

  .knowledge-summary dl {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .knowledge-summary dl > div {
    min-width: 0;
    padding: 0.75rem 0 0;
    border-top: 1px solid var(--border-subtle);
    border-left: 0;
  }

  .knowledge-relation-layout,
  .knowledge-dual-modules {
    grid-template-columns: 1fr;
  }

  .node-browser {
    border-right: 0;
    border-bottom: 1px solid var(--border-subtle);
  }
}

@media (max-width: 520px) {
  .knowledge-intro h1 {
    font-size: 1.45rem;
  }

  .knowledge-filter__body {
    grid-template-columns: 1fr;
  }

  .knowledge-filter__body > * {
    grid-column: 1;
  }

  .module-heading,
  .knowledge-filter__heading,
  .relation-group__heading,
  .knowledge-path-row__heading,
  .snapshot-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .module-count {
    padding-left: 2.7rem;
  }

  .knowledge-asset-row {
    gap: 0.4rem;
  }

  .knowledge-summary__seed strong {
    white-space: normal;
  }
}
</style>
