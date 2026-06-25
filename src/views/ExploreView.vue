<template>
  <div class="app-shell">
    <AppHeader />
    <main class="mx-auto max-w-6xl px-4 py-8">
      <div class="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100">发现</h1>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">从技术、职场、阅读与生活实践里发现值得收藏的真实经验。</p>
        </div>
        <RouterLink to="/editor" class="primary-action">
          发布内容
        </RouterLink>
      </div>

      <section class="surface-card mb-8 p-5">
        <div class="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-end">
          <label>
            <span class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">关键词</span>
            <input v-model="searchForm.q" class="filter-input dark:!border-slate-700 dark:!bg-slate-950/60 dark:!text-slate-200 dark:placeholder:!text-slate-500" placeholder="项目复盘、踩坑记录、工具资源" @keyup.enter="goSearch" />
          </label>
          <label>
            <span class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">技术栈</span>
            <input v-model="searchForm.techStack" class="filter-input dark:!border-slate-700 dark:!bg-slate-950/60 dark:!text-slate-200 dark:placeholder:!text-slate-500" placeholder="例如 Spring Boot" @keyup.enter="goSearch" />
          </label>
          <label>
            <span class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">场景</span>
            <input v-model="searchForm.scenario" class="filter-input dark:!border-slate-700 dark:!bg-slate-950/60 dark:!text-slate-200 dark:placeholder:!text-slate-500" placeholder="例如 性能优化" @keyup.enter="goSearch" />
          </label>
          <button type="button" class="primary-action px-5 py-2.5" @click="goSearch">
            搜索内容
          </button>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <button
            v-for="item in quickFilters"
            :key="item.value"
            type="button"
            class="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-300 dark:hover:border-primary-700 dark:hover:bg-slate-800"
            @click="applyQuickFilter(item)"
          >
            {{ item.label }}
          </button>
        </div>
      </section>

      <section class="surface-card stage4-cross-domain-panel mb-8 p-6">
        <div class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="max-w-3xl">
            <span class="stage4-kicker">阶段 4 差异化品牌</span>
            <h2 class="mt-3 text-xl font-black text-slate-900 dark:text-slate-100">跨领域推荐</h2>
            <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              用规则优先的桥接逻辑，把你熟悉领域之外但仍然相关的内容先解释清楚，再推荐给你。
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <RouterLink v-if="authStore.isLoggedIn" to="/growth/profile" class="secondary-action">
              成长档案
            </RouterLink>
            <RouterLink to="/knowledge/explore" class="secondary-action">
              知识关系
            </RouterLink>
          </div>
        </div>

        <div
          v-if="crossDomainStatus === 'unauthenticated'"
          class="rounded-2xl border border-dashed border-slate-200 px-5 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400"
        >
          登录后可查看基于个人领域轨迹生成的跨领域推荐；未登录时发现页仍保持公共内容浏览能力。
        </div>

        <LoadingSkeleton v-else-if="crossDomainStatus === 'loading'" />

        <div v-else-if="crossDomainStatus === 'failed'" class="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          <div>{{ crossDomainError || '跨领域推荐加载失败。' }}</div>
          <button type="button" class="secondary-action mt-3" @click="loadExploreData">
            重新加载
          </button>
        </div>

        <div v-else-if="crossDomainRecommendations.length" class="grid gap-4 lg:grid-cols-3">
          <RouterLink
            v-for="item in crossDomainRecommendations"
            :key="`${item.item.post?.postId}-${item.targetDomain}`"
            :to="`/post/${item.item.post?.postId}`"
            class="cross-domain-card"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="cross-domain-bridge">{{ item.sourceDomainName || '当前领域' }} -> {{ item.targetDomainName || '扩展领域' }}</span>
              <span v-if="item.degraded || crossDomainStatus === 'degraded'" class="cross-domain-fallback">降级</span>
            </div>
            <h3 class="mt-3 text-base font-black text-slate-900 dark:text-slate-100">
              {{ item.item.post?.title || '推荐内容' }}
            </h3>
            <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {{ crossDomainPreview(item) }}
            </p>
            <div class="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
              {{ item.recommendationReason }}
            </div>
          </RouterLink>
        </div>

        <EmptyState
          v-else
          title="当前还没有可解释的跨领域推荐"
          description="可以继续完善关注领域、互动内容或公开发帖样本，系统会逐步形成桥接推荐。"
          action-text="去成长档案"
          action-href="/growth/profile"
        />

        <div
          v-if="crossDomainStatus === 'degraded' || crossDomainFallbackReason"
          class="cross-domain-note mt-4"
        >
          {{ crossDomainFallbackReason || '当前结果包含回退内容，推荐理由会优先解释降级来源。' }}
        </div>
      </section>

      <section class="mb-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article class="surface-card p-6">
          <div class="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">领域入口</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">优先读取后端启用领域，接口失败时自动回退默认五大领域，先从一个你最熟悉的方向开始浏览。</p>
            </div>
            <span class="domain-source-chip">{{ domainSourceSummary }}</span>
          </div>
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <RouterLink
              v-for="domain in visibleDomains"
              :key="domain.domain"
              :to="{ path: '/explore', query: { domain: String(domain.domain) } }"
              class="domain-card"
            >
              <div class="domain-card__header">
                <div class="domain-card__title">
                  <span class="domain-card__icon">{{ domain.icon }}</span>
                  <h3>{{ domain.domainName }}</h3>
                </div>
                <span class="domain-card__risk">{{ riskLevelLabel(domain.riskLevel) }}</span>
              </div>
              <p>{{ domain.description }}</p>
              <small>{{ domain.browseNotice || domain.interactionNotice }}</small>
            </RouterLink>
          </div>
        </article>

        <article class="surface-card reading-pilot-card p-6">
          <span class="reading-pilot-badge">阶段 2 阅读试点</span>
          <div class="mt-3">
            <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">阅读专题</h2>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{{ readingDomainIntro }}</p>
          </div>
          <div class="mt-5 space-y-3">
            <RouterLink
              :to="{ path: '/explore', query: { domain: String(DOMAIN.READING) } }"
              class="reading-spotlight"
            >
              <div>
                <strong>进入阅读发现流</strong>
                <p>从读书笔记、书单推荐和方法论摘录开始，先看内容，再决定是否收藏或参与讨论。</p>
              </div>
              <span>{{ readingPostCount }} 篇</span>
            </RouterLink>
            <div class="grid gap-2 sm:grid-cols-2">
              <RouterLink
                v-for="topic in readingTopicItems"
                :key="topic.name"
                :to="topic.href"
                class="reading-topic-chip"
              >
                <span>{{ topic.name }}</span>
                <strong>{{ topic.count }}</strong>
              </RouterLink>
            </div>
          </div>
        </article>
      </section>

      <section class="surface-card mb-8 p-6">
        <div class="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">内容频道</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">按社区内容类型进入不同经验流，计数为近 30 天发布分布。</p>
          </div>
          <RouterLink to="/search?sort=hot" class="text-sm font-medium text-primary-600 hover:text-primary-700">热门内容</RouterLink>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <RouterLink
            v-for="type in contentTypeChannels"
            :key="type.value"
            :to="{ path: '/search', query: { type: String(type.value), sort: 'hot' } }"
            class="channel-card"
          >
            <div>
              <h3>{{ type.label }}</h3>
              <p>{{ type.description }}</p>
            </div>
            <span>{{ contentTypeCount(type.value) }} 篇</span>
          </RouterLink>
        </div>
      </section>

      <section class="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article class="surface-card p-6">
          <div class="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">精选内容</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">运营标记或高互动内容会优先沉淀在这里。</p>
            </div>
            <RouterLink :to="{ path: '/', query: { feed: 'featured' } }" class="text-sm font-medium text-primary-600 hover:text-primary-700">进入精选流</RouterLink>
          </div>
          <div v-if="featuredPosts.length" class="space-y-3">
            <RouterLink
              v-for="post in featuredPosts"
              :key="post.postId"
              :to="`/post/${post.postId}`"
              class="featured-row"
            >
              <span>精选</span>
              <div class="min-w-0">
                <h3>{{ post.title }}</h3>
                <p>{{ post.summary || post.content.substring(0, 90) }}</p>
              </div>
            </RouterLink>
          </div>
          <EmptyState v-else title="暂无精选内容" description="后台设置精选后会展示在这里。" />
        </article>

        <article class="surface-card p-6">
          <div class="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">专题入口</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">阅读试点优先露出，其他专题继续按技术栈、业务场景和标签聚合。</p>
            </div>
          </div>
          <div v-if="topicItems.length" class="grid gap-2">
            <RouterLink
              v-for="topic in topicItems"
              :key="topic.name"
              :to="topic.href"
              class="topic-row"
            >
              <span class="topic-label truncate">{{ topic.name }}</span>
              <strong class="topic-count">{{ topic.count }}</strong>
            </RouterLink>
          </div>
          <EmptyState v-else title="暂无专题" description="发布内容并补充技术栈或标签后会形成专题。" />
        </article>
      </section>

      <section class="surface-card mb-8 p-6">
        <div class="mb-5 flex items-center justify-between gap-4">
          <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">热门标签</h2>
          <span class="text-sm text-slate-500 dark:text-slate-400">{{ sortedTags.length }} 个标签</span>
        </div>
        <div v-if="isLoadingMeta" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div v-for="i in 10" :key="i" class="h-10 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
        <div v-else-if="sortedTags.length" class="flex flex-wrap gap-3">
          <RouterLink
            v-for="tag in sortedTags.slice(0, 24)"
            :key="tag.id"
            :to="`/tag/${tag.slug || tag.id}`"
            class="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:border-primary-700 dark:hover:bg-slate-800"
          >
            {{ tag.name }}
            <span class="ml-2 text-xs text-slate-500 dark:text-slate-400">{{ tag.count ?? 0 }}</span>
          </RouterLink>
        </div>
        <EmptyState v-else title="暂无标签" description="发布内容时添加标签后会显示在这里。" />
      </section>

      <section class="surface-card mb-8 p-6">
        <div class="mb-5 flex items-center justify-between gap-4">
          <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">推荐用户</h2>
          <RouterLink to="/search?mode=users" class="text-sm font-medium text-primary-600 hover:text-primary-700">查看更多</RouterLink>
        </div>
        <div v-if="cleanRecommendedUsers.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article
            v-for="user in cleanRecommendedUsers"
            :key="user.uid"
            class="recommended-user-card"
          >
            <RouterLink :to="`/u/${user.uid}`" class="block">
              <div class="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary-600 text-xl font-bold text-white">
                <img v-if="user.avatar" :src="user.avatar" :alt="user.nickname" class="h-full w-full object-cover" />
                <span v-else>{{ user.nickname.charAt(0) || '?' }}</span>
              </div>
              <h3 class="truncate font-bold text-slate-900 dark:text-slate-100">{{ user.nickname }}</h3>
              <p class="mt-1 line-clamp-2 min-h-8 text-xs text-slate-500 dark:text-slate-400">{{ userDisplaySignature(user) }}</p>
            </RouterLink>
            <div class="user-stats">
              <span class="user-stat-chip">
                <strong>{{ user.postCount ?? 0 }}</strong>
                <small>帖子</small>
              </span>
              <span class="user-stat-chip">
                <strong>{{ user.followerCount ?? 0 }}</strong>
                <small>粉丝</small>
              </span>
            </div>
            <button
              type="button"
              class="follow-button"
              :class="user.isFollowing ? 'follow-button--active' : 'follow-button--primary'"
              :disabled="isSelf(user) || followingBusyIds.has(String(user.uid))"
              @click="toggleFollowUser(user)"
            >
              {{ user.isFollowing ? '已关注' : '关注' }}
            </button>
          </article>
        </div>
        <EmptyState v-else title="暂无推荐用户" description="活跃作者和实践者会展示在这里。" />
      </section>

      <section class="surface-card p-6">
        <div class="mb-5 flex items-center justify-between gap-4">
          <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">最新发布</h2>
          <RouterLink to="/" class="text-sm font-medium text-primary-600 hover:text-primary-700">进入信息流</RouterLink>
        </div>
        <LoadingSkeleton v-if="isLoadingPosts" />
        <div v-else-if="cleanLatestPosts.length" class="space-y-4">
          <RouterLink
            v-for="post in cleanLatestPosts"
            :key="post.postId"
            :to="`/post/${post.postId}`"
            class="block rounded-lg border border-slate-200 bg-white/65 p-4 transition-colors hover:border-primary-300 dark:border-slate-800 dark:bg-slate-950/25 dark:hover:border-primary-700"
          >
            <div class="flex items-start gap-4">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-600 text-sm font-bold text-white">
                <img v-if="post.author.avatar" :src="post.author.avatar" :alt="post.author.nickname" class="h-full w-full object-cover" />
                <span v-else>{{ post.author.nickname.charAt(0) || '?' }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="mb-1 flex flex-wrap items-center gap-2">
                  <span class="font-semibold text-slate-900 dark:text-slate-100">{{ post.author.nickname || '未知用户' }}</span>
                <span v-if="primaryMeta(post)" class="rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {{ primaryMeta(post) }}
                  </span>
                </div>
                <h3 class="mb-1 line-clamp-1 text-sm font-bold text-slate-900 dark:text-slate-100">{{ post.title }}</h3>
                <p class="line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-400">{{ post.summary || post.content.substring(0, 100) }}</p>
                <div class="mt-3 flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span>浏览 {{ post.counter.view }}</span>
                  <span>点赞 {{ post.counter.like }}</span>
                  <span>评论 {{ post.counter.comment }}</span>
                </div>
              </div>
            </div>
          </RouterLink>
        </div>
        <EmptyState v-else title="暂无公开内容" description="发布公开的多领域实践内容后会出现在这里。" actionText="去发布" actionHref="/editor" />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import { domainApi, localDomainConfigs, type DomainConfigSource, type PublicDomainConfig } from '@/api/domains'
import { postApi } from '@/api/post'
import { recommendationsApi } from '@/api/recommendations'
import { userApi } from '@/api/user'
import { dashboardApi, type RankedMetric } from '@/api/dashboard'
import { useAuthStore } from '@/stores/auth'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import AppHeader from '@/components/layout/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import type { CommunityTopic, CrossDomainRecommendation, PaginatedResponse, Post, Tag, User } from '@/api/types'
import { COMMUNITY_CONTENT_TYPES } from '@/utils/contentTypes'
import { DOMAIN, DOMAIN_OPTIONS, getDomainLabel, isKnownDomain } from '@/utils/domains'
import { buildTopicItems, isFeaturedPost } from '@/utils/communityMetrics'
import { filterPublicContent, isSyntheticVisibleText } from '@/utils/textQuality'

type ExploreJumpTarget = string | { path: string; query?: Record<string, string> }

interface ExploreTopicEntry {
  name: string
  count: number
  href: ExploreJumpTarget
}

const READING_DISCOVERY_KEYWORDS = ['阅读', '读书', '书单', '书评', '笔记', '方法论', '摘录', '共读', 'reading']

const domains = ref<PublicDomainConfig[]>([...localDomainConfigs])
const tags = ref<Tag[]>([])
const topics = ref<CommunityTopic[]>([])
const recommendedUsers = ref<User[]>([])
const latestPosts = ref<Post[]>([])
const contentTypeDistribution = ref<RankedMetric[]>([])
const domainSource = ref<DomainConfigSource>('fallback')
const isLoadingMeta = ref(true)
const isLoadingPosts = ref(true)
const crossDomainStatus = ref<'unauthenticated' | 'loading' | 'ready' | 'degraded' | 'failed'>('unauthenticated')
const crossDomainPage = ref<PaginatedResponse<CrossDomainRecommendation> | null>(null)
const crossDomainError = ref('')
const followingBusyIds = ref(new Set<string>())
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { requireLogin } = useLoginRedirect()

const searchForm = reactive({
  q: '',
  techStack: '',
  scenario: '',
})

const cleanTags = computed(() => filterPublicContent(tags.value))
const cleanTopics = computed(() => filterPublicContent(topics.value))
const cleanRecommendedUsers = computed(() => filterPublicContent(recommendedUsers.value))
const cleanLatestPosts = computed(() => filterPublicContent(latestPosts.value))
const crossDomainRecommendations = computed(() => (
  (crossDomainPage.value?.items || []).filter((item) => item.item.post)
))
const crossDomainFallbackReason = computed(() => crossDomainPage.value?.fallbackReason || '')
const sortedTags = computed(() => [...cleanTags.value].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)))
const contentTypeChannels = COMMUNITY_CONTENT_TYPES
const activeDomain = computed<number | undefined>(() => {
  const rawDomain = Array.isArray(route.query.domain) ? route.query.domain[0] : route.query.domain
  return isKnownDomain(rawDomain) ? Number(rawDomain) : undefined
})
const activeDomainLabel = computed(() => (
  activeDomain.value == null
    ? '综合发现'
    : visibleDomains.value.find((item) => Number(item.domain) === Number(activeDomain.value))?.domainName || getDomainLabel(activeDomain.value)
))
const visibleDomains = computed(() => domains.value.length ? domains.value : localDomainConfigs)
const domainSourceSummary = computed(() => (
  domainSource.value === 'remote'
    ? `已同步后端启用领域 · 当前 ${activeDomainLabel.value}`
    : `接口暂未返回，先展示默认 ${DOMAIN_OPTIONS.length} 个领域 · 当前 ${activeDomainLabel.value}`
))
const readingPostCount = computed(() => cleanLatestPosts.value.filter((post) => Number(post.domain) === DOMAIN.READING).length)
const readingDomainEntry = computed(() => (
  visibleDomains.value.find((item) => Number(item.domain) === DOMAIN.READING)
  ?? localDomainConfigs.find((item) => Number(item.domain) === DOMAIN.READING)
  ?? null
))
const readingDomainIntro = computed(() => {
  return readingDomainEntry.value?.browseNotice
    || '先把读书笔记、书单推荐和方法论摘录做成更容易发现的专题入口。'
})
const baseTopicItems = computed<ExploreTopicEntry[]>(() => {
  const remoteTopics = cleanTopics.value.slice(0, 10).map((topic) => ({
    name: topic.name,
    count: Number(topic.postCount || 0),
    href: `/topics/${topic.slug}`,
  }))
  if (remoteTopics.length) return remoteTopics
  return buildTopicItems(cleanLatestPosts.value, cleanTags.value, 10).map((topic) => ({
    ...topic,
    href: { path: '/search', query: { company: topic.name, sort: 'hot' } },
  }))
})
const readingTopicItems = computed<ExploreTopicEntry[]>(() => {
  const remoteTopics = cleanTopics.value
    .filter((topic) => matchesReadingKeyword(topic.name, topic.description, topic.topicType, topic.slug))
    .slice(0, 4)
    .map((topic) => ({
      name: topic.name,
      count: Number(topic.postCount || 0),
      href: `/topics/${topic.slug}`,
    }))
  if (remoteTopics.length) return remoteTopics

  const readingTags = sortedTags.value
    .filter((tag) => matchesReadingKeyword(tag.name, tag.category))
    .slice(0, 4)
    .map((tag) => ({
      name: tag.name,
      count: Number(tag.count || 0),
      href: `/tag/${tag.slug || tag.id}`,
    }))
  if (readingTags.length) return readingTags

  return [
    { name: '读书笔记', count: readingPostCount.value, href: { path: '/search', query: { q: '读书笔记', sort: 'hot' } } },
    { name: '书单推荐', count: readingPostCount.value, href: { path: '/search', query: { q: '书单', sort: 'hot' } } },
    { name: '方法论摘录', count: readingPostCount.value, href: { path: '/search', query: { q: '方法论', sort: 'hot' } } },
  ]
})
const topicItems = computed<ExploreTopicEntry[]>(() => {
  const seen = new Set<string>()
  return [...readingTopicItems.value, ...baseTopicItems.value]
    .filter((item) => {
      const key = item.name.trim()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 10)
})
const featuredPosts = computed(() => cleanLatestPosts.value.filter(isFeaturedPost).slice(0, 5))
const contentTypeCount = (type: number) => {
  const option = contentTypeChannels.find((item) => Number(item.value) === Number(type))
  const remoteCount = contentTypeDistribution.value.find((item) => item.name === option?.label)?.count
  return Number(remoteCount ?? cleanLatestPosts.value.filter((post) => Number(post.postType) === Number(type)).length)
}

const matchesReadingKeyword = (...values: Array<string | undefined>) => {
  return values.some((value) => {
    const text = value?.trim().toLowerCase()
    return Boolean(text && READING_DISCOVERY_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase())))
  })
}

