<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />

    <main class="mx-auto max-w-6xl px-4 py-8">
      <section class="profile-panel">
        <div class="flex flex-col gap-6 md:flex-row md:items-start">
          <div class="avatar">
            <img v-if="user?.avatar" :src="user.avatar" :alt="user.nickname" class="h-full w-full object-cover" />
            <span v-else>{{ userInitial }}</span>
          </div>

          <div class="min-w-0 flex-1">
            <p class="mb-2 text-xs font-black text-primary-600 dark:text-primary-300">我的作者主页</p>
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="truncate text-2xl font-bold text-slate-950 dark:text-slate-50">
                {{ displayNickname }}
              </h1>
              <span v-if="user?.isBigV" class="rounded bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                公开作者
              </span>
            </div>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {{ displaySignature }}
            </p>

            <div class="mt-5 grid gap-3 sm:grid-cols-3">
              <div class="metric-card">
                <FileText class="h-4 w-4 text-primary-600" />
                <span>内容</span>
                <strong>{{ user?.postCount ?? posts.items.length }}</strong>
              </div>
              <div class="metric-card">
                <Users class="h-4 w-4 text-primary-600" />
                <span>关注</span>
                <strong>{{ user?.followingCount ?? following.items.length }}</strong>
              </div>
              <div class="metric-card">
                <UserRoundCheck class="h-4 w-4 text-primary-600" />
                <span>粉丝</span>
                <strong>{{ user?.followerCount ?? followers.items.length }}</strong>
              </div>
            </div>
          </div>

          <div class="profile-actions">
            <RouterLink to="/me/contact-requests" class="secondary-button shrink-0">
              <Mail class="h-4 w-4" />
              联系请求
            </RouterLink>
            <RouterLink to="/me/reports" class="secondary-button shrink-0">
              <Flag class="h-4 w-4" />
              我的举报
            </RouterLink>
            <RouterLink to="/me/settings" class="secondary-button shrink-0">
              <Settings class="h-4 w-4" />
              编辑资料
            </RouterLink>
          </div>
        </div>
      </section>

      <section class="community-growth-panel">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-950 dark:text-slate-50">我的作者主页</h2>
            <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {{ contributionSourceText }}。这里展示的是公开内容的可解释反馈，不使用分数或等级表达。
            </p>
            <p v-if="profileDemoNotice" class="mt-2 text-xs font-semibold text-sky-700 dark:text-sky-300">
              {{ profileDemoNotice }}
            </p>
          </div>
          <div class="score-card">
            <strong>7 / 30</strong>
            <span>近期反馈窗口</span>
          </div>
        </div>
        <div class="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div v-for="item in publicImpactOverview" :key="item.label" class="growth-stat">
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
          </div>
        </div>
        <div v-if="typeDistribution.length" class="mt-5 flex flex-wrap gap-2">
          <span v-for="item in typeDistribution" :key="item.name" class="type-chip">{{ item.name }} {{ item.count }}</span>
        </div>
      </section>

      <section id="creator-workbench" class="creator-feedback-panel mt-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div class="creator-workbench-title-row">
              <p class="text-xs font-black text-primary-600 dark:text-primary-300">创作者轻反馈 · 创作者工作台</p>
              <span class="workspace-source-pill">{{ creatorWorkspaceStateLabel }}</span>
            </div>
            <h2>公开内容反馈、维护入口和下一篇方向</h2>
            <span>只聚合公开内容信号，只展示公开内容互动，覆盖近 7 天/30 天，不承诺曝光效果；回复、更新和选题入口会带上创作者工作台来源上下文。</span>
            <span>{{ creatorWorkspaceNotice }}</span>
          </div>
          <div class="creator-feedback-actions">
            <RouterLink to="/me/notifications" class="secondary-button">查看通知中心</RouterLink>
            <RouterLink :to="{ path: '/editor', query: { source: 'creator_workbench', action: 'template', contextType: 'template', returnHref: '/me#creator-workbench' } }" class="primary-button">开始写一篇</RouterLink>
          </div>
        </div>
        <p v-if="creatorWorkspaceError" class="creator-empty-copy mt-3">{{ creatorWorkspaceError }}</p>
        <div class="feedback-window-grid">
          <article v-for="item in feedbackWindows" :key="item.label" class="feedback-window-card">
            <div>
              <strong>{{ item.label }}</strong>
              <span>{{ item.description }}</span>
            </div>
            <div class="feedback-window-metrics">
              <span>{{ item.posts }} 篇内容</span>
              <span>{{ item.comments }} 条评论</span>
              <span>{{ item.favorites }} 次收藏</span>
              <span>{{ item.likes }} 次点赞</span>
            </div>
          </article>
        </div>
        <div class="mt-5 grid gap-3 sm:grid-cols-5">
          <RouterLink to="/me?tab=posts" class="feedback-stat">
            <MessageCircle class="h-4 w-4 text-primary-600" />
            <strong>{{ publicImpactStats.recentComments }}</strong>
            <span>近期评论</span>
            <small>公开讨论里的可回应线索</small>
          </RouterLink>
          <RouterLink to="/me?tab=favorites" class="feedback-stat">
            <Bookmark class="h-4 w-4 text-primary-600" />
            <strong>{{ publicImpactStats.recentFavorites }}</strong>
            <span>近期收藏</span>
            <small>适合沉淀成清单或合集</small>
          </RouterLink>
          <RouterLink :to="{ path: '/growth/profile', hash: '#curation-feedback' }" class="feedback-stat">
            <Globe2 class="h-4 w-4 text-primary-600" />
            <strong>{{ publicImpactStats.curationCount }}</strong>
            <span>收录 / 精选</span>
            <small>查看公开内容被收录记录</small>
          </RouterLink>
          <RouterLink :to="topFeedbackPost ? topFeedbackPost.to : '/me?tab=posts'" class="feedback-stat">
            <Heart class="h-4 w-4 text-primary-600" />
            <strong>{{ topFeedbackScore }}</strong>
            <span>近期表现较好内容</span>
            <small>{{ topFeedbackPost ? '打开内容查看公共反馈' : '发布后会出现' }}</small>
          </RouterLink>
        </div>
        <div class="creator-workbench-grid">
          <article class="creator-workbench-card">
            <div class="creator-workbench-head">
              <strong>近期表现较好内容</strong>
              <RouterLink to="/me?tab=posts">管理内容</RouterLink>
            </div>
            <div v-if="topFeedbackPosts.length" class="creator-link-list">
              <RouterLink v-for="post in topFeedbackPosts" :key="post.id" :to="post.to" class="creator-link-main">
                <span>{{ post.title }}</span>
                <small>{{ post.meta }}</small>
              </RouterLink>
            </div>
            <p v-else class="creator-empty-copy">发布公开内容后，这里会按评论、收藏和点赞展示可继续经营的内容。</p>
          </article>
          <article class="creator-workbench-card">
            <div class="creator-workbench-head">
              <strong>收录 / 精选记录</strong>
              <RouterLink :to="{ path: '/growth/profile', hash: '#curation-feedback' }">查看详情</RouterLink>
            </div>
            <div v-if="curationFeedbackItems.length" class="creator-link-list">
              <RouterLink v-for="item in curationFeedbackItems" :key="item.id" :to="item.to" class="creator-link-main">
                <span>{{ item.title }}</span>
                <small>{{ item.meta }}</small>
                <small v-if="item.badge">{{ item.badge }}</small>
              </RouterLink>
            </div>
            <p v-else class="creator-empty-copy">暂无公开内容收录记录；后续被专题或精选收录时会在这里展示理由。</p>
          </article>
          <article class="creator-workbench-card">
            <div class="creator-workbench-head">
              <strong>回复机会</strong>
              <RouterLink to="/me?tab=posts">回到内容讨论</RouterLink>
            </div>
            <div v-if="replyOpportunities.length" class="creator-link-list">
              <RouterLink v-for="item in replyOpportunities" :key="item.id" :to="item.to" class="creator-link-main">
                <span>{{ item.title }}</span>
                <small>{{ item.meta }}</small>
              </RouterLink>
            </div>
            <p v-else class="creator-empty-copy">暂时没有需要集中回应的讨论；可以先整理代表作或公开合集。</p>
          </article>
          <article class="creator-workbench-card">
            <div class="creator-workbench-head">
              <strong>选题灵感</strong>
              <RouterLink :to="{ path: '/editor', query: { source: 'creator_workbench', action: 'template', contextType: 'template', returnHref: '/me#creator-workbench' } }">空白发布</RouterLink>
            </div>
            <div class="creator-link-list">
              <RouterLink v-for="idea in topicIdeas" :key="idea.id" :to="{ path: '/editor', query: idea.query }" class="creator-link-main">
                <span>{{ idea.title }}</span>
                <small>{{ idea.reason }}</small>
              </RouterLink>
            </div>
          </article>
          <article class="creator-workbench-card">
            <div class="creator-workbench-head">
              <strong>聚合搜索缺口</strong>
              <RouterLink to="/search">查看发现</RouterLink>
            </div>
            <div v-if="searchGaps.length" class="creator-link-list">
              <RouterLink v-for="gap in searchGaps" :key="gap.id" :to="gap.to" class="creator-link-main">
                <span>{{ gap.title }}</span>
                <small>{{ gap.reason }}</small>
                <small v-if="gap.badge">{{ gap.badge }}</small>
              </RouterLink>
            </div>
            <p v-else class="creator-empty-copy">暂无可展示的聚合需求；这里只展示匿名化聚合需求，并在后端返回聚合缺口时提供 EditorSearchGapContext 辅助入口。</p>
          </article>
        </div>
      </section>

      <RevisitSummaryPanel class="mt-6" />

      <section class="creator-center-grid mt-6">
        <article class="creator-action-panel">
          <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="text-xs font-black text-primary-600 dark:text-primary-300">下一步行动</p>
              <h2>创作者中心</h2>
            </div>
            <RouterLink to="/series/workbench" class="secondary-button">整理合集</RouterLink>
          </div>
          <div class="creator-action-list">
            <RouterLink to="/me?tab=followers" class="creator-action-card">
              <strong>新增关注者</strong>
              <span>{{ user?.followerCount ?? followers.items.length }} 位作者主页回访线索，只展示公开内容互动。</span>
            </RouterLink>
            <RouterLink v-for="item in creatorActions" :key="item.href" :to="item.href" class="creator-action-card">
              <strong>{{ item.title }}</strong>
              <span>{{ item.description }}</span>
            </RouterLink>
          </div>
        </article>

        <article class="creator-cert-panel">
          <p class="text-xs font-black text-primary-600 dark:text-primary-300">作者主页经营</p>
          <h2>社区身份、代表作和公开合集</h2>
          <p>
            P0 先用公开内容和公开合集经营主页；正式手动代表作设置需要后续 adapter 校验作者、内容状态和可见性。
          </p>
          <span class="creator-cert-meta">当前公开合集 {{ publicCollectionCount }} 个</span>
          <div class="creator-cert-actions">
            <RouterLink to="/me?tab=posts" class="primary-button">选择代表内容</RouterLink>
            <RouterLink to="/certification/apply" class="secondary-button">认证作者申请</RouterLink>
            <RouterLink to="/me/settings" class="secondary-button">完善作者资料</RouterLink>
          </div>
        </article>
      </section>

      <section class="profile-panel mt-6">
        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="text-xs font-black text-primary-600 dark:text-primary-300">内容资产</p>
            <h2 class="text-lg font-bold text-slate-950 dark:text-slate-50">稍后读、未整理收藏和内容合集</h2>
            <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              私密合集只在本人主页可见；公开合集仍需要通过治理过滤后才会进入访客主页。
            </p>
          </div>
          <RouterLink to="/series/workbench" class="secondary-button">整理合集</RouterLink>
        </div>
        <div class="asset-grid">
          <RouterLink to="/me?tab=favorites" class="asset-card">
            <Bookmark class="h-4 w-4 text-primary-600" />
            <strong>稍后读</strong>
            <span>默认保存入口</span>
            <small>{{ favorites.items.length }} 条</small>
          </RouterLink>
          <RouterLink to="/me?tab=favorites" class="asset-card">
            <BookmarkCheck class="h-4 w-4 text-primary-600" />
            <strong>未整理收藏</strong>
            <span>先回看，再整理到合集</span>
            <small>{{ unorganizedFavoriteCount }} 条</small>
          </RouterLink>
          <RouterLink to="/series/workbench" class="asset-card">
            <Lock class="h-4 w-4 text-primary-600" />
            <strong>私密合集</strong>
            <span>只对本人可见</span>
            <small>{{ privateCollectionCount }} 个</small>
          </RouterLink>
          <RouterLink to="/series/workbench" class="asset-card">
            <Globe2 class="h-4 w-4 text-primary-600" />
            <strong>公开合集</strong>
            <span>通过治理后展示</span>
            <small>{{ publicCollectionCount }} 个</small>
          </RouterLink>
        </div>
      </section>

      <section class="profile-panel mt-6">
        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-950 dark:text-slate-50">代表内容</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              优先选择精选、高互动和最近更新的公开内容展示在作者主页。
            </p>
          </div>
          <RouterLink to="/editor" class="secondary-button">继续发布</RouterLink>
        </div>
        <div v-if="representativePosts.length" class="representative-grid">
          <RouterLink v-for="post in representativePosts" :key="post.id" :to="post.to" class="representative-card">
            <strong>{{ post.title }}</strong>
            <span>{{ post.meta }}</span>
          </RouterLink>
        </div>
        <div v-else class="empty-inline">
          发布第一篇公开内容后，这里会形成你的作者主页代表内容。
        </div>
      </section>

      <section class="mt-6">
        <div class="tab-bar max-w-full overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            :class="['tab-button shrink-0 whitespace-nowrap', activeTab === tab.value ? 'tab-active' : '']"
            @click="setActiveTab(tab.value)"
          >
            <component :is="tab.icon" class="h-4 w-4" />
            {{ tab.label }}
          </button>
        </div>

        <div class="mt-5">
          <section v-if="activeTab === 'posts'" class="space-y-4">
            <PostList
              :state="posts"
              empty-title="还没有发布内容"
              empty-description="发布第一篇经验、问题、攻略或资源，让主页先有一个代表内容。"
              empty-action-text="去发布"
              empty-action-href="/editor"
              @load-more="loadPosts(true)"
              @like="handleLike"
              @favorite="handleFavorite"
              @follow-change="handlePostAuthorFollowChange"
            />
          </section>

          <section v-else-if="activeTab === 'favorites'" class="space-y-4">
            <div class="favorite-revisit-panel">
              <div>
                <p class="text-xs font-black text-primary-600 dark:text-primary-300">收藏回看</p>
                <h2>{{ activeFavoriteFolderTitle }}</h2>
                <span>{{ activeFavoriteFolderDescription }}</span>
              </div>
              <div class="favorite-revisit-actions">
                <button type="button" @click="handleCreateFavoriteFolder">新建收藏夹</button>
                <RouterLink to="/explore">去发现</RouterLink>
                <RouterLink to="/search">搜索内容</RouterLink>
              </div>
            </div>
            <div v-if="favoriteFolders.error" class="notice-error">{{ favoriteFolders.error }}</div>
            <div class="favorite-manager">
              <aside class="favorite-folder-panel">
                <div class="favorite-folder-panel-head">
                  <strong>收藏夹</strong>
                  <span v-if="favoriteFolders.loading">加载中...</span>
                </div>
                <div v-if="favoriteFolders.loading && !favoriteFolderOptions.length" class="favorite-folder-loading">正在加载收藏夹...</div>
                <button
                  v-for="folder in favoriteFolderOptions"
                  :key="folder.id"
                  type="button"
                  :class="['favorite-folder-item', selectedFavoriteFolderId === folder.id ? 'favorite-folder-active' : '']"
                  @click="selectFavoriteFolder(folder.id)"
                >
                  <span>
                    <strong>{{ folder.name }}</strong>
                    <small>{{ folder.description }}</small>
                  </span>
                  <em>{{ folder.count }}</em>
                </button>
                <div v-if="!favoriteFolders.loading && !customFavoriteFolders.length" class="favorite-folder-empty">
                  还没有自定义收藏夹。
                </div>
              </aside>

              <div class="favorite-content-panel">
                <div class="favorite-folder-toolbar">
                  <div>
                    <strong>{{ activeFavoriteFolderTitle }}</strong>
                    <span>{{ activeFavoriteFolderMeta }}</span>
                  </div>
                  <div v-if="activeFavoriteFolder && activeFavoriteFolder.id !== 'all'" class="favorite-folder-actions">
                    <button v-if="canSortActiveFavoriteFolder" type="button" class="secondary-button" :disabled="favoriteFolderActionLoading || !canMoveActiveFavoriteFolderUp" @click="handleSortFavoriteFolder('up')">上移</button>
                    <button v-if="canSortActiveFavoriteFolder" type="button" class="secondary-button" :disabled="favoriteFolderActionLoading || !canMoveActiveFavoriteFolderDown" @click="handleSortFavoriteFolder('down')">下移</button>
                    <button v-if="activeFavoriteFolder.canRename" type="button" class="secondary-button" :disabled="favoriteFolderActionLoading" @click="handleRenameFavoriteFolder">重命名</button>
                    <button type="button" class="secondary-button" :disabled="favoriteFolderActionLoading" @click="handleToggleFavoriteFolderPublic">
                      {{ activeFavoriteFolder.isPublic ? '设为私密' : '设为公开' }}
                    </button>
                    <button v-if="activeFavoriteFolder.canDelete" type="button" class="secondary-button danger-button" :disabled="favoriteFolderActionLoading" @click="handleDeleteFavoriteFolder">删除</button>
                  </div>
                </div>
                <div v-if="canBatchMoveFavorites" class="favorite-batch-toolbar">
                  <label>
                    <input type="checkbox" :checked="allVisibleFavoritesSelected" @change="toggleSelectVisibleFavorites" />
                    <span>选择当前页</span>
                  </label>
                  <span>{{ selectedFavoritePostIds.length }} 条已选</span>
                  <select v-model="favoriteBatchTargetFolderId" :disabled="favoriteFolderActionLoading">
                    <option value="">选择移动目标</option>
                    <option v-for="folder in favoriteMoveTargetFolders" :key="folder.id" :value="folder.id">
                      {{ folder.name }}
                    </option>
                  </select>
                  <button type="button" class="secondary-button" :disabled="favoriteBatchMoveDisabled" @click="handleBatchMoveFavorites">
                    批量移动
                  </button>
                  <button v-if="selectedFavoritePostIds.length" type="button" class="secondary-button" :disabled="favoriteFolderActionLoading" @click="clearSelectedFavoritePosts">
                    清空选择
                  </button>
                </div>
                <PostList
                  :state="activeFavoritePostState"
                  :empty-title="favoriteEmptyTitle"
                  :empty-description="favoriteEmptyDescription"
                  :selectable="activeTab === 'favorites'"
                  :selected-post-ids="selectedFavoritePostIds"
                  @load-more="loadActiveFavoritePosts(true)"
                  @like="handleLike"
                  @favorite="handleFavorite"
                  @follow-change="handlePostAuthorFollowChange"
                  @toggle-select="toggleFavoritePostSelection"
                />
              </div>
            </div>
          </section>

          <section v-else-if="activeTab === 'liked'" class="space-y-4">
            <PostList
              :state="likedPosts"
              empty-title="还没有点赞内容"
              empty-description="点赞过的帖子会汇总到这里，方便回访和继续互动。"
              @load-more="loadLikedPosts(true)"
              @like="handleLike"
              @favorite="handleFavorite"
              @follow-change="handlePostAuthorFollowChange"
            />
          </section>

          <section v-else-if="activeTab === 'following'">
            <UserList
              :state="following"
              empty-title="还没有关注用户"
              empty-description="在发现页或帖子作者卡片里关注感兴趣的人。"
              @load-more="loadFollowing(true)"
              @follow-change="handleFollowingUserChange"
            />
          </section>

          <section v-else-if="activeTab === 'topics'">
            <TopicList
              :state="topics"
              empty-title="还没有关注专题"
              empty-description="在话题详情页关注感兴趣的话题，后续可以从这里快速回访。"
              @load-more="loadFollowingTopics(true)"
            />
          </section>

          <section v-else-if="activeTab === 'discussion-follows'" class="space-y-4">
            <PostList
              :state="discussionFollows"
              empty-title="还没有关注讨论"
              empty-description="在帖子详情页关注讨论后，有新回复的内容会汇总到这里。"
              @load-more="loadDiscussionFollows(true)"
              @like="handleLike"
              @favorite="handleFavorite"
              @follow-change="handlePostAuthorFollowChange"
            />
          </section>

          <section v-else>
            <UserList
              :state="followers"
              empty-title="还没有粉丝"
              empty-description="持续发布有用内容，会更容易被同路人关注。"
              @load-more="loadFollowers(true)"
              @follow-change="handleFollowerUserChange"
            />
          </section>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Bookmark, BookmarkCheck, FileText, Flag, Globe2, Hash, Heart, Lock, Mail, MessageCircle, Settings, UserRoundCheck, Users } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import AppHeader from '@/components/layout/AppHeader.vue'
