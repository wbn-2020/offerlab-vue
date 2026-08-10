<template>
  <div class="app-shell">
    <AppHeader />

    <main class="collaboration-page community-page collaboration-hub-page mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <header class="workspace-header collaboration-hub-hero">
        <div class="workspace-title-group collaboration-hub-hero-copy">
          <span class="workspace-mark collaboration-hub-mark" aria-hidden="true">
            <Users class="h-6 w-6" />
          </span>
          <div class="min-w-0">
            <p class="workspace-kicker">闻野 / 公共共建</p>
            <h1>公共共建中心</h1>
            <p>从正在发生的内容需求进入，参与合集、活动、讨论和经验交流，把一次分享变成社区可以继续使用的公共资产。</p>
          </div>
        </div>
        <div class="workspace-header-actions collaboration-hub-header-actions">
          <label v-if="showGlobalSort" class="workspace-sort-control">
            <span>排序</span>
            <select v-model="hubSort" class="toolbar-select" aria-label="协作资源排序" @change="changeSort">
              <option value="">默认</option>
              <option value="latest">最新发布</option>
              <option value="updated">最近更新</option>
            </select>
          </label>
          <button v-if="isPublicBrowseTab" type="button" class="secondary-action workspace-refresh" @click="refreshCurrentTab">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': currentTabLoading }" aria-hidden="true" />
            刷新当前视图
          </button>
        </div>
      </header>

      <section class="hub-participation-guide" aria-labelledby="hub-participation-title">
        <div class="hub-guide-heading">
          <div>
            <p class="hub-guide-kicker">从公共问题开始</p>
            <h2 id="hub-participation-title">找到你现在能参与的一步</h2>
          </div>
          <p>公开需求和协作资源会保留来源、权限与贡献记录，方便继续跟进。</p>
        </div>
        <div class="hub-guide-grid">
          <button
            type="button"
            class="hub-guide-step"
            :class="{ 'hub-guide-step-active': activeTab === 'needs' }"
            :aria-pressed="activeTab === 'needs'"
            @click="selectTab('needs')"
          >
            <span class="hub-guide-number">01</span>
            <span class="hub-guide-step-copy">
              <strong>看见缺口</strong>
              <small>浏览公开需求，认领明确的交付任务。</small>
            </span>
            <ArrowRight class="hub-guide-arrow" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="hub-guide-step"
            :class="{ 'hub-guide-step-active': activeTab === 'series' }"
            :aria-pressed="activeTab === 'series'"
            @click="selectTab('series')"
          >
            <span class="hub-guide-number">02</span>
            <span class="hub-guide-step-copy">
              <strong>收拢内容</strong>
              <small>加入协作合集，让分散经验形成主题。</small>
            </span>
            <ArrowRight class="hub-guide-arrow" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="hub-guide-step"
            :class="{ 'hub-guide-step-active': activeTab === 'activities' }"
            :aria-pressed="activeTab === 'activities'"
            @click="selectTab('activities')"
          >
            <span class="hub-guide-number">03</span>
            <span class="hub-guide-step-copy">
              <strong>一起产出</strong>
              <small>参与共创活动，把经验交付给公共主题。</small>
            </span>
            <ArrowRight class="hub-guide-arrow" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="hub-guide-step"
            :class="{ 'hub-guide-step-active': activeTab === 'discussions' }"
            :aria-pressed="activeTab === 'discussions'"
            @click="selectTab('discussions')"
          >
            <span class="hub-guide-number">04</span>
            <span class="hub-guide-step-copy">
              <strong>共同判断</strong>
              <small>参与结构化讨论，留下可复用的共识。</small>
            </span>
            <ArrowRight class="hub-guide-arrow" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="hub-guide-step"
            :class="{ 'hub-guide-step-active': activeTab === 'office-hours' }"
            :aria-pressed="activeTab === 'office-hours'"
            @click="selectTab('office-hours')"
          >
            <span class="hub-guide-number">05</span>
            <span class="hub-guide-step-copy">
              <strong>经验交流</strong>
              <small>预约开放时段，和有经验的人面对面交流。</small>
            </span>
            <ArrowRight class="hub-guide-arrow" aria-hidden="true" />
          </button>
        </div>
      </section>

      <nav class="workspace-tabs" role="tablist" aria-label="协作工作台视图">
        <button
          v-for="tab in tabs"
          :id="`collaboration-tab-${tab.key}`"
          :key="tab.key"
          type="button"
          role="tab"
          class="workspace-tab"
          :class="{ 'workspace-tab-active': activeTab === tab.key }"
          :aria-selected="activeTab === tab.key"
          :aria-controls="`collaboration-panel-${tab.key}`"
          @click="selectTab(tab.key)"
        >
          <component :is="tab.icon" class="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{{ tab.label }}</span>
        </button>
      </nav>

      <section
        v-if="activeTab === 'needs'"
        id="collaboration-panel-needs"
        class="workspace-layout"
        role="tabpanel"
        aria-labelledby="collaboration-tab-needs"
        data-community-public-section="needs"
        :data-public-section-state="collectionDisplayState(needState)"
      >
        <aside class="workspace-panel workspace-form-panel">
          <div class="panel-heading">
            <span class="panel-icon"><Plus class="h-4 w-4" aria-hidden="true" /></span>
            <div>
              <h2>创建内容需求</h2>
              <p>明确目标、交付形式与验收条件。</p>
            </div>
          </div>

          <div v-if="!authStore.isLoggedIn" class="login-notice">
            <LogIn class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>登录后可发布需求并参与认领。</span>
            <button type="button" @click="goToLogin">登录</button>
          </div>

          <form class="workspace-form" @submit.prevent="createNeed">
            <div class="field-grid field-grid-three">
              <label class="field-group">
                <span>领域</span>
                <select v-model.number="needForm.domain" class="workspace-input">
                  <option :value="0" disabled>请选择频道</option>
                  <option v-for="domain in localDomainConfigs" :key="domain.domain" :value="domain.domain">
                    {{ domain.domainName }}
                  </option>
                </select>
              </label>

              <label class="field-group">
                <span>来源</span>
                <select v-model="needForm.sourceType" class="workspace-input">
                  <option v-for="item in needSourceOptions" :key="item.value" :value="item.value">
                    {{ item.label }}
                  </option>
                </select>
              </label>

              <label class="field-group">
                <span>形式</span>
                <select v-model="needForm.contentFormat" class="workspace-input">
                  <option v-for="item in needFormatOptions" :key="item.value" :value="item.value">
                    {{ item.label }}
                  </option>
                </select>
              </label>
            </div>

            <label class="field-group">
              <span>需求标题</span>
              <input
                v-model.trim="needForm.title"
                class="workspace-input"
                type="text"
                maxlength="120"
                placeholder="例如：补充一份前端性能排查清单"
                required
              />
            </label>

            <label class="field-group">
              <span>需求说明</span>
              <textarea
                v-model.trim="needForm.description"
                class="workspace-textarea"
                rows="5"
                maxlength="2000"
                placeholder="说明背景、缺口与预期读者。"
                required
              />
            </label>

            <label class="field-group">
              <span>验收条件</span>
              <textarea
                v-model.trim="needForm.acceptanceCriteria"
                class="workspace-textarea workspace-textarea-compact"
                rows="3"
                maxlength="1000"
                placeholder="列出完成后应满足的关键条件。"
              />
            </label>

            <label class="field-group">
              <span>来源资源 ID（可选）</span>
              <input
                v-model.trim="needForm.sourceRefId"
                class="workspace-input"
                type="text"
                inputmode="numeric"
                placeholder="帖子、话题或活动 ID"
              />
            </label>

            <label v-if="isHighRiskDomain(needForm.domain)" class="risk-confirmation">
              <input v-model="needForm.riskAcknowledged" type="checkbox" />
              <span>我已阅读该领域的风险提示，并确认本次提交边界清晰。</span>
            </label>

            <button type="submit" class="primary-action w-full" :disabled="creatingNeed">
              <Loader2 v-if="creatingNeed" class="h-4 w-4 animate-spin" aria-hidden="true" />
              <Plus v-else class="h-4 w-4" aria-hidden="true" />
              {{ creatingNeed ? '正在发布' : '发布需求' }}
            </button>
          </form>
        </aside>

        <section class="workspace-panel workspace-list-panel">
          <div class="list-toolbar">
            <div>
              <h2>公开需求</h2>
              <p>已加载 {{ needState.items.length }} 条</p>
            </div>
            <div class="toolbar-controls">
              <button
                type="button"
                class="icon-action"
                title="刷新需求"
                aria-label="刷新需求"
                :disabled="needState.loading"
                @click="loadNeeds()"
              >
                <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': needState.loading }" aria-hidden="true" />
              </button>
            </div>
          </div>

          <NeedDiscoveryFilters
            :model-value="needFilters"
            @update:model-value="setNeedDiscoveryFilters"
            @reset="resetNeedDiscoveryFilters"
            @submit="submitNeedDiscoveryFilters"
          />

          <div v-if="needState.loading" class="state-stack" aria-label="需求加载中">
            <div v-for="index in 4" :key="index" class="skeleton-row">
              <span class="skeleton-line skeleton-line-short" />
              <span class="skeleton-line" />
              <span class="skeleton-line skeleton-line-medium" />
            </div>
          </div>

          <div v-else-if="needState.error" class="state-message state-message-error" role="alert">
            <AlertCircle class="h-5 w-5" aria-hidden="true" />
            <div>
              <strong>需求加载失败</strong>
              <p>{{ needState.error }}</p>
            </div>
            <button type="button" @click="loadNeeds()">重试</button>
          </div>

          <div v-else-if="!needState.items.length" class="state-message">
            <Inbox class="h-6 w-6" aria-hidden="true" />
            <div>
              <strong>当前筛选下暂无需求</strong>
              <p>可以调整筛选，或发布一个边界清晰的新需求。</p>
            </div>
          </div>

          <div v-else class="collaboration-list">
            <article
              v-for="need in needState.items"
              :id="`collaboration-need-${need.id}`"
              :key="need.id"
              class="collaboration-row"
              :data-linked-need="String(need.id) === linkedNeedId ? 'true' : undefined"
            >
              <div class="row-heading">
                <div class="row-title">
                  <div class="badge-line">
                    <span class="status-badge" :data-status="need.status">{{ needStatusLabel(need.status) }}</span>
                    <span class="meta-badge">{{ domainLabel(need.domain) }}</span>
                    <span class="meta-badge">{{ needFormatLabel(need.contentFormat) }}</span>
                  </div>
                  <h3>{{ need.title }}</h3>
                </div>
                <time :datetime="need.updateTime">{{ formatDate(need.updateTime) }}</time>
              </div>

              <p class="row-description">{{ need.description }}</p>
              <p v-if="need.acceptanceCriteria" class="row-detail">
                <strong>验收：</strong>{{ need.acceptanceCriteria }}
              </p>
              <p v-if="need.matchReasons?.length" class="row-detail">
                <strong>匹配依据：</strong>{{ need.matchReasons.map(labelNeedMatchReason).join(' · ') }}
              </p>

              <div class="row-footer">
                <div class="row-meta">
                  <span><Bell class="h-3.5 w-3.5" aria-hidden="true" />{{ need.followerCount }} 人关注</span>
                  <span v-if="need.claimedByUid"><Hand class="h-3.5 w-3.5" aria-hidden="true" />已认领</span>
                  <span v-if="need.resolutionId || need.resolutionPostId">
                    <FileCheck2 class="h-3.5 w-3.5" aria-hidden="true" />
                    {{ need.resolutionType || 'POST' }} #{{ need.resolutionId || need.resolutionPostId }}
                  </span>
                </div>

                <div class="row-actions">
                  <RouterLink
                    :to="collaborationResourcePath('need', need.id) || collaborationHubLocation('needs')"
                    class="row-action"
                  >
                    <ArrowRight class="h-4 w-4" aria-hidden="true" />
                    查看详情
                  </RouterLink>
                  <label v-if="canClaimNeed(need) && isHighRiskDomain(need.domain)" class="compact-risk">
                    <input
                      type="checkbox"
                      :checked="Boolean(riskAcknowledgements[needRiskKey(need)])"
                      @change="setRiskAcknowledgement(needRiskKey(need), $event)"
                    />
                    <span>确认风险提示</span>
                  </label>
                  <button
                    v-if="need.followed || need.status === 'OPEN' || need.status === 'CLAIMED'"
                    type="button"
                    class="row-action"
                    :disabled="needPendingIds.has(String(need.id))"
                    @click="toggleNeedFollow(need)"
                  >
                    <BellOff v-if="need.followed" class="h-4 w-4" aria-hidden="true" />
                    <BellPlus v-else class="h-4 w-4" aria-hidden="true" />
                    {{ need.followed ? '取消关注' : '关注' }}
                  </button>
                  <button
                    v-if="canClaimNeed(need)"
                    type="button"
                    class="row-action row-action-primary"
                    :disabled="needPendingIds.has(String(need.id))"
                    @click="claimNeed(need)"
                  >
                    <Hand class="h-4 w-4" aria-hidden="true" />
                    认领
                  </button>
                </div>
              </div>
            </article>
          </div>

          <button
            v-if="needState.hasMore && !needState.loading"
            type="button"
            class="load-more"
            :disabled="needState.loadingMore"
            @click="loadNeeds(true)"
          >
            <Loader2 v-if="needState.loadingMore" class="h-4 w-4 animate-spin" aria-hidden="true" />
            {{ needState.loadingMore ? '加载中' : '加载更多需求' }}
          </button>
        </section>
      </section>

      <section
        v-else-if="activeTab === 'my-collaborations'"
        id="collaboration-panel-my-collaborations"
        role="tabpanel"
        aria-labelledby="collaboration-tab-my-collaborations"
        data-community-participation-section="my-collaborations"
      >
        <MyCollaborationsWorkspace
          ref="myCollaborationsRef"
          @browse-needs="selectTab('needs')"
        />
      </section>

      <section
        v-else-if="activeTab === 'series'"
        id="collaboration-panel-series"
        class="workspace-layout"
        role="tabpanel"
        aria-labelledby="collaboration-tab-series"
        data-community-public-section="series"
        :data-public-section-state="collectionDisplayState(seriesState)"
      >
        <aside class="workspace-panel workspace-form-panel">
          <div class="panel-heading">
            <span class="panel-icon"><Send class="h-4 w-4" aria-hidden="true" /></span>
            <div>
              <h2>提交合集内容</h2>
              <p>将本人已公开内容提交给已加入的合集。</p>
            </div>
          </div>

          <div v-if="!authStore.isLoggedIn" class="login-notice">
            <LogIn class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>登录后可向协作合集投稿。</span>
            <button type="button" @click="goToLogin">登录</button>
          </div>

          <form class="workspace-form" @submit.prevent="submitSeriesPost">
            <label class="field-group">
              <span>目标合集</span>
              <select v-model="seriesSubmission.seriesId" class="workspace-input" required>
                <option value="">选择已加入的开放合集</option>
                <option v-for="series in eligibleSeries" :key="series.id" :value="String(series.id)">
                  {{ series.title }} · {{ seriesRoleLabel(series.currentUserRole) }}
                </option>
              </select>
            </label>

            <label class="field-group">
              <span>公开帖子 ID</span>
              <input
                ref="seriesPostInput"
                v-model.trim="seriesSubmission.postId"
                class="workspace-input"
                type="text"
                inputmode="numeric"
                placeholder="输入本人公开帖子 ID"
                required
              />
            </label>

            <label class="field-group">
              <span>投稿说明</span>
              <textarea
                v-model.trim="seriesSubmission.note"
                class="workspace-textarea workspace-textarea-compact"
                rows="4"
                maxlength="1000"
                placeholder="说明内容与合集主题的关系。"
              />
            </label>

            <label v-if="selectedSeries && isHighRiskDomain(selectedSeries.domain)" class="risk-confirmation">
              <input v-model="seriesSubmission.riskAcknowledged" type="checkbox" />
              <span>我已阅读该领域的风险提示，并确认投稿内容边界清晰。</span>
            </label>

            <button type="submit" class="primary-action w-full" :disabled="submittingSeries">
              <Loader2 v-if="submittingSeries" class="h-4 w-4 animate-spin" aria-hidden="true" />
              <Send v-else class="h-4 w-4" aria-hidden="true" />
              {{ submittingSeries ? '正在提交' : '提交到合集' }}
            </button>
          </form>

          <p v-if="seriesState.initialized && !eligibleSeries.length" class="form-footnote">
            当前账号暂无可投稿合集。合集负责人可先将你加入成员。
          </p>
        </aside>

        <section class="workspace-panel workspace-list-panel">
          <div class="list-toolbar">
            <div>
              <h2>协作合集</h2>
              <p>已加载 {{ seriesState.items.length }} 条</p>
            </div>
            <div class="toolbar-controls">
              <select v-model.number="seriesFilters.domain" class="toolbar-select" aria-label="按领域筛选合集" @change="changeSeriesFilters">
                <option value="">全部领域</option>
                <option v-for="domain in localDomainConfigs" :key="domain.domain" :value="domain.domain">
                  {{ domain.domainName }}
                </option>
              </select>
              <select v-model="seriesFilters.status" class="toolbar-select" aria-label="按状态筛选合集" @change="changeSeriesFilters">
                <option value="">全部状态</option>
                <option value="OPEN">开放中</option>
                <option value="CLOSED">已关闭</option>
              </select>
              <button
                type="button"
                class="icon-action"
                title="刷新合集"
                aria-label="刷新合集"
                :disabled="seriesState.loading"
                @click="loadSeries()"
              >
                <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': seriesState.loading }" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div v-if="seriesState.loading" class="state-stack" aria-label="合集加载中">
            <div v-for="index in 4" :key="index" class="skeleton-row">
              <span class="skeleton-line skeleton-line-short" />
              <span class="skeleton-line" />
              <span class="skeleton-line skeleton-line-medium" />
            </div>
          </div>

          <div v-else-if="seriesState.error" class="state-message state-message-error" role="alert">
            <AlertCircle class="h-5 w-5" aria-hidden="true" />
            <div>
              <strong>合集加载失败</strong>
              <p>{{ seriesState.error }}</p>
            </div>
            <button type="button" @click="loadSeries()">重试</button>
          </div>

          <div v-else-if="!seriesState.items.length" class="state-message">
            <Inbox class="h-6 w-6" aria-hidden="true" />
            <div>
              <strong>当前筛选下暂无合集</strong>
              <p>调整领域或状态后再查看。</p>
            </div>
          </div>

          <div v-else class="collaboration-list">
            <article
              v-for="series in seriesState.items"
              :id="`collaboration-series-${series.id}`"
              :key="series.id"
              class="collaboration-row"
              :data-linked-series="String(series.id) === linkedSeriesId ? 'true' : undefined"
            >
              <div class="row-heading">
                <div class="row-title">
                  <div class="badge-line">
                    <span class="status-badge" :data-status="series.status">{{ seriesStatusLabel(series.status) }}</span>
                    <span class="meta-badge">{{ domainLabel(series.domain) }}</span>
                    <span v-if="series.currentUserRole" class="role-badge">{{ seriesRoleLabel(series.currentUserRole) }}</span>
                  </div>
                  <h3>{{ series.title }}</h3>
                </div>
                <time :datetime="series.updateTime">{{ formatDate(series.updateTime) }}</time>
              </div>

              <p class="row-description">{{ series.description }}</p>
              <p v-if="series.submissionInstructions" class="row-detail">
                <strong>投稿要求：</strong>{{ series.submissionInstructions }}
              </p>

              <div class="row-footer">
                <div class="row-meta">
                  <span><Users class="h-3.5 w-3.5" aria-hidden="true" />{{ series.memberCount }} 位成员</span>
                  <span><FileText class="h-3.5 w-3.5" aria-hidden="true" />{{ series.postCount }} 篇内容</span>
                </div>
                <div class="row-actions">
                  <RouterLink
                    :to="collaborationResourcePath('series', series.id) || collaborationHubLocation('series')"
                    class="row-action"
                  >
                    <ArrowRight class="h-4 w-4" aria-hidden="true" />
                    查看详情
                  </RouterLink>
                  <button
                    type="button"
                    class="row-action row-action-primary"
                    :disabled="series.status !== 'OPEN' || !series.currentUserRole"
                    @click="focusSeriesSubmission(series)"
                  >
                    <Send class="h-4 w-4" aria-hidden="true" />
                    {{ series.currentUserRole ? '选择投稿' : '需先加入' }}
                  </button>
                </div>
              </div>
            </article>
          </div>

          <button
            v-if="seriesState.hasMore && !seriesState.loading"
            type="button"
            class="load-more"
            :disabled="seriesState.loadingMore"
            @click="loadSeries(true)"
          >
            <Loader2 v-if="seriesState.loadingMore" class="h-4 w-4 animate-spin" aria-hidden="true" />
            {{ seriesState.loadingMore ? '加载中' : '加载更多合集' }}
          </button>
        </section>
      </section>

      <section
        v-else-if="activeTab === 'activities'"
        id="collaboration-panel-activities"
        class="workspace-layout"
        role="tabpanel"
        aria-labelledby="collaboration-tab-activities"
        data-community-public-section="activities"
        :data-public-section-state="collectionDisplayState(activityState)"
      >
        <aside class="workspace-panel workspace-form-panel">
          <div class="panel-heading">
            <span class="panel-icon"><Upload class="h-4 w-4" aria-hidden="true" /></span>
            <div>
              <h2>提交活动内容</h2>
              <p>将本人已公开内容提交到开放中的共创活动。</p>
            </div>
          </div>

          <div v-if="!authStore.isLoggedIn" class="login-notice">
            <LogIn class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>登录后可参与共创活动投稿。</span>
            <button type="button" @click="goToLogin">登录</button>
          </div>

          <form class="workspace-form" @submit.prevent="submitActivityPost">
            <label class="field-group">
              <span>目标活动</span>
              <select v-model="activitySubmission.activityId" class="workspace-input" required>
                <option value="">选择开放中的活动</option>
                <option v-for="activity in eligibleActivities" :key="activity.id" :value="String(activity.id)">
                  {{ activity.title }}
                </option>
              </select>
            </label>

            <label class="field-group">
              <span>公开帖子 ID</span>
              <input
                ref="activityPostInput"
                v-model.trim="activitySubmission.postId"
                class="workspace-input"
                type="text"
                inputmode="numeric"
                placeholder="输入本人公开帖子 ID"
                required
              />
            </label>

            <label class="field-group">
              <span>投稿说明</span>
              <textarea
                v-model.trim="activitySubmission.note"
                class="workspace-textarea workspace-textarea-compact"
                rows="4"
                maxlength="1000"
                placeholder="说明内容与活动目标的关系。"
              />
            </label>

            <label v-if="selectedActivity && isHighRiskDomain(selectedActivity.domain)" class="risk-confirmation">
              <input v-model="activitySubmission.riskAcknowledged" type="checkbox" />
              <span>我已阅读该领域的风险提示，并确认投稿内容边界清晰。</span>
            </label>

            <button type="submit" class="primary-action w-full" :disabled="submittingActivity">
              <Loader2 v-if="submittingActivity" class="h-4 w-4 animate-spin" aria-hidden="true" />
              <Upload v-else class="h-4 w-4" aria-hidden="true" />
              {{ submittingActivity ? '正在提交' : '提交到活动' }}
            </button>
          </form>
        </aside>

        <section class="workspace-panel workspace-list-panel">
          <div class="list-toolbar">
            <div>
              <h2>共创活动</h2>
              <p>已加载 {{ activityState.items.length }} 条</p>
            </div>
            <div class="toolbar-controls">
              <select v-model.number="activityFilters.domain" class="toolbar-select" aria-label="按领域筛选活动" @change="changeActivityFilters">
                <option value="">全部领域</option>
                <option v-for="domain in localDomainConfigs" :key="domain.domain" :value="domain.domain">
                  {{ domain.domainName }}
                </option>
              </select>
              <select v-model="activityFilters.status" class="toolbar-select" aria-label="按状态筛选活动" @change="changeActivityFilters">
                <option value="">全部状态</option>
                <option v-for="item in activityStatusOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </option>
              </select>
              <button
                type="button"
                class="icon-action"
                title="刷新活动"
                aria-label="刷新活动"
                :disabled="activityState.loading"
                @click="loadActivities()"
              >
                <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': activityState.loading }" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div v-if="activityState.loading" class="state-stack" aria-label="活动加载中">
            <div v-for="index in 4" :key="index" class="skeleton-row">
              <span class="skeleton-line skeleton-line-short" />
              <span class="skeleton-line" />
              <span class="skeleton-line skeleton-line-medium" />
            </div>
          </div>

          <div v-else-if="activityState.error" class="state-message state-message-error" role="alert">
            <AlertCircle class="h-5 w-5" aria-hidden="true" />
            <div>
              <strong>活动加载失败</strong>
              <p>{{ activityState.error }}</p>
            </div>
            <button type="button" @click="loadActivities()">重试</button>
          </div>

          <div v-else-if="!activityState.items.length" class="state-message">
            <Inbox class="h-6 w-6" aria-hidden="true" />
            <div>
              <strong>当前筛选下暂无活动</strong>
              <p>调整领域或状态后再查看。</p>
            </div>
          </div>

          <div v-else class="collaboration-list">
            <article
              v-for="activity in activityState.items"
              :id="`collaboration-activity-${activity.id}`"
              :key="activity.id"
              class="collaboration-row"
              :data-linked-activity="String(activity.id) === linkedActivityId ? 'true' : undefined"
            >
              <div class="row-heading">
                <div class="row-title">
                  <div class="badge-line">
                    <span class="status-badge" :data-status="activity.status">{{ activityStatusLabel(activity.status) }}</span>
                    <span class="meta-badge">{{ domainLabel(activity.domain) }}</span>
                    <span class="meta-badge">{{ activityTypeLabel(activity.activityType) }}</span>
                  </div>
                  <h3>{{ activity.title }}</h3>
                </div>
                <time :datetime="activity.updateTime">{{ formatDate(activity.updateTime) }}</time>
              </div>

              <p class="row-description">{{ activity.description }}</p>
              <p v-if="activity.submissionRule" class="row-detail">
                <strong>投稿规则：</strong>{{ activity.submissionRule }}
              </p>
              <p v-if="activity.resultSummary" class="row-summary">
                <strong>活动总结</strong>
                <span>{{ activity.resultSummary }}</span>
              </p>

              <div class="row-footer">
                <div class="row-meta">
                  <span><FileText class="h-3.5 w-3.5" aria-hidden="true" />{{ activity.submissionCount }} 份投稿</span>
                  <span v-if="activity.endsAt"><CalendarClock class="h-3.5 w-3.5" aria-hidden="true" />截至 {{ formatDate(activity.endsAt) }}</span>
                </div>
                <div class="row-actions">
                  <RouterLink
                    :to="collaborationResourcePath('activity', activity.id) || collaborationHubLocation('activities')"
                    class="row-action"
                  >
                    <ArrowRight class="h-4 w-4" aria-hidden="true" />
                    查看详情
                  </RouterLink>
                  <button
                    type="button"
                    class="row-action row-action-primary"
                    :disabled="activity.status !== 'OPEN'"
                    @click="focusActivitySubmission(activity)"
                  >
                    <Upload class="h-4 w-4" aria-hidden="true" />
                    选择投稿
                  </button>
                </div>
              </div>
            </article>
          </div>

          <button
            v-if="activityState.hasMore && !activityState.loading"
            type="button"
            class="load-more"
            :disabled="activityState.loadingMore"
            @click="loadActivities(true)"
          >
            <Loader2 v-if="activityState.loadingMore" class="h-4 w-4 animate-spin" aria-hidden="true" />
            {{ activityState.loadingMore ? '加载中' : '加载更多活动' }}
          </button>
        </section>
      </section>

      <section
        v-else-if="activeTab === 'curation'"
        id="collaboration-panel-curation"
        class="workspace-layout"
        role="tabpanel"
        aria-labelledby="collaboration-tab-curation"
        data-community-participation-section="curation"
        :data-participation-section-state="collectionDisplayState(curationState)"
      >
        <aside class="workspace-panel workspace-form-panel">
          <div class="panel-heading">
            <span class="panel-icon"><ListPlus class="h-4 w-4" aria-hidden="true" /></span>
            <div>
              <h2>提交策展建议</h2>
              <p>推荐公开内容进入匹配的公开频道或话题。</p>
            </div>
          </div>

          <div v-if="!authStore.isLoggedIn" class="login-notice">
            <LogIn class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>登录后可提交并查看自己的策展建议。</span>
            <button type="button" @click="goToLogin">登录</button>
          </div>

          <form class="workspace-form" @submit.prevent="submitCuration">
            <div class="field-grid">
              <label class="field-group">
                <span>话题 ID</span>
                <input
                  v-model.trim="curationForm.topicId"
                  class="workspace-input"
                  type="text"
                  inputmode="numeric"
                  placeholder="目标公开话题 ID"
                  required
                />
              </label>
              <label class="field-group">
                <span>帖子 ID</span>
                <input
                  v-model.trim="curationForm.postId"
                  class="workspace-input"
                  type="text"
                  inputmode="numeric"
                  placeholder="推荐的公开帖子 ID"
                  required
                />
              </label>
            </div>

            <label class="field-group">
              <span>建议类型</span>
              <select v-model="curationForm.suggestionType" class="workspace-input">
                <option v-for="item in curationTypeOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </option>
              </select>
            </label>

            <label class="field-group">
              <span>推荐理由</span>
              <textarea
                v-model.trim="curationForm.rationale"
                class="workspace-textarea"
                rows="5"
                maxlength="1000"
                placeholder="说明内容质量、匹配关系与公开价值。"
                required
              />
            </label>

            <label class="risk-confirmation">
              <input v-model="curationForm.riskAcknowledged" type="checkbox" />
              <span>若内容属于高风险领域，我已阅读并确认相关提示。</span>
            </label>

            <button type="submit" class="primary-action w-full" :disabled="submittingCuration">
              <Loader2 v-if="submittingCuration" class="h-4 w-4 animate-spin" aria-hidden="true" />
              <ListPlus v-else class="h-4 w-4" aria-hidden="true" />
              {{ submittingCuration ? '正在提交' : '提交策展建议' }}
            </button>
          </form>
        </aside>

        <section class="workspace-panel workspace-list-panel">
          <div class="list-toolbar">
            <div>
              <h2>我的策展建议</h2>
              <p>已加载 {{ curationState.items.length }} 条</p>
            </div>
            <div class="toolbar-controls">
              <select v-model="curationFilters.status" class="toolbar-select" aria-label="按状态筛选策展建议" @change="changeCurationFilters">
                <option value="">全部状态</option>
                <option value="PENDING">待审核</option>
                <option value="APPROVED">已采纳</option>
                <option value="REJECTED">未采纳</option>
              </select>
              <button
                type="button"
                class="icon-action"
                title="刷新策展建议"
                aria-label="刷新策展建议"
                :disabled="curationState.loading || !authStore.isLoggedIn"
                @click="loadCuration()"
              >
                <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': curationState.loading }" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div v-if="!authStore.isLoggedIn" class="state-message">
            <LogIn class="h-6 w-6" aria-hidden="true" />
            <div>
              <strong>登录后查看提交记录</strong>
              <p>审核状态与处理说明仅对提交者本人可见。</p>
            </div>
            <button type="button" @click="goToLogin">登录</button>
          </div>

          <div v-else-if="curationState.loading" class="state-stack" aria-label="策展建议加载中">
            <div v-for="index in 4" :key="index" class="skeleton-row">
              <span class="skeleton-line skeleton-line-short" />
              <span class="skeleton-line" />
              <span class="skeleton-line skeleton-line-medium" />
            </div>
          </div>

          <div v-else-if="curationState.error" class="state-message state-message-error" role="alert">
            <AlertCircle class="h-5 w-5" aria-hidden="true" />
            <div>
              <strong>策展建议加载失败</strong>
              <p>{{ curationState.error }}</p>
            </div>
            <button type="button" @click="loadCuration()">重试</button>
          </div>

          <div v-else-if="!curationState.items.length" class="state-message">
            <Inbox class="h-6 w-6" aria-hidden="true" />
            <div>
              <strong>暂无策展建议</strong>
              <p>提交后可在这里跟进审核状态。</p>
            </div>
          </div>

          <div v-else class="collaboration-list">
            <article v-for="suggestion in curationState.items" :key="suggestion.id" class="collaboration-row">
              <div class="row-heading">
                <div class="row-title">
                  <div class="badge-line">
                    <span class="status-badge" :data-status="suggestion.reviewStatus">
                      {{ reviewStatusLabel(suggestion.reviewStatus) }}
                    </span>
                    <span class="meta-badge">{{ curationTypeLabel(suggestion.suggestionType) }}</span>
                    <span class="meta-badge">{{ domainLabel(suggestion.domain) }}</span>
                  </div>
                  <h3>{{ suggestion.topicName || `话题 #${suggestion.topicId}` }}</h3>
                </div>
                <time :datetime="suggestion.updateTime">{{ formatDate(suggestion.updateTime) }}</time>
              </div>

              <p class="row-description">{{ suggestion.rationale }}</p>
              <div class="row-meta">
                <span><FileText class="h-3.5 w-3.5" aria-hidden="true" />帖子 #{{ suggestion.postId }}</span>
                <span><Hash class="h-3.5 w-3.5" aria-hidden="true" />话题 #{{ suggestion.topicId }}</span>
              </div>
              <p v-if="suggestion.reviewNote" class="row-detail">
                <strong>处理说明：</strong>{{ suggestion.reviewNote }}
              </p>
              <p v-if="suggestion.resultType" class="row-detail">
                <strong>策展结果：</strong>{{ suggestion.resultType }}
                <template v-if="suggestion.resultId"> #{{ suggestion.resultId }}</template>
                <template v-if="suggestion.resultStatus"> · {{ suggestion.resultStatus }}</template>
              </p>
            </article>
          </div>

          <button
            v-if="curationState.hasMore && !curationState.loading"
            type="button"
            class="load-more"
            :disabled="curationState.loadingMore"
            @click="loadCuration(true)"
          >
            <Loader2 v-if="curationState.loadingMore" class="h-4 w-4 animate-spin" aria-hidden="true" />
            {{ curationState.loadingMore ? '加载中' : '加载更多建议' }}
          </button>
        </section>
      </section>

      <section
        v-else-if="activeTab === 'discussions'"
        id="collaboration-panel-discussions"
        class="workspace-panel workspace-list-panel workspace-wide-panel"
        role="tabpanel"
        aria-labelledby="collaboration-tab-discussions"
        data-community-public-section="discussions"
        :data-public-section-state="collectionDisplayState(discussionState)"
      >
        <div class="list-toolbar">
          <div>
            <h2>结构化讨论</h2>
            <p>已加载 {{ discussionState.items.length }} 条</p>
          </div>
          <div class="toolbar-controls">
            <select v-model.number="discussionFilters.domain" class="toolbar-select" aria-label="按领域筛选讨论" @change="changeDiscussionFilters">
              <option value="">全部领域</option>
              <option v-for="domain in localDomainConfigs" :key="domain.domain" :value="domain.domain">
                {{ domain.domainName }}
              </option>
            </select>
            <select v-model="discussionFilters.status" class="toolbar-select" aria-label="按状态筛选讨论" @change="changeDiscussionFilters">
              <option value="">全部状态</option>
              <option value="OPEN">投票中</option>
              <option value="SUMMARIZED">已总结</option>
              <option value="CLOSED">已关闭</option>
            </select>
            <button
              type="button"
              class="icon-action"
              title="刷新讨论"
              aria-label="刷新讨论"
              :disabled="discussionState.loading"
              @click="loadDiscussions()"
            >
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': discussionState.loading }" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div v-if="discussionState.loading" class="state-stack" aria-label="讨论加载中">
          <div v-for="index in 4" :key="index" class="skeleton-row">
            <span class="skeleton-line skeleton-line-short" />
            <span class="skeleton-line" />
            <span class="skeleton-line skeleton-line-medium" />
          </div>
        </div>

        <div v-else-if="discussionState.error" class="state-message state-message-error" role="alert">
          <AlertCircle class="h-5 w-5" aria-hidden="true" />
          <div>
            <strong>讨论加载失败</strong>
            <p>{{ discussionState.error }}</p>
          </div>
          <button type="button" @click="loadDiscussions()">重试</button>
        </div>

        <div v-else-if="!discussionState.items.length" class="state-message">
          <Inbox class="h-6 w-6" aria-hidden="true" />
          <div>
            <strong>当前筛选下暂无讨论</strong>
            <p>调整领域或状态后再查看。</p>
          </div>
        </div>

        <div v-else class="discussion-list">
          <article
            v-for="discussion in discussionState.items"
            :id="`collaboration-discussion-${discussion.id}`"
            :key="discussion.id"
            class="discussion-row"
            :data-linked-discussion="String(discussion.id) === linkedDiscussionId ? 'true' : undefined"
          >
            <div class="row-heading">
              <div class="row-title">
                <div class="badge-line">
                  <span class="status-badge" :data-status="discussion.status">
                    {{ discussionStatusLabel(discussion.status) }}
                  </span>
                  <span class="meta-badge">{{ domainLabel(discussion.domain) }}</span>
                  <span class="meta-badge">来源帖子 #{{ discussion.sourcePostId }}</span>
                </div>
                <h3>{{ discussion.title }}</h3>
              </div>
              <time :datetime="discussion.updateTime">{{ formatDate(discussion.updateTime) }}</time>
            </div>

            <p class="row-description">{{ discussion.prompt }}</p>

            <label v-if="discussion.status === 'OPEN' && isHighRiskDomain(discussion.domain)" class="compact-risk discussion-risk">
              <input
                type="checkbox"
                :checked="Boolean(riskAcknowledgements[discussionRiskKey(discussion)])"
                @change="setRiskAcknowledgement(discussionRiskKey(discussion), $event)"
              />
              <span>我已阅读该领域风险提示</span>
            </label>

            <div class="vote-options" role="group" :aria-label="`${discussion.title}的投票选项`">
              <button
                v-for="option in discussion.options"
                :key="option.id"
                type="button"
                class="vote-option"
                :class="{ 'vote-option-selected': option.selected }"
                :aria-pressed="option.selected"
                :disabled="discussion.status !== 'OPEN' || discussionPendingIds.has(String(discussion.id))"
                @click="voteDiscussion(discussion, option.id)"
              >
                <span class="vote-indicator">
                  <Check v-if="option.selected" class="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span class="vote-text">{{ option.text }}</span>
                <span class="vote-count">{{ option.voteCount }} 票</span>
              </button>
            </div>

            <div class="row-meta discussion-meta">
              <span><ListChecks class="h-3.5 w-3.5" aria-hidden="true" />共 {{ discussion.voteCount }} 票</span>
              <span v-if="discussion.consensusState">
                <Scale class="h-3.5 w-3.5" aria-hidden="true" />{{ consensusLabel(discussion.consensusState) }}
              </span>
              <RouterLink
                :to="collaborationResourcePath('discussion', discussion.id) || collaborationHubLocation('discussions')"
                class="text-link"
              >
                查看详情
                <ArrowRight class="h-3.5 w-3.5" aria-hidden="true" />
              </RouterLink>
            </div>

            <div v-if="discussion.summary" class="discussion-summary">
              <strong>讨论总结</strong>
              <p>{{ discussion.summary }}</p>
              <p v-if="discussion.authorFollowUp"><strong>后续行动：</strong>{{ discussion.authorFollowUp }}</p>
            </div>
          </article>
        </div>

        <button
          v-if="discussionState.hasMore && !discussionState.loading"
          type="button"
          class="load-more"
          :disabled="discussionState.loadingMore"
          @click="loadDiscussions(true)"
        >
          <Loader2 v-if="discussionState.loadingMore" class="h-4 w-4 animate-spin" aria-hidden="true" />
          {{ discussionState.loadingMore ? '加载中' : '加载更多讨论' }}
        </button>
      </section>

      <section
        v-else-if="activeTab === 'office-hours'"
        id="collaboration-panel-office-hours"
        role="tabpanel"
        aria-labelledby="collaboration-tab-office-hours"
      >
        <div
          :data-linked-office-hour="linkedOfficeHourId || undefined"
        >
          <OfficeHoursWorkspace
            :focus-office-hour-id="linkedOfficeHourId"
            :focus-reservation-id="linkedOfficeHourReservationId"
          />
        </div>
      </section>

      <section
        v-else-if="activeTab === 'manage'"
        id="collaboration-panel-manage"
        role="tabpanel"
        aria-labelledby="collaboration-tab-manage"
      >
        <CollaborationManagementWorkspace />
      </section>

      <section
        v-else
        id="collaboration-panel-cases"
        role="tabpanel"
        aria-labelledby="collaboration-tab-cases"
      >
        <CollaborationCasesWorkspace />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import {
  AlertCircle,
  ArrowRight,
  Bell,
  BellOff,
  BellPlus,
  CalendarClock,
  CalendarDays,
  Check,
  FileCheck2,
  FileText,
  Hand,
  Hash,
  Inbox,
  Layers3,
  ListChecks,
  ListPlus,
  Loader2,
  LogIn,
  Plus,
  RefreshCw,
  Scale,
  Send,
  Settings2,
  ShieldAlert,
  Target,
  Upload,
  Users,
} from 'lucide-vue-next'
import AppHeader from '@/components/layout/AppHeader.vue'
import CollaborationCasesWorkspace from '@/components/collaboration/CollaborationCasesWorkspace.vue'
import CollaborationManagementWorkspace from '@/components/collaboration/CollaborationManagementWorkspace.vue'
import MyCollaborationsWorkspace from '@/components/collaboration/MyCollaborationsWorkspace.vue'
import NeedDiscoveryFilters from '@/components/collaboration/NeedDiscoveryFilters.vue'
import OfficeHoursWorkspace from '@/components/collaboration/OfficeHoursWorkspace.vue'
import { getErrorMessage } from '@/api/client'
import { localDomainConfigs } from '@/api/domains'
import {
  collaborationApi,
  type CollaborationActivity,
  type CollaborationActivityStatus,
  type CollaborationActivityType,
  type CollaborationNeed,
  type NeedDiscoveryItem,
  type CollaborationSeries,
  type CurationSuggestion,
  type CurationSuggestionType,
  type DiscussionConsensusState,
  type NeedContentFormat,
  type NeedSourceType,
  type NeedStatus,
  type PageResult,
  type SeriesMemberRole,
  type StructuredDiscussion,
  type SubmissionReviewStatus,
} from '@/api/collaboration'
import type { ApiId } from '@/api/types'
import { useCollaborationHubQuery } from '@/composables/useCollaborationHubQuery'
import { useCollaborationDiscoveryQuery } from '@/composables/useCollaborationDiscoveryQuery'
import { useAuthStore } from '@/stores/auth'
import { isKnownDomain } from '@/utils/domains'
import {
  collaborationHubLocation,
  collaborationResourcePath,
  type CollaborationHubSort,
} from '@/utils/collaborationRoutes'
import { labelNeedMatchReason } from '@/utils/collaborationNeedPresentation'