const riskLevelLabel = (riskLevel?: string) => {
  switch ((riskLevel || '').toUpperCase()) {
    case 'HIGH':
      return '高关注'
    case 'MEDIUM':
      return '中关注'
    default:
      return '低关注'
  }
}

const quickFilters = computed(() => {
  const techStacks = new Set<string>()
  const scenarios = new Set<string>()
  cleanLatestPosts.value.forEach((post) => {
    const stacks = Array.isArray(post.extension?.techStacks) ? post.extension?.techStacks : []
    stacks.forEach((item: unknown) => {
      if (item) techStacks.add(String(item))
    })
    if (post.extension?.company) techStacks.add(String(post.extension.company))
    if (post.extension?.scenario) scenarios.add(String(post.extension.scenario))
    if (post.extension?.position) scenarios.add(String(post.extension.position))
  })
  return [
    ...Array.from(techStacks).slice(0, 4).map((value) => ({ label: `技术栈：${value}`, value, type: 'techStack' as const })),
    ...Array.from(scenarios).slice(0, 4).map((value) => ({ label: `场景：${value}`, value, type: 'scenario' as const })),
  ]
})

const crossDomainPreview = (item: CrossDomainRecommendation) => {
  const post = item.item.post
  if (!post) return '推荐内容暂时不可用'
  return post.summary || post.highlightSummary || post.content.slice(0, 96)
}

