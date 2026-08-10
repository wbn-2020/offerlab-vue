<template>
  <div class="app-shell public-profile-page">
    <AppHeader />
    <main class="community-page public-profile-main">
      <section v-if="isLoading" class="profile-panel profile-state">
        正在加载作者主页...
      </section>

      <section v-else-if="loadError" class="profile-panel profile-state" role="alert">
        <h1>主页暂不可用</h1>
        <p>{{ loadError }}</p>
      </section>

      <template v-else-if="user">
        <section class="profile-panel profile-hero">
          <div class="profile-hero-layout">
            <UserAvatar
              class="profile-avatar"
              :src="user.profileVisible === false ? '' : user.avatar"
              :name="user.profileVisible === false ? '受限主页' : user.nickname"
              alt=""
              :fallback="avatarText"
            />

            <div class="profile-identity">
              <p class="profile-context">公开作者主页</p>
              <div class="profile-name-row">
                <h1>{{ user.profileVisible === false ? '受限主页' : user.nickname }}</h1>
                <span v-if="user.profileVisible !== false && user.isBigV" class="profile-author-label">公开作者</span>
              </div>
              <p class="profile-description">{{ profileDescription }}</p>

              <div v-if="user.profileVisible !== false" class="profile-stats" aria-label="作者公开数据">
                <div>
                  <strong>{{ visiblePosts.length }}</strong>
                  <span>公开内容</span>
                </div>
                <div>
                  <strong>{{ user.followerCount || 0 }}</strong>
                  <span>关注者</span>
                </div>
                <div>
                  <strong>{{ user.followingCount || 0 }}</strong>
                  <span>正在关注</span>
                </div>
                <div>
                  <strong>{{ publicCollections.length }}</strong>
                  <span>公开合集</span>
                </div>
              </div>
            </div>

            <div class="profile-actions">
              <button
                v-if="user.profileVisible !== false && !isViewingSelf"
                type="button"
                class="follow-button"
                :disabled="isFollowBusy"
                @click="toggleFollow"
              >
                {{ isFollowBusy ? '处理中...' : user.isFollowing ? '已关注' : '关注' }}
              </button>
              <button
                v-if="canStartContactRequest"
                type="button"
                class="contact-author-button"
                @click="openContactRequestDialog"
              >
                联系作者
              </button>
              <PublicShareButton
                :title="user.profileVisible === false ? '主页暂不可用' : user.nickname"
                :text="profileSeoDescription"
                :canonical="`/u/${profileUid}`"
                label="分享主页"
                :disabled="user.profileVisible === false"
                disabled-reason="该作者主页当前不可公开分享"
              />
            </div>
          </div>
          <p v-if="showContactAuthorEntry && !canStartContactRequest" class="contact-author-unavailable">
            作者暂未开放联系请求
          </p>
        </section>

        <section v-if="user.profileVisible === false" class="profile-panel restricted-profile">
          <h2>该用户限制了主页访问</h2>
          <p>资料、帖子和关注方向会按隐私设置隐藏。</p>
        </section>

        <template v-else>
          <nav class="profile-tabs" role="tablist" aria-label="作者公开主页内容">
            <button
              id="profile-tab-content"
              type="button"
              role="tab"
              :aria-selected="activeTab === 'content'"
              aria-controls="profile-panel-content"
              :tabindex="activeTab === 'content' ? 0 : -1"
              :class="{ 'is-active': activeTab === 'content' }"
              @click="activeTab = 'content'"
              @keydown="handleTabKeydown($event, 0)"
            >
              <FileText class="h-4 w-4" />
              公开内容
              <span>{{ visiblePosts.length }}</span>
            </button>
            <button
              id="profile-tab-collections"
              type="button"
              role="tab"
              :aria-selected="activeTab === 'collections'"
              aria-controls="profile-panel-collections"
              :tabindex="activeTab === 'collections' ? 0 : -1"
              :class="{ 'is-active': activeTab === 'collections' }"
              @click="activeTab = 'collections'"
              @keydown="handleTabKeydown($event, 1)"
            >
              <Library class="h-4 w-4" />
              公开合集
              <span>{{ publicCollections.length + publicFavoriteFolders.length }}</span>
            </button>
            <button
              id="profile-tab-participation"
              type="button"
              role="tab"
              :aria-selected="activeTab === 'participation'"
              aria-controls="profile-panel-participation"
              :tabindex="activeTab === 'participation' ? 0 : -1"
              :class="{ 'is-active': activeTab === 'participation' }"
              @click="activeTab = 'participation'"
              @keydown="handleTabKeydown($event, 2)"
            >
              <Users class="h-4 w-4" />
              公开参与
            </button>
          </nav>

          <div class="profile-layout">
            <div class="profile-primary">
              <section
                v-show="activeTab === 'content'"
                id="profile-panel-content"
                class="profile-tab-panel"
                role="tabpanel"
                aria-labelledby="profile-tab-content"
                tabindex="0"
              >
                <section class="profile-panel content-section">
                  <div class="section-heading">
                    <div>
                      <h2>代表内容</h2>
                      <p>优先展示精选、高互动和近期活跃的公开内容，匿名内容不会进入作者主页。</p>
                    </div>
                    <span v-if="representativePosts.length" class="section-count">{{ representativePosts.length }} 篇</span>
                  </div>
                  <div v-if="representativePosts.length === 0" class="empty-state">
                    这位作者还没有可展示的代表内容。
                  </div>
                  <div v-else class="representative-list">
                    <article v-for="post in representativePosts" :key="post.postId" class="representative-card">
                      <RouterLink :to="`/post/${post.postId}`" class="post-main-link">
                        <h3>{{ post.title }}</h3>
                        <p>{{ post.summary || post.content.slice(0, 120) }}</p>
                      </RouterLink>
                      <div class="post-public-metrics" aria-label="公开内容互动">
                        <span>{{ post.counter?.like || 0 }} 赞</span>
                        <span>{{ post.counter?.favorite || 0 }} 收藏</span>
                        <span>{{ post.counter?.comment || 0 }} 评论</span>
                        <button v-if="!isViewingSelf" type="button" @click="reportPost(post.postId)">
                          <Flag class="h-4 w-4" />
                          举报
                        </button>
                        <RouterLink :to="`/post/${post.postId}`">查看内容 <ArrowRight class="h-4 w-4" /></RouterLink>
                      </div>
                    </article>
                  </div>
                </section>

                <section class="profile-panel content-section">
                  <div class="section-heading">
                    <div>
                      <h2>最新内容</h2>
                      <p>按发布时间展示最近公开更新，方便继续追踪作者动态。</p>
                    </div>
                  </div>
                  <div v-if="latestPosts.length === 0" class="empty-state">暂无最新公开内容。</div>
                  <div v-else class="latest-list">
                    <RouterLink v-for="post in latestPosts" :key="post.postId" :to="`/post/${post.postId}`" class="latest-row">
                      <span class="latest-row-marker" aria-hidden="true" />
                      <span class="latest-row-copy">
                        <strong>{{ post.title }}</strong>
                        <small>{{ post.summary || post.content.slice(0, 90) }}</small>
                      </span>
                      <ArrowRight class="h-4 w-4" />
                    </RouterLink>
                  </div>
                </section>
              </section>

              <section
                v-show="activeTab === 'collections'"
                id="profile-panel-collections"
                class="profile-tab-panel"
                role="tabpanel"
                aria-labelledby="profile-tab-collections"
                tabindex="0"
              >
                <section class="profile-panel content-section">
                  <div class="section-heading">
                    <div>
                      <h2>公开内容资产</h2>
                      <p>作者公开整理的合集会展示在这里；仅展示公开且通过治理过滤的内容。</p>
                    </div>
                  </div>
                  <div v-if="isLoadingCollections" class="empty-state">正在加载公开合集...</div>
                  <div v-else-if="collectionsError" class="empty-state empty-state-error">{{ collectionsError }}</div>
                  <div v-else-if="publicCollections.length === 0" class="empty-state">这位作者还没有公开合集。</div>
                  <div v-else class="collection-list">
                    <RouterLink
                      v-for="collection in publicCollections"
                      :key="collection.id"
                      :to="`/collections/${collection.id}`"
                      class="collection-row"
                    >
                      <div class="collection-cover">
                        <img
                          v-if="showCollectionCover(collection)"
                          :src="collection.coverUrl"
                          :alt="collection.title"
                          @error="handleCollectionCoverError(collection.coverUrl)"
                        >
                        <span v-else>{{ collection.title.charAt(0).toUpperCase() }}</span>
                      </div>
                      <div class="collection-copy">
                        <div>
                          <strong>{{ collection.title }}</strong>
                          <span>{{ collection.progress.totalCount }} 篇内容</span>
                        </div>
                        <p>{{ collection.summary || '这个合集暂未填写简介。' }}</p>
                        <small>{{ formatTime(collection.updatedAt) }}</small>
                      </div>
                      <ArrowRight class="h-4 w-4" />
                    </RouterLink>
                  </div>
                </section>

                <section class="profile-panel content-section">
                  <div class="section-heading">
                    <div>
                      <h2>公开收藏清单</h2>
                      <p>仅展示作者主动公开的清单，私密收藏夹和非公开内容始终隐藏。</p>
                    </div>
                  </div>
                  <div v-if="isLoadingFavoriteFolders" class="empty-state">正在加载公开收藏清单...</div>
                  <div v-else-if="favoriteFoldersError" class="empty-state empty-state-error">{{ favoriteFoldersError }}</div>
                  <div v-else-if="publicFavoriteFolders.length === 0" class="empty-state">这位作者还没有公开收藏清单。</div>
                  <div v-else class="collection-list">
                    <RouterLink
                      v-for="folder in publicFavoriteFolders"
                      :key="folder.id"
                      :to="`/favorite-folders/${folder.id}`"
                      class="collection-row collection-row-compact"
                    >
                      <div class="folder-mark"><Bookmark class="h-5 w-5" /></div>
                      <div class="collection-copy">
                        <div>
                          <strong>{{ folder.name }}</strong>
                          <span>{{ folder.postCount }} 篇内容</span>
                        </div>
                        <p>{{ folder.description || '作者公开整理的收藏清单。' }}</p>
                        <small>{{ formatTime(folder.updatedAt) }}</small>
                      </div>
                      <ArrowRight class="h-4 w-4" />
                    </RouterLink>
                  </div>
                </section>
              </section>

              <section
                v-show="activeTab === 'participation'"
                id="profile-panel-participation"
                class="profile-tab-panel"
                role="tabpanel"
                aria-labelledby="profile-tab-participation"
                tabindex="0"
              >
                <section class="profile-panel content-section">
                  <div class="section-heading">
                    <div>
                      <h2>公开内容反馈</h2>
                      <p>{{ contributionSourceText }}。这些反馈只用于了解公开内容表现，不代表平台排名或等级。</p>
                    </div>
                  </div>
                  <div class="feedback-grid">
                    <article><strong>{{ contribution.featuredCount }}</strong><span>被精选</span></article>
                    <article><strong>{{ contribution.likeCount }}</strong><span>获赞</span></article>
                    <article><strong>{{ contribution.favoriteCount }}</strong><span>被收藏</span></article>
                    <article><strong>{{ contribution.commentCount }}</strong><span>收到评论</span></article>
                  </div>
                  <div v-if="typeDistribution.length" class="tag-section">
                    <strong>内容类型</strong>
                    <div>
                      <span v-for="item in typeDistribution" :key="item.name" class="tag-pill">
                        {{ item.name }} {{ item.count }}
                      </span>
                    </div>
                  </div>
                </section>

                <section
                  class="profile-panel content-section"
                  data-phase15-public-identity
                  data-public-governance-filtered
                  data-explainable-trust-signals
                >
                  <div class="section-heading">
                    <div>
                      <h2>公开参与摘要</h2>
                      <p>{{ publicIdentitySummary.sourceNote }}</p>
                    </div>
                    <span class="identity-neutral-pill">公开来源解释</span>
                  </div>
                  <div class="identity-grid">
                    <article v-for="signal in publicIdentitySummary.signals" :key="signal.key" class="identity-signal">
                      <span>{{ signal.label }}</span>
                      <strong>{{ signal.value }}</strong>
                      <p>{{ signal.description }}</p>
                    </article>
                  </div>
                  <div v-if="publicIdentitySummary.focusLabels.length" class="tag-section">
                    <strong>公开创作方向</strong>
                    <div>
                      <span v-for="label in publicIdentitySummary.focusLabels" :key="label" class="tag-pill">{{ label }}</span>
                    </div>
                  </div>
                  <div
                    v-if="authStore.isLoggedIn && relationshipContext.visibleToViewer"
                    class="relationship-context"
                    data-relationship-context-private
                  >
                    <strong>仅你可见的关系上下文</strong>
                    <div>
                      <article v-for="item in relationshipContext.items" :key="item.key">
                        <span>{{ item.label }} · {{ item.value }}</span>
                        <p>{{ item.description }}</p>
                      </article>
                    </div>
                  </div>
                  <RouterLink :to="`/u/${profileUid}/contributions`" class="text-link">
                    查看公开协作贡献 <ArrowRight class="h-4 w-4" />
                  </RouterLink>
                </section>

                <section v-if="user.intentVisible === false" class="profile-panel intent-note">
                  该用户的关注方向当前不可见。
                </section>
                <section v-else-if="userIntent" class="profile-panel content-section">
                  <div class="section-heading">
                    <div>
                      <h2>感兴趣的频道</h2>
                      <p>作者主动公开的领域、方向和经历信息。</p>
                    </div>
                  </div>
                  <div class="tag-cloud">
                    <span v-for="company in userIntent.targetCompanies || []" :key="company" class="tag-pill">领域：{{ company }}</span>
                    <span v-for="position in userIntent.targetPositions || []" :key="position" class="tag-pill">方向：{{ position }}</span>
                    <span v-if="userIntent.targetCity" class="tag-pill">城市：{{ userIntent.targetCity }}</span>
                    <span v-if="userIntent.yearsOfExp" class="tag-pill">经历：{{ userIntent.yearsOfExp }} 年</span>
                  </div>
                </section>
              </section>
            </div>

            <aside class="profile-rail">
              <section class="profile-panel rail-section">
                <div class="section-heading compact">
                  <div>
                    <h2>为什么值得关注</h2>
                    <p>根据公开内容、合集和内容类型整理。</p>
                  </div>
                </div>
                <div class="reason-list">
                  <div v-for="reason in followReasons" :key="reason" class="reason-row">
                    <Check class="h-4 w-4" />
                    <p>{{ reason }}</p>
                  </div>
                </div>
                <div v-if="creatorFocusLabels.length" class="tag-section">
                  <strong>创作方向</strong>
                  <div>
                    <span v-for="label in creatorFocusLabels" :key="label" class="tag-pill">{{ label }}</span>
                  </div>
                </div>
              </section>

              <section class="profile-panel rail-section">
                <div class="section-heading compact">
                  <div>
                    <h2>公开边界</h2>
                    <p>此页只展示公开作者身份、公开内容、公开合集与参与摘要。</p>
                  </div>
                </div>
                <ul class="boundary-list">
                  <li>不展示私人收藏、草稿或设置</li>
                  <li>不展示治理权限或后台信息</li>
                  <li>匿名内容不会关联到作者主页</li>
                </ul>
              </section>
            </aside>
          </div>
        </template>
      </template>
    </main>
    <ContactRequestDialog
      v-if="user"
      v-model="isContactDialogOpen"
      :receiver-uid="user.uid"
      :receiver-name="user.nickname"
      source-type="profile"
      :source-id="profileUid"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowRight, Bookmark, Check, FileText, Flag, Library, Users } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import { userApi } from '@/api/user'
