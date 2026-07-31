<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <button type="button" class="detail-back" @click="goBack">
        <ArrowLeft class="h-4 w-4" />
        返回
      </button>
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div class="lg:col-span-2">
          <LoadingSkeleton v-if="isLoading" />

          <template v-else-if="post">
            <section class="mb-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div class="flex items-center justify-between gap-4">
                <RouterLink v-if="canOpenAuthorProfile" :to="authorProfileTo" class="flex min-w-0 items-center gap-3">
                  <UserAvatar
                    class="h-12 w-12 shrink-0 rounded-full font-bold"
                    :src="post.author.avatar"
                    :name="post.author.nickname"
                    alt=""
                  />
                  <div class="min-w-0">
                    <h3 class="truncate font-semibold text-slate-900 dark:text-slate-100">{{ post.author.nickname || '未知用户' }}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400">{{ formatTime(post.createdAt) }}</p>
                  </div>
                </RouterLink>
                <div v-else class="flex min-w-0 items-center gap-3">
                  <UserAvatar
                    class="h-12 w-12 shrink-0 rounded-full font-bold"
                    :src="post.author.avatar"
                    :name="post.author.nickname"
                    alt=""
                  />
                  <div class="min-w-0">
                    <h3 class="truncate font-semibold text-slate-900 dark:text-slate-100">{{ post.author.nickname || '未知用户' }}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400">{{ formatTime(post.createdAt) }}</p>
                  </div>
                </div>
                <div class="author-action-group">
                  <button
                    v-if="canFollowAuthor"
                    type="button"
                    class="rounded-lg border border-primary-600 px-4 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-800"
                    :disabled="isFollowingAuthor"
                    @click="toggleFollowAuthor"
                  >
                    {{ post.author.isFollowing ? '已关注' : '关注' }}
                  </button>
                  <template v-if="showContactAuthorEntry">
                    <button
                      v-if="canStartContactRequest"
                      type="button"
                      class="contact-author-button"
                      @click="openContactRequestDialog"
                    >
                      联系作者
                    </button>
                    <span v-else class="contact-author-unavailable">作者暂未开放联系请求</span>
                  </template>
                </div>
              </div>
            </section>

            <article class="mb-6 rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
              <div class="mb-4 flex flex-wrap items-center gap-3">
                <span class="content-type-pill">{{ contentTypeLabel }}</span>
                <span v-if="isKnownDomain(post.domain)" class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
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

              <div v-if="governanceUnavailableState" class="governance-unavailable-state" role="note">
                <strong>{{ governanceUnavailableState.title }}</strong>
                <span>{{ governanceUnavailableState.description }}</span>
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
                v-if="isKnownDomain(post.domain) && domainDetailSurface"
                :class="['domain-detail-panel', `domain-detail-${domainDetailSurface.tone}`]"
              >
                <div class="domain-detail-head">
                  <div>
                    <p>{{ getDomainLabelSafe(post.domain) }}</p>
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

                <div v-if="visibleDetailImages.length" class="domain-detail-gallery">
                  <img
                    v-for="(image, index) in visibleDetailImages"
                    :key="image"
                    :src="image"
                    :alt="`${domainDetailSurface.title} ${index + 1}`"
                    referrerpolicy="no-referrer"
                    @error="handleDetailImageError(image)"
                  />
                </div>

                <div v-if="effectiveRiskNotice" class="domain-detail-risk-notice" role="note">
                  {{ effectiveRiskNotice }}
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
                  <RouterLink v-if="enableLegacyTrainingRoutes" to="/me/prep">整理复盘要点</RouterLink>
                </div>
              </section>

              <section v-if="showStageTwoDetailPanels" class="interview-material-panel mb-8" aria-label="内容素材整理">
                <div class="interview-material-head">
                  <div>
                    <p class="plan-kicker">内容素材整理</p>
                    <h2>把真实经历整理成可讲的项目故事</h2>
                    <span>{{ materialPack ? materialStatusText : '从正文、标签和结构化字段整理项目故事、内容亮点和追问清单' }}</span>
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
                      {{ materialPack.savedToPrep ? '已归档' : isSavingMaterialToPrep ? '归档中...' : '归档到个人空间' }}
                    </button>
                  </div>
                </div>

                <div v-if="!authStore.isLoggedIn" class="interview-material-empty">
                  <strong>登录后可整理个人素材</strong>
                  <p>整理结果默认只保存到你的个人空间，后续可按主题、场景和标签回看。</p>
                  <button type="button" @click="requireLogin()">去登录</button>
                </div>
                <div v-else-if="isLoadingMaterial" class="interview-material-empty">
                  <strong>正在加载内容素材</strong>
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
                      <span>内容亮点</span>
                      <textarea v-model="materialForm.resumeBulletsText" rows="5" placeholder="每行一条" />
                    </label>
                    <label>
                      <span>讨论追问</span>
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
                    <textarea v-model="materialForm.userNote" rows="3" maxlength="1000" placeholder="补充你想保留的表达口径、数据和上下文" />
                  </label>
                </div>
                <div v-else class="interview-material-empty">
                  <strong>还没有内容素材</strong>
                  <p>建议先生成一版，再补充指标、取舍和复盘结论。</p>
                </div>
              </section>

              <section v-if="showStageTwoDetailPanels" class="knowledge-path-panel mb-8" aria-label="知识资产路径">
                <div>
                  <p class="knowledge-path-kicker">知识资产路径</p>
                  <h2>从经验帖到可复用知识</h2>
                  <p>
                    这篇内容可以沿着摘要、知识卡、主题和相似公开内容继续阅读；这里只提供公共阅读建议。
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
                  <RouterLink :to="{ path: '/knowledge/explore', query: { assetType: 'post', assetId: post.postId } }">查看公共关系</RouterLink>
                </div>
              </section>

              <section v-if="detailKnowledgeLoading || postKnowledgeAssets.length || postKnowledgePaths.length || postKnowledgeRelations.length" class="post-knowledge-assets mb-8" aria-label="相关公共知识资产">
                <div class="post-knowledge-head">
                  <div>
                    <p>相关公共知识资产</p>
                    <h2>内容详情页的公共关系入口</h2>
                    <span>只展示公开资产、来源解释和只读诊断；local-only/fallback/demo 不作为正式关系。</span>
                  </div>
                  <RouterLink :to="{ path: '/knowledge/explore', query: { assetType: 'post', assetId: post.postId } }">知识探索</RouterLink>
                </div>
                <p v-if="detailKnowledgeError" class="post-knowledge-note">{{ detailKnowledgeError }}</p>
                <p v-else-if="detailKnowledgeLoading" class="post-knowledge-note">正在读取相关公共知识资产...</p>
                <div v-if="postKnowledgeAssets.length" class="post-knowledge-grid">
                  <article v-for="asset in postKnowledgeAssets" :key="`${asset.assetType}:${asset.assetId}`" class="post-knowledge-card">
                    <div class="post-knowledge-card-tags">
                      <span>{{ postKnowledgeAssetTypeLabel(asset.assetType) }}</span>
                      <span v-if="asset.assetStatus === 'archived'">归档知识资产</span>
                      <span v-if="asset.previewSource !== 'remote'">{{ postKnowledgePreviewLabel(asset.previewSource) }} · 只读展示</span>
                    </div>
                    <strong>{{ asset.title }}</strong>
                    <p>{{ asset.summary || asset.sourceNote }}</p>
                    <small>来源解释：{{ asset.sourceNote }}</small>
                    <RouterLink v-if="asset.targetHref" :to="asset.targetHref">打开入口</RouterLink>
                  </article>
                </div>
                <div v-if="postKnowledgeRelations.length" class="post-knowledge-list">
                  <strong>关系来源解释</strong>
                  <p v-for="relation in postKnowledgeRelations" :key="relation.relationId">
                    {{ relation.sourceAssetId }} -> {{ relation.targetAssetId }}：{{ relation.reasonText }}
                  </p>
                </div>
                <div v-if="postKnowledgePaths.length" class="post-knowledge-list">
                  <strong>知识路径</strong>
                  <p v-for="path in postKnowledgePaths" :key="path.pathId">
                    {{ path.title }}：{{ path.summary }}
                  </p>
                </div>
              </section>

              <div class="mb-8 grid gap-4">
                <ReadingThreadPanel v-if="post.domain === DOMAIN.READING" :post-id="String(post.postId)" />
                <PostReferencePanel :post-id="String(post.postId)" :high-risk="post.domain === 5" />
                <ContentEvolutionPanel :post-id="String(post.postId)" />
                <PostOutcomePanel
                  :post-id="String(post.postId)"
                  :is-own-post="isOwnPost"
                  :requires-risk-acknowledgement="post.domain === 5"
                />
              </div>

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
                :share-title="post.title"
                :share-text="detailSeoDescription"
                :share-canonical="`/post/${postId}`"
                :share-disabled="!canSharePost"
                :share-disabled-reason="shareDisabledReason"
                @like="handleLike"
                @favorite="handleFavorite"
              />
              <div v-if="post.myInteraction?.favorited && !interactionFeedback" class="favorite-organizer-row">
                <PostSaveOrganizer
                  :post-id="post.postId"
                  :favorited="Boolean(post.myInteraction?.favorited)"
                  :open-after-save="Boolean(post.myInteraction?.favorited)"
                  :disabled="isTogglingFavorite"
                  trigger-label="移动到收藏夹"
                  @moved="handleFavoriteMoved"
                />
                <RouterLink to="/me?tab=favorites">查看收藏</RouterLink>
              </div>
              <div
                v-if="interactionFeedback"
                class="favorite-feedback-row"
                role="status"
                aria-live="polite"
              >
                <span>{{ interactionFeedback }}</span>
                <div v-if="post.myInteraction?.favorited" class="favorite-feedback-actions">
                  <PostSaveOrganizer
                    :post-id="post.postId"
                    :favorited="Boolean(post.myInteraction?.favorited)"
                    :open-after-save="Boolean(post.myInteraction?.favorited)"
                    :disabled="isTogglingFavorite"
                    trigger-label="选择分组"
                    @moved="handleFavoriteMoved"
                  />
                  <RouterLink to="/me?tab=favorites">
                    查看收藏
                  </RouterLink>
                </div>
              </div>

              <section
                id="trusted-content"
                class="trusted-content-loop"
                data-trusted-content-loop
                :data-trusted-content-state="trustedContentLoadState"
              >
                <div class="trusted-content-loop-head">
                  <div>
                    <p>可信内容</p>
                    <h2>{{ isQuestionPost ? '问题进展与读者反馈' : '时效状态与读者反馈' }}</h2>
                    <span>这些状态来自真实操作和服务端记录，不代表平台为内容结论背书。</span>
                  </div>
                  <button
                    type="button"
                    class="trusted-content-refresh"
                    :disabled="isLoadingTrustedContent || trustedContentMutationPending"
                    @click="loadTrustedContent"
                  >
                    {{ isLoadingTrustedContent ? '读取中...' : trustedContentLoadState === 'error' ? '重试读取' : '刷新状态' }}
                  </button>
                </div>
                <p v-if="trustedContentError" class="trusted-content-message trusted-content-message-error" role="alert">
                  {{ trustedContentError }}
                </p>
                <p
                  v-else-if="!isTrustedContentLoaded"
                  class="trusted-content-message"
                  role="status"
                  aria-live="polite"
                >
                  {{ trustedContentAvailabilityDetail }}
                </p>
                <p
                  v-if="isTrustedContentLoaded && trustedContentFeedback"
                  class="trusted-content-message"
                  role="status"
                  aria-live="polite"
                >
                  {{ trustedContentFeedback }}
                </p>

                <div class="trusted-content-row trusted-profile-row">
                  <div class="trusted-content-row-copy">
                    <span>可信经验护照</span>
                    <strong>{{ trustProfileTitle }}</strong>
                    <p>{{ trustProfileDescription }}</p>
                    <p v-if="trustProfile?.lastConfirmedAt">
                      作者最近确认于 {{ formatTime(trustProfile.lastConfirmedAt) }}。
                    </p>
                    <RouterLink
                      v-if="isOwnPost && post"
                      :to="{ path: `/editor/${post.postId}`, query: { source: 'trust_profile', returnHref: `/post/${post.postId}` } }"
                    >
                      编辑经验护照
                    </RouterLink>
                  </div>
                  <div v-if="trustProfile?.profileAvailable" class="trust-profile-details">
                    <span v-if="trustProfileRoleLabel">{{ trustProfileRoleLabel }}</span>
                    <span v-if="trustProfile.completenessScore > 0">背景完整度 {{ trustProfile.completenessScore }}%</span>
                    <span v-if="trustProfile.applicableAudience">适用：{{ trustProfile.applicableAudience }}</span>
                    <span v-if="trustProfile.applicableContext">情境：{{ trustProfile.applicableContext }}</span>
                    <span v-if="trustProfile.knownLimitations">限制：{{ trustProfile.knownLimitations }}</span>
                    <span v-if="trustProfile.sourceSummary">来源：{{ trustProfile.sourceSummary }}</span>
                    <span v-if="trustProfile.interestDisclosure">披露：{{ trustProfile.interestDisclosure }}</span>
                  </div>
                  <div v-else-if="trustProfileLoadState === 'loading'" class="trust-profile-state">
                    正在读取公开经验背景...
                  </div>
                  <div v-else class="trust-profile-state">
                    {{ trustProfileLoadState === 'error' ? '经验护照暂时无法读取。' : '作者尚未补充经验背景。' }}
                  </div>
                </div>

                <div v-if="isQuestionPost" class="trusted-content-row">
                  <div class="trusted-content-row-copy">
                    <span>问题状态</span>
                    <strong>{{ questionStatusText }}</strong>
                    <p v-if="!isTrustedContentLoaded">{{ trustedContentAvailabilityDetail }}</p>
                    <p v-else-if="acceptedCommentId">已有一条回答被作者采纳；仍可继续补充新的经验和边界条件。</p>
                    <p v-else-if="questionStatus === 'NO_RELIABLE_CONCLUSION'">作者已说明当前讨论未形成可靠结论。</p>
                    <p v-else>根评论作为回答，楼中楼用于追问和补充讨论；作者可在根回答上选择“采用回答”。</p>
                    <RouterLink
                      v-if="isTrustedContentLoaded && questionStatus === 'DUPLICATE' && trustedContentState?.duplicatePostId"
                      :to="`/post/${trustedContentState.duplicatePostId}`"
                    >
                      查看重复问题
                    </RouterLink>
                  </div>
                  <div v-if="isOwnPost" class="trusted-content-controls">
                    <select
                      v-model="questionStatusDraft"
                      :disabled="!canMutateTrustedContent"
                      aria-label="问题状态"
                    >
                      <option
                        v-if="questionStatusDraft && !allowedQuestionStatuses.includes(questionStatusDraft)"
                        :value="questionStatusDraft"
                        disabled
                      >
                        当前：{{ questionStatusDraftLabel }}
                      </option>
                      <option v-for="option in questionStatusOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </option>
                    </select>
                    <input
                      v-if="questionStatusDraft === 'DUPLICATE'"
                      v-model="duplicatePostIdDraft"
                      :disabled="!canMutateTrustedContent"
                      inputmode="numeric"
                      maxlength="24"
                      placeholder="重复问题帖子 ID"
                      aria-label="重复问题帖子 ID"
                    />
                    <button type="button" :disabled="!canSaveQuestionState" @click="saveQuestionState">
                      {{ isSavingQuestionState ? '保存中...' : '保存问题状态' }}
                    </button>
                    <button
                      v-if="acceptedCommentId"
                      type="button"
                      class="trusted-content-secondary"
                      :disabled="!canMutateTrustedContent"
                      @click="clearAcceptedAnswer"
                    >
                      取消采纳回答
                    </button>
                  </div>
                </div>

                <div class="trusted-content-row">
                  <div class="trusted-content-row-copy">
                    <span>内容时效</span>
                    <strong>{{ freshnessStatusText }}</strong>
                    <p v-if="!isTrustedContentLoaded">{{ trustedContentAvailabilityDetail }}</p>
                    <p v-else-if="trustedContentState?.lastConfirmedAt">
                      作者最近确认于 {{ formatTime(trustedContentState.lastConfirmedAt) }}
                    </p>
                    <p v-else>尚无单独的时效确认记录；个人经历和观点不会被机械标记为过期。</p>
                    <RouterLink
                      v-if="isTrustedContentLoaded && freshnessStatus === 'SUPERSEDED' && trustedContentState?.successorPostId"
                      :to="`/post/${trustedContentState.successorPostId}`"
                    >
                      查看后续内容
                    </RouterLink>
                  </div>
                  <div v-if="isOwnPost" class="trusted-content-controls">
                    <select
                      v-model="freshnessStatusDraft"
                      :disabled="!canMutateTrustedContent"
                      aria-label="内容时效状态"
                    >
                      <option v-for="option in freshnessStatusOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </option>
                    </select>
                    <input
                      v-if="freshnessStatusDraft === 'SUPERSEDED'"
                      v-model="successorPostIdDraft"
                      :disabled="!canMutateTrustedContent"
                      inputmode="numeric"
                      maxlength="24"
                      placeholder="后续内容帖子 ID"
                      aria-label="后续内容帖子 ID"
                    />
                    <button type="button" :disabled="!canMutateTrustedContent" @click="saveFreshness">
                      {{ isSavingFreshness ? '保存中...' : '更新时效状态' }}
                    </button>
                  </div>
                </div>

                <div class="trusted-content-row trusted-content-useful">
                  <div class="trusted-content-row-copy">
                    <span>为什么有用</span>
                    <strong>{{ usefulFeedbackSummary }}</strong>
                    <p v-if="!isTrustedContentLoaded">{{ trustedContentAvailabilityDetail }}</p>
                    <p v-else>每位读者只保留一个主要原因，可以修改或取消。</p>
                  </div>
                  <div class="useful-reason-list" aria-label="为什么有用">
                    <button
                      v-for="option in USEFUL_FEEDBACK_REASON_OPTIONS"
                      :key="option.value"
                      type="button"
                      :class="{ 'useful-reason-active': myUsefulReason === option.value }"
                      :disabled="!canMutateTrustedContent || isOwnPost"
                      :aria-pressed="myUsefulReason === option.value"
                      :title="option.description"
                      @click="saveUsefulFeedback(option.value)"
                    >
                      <span>{{ option.label }}</span>
                      <strong>{{ usefulReasonCount(option.value) ?? '-' }}</strong>
                    </button>
                    <button
                      v-if="myUsefulReason"
                      type="button"
                      class="useful-reason-clear"
                      :disabled="!canMutateTrustedContent"
                      @click="clearUsefulFeedback"
                    >
                      取消我的反馈
                    </button>
                    <span v-else-if="isOwnPost" class="useful-reason-note">作者不能给自己的内容添加有用反馈。</span>
                    <button
                      v-else-if="!authStore.isLoggedIn"
                      type="button"
                      class="useful-reason-login"
                      :disabled="!isTrustedContentLoaded"
                      @click="requireLogin()"
                    >
                      登录后反馈
                    </button>
                  </div>
                </div>
              </section>

              <section
                v-if="contentTrustSignals.length || publicSuggestionRecords.length"
                class="content-trust-panel"
                data-phase15-content-trust
                data-explainable-trust-signals
              >
                <div>
                  <p class="content-trust-kicker">公开信号说明</p>
                  <h2>为什么展示这些信息</h2>
                  <p>仅展示公开、可访问、治理过滤后的事实型上下文，不作为平台结论。</p>
                </div>
                <div class="content-trust-grid">
                  <article v-for="signal in contentTrustSignals" :key="signal.key">
                    <span>{{ signal.label }}</span>
                    <strong>{{ signal.value }}</strong>
                    <p>{{ signal.description }}</p>
                  </article>
                  <article
                    v-for="item in publicSuggestionRecords"
                    :key="`public-suggestion-${item.suggestionId}-${item.decision}-${item.decidedAt || 0}`"
                  >
                    <span>{{ contentSuggestionTypeText(item.type) }}</span>
                    <strong>{{ contentSuggestionDecisionText(item.decision) }}</strong>
                    <p v-if="item.publicNote">{{ item.publicNote }}</p>
                    <p v-if="item.submitterNickname">建议来自 {{ item.submitterNickname }}</p>
                    <small v-if="item.decidedAt">处理于 {{ formatTime(item.decidedAt) }}</small>
                  </article>
                </div>
                <div
                  v-if="detailRelationshipContext.visibleToViewer"
                  class="content-relationship-note"
                  data-relationship-context-private
                >
                  <span v-for="item in detailRelationshipContext.items" :key="item.key">{{ item.label }}：{{ item.value }}</span>
                </div>
              </section>

              <section v-if="publicUpdates.length" class="public-update-list" aria-labelledby="public-update-list-title">
                <div class="public-update-list-head">
                  <div>
                    <p>更新记录</p>
                    <h2 id="public-update-list-title">作者公开说明的内容变化</h2>
                  </div>
                  <span>仅展示摘要和影响范围，不公开旧正文。</span>
                </div>
                <article v-for="item in publicUpdates" :key="`${item.resultVersion}-${item.createdAt}`">
                  <div>
                    <strong>版本 {{ item.resultVersion }}</strong>
                    <span>{{ formatTime(item.createdAt) }}</span>
                  </div>
                  <p>{{ item.publicUpdateSummary }}</p>
                  <small v-if="item.impactScope">{{ publicUpdateImpactText(item.impactScope) }}</small>
                </article>
              </section>

              <section
                id="content-suggestions"
                class="content-suggestion-panel"
                data-phase15-content-suggestion
                data-suggestions-private
                data-not-comment-flow
                data-suggestion-notification-preferences
              >
                <div class="content-suggestion-head">
                  <div>
                    <p class="content-trust-kicker">补充 / 纠错建议</p>
                    <h2>给这篇内容补一点上下文</h2>
                    <p>{{ contentSuggestionVisibilityNote }}</p>
                    <p v-if="highRiskSuggestionGuidance" class="content-suggestion-risk">{{ highRiskSuggestionGuidance }}</p>
                  </div>
                  <RouterLink to="/me/settings?tab=notifications" class="content-suggestion-link">通知偏好</RouterLink>
                </div>

                <div v-if="contentSuggestionError" class="content-suggestion-error" role="alert">
                  {{ contentSuggestionError }}
                </div>
                <div v-if="contentSuggestionFeedback" class="content-suggestion-feedback" role="status" aria-live="polite">
                  {{ contentSuggestionFeedback }}
                </div>

                <div v-if="isOwnPost" class="content-suggestion-author" data-author-suggestion-actions>
                  <div class="content-suggestion-author-actions">
                    <button type="button" class="content-suggestion-secondary" :disabled="isLoadingContentSuggestions" @click="loadContentSuggestions">
                      {{ isLoadingContentSuggestions ? '加载中...' : '刷新建议' }}
                    </button>
                    <button
                      type="button"
                      class="content-suggestion-secondary"
                      data-author-close-suggestion-entry
                      :disabled="isHandlingContentSuggestion"
                      @click="togglePostSuggestionEntry"
                    >
                      {{ postSuggestionEntryOpen === false ? '重新开启建议入口' : '关闭这篇建议入口' }}
                    </button>
                  </div>
                  <div v-if="isLoadingContentSuggestions" class="content-suggestion-empty">正在加载读者建议...</div>
                  <div v-else-if="contentSuggestions.length === 0" class="content-suggestion-empty">暂无待处理建议。</div>
                  <article
                    v-for="item in contentSuggestions"
                    v-else
                    :id="contentSuggestionDomId(item.id)"
                    :key="item.id"
                    class="content-suggestion-item"
                  >
                    <div class="content-suggestion-item-head">
                      <span>{{ contentSuggestionTypeText(item.type) }}</span>
                      <strong>
                        {{ item.decision ? contentSuggestionDecisionText(item.decision) : contentSuggestionStatusText(item.status) }}
                      </strong>
                    </div>
                    <ContentSuggestionPanel :suggestion="item" />
                    <p v-if="item.allowPublicAttribution && item.submitterNickname" class="content-suggestion-meta">
                      提交者允许公开昵称：{{ item.submitterNickname }}
                    </p>
                    <p v-if="item.publicNote" class="content-suggestion-public-note">公开处理说明：{{ item.publicNote }}</p>
                    <template v-if="item.status === 'PENDING'">
                      <textarea v-model="contentSuggestionReplyDrafts[String(item.id)]" rows="2" maxlength="500" placeholder="公开处理说明或未采纳原因，最多 500 字" />
                      <div class="content-suggestion-actions">
                        <button type="button" :disabled="isHandlingContentSuggestion" @click="decideContentSuggestion(item, 'ACCEPTED')">采纳</button>
                        <button type="button" :disabled="isHandlingContentSuggestion" @click="decideContentSuggestion(item, 'PARTIAL_ACCEPTED')">部分采纳</button>
                        <button type="button" :disabled="isHandlingContentSuggestion" @click="decideContentSuggestion(item, 'PLANNED')">计划处理</button>
                        <button type="button" :disabled="isHandlingContentSuggestion" @click="openSuggestionInEditor(item)">编辑并合并</button>
                        <button type="button" :disabled="isHandlingContentSuggestion" @click="decideContentSuggestion(item, 'REJECTED')">未采纳</button>
                      </div>
                    </template>
                  </article>
                </div>

                <div v-else-if="authStore.isLoggedIn" class="content-suggestion-reader">
                  <section class="content-suggestion-history" data-my-content-suggestions aria-labelledby="my-content-suggestions-title">
                    <div class="content-suggestion-history-head">
                      <div>
                        <p class="content-trust-kicker">我的建议</p>
                        <h3 id="my-content-suggestions-title">提交与处理记录</h3>
                      </div>
                      <span>仅你、作者和必要治理角色可见</span>
                    </div>
                    <div v-if="isLoadingContentSuggestions" class="content-suggestion-empty">正在读取你的建议...</div>
                    <div v-else-if="contentSuggestions.length === 0" class="content-suggestion-empty">你还没有给这篇内容提交建议。</div>
                    <article
                      v-for="item in contentSuggestions"
                      v-else
                      :id="contentSuggestionDomId(item.id)"
                      :key="item.id"
                      class="content-suggestion-item"
                    >
                      <div class="content-suggestion-item-head">
                        <span>{{ contentSuggestionTypeText(item.type) }}</span>
                        <strong>{{ item.decision ? contentSuggestionDecisionText(item.decision) : contentSuggestionStatusText(item.status) }}</strong>
                      </div>
                      <ContentSuggestionPanel :suggestion="item" />
                      <p v-if="item.authorReply" class="content-suggestion-public-note">作者回复：{{ item.authorReply }}</p>
                      <p v-if="item.publicNote" class="content-suggestion-public-note">公开处理说明：{{ item.publicNote }}</p>
                      <div class="content-suggestion-history-time">
                        <span v-if="item.createdAt">提交于 {{ formatTime(item.createdAt) }}</span>
                        <span v-if="item.decidedAt">处理于 {{ formatTime(item.decidedAt) }}</span>
                      </div>
                    </article>
                  </section>

                  <form class="content-suggestion-form" @submit.prevent="submitContentSuggestion">
                    <label>
                      <span>建议类型</span>
                      <select v-model="contentSuggestionForm.type">
                        <option v-for="option in CONTENT_SUGGESTION_TYPE_OPTIONS" :key="option.value" :value="option.value">
                          {{ option.label }} · {{ option.description }}
                        </option>
                      </select>
                    </label>
                    <label>
                      <span>具体建议</span>
                      <textarea v-model="contentSuggestionForm.detail" rows="4" maxlength="2000" placeholder="写下你希望作者补充、核对或澄清的内容" />
                    </label>
                    <div class="content-suggestion-structure-fields">
                      <label>
                        <span>建议范围</span>
                        <select v-model="contentSuggestionForm.targetScope">
                          <option v-for="option in CONTENT_SUGGESTION_TARGET_SCOPE_OPTIONS" :key="option.value" :value="option.value">
                            {{ option.label }}
                          </option>
                        </select>
                      </label>
                      <label>
                        <span>具体位置（可选）</span>
                        <input
                          v-model.trim="contentSuggestionForm.targetLocator"
                          type="text"
                          maxlength="300"
                          :placeholder="contentSuggestionTargetLocatorPlaceholder"
                        >
                      </label>
                      <label class="content-suggestion-expected-field">
                        <span>预期改动（可选）</span>
                        <textarea
                          v-model="contentSuggestionForm.expectedChange"
                          rows="3"
                          maxlength="1000"
                          placeholder="例如：补充适用条件、更新数据口径，或在对应段落增加来源说明"
                        />
                      </label>
                    </div>
                    <label>
                      <span>相关链接（可选）</span>
                      <input v-model="contentSuggestionForm.sourceUrl" type="url" placeholder="https://..." />
                    </label>
                    <label class="content-suggestion-checkbox">
                      <input v-model="contentSuggestionForm.allowPublicAttribution" type="checkbox" />
                      <span>如果作者采纳，允许展示我的昵称；默认不公开提交者身份。</span>
                    </label>
                    <div class="content-suggestion-form-actions">
                      <span>{{ contentSuggestionSubmitGuard.reason }}</span>
                      <button type="submit" :disabled="contentSuggestionSubmitDisabled">
                        {{ isSubmittingContentSuggestion ? '提交中...' : '提交给作者' }}
                      </button>
                    </div>
                  </form>
                </div>

                <div v-else class="content-suggestion-empty">
                  登录后可以给作者提交补充或纠错建议，建议不会自动公开。
                  <button type="button" @click="requireLogin()">去登录</button>
                </div>
              </section>

              <section class="discussion-follow-panel" aria-labelledby="discussion-follow-title">
                <div>
                  <p class="discussion-follow-kicker">关注讨论</p>
                  <h2 id="discussion-follow-title">有新回复时提醒我</h2>
                  <p>{{ discussionFollowDescription }}</p>
                </div>
                <div class="discussion-follow-actions">
                  <button
                    type="button"
                    :class="['discussion-follow-button', discussionFollowState.followed ? 'discussion-follow-button--active' : '']"
                    :disabled="discussionFollowActionDisabled"
                    :aria-pressed="discussionFollowState.followed"
                    @click="toggleDiscussionFollow"
                  >
                    {{ discussionFollowActionLabel }}
                  </button>
                  <RouterLink to="/me/settings?tab=notifications" class="discussion-follow-link">
                    查看通知偏好
                  </RouterLink>
                  <span>{{ discussionFollowStatusText }}</span>
                </div>
              </section>

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

            <section id="comments" class="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
              <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">{{ discussionSectionTitle }}</h2>
                <div class="inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800 sm:w-auto" aria-label="评论排序">
                  <button
                    v-for="option in commentSortOptions"
                    :key="option.value"
                    type="button"
                    class="flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                    :class="commentSort === option.value ? 'bg-white text-primary-600 shadow-sm dark:bg-slate-900 dark:text-primary-300' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'"
                    :disabled="isLoadingComments || isLoadingMoreComments"
                    @click="setCommentSort(option.value)"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>

              <div v-if="authStore.isLoggedIn" class="mb-6 border-b border-slate-200 pb-6 dark:border-slate-800">
                <textarea
                  v-model="commentText"
                  rows="3"
                  maxlength="2000"
                  :placeholder="discussionPlaceholder"
                  class="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <div class="mt-3 flex items-center justify-end gap-2">
                  <span class="mr-auto text-xs text-slate-400 dark:text-slate-500">{{ commentText.length }}/2000</span>
                  <button type="button" class="rounded-lg px-4 py-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" @click="commentText = ''">
                    取消
                  </button>
                  <button
                    type="button"
                    class="rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="!commentText.trim() || isSubmittingComment"
                    @click="handleSubmitComment"
                  >
                    {{ isSubmittingComment ? '发送中...' : discussionSubmitLabel }}
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
                :post-author-uid="canOpenAuthorProfile ? post.author.uid : undefined"
                :can-like-comments="authStore.isLoggedIn"
                :can-report-comments="true"
                :can-reply-comments="authStore.isLoggedIn"
                :can-mark-helpful-comments="authStore.isLoggedIn"
                :can-manage-quality-signals="isOwnPost || isContentModerator"
                :can-moderate-comments="isContentModerator"
                :can-accept-answer="canAcceptAnswer"
                :accepted-comment-id="acceptedCommentId ?? undefined"
                :accept-answer-pending="!isTrustedContentLoaded || isAcceptingAnswer"
                :loading-reply-root-ids="loadingReplyRootIds"
                :empty-text="discussionEmptyText"
                :reply-action-label="discussionReplyActionLabel"
                :reply-placeholder="discussionReplyPlaceholder"
                :reply-submit-label="discussionReplySubmitLabel"
                @require-login="requireLogin"
                @like-comment="handleLikeComment"
                @unlike-comment="handleUnlikeComment"
                @helpful-comment="handleHelpfulComment"
                @unhelpful-comment="handleUnhelpfulComment"
                @pin-comment="handlePinComment"
                @unpin-comment="handleUnpinComment"
                @feature-comment="handleFeatureComment"
                @unfeature-comment="handleUnfeatureComment"
                @fold-comment="handleFoldComment"
                @unfold-comment="handleUnfoldComment"
                @accept-answer="acceptAnswer"
                @reply-comment="handleReplyComment"
                @load-more-replies="handleLoadMoreReplies"
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

          <div v-else-if="isTransientPostError" class="surface-card flex flex-col items-center justify-center px-6 py-12 text-center">
            <h3 class="mb-2 text-lg font-black text-slate-950 dark:text-slate-100">{{ postErrorTitle }}</h3>
            <p class="mb-6 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">{{ postErrorDescription }}</p>
            <div class="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                class="primary-action"
                :disabled="isFetchingPost"
                @click="refetchPost()"
              >
                {{ isFetchingPost ? '重试中...' : '重试' }}
              </button>
              <RouterLink to="/" class="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                返回首页
              </RouterLink>
            </div>
          </div>

          <EmptyState v-else :title="postUnavailableTitle" :description="postUnavailableDescription" actionText="返回首页" actionHref="/" />
        </div>

        <aside class="hidden lg:block">
          <div class="sticky top-24 space-y-6">
            <section v-if="post" class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 class="mb-4 font-bold text-slate-900 dark:text-slate-100">作者名片</h3>
              <RouterLink v-if="canOpenAuthorProfile" :to="authorProfileTo" class="flex flex-col items-center text-center">
                <UserAvatar
                  class="mb-3 h-16 w-16 rounded-full text-2xl font-bold"
                  :src="post.author.avatar"
                  :name="post.author.nickname"
                  alt=""
                />
                <h4 class="font-semibold text-slate-900 dark:text-slate-100">{{ post.author.nickname || '未知用户' }}</h4>
                <p class="mt-1 line-clamp-3 text-xs text-slate-500 dark:text-slate-400">{{ authorBioText }}</p>
              </RouterLink>
              <div v-else class="flex flex-col items-center text-center">
                <UserAvatar
                  class="mb-3 h-16 w-16 rounded-full text-2xl font-bold"
                  :src="post.author.avatar"
                  :name="post.author.nickname"
                  alt=""
                />
                <h4 class="font-semibold text-slate-900 dark:text-slate-100">{{ post.author.nickname || '未知用户' }}</h4>
                <p class="mt-1 line-clamp-3 text-xs text-slate-500 dark:text-slate-400">{{ post.anonymous ? '这篇内容以匿名方式发布，不展示作者主页入口。' : authorBioText }}</p>
              </div>
              <div v-if="canOpenAuthorProfile" class="author-reason-box">
                <strong>推荐关注理由</strong>
                <p>{{ authorFollowReason }}</p>
                <RouterLink :to="authorProfileTo">查看作者主页</RouterLink>
              </div>
              <div v-if="isOwnPost" class="creator-feedback-box">
                <strong>本篇内容反馈</strong>
                <div class="creator-feedback-grid">
                  <span>{{ post.counter.comment }} 条评论</span>
                  <span>{{ post.counter.favorite }} 次收藏</span>
                  <span>{{ post.counter.like }} 次点赞</span>
                </div>
                <p>这里仅展示这篇公开内容的回应信号；完整的 7 天/30 天概览请回到创作者工作台查看。</p>
                <div class="creator-feedback-actions">
                  <RouterLink :to="{ path: '/me', hash: '#creator-workbench' }" class="creator-feedback-link">回到创作者工作台</RouterLink>
                  <RouterLink :to="{ path: `/post/${postId}`, hash: '#comments' }" class="creator-feedback-link">查看评论区</RouterLink>
                  <RouterLink
                    :to="{ path: '/editor', query: { source: 'creator_workbench', action: 'update', contextType: 'post', postId: String(post.postId), title: post.title, reasonText: '本篇公开内容反馈入口', returnHref: `/post/${postId}` } }"
                    class="creator-feedback-link"
                  >
                    带上下文进入编辑器
                  </RouterLink>
                </div>
              </div>
            </section>

            <section class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 class="mb-4 font-bold text-slate-900 dark:text-slate-100">{{ relatedSectionTitle }}</h3>
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
              <p v-else class="text-sm text-slate-500 dark:text-slate-400">{{ relatedEmptyText }}</p>
            </section>
          </div>
        </aside>
      </div>
    </main>

    <div v-if="isReportDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" @click.self="closeReportDialog">
      <form ref="reportDialog" class="report-dialog-panel w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title" tabindex="-1" @submit.prevent="submitReport">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 id="report-dialog-title" class="text-lg font-bold text-slate-950 dark:text-slate-50">举报{{ reportTargetLabel }}</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">说明问题后提交给平台处理，结果会结合上下文判断。</p>
          </div>
          <button type="button" class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="closeReportDialog">
            关闭
          </button>
        </div>

        <div
          v-if="reportFeedback && isReportSubmitSuccess"
          class="report-feedback report-feedback--success"
          role="status"
          aria-live="polite"
        >
          <strong>{{ reportFeedback.title }}</strong>
          <span>{{ reportFeedback.message }}</span>
        </div>
        <div
          v-else-if="reportFeedback"
          class="report-feedback"
          :class="reportFeedback.tone === 'warning' ? 'report-feedback--warning' : 'report-feedback--error'"
          role="alert"
        >
          <strong>{{ reportFeedback.title }}</strong>
          <span>{{ reportFeedback.message || '内容状态已变化，无需重复举报。' }}</span>
        </div>

        <label class="mt-5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          举报类型
          <select ref="reportReasonSelect" v-model="reportForm.reason" class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
            <option v-for="reason in REPORT_REASON_OPTIONS" :key="reason.value" :value="reason.value">
              {{ reason.label }}
            </option>
          </select>
        </label>

        <label class="mt-4 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          补充说明
          <textarea
            v-model.trim="reportForm.detail"
            rows="4"
            maxlength="1000"
            placeholder="可补充你看到的问题，避免填写个人敏感信息"
            class="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>

        <div class="mt-5 flex justify-end gap-3">
          <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="closeReportDialog">
            {{ isReportSubmitSuccess ? '完成' : '取消' }}
          </button>
          <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60" :disabled="isReporting || isReportSubmitSuccess">
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

    <ContactRequestDialog
      v-if="post"
      v-model="isContactDialogOpen"
      :receiver-uid="post.author.uid"
      :receiver-name="post.author.nickname"
      source-type="post"
      :source-id="post.postId"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { ArrowLeft } from 'lucide-vue-next'