const goSearch = () => {
  router.push({
    path: '/search',
    query: {
      ...(searchForm.q.trim() ? { q: searchForm.q.trim() } : {}),
      ...(searchForm.techStack.trim() ? { company: searchForm.techStack.trim() } : {}),
      ...(searchForm.scenario.trim() ? { position: searchForm.scenario.trim() } : {}),
      ...(activeDomain.value != null ? { domain: String(activeDomain.value) } : {}),
      sort: 'relevance',
    },
  })
}

const applyQuickFilter = (item: { value: string; type: 'techStack' | 'scenario' }) => {
  if (item.type === 'techStack') {
    searchForm.techStack = item.value
  } else {
    searchForm.scenario = item.value
  }
  goSearch()
}

const primaryMeta = (post: Post) => {
  const stacks = Array.isArray(post.extension?.techStacks) ? post.extension.techStacks.filter(Boolean) : []
  return post.extension?.scenario || stacks[0] || post.extension?.company || post.extension?.position || ''
}

const userDisplaySignature = (user: User) => {
  const signature = user.signature?.trim()
  return signature && !isSyntheticVisibleText(signature)
    ? signature
    : '实践经验主页'
}
const isSelf = (user: User) => Boolean(authStore.user && String(authStore.user.uid) === String(user.uid))

