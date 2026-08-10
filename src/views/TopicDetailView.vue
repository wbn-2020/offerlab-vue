<template>
  <div class="app-shell aggregation-page">
    <AppHeader />

    <main class="community-page aggregation-main">
      <section class="identity-banner" aria-labelledby="topic-detail-title">
        <div class="identity-mark" aria-hidden="true">
          <Hash class="h-5 w-5" />
        </div>
        <div class="identity-copy">
          <div class="identity-kicker-row">
            <p class="identity-kicker">社区话题</p>
            <span v-if="curatedTopic" :class="['status-pill', curatedStatusClass]">{{ curatedStatusText }}</span>
            <span v-if="isCrossDomainCuratedTopic" class="status-pill cross-domain-chip">跨频道专题</span>
            <span v-if="topic?.featured" class="status-pill status-featured">精选话题</span>
            <span v-if="topic?.virtualTopic" class="status-pill status-muted">自动聚合</span>
            <span v-if="topic?.topicType" class="status-pill status-muted">{{ topicTypeText }}</span>
          </div>
          <h1 id="topic-detail-title">{{ currentTopicTitle }}</h1>
          <p class="identity-summary">{{ currentTopicSummary }}</p>
          <p v-if="isCrossDomainCuratedTopic" class="identity-note">
            本集合跨频道收录，每篇内容保留其原频道。
          </p>
          <p v-if="crossDomainCompositionText" class="identity-note">
            频道构成：{{ crossDomainCompositionText }}
          </p>
          <p v-if="curatedLifecycleCopy" class="identity-note">
            {{ curatedLifecycleCopy }}
          </p>
          <p v-if="canFollowTopic" class="identity-note">
            关注主题后，可以更方便地回到这个公开内容集合；不会自动关注某个帖子的后续回复。
          </p>
          <div v-if="topicTags.length" class="identity-tags">
            <RouterLink
              v-for="tag in topicTags"
              :key="tag.id"
              :to="`/tag/${tag.slug || tag.id}`"
              class="tag-chip"
            >
              {{ tag.name }}
            </RouterLink>
          </div>
          <div class="identity-meta" aria-label="话题内容摘要">
            <span><FileText class="h-4 w-4" />{{ displayCount }} {{ displayCountLabel }}</span>
            <span v-if="canFollowTopic"><Users class="h-4 w-4" />{{ topic?.followerCount || 0 }} 位关注者</span>
            <span v-else>公开内容集合</span>
          </div>
        </div>
      </section>

      <div class="aggregation-layout">
        <div class="content-column">
          <section v-if="topicReady && !isCuratedTopic" class="content-toolbar" aria-labelledby="topic-content-title">
            <div>
              <h2 id="topic-content-title">话题内容</h2>
              <p>{{ typeSummary }}</p>
            </div>
            <div class="filter-scroll" role="group" aria-label="话题内容筛选">
              <button type="button" :class="['filter-chip', !activeType ? 'filter-chip-active' : '']" :aria-pressed="!activeType" @click="setType(undefined)">全部</button>
              <button type="button" :class="['filter-chip', activeType === POST_TYPE.QUESTION ? 'filter-chip-active' : '']" :aria-pressed="activeType === POST_TYPE.QUESTION" @click="setType(POST_TYPE.QUESTION)">问题求助</button>
              <button
                v-for="type in contentTypeChannels"
                :key="type.value"
                type="button"
                :class="['filter-chip', activeType === type.value ? 'filter-chip-active' : '']"
                :aria-pressed="activeType === type.value"
                @click="setType(type.value)"
              >
                {{ type.shortLabel }}
              </button>
              <button type="button" :class="['filter-chip', featuredOnly ? 'filter-chip-active' : '']" :aria-pressed="featuredOnly" @click="toggleFeatured">
                精选
              </button>
            </div>
          </section>

          <section class="feed-section" aria-live="polite">
            <template v-if="isCuratedTopic && curatedTopic">
              <div v-if="curatedTopic.degraded || curatedTopic.status === 'ARCHIVED'" class="curated-state-banner">
                <strong>{{ curatedTopic.status === 'ARCHIVED' ? '归档话题集合' : '降级提示' }}</strong>
                <span>{{ curatedLifecycleCopy }}</span>
              </div>
              <div class="curated-meta">
                <span>{{ curatedTopic.sourceNote }}</span>
                <span>{{ curatedTopic.sortNote }}</span>
              </div>
              <section v-if="curatedTopic.status === 'ARCHIVED'" class="topic-archive-summary" aria-label="归档话题集合">
                <div>
                  <span class="status-pill status-archived">已归档话题集合</span>
                  <h2>{{ curatedTopic.title }}</h2>
                  <p>{{ curatedTopic.summary || '该话题集合保留归档时的公开版本，继续提供复访入口。' }}</p>
                </div>
                <dl>
                  <div>
                    <dt>归档时间</dt>
                    <dd>{{ curatedTopic.archivedAt || '未提供' }}</dd>
                  </div>
                  <div>
                    <dt>来源解释</dt>
                    <dd>{{ curatedTopic.sourceNote || '来自已发布话题集合的归档公开版本。' }}</dd>
                  </div>
                </dl>
              </section>
              <article
                v-for="section in curatedTopic.sections"
                :key="section.id"
                class="curated-section"
              >
                <div class="curated-section-head">
                  <div>
                    <span class="status-pill status-muted">Section {{ section.sortOrder }}</span>
                    <h2>{{ section.title }}</h2>
                  </div>
                  <p v-if="section.reasonText">{{ section.reasonText }}</p>
                </div>
                <div class="curated-item-list">
                  <div
                    v-for="item in section.items"
                    :key="item.id"
                    class="curated-item"
                  >
                    <div class="curated-item-copy">
                      <span class="curated-item-source">{{ item.sourceType }} · {{ item.sortOrder }}</span>
                      <span
                        v-if="isKnownDomain(item.post?.domain)"
                        class="curated-item-domain"
                      >{{ getDomainIcon(item.post!.domain) }} {{ getDomainLabel(item.post!.domain) }}</span>
                      <h3>{{ item.title }}</h3>
                      <p v-if="item.summary">{{ item.summary }}</p>
                      <small v-if="item.reasonText">收录理由：{{ item.reasonText }}</small>
                    </div>
                    <RouterLink v-if="!item.disabled && item.href" :to="item.href" class="secondary-button">阅读</RouterLink>
                    <button v-else type="button" class="secondary-button" disabled>暂不可读</button>
                  </div>
                </div>
              </article>
            </template>

            <div v-else-if="topicLoadFailed || (topicErrorMessage && !topic)" class="empty-panel topic-error-panel">
              <div class="empty-icon" aria-hidden="true"><Hash class="h-5 w-5" /></div>
              <h2>{{ unavailableTitle }}</h2>
              <p>{{ topicErrorMessage }}</p>
              <div class="empty-actions">
                <RouterLink to="/explore" class="primary-button">去发现内容</RouterLink>
                <RouterLink :to="{ path: '/search', query: { q: fallbackName } }" class="secondary-button">搜索相似内容</RouterLink>
              </div>
            </div>

            <div v-else-if="isLoading && posts.length === 0" class="loading-panel" role="status">
              <span class="sr-only">正在加载话题内容...</span>
              <div v-for="index in 3" :key="index" class="loading-row" aria-hidden="true">
                <span class="loading-avatar" />
                <span class="loading-lines"><i /><i /><i /></span>
              </div>
            </div>

            <div v-else-if="postErrorMessage && posts.length === 0" class="notice-error">
              {{ postErrorMessage }}
            </div>

            <div v-else-if="posts.length" class="post-list">
              <div v-if="postErrorMessage" class="notice-error">{{ postErrorMessage }}</div>
              <PostCard
                v-for="post in posts"
                :key="post.postId"
                :post="post"
                :like-pending="isActionPending('like', post.postId)"
                :favorite-pending="isActionPending('favorite', post.postId)"
                @like="handleLike"
                @favorite="handleFavorite"
                @follow-change="handlePostAuthorFollowChange"
              />
            </div>

            <div v-else class="empty-panel">
              <div class="empty-icon" aria-hidden="true"><Hash class="h-5 w-5" /></div>
              <h2>这个话题还没有内容</h2>
              <p>可以先去发现页浏览相近内容，搜索相关关键词，或发布一篇公开经验、问题、攻略、资源或复盘。</p>
              <div class="empty-actions">
                <RouterLink to="/explore" class="primary-button">去发现内容</RouterLink>
                <RouterLink :to="{ path: '/search', query: { q: fallbackName } }" class="secondary-button">搜索相似内容</RouterLink>
                <RouterLink :to="{ path: '/editor', query: publishToTopicQuery }" class="secondary-button">发布内容</RouterLink>
              </div>
            </div>

            <div v-if="hasMore && !isCuratedTopic" class="load-more-row">
              <button type="button" class="secondary-button" :disabled="isLoading" @click="loadPosts(true)">
                {{ isLoading ? '加载中...' : '加载更多' }}
              </button>
            </div>
          </section>
        </div>

        <aside class="support-rail" aria-label="话题辅助操作">
          <div class="support-rail-inner">
            <section v-if="topicReady" class="side-panel side-panel-primary">
              <div class="side-panel-heading">
                <div>
                  <span>{{ isCuratedTopic ? '专题集合' : '话题状态' }}</span>
                  <h2>{{ currentTopicTitle }}</h2>
                </div>
                <strong>{{ displayCount }}</strong>
              </div>
              <p v-if="isCuratedTopic">公开收录内容按专题结构组织，条目来源和可读状态以服务端结果为准。</p>
              <p v-else>关注、分享或参与话题的动作集中在这里，阅读内容不受账号状态影响。</p>
              <PublicShareButton
                class="rail-share-button"
                :title="currentTopicTitle"
                :text="topicSeoDescription"
                :canonical="`/topics/${topicSlug}`"
                label="分享话题"
                :disabled="topicLoadFailed"
                disabled-reason="这个话题当前不可公开分享"
              />
              <button
                v-if="canFollowTopic"
                type="button"
                :class="['primary-button', 'rail-action-button', topic?.followed ? 'topic-followed-button' : '']"
                :disabled="isFollowBusy || !topic"
                @click="toggleTopicFollow"
              >
                <UserPlus class="h-4 w-4" />
                {{ topic?.followed ? '已关注' : '关注话题' }}
              </button>
              <RouterLink v-if="!isCuratedTopic" :to="{ path: '/editor', query: publishToTopicQuery }" class="secondary-button rail-action-button">
                <PenLine class="h-4 w-4" />
                参与话题
              </RouterLink>
            </section>

            <details v-if="topicReady && !isCuratedTopic" class="aux-details">
              <summary>公共空间与治理</summary>
              <CommunitySpacePanel
                space-type="topic"
                :identifier="topicSlug"
                :title="`${currentTopicTitle}公共空间`"
              />
            </details>

            <details v-if="topicReady && !isCuratedTopic" class="aux-details">
              <summary>订阅更新摘要</summary>
              <UpdateDigestPanel
                subscription-source-type="TOPIC"
                :subscription-source-id="topic?.id"
                title="我关注的主题更新"
              />
            </details>

            <nav class="side-panel side-links" aria-label="继续浏览">
              <h2>继续浏览</h2>
              <RouterLink to="/explore">
                <Compass class="h-4 w-4" />
                <span><strong>发现更多内容</strong><small>浏览频道与活跃话题</small></span>
              </RouterLink>
              <RouterLink :to="{ path: '/search', query: { q: currentTopicTitle } }">
                <Search class="h-4 w-4" />
                <span><strong>搜索相关内容</strong><small>从关键词继续查找</small></span>
              </RouterLink>
              <RouterLink v-if="!isCuratedTopic" :to="{ path: '/editor', query: publishToTopicQuery }">
                <PenLine class="h-4 w-4" />
                <span><strong>发布内容</strong><small>把经验带回这个话题</small></span>
              </RouterLink>
            </nav>
          </div>
        </aside>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import AppHeader from '@/components/layout/AppHeader.vue'
