<template>
  <div :class="['min-h-screen bg-slate-50 dark:bg-slate-950', themeStore.isDark() ? 'prep-page-dark' : '']">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <section class="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 class="text-3xl font-bold text-slate-950 dark:text-slate-50">我的学习空间</h1>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">维护学习目标和技术标签，集中复习收藏题与待复习题。</p>
          </div>
          <div class="prep-hero-actions">
            <RouterLink to="/questions" class="prep-primary-action">
              继续学习
            </RouterLink>
            <RouterLink to="/mock-interview" class="prep-secondary-action">
              知识复盘
            </RouterLink>
            <details v-if="hasExportActions" class="prep-export-menu">
              <summary class="prep-export-trigger">
                <Download class="h-4 w-4" aria-hidden="true" />
                导出
                <ChevronDown class="h-4 w-4" aria-hidden="true" />
              </summary>
              <div class="prep-export-list">
                <button
                  v-if="overview"
                  type="button"
                  class="prep-export-item"
                  @click="copyPrepPack"
                >
                  <Copy class="h-4 w-4" aria-hidden="true" />
                  复制学习包
                </button>
                <button
                  v-if="overview"
                  type="button"
                  class="prep-export-item"
                  @click="downloadPrepPack"
                >
                  <Download class="h-4 w-4" aria-hidden="true" />
                  下载学习包
                </button>
                <button
                  v-if="weeklyReport"
                  type="button"
                  class="prep-export-item"
                  @click="copyWeeklyReport"
                >
                  <Copy class="h-4 w-4" aria-hidden="true" />
                  复制周复盘
                </button>
                <button
                  v-if="weeklyReport"
                  type="button"
                  class="prep-export-item"
                  @click="downloadWeeklyReport"
                >
                  <Download class="h-4 w-4" aria-hidden="true" />
                  下载周复盘
                </button>
                <button
                  v-if="starStoryQuestions.length"
                  type="button"
                  class="prep-export-item"
                  @click="copyStarLibrary"
                >
                  <Copy class="h-4 w-4" aria-hidden="true" />
                  复制 STAR 素材库
                </button>
                <button
                  v-if="starStoryQuestions.length"
                  type="button"
                  class="prep-export-item"
                  @click="downloadStarLibrary"
                >
                  <Download class="h-4 w-4" aria-hidden="true" />
                  下载 STAR 素材库
                </button>
              </div>
            </details>
          </div>
        </div>
      </section>

      <section v-if="showFullPageSkeleton" class="prep-loading-shell" aria-busy="true">
        <div class="prep-load-hint prep-load-hint-primary">
          <strong>正在加载学习数据</strong>
          <span>学习目标、复习提醒和回答卡片会在数据返回后自动补齐。</span>
        </div>
        <LoadingSkeleton />
      </section>
      <section v-else-if="isError && !overview" class="surface-card flex flex-col items-center justify-center px-6 py-12 text-center">
        <h3 class="mb-2 text-lg font-black text-slate-950 dark:text-slate-100">学习空间加载失败</h3>
        <p class="mb-6 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
          {{ getErrorMessage(error, '暂时无法加载学习空间，请稍后重试。') }}
        </p>
        <div class="flex flex-wrap justify-center gap-3">
          <button type="button" class="primary-action inline-flex items-center justify-center px-5 py-2.5" @click="refetch()">重试</button>
          <RouterLink to="/questions" class="secondary-action inline-flex items-center justify-center px-5 py-2.5">去知识库看看</RouterLink>
        </div>
      </section>
      <section v-else-if="showPrepRecoveryPanel" class="surface-card flex flex-col items-center justify-center px-6 py-12 text-center">
        <h3 class="mb-2 text-lg font-black text-slate-950 dark:text-slate-100">学习空间加载太久了</h3>
        <p class="mb-6 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-400">
          这里不应该让你一直看骨架屏。你可以先重试一次，或者直接去知识库和知识复盘继续操作；数据返回后页面会自动恢复。
        </p>
        <div class="flex flex-wrap justify-center gap-3">
          <button type="button" class="primary-action inline-flex items-center justify-center px-5 py-2.5" @click="refetch()">重试加载</button>
          <RouterLink to="/questions" class="secondary-action inline-flex items-center justify-center px-5 py-2.5">去知识库</RouterLink>
          <RouterLink to="/mock-interview" class="secondary-action inline-flex items-center justify-center px-5 py-2.5">知识复盘</RouterLink>
        </div>
      </section>
      <section v-else-if="isInitialLoadingWithoutData" class="prep-loading-shell" aria-busy="true">
        <div v-if="showPrepTimeoutHint" class="prep-load-hint">
          <strong>学习空间还在加载</strong>
          <span>先展示关键入口，数据返回后会自动补齐。</span>
          <button type="button" @click="refetch()">重试</button>
        </div>
        <section class="prep-metric-grid mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <div v-for="item in metricPlaceholders" :key="item" class="metric-card metric-card-pending">
            <span>{{ item }}</span>
            <strong class="metric-skeleton" aria-hidden="true"></strong>
          </div>
        </section>
        <section class="starter-panel mb-6">
          <div>
            <p class="plan-kicker">开始学习</p>
            <h2 class="plan-title">先把学习空间跑起来</h2>
            <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              你可以先进入知识库或知识复盘；学习数据完成后会自动刷新当前页面。
            </p>
          </div>
          <div class="starter-actions">
            <RouterLink to="/questions" class="primary-action inline-flex items-center justify-center px-5 py-2.5">去知识库</RouterLink>
            <RouterLink to="/mock-interview" class="secondary-action inline-flex items-center justify-center px-5 py-2.5">知识复盘</RouterLink>
          </div>
        </section>
      </section>
      <EmptyState v-else-if="!overview" title="暂时无法加载学习空间" description="学习数据还没有返回；你也可以先去知识库收藏或标记几道题。" actionText="去知识库看看" actionHref="/questions" />
      <template v-else>
        <section v-if="isServingCachedOverview || isRefreshingOverview" class="prep-refresh-banner">
          <span>{{ isServingCachedOverview ? '已先展示本地快照，正在刷新最新数据。' : '学习空间数据刷新中。' }}</span>
        </section>
        <section v-if="prepDemoNotice" class="prep-refresh-banner">
          <span>{{ prepDemoNotice }}</span>
        </section>
        <section class="prep-metric-grid mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <div class="metric-card"><span>收藏</span><strong>{{ overview.favoriteCount }}</strong></div>
          <div class="metric-card"><span>待学习</span><strong>{{ overview.todoCount }}</strong></div>
          <div class="metric-card"><span>学习中</span><strong>{{ overview.learningCount }}</strong></div>
          <div class="metric-card"><span>已掌握</span><strong>{{ overview.masteredCount }}</strong></div>
          <div class="metric-card"><span>待复习</span><strong>{{ overview.reviewCount }}</strong></div>
          <RouterLink to="/questions?hasNote=true&sort=latest" class="metric-card metric-link"><span>笔记题</span><strong>{{ overview.noteCount }}</strong></RouterLink>
          <div class="metric-card"><span>回答卡片</span><strong>{{ overview.answerDraftCount }}</strong></div>
        </section>

        <section v-if="isPrepStarterEmpty" class="starter-panel mb-6">
          <div>
            <p class="plan-kicker">开始学习</p>
            <h2 class="plan-title">先把学习空间喂进第一批数据</h2>
            <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              当前账号还没有可见题目、目标和回答卡片。先添加一个目标或从知识库开始，学习空间就会汇总收藏、待复习、STAR 草稿和知识复盘表现。
            </p>
          </div>
          <div class="starter-actions">
            <a href="#prep-targets" class="primary-action inline-flex items-center justify-center px-5 py-2.5">添加目标</a>
            <RouterLink to="/questions" class="secondary-action inline-flex items-center justify-center px-5 py-2.5">去知识库</RouterLink>
            <RouterLink to="/editor" class="secondary-action inline-flex items-center justify-center px-5 py-2.5">发布内容</RouterLink>
            <RouterLink to="/mock-interview" class="secondary-action inline-flex items-center justify-center px-5 py-2.5">知识复盘</RouterLink>
          </div>
        </section>

        <nav class="prep-workbench-nav" aria-label="学习空间工作区">
          <button
            v-for="pane in prepWorkbenchPanes"
            :key="pane.key"
            type="button"
            :class="['prep-workbench-tab', activePrepPane === pane.key ? 'prep-workbench-tab-active' : '']"
            @click="activePrepPane = pane.key"
          >
            <span>{{ pane.label }}</span>
            <small>{{ pane.description }}</small>
          </button>
        </nav>

        <section v-if="overview.reviewPlan && overview.reviewPlan.todayCount > 0" v-show="activePrepPane === 'today'" class="mb-6 due-review-alert">
          <div>
            <p class="plan-kicker">今日复习</p>
            <h2 class="plan-title">到期复习提醒</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {{ overview.reviewPlan.todayCount }} 道题需要今天处理，优先清理能减少阶段前堆积。
            </p>
          </div>
          <div class="due-review-list">
            <RouterLink
              v-for="question in todayReviewPreview.slice(0, 3)"
              :key="question.id"
              :to="'/questions/' + question.id"
              class="due-review-item"
            >
              <span>{{ question.questionText }}</span>
              <small>{{ question.company || '通用公司' }} &#183; {{ reviewScheduleText(question) }}</small>
            </RouterLink>
          </div>
          <RouterLink to="/questions?progressStatus=review&sort=latest" class="progress-pill">查看待复习题</RouterLink>
        </section>

        <section v-if="mockStats && mockStats.sessionCount > 0" v-show="activePrepPane === 'today'" class="mb-6 mock-stats-panel">
          <div>
            <p class="plan-kicker">知识复盘</p>
            <h2 class="plan-title">知识复盘表现</h2>
          </div>
          <div class="mock-stats-grid">
            <div><span>完成场次</span><strong>{{ mockStats.completedCount }}</strong></div>
            <div><span>平均分</span><strong>{{ mockStats.averageScorePercent }}%</strong></div>
            <div><span>最佳分</span><strong>{{ mockStats.bestScorePercent }}%</strong></div>
            <div><span>已答题</span><strong>{{ mockStats.answeredQuestionCount }}/{{ mockStats.totalQuestionCount }}</strong></div>
          </div>
          <RouterLink to="/mock-interview" class="progress-pill">继续复盘</RouterLink>
        </section>

        <section v-if="weeklyReport" v-show="activePrepPane === 'today'" class="mb-6 weekly-report-panel">
          <div>
            <p class="plan-kicker">本周复盘</p>
            <h2 class="plan-title">本周学习复盘</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ formatWeeklyRange(weeklyReport.windowStart, weeklyReport.windowEnd) }}</p>
          </div>
          <div class="weekly-report-grid">
            <div><span>触达题目</span><strong>{{ weeklyReport.touchedQuestionCount }}</strong></div>
            <div><span>已掌握</span><strong>{{ weeklyReport.masteredQuestionCount }}</strong></div>
            <div><span>待复习</span><strong>{{ weeklyReport.reviewQuestionCount }}</strong></div>
            <div><span>回答卡片</span><strong>{{ weeklyReport.answerDraftCount }}</strong></div>
            <div><span>知识复盘</span><strong>{{ weeklyReport.mockCompletedCount }}/{{ weeklyReport.mockSessionCount }}</strong></div>
            <div><span>平均分</span><strong>{{ weeklyReport.mockAverageScorePercent }}%</strong></div>
          </div>
          <div v-if="weeklyNextActions.length" class="weekly-actions">
            <span v-for="action in weeklyNextActions" :key="action">{{ action }}</span>
          </div>
        </section>

        <section v-if="overview.mistakeReasonCounts.length" v-show="activePrepPane === 'today'" class="mb-6 rounded-xl border border-rose-100 bg-rose-50/70 p-5 dark:border-rose-900 dark:bg-rose-950/20">
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="text-base font-extrabold text-slate-950 dark:text-slate-50">复盘短板</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">来自题目详情页的错因标记，帮助你集中补弱项。</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <RouterLink v-for="item in overview.mistakeReasonCounts" :key="item.reason" :to="mistakeReasonLink(item.reason)" class="reason-chip">
                {{ mistakeReasonText(item.reason) }} · {{ item.count }}
              </RouterLink>
            </div>
          </div>
        </section>

        <section v-if="overview.focusTagCounts.length" v-show="activePrepPane === 'today'" class="mb-6 focus-tags-panel">
          <div>
            <p class="plan-kicker">薄弱标签</p>
            <h2 class="plan-title">薄弱标签聚焦</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">从待复习、错因和超时学习中的题目聚合，帮助你先补高频短板。</p>
          </div>
          <div class="focus-tags-list">
            <RouterLink
              v-for="item in overview.focusTagCounts"
              :key="item.name"
              :to="`/mock-interview?focusTag=${encodeURIComponent(item.name)}`"
              class="focus-tag-row"
            >
              <span>{{ item.name }}</span>
              <strong>{{ item.count }}</strong>
              <i :style="{ width: `${focusTagWidth(item.count)}%` }" />
            </RouterLink>
          </div>
        </section>

        <section v-if="overview.reviewPlan" v-show="activePrepPane === 'today'" class="mb-6 grid gap-4 lg:grid-cols-2">
          <article class="review-plan-card">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="plan-kicker">今日</p>
                <h2 class="plan-title">今日优先复习</h2>
              </div>
              <RouterLink to="/questions?sort=latest" class="plan-count">{{ overview.reviewPlan.todayCount }}</RouterLink>
            </div>
            <div v-if="todayReviewPreview.length" class="mt-4 grid gap-2">
              <div
                v-for="question in todayReviewPreview"
                :key="question.id"
                class="plan-question task-question"
              >
                <RouterLink :to="`/questions/${question.id}`" class="min-w-0">
                  <span class="line-clamp-1">{{ question.questionText }}</span>
                  <small>{{ question.company || '通用公司' }} · {{ reviewScheduleText(question) }}</small>
                </RouterLink>
                <div class="task-actions">
                  <button type="button" :disabled="reviewingQuestionId === question.id" @click="markReviewTask(question.id, 'mastered')">已掌握</button>
                  <button type="button" :disabled="reviewingQuestionId === question.id" @click="markReviewTask(question.id, 'review')">稍后复习</button>
                </div>
              </div>
            </div>
            <p v-else class="mt-4 text-sm text-slate-500 dark:text-slate-400">今天没有强提醒题目，可以从推荐题里挑一两道保持手感。</p>
          </article>

          <article class="review-plan-card">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="plan-kicker">近 7 天</p>
                <h2 class="plan-title">近 7 天复习动态</h2>
              </div>
              <span class="plan-count">{{ overview.reviewPlan.weekTouchedCount }}</span>
            </div>
            <div v-if="weekTouchedPreview.length" class="mt-4 grid gap-2">
              <RouterLink
                v-for="question in weekTouchedPreview"
                :key="question.id"
                :to="`/questions/${question.id}`"
                class="plan-question"
              >
                <span class="line-clamp-1">{{ question.questionText }}</span>
                <small>{{ question.company || '通用公司' }} · {{ question.lastReviewedAt ? `已复习 ${formatScheduleTime(question.lastReviewedAt)}` : (question.mistakeReason ? mistakeReasonText(question.mistakeReason) : progressText(question.progressStatus)) }}</small>
              </RouterLink>
            </div>
            <p v-else class="mt-4 text-sm text-slate-500 dark:text-slate-400">最近 7 天还没有复习记录，可以先标记几道学习中或待复习题。</p>
          </article>
        </section>

        <div v-show="activePrepPane !== 'today'" class="grid gap-6 lg:grid-cols-3">
          <section class="space-y-6 lg:col-span-2">
            <section id="prep-targets" v-show="activePrepPane === 'targets'" class="section-panel target-panel">
              <div class="target-panel-head">
                <div>
                  <h2 class="section-title mb-1">学习目标</h2>
                  <p class="text-sm text-slate-500 dark:text-slate-400">推荐题会优先匹配你的目标方向、岗位和技术标签。</p>
                </div>
                <form class="target-form" @submit.prevent="addTarget">
                  <select v-model="targetForm.targetType" class="target-input">
                    <option value="company">公司</option>
                    <option value="position">岗位</option>
                    <option value="tag">标签</option>
                  </select>
                  <input v-model.trim="targetForm.targetValue" class="target-input" placeholder="例如 字节跳动 / 后端开发 / Redis" />
                  <input v-model="targetForm.interviewDate" class="target-input" type="date" />
                  <select v-model="targetForm.priority" class="target-input">
                    <option value="medium">普通</option>
                    <option value="high">高优先级</option>
                    <option value="urgent">近期目标</option>
                    <option value="low">低优先级</option>
                  </select>
                  <input v-model.trim="targetForm.note" class="target-input target-note-input" maxlength="300" placeholder="备注：如本周重点 / 系统设计 / 项目复盘" />
                  <button class="target-button" type="submit" :disabled="isSubmittingTarget || !targetForm.targetValue">
                    添加学习目标
                  </button>
                </form>
              </div>
              <div v-if="visibleTargets.length" class="target-chip-grid">
                <div
                  v-for="target in visibleTargets"
                  :key="target.id"
                  class="target-chip"
                >
                  <span class="target-chip-main">
                    <strong>{{ targetTypeText(target.targetType) }} · {{ target.targetValue }}</strong>
                    <small>{{ targetScheduleText(target) }} · {{ targetPriorityText(target.priority) }}</small>
                    <small v-if="target.note" class="line-clamp-1">{{ target.note }}</small>
                  </span>
                  <button
                    type="button"
                    class="target-chip-remove"
                    :disabled="deletingTargetId === target.id"
                    :aria-label="`移除学习目标 ${target.targetValue}`"
                    @click.stop="deleteTarget(target.id)"
                  >
                    ×
                  </button>
                </div>
              </div>
              <EmptyState v-else title="还没有学习目标" description="先添加目标方向、岗位或技术标签，推荐会更贴近你的学习方向。" />
            </section>

            <section v-if="visibleTargetSummaries.length" v-show="activePrepPane === 'targets'" class="section-panel">
              <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 class="section-title mb-1">目标学习进度</h2>
                  <p class="text-sm text-slate-500 dark:text-slate-400">按公司、岗位和标签聚合知识库进展，方便阶段性补齐短板。</p>
                </div>
                <RouterLink to="/questions" class="text-sm font-semibold text-primary-600 hover:text-primary-700">
                  查看知识库
                </RouterLink>
              </div>
              <div class="grid gap-4">
                <article v-for="summary in visibleTargetSummaries" :key="summary.target.id" class="target-summary">
                  <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div class="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {{ targetTypeText(summary.target.targetType) }}
                      </div>
                      <h3 class="mt-1 text-base font-bold text-slate-950 dark:text-slate-50">{{ summary.target.targetValue }}</h3>
                      <p class="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {{ targetScheduleText(summary.target) }} · {{ targetPriorityText(summary.target.priority) }}
                      </p>
                      <p v-if="summary.target.note" class="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{{ summary.target.note }}</p>
                    </div>
                    <RouterLink :to="targetSearchLink(summary)" class="progress-pill">
                      {{ summary.questionCount }} 题
                    </RouterLink>
                  </div>

                  <div class="mt-4">
                    <div class="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>掌握进度</span>
                      <strong class="text-slate-700 dark:text-slate-200">{{ targetProgressPercent(summary) }}%</strong>
                    </div>
                    <div class="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        class="h-full rounded-full bg-primary-600 transition-all"
                        :style="{ width: `${targetProgressPercent(summary)}%` }"
                      />
                    </div>
                  </div>

                  <dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div><dt>收藏</dt><dd>{{ summary.favoriteCount }}</dd></div>
                    <div><dt>学习中</dt><dd>{{ summary.learningCount }}</dd></div>
                    <div><dt>已掌握</dt><dd>{{ summary.masteredCount }}</dd></div>
                    <div><dt>待复习</dt><dd>{{ summary.reviewCount }}</dd></div>
                  </dl>

                  <div v-if="filterTargetQuestions(summary).length" class="mt-4 grid gap-2">
                    <RouterLink
                      v-for="question in filterTargetQuestions(summary)"
                      :key="question.id"
                      :to="`/questions/${question.id}`"
                      class="line-clamp-1 text-sm font-medium text-slate-700 hover:text-primary-600 dark:text-slate-200"
                    >
                      {{ question.questionText }}
                    </RouterLink>
                  </div>
                </article>
              </div>
            </section>

            <PrepPanel v-show="activePrepPane === 'questions'" title="待复习题目" :empty="reviewQuestionPreview.length === 0" empty-title="暂无待复习题目" empty-description="在题目详情页把状态标为待复习后会出现在这里。">
              <QuestionCard v-for="question in reviewQuestionPreview" :key="question.id" :question="question" />
            </PrepPanel>

            <PrepPanel v-show="activePrepPane === 'questions'" title="最近整理的回答卡片" action-href="/questions?hasAnswerDraft=true&sort=latest" action-text="查看全部" :empty="answerDraftPreview.length === 0" empty-title="暂无回答卡片" empty-description="在题目详情页整理回答草稿或 STAR 项目映射后会出现在这里。">
              <RouterLink
                v-for="question in answerDraftPreview"
                :key="question.id"
                :to="`/questions/${question.id}`"
                class="answer-card-link"
              >
                <div class="line-clamp-1 text-sm font-extrabold text-slate-950 dark:text-slate-50">{{ question.questionText }}</div>
                <p class="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                  {{ question.answerDraft || question.starStory || '继续完善这张回答卡片' }}
                </p>
                <div class="mt-3 flex flex-wrap gap-2 text-xs font-bold text-primary-600 dark:text-primary-300">
                  <span v-if="question.company">{{ question.company }}</span>
                  <span v-if="question.position">{{ question.position }}</span>
                  <span v-if="question.starStory">STAR</span>
                </div>
              </RouterLink>
            </PrepPanel>

            <PrepPanel v-show="activePrepPane === 'questions'" title="为你推荐" :empty="recommendedQuestionPreview.length === 0" empty-title="暂无推荐知识卡" empty-description="发布更多技术内容或完成知识卡整理后会生成推荐。">
              <QuestionCard v-for="question in recommendedQuestionPreview" :key="question.id" :question="question" />
            </PrepPanel>
          </section>

          <aside v-show="activePrepPane === 'assets'">
            <section class="knowledge-workbench-panel mb-6">
              <div class="knowledge-workbench-head">
                <div>
                  <p class="plan-kicker">我的知识库</p>
                  <h2>工程经验、收藏和面试素材统一归档</h2>
                </div>
                <span>{{ isFetchingKnowledge ? '刷新中' : `${knowledge?.savedMaterialPackCount || 0}/${knowledge?.materialPackCount || 0} 已归档` }}</span>
              </div>
              <div class="knowledge-workbench-metrics">
                <div><span>素材包</span><strong>{{ knowledge?.materialPackCount || 0 }}</strong></div>
                <div><span>收藏帖子</span><strong>{{ knowledge?.favoritePostCount || 0 }}</strong></div>
                <div><span>收藏题目</span><strong>{{ knowledge?.favoriteQuestionCount || 0 }}</strong></div>
              </div>
              <form class="knowledge-filter-grid" @submit.prevent>
                <label>
                  <span>公司</span>
                  <input v-model.trim="knowledgeFilters.company" type="search" placeholder="公司或业务线" />
                </label>
                <label>
                  <span>岗位</span>
                  <input v-model.trim="knowledgeFilters.position" type="search" placeholder="Java 后端" />
                </label>
                <label>
                  <span>技术栈</span>
                  <input v-model.trim="knowledgeFilters.techStack" type="search" placeholder="Redis / Kafka" />
                </label>
                <label>
                  <span>面试轮次</span>
                  <input v-model.trim="knowledgeFilters.interviewRound" type="search" placeholder="一面 / 系统设计" />
                </label>
                <label>
                  <span>内容类型</span>
                  <select v-model="knowledgeFilters.postType">
                    <option value="">全部类型</option>
                    <option v-for="type in knowledgeContentTypeOptions" :key="type.value" :value="String(type.value)">{{ type.label }}</option>
                  </select>
                </label>
                <label class="knowledge-filter-toggle">
                  <input v-model="knowledgeFilters.savedOnly" type="checkbox" />
                  <span>只看已归档</span>
                </label>
                <button type="button" :disabled="!hasKnowledgeFilters" @click="resetKnowledgeFilters">清空筛选</button>
              </form>
              <div v-if="materialGapHints.length" class="knowledge-gap-list">
                <span v-for="hint in materialGapHints" :key="hint">{{ hint }}</span>
              </div>
            </section>

            <PrepPanel title="面试素材包" :empty="materialPackPreview.length === 0" empty-title="暂无面试素材包" empty-description="在帖子详情页生成并归档素材后，会在这里形成可复用的项目故事。">
              <RouterLink
                v-for="material in materialPackPreview"
                :key="material.id"
                :to="`/post/${material.sourcePost?.postId || material.postId}`"
                class="material-pack-link"
              >
                <span>{{ material.sourcePost?.title || '未命名项目素材' }}</span>
                <small>{{ material.savedToPrep ? '已归档' : '待归档' }} · {{ material.technicalHighlights.slice(0, 2).join(' / ') || '待补充技术亮点' }}</small>
              </RouterLink>
            </PrepPanel>

            <PrepPanel class="mt-6" title="收藏文章" :empty="favoritePostPreview.length === 0" empty-title="暂无收藏文章" empty-description="收藏项目复盘、踩坑记录或系统设计内容后，会在这里集中回看。">
              <RouterLink
                v-for="item in favoritePostPreview"
                :key="item.postId"
                :to="`/post/${item.postId}`"
                class="material-pack-link"
              >
                <span>{{ item.title }}</span>
                <small>{{ item.tags.slice(0, 3).map((tag) => tag.name).join(' / ') || '未标注技术栈' }}</small>
              </RouterLink>
            </PrepPanel>
            <PrepPanel title="STAR 素材库" action-href="/questions?hasStarStory=true&sort=latest" action-text="查看全部" :empty="starStoryPreview.length === 0" empty-title="暂无 STAR 素材" empty-description="在题目详情页补充 STAR 项目映射后，会在这里形成项目故事索引。">
              <RouterLink v-for="question in starStoryPreview" :key="question.id" :to="`/questions/${question.id}`" class="star-story-link"><span class="line-clamp-1 text-sm font-extrabold text-slate-950 dark:text-slate-50">{{ question.questionText }}</span><small>{{ question.company || '通用公司' }} · {{ question.position || '通用岗位' }}</small></RouterLink>
            </PrepPanel>

            <PrepPanel class="mt-6" title="最近收藏" :empty="favoriteQuestionPreview.length === 0" empty-title="还没有收藏题目" empty-description="收藏题目后可以在这里快速回看。">
              <RouterLink
                v-for="question in favoriteQuestionPreview"
                :key="question.id"
                :to="`/questions/${question.id}`"
                class="block rounded-lg border border-slate-100 bg-slate-50 p-4 hover:border-primary-200 hover:bg-primary-50/50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-primary-950/30"
              >
                <div class="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ question.questionText }}</div>
                <div class="mt-2 text-xs text-slate-500">{{ question.company || '未知公司' }} · {{ question.position || '通用岗位' }}</div>
              </RouterLink>
            </PrepPanel>
          </aside>
        </div>
      </template>
    </main>
    <RiskConfirmDialog
      :state="riskConfirmState"
      @confirm="resolveRiskConfirm"
      @cancel="cancelRiskConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { ChevronDown, Copy, Download } from 'lucide-vue-next'