import PostCard from '@/components/post/PostCard.vue'
import RevisitSummaryPanel from '@/components/retention/RevisitSummaryPanel.vue'
import UserCard from '@/components/user/UserCard.vue'
import { useAuthStore } from '@/stores/auth'
import { postApi } from '@/api/post'
import { userApi } from '@/api/user'
import { interactionApi } from '@/api/interaction'
import { creatorFeedbackApi } from '@/api/creatorFeedback'
import { contentSeriesApi, type ContentSeriesRecord } from '@/api/contentSeries'
import { usePostInteraction } from '@/composables/usePostInteraction'
import type {
  ApiId,
  CommunityTopic,
  ContactRequestStats,
  CreatorCurationFeedback,
  CreatorCurationFeedbackSummary,
  CreatorFeedbackWindow,
  CreatorGrowthWorkspace,
  CreatorReplyOpportunity,
  CreatorRepresentativePost,
  CreatorSearchGap,
  CreatorTopPost,
  CreatorTopicIdea,
  PaginatedResponse,
  Post,
  User,
} from '@/api/types'
import { buildContributionSummary, buildTypeDistribution, type ContributionSummary } from '@/utils/communityMetrics'
import { filterPublicContent, safePublicVisibleText, sanitizePublicVisibleText } from '@/utils/textQuality'
import { pickRepresentativePosts, publicAuthorPosts } from '@/utils/creatorSignals'
import { filterVisibleCollections, filterVisiblePosts } from '@/utils/recommendationGovernance'
import { demoProfileContribution, isLocalDemoSeedAllowed } from '@/data/demoSeeds'
import { getContentTypeShortLabel } from '@/utils/contentTypes'

type TabValue = 'posts' | 'favorites' | 'liked' | 'following' | 'topics' | 'discussion-follows' | 'followers'

interface ListState<T> {
  items: T[]
  cursor?: string
  hasMore: boolean
  loading: boolean
  error: string
}

type WorkbenchRouteTo = string | {
  path: string
  hash?: string
  query?: Record<string, string>
}

