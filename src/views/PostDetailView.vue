<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div class="lg:col-span-2">
          <LoadingSkeleton v-if="isLoading" />

          <template v-else-if="post">
            <section class="mb-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div class="flex items-center justify-between gap-4">
                <RouterLink v-if="canOpenAuthorProfile" :to="authorProfileTo" class="flex min-w-0 items-center gap-3">
                  <div class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-600 font-bold text-white">
                    <img v-if="post.author.avatar" :src="post.author.avatar" :alt="post.author.nickname" class="h-full w-full object-cover" />
                    <span v-else>{{ post.author.nickname.charAt(0) || '?' }}</span>
                  </div>
                  <div class="min-w-0">
                    <h3 class="truncate font-semibold text-slate-900 dark:text-slate-100">{{ post.author.nickname || '未知用户' }}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400">{{ formatTime(post.createdAt) }}</p>
                  </div>
                </RouterLink>
                <div v-else class="flex min-w-0 items-center gap-3">
                  <div class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-600 font-bold text-white">
                    <img v-if="post.author.avatar" :src="post.author.avatar" :alt="post.author.nickname" class="h-full w-full object-cover" />
                    <span v-else>{{ post.author.nickname.charAt(0) || '?' }}</span>
                  </div>
                  <div class="min-w-0">
                    <h3 class="truncate font-semibold text-slate-900 dark:text-slate-100">{{ post.author.nickname || '未知用户' }}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400">{{ formatTime(post.createdAt) }}</p>
                  </div>
                </div>
                <button
                  v-if="canFollowAuthor"
                  type="button"
                  class="rounded-lg border border-primary-600 px-4 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-800"
                  :disabled="isFollowingAuthor"
                  @click="toggleFollowAuthor"
                >
                  {{ post.author.isFollowing ? '已关注' : '关注' }}
                </button>
              </div>
            </section>

            <article class="mb-6 rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
              <div class="mb-4 flex flex-wrap items-center gap-3">
                <span class="content-type-pill">{{ contentTypeLabel }}</span>
                <span v-if="post.domain" class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
                  {{ getDomainIcon(post.domain) }} {{ getDomainLabel(post.domain) }}
                </span>
                <span v-if="post.extension?.difficulty" class="meta-pill">{{ post.extension.difficulty }}</span>
                <span v-if="post.extension?.scenario" class="meta-pill">{{ post.extension.scenario }}</span>
              </div>
              <h1 class="mb-4 text-3xl font-bold leading-tight text-slate-900 dark:text-slate-100">{{ post.title }}</h1>
              <div
                v-if="searchEntryNotice"
                class="mb-6 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-800 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200"
                role="status"
                aria-live="polite"
              >
                {{ searchEntryNotice }}
              </div>

              <div
                v-if="publishStatusItems.length"
                class="publish-status-bar mb-6"
                role="status"
                aria-live="polite"
              >
                <div class="publish-status-head">
                  <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">发布状态</span>
                  <span class="text-xs text-slate-500 dark:text-slate-400">{{ publishStatusSummary }}</span>
                </div>
                <div class="publish-status-grid">
                  <span
                    v-for="item in publishStatusItems"
                    :key="item.key"
                    :class="['publish-status-pill', item.ok ? 'publish-status-ok' : 'publish-status-warn']"
                    :title="item.detail"
                  >
                    <span class="publish-status-dot" />
                    {{ item.label }}
                  </span>
                </div>
              </div>

              <div v-if="post.extension" class="mb-6 flex flex-wrap gap-3 border-b border-slate-200 pb-6 dark:border-slate-800">
                <span v-for="stack in visibleTechStacks" :key="stack" class="meta-pill">技术栈：{{ stack }}</span>
                <span v-if="isLegacyInterview && post.extension.company" class="meta-pill">公司：{{ post.extension.company }}</span>
                <span v-if="isLegacyInterview && post.extension.position" class="meta-pill">岗位：{{ post.extension.position }}</span>
                <span v-if="isLegacyInterview && post.extension.yearsOfExp" class="meta-pill">年限：{{ post.extension.yearsOfExp }} 年</span>
                <span v-if="isLegacyInterview && post.extension.interviewResult" class="rounded px-2 py-1 text-xs font-medium" :class="getResultClass(post.extension.interviewResult)">
                  {{ getResultText(post.extension.interviewResult) }}
                </span>
              </div>

              <div class="prose mb-8 max-w-none dark:prose-invert">
                <MarkdownRenderer :content="post.content" />
              </div>

              <section
                v-if="domainDetailSurface"
                :class="['domain-detail-panel', `domain-detail-${domainDetailSurface.tone}`]"
              >
                <div class="domain-detail-head">
                  <div>
                    <p>{{ getDomainLabel(post.domain) }}</p>
                    <h2>{{ domainDetailSurface.title }}</h2>
                  </div>
                </div>
                <p class="domain-detail-description">{{ domainDetailSurface.description }}</p>

                <div v-if="domainDetailSurface.items.length" class="domain-detail-grid">
                  <article v-for="item in domainDetailSurface.items" :key="item.label" class="domain-detail-item">
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                  </article>
                </div>

                <div v-if="domainDetailSurface.chips.length" class="domain-detail-chips">
                  <span
                    v-for="chip in domainDetailSurface.chips"
                    :key="chip.label"
                    :class="['domain-detail-chip', `domain-detail-chip-${chip.tone}`]"
                  >
                    {{ chip.label }}
                  </span>
                </div>

                <div v-if="domainDetailSurface.images.length" class="domain-detail-gallery">
                  <img
                    v-for="(image, index) in domainDetailSurface.images"
                    :key="image"
                    :src="image"
                    :alt="`${domainDetailSurface.title} ${index + 1}`"
                  />
                </div>

                <div v-if="domainDetailSurface.riskNotice" class="domain-detail-risk-notice" role="note">
                  {{ domainDetailSurface.riskNotice }}
                </div>
              </section>

              <section v-if="showStageTwoDetailPanels && (knowledgeSummary || knowledgeTags.length || knowledgeFaqs.length || knowledgeCardItems.length)" class="knowledge-panel mb-8">
                <div class="mb-3 flex items-center justify-between gap-3">
                  <h2 class="text-base font-bold text-slate-950 dark:text-slate-50">知识沉淀</h2>
                  <span class="ai-pill">AI 辅助</span>
                </div>
                <div v-if="knowledgeTags.length" class="mb-4 flex flex-wrap gap-2">
                  <RouterLink
                    v-for="tag in knowledgeTags"
                    :key="tag"
                    :to="{ path: '/search', query: { q: tag, sort: 'relevance' } }"
                    class="knowledge-tag"
                  >
                    {{ tag }}
                  </RouterLink>
                </div>
                <p v-if="knowledgeSummary" class="text-sm leading-6 text-slate-600 dark:text-slate-300">{{ knowledgeSummary }}</p>
                <div v-if="knowledgeCardItems.length" class="mt-4 grid gap-3 md:grid-cols-2">
                  <div v-for="item in knowledgeCardItems" :key="item.label" class="knowledge-card">
                    <strong>{{ item.label }}</strong>
                    <p>{{ item.value }}</p>
                  </div>
                </div>
                <div v-if="knowledgeFaqs.length" class="mt-4 space-y-3">
                  <article v-for="faq in knowledgeFaqs" :key="faq.q || faq.question" class="knowledge-card">
                    <strong>{{ faq.q || faq.question }}</strong>
                    <p>{{ faq.a || faq.answer }}</p>
                  </article>
                </div>
              </section>

              <section v-if="showStageTwoDetailPanels" class="ai-knowledge-assistant mb-8" aria-label="AI 知识助手">
                <div class="ai-knowledge-head">
                  <div>
                    <p>AI 知识助手</p>
                    <h2>把这篇经验整理成可复用资产</h2>
                  </div>
                  <span :class="['ai-confidence-pill', aiKnowledgeConfidenceTone]">{{ aiKnowledgeConfidenceText }}</span>
                </div>
                <div class="ai-knowledge-grid">
                  <article v-for="item in aiKnowledgeInsights" :key="item.label" class="ai-knowledge-card">
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                    <p>{{ item.detail }}</p>
                  </article>
                </div>
                <div class="ai-knowledge-actions">
                  <RouterLink :to="{ path: '/questions', query: knowledgeTopicQuery }">查看结构化知识卡</RouterLink>
                  <RouterLink :to="{ path: '/search', query: knowledgeSearchQuery }">合并相似经验</RouterLink>
                  <RouterLink to="/me/prep">生成个人复盘建议</RouterLink>
                </div>
              </section>

              <section v-if="showStageTwoDetailPanels" class="interview-material-panel mb-8" aria-label="面试素材包">
                <div class="interview-material-head">
                  <div>
                    <p class="plan-kicker">面试素材包</p>
                    <h2>把真实经历整理成可讲的项目故事</h2>
                    <span>{{ materialPack ? materialStatusText : '从正文、标签和结构化字段生成 STAR、简历 bullet 和追问清单' }}</span>
                  </div>
                  <div class="interview-material-actions">
                    <button
                      type="button"
                      class="interview-material-primary"
                      :disabled="isGeneratingMaterial"
                      @click="handleGenerateMaterial"
                    >
                      {{ isGeneratingMaterial ? '生成中...' : materialPack ? '重新生成' : '生成素材' }}
                    </button>
                    <button
                      v-if="materialPack"
                      type="button"
                      class="interview-material-secondary"
                      :disabled="isSavingMaterial"
                      @click="handleSaveMaterial"
                    >
                      {{ isSavingMaterial ? '保存中...' : '保存编辑' }}
                    </button>
                    <button
                      v-if="materialPack"
                      type="button"
                      class="interview-material-secondary"
                      :disabled="isSavingMaterialToPrep || materialPack.savedToPrep"
                      @click="handleSaveMaterialToPrep"
                    >
                      {{ materialPack.savedToPrep ? '已归档' : isSavingMaterialToPrep ? '归档中...' : '归档到备战' }}
                    </button>
                  </div>
                </div>

                <div v-if="!authStore.isLoggedIn" class="interview-material-empty">
                  <strong>登录后可生成个人素材包</strong>
                  <p>素材包默认只保存到你的个人空间，后续可在备战页按公司、岗位和技术栈回看。</p>
                  <button type="button" @click="requireLogin()">去登录</button>
                </div>
                <div v-else-if="isLoadingMaterial" class="interview-material-empty">
                  <strong>正在加载素材包</strong>
                  <p>已有素材会自动带出，方便继续编辑。</p>
                </div>
                <div v-else-if="materialErrorMessage" class="interview-material-error">
                  <span>{{ materialErrorMessage }}</span>
                  <button type="button" @click="loadInterviewMaterial">重试</button>
                </div>
                <div v-else-if="materialPack" class="interview-material-form">
                  <div class="star-grid">
                    <label>
                      <span>S 情境</span>
                      <textarea v-model="materialForm.starSituation" rows="4" maxlength="2000" />
                    </label>
                    <label>
                      <span>T 任务</span>
                      <textarea v-model="materialForm.starTask" rows="4" maxlength="2000" />
                    </label>
                    <label>
                      <span>A 行动</span>
                      <textarea v-model="materialForm.starAction" rows="5" maxlength="3000" />
                    </label>
                    <label>
                      <span>R 结果</span>
                      <textarea v-model="materialForm.starResult" rows="5" maxlength="2000" />
                    </label>
                  </div>
                  <div class="material-list-grid">
                    <label>
                      <span>简历 bullet</span>
                      <textarea v-model="materialForm.resumeBulletsText" rows="5" placeholder="每行一条" />
                    </label>
                    <label>
                      <span>面试官追问</span>
                      <textarea v-model="materialForm.followUpQuestionsText" rows="5" placeholder="每行一条" />
                    </label>
                    <label>
                      <span>技术亮点</span>
                      <textarea v-model="materialForm.technicalHighlightsText" rows="5" placeholder="每行一条" />
                    </label>
                    <label>
                      <span>素材缺口</span>
                      <textarea v-model="materialForm.missingHintsText" rows="5" placeholder="每行一条" />
                    </label>
                  </div>
                  <label class="material-note-field">
                    <span>个人备注</span>
                    <textarea v-model="materialForm.userNote" rows="3" maxlength="1000" placeholder="补充你要在面试中强调的表达口径" />
                  </label>
                </div>
                <div v-else class="interview-material-empty">
                  <strong>还没有素材包</strong>
                  <p>建议先生成一版，再补充指标、取舍和复盘结论。</p>
                </div>
              </section>

              <section v-if="showStageTwoDetailPanels" class="knowledge-path-panel mb-8" aria-label="知识资产路径">
                <div>
                  <p class="knowledge-path-kicker">知识资产路径</p>
                  <h2>从经验帖到可复用知识</h2>
                  <p>
                    这篇内容会沿着摘要、知识卡、主题路径和个人复盘空间继续沉淀，方便后续搜索、讨论和回看。
                  </p>
                </div>
                <div class="knowledge-path-steps">
                  <article v-for="step in knowledgePathSteps" :key="step.title" class="knowledge-path-step">
                    <span>{{ step.index }}</span>
                    <strong>{{ step.title }}</strong>
                    <p>{{ step.description }}</p>
                  </article>
                </div>
                <div class="knowledge-path-actions">
                  <RouterLink :to="{ path: '/questions', query: knowledgeTopicQuery }">查看知识卡</RouterLink>
                  <RouterLink :to="{ path: '/search', query: knowledgeSearchQuery }">发现相似经验</RouterLink>
                  <RouterLink to="/me/prep">加入个人复盘空间</RouterLink>
                </div>
              </section>

              <PostQuestionBlock v-if="showStageTwoDetailPanels" :post-id="post.postId" />

              <div v-if="post.tags.length" class="mb-8 flex flex-wrap gap-2 border-b border-slate-200 pb-8 dark:border-slate-800">
                <RouterLink
                  v-for="tag in post.tags"
                  :key="tag.id"
                  :to="`/tag/${tag.slug || tag.id}`"
                  class="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 transition-colors hover:bg-primary-100 hover:text-primary-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-primary-950"
                >
                  {{ tag.name }}
                </RouterLink>
              </div>

              <InteractionBar
                :post="post"
                :like-pending="isTogglingLike"
                :favorite-pending="isTogglingFavorite"
                @like="handleLike"
                @favorite="handleFavorite"
              />
              <p
                v-if="interactionFeedback"
                class="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"
                role="status"
                aria-live="polite"
              >
                {{ interactionFeedback }}
              </p>

              <div v-if="authStore.isLoggedIn" class="mt-4 flex justify-end gap-3">
                <template v-if="isOwnPost">
                  <button
                    v-if="canViewVersionHistory"
                    type="button"
                    class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    :disabled="isLoadingVersions"
                    @click="openVersionHistory"
                  >
                    {{ isLoadingVersions ? '加载中...' : '版本历史' }}
                  </button>
                  <RouterLink
                    :to="`/editor/${post.postId}`"
                    class="rounded-lg border border-primary-600 px-3 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 dark:hover:bg-slate-800"
                  >
                    编辑帖子
                  </RouterLink>
                  <button
                    type="button"
                    class="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
                    :disabled="isDeletingPost"
                    @click="handleDeletePost"
                  >
                    {{ isDeletingPost ? '删除中...' : '删除帖子' }}
                  </button>
                </template>
                <template v-else>
                  <button
                    v-if="canViewVersionHistory"
                    type="button"
                    class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    :disabled="isLoadingVersions"
                    @click="openVersionHistory"
                  >
                    {{ isLoadingVersions ? '加载中...' : '版本历史' }}
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    :disabled="isReporting"
                    @click="openPostReportDialog"
                  >
                    举报帖子
                  </button>
                </template>
              </div>
            </article>

            <section class="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
              <h2 class="mb-6 text-xl font-bold text-slate-900 dark:text-slate-100">评论（{{ post.counter.comment }}）</h2>

              <div v-if="authStore.isLoggedIn" class="mb-6 border-b border-slate-200 pb-6 dark:border-slate-800">
                <textarea
                  v-model="commentText"
                  rows="3"
                  placeholder="分享你的想法..."
                  class="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <div class="mt-3 flex justify-end gap-2">
                  <button type="button" class="rounded-lg px-4 py-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" @click="commentText = ''">
                    取消
                  </button>
                  <button
                    type="button"
                    class="rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="!commentText.trim() || isSubmittingComment"
                    @click="handleSubmitComment"
                  >
                    {{ isSubmittingComment ? '发送中...' : '发送' }}
                  </button>
                </div>
              </div>

              <div v-if="isLoadingComments" class="rounded-lg border border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                正在加载评论...
              </div>
              <div v-else-if="commentsErrorMessage" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-200">
                <p class="font-semibold">{{ commentsErrorMessage }}</p>
                <button type="button" class="mt-4 rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900/40" @click="loadComments(true)">
                  重试
                </button>
              </div>
              <CommentTree
                ref="commentTreeRef"
                v-else
                :post-id="postId"
                :comments="comments"
                :can-like-comments="authStore.isLoggedIn"
                :can-report-comments="true"
                :can-reply-comments="authStore.isLoggedIn"
                @require-login="requireLogin"
                @like-comment="handleLikeComment"
                @unlike-comment="handleUnlikeComment"
                @reply-comment="handleReplyComment"
                @delete-comment="handleDeleteComment"
                @report-comment="openCommentReportDialog"
              />
              <div v-if="hasMoreComments" class="mt-6 text-center">
                <button
                  type="button"
                  class="rounded-lg border border-primary-600 px-5 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-800"
                  :disabled="isLoadingMoreComments"
                  @click="loadMoreComments"
                >
                  {{ isLoadingMoreComments ? '加载中...' : '加载更多评论' }}
                </button>
              </div>
            </section>
          </template>

          <EmptyState v-else :title="postUnavailableTitle" :description="postUnavailableDescription" actionText="返回首页" actionHref="/" />
        </div>

        <aside class="hidden lg:block">
          <div class="sticky top-24 space-y-6">
            <section v-if="post" class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 class="mb-4 font-bold text-slate-900 dark:text-slate-100">作者信息</h3>
              <RouterLink v-if="canOpenAuthorProfile" :to="authorProfileTo" class="flex flex-col items-center text-center">
                <div class="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary-600 text-2xl font-bold text-white">
                  <img v-if="post.author.avatar" :src="post.author.avatar" :alt="post.author.nickname" class="h-full w-full object-cover" />
                  <span v-else>{{ post.author.nickname.charAt(0) || '?' }}</span>
                </div>
                <h4 class="font-semibold text-slate-900 dark:text-slate-100">{{ post.author.nickname || '未知用户' }}</h4>
                <p class="mt-1 line-clamp-3 text-xs text-slate-500 dark:text-slate-400">{{ post.author.signature || '暂无签名' }}</p>
              </RouterLink>
              <div v-else class="flex flex-col items-center text-center">
                <div class="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary-600 text-2xl font-bold text-white">
                  <img v-if="post.author.avatar" :src="post.author.avatar" :alt="post.author.nickname" class="h-full w-full object-cover" />
                  <span v-else>{{ post.author.nickname.charAt(0) || '?' }}</span>
                </div>
                <h4 class="font-semibold text-slate-900 dark:text-slate-100">{{ post.author.nickname || '未知用户' }}</h4>
                <p class="mt-1 line-clamp-3 text-xs text-slate-500 dark:text-slate-400">{{ post.author.signature || '暂无签名' }}</p>
              </div>
            </section>

            <section class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 class="mb-4 font-bold text-slate-900 dark:text-slate-100">相关帖子</h3>
              <div v-if="relatedPosts.length" class="space-y-3">
                <RouterLink
                  v-for="item in relatedPosts"
                  :key="item.postId"
                  :to="`/post/${item.postId}`"
                  class="block rounded-lg p-3 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div class="line-clamp-2 text-sm font-medium text-slate-900 dark:text-slate-100">{{ item.title }}</div>
                  <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ item.counter.view }} 浏览</div>
                </RouterLink>
              </div>
              <p v-else class="text-sm text-slate-500 dark:text-slate-400">暂无相关内容</p>
            </section>
          </div>
        </aside>
      </div>
    </main>

    <div v-if="isReportDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" @click.self="closeReportDialog">
      <form class="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900" @submit.prevent="submitReport">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-slate-950 dark:text-slate-50">{{ reportTarget.type === 'comment' ? '举报评论' : '举报帖子' }}</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">说明问题后提交给管理员审核。</p>
          </div>
          <button type="button" class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="closeReportDialog">
            关闭
          </button>
        </div>

        <label class="mt-5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          举报类型
          <select v-model="reportForm.reason" class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
            <option value="SPAM">垃圾广告</option>
            <option value="ABUSE">攻击辱骂</option>
            <option value="PRIVACY">隐私泄露</option>
            <option value="OTHER">其他问题</option>
          </select>
        </label>

        <label class="mt-4 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          补充说明
          <textarea
            v-model.trim="reportForm.detail"
            rows="4"
            maxlength="1000"
            placeholder="Describe the content that needs review"
            class="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>

        <div class="mt-5 flex justify-end gap-3">
          <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="closeReportDialog">
            取消
          </button>
          <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60" :disabled="isReporting">
            {{ isReporting ? '提交中...' : '提交举报' }}
          </button>
        </div>
      </form>
    </div>

    <div v-if="isVersionDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" @click.self="closeVersionHistory">
      <section class="version-dialog w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="version-history-title">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 id="version-history-title" class="text-lg font-bold text-slate-950 dark:text-slate-50">版本历史</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">展示最近编辑前的内容快照，便于作者回看和内容审计。</p>
          </div>
          <button type="button" class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="closeVersionHistory">
            关闭
          </button>
        </div>

        <div class="mt-5 flex justify-end">
          <button type="button" class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" :disabled="isLoadingVersions" @click="loadVersionHistory">
            {{ isLoadingVersions ? '刷新中...' : '刷新' }}
          </button>
        </div>

        <div v-if="isLoadingVersions" class="mt-5 rounded-lg border border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          正在加载版本历史...
        </div>
        <div v-else-if="versionHistories.length === 0" class="mt-5 rounded-lg border border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          暂无历史版本
        </div>
        <div v-else class="version-list mt-5">
          <article v-for="item in versionHistories" :key="item.id" class="version-item">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{{ item.title }}</div>
                <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {{ formatTime(item.createdAt) }} / v{{ item.baseVersion ?? 0 }} / {{ changeSummaryText(item.changeSummary) }}
                </div>
              </div>
              <div v-if="item.editorUid" class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                编辑者编号 {{ item.editorUid }}
              </div>
            </div>
            <p class="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ item.contentSummary || item.content }}</p>
            <div v-if="item.tags.length" class="mt-3 flex flex-wrap gap-2">
              <span v-for="tag in item.tags" :key="tag.id" class="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ tag.name }}</span>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { postApi, type InterviewMaterialPack } from '@/api/post'