import { getErrorMessage } from '@/api/client'
import AppHeader from '@/components/layout/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import RiskConfirmDialog from '@/components/admin/RiskConfirmDialog.vue'
import PrepPanel from '@/components/common/PrepPanel.vue'
import QuestionCard from '@/components/question/QuestionCard.vue'
import { questionApi } from '@/api/question'
import type { ApiId } from '@/api/types'
import type { PrepTarget, Question, TargetPrepSummary, UserKnowledge, UserPrepOverview } from '@/api/question'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useRiskConfirm } from '@/composables/useRiskConfirm'
import { buildStarStoryLibraryMarkdown, buildUserPrepPackMarkdown, buildWeeklyPrepReportMarkdown, downloadMarkdownFile, knowledgeReviewCopy, mistakeReasonText, progressText, targetTypeText } from '@/utils/prepPackExport'
import { safeStorage } from '@/utils/safeStorage'
import { filterPublicContent, isSyntheticVisibleText } from '@/utils/textQuality'
import { ALL_CONTENT_TYPES } from '@/utils/contentTypes'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const { riskConfirmState, confirmRisk, resolveRiskConfirm, cancelRiskConfirm } = useRiskConfirm()
const prepOwner = computed(() => String(authStore.user?.uid ?? 'guest'))
const PREP_OVERVIEW_CACHE_PREFIX = 'offerlab:me-prep-overview:'
const PREP_FIRST_SCREEN_TIMEOUT_MS = 1500
const PREP_RECOVERY_TIMEOUT_MS = 8000
const metricPlaceholders = ['收藏', '待学习', '学习中', '已掌握', '待复习', '笔记题', '回答卡片']
const targetForm = reactive({ targetType: 'company', targetValue: '', interviewDate: '', priority: 'medium', note: '' })
const knowledgeFilters = reactive({
  company: '',
  position: '',
  techStack: '',
  interviewRound: '',
  postType: '',
  savedOnly: false,
})
const isSubmittingTarget = ref(false)
const deletingTargetId = ref<ApiId | null>(null)
const reviewingQuestionId = ref<ApiId | null>(null)
const hasWaitedBeyondFirstPaint = ref(false)
const hasWaitedBeyondRecoveryWindow = ref(false)