interface WorkbenchLinkItem {
  id: string
  title: string
  meta: string
  to: WorkbenchRouteTo
  badge?: string
  score?: number
}

interface WorkbenchTopicIdeaItem {
  id: string
  title: string
  reason: string
  query: Record<string, string>
}

interface WorkbenchSearchGapItem {
  id: string
  title: string
  reason: string
  to: string
  badge?: string
}

type FavoriteFolderKind = 'all' | 'default' | 'custom' | 'unorganized'

interface FavoriteFolderView {
  id: string
  name: string
  description: string
  count: number
  kind: FavoriteFolderKind
  isPublic: boolean
  isDefault: boolean
  sortOrder: number
  canRename: boolean
  canDelete: boolean
}

interface FavoriteFolderState {
  items: FavoriteFolderView[]
  loading: boolean
  error: string
}

type FavoriteFolderApi = {
  listFavoriteFolders?: () => Promise<{ data?: any[] }>
  createFavoriteFolder?: (payload: { name: string; visibility?: 'public' | 'private'; isPublic?: boolean }) => Promise<{ data?: any }>
  updateFavoriteFolder?: (folderId: ApiId, payload: { name?: string; visibility?: 'public' | 'private'; isPublic?: boolean }) => Promise<{ data?: any }>
  sortFavoriteFolder?: (folderId: ApiId, payload: { sortOrder: number }) => Promise<{ data?: any }>
  reorderFavoriteFolders?: (folderIds: ApiId[]) => Promise<{ data?: any[] }>
  deleteFavoriteFolder?: (folderId: ApiId, targetFolderId?: ApiId | null) => Promise<unknown>
  listFavoriteFolderPosts?: (folderId: ApiId, cursor?: string, size?: number) => Promise<{ data?: PaginatedResponse<Post> | null }>
  batchMoveFavoritesToFolder?: (payload: { postIds: ApiId[]; folderId?: ApiId | null }) => Promise<{ data?: any }>
}

const createState = <T,>(): ListState<T> => reactive({
  items: [],
  cursor: undefined,
  hasMore: false,
  loading: false,
  error: '',
})

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const user = ref(authStore.user)
const activeTab = ref<TabValue>('posts')
const posts = createState<Post>()
const favorites = createState<Post>()
const favoriteFolderPosts = createState<Post>()
const likedPosts = createState<Post>()
const following = createState<User>()
const topics = createState<CommunityTopic>()
const discussionFollows = createState<Post>()
const followers = createState<User>()
const favoriteFolders = reactive<FavoriteFolderState>({
  items: [],
  loading: false,
  error: '',
})
const selectedFavoriteFolderId = ref('all')
const favoriteFolderActionLoading = ref(false)
const selectedFavoritePostIds = ref<ApiId[]>([])
const favoriteBatchTargetFolderId = ref('')
const backendContribution = ref<ContributionSummary | null>(null)
const creatorWorkspace = ref<CreatorGrowthWorkspace | null>(null)
const curationFeedbackSummary = ref<CreatorCurationFeedbackSummary | null>(null)
const contactRequestStats = ref<ContactRequestStats | null>(null)
const creatorWorkspaceLoading = ref(false)
const creatorWorkspaceError = ref('')
const ownerCollections = ref<ContentSeriesRecord[]>([])
const myCollections = ref<ContentSeriesRecord[]>([])

const tabs = [
  { value: 'posts', label: '我的内容', icon: FileText },
  { value: 'favorites', label: '我的收藏', icon: Bookmark },
  { value: 'liked', label: '我的点赞', icon: Heart },
  { value: 'following', label: '我的关注', icon: Users },
  { value: 'topics', label: '关注话题', icon: Hash },
  { value: 'discussion-follows', label: '关注讨论', icon: MessageCircle },
  { value: 'followers', label: '我的粉丝', icon: UserRoundCheck },
] satisfies Array<{ value: TabValue; label: string; icon: any }>
const tabValues = new Set<TabValue>(tabs.map((tab) => tab.value))

const setActiveTab = (value: TabValue) => {
  activeTab.value = value
  if (route.query.tab !== value) {
    router.replace({ path: route.path, query: { ...route.query, tab: value } })
  }
}