import { interactionApi } from '@/api/interaction'
import { userApi } from '@/api/user'
import { opsApi, type MyAdminPermissions } from '@/api/ops'
import { useAuthStore } from '@/stores/auth'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import AppHeader from '@/components/layout/AppHeader.vue'
import MarkdownRenderer from '@/components/post/MarkdownRenderer.vue'
import InteractionBar from '@/components/post/InteractionBar.vue'
import CommentTree from '@/components/post/CommentTree.vue'
import PostQuestionBlock from '@/components/question/PostQuestionBlock.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { formatTime } from '@/lib/format'
import { toast } from 'vue-sonner'
import { BizException, getErrorMessage } from '@/api/client'
import type { Comment, Post, PostPublishStatus, PostVersionHistory } from '@/api/types'
import { getContentTypeLabel, isLegacyInterviewType } from '@/utils/contentTypes'
import { getDomainIcon, getDomainLabel } from '@/utils/domains'
import { buildDomainDetailSurface } from '@/utils/domainPostSurfaces'
import { applyPageSeo, summarizeSeoText } from '@/utils/seo'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { requireLogin } = useLoginRedirect()

const adminPermissions = ref<MyAdminPermissions | null>(null)
const versionHistories = ref<PostVersionHistory[]>([])
const isVersionDialogOpen = ref(false)
const isLoadingVersions = ref(false)
const versionLoadAttempted = ref(false)
const showStageTwoDetailPanels = false
const postId = computed(() => route.params.id as string)
const commentText = ref('')
const isSubmittingComment = ref(false)
const isReporting = ref(false)
const isDeletingPost = ref(false)
const isTogglingLike = ref(false)
const isTogglingFavorite = ref(false)
const interactionFeedback = ref('')
const isReportDialogOpen = ref(false)
const isFollowingAuthor = ref(false)
const reportForm = ref({ reason: 'OTHER', detail: '' })
const reportTarget = ref<{ type: 'post' | 'comment'; id?: Comment['commentId'] }>({ type: 'post' })
const comments = ref<Comment[]>([])
const commentTreeRef = ref<{ markCommentLikeSettled: (commentId: Comment['commentId']) => void } | null>(null)
const relatedPosts = ref<Post[]>([])
const commentCursor = ref<string | undefined>()
const hasMoreComments = ref(false)
const isLoadingComments = ref(false)
const isLoadingMoreComments = ref(false)
const commentsErrorMessage = ref('')
const materialPack = ref<InterviewMaterialPack | null>(null)
const isLoadingMaterial = ref(false)
const isGeneratingMaterial = ref(false)
const isSavingMaterial = ref(false)
const isSavingMaterialToPrep = ref(false)
const materialErrorMessage = ref('')
const materialForm = ref({
  starSituation: '',
  starTask: '',
  starAction: '',
  starResult: '',
  resumeBulletsText: '',
  followUpQuestionsText: '',
  technicalHighlightsText: '',
  missingHintsText: '',
  userNote: '',
})