const toggleFollowUser = async (user: User) => {
  if (!requireLogin()) return
  if (isSelf(user)) return
  const uid = String(user.uid)
  followingBusyIds.value = new Set(followingBusyIds.value).add(uid)
  const wasFollowing = Boolean(user.isFollowing)
  try {
    if (wasFollowing) {
      await userApi.unfollow(user.uid)
    } else {
      await userApi.follow(user.uid)
    }
    user.isFollowing = !wasFollowing
    user.followerCount = Math.max(0, (user.followerCount ?? 0) + (wasFollowing ? -1 : 1))
  } catch (error: any) {
    toast.error(getErrorMessage(error, '关注操作失败'))
  } finally {
    const next = new Set(followingBusyIds.value)
    next.delete(uid)
    followingBusyIds.value = next
  }
}

const loadExploreData = async () => {
  isLoadingMeta.value = true
  isLoadingPosts.value = true
  crossDomainError.value = ''
  crossDomainStatus.value = authStore.isLoggedIn ? 'loading' : 'unauthenticated'
  const tasks: Array<Promise<any>> = [
    domainApi.listPublic(),
    postApi.getTags(),
    postApi.listTopics({ limit: 10 }),
    userApi.searchUsers('', 8),
    postApi.list({ size: 8, domain: activeDomain.value }),
    dashboardApi.getTrendDashboard('30d', activeDomain.value),
  ]
  if (authStore.isLoggedIn) {
    tasks.push(recommendationsApi.listCrossDomain(undefined, 6))
  }
  const [domainRes, tagRes, topicRes, userRes, postRes, dashboardRes, crossDomainRes] = await Promise.allSettled(tasks)
  if (domainRes.status === 'fulfilled') {
    domains.value = domainRes.value.data || localDomainConfigs
    domainSource.value = domainRes.value.source
  }
  if (tagRes.status === 'fulfilled') {
    tags.value = filterPublicContent(tagRes.value.data || [])
  }
  if (topicRes.status === 'fulfilled') {
    topics.value = filterPublicContent(topicRes.value.data || [])
  }
  if (userRes.status === 'fulfilled') {
    recommendedUsers.value = filterPublicContent(userRes.value.data || [])
  }
  if (postRes.status === 'fulfilled') {
    latestPosts.value = filterPublicContent(postRes.value.data?.items || [])
  }
  if (dashboardRes.status === 'fulfilled') {
    contentTypeDistribution.value = dashboardRes.value.data?.contentTypeDistribution || []
  }
  if (!authStore.isLoggedIn) {
    crossDomainPage.value = null
  } else if (crossDomainRes?.status === 'fulfilled') {
    crossDomainPage.value = crossDomainRes.value.data
    crossDomainStatus.value = crossDomainRes.value.data?.degraded ? 'degraded' : 'ready'
  } else if (crossDomainRes?.status === 'rejected') {
    crossDomainPage.value = null
    crossDomainStatus.value = 'failed'
    crossDomainError.value = getErrorMessage(crossDomainRes.reason, '加载跨领域推荐失败')
  }
  isLoadingMeta.value = false
  isLoadingPosts.value = false
}