import PublicShareButton from '@/components/common/PublicShareButton.vue'
import PostCard from '@/components/post/PostCard.vue'
import CommunitySpacePanel from '@/components/community/CommunitySpacePanel.vue'
import UpdateDigestPanel from '@/components/retention/UpdateDigestPanel.vue'
import { Compass, FileText, Hash, PenLine, Search, UserPlus, Users } from 'lucide-vue-next'
import { postApi } from '@/api/post'
import { topicDetailApi, type CuratedTopicDetail } from '@/api/topicDetail'
import { usePostInteraction } from '@/composables/usePostInteraction'
import type { ApiId, CommunityTopic, Post } from '@/api/types'
import { COMMUNITY_CONTENT_TYPES, POST_TYPE } from '@/utils/contentTypes'
import { isKnownDomain, getDomainIcon, getDomainLabel, getDomainLabelSafe } from '@/utils/domains'
import { summarizeCurationDomains } from '@/utils/curationDomainComposition'
import { postTypeSummary } from '@/utils/communityMetrics'
import { useAuthStore } from '@/stores/auth'
import { filterPublicContent } from '@/utils/textQuality'
import { filterVisiblePosts } from '@/utils/recommendationGovernance'
import { applyPageSeo, summarizeSeoText } from '@/utils/seo'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const curatedTopic = ref<CuratedTopicDetail | null>(null)
const topic = ref<CommunityTopic | null>(null)
const posts = ref<Post[]>([])
const cursor = ref<string | undefined>()
const hasMore = ref(false)
const isLoading = ref(false)
const isFollowBusy = ref(false)
const topicErrorMessage = ref('')
const postErrorMessage = ref('')
const activeType = ref<number | undefined>()
const featuredOnly = ref(false)
let loadGeneration = 0
let postRequestGeneration = 0