const { data: postData, isLoading, error: postError } = useQuery({
  queryKey: computed(() => ['post', postId.value]),
  queryFn: () => postApi.getDetail(postId.value),
  enabled: computed(() => Boolean(postId.value)),
  retry: false,
})

const { data: publishStatusData } = useQuery({
  queryKey: computed(() => ['post-publish-status', postId.value]),
  queryFn: () => postApi.getPublishStatus(postId.value),
  enabled: computed(() => Boolean(postId.value)),
  retry: false,
})

const clonePost = (source?: Post | null): Post | null => {
  if (!source) return null
  return {
    ...source,
    author: { ...source.author },
    counter: { ...source.counter },
    extension: source.extension ? { ...source.extension } : undefined,
    myInteraction: source.myInteraction ? { ...source.myInteraction } : undefined,
    tags: [...source.tags],
  }
}

const post = ref<Post | null>(null)
const publishStatus = computed<PostPublishStatus | null>(() => publishStatusData.value?.data || null)
const authorUid = computed(() => String(post.value?.author.uid ?? ''))
const isOwnPost = computed(() => String(authStore.user?.uid ?? '') === String(post.value?.author.uid ?? ''))
const isAnonymousMaskedAuthor = computed(() => Boolean(post.value?.anonymous)
  && (authorUid.value === '' || authorUid.value === '0' || post.value?.author.profileVisible === false))
