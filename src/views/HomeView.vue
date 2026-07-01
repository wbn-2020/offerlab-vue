<template>
  <div class="app-shell">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <section class="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch">
        <div class="surface-card overflow-hidden p-6 sm:p-7">
          <div class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div class="max-w-2xl">
              <div class="mb-3 flex flex-wrap gap-2">
                <span class="muted-pill">综合频道</span>
                <span class="muted-pill">推荐内容</span>
                <span class="muted-pill">热门话题</span>
              </div>
              <h1 class="text-2xl font-black tracking-normal text-slate-950 dark:text-white sm:text-3xl">
                发现真实经验，分享有用内容
              </h1>
              <p class="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                在这里浏览不同频道的经验、攻略、资源和讨论，也可以把自己的经历、问题、清单或观点发布出来。
              </p>
            </div>
            <div class="flex flex-wrap gap-3">
              <RouterLink to="/editor" class="primary-action">
                <PenLine class="h-4 w-4" />
                发布内容
              </RouterLink>
              <RouterLink to="/explore" class="secondary-action">
                <Compass class="h-4 w-4" />
                逛发现
              </RouterLink>
            </div>
          </div>

          <div class="home-metric-grid mt-6 grid gap-3 sm:grid-cols-3">
            <div class="metric-tile border-slate-200/80 bg-slate-50/90 dark:border-slate-700/80 dark:bg-slate-950/60">
              <span class="metric-label">推荐内容</span>
              <strong class="metric-value">{{ readableMetricValue }}</strong>
            </div>
            <div class="metric-tile border-slate-200/80 bg-slate-50/90 dark:border-slate-700/80 dark:bg-slate-950/60">
              <span class="metric-label">热门话题</span>
              <strong class="metric-value">{{ tagMetricValue }}</strong>
            </div>
            <div class="metric-tile border-slate-200/80 bg-slate-50/90 dark:border-slate-700/80 dark:bg-slate-950/60">
              <span class="metric-label">活跃作者</span>
              <strong class="metric-value">{{ peerMetricValue }}</strong>
            </div>
          </div>
        </div>

        <section class="surface-card p-5">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-sm font-black text-slate-950 dark:text-white">快速搜索</h2>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">按兴趣、频道和内容形式快速定位</p>
            </div>
            <Search class="h-5 w-5 text-primary-500" />
          </div>
          <form class="mt-4 space-y-3" @submit.prevent="submitHeroSearch">
            <div class="relative">
              <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                v-model="heroKeyword"
                class="quick-input border-slate-200 bg-slate-50 text-slate-950 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 pl-9"
                placeholder="例如 学习方法、租房经验、AI 工具、书单推荐"
              />
            </div>
            <button type="submit" class="primary-action w-full">
              搜索内容
            </button>
          </form>
        </section>
      </section>

      <section class="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <RouterLink
          v-for="action in todayActions"
          :key="action.title"
          :to="action.href"
          class="home-action-card"
          :class="action.primary ? 'home-action-card-primary' : ''"
        >
          <span class="home-action-icon">
            <component :is="action.icon" class="h-4 w-4" />
          </span>
          <span class="min-w-0">
            <span class="block text-sm font-black text-slate-950 dark:text-white">{{ action.title }}</span>
            <span class="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{{ action.description }}</span>
          </span>
        </RouterLink>
      </section>

      <!-- 领域筛选 -->
      <section class="mb-6 flex flex-wrap gap-2">
        <router-link
          to="/"
          class="domain-chip inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-primary-50 hover:text-primary-700 dark:border-slate-700 dark:hover:bg-primary-950"
          :class="activeDomain === undefined ? 'bg-primary-100 border-primary-300 text-primary-700 dark:bg-primary-900/50 dark:border-primary-700' : 'bg-white dark:bg-slate-900'"
        >
          <span>综合</span>
        </router-link>
        <router-link
          v-for="d in COMMUNITY_CHANNELS"
          :key="d.key"
          :to="d.domain ? (d.domain === activeDomain ? '/' : { path: '/', query: { domain: d.domain } }) : { path: '/search', query: { type: String(d.postTypes?.[0] || ''), sort: 'hot' } }"
          class="domain-chip inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-primary-50 hover:text-primary-700 dark:border-slate-700 dark:hover:bg-primary-950"
          :class="d.domain != null && d.domain === activeDomain ? 'bg-primary-100 border-primary-300 text-primary-700 dark:bg-primary-900/50 dark:border-primary-700' : 'bg-white dark:bg-slate-900'"
        >
          <span>{{ d.icon }}</span>
          <span>{{ d.name }}</span>
        </router-link>
      </section>

      <section class="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <article class="surface-card p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-sm font-black text-slate-950 dark:text-white">领域来源口径</h2>
              <p class="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{{ domainSourceSummary }}</p>
            </div>
            <span class="rounded-full bg-primary-50 px-3 py-1 text-xs font-black text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
              {{ activeDomainMeta?.icon || '🧭' }} {{ activeDomainMeta?.domainName || '综合' }}
            </span>
          </div>
          <p class="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
            首页筛选继续沿用稳定的默认五大领域，领域说明和提示优先同步 `/api/v1/domains`，与发现页保持一致的来源口径。
          </p>
          <p class="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
            {{ activeDomainMeta?.browseNotice || activeDomainMeta?.description || '当前未指定领域时，会展示综合内容和默认社区入口。' }}
          </p>
        </article>

        <article class="surface-card p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-sm font-black text-slate-950 dark:text-white">内容合集</h2>
              <p class="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{{ homeSeriesSummary }}</p>
            </div>
            <RouterLink :to="seriesWorkbenchHref" class="secondary-action px-4">
              打开
            </RouterLink>
          </div>

          <div v-if="homeSeriesPreview.length" class="mt-4 space-y-3">
            <div
              v-for="item in homeSeriesPreview"
              :key="item.id"
              class="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/60"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{{ item.title }}</div>
                  <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ item.progress.label }}</div>
                </div>
                <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {{ item.goalCount }} 篇目标
                </span>
              </div>
              <div class="home-series-mini-bar mt-3">
                <span :style="{ width: `${item.progress.completionRate}%` }" />
              </div>
            </div>
          </div>

          <p v-else class="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {{ authStore.isLoggedIn ? '先创建一个合集，再把发布页里的草稿和已发布内容归入同一组主题内容。' : '登录后可查看自己的合集进度，并在发布页里直接归属到某个合集。' }}
          </p>
        </article>
      </section>

      <section v-if="authStore.isLoggedIn && taskSections.length" class="mb-6 grid gap-4 lg:hidden">
        <article
          v-for="section in taskSections"
          :key="section.taskType"
          class="surface-card p-5"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="task-section-label">
                {{ section.taskType === 'DAILY' ? '每日任务 Lite' : '新人任务链' }}
              </p>
              <h2 class="text-sm font-black text-slate-950 dark:text-white">{{ section.title }}</h2>
              <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{{ section.subtitle }}</p>
            </div>
            <span class="task-progress-pill">{{ taskProgressLabel(section) }}</span>
          </div>
          <div class="mt-4 space-y-3">
            <div
              v-for="item in section.items"
              :key="`${section.taskType}:${item.taskCode}`"
              class="task-item"
              :class="{ 'task-item-complete': item.completed }"
            >
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="task-check">{{ item.completed ? '✓' : '·' }}</span>
                  <h3 class="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{{ item.title }}</h3>
                </div>
                <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{{ item.description }}</p>
              </div>
              <button
                type="button"
                class="task-action-button"
                :disabled="isTaskBusy(section.taskType, item.taskCode)"
                @click="handleTaskAction(section, item)"
              >
                {{ item.completed ? '已完成' : (item.actionText || '去完成') }}
              </button>
            </div>
          </div>
        </article>
      </section>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        <aside class="hidden lg:block">
          <div class="sticky top-24 space-y-5">
            <section class="surface-card p-5">
              <template v-if="authStore.isLoggedIn && authStore.user">
                <div class="flex items-start gap-3">
                  <div class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary-600 to-sky-500 text-xl font-black text-white shadow-sm shadow-primary-600/20">
                    <img v-if="authStore.user.avatar" :src="authStore.user.avatar" :alt="authStore.user.nickname" class="h-full w-full object-cover" />
                    <span v-else>{{ authStore.user.nickname.charAt(0) || '?' }}</span>
                  </div>
                  <div class="min-w-0">
                    <h3 class="truncate font-black text-slate-950 dark:text-white">{{ authStore.user.nickname }}</h3>
                    <p class="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {{ currentUserSignature }}
                    </p>
                  </div>
                </div>
                <div class="mt-5 grid grid-cols-2 gap-3 text-center">
                  <RouterLink to="/me" class="profile-stat">
                    <span>{{ authStore.user.postCount ?? 0 }}</span>
                    <small>帖子</small>
                  </RouterLink>
                  <RouterLink to="/me" class="profile-stat">
                    <span>{{ authStore.user.followerCount ?? 0 }}</span>
                    <small>粉丝</small>
                  </RouterLink>
                </div>
              </template>
              <template v-else>
                <div>
                  <h3 class="font-black text-slate-950 dark:text-white">开始沉淀你的实践经验</h3>
                  <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">登录后可以发布经验、问题、攻略或资源，收藏内容并关注作者。</p>
                  <RouterLink to="/login" class="primary-action mt-4 w-full">
                    登录
                  </RouterLink>
                </div>
              </template>
            </section>

            <section
              v-for="section in taskSections"
              :key="section.taskType"
              class="surface-card p-5"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="task-section-label">
                    {{ section.taskType === 'DAILY' ? '每日任务 Lite' : '新人任务链' }}
                  </p>
                  <h3 class="font-black text-slate-950 dark:text-white">{{ section.title }}</h3>
                  <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{{ section.subtitle }}</p>
                </div>
                <span class="task-progress-pill">{{ taskProgressLabel(section) }}</span>
              </div>
              <div class="mt-4 space-y-3">
                <div
                  v-for="item in section.items"
                  :key="`${section.taskType}:${item.taskCode}`"
                  class="task-item"
                  :class="{ 'task-item-complete': item.completed }"
                >
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="task-check">{{ item.completed ? '✓' : '·' }}</span>
                      <h4 class="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{{ item.title }}</h4>
                    </div>
                    <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{{ item.description }}</p>
                  </div>
                  <button
                    type="button"
                    class="task-action-button"
                    :disabled="isTaskBusy(section.taskType, item.taskCode)"
                    @click="handleTaskAction(section, item)"
                  >
                    {{ item.completed ? '已完成' : (item.actionText || '去完成') }}
                  </button>
                </div>
              </div>
            </section>

            <section class="surface-panel p-5">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="font-black text-slate-950 dark:text-white">热门标签</h3>
                <Tag class="h-4 w-4 text-slate-400" />
              </div>
              <div class="flex flex-wrap gap-2">
                <RouterLink
                  v-for="tag in topTags"
                  :key="tag.id"
                  :to="`/tag/${tag.slug || tag.id}`"
                  class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-primary-800 dark:hover:bg-primary-950/60"
                >
                  {{ tag.name }}
                </RouterLink>
              </div>
            </section>
          </div>
        </aside>

        <section class="min-w-0">
          <div class="surface-card mb-5 p-2">
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <button
                v-for="tab in feedTabs"
                :key="tab"
                type="button"
                :disabled="tab === 'following' && !authStore.isLoggedIn"
                :class="[
                  'rounded-lg px-3 py-3 text-left text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50',
                  activeFeed === tab
                    ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
                ]"
                @click="activeFeed = tab"
              >
                <span class="block">{{ feedLabels[tab] }}</span>
                <span class="mt-1 block text-xs font-medium opacity-75">{{ feedShortDescriptions[tab] }}</span>
              </button>
            </div>
            <p class="px-3 pb-2 pt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {{ feedDescriptions[activeFeed] }}
              <span v-if="activeFeed === 'recommend'" class="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                推荐理由会结合兴趣标签、内容形式和社区热度一起计算。
              </span>
            </p>
            <div class="border-t border-slate-100 px-3 py-3 dark:border-slate-800">
              <div class="mb-2 flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400">
                <Sparkles class="h-3.5 w-3.5" />
                内容频道
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  :class="['channel-chip', !activeContentType ? 'channel-chip-active' : '']"
                  @click="activeContentType = undefined"
                >
                  全部
                </button>
                <button
                  v-for="type in contentTypeChannels"
                  :key="type.value"
                  type="button"
                  :class="['channel-chip', activeContentType === type.value ? 'channel-chip-active' : '']"
                  @click="toggleContentType(type.value)"
                >
                  {{ type.shortLabel }}
                </button>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <LoadingSkeleton v-if="isLoading" />
            <div v-else-if="isError" class="surface-card feed-error-card p-6">
              <div>
                <h3 class="text-lg font-black text-slate-950 dark:text-slate-100">信息流加载失败</h3>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{{ feedErrorText }}</p>
                <p class="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-500">
                  当前频道：{{ feedLabels[activeFeed] }}。可以换到热门、精选或问答继续浏览。
                </p>
              </div>
              <div class="feed-error-actions">
                <button type="button" class="secondary-action px-5" @click="() => refetch()">重试</button>
                <button type="button" class="secondary-action px-5" @click="switchFeedAfterError('hot')">热门</button>
                <button type="button" class="secondary-action px-5" @click="switchFeedAfterError('featured')">精选</button>
                <RouterLink to="/explore" class="secondary-action px-5">发现</RouterLink>
                <RouterLink :to="{ path: '/questions', query: homeFallbackQuestionQuery }" class="secondary-action px-5">问答</RouterLink>
              </div>
            </div>
            <template v-else-if="visiblePosts.length">
              <PostCard
                v-for="post in visiblePosts"
                :key="post.postId"
                :post="post"
                :show-recommend-feedback="activeFeed === 'recommend'"
                :like-pending="isActionPending('like', post.postId)"
                :favorite-pending="isActionPending('favorite', post.postId)"
                @like="handleLike"
                @favorite="handleFavorite"
                @not-interested="handleRecommendFeedback"
                @follow-change="handlePostAuthorFollowChange"
              />
            </template>
            <EmptyState
              v-else
              :title="emptyFeedTitle"
              :description="emptyFeedDescription"
              :actionText="emptyFeedActionText"
              :actionHref="emptyFeedActionHref"
            />
          </div>

          <div v-if="hasNextPage && !isFetching" class="mt-6 text-center">
            <button type="button" class="secondary-action px-6" @click="() => fetchNextPage()">
              加载更多
            </button>
          </div>

          <div v-if="isFetching" class="mt-6">
            <LoadingSkeleton />
          </div>
        </section>

        <aside class="hidden lg:block">
          <div class="sticky top-24 space-y-5">
            <section class="surface-card p-5">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="font-black text-slate-950 dark:text-white">精选内容</h3>
                <Sparkles class="h-4 w-4 text-amber-500" />
              </div>
              <div v-if="featuredPreview.length" class="space-y-3">
                <RouterLink
                  v-for="post in featuredPreview"
                  :key="post.postId"
                  :to="`/post/${post.postId}`"
                  class="block rounded-lg border border-amber-100 bg-amber-50/60 p-3 transition-colors hover:border-amber-200 hover:bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 dark:hover:bg-amber-950/35"
                >
                  <span class="text-[11px] font-black text-amber-700 dark:text-amber-300">精选</span>
                  <h4 class="mt-1 line-clamp-2 text-sm font-bold text-slate-900 dark:text-slate-100">{{ post.title }}</h4>
                </RouterLink>
              </div>
              <p v-else class="text-sm leading-6 text-slate-500 dark:text-slate-400">
                切到精选信息流可查看运营标记的高质量内容。
              </p>
            </section>

            <section class="surface-card p-5">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="font-black text-slate-950 dark:text-white">热门话题</h3>
                <Compass class="h-4 w-4 text-primary-500" />
              </div>
              <div class="space-y-2">
                <RouterLink
                  v-for="topic in topicItems"
                  :key="topic.name"
                  :to="topic.href"
                  class="group flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span class="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{{ topic.name }}</span>
                  <span class="ml-3 shrink-0 text-xs text-slate-500 dark:text-slate-400">{{ topic.count }}</span>
                </RouterLink>
              </div>
            </section>

            <section class="surface-card p-5">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="font-black text-slate-950 dark:text-white">标签热度</h3>
                <TrendingUp class="h-4 w-4 text-teal-500" />
              </div>
              <div class="space-y-2">
                <RouterLink
                  v-for="(tag, index) in trendingTags"
                  :key="tag.id"
                  :to="`/tag/${tag.slug || tag.id}`"
                  class="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-500 group-hover:bg-primary-100 group-hover:text-primary-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-primary-950 dark:group-hover:text-primary-300">
                    {{ index + 1 }}
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-bold text-slate-900 dark:text-slate-100">{{ tag.name }}</span>
                    <span class="block text-xs text-slate-500 dark:text-slate-400">{{ tag.count ?? 0 }} 篇内容</span>
                  </span>
                </RouterLink>
              </div>
            </section>

            <section class="surface-card p-5">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="font-black text-slate-950 dark:text-white">推荐用户</h3>
                <Users class="h-4 w-4 text-amber-500" />
              </div>
              <div class="space-y-3">
                <div
                  v-for="user in recommendedUsers"
                  :key="user.uid"
                  class="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <RouterLink :to="`/u/${user.uid}`" class="flex min-w-0 flex-1 items-center gap-3">
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-xs font-black text-white">
                      <img v-if="user.avatar" :src="user.avatar" :alt="user.nickname" class="h-full w-full object-cover" />
                      <span v-else>{{ user.nickname.charAt(0) || '?' }}</span>
                    </div>
                    <div class="min-w-0">
                      <div class="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{{ user.nickname }}</div>
                      <div class="truncate text-xs text-slate-500 dark:text-slate-400">{{ userDisplaySignature(user) }}</div>
                    </div>
                  </RouterLink>
                  <button
                    type="button"
                    class="shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-60"
                    :class="user.isFollowing ? 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800' : 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950 dark:text-primary-300'"
                    :disabled="isSelf(user) || followingBusyIds.has(String(user.uid))"
                    @click="toggleFollowUser(user)"
                  >
                    {{ user.isFollowing ? '已关注' : '关注' }}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from 'vue'
