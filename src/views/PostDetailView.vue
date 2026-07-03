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

                <div v-if="visibleDetailImages.length" class="domain-detail-gallery">
                  <img
                    v-for="(image, index) in visibleDetailImages"
                    :key="image"
                    :src="image"
                    :alt="`${domainDetailSurface.title} ${index + 1}`"
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
                  <RouterLink to="/me/prep">整理复盘要点</RouterLink>
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
              <div
                v-if="interactionFeedback"
                class="favorite-feedback-row"
                role="status"
                aria-live="polite"
              >
                <span>{{ interactionFeedback }}</span>
                <RouterLink
                  v-if="post.myInteraction?.favorited"
                  to="/me?tab=favorites"
                >
                  查看我的收藏
                </RouterLink>
              </div>

              <section
                v-if="contentTrustSignals.length || publicAcceptedSuggestionNotes.length"
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
                  <article v-for="note in publicAcceptedSuggestionNotes" :key="`accepted-note-${note}`">
                    <span>读者建议</span>
                    <strong>作者已补充</strong>
                    <p>{{ note }}</p>
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

              <section
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
                      :disabled="isHandlingContentSuggestion || postSuggestionEntryOpen === false"
                      @click="closePostSuggestionEntry"
                    >
                      {{ postSuggestionEntryOpen === false ? '建议入口已关闭' : '关闭这篇建议入口' }}
                    </button>
                  </div>
                  <div v-if="isLoadingContentSuggestions" class="content-suggestion-empty">正在加载读者建议...</div>
                  <div v-else-if="contentSuggestions.length === 0" class="content-suggestion-empty">暂无待处理建议。</div>
                  <article v-for="item in contentSuggestions" v-else :key="item.id" class="content-suggestion-item">
                    <div class="content-suggestion-item-head">
                      <span>{{ contentSuggestionTypeText(item.type) }}</span>
                      <strong>{{ contentSuggestionStatusText(item.status) }}</strong>
                    </div>
                    <p>{{ item.detail }}</p>
                    <a v-if="item.sourceUrl" :href="item.sourceUrl" target="_blank" rel="noreferrer">查看补充链接</a>
                    <p v-if="item.allowPublicAttribution && item.submitterNickname" class="content-suggestion-meta">
                      提交者允许公开昵称：{{ item.submitterNickname }}
                    </p>
                    <textarea v-model="contentSuggestionReplyDrafts[String(item.id)]" rows="2" maxlength="1000" placeholder="给提交者的处理说明，可选" />
                    <div class="content-suggestion-actions">
                      <button type="button" :disabled="isHandlingContentSuggestion" @click="handleContentSuggestionAction(item, 'ACCEPTED')">采纳</button>
                      <button type="button" :disabled="isHandlingContentSuggestion" @click="handleContentSuggestionAction(item, 'REPLIED')">回复</button>
                      <button type="button" :disabled="isHandlingContentSuggestion" @click="handleContentSuggestionAction(item, 'IGNORED')">忽略</button>
                      <button type="button" :disabled="isHandlingContentSuggestion" @click="handleContentSuggestionAction(item, 'CLOSED')">关闭</button>
                    </div>
                  </article>
                </div>

                <form v-else-if="authStore.isLoggedIn" class="content-suggestion-form" @submit.prevent="submitContentSuggestion">
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

            <section class="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
              <h2 class="mb-6 text-xl font-bold text-slate-900 dark:text-slate-100">{{ discussionSectionTitle }}</h2>

              <div v-if="authStore.isLoggedIn" class="mb-6 border-b border-slate-200 pb-6 dark:border-slate-800">
                <textarea
                  v-model="commentText"
                  rows="3"
                  :placeholder="discussionPlaceholder"
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
                :post-author-uid="post.author.uid"
                :can-like-comments="authStore.isLoggedIn"
                :can-report-comments="true"
                :can-reply-comments="authStore.isLoggedIn"
                :empty-text="discussionEmptyText"
                :reply-action-label="discussionReplyActionLabel"
                :reply-placeholder="discussionReplyPlaceholder"
                :reply-submit-label="discussionReplySubmitLabel"
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
              <h3 class="mb-4 font-bold text-slate-900 dark:text-slate-100">作者名片</h3>
              <RouterLink v-if="canOpenAuthorProfile" :to="authorProfileTo" class="flex flex-col items-center text-center">
                <div class="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary-600 text-2xl font-bold text-white">
                  <img v-if="post.author.avatar" :src="post.author.avatar" :alt="post.author.nickname" class="h-full w-full object-cover" />
                  <span v-else>{{ post.author.nickname.charAt(0) || '?' }}</span>
                </div>
                <h4 class="font-semibold text-slate-900 dark:text-slate-100">{{ post.author.nickname || '未知用户' }}</h4>
                <p class="mt-1 line-clamp-3 text-xs text-slate-500 dark:text-slate-400">{{ authorBioText }}</p>
              </RouterLink>
              <div v-else class="flex flex-col items-center text-center">
                <div class="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary-600 text-2xl font-bold text-white">
                  <img v-if="post.author.avatar" :src="post.author.avatar" :alt="post.author.nickname" class="h-full w-full object-cover" />
                  <span v-else>{{ post.author.nickname.charAt(0) || '?' }}</span>
                </div>
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
                <RouterLink to="/me" class="creator-feedback-link">回到创作者工作台</RouterLink>
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
      <form class="report-dialog-panel w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title" @submit.prevent="submitReport">
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
          <select v-model="reportForm.reason" class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
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

    <div v-if="false && isReportDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" @click.self="closeReportDialog">
      <form class="report-dialog-panel w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title" @submit.prevent="submitReport">
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
            <option value="FRAUD">诈骗或违法诱导</option>
            <option value="INVESTMENT_MISLEADING">投资误导</option>
            <option value="THREAT">人身威胁</option>
            <option value="MINOR_RISK">未成年人风险</option>
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
import {
  CONTENT_SUGGESTION_STATUS_LABELS,
  CONTENT_SUGGESTION_TYPE_OPTIONS,
  buildContentSuggestionDuplicateKey,
  canSubmitContentSuggestion,
  contentSuggestionApi,
  type ContentSuggestionRecord,
  type ContentSuggestionStatus,
  type ContentSuggestionType,
} from '@/api/contentSuggestions'
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
import { POST_TYPE, getContentTypeLabel, isLegacyInterviewType } from '@/utils/contentTypes'
import { getDomainIcon, getDomainLabel } from '@/utils/domains'
import { buildDomainDetailSurface } from '@/utils/domainPostSurfaces'
import { applyPageSeo, summarizeSeoText } from '@/utils/seo'
import { buildFollowReasons, isPublicAuthor, safeCreatorBio } from '@/utils/creatorSignals'
import { findHighRiskContentWarning } from '@/utils/recommendationGovernance'
import { buildContentTrustSignals, buildRelationshipContext } from '@/utils/communityIdentity'
import { safeStorage } from '@/utils/safeStorage'
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
const reportFeedback = ref<GovernanceFeedback | null>(null)
const isReportSubmitSuccess = ref(false)
const contentSuggestions = ref<ContentSuggestionRecord[]>([])
const isLoadingContentSuggestions = ref(false)
const isSubmittingContentSuggestion = ref(false)
const isHandlingContentSuggestion = ref(false)
const contentSuggestionError = ref('')
const contentSuggestionFeedback = ref('')
const postSuggestionEntryOpen = ref(true)
const contentSuggestionReplyDrafts = ref<Record<string, string>>({})
const contentSuggestionLocalKeys = ref(new Set<string>())
const contentSuggestionDailyCount = ref(0)
const contentSuggestionForm = ref<{
  type: ContentSuggestionType
  detail: string
  sourceUrl: string
  allowPublicAttribution: boolean
}>({
  type: 'SUPPLEMENT',
  detail: '',
  sourceUrl: '',
  allowPublicAttribution: false,
})
const unavailableReportFeedbackMessage = '内容状态已变化，无需重复举报'
const duplicateReportFeedbackMessage = '重复举报已收到，已有待处理举报，请勿重复提交。'
const rateLimitedReportFeedbackMessage = '举报太频繁，请稍后再提交。'
const reportFailedFeedbackMessage = '举报提交失败，暂时无法提交举报。'
const reportSubmittedFeedbackMessage = '感谢反馈，我们会根据社区规则处理。'
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
const isAnonymousMaskedAuthor = computed(() => Boolean(post.value?.anonymous))
const canOpenAuthorProfile = computed(() => Boolean(post.value)
  && !isAnonymousMaskedAuthor.value
  && isPublicAuthor(post.value?.author)
  && authorUid.value !== ''
  && authorUid.value !== '0')
