<template>
  <main class="explore-page">
    <section class="explore-band explore-band-hero">
      <div class="mb-8 explore-shell hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">OfferLab Discovery Map</p>
          <h1>频道广场与话题广场</h1>
          <p class="hero-summary">
            从运营精选专题、频道入口和活跃话题进入公开社区内容，发现真实经验、攻略和资源。
          </p>
          <form class="hero-search" @submit.prevent="submitSearch">
            <Search class="h-5 w-5" aria-hidden="true" />
            <input v-model.trim="keyword" type="search" placeholder="搜索公开经验、话题或资源" />
            <button type="submit" aria-label="搜索">
              <ArrowRight class="h-5 w-5" aria-hidden="true" />
            </button>
          </form>
        </div>
        <aside class="status-panel" aria-live="polite">
          <div class="status-row">
            <span>专题</span>
            <strong>{{ discoveryMap?.featuredTopics.length || 0 }}</strong>
          </div>
          <div class="status-row">
            <span>频道</span>
            <strong>{{ discoveryMap?.channels.length || 0 }}</strong>
          </div>
          <div class="status-row">
            <span>话题</span>
            <strong>{{ discoveryMap?.activeTopics.length || 0 }}</strong>
          </div>
          <div class="status-row">
            <span>领域</span>
            <strong>{{ activeDomainOption?.label || '全部' }}</strong>
          </div>
          <p v-if="loading" class="status-note">正在读取公共内容地图...</p>
          <p v-else-if="degraded" class="status-note">部分模块暂时不可用，页面已保留可访问入口。</p>
          <p v-else class="status-note">公共内容地图已就绪。</p>
        </aside>
      </div>
    </section>

    <section v-if="error" class="explore-band">
      <div class="explore-shell">
        <div class="state-banner state-banner-error">
          <AlertCircle class="h-5 w-5" aria-hidden="true" />
          <span>{{ error }}</span>
          <button type="button" @click="reload">
            <RefreshCw class="h-4 w-4" aria-hidden="true" />
            重试
          </button>
        </div>
      </div>
    </section>

    <section v-if="!loading && !error && !hasItems" class="explore-band">
      <div class="explore-shell">
        <div class="empty-panel">
          <Inbox class="h-8 w-8" aria-hidden="true" />
          <h2>发现页暂时没有可展示内容</h2>
          <p>可以先进入公开搜索浏览热门内容。</p>
          <RouterLink class="primary-link" to="/search?sort=hot">查看热门内容</RouterLink>
        </div>
      </div>
    </section>

    <section class="explore-band">
      <div class="explore-shell section-layout">
        <SectionHeader title="精选专题" :module="moduleOf('featuredTopics')" />
        <div v-if="loading" class="topic-grid">
          <SkeletonCard v-for="index in 3" :key="index" />
        </div>
        <div v-else-if="featuredTopics.length" class="topic-grid">
          <RouterLink v-for="item in featuredTopics" :key="item.id" class="feature-card" :to="item.href">
            <span class="card-kicker">运营精选</span>
            <h2>{{ item.title }}</h2>
            <p>{{ item.summary || item.reasonText || item.reason || '进入专题继续浏览公开内容。' }}</p>
            <span class="card-link">
              进入
              <ArrowRight class="h-4 w-4" aria-hidden="true" />
            </span>
          </RouterLink>
        </div>
        <ModuleEmpty v-else :module="moduleOf('featuredTopics')" />
      </div>
    </section>

    <section class="explore-band stage4-cross-domain-panel">
      <div class="explore-shell section-layout">
        <header class="section-header">
          <div>
            <p class="eyebrow">Cross-domain discovery</p>
            <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">跨领域推荐</h2>
            <p class="section-copy">
              基于公共内容信号与领域差异生成阅读建议，推荐理由会经过安全中和处理。
            </p>
          </div>
          <span class="module-status" :class="{ 'module-status-degraded': crossDomainStatus === 'degraded' || crossDomainStatus === 'failed' }">
            {{ crossDomainStatusLabel }}
          </span>
        </header>

        <div v-if="crossDomainStatus === 'unauthenticated'" class="module-empty">
          <Inbox class="h-5 w-5" aria-hidden="true" />
          <span>登录后可查看个性化跨领域推荐，当前只展示公共发现入口。</span>
        </div>
        <div v-else-if="crossDomainStatus === 'failed'" class="state-banner state-banner-error">
          <AlertCircle class="h-5 w-5" aria-hidden="true" />
          <span>跨领域推荐暂时不可用，已保留公共内容发现入口。</span>
          <button type="button" @click="loadCrossDomainRecommendations">
            <RefreshCw class="h-4 w-4" aria-hidden="true" />
            重试
          </button>
        </div>
        <div v-else-if="crossDomainStatus === 'loading'" class="topic-grid">
          <SkeletonCard v-for="index in 3" :key="index" />
        </div>
        <div v-else-if="crossDomainStatus === 'degraded'" class="state-banner">
          <AlertCircle class="h-5 w-5" aria-hidden="true" />
          <span>跨领域推荐处于降级展示，仅呈现已通过公开可见性过滤的内容。</span>
        </div>

        <div v-if="crossDomainRecommendations.length" class="topic-grid">
          <RouterLink
            v-for="item in crossDomainRecommendations"
            :key="item.item.post?.postId || safeCrossDomainReason(item)"
            class="feature-card"
            :to="`/post/${item.item.post?.postId}`"
          >
            <span class="card-kicker">{{ item.sourceDomainName || '公共内容' }} → {{ item.targetDomainName || '延展阅读' }}</span>
            <h2>{{ item.item.post?.title || '公开内容推荐' }}</h2>
            <p>{{ safeCrossDomainReason(item) }}</p>
            <span class="card-link">
              阅读
              <ArrowRight class="h-4 w-4" aria-hidden="true" />
            </span>
          </RouterLink>
        </div>
        <ModuleEmpty v-else-if="crossDomainStatus === 'empty'" />
      </div>
    </section>

    <section class="explore-band explore-band-muted">
      <article class="explore-shell section-layout">
        <header class="section-header">
          <div>
            <p class="eyebrow">Public discovery</p>
            <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">频道广场</h2>
            <p class="section-copy">
              选择一个频道后，会在发现页内聚合对应内容类型、代表话题和推荐标签。
            </p>
          </div>
          <span v-if="activeChannel" class="module-status">当前频道：{{ activeChannel.name }}</span>
        </header>
        <div v-if="COMMUNITY_CHANNELS.length" class="channel-grid">
          <RouterLink
            v-for="channel in COMMUNITY_CHANNELS"
            :key="channel.key"
            class="channel-card"
            :to="{ path: '/explore', query: { channel: channel.key } }"
          >
            <span class="channel-icon">{{ channel.icon || 'C' }}</span>
            <strong>{{ channel.name }}</strong>
            <p>{{ channel.description }}</p>
            <small v-if="channel.topics?.length">代表话题：{{ channel.topics.slice(0, 2).join(' / ') }}</small>
            <small v-if="channel.tags?.length">推荐标签：{{ channel.tags.slice(0, 3).join(' / ') }}</small>
            <small>计数为近 30 天发布分布：{{ channelContentCount(channel) }}</small>
            <span class="card-link">
              {{ activeChannel?.key === channel.key ? '当前频道' : '进入频道聚合' }}
              <ArrowRight class="h-4 w-4" aria-hidden="true" />
            </span>
          </RouterLink>
        </div>
        <div v-if="channelFeaturedDirections.length" class="channel-featured-direction-grid">
          <RouterLink
            v-for="direction in channelFeaturedDirections"
            :key="`${direction.channelKey}-${direction.topic}`"
            class="channel-featured-direction"
            :to="direction.href"
          >
            <span class="card-kicker">精选方向</span>
            <strong>{{ direction.topic }}</strong>
            <p>{{ direction.channelName }} · {{ direction.tags.join(' / ') }}</p>
            <small v-if="direction.riskNote">{{ direction.riskNote }}</small>
          </RouterLink>
        </div>
        <div v-if="activeChannel" class="compact-list">
          <RouterLink
            v-for="post in visibleLatestPosts"
            :key="post.postId"
            class="compact-row"
            :to="`/post/${post.postId}`"
          >
            <img v-if="latestPostCoverUrl(post)" :src="latestPostCoverUrl(post)" :alt="post.title" class="latest-post-cover" />
            <Hash v-else class="h-4 w-4" aria-hidden="true" />
            <span>{{ post.title }}</span>
            <small>{{ activeChannel.name }} · {{ getContentTypeShortLabel(post.postType) }}</small>
          </RouterLink>
        </div>
        <div v-if="recommendedAuthors.length" class="compact-list">
          <button
            v-for="user in recommendedAuthors"
            :key="user.uid"
            type="button"
            class="compact-row"
            :disabled="followingBusyIds.has(String(user.uid))"
            @click="toggleFollowUser(user)"
          >
            <Hash class="h-4 w-4" aria-hidden="true" />
            <span>{{ user.nickname }}</span>
            <small>{{ user.isFollowing ? '已关注' : '关注作者' }} · {{ user.followerCount || 0 }} 位关注者</small>
            <small v-for="reason in user.followReasons" :key="reason">{{ reason }}</small>
          </button>
        </div>
      </article>
      <div class="explore-shell section-layout">
        <SectionHeader title="频道入口" :module="moduleOf('channels')" />
        <div v-if="channels.length" class="channel-grid">
          <RouterLink v-for="item in channels" :key="item.id" class="channel-card" :to="item.href">
            <span class="channel-icon">{{ item.icon || 'C' }}</span>
            <strong>{{ item.title }}</strong>
            <p>{{ item.summary }}</p>
          </RouterLink>
        </div>
        <ModuleEmpty v-else :module="moduleOf('channels')" />
      </div>
    </section>

    <section class="explore-band">
      <div class="explore-shell two-column-layout">
        <div class="section-layout">
          <SectionHeader title="活跃话题" :module="moduleOf('activeTopics')" />
          <div v-if="activeTopics.length" class="compact-list">
            <RouterLink v-for="item in activeTopics" :key="item.id" class="compact-row" :to="item.href">
              <Hash class="h-4 w-4" aria-hidden="true" />
              <span>{{ item.title }}</span>
              <small v-if="item.reasonText || item.reason">{{ item.reasonText || item.reason }}</small>
            </RouterLink>
          </div>
          <ModuleEmpty v-else :module="moduleOf('activeTopics')" />
        </div>

        <div class="section-layout">
          <SectionHeader title="搜索延展" :module="moduleOf('searchEntrypoints')" />
          <div class="search-entry-grid">
            <RouterLink class="search-entry" :to="communityQuestionQuery">
              <Search class="h-4 w-4" aria-hidden="true" />
              <span>社区问答讨论</span>
            </RouterLink>
            <RouterLink class="search-entry" :to="{ path: '/explore', query: { channel: 'learning-growth' } }">
              <Hash class="h-4 w-4" aria-hidden="true" />
              <span>学习话题</span>
              <small>阅读、读书、书单、学习方法：阅读清单共读 / 学习方法复盘</small>
            </RouterLink>
            <RouterLink v-for="item in searchEntrypoints" :key="item.id" class="search-entry" :to="item.href">
              <Search class="h-4 w-4" aria-hidden="true" />
              <span>{{ item.title }}</span>
            </RouterLink>
          </div>
          <ModuleEmpty v-if="!searchEntrypoints.length" :module="moduleOf('searchEntrypoints')" />
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { AlertCircle, ArrowRight, Hash, Inbox, RefreshCw, Search } from 'lucide-vue-next'
import { dashboardApi, type RankedMetric } from '@/api/dashboard'
import { localDomainConfigs } from '@/api/domains'
import { recommendationsApi } from '@/api/recommendations'
import { useAuthStore } from '@/stores/auth'
import { useDiscoveryMap } from '@/composables/useDiscoveryMap'
import { COMMUNITY_CHANNELS, DOMAIN_OPTIONS, getCommunityChannel, normalizeDomain, type CommunityChannel, type DomainValue } from '@/utils/domains'
import { COMMUNITY_CONTENT_TYPES, POST_TYPE, getContentTypeShortLabel, type PostTypeValue } from '@/utils/contentTypes'
import { filterDiscoverySuppressedItems, filterVisiblePosts, normalizeRecommendationReason, type ViewerDiscoverySuppressions } from '@/utils/recommendationGovernance'
import { filterPublicContent } from '@/utils/textQuality'
import { buildFollowReasons, isPublicAuthor } from '@/utils/creatorSignals'
import { discoveryApi, type DiscoveryItem, type DiscoveryModuleState } from '@/api/discovery'
import type { CrossDomainRecommendation, Post, User } from '@/api/types'