import { RouterLink, useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { toast } from 'vue-sonner'
import { BookOpen, Compass, FileText, PenLine, Search, Sparkles, Tag, Target, TrendingUp, Users } from 'lucide-vue-next'
import { getErrorMessage } from '@/api/client'
import { contentSeriesApi, type ContentSeriesRecord } from '@/api/contentSeries'
import { domainApi, localDomainConfigs, type DomainConfigSource, type PublicDomainConfig } from '@/api/domains'
import { useInfiniteFeed, type FeedType } from '@/composables/useInfiniteFeed'
import { useAuthStore } from '@/stores/auth'
import { postApi } from '@/api/post'
import { taskApi, type UserTaskItem, type UserTaskOverview } from '@/api/tasks'
import { userApi } from '@/api/user'
import { feedApi } from '@/api/feed'
import { usePostInteraction } from '@/composables/usePostInteraction'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import AppHeader from '@/components/layout/AppHeader.vue'
import PostCard from '@/components/post/PostCard.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { CommunityTopic, Post, Tag as PostTag, User } from '@/api/types'
import { COMMUNITY_CONTENT_TYPES } from '@/utils/contentTypes'
import { COMMUNITY_CHANNELS, DOMAIN_OPTIONS } from '@/utils/domains'
import { buildTopicItems, isFeaturedPost } from '@/utils/communityMetrics'
import { filterPublicContent, isSyntheticVisibleText } from '@/utils/textQuality'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const { requireLogin } = useLoginRedirect()

const activeFeed = ref<FeedType>('recommend')
const heroKeyword = ref('')
const activeContentType = ref<number | undefined>()
const onboardingOverview = ref<UserTaskOverview | null>(null)
const dailyOverview = ref<UserTaskOverview | null>(null)
const homeDomains = ref<PublicDomainConfig[]>([...localDomainConfigs])
const domainSource = ref<DomainConfigSource>('fallback')
const homeSeriesPreview = ref<ContentSeriesRecord[]>([])
const homeSeriesSource = ref<'remote' | 'fallback'>('fallback')
const legalDomainValues = new Set<number>(DOMAIN_OPTIONS.map((d) => d.value))
const activeDomain = computed(() => {
  const q = Number(route.query.domain)
  return legalDomainValues.has(q) ? q : undefined
})
interface TodayAction {
  title: string
  description: string
  href: RouteLocationRaw
  icon: Component
  primary?: boolean
}
const feedTabs: FeedType[] = ['following', 'recommend', 'latest', 'hot', 'featured']
const feedLabels: Record<FeedType, string> = {
  following: '关注',
  recommend: '推荐',
  latest: '最新',
  hot: '热门',
  featured: '精选',
}
const feedShortDescriptions: Record<FeedType, string> = {
  following: '熟人动态',
  recommend: '高相关内容',
  latest: '新发布',
  hot: '正在升温',
  featured: '人工挑选',
}
const feedDescriptions: Record<FeedType, string> = {
  following: '只看你关注作者的最新动态，适合持续追踪熟悉的社区内容。',
  recommend: '结合你的兴趣主题、内容标签、阅读偏好和互动热度重排，优先展示更贴近你关注点的社区推荐。',
  latest: '按发布时间倒序展示公开内容，适合快速浏览新发布的文章、复盘和问答。',
  hot: '按浏览、点赞、收藏、评论和发布时间计算热度，适合查看正在升温的社区内容。',
  featured: '展示管理员或运营标记的高质量内容，适合作为首页精选和专题沉淀入口。',
}

const tags = ref<PostTag[]>([])
const topics = ref<CommunityTopic[]>([])
const recommendedUsers = ref<User[]>([])
const sampledFeedContentCount = ref(0)
const followingBusyIds = ref(new Set<string>())
const taskBusyKeys = ref(new Set<string>())
const locallyHiddenPostIds = ref(new Set<string>())
const { posts, error: feedError, fetchNextPage, hasNextPage, isError, isFetching, isLoading, refetch } = useInfiniteFeed(activeFeed, activeDomain)

const sortedTags = computed(() => [...tags.value].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)))
const topTags = computed(() => sortedTags.value.slice(0, 10))
const trendingTags = computed(() => sortedTags.value.slice(0, 6))
const contentTypeChannels = COMMUNITY_CONTENT_TYPES
const homeDomainOptions = computed(() => homeDomains.value.length ? homeDomains.value : localDomainConfigs)
const activeDomainMeta = computed(() => (
  homeDomainOptions.value.find((item) => Number(item.domain) === Number(activeDomain.value))
  ?? localDomainConfigs.find((item) => Number(item.domain) === Number(activeDomain.value))
  ?? null
))
const domainSourceSummary = computed(() => {
  const activeLabel = activeDomainMeta.value?.domainName || (activeDomain.value == null ? '综合' : '默认领域')
  return domainSource.value === 'remote'
    ? `首页领域说明已同步 /api/v1/domains，筛选继续保留默认五大领域 · 当前 ${activeLabel}`
    : `接口暂未返回，首页当前使用本地 fallback 并保留默认五大领域 · 当前 ${activeLabel}`
})
const seriesWorkbenchHref = computed(() => authStore.isLoggedIn ? '/series/workbench' : '/login')
const homeSeriesSummary = computed(() => {
  if (!authStore.isLoggedIn) return '登录后可查看你的合集进度和阶段性整理计划'
  if (!homeSeriesPreview.value.length) {
    return homeSeriesSource.value === 'fallback'
      ? '当前还没有合集，本地 fallback 已准备好创建流程'
      : '还没有合集，先创建一个主题整理空间'
  }
  return homeSeriesSource.value === 'remote'
    ? `已同步 ${homeSeriesPreview.value.length} 个合集`
    : `已从本地 fallback 恢复 ${homeSeriesPreview.value.length} 个合集`
})
const topicItems = computed(() => {
  const remoteTopics = topics.value.slice(0, 6).map((topic) => ({
    name: topic.name,
    count: Number(topic.postCount || 0),
    href: `/topics/${topic.slug}`,
  }))
  if (remoteTopics.length) return remoteTopics
  return buildTopicItems(visiblePosts.value, tags.value, 6).map((topic) => ({
    ...topic,
    href: { path: '/search', query: { company: topic.name, sort: 'hot' } },
  }))
})
const cleanPosts = computed(() => filterPublicContent(posts.value))
const featuredPreview = computed(() => cleanPosts.value.filter(isFeaturedPost).slice(0, 3))
const visiblePosts = computed(() => {
  const base = activeFeed.value === 'recommend'
    ? cleanPosts.value.filter((post) => !locallyHiddenPostIds.value.has(String(post.postId)))
    : cleanPosts.value
  return activeContentType.value
    ? base.filter((post) => Number(post.postType) === Number(activeContentType.value))
    : base
})
const readableContentCount = computed(() => Math.max(visiblePosts.value.length, sampledFeedContentCount.value))
const readableMetricValue = computed(() => readableContentCount.value > 0 ? String(readableContentCount.value) : '先看精选')
const tagMetricValue = computed(() => topTags.value.length > 0 ? String(topTags.value.length) : '去发现')
const peerMetricValue = computed(() => recommendedUsers.value.length > 0 ? String(recommendedUsers.value.length) : '看作者')
const todayActions = computed<TodayAction[]>(() => [
  {
    title: '看推荐内容',
    description: '从真实经验、攻略清单和资源推荐里找灵感',
    href: '/',
    icon: Compass,
    primary: true,
  },
  {
    title: '逛频道广场',
    description: '科技数码、学习成长、职场经验、生活方式都在发现页',
    href: '/explore',
    icon: Sparkles,
  },
  {
    title: '参与问答',
    description: '提出问题、征集建议，也可以回答别人的困惑',
    href: '/questions',
    icon: BookOpen,
  },
  {
    title: '发布内容',
    description: '分享经验、提出问题、推荐资源或写一篇复盘',
    href: '/editor',
    icon: FileText,
  },
  {
    title: '实验工具',
    description: '旧版学习空间和练习工具保留直达，适合职场频道用户继续使用',
    href: authStore.isLoggedIn ? '/me/prep' : '/login',
    icon: Target,
  },
])
const currentUserSignature = computed(() => {
  const signature = authStore.user?.signature?.trim()
  return signature && !isSyntheticVisibleText(signature)
    ? signature
    : '完善个人资料，让更多社区成员了解你的关注方向'
})
const taskSections = computed(() => {
  if (!authStore.isLoggedIn) return []
  const sections: UserTaskOverview[] = []
  if (onboardingOverview.value && (onboardingOverview.value.active || (onboardingOverview.value.completedCount ?? 0) > 0)) {
    sections.push(onboardingOverview.value)
  }
  if (dailyOverview.value?.items?.length) {
    sections.push(dailyOverview.value)
  }
  return sections
})
const feedErrorText = computed(() => getErrorMessage(feedError.value, '当前信息流暂时不可用，请稍后重试。'))
const homeFallbackQuestionQuery = computed(() => {
  const keyword = heroKeyword.value.trim() || topTags.value[0]?.name || ''
  return keyword ? { q: keyword } : {}
})
const emptyFeedTitle = computed(() => {
  if (activeFeed.value === 'following') return '还没有关注动态'
  if (activeFeed.value === 'latest' && sampledFeedContentCount.value > 0) return '最新暂时没有新内容'
  return '暂时没有内容'
})
const emptyFeedDescription = computed(() => {
  if (activeFeed.value === 'following') return '先从发现页关注几位分享真实经验、资源推荐和生活攻略的作者。'
  if (activeFeed.value === 'latest' && sampledFeedContentCount.value > 0) return '推荐和热门里还有可读内容，也可以去发现页看看频道广场和热门话题。'
  return '可以先看推荐内容、逛发现页，或把最近一次经历、问题、清单写成一篇内容。'
})
const emptyFeedActionText = computed(() => activeFeed.value === 'following' ? '去发现作者' : '去发现内容')
const emptyFeedActionHref = computed(() => '/explore')