const displayNickname = computed(() => safePublicVisibleText(user.value?.nickname, '我的主页'))
const displaySignature = computed(() => sanitizePublicVisibleText(
  user.value?.signature,
  '完善简介后，其他人可以更快了解你关注的频道、经验和内容方向。',
))
const userInitial = computed(() => displayNickname.value.charAt(0) || '?')
const emptyContributionSummary: ContributionSummary = {
  ...buildContributionSummary([]),
  source: 'empty_profile',
  estimated: true,
}
const localContribution = computed(() => {
  const summary = buildContributionSummary(posts.items)
  if (summary.score > 0) return { ...summary, source: 'frontend_estimate', estimated: true }
  return isLocalDemoSeedAllowed() ? demoProfileContribution : emptyContributionSummary
})
const contribution = computed(() => backendContribution.value || localContribution.value)
const contributionSourceText = computed(() => (
  contribution.value.source === 'backend_aggregate'
    ? '由后端按公开内容、精选和互动数据汇总'
    : contribution.value.source === 'local_demo_seed'
      ? '当前为本地作者数据样例'
      : contribution.value.source === 'empty_profile'
        ? '暂无公开内容贡献数据'
    : '接口暂不可用，当前为本地估算'
))
const profileDemoNotice = computed(() => contribution.value.source === 'local_demo_seed'
  ? '发布第一篇经验、问题或资源后，这里会展示你的真实作者数据。'
  : ''
)
const typeDistribution = computed(() => buildTypeDistribution(posts.items))
const publicCollectionCount = computed(() => filterVisibleCollections(myCollections.value).length)
const privateCollectionCount = computed(() => ownerCollections.value.filter((item) => item.visibility === 'private').length)
const unorganizedFavoriteCount = computed(() => favorites.items.length)
const favoriteFolderApi = interactionApi as unknown as FavoriteFolderApi
const reservedFavoriteFolderIds = new Set(['all', 'default', 'unorganized'])
const normalizeFavoriteFolder = (raw: any): FavoriteFolderView => {
  const id = String(raw?.id ?? raw?.folderId ?? raw?.favoriteFolderId ?? raw?.key ?? '')
  const kind = String(raw?.kind ?? raw?.type ?? '').toLowerCase()
  const isDefault = Boolean(raw?.isDefault ?? raw?.default ?? (kind === 'default'))
  const isUnorganized = Boolean(raw?.isUnorganized ?? (kind === 'unorganized' || id === 'unorganized'))
  const isPublic = Boolean(raw?.isPublic ?? raw?.public ?? raw?.visibility === 'public')
  return {
    id: id || (isDefault ? 'default' : isUnorganized ? 'unorganized' : `folder-${Date.now()}`),
    name: String(raw?.name ?? raw?.title ?? (isUnorganized ? '未整理收藏' : isDefault ? '默认收藏夹' : '收藏夹')),
    description: String(raw?.description ?? raw?.summary ?? (isUnorganized ? '后端可区分时展示未整理内容' : isDefault ? '一键收藏默认进入这里' : '自定义收藏夹')),
    count: Number(raw?.count ?? raw?.postCount ?? raw?.favoriteCount ?? raw?.totalCount ?? 0),
    kind: isUnorganized ? 'unorganized' : isDefault ? 'default' : 'custom',
    isPublic,
    isDefault,
    sortOrder: Number(raw?.sortOrder ?? raw?.sort_order ?? 0),
    canRename: Boolean(raw?.canRename ?? !isDefault),
    canDelete: Boolean(raw?.canDelete ?? (!isDefault && !isUnorganized)),
  }
}
const fallbackFavoriteFolders = computed<FavoriteFolderView[]>(() => [
  {
    id: 'default',
    name: '默认收藏夹',
    description: '一键收藏默认进入这里',
    count: favorites.items.length,
    kind: 'default',
    isPublic: false,
    isDefault: true,
    sortOrder: 0,
    canRename: false,
    canDelete: false,
  },
  {
    id: 'unorganized',
    name: '未整理收藏',
    description: '后端可区分时展示未整理内容',
    count: unorganizedFavoriteCount.value,
    kind: 'unorganized',
    isPublic: false,
    isDefault: false,
    sortOrder: 10,
    canRename: false,
    canDelete: false,
  },
])
const customFavoriteFolders = computed(() => favoriteFolders.items.filter((item) => item.kind === 'custom'))
const favoriteFolderOptions = computed<FavoriteFolderView[]>(() => {
  const serverFolders = favoriteFolders.items.filter((item) => !reservedFavoriteFolderIds.has(item.id))
  const defaultFolder = favoriteFolders.items.find((item) => item.kind === 'default' || item.id === 'default') ?? fallbackFavoriteFolders.value[0]
  const unorganizedFolder = favoriteFolders.items.find((item) => item.kind === 'unorganized' || item.id === 'unorganized') ?? fallbackFavoriteFolders.value[1]
  return [
    {
      id: 'all',
      name: '全部收藏',
      description: '查看所有已收藏内容',
      count: favorites.items.length,
      kind: 'all',
      isPublic: false,
      isDefault: false,
      sortOrder: -10,
      canRename: false,
      canDelete: false,
    },
    { ...defaultFolder, id: 'default', count: defaultFolder.count || favorites.items.length },
    { ...unorganizedFolder, id: 'unorganized', count: unorganizedFolder.count || unorganizedFavoriteCount.value },
    ...serverFolders,
  ]
})
const activeFavoriteFolder = computed(() => (
  favoriteFolderOptions.value.find((item) => item.id === selectedFavoriteFolderId.value) ?? favoriteFolderOptions.value[0]
))
const activeFavoriteFolderTitle = computed(() => activeFavoriteFolder.value?.name || '全部收藏')
const activeFavoriteFolderDescription = computed(() => {
  const folder = activeFavoriteFolder.value
  if (!folder || folder.id === 'all') return '查看你保存过的经验、问题、攻略和资源，也可以按收藏夹继续整理。'
  if (folder.kind === 'unorganized') return '后端可区分未整理收藏时，这里只展示尚未放入自定义收藏夹的内容。'
  return folder.description || (folder.isPublic ? '公开收藏夹只对外展示其中公开可见的内容。' : '私密收藏夹只在你的个人空间可见。')
})
const activeFavoriteFolderMeta = computed(() => {
  const folder = activeFavoriteFolder.value
  if (!folder) return ''
  const visibility = folder.id === 'all' ? '汇总视图' : folder.isPublic ? '公开' : '私密'
  return `${visibility} · ${folder.count} 条内容`
})
const favoriteEmptyTitle = computed(() => {
  const folder = activeFavoriteFolder.value
  if (folder?.kind === 'custom') return '这个收藏夹还是空的'
  if (folder?.kind === 'unorganized') return '没有未整理收藏'
  return '还没有收藏内容'
})
const favoriteEmptyDescription = computed(() => {
  const folder = activeFavoriteFolder.value
  if (folder?.kind === 'custom') return '把相关内容移动到这个收藏夹后，就能在这里集中回看。'
  if (folder?.kind === 'unorganized') return '未整理内容会在这里集中展示，方便继续归档。'
  return '看到有用内容时点收藏，之后可以在这里集中回看，也可以整理到收藏夹。'
})
const activeFavoritePostState = computed(() => (
  selectedFavoriteFolderId.value === 'all'
  || selectedFavoriteFolderId.value === 'default'
  || selectedFavoriteFolderId.value === 'unorganized'
    ? favorites
    : favoriteFolderPosts
))
const favoriteMoveTargetFolders = computed(() => favoriteFolderOptions.value.filter((folder) => (
  folder.id !== 'all'
  && folder.id !== 'unorganized'
  && folder.id !== selectedFavoriteFolderId.value
)))
const sortableFavoriteFolders = computed(() => favoriteFolderOptions.value.filter((folder) => (
  folder.kind === 'custom'
)))
const activeFavoriteFolderSortIndex = computed(() => sortableFavoriteFolders.value.findIndex((folder) => (
  folder.id === activeFavoriteFolder.value?.id
)))
const canSortActiveFavoriteFolder = computed(() => (
  Boolean(activeFavoriteFolder.value)
  && activeFavoriteFolder.value?.kind === 'custom'
  && Boolean(favoriteFolderApi.reorderFavoriteFolders)
))
const canMoveActiveFavoriteFolderUp = computed(() => activeFavoriteFolderSortIndex.value > 0)
const canMoveActiveFavoriteFolderDown = computed(() => (
  activeFavoriteFolderSortIndex.value >= 0
  && activeFavoriteFolderSortIndex.value < sortableFavoriteFolders.value.length - 1
))
const canBatchMoveFavorites = computed(() => activeTab.value === 'favorites' && favoriteMoveTargetFolders.value.length > 0)
const allVisibleFavoritesSelected = computed(() => {
  const visibleIds = activeFavoritePostState.value.items.map((post) => String(post.postId))
  return visibleIds.length > 0 && visibleIds.every((id) => selectedFavoritePostIds.value.map(String).includes(id))
})
const favoriteBatchMoveDisabled = computed(() => (
  favoriteFolderActionLoading.value
  || selectedFavoritePostIds.value.length === 0
  || !favoriteBatchTargetFolderId.value
  || !favoriteFolderApi.batchMoveFavoritesToFolder
))
const authorPublicPosts = computed(() => publicAuthorPosts(filterVisiblePosts(posts.items)))
const postFeedbackScore = (post: Post) => (
  Number(post.counter?.comment || 0) * 3
  + Number(post.counter?.favorite || 0) * 2
  + Number(post.counter?.like || 0)
  + Number(post.counter?.view || 0) * 0.02
)
const timestampOfPost = (post: Post) => Number(post.updatedAt || post.createdAt || 0)
const postsWithinDays = (days: number) => {
  const since = Date.now() - days * 24 * 60 * 60 * 1000
  return authorPublicPosts.value.filter((post) => timestampOfPost(post) >= since)
}
const cleanRouteQuery = (value: Record<string, unknown>): Record<string, string> => (
  Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined && item !== null && String(item).trim() !== '')
      .map(([key, item]) => [key, String(item)]),
  )
)
const postDetailTo = (postId: ApiId, hash = ''): WorkbenchRouteTo => ({
  path: `/post/${postId}`,
  ...(hash ? { hash } : {}),
})
const summarizeWindow = (days: number) => {
  const windowPosts = postsWithinDays(days)
  return {
    label: `近 ${days} 天`,
    description: windowPosts.length ? '按近期发布或更新的公开内容估算' : '暂无近期公开内容',
    posts: windowPosts.length,
    comments: windowPosts.reduce((sum, post) => sum + Number(post.counter?.comment || 0), 0),
    favorites: windowPosts.reduce((sum, post) => sum + Number(post.counter?.favorite || 0), 0),
    likes: windowPosts.reduce((sum, post) => sum + Number(post.counter?.like || 0), 0),
  }
}
const isWorkspaceDemo = computed(() => (
  creatorWorkspace.value?.source === 'demo'
  || creatorWorkspace.value?.fallbackReason === 'local_demo_seed'
  || creatorWorkspace.value?.degradationReasons?.includes('local_demo_seed')
  || false
))
const workspaceFeedbackSummary = computed(() => creatorWorkspace.value?.feedbackSummary ?? null)
const workspaceSummary = computed(() => creatorWorkspace.value?.summary ?? null)
const bestFeedbackWindow = computed(() => (
  workspaceFeedbackSummary.value?.windows.find((item) => Number(item.days) === 30)
  ?? workspaceFeedbackSummary.value?.windows[0]
  ?? null
))
const mapFeedbackWindow = (window: CreatorFeedbackWindow) => ({
  label: window.label || `近 ${window.days} 天`,
  description: window.feedbackCopy || '聚合公开内容评论、收藏和可回应线索',
  posts: window.postCount ?? workspaceSummary.value?.publicPostCount ?? contribution.value.postCount,
  comments: window.commentCount,
  favorites: window.favoriteCount,
  likes: window.likeCount,
})
const feedbackWindows = computed(() => {
  const windows = workspaceFeedbackSummary.value?.windows || []
  return windows.length ? windows.slice(0, 2).map(mapFeedbackWindow) : [summarizeWindow(7), summarizeWindow(30)]
})
const publicImpactStats = computed(() => ({
  publicPosts: workspaceSummary.value?.publicPostCount ?? contribution.value.postCount,
  recentFavorites: workspaceSummary.value?.favoriteCount ?? bestFeedbackWindow.value?.favoriteCount ?? contribution.value.favoriteCount,
  recentComments: workspaceSummary.value?.commentCount ?? bestFeedbackWindow.value?.commentCount ?? contribution.value.commentCount,
  curationCount: workspaceSummary.value?.curationCount ?? curationFeedbackSummary.value?.total ?? contribution.value.featuredCount,
  representativeCount: workspaceSummary.value?.representativeCount ?? representativePosts.value.length,
  replyOpportunityCount: workspaceSummary.value?.replyOpportunityCount ?? replyOpportunities.value.length,
}))
const publicImpactOverview = computed(() => [
  { label: '公开内容', value: publicImpactStats.value.publicPosts },
  { label: '近期收藏', value: publicImpactStats.value.recentFavorites },
  { label: '近期评论', value: publicImpactStats.value.recentComments },
  { label: '收录/精选', value: publicImpactStats.value.curationCount },
  { label: '代表作', value: publicImpactStats.value.representativeCount },
  { label: '回复机会', value: publicImpactStats.value.replyOpportunityCount },
])
const creatorWorkspaceStateLabel = computed(() => {
  if (creatorWorkspaceLoading.value) return '加载中'
  if (isWorkspaceDemo.value) return '示例反馈'
  if (creatorWorkspace.value?.source === 'empty') return '暂无公开反馈'
  if (creatorWorkspace.value?.source === 'fallback' || creatorWorkspace.value?.degraded || curationFeedbackSummary.value?.degraded || creatorWorkspaceError.value) return '降级视图'
  if (creatorWorkspace.value) return '真实反馈'
  return contribution.value.source === 'local_demo_seed' ? '示例反馈' : '本地估算'
})
const creatorWorkspaceNotice = computed(() => {
  if (isWorkspaceDemo.value) return '当前展示本地样例，只用于说明公开成长工作台结构，不代表你的真实反馈，不承诺曝光效果。'
  if (creatorWorkspace.value?.source === 'empty') return '发布公开内容后，这里会展示公共影响概览、维护入口和收录反馈。'
  if (creatorWorkspace.value?.degraded || curationFeedbackSummary.value?.degraded) {
    const reason = creatorWorkspace.value?.degradationReasons?.join(' / ') || curationFeedbackSummary.value?.fallbackReason
    return `部分公开反馈暂不可用，当前展示可用区块${reason ? `：${reason}` : '。'}`
  }
  if (creatorWorkspace.value) return workspaceSummary.value?.copy || '数据来自创作者公开反馈聚合；不包含私密、匿名身份、删除或审核中的内容，不承诺曝光效果。'
  return '接口暂不可用时会使用本地公开内容估算，并明确标识为估算或示例。'
})
const localTopFeedbackPosts = computed(() => [...authorPublicPosts.value]
  .sort((a, b) => postFeedbackScore(b) - postFeedbackScore(a) || timestampOfPost(b) - timestampOfPost(a))
  .slice(0, 3))
const mapTopPost = (post: CreatorTopPost): WorkbenchLinkItem => ({
  id: String(post.postId),
  title: post.title,
  meta: post.reason || `${post.commentCount} 条评论，${post.favoriteCount} 次收藏，适合继续维护`,
  to: postDetailTo(post.postId),
  score: post.feedbackScore || post.commentCount + post.favoriteCount + post.likeCount,
})
const mapLocalTopPost = (post: Post): WorkbenchLinkItem => ({
  id: String(post.postId),
  title: post.title,
  meta: feedbackReason(post),
  to: postDetailTo(post.postId),
  score: Number(post.counter?.comment || 0) + Number(post.counter?.favorite || 0) + Number(post.counter?.like || 0),
})
const topFeedbackPosts = computed(() => {
  const workspacePosts = creatorWorkspace.value?.maintainablePosts?.length
    ? creatorWorkspace.value.maintainablePosts
    : creatorWorkspace.value?.topPosts || []
  return workspacePosts.length ? workspacePosts.slice(0, 3).map(mapTopPost) : localTopFeedbackPosts.value.map(mapLocalTopPost)
})
const topFeedbackPost = computed(() => topFeedbackPosts.value[0])
const topFeedbackScore = computed(() => topFeedbackPost.value?.score ?? 0)
const localReplyOpportunityPosts = computed(() => authorPublicPosts.value
  .filter((post) => Number(post.counter?.comment || 0) > 0)
  .sort((a, b) => Number(b.counter?.comment || 0) - Number(a.counter?.comment || 0) || timestampOfPost(b) - timestampOfPost(a))
  .slice(0, 3))