type RecommendedAuthor = User & {
  followReasons: string[]
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const keyword = ref('')
const { data: discoveryMap, loading, error, degraded, hasItems, reload } = useDiscoveryMap()
const defaultChannelPostTypes = [POST_TYPE.NOTE, POST_TYPE.QUESTION, POST_TYPE.TECH_ARTICLE, POST_TYPE.RESOURCE]
const domainOptions = ref(localDomainConfigs.length
  ? localDomainConfigs.map((item) => ({
    value: item.domain as DomainValue,
    label: item.domainName,
    icon: item.icon,
    description: item.description,
  }))
  : [...DOMAIN_OPTIONS])
const latestPosts = ref<Post[]>([])
const channelLatestPosts = ref<Post[]>([])
const contentTypeDistribution = ref<RankedMetric[]>([])
const followingBusyIds = ref(new Set<string>())
const crossDomainRecommendationItems = ref<CrossDomainRecommendation[]>([])
const crossDomainStatus = ref<'idle' | 'loading' | 'ready' | 'empty' | 'unauthenticated' | 'failed' | 'degraded'>('idle')

const viewerDiscoverySuppressions = computed<ViewerDiscoverySuppressions>(() => ({}))
const visibleDiscoveryItems = (items?: DiscoveryItem[]) => filterDiscoverySuppressedItems(filterVisiblePosts(items || []), viewerDiscoverySuppressions.value)
const postSummaryForDiscovery = (post: Post) => (post.highlightSummary || post.summary || post.content || '').replace(/\s+/g, ' ').trim().slice(0, 120)
const postToDiscoveryItem = (post: Post): DiscoveryItem => ({
  id: `post-${String(post.postId)}`,
  type: 'post',
  title: post.highlightTitle || post.title,
  summary: postSummaryForDiscovery(post),
  href: `/post/${encodeURIComponent(String(post.postId))}`,
  source: 'public-content-query',
  sourceId: post.postId,
  domain: post.domain,
  tags: (post.tags || []).map((tag) => tag.name).filter(Boolean),
  reasonText: getContentTypeShortLabel(post.postType),
})
const cleanTags = computed(() => filterDiscoverySuppressedItems(discoveryMap.value?.searchEntrypoints || [], viewerDiscoverySuppressions.value))
const cleanTopics = computed(() => filterDiscoverySuppressedItems(visibleDiscoveryItems(discoveryMap.value?.activeTopics), viewerDiscoverySuppressions.value))
const cleanLatestPosts = computed(() => filterVisiblePosts(
  filterDiscoverySuppressedItems(filterPublicContent(latestPosts.value).map(postToDiscoveryItem), viewerDiscoverySuppressions.value),
  5,
))
const cleanFeaturedTopics = computed(() => filterDiscoverySuppressedItems(filterVisiblePosts(discoveryMap.value?.featuredTopics || [], 5), viewerDiscoverySuppressions.value))
const isFeaturedPost = (item: any): item is DiscoveryItem => Boolean(item.href && item.title)
const featuredPosts = computed(() => cleanLatestPosts.value.filter(isFeaturedPost))
const featuredTopics = computed<DiscoveryItem[]>(() => featuredPosts.value.length ? featuredPosts.value : cleanFeaturedTopics.value.filter(isFeaturedPost))
const channels = computed(() => visibleDiscoveryItems(discoveryMap.value?.channels))
const activeTopics = computed(() => cleanTopics.value)
const searchEntrypoints = computed(() => cleanTags.value)
const activeDomain = computed<DomainValue | undefined>(() => {
  const value = route.query.domain
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return undefined
  const numeric = Number(raw)
  return Number.isFinite(numeric) ? normalizeDomain(numeric) : undefined
})
const activeDomainOption = computed(() => domainOptions.value.find((item) => item.value === activeDomain.value))
const activeChannelQuery = computed(() => {
  const value = route.query.channel
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  return typeof value === 'string' ? value : undefined
})
const activeChannel = computed(() => getCommunityChannel(activeChannelQuery.value))
const activeChannelPostTypes = computed(() => (
  activeChannel.value?.postTypes?.length ? activeChannel.value.postTypes : defaultChannelPostTypes
))
const activeChannelPostTypeSet = computed(() => new Set<PostTypeValue>(activeChannelPostTypes.value))
const channelFeaturedDirections = computed(() => {
  const source = activeChannel.value ? [activeChannel.value] : COMMUNITY_CHANNELS
  return source.flatMap((channel) => (channel.topics || []).slice(0, 2).map((topic) => ({
    channelKey: channel.key,
    channelName: channel.name,
    topic,
    tags: (channel.tags || []).slice(0, 3),
    riskNote: channel.riskNote,
    href: {
      path: '/search',
      query: {
        q: topic,
        channel: channel.key,
        ...(channel.domain ? { domain: String(channel.domain) } : {}),
      },
    },
  })))
})
const visibleLatestPosts = computed(() => filterVisiblePosts(
  filterDiscoverySuppressedItems(filterPublicContent(channelLatestPosts.value), viewerDiscoverySuppressions.value),
  6,
)
  .filter((post) => activeChannelPostTypeSet.value.has(Number(post.postType) as PostTypeValue)))
const rawRecommendedAuthors = computed<RecommendedAuthor[]>(() => {
  const users = new Map<string, User>()
  const postsByAuthor = new Map<string, Post[]>()
  visibleLatestPosts.value
    .filter((post) => isPublicAuthor(post.author))
    .forEach((post) => {
      const uid = String(post.author?.uid || '')
      if (uid && post.author && !users.has(uid)) users.set(uid, post.author)
      if (uid) postsByAuthor.set(uid, [...(postsByAuthor.get(uid) || []), post])
    })
  return Array.from(users.values())
    .filter(isPublicAuthor)
    .slice(0, 4)
    .map((user) => Object.assign(user, {
      followReasons: buildFollowReasons(user, postsByAuthor.get(String(user.uid)) || []),
    }))
})
const cleanRecommendedUsers = computed(() => filterDiscoverySuppressedItems(rawRecommendedAuthors.value, viewerDiscoverySuppressions.value))
const recommendedAuthors = computed(() => cleanRecommendedUsers.value)
const communityQuestionQuery = computed(() => ({
  path: '/search',
  query: {
    mode: 'posts',
    type: String(POST_TYPE.QUESTION),
    sort: 'hot',
  },
}))
const crossDomainStatusLabel = computed(() => {
  if (crossDomainStatus.value === 'unauthenticated') return '登录可用'
  if (crossDomainStatus.value === 'failed') return '暂不可用'
  if (crossDomainStatus.value === 'degraded') return '降级展示'
  if (crossDomainStatus.value === 'loading') return '加载中'
  if (crossDomainStatus.value === 'empty') return '暂无推荐'
  return '已过滤'
})
const safeCrossDomainReason = (item: CrossDomainRecommendation) => (
  normalizeRecommendationReason(item.recommendationReason) || '公共内容信号显示这篇内容适合作为延展阅读。'
)
const crossDomainRecommendations = computed(() => filterDiscoverySuppressedItems(
  crossDomainRecommendationItems.value,
  viewerDiscoverySuppressions.value,
)
  .filter((item) => filterVisiblePosts(item.item.post ? [item.item.post] : []).length > 0))

const moduleOf = (key: string): DiscoveryModuleState | undefined => discoveryMap.value?.modules?.[key]

const contentTypeCount = (type: number) => {
  const option = COMMUNITY_CONTENT_TYPES.find((item) => item.value === type)
  return contentTypeDistribution.value.find((item) => item.name === option?.label)?.count
    ?? channelLatestPosts.value.filter((post) => Number(post.postType) === type).length
}

const channelContentCount = (channel: CommunityChannel) => {
  const types = channel.postTypes?.length ? channel.postTypes : defaultChannelPostTypes
  return types.reduce((sum, type) => sum + contentTypeCount(type), 0)
}

const latestPostCoverUrl = (post: Post) => String(post.coverUrl || '').trim()

const syncAuthorFollowState = (uid: User['uid'], following: boolean, followerCount: number) => {
  channelLatestPosts.value.forEach((post) => {
    if (String(post.author.uid) === String(uid)) {
      post.author.isFollowing = following
      post.author.followerCount = followerCount
    }
  })
}

const toggleFollowUser = async (user: User) => {
  const uid = String(user.uid)
  if (!uid || followingBusyIds.value.has(uid)) return
  followingBusyIds.value = new Set(followingBusyIds.value).add(uid)
  const wasFollowing = Boolean(user.isFollowing)
  try {
    if (wasFollowing) {
      await discoveryApi.unfollowPublicAuthor(user.uid)
    } else {
      await discoveryApi.followPublicAuthor(user.uid)
    }
    const followerCount = Math.max(0, Number(user.followerCount ?? 0) + (wasFollowing ? -1 : 1))
    user.isFollowing = !wasFollowing
    user.followerCount = followerCount
    syncAuthorFollowState(user.uid, user.isFollowing, followerCount)
  } finally {
    const next = new Set(followingBusyIds.value)
    next.delete(uid)
    followingBusyIds.value = next
  }
}

const loadTrendMetrics = async () => {
  try {
    const res = await dashboardApi.getTrendDashboard('30d', activeDomain.value)
    contentTypeDistribution.value = res.data?.contentTypeDistribution || []
  } catch {
    contentTypeDistribution.value = []
  }
}

const loadChannelLatestPosts = async () => {
  if (!activeChannel.value) {
    latestPosts.value = []
    channelLatestPosts.value = []
    return
  }
  const settled = await Promise.allSettled(activeChannelPostTypes.value.map((type) => discoveryApi.listPublicChannelPosts({
    type,
    size: 6,
    domain: activeDomain.value,
  })))
  const postRes = settled.find((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof discoveryApi.listPublicChannelPosts>>> => result.status === 'fulfilled')
  if (postRes) {
    latestPosts.value = filterVisiblePosts(filterPublicContent(postRes.value.data?.items || []))
  } else {
    latestPosts.value = []
  }
  channelLatestPosts.value = filterVisiblePosts(filterPublicContent(settled
    .flatMap((result) => result.status === 'fulfilled' ? (result.value.data?.items || []) : [])
    .filter((post, index, source) => source.findIndex((item) => item.postId === post.postId) === index)))
}

const loadCrossDomainRecommendations = async () => {
  if (!authStore.token) {
    crossDomainRecommendationItems.value = []
    crossDomainStatus.value = 'unauthenticated'
    return
  }
  crossDomainStatus.value = 'loading'
  try {
    const res = await recommendationsApi.listCrossDomain(undefined, 6)
    const items = res.data?.items || []
    crossDomainRecommendationItems.value = items
    if (!items.length) {
      crossDomainStatus.value = 'empty'
    } else if (items.some((item) => item.degraded)) {
      crossDomainStatus.value = 'degraded'
    } else {
      crossDomainStatus.value = 'ready'
    }
  } catch (err) {
    const status = (err as { response?: { status?: number }, code?: number })?.response?.status
    const code = (err as { code?: number })?.code
    crossDomainRecommendationItems.value = []
    crossDomainStatus.value = status === 401 || code === 10401 ? 'unauthenticated' : 'failed'
  }
}

const submitSearch = () => {
  const q = keyword.value.trim()
  router.push({ path: '/search', query: q ? { q, sort: 'hot' } : { sort: 'hot' } })
}

loadCrossDomainRecommendations()

watch(() => [route.query.channel, route.query.domain] as const, () => {
  loadTrendMetrics()
  loadChannelLatestPosts()
}, { immediate: true })

const SectionHeader = defineComponent({
  props: {
    title: { type: String, required: true },
    module: { type: Object as () => DiscoveryModuleState | undefined, required: false },
  },
  setup(props) {
    return () => h('header', { class: 'section-header' }, [
      h('div', [
        h('p', { class: 'eyebrow' }, 'Public discovery'),
        h('h2', props.title),
      ]),
      props.module
        ? h('span', { class: ['module-status', props.module.degraded ? 'module-status-degraded' : ''] }, props.module.degraded ? '暂不可用' : `${props.module.itemCount} 项`)
        : null,
    ])
  },
})

const ModuleEmpty = defineComponent({
  props: {
    module: { type: Object as () => DiscoveryModuleState | undefined, required: false },
  },
  setup(props) {
    return () => h('div', { class: 'module-empty' }, [
      h(Inbox, { class: 'h-5 w-5', 'aria-hidden': 'true' }),
      h('span', props.module?.fallbackReason ? '这个模块暂时没有可展示内容。' : '暂无可展示内容。'),
    ])
  },
})

const SkeletonCard = defineComponent({
  setup() {
    return () => h('div', { class: 'skeleton-card', 'aria-hidden': 'true' }, [
      h('span'),
      h('strong'),
      h('p'),
    ])
  },
})
</script>

<style scoped>
.explore-page {
  min-height: 100vh;
  background: #f7faf9;
  color: #111827;
}

.explore-band {
  width: 100%;
  padding: 28px 20px;
}

.explore-band-hero {
  padding-top: 44px;
  background: linear-gradient(135deg, #0f172a 0%, #164e63 48%, #365314 100%);
  color: white;
}

.explore-band-muted {
  background: #eef7f3;
}

.explore-shell {
  width: min(1120px, 100%);
  margin: 0 auto;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.6fr);
  gap: 24px;
  align-items: end;
}

.hero-copy h1 {
  margin: 0;
  font-size: 42px;
  line-height: 1.12;
  letter-spacing: 0;
}

.hero-summary {
  margin: 14px 0 22px;
  max-width: 620px;
  color: #dbeafe;
  font-size: 16px;
  line-height: 1.7;
}

.eyebrow {
  margin: 0 0 8px;
  color: #0891b2;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.explore-band-hero .eyebrow {
  color: #a7f3d0;
}

.hero-search {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 44px;
  align-items: center;
  width: min(620px, 100%);
  min-height: 52px;
  gap: 10px;
  padding: 6px 6px 6px 16px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.96);
  color: #334155;
}

.hero-search input {
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #111827;
  font-size: 15px;
}

.hero-search button,
.state-banner button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 8px;
  background: #0f766e;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.hero-search button {
  width: 40px;
  height: 40px;
}