const findPost = (postId: Post['postId']) => posts.value.find((item) => String(item.postId) === String(postId))
const userDisplaySignature = (user: User) => {
  const signature = user.signature?.trim()
  return signature && !isSyntheticVisibleText(signature)
    ? signature
    : '实践经验主页'
}
const isSelf = (user: User) => Boolean(authStore.user && String(authStore.user.uid) === String(user.uid))
const taskProgressLabel = (section: UserTaskOverview) => `${section.completedCount ?? 0}/${section.totalCount ?? section.items.length}`
const taskBusyKey = (taskType: string, taskCode: string) => `${taskType}:${taskCode}`
const isTaskBusy = (taskType: string, taskCode: string) => taskBusyKeys.value.has(taskBusyKey(taskType, taskCode))
const updatePost = (postId: Post['postId'], updater: (post: Post) => void) => {
  const post = findPost(postId)
  if (post) updater(post)
}
const { toggleLike, toggleFavorite, isActionPending } = usePostInteraction(updatePost)

const loadHomeDomains = async () => {
  try {
    const res = await domainApi.listPublic()
    homeDomains.value = res.data?.length ? res.data : [...localDomainConfigs]
    domainSource.value = res.source
  } catch {
    homeDomains.value = [...localDomainConfigs]
    domainSource.value = 'fallback'
  }
}