const canOpenAuthorProfile = computed(() => Boolean(post.value)
  && !isAnonymousMaskedAuthor.value
  && post.value?.author.profileVisible !== false
  && authorUid.value !== ''
  && authorUid.value !== '0')
const canFollowAuthor = computed(() => canOpenAuthorProfile.value && !isOwnPost.value)
const authorProfileTo = computed(() => `/u/${authorUid.value}`)
const safeSearchFallbackReason = (reason: string) => {
  const labels: Record<string, string> = {
    elasticsearch_empty: '索引首屏无可见结果，已补充数据库结果',
    elasticsearch_visibility_filtered: '索引结果经可见性过滤后不足，已补充数据库结果',
    elasticsearch_unavailable: 'Elasticsearch 不可用',
    hot_sort_mysql: '热门排序使用数据库热度',
    search_api_error: '搜索请求失败',
  }
  return labels[reason] || ''
}
const searchEntryNotice = computed(() => {
  if (route.query.from !== 'search') return ''
  const source = typeof route.query.source === 'string' ? route.query.source : ''
  const degraded = route.query.degraded === '1'
  const fallbackReason = typeof route.query.fallbackReason === 'string' ? route.query.fallbackReason : ''
  const scanLimit = typeof route.query.scanLimit === 'string' && /^\d+$/.test(route.query.scanLimit)
    ? route.query.scanLimit
    : ''
  const testDataMode = route.query.includeTestData === '1'
  const sourceText = source === 'elasticsearch'
    ? '来自实时搜索索引'
    : source === 'mysql'
      ? '来自数据库兜底搜索'
      : source === 'client_fallback'
        ? '来自客户端兜底入口'
        : '来自搜索结果'
  const parts = [sourceText]
  if (degraded) parts.push('本次搜索处于降级链路')
  const reasonText = safeSearchFallbackReason(fallbackReason)
  if (reasonText) parts.push(`原因：${reasonText}`)
  if (scanLimit) parts.push(`扫描上限 ${scanLimit} 条`)
  if (testDataMode) parts.push('已开启测试数据模式')
  return parts.join('，')
})
const publishStatusItems = computed(() => {
  const status = publishStatus.value
  if (!status) return []
  const outboxLatest = status.outbox?.latest
  const retryTask = status.index?.retryTask
  return [
    {
      key: 'database',
      label: status.database?.landed ? '已落库' : '未确认落库',
      ok: Boolean(status.database?.landed),
      detail: status.database?.publiclyVisible ? '公开列表可见' : status.database?.visibleWithTestData ? '仅测试数据模式可见' : '数据库暂未返回公开可见记录',
    },
    {
      key: 'index',
      label: status.index?.documentFound ? '索引已写入' : retryTask ? '索引待补偿' : '索引待确认',
      ok: Boolean(status.index?.documentFound) || Boolean(retryTask),
      detail: retryTask
        ? `补偿任务 ${(retryTask.statusText || retryTask.status) ?? 'unknown'}，重试 ${retryTask.retryCount ?? 0} 次`
        : (status.index?.documentFound ? 'Elasticsearch 文档可读' : '可能存在索引延迟或降级'),
    },
    {
      key: 'search',
      label: status.search?.visible ? '搜索可见' : '搜索待同步',
      ok: Boolean(status.search?.visible),
      detail: status.search?.fallbackReason ? `搜索来源 ${status.search?.source || '-'}，原因 ${status.search.fallbackReason}` : `搜索来源 ${status.search?.source || '-'}`,
    },
    {
      key: 'outbox',
      label: outboxLatest ? `Outbox ${outboxLatest.statusText || (outboxLatest.status ?? 'unknown')}` : 'Outbox 未发现',
      ok: !outboxLatest || outboxLatest.statusText === 'sent',
      detail: outboxLatest ? `topic ${outboxLatest.topic || '-'}，重试 ${outboxLatest.retryCount ?? 0} 次` : '未找到该帖子最近事务消息',
    },
  ]
})
const publishStatusSummary = computed(() => {
  const status = publishStatus.value
  if (!status) return ''
  if (status.ready) return '搜索链路已闭环'
  if (status.search?.degraded) return '当前通过降级链路可诊断'
  return '如刚发布，索引和 Outbox 可能有短暂延迟'
})
const contentTypeLabel = computed(() => getContentTypeLabel(post.value?.postType))
const isLegacyInterview = computed(() => isLegacyInterviewType(post.value?.postType))
const visibleTechStacks = computed(() => Array.isArray(post.value?.extension?.techStacks)
  ? post.value.extension.techStacks.map(String).filter(Boolean).slice(0, 8)
  : [])