import PostReferencePanel from '@/components/post/PostReferencePanel.vue'
import ReadingThreadPanel from '@/components/post/ReadingThreadPanel.vue'
import ContentEvolutionPanel from '@/components/post/ContentEvolutionPanel.vue'
import PostOutcomePanel from '@/components/post/PostOutcomePanel.vue'
import ContentSuggestionPanel from '@/components/post/ContentSuggestionPanel.vue'
import { postApi, type InterviewMaterialPack } from '@/api/post'
import { interactionApi } from '@/api/interaction'
import { adaptComment, adaptPage } from '@/api/adapters'
import { userApi } from '@/api/user'
import { opsApi, type MyAdminPermissions } from '@/api/ops'
import {
  CONTENT_SUGGESTION_DECISION_LABELS,
  CONTENT_SUGGESTION_STATUS_LABELS,
  CONTENT_SUGGESTION_TYPE_OPTIONS,
  buildContentSuggestionDuplicateKey,
  canSubmitContentSuggestion,
  contentSuggestionApi,
  normalizeHttpUrl,
  type ContentSuggestionDecision,
  type ContentSuggestionRecord,
  type ContentSuggestionStatus,
  type ContentSuggestionTargetScope,
  type ContentSuggestionType,
} from '@/api/contentSuggestions'
import {
  FRESHNESS_STATUS_LABELS,
  QUESTION_STATUS_LABELS,
  USEFUL_FEEDBACK_REASON_OPTIONS,
  trustedContentApi,
  type FreshnessStatus,
  type QuestionStatus,
  type TrustProfile,
  type TrustedContentState,
  type UsefulFeedbackReason,
} from '@/api/trustedContent'
import { useAuthStore } from '@/stores/auth'
import { useAccessibleDialog } from '@/composables/useAccessibleDialog'
import { useEffectiveRead } from '@/composables/useEffectiveRead'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import {
  consumePendingInteraction,
  findPendingInteraction,
  rememberPendingInteraction,
  type PendingInteraction,
} from '@/utils/pendingInteraction'
import AppHeader from '@/components/layout/AppHeader.vue'
import MarkdownRenderer from '@/components/post/MarkdownRenderer.vue'
import InteractionBar from '@/components/post/InteractionBar.vue'
import PostSaveOrganizer from '@/components/post/PostSaveOrganizer.vue'
import CommentTree from '@/components/post/CommentTree.vue'
import PostQuestionBlock from '@/components/question/PostQuestionBlock.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ContactRequestDialog from '@/components/contact/ContactRequestDialog.vue'
import { formatTime } from '@/lib/format'
import { toast } from 'vue-sonner'
import client, { BizException, getErrorMessage } from '@/api/client'
import type { ApiId, Comment, Post, PostPublishStatus, PostVersionHistory, PublicPostUpdate } from '@/api/types'
import { isPersistableKnowledgeRelation, knowledgeApi, type KnowledgeExploreResponse, type KnowledgePath, type KnowledgePreviewSource, type KnowledgeRelation, type PublicKnowledgeAsset, type PublicKnowledgeAssetType } from '@/api/knowledge'
import { POST_TYPE, getContentTypeLabel, isLegacyInterviewType } from '@/utils/contentTypes'
import { DOMAIN, getDomainIcon, getDomainLabel, getDomainLabelSafe, isKnownDomain } from '@/utils/domains'
import { buildDomainDetailSurface } from '@/utils/domainPostSurfaces'
import { applyPageSeo, summarizeSeoText } from '@/utils/seo'
import { buildFollowReasons, isPublicAuthor, safeCreatorBio } from '@/utils/creatorSignals'
import { findHighRiskContentWarning, isPublicPostVisible } from '@/utils/recommendationGovernance'
import { buildContentTrustSignals, buildRelationshipContext } from '@/utils/communityIdentity'
import {
  REPORT_REASON_OPTIONS,
  getUnavailableContentCopy,
  mapReportErrorToFeedback,
  normalizeRiskNoticeForUsers,
  reportSuccessFeedback,
  type GovernanceFeedback,
} from '@/utils/governanceDisplay'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { requireLogin } = useLoginRedirect()