const loadHomeSeriesPreview = async () => {
  if (!authStore.isLoggedIn) {
    homeSeriesPreview.value = []
    homeSeriesSource.value = 'fallback'
    return
  }
  try {
    const res = await contentSeriesApi.listMine(authStore.user?.uid)
    homeSeriesPreview.value = (res.data || []).slice(0, 3)
    homeSeriesSource.value = res.status
  } catch {
    homeSeriesPreview.value = []
    homeSeriesSource.value = 'fallback'
  }
}

const refreshTaskPanels = async () => {
  if (!authStore.isLoggedIn) {
    onboardingOverview.value = null
    dailyOverview.value = null
    return
  }
  const [onboardingRes, dailyRes] = await Promise.allSettled([
    taskApi.getOnboardingTasks(),
    taskApi.getDailyTasks(),
  ])
  if (onboardingRes.status === 'fulfilled') {
    onboardingOverview.value = onboardingRes.value.data
  }
  if (dailyRes.status === 'fulfilled') {
    dailyOverview.value = dailyRes.value.data
  }
}

const handleTaskAction = async (section: UserTaskOverview, item: UserTaskItem) => {
  const nextRoute = item.actionRoute || (section.taskType === 'DAILY' ? '/' : '/explore')
  if (item.completed || !item.manualCompletable) {
    await router.push(nextRoute)
    return
  }
  const busyKey = taskBusyKey(section.taskType, item.taskCode)
  taskBusyKeys.value = new Set(taskBusyKeys.value).add(busyKey)
  try {
    if (section.taskType === 'DAILY') {
      await taskApi.completeDailyTask(item.taskCode)
    } else {
      await taskApi.completeOnboardingTask(item.taskCode)
    }
    await refreshTaskPanels()
    await router.push(nextRoute)
  } catch (error: any) {
    toast.error(getErrorMessage(error, '任务状态更新失败'))
  } finally {
    const next = new Set(taskBusyKeys.value)
    next.delete(busyKey)
    taskBusyKeys.value = next
  }
}