const canFollowAuthor = computed(() => canOpenAuthorProfile.value && !isOwnPost.value)
const authorProfileTo = computed(() => `/u/${authorUid.value}`)
const authorBioText = computed(() => safeCreatorBio(post.value?.author.signature, '这位作者还没有填写简介。'))
const authorFollowReason = computed(() => buildFollowReasons(post.value?.author, post.value ? [post.value] : [])[0])
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
const isQuestionPost = computed(() => Number(post.value?.postType) === POST_TYPE.QUESTION)
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
const discussionFollowStatusText = computed(() => (
  '当前版本先展示关注讨论入口，等帖子级关注接口承接后再保存关注状态。'
))
const relatedSectionTitle = computed(() => (isQuestionPost.value ? '相关问题求助' : '相关帖子'))
const relatedEmptyText = computed(() => (isQuestionPost.value ? '暂无相似讨论' : '暂无相关内容'))
const isLegacyInterview = computed(() => isLegacyInterviewType(post.value?.postType))
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
  return normalizeRiskNoticeForUsers(findHighRiskContentWarning([
    getDomainLabel(post.value.domain),
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
const highRiskSuggestionGuidance = computed(() => {
  if (!effectiveRiskNotice.value) return ''
  return contentSuggestionForm.value.type === 'CORRECTION'
    ? '高风险频道的事实更正只作为请作者补充来源或上下文，不由平台裁定专业结论。'
    : '高风险频道建议保持中性说明，优先补充来源、上下文和风险边界。'
})
const publicAcceptedSuggestionNotes = computed(() => {
  const source = post.value?.extension?.acceptedSuggestionNotes
    ?? post.value?.extension?.publicAcceptedSuggestionNotes
    ?? post.value?.extension?.publicAcceptedSuggestions
  const items = Array.isArray(source) ? source : []
  return items
    .map((item) => {
      if (typeof item === 'string') return item
      return String(item?.acceptedPublicNote || item?.publicNote || '').trim()
    })
    .filter(Boolean)
    .slice(0, 3)
})
const contentSuggestionDuplicateKey = computed(() => buildContentSuggestionDuplicateKey({
  postId: post.value?.postId,
  submitterUid: authStore.user?.uid,
  type: contentSuggestionForm.value.type,
  detail: contentSuggestionForm.value.detail,
}))
const hasDuplicatePendingContentSuggestion = computed(() => (
  contentSuggestionLocalKeys.value.has(contentSuggestionDuplicateKey.value)
  || contentSuggestions.value.some((item) => item.status === 'PENDING'
    && item.type === contentSuggestionForm.value.type
    && String(item.detail || '').replace(/\s+/g, ' ').trim().toLowerCase() === String(contentSuggestionForm.value.detail || '').replace(/\s+/g, ' ').trim().toLowerCase())
))
const contentSuggestionSubmitGuard = computed(() => canSubmitContentSuggestion({
  isLoggedIn: authStore.isLoggedIn,
  isAuthor: isOwnPost.value,
  suggestionsOpen: postSuggestionEntryOpen.value,
  post: post.value,
  type: contentSuggestionForm.value.type,
  detail: contentSuggestionForm.value.detail,
  duplicatePending: hasDuplicatePendingContentSuggestion.value,
  dailySubmissionCount: contentSuggestionDailyCount.value,
  blockedByAuthor: Boolean((post.value?.author as any)?.blockedByAuthor),
  governanceRestricted: Boolean((authStore.user as any)?.muted || (authStore.user as any)?.banned),
}))
const contentSuggestionSubmitDisabled = computed(() => isSubmittingContentSuggestion.value || !contentSuggestionSubmitGuard.value.allowed)
const contentSuggestionStatusText = (status: ContentSuggestionStatus) => CONTENT_SUGGESTION_STATUS_LABELS[status] || status
const contentSuggestionTypeText = (type: ContentSuggestionType) => CONTENT_SUGGESTION_TYPE_OPTIONS.find((item) => item.value === type)?.label || type
const contentSuggestionStoragePrefix = computed(() => `phase15-content-suggestions:${authStore.user?.uid || 'guest'}:${postId.value}`)

const loadLocalContentSuggestionGuards = () => {
  if (typeof window === 'undefined') return
  const key = contentSuggestionStoragePrefix.value
  try {
    const raw = JSON.parse(safeStorage.get(key) || '{}') as { date?: string; count?: number; keys?: string[] }
    const today = new Date().toISOString().slice(0, 10)
    contentSuggestionDailyCount.value = raw.date === today ? Math.max(0, Number(raw.count || 0)) : 0
    contentSuggestionLocalKeys.value = new Set(raw.date === today && Array.isArray(raw.keys) ? raw.keys.map(String) : [])
  } catch {
    contentSuggestionDailyCount.value = 0
    contentSuggestionLocalKeys.value = new Set()
  }
}

const rememberLocalContentSuggestionGuard = () => {
  if (typeof window === 'undefined') return
  const today = new Date().toISOString().slice(0, 10)
  const nextKeys = new Set([...contentSuggestionLocalKeys.value, contentSuggestionDuplicateKey.value].filter(Boolean))
  contentSuggestionLocalKeys.value = nextKeys
  contentSuggestionDailyCount.value += 1
  safeStorage.set(contentSuggestionStoragePrefix.value, JSON.stringify({
    date: today,
    count: contentSuggestionDailyCount.value,
    keys: [...nextKeys],
  }))
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
const reportTargetLabel = computed(() => (reportTarget.value.type === 'comment' ? '评论' : '帖子'))
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

const mergeContentSuggestion = (item: ContentSuggestionRecord) => {
  const rest = contentSuggestions.value.filter((current) => String(current.id) !== String(item.id))
  contentSuggestions.value = [item, ...rest].sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))
}

const rememberPublicAcceptedSuggestionNote = (note?: string) => {
  const safeNote = String(note || '').trim()
  if (!post.value || !safeNote) return
  const currentNotes = publicAcceptedSuggestionNotes.value
  post.value = {
    ...post.value,
    extension: {
      ...(post.value.extension || {}),
      acceptedSuggestionNotes: [...new Set([safeNote, ...currentNotes])].slice(0, 3),
    },
  }
}

const loadContentSuggestions = async () => {
  loadLocalContentSuggestionGuards()
  contentSuggestionFeedback.value = ''
  if (!post.value || !authStore.isLoggedIn) {
    contentSuggestions.value = []
    return
  }
  isLoadingContentSuggestions.value = true
  contentSuggestionError.value = ''
  try {
    const res = isOwnPost.value
      ? await contentSuggestionApi.listForAuthorPost(post.value.postId)
      : await contentSuggestionApi.listMineForPost(post.value.postId)
    contentSuggestions.value = res.data || []
  } catch (error: any) {
    contentSuggestions.value = []
    contentSuggestionError.value = getErrorMessage(error, '补充建议接口暂不可用，当前不会伪造提交成功。')
  } finally {
    isLoadingContentSuggestions.value = false
  }
}

const submitContentSuggestion = async () => {
  if (!post.value) return
  if (!requireLogin()) return
  const guard = contentSuggestionSubmitGuard.value
  if (!guard.allowed) {
    contentSuggestionFeedback.value = guard.reason
    return
  }
  isSubmittingContentSuggestion.value = true
  contentSuggestionFeedback.value = ''
  contentSuggestionError.value = ''
  try {
    const res = await contentSuggestionApi.submit(post.value.postId, {
      type: contentSuggestionForm.value.type,
      detail: contentSuggestionForm.value.detail,
      sourceUrl: contentSuggestionForm.value.sourceUrl || undefined,
      allowPublicAttribution: contentSuggestionForm.value.allowPublicAttribution,
    })
    if (res.data) mergeContentSuggestion(res.data)
    rememberLocalContentSuggestionGuard()
    contentSuggestionForm.value = {
      type: 'SUPPLEMENT',
      detail: '',
      sourceUrl: '',
      allowPublicAttribution: false,
    }
    contentSuggestionFeedback.value = '已提交给作者处理，不会进入公开讨论。'
    toast.success('补充建议已提交给作者')
  } catch (error: any) {
    contentSuggestionError.value = getErrorMessage(error, '补充建议暂未提交成功。')
  } finally {
    isSubmittingContentSuggestion.value = false
  }
}

const handleContentSuggestionAction = async (
  item: ContentSuggestionRecord,
  action: 'ACCEPTED' | 'REPLIED' | 'IGNORED' | 'CLOSED',
) => {
  if (!isOwnPost.value || isHandlingContentSuggestion.value) return
  isHandlingContentSuggestion.value = true
  contentSuggestionError.value = ''
  try {
    const reply = contentSuggestionReplyDrafts.value[String(item.id)]?.trim()
    const res = action === 'ACCEPTED'
      ? await contentSuggestionApi.accept(item.id, { publicNote: '作者已根据读者建议补充。' })
      : action === 'REPLIED'
        ? await contentSuggestionApi.reply(item.id, { reply })
        : action === 'IGNORED'
          ? await contentSuggestionApi.ignore(item.id)
          : await contentSuggestionApi.close(item.id, { reply })
    const nextSuggestion = res.data || { ...item, status: action, authorReply: reply, updatedAt: Date.now() }
    mergeContentSuggestion(nextSuggestion)
    if (action === 'ACCEPTED') {
      rememberPublicAcceptedSuggestionNote(nextSuggestion.acceptedPublicNote || '作者已根据读者建议补充。')
    }
    if (action === 'REPLIED' || action === 'CLOSED') {
      contentSuggestionReplyDrafts.value = { ...contentSuggestionReplyDrafts.value, [String(item.id)]: '' }
    }
    toast.success('建议状态已更新')
  } catch (error: any) {
    contentSuggestionError.value = getErrorMessage(error, '建议处理暂不可用。')
  } finally {
    isHandlingContentSuggestion.value = false
  }
}

const closePostSuggestionEntry = async () => {
  if (!post.value || !isOwnPost.value || isHandlingContentSuggestion.value) return
  isHandlingContentSuggestion.value = true
  contentSuggestionError.value = ''
  try {
    const res = await contentSuggestionApi.closePostEntry(post.value.postId)
    postSuggestionEntryOpen.value = res.data?.suggestionsOpen !== true ? false : postSuggestionEntryOpen.value
    post.value = {
      ...post.value,
      extension: {
        ...(post.value.extension || {}),
        suggestionsOpen: postSuggestionEntryOpen.value,
      },
    }
    toast.success('已关闭这篇内容的建议入口')
  } catch (error: any) {
    contentSuggestionError.value = getErrorMessage(error, '建议入口暂无法关闭。')
  } finally {
    isHandlingContentSuggestion.value = false
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
    materialErrorMessage.value = getErrorMessage(error, '内容素材加载失败')
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
  loadInteractionState()
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
  loadComments(true)
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
  loadContentSuggestions()
  if (showStageTwoDetailPanels) loadInterviewMaterial()
})

watch(canViewVersionHistory, (allowed) => {
  if (!allowed) isVersionDialogOpen.value = false
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

.favorite-feedback-row a {
  font-weight: 900;
  color: rgb(4 120 87);
}

.content-trust-panel,
.content-suggestion-panel {
  margin-top: 1.5rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 1.25rem;
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
  border-radius: 0.625rem;
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
  min-width: 14rem;
  flex: 0 1 18rem;
  flex-direction: column;
  gap: 0.5rem;
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

.dark .favorite-feedback-row {
  border-color: rgb(6 95 70);
  background: rgb(6 78 59 / 0.35);
  color: rgb(167 243 208);
}

.dark .favorite-feedback-row a {
  color: rgb(187 247 208);
}

.dark .discussion-follow-panel {
  border-color: rgb(30 64 175);
  background: rgb(30 41 59);
}

.dark .discussion-follow-kicker,
.dark .discussion-follow-link {
  color: rgb(191 219 254);
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