type CommentSort = 'latest' | 'quality'
type CommentQualityAction = 'helpful' | 'unhelpful' | 'pin' | 'unpin' | 'feature' | 'unfeature' | 'fold' | 'unfold'
type PostRouteLoadContext = {
  generation: number
  postId: string
  signal: AbortSignal
}
type InteractionSessionOwner = {
  uid: string
  sessionGeneration: number
}
type InteractionRequestOwner = InteractionSessionOwner & {
  postId: string
  requestId: number
}
type TrustedContentLoadState = 'loading' | 'loaded' | 'error'
type QualityComment = Comment & {
  authorReply?: boolean
  authorPinned?: boolean
  featured?: boolean
  helpfulCount?: number
  myHelpful?: boolean
  hotScore?: number
  folded?: boolean
  foldReason?: string
  qualityBadges?: string[]
}

const MAX_COMMENT_ROOTS = 100
const MAX_REPLIES_PER_ROOT = 60
const MAX_COMMENT_NODES = 400

const adminPermissions = ref<MyAdminPermissions | null>(null)
const versionHistories = ref<PostVersionHistory[]>([])
const publicUpdates = ref<PublicPostUpdate[]>([])
const trustedContentState = ref<TrustedContentState | null>(null)
const trustProfile = ref<TrustProfile | null>(null)
const trustProfileLoadState = ref<'loading' | 'loaded' | 'error'>('loading')
const trustedContentLoadState = ref<TrustedContentLoadState>('loading')
const isLoadingTrustedContent = computed(() => trustedContentLoadState.value === 'loading')
const trustedContentError = ref('')
const trustedContentFeedback = ref('')
const isSavingUsefulFeedback = ref(false)
const questionStatusDraft = ref<QuestionStatus | ''>('')
const duplicatePostIdDraft = ref('')
const isSavingQuestionState = ref(false)
const isAcceptingAnswer = ref(false)
const freshnessStatusDraft = ref<FreshnessStatus | ''>('')
const successorPostIdDraft = ref('')
const isSavingFreshness = ref(false)
const isTrustedContentLoaded = computed(() => trustedContentLoadState.value === 'loaded')
const trustedContentMutationPending = computed(() => (
  isSavingUsefulFeedback.value
  || isSavingQuestionState.value
  || isAcceptingAnswer.value
  || isSavingFreshness.value
))
const canMutateTrustedContent = computed(() => (
  isTrustedContentLoaded.value && !trustedContentMutationPending.value
))
const isVersionDialogOpen = ref(false)
const isLoadingVersions = ref(false)
const versionLoadAttempted = ref(false)
const showStageTwoDetailPanels = false
const enableLegacyTrainingRoutes = import.meta.env.VITE_OFFERLAB_ENABLE_LEGACY_TRAINING === 'true'
const postId = computed(() => route.params.id as string)
const goBack = () => {
  const previousRoute = window.history.state?.back
  if (typeof previousRoute === 'string' && previousRoute.startsWith('/')) {
    router.back()
    return
  }
  router.push('/')
}
const detailKnowledge = ref<KnowledgeExploreResponse | null>(null)
const detailKnowledgeLoading = ref(false)
const detailKnowledgeError = ref('')
const commentText = ref('')
const isSubmittingComment = ref(false)
const isReporting = ref(false)
const isDeletingPost = ref(false)
let interactionRequestId = 0
let interactionStateRequestId = 0
const likeActionOwner = ref<InteractionRequestOwner | null>(null)
const favoriteActionOwner = ref<InteractionRequestOwner | null>(null)
const interactionSessionOwnerIsCurrent = (owner: InteractionSessionOwner) => (
  authStore.isLoggedIn
  && owner.uid === String(authStore.user?.uid ?? '')
  && owner.sessionGeneration === authStore.getSessionGeneration()
)
const interactionRequestOwnerIsCurrent = (owner: InteractionRequestOwner) =>
  interactionSessionOwnerIsCurrent(owner)
const invalidateInteractionStateLoads = () => {
  interactionStateRequestId += 1
}
const isTogglingLike = computed(() =>
  Boolean(
    likeActionOwner.value
    && interactionRequestOwnerIsCurrent(likeActionOwner.value)
    && likeActionOwner.value.postId === String(post.value?.postId ?? ''),
  ),
)
const isTogglingFavorite = computed(() =>
  Boolean(
    favoriteActionOwner.value
    && interactionRequestOwnerIsCurrent(favoriteActionOwner.value)
    && favoriteActionOwner.value.postId === String(post.value?.postId ?? ''),
  ),
)
const interactionFeedback = ref('')
const discussionFollowState = ref({
  followed: false,
  loading: false,
  pending: false,
  loaded: false,
  error: '',
})
const isReportDialogOpen = ref(false)
const reportDialog = ref<HTMLElement | null>(null)
const reportReasonSelect = ref<HTMLSelectElement | null>(null)
const isFollowingAuthor = ref(false)
const isContactDialogOpen = ref(false)
const reportForm = ref({ reason: 'OTHER', detail: '' })
const reportTarget = ref<{ type: 'post' | 'comment'; id?: Comment['commentId'] }>({ type: 'post' })
const reportFeedback = ref<GovernanceFeedback | null>(null)
const isReportSubmitSuccess = ref(false)
const contentSuggestions = ref<ContentSuggestionRecord[]>([])
const isLoadingContentSuggestions = ref(false)
const isSubmittingContentSuggestion = ref(false)
const isHandlingContentSuggestion = ref(false)
let contentSuggestionLoadGeneration = 0
const contentSuggestionError = ref('')
const contentSuggestionFeedback = ref('')
const postSuggestionEntryOpen = ref(true)
const contentSuggestionReplyDrafts = ref<Record<string, string>>({})
type ContentSuggestionForm = {
  type: ContentSuggestionType
  detail: string
  targetScope: ContentSuggestionTargetScope
  targetLocator: string
  expectedChange: string
  sourceUrl: string
  allowPublicAttribution: boolean
}
const createContentSuggestionForm = (): ContentSuggestionForm => ({
  type: 'CORRECTION',
  detail: '',
  targetScope: 'CONTENT',
  targetLocator: '',
  expectedChange: '',
  sourceUrl: '',
  allowPublicAttribution: false,
})
const contentSuggestionForm = ref<ContentSuggestionForm>(createContentSuggestionForm())
const unavailableReportFeedbackMessage = '内容状态已变化，无需重复举报'
const duplicateReportFeedbackMessage = '重复举报已收到，已有待处理举报，请勿重复提交。'
const rateLimitedReportFeedbackMessage = '举报太频繁，请稍后再提交。'
const reportFailedFeedbackMessage = '举报提交失败，暂时无法提交举报。'
const reportSubmittedFeedbackMessage = '感谢反馈，我们会根据社区规则处理，可在我的举报查看处理进度。'
const comments = ref<Comment[]>([])
const commentTreeRef = ref<{
  markCommentLikeSettled: (commentId: Comment['commentId']) => void
  markCommentQualitySettled: (commentId: Comment['commentId'], action: CommentQualityAction) => void
} | null>(null)
const relatedPosts = ref<Post[]>([])
const commentSort = ref<CommentSort>('latest')
const commentSortOptions: Array<{ value: CommentSort; label: string }> = [
  { value: 'latest', label: '最新' },
  { value: 'quality', label: '高质量优先' },
]
const commentCursor = ref<string | undefined>()
const hasMoreComments = ref(false)
const isLoadingComments = ref(false)
const isLoadingMoreComments = ref(false)
const loadingReplyRootIds = ref<Array<string | number>>([])
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
let postRouteGeneration = 1
let postRouteController = new AbortController()
let commentLoadGeneration = 0
let commentViewGeneration = 0
let commentLoadController: AbortController | null = null
const replyLoadControllers = new Map<string, AbortController>()
const commentContextLoads = new Map<string, Promise<boolean>>()
const commentContextAttempts = new Set<string>()
const contextCommentRootIds = new Set<string>()
const contextCommentTargetIds = new Set<string>()
const protectedContextRootIds = new Set<string>()
let lastFocusedRouteHashKey = ''

const capturePostRouteContext = (targetPostId = postId.value): PostRouteLoadContext => ({
  generation: postRouteGeneration,
  postId: String(targetPostId),
  signal: postRouteController.signal,
})

const isActivePostRouteContext = (context: PostRouteLoadContext) => (
  !context.signal.aborted
  && context.generation === postRouteGeneration
  && context.postId === String(postId.value)
)

const isActiveLoadedPostContext = (context: PostRouteLoadContext) => (
  isActivePostRouteContext(context)
  && context.postId === String(post.value?.postId ?? '')
)

const abortReplyLoads = () => {
  replyLoadControllers.forEach((controller) => controller.abort())
  replyLoadControllers.clear()
  loadingReplyRootIds.value = []
}

const resetCommentViewContext = () => {
  commentViewGeneration += 1
  commentContextLoads.clear()
  commentContextAttempts.clear()
  contextCommentRootIds.clear()
  contextCommentTargetIds.clear()
  protectedContextRootIds.clear()
}

const beginPostRouteGeneration = () => {
  postRouteController.abort()
  postRouteController = new AbortController()
  postRouteGeneration += 1
  commentLoadGeneration += 1
  commentLoadController?.abort()
  commentLoadController = null
  abortReplyLoads()
  resetCommentViewContext()
  lastFocusedRouteHashKey = ''
}

const isCanceledRequest = (error: unknown) => {
  const candidate = error as { name?: string; code?: string } | null
  return candidate?.name === 'AbortError'
    || candidate?.name === 'CanceledError'
    || candidate?.code === 'ERR_CANCELED'
}

const { data: postData, isLoading, error: postError, refetch: refetchPost, isFetching: isFetchingPost } = useQuery({
  queryKey: computed(() => ['post', postId.value, authStore.sessionQueryScope]),
  queryFn: () => postApi.getDetail(postId.value),
  enabled: computed(() => Boolean(postId.value)),
  retry: false,
})