import { postApi } from '@/api/post'
import { contentSeriesApi, type ContentSeriesRecord } from '@/api/contentSeries'
import { interactionApi } from '@/api/interaction'
import { useAuthStore } from '@/stores/auth'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import AppHeader from '@/components/layout/AppHeader.vue'
import PublicShareButton from '@/components/common/PublicShareButton.vue'
import ContactRequestDialog from '@/components/contact/ContactRequestDialog.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import type { FavoriteFolder, Post, User, UserIntent } from '@/api/types'
import { buildContributionSummary, buildTypeDistribution, type ContributionSummary } from '@/utils/communityMetrics'
import {
  buildFollowReasons,
  creatorFocusLabels as buildCreatorFocusLabels,
  latestPublicPosts,
  pickRepresentativePosts,
  publicAuthorPosts,
  safeCreatorBio,
} from '@/utils/creatorSignals'
import { filterVisibleCollections, filterVisiblePosts } from '@/utils/recommendationGovernance'
import { buildPublicIdentitySummary, buildRelationshipContext } from '@/utils/communityIdentity'
import { applyPageSeo, summarizeSeoText } from '@/utils/seo'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { requireLogin } = useLoginRedirect()
const user = ref<User | null>(null)
const userIntent = ref<UserIntent | null>(null)
const posts = ref<Post[]>([])
const publicCollections = ref<ContentSeriesRecord[]>([])
const publicFavoriteFolders = ref<FavoriteFolder[]>([])
const backendContribution = ref<ContributionSummary | null>(null)
const isLoading = ref(false)
const isLoadingCollections = ref(false)
const isLoadingFavoriteFolders = ref(false)
const loadError = ref('')
const collectionsError = ref('')
const favoriteFoldersError = ref('')
const failedCollectionCoverUrls = ref(new Set<string>())
const isFollowBusy = ref(false)
const isContactDialogOpen = ref(false)
const activeTab = ref<'content' | 'collections' | 'participation'>('content')
let profileLoadGeneration = 0
let profileLoadController: AbortController | null = null