.status-panel {
  display: grid;
  gap: 10px;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.42);
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 32px;
  color: #dbeafe;
}

.status-row strong {
  font-size: 24px;
  color: white;
}

.status-note {
  margin: 6px 0 0;
  color: #ccfbf1;
  line-height: 1.6;
}

.state-banner,
.empty-panel,
.module-empty {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  padding: 14px 16px;
  color: #475569;
}

.state-banner-error {
  border-color: #fecaca;
  color: #991b1b;
}

.state-banner button {
  min-height: 36px;
  padding: 0 12px;
  margin-left: auto;
}

.empty-panel {
  flex-direction: column;
  align-items: flex-start;
  padding: 24px;
}

.empty-panel h2 {
  margin: 0;
  font-size: 22px;
}

.empty-panel p {
  margin: 0;
}

.primary-link,
.card-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #0f766e;
  font-weight: 800;
  text-decoration: none;
}

.section-layout {
  display: grid;
  gap: 16px;
}

.section-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}

.section-header h2 {
  margin: 0;
  font-size: 26px;
  line-height: 1.2;
  letter-spacing: 0;
}

.module-status {
  flex: 0 0 auto;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 800;
}

.module-status-degraded {
  background: #fef3c7;
  color: #92400e;
}

.topic-grid,
.channel-grid,
.channel-featured-direction-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.feature-card,
.channel-card,
.channel-featured-direction,
.search-entry {
  border: 1px solid #dbe3ea;
  border-radius: 8px;
  background: white;
  color: inherit;
  text-decoration: none;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.feature-card {
  display: grid;
  align-content: space-between;
  min-height: 210px;
  padding: 18px;
}

.feature-card:hover,
.channel-card:hover,
.channel-featured-direction:hover,
.search-entry:hover {
  transform: translateY(-2px);
  border-color: #0f766e;
  box-shadow: 0 18px 40px -30px rgba(15, 23, 42, 0.45);
}

.card-kicker {
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
}

.feature-card h2 {
  margin: 10px 0;
  font-size: 20px;
  line-height: 1.35;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.feature-card p,
.channel-card p {
  margin: 0;
  color: #64748b;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.channel-card {
  display: grid;
  gap: 8px;
  min-height: 156px;
  padding: 16px;
}

.channel-featured-direction {
  display: grid;
  gap: 8px;
  min-height: 136px;
  padding: 16px;
}

.channel-featured-direction strong {
  color: #111827;
  font-size: 16px;
}

.channel-featured-direction small {
  color: #92400e;
  line-height: 1.6;
}

.channel-icon {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #e0f2fe;
  color: #075985;
  font-weight: 900;
}

.two-column-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.72fr);
  gap: 22px;
}