const submitHeroSearch = () => {
  const q = heroKeyword.value.trim()
  router.push({ path: '/search', query: q ? { q } : {} })
}

const toggleContentType = (type: number) => {
  activeContentType.value = activeContentType.value === type ? undefined : type
}

const switchFeedAfterError = (feed: FeedType) => {
  activeFeed.value = feed
  activeContentType.value = undefined
  setTimeout(() => {
    refetch()
  }, 0)
}

const handleLike = async (postId: Post['postId']) => {
  const post = findPost(postId)
  if (!post) return
  await toggleLike(post)
  await refreshTaskPanels()
}

const handleFavorite = async (postId: Post['postId']) => {
  const post = findPost(postId)
  if (!post) return
  await toggleFavorite(post)
  await refreshTaskPanels()
}

const handlePostAuthorFollowChange = (authorUid: User['uid'], following: boolean) => {
  posts.value.forEach((post) => {
    if (String(post.author.uid) === String(authorUid)) {
      post.author.isFollowing = following
    }
  })
  recommendedUsers.value.forEach((user) => {
    if (String(user.uid) === String(authorUid)) {
      user.isFollowing = following
    }
  })
}

const handleRecommendFeedback = async (postId: Post['postId'], reason: string) => {
  if (!requireLogin()) return
  try {
    await feedApi.recordFeedback(postId, reason)
    locallyHiddenPostIds.value = new Set(locallyHiddenPostIds.value).add(String(postId))
    toast.success('已减少类似推荐')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '推荐反馈提交失败'))
  }
}

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
    await refreshTaskPanels()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '关注操作失败'))
  } finally {
    const next = new Set(followingBusyIds.value)
    next.delete(uid)
    followingBusyIds.value = next
  }
}