const topicSlug = computed(() => String(route.params.slug || ''))
const contentTypeChannels = COMMUNITY_CONTENT_TYPES
const fallbackName = computed(() => String(route.params.slug || '话题'))
const displayableCuratedStatuses = new Set(['PUBLISHED', 'ARCHIVED'])
const isCuratedTopic = computed(() => Boolean(curatedTopic.value && displayableCuratedStatuses.has(curatedTopic.value.status)))
const currentTopicTitle = computed(() => curatedTopic.value?.title || topic.value?.name || fallbackName.value)
const currentTopicSummary = computed(() => curatedTopic.value?.summary || topic.value?.description || '围绕公开内容形成的社区集合，只展示已经通过治理过滤且仍然可见的内容。')
const topicTags = computed(() => isCuratedTopic.value ? [] : topic.value?.tags || [])
const displayCount = computed(() => {
  if (isCuratedTopic.value) {
    return curatedTopic.value?.sections.reduce((sum, section) => sum + section.items.length, 0) || 0
  }
  return topic.value?.postCount || posts.value.length
})
const displayCountLabel = computed(() => isCuratedTopic.value ? '篇收录' : '篇内容')
const typeSummary = computed(() => postTypeSummary(posts.value))
const topicLoadFailed = computed(() => Boolean(topicErrorMessage.value && !topic.value && !isCuratedTopic.value))
const topicReady = computed(() => Boolean(isCuratedTopic.value || (topic.value && !topicLoadFailed.value)))
const canFollowTopic = computed(() => Boolean(!isCuratedTopic.value && topic.value?.id && !topic.value?.virtualTopic))
// 跨频道语义只读后端派生的 topicScope，不由 domain 是否为空自行推断。
const isCrossDomainCuratedTopic = computed(() => (
  isCuratedTopic.value && curatedTopic.value?.topicScope === 'CROSS_DOMAIN'
))
const crossDomainComposition = computed(() => {
  if (!isCrossDomainCuratedTopic.value || !curatedTopic.value) return null
  return summarizeCurationDomains(curatedTopic.value.sections.flatMap((section) => section.items))
})
const crossDomainCompositionText = computed(() => {
  const composition = crossDomainComposition.value
  if (!composition || composition.total === 0) return ''
  const parts = composition.byDomain.map((entry) => `${getDomainLabelSafe(entry.domain)} ${entry.count}`)
  if (composition.unknownCount > 0) parts.push(`未分类 ${composition.unknownCount}`)
  return parts.join(' · ')
})
const publishToTopicQuery = computed(() => {
  const routeDomain = Array.isArray(route.query.domain) ? route.query.domain[0] : route.query.domain
  const communityTopicDomain = (topic.value as (CommunityTopic & { domain?: number | null }) | null)?.domain
  // 运营专题只使用后端明确范围：跨频道不预填，单频道只用专题自己的 domain。
  // 普通社区话题保留既有 route → topic → 首帖频道兜底。
  const domain = isCuratedTopic.value
    ? curatedTopic.value?.topicScope === 'DOMAIN'
      ? [curatedTopic.value.domain].find((value) => isKnownDomain(value))
      : undefined
    : [routeDomain, communityTopicDomain, posts.value[0]?.domain].find((value) => isKnownDomain(value))
  const topicId = topic.value?.virtualTopic ? undefined : topic.value?.id
  const topicName = topic.value?.name || currentTopicTitle.value || topicSlug.value
  return {
    source: 'manual_publish',
    action: 'topic',
    contextType: 'topic',
    ...(topicId == null ? {} : { topicId: String(topicId) }),
    topic: topicName,
    ...(domain == null ? {} : { domain: String(domain) }),
    postType: String(activeType.value || POST_TYPE.NOTE),
    returnHref: route.fullPath,
  }
})
const curatedStatusText = computed(() => {
  if (!curatedTopic.value) return ''
  if (curatedTopic.value.status === 'PUBLISHED') return curatedTopic.value.degraded ? '已发布话题集合 · 降级' : '已发布话题集合'
  if (curatedTopic.value.status === 'ARCHIVED') return '已归档话题集合'
  if (curatedTopic.value.status === 'OFFLINE') return '话题集合已下线'
  if (curatedTopic.value.status === 'DEGRADED') return '话题集合暂不可用'
  return '话题集合不可用'
})
const curatedStatusClass = computed(() => (
  curatedTopic.value?.status === 'PUBLISHED'
    ? 'status-featured'
    : curatedTopic.value?.status === 'ARCHIVED'
      ? 'status-archived'
      : 'status-muted'
))
const curatedLifecycleCopy = computed(() => {
  if (!curatedTopic.value) return ''
  if (curatedTopic.value.status === 'PUBLISHED') {
    return curatedTopic.value.degraded
      ? '部分内容暂时无法展示，当前仍可浏览已经公开的条目。'
      : '这里汇集经过整理的公开内容，收录理由和顺序会随主题维护更新。'
  }
  if (curatedTopic.value.status === 'ARCHIVED') return '话题集合已归档，仍可作为公开资料浏览；内容顺序和理由保留自归档时的公开版本。'
  if (curatedTopic.value.status === 'OFFLINE') return '话题集合已下线，当前不作为公开话题继续展示。'
  if (curatedTopic.value.status === 'DEGRADED') return '主题内容暂时无法完整展示，请稍后重试或浏览相近内容。'
  return ''
})
const unavailableTitle = computed(() => {
  if (curatedTopic.value?.status === 'OFFLINE') return '话题集合已下线'
  if (curatedTopic.value?.status === 'DEGRADED') return '话题集合暂时不可用'
  return isCuratedTopic.value ? '话题集合暂时无法打开' : '话题暂时无法打开'
})
const topicSeoDescription = computed(() => summarizeSeoText(
  currentTopicSummary.value,
  topicLoadFailed.value ? `${unavailableTitle.value}。` : '围绕公开内容形成的社区集合，只展示公开且通过治理过滤的内容。',
))
const topicTypeText = computed(() => {
  const type = topic.value?.topicType
  if (type === 'tech_stack') return '知识技能'
  if (type === 'scenario') return '场景话题'
  if (type === 'resource') return '资源清单'
  if (type === 'project') return '实践复盘'
  return '综合话题'
})