const domainDetailSurface = computed(() => post.value ? buildDomainDetailSurface(post.value) : null)
const knowledgeSummary = computed(() => post.value?.extension?.summary || post.value?.summary || '')
const knowledgeTags = computed(() => {
  const extension = post.value?.extension || {}
  const rawTags = [
    ...(Array.isArray(extension.aiTags) ? extension.aiTags : []),
    ...(Array.isArray(extension.suggestedTags) ? extension.suggestedTags : []),
    ...(Array.isArray(extension.techStacks) ? extension.techStacks : []),
  ]
  return Array.from(new Set(rawTags.map(String).map((item) => item.trim()).filter(Boolean))).slice(0, 8)
})
const parseJsonValue = (value: unknown) => {
  if (!value) return null
  if (typeof value === 'object') return value
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}
const knowledgeFaqs = computed(() => {
  const parsed = parseJsonValue(post.value?.extension?.faqJson)
  return Array.isArray(parsed) ? parsed : []
})
const knowledgeCardItems = computed(() => {
  const parsed = parseJsonValue(post.value?.extension?.knowledgeCardJson)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return []
  const labels: Record<string, string> = {
    problem: '问题',
    cause: '原因',
    solution: '方案',
    caveat: '注意事项',
    result: '结果',
  }
  return Object.entries(parsed as Record<string, unknown>)
    .map(([key, value]) => ({ label: labels[key] || key, value: String(value || '') }))
    .filter((item) => item.value)
})
const commentThreadItems = (items: Comment[]): Comment[] => items.flatMap((item) => [item, ...commentThreadItems(item.replies || [])])
const highValueComment = computed(() => {
  return commentThreadItems(comments.value)
    .filter((item) => item.content?.trim())
    .sort((a, b) => {
      const score = (item: Comment) => (item.likeCount || 0) * 2 + Math.min(item.content.length, 160) / 40 + (/[？?]/.test(item.content) ? 1 : 0)
      return score(b) - score(a)
    })[0]
})
const aiKnowledgeCompletenessScore = computed(() => {
  const contentLength = post.value?.content?.length || 0
  const base = [
    knowledgeSummary.value ? 18 : 0,
    knowledgeTags.value.length ? 14 : 0,
    knowledgeCardItems.value.length ? 22 : 0,
    knowledgeFaqs.value.length ? 18 : 0,
    relatedPosts.value.length ? 12 : 0,
    highValueComment.value ? 8 : 0,
    contentLength > 800 ? 8 : contentLength > 300 ? 5 : 0,
  ].reduce((sum, value) => sum + value, 0)
  return Math.min(100, Math.round(base))
})
const aiKnowledgeConfidenceText = computed(() => {
  if (aiKnowledgeCompletenessScore.value >= 78) return '高可信'
  if (aiKnowledgeCompletenessScore.value >= 48) return '可参考'
  return '待补充'
})
const aiKnowledgeConfidenceTone = computed(() => {
  if (aiKnowledgeCompletenessScore.value >= 78) return 'ai-confidence-high'
  if (aiKnowledgeCompletenessScore.value >= 48) return 'ai-confidence-mid'
  return 'ai-confidence-low'
})
const aiKnowledgeInsights = computed(() => [
  {
    label: '帖子质量评分',
    value: `${aiKnowledgeCompletenessScore.value} / 100`,
    detail: knowledgeSummary.value
      ? '已具备摘要、标签或结构化字段，可进入社区知识沉淀链路。'
      : '建议补充摘要和关键结论，让读者更快判断经验价值。',
  },
  {
    label: '结构化提炼',
    value: knowledgeCardItems.value.length || knowledgeFaqs.value.length
      ? `${knowledgeCardItems.value.length + knowledgeFaqs.value.length} 条知识片段`
      : '等待整理',
    detail: knowledgeCardItems.value.length || knowledgeFaqs.value.length
      ? '问题、原因、方案、FAQ 已可作为知识卡被搜索和复用。'
      : '发布后可由 AI 或运营把正文整理成摘要、FAQ 和知识卡。',
  },
  {
    label: '相似内容聚合',
    value: relatedPosts.value.length ? `${relatedPosts.value.length} 篇相似经验` : '待发现',
    detail: relatedPosts.value.length
      ? `已基于「${primaryKnowledgeTopic.value}」发现可继续合并阅读的社区内容。`
      : '相同技术栈或主题下的内容会在这里形成经验簇，减少重复踩坑。',
  },
  {
    label: '评论高价值问答',
    value: highValueComment.value ? '已发现线索' : '暂无线索',
    detail: highValueComment.value
      ? `评论区已有可沉淀问答：“${highValueComment.value.content.slice(0, 42)}${highValueComment.value.content.length > 42 ? '...' : ''}”`
      : '有赞同、追问或补充方案的评论，会成为后续 FAQ 候选。',
  },
  {
    label: '个人复盘建议',
    value: post.value?.myInteraction?.favorited ? '已加入回看' : '可加入回看',
    detail: post.value?.myInteraction?.favorited
      ? '这篇经验已进入你的收藏线索，可继续沉淀为个人知识资产。'
      : '收藏或评论后，可在个人复盘空间集中回看同主题知识卡。',
  },
])
const primaryKnowledgeTopic = computed(() => {
  return knowledgeTags.value[0]
    || visibleTechStacks.value[0]
    || post.value?.tags?.[0]?.name
    || post.value?.extension?.scenario
    || post.value?.title
    || '技术经验'
})
const knowledgeTopicQuery = computed(() => ({ q: primaryKnowledgeTopic.value }))
const knowledgeSearchQuery = computed(() => ({ q: primaryKnowledgeTopic.value, sort: 'relevance' }))
const knowledgePathSteps = computed(() => [
  {
    index: '01',
    title: knowledgeSummary.value ? '摘要已沉淀' : '等待摘要沉淀',
    description: knowledgeSummary.value
      ? '核心背景、问题和结论已进入帖子元信息，可被搜索和推荐复用。'
      : '补充摘要后，读者可以更快判断这篇经验是否值得继续阅读。',
  },
  {
    index: '02',
    title: knowledgeCardItems.value.length || knowledgeFaqs.value.length ? '知识卡已生成' : '知识卡待整理',
    description: '结构化知识卡会承接问题、原因、方案和注意事项，方便进入知识库长期复用。',
  },
  {
    index: '03',
    title: '主题路径可发现',
    description: `围绕「${primaryKnowledgeTopic.value}」继续发现相似经验、相关知识卡和讨论。`,
  },
  {
    index: '04',
    title: '个人复盘可追踪',
    description: '收藏、评论和知识复盘会回流到个人学习空间，形成自己的技术知识资产。',
  },
])
const materialStatusText = computed(() => {
  if (!materialPack.value) return ''
  const saved = materialPack.value.savedToPrep ? '已归档到备战空间' : '可继续编辑后归档'
  const time = materialPack.value.updateTime ? `，更新于 ${formatTime(materialPack.value.updateTime)}` : ''
  return `${saved}${time}`
})
const isContentModerator = computed(() => Boolean(adminPermissions.value?.contentModerator || adminPermissions.value?.admin))
const canViewVersionHistory = computed(() => Boolean(authStore.isLoggedIn && post.value && (isOwnPost.value || isContentModerator.value)))
const postErrorCode = computed(() => errorCodeOf(postError.value))
const postUnavailableTitle = computed(() => postErrorCode.value === 10403 || postErrorCode.value === 403 ? '无权访问' : '内容不可见')
const postUnavailableDescription = computed(() => postErrorCode.value === 10403 || postErrorCode.value === 403
  ? '当前账号没有权限查看这篇帖子，评论也不会被公开展示。'
  : '该帖子可能已被删除、下架，或当前不可公开访问。')
const detailSeoDescription = computed(() => {
  if (post.value) {
    return summarizeSeoText(post.value.summary || post.value.extension?.summary || post.value.content, postUnavailableDescription.value)
  }
  return summarizeSeoText(postUnavailableDescription.value)
})

const errorCodeOf = (error: unknown) => {
  if (error instanceof BizException) return error.code
  const status = (error as any)?.response?.status
  return typeof status === 'number' ? status : undefined
}

const getResultClass = (result: number) => {
  const classes: Record<number, string> = {
    1: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    2: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    3: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  }
  return classes[result] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

const getResultText = (result: number) => {
  const texts: Record<number, string> = {
    1: '已通过',
    2: '待反馈',
    3: '未通过',
  }
  return texts[result] || '未知结果'
}

const handleLike = async () => {
  if (!post.value || isTogglingLike.value) return
  isTogglingLike.value = true
  const liked = Boolean(post.value.myInteraction?.liked)
  try {
    if (liked) {
      await interactionApi.unlike(post.value.postId)
    } else {
      await interactionApi.like(post.value.postId)
    }
    post.value.myInteraction = { ...(post.value.myInteraction ?? { favorited: false }), liked: !liked }
    post.value.counter.like = Math.max(0, post.value.counter.like + (liked ? -1 : 1))
    const message = liked
      ? '已取消点赞'
      : isOwnPost.value
        ? '已点赞自己的帖子，计数已更新'
        : '已点赞'
    interactionFeedback.value = message
    toast.success(message)
  } catch (error: any) {
    toast.error(getErrorMessage(error, '点赞操作失败'))
  } finally {
    isTogglingLike.value = false
  }
}

const handleFavorite = async () => {
  if (!post.value || isTogglingFavorite.value) return
  isTogglingFavorite.value = true
  const favorited = Boolean(post.value.myInteraction?.favorited)
  try {
    if (favorited) {
      await interactionApi.unfavorite(post.value.postId)
    } else {
      await interactionApi.favorite(post.value.postId)
    }
    post.value.myInteraction = { ...(post.value.myInteraction ?? { liked: false }), favorited: !favorited }
    post.value.counter.favorite = Math.max(0, post.value.counter.favorite + (favorited ? -1 : 1))
    const message = favorited
      ? '已取消收藏'
      : isOwnPost.value
        ? '已收藏自己的帖子，已加入回看'
        : '已收藏到回看'
    interactionFeedback.value = message
    toast.success(message)
  } catch (error: any) {
    toast.error(getErrorMessage(error, '收藏操作失败'))
  } finally {
    isTogglingFavorite.value = false
  }
}

const toggleFollowAuthor = async () => {
  if (!post.value) return
  if (!canFollowAuthor.value) return
  if (!requireLogin()) return
  isFollowingAuthor.value = true
  try {
    if (post.value.author.isFollowing) {
      await userApi.unfollow(post.value.author.uid)
      post.value.author.isFollowing = false
      toast.success('已取消关注')
    } else {
      await userApi.follow(post.value.author.uid)
      post.value.author.isFollowing = true
      toast.success('已关注')
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '关注操作失败'))
  } finally {
    isFollowingAuthor.value = false
  }
}

const handleDeletePost = async () => {
  if (!post.value || !isOwnPost.value || isDeletingPost.value) return
  const confirmed = window.confirm('确定删除这篇帖子吗？删除后不可恢复。')
  if (!confirmed) return

  isDeletingPost.value = true
  try {
    await postApi.delete(post.value.postId)
    toast.success('帖子已删除')
    router.push('/')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '删除帖子失败'))
  } finally {
    isDeletingPost.value = false
  }
}

const findComment = (commentId: Comment['commentId']) => {
  for (const comment of comments.value) {
    if (String(comment.commentId) === String(commentId)) return comment
    const reply = comment.replies?.find((item) => String(item.commentId) === String(commentId))
    if (reply) return reply
  }
  return undefined
}

const countCommentBranch = (comment: Comment): number => 1 + (comment.replies?.length ?? 0)

const handleLikeComment = async (commentId: Comment['commentId']) => {
  if (!requireLogin()) {
    commentTreeRef.value?.markCommentLikeSettled(commentId)
    return
  }
  const comment = findComment(commentId)
  try {
    await interactionApi.likeComment(commentId)
    if (comment) {
      comment.myLiked = true
      comment.likeCount += 1
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '评论点赞失败'))
    await loadComments(true)
  } finally {
    commentTreeRef.value?.markCommentLikeSettled(commentId)
  }
}