const { data: publishStatusData } = useQuery({
  queryKey: computed(() => ['post-publish-status', postId.value, authStore.sessionQueryScope]),
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

const readPostSuggestionEntryOpen = (source?: Post | null) => {
  if (!source) return true
  const value = (source as any).suggestionsOpen
    ?? (source as any).contentSuggestionsOpen
    ?? source.extension?.suggestionsOpen
    ?? source.extension?.contentSuggestionsOpen
  return value === false || value === 'false' ? false : true
}

const post = ref<Post | null>(null)
const failedDetailImages = ref<string[]>([])
const publishStatus = computed<PostPublishStatus | null>(() => publishStatusData.value?.data || null)
const authorUid = computed(() => String(post.value?.author.uid ?? ''))
const isOwnPost = computed(() => String(authStore.user?.uid ?? '') === String(post.value?.author.uid ?? ''))
const effectiveReadEnabled = computed(() => (
  authStore.isLoggedIn
  && Boolean(post.value?.postId)
  && !isOwnPost.value
  && isPublicPostVisible(post.value as Post)
))
const loadedEffectiveReadPostId = computed(() => (
  post.value?.postId && String(post.value.postId) === String(postId.value)
    ? post.value.postId
    : null
))
useEffectiveRead(loadedEffectiveReadPostId, { enabled: effectiveReadEnabled })
const isAnonymousMaskedAuthor = computed(() => Boolean(post.value?.anonymous))
const canOpenAuthorProfile = computed(() => Boolean(post.value)
  && !isAnonymousMaskedAuthor.value
  && isPublicAuthor(post.value?.author)
  && authorUid.value !== ''
  && authorUid.value !== '0')
const canFollowAuthor = computed(() => canOpenAuthorProfile.value && !isOwnPost.value)
const isAuthorContactRequestOpen = computed(() => {
  const author = post.value?.author
  if (!author || author.profileVisible === false) return false
  if (author.canStartContactRequest !== undefined) return author.canStartContactRequest === true
  if (author.acceptContactRequest === false) return false
  return String(author.contactRequestPolicy ?? '').toLowerCase() !== 'off'
})
const showContactAuthorEntry = computed(() => canOpenAuthorProfile.value && !isOwnPost.value)
const canStartContactRequest = computed(() => showContactAuthorEntry.value && isAuthorContactRequestOpen.value)
const authorProfileTo = computed(() => `/u/${authorUid.value}`)
const authorBioText = computed(() => safeCreatorBio(post.value?.author.signature, '这位作者还没有填写简介。'))
const authorFollowReason = computed(() => buildFollowReasons(post.value?.author, post.value ? [post.value] : [])[0])
const safeSearchFallbackReason = (reason: string) => {
  const labels: Record<string, string> = {
    elasticsearch_empty: '索引首屏无可见结果，已补充数据库结果',
    elasticsearch_visibility_filtered: '索引结果经可见性过滤后不足，已补充数据库结果',
    elasticsearch_unavailable: 'Elasticsearch 不可用',
    mysql_fallback_continuation: '继续沿用数据库排序，避免切换排序序列',
    hot_sort_mysql: '热门排序使用数据库热度',
    search_api_error: '搜索请求失败',
  }
  return labels[reason] || ''
}
const searchEntryNotice = computed(() => {
  if (route.query.from !== 'search') return ''
  const readQuery = (key: string): string => {
    const value = route.query[key]
    return typeof value === 'string' ? value : Array.isArray(value) ? String(value[0] ?? '') : ''
  }
  const source = readQuery('source')
  const degraded = readQuery('degraded') === 'true'
  const fallbackReason = readQuery('fallbackReason')
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
  return parts.join('，')
})
const publishStatusItems = computed(() => {
  const status = publishStatus.value
  if (!status) return []
  return [
    {
      key: 'database',
      label: status.database?.publiclyVisible ? '已落库' : '待落库',
      ok: Boolean(status.database?.publiclyVisible),
      detail: status.database?.publiclyVisible
        ? '内容已满足公开列表可见规则'
        : '公开数据库记录暂未可见',
    },
    {
      key: 'search',
      label: status.search?.visible ? '搜索可见' : '搜索同步中',
      ok: Boolean(status.search?.visible),
      detail: status.search?.visible
        ? '公开搜索已能召回这篇内容'
        : '搜索链路暂未返回公开记录',
    },
    {
      key: 'outbox',
      label: 'Outbox',
      ok: Boolean(status.ready),
      detail: status.ready
        ? '发布事件已完成公开分发检查'
        : '发布后 Outbox 与搜索索引可能存在短暂延迟',
    },
  ]
})

const publishStatusSummary = computed(() => {
  const status = publishStatus.value
  if (!status) return ''
  return status.ready ? '公开分发已就绪' : '发布后搜索同步可能短暂延迟'
})
const contentTypeLabel = computed(() => getContentTypeLabel(post.value?.postType))
const isQuestionPost = computed(() => Number(post.value?.postType) === POST_TYPE.QUESTION)
const trustedContentAvailabilityText = computed(() => (
  trustedContentLoadState.value === 'error'
    ? '可信内容状态暂不可用'
    : '可信内容状态未知'
))
const trustedContentAvailabilityDetail = computed(() => (
  trustedContentLoadState.value === 'error'
    ? '服务端记录暂时无法读取，请重试后再查看或操作。'
    : '正在读取服务端记录，完成前不会展示或提交可信结论。'
))
const questionStatus = computed<QuestionStatus | null>(() => {
  if (!isTrustedContentLoaded.value) return null
  return trustedContentState.value?.questionStatus
    ?? (isQuestionPost.value ? 'OPEN' : 'CLOSED')
})
const questionStatusText = computed(() => (
  questionStatus.value
    ? QUESTION_STATUS_LABELS[questionStatus.value]
    : trustedContentAvailabilityText.value
))
const acceptedCommentId = computed(() => (
  isTrustedContentLoaded.value
    ? trustedContentState.value?.acceptedCommentId ?? null
    : null
))
const freshnessStatus = computed<FreshnessStatus | null>(() => (
  isTrustedContentLoaded.value
    ? trustedContentState.value?.freshnessStatus ?? 'CURRENT'
    : null
))
const freshnessStatusText = computed(() => (
  freshnessStatus.value
    ? FRESHNESS_STATUS_LABELS[freshnessStatus.value]
    : trustedContentAvailabilityText.value
))
const usefulFeedbackTotal = computed<number | null>(() => (
  isTrustedContentLoaded.value
    ? Number(trustedContentState.value?.usefulFeedbackTotal ?? 0)
    : null
))
const usefulFeedbackSummary = computed(() => (
  usefulFeedbackTotal.value == null
    ? trustedContentAvailabilityText.value
    : `${usefulFeedbackTotal.value} 次具体反馈`
))
const myUsefulReason = computed(() => (
  isTrustedContentLoaded.value
    ? trustedContentState.value?.myUsefulReason ?? null
    : null
))
const usefulReasonCount = (reason: UsefulFeedbackReason) => (
  isTrustedContentLoaded.value
    ? Number(trustedContentState.value?.usefulReasonCounts?.[reason] ?? 0)
    : null
)
const allowedQuestionStatuses = computed<QuestionStatus[]>(() => (
  isTrustedContentLoaded.value
    ? trustedContentState.value?.allowedQuestionStatuses ?? []
    : []
))
const questionStatusOptionLabels: Record<QuestionStatus, string> = {
  OPEN: '继续征集回答',
  ANSWERED: '已有回答，等待判断',
  ACCEPTED: '已有采纳回答',
  NO_RELIABLE_CONCLUSION: '未形成可靠结论',
  CLOSED: '关闭讨论',
  DUPLICATE: '重复问题',
}
const questionStatusOptions = computed<Array<{ value: QuestionStatus; label: string }>>(() => (
  allowedQuestionStatuses.value.map((status) => ({
    value: status,
    label: questionStatusOptionLabels[status],
  }))
))
const questionStatusDraftLabel = computed(() => (
  questionStatusDraft.value
    ? questionStatusOptionLabels[questionStatusDraft.value]
    : ''
))
const canSaveQuestionState = computed(() => (
  canMutateTrustedContent.value
  && Boolean(questionStatusDraft.value)
  && allowedQuestionStatuses.value.includes(questionStatusDraft.value as QuestionStatus)
))
const canAcceptAnswer = computed(() => (
  isQuestionPost.value
  && isOwnPost.value
  && isTrustedContentLoaded.value
  && questionStatus.value !== null
  && ['OPEN', 'ANSWERED', 'ACCEPTED'].includes(questionStatus.value)
))
const freshnessStatusOptions: Array<{ value: FreshnessStatus; label: string }> = [
  { value: 'CURRENT', label: '确认当前有效' },
  { value: 'POSSIBLY_STALE', label: '可能已经过时' },
  { value: 'AWAITING_AUTHOR_CONFIRMATION', label: '等待作者确认' },
  { value: 'UPDATED', label: '内容已更新' },
  { value: 'SUPERSEDED', label: '已有后续内容' },
]
const trustProfileRoleLabel = computed(() => {
  const labels: Record<string, string> = {
    PARTICIPANT: '亲历参与者',
    PRACTITIONER: '持续实践者',
    OBSERVER: '观察记录者',
    CURATOR: '资料整理者',
  }
  return labels[trustProfile.value?.authorRole || ''] || ''
})
const trustProfileTitle = computed(() => {
  if (trustProfileLoadState.value === 'loading') return '正在读取经验背景'
  if (!trustProfile.value?.profileAvailable) return '尚未补充经验背景'
  return trustProfileRoleLabel.value || '作者已补充经验背景'
})
const trustProfileDescription = computed(() => {
  if (trustProfileLoadState.value === 'loading') return '仅展示作者主动填写的公开经验说明。'
  if (trustProfileLoadState.value === 'error') return '服务端记录暂时无法读取，这不代表内容缺少经验背景。'
  if (!trustProfile.value?.profileAvailable) {
    return '这篇内容仍可正常阅读和讨论；经验护照是可选说明，不代表认证、资质或平台背书。'
  }
  return '仅展示作者主动填写的公开背景、适用范围和已知限制，不构成平台认证、专业建议或结果承诺。'
})
const discussionSectionTitle = computed(() => (
  isQuestionPost.value
    ? `讨论与建议（${post.value?.counter.comment ?? 0}）`
    : `评论（${post.value?.counter.comment ?? 0}）`
))
const discussionPlaceholder = computed(() => (
  isQuestionPost.value
    ? '写下你的建议、经验或可尝试的方案，也可以补充你遇到的类似情况...'
    : '分享你的想法...'
))
const discussionSubmitLabel = computed(() => (isQuestionPost.value ? '发布建议' : '发送'))
const discussionEmptyText = computed(() => (
  isQuestionPost.value
    ? '还没有建议，来分享一个可尝试的思路吧'
    : '还没有评论，来抢沙发吧'
))
const discussionReplyActionLabel = computed(() => (isQuestionPost.value ? '追问 / 补充' : '回复'))
const discussionReplyPlaceholder = computed(() => (
  isQuestionPost.value
    ? '补充你的建议、追问或相似经历'
    : '写下回复...'
))
const discussionReplySubmitLabel = computed(() => (isQuestionPost.value ? '补充讨论' : '回复'))
const discussionFollowDescription = computed(() => (
  isQuestionPost.value
    ? '关注讨论用于跟进这个问题后续的新建议和追问。收藏只保存内容，不会默认开启新回复提醒。'
    : '关注讨论用于跟进这个帖子后续的新回复。收藏只保存内容，不会默认开启新回复提醒。'
))
const discussionFollowStatusText = computed(() => {
  if (discussionFollowState.value.error) return discussionFollowState.value.error
  if (!authStore.isLoggedIn) return '登录后可以关注讨论，后续新回复会进入通知。'
  if (discussionFollowState.value.loading) return '正在读取关注状态...'
  if (!discussionFollowState.value.loaded) return '关注后，帖子有新回复时会通知你。'
  return discussionFollowState.value.followed
    ? '已关注讨论，新回复会进入通知。'
    : '关注后，帖子有新回复时会通知你。'
})
const discussionFollowActionLabel = computed(() => {
  if (discussionFollowState.value.pending) return '处理中'
  if (discussionFollowState.value.loading) return '读取中'
  return discussionFollowState.value.followed ? '取消关注' : '关注讨论'
})
const discussionFollowActionDisabled = computed(() => (
  discussionFollowState.value.loading || discussionFollowState.value.pending
))
const relatedSectionTitle = computed(() => (isQuestionPost.value ? '相关问题求助' : '相关帖子'))
const relatedEmptyText = computed(() => (isQuestionPost.value ? '暂无相似讨论' : '暂无相关内容'))
const isLegacyInterview = computed(() => false)
const visibleTechStacks = computed(() => Array.isArray(post.value?.extension?.techStacks)
  ? post.value.extension.techStacks.map(String).filter(Boolean).slice(0, 8)
  : [])
const domainDetailSurface = computed(() => post.value ? buildDomainDetailSurface(post.value) : null)
const visibleDetailImages = computed(() => {
  const failed = new Set(failedDetailImages.value)
  return (domainDetailSurface.value?.images || []).filter((image) => !failed.has(image))
})
const effectiveRiskNotice = computed(() => {
  if (domainDetailSurface.value?.riskNotice) return normalizeRiskNoticeForUsers(domainDetailSurface.value.riskNotice)
  if (!post.value) return ''
  const domainLabel = isKnownDomain(post.value.domain) ? getDomainLabel(post.value.domain) : ''
  return normalizeRiskNoticeForUsers(findHighRiskContentWarning([
    domainLabel,
    post.value.title,
    post.value.summary,
    post.value.content,
    ...(post.value.tags || []).map((tag) => tag.name),
  ].filter(Boolean).join(' ')))
})
const contentTrustSignals = computed(() => buildContentTrustSignals(post.value))
const detailRelationshipContext = computed(() => buildRelationshipContext({
  viewerUid: authStore.user?.uid,
  author: post.value?.author,
  post: post.value,
  isLoggedIn: authStore.isLoggedIn,
  isPublicVisitor: !authStore.isLoggedIn,
}))
const contentSuggestionVisibilityNote = computed(() => (
  '建议默认仅提交者、作者和必要治理角色可见，不会进入公开讨论；相关提醒沿用现有互动或系统通知偏好。'
))
const CONTENT_SUGGESTION_TARGET_SCOPE_OPTIONS: Array<{
  value: ContentSuggestionTargetScope
  label: string
}> = [
  { value: 'TITLE', label: '标题' },
  { value: 'CONTENT', label: '正文整体' },
  { value: 'SECTION', label: '指定段落' },
  { value: 'REFERENCE', label: '引用与来源' },
  { value: 'FRESHNESS', label: '时效信息' },
  { value: 'OTHER', label: '其他位置' },
]
const contentSuggestionTargetLocatorPlaceholder = computed(() => {
  const placeholders: Record<ContentSuggestionTargetScope, string> = {
    TITLE: '例如：标题中的数据或结论',
    CONTENT: '例如：正文整体或结尾总结',
    SECTION: '例如：“部署步骤”第 2 段',
    REFERENCE: '例如：参考链接 2 或引用段落',
    FRESHNESS: '例如：价格、规则或版本信息',
    OTHER: '描述建议对应的位置',
  }
  return placeholders[contentSuggestionForm.value.targetScope]
})
const highRiskSuggestionGuidance = computed(() => {
  if (!effectiveRiskNotice.value) return ''
  return contentSuggestionForm.value.type === 'CORRECTION'
    ? '高风险频道的事实更正只作为请作者补充来源或上下文，不由平台裁定专业结论。'
    : '高风险频道建议保持中性说明，优先补充来源、上下文和风险边界。'
})
const publicSuggestionRecords = computed(() => (
  (trustedContentState.value?.publicSuggestionRecords || []).slice(0, 3)
))
const contentSuggestionDuplicateKey = computed(() => buildContentSuggestionDuplicateKey({
  postId: post.value?.postId,
  submitterUid: authStore.user?.uid,
  type: contentSuggestionForm.value.type,
  detail: contentSuggestionForm.value.detail,
}))
const hasDuplicatePendingContentSuggestion = computed(() => (
  contentSuggestions.value.some((item) => item.status === 'PENDING'
    && buildContentSuggestionDuplicateKey({
      postId: item.postId || post.value?.postId,
      submitterUid: authStore.user?.uid,
      type: item.type,
      detail: item.detail,
    }) === contentSuggestionDuplicateKey.value)
))
const contentSuggestionSubmitGuard = computed(() => canSubmitContentSuggestion({
  isLoggedIn: authStore.isLoggedIn,
  isAuthor: isOwnPost.value,
  suggestionsOpen: postSuggestionEntryOpen.value,
  post: post.value,
  type: contentSuggestionForm.value.type,
  detail: contentSuggestionForm.value.detail,
  duplicatePending: hasDuplicatePendingContentSuggestion.value,
  blockedByAuthor: Boolean((post.value?.author as any)?.blockedByAuthor),
  governanceRestricted: Boolean((authStore.user as any)?.muted || (authStore.user as any)?.banned),
}))
const contentSuggestionSubmitDisabled = computed(() => isSubmittingContentSuggestion.value || !contentSuggestionSubmitGuard.value.allowed)
const contentSuggestionStatusText = (status: ContentSuggestionStatus) => CONTENT_SUGGESTION_STATUS_LABELS[status] || status
const contentSuggestionDecisionText = (decision?: ContentSuggestionDecision) => (
  decision ? CONTENT_SUGGESTION_DECISION_LABELS[decision] || decision : ''
)
const contentSuggestionTypeText = (type: ContentSuggestionType) => CONTENT_SUGGESTION_TYPE_OPTIONS.find((item) => item.value === type)?.label || type
const contentSuggestionDomId = (suggestionId: ContentSuggestionRecord['id']) => `content-suggestion-${String(suggestionId)}`

const invalidateContentSuggestionLoads = () => {
  contentSuggestionLoadGeneration += 1
  isLoadingContentSuggestions.value = false
}

const resetContentSuggestionState = () => {
  invalidateContentSuggestionLoads()
  contentSuggestions.value = []
  isLoadingContentSuggestions.value = false
  isSubmittingContentSuggestion.value = false
  isHandlingContentSuggestion.value = false
  contentSuggestionError.value = ''
  contentSuggestionFeedback.value = ''
  postSuggestionEntryOpen.value = true
  contentSuggestionReplyDrafts.value = {}
  contentSuggestionForm.value = createContentSuggestionForm()
}
const handleDetailImageError = (image: string) => {
  if (!failedDetailImages.value.includes(image)) {
    failedDetailImages.value = [...failedDetailImages.value, image]
  }
}
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
    label: '个人回看线索',
    value: post.value?.myInteraction?.favorited ? '已加入回看' : '可加入回看',
    detail: post.value?.myInteraction?.favorited
      ? '这篇经验已进入你的收藏线索，可继续沉淀为个人知识资产。'
      : '收藏或评论后，可在个人空间集中回看同主题知识卡。',
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
const postKnowledgeAssetTypeLabel = (type: PublicKnowledgeAssetType) => {
  const labels: Record<string, string> = {
    post: '内容',
    series: '所属系列',
    collection: '合集',
    topic: '相关专题',
    tag: '相关标签',
    search_entry: '搜索入口',
  }
  return labels[type] || type
}
const postKnowledgePreviewLabel = (source?: KnowledgePreviewSource) => {
  if (source === 'local') return 'local-only'
  if (source === 'fallback') return 'fallback'
  if (source === 'demo') return 'demo'
  return 'remote'
}
const buildLocalPostKnowledgeAsset = (
  assetType: PublicKnowledgeAssetType,
  assetId: string,
  title: string,
  summary: string,
  targetHref: string,
  sourceNote: string,
): PublicKnowledgeAsset => ({
  assetId,
  assetType,
  title,
  summary,
  assetStatus: 'active',
  visibilityState: 'visible',
  source: assetType === 'search_entry' ? 'search' : assetType,
  previewSource: 'local',
  sourceNote,
  targetHref,
  updatedAt: post.value?.updatedAt ? new Date(post.value.updatedAt).toISOString() : '',
})
const localPostKnowledgeAssets = computed(() => {
  const current = post.value
  if (!current) return [] as PublicKnowledgeAsset[]
  const assets: PublicKnowledgeAsset[] = []
  const extension = current.extension || {}
  const seriesId = String(extension.seriesId || extension.contentSeriesId || '').trim()
  const seriesTitle = String(extension.seriesTitle || extension.contentSeriesTitle || '').trim()
  if (seriesId || seriesTitle) {
    assets.push(buildLocalPostKnowledgeAsset(
      'series',
      seriesId || seriesTitle,
      seriesTitle || '所属系列',
      '由当前帖子扩展字段推导的所属系列入口。',
      seriesId ? `/collections/${encodeURIComponent(seriesId)}` : '',
      'local-only 推导，仅在详情页只读展示，需后端确认后才可成为正式知识资产。',
    ))
  }
  const topicSlug = String(extension.topicSlug || extension.curatedTopicSlug || '').trim()
  const topicTitle = String(extension.topicTitle || extension.curatedTopicTitle || '').trim()
  if (topicSlug || topicTitle) {
    assets.push(buildLocalPostKnowledgeAsset(
      'topic',
      topicSlug || topicTitle,
      topicTitle || topicSlug || '相关专题',
      '由当前帖子扩展字段推导的相关专题。',
      topicSlug ? `/topics/${encodeURIComponent(topicSlug)}` : '',
      'local-only 推导，仅作公开关系提示，不进入普通知识路径。',
    ))
  }
  for (const tag of current.tags || []) {
    assets.push(buildLocalPostKnowledgeAsset(
      'tag',
      String(tag.id || tag.slug || tag.name),
      tag.name,
      '由当前公开帖子标签推导的相关标签入口。',
      `/tag/${encodeURIComponent(String(tag.slug || tag.id))}`,
      'local-only 推导，展示为只读入口。',
    ))
  }
  if (primaryKnowledgeTopic.value) {
    assets.push(buildLocalPostKnowledgeAsset(
      'search_entry',
      primaryKnowledgeTopic.value,
      primaryKnowledgeTopic.value,
      '由当前帖子公开主题生成的搜索入口候选。',
      `/search?q=${encodeURIComponent(primaryKnowledgeTopic.value)}&sort=relevance`,
      'local-only 搜索入口，仅辅助本次体验。',
    ))
  }
  return assets.slice(0, 8)
})
const postKnowledgeAssets = computed(() => {
  const remoteAssets = detailKnowledge.value?.assets?.filter((asset) => asset.visibilityState !== 'excluded') || []
  return remoteAssets.length ? remoteAssets : localPostKnowledgeAssets.value
})
const postKnowledgeRelations = computed((): KnowledgeRelation[] => (detailKnowledge.value?.relations || []).filter((relation) => {
  return isPersistableKnowledgeRelation(relation)
}))
const postKnowledgePaths = computed((): KnowledgePath[] => (detailKnowledge.value?.paths || []).filter((path) => (
  path.pathStatus !== 'archived' || path.steps.length > 0
)))
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
    description: '收藏、评论和知识复盘会回流到个人空间，形成自己的内容线索。',
  },
])
const materialStatusText = computed(() => {
  if (!materialPack.value) return ''
  const saved = materialPack.value.savedToPrep ? '已归档到个人空间' : '可继续编辑后归档'
  const time = materialPack.value.updateTime ? `，更新于 ${formatTime(materialPack.value.updateTime)}` : ''
  return `${saved}${time}`
})
const isContentModerator = computed(() => Boolean(adminPermissions.value?.contentModerator || adminPermissions.value?.admin))
const canViewVersionHistory = computed(() => Boolean(authStore.isLoggedIn && post.value && (isOwnPost.value || isContentModerator.value)))
const postErrorCode = computed(() => errorCodeOf(postError.value))
const postUnavailableTitle = computed(() => postErrorCode.value === 10403 || postErrorCode.value === 403
  ? getUnavailableContentCopy(postErrorCode.value).title
  : getUnavailableContentCopy(postErrorCode.value).title)
const postUnavailableDescription = computed(() => postErrorCode.value === 10403 || postErrorCode.value === 403
  ? getUnavailableContentCopy(postErrorCode.value).description
  : getUnavailableContentCopy(postErrorCode.value).description)
const governanceUnavailableState = computed(() => {
  if (!postError.value) return null
  return {
    title: postUnavailableTitle.value,
    description: postUnavailableDescription.value,
  }
})
// 区分瞬时错误（网络中断 / 超时 / 5xx）和真正不可用（403 / 404 / 已删除）。
// 瞬时错误给重试入口，避免把一次网络抖动直接说成“内容已删除”。
const isTransientPostError = computed(() => {
  if (!postError.value) return false
  const error = postError.value as any
  if (error instanceof BizException) {
    return typeof error.status === 'number' && error.status >= 500 && error.status < 600
  }
  const status = error?.response?.status
  if (typeof status === 'number') {
    return status >= 500 && status < 600
  }
  // 没有 HTTP 响应（断网、超时、请求被取消）一律按瞬时错误处理。
  return true
})
const postErrorTitle = computed(() => isTransientPostError.value ? '内容暂时加载失败' : postUnavailableTitle.value)
const postErrorDescription = computed(() => isTransientPostError.value
  ? '网络或服务暂时不稳定，内容未能加载。请重试，如果多次失败再稍后回来查看。'
  : postUnavailableDescription.value)
const reportTargetLabel = computed(() => (reportTarget.value.type === 'comment' ? '评论' : '帖子'))
const detailSeoDescription = computed(() => {
  if (post.value) {
    return summarizeSeoText(post.value.summary || post.value.extension?.summary || post.value.content, postUnavailableDescription.value)
  }
  return summarizeSeoText(postUnavailableDescription.value)
})
const canSharePost = computed(() => Boolean(post.value && isPublicPostVisible(post.value)))
const shareDisabledReason = computed(() => canSharePost.value ? '' : '这篇内容当前不可公开分享')

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

const resetDiscussionFollowState = () => {
  discussionFollowState.value = {
    followed: false,
    loading: false,
    pending: false,
    loaded: false,
    error: '',
  }
}

const loadDiscussionFollowStatus = async () => {
  const current = post.value
  const context = capturePostRouteContext(String(current?.postId ?? postId.value))
  resetDiscussionFollowState()
  if (!current?.postId) {
    discussionFollowState.value.loaded = true
    return
  }
  discussionFollowState.value.loading = true
  try {
    const res = await interactionApi.getDiscussionFollowStatus(current.postId)
    if (!isActiveLoadedPostContext(context)) return
    discussionFollowState.value.followed = Boolean(res.data?.followed)
    discussionFollowState.value.loaded = true
  } catch (error: any) {
    if (!isActiveLoadedPostContext(context)) return
    discussionFollowState.value.error = getErrorMessage(error, '讨论关注状态加载失败')
    discussionFollowState.value.loaded = true
  } finally {
    if (isActiveLoadedPostContext(context)) {
      discussionFollowState.value.loading = false
    }
  }
}

type InteractionActionOptions = {
  pendingInteraction?: PendingInteraction
  suppressSuccessToast?: boolean
}

const actionOptions = (value?: ApiId | InteractionActionOptions): InteractionActionOptions =>
  value && typeof value === 'object' ? value : {}