const curatedTopicFallbackAllowed = (detail?: CuratedTopicDetail | null) => (
  detail?.fallbackReason === 'operation_topic_not_found'
)

const findPost = (postId: ApiId) => posts.value.find((item) => String(item.postId) === String(postId))
const updatePost = (postId: ApiId, updater: (post: Post) => void) => {
  const post = findPost(postId)
  if (post) updater(post)
}
const { toggleLike, toggleFavorite, isActionPending } = usePostInteraction(updatePost)
const isCurrentLoad = (targetGeneration: number, slug: string) => (
  targetGeneration === loadGeneration && String(route.params.slug || '') === slug
)

const loadTopic = async () => {
  const slug = String(route.params.slug || '')
  if (!slug) return
  const targetGeneration = ++loadGeneration
  postRequestGeneration += 1
  curatedTopic.value = null
  topic.value = null
  posts.value = []
  cursor.value = undefined
  hasMore.value = false
  topicErrorMessage.value = ''
  postErrorMessage.value = ''
  isLoading.value = true
  try {
    const curatedRes = await topicDetailApi.getCuratedTopicDetail(slug)
    if (!isCurrentLoad(targetGeneration, slug)) return
    if (curatedRes.data && displayableCuratedStatuses.has(curatedRes.data.status)) {
      curatedTopic.value = curatedRes.data
      return
    }
    if (!curatedTopicFallbackAllowed(curatedRes.data)) {
      curatedTopic.value = curatedRes.data ?? null
      topicErrorMessage.value = curatedLifecycleCopy.value || '话题集合暂时不可用，请稍后重试或浏览相近内容。'
      return
    }

    const res = await postApi.getTopic(slug)
    if (!isCurrentLoad(targetGeneration, slug)) return
    topic.value = res.data
    if (!topic.value?.virtualTopic) {
      await loadTopicFollowStatus(slug, targetGeneration)
    }
    await loadPosts(false, targetGeneration)
  } catch (error: unknown) {
    if (isCurrentLoad(targetGeneration, slug)) {
      topicErrorMessage.value = getErrorMessage(error, '话题内容加载失败')
    }
  } finally {
    if (isCurrentLoad(targetGeneration, slug)) {
      isLoading.value = false
    }
  }
}