.compact-list,
.search-entry-grid {
  display: grid;
  gap: 10px;
}

.compact-row {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  border-bottom: 1px solid #e2e8f0;
  color: #1f2937;
  text-decoration: none;
}

.compact-row span {
  overflow-wrap: anywhere;
  font-weight: 700;
}

.compact-row small {
  color: #64748b;
}

.latest-post-cover {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  object-fit: cover;
  background: #e2e8f0;
}

.search-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 14px;
  font-weight: 800;
}

.skeleton-card {
  min-height: 210px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f1f5f9, #e2e8f0, #f1f5f9);
}

.skeleton-card span,
.skeleton-card strong,
.skeleton-card p {
  display: block;
}

@media (max-width: 900px) {
  .hero-grid,
  .two-column-layout {
    grid-template-columns: 1fr;
  }

  .topic-grid,
  .channel-grid,
  .channel-featured-direction-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .explore-band {
    padding: 22px 14px;
  }

  .hero-copy h1 {
    font-size: 32px;
  }

  .topic-grid,
  .channel-grid,
  .channel-featured-direction-grid {
    grid-template-columns: 1fr;
  }

  .section-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .compact-row {
    grid-template-columns: 20px minmax(0, 1fr);
  }

  .compact-row small {
    grid-column: 2;
  }
}
</style>