type PrepPaneKey = 'today' | 'targets' | 'questions' | 'assets'
const activePrepPane = ref<PrepPaneKey>('today')
const prepWorkbenchPanes: Array<{ key: PrepPaneKey; label: string; description: string }> = [
  { key: 'today', label: '今日计划', description: '复习、练习、周复盘' },
  { key: 'targets', label: '学习目标', description: '方向、进度、匹配题' },
  { key: 'questions', label: '题库工作台', description: '复习、回答、推荐' },
  { key: 'assets', label: '素材库', description: 'STAR、收藏、导出' },
]

let firstScreenTimer: ReturnType<typeof setTimeout> | null = null
let recoveryTimer: ReturnType<typeof setTimeout> | null = null

const prepOverviewCacheKey = (owner: string) => `${PREP_OVERVIEW_CACHE_PREFIX}${owner}`

const readCachedPrepOverview = (owner: string): UserPrepOverview | null => {
  try {
    const raw = safeStorage.sessionGet(prepOverviewCacheKey(owner))
    return raw ? JSON.parse(raw) as UserPrepOverview : null
  } catch {
    return null
  }
}

const writeCachedPrepOverview = (owner: string, value: UserPrepOverview) => {
  try {
    safeStorage.sessionSet(prepOverviewCacheKey(owner), JSON.stringify(value))
  } catch {
    // Cache is only a first-screen fallback; storage failures should not block the page.
  }
}