onMounted(async () => {
  await loadExploreData()
})

watch(activeDomain, async (nextDomain, prevDomain) => {
  if (nextDomain === prevDomain) return
  await loadExploreData()
})

watch(() => authStore.isLoggedIn, async () => {
  await loadExploreData()
})
</script>

<style scoped>
.channel-card,
.featured-row,
.topic-row {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: rgb(255 255 255 / 0.72);
  transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
}

.channel-card {
  display: flex;
  min-height: 8rem;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
}

.channel-card:hover,
.featured-row:hover,
.topic-row:hover {
  border-color: rgb(199 210 254);
  background: rgb(238 242 255 / 0.55);
}

.channel-card h3,
.featured-row h3 {
  font-size: 0.95rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.channel-card p,
.featured-row p {
  margin-top: 0.45rem;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: rgb(100 116 139);
}

.channel-card span,
.featured-row span {
  width: fit-content;
  border-radius: 999px;
  background: rgb(238 242 255);
  padding: 0.3rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 900;
  color: rgb(67 56 202);
}

.featured-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.8rem;
  padding: 0.9rem;
}

.topic-row {
  position: relative;
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0.9rem 0.75rem 1.05rem;
  font-size: 0.875rem;
  font-weight: 800;
  color: rgb(51 65 85);
}