const profileUid = computed(() => String(route.params.uid || ''))
const avatarText = computed(() => user.value?.nickname?.charAt(0) || '?')
const profileDescription = computed(() => {
  if (!user.value || user.value.profileVisible === false) return '访问范围由该用户的隐私设置决定。'
  return safeCreatorBio(user.value.signature)
})
const profileSeoDescription = computed(() => summarizeSeoText(
  user.value?.profileVisible === false ? '' : user.value?.signature,
  user.value?.profileVisible === false
    ? '该作者主页当前不可公开浏览。'
    : '作者公开主页，展示公开内容、公开合集和社区内公开行为摘要。',
))
const visiblePosts = computed(() => publicAuthorPosts(filterVisiblePosts(posts.value)))
const contribution = computed(() => backendContribution.value || { ...buildContributionSummary(visiblePosts.value), source: 'frontend_estimate', estimated: true })
const contributionSourceText = computed(() => {
  if (contribution.value.source === 'backend_aggregate') return '按公开内容和互动数据汇总'
  if (contribution.value.source === 'profile_restricted') return '该用户限制了主页访问，贡献数据已隐藏'
  return '接口暂不可用，当前为本地估算'
})
const typeDistribution = computed(() => buildTypeDistribution(visiblePosts.value))
const representativePosts = computed(() => pickRepresentativePosts(visiblePosts.value, 3))
const latestPosts = computed(() => latestPublicPosts(visiblePosts.value, 6))
const creatorFocusLabels = computed(() => buildCreatorFocusLabels(visiblePosts.value, 6))
const followReasons = computed(() => buildFollowReasons(user.value, visiblePosts.value, contribution.value, publicCollections.value))
const publicIdentitySummary = computed(() => buildPublicIdentitySummary(user.value, visiblePosts.value, publicCollections.value, contribution.value))
const relationshipContext = computed(() => authStore.isLoggedIn
  ? buildRelationshipContext({
      viewerUid: authStore.user?.uid,
      author: user.value,
      isLoggedIn: authStore.isLoggedIn,
      isPublicVisitor: false,
    })
  : { visibleToViewer: false, items: [] })