onMounted(async () => {
  if (route.query.feed === 'featured') {
    activeFeed.value = 'featured'
  }
  const [tagRes, topicRes, userRes, latestRes, hotRes, recommendRes] = await Promise.allSettled([
    postApi.getTags(),
    postApi.listTopics({ featured: true, limit: 6 }),
    userApi.searchUsers('', 6),
    feedApi.getLatest(undefined, 6, activeDomain.value),
    feedApi.getHot(undefined, 6, activeDomain.value),
    feedApi.getRecommend(undefined, 6, activeDomain.value),
  ])
  if (tagRes.status === 'fulfilled') {
    tags.value = filterPublicContent(tagRes.value.data || [])
  }
  if (topicRes.status === 'fulfilled') {
    topics.value = filterPublicContent(topicRes.value.data || [])
  }
  if (userRes.status === 'fulfilled') {
    recommendedUsers.value = filterPublicContent(userRes.value.data || [])
  }
  const feedCounts = [latestRes, hotRes, recommendRes]
    .filter((res): res is PromiseFulfilledResult<Awaited<ReturnType<typeof feedApi.getLatest>>> => res.status === 'fulfilled')
    .map((res) => filterPublicContent(res.value.data?.items || []).length)
  sampledFeedContentCount.value = Math.max(0, ...feedCounts)
  await Promise.all([loadHomeDomains(), loadHomeSeriesPreview()])
  await refreshTaskPanels()
})