.topic-row::before {
  position: absolute;
  top: 0.8rem;
  bottom: 0.8rem;
  left: 0.55rem;
  width: 3px;
  border-radius: 999px;
  content: '';
  background: rgb(99 102 241 / 0.72);
}

.topic-label {
  min-width: 0;
  padding-left: 0.35rem;
}

.topic-count {
  display: inline-flex;
  flex: 0 0 auto;
  min-width: 2.25rem;
  min-height: 1.55rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgb(238 242 255);
  padding: 0.18rem 0.55rem;
  text-align: center;
  font-size: 0.75rem;
  color: rgb(79 70 229);
}

.domain-source-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgb(241 245 249);
  padding: 0.4rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(71 85 105);
}

.domain-card,
.reading-spotlight,
.reading-topic-chip {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.9rem;
  background: rgb(255 255 255 / 0.84);
  transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
}

.domain-card {
  display: flex;
  min-height: 11rem;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1rem;
}

.domain-card:hover,
.reading-spotlight:hover,
.reading-topic-chip:hover {
  border-color: rgb(165 180 252);
  background: rgb(248 250 255);
  transform: translateY(-1px);
}

.domain-card__header,
.domain-card__title,
.reading-spotlight,
.reading-topic-chip {
  display: flex;
  align-items: center;
}

.domain-card__header,
.reading-spotlight,
.reading-topic-chip {
  justify-content: space-between;
  gap: 1rem;
}

.domain-card__title {
  gap: 0.7rem;
  min-width: 0;
}

.domain-card__icon {
  display: inline-flex;
  height: 2.4rem;
  width: 2.4rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.8rem;
  background: rgb(238 242 255);
  font-size: 1.1rem;
}