const isViewingSelf = computed(() => String(authStore.user?.uid ?? '') === String(user.value?.uid ?? ''))
const isContactRequestOpen = computed(() => {
  if (!user.value || user.value.profileVisible === false) return false
  if (user.value.canStartContactRequest !== undefined) return user.value.canStartContactRequest === true
  if (user.value.acceptContactRequest === false) return false
  return String(user.value.contactRequestPolicy ?? '').toLowerCase() !== 'off'
})
const showContactAuthorEntry = computed(() => Boolean(user.value)
  && user.value?.profileVisible !== false
  && !isViewingSelf.value)
const canStartContactRequest = computed(() => showContactAuthorEntry.value && isContactRequestOpen.value)
const profileTabs = ['content', 'collections', 'participation'] as const

const formatTime = (value: number) => {
  if (!value) return '刚刚更新'
  const diff = Date.now() - value
  if (diff < 60_000) return '刚刚更新'
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} 分钟前更新`
  if (diff < 86_400_000) return `${Math.max(1, Math.floor(diff / 3_600_000))} 小时前更新`
  return `${Math.max(1, Math.floor(diff / 86_400_000))} 天前更新`
}

const showCollectionCover = (collection: ContentSeriesRecord) => {
  const coverUrl = String(collection.coverUrl || '')
  return Boolean(coverUrl) && !failedCollectionCoverUrls.value.has(coverUrl)
}

const handleCollectionCoverError = (coverUrl?: string) => {
  const safeCoverUrl = String(coverUrl || '')
  if (!safeCoverUrl) return
  failedCollectionCoverUrls.value = new Set([...failedCollectionCoverUrls.value, safeCoverUrl])
}

const isActiveProfileLoad = (generation: number, uid: string, signal: AbortSignal) => (
  !signal.aborted
  && generation === profileLoadGeneration
  && uid === profileUid.value
)

const loadPublicCollections = async (uid: string, generation: number, signal: AbortSignal) => {
  isLoadingCollections.value = true
  collectionsError.value = ''
  try {
    const res = await contentSeriesApi.listPublicByUser(uid, undefined, 6)
    if (!isActiveProfileLoad(generation, uid, signal)) return
    publicCollections.value = filterVisibleCollections(res.data || [])
  } catch (error: unknown) {
    if (!isActiveProfileLoad(generation, uid, signal)) return
    publicCollections.value = []
    collectionsError.value = getErrorMessage(error, '公开合集加载失败')
  } finally {
    if (isActiveProfileLoad(generation, uid, signal)) {
      isLoadingCollections.value = false
    }
  }
}

const loadPublicFavoriteFolders = async (uid: string, generation: number, signal: AbortSignal) => {
  isLoadingFavoriteFolders.value = true
  favoriteFoldersError.value = ''
  try {
    const res = await interactionApi.listPublicFavoriteFoldersByUser(uid, 6)
    if (!isActiveProfileLoad(generation, uid, signal)) return
    publicFavoriteFolders.value = (res.data || []).filter((folder) => folder.visibility === 'public')
  } catch (error: unknown) {
    if (!isActiveProfileLoad(generation, uid, signal)) return
    publicFavoriteFolders.value = []
    favoriteFoldersError.value = getErrorMessage(error, '公开收藏夹加载失败')
  } finally {
    if (isActiveProfileLoad(generation, uid, signal)) {
      isLoadingFavoriteFolders.value = false
    }
  }
}

const loadProfile = async () => {
  const uid = profileUid.value
  if (!uid) return
  profileLoadController?.abort()
  const controller = new AbortController()
  profileLoadController = controller
  const generation = ++profileLoadGeneration
  isLoading.value = true
  loadError.value = ''
  user.value = null
  posts.value = []
  publicCollections.value = []
  publicFavoriteFolders.value = []
  userIntent.value = null
  backendContribution.value = null
  try {
    const profile = await userApi.getProfile(uid)
    if (!isActiveProfileLoad(generation, uid, controller.signal)) return
    user.value = profile.data
    if (!profile.data || profile.data.profileVisible === false) {
      posts.value = []
      userIntent.value = null
      backendContribution.value = null
      isLoadingCollections.value = false
      isLoadingFavoriteFolders.value = false
      return
    }
    const [intent, authoredPosts, contributionRes] = await Promise.allSettled([
      userApi.getIntent(uid),
      postApi.list({ authorId: uid }),
      userApi.getContribution(uid),
    ])
    if (!isActiveProfileLoad(generation, uid, controller.signal)) return
    userIntent.value = intent.status === 'fulfilled' ? intent.value.data : null
    posts.value = authoredPosts.status === 'fulfilled' ? filterVisiblePosts(authoredPosts.value.data?.items || []) : []
    backendContribution.value = contributionRes.status === 'fulfilled' ? contributionRes.value.data : null
    await Promise.all([
      loadPublicCollections(uid, generation, controller.signal),
      loadPublicFavoriteFolders(uid, generation, controller.signal),
    ])
  } catch (error: unknown) {
    if (!isActiveProfileLoad(generation, uid, controller.signal)) return
    loadError.value = getErrorMessage(error, '用户资料加载失败')
  } finally {
    if (isActiveProfileLoad(generation, uid, controller.signal)) {
      isLoading.value = false
    }
  }
}

const toggleFollow = async () => {
  if (!user.value) return
  if (!requireLogin()) return
  if (isFollowBusy.value) return
  isFollowBusy.value = true
  const targetUid = String(user.value.uid)
  const wasFollowing = Boolean(user.value.isFollowing)
  try {
    if (wasFollowing) {
      await userApi.unfollow(targetUid)
    } else {
      await userApi.follow(targetUid)
    }
    if (String(user.value?.uid ?? '') !== targetUid || profileUid.value !== targetUid) return
    user.value = {
      ...user.value,
      isFollowing: !wasFollowing,
      followerCount: Math.max(0, Number(user.value.followerCount ?? 0) + (wasFollowing ? -1 : 1)),
    }
  } catch (error: unknown) {
    toast.error(getErrorMessage(error, '关注操作失败'))
  } finally {
    isFollowBusy.value = false
  }
}

const openContactRequestDialog = () => {
  if (!canStartContactRequest.value) return
  if (!requireLogin()) return
  isContactDialogOpen.value = true
}

const handleTabKeydown = (event: KeyboardEvent, index: number) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? profileTabs.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + profileTabs.length) % profileTabs.length
  activeTab.value = profileTabs[nextIndex]
  document.getElementById(`profile-tab-${activeTab.value}`)?.focus()
}

const reportPost = (postId: Post['postId']) => {
  if (isViewingSelf.value) return
  if (!requireLogin()) return
  router.push({
    path: `/post/${postId}`,
    query: { report: 'post' },
  })
}

watch(profileUid, loadProfile, { immediate: true })
watch(profileUid, () => {
  activeTab.value = 'content'
})
watch([user, loadError, profileUid], () => {
  applyPageSeo({
    title: user.value?.profileVisible === false
      ? '主页暂不可用'
      : user.value?.nickname || (loadError.value ? '作者主页暂不可用' : '作者主页'),
    description: profileSeoDescription.value,
    canonical: `/u/${profileUid.value}`,
  })
}, { immediate: true })

onBeforeUnmount(() => {
  profileLoadGeneration += 1
  profileLoadController?.abort()
  profileLoadController = null
})
</script>

<style scoped>
.public-profile-main {
  padding-top: 1.5rem;
  padding-bottom: 3rem;
}

.profile-panel {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface-1);
  box-shadow: var(--shadow-card);
}

.profile-state,
.restricted-profile {
  padding: 4rem 1.5rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.profile-state h1,
.restricted-profile h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1.25rem;
  font-weight: 750;
}

.profile-state p,
.restricted-profile p {
  margin: 0.5rem 0 0;
}

.profile-hero {
  padding: 1.5rem;
}

.profile-hero-layout {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 1.25rem;
  align-items: start;
}

.profile-avatar {
  width: 5.25rem;
  height: 5.25rem;
  flex: none;
  border: 1px solid var(--border-subtle);
  border-radius: 50%;
  font-size: 1.5rem;
  font-weight: 800;
}

.profile-identity {
  min-width: 0;
}

.profile-context {
  margin: 0 0 0.25rem;
  color: var(--primary-600);
  font-size: 0.75rem;
  font-weight: 700;
}

.profile-name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.625rem;
}

.profile-name-row h1 {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--text-strong);
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.3;
  text-wrap: balance;
}

.profile-author-label,
.identity-neutral-pill {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  border-radius: var(--radius-pill);
  background: #ecfdf3;
  padding: 0.25rem 0.625rem;
  color: #067647;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.profile-description {
  max-width: 68ch;
  margin: 0.5rem 0 0;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.65;
  text-wrap: pretty;
}

.profile-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.75rem;
  margin-top: 1rem;
}

.profile-stats div {
  min-width: 4.5rem;
}

.profile-stats strong {
  display: block;
  color: var(--text-strong);
  font-size: 1.125rem;
  font-weight: 800;
}

.profile-stats span {
  display: block;
  margin-top: 0.125rem;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.profile-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  max-width: 22rem;
}

.follow-button,
.contact-author-button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-control);
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
}

.follow-button {
  background: var(--primary-600);
  color: white;
}

.follow-button:hover:not(:disabled) {
  background: var(--primary-700);
}

.contact-author-button {
  border: 1px solid var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-primary);
}

.contact-author-button:hover {
  border-color: #b2ccff;
  background: var(--primary-50);
  color: var(--primary-700);
}

.follow-button:disabled,
.contact-author-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.contact-author-unavailable {
  margin: 0.75rem 0 0 calc(5.25rem + 1.25rem);
  color: var(--text-muted);
  font-size: 0.75rem;
}

.profile-tabs {
  display: flex;
  max-width: 100%;
  gap: 0.25rem;
  margin-top: 1rem;
  overflow-x: auto;
  border-bottom: 1px solid var(--border-subtle);
  scrollbar-width: none;
}

.profile-tabs::-webkit-scrollbar {
  display: none;
}

.profile-tabs button {
  position: relative;
  display: inline-flex;
  min-height: 3rem;
  flex: none;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.875rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  font-weight: 700;
  white-space: nowrap;
}

.profile-tabs button::after {
  position: absolute;
  right: 0.875rem;
  bottom: -1px;
  left: 0.875rem;
  height: 2px;
  background: transparent;
  content: "";
}

.profile-tabs button:hover,
.profile-tabs button.is-active {
  color: var(--primary-700);
}

.profile-tabs button.is-active::after {
  background: var(--primary-600);
}

.profile-tabs button > span {
  min-width: 1.25rem;
  border-radius: var(--radius-pill);
  background: var(--surface-muted);
  padding: 0.1rem 0.4rem;
  color: var(--text-muted);
  font-size: 0.6875rem;
  line-height: 1.25rem;
  text-align: center;
}

.profile-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18.5rem;
  gap: 1.25rem;
  align-items: start;
  margin-top: 1.25rem;
}

.profile-primary,
.profile-tab-panel {
  min-width: 0;
}

.profile-tab-panel {
  display: grid;
  gap: 1rem;
}

.content-section,
.rail-section {
  padding: 1.25rem;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-subtle);
}

.section-heading.compact {
  padding-bottom: 0;
  border-bottom: 0;
}

.section-heading h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.4;
}

.section-heading p {
  max-width: 68ch;
  margin: 0.375rem 0 0;
  color: var(--text-muted);
  font-size: 0.8125rem;
  line-height: 1.6;
  text-wrap: pretty;
}

.section-count {
  flex: none;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.empty-state {
  padding: 2.5rem 1rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  text-align: center;
}

.empty-state-error {
  color: #b42318;
}

.representative-list {
  display: grid;
  gap: 0;
}

.representative-card {
  padding: 1.125rem 0;
  border-bottom: 1px solid var(--border-subtle);
}

.representative-card:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.post-main-link {
  display: block;
}

.post-main-link h3 {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--text-strong);
  font-size: 1.0625rem;
  font-weight: 800;
  line-height: 1.45;
}

.post-main-link:hover h3 {
  color: var(--primary-700);
}

.post-main-link p {
  display: -webkit-box;
  overflow: hidden;
  margin: 0.5rem 0 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.65;
}

.post-public-metrics {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.875rem;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.post-public-metrics a {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
  color: var(--primary-700);
  font-weight: 700;
}

.post-public-metrics button {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--text-muted);
  font-weight: 700;
}

.post-public-metrics button:hover {
  color: #b42318;
}

.latest-list,
.collection-list {
  display: grid;
}

.latest-row,
.collection-row {
  display: grid;
  align-items: center;
  border-bottom: 1px solid var(--border-subtle);
}

.latest-row {
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.75rem;
  padding: 1rem 0;
}

.latest-row:last-child,
.collection-row:last-child {
  border-bottom: 0;
}

.latest-row-marker {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--primary-500);
}

.latest-row-copy {
  min-width: 0;
}

.latest-row strong,
.latest-row small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.latest-row strong {
  color: var(--text-strong);
  font-size: 0.875rem;
  font-weight: 750;
}

.latest-row small {
  margin-top: 0.25rem;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.latest-row > svg,
.collection-row > svg {
  color: var(--text-muted);
  transition: transform 160ms ease, color 160ms ease;
}

.latest-row:hover > svg,
.collection-row:hover > svg {
  color: var(--primary-600);
  transform: translateX(2px);
}

.collection-row {
  grid-template-columns: 4rem minmax(0, 1fr) auto;
  gap: 0.875rem;
  padding: 1rem 0;
}

.collection-row-compact {
  grid-template-columns: 2.75rem minmax(0, 1fr) auto;
}

.collection-cover,
.folder-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: white;
}

.collection-cover {
  width: 4rem;
  aspect-ratio: 1;
  border-radius: var(--radius-surface);
  background: #344054;
  font-size: 1.125rem;
  font-weight: 800;
}

.collection-cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.folder-mark {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--radius-surface);
  background: var(--primary-600);
}

.collection-copy {
  min-width: 0;
}

.collection-copy > div {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.collection-copy strong {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--text-strong);
  font-size: 0.9375rem;
  font-weight: 800;
}

.collection-copy > div span {
  border-radius: var(--radius-pill);
  background: var(--primary-50);
  padding: 0.2rem 0.5rem;
  color: var(--primary-700);
  font-size: 0.6875rem;
  font-weight: 700;
}

.collection-copy p {
  display: -webkit-box;
  overflow: hidden;
  margin: 0.35rem 0 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--text-muted);
  font-size: 0.8125rem;
  line-height: 1.55;
}

.collection-copy small {
  display: block;
  margin-top: 0.35rem;
  color: var(--text-muted);
  font-size: 0.6875rem;
}

.feedback-grid,
.identity-grid {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.feedback-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.feedback-grid article,
.identity-signal {
  background: var(--surface-2);
  border-radius: var(--radius-surface);
  padding: 0.875rem;
}

.feedback-grid strong,
.feedback-grid span {
  display: block;
}

.feedback-grid strong {
  color: var(--text-strong);
  font-size: 1.25rem;
  font-weight: 800;
}

.feedback-grid span {
  margin-top: 0.2rem;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.identity-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.identity-signal > span,
.relationship-context article span {
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.identity-signal > strong {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-strong);
  font-size: 1.125rem;
  font-weight: 800;
}

.identity-signal p,
.relationship-context article p {
  margin: 0.4rem 0 0;
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.55;
}

.tag-section {
  margin-top: 1rem;
}

.tag-section > strong {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
  font-size: 0.75rem;
  font-weight: 800;
}

.tag-section > div,
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-pill {
  display: inline-flex;
  border-radius: var(--radius-pill);
  background: var(--surface-muted);
  padding: 0.35rem 0.625rem;
  color: var(--text-primary);
  font-size: 0.75rem;
  font-weight: 600;
}

.relationship-context {
  margin-top: 1rem;
  border: 1px solid #b2ddff;
  border-radius: var(--radius-surface);
  background: #eff8ff;
  padding: 0.875rem;
}

.relationship-context > strong {
  color: #175cd3;
  font-size: 0.8125rem;
}

.relationship-context > div {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.text-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 1rem;
  color: var(--primary-700);
  font-size: 0.8125rem;
  font-weight: 750;
}

.intent-note {
  padding: 1rem 1.25rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
}

.profile-rail {
  position: sticky;
  top: calc(var(--community-header-height) + 1rem);
  display: grid;
  gap: 1rem;
}

.reason-list {
  display: grid;
  gap: 0.625rem;
  margin-top: 1rem;
}

.reason-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.625rem;
  align-items: start;
}

.reason-row svg {
  margin-top: 0.2rem;
  color: var(--success);
}

.reason-row p {
  margin: 0;
  color: var(--text-primary);
  font-size: 0.8125rem;
  line-height: 1.55;
}

.boundary-list {
  display: grid;
  gap: 0.5rem;
  margin: 1rem 0 0;
  padding: 0;
  list-style: none;
}

.boundary-list li {
  position: relative;
  padding-left: 0.875rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.55;
}

.boundary-list li::before {
  position: absolute;
  top: 0.55rem;
  left: 0;
  width: 0.3rem;
  height: 0.3rem;
  border-radius: 50%;
  background: #98a2b3;
  content: "";
}

:global(.dark .profile-author-label),
:global(.dark .identity-neutral-pill) {
  background: rgba(6, 118, 71, 0.2);
  color: #6ce9a6;
}

:global(.dark .contact-author-button) {
  border-color: #344054;
  background: var(--surface-2);
  color: #e4e7ec;
}

:global(.dark .contact-author-button:hover) {
  border-color: #528bff;
  background: rgba(21, 94, 239, 0.14);
  color: #b2ccff;
}

:global(.dark .profile-tabs button.is-active),
:global(.dark .profile-tabs button:hover),
:global(.dark .post-main-link:hover h3),
:global(.dark .post-public-metrics a),
:global(.dark .text-link) {
  color: #84adff;
}

:global(.dark .collection-copy > div span) {
  background: rgba(21, 94, 239, 0.16);
  color: #84adff;
}

:global(.dark .relationship-context) {
  border-color: #1849a9;
  background: rgba(23, 92, 211, 0.13);
}

:global(.dark .relationship-context > strong) {
  color: #84caff;
}

@media (max-width: 960px) {
  .profile-hero-layout {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .profile-actions {
    grid-column: 2;
    justify-content: flex-start;
    max-width: none;
  }

  .profile-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .profile-rail {
    position: static;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

}

@media (max-width: 640px) {
  .public-profile-main {
    padding-top: 1rem;
    padding-bottom: 2rem;
  }

  .profile-hero,
  .content-section,
  .rail-section {
    padding: 1rem;
  }

  .profile-hero-layout {
    grid-template-columns: 4rem minmax(0, 1fr);
    gap: 0.875rem;
  }

  .profile-avatar {
    width: 4rem;
    height: 4rem;
    font-size: 1.125rem;
  }

  .profile-context {
    margin-top: 0.1rem;
  }

  .profile-name-row h1 {
    font-size: 1.25rem;
  }

  .profile-description {
    font-size: 0.8125rem;
  }

  .profile-stats {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .profile-stats div {
    min-width: 0;
    border-top: 1px solid var(--border-subtle);
    padding-top: 0.625rem;
  }

  .profile-actions {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .profile-actions :deep(.public-share-button) {
    width: 100%;
  }

  .follow-button,
  .contact-author-button {
    width: 100%;
  }

  .profile-actions > :only-child {
    grid-column: 1 / -1;
  }

  .contact-author-unavailable {
    margin-left: 0;
  }

  .profile-tabs button {
    min-height: 2.75rem;
    padding: 0 0.75rem;
  }

  .profile-tabs button::after {
    right: 0.75rem;
    left: 0.75rem;
  }

  .profile-layout {
    margin-top: 1rem;
  }

  .section-heading {
    gap: 0.75rem;
  }

  .post-public-metrics a {
    width: 100%;
    margin-left: 0;
  }

  .latest-row small {
    white-space: normal;
  }

  .collection-row,
  .collection-row-compact {
    grid-template-columns: 3.25rem minmax(0, 1fr);
  }

  .collection-cover {
    width: 3.25rem;
  }

  .collection-row > svg {
    display: none;
  }

  .feedback-grid,
  .identity-grid,
  .relationship-context > div,
  .profile-rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-rail {
    display: grid;
  }

  .rail-section {
    grid-column: 1 / -1;
  }
}

@media (max-width: 390px) {
  .profile-actions {
    grid-template-columns: 1fr;
  }

  .profile-stats {
    gap: 0.625rem;
  }

  .feedback-grid,
  .identity-grid,
  .relationship-context > div {
    grid-template-columns: 1fr;
  }

  .profile-tabs button {
    font-size: 0.8125rem;
  }
}
</style>