const handleLike = async (input?: ApiId | InteractionActionOptions) => {
  const options = actionOptions(input)
  const target = post.value
  if (!target) return false
  const targetPostId = String(target.postId)
  const liked = Boolean(target.myInteraction?.liked)
  if (!authStore.isLoggedIn) {
    if (!liked) rememberPendingInteraction(target.postId, 'like')
    requireLogin()
    return false
  }
  if (
    likeActionOwner.value?.postId === targetPostId
    && interactionRequestOwnerIsCurrent(likeActionOwner.value)
  ) return false
  const owner: InteractionRequestOwner = {
    postId: targetPostId,
    requestId: ++interactionRequestId,
    uid: String(authStore.user?.uid ?? ''),
    sessionGeneration: authStore.getSessionGeneration(),
  }
  const context = capturePostRouteContext(targetPostId)
  likeActionOwner.value = owner
  invalidateInteractionStateLoads()
  const prevFeedback = interactionFeedback.value
  let shouldRefreshInteractionState = false
  // 乐观更新：先切换本地状态，请求失败再回滚，避免点击后长时间无反馈。
  target.myInteraction = { ...(target.myInteraction ?? { favorited: false }), liked: !liked }
  target.counter.like = Math.max(0, target.counter.like + (liked ? -1 : 1))
  const ownPost = String(target.author.uid) === String(authStore.user?.uid ?? '')
  const message = liked
    ? '已取消点赞'
    : ownPost
      ? '已点赞自己的帖子，计数已更新'
      : '已点赞'
  if (isActiveLoadedPostContext(context)) interactionFeedback.value = message
  try {
    if (liked) {
      await interactionApi.unlike(target.postId)
    } else {
      await interactionApi.like(target.postId)
    }
    if (!interactionRequestOwnerIsCurrent(owner)) return false
    if (options.pendingInteraction) consumePendingInteraction(options.pendingInteraction)
    if (isActiveLoadedPostContext(context) && !options.suppressSuccessToast) {
      toast.success(message)
    }
    shouldRefreshInteractionState = true
    return true
  } catch (error: any) {
    if (interactionRequestOwnerIsCurrent(owner)) {
      target.myInteraction = { ...(target.myInteraction ?? { favorited: false }), liked }
      target.counter.like = Math.max(0, target.counter.like + (liked ? 1 : -1))
      if (isActiveLoadedPostContext(context)) {
        interactionFeedback.value = prevFeedback
        toast.error(getErrorMessage(error, '点赞操作失败'))
      }
    }
    return false
  } finally {
    if (likeActionOwner.value?.requestId === owner.requestId) {
      likeActionOwner.value = null
    }
    if (
      shouldRefreshInteractionState
      && interactionRequestOwnerIsCurrent(owner)
      && isActiveLoadedPostContext(context)
    ) {
      void loadInteractionState()
    }
  }
}

const handleFavorite = async (input?: ApiId | InteractionActionOptions) => {
  const options = actionOptions(input)
  const target = post.value
  if (!target) return false
  const targetPostId = String(target.postId)
  const favorited = Boolean(target.myInteraction?.favorited)
  if (!authStore.isLoggedIn) {
    if (!favorited) rememberPendingInteraction(target.postId, 'favorite')
    requireLogin()
    return false
  }
  if (
    favoriteActionOwner.value?.postId === targetPostId
    && interactionRequestOwnerIsCurrent(favoriteActionOwner.value)
  ) return false
  const owner: InteractionRequestOwner = {
    postId: targetPostId,
    requestId: ++interactionRequestId,
    uid: String(authStore.user?.uid ?? ''),
    sessionGeneration: authStore.getSessionGeneration(),
  }
  const context = capturePostRouteContext(targetPostId)
  favoriteActionOwner.value = owner
  invalidateInteractionStateLoads()
  const prevFeedback = interactionFeedback.value
  let shouldRefreshInteractionState = false
  // 乐观更新：先切换本地状态，请求失败再回滚。
  target.myInteraction = { ...(target.myInteraction ?? { liked: false }), favorited: !favorited }
  target.counter.favorite = Math.max(0, target.counter.favorite + (favorited ? -1 : 1))
  const ownPost = String(target.author.uid) === String(authStore.user?.uid ?? '')
  const message = favorited
    ? '已取消收藏'
    : ownPost
      ? '已收藏自己的帖子，已加入回看'
      : '已收藏'
  if (isActiveLoadedPostContext(context)) interactionFeedback.value = message
  try {
    if (favorited) {
      await interactionApi.unfavorite(target.postId)
    } else {
      await interactionApi.favorite(target.postId)
    }
    if (!interactionRequestOwnerIsCurrent(owner)) return false
    if (options.pendingInteraction) consumePendingInteraction(options.pendingInteraction)
    if (isActiveLoadedPostContext(context) && !options.suppressSuccessToast) {
      toast.success(message)
    }
    shouldRefreshInteractionState = true
    return true
  } catch (error: any) {
    if (interactionRequestOwnerIsCurrent(owner)) {
      target.myInteraction = { ...(target.myInteraction ?? { liked: false }), favorited }
      target.counter.favorite = Math.max(0, target.counter.favorite + (favorited ? 1 : -1))
      if (isActiveLoadedPostContext(context)) {
        interactionFeedback.value = prevFeedback
        toast.error(getErrorMessage(error, '收藏操作失败'))
      }
    }
    return false
  } finally {
    if (favoriteActionOwner.value?.requestId === owner.requestId) {
      favoriteActionOwner.value = null
    }
    if (
      shouldRefreshInteractionState
      && interactionRequestOwnerIsCurrent(owner)
      && isActiveLoadedPostContext(context)
    ) {
      void loadInteractionState()
    }
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

const openContactRequestDialog = () => {
  if (!canStartContactRequest.value) return
  if (!requireLogin()) return
  isContactDialogOpen.value = true
}

const handleFavoriteMoved = (_postId: Post['postId'], _folderId: unknown, folderName: string) => {
  interactionFeedback.value = `已移动到${folderName}`
  toast.success(`已移动到${folderName}`)
}

const toggleDiscussionFollow = async () => {
  if (!post.value?.postId || discussionFollowActionDisabled.value) return
  if (!requireLogin()) return

  discussionFollowState.value.pending = true
  discussionFollowState.value.error = ''
  const nextFollowed = !discussionFollowState.value.followed
  try {
    const res = nextFollowed
      ? await interactionApi.followDiscussion(post.value.postId)
      : await interactionApi.unfollowDiscussion(post.value.postId)
    discussionFollowState.value.followed = Boolean(res.data?.followed ?? nextFollowed)
    discussionFollowState.value.loaded = true
    toast.success(discussionFollowState.value.followed ? '已关注讨论' : '已取消关注讨论')
  } catch (error: any) {
    discussionFollowState.value.error = getErrorMessage(error, nextFollowed ? '关注讨论失败' : '取消关注讨论失败')
    toast.error(discussionFollowState.value.error)
  } finally {
    discussionFollowState.value.pending = false
  }
}

const mergeContentSuggestion = (item: ContentSuggestionRecord) => {
  const rest = contentSuggestions.value.filter((current) => String(current.id) !== String(item.id))
  contentSuggestions.value = [item, ...rest].sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))
}

const loadContentSuggestions = async () => {
  const loadGeneration = ++contentSuggestionLoadGeneration
  contentSuggestionFeedback.value = ''
  const current = post.value
  if (!current || !authStore.isLoggedIn) {
    if (loadGeneration === contentSuggestionLoadGeneration) {
      contentSuggestions.value = []
      isLoadingContentSuggestions.value = false
    }
    return
  }
  const context = capturePostRouteContext(String(current.postId))
  const viewerUid = String(authStore.user?.uid ?? '')
  const authorView = isOwnPost.value
  isLoadingContentSuggestions.value = true
  contentSuggestionError.value = ''
  try {
    const res = authorView
      ? await contentSuggestionApi.listForAuthorPost(context.postId, undefined, 50, {
        signal: context.signal,
      })
      : await contentSuggestionApi.listMineForPost(context.postId, {
        signal: context.signal,
      })
    if (!isActiveLoadedPostContext(context)) return
    if (viewerUid !== String(authStore.user?.uid ?? '')) return
    if (loadGeneration !== contentSuggestionLoadGeneration) return
    contentSuggestions.value = res.data || []
  } catch (error: any) {
    if (isCanceledRequest(error) || !isActiveLoadedPostContext(context)) return
    if (viewerUid !== String(authStore.user?.uid ?? '')) return
    if (loadGeneration !== contentSuggestionLoadGeneration) return
    contentSuggestions.value = []
    contentSuggestionError.value = getErrorMessage(error, '补充建议接口暂不可用，当前不会伪造提交成功。')
  } finally {
    if (
      isActiveLoadedPostContext(context)
      && viewerUid === String(authStore.user?.uid ?? '')
      && loadGeneration === contentSuggestionLoadGeneration
    ) {
      isLoadingContentSuggestions.value = false
    }
  }
}

const submitContentSuggestion = async () => {
  const current = post.value
  if (!current) return
  if (!requireLogin()) return
  const guard = contentSuggestionSubmitGuard.value
  if (!guard.allowed) {
    contentSuggestionFeedback.value = guard.reason
    return
  }
  const sourceUrl = contentSuggestionForm.value.sourceUrl
  const normalizedSourceUrl = normalizeHttpUrl(sourceUrl)
  if (sourceUrl.trim() && !normalizedSourceUrl) {
    contentSuggestionError.value = '相关链接只支持 http 或 https。'
    return
  }
  invalidateContentSuggestionLoads()
  const context = capturePostRouteContext(String(current.postId))
  const viewerUid = String(authStore.user?.uid ?? '')
  const request = {
    type: contentSuggestionForm.value.type,
    detail: contentSuggestionForm.value.detail,
    targetScope: contentSuggestionForm.value.targetScope,
    targetLocator: contentSuggestionForm.value.targetLocator,
    expectedChange: contentSuggestionForm.value.expectedChange,
    sourceUrl: normalizedSourceUrl,
    allowPublicAttribution: contentSuggestionForm.value.allowPublicAttribution,
  }
  isSubmittingContentSuggestion.value = true
  contentSuggestionFeedback.value = ''
  contentSuggestionError.value = ''
  try {
    const res = await contentSuggestionApi.submit(context.postId, request, {
      signal: context.signal,
    })
    if (!isActiveLoadedPostContext(context)) return
    if (viewerUid !== String(authStore.user?.uid ?? '')) return
    if (!res.data) {
      contentSuggestionError.value = '服务端未返回建议记录，请刷新后确认提交状态。'
      return
    }
    invalidateContentSuggestionLoads()
    mergeContentSuggestion(res.data)
    contentSuggestionForm.value = createContentSuggestionForm()
    contentSuggestionFeedback.value = '已提交给作者处理，不会进入公开讨论。'
    toast.success('补充建议已提交给作者')
  } catch (error: any) {
    if (isCanceledRequest(error) || !isActiveLoadedPostContext(context)) return
    if (viewerUid !== String(authStore.user?.uid ?? '')) return
    contentSuggestionError.value = getErrorMessage(error, '补充建议暂未提交成功。')
  } finally {
    if (
      isActiveLoadedPostContext(context)
      && viewerUid === String(authStore.user?.uid ?? '')
    ) {
      isSubmittingContentSuggestion.value = false
    }
  }
}

const decideContentSuggestion = async (
  item: ContentSuggestionRecord,
  decision: Exclude<ContentSuggestionDecision, 'MERGED'>,
) => {
  const current = post.value
  if (!current || !isOwnPost.value || isHandlingContentSuggestion.value) return
  if (item.postId && String(item.postId) !== String(current.postId)) return
  const note = contentSuggestionReplyDrafts.value[String(item.id)]?.trim()
  if (decision === 'REJECTED' && !note) {
    contentSuggestionError.value = '未采纳建议时，请填写简短原因。'
    return
  }
  invalidateContentSuggestionLoads()
  const context = capturePostRouteContext(String(current.postId))
  const viewerUid = String(authStore.user?.uid ?? '')
  isHandlingContentSuggestion.value = true
  contentSuggestionError.value = ''
  try {
    const publicNote = note || (decision === 'PARTIAL_ACCEPTED'
      ? '作者已采纳其中一部分，并保留其他条件继续核对。'
      : decision === 'PLANNED'
        ? '作者已将这条建议列入后续处理计划。'
        : '作者已采纳这条补充建议。')
    const res = await contentSuggestionApi.decide(item.id, {
      decision,
      authorReply: note,
      publicNote,
    }, {
      signal: context.signal,
    })
    if (!isActiveLoadedPostContext(context)) return
    if (viewerUid !== String(authStore.user?.uid ?? '')) return
    if (!res.data) {
      contentSuggestionError.value = '服务端未返回最新建议状态，请刷新后确认处理结果。'
      return
    }
    invalidateContentSuggestionLoads()
    mergeContentSuggestion(res.data)
    contentSuggestionReplyDrafts.value = { ...contentSuggestionReplyDrafts.value, [String(item.id)]: '' }
    await loadTrustedContent()
    if (!isActiveLoadedPostContext(context)) return
    if (viewerUid !== String(authStore.user?.uid ?? '')) return
    toast.success('建议状态已更新')
  } catch (error: any) {
    if (isCanceledRequest(error) || !isActiveLoadedPostContext(context)) return
    if (viewerUid !== String(authStore.user?.uid ?? '')) return
    contentSuggestionError.value = getErrorMessage(error, '建议处理暂不可用。')
  } finally {
    if (
      isActiveLoadedPostContext(context)
      && viewerUid === String(authStore.user?.uid ?? '')
    ) {
      isHandlingContentSuggestion.value = false
    }
  }
}

const openSuggestionInEditor = (item: ContentSuggestionRecord) => {
  if (!post.value?.postId || !isOwnPost.value) return
  router.push({
    path: `/editor/${post.value.postId}`,
    query: {
      source: 'post_detail',
      action: 'update',
      contextType: 'post',
      postId: String(post.value.postId),
      suggestionId: String(item.id),
      updateSummary: contentSuggestionReplyDrafts.value[String(item.id)]?.trim()
        || `根据读者的${contentSuggestionTypeText(item.type)}建议更新内容`,
      reasonText: '内容补充 / 纠错建议',
      returnHref: `/post/${post.value.postId}`,
    },
  })
}

