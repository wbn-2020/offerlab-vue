<template>
  <div class="app-shell">
    <AppHeader />
    <main class="mx-auto max-w-6xl px-4 py-8">
      <div class="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100">发现</h1>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">从频道广场、话题广场、精选内容和作者入口开始，发现值得收藏和讨论的真实经验。</p>
        </div>
        <RouterLink to="/editor" class="primary-action">
          发布内容
        </RouterLink>
      </div>

      <section class="surface-card mb-8 p-5">
        <div class="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-end">
          <label>
            <span class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">关键词</span>
            <input v-model="searchForm.q" class="filter-input dark:!border-slate-700 dark:!bg-slate-950/60 dark:!text-slate-200 dark:placeholder:!text-slate-500" placeholder="学习方法、AI 工具、租房经验、书单推荐" @keyup.enter="goSearch" />
          </label>
          <label>
            <span class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">频道 / 话题</span>
            <input v-model="searchForm.techStack" class="filter-input dark:!border-slate-700 dark:!bg-slate-950/60 dark:!text-slate-200 dark:placeholder:!text-slate-500" placeholder="例如 学习成长" @keyup.enter="goSearch" />
          </label>
          <label>
            <span class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">内容形式</span>
            <input v-model="searchForm.scenario" class="filter-input dark:!border-slate-700 dark:!bg-slate-950/60 dark:!text-slate-200 dark:placeholder:!text-slate-500" placeholder="例如 攻略清单" @keyup.enter="goSearch" />
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

      <section class="surface-card explore-overview mb-8 p-6">
        <div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div class="max-w-3xl">
            <span class="overview-kicker">频道广场</span>
            <h2 class="mt-3 text-2xl font-black text-slate-900 dark:text-slate-100">先逛频道和话题，再收藏值得反复看的内容</h2>
            <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              发现页会把主频道、内容类型、热门话题、精选内容和作者入口放在同一张浏览地图里，帮助你从一个兴趣点扩展到更多真实经验。
            </p>
            <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div
                v-for="stat in overviewStats"
                :key="stat.label"
                class="overview-stat-card"
              >
                <small>{{ stat.label }}</small>
                <strong>{{ stat.value }}</strong>
                <p>{{ stat.detail }}</p>
              </div>
            </div>
          </div>

          <div class="overview-status-card" :class="`overview-status-card--${overviewState.tone}`">
            <span class="overview-status-card__eyebrow">当前状态</span>
            <h3>{{ overviewState.title }}</h3>
            <p>{{ overviewState.description }}</p>
            <RouterLink
              v-if="overviewState.action?.kind === 'route' && overviewState.action.href"
              :to="overviewState.action.href"
              class="secondary-action mt-4"
            >
              {{ overviewState.action.text }}
            </RouterLink>
            <button
              v-else-if="overviewState.action?.kind === 'login'"
              type="button"
              class="secondary-action mt-4"
              @click="requireLogin('/explore')"
            >
              {{ overviewState.action.text }}
            </button>
            <button
              v-else-if="overviewState.action?.kind === 'reload'"
              type="button"
              class="secondary-action mt-4"
              @click="loadExploreData"
            >
              {{ overviewState.action.text }}
            </button>
          </div>
        </div>

        <div class="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <RouterLink
            v-for="card in browseGuideCards"
            :key="card.title"
            :to="card.href"
            class="guide-card"
          >
            <span class="guide-card__badge">{{ card.badge }}</span>
            <h3>{{ card.title }}</h3>
            <p>{{ card.description }}</p>
            <small>{{ card.cta }}</small>
          </RouterLink>
        </div>

        <div v-if="loadFallbackNotes.length" class="mt-5 flex flex-wrap gap-2">
          <span
            v-for="note in loadFallbackNotes"
            :key="note"
            class="overview-note-chip"
          >
            {{ note }}
          </span>
        </div>
      </section>

      <section class="surface-card stage4-cross-domain-panel mb-8 p-6">
        <div class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="max-w-3xl">
            <span class="stage4-kicker">辅助探索</span>
            <h2 class="mt-3 text-xl font-black text-slate-900 dark:text-slate-100">相关内容推荐</h2>
            <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              用规则优先的桥接逻辑，把你熟悉领域之外但仍然相关的内容先解释清楚，再推荐给你。
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <RouterLink v-if="authStore.isLoggedIn" to="/growth/profile" class="secondary-action">
              作者数据
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
          登录后可查看基于关注频道生成的相关内容推荐；未登录时发现页仍保持公共内容浏览能力。
        </div>

        <LoadingSkeleton v-else-if="crossDomainStatus === 'loading'" />

        <div v-else-if="crossDomainStatus === 'failed'" class="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          <div>{{ crossDomainError || '相关内容推荐加载失败。' }}</div>
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
          :title="crossDomainEmptyState.title"
          :description="crossDomainEmptyState.description"
          :action-text="crossDomainEmptyState.actionText"
          :action-href="crossDomainEmptyState.actionHref"
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
              <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">频道广场</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">优先读取后端启用频道，接口失败时自动回退默认频道；可以先从熟悉方向进入，再回到综合视角继续扩展。</p>
            </div>
            <span class="domain-source-chip">{{ domainSourceSummary }}</span>
          </div>
          <div v-if="activeChannel" class="active-channel-panel mb-4">
            <div>
              <span>当前频道</span>
              <strong>{{ activeChannel.icon }} {{ activeChannel.name }}</strong>
              <p>{{ activeChannel.description }}</p>
              <small v-if="activeChannel.riskNote">{{ activeChannel.riskNote }}</small>
              <small v-else>频道内容会优先复用现有领域、内容类型、标签和话题能力聚合展示。</small>
            </div>
            <RouterLink to="/explore" class="secondary-action">回到综合发现</RouterLink>
          </div>
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <RouterLink
              v-for="channel in primaryChannelCards"
              :key="channel.key"
              :to="{ path: '/explore', query: { channel: channel.key } }"
              class="domain-card"
              :class="{ 'domain-card--active': activeChannel?.key === channel.key }"
            >
              <div class="domain-card__header">
                <div class="domain-card__title">
                  <span class="domain-card__icon">{{ channel.icon }}</span>
                  <h3>{{ channel.name }}</h3>
                </div>
                <span class="domain-card__risk">{{ channel.domain ? domainRiskLabel(channel.domain) : '内容类型' }}</span>
              </div>
              <p>{{ channel.description }}</p>
              <div class="channel-card-links">
                <span v-for="topic in (channel.topics || []).slice(0, 2)" :key="topic"># {{ topic }}</span>
                <span v-for="tag in (channel.tags || []).slice(0, 3)" :key="tag">{{ tag }}</span>
              </div>
              <small>{{ channel.riskNote || '进入频道聚合，继续查看代表话题和推荐标签。' }}</small>
            </RouterLink>
          </div>
          <div class="browse-playbook mt-5">
            <div class="browse-playbook__header">
              <div>
                <h3>浏览引导</h3>
              <p>先选一个入口，再顺着话题、标签和相关内容把视角拉宽。</p>
              </div>
            </div>
            <div class="browse-playbook__grid">
              <RouterLink
                v-for="entry in multiDomainEntryCards"
                :key="entry.title"
                :to="entry.href"
                class="browse-link-card"
              >
                <span class="browse-link-card__badge">{{ entry.badge }}</span>
                <strong>{{ entry.title }}</strong>
                <p>{{ entry.description }}</p>
                <small>{{ entry.cta }}</small>
              </RouterLink>
            </div>
          </div>
        </article>

        <article class="surface-card reading-pilot-card p-6">
          <span class="reading-pilot-badge">学习话题</span>
          <div class="mt-3">
            <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">学习话题</h2>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">{{ readingDomainIntro }}</p>
          </div>
          <div class="mt-5 space-y-3">
            <RouterLink
              :to="{ path: '/explore', query: { channel: 'learning-growth' } }"
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
        <div v-if="channelSectionNote" class="section-note mt-4" :class="channelSectionNoteTone">
          {{ channelSectionNote }}
        </div>
      </section>

      <section class="surface-card mb-8 p-6">
        <div class="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">社区问答讨论</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">从公开问题求助进入讨论，评论和回复承载建议、经验补充和追问。</p>
          </div>
          <RouterLink :to="{ path: '/editor', query: { type: String(POST_TYPE.QUESTION) } }" class="text-sm font-medium text-primary-600 hover:text-primary-700">
            发布问题
          </RouterLink>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RouterLink
            v-for="entry in communityQuestionEntries"
            :key="entry.title"
            :to="entry.href"
            class="channel-card"
          >
            <div>
              <h3>{{ entry.title }}</h3>
              <p>{{ entry.description }}</p>
            </div>
            <span>{{ entry.badge }}</span>
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
              <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">话题入口</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">热门话题会按频道、场景和标签聚合，方便继续浏览和收藏。</p>
            </div>
          </div>
          <div v-if="topicSectionNote" class="section-note mb-4" :class="topicSectionNoteTone">
            {{ topicSectionNote }}
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
          <EmptyState
            v-else
            :title="topicEmptyState.title"
            :description="topicEmptyState.description"
            :actionText="topicEmptyState.actionText"
            :actionHref="topicEmptyState.actionHref"
          />
        </article>
      </section>

      <section class="surface-card mb-8 p-6">
        <div class="mb-5 flex items-center justify-between gap-4">
          <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">热门标签</h2>
          <span class="text-sm text-slate-500 dark:text-slate-400">{{ displayTags.length }} 个标签</span>
        </div>
        <div v-if="isLoadingMeta" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div v-for="i in 10" :key="i" class="h-10 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
        <div v-else-if="displayTags.length" class="flex flex-wrap gap-3">
          <RouterLink
            v-for="tag in displayTags.slice(0, 24)"
            :key="tag.id"
            :to="`/tag/${tag.slug || tag.id}`"
            class="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:border-primary-700 dark:hover:bg-slate-800"
          >
            {{ tag.name }}
            <span class="ml-2 text-xs text-slate-500 dark:text-slate-400">{{ tag.count ?? 0 }}</span>
          </RouterLink>
        </div>
        <div v-if="tagSectionNote && displayTags.length" class="section-note mt-4" :class="tagSectionNoteTone">
          {{ tagSectionNote }}
        </div>
        <EmptyState
          v-else-if="!displayTags.length"
          :title="tagEmptyState.title"
          :description="tagEmptyState.description"
          :actionText="tagEmptyState.actionText"
          :actionHref="tagEmptyState.actionHref"
        />
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
              <p class="follow-reason">{{ recommendedUserReason(user) }}</p>
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
        <div v-if="userSectionNote && cleanRecommendedUsers.length" class="section-note mt-4" :class="userSectionNoteTone">
          {{ userSectionNote }}
        </div>
        <EmptyState
          v-else-if="!cleanRecommendedUsers.length"
          :title="userEmptyState.title"
          :description="userEmptyState.description"
          :actionText="userEmptyState.actionText"
          :actionHref="userEmptyState.actionHref"
        />
      </section>

      <section class="surface-card p-6">
        <div class="mb-5 flex items-center justify-between gap-4">
          <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">最新发布</h2>
          <RouterLink to="/" class="text-sm font-medium text-primary-600 hover:text-primary-700">进入信息流</RouterLink>
        </div>
        <LoadingSkeleton v-if="isLoadingPosts" />
        <div v-else-if="visibleLatestPosts.length" class="space-y-4">
          <RouterLink
            v-for="post in visibleLatestPosts"
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
        <div v-if="latestSectionNote && visibleLatestPosts.length" class="section-note mt-4" :class="latestSectionNoteTone">
          {{ latestSectionNote }}
        </div>
        <div
          v-else-if="!visibleLatestPosts.length && requestStates.posts === 'failed'"
          class="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700"
        >
          <div>最新发布暂时没有加载出来，先用领域入口、专题和搜索继续浏览。</div>
          <div class="mt-3 flex flex-wrap gap-2">
            <button type="button" class="secondary-action" @click="loadExploreData">
              重新加载
            </button>
            <RouterLink :to="searchHotLink" class="secondary-action">
              去热门内容
            </RouterLink>
          </div>
        </div>
        <EmptyState
          v-else-if="!visibleLatestPosts.length"
          title="暂无公开内容"
          description="发布公开的多领域实践内容后会出现在这里。"
          actionText="去发布"
          actionHref="/editor"
        />
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
import { COMMUNITY_CONTENT_TYPES, POST_TYPE } from '@/utils/contentTypes'
import {
  COMMUNITY_CHANNELS,
  DOMAIN,
  DOMAIN_OPTIONS,
  getCommunityChannel,
  getDomainLabel,
  isKnownDomain,
  type CommunityChannel,
} from '@/utils/domains'
import { buildTopicItems, isFeaturedPost } from '@/utils/communityMetrics'
import { filterPublicContent, isSyntheticVisibleText } from '@/utils/textQuality'
import { buildFollowReasons, isPublicAuthor } from '@/utils/creatorSignals'