const feedbackReason = (post: Post) => {
  const comments = Number(post.counter?.comment || 0)
  const favorites = Number(post.counter?.favorite || 0)
  if (comments > 0) return `${comments} 条评论，适合继续回应`
  if (favorites > 0) return `${favorites} 次收藏，适合扩写成清单或合集`
  return `${Number(post.counter?.like || 0)} 次点赞，可作为代表内容候选`
}
const mapReplyOpportunity = (item: CreatorReplyOpportunity): WorkbenchLinkItem => ({
  id: String(item.id),
  title: item.postTitle,
  meta: item.excerpt ? `${item.excerpt} · ${item.reason || item.suggestedReplyTone}` : item.reason || item.suggestedReplyTone,
  to: item.commentId ? postDetailTo(item.postId, `#comment-${item.commentId}`) : postDetailTo(item.postId, '#comments'),
  score: item.priority === 'high' ? 3 : item.priority === 'low' ? 1 : 2,
})
const mapLocalReplyOpportunity = (post: Post): WorkbenchLinkItem => ({
  id: String(post.postId),
  title: post.title,
  meta: `${post.counter.comment} 条评论，适合回到公共讨论补充说明`,
  to: postDetailTo(post.postId, '#comments'),
  score: Number(post.counter.comment || 0),
})
const replyOpportunities = computed(() => {
  const workspaceItems = creatorWorkspace.value?.replyOpportunities || []
  return workspaceItems.length
    ? workspaceItems.slice(0, 3).map(mapReplyOpportunity)
    : localReplyOpportunityPosts.value.map(mapLocalReplyOpportunity)
})
const formatWorkbenchTime = (value?: number) => {
  if (!value) return '收录时间暂未返回'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '收录时间暂未返回'
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
const curationFeedbackStatusLabel = (item: CreatorCurationFeedback) => {
  if (item.status === 'archived') return '专题已归档'
  if (item.status === 'offline') return '专题已下线'
  if (item.status === 'degraded') return '降级可见'
  return '已收录'
}
const curationFeedbackLocation = (item: CreatorCurationFeedback) => {
  const topic = item.topicTitle || item.placementLabel || (item.topicSlug ? `专题 ${item.topicSlug}` : '公开专题')
  const section = item.sectionTitle || item.sectionKey
  return section ? `${topic} / ${section}` : topic
}
const mapCurationFeedback = (item: CreatorCurationFeedback): WorkbenchLinkItem => ({
  id: String(item.eventId),
  title: item.contentTitle,
  meta: `${curationFeedbackLocation(item)} · ${curationFeedbackStatusLabel(item)} · ${formatWorkbenchTime(item.includedAt || item.triggeredAt)}`,
  badge: `公开理由：${item.reasonText}`,
  to: item.href || postDetailTo(item.contentId),
})
const curationFeedbackItems = computed(() => (
  (creatorWorkspace.value?.curationFeedback?.length
    ? creatorWorkspace.value.curationFeedback
    : curationFeedbackSummary.value?.recentItems || []
  ).slice(0, 3).map(mapCurationFeedback)
))
const mapRepresentativePost = (post: CreatorRepresentativePost): WorkbenchLinkItem => ({
  id: String(post.postId),
  title: post.title,
  meta: post.boundaryCopy || post.reason || post.summary || '公开代表作候选，仅用于作者主页展示。',
  to: postDetailTo(post.postId),
  score: post.heat,
})
const mapLocalRepresentativePost = (post: Post): WorkbenchLinkItem => ({
  id: String(post.postId),
  title: post.title,
  meta: post.summary || post.content.slice(0, 84),
  to: postDetailTo(post.postId),
  score: postFeedbackScore(post),
})
const representativePosts = computed(() => {
  const workspacePosts = (creatorWorkspace.value?.representativePosts || []).filter((item) => item.publicVisible !== false)
  return workspacePosts.length
    ? workspacePosts.slice(0, 3).map(mapRepresentativePost)
    : pickRepresentativePosts(authorPublicPosts.value, 3).map(mapLocalRepresentativePost)
})
const firstTopicName = (post?: Post | null) => post?.tags?.[0]?.name || ''
const mapTopicIdea = (idea: CreatorTopicIdea): WorkbenchTopicIdeaItem => ({
  id: String(idea.id),
  title: idea.title,
  reason: idea.reason || idea.prompt || '来自公开内容反馈或聚合选题缺口。',
  query: cleanRouteQuery({
    source: 'creator_workbench',
    action: 'continue',
    contextType: 'idea',
    ideaId: idea.id,
    contextSource: idea.editorQuery?.contextSource || idea.sourceType,
    title: idea.editorQuery?.title || idea.title,
    postType: idea.editorQuery?.postType || idea.suggestedFormat,
    topic: idea.editorQuery?.topic || idea.targetDomainName,
    seriesId: idea.editorQuery?.seriesId,
    templateCode: idea.editorQuery?.templateCode,
    reasonText: idea.reason || idea.prompt,
    returnHref: '/me#creator-workbench',
  }),
})
const topicIdeas = computed<WorkbenchTopicIdeaItem[]>(() => {
  const workspaceIdeas = creatorWorkspace.value?.topicIdeas || []
  if (workspaceIdeas.length) return workspaceIdeas.slice(0, 3).map(mapTopicIdea)
  const primaryPost = localTopFeedbackPosts.value[0]
  const primaryType = primaryPost ? getContentTypeShortLabel(primaryPost.postType) : '经验'
  const primaryTopic = firstTopicName(primaryPost) || typeDistribution.value[0]?.name || '社区经验'
  const firstCollection = myCollections.value.find((item) => item.visibility === 'public')
  return [
    {
      id: 'local-follow-up',
      title: primaryPost ? `围绕「${primaryPost.title}」补一篇后续` : '写一篇近期观察或经验',
      reason: primaryPost ? feedbackReason(primaryPost) : '示例灵感：发布后会优先使用真实公开内容反馈',
      query: cleanRouteQuery({
        source: 'creator_workbench',
        contextSource: 'own_post_feedback',
        action: 'continue',
        contextType: primaryPost ? 'post' : 'idea',
        postId: primaryPost?.postId,
        title: primaryPost ? `${primaryPost.title}：后续补充` : '我的近期观察',
        postType: primaryPost ? String(primaryPost.postType) : undefined,
        topic: primaryTopic,
        reasonText: primaryPost ? feedbackReason(primaryPost) : '示例灵感：发布后会优先使用真实公开内容反馈',
        returnHref: '/me#creator-workbench',
      }),
    },
    {
      id: 'local-series-gap',
      title: `整理一个${primaryType}方向的小合集`,
      reason: firstCollection ? `可继续补充公开合集「${firstCollection.title}」` : '合集能把长期内容组织到作者主页',
      query: cleanRouteQuery({
        source: 'creator_workbench',
        contextSource: 'series_gap',
        action: 'series',
        contextType: 'series',
        title: `${primaryType}清单：${primaryTopic}`,
        postType: primaryPost ? String(primaryPost.postType) : undefined,
        topic: primaryTopic,
        seriesId: firstCollection ? String(firstCollection.id) : undefined,
        reasonText: firstCollection ? `可继续补充公开合集「${firstCollection.title}」` : '合集能把长期内容组织到作者主页',
        returnHref: '/me#creator-workbench',
      }),
    },
    {
      id: 'local-topic-question',
      title: `把「${primaryTopic}」写成可讨论的问题`,
      reason: '从公开话题或内容类型出发，不承诺推荐或曝光效果',
      query: cleanRouteQuery({
        source: 'creator_workbench',
        contextSource: 'content_type_template',
        action: 'topic',
        contextType: 'topic',
        title: `关于${primaryTopic}，你们会怎么处理？`,
        topic: primaryTopic,
        reasonText: '从公开话题或内容类型出发，不承诺推荐或曝光效果',
        returnHref: '/me#creator-workbench',
      }),
    },
  ]
})
const mapSearchGap = (gap: CreatorSearchGap): WorkbenchSearchGapItem => ({
  id: String(gap.id),
  title: gap.title || gap.keyword,
  reason: gap.reasonText || '聚合需求仅作为选题参考，不承诺收录、精选、曝光或排序。',
  to: gap.editorHref,
  badge: gap.demandLabel || '聚合需求',
})
const searchGaps = computed<WorkbenchSearchGapItem[]>(() => (
  (creatorWorkspace.value?.searchGaps || []).slice(0, 3).map(mapSearchGap)
))

const contactRequestActionDescription = () => {
  const stats = contactRequestStats.value
  if (!stats) return '查看收到的联系请求和发出的请求状态，并维护接收设置。'
  if (stats.inboxPending > 0) {
    return `有 ${stats.inboxPending} 条收到的联系请求待处理，已接受 ${stats.inboxAccepted} 条。`
  }
  if (stats.outboxPending > 0) {
    return `暂无待处理收件请求；你发出的请求中有 ${stats.outboxPending} 条等待回应。`
  }
  if (stats.inboxAccepted > 0 || stats.outboxAccepted > 0) {
    return `已建立 ${stats.inboxAccepted + stats.outboxAccepted} 条联系记录，可继续维护接收设置。`
  }
  return '暂无待处理联系请求，可维护接收设置并查看历史状态。'
}

const buildCreatorActions = () => [
  {
    href: '/me?tab=posts',
    title: '代表作管理入口',
    description: representativePosts.value.length
      ? '当前先展示系统挑选的公开内容候选；手动保存需等待代表作 adapter。'
      : '发布公开内容后，可从这里挑选作者主页展示候选。',
  },
  {
    href: '/series/workbench',
    title: '整理公开合集',
    description: publicCollectionCount.value > 0
      ? `已有 ${publicCollectionCount.value} 个公开合集，可继续补目录和封面。`
      : '把长期内容整理成公开合集，供作者主页展示。',
  },
  {
    href: '/me/contact-requests',
    title: '联系请求',
    description: contactRequestActionDescription(),
  },
  {
    href: '/me/settings',
    title: '完善创作方向',
    description: '用简介和公开内容类型说明你常写的频道与主题。',
  },
]
const creatorActions = computed(buildCreatorActions)

const loadContribution = async () => {
  try {
    const res = await userApi.getMyContribution()
    backendContribution.value = res.data
  } catch {
    backendContribution.value = null
  }
}

const loadContactRequestStats = async () => {
  try {
    const res = await interactionApi.getContactRequestStats()
    contactRequestStats.value = res.data || null
  } catch {
    contactRequestStats.value = null
  }
}

const loadCreatorWorkspace = async () => {
  creatorWorkspaceLoading.value = true
  creatorWorkspaceError.value = ''
  try {
    const [workspaceResult, curationResult] = await Promise.allSettled([
      creatorFeedbackApi.getWorkspace(),
      creatorFeedbackApi.getCurationFeedbackSummary(),
    ])
    if (workspaceResult.status === 'fulfilled') {
      creatorWorkspace.value = workspaceResult.value.data
    } else {
      creatorWorkspace.value = null
      creatorWorkspaceError.value = getErrorMessage(workspaceResult.reason, '暂时无法加载完整创作者工作台，已保留本地公开内容估算。')
    }
    curationFeedbackSummary.value = curationResult.status === 'fulfilled' ? curationResult.value.data : null
  } finally {
    creatorWorkspaceLoading.value = false
  }
}

const loadMyCollections = async () => {
  try {
    const res = await contentSeriesApi.listMine(user.value?.uid)
    ownerCollections.value = res.data || []
    myCollections.value = filterVisibleCollections(res.data || [])
  } catch {
    ownerCollections.value = []
    myCollections.value = []
  }
}

const applyPage = <T,>(state: ListState<T>, page: PaginatedResponse<T> | null | undefined, append: boolean) => {
  const items = page?.items || []
  state.items = append ? [...state.items, ...items] : items
  state.cursor = page?.nextCursor
  state.hasMore = Boolean(page?.hasMore && page?.nextCursor)
}

const loadPage = async <T,>(
  state: ListState<T>,
  append: boolean,
  loader: (cursor?: string) => Promise<PaginatedResponse<T> | null | undefined>,
  fallbackMessage: string,
) => {
  if (state.loading || (append && !state.hasMore)) return
  state.loading = true
  state.error = ''
  try {
    const page = await loader(append ? state.cursor : undefined)
    applyPage(state, page, append)
  } catch (error: any) {
    state.error = getErrorMessage(error, fallbackMessage)
    if (!append) {
      state.items = []
      state.cursor = undefined
      state.hasMore = false
    }
  } finally {
    state.loading = false
  }
}

const loadPosts = (append = false) => {
  if (!user.value?.uid) return Promise.resolve()
  return loadPage(
    posts,
    append,
    async (cursor) => {
      const page = (await postApi.list({ authorId: user.value!.uid, cursor, size: 10 })).data
      return page ? { ...page, items: filterVisiblePosts(filterPublicContent(page.items)) } : page
    },
    '发帖列表加载失败',
  )
}

const loadFavorites = (append = false) => loadPage(
  favorites,
  append,
  async (cursor) => {
    const page = (await postApi.getMyFavorites(cursor, 10)).data
    return page ? { ...page, items: filterVisiblePosts(filterPublicContent(page.items)) } : page
  },
  '收藏列表加载失败',
)

const loadFavoriteFolders = async () => {
  favoriteFolders.loading = true
  favoriteFolders.error = ''
  try {
    if (!favoriteFolderApi.listFavoriteFolders) {
      favoriteFolders.items = []
      return
    }
    const res = await favoriteFolderApi.listFavoriteFolders()
    favoriteFolders.items = Array.isArray(res.data) ? res.data.map(normalizeFavoriteFolder) : []
  } catch (error: any) {
    favoriteFolders.items = []
    favoriteFolders.error = getErrorMessage(error, '收藏夹加载失败，当前显示全部收藏。')
  } finally {
    favoriteFolders.loading = false
  }
}

const loadFavoriteFolderPosts = (folderId: ApiId, append = false) => loadPage(
  favoriteFolderPosts,
  append,
  async (cursor) => {
    if (!favoriteFolderApi.listFavoriteFolderPosts) return { items: [], hasMore: false }
    const page = (await favoriteFolderApi.listFavoriteFolderPosts(folderId, cursor, 10)).data
    return page ? { ...page, items: filterVisiblePosts(filterPublicContent(page.items)) } : page
  },
  '收藏夹内容加载失败',
)

const loadActiveFavoritePosts = (append = false) => {
  const folder = activeFavoriteFolder.value
  if (!folder || folder.id === 'all' || folder.id === 'default' || folder.id === 'unorganized') return loadFavorites(append)
  return loadFavoriteFolderPosts(folder.id, append)
}

const selectFavoriteFolder = async (folderId: string) => {
  selectedFavoriteFolderId.value = folderId
  clearSelectedFavoritePosts()
  favoriteBatchTargetFolderId.value = ''
  favoriteFolderPosts.items = []
  favoriteFolderPosts.cursor = undefined
  favoriteFolderPosts.hasMore = false
  favoriteFolderPosts.error = ''
  if (!['all', 'default', 'unorganized'].includes(folderId)) {
    await loadFavoriteFolderPosts(folderId)
  }
}

const refreshFavoriteFolders = async () => {
  await Promise.all([loadFavoriteFolders(), loadFavorites()])
}

const clearSelectedFavoritePosts = () => {
  selectedFavoritePostIds.value = []
}

const toggleFavoritePostSelection = (postId: ApiId, selected: boolean) => {
  const id = String(postId)
  const next = new Set(selectedFavoritePostIds.value.map(String))
  if (selected) {
    next.add(id)
  } else {
    next.delete(id)
  }
  selectedFavoritePostIds.value = Array.from(next)
}

const toggleSelectVisibleFavorites = () => {
  const visibleIds = activeFavoritePostState.value.items.map((post) => String(post.postId))
  if (allVisibleFavoritesSelected.value) {
    const visible = new Set(visibleIds)
    selectedFavoritePostIds.value = selectedFavoritePostIds.value.filter((id) => !visible.has(String(id)))
    return
  }
  selectedFavoritePostIds.value = Array.from(new Set([...selectedFavoritePostIds.value.map(String), ...visibleIds]))
}

const handleBatchMoveFavorites = async () => {
  if (favoriteBatchMoveDisabled.value || !favoriteFolderApi.batchMoveFavoritesToFolder) return
  favoriteFolderActionLoading.value = true
  try {
    await favoriteFolderApi.batchMoveFavoritesToFolder({
      postIds: selectedFavoritePostIds.value,
      folderId: favoriteBatchTargetFolderId.value,
    })
    clearSelectedFavoritePosts()
    favoriteBatchTargetFolderId.value = ''
    await refreshFavoriteFolders()
    if (!['all', 'default', 'unorganized'].includes(selectedFavoriteFolderId.value)) {
      await loadFavoriteFolderPosts(selectedFavoriteFolderId.value)
    }
    toast.success('已批量移动收藏')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '批量移动收藏失败'))
  } finally {
    favoriteFolderActionLoading.value = false
  }
}