const togglePostSuggestionEntry = async () => {
  const current = post.value
  if (!current || !isOwnPost.value || isHandlingContentSuggestion.value) return
  invalidateContentSuggestionLoads()
  const context = capturePostRouteContext(String(current.postId))
  const viewerUid = String(authStore.user?.uid ?? '')
  const nextOpen = !postSuggestionEntryOpen.value
  isHandlingContentSuggestion.value = true
  contentSuggestionError.value = ''
  try {
    const res = await contentSuggestionApi.setPostEntry(context.postId, nextOpen, {
      signal: context.signal,
    })
    if (!isActiveLoadedPostContext(context)) return
    if (viewerUid !== String(authStore.user?.uid ?? '')) return
    if (!res.data) {
      contentSuggestionError.value = '服务端未返回建议入口状态，请刷新后确认设置。'
      return
    }
    postSuggestionEntryOpen.value = res.data.suggestionsOpen
    if (trustedContentState.value) {
      trustedContentState.value = {
        ...trustedContentState.value,
        suggestionsOpen: postSuggestionEntryOpen.value,
      }
    }
    toast.success(postSuggestionEntryOpen.value ? '已重新开启建议入口' : '已关闭这篇内容的建议入口')
  } catch (error: any) {
    if (isCanceledRequest(error) || !isActiveLoadedPostContext(context)) return
    if (viewerUid !== String(authStore.user?.uid ?? '')) return
    contentSuggestionError.value = getErrorMessage(error, '建议入口设置暂未保存。')
  } finally {
    if (
      isActiveLoadedPostContext(context)
      && viewerUid === String(authStore.user?.uid ?? '')
    ) {
      isHandlingContentSuggestion.value = false
    }
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

const findRootComment = (commentId: Comment['commentId']) => (
  comments.value.find((comment) => String(comment.commentId) === String(commentId))
)

const allComments = () => comments.value.flatMap((comment) => [comment, ...(comment.replies || [])])
const asQualityComment = (comment: Comment) => comment as QualityComment
const countCommentBranch = (comment: Comment): number => 1 + (comment.replies?.length ?? 0)
const defaultFoldReason = '该评论已被折叠'

const adaptQualityComment = (raw: any): Comment => {
  const comment = adaptComment(raw) as QualityComment
  comment.authorReply = Boolean(raw?.authorReply ?? false)
  comment.authorPinned = Boolean(raw?.authorPinned ?? false)
  comment.featured = Boolean(raw?.featured ?? false)
  comment.helpfulCount = Number(raw?.helpfulCount ?? 0)
  comment.myHelpful = Boolean(raw?.myHelpful ?? false)
  comment.hotScore = Number(raw?.hotScore ?? 0)
  comment.folded = Boolean(raw?.folded ?? false)
  comment.foldReason = raw?.foldReason || undefined
  comment.qualityBadges = Array.isArray(raw?.qualityBadges) ? raw.qualityBadges : undefined
  comment.replies = Array.isArray(raw?.replies) ? raw.replies.map(adaptQualityComment) : comment.replies
  return comment
}

const commentIdKey = (comment: Pick<Comment, 'commentId'>) => String(comment.commentId)

const compareCommentOrder = (left: Comment, right: Comment) => {
  const timeDelta = Number(left.createdAt || 0) - Number(right.createdAt || 0)
  if (timeDelta !== 0) return timeDelta
  return commentIdKey(left).localeCompare(commentIdKey(right), undefined, { numeric: true })
}

const mergeOrderedReplies = (...replyGroups: Array<Comment[] | undefined>) => {
  const byId = new Map<string, Comment>()
  for (const reply of replyGroups.flatMap((group) => group || [])) {
    const key = commentIdKey(reply)
    const existing = byId.get(key)
    byId.set(key, existing ? { ...existing, ...reply } : reply)
  }
  const ordered = Array.from(byId.values()).sort(compareCommentOrder)
  if (ordered.length <= MAX_REPLIES_PER_ROOT) return ordered

  const capped = ordered.slice(0, MAX_REPLIES_PER_ROOT)
  for (const targetId of contextCommentTargetIds) {
    const target = byId.get(targetId)
    if (!target || capped.some((reply) => commentIdKey(reply) === targetId)) continue
    capped[capped.length - 1] = target
  }
  return capped.sort(compareCommentOrder)
}

const mergeCommentRoot = (existing: Comment | undefined, incoming: Comment) => {
  if (!existing) {
    return {
      ...incoming,
      replies: mergeOrderedReplies(incoming.replies),
    }
  }
  const replies = mergeOrderedReplies(existing.replies, incoming.replies)
  const replyCount = Math.max(
    Number(existing.replyCount || 0),
    Number(incoming.replyCount || 0),
    replies.length,
  )
  return {
    ...existing,
    ...incoming,
    replies,
    replyCount,
    hasMoreReplies: Boolean(existing.hasMoreReplies || incoming.hasMoreReplies || replyCount > replies.length),
    repliesNextCursor: incoming.repliesNextCursor ?? existing.repliesNextCursor,
  }
}

const uniqueCommentRoots = (items: Comment[]) => {
  const order: string[] = []
  const byId = new Map<string, Comment>()
  for (const item of items) {
    const key = commentIdKey(item)
    if (!byId.has(key)) order.push(key)
    byId.set(key, mergeCommentRoot(byId.get(key), item))
  }
  return order.map((key) => byId.get(key)).filter((item): item is Comment => Boolean(item))
}

const capCommentForest = (items: Comment[]) => {
  const capBranch = (comment: Comment, budget: { remaining: number }): Comment | null => {
    if (budget.remaining <= 0) return null
    budget.remaining -= 1
    const originalReplies = mergeOrderedReplies(comment.replies)
    const replies: Comment[] = []
    for (const reply of originalReplies) {
      const cappedReply = capBranch(reply, budget)
      if (!cappedReply) break
      replies.push(cappedReply)
    }
    return {
      ...comment,
      replies,
      hasMoreReplies: originalReplies.length > replies.length ? false : comment.hasMoreReplies,
    }
  }

  const roots = uniqueCommentRoots(items)
  const isProtectedContextRoot = (comment: Comment) => (
    contextCommentRootIds.has(commentIdKey(comment))
    || protectedContextRootIds.has(commentIdKey(comment))
  )
  const contextRoots = roots.filter(isProtectedContextRoot)
    .slice(0, MAX_COMMENT_ROOTS)
  const regularRoots = roots.filter((comment) => !isProtectedContextRoot(comment))
    .slice(0, Math.max(0, MAX_COMMENT_ROOTS - contextRoots.length))
  const contextBudget = { remaining: MAX_COMMENT_NODES }
  const cappedContextRoots = contextRoots
    .map((comment) => capBranch(comment, contextBudget))
    .filter((item): item is Comment => Boolean(item))
  const regularBudget = { remaining: contextBudget.remaining }
  const cappedRegularRoots = regularRoots
    .map((comment) => capBranch(comment, regularBudget))
    .filter((item): item is Comment => Boolean(item))
  const cappedById = new Map(
    [...cappedContextRoots, ...cappedRegularRoots].map((comment) => [commentIdKey(comment), comment]),
  )
  return roots
    .map((comment) => cappedById.get(commentIdKey(comment)))
    .filter((item): item is Comment => Boolean(item))
}

const mergeCommentPage = (current: Comment[], incoming: Comment[], reset: boolean) => {
  const nextPage = uniqueCommentRoots(incoming)
  if (reset) return capCommentForest(nextPage)

  const currentRoots = uniqueCommentRoots(current)
  const currentById = new Map(currentRoots.map((comment) => [commentIdKey(comment), comment]))
  const nextIds = new Set(nextPage.map(commentIdKey))
  const paginatedRoots = currentRoots.filter(
    (comment) => !contextCommentRootIds.has(commentIdKey(comment)) && !nextIds.has(commentIdKey(comment)),
  )
  const contextRoots = currentRoots.filter(
    (comment) => contextCommentRootIds.has(commentIdKey(comment)) && !nextIds.has(commentIdKey(comment)),
  )
  const hydratedPage = nextPage.map((comment) => mergeCommentRoot(currentById.get(commentIdKey(comment)), comment))
  for (const comment of nextPage) {
    contextCommentRootIds.delete(commentIdKey(comment))
  }
  return capCommentForest([...paginatedRoots, ...hydratedPage, ...contextRoots])
}

const decodeRouteHashTarget = (hash: string) => {
  const rawTarget = hash.startsWith('#') ? hash.slice(1) : hash
  try {
    return decodeURIComponent(rawTarget)
  } catch {
    return rawTarget
  }
}

const scrollToRouteTarget = (targetId: string, focusKey: string) => {
  if (typeof document === 'undefined') return false
  const target = document.getElementById(targetId)
  if (!target) return false
  target.scrollIntoView({ block: 'center' })
  lastFocusedRouteHashKey = focusKey
  return true
}

const clearTemporaryCommentContext = () => {
  if (contextCommentRootIds.size > 0) {
    comments.value = comments.value.filter(
      (comment) => !contextCommentRootIds.has(commentIdKey(comment)),
    )
  }
  commentContextAttempts.clear()
  contextCommentRootIds.clear()
  contextCommentTargetIds.clear()
  protectedContextRootIds.clear()
}

const prepareRouteCommentContext = (targetCommentId: string) => {
  if (
    contextCommentTargetIds.size === 1
    && contextCommentTargetIds.has(targetCommentId)
  ) {
    return
  }
  clearTemporaryCommentContext()
  contextCommentTargetIds.add(targetCommentId)
}

const mergeCommentContext = (raw: unknown, targetCommentId: string, context: PostRouteLoadContext) => {
  const incomingRoot = adaptQualityComment(raw)
  if (
    !incomingRoot.commentId
    || String(incomingRoot.postId) !== context.postId
  ) {
    return false
  }
  const incomingReplies = incomingRoot.replies || []
  const containsTarget = String(incomingRoot.commentId) === targetCommentId
    || incomingReplies.some((reply) => String(reply.commentId) === targetCommentId)
  if (!containsTarget) return false

  contextCommentTargetIds.add(targetCommentId)
  const incomingRootId = commentIdKey(incomingRoot)
  protectedContextRootIds.add(incomingRootId)
  const rootIndex = comments.value.findIndex(
    (comment) => commentIdKey(comment) === incomingRootId,
  )
  if (rootIndex < 0) {
    const nextRoots = [...comments.value]
    const incomingNodeCount = commentThreadItems([incomingRoot]).length
    let currentNodeCount = commentThreadItems(nextRoots).length
    while (
      nextRoots.length > 0
      && (
        nextRoots.length >= MAX_COMMENT_ROOTS
        || currentNodeCount + incomingNodeCount > MAX_COMMENT_NODES
      )
    ) {
      const removed = nextRoots.pop()
      if (removed) currentNodeCount -= commentThreadItems([removed]).length
    }
    contextCommentRootIds.add(incomingRootId)
    comments.value = capCommentForest([...nextRoots, incomingRoot])
    return Boolean(findComment(targetCommentId))
  }

  const existingRoot = comments.value[rootIndex]
  const mergedRoot = mergeCommentRoot(existingRoot, incomingRoot)
  comments.value = capCommentForest(
    comments.value.map((comment, index) => index === rootIndex ? mergedRoot : comment),
  )
  return Boolean(findComment(targetCommentId))
}

const loadRouteCommentContext = (
  commentId: string,
  context: PostRouteLoadContext,
  expectedHash: string,
): Promise<boolean> => {
  const viewerUid = String(authStore.user?.uid ?? '')
  const viewGeneration = commentViewGeneration
  const requestKey = `${context.generation}:${viewGeneration}:${context.postId}:${viewerUid}:${commentId}`
  const activeLoad = commentContextLoads.get(requestKey)
  if (activeLoad) return activeLoad
  if (commentContextAttempts.has(requestKey)) return Promise.resolve(false)
  commentContextAttempts.add(requestKey)

  const request = (async () => {
    try {
      const res = await client.get(
        `/api/v1/posts/${context.postId}/comments/${commentId}/context`,
        { signal: context.signal },
      ) as any
      if (
        !isActiveLoadedPostContext(context)
        || viewGeneration !== commentViewGeneration
        || viewerUid !== String(authStore.user?.uid ?? '')
        || route.hash !== expectedHash
        || !res.data
      ) {
        return false
      }
      return mergeCommentContext(res.data, commentId, context)
    } catch (error) {
      if (isCanceledRequest(error) || !isActivePostRouteContext(context)) return false
      return false
    }
  })()
  commentContextLoads.set(requestKey, request)
  void request.finally(() => {
    if (commentContextLoads.get(requestKey) === request) {
      commentContextLoads.delete(requestKey)
    }
  })
  return request
}

const loadRouteContentSuggestion = async (
  suggestionId: string,
  context: PostRouteLoadContext,
  expectedHash: string,
): Promise<boolean> => {
  const viewerUid = String(authStore.user?.uid ?? '')
  try {
    const res = await contentSuggestionApi.getById(suggestionId, {
      signal: context.signal,
    })
    if (
      !isActiveLoadedPostContext(context)
      || viewerUid !== String(authStore.user?.uid ?? '')
      || route.hash !== expectedHash
      || !res.data
      || String(res.data.id) !== suggestionId
      || String(res.data.postId) !== context.postId
    ) {
      return false
    }
    invalidateContentSuggestionLoads()
    mergeContentSuggestion(res.data)
    contentSuggestionError.value = ''
    return true
  } catch (error) {
    if (isCanceledRequest(error) || !isActivePostRouteContext(context)) return false
    return false
  }
}

const focusRouteHashTarget = async () => {
  const hash = route.hash
  const current = post.value
  if (!current || String(current.postId) !== String(postId.value)) return
  if (!hash) {
    clearTemporaryCommentContext()
    return
  }

  const context = capturePostRouteContext(String(current.postId))
  const targetId = decodeRouteHashTarget(hash)
  if (!targetId) return
  const commentMatch = /^comment-(\d+)$/.exec(targetId)
  const contentSuggestionMatch = /^content-suggestion-(\d+)$/.exec(targetId)
  if (!commentMatch && (contextCommentRootIds.size > 0 || protectedContextRootIds.size > 0)) {
    clearTemporaryCommentContext()
  }
  const viewerUid = String(authStore.user?.uid ?? '')
  const focusRevision = commentMatch ? commentViewGeneration : 0
  const focusKey = `${context.generation}:${focusRevision}:${context.postId}:${viewerUid}:${hash}`
  if (lastFocusedRouteHashKey === focusKey) return

  await nextTick()
  if (!isActiveLoadedPostContext(context) || route.hash !== hash) return
  if (commentMatch && isLoadingComments.value) return
  if (scrollToRouteTarget(targetId, focusKey)) return

  if (commentMatch) {
    prepareRouteCommentContext(commentMatch[1])
    await loadRouteCommentContext(commentMatch[1], context, hash)
    if (!isActiveLoadedPostContext(context) || route.hash !== hash) return
    await nextTick()
    if (scrollToRouteTarget(targetId, focusKey)) return
    scrollToRouteTarget('comments', focusKey)
    return
  }

  if (contentSuggestionMatch) {
    if (isLoadingContentSuggestions.value) return
    await nextTick()
    if (scrollToRouteTarget(targetId, focusKey)) return
    await loadRouteContentSuggestion(contentSuggestionMatch[1], context, hash)
    if (!isActiveLoadedPostContext(context) || route.hash !== hash) return
    await nextTick()
    if (scrollToRouteTarget(targetId, focusKey)) return
    scrollToRouteTarget('content-suggestions', focusKey)
  }
}

const fetchCommentsPage = async (
  reset: boolean,
  context: PostRouteLoadContext,
  signal: AbortSignal,
) => {
  const res = await client.get(`/api/v1/posts/${context.postId}/comments`, {
    params: {
      cursor: reset ? undefined : commentCursor.value,
      size: 20,
      sort: commentSort.value,
    },
    signal,
  }) as any
  return res.data ? adaptPage(res.data, adaptQualityComment) : null
}

const setCommentSort = (sort: CommentSort) => {
  if (commentSort.value === sort || isLoadingComments.value || isLoadingMoreComments.value) return
  commentSort.value = sort
  loadComments(true)
}

const markQualitySettled = (commentId: Comment['commentId'], action: CommentQualityAction) => {
  commentTreeRef.value?.markCommentQualitySettled(commentId, action)
}

const updateCommentHelpful = (commentId: Comment['commentId'], helpful: boolean) => {
  const target = findComment(commentId)
  if (!target) return
  const comment = asQualityComment(target)
  const currentCount = Number(comment.helpfulCount ?? 0)
  comment.myHelpful = helpful
  comment.helpfulCount = helpful ? currentCount + 1 : Math.max(0, currentCount - 1)
}

const updateCommentPinned = (commentId: Comment['commentId'], pinned: boolean) => {
  allComments().forEach((item) => {
    asQualityComment(item).authorPinned = false
  })
  const target = findComment(commentId)
  if (target) asQualityComment(target).authorPinned = pinned
}

const updateCommentQualityFlag = (commentId: Comment['commentId'], field: 'featured' | 'folded', active: boolean) => {
  const target = findComment(commentId)
  if (!target) return
  const comment = asQualityComment(target)
  comment[field] = active
  if (field === 'folded' && active && !comment.foldReason) comment.foldReason = defaultFoldReason
}

const handleHelpfulComment = async (commentId: Comment['commentId']) => {
  if (!requireLogin()) {
    markQualitySettled(commentId, 'helpful')
    return
  }
  try {
    await client.post(`/api/v1/comments/${commentId}/helpful`)
    updateCommentHelpful(commentId, true)
  } catch (error: any) {
    toast.error(getErrorMessage(error, '标记有帮助失败'))
    await loadComments(true)
  } finally {
    markQualitySettled(commentId, 'helpful')
  }
}

const handleUnhelpfulComment = async (commentId: Comment['commentId']) => {
  if (!requireLogin()) {
    markQualitySettled(commentId, 'unhelpful')
    return
  }
  try {
    await client.delete(`/api/v1/comments/${commentId}/helpful`)
    updateCommentHelpful(commentId, false)
  } catch (error: any) {
    toast.error(getErrorMessage(error, '取消有帮助失败'))
    await loadComments(true)
  } finally {
    markQualitySettled(commentId, 'unhelpful')
  }
}

const handlePinComment = async (commentId: Comment['commentId']) => {
  try {
    await client.post(`/api/v1/posts/${postId.value}/comments/${commentId}/pin`)
    updateCommentPinned(commentId, true)
    toast.success('已置顶评论')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '置顶评论失败'))
    await loadComments(true)
  } finally {
    markQualitySettled(commentId, 'pin')
  }
}

const handleUnpinComment = async (commentId: Comment['commentId']) => {
  try {
    await client.delete(`/api/v1/posts/${postId.value}/comments/${commentId}/pin`)
    updateCommentPinned(commentId, false)
    toast.success('已取消置顶')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '取消置顶失败'))
    await loadComments(true)
  } finally {
    markQualitySettled(commentId, 'unpin')
  }
}

const handleFeatureComment = async (commentId: Comment['commentId']) => {
  try {
    await client.post(`/api/v1/comments/${commentId}/featured`)
    updateCommentQualityFlag(commentId, 'featured', true)
    toast.success('已设为精选')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '设置精选失败'))
    await loadComments(true)
  } finally {
    markQualitySettled(commentId, 'feature')
  }
}

const handleUnfeatureComment = async (commentId: Comment['commentId']) => {
  try {
    await client.delete(`/api/v1/comments/${commentId}/featured`)
    updateCommentQualityFlag(commentId, 'featured', false)
    toast.success('已取消精选')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '取消精选失败'))
    await loadComments(true)
  } finally {
    markQualitySettled(commentId, 'unfeature')
  }
}

const handleFoldComment = async (commentId: Comment['commentId']) => {
  try {
    await client.post(`/api/v1/comments/${commentId}/fold`, { reason: defaultFoldReason })
    updateCommentQualityFlag(commentId, 'folded', true)
    await loadTrustedContent()
    toast.success('评论已折叠')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '折叠评论失败'))
    await loadComments(true)
  } finally {
    markQualitySettled(commentId, 'fold')
  }
}

const handleUnfoldComment = async (commentId: Comment['commentId']) => {
  try {
    await client.delete(`/api/v1/comments/${commentId}/fold`)
    updateCommentQualityFlag(commentId, 'folded', false)
    await loadTrustedContent()
    toast.success('已取消折叠')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '取消折叠失败'))
    await loadComments(true)
  } finally {
    markQualitySettled(commentId, 'unfold')
  }
}

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

// 评论创建接口只返回 { commentId, reviewRequired }，拿不到完整评论对象，
// 因此提交后仍需整表重载。重载会把列表替换成第一页，导致页面跳回顶部。
// 这里在重载前后保留并恢复滚动位置，避免用户丢失当前阅读位置。
const preserveCommentScroll = async (task: () => Promise<void>) => {
  const prevScrollY = window.scrollY
  await task()
  await nextTick()
  window.scrollTo({ top: prevScrollY })
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
      await preserveCommentScroll(async () => {
        await loadComments()
        await loadTrustedContent()
      })
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
      await preserveCommentScroll(() => loadComments(true))
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
    await loadTrustedContent()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '删除评论失败'))
  }
}

const closeReportDialog = () => {
  if (isReporting.value) return
  isReportDialogOpen.value = false
  reportForm.value = { reason: 'OTHER', detail: '' }
  reportTarget.value = { type: 'post' }
  reportFeedback.value = null
  isReportSubmitSuccess.value = false
}

const openPostReportDialog = () => {
  if (!requireLogin()) return
  reportTarget.value = { type: 'post' }
  reportFeedback.value = null
  isReportSubmitSuccess.value = false
  isReportDialogOpen.value = true
}

const openCommentReportDialog = (commentId: Comment['commentId']) => {
  if (!requireLogin()) return
  reportTarget.value = { type: 'comment', id: commentId }
  reportFeedback.value = null
  isReportSubmitSuccess.value = false
  isReportDialogOpen.value = true
}

useAccessibleDialog(() => isReportDialogOpen.value, {
  close: closeReportDialog,
  dialogRef: reportDialog,
  initialFocus: reportReasonSelect,
  closeOnEscape: () => !isReporting.value,
})

const submitReport = async () => {
  isReporting.value = true
  reportFeedback.value = null
  isReportSubmitSuccess.value = false
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
    isReportSubmitSuccess.value = true
    reportFeedback.value = reportSuccessFeedback
    toast.success(reportSubmittedFeedbackMessage)
  } catch (error: any) {
    isReportSubmitSuccess.value = false
    reportFeedback.value = mapReportErrorToFeedback(error)
    const errorCode = error instanceof BizException ? error.code : error?.response?.status
    if (errorCode === 30001) {
      reportFeedback.value = {
        ...reportFeedback.value,
        message: duplicateReportFeedbackMessage,
      }
    } else if (errorCode === 10429 || errorCode === 429) {
      reportFeedback.value = {
        ...reportFeedback.value,
        message: rateLimitedReportFeedbackMessage,
      }
    } else if (reportFeedback.value.tone === 'error') {
      reportFeedback.value = {
        ...reportFeedback.value,
        message: reportFailedFeedbackMessage,
      }
    } else if (reportFeedback.value.message.includes(unavailableReportFeedbackMessage)) {
      reportFeedback.value = {
        ...reportFeedback.value,
        message: `${unavailableReportFeedbackMessage}。`,
      }
    }
    const notify = reportFeedback.value.tone === 'error' ? toast.error : toast.warning
    notify(reportFeedback.value.message)
  } finally {
    isReporting.value = false
  }
}

const loadComments = async (reset = true) => {
  const context = capturePostRouteContext()
  if (!context.postId) return
  if (reset) {
    commentLoadController?.abort()
    abortReplyLoads()
    resetCommentViewContext()
  }
  const controller = new AbortController()
  commentLoadController = controller
  const requestGeneration = ++commentLoadGeneration
  const viewGeneration = commentViewGeneration
  const sort = commentSort.value
  const isActiveCommentLoad = () => (
    !controller.signal.aborted
    && requestGeneration === commentLoadGeneration
    && viewGeneration === commentViewGeneration
    && sort === commentSort.value
    && isActivePostRouteContext(context)
  )
  if (reset) {
    isLoadingComments.value = true
    isLoadingMoreComments.value = false
    commentCursor.value = undefined
    commentsErrorMessage.value = ''
  } else {
    isLoadingMoreComments.value = true
  }
  try {
    const page = await fetchCommentsPage(reset, context, controller.signal)
    if (!isActiveCommentLoad()) return
    const nextItems = page?.items || []
    comments.value = mergeCommentPage(comments.value, nextItems, reset)
    commentCursor.value = page?.nextCursor
    const paginatedRootCount = comments.value.filter(
      (comment) => !contextCommentRootIds.has(commentIdKey(comment)),
    ).length
    hasMoreComments.value = Boolean(
      page?.hasMore
      && page?.nextCursor
      && paginatedRootCount < MAX_COMMENT_ROOTS
      && commentThreadItems(comments.value).length < MAX_COMMENT_NODES
    )
    commentsErrorMessage.value = ''
  } catch (error) {
    if (!isActiveCommentLoad() || isCanceledRequest(error)) return
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
    if (isActiveCommentLoad()) {
      isLoadingComments.value = false
      isLoadingMoreComments.value = false
      if (commentLoadController === controller) commentLoadController = null
    }
  }
}

const loadMoreComments = () => loadComments(false)

const setReplyPageLoading = (rootId: Comment['commentId'], loading: boolean) => {
  const key = String(rootId)
  loadingReplyRootIds.value = loading
    ? Array.from(new Set([...loadingReplyRootIds.value.map(String), key]))
    : loadingReplyRootIds.value.filter((item) => String(item) !== key)
}

const handleLoadMoreReplies = async (rootId: Comment['commentId']) => {
  const root = findRootComment(rootId)
  if (!root || !root.hasMoreReplies || loadingReplyRootIds.value.map(String).includes(String(rootId))) return
  const context = capturePostRouteContext()
  const viewGeneration = commentViewGeneration
  const rootKey = String(rootId)
  const controller = new AbortController()
  replyLoadControllers.get(rootKey)?.abort()
  replyLoadControllers.set(rootKey, controller)
  setReplyPageLoading(rootId, true)
  try {
    const res = await client.get(`/api/v1/posts/${context.postId}/comments/${rootId}/replies`, {
      params: { cursor: root.repliesNextCursor, size: 20 },
      signal: controller.signal,
    }) as any
    if (
      controller.signal.aborted
      || replyLoadControllers.get(rootKey) !== controller
      || !isActivePostRouteContext(context)
      || viewGeneration !== commentViewGeneration
      || findRootComment(rootId) !== root
    ) return
    const page = res.data ? adaptPage(res.data, adaptQualityComment) : null
    const existingIds = new Set((root.replies || []).map((item) => String(item.commentId)))
    const nextReplies = (page?.items || [])
      .filter((item) => !existingIds.has(String(item.commentId)))
    const availableReplySlots = Math.max(0, MAX_REPLIES_PER_ROOT - (root.replies?.length || 0))
    const availableNodeSlots = Math.max(0, MAX_COMMENT_NODES - commentThreadItems(comments.value).length)
    const acceptedReplies = nextReplies.slice(0, Math.min(availableReplySlots, availableNodeSlots))
    root.replies = mergeOrderedReplies(root.replies, acceptedReplies)
    const mergedReplies = root.replies
    root.repliesNextCursor = page?.nextCursor
    root.hasMoreReplies = Boolean(
      page?.hasMore
      && page?.nextCursor
      && mergedReplies.length < MAX_REPLIES_PER_ROOT
      && commentThreadItems(comments.value).length < MAX_COMMENT_NODES
    )
  } catch (error: any) {
    if (controller.signal.aborted || isCanceledRequest(error)) return
    toast.error(getErrorMessage(error, '加载更多回复失败'))
  } finally {
    if (replyLoadControllers.get(rootKey) === controller) {
      replyLoadControllers.delete(rootKey)
      setReplyPageLoading(rootId, false)
    }
  }
}