const handleUnlikeComment = async (commentId: Comment['commentId']) => {
  if (!requireLogin()) {
    commentTreeRef.value?.markCommentLikeSettled(commentId)
    return
  }
  const comment = findComment(commentId)
  try {
    await interactionApi.unlikeComment(commentId)
    if (comment) {
      comment.myLiked = false
      comment.likeCount = Math.max(0, comment.likeCount - 1)
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '取消点赞失败'))
    await loadComments(true)
  } finally {
    commentTreeRef.value?.markCommentLikeSettled(commentId)
  }
}

const handleSubmitComment = async () => {
  if (!post.value || !commentText.value.trim()) return
  if (!requireLogin()) return
  isSubmittingComment.value = true
  try {
    const res = await interactionApi.comment(postId.value, commentText.value)
    commentText.value = ''
    if (res.data?.reviewRequired) {
      toast.success('评论已提交审核')
    } else {
      post.value.counter.comment += 1
      toast.success('评论成功')
      await loadComments()
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '评论失败'))
  } finally {
    isSubmittingComment.value = false
  }
}

const handleReplyComment = async (payload: { parentId: Comment['commentId']; replyToUid: Comment['author']['uid']; content: string }) => {
  if (!post.value) return
  if (!requireLogin()) return
  try {
    const res = await interactionApi.comment(postId.value, payload.content, payload.parentId, payload.replyToUid)
    if (res.data?.reviewRequired) {
      toast.success('回复已提交审核')
    } else {
      post.value.counter.comment += 1
      toast.success('回复成功')
      await loadComments(true)
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '回复失败'))
  }
}

const handleDeleteComment = async (commentId: Comment['commentId']) => {
  if (!post.value) return
  const target = findComment(commentId)
  try {
    await interactionApi.deleteComment(commentId)
    const removed = target ? countCommentBranch(target) : 1
    post.value.counter.comment = Math.max(0, post.value.counter.comment - removed)
    toast.success('评论已删除')
    await loadComments(true)
  } catch (error: any) {
    toast.error(getErrorMessage(error, '删除评论失败'))
  }
}

const closeReportDialog = () => {
  if (isReporting.value) return
  isReportDialogOpen.value = false
  reportForm.value = { reason: 'OTHER', detail: '' }
  reportTarget.value = { type: 'post' }
}

const openPostReportDialog = () => {
  if (!requireLogin()) return
  reportTarget.value = { type: 'post' }
  isReportDialogOpen.value = true
}

const openCommentReportDialog = (commentId: Comment['commentId']) => {
  if (!requireLogin()) return
  reportTarget.value = { type: 'comment', id: commentId }
  isReportDialogOpen.value = true
}

const submitReport = async () => {
  isReporting.value = true
  try {
    const payload = {
      reason: reportForm.value.reason,
      detail: reportForm.value.detail || undefined,
    }
    if (reportTarget.value.type === 'comment' && reportTarget.value.id) {
      await interactionApi.reportComment(reportTarget.value.id, payload)
    } else {
      await postApi.report(postId.value, payload)
    }
    toast.success('举报已提交，等待管理员处理')
    isReportDialogOpen.value = false
    reportForm.value = { reason: 'OTHER', detail: '' }
    reportTarget.value = { type: 'post' }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '举报提交失败'))
  } finally {
    isReporting.value = false
  }
}

const loadComments = async (reset = true) => {
  if (reset) {
    isLoadingComments.value = true
    commentCursor.value = undefined
    commentsErrorMessage.value = ''
  } else {
    isLoadingMoreComments.value = true
  }
  try {
    const result = await interactionApi.getComments(postId.value, reset ? undefined : commentCursor.value)
    const page = result.data
    comments.value = reset ? page?.items || [] : [...comments.value, ...(page?.items || [])]
    commentCursor.value = page?.nextCursor
    hasMoreComments.value = Boolean(page?.hasMore)
    commentsErrorMessage.value = ''
  } catch (error) {
    const message = getErrorMessage(error, reset ? '评论加载失败' : '加载更多评论失败')
    if (reset) {
      comments.value = []
      hasMoreComments.value = false
      commentsErrorMessage.value = errorCodeOf(error) === 10403 || errorCodeOf(error) === 403
        ? '无权访问评论，内容不可见。'
        : message
    } else {
      toast.error(message)
    }
  } finally {
    isLoadingComments.value = false
    isLoadingMoreComments.value = false
  }
}

const loadMoreComments = () => loadComments(false)

const loadRelatedPosts = async () => {
  const current = post.value
  if (!current?.tags.length) {
    relatedPosts.value = []
    return
  }
  try {
    const result = await postApi.list({ tagId: current.tags[0].id, size: 5 })
    relatedPosts.value = (result.data?.items || [])
      .filter((item) => String(item.postId) !== String(current.postId))
      .slice(0, 4)
  } catch {
    relatedPosts.value = []
  }
}

const loadInteractionState = async () => {
  if (!post.value || !authStore.isLoggedIn) return
  try {
    const result = await interactionApi.getPostInteraction(post.value.postId)
    if (result.data) {
      post.value.myInteraction = {
        liked: Boolean(result.data.liked),
        favorited: Boolean(result.data.favorited),
      }
    }
  } catch {
    // 互动状态不影响详情正文展示。
  }
}

const loadAdminPermissions = async () => {
  if (!authStore.token) {
    adminPermissions.value = null
    return
  }
  try {
    const res = await opsApi.myPermissions({ skipAuthRedirect: true })
    adminPermissions.value = res.code === 0 ? res.data : null
  } catch {
    adminPermissions.value = null
  }
}

const loadVersionHistory = async () => {
  if (!post.value || !canViewVersionHistory.value) return
  isLoadingVersions.value = true
  try {
    const res = await postApi.listVersions(post.value.postId, 12)
    versionHistories.value = res.data || []
    versionLoadAttempted.value = true
  } catch (error: any) {
    toast.error(getErrorMessage(error, '版本历史加载失败'))
  } finally {
    isLoadingVersions.value = false
  }
}

const openVersionHistory = async () => {
  if (!canViewVersionHistory.value) return
  isVersionDialogOpen.value = true
  if (!versionLoadAttempted.value) {
    await loadVersionHistory()
  }
}

const closeVersionHistory = () => {
  if (isLoadingVersions.value) return
  isVersionDialogOpen.value = false
}

const changeSummaryText = (summary?: string) => {
  if (!summary) return '内容更新'
  const labels: Record<string, string> = {
    title: '标题',
    content: '正文',
    coverUrl: '封面',
    visibility: '可见性',
    extension: '扩展信息',
    tags: '标签',
  }
  const values = summary.split(',').map((item) => labels[item] || item).filter(Boolean)
  return values.length ? values.join(' / ') : '内容更新'
}

const listToText = (items?: string[]) => (items || []).join('\n')

const textToList = (value: string) => value
  .split(/\r?\n/)
  .map((item) => item.trim())
  .filter(Boolean)
  .slice(0, 12)

const applyMaterialToForm = (pack?: InterviewMaterialPack | null) => {
  materialForm.value = {
    starSituation: pack?.starSituation || '',
    starTask: pack?.starTask || '',
    starAction: pack?.starAction || '',
    starResult: pack?.starResult || '',
    resumeBulletsText: listToText(pack?.resumeBullets),
    followUpQuestionsText: listToText(pack?.followUpQuestions),
    technicalHighlightsText: listToText(pack?.technicalHighlights),
    missingHintsText: listToText(pack?.missingHints),
    userNote: pack?.userNote || '',
  }
}

const loadInterviewMaterial = async () => {
  if (!authStore.isLoggedIn || !post.value?.postId) {
    materialPack.value = null
    applyMaterialToForm(null)
    materialErrorMessage.value = ''
    return
  }
  isLoadingMaterial.value = true
  materialErrorMessage.value = ''
  try {
    const res = await postApi.getInterviewMaterials(post.value.postId)
    materialPack.value = res.data || null
    applyMaterialToForm(materialPack.value)
  } catch (error: any) {
    materialErrorMessage.value = getErrorMessage(error, '素材包加载失败')
  } finally {
    isLoadingMaterial.value = false
  }
}

const handleGenerateMaterial = async () => {
  if (!post.value?.postId) return
  if (!requireLogin()) return
  isGeneratingMaterial.value = true
  materialErrorMessage.value = ''
  try {
    const res = await postApi.generateInterviewMaterials(post.value.postId)
    materialPack.value = res.data || null
    applyMaterialToForm(materialPack.value)
    toast.success('面试素材包已生成')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '素材包生成失败'))
  } finally {
    isGeneratingMaterial.value = false
  }
}