const handleCreateFavoriteFolder = async () => {
  const name = window.prompt('新建收藏夹名称')
  if (!name?.trim()) return
  if (!favoriteFolderApi.createFavoriteFolder) {
    toast.error('收藏夹接口暂不可用，请稍后再试')
    return
  }
  favoriteFolderActionLoading.value = true
  try {
    const res = await favoriteFolderApi.createFavoriteFolder({ name: name.trim(), visibility: 'private', isPublic: false })
    await refreshFavoriteFolders()
    const created = normalizeFavoriteFolder(res.data)
    if (created.id) await selectFavoriteFolder(created.id)
    toast.success('收藏夹已创建')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '新建收藏夹失败'))
  } finally {
    favoriteFolderActionLoading.value = false
  }
}

const handleRenameFavoriteFolder = async () => {
  const folder = activeFavoriteFolder.value
  if (!folder || !folder.canRename || !favoriteFolderApi.updateFavoriteFolder) return
  const name = window.prompt('重命名收藏夹', folder.name)
  if (!name?.trim() || name.trim() === folder.name) return
  favoriteFolderActionLoading.value = true
  try {
    await favoriteFolderApi.updateFavoriteFolder(folder.id, { name: name.trim() })
    await loadFavoriteFolders()
    toast.success('收藏夹已重命名')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '重命名收藏夹失败'))
  } finally {
    favoriteFolderActionLoading.value = false
  }
}

const handleSortFavoriteFolder = async (direction: 'up' | 'down') => {
  const index = activeFavoriteFolderSortIndex.value
  if (!favoriteFolderApi.reorderFavoriteFolders || index < 0) return
  const nextIndex = direction === 'up' ? index - 1 : index + 1
  const folders = [...sortableFavoriteFolders.value]
  if (nextIndex < 0 || nextIndex >= folders.length) return
  const moved = folders[index]
  folders[index] = folders[nextIndex]
  folders[nextIndex] = moved
  favoriteFolderActionLoading.value = true
  try {
    await favoriteFolderApi.reorderFavoriteFolders(folders.map(folder => folder.id))
    await loadFavoriteFolders()
    selectedFavoriteFolderId.value = moved.id
    toast.success('收藏夹顺序已更新')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '收藏夹排序失败'))
  } finally {
    favoriteFolderActionLoading.value = false
  }
}

const handleToggleFavoriteFolderPublic = async () => {
  const folder = activeFavoriteFolder.value
  if (!folder || folder.id === 'all' || !favoriteFolderApi.updateFavoriteFolder) return
  if (!folder.isPublic) {
    const confirmed = window.confirm('公开后，任何人都可以查看该收藏夹中的公开可见内容。私密、已删除或审核中的内容不会对外展示。')
    if (!confirmed) return
  }
  favoriteFolderActionLoading.value = true
  try {
    const nextPublic = !folder.isPublic
    await favoriteFolderApi.updateFavoriteFolder(folder.id, { visibility: nextPublic ? 'public' : 'private', isPublic: nextPublic })
    await loadFavoriteFolders()
    toast.success(nextPublic ? '收藏夹已设为公开' : '收藏夹已设为私密')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '收藏夹可见性更新失败'))
  } finally {
    favoriteFolderActionLoading.value = false
  }
}

const handleDeleteFavoriteFolder = async () => {
  const folder = activeFavoriteFolder.value
  if (!folder || !folder.canDelete || !favoriteFolderApi.deleteFavoriteFolder) return
  let targetFolderId: ApiId | null = null
  if (folder.count > 0) {
    const targetOptions = favoriteMoveTargetFolders.value
    if (!targetOptions.length) {
      toast.error('请先创建或保留一个可迁移的目标收藏夹')
      return
    }
    const optionText = targetOptions.map((item) => `${item.id}: ${item.name}`).join('\n')
    const input = window.prompt(`收藏夹「${folder.name}」还有 ${folder.count} 条内容。请输入迁移目标收藏夹 ID：\n${optionText}`, String(targetOptions[0].id))
    if (!input) return
    const target = targetOptions.find((item) => String(item.id) === input.trim())
    if (!target) {
      toast.error('迁移目标不属于当前用户或不可用')
      return
    }
    targetFolderId = target.id
  } else if (!window.confirm(`确认删除收藏夹「${folder.name}」？默认收藏夹不可删除。`)) {
    return
  }
  favoriteFolderActionLoading.value = true
  try {
    await favoriteFolderApi.deleteFavoriteFolder(folder.id, targetFolderId)
    selectedFavoriteFolderId.value = 'all'
    favoriteFolderPosts.items = []
    clearSelectedFavoritePosts()
    await refreshFavoriteFolders()
    toast.success('收藏夹已删除')
  } catch (error: any) {
    const message = getErrorMessage(error, '删除收藏夹失败')
    toast.error(message)
  } finally {
    favoriteFolderActionLoading.value = false
  }
}

const loadLikedPosts = (append = false) => loadPage(
  likedPosts,
  append,
  async (cursor) => {
    const page = (await postApi.getMyLikedPosts(cursor, 10)).data
    return page ? { ...page, items: filterVisiblePosts(filterPublicContent(page.items)) } : page
  },
  '点赞列表加载失败',
)

const loadFollowing = (append = false) => {
  if (!user.value?.uid) return Promise.resolve()
  return loadPage(
    following,
    append,
    async (cursor) => (await userApi.getFollowing(user.value!.uid, cursor, 12)).data,
    '关注列表加载失败',
  )
}

const loadFollowingTopics = (append = false) => loadPage(
  topics,
  append,
  async (cursor) => (await postApi.listFollowingTopics(cursor, 12)).data,
  '关注专题加载失败',
)

const loadDiscussionFollows = (append = false) => loadPage(
  discussionFollows,
  append,
  async (cursor) => {
    const page = (await interactionApi.listDiscussionFollows(cursor, 10)).data
    return page ? { ...page, items: filterVisiblePosts(filterPublicContent(page.items)) } : page
  },
  '关注讨论列表加载失败',
)

const loadFollowers = (append = false) => {
  if (!user.value?.uid) return Promise.resolve()
  return loadPage(
    followers,
    append,
    async (cursor) => (await userApi.getFollowers(user.value!.uid, cursor, 12)).data,
    '粉丝列表加载失败',
  )
}

const allPostStates = [posts, favorites, favoriteFolderPosts, likedPosts, discussionFollows]

const updatePostEverywhere = (postId: ApiId, updater: (post: Post) => void) => {
  allPostStates.forEach((state) => {
    state.items.forEach((post) => {
      if (String(post.postId) === String(postId)) updater(post)
    })
  })
}

const { toggleLike, toggleFavorite, isActionPending } = usePostInteraction(updatePostEverywhere)

const removeFromState = (state: ListState<Post>, postId: ApiId) => {
  state.items = state.items.filter((post) => String(post.postId) !== String(postId))
}

const handleLike = async (postId: ApiId) => {
  const post = allPostStates.flatMap((state) => state.items).find((item) => String(item.postId) === String(postId))
  if (!post) return
  const liked = Boolean(post.myInteraction?.liked)
  const succeeded = await toggleLike(post)
  if (succeeded && liked && activeTab.value === 'liked') {
    removeFromState(likedPosts, postId)
  }
}

const handleFavorite = async (postId: ApiId) => {
  const post = allPostStates.flatMap((state) => state.items).find((item) => String(item.postId) === String(postId))
  if (!post) return
  const favorited = Boolean(post.myInteraction?.favorited)
  const succeeded = await toggleFavorite(post)
  if (succeeded && favorited && activeTab.value === 'favorites') {
    removeFromState(activeFavoritePostState.value, postId)
    removeFromState(favorites, postId)
  }
}

const handlePostAuthorFollowChange = (authorUid: ApiId, following: boolean) => {
  allPostStates.forEach((state) => {
    state.items.forEach((post) => {
      if (String(post.author.uid) === String(authorUid)) {
        post.author.isFollowing = following
      }
    })
  })
}

const syncUserFollowState = (authorUid: ApiId, followingValue: boolean, followerCount?: number) => {
  const syncUser = (item: User) => {
    if (String(item.uid) === String(authorUid)) {
      item.isFollowing = followingValue
      if (followerCount !== undefined) item.followerCount = followerCount
    }
  }
  following.items.forEach(syncUser)
  followers.items.forEach(syncUser)
  handlePostAuthorFollowChange(authorUid, followingValue)
}