const loadRelatedPosts = async () => {
  const current = post.value
  const context = capturePostRouteContext(String(current?.postId ?? postId.value))
  if (!current?.tags.length) {
    relatedPosts.value = []
    return
  }
  try {
    const result = await postApi.list({ tagId: current.tags[0].id, size: 5 })
    if (!isActiveLoadedPostContext(context)) return
    relatedPosts.value = (result.data?.items || [])
      .filter((item) => String(item.postId) !== String(current.postId))
      .slice(0, 4)
  } catch {
    if (!isActiveLoadedPostContext(context)) return
    relatedPosts.value = []
  }
}

const loadDetailKnowledgeAssets = async () => {
  const current = post.value
  const context = capturePostRouteContext(String(current?.postId ?? postId.value))
  if (!current?.postId || !isPublicPostVisible(current)) {
    detailKnowledge.value = null
    detailKnowledgeError.value = ''
    return
  }
  detailKnowledgeLoading.value = true
  detailKnowledgeError.value = ''
  try {
    const res = await knowledgeApi.assets({
      postId: current.postId,
      assetId: current.postId,
      assetType: 'post',
      domain: current.domain,
      limit: 8,
    })
    if (!isActiveLoadedPostContext(context)) return
    detailKnowledge.value = res.data
  } catch (error: any) {
    if (!isActiveLoadedPostContext(context)) return
    detailKnowledge.value = null
    detailKnowledgeError.value = getErrorMessage(error, '知识关系服务暂时不可用，以下仅展示 local-only 只读入口。')
  } finally {
    if (isActiveLoadedPostContext(context)) {
      detailKnowledgeLoading.value = false
    }
  }
}

const loadInteractionState = async () => {
  const current = post.value
  if (!current || !authStore.isLoggedIn) return
  const context = capturePostRouteContext(String(current.postId))
  const requestId = ++interactionStateRequestId
  const owner: InteractionSessionOwner = {
    uid: String(authStore.user?.uid ?? ''),
    sessionGeneration: authStore.getSessionGeneration(),
  }
  try {
    const result = await interactionApi.getPostInteraction(current.postId)
    if (
      result.data
      && requestId === interactionStateRequestId
      && isActiveLoadedPostContext(context)
      && interactionSessionOwnerIsCurrent(owner)
    ) {
      const nextInteraction = {
        ...(current.myInteraction ?? { liked: false, favorited: false }),
      }
      if (!isTogglingLike.value) nextInteraction.liked = Boolean(result.data.liked)
      if (!isTogglingFavorite.value) nextInteraction.favorited = Boolean(result.data.favorited)
      current.myInteraction = nextInteraction
      // 拿到真实互动状态后，再消费登录前记录的点赞/收藏意图（P6）。
      void replayPendingInteraction(context, owner)
    }
  } catch {
    // 互动状态不影响详情正文展示。
  }
}

// 最小安全补点：仅当存在本帖未过期的意图、且当前确实尚未点赞/收藏时，补做一次并明确提示用户。
const replayPendingInteraction = async (
  context: PostRouteLoadContext,
  owner: InteractionSessionOwner,
) => {
  const current = post.value
  if (!current || !interactionSessionOwnerIsCurrent(owner)) return
  const pending = findPendingInteraction(current.postId, owner.uid)
  if (!pending) return
  if (pending.kind === 'like') {
    if (isTogglingLike.value) return
    if (current.myInteraction?.liked) {
      consumePendingInteraction(pending)
      return
    }
    const succeeded = await handleLike({ pendingInteraction: pending, suppressSuccessToast: true })
    if (!succeeded) return
  } else if (pending.kind === 'favorite') {
    if (isTogglingFavorite.value) return
    if (current.myInteraction?.favorited) {
      consumePendingInteraction(pending)
      return
    }
    const succeeded = await handleFavorite({ pendingInteraction: pending, suppressSuccessToast: true })
    if (!succeeded) return
  }
  if (!isActiveLoadedPostContext(context) || !interactionSessionOwnerIsCurrent(owner)) return
  toast.success(pending.kind === 'like' ? '已补上你登录前的点赞' : '已补上你登录前的收藏')
}

const resetTrustedContentState = () => {
  trustedContentState.value = null
  trustedContentLoadState.value = 'loading'
  trustedContentError.value = ''
  trustedContentFeedback.value = ''
  questionStatusDraft.value = ''
  duplicatePostIdDraft.value = ''
  freshnessStatusDraft.value = ''
  successorPostIdDraft.value = ''
  isSavingUsefulFeedback.value = false
  isSavingQuestionState.value = false
  isAcceptingAnswer.value = false
  isSavingFreshness.value = false
}

const resetTrustProfileState = () => {
  trustProfile.value = null
  trustProfileLoadState.value = 'loading'
}

const loadTrustProfile = async () => {
  const current = post.value
  if (!current?.postId) {
    resetTrustProfileState()
    return
  }
  const context = capturePostRouteContext(String(current.postId))
  trustProfileLoadState.value = 'loading'
  try {
    const res = await trustedContentApi.loadTrustProfile(context.postId, {
      signal: context.signal,
    })
    if (!isActiveLoadedPostContext(context)) return
    trustProfile.value = res.data
    trustProfileLoadState.value = 'loaded'
  } catch (error: any) {
    if (isCanceledRequest(error) || !isActiveLoadedPostContext(context)) return
    trustProfile.value = null
    trustProfileLoadState.value = 'error'
  }
}

const applyTrustedContentState = (state: TrustedContentState) => {
  trustedContentState.value = state
  questionStatusDraft.value = state?.questionStatus ?? (isQuestionPost.value ? 'OPEN' : 'CLOSED')
  duplicatePostIdDraft.value = state?.duplicatePostId == null ? '' : String(state.duplicatePostId)
  freshnessStatusDraft.value = state?.freshnessStatus ?? 'CURRENT'
  successorPostIdDraft.value = state?.successorPostId == null ? '' : String(state.successorPostId)
  postSuggestionEntryOpen.value = state.suggestionsOpen
  trustedContentLoadState.value = 'loaded'
  trustedContentError.value = ''
}

const loadTrustedContent = async () => {
  const current = post.value
  if (!current?.postId || trustedContentMutationPending.value) return
  const context = capturePostRouteContext(String(current.postId))
  resetTrustedContentState()
  try {
    const res = await trustedContentApi.loadTrustedContent(context.postId, {
      signal: context.signal,
    })
    if (!isActiveLoadedPostContext(context)) return
    if (!res.data) {
      trustedContentLoadState.value = 'error'
      trustedContentError.value = '可信内容状态暂时无法读取。'
      return
    }
    applyTrustedContentState(res.data)
  } catch (error: any) {
    if (isCanceledRequest(error) || !isActiveLoadedPostContext(context)) return
    trustedContentLoadState.value = 'error'
    trustedContentError.value = getErrorMessage(error, '可信内容状态暂时无法读取。')
  }
}

const saveUsefulFeedback = async (reason: UsefulFeedbackReason) => {
  const current = post.value
  if (!current?.postId || isOwnPost.value || !canMutateTrustedContent.value) return
  if (!requireLogin()) return
  const context = capturePostRouteContext(String(current.postId))
  isSavingUsefulFeedback.value = true
  trustedContentError.value = ''
  trustedContentFeedback.value = ''
  try {
    const res = await trustedContentApi.saveUsefulFeedback(context.postId, { reason }, {
      signal: context.signal,
    })
    if (!isActiveLoadedPostContext(context)) return
    if (!res.data) {
      trustedContentError.value = '有用反馈已提交，但服务端未返回最新可信内容状态。'
      return
    }
    applyTrustedContentState(res.data)
    trustedContentFeedback.value = `已记录：${USEFUL_FEEDBACK_REASON_OPTIONS.find((item) => item.value === reason)?.label || '为什么有用'}。`
  } catch (error: any) {
    if (isCanceledRequest(error) || !isActiveLoadedPostContext(context)) return
    trustedContentError.value = getErrorMessage(error, '有用反馈暂未保存。')
  } finally {
    if (isActiveLoadedPostContext(context)) isSavingUsefulFeedback.value = false
  }
}

const clearUsefulFeedback = async () => {
  const current = post.value
  if (!current?.postId || !canMutateTrustedContent.value) return
  const context = capturePostRouteContext(String(current.postId))
  isSavingUsefulFeedback.value = true
  trustedContentError.value = ''
  trustedContentFeedback.value = ''
  try {
    const res = await trustedContentApi.clearUsefulFeedback(context.postId, {
      signal: context.signal,
    })
    if (!isActiveLoadedPostContext(context)) return
    if (!res.data) {
      trustedContentError.value = '反馈已取消，但服务端未返回最新可信内容状态。'
      return
    }
    applyTrustedContentState(res.data)
    trustedContentFeedback.value = '已取消你的有用反馈。'
  } catch (error: any) {
    if (isCanceledRequest(error) || !isActiveLoadedPostContext(context)) return
    trustedContentError.value = getErrorMessage(error, '暂时无法取消有用反馈。')
  } finally {
    if (isActiveLoadedPostContext(context)) isSavingUsefulFeedback.value = false
  }
}

const saveQuestionState = async () => {
  const current = post.value
  if (!current?.postId || !isOwnPost.value || !isQuestionPost.value || !canMutateTrustedContent.value) return
  const status = questionStatusDraft.value
  if (!status) return
  if (!allowedQuestionStatuses.value.includes(status)) {
    trustedContentError.value = '当前问题状态不能直接切换到该目标，请先刷新状态。'
    return
  }
  const duplicatePostId = duplicatePostIdDraft.value.trim()
  if (status === 'DUPLICATE' && !/^[1-9]\d*$/.test(duplicatePostId)) {
    trustedContentError.value = '标记为重复问题时，请填写有效的公开问题帖子 ID。'
    return
  }
  const context = capturePostRouteContext(String(current.postId))
  isSavingQuestionState.value = true
  trustedContentError.value = ''
  trustedContentFeedback.value = ''
  try {
    const res = await trustedContentApi.setQuestionState(context.postId, {
      status,
      duplicatePostId: status === 'DUPLICATE' ? duplicatePostId : null,
    }, {
      signal: context.signal,
    })
    if (!isActiveLoadedPostContext(context)) return
    if (!res.data) {
      trustedContentError.value = '问题状态已提交，但服务端未返回最新可信内容状态。'
      return
    }
    applyTrustedContentState(res.data)
    trustedContentFeedback.value = '问题状态已更新。'
  } catch (error: any) {
    if (isCanceledRequest(error) || !isActiveLoadedPostContext(context)) return
    trustedContentError.value = getErrorMessage(error, '问题状态暂未保存。')
  } finally {
    if (isActiveLoadedPostContext(context)) isSavingQuestionState.value = false
  }
}

const acceptAnswer = async (commentId: Comment['commentId']) => {
  const current = post.value
  if (!current?.postId || !canAcceptAnswer.value || !canMutateTrustedContent.value) return
  const context = capturePostRouteContext(String(current.postId))
  isAcceptingAnswer.value = true
  trustedContentError.value = ''
  trustedContentFeedback.value = ''
  try {
    const res = await trustedContentApi.acceptAnswer(context.postId, { commentId }, {
      signal: context.signal,
    })
    if (!isActiveLoadedPostContext(context)) return
    if (!res.data) {
      trustedContentError.value = '采纳请求已提交，但服务端未返回最新可信内容状态。'
      return
    }
    applyTrustedContentState(res.data)
    trustedContentFeedback.value = '已采纳回答，并通知回答者。'
  } catch (error: any) {
    if (isCanceledRequest(error) || !isActiveLoadedPostContext(context)) return
    trustedContentError.value = getErrorMessage(error, '暂时无法采纳这条回答。')
  } finally {
    if (isActiveLoadedPostContext(context)) isAcceptingAnswer.value = false
  }
}

const clearAcceptedAnswer = async () => {
  const current = post.value
  if (!current?.postId || !isOwnPost.value || !canMutateTrustedContent.value) return
  const context = capturePostRouteContext(String(current.postId))
  isAcceptingAnswer.value = true
  trustedContentError.value = ''
  trustedContentFeedback.value = ''
  try {
    const res = await trustedContentApi.clearAcceptedAnswer(context.postId, {
      signal: context.signal,
    })
    if (!isActiveLoadedPostContext(context)) return
    if (!res.data) {
      trustedContentError.value = '取消采纳请求已提交，但服务端未返回最新可信内容状态。'
      return
    }
    applyTrustedContentState(res.data)
    trustedContentFeedback.value = '已取消采纳，问题状态会按现有回答重新计算。'
  } catch (error: any) {
    if (isCanceledRequest(error) || !isActiveLoadedPostContext(context)) return
    trustedContentError.value = getErrorMessage(error, '暂时无法取消采纳。')
  } finally {
    if (isActiveLoadedPostContext(context)) isAcceptingAnswer.value = false
  }
}

const saveFreshness = async () => {
  const current = post.value
  if (!current?.postId || !isOwnPost.value || !canMutateTrustedContent.value) return
  const status = freshnessStatusDraft.value
  if (!status) return
  const successorPostId = successorPostIdDraft.value.trim()
  if (status === 'SUPERSEDED' && !/^[1-9]\d*$/.test(successorPostId)) {
    trustedContentError.value = '标记为已有后续内容时，请填写有效的后续帖子 ID。'
    return
  }
  const context = capturePostRouteContext(String(current.postId))
  isSavingFreshness.value = true
  trustedContentError.value = ''
  trustedContentFeedback.value = ''
  try {
    const res = await trustedContentApi.updateFreshness(context.postId, {
      status,
      successorPostId: status === 'SUPERSEDED' ? successorPostId : null,
    }, {
      signal: context.signal,
    })
    if (!isActiveLoadedPostContext(context)) return
    if (!res.data) {
      trustedContentError.value = '时效状态已提交，但服务端未返回最新可信内容状态。'
      return
    }
    applyTrustedContentState(res.data)
    trustedContentFeedback.value = '内容时效状态已更新。'
  } catch (error: any) {
    if (isCanceledRequest(error) || !isActiveLoadedPostContext(context)) return
    trustedContentError.value = getErrorMessage(error, '内容时效状态暂未保存。')
  } finally {
    if (isActiveLoadedPostContext(context)) isSavingFreshness.value = false
  }
}

const publicUpdateImpactText = (scope?: string) => {
  const labels: Record<string, string> = {
    CONTENT: '影响范围：正文说明',
    CONCLUSION: '影响范围：结论或建议',
    CONDITIONS: '影响范围：适用条件',
    SOURCES: '影响范围：来源或链接',
    FULL_CONTENT: '影响范围：整体更新',
  }
  return labels[String(scope || '').toUpperCase()] || `影响范围：${scope || '内容更新'}`
}

const loadPublicUpdates = async () => {
  const current = post.value
  if (!current?.postId) return
  const context = capturePostRouteContext(String(current.postId))
  try {
    const res = await postApi.listPublicUpdates(current.postId, 12)
    if (isActiveLoadedPostContext(context)) publicUpdates.value = res.data || []
  } catch {
    if (isActiveLoadedPostContext(context)) publicUpdates.value = []
  }
}

const loadAdminPermissions = async () => {
  if (!authStore.token) {
    adminPermissions.value = null
    return
  }
  try {
    const res = await opsApi.myPermissions()
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
  const current = post.value
  if (!authStore.isLoggedIn || !current?.postId) {
    materialPack.value = null
    applyMaterialToForm(null)
    materialErrorMessage.value = ''
    return
  }
  const context = capturePostRouteContext(String(current.postId))
  isLoadingMaterial.value = true
  materialErrorMessage.value = ''
  try {
    const res = await postApi.getInterviewMaterials(current.postId)
    if (!isActiveLoadedPostContext(context)) return
    materialPack.value = res.data || null
    applyMaterialToForm(materialPack.value)
  } catch (error: any) {
    if (!isActiveLoadedPostContext(context)) return
    materialErrorMessage.value = getErrorMessage(error, '内容素材加载失败')
  } finally {
    if (isActiveLoadedPostContext(context)) {
      isLoadingMaterial.value = false
    }
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
    toast.success('内容素材已生成')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '内容素材生成失败'))
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
    toast.success('内容素材已保存')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '内容素材保存失败'))
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
    toast.success('已归档到个人空间')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '归档失败'))
  } finally {
    isSavingMaterialToPrep.value = false
  }
}

watch(() => postData.value?.data, (value) => {
  if (value && String(value.postId) !== String(postId.value)) return
  post.value = clonePost(value)
  postSuggestionEntryOpen.value = readPostSuggestionEntryOpen(value)
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
  loadDetailKnowledgeAssets()
  loadInteractionState()
  loadDiscussionFollowStatus()
  loadTrustedContent()
  loadTrustProfile()
  loadPublicUpdates()
  loadContentSuggestions()
  if (showStageTwoDetailPanels) {
    loadInterviewMaterial()
  } else {
    materialPack.value = null
    materialErrorMessage.value = ''
  }
})

watch([post, () => route.query.report, () => authStore.isLoggedIn], () => {
  if (route.query.report !== 'post') return
  if (!post.value || isOwnPost.value || isReportDialogOpen.value || !authStore.isLoggedIn) return
  openPostReportDialog()
}, { immediate: true })

watch(postId, () => {
  beginPostRouteGeneration()
  resetTrustedContentState()
  resetTrustProfileState()
  resetContentSuggestionState()
  post.value = null
  relatedPosts.value = []
  detailKnowledge.value = null
  detailKnowledgeLoading.value = false
  detailKnowledgeError.value = ''
  publicUpdates.value = []
  materialPack.value = null
  isLoadingMaterial.value = false
  comments.value = []
  commentCursor.value = undefined
  hasMoreComments.value = false
  commentsErrorMessage.value = ''
  isLoadingComments.value = false
  isLoadingMoreComments.value = false
  resetDiscussionFollowState()
  commentSort.value = 'latest'
  loadComments(true)
  loadTrustedContent()
  loadTrustProfile()
  loadPublicUpdates()
  loadContentSuggestions()
  versionHistories.value = []
  versionLoadAttempted.value = false
})

onMounted(() => {
  loadAdminPermissions()
  loadComments(true)
})

watch(() => authStore.token, () => {
  loadAdminPermissions()
  loadDiscussionFollowStatus()
  loadTrustedContent()
  loadTrustProfile()
  loadContentSuggestions()
  if (showStageTwoDetailPanels) loadInterviewMaterial()
})

watch(canViewVersionHistory, (allowed) => {
  if (!allowed) isVersionDialogOpen.value = false
})

watch(
  [
    () => route.hash,
    () => post.value?.postId,
    () => isLoadingComments.value,
    () => isLoadingContentSuggestions.value,
  ],
  () => {
    void focusRouteHashTarget()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  postRouteGeneration += 1
  postRouteController.abort()
  invalidateContentSuggestionLoads()
  commentLoadGeneration += 1
  commentLoadController?.abort()
  commentLoadController = null
  abortReplyLoads()
  commentViewGeneration += 1
  commentContextLoads.clear()
  commentContextAttempts.clear()
  contextCommentRootIds.clear()
  contextCommentTargetIds.clear()
  protectedContextRootIds.clear()
  lastFocusedRouteHashKey = ''
})
</script>

<style scoped>
.report-dialog-panel {
  max-height: min(calc(100vh - 2rem), 720px);
  overflow-y: auto;
  overflow-wrap: anywhere;
}

.report-feedback {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(203 213 225);
  padding: 0.75rem 0.9rem;
  overflow-wrap: anywhere;
  font-size: 0.875rem;
}

.report-feedback strong {
  font-weight: 800;
}

.report-feedback span {
  line-height: 1.6;
}

.report-feedback--success {
  border-color: rgb(187 247 208);
  background: rgb(240 253 244);
  color: rgb(22 101 52);
}

.report-feedback--warning {
  border-color: rgb(254 240 138);
  background: rgb(254 252 232);
  color: rgb(133 77 14);
}

.report-feedback--error {
  border-color: rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(153 27 27);
}

.governance-unavailable-state {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(203 213 225);
  background: rgb(248 250 252);
  padding: 0.85rem 1rem;
  color: rgb(71 85 105);
  overflow-wrap: anywhere;
}