const scheduleFirstScreenTimer = () => {
  if (firstScreenTimer) clearTimeout(firstScreenTimer)
  if (recoveryTimer) clearTimeout(recoveryTimer)
  hasWaitedBeyondFirstPaint.value = false
  hasWaitedBeyondRecoveryWindow.value = false
  firstScreenTimer = setTimeout(() => {
    hasWaitedBeyondFirstPaint.value = true
  }, PREP_FIRST_SCREEN_TIMEOUT_MS)
  recoveryTimer = setTimeout(() => {
    hasWaitedBeyondRecoveryWindow.value = true
  }, PREP_RECOVERY_TIMEOUT_MS)
}

scheduleFirstScreenTimer()
onBeforeUnmount(() => {
  if (firstScreenTimer) clearTimeout(firstScreenTimer)
  if (recoveryTimer) clearTimeout(recoveryTimer)
})

const cachedOverview = ref<UserPrepOverview | null>(readCachedPrepOverview(prepOwner.value))

const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
  queryKey: computed(() => ['me-prep-overview', prepOwner.value]),
  queryFn: () => questionApi.myPrepOverview(),
})

const { data: mockStatsData } = useQuery({
  queryKey: computed(() => ['mock-interview-stats', prepOwner.value]),
  queryFn: () => questionApi.mockInterviewStats(),
})

const { data: weeklyReportData } = useQuery({
  queryKey: computed(() => ['me-prep-weekly-report', prepOwner.value]),
  queryFn: () => questionApi.myWeeklyPrepReport(),
})

const cleanKnowledgeFilter = (value: string) => {
  const text = value.trim()
  return text || undefined
}
const knowledgeContentTypeOptions = computed(() => ALL_CONTENT_TYPES)
const knowledgeQueryParams = computed(() => ({
  limit: 8,
  company: cleanKnowledgeFilter(knowledgeFilters.company),
  position: cleanKnowledgeFilter(knowledgeFilters.position),
  techStack: cleanKnowledgeFilter(knowledgeFilters.techStack),
  interviewRound: cleanKnowledgeFilter(knowledgeFilters.interviewRound),
  postType: knowledgeFilters.postType ? Number(knowledgeFilters.postType) : undefined,
  savedOnly: knowledgeFilters.savedOnly,
}))
const hasKnowledgeFilters = computed(() => Boolean(
  knowledgeQueryParams.value.company
  || knowledgeQueryParams.value.position
  || knowledgeQueryParams.value.techStack
  || knowledgeQueryParams.value.interviewRound
  || knowledgeQueryParams.value.postType
  || knowledgeQueryParams.value.savedOnly
))
const resetKnowledgeFilters = () => {
  knowledgeFilters.company = ''
  knowledgeFilters.position = ''
  knowledgeFilters.techStack = ''
  knowledgeFilters.interviewRound = ''
  knowledgeFilters.postType = ''
  knowledgeFilters.savedOnly = false
}

const { data: knowledgeData, isFetching: isFetchingKnowledge } = useQuery({
  queryKey: computed(() => ['me-knowledge', prepOwner.value, knowledgeQueryParams.value]),
  queryFn: () => questionApi.myKnowledge(knowledgeQueryParams.value),
})