const loadTopicFollowStatus = async (slug: string, targetGeneration = loadGeneration) => {
  if (!authStore.isLoggedIn || topic.value?.virtualTopic) return
  try {
    const res = await postApi.getTopicFollowStatus(slug)
    if (!isCurrentLoad(targetGeneration, slug)) return
    if (res.data) topic.value = { ...topic.value, ...res.data }
  } catch {
    // Follow status is an authenticated enhancement; public topic browsing should not fail.
  }
}

const loadPosts = async (append = false, targetGeneration = loadGeneration) => {
  const slug = String(route.params.slug || '')
  if (!slug || isCuratedTopic.value || !topic.value || topicLoadFailed.value || (append && !hasMore.value) || (isLoading.value && append)) return
  const targetPostGeneration = append ? postRequestGeneration : ++postRequestGeneration
  const isCurrentPostLoad = () => (
    isCurrentLoad(targetGeneration, slug) && targetPostGeneration === postRequestGeneration
  )
  isLoading.value = true
  postErrorMessage.value = ''
  try {
    const res = await postApi.getTopicPosts(slug, append ? cursor.value : undefined, 10, {
      type: activeType.value,
      featured: featuredOnly.value ? true : undefined,
    })
    if (!isCurrentPostLoad()) return
    const page = res.data
    const cleanItems = filterVisiblePosts(filterPublicContent(page?.items || []))
    posts.value = append ? [...posts.value, ...cleanItems] : cleanItems
    cursor.value = page?.nextCursor
    hasMore.value = Boolean(page?.hasMore && page?.nextCursor)
  } catch (error: unknown) {
    if (isCurrentPostLoad()) {
      postErrorMessage.value = getErrorMessage(error, '话题内容加载失败')
    }
  } finally {
    if (isCurrentPostLoad()) {
      isLoading.value = false
    }
  }
}

const setType = async (type?: number) => {
  activeType.value = type
  cursor.value = undefined
  hasMore.value = false
  await loadPosts(false)
}

const toggleFeatured = async () => {
  featuredOnly.value = !featuredOnly.value
  cursor.value = undefined
  hasMore.value = false
  await loadPosts(false)
}

const handleLike = async (postId: ApiId) => {
  const post = findPost(postId)
  if (!post) return
  await toggleLike(post)
}

const handleFavorite = async (postId: ApiId) => {
  const post = findPost(postId)
  if (!post) return
  await toggleFavorite(post)
}

const handlePostAuthorFollowChange = (authorUid: ApiId, following: boolean) => {
  posts.value.forEach((post) => {
    if (String(post.author.uid) === String(authorUid)) {
      post.author.isFollowing = following
    }
  })
}

const toggleTopicFollow = async () => {
  const slug = topic.value?.slug || String(route.params.slug || '')
  if (!slug || isFollowBusy.value || !canFollowTopic.value) return
  if (!authStore.isLoggedIn) {
    toast.info('登录后可以关注话题')
    await router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  isFollowBusy.value = true
  const wasFollowed = Boolean(topic.value?.followed)
  try {
    const res = wasFollowed ? await postApi.unfollowTopic(slug) : await postApi.followTopic(slug)
    if (res.data) {
      topic.value = { ...topic.value, ...res.data }
    } else if (topic.value) {
      topic.value.followed = !wasFollowed
      topic.value.followerCount = Math.max(0, (topic.value.followerCount || 0) + (wasFollowed ? -1 : 1))
    }
    toast.success(wasFollowed ? '已取消关注话题' : '已关注话题')
  } catch (error: unknown) {
    toast.error(getErrorMessage(error, '话题关注操作失败'))
  } finally {
    isFollowBusy.value = false
  }
}

watch(() => route.params.slug, loadTopic)
watch([curatedTopic, topic, topicErrorMessage, topicSlug], () => {
  applyPageSeo({
    title: topicLoadFailed.value ? '话题暂时无法打开' : currentTopicTitle.value,
    description: topicSeoDescription.value,
    canonical: `/topics/${topicSlug.value}`,
  })
}, { immediate: true })
onMounted(loadTopic)
onUnmounted(() => {
  loadGeneration += 1
  postRequestGeneration += 1
})
</script>

<style scoped>
.tag-chip,
.status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 800;
}

.tag-chip {
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  color: rgb(71 85 105);
}