const adjustMyRelationCount = (key: 'followingCount' | 'followerCount', delta: number) => {
  if (!user.value) return
  user.value = {
    ...user.value,
    [key]: Math.max(0, Number(user.value[key] ?? 0) + delta),
  }
  if (authStore.user && String(authStore.user.uid) === String(user.value.uid)) {
    authStore.setUser({ ...authStore.user, [key]: user.value[key] })
  }
}

const handleFollowingUserChange = (authorUid: ApiId, followingValue: boolean, followerCount: number) => {
  syncUserFollowState(authorUid, followingValue, followerCount)
  if (!followingValue) {
    following.items = following.items.filter((item) => String(item.uid) !== String(authorUid))
    adjustMyRelationCount('followingCount', -1)
  }
}

const handleFollowerUserChange = (authorUid: ApiId, followingValue: boolean, followerCount: number) => {
  syncUserFollowState(authorUid, followingValue, followerCount)
  if (followingValue && !following.items.some((item) => String(item.uid) === String(authorUid))) {
    const follower = followers.items.find((item) => String(item.uid) === String(authorUid))
    if (follower) following.items = [{ ...follower, isFollowing: true, followerCount }, ...following.items]
    adjustMyRelationCount('followingCount', 1)
  }
}

const EmptyPanel = defineComponent({
  props: {
    title: { type: String, required: true },
    description: { type: String, required: true },
    actionText: String,
    actionHref: String,
  },
  setup(props) {
    return () => h('div', { class: 'empty-panel' }, [
      h('h3', props.title),
      h('p', props.description),
      props.actionText && props.actionHref
        ? h(RouterLink, { to: props.actionHref, class: 'primary-button mt-4' }, () => props.actionText)
        : null,
    ])
  },
})

const PostList = defineComponent({
  props: {
    state: { type: Object as () => ListState<Post>, required: true },
    emptyTitle: { type: String, required: true },
    emptyDescription: { type: String, required: true },
    emptyActionText: String,
    emptyActionHref: String,
    selectable: Boolean,
    selectedPostIds: { type: Array as () => ApiId[], default: () => [] },
  },
  emits: ['load-more', 'like', 'favorite', 'follow-change', 'toggle-select'],
  setup(props, { emit }) {
    return () => h('div', { class: 'space-y-4' }, [
      props.state.error ? h('div', { class: 'notice-error' }, props.state.error) : null,
      props.state.loading && props.state.items.length === 0
        ? h('div', { class: 'loading-panel' }, '正在加载...')
        : props.state.items.length
          ? props.state.items.map((post) => {
              const selected = props.selectedPostIds.map(String).includes(String(post.postId))
              const card = h(PostCard, {
                post,
                likePending: isActionPending('like', post.postId),
                favoritePending: isActionPending('favorite', post.postId),
                onLike: (id: ApiId) => emit('like', id),
                onFavorite: (id: ApiId) => emit('favorite', id),
                onFollowChange: (authorUid: ApiId, following: boolean) => emit('follow-change', authorUid, following),
              })
              return props.selectable
                ? h('div', { key: post.postId, class: 'favorite-selectable-post' }, [
                    h('label', { class: 'favorite-select-checkbox' }, [
                      h('input', {
                        type: 'checkbox',
                        checked: selected,
                        onChange: (event: Event) => emit('toggle-select', post.postId, (event.target as HTMLInputElement).checked),
                      }),
                      h('span', selected ? '已选择' : '选择'),
                    ]),
                    card,
                  ])
                : h('div', { key: post.postId }, [card])
            })
          : h(EmptyPanel, {
              title: props.emptyTitle,
              description: props.emptyDescription,
              actionText: props.emptyActionText,
              actionHref: props.emptyActionHref,
            }),
      props.state.hasMore
        ? h('div', { class: 'text-center' }, [
            h('button', {
              type: 'button',
              class: 'secondary-button',
              disabled: props.state.loading,
              onClick: () => emit('load-more'),
            }, props.state.loading ? '加载中...' : '加载更多'),
          ])
        : null,
    ])
  },
})

const UserList = defineComponent({
  props: {
    state: { type: Object as () => ListState<User>, required: true },
    emptyTitle: { type: String, required: true },
    emptyDescription: { type: String, required: true },
  },
  emits: ['load-more', 'follow-change'],
  setup(props, { emit }) {
    return () => h('div', { class: 'space-y-4' }, [
      props.state.error ? h('div', { class: 'notice-error' }, props.state.error) : null,
      props.state.loading && props.state.items.length === 0
        ? h('div', { class: 'loading-panel' }, '正在加载...')
        : props.state.items.length
          ? h('div', { class: 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' }, props.state.items.map((item) =>
              h(UserCard, {
                key: item.uid,
                user: item,
                onFollowChange: (uid: ApiId, following: boolean, followerCount: number) => emit('follow-change', uid, following, followerCount),
              }),
            ))
          : h(EmptyPanel, { title: props.emptyTitle, description: props.emptyDescription }),
      props.state.hasMore
        ? h('div', { class: 'text-center' }, [
            h('button', {
              type: 'button',
              class: 'secondary-button',
              disabled: props.state.loading,
              onClick: () => emit('load-more'),
            }, props.state.loading ? '加载中...' : '加载更多'),
          ])
        : null,
    ])
  },
})

const TopicList = defineComponent({
  props: {
    state: { type: Object as () => ListState<CommunityTopic>, required: true },
    emptyTitle: { type: String, required: true },
    emptyDescription: { type: String, required: true },
  },
  emits: ['load-more'],
  setup(props, { emit }) {
    return () => h('div', { class: 'space-y-4' }, [
      props.state.error ? h('div', { class: 'notice-error' }, props.state.error) : null,
      props.state.loading && props.state.items.length === 0
        ? h('div', { class: 'loading-panel' }, '正在加载...')
        : props.state.items.length
          ? h('div', { class: 'grid gap-4 md:grid-cols-2' }, props.state.items.map((topic) =>
              h(RouterLink, {
                key: topic.id,
                to: `/topics/${topic.slug}`,
                class: 'topic-card',
              }, () => [
                h('div', { class: 'flex items-start justify-between gap-3' }, [
                  h('div', { class: 'min-w-0' }, [
                    h('p', { class: 'truncate text-base font-bold text-slate-950 dark:text-slate-50' }, topic.name),
                    h('p', { class: 'mt-1 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400' }, topic.description || '持续关注这个话题下的经验和讨论。'),
                  ]),
                  topic.featured ? h('span', { class: 'topic-badge' }, '精选') : null,
                ]),
                h('div', { class: 'mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400' }, [
                  h('span', `${topic.postCount ?? 0} 篇内容`),
                  h('span', `${topic.followerCount ?? 0} 人关注`),
                ]),
              ]),
            ))
          : h(EmptyPanel, { title: props.emptyTitle, description: props.emptyDescription }),
      props.state.hasMore
        ? h('div', { class: 'text-center' }, [
            h('button', {
              type: 'button',
              class: 'secondary-button',
              disabled: props.state.loading,
              onClick: () => emit('load-more'),
            }, props.state.loading ? '加载中...' : '加载更多'),
          ])
        : null,
    ])
  },
})

onMounted(async () => {
  if (!user.value?.uid) return
  const queryTab = typeof route.query.tab === 'string' ? route.query.tab : ''
  if (tabValues.has(queryTab as TabValue)) {
    activeTab.value = queryTab as TabValue
  }
  await Promise.all([
    loadContribution(),
    loadContactRequestStats(),
    loadCreatorWorkspace(),
    loadPosts(),
    loadFavorites(),
    loadFavoriteFolders(),
    loadLikedPosts(),
    loadMyCollections(),
    loadFollowing(),
    loadFollowingTopics(),
    loadDiscussionFollows(),
    loadFollowers(),
  ])
})

watch(() => route.query.tab, (value) => {
  if (typeof value === 'string' && tabValues.has(value as TabValue)) {
    activeTab.value = value as TabValue
  }
})
</script>

<style scoped>
.profile-panel {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 1.5rem;
}

.avatar {
  display: flex;
  height: 6rem;
  width: 6rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(37 99 235);
  font-size: 2rem;
  font-weight: 800;
  color: white;
}

.profile-actions {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 0.6rem;
  justify-content: flex-end;
}

.metric-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 0.5rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.85rem;
}

.metric-card span {
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgb(100 116 139);
}