const handleSaveMaterial = async () => {
  if (!materialPack.value?.id) return
  isSavingMaterial.value = true
  try {
    const res = await postApi.updateInterviewMaterial(materialPack.value.id, {
      starSituation: materialForm.value.starSituation,
      starTask: materialForm.value.starTask,
      starAction: materialForm.value.starAction,
      starResult: materialForm.value.starResult,
      resumeBullets: textToList(materialForm.value.resumeBulletsText),
      followUpQuestions: textToList(materialForm.value.followUpQuestionsText),
      technicalHighlights: textToList(materialForm.value.technicalHighlightsText),
      missingHints: textToList(materialForm.value.missingHintsText),
      userNote: materialForm.value.userNote,
    })
    materialPack.value = res.data || materialPack.value
    applyMaterialToForm(materialPack.value)
    toast.success('素材包已保存')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '素材包保存失败'))
  } finally {
    isSavingMaterial.value = false
  }
}

const handleSaveMaterialToPrep = async () => {
  if (!materialPack.value?.id || materialPack.value.savedToPrep) return
  isSavingMaterialToPrep.value = true
  try {
    const res = await postApi.saveInterviewMaterialToPrep(materialPack.value.id)
    materialPack.value = res.data || materialPack.value
    applyMaterialToForm(materialPack.value)
    toast.success('已归档到个人备战空间')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '归档失败'))
  } finally {
    isSavingMaterialToPrep.value = false
  }
}

watch(() => postData.value?.data, (value) => {
  post.value = clonePost(value)
}, { immediate: true })

watch([post, postErrorCode, postId], () => {
  applyPageSeo({
    title: post.value?.title || postUnavailableTitle.value,
    description: detailSeoDescription.value,
    canonical: `/post/${postId.value}`,
  })
}, { immediate: true })

watch(post, () => {
  loadRelatedPosts()
  loadInteractionState()
  if (showStageTwoDetailPanels) {
    loadInterviewMaterial()
  } else {
    materialPack.value = null
    materialErrorMessage.value = ''
  }
})

watch(postId, () => {
  loadComments(true)
  versionHistories.value = []
  versionLoadAttempted.value = false
})

onMounted(() => {
  loadAdminPermissions()
  loadComments(true)
})

watch(() => authStore.token, () => {
  loadAdminPermissions()
  if (showStageTwoDetailPanels) loadInterviewMaterial()
})

watch(canViewVersionHistory, (allowed) => {
  if (!allowed) isVersionDialogOpen.value = false
})
</script>

<style scoped>
.meta-pill {
  border-radius: 0.5rem;
  background: rgb(248 250 252);
  padding: 0.35rem 0.6rem;
  font-size: 0.875rem;
  color: rgb(51 65 85);
}

.content-type-pill,
.ai-pill {
  display: inline-flex;
  border-radius: 999px;
  padding: 0.25rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 900;
}

.content-type-pill {
  background: rgb(239 246 255);
  color: rgb(37 99 235);
}

.ai-pill {
  background: rgb(236 253 245);
  color: rgb(4 120 87);
}

.publish-status-bar {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.9rem;
}

.publish-status-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.publish-status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
  gap: 0.5rem;
}

.publish-status-pill {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  gap: 0.45rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(203 213 225);
  padding: 0.45rem 0.65rem;
  font-size: 0.8rem;
  font-weight: 800;
  color: rgb(51 65 85);
}

.publish-status-dot {
  width: 0.5rem;
  height: 0.5rem;
  flex: 0 0 auto;
  border-radius: 999px;
  background: currentColor;
}

.publish-status-ok {
  border-color: rgb(167 243 208);
  background: rgb(236 253 245);
  color: rgb(4 120 87);
}

.publish-status-warn {
  border-color: rgb(253 230 138);
  background: rgb(255 251 235);
  color: rgb(180 83 9);
}

.domain-detail-panel {
  margin-bottom: 2rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 1.25rem;
}