type TabKey = 'needs'
  | 'my-collaborations'
  | 'series'
  | 'activities'
  | 'curation'
  | 'discussions'
  | 'office-hours'
  | 'manage'
  | 'cases'

interface CollectionState<T> {
  items: T[]
  loading: boolean
  loadingMore: boolean
  error: string
  nextCursor: string
  hasMore: boolean
  initialized: boolean
  total: number | null
  requestId: number
}

interface NeedFormState {
  domain: number
  sourceType: NeedSourceType
  sourceRefId: string
  contentFormat: NeedContentFormat
  title: string
  description: string
  acceptanceCriteria: string
  riskAcknowledged: boolean
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const {
  queryState: hubQueryState,
  replaceQuery: replaceHubQuery,
} = useCollaborationHubQuery()

const tabs = [
  { key: 'needs', label: '需求', icon: Target },
  { key: 'my-collaborations', label: '我的共建', icon: Hand },
  { key: 'series', label: '协作合集', icon: Layers3 },
  { key: 'activities', label: '共创活动', icon: CalendarDays },
  { key: 'curation', label: '频道策展', icon: ListPlus },
  { key: 'discussions', label: '结构化讨论', icon: Scale },
  { key: 'office-hours', label: '经验交流', icon: CalendarClock },
  { key: 'manage', label: '我的管理', icon: Settings2 },
  { key: 'cases', label: '举报申诉', icon: ShieldAlert },
] as const

const activeTab = ref<TabKey>(hubQueryState.tab)
const hubSort = ref<CollaborationHubSort | ''>(hubQueryState.sort)
const discoveryQuery = useCollaborationDiscoveryQuery({
  enabled: computed(() => activeTab.value === 'needs'),
})
const needFilters = discoveryQuery.filters
const linkedNeedId = computed(() => hubQueryState.needId)
const linkedSeriesId = computed(() => hubQueryState.seriesId)
const linkedActivityId = computed(() => hubQueryState.activityId)
const linkedDiscussionId = computed(() => hubQueryState.discussionId)
const linkedOfficeHourId = computed(() => hubQueryState.officeHourId)
const linkedOfficeHourReservationId = computed(() => hubQueryState.reservationId)
const COLLECTION_RETENTION_LIMIT = 300

const createCollectionState = <T,>(): CollectionState<T> => ({
  items: [],
  loading: false,
  loadingMore: false,
  error: '',
  nextCursor: '',
  hasMore: false,
  initialized: false,
  total: null,
  requestId: 0,
})

const needState = {
  get items(): NeedDiscoveryItem[] {
    return discoveryQuery.items.value
  },
  get loading() {
    return discoveryQuery.loading.value
  },
  get loadingMore() {
    return discoveryQuery.loadingMore.value
  },
  get error() {
    return discoveryQuery.initialError.value
  },
  get nextCursor() {
    return discoveryQuery.nextCursor.value
  },
  get hasMore() {
    return discoveryQuery.hasMore.value
  },
  get initialized() {
    return discoveryQuery.initialized.value
  },
}
const seriesState = reactive(createCollectionState<CollaborationSeries>())
const activityState = reactive(createCollectionState<CollaborationActivity>())
const curationState = reactive(createCollectionState<CurationSuggestion>())
const discussionState = reactive(createCollectionState<StructuredDiscussion>())

const seriesFilters = reactive<{ domain: number | ''; status: 'OPEN' | 'CLOSED' | '' }>({
  domain: '',
  status: 'OPEN',
})
const activityFilters = reactive<{ domain: number | ''; status: CollaborationActivityStatus | '' }>({
  domain: '',
  status: 'OPEN',
})
const curationFilters = reactive<{ status: SubmissionReviewStatus | '' }>({
  status: '',
})
const discussionFilters = reactive<{ domain: number | ''; status: 'OPEN' | 'SUMMARIZED' | 'CLOSED' | '' }>({
  domain: '',
  status: 'OPEN',
})

const createNeedForm = (): NeedFormState => ({
  domain: 0,
  sourceType: 'COMMUNITY',
  sourceRefId: '',
  contentFormat: 'ARTICLE',
  title: '',
  description: '',
  acceptanceCriteria: '',
  riskAcknowledged: false,
})

const needForm = reactive(createNeedForm())
const seriesSubmission = reactive({
  seriesId: '',
  postId: '',
  note: '',
  riskAcknowledged: false,
})
const activitySubmission = reactive({
  activityId: '',
  postId: '',
  note: '',
  riskAcknowledged: false,
})
const curationForm = reactive<{
  topicId: string
  postId: string
  suggestionType: CurationSuggestionType
  rationale: string
  riskAcknowledged: boolean
}>({
  topicId: '',
  postId: '',
  suggestionType: 'CONTENT',
  rationale: '',
  riskAcknowledged: false,
})

const creatingNeed = ref(false)
const submittingSeries = ref(false)
const submittingActivity = ref(false)
const submittingCuration = ref(false)
const needPendingIds = ref(new Set<string>())
const discussionPendingIds = ref(new Set<string>())
const riskAcknowledgements = reactive<Record<string, boolean>>({})
const seriesPostInput = ref<HTMLInputElement | null>(null)
const activityPostInput = ref<HTMLInputElement | null>(null)
const myCollaborationsRef = ref<{ refresh: () => Promise<void> | void } | null>(null)

const needSourceOptions: Array<{ value: NeedSourceType; label: string }> = [
  { value: 'COMMUNITY', label: '社区观察' },
  { value: 'POST', label: '公开帖子' },
  { value: 'TOPIC', label: '公开话题' },
  { value: 'ACTIVITY', label: '共创活动' },
  { value: 'EXTERNAL', label: '外部线索' },
]

const needFormatOptions: Array<{ value: NeedContentFormat; label: string }> = [
  { value: 'ARTICLE', label: '文章' },
  { value: 'QUESTION', label: '问题' },
  { value: 'GUIDE', label: '指南' },
  { value: 'CHECKLIST', label: '清单' },
  { value: 'RESOURCE', label: '资源' },
]

const needStatusOptions: Array<{ value: NeedStatus; label: string }> = [
  { value: 'OPEN', label: '待认领' },
  { value: 'CLAIMED', label: '已认领' },
  { value: 'SUBMITTED', label: '待验收' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CLOSED', label: '已关闭' },
  { value: 'MERGED', label: '已合并' },
]

const activityStatusOptions: Array<{ value: CollaborationActivityStatus; label: string }> = [
  { value: 'OPEN', label: '开放投稿' },
  { value: 'REVIEWING', label: '评审中' },
  { value: 'SUMMARIZED', label: '已总结' },
  { value: 'ARCHIVED', label: '已归档' },
]

const curationTypeOptions: Array<{ value: CurationSuggestionType; label: string }> = [
  { value: 'CONTENT', label: '优质内容' },
  { value: 'TOPIC', label: '话题匹配' },
  { value: 'RESOURCE', label: '资源补充' },
  { value: 'FRESHNESS', label: '时效更新' },
  { value: 'QUESTION', label: '问题线索' },
]

const currentTabLoading = computed(() => {
  if (activeTab.value === 'needs') return needState.loading
  if (activeTab.value === 'series') return seriesState.loading
  if (activeTab.value === 'activities') return activityState.loading
  if (activeTab.value === 'curation') return curationState.loading
  if (activeTab.value === 'discussions') return discussionState.loading
  return false
})
const collectionDisplayState = (state: { items: unknown[]; loading: boolean; error: string }) => {
  if (state.loading && state.items.length === 0) return 'loading'
  if (state.error && state.items.length === 0) return 'error'
  return state.items.length ? 'ready' : 'empty'
}
const isPublicBrowseTab = computed(() => (
  ['needs', 'series', 'activities', 'curation', 'discussions'] as TabKey[]
).includes(activeTab.value))
const showGlobalSort = computed(() => isPublicBrowseTab.value && activeTab.value !== 'needs')

const eligibleSeries = computed(() => (
  seriesState.items.filter((series) => series.status === 'OPEN' && Boolean(series.currentUserRole))
))
const selectedSeries = computed(() => (
  seriesState.items.find((series) => String(series.id) === seriesSubmission.seriesId) || null
))
const eligibleActivities = computed(() => (
  activityState.items.filter((activity) => activity.status === 'OPEN')
))
const selectedActivity = computed(() => (
  activityState.items.find((activity) => String(activity.id) === activitySubmission.activityId) || null
))

const needStatusLabels: Record<NeedStatus, string> = {
  OPEN: '待认领',
  CLAIMED: '已认领',
  SUBMITTED: '待验收',
  COMPLETED: '已完成',
  CLOSED: '已关闭',
  MERGED: '已合并',
}

const seriesStatusLabels: Record<CollaborationSeries['status'], string> = {
  OPEN: '开放中',
  CLOSED: '已关闭',
}

const activityStatusLabels: Record<CollaborationActivityStatus, string> = {
  DRAFT: '草稿',
  OPEN: '开放投稿',
  REVIEWING: '评审中',
  SUMMARIZED: '已总结',
  ARCHIVED: '已归档',
}

const activityTypeLabels: Record<CollaborationActivityType, string> = {
  OPEN_CALL: '公开征集',
  SPRINT: '协作冲刺',
  CHALLENGE: '主题挑战',
  RESEARCH: '共同研究',
  CURATION: '联合策展',
}

const reviewStatusLabels: Record<SubmissionReviewStatus, string> = {
  PENDING: '待审核',
  APPROVED: '已采纳',
  REJECTED: '未采纳',
}

const curationTypeLabels: Record<CurationSuggestionType, string> = {
  CONTENT: '优质内容',
  TOPIC: '话题匹配',
  RESOURCE: '资源补充',
  FRESHNESS: '时效更新',
  QUESTION: '问题线索',
}

const discussionStatusLabels: Record<StructuredDiscussion['status'], string> = {
  OPEN: '投票中',
  SUMMARIZED: '已总结',
  CLOSED: '已关闭',
}

const consensusLabels: Record<DiscussionConsensusState, string> = {
  REACHED: '已形成共识',
  PARTIAL: '形成部分共识',
  NOT_REACHED: '暂未形成共识',
}

const seriesRoleLabels: Record<SeriesMemberRole, string> = {
  OWNER: '负责人',
  EDITOR: '编辑',
  CONTRIBUTOR: '贡献者',
}

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const pageItems = <T,>(page: PageResult<T> | null | undefined) => page?.items || []
const optionalDomain = (value: number | '') => value === '' ? undefined : Number(value)
const isPositiveId = (value: string) => /^[1-9]\d*$/.test(value.trim())
const cleanOptional = (value: string) => value.trim() || undefined
const currentUid = () => String(authStore.user?.uid ?? '')

const applyPage = <T extends { id: ApiId }>(
  state: CollectionState<T>,
  page: PageResult<T> | null | undefined,
  append: boolean,
) => {
  const items = pageItems(page)
  const merged = append ? [...state.items, ...items] : items
  const unique = new Map(merged.map((item) => [String(item.id), item]))
  const retained = Array.from(unique.values()).slice(0, COLLECTION_RETENTION_LIMIT)
  const nextCursor = page?.nextCursor ? String(page.nextCursor) : ''
  const cursorStalled = append && Boolean(nextCursor) && nextCursor === state.nextCursor
  state.items = retained
  state.nextCursor = retained.length >= COLLECTION_RETENTION_LIMIT || cursorStalled ? '' : nextCursor
  state.hasMore = retained.length < COLLECTION_RETENTION_LIMIT
    && !cursorStalled
    && Boolean(page?.hasMore && nextCursor)
  const total = page?.total == null ? null : Number(page.total)
  state.total = total !== null && Number.isFinite(total) ? total : null
}

const beginCollectionLoad = <T,>(state: CollectionState<T>, append: boolean) => {
  const requestId = ++state.requestId
  if (append) state.loadingMore = true
  else state.loading = true
  state.error = ''
  return {
    isCurrent: () => state.requestId === requestId,
    finish: () => {
      if (state.requestId === requestId) {
        state.loading = false
        state.loadingMore = false
      }
    },
  }
}

const replaceItem = <T extends { id: ApiId }>(items: T[], updated: T) => (
  items.map((item) => String(item.id) === String(updated.id) ? updated : item)
)

const setPending = (target: typeof needPendingIds, id: ApiId, pending: boolean) => {
  const next = new Set(target.value)
  if (pending) next.add(String(id))
  else next.delete(String(id))
  target.value = next
}

const domainLabel = (domain: number) => (
  localDomainConfigs.find((item) => Number(item.domain) === Number(domain))?.domainName || `领域 ${domain}`
)

const isHighRiskDomain = (domain?: number | null) => (
  localDomainConfigs.find((item) => Number(item.domain) === Number(domain))?.riskLevel === 'HIGH'
)

const needStatusLabel = (status: NeedStatus) => needStatusLabels[status] || status
const needFormatLabel = (format: NeedContentFormat) => (
  needFormatOptions.find((item) => item.value === format)?.label || format
)
const seriesStatusLabel = (status: CollaborationSeries['status']) => seriesStatusLabels[status] || status
const activityStatusLabel = (status: CollaborationActivityStatus) => activityStatusLabels[status] || status
const activityTypeLabel = (type: CollaborationActivityType) => activityTypeLabels[type] || type
const reviewStatusLabel = (status: SubmissionReviewStatus) => reviewStatusLabels[status] || status
const curationTypeLabel = (type: CurationSuggestionType) => curationTypeLabels[type] || type
const discussionStatusLabel = (status: StructuredDiscussion['status']) => discussionStatusLabels[status] || status
const consensusLabel = (state: DiscussionConsensusState) => consensusLabels[state] || state
const seriesRoleLabel = (role?: SeriesMemberRole | null) => role ? seriesRoleLabels[role] : '非成员'

const formatDate = (value?: string | null) => {
  if (!value) return '时间待定'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

const goToLogin = () => router.push({
  path: '/login',
  query: { redirect: route.fullPath },
})

const ensureLoggedIn = async () => {
  if (authStore.isLoggedIn) return true
  toast.info('登录后可参与公共共建')
  await goToLogin()
  return false
}

const selectTab = async (tab: TabKey) => {
  if (tab === 'my-collaborations' && !await ensureLoggedIn()) return
  const targetFilter: { domain: number | ''; status: string } = tab === 'needs'
    ? { domain: needFilters.domain, status: needFilters.status }
    : tab === 'series'
      ? { domain: seriesFilters.domain, status: seriesFilters.status }
      : tab === 'activities'
        ? { domain: activityFilters.domain, status: activityFilters.status }
        : tab === 'discussions'
          ? { domain: discussionFilters.domain, status: discussionFilters.status }
          : tab === 'curation'
            ? { domain: '', status: curationFilters.status }
            : { domain: '', status: '' }
  await replaceHubQuery({
    tab,
    domain: targetFilter.domain,
    status: tab === 'my-collaborations' ? '' : targetFilter.status || 'ALL',
    sort: tab === 'needs'
      ? discoveryQuery.filters.sort
      : (hubSort.value === 'latest' || hubSort.value === 'updated' ? hubSort.value : ''),
    needId: '',
    seriesId: '',
    activityId: '',
    discussionId: '',
    officeHourId: '',
    reservationId: '',
  })
}

const changeSort = async () => {
  if (activeTab.value === 'needs') return
  await replaceHubQuery({ sort: hubSort.value })
}

const changeNeedFilters = async () => {
  discoveryQuery.setFilters({
    domain: needFilters.domain,
    status: needFilters.status,
  })
}

const setNeedDiscoveryFilters = (
  next: Parameters<typeof discoveryQuery.setFilters>[0],
) => {
  discoveryQuery.setFilters(next)
}

const resetNeedDiscoveryFilters = () => {
  discoveryQuery.resetFilters()
}

const submitNeedDiscoveryFilters = () => {
  void discoveryQuery.refresh()
}

const changeSeriesFilters = async () => {
  await replaceHubQuery({
    tab: 'series',
    domain: seriesFilters.domain,
    status: seriesFilters.status || 'ALL',
    seriesId: linkedSeriesId.value,
  })
}

const changeActivityFilters = async () => {
  await replaceHubQuery({
    tab: 'activities',
    domain: activityFilters.domain,
    status: activityFilters.status || 'ALL',
    activityId: linkedActivityId.value,
  })
}

const changeDiscussionFilters = async () => {
  await replaceHubQuery({
    tab: 'discussions',
    domain: discussionFilters.domain,
    status: discussionFilters.status || 'ALL',
    discussionId: linkedDiscussionId.value,
  })
}

const changeCurationFilters = async () => {
  await replaceHubQuery({
    tab: 'curation',
    domain: '',
    status: curationFilters.status || 'ALL',
  })
}

const setRiskAcknowledgement = (key: string, event: Event) => {
  riskAcknowledgements[key] = Boolean((event.target as HTMLInputElement | null)?.checked)
}

const needRiskKey = (need: { id: ApiId }) => `need:${need.id}`
const discussionRiskKey = (discussion: StructuredDiscussion) => `discussion:${discussion.id}`

const loadNeeds = async (append = false) => {
  if (append) return discoveryQuery.loadMore()
  return discoveryQuery.refresh()
}

const loadSeries = async (append = false) => {
  if (append && (!seriesState.hasMore || seriesState.loadingMore)) return
  const request = beginCollectionLoad(seriesState, append)
  try {
    const linkedId = append ? '' : linkedSeriesId.value
    const [res, linkedRes] = await Promise.all([
      collaborationApi.series.list({
        domain: optionalDomain(seriesFilters.domain),
        status: seriesFilters.status || undefined,
        cursor: append ? seriesState.nextCursor || 0 : 0,
        size: 20,
      }),
      linkedId
        ? collaborationApi.series.detail(linkedId).catch(() => null)
        : Promise.resolve(null),
    ])
    if (!request.isCurrent()) return
    applyPage(seriesState, res.data, append)
    if (linkedRes?.data) {
      seriesState.items = [
        linkedRes.data,
        ...seriesState.items.filter((item) => String(item.id) !== linkedId),
      ]
    }
    if (seriesSubmission.seriesId && !eligibleSeries.value.some((item) => String(item.id) === seriesSubmission.seriesId)) {
      seriesSubmission.seriesId = ''
    }
    if (linkedId) {
      await nextTick()
      document.getElementById(`collaboration-series-${linkedId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  } catch (error) {
    if (request.isCurrent()) {
      seriesState.error = getErrorMessage(error, '合集列表加载失败')
      if (append) toast.error(seriesState.error)
    }
  } finally {
    request.finish()
    seriesState.initialized = true
  }
}

const loadActivities = async (append = false) => {
  if (append && (!activityState.hasMore || activityState.loadingMore)) return
  const request = beginCollectionLoad(activityState, append)
  try {
    const res = await collaborationApi.activities.list({
      domain: optionalDomain(activityFilters.domain),
      status: activityFilters.status || undefined,
      cursor: append ? activityState.nextCursor || 0 : 0,
      size: 20,
    })
    if (!request.isCurrent()) return
    applyPage(activityState, res.data, append)
    if (activitySubmission.activityId && !eligibleActivities.value.some((item) => String(item.id) === activitySubmission.activityId)) {
      activitySubmission.activityId = ''
    }
  } catch (error) {
    if (request.isCurrent()) {
      activityState.error = getErrorMessage(error, '活动列表加载失败')
      if (append) toast.error(activityState.error)
    }
  } finally {
    request.finish()
    activityState.initialized = true
  }
}

const loadCuration = async (append = false) => {
  if (!authStore.isLoggedIn) {
    curationState.items = []
    curationState.error = ''
    curationState.hasMore = false
    curationState.initialized = true
    return
  }
  if (append && (!curationState.hasMore || curationState.loadingMore)) return
  const request = beginCollectionLoad(curationState, append)
  try {
    const res = await collaborationApi.curation.mine({
      status: curationFilters.status || undefined,
      cursor: append ? curationState.nextCursor || 0 : 0,
      size: 20,
    })
    if (!request.isCurrent()) return
    applyPage(curationState, res.data, append)
  } catch (error) {
    if (request.isCurrent()) {
      curationState.error = getErrorMessage(error, '策展建议加载失败')
      if (append) toast.error(curationState.error)
    }
  } finally {
    request.finish()
    curationState.initialized = true
  }
}

const loadDiscussions = async (append = false) => {
  if (append && (!discussionState.hasMore || discussionState.loadingMore)) return
  const request = beginCollectionLoad(discussionState, append)
  try {
    const res = await collaborationApi.discussions.list({
      domain: optionalDomain(discussionFilters.domain),
      status: discussionFilters.status || undefined,
      cursor: append ? discussionState.nextCursor || 0 : 0,
      size: 20,
    })
    if (!request.isCurrent()) return
    applyPage(discussionState, res.data, append)
  } catch (error) {
    if (request.isCurrent()) {
      discussionState.error = getErrorMessage(error, '结构化讨论加载失败')
      if (append) toast.error(discussionState.error)
    }
  } finally {
    request.finish()
    discussionState.initialized = true
  }
}

const refreshCurrentTab = () => {
  if (activeTab.value === 'needs') return loadNeeds()
  if (activeTab.value === 'my-collaborations') return myCollaborationsRef.value?.refresh()
  if (activeTab.value === 'series') return loadSeries()
  if (activeTab.value === 'activities') return loadActivities()
  if (activeTab.value === 'curation') return loadCuration()
  if (activeTab.value === 'discussions') return loadDiscussions()
  return undefined
}

const createNeed = async () => {
  if (!await ensureLoggedIn()) return
  if (!isKnownDomain(needForm.domain)) {
    toast.warning('请选择频道')
    return
  }
  if (!needForm.title.trim() || !needForm.description.trim()) {
    toast.warning('请填写需求标题与说明')
    return
  }
  if (needForm.sourceRefId && !isPositiveId(needForm.sourceRefId)) {
    toast.warning('来源资源 ID 必须为正整数')
    return
  }
  if (isHighRiskDomain(needForm.domain) && !needForm.riskAcknowledged) {
    toast.warning('请先确认该领域的风险提示')
    return
  }

  creatingNeed.value = true
  try {
    await collaborationApi.needs.create({
      domain: needForm.domain,
      sourceType: needForm.sourceType,
      sourceRefId: cleanOptional(needForm.sourceRefId),
      contentFormat: needForm.contentFormat,
      title: needForm.title.trim(),
      description: needForm.description.trim(),
      acceptanceCriteria: cleanOptional(needForm.acceptanceCriteria),
      riskAcknowledged: needForm.riskAcknowledged,
    })
    toast.success('内容需求已发布')
    Object.assign(needForm, createNeedForm())
    needFilters.status = ''
    await loadNeeds()
  } catch (error) {
    toast.error(getErrorMessage(error, '内容需求发布失败'))
  } finally {
    creatingNeed.value = false
  }
}

const canClaimNeed = (need: CollaborationNeed | NeedDiscoveryItem) => (
  need.status === 'OPEN'
  && !need.claimedByUid
  && (!currentUid() || String(need.creatorUid) !== currentUid())
)

const toggleNeedFollow = async (need: CollaborationNeed | NeedDiscoveryItem) => {
  if (!await ensureLoggedIn()) return
  if (needPendingIds.value.has(String(need.id))) return
  setPending(needPendingIds, need.id, true)
  try {
    const res = need.followed
      ? await collaborationApi.needs.unfollow(need.id)
      : await collaborationApi.needs.follow(need.id)
    if (res.data) void discoveryQuery.refresh()
    toast.success(need.followed ? '已取消关注需求' : '已关注需求')
  } catch (error) {
    toast.error(getErrorMessage(error, '需求关注操作失败'))
  } finally {
    setPending(needPendingIds, need.id, false)
  }
}

const claimNeed = async (need: CollaborationNeed | NeedDiscoveryItem) => {
  if (!await ensureLoggedIn()) return
  if (needPendingIds.value.has(String(need.id))) return
  const riskAcknowledged = Boolean(riskAcknowledgements[needRiskKey(need)])
  if (isHighRiskDomain(need.domain) && !riskAcknowledged) {
    toast.warning('请先确认该领域的风险提示')
    return
  }
  setPending(needPendingIds, need.id, true)
  try {
    const res = await collaborationApi.needs.claim(need.id, { riskAcknowledged })
    if (res.data) void discoveryQuery.refresh()
    toast.success('需求已认领')
  } catch (error) {
    toast.error(getErrorMessage(error, '需求认领失败'))
  } finally {
    setPending(needPendingIds, need.id, false)
  }
}

const focusSeriesSubmission = async (series: CollaborationSeries) => {
  if (!series.currentUserRole) {
    toast.info('当前账号尚未加入该合集')
    return
  }
  seriesSubmission.seriesId = String(series.id)
  await nextTick()
  seriesPostInput.value?.focus()
  seriesPostInput.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const submitSeriesPost = async () => {
  if (!await ensureLoggedIn()) return
  const series = selectedSeries.value
  if (!series || !series.currentUserRole || series.status !== 'OPEN') {
    toast.warning('请选择已加入的开放合集')
    return
  }
  if (!isPositiveId(seriesSubmission.postId)) {
    toast.warning('请输入有效的公开帖子 ID')
    return
  }
  if (isHighRiskDomain(series.domain) && !seriesSubmission.riskAcknowledged) {
    toast.warning('请先确认该领域的风险提示')
    return
  }

  submittingSeries.value = true
  try {
    await collaborationApi.series.submissions.create(series.id, {
      postId: seriesSubmission.postId,
      note: cleanOptional(seriesSubmission.note),
      riskAcknowledged: seriesSubmission.riskAcknowledged,
    })
    toast.success('合集投稿已提交审核')
    seriesSubmission.postId = ''
    seriesSubmission.note = ''
    seriesSubmission.riskAcknowledged = false
  } catch (error) {
    toast.error(getErrorMessage(error, '合集投稿失败'))
  } finally {
    submittingSeries.value = false
  }
}

const focusActivitySubmission = async (activity: CollaborationActivity) => {
  activitySubmission.activityId = String(activity.id)
  await nextTick()
  activityPostInput.value?.focus()
  activityPostInput.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const submitActivityPost = async () => {
  if (!await ensureLoggedIn()) return
  const activity = selectedActivity.value
  if (!activity || activity.status !== 'OPEN') {
    toast.warning('请选择开放中的活动')
    return
  }
  if (!isPositiveId(activitySubmission.postId)) {
    toast.warning('请输入有效的公开帖子 ID')
    return
  }
  if (isHighRiskDomain(activity.domain) && !activitySubmission.riskAcknowledged) {
    toast.warning('请先确认该领域的风险提示')
    return
  }

  submittingActivity.value = true
  try {
    await collaborationApi.activities.submissions.create(activity.id, {
      postId: activitySubmission.postId,
      note: cleanOptional(activitySubmission.note),
      riskAcknowledged: activitySubmission.riskAcknowledged,
    })
    toast.success('活动投稿已提交审核')
    activitySubmission.postId = ''
    activitySubmission.note = ''
    activitySubmission.riskAcknowledged = false
  } catch (error) {
    toast.error(getErrorMessage(error, '活动投稿失败'))
  } finally {
    submittingActivity.value = false
  }
}

const submitCuration = async () => {
  if (!await ensureLoggedIn()) return
  if (!isPositiveId(curationForm.topicId) || !isPositiveId(curationForm.postId)) {
    toast.warning('请输入有效的话题 ID 与帖子 ID')
    return
  }
  if (!curationForm.rationale.trim()) {
    toast.warning('请填写推荐理由')
    return
  }

  submittingCuration.value = true
  try {
    await collaborationApi.curation.create({
      topicId: curationForm.topicId,
      postId: curationForm.postId,
      suggestionType: curationForm.suggestionType,
      rationale: curationForm.rationale.trim(),
      riskAcknowledged: curationForm.riskAcknowledged,
    })
    toast.success('策展建议已提交')
    curationForm.topicId = ''
    curationForm.postId = ''
    curationForm.rationale = ''
    curationForm.riskAcknowledged = false
    curationFilters.status = ''
    await loadCuration()
  } catch (error) {
    toast.error(getErrorMessage(error, '策展建议提交失败'))
  } finally {
    submittingCuration.value = false
  }
}

const voteDiscussion = async (discussion: StructuredDiscussion, optionId: ApiId) => {
  if (!await ensureLoggedIn()) return
  if (discussion.status !== 'OPEN' || discussionPendingIds.value.has(String(discussion.id))) return
  const riskAcknowledged = Boolean(riskAcknowledgements[discussionRiskKey(discussion)])
  if (isHighRiskDomain(discussion.domain) && !riskAcknowledged) {
    toast.warning('请先确认该领域的风险提示')
    return
  }

  setPending(discussionPendingIds, discussion.id, true)
  try {
    const res = await collaborationApi.discussions.vote(discussion.id, {
      optionId,
      riskAcknowledged,
    })
    if (res.data) discussionState.items = replaceItem(discussionState.items, res.data)
    toast.success('选择已记录')
  } catch (error) {
    toast.error(getErrorMessage(error, '投票失败'))
  } finally {
    setPending(discussionPendingIds, discussion.id, false)
  }
}

const applyHubQueryState = () => {
  activeTab.value = hubQueryState.tab
  hubSort.value = hubQueryState.sort
  const domain = hubQueryState.domain
  const status = hubQueryState.status
  const statusOr = <T extends string>(
    values: readonly T[],
    fallback: T | '',
  ): T | '' => {
    if (status === 'ALL') return ''
    if (values.includes(status as T)) return status as T
    return status ? fallback : fallback
  }

  if (hubQueryState.tab === 'needs') {
    if (needFilters.domain !== domain) needFilters.domain = domain
    const nextStatus = statusOr(needStatusOptions.map((item) => item.value), '') as NeedStatus | ''
    if (needFilters.status !== nextStatus) needFilters.status = nextStatus
  } else if (hubQueryState.tab === 'series') {
    seriesFilters.domain = domain
    seriesFilters.status = statusOr(['OPEN', 'CLOSED'] as const, 'OPEN')
  } else if (hubQueryState.tab === 'activities') {
    activityFilters.domain = domain
    activityFilters.status = statusOr(activityStatusOptions.map((item) => item.value), 'OPEN') as CollaborationActivityStatus | ''
  } else if (hubQueryState.tab === 'curation') {
    curationFilters.status = statusOr(['PENDING', 'APPROVED', 'REJECTED'] as const, '') as SubmissionReviewStatus | ''
  } else if (hubQueryState.tab === 'discussions') {
    discussionFilters.domain = domain
    discussionFilters.status = statusOr(['OPEN', 'SUMMARIZED', 'CLOSED'] as const, 'OPEN')
  }
}

let lastHubQuerySignature = ''
watch(
  () => JSON.stringify([
    hubQueryState.tab,
    hubQueryState.domain,
    hubQueryState.status,
    hubQueryState.sort,
    hubQueryState.needId,
    hubQueryState.seriesId,
    hubQueryState.activityId,
    hubQueryState.discussionId,
    hubQueryState.officeHourId,
    hubQueryState.reservationId,
  ]),
  (signature) => {
    const changed = Boolean(lastHubQuerySignature) && signature !== lastHubQuerySignature
    applyHubQueryState()
    lastHubQuerySignature = signature
    if (changed && activeTab.value !== 'needs') void refreshCurrentTab()
  },
  { immediate: true },
)

watch(
  () => authStore.isLoggedIn,
  (isLoggedIn) => {
    if (!isLoggedIn) {
      curationState.requestId += 1
      curationState.loading = false
      curationState.loadingMore = false
      curationState.items = []
      curationState.error = ''
      curationState.nextCursor = ''
      curationState.hasMore = false
      curationState.total = null
      curationState.initialized = true
      return
    }
    curationState.initialized = false
    if (activeTab.value === 'curation') void loadCuration()
  },
)

onMounted(() => {
  if (activeTab.value !== 'needs') void refreshCurrentTab()
})
</script>

<style scoped>
.collaboration-page {
  min-width: 0;
}

.workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.75rem 0 1.5rem;
}

.workspace-title-group {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.9rem;
}

.workspace-mark,
.panel-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 0.6rem;
  background: rgb(224 231 255);
  color: rgb(67 56 202);
}

.workspace-mark {
  width: 2.75rem;
  height: 2.75rem;
}

.panel-icon {
  width: 2rem;
  height: 2rem;
}

.workspace-kicker {
  margin: 0 0 0.15rem;
  color: rgb(67 56 202);
  font-size: 0.75rem;
  font-weight: 800;
}

.workspace-header h1 {
  margin: 0;
  color: rgb(15 23 42);
  font-size: 1.75rem;
  font-weight: 900;
  letter-spacing: 0;
  text-wrap: balance;
}

.workspace-header p:last-child {
  max-width: 68ch;
  margin: 0.35rem 0 0;
  color: rgb(71 85 105);
  font-size: 0.875rem;
  line-height: 1.7;
}

.workspace-refresh {
  flex: none;
}

.workspace-tabs {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  padding: 0.35rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: rgb(248 250 252);
}

.workspace-tab {
  display: inline-flex;
  min-width: 0;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  padding: 0.65rem 0.75rem;
  color: rgb(71 85 105);
  font-size: 0.8125rem;
  font-weight: 750;
  transition: background-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.workspace-tab:hover {
  background: rgb(241 245 249);
  color: rgb(30 41 59);
}

.workspace-tab-active {
  background: white;
  color: rgb(67 56 202);
  box-shadow: 0 1px 3px rgb(15 23 42 / 0.1);
}

.workspace-layout {
  display: grid;
  min-width: 0;
  gap: 1.25rem;
  grid-template-columns: minmax(17rem, 21rem) minmax(0, 1fr);
  align-items: start;
}

.workspace-panel {
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
}

.workspace-form-panel {
  position: sticky;
  top: 5.5rem;
  padding: 1.25rem;
}

.workspace-list-panel {
  min-height: 28rem;
}

.workspace-wide-panel {
  width: 100%;
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.panel-heading h2,
.list-toolbar h2 {
  margin: 0;
  color: rgb(15 23 42);
  font-size: 1rem;
  font-weight: 850;
  letter-spacing: 0;
}

.panel-heading p,
.list-toolbar p {
  margin: 0.25rem 0 0;
  color: rgb(100 116 139);
  font-size: 0.75rem;
  line-height: 1.55;
}

.login-notice {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-top: 1rem;
  border-radius: 0.5rem;
  background: rgb(238 242 255);
  padding: 0.7rem 0.8rem;
  color: rgb(55 48 163);
  font-size: 0.75rem;
  line-height: 1.5;
}

.login-notice span {
  min-width: 0;
  flex: 1;
}

.login-notice button {
  flex: none;
  border: 0;
  background: transparent;
  color: rgb(67 56 202);
  font-weight: 800;
}

.workspace-form {
  display: grid;
  gap: 1rem;
  margin-top: 1.1rem;
}

.field-grid {
  display: grid;
  gap: 0.8rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field-grid-three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.field-group {
  display: grid;
  min-width: 0;
  gap: 0.4rem;
  color: rgb(51 65 85);
  font-size: 0.75rem;
  font-weight: 700;
}

.workspace-input,
.workspace-textarea,
.toolbar-select {
  width: 100%;
  min-width: 0;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: white;
  color: rgb(15 23 42);
  transition: border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease;
}

.workspace-input {
  min-height: 2.75rem;
  padding: 0.65rem 0.75rem;
}

.workspace-textarea {
  min-height: 7rem;
  resize: vertical;
  padding: 0.7rem 0.75rem;
  line-height: 1.65;
}

.workspace-textarea-compact {
  min-height: 5.5rem;
}

.workspace-input::placeholder,
.workspace-textarea::placeholder {
  color: rgb(100 116 139);
}

.workspace-input:focus,
.workspace-textarea:focus,
.toolbar-select:focus {
  outline: none;
  border-color: rgb(99 102 241);
  box-shadow: 0 0 0 3px rgb(224 231 255);
}

.risk-confirmation,
.compact-risk {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  border-radius: 0.5rem;
  background: rgb(255 247 237);
  color: rgb(154 52 18);
  line-height: 1.5;
}

.risk-confirmation {
  padding: 0.75rem;
  font-size: 0.75rem;
}

.compact-risk {
  align-items: center;
  padding: 0.45rem 0.55rem;
  font-size: 0.6875rem;
}

.risk-confirmation input,
.compact-risk input {
  width: 1rem;
  height: 1rem;
  flex: none;
  margin-top: 0.1rem;
  accent-color: rgb(234 88 12);
}

.compact-risk input {
  margin-top: 0;
}

.form-footnote {
  margin: 0.9rem 0 0;
  color: rgb(100 116 139);
  font-size: 0.75rem;
  line-height: 1.6;
}

.list-toolbar {
  display: flex;
  min-height: 4.75rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid rgb(226 232 240);
  padding: 1rem 1.15rem;
}

.toolbar-controls {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.toolbar-select {
  min-height: 2.5rem;
  max-width: 9rem;
  padding: 0.5rem 1.8rem 0.5rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 650;
}

.icon-action {
  display: inline-flex;
  width: 2.5rem;
  height: 2.5rem;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: white;
  color: rgb(71 85 105);
  transition: border-color 150ms ease, background-color 150ms ease, color 150ms ease;
}

.icon-action:hover:not(:disabled) {
  border-color: rgb(165 180 252);
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.icon-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.state-stack {
  padding: 0 1.15rem;
}

.skeleton-row {
  display: grid;
  gap: 0.7rem;
  border-bottom: 1px solid rgb(241 245 249);
  padding: 1.3rem 0;
}

.skeleton-line {
  display: block;
  width: 100%;
  height: 0.75rem;
  border-radius: 0.25rem;
  background: rgb(226 232 240);
  animation: skeleton-pulse 1.4s ease-in-out infinite;
}

.skeleton-line-short {
  width: 28%;
}

.skeleton-line-medium {
  width: 62%;
}

.state-message {
  display: flex;
  min-height: 15rem;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
  padding: 2rem;
  color: rgb(100 116 139);
  text-align: left;
}

.state-message > svg {
  flex: none;
  color: rgb(148 163 184);
}

.state-message strong {
  display: block;
  color: rgb(51 65 85);
  font-size: 0.875rem;
}

.state-message p {
  max-width: 42ch;
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  line-height: 1.6;
}

.state-message button {
  flex: none;
  border: 0;
  background: transparent;
  color: rgb(67 56 202);
  font-size: 0.75rem;
  font-weight: 800;
}

.state-message-error {
  color: rgb(185 28 28);
}

.state-message-error > svg,
.state-message-error strong {
  color: rgb(185 28 28);
}

.collaboration-list,
.discussion-list {
  padding: 0 1.15rem;
}

.collaboration-row,
.discussion-row {
  min-width: 0;
  border-bottom: 1px solid rgb(226 232 240);
  padding: 1.2rem 0;
}

.collaboration-row:last-child,
.discussion-row:last-child {
  border-bottom: 0;
}

.row-heading {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.row-title {
  min-width: 0;
}

.row-title h3 {
  margin: 0.55rem 0 0;
  overflow-wrap: anywhere;
  color: rgb(15 23 42);
  font-size: 1rem;
  font-weight: 820;
  letter-spacing: 0;
  line-height: 1.45;
  text-wrap: pretty;
}

.row-heading time {
  flex: none;
  color: rgb(100 116 139);
  font-size: 0.6875rem;
  font-weight: 650;
  white-space: nowrap;
}

.badge-line {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.status-badge,
.meta-badge,
.role-badge {
  display: inline-flex;
  min-height: 1.5rem;
  align-items: center;
  border-radius: 999px;
  padding: 0.25rem 0.55rem;
  font-size: 0.6875rem;
  font-weight: 750;
  line-height: 1;
}

.status-badge {
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.status-badge[data-status='OPEN'],
.status-badge[data-status='APPROVED'] {
  background: rgb(236 253 245);
  color: rgb(4 120 87);
}

.status-badge[data-status='CLAIMED'],
.status-badge[data-status='REVIEWING'],
.status-badge[data-status='PENDING'] {
  background: rgb(255 247 237);
  color: rgb(194 65 12);
}

.status-badge[data-status='COMPLETED'],
.status-badge[data-status='SUMMARIZED'] {
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.status-badge[data-status='CLOSED'],
.status-badge[data-status='ARCHIVED'],
.status-badge[data-status='MERGED'],
.status-badge[data-status='REJECTED'] {
  background: rgb(241 245 249);
  color: rgb(71 85 105);
}

.meta-badge {
  background: rgb(248 250 252);
  color: rgb(71 85 105);
}

.role-badge {
  background: rgb(254 249 195);
  color: rgb(133 77 14);
}

.row-description {
  margin: 0.75rem 0 0;
  overflow-wrap: anywhere;
  color: rgb(71 85 105);
  font-size: 0.8125rem;
  line-height: 1.75;
  text-wrap: pretty;
}

.row-detail,
.row-summary,
.discussion-summary {
  margin: 0.8rem 0 0;
  overflow-wrap: anywhere;
  border-radius: 0.5rem;
  background: rgb(248 250 252);
  padding: 0.7rem 0.8rem;
  color: rgb(71 85 105);
  font-size: 0.75rem;
  line-height: 1.65;
}

.row-detail strong,
.row-summary strong,
.discussion-summary strong {
  color: rgb(51 65 85);
}

.row-summary {
  display: grid;
  gap: 0.25rem;
}

.row-footer {
  display: flex;
  min-width: 0;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
}

.row-meta {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 0.5rem 0.85rem;
  color: rgb(100 116 139);
  font-size: 0.6875rem;
  font-weight: 650;
}

.row-meta span {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.3rem;
  overflow-wrap: anywhere;
}

.row-actions {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.row-action {
  display: inline-flex;
  min-height: 2.35rem;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: white;
  padding: 0.5rem 0.7rem;
  color: rgb(51 65 85);
  font-size: 0.75rem;
  font-weight: 750;
  transition: border-color 150ms ease, background-color 150ms ease, color 150ms ease;
}

.row-action:hover:not(:disabled) {
  border-color: rgb(165 180 252);
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.row-action-primary {
  border-color: rgb(79 70 229);
  background: rgb(79 70 229);
  color: white;
}

.row-action-primary:hover:not(:disabled) {
  border-color: rgb(67 56 202);
  background: rgb(67 56 202);
  color: white;
}

.row-action:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.load-more {
  display: flex;
  width: calc(100% - 2.3rem);
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  margin: 0.25rem 1.15rem 1.15rem;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: rgb(248 250 252);
  color: rgb(51 65 85);
  font-size: 0.75rem;
  font-weight: 750;
}

.load-more:hover:not(:disabled) {
  border-color: rgb(165 180 252);
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.load-more:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.discussion-row {
  padding: 1.35rem 0;
}

.discussion-risk {
  width: fit-content;
  margin-top: 0.8rem;
}

.vote-options {
  display: grid;
  gap: 0.55rem;
  margin-top: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.vote-option {
  display: grid;
  min-width: 0;
  min-height: 3rem;
  grid-template-columns: 1.2rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.65rem;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: white;
  padding: 0.65rem 0.75rem;
  color: rgb(51 65 85);
  text-align: left;
  transition: border-color 150ms ease, background-color 150ms ease, color 150ms ease;
}

.vote-option:hover:not(:disabled) {
  border-color: rgb(129 140 248);
  background: rgb(238 242 255);
}

.vote-option-selected {
  border-color: rgb(99 102 241);
  background: rgb(238 242 255);
  color: rgb(55 48 163);
}

.vote-option:disabled {
  cursor: not-allowed;
  opacity: 0.66;
}

.vote-indicator {
  display: inline-flex;
  width: 1.15rem;
  height: 1.15rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(148 163 184);
  border-radius: 999px;
}

.vote-option-selected .vote-indicator {
  border-color: rgb(79 70 229);
  background: rgb(79 70 229);
  color: white;
}

.vote-text {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.5;
}

.vote-count {
  flex: none;
  color: rgb(100 116 139);
  font-size: 0.6875rem;
  font-weight: 750;
}

.discussion-meta {
  margin-top: 0.8rem;
}

.discussion-summary {
  display: grid;
  gap: 0.35rem;
}

.discussion-summary p {
  margin: 0;
}

@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

.dark .workspace-mark,
.dark .panel-icon {
  background: rgb(49 46 129 / 0.45);
  color: rgb(165 180 252);
}

.dark .workspace-kicker {
  color: rgb(165 180 252);
}

.dark .workspace-header h1,
.dark .panel-heading h2,
.dark .list-toolbar h2,
.dark .row-title h3 {
  color: rgb(241 245 249);
}

.dark .workspace-header p:last-child,
.dark .panel-heading p,
.dark .list-toolbar p,
.dark .row-description {
  color: rgb(148 163 184);
}

.dark .workspace-tabs {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23 / 0.55);
}

.dark .workspace-tab {
  color: rgb(148 163 184);
}

.dark .workspace-tab:hover {
  background: rgb(30 41 59);
  color: rgb(226 232 240);
}

.dark .workspace-tab-active {
  background: rgb(30 41 59);
  color: rgb(165 180 252);
  box-shadow: 0 1px 3px rgb(2 6 23 / 0.5);
}

.dark .workspace-panel {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42 / 0.9);
}

.dark .login-notice {
  background: rgb(49 46 129 / 0.28);
  color: rgb(199 210 254);
}

.dark .login-notice button {
  color: rgb(165 180 252);
}

.dark .field-group {
  color: rgb(203 213 225);
}

.dark .workspace-input,
.dark .workspace-textarea,
.dark .toolbar-select,
.dark .icon-action,
.dark .row-action,
.dark .vote-option {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23 / 0.62);
  color: rgb(226 232 240);
}

.dark .workspace-input::placeholder,
.dark .workspace-textarea::placeholder {
  color: rgb(100 116 139);
}

.dark .workspace-input:focus,
.dark .workspace-textarea:focus,
.dark .toolbar-select:focus {
  border-color: rgb(129 140 248);
  box-shadow: 0 0 0 3px rgb(49 46 129 / 0.45);
}

.dark .risk-confirmation,
.dark .compact-risk {
  background: rgb(124 45 18 / 0.28);
  color: rgb(253 186 116);
}

.dark .list-toolbar,
.dark .collaboration-row,
.dark .discussion-row {
  border-color: rgb(51 65 85);
}

.dark .icon-action:hover:not(:disabled),
.dark .row-action:hover:not(:disabled),
.dark .load-more:hover:not(:disabled),
.dark .vote-option:hover:not(:disabled),
.dark .vote-option-selected {
  border-color: rgb(99 102 241);
  background: rgb(49 46 129 / 0.32);
  color: rgb(199 210 254);
}

.dark .row-action-primary,
.dark .row-action-primary:hover:not(:disabled) {
  border-color: rgb(79 70 229);
  background: rgb(79 70 229);
  color: white;
}

.dark .skeleton-row {
  border-color: rgb(30 41 59);
}

.dark .skeleton-line {
  background: rgb(51 65 85);
}

.dark .state-message {
  color: rgb(148 163 184);
}

.dark .state-message strong,
.dark .row-detail strong,
.dark .row-summary strong,
.dark .discussion-summary strong {
  color: rgb(203 213 225);
}

.dark .meta-badge {
  background: rgb(30 41 59);
  color: rgb(148 163 184);
}

.dark .role-badge {
  background: rgb(113 63 18 / 0.35);
  color: rgb(253 224 71);
}

.dark .row-detail,
.dark .row-summary,
.dark .discussion-summary {
  background: rgb(2 6 23 / 0.58);
  color: rgb(148 163 184);
}

.dark .load-more {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23 / 0.55);
  color: rgb(203 213 225);
}

.dark .vote-option-selected .vote-indicator {
  border-color: rgb(99 102 241);
  background: rgb(79 70 229);
}

@media (max-width: 1024px) {
  .workspace-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .workspace-form-panel {
    position: static;
  }
}

@media (max-width: 760px) {
  .workspace-header {
    align-items: flex-start;
  }

  .workspace-tabs {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .field-grid-three {
    grid-template-columns: minmax(0, 1fr);
  }

  .list-toolbar {
    align-items: flex-start;
  }

  .toolbar-controls {
    max-width: 58%;
    flex-wrap: wrap;
  }

  .toolbar-select {
    max-width: none;
    flex: 1 1 7.5rem;
  }

  .row-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .row-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .vote-options {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 520px) {
  .collaboration-page {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }

  .workspace-header {
    flex-direction: column;
  }

  .workspace-refresh {
    width: 100%;
  }

  .workspace-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .workspace-tab {
    justify-content: flex-start;
  }

  .workspace-form-panel {
    padding: 1rem;
  }

  .field-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .list-toolbar {
    flex-direction: column;
  }

  .toolbar-controls {
    width: 100%;
    max-width: none;
    justify-content: flex-start;
  }

  .toolbar-select {
    min-width: 0;
  }

  .row-heading {
    flex-direction: column;
    gap: 0.45rem;
  }

  .row-heading time {
    white-space: normal;
  }

  .row-action {
    flex: 1 1 auto;
  }

  .state-message {
    min-height: 12rem;
    align-items: flex-start;
    flex-wrap: wrap;
    justify-content: flex-start;
  }

  .workspace-input,
  .workspace-textarea,
  .toolbar-select {
    font-size: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .workspace-tab,
  .workspace-input,
  .workspace-textarea,
  .toolbar-select,
  .icon-action,
  .row-action,
  .load-more,
  .vote-option {
    transition: none;
  }

  .skeleton-line {
    animation: none;
  }
}

/* Public discovery layout: the hub is a community surface first, then a workbench. */
.collaboration-hub-page {
  --hub-bg: #f6f7f9;
  --hub-surface: #ffffff;
  --hub-surface-muted: #f8fafc;
  --hub-ink: #0f172a;
  --hub-copy: #475569;
  --hub-muted: #64748b;
  --hub-border: #e8edf3;
  --hub-border-strong: #d7dee8;
  --hub-primary: #2563eb;
  --hub-primary-soft: #eff6ff;
  --hub-primary-hover: #1d4ed8;
  max-width: 1180px;
  padding-top: 1.25rem;
  padding-bottom: 5rem;
}

.collaboration-hub-hero {
  align-items: flex-end;
  gap: 2rem;
  padding: 0.5rem 0 1.25rem;
}

.collaboration-hub-hero-copy {
  gap: 0.85rem;
}

.collaboration-hub-mark {
  width: 2.65rem;
  height: 2.65rem;
  border-radius: 0.7rem;
  background: var(--hub-primary);
  color: white;
}

.workspace-kicker {
  color: var(--hub-primary);
  letter-spacing: 0.02em;
}

.workspace-header h1 {
  color: var(--hub-ink);
  font-size: 1.75rem;
  letter-spacing: 0;
}

.workspace-header p:last-child {
  max-width: 66ch;
  color: var(--hub-copy);
}

.collaboration-hub-header-actions {
  flex: none;
  align-items: flex-end;
}

.workspace-sort-control {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--hub-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.hub-participation-guide {
  border-top: 1px solid var(--hub-border);
  border-bottom: 1px solid var(--hub-border);
  padding: 1.1rem 0 1.25rem;
}

.hub-guide-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.85rem;
}

.hub-guide-kicker {
  margin: 0 0 0.2rem;
  color: var(--hub-primary);
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.hub-guide-heading h2 {
  margin: 0;
  color: var(--hub-ink);
  font-size: 1rem;
  font-weight: 850;
  text-wrap: balance;
}

.hub-guide-heading > p {
  max-width: 42ch;
  margin: 0;
  color: var(--hub-muted);
  font-size: 0.75rem;
  line-height: 1.6;
  text-align: right;
}

.hub-guide-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.5rem;
}

.hub-guide-step {
  display: grid;
  min-width: 0;
  min-height: 6.8rem;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.65rem;
  border: 1px solid var(--hub-border);
  border-radius: 0.7rem;
  background: var(--hub-surface);
  padding: 0.8rem;
  color: var(--hub-ink);
  text-align: left;
  transition: border-color 160ms ease, background-color 160ms ease;
}

.hub-guide-step:hover,
.hub-guide-step-active {
  border-color: #93c5fd;
  background: var(--hub-primary-soft);
}

.hub-guide-step:focus-visible {
  outline: 2px solid rgb(37 99 235 / 0.55);
  outline-offset: 2px;
}

.hub-guide-number {
  color: var(--hub-primary);
  font-size: 0.6875rem;
  font-weight: 850;
  line-height: 1.4;
}

.hub-guide-step-copy {
  display: grid;
  min-width: 0;
  gap: 0.25rem;
}

.hub-guide-step-copy strong {
  overflow-wrap: anywhere;
  font-size: 0.8125rem;
  font-weight: 800;
  line-height: 1.35;
}

.hub-guide-step-copy small {
  overflow-wrap: anywhere;
  color: var(--hub-muted);
  font-size: 0.6875rem;
  line-height: 1.5;
}

.hub-guide-arrow {
  width: 0.9rem;
  height: 0.9rem;
  flex: none;
  color: #94a3b8;
}

.workspace-tabs {
  display: flex;
  gap: 0.25rem;
  margin: 1.15rem 0 1.25rem;
  overflow-x: auto;
  border: 0;
  border-bottom: 1px solid var(--hub-border);
  border-radius: 0;
  background: transparent;
  padding: 0;
  scrollbar-width: none;
}

.workspace-tabs::-webkit-scrollbar {
  display: none;
}

.workspace-tab {
  min-height: 2.9rem;
  flex: 1 0 auto;
  gap: 0.45rem;
  border-bottom: 2px solid transparent;
  border-radius: 0.35rem 0.35rem 0 0;
  padding: 0.7rem 0.85rem;
  color: var(--hub-muted);
  font-size: 0.75rem;
  white-space: nowrap;
}

.workspace-tab:hover {
  background: var(--hub-surface-muted);
  color: var(--hub-ink);
}

.workspace-tab-active {
  border-bottom-color: var(--hub-primary);
  background: var(--hub-primary-soft);
  color: var(--hub-primary);
  box-shadow: none;
}

.workspace-layout {
  grid-template-columns: minmax(19rem, 21.5rem) minmax(0, 1fr);
  gap: 1.35rem;
}

.workspace-panel {
  border-color: var(--hub-border);
  border-radius: 0.75rem;
  background: var(--hub-surface);
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.03);
}

.workspace-form-panel {
  top: 5rem;
  border-top: 2px solid var(--hub-primary);
}

.panel-heading h2,
.list-toolbar h2,
.row-title h3 {
  color: var(--hub-ink);
}

.panel-heading p,
.list-toolbar p {
  color: var(--hub-muted);
}

.workspace-input,
.workspace-textarea,
.toolbar-select {
  border-color: var(--hub-border-strong);
}

.workspace-input:focus,
.workspace-textarea:focus,
.toolbar-select:focus {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgb(37 99 235 / 0.12);
}

.primary-action,
.row-action-primary {
  background: var(--hub-primary);
}

.primary-action:hover:not(:disabled),
.row-action-primary:hover:not(:disabled) {
  background: var(--hub-primary-hover);
}

.row-action-primary {
  border-color: var(--hub-primary);
}

.row-action-primary:hover:not(:disabled) {
  border-color: var(--hub-primary-hover);
}

.login-notice {
  background: var(--hub-primary-soft);
  color: #1d4ed8;
}

.login-notice button,
.state-message button {
  color: var(--hub-primary);
}

.icon-action:hover:not(:disabled),
.row-action:hover:not(:disabled),
.load-more:hover:not(:disabled),
.vote-option:hover:not(:disabled) {
  border-color: #93c5fd;
  background: var(--hub-primary-soft);
  color: var(--hub-primary-hover);
}

.row-detail,
.row-summary,
.discussion-summary {
  border: 1px solid var(--hub-border);
  background: var(--hub-surface-muted);
}

.load-more {
  border-color: var(--hub-border-strong);
  background: var(--hub-surface-muted);
}

.vote-option-selected {
  border-color: #60a5fa;
  background: var(--hub-primary-soft);
  color: #1d4ed8;
}

@media (max-width: 1024px) {
  .hub-guide-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .collaboration-hub-hero {
    align-items: flex-start;
  }

  .collaboration-hub-header-actions {
    align-items: stretch;
  }

  .hub-guide-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .hub-guide-heading > p {
    max-width: 58ch;
    text-align: left;
  }

  .hub-guide-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .workspace-tabs {
    margin-top: 1rem;
  }
}

@media (max-width: 520px) {
  .collaboration-hub-page {
    padding-top: 1rem;
    padding-bottom: 4.75rem;
  }

  .collaboration-hub-hero {
    gap: 1rem;
    padding-bottom: 1rem;
  }

  .collaboration-hub-hero-copy {
    gap: 0.7rem;
  }

  .collaboration-hub-mark {
    width: 2.35rem;
    height: 2.35rem;
  }

  .workspace-header h1 {
    font-size: 1.5rem;
  }

  .workspace-header p:last-child {
    font-size: 0.8125rem;
    line-height: 1.65;
  }

  .workspace-sort-control {
    width: 100%;
    justify-content: space-between;
  }

  .workspace-sort-control .toolbar-select {
    width: auto;
    flex: 1;
  }

  .hub-participation-guide {
    padding-top: 1rem;
  }

  .hub-guide-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .hub-guide-step {
    min-height: 0;
    grid-template-columns: auto minmax(0, 1fr) auto;
    padding: 0.75rem;
  }

  .workspace-tabs {
    margin-right: -0.75rem;
    margin-left: -0.75rem;
    padding: 0 0.75rem;
  }

  .workspace-tab {
    min-height: 2.75rem;
    padding-right: 0.7rem;
    padding-left: 0.7rem;
  }

  .workspace-panel {
    border-radius: 0.65rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hub-guide-step {
    transition: none;
  }
}

.dark .collaboration-hub-page {
  --hub-surface: rgb(15 23 42 / 0.92);
  --hub-surface-muted: rgb(2 6 23 / 0.58);
  --hub-ink: #f1f5f9;
  --hub-copy: #cbd5e1;
  --hub-muted: #94a3b8;
  --hub-border: #334155;
  --hub-border-strong: #475569;
  --hub-primary: #60a5fa;
  --hub-primary-soft: rgb(30 64 175 / 0.26);
  --hub-primary-hover: #93c5fd;
}

.dark .collaboration-hub-mark {
  background: #1d4ed8;
  color: #eff6ff;
}

.dark .hub-guide-step:hover,
.dark .hub-guide-step-active,
.dark .workspace-tab-active {
  background: var(--hub-primary-soft);
}

.dark .workspace-panel {
  box-shadow: none;
}

.dark .login-notice {
  color: #bfdbfe;
}

.dark .row-detail,
.dark .row-summary,
.dark .discussion-summary,
.dark .load-more {
  border-color: var(--hub-border);
  background: var(--hub-surface-muted);
}
</style>