watch(() => authStore.isLoggedIn, async (loggedIn) => {
  if (!loggedIn) {
    onboardingOverview.value = null
    dailyOverview.value = null
    homeSeriesPreview.value = []
    homeSeriesSource.value = 'fallback'
    return
  }
  await Promise.all([refreshTaskPanels(), loadHomeSeriesPreview()])
})
</script>

<style scoped>
.home-series-mini-bar {
  overflow: hidden;
  height: 8px;
  border-radius: 999px;
  background: rgb(226 232 240);
}

.home-series-mini-bar > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgb(37 99 235), rgb(14 165 233));
}

.metric-tile {
  position: relative;
  overflow: hidden;
  border-radius: 0.75rem;
  border: 1px solid;
  padding: 1rem;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.72);
}

.metric-tile::before {
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  content: '';
  background: linear-gradient(90deg, rgb(79 70 229), rgb(20 184 166));
  opacity: 0.76;
}

.metric-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(100 116 139);
}

.metric-value {
  display: block;
  margin-top: 0.35rem;
  min-height: 2.125rem;
  font-size: 1.35rem;
  line-height: 1.15;
  color: rgb(15 23 42);
}

.home-action-card {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.75rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240 / 0.9);
  background: rgb(255 255 255 / 0.88);
  padding: 1rem;
  transition: transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.home-action-card:hover {
  transform: translateY(-1px);
  border-color: rgb(165 180 252);
  background: rgb(248 250 252);
  box-shadow: 0 12px 30px rgb(15 23 42 / 0.08);
}

.home-action-card-primary {
  border-color: rgb(129 140 248 / 0.75);
  background: linear-gradient(135deg, rgb(238 242 255), rgb(240 253 250));
}

.home-action-icon {
  display: inline-flex;
  height: 2rem;
  width: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.65rem;
  background: rgb(224 231 255);
  color: rgb(67 56 202);
}