.domain-detail-head {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.domain-detail-head p {
  font-size: 0.75rem;
  font-weight: 900;
  color: rgb(37 99 235);
}

.domain-detail-head h2 {
  margin-top: 0.25rem;
  color: rgb(15 23 42);
  font-size: 1.05rem;
  font-weight: 900;
}

.domain-detail-description {
  margin-top: 0.5rem;
  color: rgb(71 85 105);
  font-size: 0.875rem;
  line-height: 1.65;
}

.domain-detail-grid {
  margin-top: 1rem;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.domain-detail-item {
  min-width: 0;
  border-radius: 0.625rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.85rem;
}

.domain-detail-item span {
  display: block;
  color: rgb(100 116 139);
  font-size: 0.75rem;
  font-weight: 900;
}

.domain-detail-item strong {
  margin-top: 0.3rem;
  display: block;
  overflow-wrap: anywhere;
  color: rgb(15 23 42);
  font-size: 0.95rem;
  font-weight: 900;
}

.domain-detail-chips {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.domain-detail-chip {
  display: inline-flex;
  min-height: 2rem;
  align-items: center;
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 900;
}

.domain-detail-chip-tech,
.domain-detail-tech {
  border-color: rgb(186 230 253);
}

.domain-detail-chip-tech {
  background: rgb(224 242 254);
  color: rgb(3 105 161);
}

.domain-detail-chip-career {
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.domain-detail-career {
  border-color: rgb(199 210 254);
}

.domain-detail-chip-reading {
  background: rgb(236 253 245);
  color: rgb(4 120 87);
}

.domain-detail-reading {
  border-color: rgb(167 243 208);
}

.domain-detail-chip-lifestyle {
  background: rgb(255 247 237);
  color: rgb(194 65 12);
}

.domain-detail-lifestyle {
  border-color: rgb(254 215 170);
}

.domain-detail-chip-investment {
  background: rgb(255 251 235);
  color: rgb(180 83 9);
}

.domain-detail-investment {
  border-color: rgb(253 230 138);
}

.domain-detail-gallery {
  margin-top: 1rem;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.domain-detail-gallery img {
  aspect-ratio: 4 / 3;
  width: 100%;
  border-radius: 0.625rem;
  object-fit: cover;
}

.domain-detail-risk-notice {
  margin-top: 1rem;
  border-radius: 0.625rem;
  border: 1px solid rgb(253 230 138);
  background: rgb(255 251 235);
  padding: 0.85rem;
  color: rgb(146 64 14);
  font-size: 0.875rem;
  font-weight: 800;
  line-height: 1.6;
}

.knowledge-panel,
.knowledge-card {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
}

.knowledge-panel {
  padding: 1.25rem;
}

.knowledge-card {
  padding: 0.9rem;
}

.knowledge-card strong {
  display: block;
  color: rgb(15 23 42);
}

.knowledge-card p {
  margin-top: 0.4rem;
  color: rgb(71 85 105);
  font-size: 0.875rem;
  line-height: 1.6;
}

.knowledge-tag {
  border-radius: 999px;
  background: rgb(238 242 255);
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(67 56 202);
}

.ai-knowledge-assistant {
  border-radius: 0.75rem;
  border: 1px solid rgb(191 219 254);
  background: rgb(239 246 255);
  padding: 1.25rem;
}

.ai-knowledge-head {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.ai-knowledge-head p {
  color: rgb(37 99 235);
  font-size: 0.75rem;
  font-weight: 900;
}

.ai-knowledge-head h2 {
  margin-top: 0.25rem;
  color: rgb(15 23 42);
  font-size: 1.05rem;
  font-weight: 900;
}

.ai-confidence-pill {
  display: inline-flex;
  min-height: 2rem;
  flex-shrink: 0;
  align-items: center;
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 900;
}

.ai-confidence-high {
  background: rgb(220 252 231);
  color: rgb(22 101 52);
}

.ai-confidence-mid {
  background: rgb(254 249 195);
  color: rgb(133 77 14);
}

.ai-confidence-low {
  background: rgb(241 245 249);
  color: rgb(71 85 105);
}

.ai-knowledge-grid {
  margin-top: 1rem;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ai-knowledge-card {
  min-width: 0;
  border-radius: 0.625rem;
  border: 1px solid rgb(191 219 254);
  background: white;
  padding: 0.9rem;
}

.ai-knowledge-card span {
  color: rgb(37 99 235);
  font-size: 0.72rem;
  font-weight: 900;
}

.ai-knowledge-card strong {
  display: block;
  margin-top: 0.3rem;
  overflow-wrap: anywhere;
  color: rgb(15 23 42);
  font-size: 0.95rem;
  font-weight: 900;
}

.ai-knowledge-card p {
  margin-top: 0.4rem;
  overflow-wrap: anywhere;
  color: rgb(71 85 105);
  font-size: 0.8125rem;
  line-height: 1.55;
}

.ai-knowledge-actions {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.ai-knowledge-actions a {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  border: 1px solid rgb(191 219 254);
  background: white;
  padding: 0.5rem 0.85rem;
  color: rgb(29 78 216);
  font-size: 0.8125rem;
  font-weight: 900;
}

.interview-material-panel {
  border-radius: 0.75rem;
  border: 1px solid rgb(191 219 254);
  background: linear-gradient(180deg, rgb(239 246 255), rgb(255 255 255));
  padding: 1.25rem;
}

.interview-material-head {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  justify-content: space-between;
}

.interview-material-head h2 {
  margin-top: 0.25rem;
  font-size: 1.1rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.interview-material-head span {
  margin-top: 0.35rem;
  display: block;
  font-size: 0.875rem;
  line-height: 1.6;
  color: rgb(71 85 105);
}

.interview-material-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.interview-material-primary,
.interview-material-secondary,
.interview-material-empty button,
.interview-material-error button {
  border-radius: 0.5rem;
  padding: 0.55rem 0.85rem;
  font-size: 0.875rem;
  font-weight: 800;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.interview-material-primary {
  background: rgb(37 99 235);
  color: white;
}

.interview-material-secondary,
.interview-material-empty button,
.interview-material-error button {
  border: 1px solid rgb(147 197 253);
  color: rgb(29 78 216);
}

.interview-material-primary:disabled,
.interview-material-secondary:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.interview-material-empty,
.interview-material-error {
  margin-top: 1rem;
  border-radius: 0.75rem;
  border: 1px dashed rgb(147 197 253);
  background: rgb(248 250 252);
  padding: 1rem;
}

.interview-material-empty strong,
.interview-material-error span {
  display: block;
  font-weight: 900;
  color: rgb(15 23 42);
}

.interview-material-empty p {
  margin-top: 0.35rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: rgb(71 85 105);
}

.interview-material-empty button,
.interview-material-error button {
  margin-top: 0.75rem;
}

.interview-material-form {
  margin-top: 1rem;
  display: grid;
  gap: 1rem;
}

.star-grid,
.material-list-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.interview-material-form label {
  display: grid;
  gap: 0.45rem;
}

.interview-material-form label span {
  font-size: 0.8rem;
  font-weight: 900;
  color: rgb(51 65 85);
}

.interview-material-form textarea {
  width: 100%;
  resize: vertical;
  border-radius: 0.65rem;
  border: 1px solid rgb(203 213 225);
  background: rgb(255 255 255);
  padding: 0.75rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: rgb(15 23 42);
  outline: none;
}

.interview-material-form textarea:focus {
  border-color: rgb(37 99 235);
  box-shadow: 0 0 0 3px rgb(191 219 254 / 0.7);
}

.knowledge-path-panel {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 1.25rem;
}

.knowledge-path-kicker {
  font-size: 0.75rem;
  font-weight: 900;
  color: rgb(37 99 235);
}

.knowledge-path-panel h2 {
  margin-top: 0.25rem;
  font-size: 1.05rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.knowledge-path-panel > div > p:not(.knowledge-path-kicker) {
  margin-top: 0.35rem;
  font-size: 0.875rem;
  line-height: 1.65;
  color: rgb(71 85 105);
}

.knowledge-path-steps {
  margin-top: 1rem;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.knowledge-path-step {
  border-radius: 0.625rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.85rem;
}

.knowledge-path-step span {
  font-size: 0.72rem;
  font-weight: 900;
  color: rgb(37 99 235);
}

.knowledge-path-step strong {
  margin-top: 0.2rem;
  display: block;
  color: rgb(15 23 42);
}

.knowledge-path-step p {
  margin-top: 0.3rem;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: rgb(71 85 105);
}

.knowledge-path-actions {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.knowledge-path-actions a {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  border: 1px solid rgb(191 219 254);
  background: white;
  padding: 0.5rem 0.85rem;
  font-size: 0.8125rem;
  font-weight: 900;
  color: rgb(29 78 216);
}

.dark .meta-pill {
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .content-type-pill {
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

.dark .ai-pill {
  background: rgb(6 78 59);
  color: rgb(167 243 208);
}

.dark .publish-status-bar {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .publish-status-pill {
  border-color: rgb(51 65 85);
  color: rgb(203 213 225);
}

.dark .publish-status-ok {
  border-color: rgb(6 95 70);
  background: rgb(6 78 59 / 0.35);
  color: rgb(167 243 208);
}

.dark .publish-status-warn {
  border-color: rgb(146 64 14);
  background: rgb(120 53 15 / 0.35);
  color: rgb(253 230 138);
}

.dark .domain-detail-panel,
.dark .domain-detail-item {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .domain-detail-head h2,
.dark .domain-detail-item strong {
  color: rgb(248 250 252);
}

.dark .domain-detail-description {
  color: rgb(203 213 225);
}

.dark .domain-detail-item span {
  color: rgb(148 163 184);
}

.dark .domain-detail-chip-tech {
  background: rgb(12 74 110 / 0.72);
  color: rgb(186 230 253);
}

.dark .domain-detail-chip-career {
  background: rgb(49 46 129 / 0.7);
  color: rgb(199 210 254);
}

.dark .domain-detail-chip-reading {
  background: rgb(6 78 59 / 0.7);
  color: rgb(167 243 208);
}

.dark .domain-detail-chip-lifestyle {
  background: rgb(124 45 18 / 0.72);
  color: rgb(254 215 170);
}

.dark .domain-detail-chip-investment,
.dark .domain-detail-risk-notice {
  background: rgb(120 53 15 / 0.35);
  color: rgb(253 230 138);
}

.dark .domain-detail-risk-notice {
  border-color: rgb(146 64 14);
}

.dark .knowledge-panel,
.dark .knowledge-card {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .knowledge-card strong {
  color: rgb(248 250 252);
}

.dark .knowledge-card p {
  color: rgb(203 213 225);
}

.dark .knowledge-tag {
  background: rgb(49 46 129 / 0.45);
  color: rgb(199 210 254);
}

.dark .ai-knowledge-assistant,
.dark .ai-knowledge-card,
.dark .ai-knowledge-actions a {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .ai-knowledge-head h2,
.dark .ai-knowledge-card strong {
  color: rgb(248 250 252);
}

.dark .ai-knowledge-card p {
  color: rgb(203 213 225);
}

.dark .ai-knowledge-actions a {
  color: rgb(191 219 254);
}

.dark .ai-confidence-high {
  background: rgb(20 83 45 / 0.7);
  color: rgb(187 247 208);
}

.dark .ai-confidence-mid {
  background: rgb(113 63 18 / 0.72);
  color: rgb(254 240 138);
}

.dark .ai-confidence-low {
  background: rgb(51 65 85);
  color: rgb(203 213 225);
}

.dark .interview-material-panel {
  border-color: rgb(30 64 175);
  background: linear-gradient(180deg, rgb(15 23 42), rgb(2 6 23));
}

.dark .interview-material-head h2,
.dark .interview-material-empty strong,
.dark .interview-material-error span,
.dark .interview-material-form label span {
  color: rgb(248 250 252);
}

.dark .interview-material-head span,
.dark .interview-material-empty p {
  color: rgb(203 213 225);
}

.dark .interview-material-empty,
.dark .interview-material-error {
  border-color: rgb(30 64 175);
  background: rgb(15 23 42);
}

.dark .interview-material-form textarea {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23);
  color: rgb(248 250 252);
}

.dark .interview-material-secondary,
.dark .interview-material-empty button,
.dark .interview-material-error button {
  border-color: rgb(30 64 175);
  color: rgb(147 197 253);
}

.dark .knowledge-path-panel,
.dark .knowledge-path-step,
.dark .knowledge-path-actions a {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .knowledge-path-panel h2,
.dark .knowledge-path-step strong {
  color: rgb(248 250 252);
}

.dark .knowledge-path-panel > div > p:not(.knowledge-path-kicker),
.dark .knowledge-path-step p {
  color: rgb(203 213 225);
}

.dark .knowledge-path-actions a {
  color: rgb(191 219 254);
}

.version-dialog {
  max-height: min(82vh, 760px);
  overflow: hidden;
}

.version-list {
  max-height: min(58vh, 520px);
  overflow-y: auto;
  padding-right: 0.25rem;
}

.version-item {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  padding: 1rem;
  background: rgb(248 250 252);
}

.version-item + .version-item {
  margin-top: 0.75rem;
}

.dark .version-item {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

@media (max-width: 640px) {
  .ai-knowledge-head {
    flex-direction: column;
  }

  .interview-material-head {
    flex-direction: column;
  }

  .interview-material-actions {
    width: 100%;
    justify-content: stretch;
  }

  .interview-material-actions button {
    flex: 1 1 100%;
  }

  .ai-knowledge-grid,
  .domain-detail-gallery,
  .domain-detail-grid,
  .star-grid,
  .material-list-grid,
  .knowledge-path-steps {
    grid-template-columns: 1fr;
  }

  .ai-knowledge-actions a,
  .knowledge-path-actions a {
    width: 100%;
  }
}
</style>