.governance-unavailable-state strong {
  color: rgb(15 23 42);
  font-weight: 800;
}

.governance-unavailable-state span {
  font-size: 0.875rem;
  line-height: 1.6;
}

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

.favorite-feedback-row {
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(167 243 208);
  background: rgb(236 253 245);
  padding: 0.6rem 0.9rem;
  font-size: 0.875rem;
  color: rgb(6 95 70);
}

.favorite-organizer-row {
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
}

.favorite-feedback-actions {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
}

.favorite-feedback-row a,
.favorite-organizer-row a {
  font-weight: 900;
  color: rgb(4 120 87);
}

.trusted-content-loop,
.public-update-list {
  margin-top: 1.5rem;
  border-top: 1px solid rgb(203 213 225);
  border-bottom: 1px solid rgb(203 213 225);
  padding: 1.2rem 0;
}

.trusted-content-loop-head,
.public-update-list-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.trusted-content-loop-head p,
.public-update-list-head p {
  color: rgb(5 150 105);
  font-size: 0.75rem;
  font-weight: 900;
}

.trusted-content-loop-head h2,
.public-update-list-head h2 {
  margin-top: 0.2rem;
  color: rgb(15 23 42);
  font-size: 1rem;
  font-weight: 900;
}

.trusted-content-loop-head span,
.public-update-list-head span {
  display: block;
  margin-top: 0.25rem;
  max-width: 42rem;
  color: rgb(71 85 105);
  font-size: 0.8rem;
  line-height: 1.6;
}

.trusted-content-refresh,
.trusted-content-controls button,
.useful-reason-login {
  flex: 0 0 auto;
  border: 1px solid rgb(5 150 105);
  border-radius: 0.5rem;
  background: white;
  padding: 0.5rem 0.75rem;
  color: rgb(4 120 87);
  font-size: 0.8rem;
  font-weight: 900;
}

.trusted-content-refresh:disabled,
.trusted-content-controls button:disabled,
.useful-reason-list button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.trusted-content-message {
  margin-top: 0.8rem;
  color: rgb(4 120 87);
  font-size: 0.82rem;
  font-weight: 700;
}

.trusted-content-message-error {
  color: rgb(185 28 28);
}

.trusted-content-row {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(18rem, 1.1fr);
  gap: 1.25rem;
  border-top: 1px solid rgb(226 232 240);
  padding-top: 1rem;
}

.trusted-content-row-copy > span {
  color: rgb(100 116 139);
  font-size: 0.75rem;
  font-weight: 800;
}

.trusted-content-row-copy strong {
  display: block;
  margin-top: 0.15rem;
  color: rgb(15 23 42);
  font-size: 0.95rem;
}

.trusted-content-row-copy p {
  margin-top: 0.35rem;
  color: rgb(71 85 105);
  font-size: 0.8rem;
  line-height: 1.55;
}

.trusted-content-row-copy a {
  display: inline-flex;
  margin-top: 0.45rem;
  color: rgb(29 78 216);
  font-size: 0.8rem;
  font-weight: 800;
}

.trusted-content-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.55rem;
}

.trusted-content-controls select,
.trusted-content-controls input {
  min-height: 2.35rem;
  min-width: min(14rem, 100%);
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: white;
  padding: 0.45rem 0.65rem;
  color: rgb(15 23 42);
  font-size: 0.8rem;
}

.trusted-content-controls .trusted-content-secondary {
  border-color: rgb(203 213 225);
  color: rgb(71 85 105);
}

.trust-profile-details {
  display: grid;
  gap: 0.45rem;
  align-content: start;
}

.trust-profile-details span,
.trust-profile-state {
  border: 1px solid rgb(167 243 208);
  border-radius: 0.5rem;
  background: rgb(240 253 244);
  padding: 0.5rem 0.65rem;
  color: rgb(6 95 70);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.trust-profile-state {
  align-self: center;
  border-color: rgb(203 213 225);
  background: rgb(248 250 252);
  color: rgb(71 85 105);
}

.useful-reason-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.useful-reason-list > button {
  display: inline-flex;
  min-height: 2.35rem;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: white;
  padding: 0.45rem 0.65rem;
  color: rgb(51 65 85);
  font-size: 0.78rem;
}

.useful-reason-list > button strong {
  color: rgb(4 120 87);
}

.useful-reason-list > .useful-reason-active {
  border-color: rgb(5 150 105);
  background: rgb(236 253 245);
  color: rgb(4 120 87);
  font-weight: 900;
}

.useful-reason-list > .useful-reason-clear {
  border-color: transparent;
  background: transparent;
  color: rgb(100 116 139);
}

.useful-reason-note {
  color: rgb(100 116 139);
  font-size: 0.78rem;
}

.public-update-list-head > span {
  margin-top: 0;
  text-align: right;
}

.public-update-list article {
  margin-top: 0.9rem;
  display: grid;
  grid-template-columns: minmax(8rem, 0.3fr) minmax(0, 1fr) auto;
  align-items: start;
  gap: 1rem;
  border-top: 1px solid rgb(226 232 240);
  padding-top: 0.9rem;
}

.public-update-list article strong,
.public-update-list article span {
  display: block;
}

.public-update-list article strong {
  color: rgb(15 23 42);
  font-size: 0.85rem;
}

.public-update-list article span,
.public-update-list article small {
  color: rgb(100 116 139);
  font-size: 0.75rem;
}

.public-update-list article p {
  color: rgb(51 65 85);
  font-size: 0.85rem;
  line-height: 1.6;
}

.content-trust-panel,
.content-suggestion-panel {
  margin-top: 1.5rem;
  border-top: 1px solid rgb(226 232 240);
  border-bottom: 1px solid rgb(226 232 240);
  padding: 1.25rem 0;
}

.content-trust-kicker {
  color: rgb(37 99 235);
  font-size: 0.75rem;
  font-weight: 800;
}

.content-trust-panel h2,
.content-suggestion-panel h2 {
  margin-top: 0.25rem;
  color: rgb(15 23 42);
  font-size: 1rem;
  font-weight: 800;
}

.content-trust-panel p,
.content-suggestion-panel p {
  margin-top: 0.35rem;
  color: rgb(71 85 105);
  font-size: 0.875rem;
  line-height: 1.7;
}

.content-trust-grid {
  margin-top: 1rem;
  display: grid;
  gap: 0.75rem;
}

.content-trust-grid article,
.content-suggestion-item {
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.9rem;
}

.content-trust-grid span,
.content-suggestion-item-head span,
.content-suggestion-form label > span {
  color: rgb(71 85 105);
  font-size: 0.75rem;
  font-weight: 800;
}

.content-trust-grid strong,
.content-suggestion-item-head strong {
  margin-top: 0.2rem;
  display: block;
  color: rgb(15 23 42);
  font-size: 0.95rem;
}

.content-relationship-note {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.content-relationship-note span {
  border-radius: 999px;
  background: rgb(219 234 254);
  padding: 0.3rem 0.65rem;
  color: rgb(30 64 175);
  font-size: 0.75rem;
  font-weight: 700;
}

.content-suggestion-head,
.content-suggestion-author-actions,
.content-suggestion-form-actions,
.content-suggestion-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.content-suggestion-link,
.content-suggestion-secondary,
.content-suggestion-actions button,
.content-suggestion-form-actions button,
.content-suggestion-empty button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  border: 1px solid rgb(37 99 235);
  padding: 0.45rem 0.8rem;
  color: rgb(37 99 235);
  font-size: 0.8rem;
  font-weight: 800;
}

.content-suggestion-form-actions button {
  background: rgb(37 99 235);
  color: white;
}

.content-suggestion-form-actions button:disabled,
.content-suggestion-secondary:disabled,
.content-suggestion-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.content-suggestion-risk {
  color: rgb(146 64 14) !important;
}

.content-suggestion-error,
.content-suggestion-feedback,
.content-suggestion-empty {
  margin-top: 1rem;
  border-radius: 0.5rem;
  padding: 0.85rem;
  font-size: 0.875rem;
}

.content-suggestion-error {
  border: 1px solid rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(185 28 28);
}

.content-suggestion-feedback,
.content-suggestion-empty {
  border: 1px solid rgb(191 219 254);
  background: rgb(239 246 255);
  color: rgb(30 64 175);
}

.content-suggestion-author,
.content-suggestion-form {
  margin-top: 1rem;
  display: grid;
  gap: 1rem;
}

.content-suggestion-form label {
  display: grid;
  gap: 0.4rem;
}

.content-suggestion-structure-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.content-suggestion-expected-field {
  grid-column: 1 / -1;
}

.content-suggestion-form textarea,
.content-suggestion-form input,
.content-suggestion-form select,
.content-suggestion-item textarea {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid rgb(203 213 225);
  background: white;
  padding: 0.7rem 0.8rem;
  color: rgb(15 23 42);
  outline: none;
}

.content-suggestion-checkbox {
  display: flex !important;
  grid-template-columns: none !important;
  flex-direction: row;
  align-items: flex-start;
  gap: 0.5rem;
}

.content-suggestion-checkbox input {
  margin-top: 0.2rem;
  width: auto;
}

.content-suggestion-meta {
  color: rgb(30 64 175) !important;
  font-size: 0.78rem !important;
}

.content-suggestion-public-note {
  color: rgb(4 120 87) !important;
  font-weight: 700;
}

.content-suggestion-reader,
.content-suggestion-history {
  display: grid;
  gap: 1rem;
}

.content-suggestion-reader {
  margin-top: 1rem;
}

.content-suggestion-history-head,
.content-suggestion-history-time {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
}

.content-suggestion-history-head h3 {
  margin-top: 0.2rem;
  color: rgb(15 23 42);
  font-size: 0.95rem;
  font-weight: 800;
}

.content-suggestion-history-head > span,
.content-suggestion-history-time {
  color: rgb(100 116 139);
  font-size: 0.75rem;
}

#content-suggestions,
[id^='content-suggestion-'] {
  scroll-margin-top: 6rem;
}

[id^='content-suggestion-']:target {
  outline: 3px solid rgb(14 165 233 / 0.35);
  outline-offset: 3px;
}

.discussion-follow-panel {
  margin-top: 0.9rem;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(191 219 254);
  background: rgb(239 246 255);
  padding: 1rem;
}

.discussion-follow-kicker {
  font-size: 0.75rem;
  font-weight: 900;
  color: rgb(29 78 216);
}

.discussion-follow-panel h2 {
  margin-top: 0.25rem;
  color: rgb(15 23 42);
  font-size: 1rem;
  font-weight: 900;
}

.discussion-follow-panel p:not(.discussion-follow-kicker) {
  margin-top: 0.35rem;
  max-width: 42rem;
  color: rgb(51 65 85);
  font-size: 0.875rem;
  line-height: 1.65;
}

.discussion-follow-actions {
  display: flex;
  min-width: min(14rem, 100%);
  flex: 0 1 18rem;
  flex-direction: column;
  gap: 0.5rem;
}

.discussion-follow-button {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  border: 1px solid rgb(37 99 235);
  background: rgb(37 99 235);
  padding: 0.55rem 0.9rem;
  color: white;
  font-size: 0.875rem;
  font-weight: 900;
  transition: background-color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;
}

.discussion-follow-button:hover:not(:disabled) {
  border-color: rgb(29 78 216);
  background: rgb(29 78 216);
}

.discussion-follow-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.discussion-follow-button--active {
  border-color: rgb(15 118 110);
  background: rgb(15 118 110);
}

.discussion-follow-link {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  background: rgb(37 99 235);
  padding: 0.55rem 0.9rem;
  color: white;
  font-size: 0.875rem;
  font-weight: 900;
}

.discussion-follow-actions span {
  color: rgb(71 85 105);
  font-size: 0.75rem;
  line-height: 1.5;
}

.author-reason-box {
  margin-top: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(199 210 254);
  background: rgb(238 242 255);
  padding: 0.85rem;
}

.author-action-group {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.contact-author-button,
.contact-author-unavailable {
  display: inline-flex;
  min-height: 2.5rem;
  max-width: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  padding: 0.5rem 0.85rem;
  font-size: 0.875rem;
  font-weight: 700;
}

.contact-author-button {
  border: 1px solid rgb(203 213 225);
  background: white;
  color: rgb(51 65 85);
}

.contact-author-unavailable {
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  color: rgb(100 116 139);
}

.author-reason-box strong {
  display: block;
  color: rgb(67 56 202);
  font-size: 0.78rem;
  font-weight: 900;
}

.author-reason-box p {
  margin-top: 0.4rem;
  color: rgb(51 65 85);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.author-reason-box a {
  margin-top: 0.65rem;
  display: inline-flex;
  color: rgb(37 99 235);
  font-size: 0.8125rem;
  font-weight: 900;
}

.creator-feedback-box {
  margin-top: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(167 243 208);
  background: rgb(236 253 245);
  padding: 0.85rem;
}

.creator-feedback-box strong {
  display: block;
  color: rgb(4 120 87);
  font-size: 0.78rem;
  font-weight: 900;
}

.creator-feedback-grid {
  margin-top: 0.65rem;
  display: grid;
  gap: 0.5rem;
}

.creator-feedback-grid span {
  border-radius: 0.5rem;
  background: white;
  padding: 0.5rem 0.65rem;
  color: rgb(6 95 70);
  font-size: 0.8125rem;
  font-weight: 900;
}

.creator-feedback-box p {
  margin-top: 0.65rem;
  color: rgb(51 65 85);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.creator-feedback-link {
  margin-top: 0.7rem;
  display: inline-flex;
  color: rgb(5 150 105);
  font-size: 0.8125rem;
  font-weight: 900;
}

.creator-feedback-actions {
  margin-top: 0.7rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.creator-feedback-actions .creator-feedback-link {
  margin-top: 0;
}

.dark .favorite-feedback-row {
  border-color: rgb(6 95 70);
  background: rgb(6 78 59 / 0.35);
  color: rgb(167 243 208);
}

.dark .favorite-feedback-row a,
.dark .favorite-organizer-row a {
  color: rgb(187 247 208);
}

.dark .trusted-content-loop,
.dark .public-update-list,
.dark .content-trust-panel,
.dark .content-suggestion-panel {
  border-color: rgb(51 65 85);
}

.dark .trusted-content-loop-head h2,
.dark .public-update-list-head h2,
.dark .trusted-content-row-copy strong,
.dark .public-update-list article strong,
.dark .content-trust-panel h2,
.dark .content-suggestion-panel h2,
.dark .content-trust-grid strong,
.dark .content-suggestion-item-head strong {
  color: rgb(248 250 252);
}

.dark .trusted-content-loop-head span,
.dark .public-update-list-head span,
.dark .trusted-content-row-copy p,
.dark .public-update-list article p,
.dark .content-trust-panel p,
.dark .content-suggestion-panel p {
  color: rgb(203 213 225);
}

.dark .trusted-content-row,
.dark .public-update-list article {
  border-color: rgb(30 41 59);
}

.dark .trusted-content-refresh,
.dark .trusted-content-controls button,
.dark .useful-reason-list > button,
.dark .content-trust-grid article,
.dark .content-suggestion-item {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .trusted-content-controls select,
.dark .trusted-content-controls input,
.dark .content-suggestion-form textarea,
.dark .content-suggestion-form input,
.dark .content-suggestion-form select,
.dark .content-suggestion-item textarea {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23);
  color: rgb(248 250 252);
}

.dark .trust-profile-details span {
  border-color: rgb(6 95 70 / 0.72);
  background: rgb(6 78 59 / 0.32);
  color: rgb(167 243 208);
}

.dark .trust-profile-state {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .useful-reason-list > .useful-reason-active {
  border-color: rgb(16 185 129);
  background: rgb(6 78 59 / 0.45);
  color: rgb(167 243 208);
}

.dark .public-update-list article span,
.dark .public-update-list article small,
.dark .useful-reason-note {
  color: rgb(148 163 184);
}

.dark .discussion-follow-panel {
  border-color: rgb(30 64 175);
  background: rgb(30 41 59);
}

.dark .discussion-follow-kicker,
.dark .discussion-follow-link {
  color: rgb(191 219 254);
}

.dark .discussion-follow-button {
  border-color: rgb(96 165 250);
  background: rgb(37 99 235);
}

.dark .discussion-follow-button--active {
  border-color: rgb(45 212 191);
  background: rgb(15 118 110);
}

.dark .discussion-follow-link {
  background: rgb(29 78 216);
  color: white;
}

.dark .discussion-follow-panel h2 {
  color: rgb(248 250 252);
}

.dark .discussion-follow-panel p:not(.discussion-follow-kicker),
.dark .discussion-follow-actions span {
  color: rgb(203 213 225);
}

.dark .author-reason-box {
  border-color: rgb(49 46 129);
  background: rgb(30 41 59);
}

.dark .contact-author-button,
.dark .contact-author-unavailable {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .author-reason-box strong,
.dark .author-reason-box a {
  color: rgb(199 210 254);
}

.dark .author-reason-box p {
  color: rgb(203 213 225);
}

.dark .creator-feedback-box {
  border-color: rgb(6 95 70);
  background: rgb(6 78 59 / 0.35);
}

.dark .creator-feedback-box strong {
  color: rgb(167 243 208);
}

.dark .creator-feedback-grid span {
  background: rgb(15 23 42);
  color: rgb(187 247 208);
}

.dark .creator-feedback-box p {
  color: rgb(203 213 225);
}

.dark .creator-feedback-link {
  color: rgb(167 243 208);
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

.post-knowledge-assets {
  border: 1px solid rgb(226 232 240);
  border-radius: 1rem;
  background: rgb(248 250 252);
  padding: 1.25rem;
}

.post-knowledge-head {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.post-knowledge-head p {
  font-size: 0.75rem;
  font-weight: 900;
  color: rgb(37 99 235);
}

.post-knowledge-head h2 {
  margin-top: 0.25rem;
  font-size: 1.1rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.post-knowledge-head span,
.post-knowledge-note,
.post-knowledge-card p,
.post-knowledge-card small,
.post-knowledge-list p {
  color: rgb(100 116 139);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.post-knowledge-head a,
.post-knowledge-card a {
  align-self: flex-start;
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgb(37 99 235);
}

.post-knowledge-grid {
  display: grid;
  gap: 0.85rem;
  margin-top: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.post-knowledge-card,
.post-knowledge-list {
  display: grid;
  gap: 0.6rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.85rem;
  background: white;
  padding: 1rem;
}

.post-knowledge-card strong,
.post-knowledge-list strong {
  color: rgb(15 23 42);
  font-weight: 900;
}

.post-knowledge-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.post-knowledge-card-tags span {
  border-radius: 999px;
  background: rgb(239 246 255);
  padding: 0.2rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 800;
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

.detail-back {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 1rem;
  padding: 0 0.65rem;
  border: 1px solid rgb(229 231 235);
  border-radius: 6px;
  background: white;
  color: rgb(75 85 99);
  font-size: 0.8125rem;
  font-weight: 800;
}

.detail-back:hover {
  border-color: rgb(191 219 254);
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.dark .detail-back {
  border-color: rgb(63 63 70);
  background: rgb(24 26 32);
  color: rgb(203 213 225);
}

.dark .detail-back:hover {
  border-color: rgb(30 58 138);
  background: rgb(30 58 138 / 0.35);
  color: rgb(147 197 253);
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

  .discussion-follow-panel,
  .discussion-follow-actions,
  .author-action-group,
  .trusted-content-loop-head,
  .public-update-list-head {
    width: 100%;
  }

  .trusted-content-loop-head,
  .public-update-list-head {
    flex-direction: column;
  }

  .trusted-content-row,
  .public-update-list article {
    grid-template-columns: 1fr;
  }

  .trusted-content-controls,
  .useful-reason-list {
    justify-content: flex-start;
  }

  .trusted-content-controls select,
  .trusted-content-controls input,
  .trusted-content-controls button,
  .trusted-content-refresh {
    width: 100%;
  }

  .public-update-list-head > span {
    text-align: left;
  }

  .discussion-follow-button,
  .discussion-follow-link,
  .contact-author-button,
  .contact-author-unavailable {
    width: 100%;
  }

  .ai-knowledge-grid,
  .domain-detail-gallery,
  .domain-detail-grid,
  .star-grid,
  .material-list-grid,
  .knowledge-path-steps,
  .content-suggestion-structure-fields {
    grid-template-columns: 1fr;
  }

  .content-suggestion-expected-field {
    grid-column: auto;
  }

  .ai-knowledge-actions a,
  .knowledge-path-actions a {
    width: 100%;
  }
}
</style>