const overview = computed(() => data.value?.data || cachedOverview.value || null)
const knowledge = computed<UserKnowledge | null>(() => knowledgeData.value?.data || null)
const mockStats = computed(() => mockStatsData.value?.data || null)
const weeklyReport = computed(() => weeklyReportData.value?.data || null)
const weeklyNextActions = computed(() => (weeklyReport.value?.nextActions || []).slice(0, 3).map(knowledgeReviewCopy))
const prepDemoNotice = computed(() => (
  data.value?.message === 'local_demo_seed'
    || knowledgeData.value?.message === 'local_demo_seed'
    || weeklyReportData.value?.message === 'local_demo_seed'
) ? '当前展示本地样例学习空间：这些收藏、周报和目标不是你的个人数据；真实服务返回后会自动替换。' : '')
const isServingCachedOverview = computed(() => Boolean(cachedOverview.value && !data.value?.data))
const isInitialLoadingWithoutData = computed(() => Boolean(isLoading.value && !overview.value))
const showFullPageSkeleton = computed(() => Boolean(isInitialLoadingWithoutData.value && !hasWaitedBeyondFirstPaint.value))
const showPrepTimeoutHint = computed(() => Boolean(isInitialLoadingWithoutData.value && hasWaitedBeyondFirstPaint.value))
const showPrepRecoveryPanel = computed(() => Boolean(isInitialLoadingWithoutData.value && hasWaitedBeyondRecoveryWindow.value))
const isRefreshingOverview = computed(() => Boolean(isFetching.value && overview.value && !isServingCachedOverview.value))
const publicQuestions = (items?: Question[] | null) => filterPublicContent(items || [])
const isVisibleTarget = (target?: PrepTarget | null) => {
  if (!target) return false
  return !isSyntheticVisibleText(target.targetValue) && !isSyntheticVisibleText(target.note)
}
const visibleTargets = computed(() => (overview.value?.targets || []).filter(isVisibleTarget).slice(0, 6))
const visibleTargetSummaries = computed(() => (overview.value?.targetSummaries || [])
  .filter((summary) => isVisibleTarget(summary.target))
  .slice(0, 2))
const todayReviewQuestions = computed(() => publicQuestions(overview.value?.reviewPlan?.todayQuestions))
const weekTouchedQuestions = computed(() => publicQuestions(overview.value?.reviewPlan?.weekTouchedQuestions))
const reviewQuestions = computed(() => publicQuestions(overview.value?.reviewQuestions))
const answerDraftQuestions = computed(() => publicQuestions(overview.value?.answerDraftQuestions))
const recommendedQuestions = computed(() => publicQuestions(overview.value?.recommendedQuestions))
const favoriteQuestions = computed(() => publicQuestions(overview.value?.favoriteQuestions))
const starStoryQuestions = computed(() => answerDraftQuestions.value.filter((question) => Boolean(question.starStory)))
const todayReviewPreview = computed(() => todayReviewQuestions.value.slice(0, 5))
const weekTouchedPreview = computed(() => weekTouchedQuestions.value.slice(0, 5))
const reviewQuestionPreview = computed(() => reviewQuestions.value.slice(0, 3))
const answerDraftPreview = computed(() => answerDraftQuestions.value.slice(0, 3))
const recommendedQuestionPreview = computed(() => recommendedQuestions.value.slice(0, 3))
const favoriteQuestionPreview = computed(() => favoriteQuestions.value.slice(0, 3))
const starStoryPreview = computed(() => starStoryQuestions.value.slice(0, 3))
const materialPackPreview = computed(() => (knowledge.value?.materialPacks || []).slice(0, 4))
const favoritePostPreview = computed(() => (knowledge.value?.favoritePosts || []).slice(0, 4))
const materialGapHints = computed(() => (knowledge.value?.materialGapHints || []).slice(0, 5))
const filterTargetQuestions = (summary: TargetPrepSummary) => publicQuestions(summary.recommendedQuestions).slice(0, 2)
const hasExportActions = computed(() => Boolean(overview.value) || Boolean(weeklyReport.value) || starStoryQuestions.value.length > 0)
const maxFocusTagCount = computed(() => Math.max(1, ...(overview.value?.focusTagCounts || []).map((item) => item.count)))
const isPrepStarterEmpty = computed(() => {
  const value = overview.value
  if (!value) return false
  const counts = [
    value.favoriteCount,
    value.todoCount,
    value.learningCount,
    value.masteredCount,
    value.reviewCount,
    value.noteCount,
    value.answerDraftCount,
    value.reviewPlan?.todayCount,
    value.reviewPlan?.weekTouchedCount,
  ]
  const lists = [
    visibleTargets.value,
    visibleTargetSummaries.value,
    value.reviewQuestions,
    value.answerDraftQuestions,
    value.recommendedQuestions,
    value.favoriteQuestions,
    value.focusTagCounts,
    value.mistakeReasonCounts,
  ]
  return counts.every((count) => Number(count || 0) === 0)
    && lists.every((list) => !list || list.length === 0)
    && Number(mockStats.value?.sessionCount || 0) === 0
})

watch(prepOwner, (owner) => {
  cachedOverview.value = readCachedPrepOverview(owner)
  scheduleFirstScreenTimer()
})

watch(
  () => data.value?.data,
  (value) => {
    if (!value) return
    cachedOverview.value = value
    writeCachedPrepOverview(prepOwner.value, value)
  },
  { immediate: true },
)

const addTarget = async () => {
  if (!targetForm.targetValue) return
  isSubmittingTarget.value = true
  try {
    await questionApi.addPrepTarget({
      targetType: targetForm.targetType,
      targetValue: targetForm.targetValue,
      interviewDate: targetForm.interviewDate || undefined,
      priority: targetForm.priority || undefined,
      note: targetForm.note || undefined,
    })
    targetForm.targetValue = ''
    targetForm.interviewDate = ''
    targetForm.priority = 'medium'
    targetForm.note = ''
    toast.success('学习目标已添加')
    await refetch()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '添加学习目标失败'))
  } finally {
    isSubmittingTarget.value = false
  }
}

const deleteTarget = async (id: ApiId) => {
  const target = overview.value?.targets.find((item) => item.id === id)
  const confirmed = await confirmRisk({
    title: '移除学习目标',
    level: 'medium',
    reversible: false,
    impactCount: 1,
    objects: [target ? `${targetTypeText(target.targetType)}: ${target.targetValue}` : `target:${id}`],
    context: target
      ? [
          targetScheduleText(target),
          targetPriorityText(target.priority),
          target.note ? `备注：${target.note}` : '删除后推荐题会停止优先匹配该目标。',
        ]
      : ['删除后推荐题会停止优先匹配该目标。'],
    confirmText: '确认移除',
  })
  if (confirmed === null) return
  deletingTargetId.value = id
  try {
    await questionApi.deletePrepTarget(id)
    toast.success('学习目标已移除')
    await refetch()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '移除学习目标失败'))
  } finally {
    deletingTargetId.value = null
  }
}

const markReviewTask = async (questionId: ApiId, status: 'mastered' | 'review') => {
  reviewingQuestionId.value = questionId
  try {
    await questionApi.updateProgress(questionId, status)
    toast.success(status === 'mastered' ? '已标记为掌握' : '已放回复习队列')
    await refetch()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '更新复习任务失败'))
  } finally {
    reviewingQuestionId.value = null
  }
}

const copyPrepPack = async () => {
  if (!overview.value) return
  try {
    await navigator.clipboard.writeText(buildUserPrepPackMarkdown(overview.value))
    toast.success('学习包已复制')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '复制学习包失败'))
  }
}

const downloadPrepPack = () => {
  if (!overview.value) return
  try {
    downloadMarkdownFile(buildUserPrepPackMarkdown(overview.value), `offerlab-学习包-${exportDateText()}.md`)
    toast.success('学习包已下载')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '下载学习包失败'))
  }
}

const copyStarLibrary = async () => {
  if (!starStoryQuestions.value.length) return
  try {
    await navigator.clipboard.writeText(buildStarStoryLibraryMarkdown(starStoryQuestions.value))
    toast.success('STAR 素材库已复制')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '复制 STAR 素材库失败'))
  }
}

const downloadStarLibrary = () => {
  if (!starStoryQuestions.value.length) return
  try {
    downloadMarkdownFile(buildStarStoryLibraryMarkdown(starStoryQuestions.value), `offerlab-star-素材库-${exportDateText()}.md`)
    toast.success('STAR 素材库已下载')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '下载 STAR 素材库失败'))
  }
}