.status-featured {
  background: rgb(254 243 199);
  color: rgb(146 64 14);
}

.status-archived {
  background: rgb(220 252 231);
  color: rgb(22 101 52);
}

.status-muted {
  background: rgb(226 232 240);
  color: rgb(71 85 105);
}

/* 跨频道专题的中性身份 chip：刻意不用任何单频道配色，避免集合冒充频道归属。 */
.cross-domain-chip {
  border: 1px dashed rgb(148 163 184);
  background: transparent;
  color: rgb(71 85 105);
}

.dark .cross-domain-chip {
  border-color: rgb(71 85 105);
  color: rgb(148 163 184);
}

.curated-section {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
}

.curated-section h2 {
  font-size: 0.95rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.curated-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  color: rgb(100 116 139);
  font-size: 0.8125rem;
}

.curated-state-banner {
  display: grid;
  gap: 0.25rem;
  border: 1px solid rgb(187 247 208);
  border-radius: 0.75rem;
  background: rgb(240 253 244);
  padding: 0.9rem 1rem;
  color: rgb(22 101 52);
}

.curated-state-banner strong {
  font-size: 0.875rem;
  font-weight: 900;
}

.curated-state-banner span {
  font-size: 0.8125rem;
  line-height: 1.55;
}

.topic-archive-summary {
  display: grid;
  gap: 1rem;
  border: 1px solid rgb(187 247 208);
  border-radius: 0.75rem;
  background: rgb(240 253 244);
  padding: 1rem;
}

.topic-archive-summary h2 {
  margin-top: 0.5rem;
  font-size: 1rem;
  font-weight: 900;
  color: rgb(20 83 45);
}