type ExploreJumpTarget = string | { path: string; query?: Record<string, string> }

interface ExploreTopicEntry {
  name: string
  count: number
  href: ExploreJumpTarget
}

interface ExploreGuideCard {
  title: string
  badge: string
  description: string
  cta: string
  href: ExploreJumpTarget
}

interface ExploreStatItem {
  label: string
  value: string
  detail: string
}

interface ExploreAction {
  kind: 'route' | 'login' | 'reload'
  text: string
  href?: string
}

interface ExploreOverviewState {
  tone: 'neutral' | 'success' | 'warning' | 'danger'
  title: string
  description: string
  action?: ExploreAction
}

interface ExploreEmptyStateModel {
  title: string
  description: string
  actionText?: string
  actionHref?: string
}

type RequestState = 'idle' | 'loading' | 'ready' | 'failed'

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
const requestStates = reactive<Record<'domains' | 'tags' | 'topics' | 'users' | 'posts' | 'dashboard' | 'crossDomain', RequestState>>({
  domains: 'loading',
  tags: 'loading',
  topics: 'loading',
  users: 'loading',
  posts: 'loading',
  dashboard: 'loading',
  crossDomain: 'idle',
})
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
const cleanRecommendedUsers = computed(() => filterPublicContent(recommendedUsers.value).filter(isPublicAuthor))
const cleanLatestPosts = computed(() => filterPublicContent(latestPosts.value))
const recommendedUserReason = (user: User) => buildFollowReasons(user)[0]
const crossDomainRecommendations = computed(() => (
  (crossDomainPage.value?.items || []).filter((item) => item.item.post)
))
const crossDomainFallbackReason = computed(() => crossDomainPage.value?.fallbackReason || '')
const sortedTags = computed(() => [...cleanTags.value].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)))
const contentTypeChannels = COMMUNITY_CONTENT_TYPES
const communityQuestionEntries = [
  {
    title: '热门问题',
    description: '查看正在被浏览和讨论的问题求助。',
    badge: '热门',
    href: { path: '/search', query: { type: String(POST_TYPE.QUESTION), sort: 'hot' } },
  },
  {
    title: '等待讨论',
    description: '按最新顺序查看刚发布的问题，给出第一条建议。',
    badge: '最新',
    href: { path: '/search', query: { type: String(POST_TYPE.QUESTION), sort: 'latest' } },
  },
  {
    title: '经验征集',
    description: '寻找正在征集真实经历和避坑反馈的问题。',
    badge: '标签',
    href: { path: '/search', query: { q: '经验征集', type: String(POST_TYPE.QUESTION), sort: 'hot' } },
  },
  {
    title: '求推荐',
    description: '围绕工具、书单、课程、城市生活等场景收集推荐。',
    badge: '推荐',
    href: { path: '/search', query: { q: '求推荐', type: String(POST_TYPE.QUESTION), sort: 'hot' } },
  },
]
const primaryChannelCards = computed<CommunityChannel[]>(() => COMMUNITY_CHANNELS)
const activeChannelKey = computed(() => {
  const value = Array.isArray(route.query.channel) ? route.query.channel[0] : route.query.channel
  return typeof value === 'string' ? value : ''
})
const activeChannel = computed(() => getCommunityChannel(activeChannelKey.value))
const activeChannelPostTypes = computed(() => activeChannel.value?.postTypes || [])
const activeChannelPostTypeSet = computed(() => new Set(activeChannelPostTypes.value.map((type) => Number(type))))
const activeListType = computed(() => activeChannelPostTypes.value.length === 1 ? activeChannelPostTypes.value[0] : undefined)
const activeDomain = computed<number | undefined>(() => {
  if (activeChannel.value?.domain) return activeChannel.value.domain
  const rawDomain = Array.isArray(route.query.domain) ? route.query.domain[0] : route.query.domain
  return isKnownDomain(rawDomain) ? Number(rawDomain) : undefined
})
const activeDomainLabel = computed(() => (
  activeChannel.value
    ? activeChannel.value.name
    : activeDomain.value == null
    ? '综合发现'
    : visibleDomains.value.find((item) => Number(item.domain) === Number(activeDomain.value))?.domainName || getDomainLabel(activeDomain.value)
))
const visibleDomains = computed(() => domains.value.length ? domains.value : localDomainConfigs)
const visibleLatestPosts = computed(() => {
  const allowedTypes = activeChannelPostTypeSet.value
  if (!allowedTypes.size) return cleanLatestPosts.value
  return cleanLatestPosts.value.filter((post) => allowedTypes.has(Number(post.postType)))
})
const domainSourceSummary = computed(() => (
  domainSource.value === 'remote'
    ? `已同步后端启用领域 · 当前 ${activeDomainLabel.value}`
    : `接口暂未返回，先展示默认 ${COMMUNITY_CHANNELS.length} 个主频道 · 当前 ${activeDomainLabel.value}`
))
const readingPostCount = computed(() => cleanLatestPosts.value.filter((post) => Number(post.domain) === DOMAIN.READING).length)
const hasAnyPublicSignals = computed(() => (
  cleanLatestPosts.value.length > 0
  || cleanTags.value.length > 0
  || cleanTopics.value.length > 0
  || cleanRecommendedUsers.value.length > 0
))
const isDataSparse = computed(() => (
  hasAnyPublicSignals.value
  && cleanLatestPosts.value.length < 4
  && cleanTags.value.length < 8
  && cleanTopics.value.length < 4
  && cleanRecommendedUsers.value.length < 4
))
const searchHotLink = computed<ExploreJumpTarget>(() => ({
  path: '/search',
  query: {
    sort: 'hot',
  },
}))
const defaultDomainEntry = computed(() => (
  visibleDomains.value.find((item) => Number(item.domain) === Number(activeDomain.value))
  ?? visibleDomains.value[0]
  ?? localDomainConfigs[0]
))
const readingDomainEntry = computed(() => (
  visibleDomains.value.find((item) => Number(item.domain) === DOMAIN.READING)
  ?? localDomainConfigs.find((item) => Number(item.domain) === DOMAIN.READING)
  ?? null
))
const readingDomainIntro = computed(() => {
  return readingDomainEntry.value?.browseNotice
    || '先把读书笔记、书单推荐和方法论摘录做成更容易发现的专题入口。'
})
const generatedTopicItems = computed<ExploreTopicEntry[]>(() => (
  buildTopicItems(cleanLatestPosts.value, cleanTags.value, 10).map((topic) => ({
    ...topic,
    href: { path: '/search', query: { q: topic.name, sort: 'hot' } },
  }))
))
const channelTopicItems = computed<ExploreTopicEntry[]>(() => {
  const channel = activeChannel.value
  if (!channel?.topics?.length) return []
  return channel.topics.slice(0, 6).map((name) => {
    const remote = cleanTopics.value.find((topic) => topic.name === name || topic.slug === name)
    return {
      name,
      count: Number(remote?.postCount ?? cleanLatestPosts.value.filter((post) => {
        const topicNames = Array.isArray(post.extension?.topicNames) ? post.extension.topicNames : []
        return topicNames.some((topicName) => String(topicName) === name)
      }).length),
      href: `/topics/${encodeURIComponent(remote?.slug || name)}`,
    }
  })
})
const baseTopicItems = computed<ExploreTopicEntry[]>(() => {
  const remoteTopics = cleanTopics.value.slice(0, 10).map((topic) => ({
    name: topic.name,
    count: Number(topic.postCount || 0),
    href: `/topics/${topic.slug}`,
  }))
  if (remoteTopics.length) return remoteTopics
  return generatedTopicItems.value
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

  if (!readingPostCount.value) return []

  return [
    { name: '读书笔记', count: readingPostCount.value, href: { path: '/search', query: { q: '读书笔记', sort: 'hot' } } },
    { name: '书单推荐', count: readingPostCount.value, href: { path: '/search', query: { q: '书单', sort: 'hot' } } },
    { name: '方法论摘录', count: readingPostCount.value, href: { path: '/search', query: { q: '方法论', sort: 'hot' } } },
  ]
})
const topicSourceMode = computed<'remote' | 'fallback' | 'placeholder'>(() => {
  if (cleanTopics.value.length) return 'remote'
  if (generatedTopicItems.value.length || readingTopicItems.value.length) return 'fallback'
  return 'placeholder'
})
const topicItems = computed<ExploreTopicEntry[]>(() => {
  const seen = new Set<string>()
  return [...channelTopicItems.value, ...readingTopicItems.value, ...baseTopicItems.value]
    .filter((item) => {
      const key = item.name.trim()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 10)
})
const displayTags = computed(() => {
  const channelTags = activeChannel.value?.tags || []
  if (!channelTags.length) return sortedTags.value
  const remoteByName = new Map(sortedTags.value.map((tag) => [tag.name, tag]))
  const scoped = channelTags.map((name, index) => (
    remoteByName.get(name) || {
      id: `channel-tag-${activeChannel.value?.key}-${index}`,
      name,
      slug: encodeURIComponent(name),
      count: 0,
    } as Tag
  ))
  return scoped.slice(0, 24)
})
const featuredPosts = computed(() => cleanLatestPosts.value.filter(isFeaturedPost).slice(0, 5))
const overviewStats = computed<ExploreStatItem[]>(() => [
  {
    label: '已开放领域',
    value: String(visibleDomains.value.length),
    detail: domainSource.value === 'remote' ? '按后端启用列表展示' : '当前为默认回退入口',
  },
  {
    label: '专题入口',
    value: String(topicItems.value.length),
    detail: topicSourceMode.value === 'remote' ? '优先来自社区话题' : topicSourceMode.value === 'fallback' ? '由标签与公开内容补位' : '等待内容沉淀',
  },
  {
    label: '热门标签',
    value: String(sortedTags.value.length),
    detail: sortedTags.value.length ? '可继续按兴趣扩展' : '标签还在沉淀中',
  },
  {
    label: '最新公开内容',
    value: String(visibleLatestPosts.value.length),
    detail: visibleLatestPosts.value.length ? '当前页展示最近样本' : '等待更多公开发布',
  },
])
const browseGuideCards = computed<ExploreGuideCard[]>(() => {
  const defaultDomain = defaultDomainEntry.value
  const topicOrTagTarget: ExploreJumpTarget = topicItems.value[0]?.href
    || (sortedTags.value[0] ? `/tag/${sortedTags.value[0].slug || sortedTags.value[0].id}` : searchHotLink.value)

  return [
    {
      title: '综合视角浏览',
      badge: '全领域入口',
      description: '先回到综合发现页查看全部公开内容，再决定往哪个领域或专题继续下钻。',
      cta: '回到综合发现',
      href: '/explore',
    },
    {
      title: activeDomain.value == null ? `从${defaultDomain?.domainName || '当前领域'}开始` : `继续浏览${activeDomainLabel.value}`,
      badge: '熟悉领域',
      description: defaultDomain?.browseNotice || '先从最熟悉的领域进入，再逐步扩展到相邻主题。',
      cta: '进入单领域视角',
      href: { path: '/explore', query: { domain: String(defaultDomain?.domain ?? DOMAIN.TECH) } },
    },
    {
      title: '顺着专题或标签扩展',
      badge: '继续下钻',
      description: topicItems.value[0]
        ? `可以先从「${topicItems.value[0].name}」继续扩展到相关内容。`
        : '专题还不多时，可以直接用热门标签和搜索入口继续浏览。',
      cta: '进入话题入口',
      href: topicOrTagTarget,
    },
    {
      title: '用知识关系拉宽视角',
      badge: '相邻主题',
      description: '从当前经验跳到相关概念、问题和学习路径，补足综合社区里的跨主题连接。',
      cta: '查看知识关系',
      href: '/knowledge/explore',
    },
  ]
})
const multiDomainEntryCards = computed<ExploreGuideCard[]>(() => [
  {
    title: '综合发现',
    badge: '回到全局',
    description: '不限制领域，先看当前页可见的综合社区入口。',
    cta: '查看全领域入口',
    href: '/explore',
  },
  {
    title: activeDomain.value == null ? `聚焦${defaultDomainEntry.value?.domainName || '综合内容'}` : `当前频道：${activeDomainLabel.value}`,
    badge: '熟悉方向',
    description: defaultDomainEntry.value?.interactionNotice || '在熟悉领域先建立判断，再继续扩展到相邻内容。',
    cta: '进入领域页',
    href: { path: '/explore', query: { domain: String(defaultDomainEntry.value?.domain ?? DOMAIN.TECH) } },
  },
  {
    title: '热门搜索',
    badge: '快速补位',
    description: '当专题、标签还不够多时，先用热度和关键词把入口补齐。',
    cta: '去热门内容',
    href: searchHotLink.value,
  },
  {
    title: '知识关系',
    badge: '跳到相关主题',
    description: '把单篇经验延伸到概念、问题和学习路径，保持综合社区的连通性。',
    cta: '进入关系探索',
    href: '/knowledge/explore',
  },
])
const loadFallbackNotes = computed(() => {
  const notes: string[] = []
  if (domainSource.value === 'fallback') notes.push('领域列表当前使用默认回退配置。')
  if (topicSourceMode.value === 'fallback') notes.push('话题入口正在用标签与公开内容临时补位。')
  if (requestStates.dashboard === 'failed') notes.push('内容频道计数已回退到当前公开样本。')
  if (requestStates.tags === 'failed') notes.push('热门标签接口暂未返回。')
  if (requestStates.users === 'failed') notes.push('推荐用户接口暂未返回。')
  if (requestStates.posts === 'failed') notes.push('最新发布接口暂未返回。')
  if (crossDomainStatus.value === 'degraded') notes.push('相关内容推荐包含回退结果。')
  if (authStore.isLoggedIn && crossDomainStatus.value === 'failed') notes.push('个性化相关内容推荐当前不可用。')
  return notes.slice(0, 4)
})
const overviewState = computed<ExploreOverviewState>(() => {
  if (!authStore.isLoggedIn) {
    return {
      tone: 'neutral',
      title: '未登录也能先逛公共内容',
      description: '频道入口、话题、标签和最新公开内容都可以先浏览；相关内容推荐、关注作者和作者数据会在登录后补全。',
      action: { kind: 'login', text: '登录后补全个性化入口' },
    }
  }
  if (requestStates.posts === 'failed' && requestStates.tags === 'failed' && requestStates.topics === 'failed') {
    return {
      tone: 'danger',
      title: '发现页正在降级展示',
      description: '核心内容接口暂未完整返回，当前仅保留默认领域入口和已返回的公开样本，你仍然可以继续浏览。',
      action: { kind: 'reload', text: '重新加载发现页' },
    }
  }
  if (!hasAnyPublicSignals.value) {
    return {
      tone: 'warning',
      title: '社区还在等待第一批公开内容',
      description: '公开内容、标签和话题还比较少，先补充第一篇复盘、笔记或资源分享，探索页的入口会随之变丰富。',
      action: { kind: 'route', text: '去发布第一篇内容', href: '/editor' },
    }
  }
  if (isDataSparse.value) {
    return {
      tone: 'warning',
      title: '数据还在积累，先从入口逛起',
      description: '当前公开样本偏少，建议先用多领域入口、热门搜索和知识关系把浏览路径拉开。',
      action: { kind: 'route', text: '去热门内容', href: '/search?sort=hot' },
    }
  }
  if (loadFallbackNotes.value.length) {
    return {
      tone: 'warning',
      title: '部分模块正在使用回退结果',
      description: '你看到的入口仍然可用，只是部分计数、话题或推荐会优先使用公开样本和默认配置补位。',
      action: { kind: 'route', text: '继续浏览综合入口', href: '/explore' },
    }
  }
  return {
    tone: 'success',
    title: '综合社区入口已就绪',
    description: '可以先按频道进入，再顺着话题、标签和知识关系扩展，逐步从单点兴趣走到跨主题浏览。',
  }
})
const crossDomainEmptyState = computed<ExploreEmptyStateModel>(() => {
  if (!hasAnyPublicSignals.value) {
    return {
      title: '公开内容还不足以形成相关推荐',
      description: '先补充一批公开内容样本，系统才能根据频道、话题和标签解释推荐理由。',
      actionText: '去发布',
      actionHref: '/editor',
    }
  }
  return {
    title: '当前还没有稳定的跨领域桥接线索',
    description: '可以继续完善关注领域、互动内容或公开发帖样本，系统会逐步形成可解释的桥接推荐。',
    actionText: '看作者数据',
    actionHref: '/growth/profile',
  }
})
const topicSectionNote = computed(() => {
  if (requestStates.topics === 'failed' && topicItems.value.length) {
    return '话题接口暂未返回，当前根据公开标签、频道和阅读关键词临时聚合入口。'
  }
  if (topicSourceMode.value === 'fallback' && topicItems.value.length) {
    return '话题仍在沉淀中，当前入口来自公开内容的临时聚合，适合先做浏览引导。'
  }
  if (topicItems.value.length > 0 && topicItems.value.length < 4) {
    return '当前话题数量还不多，可以配合热门标签和搜索入口继续扩展。'
  }
  return ''
})
const topicSectionNoteTone = computed(() => (
  requestStates.topics === 'failed' ? 'section-note--warning' : 'section-note--muted'
))
const topicEmptyState = computed<ExploreEmptyStateModel>(() => {
  if (requestStates.topics === 'failed' && requestStates.tags === 'failed' && requestStates.posts === 'failed') {
    return {
      title: '话题入口暂时不可用',
      description: '话题、标签和公开内容接口都没有完整返回，先用多频道入口或热门搜索继续浏览。',
      actionText: '去热门内容',
      actionHref: '/search?sort=hot',
    }
  }
  return {
    title: '话题还在沉淀',
    description: '发布内容并补充频道、场景或标签后，这里会逐步形成可浏览的话题入口。',
    actionText: '去发布',
    actionHref: '/editor',
  }
})
const tagSectionNote = computed(() => {
  if (sortedTags.value.length > 0 && sortedTags.value.length < 8) {
    return '热门标签还不多，当前更适合配合专题和搜索一起使用。'
  }
  return ''
})
const tagSectionNoteTone = computed(() => 'section-note--muted')
const tagEmptyState = computed<ExploreEmptyStateModel>(() => {
  if (requestStates.tags === 'failed') {
    return {
      title: '热门标签暂时不可用',
      description: '标签接口没有返回，先通过话题入口、搜索和最新发布继续浏览。',
      actionText: '去搜索',
      actionHref: '/search?sort=hot',
    }
  }
  return {
    title: '暂无标签',
    description: '发布内容时添加标签后会显示在这里，逐步形成更细粒度的综合社区入口。',
    actionText: '去发布',
    actionHref: '/editor',
  }
})
const userSectionNote = computed(() => {
  if (!authStore.isLoggedIn && cleanRecommendedUsers.value.length) {
    return '未登录时可以先浏览作者主页；关注、互动和个性化推荐需要登录后继续。'
  }
  if (cleanRecommendedUsers.value.length > 0 && cleanRecommendedUsers.value.length < 4) {
    return '当前作者样本偏少，更适合作为补充入口而不是唯一浏览路径。'
  }
  return ''
})
const userSectionNoteTone = computed(() => (
  !authStore.isLoggedIn ? 'section-note--warning' : 'section-note--muted'
))
const userEmptyState = computed<ExploreEmptyStateModel>(() => {
  if (requestStates.users === 'failed') {
    return {
      title: '推荐用户暂时不可用',
      description: '作者推荐接口没有返回，先用话题、标签和最新发布继续找人。',
      actionText: '去搜索用户',
      actionHref: '/search?mode=users',
    }
  }
  return {
    title: '暂无推荐用户',
    description: '活跃作者和实践者会展示在这里，帮助你从内容走到人。',
  }
})
const latestSectionNote = computed(() => {
  if (visibleLatestPosts.value.length > 0 && visibleLatestPosts.value.length < 4) {
    return '当前公开样本较少，建议配合多频道入口、话题和热门搜索一起浏览。'
  }
  return ''
})
const latestSectionNoteTone = computed(() => 'section-note--muted')
const channelSectionNote = computed(() => {
  if (requestStates.dashboard === 'failed') {
    return '近 30 天分布接口暂未返回，当前计数已回退到当前页可见的公开样本。'
  }
  if (cleanLatestPosts.value.length > 0 && cleanLatestPosts.value.length < 4) {
    return '当前内容样本偏少，频道计数仅供浏览引导参考。'
  }
  return ''
})
const channelSectionNoteTone = computed(() => (
  requestStates.dashboard === 'failed' ? 'section-note--warning' : 'section-note--muted'
))
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

const domainRiskLabel = (domain: number) => {
  const entry = visibleDomains.value.find((item) => Number(item.domain) === Number(domain))
  return riskLevelLabel(entry?.riskLevel)
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
    ...Array.from(techStacks).slice(0, 4).map((value) => ({ label: `标签：${value}`, value, type: 'techStack' as const })),
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

const sortLatestPosts = (items: Post[]) => (
  [...items].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
)

const uniquePostsById = (items: Post[]) => {
  const seen = new Set<string>()
  return items.filter((post) => {
    const key = String(post.postId)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const loadChannelLatestPosts = async () => {
  if (activeChannelPostTypes.value.length <= 1) {
    return postApi.list({
      size: 8,
      domain: activeDomain.value,
      type: activeListType.value,
    })
  }

  const settled = await Promise.allSettled(activeChannelPostTypes.value.map((type) => postApi.list({
    size: 8,
    domain: activeDomain.value,
    type,
  })))
  const items = settled.flatMap((result) => (
    result.status === 'fulfilled' ? (result.value.data?.items || []) : []
  ))
  return {
    data: {
      items: sortLatestPosts(uniquePostsById(items)).slice(0, 8),
    },
  }
}

const loadExploreData = async () => {
  isLoadingMeta.value = true
  isLoadingPosts.value = true
  crossDomainError.value = ''
  domains.value = [...localDomainConfigs]
  tags.value = []
  topics.value = []
  recommendedUsers.value = []
  latestPosts.value = []
  contentTypeDistribution.value = []
  domainSource.value = 'fallback'
  requestStates.domains = 'loading'
  requestStates.tags = 'loading'
  requestStates.topics = 'loading'
  requestStates.users = 'loading'
  requestStates.posts = 'loading'
  requestStates.dashboard = 'loading'
  requestStates.crossDomain = authStore.isLoggedIn ? 'loading' : 'idle'
  crossDomainStatus.value = authStore.isLoggedIn ? 'loading' : 'unauthenticated'
  const tasks: Array<Promise<any>> = [
    domainApi.listPublic(),
    postApi.getTags(),
    postApi.listTopics({ limit: 10 }),
    userApi.searchUsers('', 8),
    loadChannelLatestPosts(),
    dashboardApi.getTrendDashboard('30d', activeDomain.value),
  ]
  if (authStore.isLoggedIn) {
    tasks.push(recommendationsApi.listCrossDomain(undefined, 6))
  }
  const [domainRes, tagRes, topicRes, userRes, postRes, dashboardRes, crossDomainRes] = await Promise.allSettled(tasks)
  if (domainRes.status === 'fulfilled') {
    domains.value = domainRes.value.data || localDomainConfigs
    domainSource.value = domainRes.value.source
    requestStates.domains = 'ready'
  } else {
    requestStates.domains = 'failed'
  }
  if (tagRes.status === 'fulfilled') {
    tags.value = filterPublicContent(tagRes.value.data || [])
    requestStates.tags = 'ready'
  } else {
    requestStates.tags = 'failed'
  }
  if (topicRes.status === 'fulfilled') {
    topics.value = filterPublicContent(topicRes.value.data || [])
    requestStates.topics = 'ready'
  } else {
    requestStates.topics = 'failed'
  }
  if (userRes.status === 'fulfilled') {
    recommendedUsers.value = filterPublicContent(userRes.value.data || [])
    requestStates.users = 'ready'
  } else {
    requestStates.users = 'failed'
  }
  if (postRes.status === 'fulfilled') {
    latestPosts.value = filterPublicContent(postRes.value.data?.items || [])
    requestStates.posts = 'ready'
  } else {
    requestStates.posts = 'failed'
  }
  if (dashboardRes.status === 'fulfilled') {
    contentTypeDistribution.value = dashboardRes.value.data?.contentTypeDistribution || []
    requestStates.dashboard = 'ready'
  } else {
    requestStates.dashboard = 'failed'
  }
  if (!authStore.isLoggedIn) {
    crossDomainPage.value = null
    requestStates.crossDomain = 'idle'
  } else if (crossDomainRes?.status === 'fulfilled') {
    crossDomainPage.value = crossDomainRes.value.data
    crossDomainStatus.value = crossDomainRes.value.data?.degraded ? 'degraded' : 'ready'
    requestStates.crossDomain = 'ready'
  } else if (crossDomainRes?.status === 'rejected') {
    crossDomainPage.value = null
    crossDomainStatus.value = 'failed'
    crossDomainError.value = getErrorMessage(crossDomainRes.reason, '加载相关内容推荐失败')
    requestStates.crossDomain = 'failed'
  }
  isLoadingMeta.value = false
  isLoadingPosts.value = false
}

onMounted(async () => {
  await loadExploreData()
})

watch(() => [activeDomain.value, activeChannelKey.value], async ([nextDomain, nextChannel], [prevDomain, prevChannel]) => {
  if (nextDomain === prevDomain && nextChannel === prevChannel) return
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

.active-channel-panel {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid rgb(199 210 254);
  border-radius: 1rem;
  background: rgb(238 242 255 / 0.6);
  padding: 1rem;
}

.active-channel-panel span,
.active-channel-panel small {
  display: block;
  font-size: 0.75rem;
  color: rgb(79 70 229);
}

.active-channel-panel strong {
  display: block;
  margin-top: 0.25rem;
  font-size: 1rem;
  color: rgb(15 23 42);
}

.active-channel-panel p {
  margin-top: 0.35rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgb(71 85 105);
}

.domain-card--active {
  border-color: rgb(99 102 241);
  background: rgb(238 242 255 / 0.72);
}

.channel-card-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.channel-card-links span {
  border-radius: 999px;
  background: rgb(248 250 252);
  padding: 0.2rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: rgb(71 85 105);
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

.explore-overview {
  background:
    radial-gradient(circle at top right, rgb(224 242 254 / 0.92), transparent 34%),
    linear-gradient(180deg, rgb(255 255 255 / 0.98), rgb(248 250 252 / 0.95));
}

.overview-kicker,
.guide-card__badge,
.browse-link-card__badge,
.overview-status-card__eyebrow {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
}

.overview-kicker {
  background: rgb(224 231 255);
  padding: 0.34rem 0.72rem;
  color: rgb(79 70 229);
}

.overview-stat-card,
.guide-card,
.browse-link-card,
.overview-status-card {
  border: 1px solid rgb(226 232 240);
  border-radius: 1rem;
  background: rgb(255 255 255 / 0.84);
}

.overview-stat-card {
  padding: 0.95rem 1rem;
}

.overview-stat-card small {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  color: rgb(100 116 139);
}

.overview-stat-card strong {
  display: block;
  margin-top: 0.35rem;
  font-size: 1.45rem;
  line-height: 1.1;
  color: rgb(15 23 42);
}

.overview-stat-card p {
  margin-top: 0.35rem;
  font-size: 0.78rem;
  line-height: 1.55;
  color: rgb(71 85 105);
}

.overview-status-card {
  min-width: min(100%, 22rem);
  padding: 1rem 1.05rem;
  box-shadow: 0 10px 24px rgb(15 23 42 / 0.04);
}

.overview-status-card__eyebrow {
  padding: 0.3rem 0.62rem;
}

.overview-status-card h3 {
  margin-top: 0.7rem;
  font-size: 1rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.overview-status-card p {
  margin-top: 0.45rem;
  font-size: 0.84rem;
  line-height: 1.65;
  color: rgb(71 85 105);
}

.overview-status-card--neutral {
  border-color: rgb(191 219 254);
  background: rgb(248 250 255 / 0.95);
}

.overview-status-card--neutral .overview-status-card__eyebrow {
  background: rgb(219 234 254);
  color: rgb(29 78 216);
}

.overview-status-card--success {
  border-color: rgb(187 247 208);
  background: rgb(240 253 244 / 0.96);
}

.overview-status-card--success .overview-status-card__eyebrow {
  background: rgb(220 252 231);
  color: rgb(21 128 61);
}

.overview-status-card--warning {
  border-color: rgb(253 230 138);
  background: rgb(255 251 235 / 0.96);
}

.overview-status-card--warning .overview-status-card__eyebrow {
  background: rgb(254 243 199);
  color: rgb(180 83 9);
}

.overview-status-card--danger {
  border-color: rgb(254 205 211);
  background: rgb(255 241 242 / 0.96);
}

.overview-status-card--danger .overview-status-card__eyebrow {
  background: rgb(255 228 230);
  color: rgb(190 24 93);
}

.guide-card,
.browse-link-card {
  display: flex;
  min-height: 10.5rem;
  flex-direction: column;
  gap: 0.65rem;
  padding: 1rem;
  transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}

.guide-card:hover,
.browse-link-card:hover {
  border-color: rgb(165 180 252);
  background: rgb(248 250 255);
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgb(15 23 42 / 0.06);
}

.guide-card__badge,
.browse-link-card__badge {
  padding: 0.28rem 0.58rem;
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.guide-card h3,
.browse-link-card strong,
.browse-playbook__header h3 {
  font-size: 0.98rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.guide-card p,
.browse-link-card p,
.browse-playbook__header p {
  font-size: 0.82rem;
  line-height: 1.65;
  color: rgb(71 85 105);
}

.guide-card small,
.browse-link-card small {
  margin-top: auto;
  font-size: 0.76rem;
  font-weight: 800;
  color: rgb(79 70 229);
}

.overview-note-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgb(241 245 249);
  padding: 0.42rem 0.8rem;
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1.4;
  color: rgb(71 85 105);
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

.browse-playbook {
  border-top: 1px solid rgb(226 232 240);
  padding-top: 1.2rem;
}

.browse-playbook__header {
  margin-bottom: 0.95rem;
}

.browse-playbook__grid {
  display: grid;
  gap: 0.8rem;
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

.section-note {
  border-radius: 0.9rem;
  border: 1px solid rgb(226 232 240);
  padding: 0.85rem 0.95rem;
  font-size: 0.8125rem;
  line-height: 1.65;
}

.section-note--muted {
  background: rgb(248 250 252);
  color: rgb(71 85 105);
}

.section-note--warning {
  border-color: rgb(253 230 138);
  background: rgb(255 251 235);
  color: rgb(146 64 14);
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

.follow-reason {
  margin-top: 0.75rem;
  min-height: 2.5rem;
  border-radius: 0.625rem;
  background: rgb(238 242 255);
  padding: 0.55rem 0.65rem;
  color: rgb(67 56 202);
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1.45;
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

.dark .explore-overview {
  background:
    radial-gradient(circle at top right, rgb(30 64 175 / 0.24), transparent 34%),
    linear-gradient(180deg, rgb(15 23 42 / 0.98), rgb(2 6 23 / 0.95));
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

.dark .overview-kicker {
  background: rgb(49 46 129 / 0.52);
  color: rgb(199 210 254);
}

.dark .overview-stat-card,
.dark .guide-card,
.dark .browse-link-card,
.dark .overview-status-card {
  border-color: rgb(51 65 85 / 0.92);
  background: rgb(15 23 42 / 0.82);
  box-shadow: inset 0 1px 0 rgb(148 163 184 / 0.06);
}

.dark .overview-stat-card small,
.dark .overview-stat-card p,
.dark .overview-status-card p,
.dark .guide-card p,
.dark .browse-link-card p,
.dark .browse-playbook__header p {
  color: rgb(148 163 184);
}

.dark .overview-stat-card strong,
.dark .overview-status-card h3,
.dark .guide-card h3,
.dark .browse-link-card strong,
.dark .browse-playbook__header h3 {
  color: rgb(248 250 252);
}

.dark .overview-status-card--neutral {
  border-color: rgb(30 64 175 / 0.65);
  background: rgb(15 23 42 / 0.86);
}

.dark .overview-status-card--neutral .overview-status-card__eyebrow {
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

.dark .overview-status-card--success {
  border-color: rgb(22 101 52 / 0.72);
  background: rgb(5 46 22 / 0.58);
}

.dark .overview-status-card--success .overview-status-card__eyebrow {
  background: rgb(20 83 45);
  color: rgb(187 247 208);
}

.dark .overview-status-card--warning {
  border-color: rgb(120 53 15 / 0.82);
  background: rgb(67 20 7 / 0.45);
}

.dark .overview-status-card--warning .overview-status-card__eyebrow {
  background: rgb(120 53 15);
  color: rgb(253 230 138);
}

.dark .overview-status-card--danger {
  border-color: rgb(157 23 77 / 0.8);
  background: rgb(80 7 36 / 0.46);
}

.dark .overview-status-card--danger .overview-status-card__eyebrow {
  background: rgb(131 24 67);
  color: rgb(251 207 232);
}

.dark .guide-card:hover,
.dark .browse-link-card:hover {
  border-color: rgb(99 102 241 / 0.78);
  background: rgb(30 41 59 / 0.92);
  box-shadow: 0 18px 32px rgb(2 6 23 / 0.3);
}

.dark .guide-card__badge,
.dark .browse-link-card__badge {
  background: rgb(49 46 129 / 0.55);
  color: rgb(199 210 254);
}

.dark .guide-card small,
.dark .browse-link-card small {
  color: rgb(165 180 252);
}

.dark .overview-note-chip {
  background: rgb(30 41 59 / 0.88);
  color: rgb(203 213 225);
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

.dark .active-channel-panel,
.dark .domain-card--active {
  border-color: rgb(99 102 241 / 0.78);
  background: rgb(30 41 59 / 0.88);
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
.dark .reading-spotlight strong,
.dark .active-channel-panel strong {
  color: rgb(248 250 252);
}

.dark .domain-card p,
.dark .reading-spotlight p,
.dark .reading-topic-chip,
.dark .active-channel-panel p {
  color: rgb(148 163 184);
}

.dark .domain-card small,
.dark .active-channel-panel span,
.dark .active-channel-panel small {
  color: rgb(100 116 139);
}

.dark .channel-card-links span {
  background: rgb(30 41 59 / 0.9);
  color: rgb(203 213 225);
}

.dark .browse-playbook {
  border-top-color: rgb(51 65 85 / 0.9);
}

.dark .section-note--muted {
  border-color: rgb(51 65 85 / 0.9);
  background: rgb(2 6 23 / 0.55);
  color: rgb(148 163 184);
}

.dark .section-note--warning {
  border-color: rgb(154 52 18);
  background: rgb(67 20 7 / 0.45);
  color: rgb(253 186 116);
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

.dark .follow-reason {
  background: rgb(49 46 129 / 0.5);
  color: rgb(199 210 254);
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

@media (min-width: 768px) {
  .browse-playbook__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