const copyWeeklyReport = async () => {
  if (!weeklyReport.value) return
  try {
    await navigator.clipboard.writeText(buildWeeklyPrepReportMarkdown(weeklyReport.value))
    toast.success('本周学习复盘已复制')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '复制周复盘失败'))
  }
}

const downloadWeeklyReport = () => {
  if (!weeklyReport.value) return
  try {
    downloadMarkdownFile(buildWeeklyPrepReportMarkdown(weeklyReport.value), `offerlab-周复盘-${exportDateText()}.md`)
    toast.success('本周学习复盘已下载')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '下载周复盘失败'))
  }
}

const targetProgressPercent = (summary: TargetPrepSummary) => {
  if (!summary.questionCount) return 0
  return Math.min(100, Math.round((summary.masteredCount / summary.questionCount) * 100))
}

const targetSearchLink = (summary: TargetPrepSummary) => {
  const value = encodeURIComponent(summary.target.targetValue)
  if (summary.target.targetType === 'company') return `/questions?company=${value}`
  if (summary.target.targetType === 'position') return `/questions?position=${value}`
  return `/questions?keyword=${value}`
}

const focusTagWidth = (count: number) => Math.max(10, Math.round((count / maxFocusTagCount.value) * 100))

const mistakeReasonLink = (reason: string) => `/questions?mistakeReason=${encodeURIComponent(reason)}&sort=latest`

const targetPriorityText = (priority?: string) => {
  const map: Record<string, string> = {
    urgent: '近期目标',
    high: '高优先级',
    medium: '普通优先级',
    low: '低优先级',
  }
  return map[priority || 'medium'] || '普通优先级'
}

const targetScheduleText = (target: PrepTarget) => {
  if (!target.interviewDate) return '未设置目标日期'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const interviewDate = new Date(`${target.interviewDate}T00:00:00`)
  const diffDays = Math.round((interviewDate.getTime() - today.getTime()) / 86400000)
  if (diffDays > 0) return `还有 ${diffDays} 天`
  if (diffDays === 0) return '今天到期'
  return `已过 ${Math.abs(diffDays)} 天`
}