.topic-archive-summary p,
.topic-archive-summary dd {
  color: rgb(22 101 52);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.topic-archive-summary dl {
  display: grid;
  gap: 0.75rem;
  margin: 0;
}

.topic-archive-summary dt {
  font-size: 0.72rem;
  font-weight: 900;
  color: rgb(21 128 61);
}

.topic-archive-summary dd {
  margin: 0.15rem 0 0;
}

.curated-section {
  overflow: hidden;
}

.curated-section-head {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-bottom: 1px solid rgb(226 232 240);
  padding: 1rem;
}

.curated-section-head p {
  color: rgb(100 116 139);
  font-size: 0.875rem;
}

.curated-item-list {
  display: grid;
  gap: 0;
}

.curated-item {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-top: 1px solid rgb(241 245 249);
  padding: 1rem;
}

.curated-item:first-child {
  border-top: 0;
}

.curated-item h3 {
  margin-top: 0.2rem;
  font-size: 1rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.curated-item p,
.curated-item small,
.curated-item-source {
  color: rgb(100 116 139);
  font-size: 0.8125rem;
  line-height: 1.5;
}

/* 策展条目的原频道徽章：与 PostCard 同口径（isKnownDomain 门控，未知域不显示）。 */
.curated-item-domain {
  margin-left: 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  border-radius: 999px;
  background: rgb(241 245 249);
  padding: 0.1rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(51 65 85);
}

.dark .curated-item-domain {
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}

.primary-button,
.secondary-button {
  display: inline-flex;
  min-height: 2.375rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  padding: 0.5rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 700;
}

.primary-button {
  background: rgb(37 99 235);
  color: white;
}

.secondary-button {
  border: 1px solid rgb(226 232 240);
  background: white;
  color: rgb(51 65 85);
}

.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.empty-panel,
.loading-panel,
.notice-error {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 2.25rem 1.25rem;
  text-align: center;
}

.empty-panel h2 {
  font-size: 1rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

.empty-panel p,
.loading-panel {
  margin-top: 0.5rem;
  color: rgb(100 116 139);
}

.notice-error {
  border-color: rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(185 28 28);
}

@media (min-width: 768px) {
  .curated-section-head,
  .curated-item {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.aggregation-page {
  min-height: 100vh;
  background: var(--surface-2);
}

.aggregation-main {
  padding-top: 1.5rem;
  padding-bottom: 4rem;
}

.identity-banner {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0.25rem 0 1.35rem;
}

.identity-mark {
  display: inline-flex;
  width: 2.75rem;
  height: 2.75rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-surface);
  background: var(--primary-50);
  color: var(--primary-700);
}

.identity-copy {
  min-width: 0;
  flex: 1;
}

.identity-kicker-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.25rem;
}

.identity-kicker {
  margin: 0 0.25rem 0 0;
  color: var(--primary-600);
  font-size: 0.75rem;
  font-weight: 800;
}

.identity-copy h1 {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--text-strong);
  font-size: 1.5rem;
  font-weight: 850;
  line-height: 1.35;
  text-wrap: balance;
}

.identity-summary {
  max-width: 48rem;
  margin: 0.45rem 0 0;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.7;
  text-wrap: pretty;
}

.identity-note {
  max-width: 48rem;
  margin: 0.3rem 0 0;
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.6;
}

.identity-tags,
.identity-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.identity-tags {
  gap: 0.35rem;
  margin-top: 0.7rem;
}

.identity-meta {
  gap: 0.45rem 1rem;
  margin-top: 0.7rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.identity-meta span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.tag-chip {
  min-height: 1.75rem;
  border-color: var(--border-subtle);
  border-radius: 5px;
  background: var(--surface);
  padding: 0.25rem 0.55rem;
  color: var(--text-muted);
  font-weight: 700;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.tag-chip:hover {
  background: var(--primary-50);
  color: var(--primary-700);
}

.status-pill {
  border-radius: 5px;
  padding: 0.2rem 0.45rem;
  font-size: 0.6875rem;
  font-weight: 750;
}

.aggregation-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 286px;
  grid-template-areas: "content rail";
  align-items: start;
  gap: 1.5rem;
  margin-top: 1.25rem;
}

.content-column {
  grid-area: content;
  min-width: 0;
}

.support-rail {
  grid-area: rail;
  min-width: 0;
}

.support-rail-inner {
  display: grid;
  gap: 0.9rem;
}

.content-toolbar {
  display: grid;
  gap: 0.8rem;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 0.1rem 0.9rem;
}

.content-toolbar > div:first-child {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.content-toolbar h2,
.side-panel h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 0.9375rem;
  font-weight: 850;
}

.content-toolbar p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.75rem;
  text-align: right;
}

.filter-scroll {
  display: flex;
  gap: 0.35rem;
  overflow-x: auto;
  padding: 0.1rem 0 0.15rem;
  scrollbar-width: none;
}

.filter-scroll::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  min-height: 2rem;
  flex: 0 0 auto;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  padding: 0.35rem 0.65rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 700;
  white-space: nowrap;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.filter-chip-active,
.filter-chip:hover {
  border-color: transparent;
  background: var(--primary-50);
  color: var(--primary-700);
}

.feed-section {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.post-list {
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}

.post-list :deep(.post-card) {
  border-bottom-color: var(--border-subtle);
}

.post-list > .notice-error {
  margin: 0.75rem 0.75rem 0;
}

.side-panel,
.aux-details {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}

.side-panel {
  padding: 0.95rem;
}

.side-panel-primary {
  display: grid;
  gap: 0.75rem;
}

.side-panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.side-panel-heading span {
  display: block;
  margin-bottom: 0.2rem;
  color: var(--text-muted);
  font-size: 0.6875rem;
  font-weight: 700;
}

.side-panel-heading h2 {
  overflow-wrap: anywhere;
}

.side-panel-heading > strong {
  color: var(--primary-600);
  font-size: 1.35rem;
  font-weight: 850;
  line-height: 1;
}

.side-panel-primary > p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.65;
}

.rail-share-button,
.rail-action-button {
  width: 100%;
}

.rail-action-button {
  gap: 0.45rem;
}

.topic-followed-button {
  border: 1px solid var(--border-subtle);
  background: var(--surface);
  color: var(--text-primary);
}

.aux-details {
  overflow: hidden;
}

.aux-details > summary {
  display: flex;
  min-height: 2.75rem;
  cursor: pointer;
  list-style: none;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 0.9rem;
  color: var(--text-primary);
  font-size: 0.8125rem;
  font-weight: 800;
}

.aux-details > summary::-webkit-details-marker {
  display: none;
}

.aux-details > summary::after {
  content: "+";
  color: var(--text-muted);
  font-size: 1rem;
  font-weight: 500;
}

.aux-details[open] > summary {
  border-bottom: 1px solid var(--border-subtle);
}

.aux-details[open] > summary::after {
  content: "−";
}

.aux-details :deep(.community-space-panel),
.aux-details :deep(.update-digest-panel) {
  margin-top: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.side-links {
  display: grid;
  gap: 0.25rem;
}

.side-links h2 {
  margin-bottom: 0.35rem;
}

.side-links a {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.65rem;
  border-radius: 6px;
  padding: 0.55rem 0.45rem;
  color: var(--text-primary);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.side-links a:hover {
  background: var(--surface-3);
  color: var(--primary-700);
}

.side-links a > svg {
  flex: 0 0 auto;
  color: var(--text-muted);
}

.side-links a > span {
  display: grid;
  min-width: 0;
  gap: 0.1rem;
}

.side-links strong {
  font-size: 0.8125rem;
  font-weight: 750;
}

.side-links small {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 0.6875rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.curated-state-banner,
.topic-archive-summary,
.curated-section {
  border-radius: var(--radius-surface);
}

.curated-meta {
  padding: 0 0.15rem;
  line-height: 1.55;
}

.curated-meta span:not(:empty) + span:not(:empty)::before {
  content: "·";
  margin-right: 0.5rem;
}

.curated-section {
  border-color: var(--border-subtle);
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}

.curated-section-head {
  border-bottom-color: var(--border-subtle);
}

.curated-section-head h2 {
  margin-top: 0.35rem;
  font-size: 1rem;
}

.curated-section-head p {
  max-width: 32rem;
  line-height: 1.6;
}

.curated-item {
  align-items: center;
  border-top-color: var(--surface-3);
}

.curated-item-copy {
  min-width: 0;
  flex: 1;
}

.curated-item h3 {
  overflow-wrap: anywhere;
}

.curated-item .secondary-button {
  flex: 0 0 auto;
}

.primary-button,
.secondary-button {
  gap: 0.45rem;
  border-radius: var(--radius-control);
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.primary-button {
  background: var(--primary-600);
}

.primary-button:hover:not(:disabled) {
  background: var(--primary-700);
}

.secondary-button {
  border-color: var(--border-subtle);
  background: var(--surface);
  color: var(--text-primary);
}

.secondary-button:hover:not(:disabled) {
  border-color: #bfdbfe;
  background: var(--primary-50);
  color: var(--primary-700);
}

.empty-panel,
.loading-panel,
.notice-error {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}

.empty-panel {
  padding: 2.5rem 1.5rem;
}

.empty-icon {
  display: inline-flex;
  width: 2.5rem;
  height: 2.5rem;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.8rem;
  border-radius: var(--radius-surface);
  background: var(--surface-3);
  color: var(--text-muted);
}

.empty-panel h2 {
  margin: 0;
  color: var(--text-strong);
}

.empty-panel p {
  max-width: 40rem;
  margin-right: auto;
  margin-left: auto;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.65;
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.loading-panel {
  display: grid;
  gap: 0;
  overflow: hidden;
  padding: 0;
  text-align: left;
}

.loading-row {
  display: flex;
  gap: 0.75rem;
  padding: 1.15rem 1rem;
  border-bottom: 1px solid var(--border-subtle);
}

.loading-row:last-child {
  border-bottom: 0;
}

.loading-avatar,
.loading-lines i {
  display: block;
  background: var(--surface-3);
  animation: loading-pulse 1.6s ease-in-out infinite;
}

.loading-avatar {
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  border-radius: 50%;
}

.loading-lines {
  display: grid;
  flex: 1;
  gap: 0.45rem;
}

.loading-lines i {
  height: 0.55rem;
  border-radius: 3px;
}

.loading-lines i:nth-child(1) {
  width: 34%;
}

.loading-lines i:nth-child(2) {
  width: 78%;
}

.loading-lines i:nth-child(3) {
  width: 58%;
}

.notice-error {
  border-color: #fecaca;
  background: #fef2f2;
  padding: 0.9rem 1rem;
  color: #b91c1c;
  font-size: 0.8125rem;
  line-height: 1.6;
  text-align: left;
}

.load-more-row {
  text-align: center;
}

@keyframes loading-pulse {
  0%,
  100% {
    opacity: 0.55;
  }

  50% {
    opacity: 1;
  }
}

.dark .aggregation-page {
  background: #0f1115;
}

.dark .identity-mark,
.dark .tag-chip:hover,
.dark .filter-chip-active,
.dark .filter-chip:hover,
.dark .secondary-button:hover:not(:disabled) {
  background: rgb(30 58 138 / 0.35);
  color: rgb(147 197 253);
}

.dark .tag-chip,
.dark .post-list,
.dark .side-panel,
.dark .aux-details,
.dark .curated-section,
.dark .empty-panel,
.dark .loading-panel,
.dark .secondary-button,
.dark .topic-followed-button {
  border-color: rgb(39 39 42);
  background: rgb(24 26 32);
}

.dark .curated-section-head,
.dark .aux-details[open] > summary,
.dark .loading-row {
  border-color: rgb(39 39 42);
}

.dark .side-links a:hover,
.dark .empty-icon,
.dark .loading-avatar,
.dark .loading-lines i,
.dark .status-muted,
.dark .curated-item-domain {
  background: rgb(39 39 42);
}

.dark .curated-section h2,
.dark .curated-item h3,
.dark .topic-archive-summary h2 {
  color: var(--text-strong);
}

.dark .curated-state-banner,
.dark .topic-archive-summary {
  border-color: rgb(22 101 52);
  background: rgb(20 83 45 / 0.24);
}

.dark .notice-error {
  border-color: rgb(127 29 29);
  background: rgb(69 10 10 / 0.45);
  color: rgb(254 202 202);
}

@media (min-width: 1024px) {
  .support-rail-inner {
    position: sticky;
    top: calc(var(--community-header-height) + 1.25rem);
  }
}

@media (max-width: 1023px) {
  .aggregation-layout {
    display: flex;
    flex-direction: column;
  }

  .content-column,
  .support-rail {
    width: 100%;
  }

  .support-rail-inner {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .side-panel-primary,
  .side-links {
    grid-row: 1;
  }
}

@media (max-width: 640px) {
  .aggregation-main {
    padding-top: 0.75rem;
    padding-bottom: 2rem;
  }

  .identity-banner {
    gap: 0.75rem;
    padding-bottom: 1rem;
  }

  .identity-mark {
    width: 2.35rem;
    height: 2.35rem;
  }

  .identity-copy h1 {
    font-size: 1.25rem;
  }

  .identity-summary {
    font-size: 0.8125rem;
  }

  .identity-meta span:last-child {
    display: none;
  }

  .aggregation-layout {
    gap: 1.25rem;
    margin-top: 0.9rem;
  }

  .content-toolbar > div:first-child {
    display: block;
  }

  .content-toolbar p {
    margin-top: 0.25rem;
    text-align: left;
  }

  .filter-scroll {
    margin-right: -1rem;
    padding-right: 1rem;
  }

  .post-list {
    margin-right: -1rem;
    margin-left: -1rem;
    border-right: 0;
    border-left: 0;
    border-radius: 0;
  }

  .curated-section-head,
  .curated-item {
    align-items: stretch;
    flex-direction: column;
  }

  .curated-item .secondary-button {
    width: 100%;
  }

  .support-rail-inner {
    grid-template-columns: minmax(0, 1fr);
  }

  .side-panel-primary,
  .side-links {
    grid-row: auto;
  }

  .empty-panel {
    padding: 2rem 1rem;
  }

  .empty-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .empty-actions > * {
    width: 100%;
  }
}
</style>