.domain-card h3 {
  font-size: 0.95rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.domain-card__risk,
.reading-pilot-badge,
.reading-spotlight span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
}

.domain-card__risk {
  background: rgb(241 245 249);
  padding: 0.28rem 0.55rem;
  color: rgb(71 85 105);
}

.domain-card p,
.domain-card small {
  line-height: 1.55;
}

.domain-card p {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: 0.84rem;
  color: rgb(71 85 105);
}

.domain-card small {
  display: -webkit-box;
  overflow: hidden;
  margin-top: auto;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: 0.75rem;
  color: rgb(100 116 139);
}

.reading-pilot-card {
  background:
    radial-gradient(circle at top right, rgb(224 231 255 / 0.9), transparent 48%),
    linear-gradient(180deg, rgb(255 255 255 / 0.94), rgb(248 250 252 / 0.92));
}

.reading-pilot-badge {
  background: rgb(224 231 255);
  padding: 0.34rem 0.72rem;
  color: rgb(79 70 229);
}

.reading-spotlight {
  padding: 0.95rem 1rem;
}

.reading-spotlight strong {
  display: block;
  font-size: 0.95rem;
  color: rgb(15 23 42);
}

.reading-spotlight p {
  margin-top: 0.3rem;
  font-size: 0.8rem;
  line-height: 1.6;
  color: rgb(71 85 105);
}

.reading-spotlight span {
  min-width: 3rem;
  background: rgb(238 242 255);
  padding: 0.34rem 0.7rem;
  color: rgb(67 56 202);
}

.reading-topic-chip {
  padding: 0.8rem 0.9rem;
  font-size: 0.84rem;
  font-weight: 800;
  color: rgb(51 65 85);
}

.reading-topic-chip strong {
  color: rgb(79 70 229);
}

.recommended-user-card {
  display: flex;
  min-height: 15rem;
  flex-direction: column;
  justify-content: space-between;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(255 255 255 / 0.78);
  padding: 1rem;
  text-align: center;
  transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
}

.recommended-user-card:hover {
  border-color: rgb(199 210 254);
  background: rgb(255 255 255 / 0.92);
}

.user-stats {
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.user-stat-chip {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  border-radius: 0.625rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252 / 0.86);
  padding: 0.45rem 0.35rem;
  color: rgb(71 85 105);
}

.user-stat-chip strong {
  font-size: 0.95rem;
  line-height: 1;
  color: rgb(15 23 42);
}

.user-stat-chip small {
  font-size: 0.68rem;
  font-weight: 700;
}