.quick-input {
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid;
  padding: 0.75rem;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.quick-input:focus {
  border-color: rgb(165 180 252);
  background: white;
  box-shadow: 0 0 0 3px rgb(224 231 255);
}

.profile-stat {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240 / 0.8);
  background: rgb(248 250 252);
  padding: 0.85rem 0.5rem;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.profile-stat:hover {
  border-color: rgb(199 210 254);
  background: rgb(238 242 255);
}

.profile-stat span,
.profile-stat small {
  display: block;
}

.profile-stat span {
  font-weight: 900;
  color: rgb(79 70 229);
}

.profile-stat small {
  margin-top: 0.1rem;
  font-size: 0.75rem;
  color: rgb(100 116 139);
}

.task-progress-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgb(238 242 255);
  color: rgb(67 56 202);
  min-width: 3rem;
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 900;
}

.task-section-label {
  margin-bottom: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(14 116 144);
}

.task-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  border-radius: 0.95rem;
  border: 1px solid rgb(226 232 240 / 0.9);
  background: rgb(248 250 252 / 0.9);
  padding: 0.9rem;
}

.task-item-complete {
  border-color: rgb(187 247 208 / 0.95);
  background: rgb(240 253 244 / 0.95);
}

.task-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.1rem;
  color: rgb(79 70 229);
  font-weight: 900;
}

.task-action-button {
  flex-shrink: 0;
  border: 1px solid rgb(199 210 254);
  background: rgb(238 242 255);
  color: rgb(67 56 202);
  border-radius: 999px;
  min-height: 2.25rem;
  padding: 0.45rem 0.9rem;
  font-size: 0.75rem;
  font-weight: 800;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.task-action-button:hover:not(:disabled) {
  border-color: rgb(165 180 252);
  background: rgb(224 231 255);
}

.task-action-button:disabled {
  opacity: 0.6;
  cursor: wait;
}

.channel-chip {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid rgb(226 232 240);
  background: rgb(255 255 255 / 0.85);
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(71 85 105);
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}

@media (max-width: 640px) {
  .home-metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .metric-tile {
    min-height: 3.75rem;
    padding: 0.55rem 0.45rem;
    text-align: center;
  }

  .metric-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.68rem;
  }

  .metric-value {
    margin-top: 0.25rem;
    min-height: 1.5rem;
    font-size: 1.15rem;
  }
}

@media (max-width: 420px) {
  .metric-tile {
    padding: 0.5rem 0.35rem;
  }

  .metric-value {
    min-height: 1.4rem;
    font-size: 1.05rem;
  }

  .channel-chip {
    min-height: 44px;
    padding: 0.45rem 0.8rem;
  }
}

.channel-chip:hover,
.channel-chip-active {
  border-color: rgb(199 210 254);
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.feed-error-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
}

.feed-error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.feed-error-actions > * {
  min-height: 2.5rem;
}

.dark .profile-stat {
  border-color: rgb(51 65 85 / 0.8);
  background: rgb(15 23 42 / 0.75);
}

.dark .task-progress-pill {
  background: rgb(49 46 129 / 0.45);
  color: rgb(199 210 254);
}

.dark .task-section-label {
  color: rgb(103 232 249);
}

.dark .task-item {
  border-color: rgb(51 65 85 / 0.85);
  background: rgb(15 23 42 / 0.78);
}

.dark .task-item-complete {
  border-color: rgb(21 128 61 / 0.55);
  background: rgb(20 83 45 / 0.22);
}

.dark .task-check {
  color: rgb(199 210 254);
}

.dark .task-action-button {
  border-color: rgb(67 56 202 / 0.7);
  background: rgb(49 46 129 / 0.4);
  color: rgb(199 210 254);
}

.dark .task-action-button:hover:not(:disabled) {
  border-color: rgb(99 102 241);
  background: rgb(67 56 202 / 0.45);
}

.dark .channel-chip {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42 / 0.75);
  color: rgb(203 213 225);
}

.dark .channel-chip:hover,
.dark .channel-chip-active {
  border-color: rgb(67 56 202);
  background: rgb(49 46 129 / 0.45);
  color: rgb(199 210 254);
}

.dark .metric-label,
.dark .profile-stat small {
  color: rgb(148 163 184);
}

.dark .metric-tile {
  border-color: rgba(99, 102, 241, 0.28);
  background: rgba(15, 23, 42, 0.86);
  box-shadow:
    inset 0 1px 0 rgb(148 163 184 / 0.12),
    0 12px 30px rgb(2 6 23 / 0.22);
}

.dark .metric-value {
  color: #f8fafc;
  text-shadow: 0 1px 8px rgb(99 102 241 / 0.18);
}

.dark .home-action-card {
  border-color: rgb(51 65 85 / 0.86);
  background: rgb(15 23 42 / 0.78);
}

.dark .home-action-card:hover {
  border-color: rgb(99 102 241 / 0.68);
  background: rgb(30 41 59 / 0.9);
  box-shadow: 0 16px 36px rgb(2 6 23 / 0.28);
}

.dark .home-action-card-primary {
  border-color: rgb(99 102 241 / 0.7);
  background: linear-gradient(135deg, rgb(49 46 129 / 0.52), rgb(20 83 45 / 0.28));
}

.dark .home-action-icon {
  background: rgb(49 46 129 / 0.58);
  color: rgb(199 210 254);
}

.dark .quick-input:focus {
  border-color: rgb(67 56 202);
  background: rgb(15 23 42);
  box-shadow: 0 0 0 3px rgb(49 46 129 / 0.55);
}

.dark .profile-stat:hover {
  border-color: rgb(67 56 202);
  background: rgb(30 41 59);
}

.dark .home-series-mini-bar {
  background: rgb(30 41 59);
}
</style>