.metric-card strong {
  grid-column: 1 / -1;
  font-size: 1.5rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

.community-growth-panel {
  margin-top: 1.5rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 1.5rem;
}

.creator-feedback-panel {
  border: 1px solid rgb(191 219 254);
  border-radius: 0.75rem;
  background: rgb(239 246 255);
  padding: 1.5rem;
}

.creator-feedback-panel h2 {
  margin-top: 0.15rem;
  font-size: 1.05rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.creator-feedback-panel span {
  margin-top: 0.35rem;
  display: block;
  color: rgb(71 85 105);
  font-size: 0.875rem;
  line-height: 1.6;
}

.creator-workbench-title-row,
.creator-feedback-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}

.creator-feedback-actions {
  justify-content: flex-end;
}

.workspace-source-pill {
  margin: 0 !important;
  display: inline-flex !important;
  width: fit-content;
  border-radius: 999px;
  background: rgb(219 234 254);
  padding: 0.25rem 0.6rem;
  color: rgb(29 78 216) !important;
  font-size: 0.72rem !important;
  font-weight: 900;
  line-height: 1.2 !important;
}

.feedback-stat {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.2rem 0.5rem;
  border: 1px solid rgb(191 219 254);
  border-radius: 0.625rem;
  background: white;
  padding: 0.85rem;
}

.feedback-stat strong {
  color: rgb(15 23 42);
  font-size: 1.25rem;
  font-weight: 900;
}

.feedback-stat span,
.feedback-stat small {
  grid-column: 1 / -1;
}

.feedback-stat span {
  margin-top: 0.2rem;
  color: rgb(51 65 85);
  font-size: 0.8125rem;
  font-weight: 900;
}

.feedback-stat small {
  color: rgb(100 116 139);
  font-size: 0.75rem;
  font-weight: 700;
}

.feedback-window-grid {
  margin-top: 1.1rem;
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.feedback-window-card {
  display: grid;
  gap: 0.85rem;
  border: 1px solid rgb(191 219 254);
  border-radius: 0.75rem;
  background: white;
  padding: 1rem;
}

.feedback-window-card strong {
  display: block;
  color: rgb(15 23 42);
  font-size: 1rem;
  font-weight: 900;
}

.feedback-window-metrics {
  display: grid;
  gap: 0.45rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.creator-workbench-grid {
  margin-top: 1rem;
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.creator-workbench-card {
  display: flex;
  min-height: 12rem;
  flex-direction: column;
  gap: 0.85rem;
  border: 1px solid rgb(191 219 254);
  border-radius: 0.75rem;
  background: white;
  padding: 1rem;
}

.creator-workbench-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.creator-workbench-head strong {
  color: rgb(15 23 42);
  font-size: 0.95rem;
  font-weight: 900;
}

.creator-workbench-head a {
  flex-shrink: 0;
  color: rgb(37 99 235);
  font-size: 0.78rem;
  font-weight: 900;
}

.creator-link-list {
  display: grid;
  gap: 0.65rem;
}

.creator-link-main {
  display: grid;
  gap: 0.25rem;
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.7rem;
}

.creator-link-main span {
  margin: 0;
  display: block;
  color: rgb(15 23 42);
  font-size: 0.86rem;
  font-weight: 900;
  line-height: 1.45;
}

.creator-link-main small,
.creator-empty-copy {
  color: rgb(100 116 139);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.55;
}

.creator-empty-copy {
  margin: 0;
}

.creator-center-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1.2fr) minmax(18rem, 0.8fr);
}

.asset-grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.asset-card {
  display: grid;
  gap: 0.35rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.9rem;
  color: rgb(71 85 105);
  transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
}

.asset-card:hover {
  transform: translateY(-1px);
  border-color: rgb(147 197 253);
  background: rgb(239 246 255);
}

.asset-card strong {
  color: rgb(15 23 42);
  font-size: 0.95rem;
}

.asset-card span,
.asset-card small {
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.45;
}

.asset-card small {
  color: rgb(37 99 235);
}

.creator-action-panel,
.creator-cert-panel {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 1.25rem;
}

.creator-action-panel h2,
.creator-cert-panel h2 {
  margin-top: 0.15rem;
  font-size: 1rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.creator-action-list {
  display: grid;
  gap: 0.75rem;
}

.creator-action-card,
.representative-card {
  display: grid;
  gap: 0.35rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.85rem;
}

.creator-action-card strong,
.representative-card strong {
  color: rgb(15 23 42);
  font-size: 0.92rem;
  font-weight: 900;
}

.creator-action-card span,
.representative-card span,
.creator-cert-panel p {
  color: rgb(71 85 105);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.creator-cert-meta {
  margin-top: 0.85rem;
  display: inline-flex;
  width: fit-content;
  border-radius: 999px;
  background: rgb(238 242 255);
  padding: 0.3rem 0.65rem;
  color: rgb(67 56 202);
  font-size: 0.75rem;
  font-weight: 900;
}

.creator-cert-actions {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.representative-grid {
  display: grid;
  gap: 0.8rem;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
}

.representative-card {
  min-height: 7rem;
}

.empty-inline {
  border: 1px dashed rgb(203 213 225);
  border-radius: 0.75rem;
  padding: 1rem;
  color: rgb(100 116 139);
  font-size: 0.875rem;
  text-align: center;
}

.score-card,
.growth-stat {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.85rem;
}

.score-card {
  min-width: 8rem;
  text-align: center;
}

.score-card strong,
.growth-stat strong {
  display: block;
  font-weight: 900;
  color: rgb(37 99 235);
}

.score-card strong {
  font-size: 1.75rem;
}

.growth-stat strong {
  font-size: 1.35rem;
}

.score-card span,
.growth-stat span {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: rgb(100 116 139);
}

.type-chip {
  border-radius: 999px;
  background: rgb(238 242 255);
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(67 56 202);
}

.tab-bar {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  border-bottom: 1px solid rgb(226 232 240);
}

.tab-button {
  display: inline-flex;
  min-height: 2.75rem;
  flex-shrink: 0;
  align-items: center;
  gap: 0.45rem;
  border-bottom: 2px solid transparent;
  padding: 0 0.75rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: rgb(71 85 105);
}

.tab-active {
  border-color: rgb(37 99 235);
  color: rgb(37 99 235);
}

.primary-button,
.secondary-button {
  display: inline-flex;
  min-height: 2.375rem;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
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

.topic-card {
  display: block;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.topic-card:hover {
  border-color: rgb(191 219 254);
  box-shadow: 0 12px 28px rgb(15 23 42 / 0.08);
  transform: translateY(-1px);
}

.topic-badge {
  flex-shrink: 0;
  border-radius: 999px;
  background: rgb(254 243 199);
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(146 64 14);
}

.favorite-revisit-panel {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid rgb(191 219 254);
  border-radius: 0.75rem;
  background: rgb(239 246 255);
  padding: 1rem;
}

.favorite-revisit-panel h2 {
  margin-top: 0.15rem;
  font-size: 1rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.favorite-revisit-panel span {
  margin-top: 0.35rem;
  display: block;
  max-width: 42rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: rgb(71 85 105);
}

.favorite-revisit-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.favorite-revisit-actions a,
.favorite-revisit-actions button {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  background: white;
  padding: 0.45rem 0.8rem;
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgb(29 78 216);
}

.favorite-manager {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(14rem, 0.32fr) minmax(0, 1fr);
  align-items: start;
}

.favorite-folder-panel,
.favorite-content-panel {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 1rem;
}

.favorite-folder-panel {
  display: grid;
  gap: 0.6rem;
}

.favorite-folder-panel-head,
.favorite-folder-toolbar,
.favorite-folder-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.favorite-folder-panel-head strong,
.favorite-folder-toolbar strong {
  color: rgb(15 23 42);
  font-size: 0.95rem;
  font-weight: 900;
}

.favorite-folder-panel-head span,
.favorite-folder-toolbar span,
.favorite-folder-loading,
.favorite-folder-empty {
  color: rgb(100 116 139);
  font-size: 0.78rem;
  font-weight: 700;
}

.favorite-folder-item {
  display: flex;
  width: 100%;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.75rem;
  text-align: left;
}

.favorite-folder-item strong,
.favorite-folder-item small {
  display: block;
}

.favorite-folder-item strong {
  color: rgb(15 23 42);
  font-size: 0.86rem;
  font-weight: 900;
}

.favorite-folder-item small {
  margin-top: 0.2rem;
  color: rgb(100 116 139);
  font-size: 0.74rem;
  font-weight: 700;
  line-height: 1.45;
}

.favorite-folder-item em {
  flex-shrink: 0;
  border-radius: 999px;
  background: white;
  padding: 0.2rem 0.5rem;
  color: rgb(37 99 235);
  font-size: 0.72rem;
  font-style: normal;
  font-weight: 900;
}

.favorite-folder-active {
  border-color: rgb(147 197 253);
  background: rgb(239 246 255);
}

.favorite-content-panel {
  display: grid;
  gap: 1rem;
}

.favorite-folder-toolbar {
  flex-wrap: wrap;
}

.favorite-folder-toolbar span {
  display: block;
  margin-top: 0.25rem;
}

.favorite-folder-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.favorite-batch-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: rgb(248 250 252);
  padding: 0.75rem;
  color: rgb(71 85 105);
  font-size: 0.875rem;
}

.favorite-batch-toolbar label,
.favorite-select-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 800;
}

.favorite-batch-toolbar select {
  min-height: 2.25rem;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: white;
  padding: 0 0.75rem;
  color: rgb(15 23 42);
}

.favorite-selectable-post {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.75rem;
  align-items: start;
}

.favorite-select-checkbox {
  position: sticky;
  top: 0.75rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 0.75rem;
  color: rgb(51 65 85);
  font-size: 0.8125rem;
}

.danger-button {
  border-color: rgb(254 202 202);
  color: rgb(185 28 28);
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

.empty-panel h3 {
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

.dark .profile-panel,
.dark .topic-card,
.dark .secondary-button,
.dark .empty-panel,
.dark .loading-panel {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .metric-card {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

.dark .asset-card {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(148 163 184);
}

.dark .asset-card:hover {
  border-color: rgb(30 64 175);
  background: rgb(30 41 59);
}

.dark .asset-card strong {
  color: rgb(248 250 252);
}

.dark .community-growth-panel,
.dark .score-card,
.dark .growth-stat {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .creator-feedback-panel {
  border-color: rgb(30 64 175);
  background: rgb(15 23 42);
}

.dark .creator-feedback-panel h2,
.dark .feedback-stat strong {
  color: rgb(248 250 252);
}

.dark .creator-feedback-panel span,
.dark .feedback-stat small {
  color: rgb(203 213 225);
}

.dark .feedback-stat {
  border-color: rgb(30 64 175);
  background: rgb(2 6 23);
}

.dark .feedback-stat span {
  color: rgb(226 232 240);
}

.dark .feedback-window-card,
.dark .creator-workbench-card {
  border-color: rgb(30 64 175);
  background: rgb(2 6 23);
}

.dark .feedback-window-card strong,
.dark .creator-workbench-head strong,
.dark .creator-link-main span {
  color: rgb(248 250 252);
}

.dark .workspace-source-pill {
  background: rgb(30 41 59);
  color: rgb(191 219 254) !important;
}

.dark .creator-link-main {
  background: rgb(15 23 42);
}

.dark .creator-workbench-head a {
  color: rgb(147 197 253);
}

.dark .creator-link-main small,
.dark .creator-empty-copy {
  color: rgb(148 163 184);
}

.dark .creator-action-panel,
.dark .creator-cert-panel,
.dark .creator-action-card,
.dark .representative-card,
.dark .empty-inline {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .creator-action-card,
.dark .representative-card {
  background: rgb(2 6 23);
}

.dark .creator-action-panel h2,
.dark .creator-cert-panel h2,
.dark .creator-action-card strong,
.dark .representative-card strong {
  color: rgb(248 250 252);
}

.dark .creator-action-card span,
.dark .representative-card span,
.dark .creator-cert-panel p,
.dark .empty-inline {
  color: rgb(148 163 184);
}

.dark .creator-cert-meta {
  background: rgb(49 46 129 / 0.5);
  color: rgb(199 210 254);
}

html.dark .community-growth-panel,
html.dark .score-card,
html.dark .growth-stat {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .type-chip {
  background: rgb(49 46 129 / 0.5);
  color: rgb(199 210 254);
}

.dark .metric-card strong,
.dark .empty-panel h3 {
  color: rgb(248 250 252);
}

.dark .tab-bar {
  border-color: rgb(30 41 59);
}

.dark .favorite-revisit-panel {
  border-color: rgb(30 64 175);
  background: rgb(15 23 42);
}

.dark .favorite-revisit-panel h2 {
  color: rgb(248 250 252);
}

.dark .favorite-revisit-panel span {
  color: rgb(203 213 225);
}

.dark .favorite-revisit-actions a,
.dark .favorite-revisit-actions button {
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

.dark .favorite-folder-panel,
.dark .favorite-content-panel {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .favorite-batch-toolbar,
.dark .favorite-select-checkbox {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .favorite-batch-toolbar select {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23);
  color: rgb(226 232 240);
}

.dark .favorite-folder-panel-head strong,
.dark .favorite-folder-toolbar strong,
.dark .favorite-folder-item strong {
  color: rgb(248 250 252);
}

.dark .favorite-folder-panel-head span,
.dark .favorite-folder-toolbar span,
.dark .favorite-folder-loading,
.dark .favorite-folder-empty,
.dark .favorite-folder-item small {
  color: rgb(148 163 184);
}

.dark .favorite-folder-item {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

.dark .favorite-folder-active {
  border-color: rgb(30 64 175);
  background: rgb(30 41 59);
}

.dark .favorite-folder-item em {
  background: rgb(15 23 42);
  color: rgb(147 197 253);
}

@media (max-width: 640px) {
  .feedback-window-grid,
  .creator-workbench-grid {
    grid-template-columns: 1fr;
  }

  .feedback-window-metrics {
    grid-template-columns: 1fr;
  }

  .creator-center-grid {
    grid-template-columns: 1fr;
  }

  .asset-grid {
    grid-template-columns: 1fr;
  }

  .creator-cert-actions,
  .creator-cert-actions a,
  .creator-action-panel .secondary-button {
    width: 100%;
  }

  .favorite-revisit-panel {
    flex-direction: column;
  }

  .favorite-revisit-actions,
  .favorite-revisit-actions a,
  .favorite-revisit-actions button {
    width: 100%;
  }

  .favorite-manager {
    grid-template-columns: 1fr;
  }

  .favorite-selectable-post {
    grid-template-columns: 1fr;
  }

  .favorite-select-checkbox {
    position: static;
    width: 100%;
  }

  .favorite-folder-actions,
  .favorite-folder-actions button {
    width: 100%;
  }

  .creator-feedback-actions,
  .creator-feedback-actions a {
    width: 100%;
  }

  .profile-actions,
  .profile-actions a {
    width: 100%;
  }
}
</style>