.follow-button {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  margin-top: 1rem;
  width: 100%;
  border-radius: 0.625rem;
  border: 1px solid;
  padding: 0.55rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 800;
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

.follow-button:not(:disabled):hover {
  transform: translateY(-1px);
}

.follow-button:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.follow-button--primary {
  border-color: rgb(199 210 254);
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.follow-button--active {
  border-color: rgb(226 232 240);
  background: rgb(248 250 252);
  color: rgb(71 85 105);
}

.filter-input {
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid rgb(203 213 225);
  background: rgb(248 250 252);
  padding: 0.75rem 0.9rem;
  font-size: 0.875rem;
  color: rgb(15 23 42);
  outline: none;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.filter-input:focus {
  border-color: rgb(129 140 248);
  background: white;
  box-shadow: 0 0 0 3px rgb(224 231 255 / 0.8);
}

.stage4-kicker,
.cross-domain-bridge,
.cross-domain-fallback {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-weight: 800;
}

.stage4-kicker {
  background: rgb(224 242 254);
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  color: rgb(3 105 161);
}

.cross-domain-card {
  display: block;
  border: 1px solid rgb(226 232 240);
  border-radius: 1rem;
  background:
    radial-gradient(circle at top right, rgb(219 234 254 / 0.8), transparent 42%),
    rgb(255 255 255 / 0.86);
  padding: 1rem;
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}

.cross-domain-card:hover {
  border-color: rgb(147 197 253);
  transform: translateY(-1px);
  box-shadow: 0 16px 30px rgb(15 23 42 / 0.08);
}

.cross-domain-bridge {
  background: rgb(239 246 255);
  padding: 0.28rem 0.6rem;
  font-size: 0.72rem;
  color: rgb(29 78 216);
}

.cross-domain-fallback {
  background: rgb(254 240 138);
  padding: 0.28rem 0.55rem;
  font-size: 0.72rem;
  color: rgb(133 77 14);
}

.cross-domain-note {
  border-radius: 1rem;
  border: 1px solid rgb(254 215 170);
  background: rgb(255 247 237);
  padding: 0.9rem 1rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: rgb(154 52 18);
}

.dark .filter-input {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23 / 0.55);
  color: rgb(226 232 240);
}

.dark .channel-card,
.dark .featured-row,
.dark .topic-row {
  border-color: rgb(51 65 85 / 0.9);
  background: rgb(15 23 42 / 0.78);
}

.dark .channel-card:hover,
.dark .featured-row:hover,
.dark .topic-row:hover {
  border-color: rgb(99 102 241 / 0.78);
  background: rgb(30 41 59 / 0.9);
}

.dark .channel-card h3,
.dark .featured-row h3 {
  color: rgb(248 250 252);
}

.dark .channel-card p,
.dark .featured-row p {
  color: rgb(148 163 184);
}

.dark .channel-card span,
.dark .featured-row span {
  background: rgb(49 46 129 / 0.5);
  color: rgb(199 210 254);
}

.dark .topic-row {
  color: rgb(203 213 225);
}

.dark .topic-row::before {
  background: linear-gradient(180deg, rgb(129 140 248), rgb(45 212 191));
}

.dark .topic-count {
  border: 1px solid rgb(67 56 202 / 0.48);
  background: rgb(30 27 75 / 0.72);
  color: rgb(199 210 254);
}

.dark .domain-source-chip,
.dark .domain-card__risk {
  background: rgb(30 41 59 / 0.84);
  color: rgb(203 213 225);
}

.dark .domain-card,
.dark .reading-spotlight,
.dark .reading-topic-chip {
  border-color: rgb(51 65 85 / 0.9);
  background: rgb(15 23 42 / 0.8);
}

.dark .domain-card:hover,
.dark .reading-spotlight:hover,
.dark .reading-topic-chip:hover {
  border-color: rgb(99 102 241 / 0.78);
  background: rgb(30 41 59 / 0.92);
}

.dark .domain-card__icon {
  background: rgb(49 46 129 / 0.42);
}

.dark .domain-card h3,
.dark .reading-spotlight strong {
  color: rgb(248 250 252);
}

.dark .domain-card p,
.dark .reading-spotlight p,
.dark .reading-topic-chip {
  color: rgb(148 163 184);
}

.dark .domain-card small {
  color: rgb(100 116 139);
}

.dark .reading-pilot-card {
  background:
    radial-gradient(circle at top right, rgb(67 56 202 / 0.26), transparent 48%),
    linear-gradient(180deg, rgb(15 23 42 / 0.96), rgb(2 6 23 / 0.94));
}

.dark .reading-pilot-badge,
.dark .reading-spotlight span {
  background: rgb(49 46 129 / 0.55);
  color: rgb(199 210 254);
}

.dark .reading-topic-chip strong {
  color: rgb(165 180 252);
}

.dark .recommended-user-card {
  border-color: rgb(51 65 85 / 0.9);
  background: rgb(15 23 42 / 0.72);
  box-shadow: inset 0 1px 0 rgb(148 163 184 / 0.08);
}

.dark .recommended-user-card:hover {
  border-color: rgb(99 102 241 / 0.76);
  background: rgb(15 23 42 / 0.84);
}

.dark .user-stat-chip {
  border-color: rgb(51 65 85 / 0.78);
  background: rgb(2 6 23 / 0.58);
  color: rgb(148 163 184);
}

.dark .user-stat-chip strong {
  color: rgb(226 232 240);
}

.dark .follow-button--primary {
  border-color: #6366f1;
  background: #4f46e5;
  color: #fff;
  box-shadow: 0 8px 18px rgb(79 70 229 / 0.24);
}

.dark .follow-button--primary:not(:disabled):hover {
  border-color: #818cf8;
  background: #4338ca;
}

.dark .follow-button--active {
  border-color: rgb(100 116 139 / 0.85);
  background: rgb(30 41 59 / 0.75);
  color: rgb(203 213 225);
}

.dark .follow-button--active:not(:disabled):hover {
  border-color: rgb(148 163 184 / 0.85);
  background: rgb(51 65 85 / 0.74);
}

.dark .stage4-kicker {
  background: rgb(8 47 73);
  color: rgb(125 211 252);
}

.dark .cross-domain-card {
  border-color: rgb(51 65 85 / 0.92);
  background:
    radial-gradient(circle at top right, rgb(30 64 175 / 0.24), transparent 42%),
    rgb(15 23 42 / 0.84);
  box-shadow: inset 0 1px 0 rgb(148 163 184 / 0.06);
}

.dark .cross-domain-card:hover {
  border-color: rgb(96 165 250 / 0.7);
  box-shadow: 0 18px 36px rgb(2 6 23 / 0.34);
}

.dark .cross-domain-bridge {
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

.dark .cross-domain-fallback {
  background: rgb(120 53 15);
  color: rgb(253 224 71);
}

.dark .cross-domain-note {
  border-color: rgb(154 52 18);
  background: rgb(67 20 7 / 0.45);
  color: rgb(253 186 116);
}

.dark .filter-input::placeholder {
  color: rgb(100 116 139);
}

.dark .filter-input:focus {
  border-color: rgb(99 102 241 / 0.65);
  background: rgb(15 23 42 / 0.9);
  box-shadow: 0 0 0 3px rgb(67 56 202 / 0.28);
}
</style>