const formatScheduleTime = (value?: number) => {
  if (!value) return '暂无计划'
  const date = new Date(value)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const formatWeeklyRange = (start: number, end: number) => `${formatScheduleTime(start)} - ${formatScheduleTime(end)}`

const exportDateText = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const reviewScheduleText = (question: Question) => {
  const parts = [progressText(question.progressStatus)]
  if (question.nextReviewAt) parts.push(`下次 ${formatScheduleTime(question.nextReviewAt)}`)
  if (question.reviewCount > 0) parts.push(`已复习 ${question.reviewCount} 次`)
  return parts.join(' · ')
}

</script>

<style scoped>
.metric-card,
.section-panel {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.metric-card span {
  display: block;
  font-size: 0.875rem;
  color: rgb(100 116 139);
}

.metric-card strong {
  margin-top: 0.35rem;
  display: block;
  font-size: 1.75rem;
  color: rgb(15 23 42);
}

.metric-link {
  text-decoration: none;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.metric-link:hover {
  border-color: rgb(191 219 254);
  background: rgb(239 246 255);
}

.prep-workbench-nav {
  margin-bottom: 1.5rem;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.5rem;
}

.prep-workbench-tab {
  min-width: 0;
  border-radius: 0.625rem;
  border: 1px solid transparent;
  background: transparent;
  padding: 0.8rem 0.9rem;
  text-align: left;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.prep-workbench-tab span,
.prep-workbench-tab small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prep-workbench-tab span {
  font-size: 0.9rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.prep-workbench-tab small {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(100 116 139);
}

.prep-workbench-tab:hover {
  border-color: rgb(191 219 254);
  background: white;
}

.prep-workbench-tab-active {
  border-color: rgb(59 130 246);
  background: white;
  box-shadow: 0 8px 20px rgb(37 99 235 / 0.12);
}

.prep-loading-shell {
  display: block;
}

.prep-load-hint,
.prep-refresh-banner {
  margin-bottom: 1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(191 219 254);
  background: rgb(239 246 255);
  padding: 0.85rem 1rem;
  color: rgb(30 64 175);
}

.prep-load-hint-primary {
  align-items: flex-start;
}

.prep-load-hint strong {
  font-size: 0.9rem;
  font-weight: 900;
}

.prep-load-hint span,
.prep-refresh-banner span {
  font-size: 0.82rem;
  font-weight: 700;
}

.prep-load-hint button {
  min-height: 30px;
  border-radius: 999px;
  border: 1px solid rgb(147 197 253);
  background: white;
  padding: 0.25rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 800;
  color: rgb(29 78 216);
}

.metric-card-pending {
  min-height: 105px;
}

.metric-skeleton {
  width: 58%;
  height: 2rem;
  border-radius: 0.45rem;
  background: linear-gradient(90deg, rgb(226 232 240), rgb(248 250 252), rgb(226 232 240));
  background-size: 180% 100%;
  animation: prepSkeletonPulse 1.2s ease-in-out infinite;
}

@keyframes prepSkeletonPulse {
  0% {
    background-position: 120% 0;
  }

  100% {
    background-position: -80% 0;
  }
}

.section-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

.target-form {
  display: grid;
  width: 100%;
  min-width: 0;
  gap: 0.65rem;
}

.target-input {
  min-height: 36px;
  min-width: 0;
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.45rem 0.7rem;
  font-size: 0.8125rem;
  color: rgb(15 23 42);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.72);
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.target-input:focus {
  border-color: rgb(147 197 253);
  background: white;
  box-shadow: 0 0 0 3px rgb(191 219 254 / 0.42);
  outline: none;
}

.target-button,
.target-chip {
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 700;
}

.target-note-input {
  min-width: 0;
}

.prep-hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 0.65rem;
}

.prep-primary-action,
.prep-secondary-action,
.prep-export-trigger,
.prep-export-item {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 800;
}

.prep-primary-action {
  background: rgb(37 99 235);
  padding: 0.5rem 1.05rem;
  color: white;
}

.prep-primary-action:hover {
  background: rgb(29 78 216);
}

.prep-secondary-action,
.prep-export-trigger {
  border: 1px solid rgb(191 219 254);
  background: rgb(239 246 255);
  padding: 0.5rem 1rem;
  color: rgb(29 78 216);
}

.prep-secondary-action:hover,
.prep-export-trigger:hover {
  border-color: rgb(147 197 253);
  background: rgb(219 234 254);
}

.prep-export-menu {
  position: relative;
}

.prep-export-trigger {
  cursor: pointer;
  list-style: none;
}

.prep-export-trigger::-webkit-details-marker {
  display: none;
}

.prep-export-menu:not([open]) .prep-export-list {
  display: none;
}

.prep-export-list {
  position: absolute;
  right: 0;
  z-index: 20;
  margin-top: 0.5rem;
  display: grid;
  min-width: 13rem;
  overflow: hidden;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.35rem;
  box-shadow: 0 18px 42px rgb(15 23 42 / 0.16);
}

.prep-export-item {
  width: 100%;
  justify-content: flex-start;
  border: 0;
  background: transparent;
  padding: 0.6rem 0.7rem;
  color: rgb(51 65 85);
  text-align: left;
}

.prep-export-item:hover,
.prep-export-item:focus-visible {
  background: rgb(239 246 255);
  color: rgb(29 78 216);
  outline: none;
}

.target-button {
  min-height: 36px;
  width: 100%;
  background: rgb(29 78 216);
  padding: 0.45rem 0.9rem;
  color: white;
  white-space: nowrap;
}

.target-panel {
  overflow: hidden;
}

.target-panel-head {
  margin-bottom: 1rem;
  display: grid;
  gap: 1rem;
}

.target-button:disabled,
.target-chip-remove:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.target-chip-grid {
  display: grid;
  gap: 0.6rem;
}

.target-chip {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.4rem;
  border: 1px solid rgb(199 210 254);
  background: rgb(238 242 255);
  padding: 0.65rem 0.75rem;
  color: rgb(67 56 202);
  text-align: left;
}

.target-chip-main {
  display: grid;
  min-width: 0;
  gap: 0.18rem;
}

.target-chip-main strong,
.target-chip-main small {
  min-width: 0;
}

.target-chip-main small {
  color: rgb(99 102 241);
  font-size: 0.75rem;
  font-weight: 700;
}

.target-chip-remove {
  display: inline-flex;
  height: 2.5rem;
  width: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.72);
  color: rgb(67 56 202);
  font-size: 1rem;
  font-weight: 900;
  line-height: 1;
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

.target-chip-remove:hover,
.target-chip-remove:focus-visible {
  background: rgb(224 231 255);
  color: rgb(49 46 129);
  outline: none;
}

.target-chip-remove:active {
  transform: scale(0.96);
}

.target-summary {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 1rem;
}

.progress-pill {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid rgb(191 219 254);
  background: rgb(239 246 255);
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 800;
  color: rgb(29 78 216);
}

.reason-chip {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgb(254 205 211);
  background: white;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 800;
  color: rgb(190 18 60);
}

.review-plan-card {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.starter-panel {
  display: grid;
  gap: 1.25rem;
  align-items: center;
  border-radius: 0.75rem;
  border: 1px solid rgb(191 219 254);
  background: white;
  padding: 1.5rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.starter-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.mock-stats-panel,
.weekly-report-panel {
  display: grid;
  gap: 1rem;
  align-items: center;
  border-radius: 0.75rem;
  border: 1px solid rgb(191 219 254);
  background: linear-gradient(135deg, rgb(239 246 255), white);
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.due-review-alert {
  display: grid;
  gap: 1rem;
  align-items: center;
  border-radius: 0.75rem;
  border: 1px solid rgb(254 202 202);
  background: linear-gradient(135deg, rgb(255 241 242), white);
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.due-review-list {
  display: grid;
  gap: 0.65rem;
}

.due-review-item {
  display: grid;
  gap: 0.2rem;
  border-radius: 0.65rem;
  border: 1px solid rgb(254 226 226);
  background: white;
  padding: 0.7rem 0.85rem;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.due-review-item:hover {
  border-color: rgb(248 113 113);
  background: rgb(255 241 242);
}

.due-review-item span {
  font-size: 0.9rem;
  font-weight: 900;
  color: rgb(127 29 29);
}

.due-review-item small {
  font-size: 0.75rem;
  color: rgb(153 27 27);
}

.weekly-report-panel {
  border-color: rgb(196 181 253);
  background: linear-gradient(135deg, rgb(245 243 255), white);
}

.focus-tags-panel {
  display: grid;
  gap: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(187 247 208);
  background: linear-gradient(135deg, rgb(240 253 244), white);
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.focus-tags-list {
  display: grid;
  gap: 0.65rem;
}

.focus-tag-row {
  position: relative;
  display: grid;
  min-height: 38px;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  overflow: hidden;
  border-radius: 0.65rem;
  border: 1px solid rgb(187 247 208);
  background: white;
  padding: 0 0.85rem;
}

.focus-tag-row span,
.focus-tag-row strong {
  position: relative;
  z-index: 1;
  font-size: 0.85rem;
}

.focus-tag-row span {
  font-weight: 900;
  color: rgb(20 83 45);
}

.focus-tag-row strong {
  color: rgb(21 128 61);
}

.focus-tag-row i {
  position: absolute;
  inset: 0 auto 0 0;
  background: rgb(187 247 208);
  opacity: 0.55;
}

.mock-stats-grid,
.weekly-report-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.mock-stats-grid span,
.weekly-report-grid span {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(100 116 139);
}

.mock-stats-grid strong,
.weekly-report-grid strong {
  margin-top: 0.2rem;
  display: block;
  font-size: 1.1rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.weekly-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.weekly-actions span {
  border-radius: 999px;
  border: 1px solid rgb(221 214 254);
  background: white;
  padding: 0.35rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 800;
  color: rgb(109 40 217);
}

.plan-kicker {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(37 99 235);
}

.plan-title {
  margin-top: 0.2rem;
  font-size: 1.1rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.plan-count {
  display: inline-flex;
  min-width: 40px;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgb(239 246 255);
  padding: 0 0.75rem;
  font-size: 1rem;
  font-weight: 900;
  color: rgb(29 78 216);
}

.plan-question {
  display: grid;
  gap: 0.25rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.75rem 0.9rem;
}

.plan-question span {
  font-size: 0.9rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

.plan-question small {
  font-size: 0.75rem;
  color: rgb(100 116 139);
}

.task-question {
  grid-template-columns: minmax(0, 1fr);
}

.task-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.task-actions button {
  min-height: 30px;
  border-radius: 999px;
  border: 1px solid rgb(191 219 254);
  background: white;
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(29 78 216);
}

.task-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.answer-card-link {
  display: block;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.9rem 1rem;
}

.knowledge-workbench-panel {
  border-radius: 0.75rem;
  border: 1px solid rgb(191 219 254);
  background: linear-gradient(180deg, rgb(239 246 255), rgb(255 255 255));
  padding: 1.1rem;
}

.knowledge-workbench-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.knowledge-workbench-head h2 {
  margin-top: 0.25rem;
  font-size: 1rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.knowledge-workbench-head > span {
  align-self: flex-start;
  border-radius: 999px;
  background: rgb(219 234 254);
  padding: 0.3rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 900;
  color: rgb(29 78 216);
  white-space: nowrap;
}

.knowledge-workbench-metrics {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
}

.knowledge-workbench-metrics div {
  border-radius: 0.65rem;
  border: 1px solid rgb(219 234 254);
  background: rgb(248 250 252);
  padding: 0.75rem;
}

.knowledge-workbench-metrics span {
  display: block;
  font-size: 0.75rem;
  color: rgb(100 116 139);
}

.knowledge-workbench-metrics strong {
  margin-top: 0.15rem;
  display: block;
  font-size: 1.25rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.knowledge-filter-grid {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
}

.knowledge-filter-grid label {
  display: grid;
  min-width: 0;
  gap: 0.35rem;
}

.knowledge-filter-grid label > span {
  font-size: 0.72rem;
  font-weight: 900;
  color: rgb(51 65 85);
}

.knowledge-filter-grid input,
.knowledge-filter-grid select {
  min-height: 2.35rem;
  width: 100%;
  min-width: 0;
  border-radius: 0.5rem;
  border: 1px solid rgb(191 219 254);
  background: white;
  padding: 0.45rem 0.65rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: rgb(15 23 42);
  outline: none;
}

.knowledge-filter-grid input:focus,
.knowledge-filter-grid select:focus {
  border-color: rgb(37 99 235);
  box-shadow: 0 0 0 3px rgb(191 219 254 / 0.65);
}

.knowledge-filter-toggle {
  align-content: end;
}

.knowledge-filter-toggle input {
  height: 1rem;
  width: 1rem;
  min-height: 1rem;
  padding: 0;
}

.knowledge-filter-toggle {
  grid-template-columns: auto 1fr;
  align-items: center;
  border-radius: 0.5rem;
  border: 1px solid rgb(191 219 254);
  background: rgb(248 250 252);
  padding: 0.55rem 0.65rem;
}

.knowledge-filter-grid button {
  min-height: 2.35rem;
  align-self: end;
  border-radius: 0.5rem;
  border: 1px solid rgb(147 197 253);
  background: white;
  padding: 0.45rem 0.65rem;
  font-size: 0.8rem;
  font-weight: 900;
  color: rgb(29 78 216);
}

.knowledge-filter-grid button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.knowledge-gap-list {
  margin-top: 0.85rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.knowledge-gap-list span {
  border-radius: 999px;
  background: rgb(255 251 235);
  padding: 0.35rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(146 64 14);
}

.material-pack-link {
  display: block;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.875rem;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.material-pack-link + .material-pack-link {
  margin-top: 0.65rem;
}

.material-pack-link span {
  display: block;
  color: rgb(15 23 42);
  font-size: 0.9rem;
  font-weight: 900;
}

.material-pack-link small {
  margin-top: 0.45rem;
  display: block;
  font-size: 0.75rem;
  color: rgb(100 116 139);
}

.material-pack-link:hover {
  border-color: rgb(191 219 254);
  background: rgb(239 246 255);
}

.star-story-link {
  display: block;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.875rem;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.star-story-link small {
  margin-top: 0.45rem;
  display: block;
  font-size: 0.75rem;
  color: rgb(100 116 139);
}

.star-story-link:hover {
  border-color: rgb(191 219 254);
  background: rgb(239 246 255);
}

.target-summary dt {
  font-size: 0.75rem;
  color: rgb(100 116 139);
}

.target-summary dd {
  margin-top: 0.15rem;
  font-size: 1rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

@media (max-width: 640px) {
  .prep-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
    margin-bottom: 1rem;
  }

  .prep-metric-grid .metric-card {
    min-height: 0;
    border-radius: 0.65rem;
    padding: 0.75rem;
  }

  .prep-metric-grid .metric-card span {
    font-size: 0.75rem;
    line-height: 1.2;
  }

  .prep-metric-grid .metric-card strong {
    margin-top: 0.25rem;
    font-size: 1.35rem;
    line-height: 1;
  }

  .prep-metric-grid .metric-card-pending {
    min-height: 4.4rem;
  }

  .prep-metric-grid .metric-skeleton {
    height: 1.35rem;
  }

  .prep-workbench-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .prep-workbench-tab {
    min-height: 4.25rem;
    padding: 0.75rem;
  }

  .knowledge-workbench-head {
    flex-direction: column;
  }

  .knowledge-workbench-metrics {
    grid-template-columns: 1fr;
  }

  .knowledge-filter-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 768px) {
  .target-form {
    grid-template-columns: minmax(92px, 0.55fr) minmax(180px, 1.15fr) minmax(140px, 0.8fr) minmax(124px, 0.72fr);
  }

  .target-note-input {
    grid-column: span 3;
  }

  .target-button {
    width: auto;
  }

  .target-chip-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mock-stats-panel,
  .due-review-alert,
  .weekly-report-panel {
    grid-template-columns: 1fr minmax(340px, 1.4fr) auto;
  }

  .mock-stats-grid,
  .weekly-report-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .weekly-report-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .focus-tags-panel {
    grid-template-columns: minmax(220px, 0.75fr) minmax(320px, 1.25fr);
    align-items: center;
  }

  .task-question {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }
}

@media (min-width: 1280px) {
  .target-panel-head {
    grid-template-columns: minmax(220px, 0.4fr) minmax(0, 1fr);
    align-items: start;
  }

  .target-form {
    grid-template-columns: 96px minmax(180px, 1fr) 148px 132px minmax(220px, 1.1fr) auto;
  }

  .target-note-input {
    grid-column: auto;
  }
}

.dark .metric-card,
.dark .section-panel,
.dark .review-plan-card,
.dark .starter-panel {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .prep-workbench-nav {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

.dark .prep-workbench-tab span {
  color: rgb(241 245 249);
}

.dark .prep-workbench-tab small {
  color: rgb(148 163 184);
}

.dark .prep-workbench-tab:hover {
  border-color: rgb(30 64 175);
  background: rgb(15 23 42);
}

.dark .prep-workbench-tab-active {
  border-color: rgb(96 165 250);
  background: rgb(15 23 42);
  box-shadow: 0 12px 24px rgb(37 99 235 / 0.18);
}

.dark .target-input {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23 / 0.52);
  color: rgb(226 232 240);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.03);
}

.dark .target-input:focus {
  border-color: rgb(96 165 250);
  background: rgb(15 23 42);
  box-shadow: 0 0 0 3px rgb(37 99 235 / 0.24);
}

.dark .prep-load-hint,
.dark .prep-refresh-banner {
  border-color: rgb(30 64 175);
  background: rgb(23 37 84);
  color: rgb(191 219 254);
}

.dark .prep-load-hint button {
  border-color: rgb(59 130 246);
  background: rgb(15 23 42);
  color: rgb(191 219 254);
}

.dark .metric-skeleton {
  background: linear-gradient(90deg, rgb(30 41 59), rgb(51 65 85), rgb(30 41 59));
  background-size: 180% 100%;
}

.dark .mock-stats-panel {
  border-color: rgb(30 64 175);
  background: linear-gradient(135deg, rgb(23 37 84), rgb(15 23 42));
}

.dark .due-review-alert {
  border-color: rgb(127 29 29);
  background: linear-gradient(135deg, rgb(69 10 10), rgb(15 23 42));
}

.dark .due-review-item {
  border-color: rgb(127 29 29);
  background: rgb(2 6 23);
}

.dark .due-review-item:hover {
  border-color: rgb(248 113 113);
  background: rgb(69 10 10);
}

.dark .due-review-item span {
  color: rgb(254 226 226);
}

.dark .due-review-item small {
  color: rgb(252 165 165);
}

.dark .weekly-report-panel {
  border-color: rgb(91 33 182);
  background: linear-gradient(135deg, rgb(46 16 101), rgb(15 23 42));
}

.dark .weekly-actions span {
  border-color: rgb(91 33 182);
  background: rgb(46 16 101);
  color: rgb(221 214 254);
}

.prep-page-dark .mock-stats-panel {
  border-color: rgb(30 64 175);
  background: linear-gradient(135deg, rgb(15 23 42), rgb(23 37 84 / 0.74));
}

.prep-page-dark .weekly-report-panel {
  border-color: rgb(91 33 182);
  background: linear-gradient(135deg, rgb(46 16 101), rgb(15 23 42));
}

.prep-page-dark .mock-stats-grid span,
.prep-page-dark .weekly-report-grid span {
  color: rgb(191 219 254);
}

.prep-page-dark .mock-stats-grid strong,
.prep-page-dark .weekly-report-grid strong {
  color: rgb(248 250 252);
}

.prep-page-dark .weekly-actions span {
  border-color: rgb(91 33 182);
  background: rgb(46 16 101);
  color: rgb(221 214 254);
}

.dark .focus-tags-panel {
  border-color: rgb(22 101 52);
  background: linear-gradient(135deg, rgb(20 83 45), rgb(15 23 42));
}

.dark .focus-tag-row {
  border-color: rgb(22 101 52);
  background: rgb(2 6 23);
}

.dark .focus-tag-row span,
.dark .focus-tag-row strong {
  color: rgb(187 247 208);
}

.dark .focus-tag-row i {
  background: rgb(22 101 52);
}

.dark .metric-card strong,
.dark .section-title,
.dark .plan-title,
.dark .target-input {
  color: rgb(248 250 252);
}

.dark .metric-card span {
  color: rgb(203 213 225);
}

.dark .target-chip {
  border-color: rgb(67 56 202);
  background: rgb(30 27 75);
  color: rgb(199 210 254);
}

.dark .target-chip-main small {
  color: rgb(165 180 252);
}

.dark .target-chip-remove {
  background: rgb(49 46 129);
  color: rgb(224 231 255);
}

.dark .target-chip-remove:hover,
.dark .target-chip-remove:focus-visible {
  background: rgb(67 56 202);
  color: white;
}

.dark .prep-primary-action {
  background: rgb(37 99 235);
  color: white;
}

.dark .prep-primary-action:hover {
  background: rgb(29 78 216);
}

.dark .prep-secondary-action,
.dark .prep-export-trigger {
  border-color: rgb(30 64 175);
  background: rgb(23 37 84);
  color: rgb(191 219 254);
}

.dark .prep-secondary-action:hover,
.dark .prep-export-trigger:hover {
  border-color: rgb(59 130 246);
  background: rgb(30 64 175);
}

.dark .prep-export-list {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  box-shadow: 0 18px 42px rgb(0 0 0 / 0.32);
}

.dark .prep-export-item {
  color: rgb(203 213 225);
}

.dark .prep-export-item:hover,
.dark .prep-export-item:focus-visible {
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

.dark .target-summary {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

.dark .progress-pill {
  border-color: rgb(30 64 175);
  background: rgb(23 37 84);
  color: rgb(191 219 254);
}

.dark .reason-chip {
  border-color: rgb(136 19 55);
  background: rgb(76 5 25);
  color: rgb(254 205 211);
}

.dark .plan-count {
  background: rgb(23 37 84);
  color: rgb(191 219 254);
}

.dark .plan-question {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

.dark .task-actions button {
  border-color: rgb(30 64 175);
  background: rgb(15 23 42);
  color: rgb(191 219 254);
}

.dark .answer-card-link {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

.dark .knowledge-workbench-panel {
  border-color: rgb(30 64 175);
  background: linear-gradient(180deg, rgb(15 23 42), rgb(2 6 23));
}

.dark .knowledge-workbench-head h2,
.dark .knowledge-workbench-metrics strong,
.dark .material-pack-link span {
  color: rgb(248 250 252);
}

.dark .knowledge-workbench-head > span {
  background: rgb(23 37 84);
  color: rgb(191 219 254);
}

.dark .knowledge-workbench-metrics div,
.dark .knowledge-filter-toggle,
.dark .material-pack-link {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

.dark .knowledge-workbench-metrics span,
.dark .knowledge-filter-grid label > span,
.dark .material-pack-link small {
  color: rgb(148 163 184);
}

.dark .knowledge-filter-grid input,
.dark .knowledge-filter-grid select,
.dark .knowledge-filter-grid button {
  border-color: rgb(30 64 175);
  background: rgb(15 23 42);
  color: rgb(248 250 252);
}

.dark .knowledge-filter-grid button {
  color: rgb(147 197 253);
}

.dark .knowledge-gap-list span {
  background: rgb(69 26 3);
  color: rgb(253 230 138);
}

.dark .star-story-link {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

.dark .star-story-link small {
  color: rgb(148 163 184);
}

.dark .plan-question span {
  color: rgb(248 250 252);
}

.dark .target-summary dd {
  color: rgb(248 250 252);
}

.dark .mock-stats-grid strong,
.dark .weekly-report-grid strong {
  color: rgb(248 250 252);
}
</style>
