<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />

    <main class="mx-auto max-w-5xl px-4 py-8">
      <section class="topic-header">
        <div class="topic-mark">{{ topicInitial }}</div>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-sm font-semibold text-primary-600 dark:text-primary-400">
              社区话题
            </p>
            <span v-if="curatedTopic" :class="['status-pill', curatedStatusClass]">{{ curatedStatusText }}</span>
            <span v-if="isCrossDomainCuratedTopic" class="status-pill cross-domain-chip">跨频道专题</span>
            <span v-if="topic?.featured" class="status-pill status-featured">精选话题</span>
            <span v-if="topic?.virtualTopic" class="status-pill status-muted">自动聚合</span>
            <span v-if="topic?.topicType" class="status-pill status-muted">{{ topicTypeText }}</span>
          </div>
          <h1 class="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50">{{ currentTopicTitle }}</h1>
          <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{{ currentTopicSummary }}</p>
          <p v-if="isCrossDomainCuratedTopic" class="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            本集合跨频道收录，每篇内容保留其原频道。
          </p>
          <p v-if="crossDomainCompositionText" class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            频道构成：{{ crossDomainCompositionText }}
          </p>
          <p v-if="curatedLifecycleCopy" class="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {{ curatedLifecycleCopy }}
          </p>
          <p v-if="canFollowTopic" class="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            关注主题后，可以更方便地回到这个公开内容集合；不会自动关注某个帖子的后续回复。
          </p>
          <div v-if="topicTags.length" class="mt-4 flex flex-wrap gap-2">
            <RouterLink
              v-for="tag in topicTags"
              :key="tag.id"
              :to="`/tag/${tag.slug || tag.id}`"
              class="tag-chip"
            >
              {{ tag.name }}
            </RouterLink>
          </div>
        </div>
        <div class="topic-count">
          <strong>{{ displayCount }}</strong>
          <span>{{ displayCountLabel }}</span>
        </div>
        <div v-if="topicReady" class="topic-actions">
          <div v-if="canFollowTopic" class="topic-count topic-follow-count">
            <strong>{{ topic?.followerCount || 0 }}</strong>
            <span>关注</span>
          </div>
          <PublicShareButton
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
            :class="['primary-button', topic?.followed ? 'topic-followed-button' : '']"
            :disabled="isFollowBusy || !topic"
            @click="toggleTopicFollow"
          >
            {{ topic?.followed ? '已关注' : '关注话题' }}
          </button>
          <RouterLink :to="{ path: '/editor', query: publishToTopicQuery }" class="secondary-button">
            参与话题
          </RouterLink>
        </div>
      </section>

      <CommunitySpacePanel
        v-if="topicReady && !isCuratedTopic"
        space-type="topic"
        :identifier="topicSlug"
        :title="`${currentTopicTitle}公共空间`"
      />

      <UpdateDigestPanel
        v-if="topicReady && !isCuratedTopic"
        source-type="TOPIC"
        :source-id="topicSlug"
        title="我关注的主题更新"
      />

      <section v-if="topicReady && !isCuratedTopic" class="filter-panel">
        <div>
          <h2>话题内容</h2>
          <p>{{ typeSummary }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" :class="['filter-chip', !activeType ? 'filter-chip-active' : '']" @click="setType(undefined)">全部</button>
          <button type="button" :class="['filter-chip', activeType === POST_TYPE.QUESTION ? 'filter-chip-active' : '']" @click="setType(POST_TYPE.QUESTION)">只看问题求助</button>
          <button
            v-for="type in contentTypeChannels"
            :key="type.value"
            type="button"
            :class="['filter-chip', activeType === type.value ? 'filter-chip-active' : '']"
            @click="setType(type.value)"
          >
            {{ type.shortLabel }}
          </button>
          <button type="button" :class="['filter-chip', featuredOnly ? 'filter-chip-active' : '']" @click="toggleFeatured">
            只看精选
          </button>
        </div>
      </section>

      <section class="mt-6 space-y-4">
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
                <div>
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

        <div v-else-if="topicLoadFailed" class="empty-panel topic-error-panel">
          <h2>{{ unavailableTitle }}</h2>
          <p>{{ topicErrorMessage }}</p>
          <div class="mt-4 flex flex-wrap justify-center gap-2">
            <RouterLink to="/explore" class="primary-button">去发现内容</RouterLink>
            <RouterLink :to="{ path: '/search', query: { q: fallbackName } }" class="secondary-button">搜索相似内容</RouterLink>
          </div>
        </div>

        <div v-else-if="isLoading && posts.length === 0" class="loading-panel">
          正在加载话题内容...
        </div>

        <div v-else-if="postErrorMessage && posts.length === 0" class="notice-error">
          {{ postErrorMessage }}
        </div>

        <template v-else-if="posts.length">
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
        </template>

        <div v-else class="empty-panel">
          <h2>这个话题还没有内容</h2>
          <p>可以先去发现页浏览相近内容，搜索相关关键词，或发布一篇公开经验、问题、攻略、资源或复盘。</p>
          <div class="mt-4 flex flex-wrap justify-center gap-2">
            <RouterLink to="/explore" class="primary-button">去发现内容</RouterLink>
            <RouterLink :to="{ path: '/search', query: { q: fallbackName } }" class="secondary-button">搜索相似内容</RouterLink>
            <RouterLink :to="{ path: '/editor', query: publishToTopicQuery }" class="secondary-button">发布内容</RouterLink>
          </div>
        </div>

        <div v-if="hasMore && !isCuratedTopic" class="text-center">
          <button type="button" class="secondary-button" :disabled="isLoading" @click="loadPosts(true)">
            {{ isLoading ? '加载中...' : '加载更多' }}
          </button>
        </div>
      </section>
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
const topicInitial = computed(() => currentTopicTitle.value.charAt(0).toUpperCase())
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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
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
.topic-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 1.5rem;
}

.topic-mark {
  display: flex;
  height: 4rem;
  width: 4rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  background: rgb(37 99 235);
  font-size: 1.75rem;
  font-weight: 900;
  color: white;
}

.topic-count {
  display: inline-flex;
  min-width: 7rem;
  flex-direction: column;
  justify-content: center;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.85rem;
}

.topic-count strong {
  font-size: 1.5rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.topic-count span {
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgb(100 116 139);
}

.topic-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.topic-follow-count {
  min-width: 7rem;
}

.topic-followed-button {
  border: 1px solid rgb(203 213 225);
  background: white;
  color: rgb(71 85 105);
}

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

.filter-panel,
.curated-section {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
}

.filter-panel {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.filter-panel h2,
.curated-section h2 {
  font-size: 0.95rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.filter-panel p {
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  color: rgb(100 116 139);
}

.filter-chip {
  border-radius: 999px;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(71 85 105);
}

.filter-chip-active,
.filter-chip:hover {
  border-color: rgb(199 210 254);
  background: rgb(238 242 255);
  color: rgb(67 56 202);
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
  .topic-header {
    flex-direction: row;
    align-items: center;
  }

  .filter-panel,
  .curated-section-head,
  .curated-item {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
