<template>
  <div :class="['min-h-screen overflow-x-hidden bg-slate-50 dark:bg-slate-950', themeStore.isDark() ? 'ops-page-dark' : '']">
    <AppHeader />
    <main class="px-4 py-8">
      <div class="mx-auto max-w-7xl min-w-0 space-y-6">
      <section class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-sm font-medium text-primary-600 dark:text-primary-400">后台运维</p>
          <h1 class="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">运维中心</h1>
          <p class="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            查看搜索索引、事务消息投递状态，并安全地处理单条失败消息。
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <RouterLink to="/" class="secondary-button">
            返回首页
          </RouterLink>
          <button type="button" class="secondary-button" :disabled="isLoading || isReadinessLoading || isOutboxLoading" @click="refreshAll">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading || isReadinessLoading || isOutboxLoading }" />
            刷新状态
          </button>
          <button v-if="canOps" type="button" class="secondary-button" :disabled="isLoading || isReadinessLoading" @click="copyOpsDiagnosticPack">
            复制诊断包
          </button>
          <button v-if="canAdmin" type="button" class="primary-button desktop-risk-action" :disabled="isSubmitting || isTaskActive" @click="submitRebuild">
            <RotateCcw class="h-4 w-4" :class="{ 'animate-spin': isSubmitting || isTaskActive }" />
            {{ isTaskActive ? '重建中' : '重建索引' }}
          </button>
        </div>
      </section>

      <section v-if="loadError" class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        {{ loadError }}
      </section>

      <section v-if="canOps" class="mobile-ops-summary">
        <div class="mobile-ops-head">
          <div>
            <p class="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-300">移动待办</p>
            <h2>只读优先</h2>
          </div>
          <span class="status-pill status-muted">高风险操作请在桌面端处理</span>
        </div>
        <div class="mobile-ops-grid">
          <article v-for="item in mobileOpsTodoCards" :key="item.label" class="mobile-ops-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.detail }}</small>
          </article>
        </div>
      </section>

      <section v-if="canOps" class="ops-priority-board" aria-label="运维优先处理项">
        <article
          v-for="item in opsPriorityCards"
          :key="item.key"
          :class="['ops-priority-card', `ops-priority-${item.severity}`]"
        >
          <div>
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.detail }}</small>
          </div>
          <button type="button" class="ops-priority-action" @click="scrollToOpsSection(item.targetId)">
            {{ item.action }}
          </button>
        </article>
      </section>

      <section v-if="canOps" class="ops-duty-brief" aria-label="运维值班摘要">
        <div class="ops-duty-brief-head">
          <div>
            <p>运维值班摘要</p>
            <h2>先判断影响，再执行重试</h2>
          </div>
          <span :class="['status-pill', opsDutyRiskLevelClass]">{{ opsDutyRiskLevelText }}</span>
        </div>
        <div class="ops-duty-grid">
          <article v-for="item in opsDutyRiskCards" :key="item.label" :class="['ops-duty-card', `ops-duty-${item.tone}`]">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.detail }}</small>
          </article>
        </div>
        <div class="ops-window-summary" aria-label="15 分钟值班窗口">
          <div class="ops-window-head">
            <span>15 分钟值班窗口</span>
            <strong>{{ opsWindowThresholdText }}</strong>
          </div>
          <div class="ops-window-grid">
            <article v-for="item in opsWindowCards" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.detail }}</small>
            </article>
          </div>
        </div>
        <div class="ops-duty-samples">
          <span>最近失败样本</span>
          <p v-if="recentFailureSamples.length === 0">当前页暂无失败样本，仍建议先刷新状态再执行批量操作。</p>
          <ul v-else>
            <li v-for="item in recentFailureSamples" :key="item">{{ item }}</li>
          </ul>
        </div>
      </section>

      <nav v-if="canOps" class="ops-workbench-nav" aria-label="运维工作台导航">
        <button
          v-for="pane in opsWorkbenchPanes"
          :key="pane.key"
          type="button"
          :class="['ops-workbench-pane', activeOpsPane === pane.key ? 'ops-workbench-pane-active' : '']"
          @click="setOpsPane(pane.key)"
        >
          <span>{{ pane.label }}</span>
          <small>{{ pane.description }}</small>
        </button>
      </nav>

      <section v-if="canOps" class="ops-pagination-note" aria-label="运维分页说明">
        <strong>分页说明</strong>
        <span>{{ activeOpsPaneHint }}</span>
        <small>批量重试上限 {{ OPS_BATCH_RETRY_LIMIT }} 条；执行前必须先预览、输入确认短语并填写原因。</small>
        <small v-if="lastRefreshAt">上次刷新 {{ lastRefreshAt }} · 运行手册：先看只读状态，再处理单条失败任务</small>
      </section>

      <section v-if="!permissions && loadError" class="panel text-center">
        <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">权限状态未加载</h2>
        <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          你已进入运维页，但权限接口暂时不可用。刷新权限后会恢复对应的运维、审核和管理员面板。
        </p>
        <button type="button" class="primary-button mt-5" :disabled="isLoading || isReadinessLoading || isOutboxLoading" @click="refreshAll">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading || isReadinessLoading || isOutboxLoading }" />
          重新加载权限
        </button>
      </section>

      <section id="ops-health" v-if="canOps" v-show="isOpsSectionVisible('ops-health')" class="grid scroll-mt-24 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <article class="metric-card">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="metric-label">整体健康检查</p>
              <h2 class="metric-value">{{ readinessHeadline }}</h2>
            </div>
            <span :class="['status-pill', readinessStatusClass]">{{ readinessBadge }}</span>
          </div>
          <p class="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
            关闭的可选组件不会拉低整体状态，已启用但不可达会显示降级。
          </p>
        </article>

        <article class="metric-card">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="metric-label">环境 / 权限模式</p>
              <h2 class="metric-value">{{ adminModeText }}</h2>
            </div>
            <span :class="['status-pill', adminModeClass]">{{ status?.adminMode || '检测中' }}</span>
          </div>
          <p class="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {{ adminModeDetailText }}
          </p>
        </article>

        <article class="metric-card">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="metric-label">Kafka 消息队列</p>
              <h2 class="metric-value">{{ componentHeadline(kafkaHealth) }}</h2>
            </div>
            <span :class="['status-pill', componentStatusClass(kafkaHealth)]">{{ componentBadgeText(kafkaHealth) }}</span>
          </div>
          <p class="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {{ componentDetail(kafkaHealth, 'Kafka 消息服务') }}
          </p>
        </article>

        <article class="metric-card">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="metric-label">Redis 缓存 / 收件箱</p>
              <h2 class="metric-value">{{ componentHeadline(redisHealth) }}</h2>
            </div>
            <span :class="['status-pill', componentStatusClass(redisHealth)]">{{ componentBadgeText(redisHealth) }}</span>
          </div>
          <p class="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {{ componentDetail(redisHealth, 'Redis') }}
          </p>
        </article>

        <article class="metric-card">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="metric-label">搜索引擎 Elasticsearch</p>
              <h2 class="metric-value">{{ componentHeadline(elasticsearchHealth) }}</h2>
            </div>
            <span :class="['status-pill', componentStatusClass(elasticsearchHealth)]">{{ componentBadgeText(elasticsearchHealth) }}</span>
          </div>
          <p class="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {{ componentDetail(elasticsearchHealth, '搜索服务') }}
          </p>
        </article>

        <article class="metric-card">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="metric-label">数据库结构</p>
              <h2 class="metric-value">{{ componentHeadline(schemaHealth) }}</h2>
            </div>
            <span :class="['status-pill', componentStatusClass(schemaHealth)]">{{ componentBadgeText(schemaHealth) }}</span>
          </div>
          <p class="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {{ componentDetail(schemaHealth, '数据库迁移') }}
          </p>
        </article>
      </section>

      <section v-if="canOps" v-show="isOpsSectionVisible('ops-health')" class="panel scroll-mt-24">
        <div class="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">Kafka/ES/Redis 本地运行控制台</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              这里只做只读检测与命令复制；创建目录、storage format、启动服务和重放消息仍需在终端确认后执行。
            </p>
          </div>
          <button type="button" class="secondary-button" :disabled="isReadinessLoading || isKafkaLocalCheckLoading" @click="refreshLocalMiddleware">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isReadinessLoading || isKafkaLocalCheckLoading }" />
            刷新只读检查
          </button>
        </div>
        <div class="mt-5 grid gap-3 lg:grid-cols-3">
          <article v-for="item in localMiddlewareCommands" :key="item.label" class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <div class="flex items-center justify-between gap-3">
              <strong class="text-sm text-slate-900 dark:text-slate-100">{{ item.label }}</strong>
              <button type="button" class="icon-button" title="复制命令" @click="copyLocalMiddlewareCommand(item.command)">
                <Clipboard class="h-4 w-4" />
              </button>
            </div>
            <code class="mt-3 block break-all rounded bg-slate-900 px-3 py-2 text-xs text-slate-100">{{ item.command }}</code>
          </article>
        </div>
        <div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article v-for="item in kafkaLocalCheckCards" :key="item.label" class="middleware-check-card">
            <div class="flex items-start justify-between gap-3">
              <div>
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
              <span :class="['status-pill', item.className]">{{ item.badge }}</span>
            </div>
            <p>{{ item.detail }}</p>
          </article>
        </div>
        <div v-if="kafkaLocalCheck" class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
          <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <strong class="text-sm text-slate-900 dark:text-slate-100">Kafka Outbox 重放前置检查</strong>
            <span :class="['status-pill', kafkaLocalCheck.readyForOutboxReplay ? 'status-ok' : 'status-warn']">
              {{ kafkaLocalCheck.readyForOutboxReplay ? '可进入重试' : '先恢复 Kafka' }}
            </span>
          </div>
          <div class="mt-3 grid gap-2 md:grid-cols-2">
            <p>Broker：{{ kafkaLocalCheck.endpoint || kafkaLocalCheck.bootstrapServers }}</p>
            <p>Topic：{{ kafkaLocalCheck.topic }}</p>
            <p>Consumer group：{{ kafkaLocalCheck.consumerGroup }}</p>
            <p>配置：{{ kafkaLocalCheck.configExists ? '已找到' : '缺失' }} · {{ kafkaLocalCheck.configPath }}</p>
          </div>
          <ol class="mt-3 list-decimal space-y-1 pl-5">
            <li v-for="step in kafkaLocalCheck.safeGuide" :key="step">{{ step }}</li>
          </ol>
        </div>
        <div class="mt-4 grid gap-3 text-xs leading-5 text-slate-500 dark:text-slate-400 md:grid-cols-3">
          <p>Kafka：{{ componentDetail(kafkaHealth, 'Kafka 消息服务') }}</p>
          <p>Elasticsearch：{{ componentDetail(elasticsearchHealth, '搜索服务') }}</p>
          <p>Redis：{{ componentDetail(redisHealth, 'Redis') }}</p>
        </div>
      </section>

      <section id="ops-signals" v-if="canOps" v-show="isOpsSectionVisible('ops-signals')" class="grid scroll-mt-24 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article class="metric-card">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="metric-label">搜索服务</p>
              <h2 class="metric-value">{{ searchOnlineText }}</h2>
            </div>
            <span :class="['status-pill', searchStatusPillClass]">
              {{ searchStatusBadge }}
            </span>
          </div>
          <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">
            搜索索引：{{ !status ? '未加载' : status.search.indexReady ? '可用' : '未就绪' }}
          </p>
          <p class="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {{ searchFallbackDetailText }}
          </p>
          <p v-if="status?.search.action" class="mt-2 text-xs leading-5 text-amber-700 dark:text-amber-300">
            {{ status.search.action }}
          </p>
        </article>

        <article class="metric-card">
          <p class="metric-label">待投递事务消息</p>
          <h2 class="metric-value">{{ countText(status?.outbox.byStatus.pending) }}</h2>
          <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">
            当前到期可投递 {{ countText(status?.outbox.duePending) }} 条
          </p>
          <p v-if="status?.outbox.attentionRequired" class="mt-2 text-xs leading-5 text-amber-700 dark:text-amber-300">
            {{ status.outbox.action || status.outbox.message || '事务消息存在待人工处理项' }}
          </p>
        </article>

        <article class="metric-card">
          <p class="metric-label">失败事务消息</p>
          <h2 class="metric-value">{{ countText(status?.outbox.byStatus.failed) }}</h2>
          <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">
            已发送 {{ countText(status?.outbox.byStatus.sent) }} 条
          </p>
        </article>

        <article class="metric-card">
          <p class="metric-label">搜索索引补偿失败</p>
          <h2 class="metric-value">{{ countText(status?.searchIndexRetry.byStatus.failed) }}</h2>
          <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">
            到期可重试 {{ countText(status?.searchIndexRetry.duePending) }} 条
          </p>
          <p class="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {{ searchRetryImpactText }}
          </p>
          <p v-if="status?.searchIndexRetry.attentionRequired" class="mt-2 text-xs leading-5 text-amber-700 dark:text-amber-300">
            {{ status.searchIndexRetry.action || status.searchIndexRetry.message || '搜索索引补偿队列需要处理' }}
          </p>
        </article>

        <article class="metric-card">
          <p class="metric-label">通知补偿失败</p>
          <h2 class="metric-value">{{ countText(status?.notificationRetry?.byStatus.failed) }}</h2>
          <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">
            到期可重放 {{ countText(status?.notificationRetry?.duePending) }} 条
          </p>
          <p v-if="status?.notificationRetry?.attentionRequired" class="mt-2 text-xs leading-5 text-amber-700 dark:text-amber-300">
            {{ status.notificationRetry.action || status.notificationRetry.message || '通知补偿队列需要处理' }}
          </p>
        </article>
      </section>

      <section id="ops-search-analytics" v-show="isOpsSectionVisible('ops-search-analytics')" class="grid scroll-mt-24 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article v-if="canAdmin" v-show="activeOpsPane === 'overview'" class="panel">
          <div class="flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">索引重建任务</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">提交后后台执行，页面会自动轮询任务状态。</p>
            </div>
            <span v-if="task" :class="['status-pill', taskStatusClass]">{{ searchTaskStatusText(task.status) }}</span>
          </div>

          <div v-if="!task" class="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            暂无进行中的重建任务。
          </div>
          <div v-else class="space-y-5 pt-5">
            <div class="grid gap-4 sm:grid-cols-4">
              <div class="task-stat">
                <span>总数</span>
                <strong>{{ task.total }}</strong>
              </div>
              <div class="task-stat">
                <span>已索引</span>
                <strong>{{ task.indexed }}</strong>
              </div>
              <div class="task-stat">
                <span>失败</span>
                <strong>{{ task.failed }}</strong>
              </div>
              <div class="task-stat">
                <span>索引</span>
                <strong class="truncate text-sm">{{ textOrUnavailable(task.indexName) }}</strong>
              </div>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div class="h-full rounded-full bg-primary-600 transition-all" :style="{ width: taskProgress + '%' }" />
            </div>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ task.message || taskTimeText }}
            </p>
          </div>
        </article>
        <article v-if="canOps" v-show="activeOpsPane === 'overview'" class="panel lg:col-span-2">
        <div class="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">搜索运营统计</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">近 30 天热门搜索、无结果词和社区推荐点击。</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <label class="test-data-toggle" title="默认隐藏 E2E、SMOKE、CODEX 等测试数据">
              <input v-model="includeTestData" type="checkbox" @change="reloadGovernanceData" />
              <span>测试数据</span>
            </label>
            <button type="button" class="icon-button" title="刷新搜索统计" :disabled="isSearchAnalyticsLoading" @click="loadSearchAnalytics">
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isSearchAnalyticsLoading }" />
            </button>
          </div>
        </div>

        <div v-if="isSearchAnalyticsLoading" class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          正在加载搜索统计...
        </div>
        <div v-else class="analytics-grid pt-5">
          <div class="analytics-column">
            <div class="analytics-column-head">
              <span>热门搜索词</span>
              <strong>{{ searchAnalytics?.hotKeywords.length || 0 }}</strong>
            </div>
            <div v-if="!searchAnalytics?.hotKeywords.length" class="analytics-empty">暂无搜索记录</div>
            <div v-else class="analytics-list">
              <div v-for="item in searchAnalytics.hotKeywords" :key="`hot-${item.keyword}`" class="analytics-row">
                <span class="analytics-title">{{ textOrUnavailable(item.keyword, '暂无关键词') }}</span>
                <span class="status-pill status-ok">{{ item.count }}</span>
              </div>
            </div>
          </div>

          <div class="analytics-column">
            <div class="analytics-column-head">
              <span>无结果词</span>
              <strong>{{ searchAnalytics?.noResultKeywords.length || 0 }}</strong>
            </div>
            <div v-if="!searchAnalytics?.noResultKeywords.length" class="analytics-empty">暂无无结果记录</div>
            <div v-else class="analytics-list">
              <div v-for="item in searchAnalytics.noResultKeywords" :key="`zero-${item.keyword}`" class="analytics-row">
                <span class="analytics-title">{{ textOrUnavailable(item.keyword, '暂无关键词') }}</span>
                <span class="status-pill status-warn">{{ item.noResultCount || item.count }}</span>
              </div>
            </div>
          </div>

          <div class="analytics-column">
            <div class="analytics-column-head">
              <span>社区推荐点击</span>
              <strong>{{ communityRecommendClicks.length }}</strong>
            </div>
            <div v-if="!communityRecommendClicks.length" class="analytics-empty">暂无点击记录</div>
            <div v-else class="analytics-list">
              <div v-for="item in communityRecommendClicks" :key="`recommend-${item.target || item.company || item.keyword}`" class="analytics-row">
                <span class="analytics-title">{{ textOrUnavailable(item.target || item.company || item.keyword, '暂无推荐项') }}</span>
                <span class="status-pill status-ok">{{ item.count }}</span>
              </div>
            </div>
          </div>
        </div>
        </article>
        <article v-if="canAdmin" class="panel">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">权限状态</h2>
            <button type="button" class="icon-button" title="刷新管理员" :disabled="isAdminsLoading" @click="loadAdmins">
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isAdminsLoading }" />
            </button>
          </div>
          <div class="mt-5 space-y-4">
            <div class="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-950">
              <span class="text-sm text-slate-600 dark:text-slate-300">管理员模式</span>
              <span :class="['status-pill', adminModeClass]">
                {{ adminModeText }}
              </span>
            </div>
            <p class="text-sm leading-6 text-slate-500 dark:text-slate-400">
              生产环境建议使用数据库角色权限或用户编号白名单；本地宽松模式只用于未配置管理员时的开发验证。
            </p>
            <div class="admin-form">
              <input
                v-model.trim="adminForm.uid"
                class="admin-input"
                inputmode="numeric"
                placeholder="用户编号"
                :disabled="isAdminSubmitting"
              />
              <select v-model="adminForm.roleCode" class="admin-input" :disabled="isAdminSubmitting">
                <option value="ADMIN">超级管理员</option>
                <option value="OPS">运维管理员</option>
                <option value="CONTENT_MODERATOR">内容审核员</option>
                <option value="QUESTION_OPERATOR">知识卡运营员</option>
              </select>
              <input
                v-model.trim="adminForm.remark"
                class="admin-input"
                placeholder="备注"
                :disabled="isAdminSubmitting"
              />
              <button type="button" class="primary-button" :disabled="isAdminSubmitting || !adminForm.uid" @click="addAdmin">
                <UserPlus class="h-4 w-4" />
                添加
              </button>
            </div>
            <div v-if="isAdminsLoading" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              正在加载管理员...
            </div>
            <div v-else-if="adminUsers.length === 0" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              尚未配置数据库管理员，当前仍处于本地宽松模式。
            </div>
            <div v-else class="admin-list">
              <div v-for="admin in adminUsers" :key="admin.uid" class="admin-row">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="truncate font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">用户 {{ admin.uid }}</span>
                    <span :class="['status-pill', isAdminEnabled(admin) ? 'status-ok' : 'status-danger']">
                      {{ isAdminEnabled(admin) ? '启用' : '禁用' }}
                    </span>
                  </div>
                  <p class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                    {{ admin.remark || '暂无备注' }} · {{ formatTime(admin.updateTime) }}
                  </p>
                </div>
                <button
                  type="button"
                  :class="['secondary-button', isAdminEnabled(admin) ? 'danger-action' : '']"
                  :disabled="adminActionUid === admin.uid"
                  @click="toggleAdmin(admin)"
                >
                  <Power class="h-4 w-4" :class="{ 'animate-spin': adminActionUid === admin.uid }" />
                  {{ isAdminEnabled(admin) ? '禁用' : '启用' }}
                </button>
              </div>
            </div>
          </div>
        </article>

        <article v-if="canModerate" v-show="activeOpsPane === 'review'" class="panel">
          <div class="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">评论举报审核</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">通过会隐藏评论或整段回复，驳回仅关闭当前举报。</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="item in reportFilters"
                :key="`comment-${item.label}`"
                type="button"
                :class="['filter-button', commentReportStatusFilter === item.value ? 'filter-button-active' : '']"
                @click="setCommentReportStatus(item.value)"
              >
                {{ item.label }}
              </button>
              <label class="test-data-toggle" title="默认隐藏 E2E、SMOKE、CODEX 等测试数据">
                <input v-model="includeTestData" type="checkbox" @change="reloadGovernanceData" />
                <span>测试数据</span>
              </label>
              <button type="button" class="icon-button" title="刷新评论举报" :disabled="isCommentReportsLoading" @click="loadCommentReports">
                <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isCommentReportsLoading }" />
              </button>
            </div>
          </div>

          <div v-if="isCommentReportsLoading" class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            正在加载评论举报...
          </div>
          <div v-else-if="commentReports.length === 0" class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            当前筛选下暂无评论举报。
          </div>
          <div v-else class="comment-report-region">
            <div class="comment-report-desktop-table overflow-x-auto pt-4">
              <table class="ops-table report-table">
                <thead>
                  <tr>
                    <th>举报</th>
                    <th>评论</th>
                    <th>所属帖子</th>
                    <th>说明</th>
                    <th>状态</th>
                    <th>时间</th>
                    <th class="text-right">审核</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="report in pageItems(commentReports, opsPages.commentReports)" :key="report.reportId">
                    <td class="font-mono text-xs">{{ report.reportId }}</td>
                    <td class="max-w-[260px]">
                      <p class="font-mono text-xs font-semibold text-slate-800 dark:text-slate-100">{{ report.commentId }}</p>
                      <p class="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{{ report.commentSummary || '暂无评论摘要' }}</p>
                    </td>
                    <td>
                      <RouterLink class="font-mono text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400" :to="`/post/${report.postId}`">
                        {{ report.postTitle || report.postId }}
                      </RouterLink>
                    </td>
                    <td class="max-w-[260px]">
                      <p class="font-semibold text-slate-800 dark:text-slate-100">{{ report.reason }}</p>
                      <p class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{{ report.detail || '无补充说明' }}</p>
                      <p v-if="report.reviewNote" class="mt-1 truncate text-xs text-primary-600 dark:text-primary-300">处理备注：{{ report.reviewNote }}</p>
                    </td>
                    <td>
                      <span :class="['status-pill', reportStatusClass(report.reportStatus)]">
                        {{ reportStatusText(report.reportStatus) }}
                      </span>
                    </td>
                    <td>{{ formatTime(report.createTime) }}</td>
                    <td>
                      <div v-if="report.reportStatus === 0" class="flex justify-end gap-2">
                        <button
                          type="button"
                          class="secondary-button compact-action danger-action"
                          :disabled="reviewingCommentReportId === report.reportId"
                          @click="openReviewDialog('comment', report, true)"
                        >
                          通过隐藏
                        </button>
                        <button
                          type="button"
                          class="secondary-button compact-action"
                          :disabled="reviewingCommentReportId === report.reportId"
                          @click="openReviewDialog('comment', report, false)"
                        >
                          驳回
                        </button>
                      </div>
                      <span v-else class="block text-right text-xs text-slate-500 dark:text-slate-400">
                        {{ formatTime(report.reviewTime) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="comment-report-mobile-list" aria-label="评论举报移动端审核列表">
              <article v-for="report in pageItems(commentReports, opsPages.commentReports)" :key="`comment-card-${report.reportId}`" class="comment-report-card">
                <div class="comment-report-card-head">
                  <div class="min-w-0">
                    <p class="comment-report-eyebrow">举报 #{{ report.reportId }}</p>
                    <RouterLink class="comment-report-title" :to="`/post/${report.postId}`">
                      {{ report.postTitle || `帖子 ${report.postId}` }}
                    </RouterLink>
                  </div>
                  <span :class="['status-pill', reportStatusClass(report.reportStatus)]">
                    {{ reportStatusText(report.reportStatus) }}
                  </span>
                </div>

                <section class="comment-report-object" aria-label="举报对象">
                  <span class="comment-report-label">举报对象</span>
                  <p class="comment-report-object-id">评论 {{ report.commentId }}</p>
                  <p class="comment-report-summary">{{ report.commentSummary || '暂无评论摘要' }}</p>
                </section>

                <dl class="comment-report-facts">
                  <div class="comment-report-fact">
                    <dt>原因</dt>
                    <dd>{{ report.reason || '未填写原因' }}</dd>
                  </div>
                  <div class="comment-report-fact">
                    <dt>时间</dt>
                    <dd>
                      <time :datetime="String(report.createTime || '')">{{ formatTime(report.createTime) }}</time>
                    </dd>
                  </div>
                </dl>

                <p class="comment-report-detail">{{ report.detail || '无补充说明' }}</p>
                <p v-if="report.reviewNote" class="comment-report-note">处理备注：{{ report.reviewNote }}</p>

                <div v-if="report.reportStatus === 0" class="comment-report-card-actions">
                  <button
                    type="button"
                    class="primary-button compact-action danger-primary"
                    :disabled="reviewingCommentReportId === report.reportId"
                    @click="openReviewDialog('comment', report, true)"
                  >
                    通过隐藏
                  </button>
                  <button
                    type="button"
                    class="secondary-button compact-action"
                    :disabled="reviewingCommentReportId === report.reportId"
                    @click="openReviewDialog('comment', report, false)"
                  >
                    驳回
                  </button>
                </div>
                <p v-else class="comment-report-reviewed">处理时间：{{ formatTime(report.reviewTime) }}</p>
              </article>
            </div>
            <div v-if="shouldPaginate(commentReports.length)" class="section-pager">
              <span>{{ pageRangeText(commentReports.length, opsPages.commentReports) }}</span>
              <div class="section-pager-actions">
                <button type="button" :disabled="currentPage(opsPages.commentReports, commentReports.length) <= 1" @click="turnSectionPage('commentReports', commentReports.length, -1)">上一页</button>
                <button type="button" :disabled="currentPage(opsPages.commentReports, commentReports.length) >= pageCount(commentReports.length)" @click="turnSectionPage('commentReports', commentReports.length, 1)">下一页</button>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section id="ops-outbox" v-if="canOps" v-show="isOpsSectionVisible('ops-outbox')" class="panel scroll-mt-24">
        <div class="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">事务消息投递</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">只展示最近消息，失败消息支持单条和批量重试。</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="secondary-button"
              :disabled="selectedFailedIds.length === 0 || isBatchRetrying || !canRetryOutbox"
              @click="retrySelectedMessages"
            >
              <RotateCcw class="h-4 w-4" :class="{ 'animate-spin': isBatchRetrying }" />
              重试当前页已选 {{ selectedFailedIds.length || '' }}
            </button>
            <button
              v-for="item in outboxFilters"
              :key="item.label"
              type="button"
              :class="['filter-button', outboxStatusFilter === item.value ? 'filter-button-active' : '']"
              @click="setOutboxStatus(item.value)"
            >
              {{ item.label }}
            </button>
          </div>
        </div>

        <div v-if="isOutboxLoading" class="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
          正在加载事务消息...
        </div>
        <div v-else-if="outboxMessages.length === 0" class="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
          当前筛选下暂无消息。
        </div>
        <div v-else class="outbox-list-region">
          <div class="outbox-desktop-table overflow-x-auto">
          <table class="ops-table outbox-table">
            <thead>
              <tr>
                <th>序号</th>
                <th>选择</th>
                <th>ID</th>
                <th>消息主题</th>
                <th>聚合</th>
                <th>状态</th>
                <th>重试</th>
                <th>创建时间</th>
                <th class="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(message, index) in pageItems(outboxMessages, opsPages.outbox, 'outbox')" :key="message.id">
                <td class="ops-row-number">{{ sectionRowNumber(index, opsPages.outbox, 'outbox', outboxMessages.length) }}</td>
                <td>
                  <input
                    v-if="message.msgStatus === 2"
                    type="checkbox"
                    class="h-4 w-4 accent-indigo-600"
                    :checked="selectedFailedIds.includes(message.id)"
                    @change="toggleFailedSelection(message.id)"
                  />
                  <span v-else class="text-xs text-slate-400">不可选</span>
                </td>
                <td class="font-mono text-xs">{{ message.id }}</td>
                <td>{{ message.topic }}</td>
                <td>{{ message.aggregateType }} / {{ message.aggregateId }}</td>
                <td>
                  <span :class="['status-pill', outboxStatusClass(message.msgStatus)]">
                    {{ outboxStatusText(message.msgStatus) }}
                  </span>
                </td>
                <td>{{ message.retryCount }}</td>
                <td>{{ formatTime(message.createTime) }}</td>
                <td>
                  <div class="flex justify-end gap-2">
                    <button type="button" class="icon-button" title="查看详情" @click="openOutboxDetail(message)">
                      <FileText class="h-4 w-4" />
                    </button>
                    <button
                      v-if="message.msgStatus === 2"
                      type="button"
                      class="icon-button danger-action desktop-risk-action"
                      title="重试失败消息"
                      :disabled="retryingId === message.id || !canRetryOutbox"
                      @click="retryMessage(message)"
                    >
                      <RotateCcw class="h-4 w-4" :class="{ 'animate-spin': retryingId === message.id }" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          </div>

          <div class="outbox-mobile-list" aria-label="事务消息移动端列表">
            <article v-for="(message, index) in pageItems(outboxMessages, opsPages.outbox, 'outbox')" :key="`mobile-${message.id}`" class="outbox-card">
              <div class="outbox-card-topline">
                <div class="flex min-w-0 flex-wrap items-center gap-2">
                  <span class="outbox-row-number">序号 {{ sectionRowNumber(index, opsPages.outbox, 'outbox', outboxMessages.length) }}</span>
                  <span :class="['status-pill', outboxStatusClass(message.msgStatus)]">
                    {{ outboxStatusText(message.msgStatus) }}
                  </span>
                  <span class="outbox-retry-count">重试 {{ message.retryCount }}</span>
                </div>
                <div class="outbox-card-actions">
                  <label v-if="message.msgStatus === 2" class="outbox-select-label" title="选择失败消息">
                    <input
                      type="checkbox"
                      class="h-4 w-4 accent-indigo-600"
                      :checked="selectedFailedIds.includes(message.id)"
                      @change="toggleFailedSelection(message.id)"
                    />
                    <span>选中</span>
                  </label>
                  <button type="button" class="icon-button" title="查看详情" @click="openOutboxDetail(message)">
                    <FileText class="h-4 w-4" />
                  </button>
                  <button
                    v-if="message.msgStatus === 2"
                    type="button"
                    class="icon-button danger-action desktop-risk-action"
                    title="重试失败消息"
                    :disabled="retryingId === message.id || !canRetryOutbox"
                    @click="retryMessage(message)"
                  >
                    <RotateCcw class="h-4 w-4" :class="{ 'animate-spin': retryingId === message.id }" />
                  </button>
                </div>
              </div>

              <div class="outbox-card-main">
                <p class="outbox-topic">{{ message.topic }}</p>
                <p class="outbox-aggregate">{{ message.aggregateType }} / {{ message.aggregateId }}</p>
              </div>

              <div class="outbox-card-meta">
                <time :datetime="String(message.createTime)">{{ formatTime(message.createTime) }}</time>
                <details class="outbox-id-detail">
                  <summary>ID</summary>
                  <span>{{ message.id }}</span>
                </details>
              </div>
            </article>
          </div>
          <div v-if="shouldPaginate(outboxMessages.length, 'outbox')" class="section-pager">
            <span>{{ pageRangeText(outboxMessages.length, opsPages.outbox, 'outbox') }}</span>
            <div class="section-pager-actions">
              <button type="button" :disabled="currentPage(opsPages.outbox, sectionTotal('outbox', outboxMessages.length)) <= 1" @click="turnSectionPage('outbox', outboxMessages.length, -1)">上一页</button>
              <button type="button" :disabled="currentPage(opsPages.outbox, sectionTotal('outbox', outboxMessages.length)) >= pageCount(sectionTotal('outbox', outboxMessages.length))" @click="turnSectionPage('outbox', outboxMessages.length, 1)">下一页</button>
            </div>
          </div>
        </div>
      </section>

      <section id="ops-search-retry" v-if="canOps" v-show="isOpsSectionVisible('ops-search-retry')" class="panel scroll-mt-24">
        <div class="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">搜索索引补偿任务</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">查看搜索索引同步失败原因，失败任务可直接重试。</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="secondary-button compact-action"
              :disabled="failedSearchIndexRetryTaskIds.length === 0 || isBatchReplayingSearchIndexTasks"
              @click="replayFailedSearchIndexRetryTasks"
            >
              <RotateCcw class="h-4 w-4" :class="{ 'animate-spin': isBatchReplayingSearchIndexTasks }" />
              重试当前页失败 {{ failedSearchIndexRetryTaskIds.length || '' }}
            </button>
            <button type="button" class="icon-button" title="刷新搜索索引补偿任务" :disabled="isSearchIndexRetryTasksLoading" @click="loadSearchIndexRetryTasks">
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isSearchIndexRetryTasksLoading }" />
            </button>
          </div>
        </div>

        <div class="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-end">
            <label class="field-label flex-1">
              帖子级搜索诊断
              <input
                v-model.trim="postSearchDiagnosticId"
                class="field-input"
                inputmode="numeric"
                placeholder="输入 postId"
                @keyup.enter="runPostSearchDiagnostics"
              />
            </label>
            <button type="button" class="secondary-button" :disabled="isPostSearchDiagnosticsLoading" @click="runPostSearchDiagnostics">
              <Search class="h-4 w-4" :class="{ 'animate-spin': isPostSearchDiagnosticsLoading }" />
              检查召回
            </button>
          </div>
          <div v-if="postSearchDiagnostics" class="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
            <article class="rounded-lg bg-white p-3 dark:bg-slate-900">
              <span class="text-xs text-slate-500 dark:text-slate-400">帖子</span>
              <strong class="mt-1 block text-slate-950 dark:text-slate-50">{{ postSearchDiagnostics.post?.found ? postSearchDiagnostics.post?.title || postSearchDiagnostics.post?.id : '未找到' }}</strong>
              <small class="text-slate-500 dark:text-slate-400">type {{ postSearchDiagnostics.post?.postType || '-' }} / synthetic {{ postSearchDiagnostics.post?.synthetic ? 'yes' : 'no' }}</small>
            </article>
            <article class="rounded-lg bg-white p-3 dark:bg-slate-900">
              <span class="text-xs text-slate-500 dark:text-slate-400">ES 文档</span>
              <strong class="mt-1 block text-slate-950 dark:text-slate-50">{{ postSearchDiagnostics.elasticsearch?.documentFound ? '存在' : '未命中' }}</strong>
              <small class="text-slate-500 dark:text-slate-400">{{ postSearchDiagnostics.elasticsearch?.indexName || 'post_idx' }}</small>
            </article>
            <article class="rounded-lg bg-white p-3 dark:bg-slate-900">
              <span class="text-xs text-slate-500 dark:text-slate-400">应用召回</span>
              <strong class="mt-1 block text-slate-950 dark:text-slate-50">
                默认 {{ postSearchDiagnostics.applicationSearch?.idRecallDefault ? '命中' : '未命中' }} / 测试 {{ postSearchDiagnostics.applicationSearch?.idRecallWithTestData ? '命中' : '未命中' }}
              </strong>
              <small class="text-slate-500 dark:text-slate-400">{{ postSearchDiagnostics.recommendation || 'OK' }}</small>
            </article>
            <article class="rounded-lg bg-white p-3 dark:bg-slate-900">
              <span class="text-xs text-slate-500 dark:text-slate-400">最近补偿任务</span>
              <strong class="mt-1 block text-slate-950 dark:text-slate-50">{{ postSearchDiagnostics.latestRetryTask?.statusText || '无记录' }}</strong>
              <small class="text-slate-500 dark:text-slate-400">{{ postSearchDiagnostics.latestRetryTask?.lastError || postSearchDiagnostics.latestRetryTask?.operation || '无需处理' }}</small>
            </article>
          </div>
        </div>

        <div v-if="isSearchIndexRetryTasksLoading" class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          正在加载搜索索引补偿任务...
        </div>
        <div v-else-if="searchIndexRetryTasks.length === 0" class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          暂无搜索索引补偿任务记录。
        </div>
        <div v-else class="space-y-3 pt-5">
          <div v-for="item in pageItems(searchIndexRetryTasks, opsPages.searchRetry, 'searchRetry')" :key="item.id" class="admin-row task-row">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="truncate font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">{{ item.postId }}</span>
                <span :class="['status-pill', searchIndexRetryTaskClass(item.taskStatus)]">{{ searchIndexRetryTaskText(item.taskStatus) }}</span>
                <span class="text-xs text-slate-500 dark:text-slate-400">{{ item.operation }}</span>
              </div>
              <p class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                {{ item.lastError || formatTime(item.updateTime || item.createTime) }}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs text-slate-500 dark:text-slate-400">重试 {{ item.retryCount }}</span>
              <button
                v-if="item.taskStatus === 2"
                type="button"
                class="secondary-button compact-action danger-action"
                :disabled="replayingSearchIndexTaskId === item.id"
                @click="replaySearchIndexRetryTask(item)"
              >
                <RotateCcw class="h-4 w-4" :class="{ 'animate-spin': replayingSearchIndexTaskId === item.id }" />
                重试
              </button>
            </div>
          </div>
          <div v-if="shouldPaginate(searchIndexRetryTasks.length, 'searchRetry')" class="section-pager">
            <span>{{ pageRangeText(searchIndexRetryTasks.length, opsPages.searchRetry, 'searchRetry') }}</span>
            <div class="section-pager-actions">
              <button type="button" :disabled="currentPage(opsPages.searchRetry, sectionTotal('searchRetry', searchIndexRetryTasks.length)) <= 1" @click="turnSectionPage('searchRetry', searchIndexRetryTasks.length, -1)">上一页</button>
              <button type="button" :disabled="currentPage(opsPages.searchRetry, sectionTotal('searchRetry', searchIndexRetryTasks.length)) >= pageCount(sectionTotal('searchRetry', searchIndexRetryTasks.length))" @click="turnSectionPage('searchRetry', searchIndexRetryTasks.length, 1)">下一页</button>
            </div>
          </div>
        </div>
      </section>

      <section id="ops-notification-retry" v-if="canOps" v-show="isOpsSectionVisible('ops-notification-retry')" class="panel scroll-mt-24">
        <div class="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">通知补偿任务</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">查看通知消费失败原因，失败任务可重放。</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="secondary-button compact-action"
              :disabled="failedNotificationRetryTaskIds.length === 0 || isBatchReplayingNotificationTasks"
              @click="replayFailedNotificationRetryTasks"
            >
              <RotateCcw class="h-4 w-4" :class="{ 'animate-spin': isBatchReplayingNotificationTasks }" />
              重放当前页失败 {{ failedNotificationRetryTaskIds.length || '' }}
            </button>
            <button type="button" class="icon-button" title="刷新通知补偿任务" :disabled="isNotificationRetryTasksLoading" @click="loadNotificationRetryTasks">
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isNotificationRetryTasksLoading }" />
            </button>
          </div>
        </div>

        <div v-if="isNotificationRetryTasksLoading" class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          正在加载通知补偿任务...
        </div>
        <div v-else-if="notificationRetryTasks.length === 0" class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          暂无通知补偿任务记录。
        </div>
        <div v-else class="space-y-3 pt-5">
          <div v-for="item in pageItems(notificationRetryTasks, opsPages.notificationRetry, 'notificationRetry')" :key="item.id" class="admin-row task-row">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="truncate font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">{{ item.dedupKey || item.id }}</span>
                <span :class="['status-pill', notificationRetryTaskClass(item.taskStatus)]">{{ notificationRetryTaskText(item.taskStatus) }}</span>
                <span class="text-xs text-slate-500 dark:text-slate-400">{{ item.scene || '通知消费' }}</span>
              </div>
              <p class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                接收 {{ item.receiverUid }} · 发送 {{ item.senderUid }} · 目标 {{ textOrUnavailable(item.targetId ? String(item.targetId) : '', '无目标') }} · {{ item.lastError || formatTime(item.updateTime || item.createTime) }}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs text-slate-500 dark:text-slate-400">重试 {{ item.retryCount }}</span>
              <button
                v-if="item.taskStatus === 2"
                type="button"
                class="secondary-button compact-action danger-action"
                :disabled="replayingNotificationRetryTaskId === item.id"
                @click="replayNotificationRetryTask(item)"
              >
                <RotateCcw class="h-4 w-4" :class="{ 'animate-spin': replayingNotificationRetryTaskId === item.id }" />
                重放
              </button>
            </div>
          </div>
          <div v-if="shouldPaginate(notificationRetryTasks.length, 'notificationRetry')" class="section-pager">
            <span>{{ pageRangeText(notificationRetryTasks.length, opsPages.notificationRetry, 'notificationRetry') }}</span>
            <div class="section-pager-actions">
              <button type="button" :disabled="currentPage(opsPages.notificationRetry, sectionTotal('notificationRetry', notificationRetryTasks.length)) <= 1" @click="turnSectionPage('notificationRetry', notificationRetryTasks.length, -1)">上一页</button>
              <button type="button" :disabled="currentPage(opsPages.notificationRetry, sectionTotal('notificationRetry', notificationRetryTasks.length)) >= pageCount(sectionTotal('notificationRetry', notificationRetryTasks.length))" @click="turnSectionPage('notificationRetry', notificationRetryTasks.length, 1)">下一页</button>
            </div>
          </div>
        </div>
      </section>

      <section id="ops-ai-review" v-show="isOpsSectionVisible('ops-ai-review')" class="grid scroll-mt-24 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article v-if="canQuestion" class="panel">
          <div class="flex items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">规则/AI 内容结构化任务</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">查看内容结构化来源、规则回退和成本指标，失败任务可直接重试。</p>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" class="secondary-button compact-action" :disabled="isQuestionRebuilding" @click="rebuildQuestions">
                <RotateCcw class="h-4 w-4" :class="{ 'animate-spin': isQuestionRebuilding }" />
                重建知识卡
              </button>
              <button type="button" class="secondary-button compact-action" :disabled="isQuestionIndexRebuilding" @click="rebuildQuestionIndex">
                <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isQuestionIndexRebuilding }" />
                重建索引
              </button>
              <button type="button" class="icon-button" title="刷新结构化任务" :disabled="isAiTasksLoading || isAiTaskMetricsLoading" @click="loadAiOps">
                <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isAiTasksLoading || isAiTaskMetricsLoading }" />
              </button>
            </div>
          </div>

          <div class="ai-metrics-grid">
            <div class="task-stat">
              <span>模型来源</span>
              <strong>{{ aiProviderText(topAiProvider?.name) }}</strong>
              <small>{{ countText(topAiProvider?.count) }} 次</small>
            </div>
            <div class="task-stat">
              <span>规则回退</span>
              <strong>{{ aiFallbackSummary }}</strong>
              <small>辅助来源透明度</small>
            </div>
            <div class="task-stat">
              <span>P95 耗时</span>
              <strong>{{ formatDurationMs(aiTaskMetrics?.p95DurationMs) }}</strong>
              <small>平均 {{ formatDurationMs(aiTaskMetrics?.avgDurationMs) }}</small>
            </div>
            <div class="task-stat">
              <span>消耗量</span>
              <strong>{{ formatTokens(aiTaskMetrics?.totalTokens) }}</strong>
              <small>提示 {{ formatTokens(aiTaskMetrics?.totalPromptTokens) }} / 输出 {{ formatTokens(aiTaskMetrics?.totalCompletionTokens) }}</small>
            </div>
            <div class="task-stat">
              <span>估算成本</span>
              <strong>{{ formatCostMicros(aiTaskMetrics?.estimatedCostMicros) }}</strong>
              <small>{{ topAiError ? `主要错误 ${topAiError.name}` : '暂无错误码' }}</small>
            </div>
          </div>

          <div v-if="aiTaskMetrics?.providerStats?.length" class="ai-provider-list" aria-label="AI 模型来源指标">
            <div v-for="item in aiTaskMetrics.providerStats" :key="item.name" class="ai-provider-row">
              <span>{{ aiProviderText(item.name) }}</span>
              <strong>{{ item.count }}</strong>
              <small>回退 {{ item.fallbackCount }} · {{ formatDurationMs(item.avgDurationMs) }} · 消耗 {{ formatTokens(item.totalTokens) }}</small>
            </div>
          </div>

          <div v-if="isAiTasksLoading" class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            正在加载结构化任务...
          </div>
          <div v-else-if="aiTasks.length === 0" class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            暂无内容结构化任务。
          </div>
          <div v-else class="space-y-3 pt-5">
            <div v-for="item in pageItems(aiTasks, opsPages.aiTasks)" :key="item.id" class="admin-row task-row">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <RouterLink :to="`/post/${item.postId}`" class="truncate font-mono text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400">
                    {{ item.postId }}
                  </RouterLink>
                  <span :class="['status-pill', aiTaskStatusClass(item.taskStatus)]">{{ aiTaskStatusText(item.taskStatus) }}</span>
                </div>
                <p class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                  题目 {{ item.questionCount }} · 重试 {{ item.retryCount }} · {{ aiProviderText(item.provider) }} · {{ aiFallbackText(item.fallbackUsed) }} · {{ formatDurationMs(item.durationMs) }} · 消耗 {{ formatTokens(item.totalTokens) }} · {{ item.errorCode || item.errorMessage || formatTime(item.updateTime || item.createTime) }}
                </p>
              </div>
              <div class="flex flex-wrap justify-end gap-2">
                <button type="button" class="secondary-button compact-action" :disabled="loadingAiTaskDetailId === item.id" @click="openAiTaskDetail(item)">
                  <FileText class="h-4 w-4" />
                  详情
                </button>
                <button
                  v-if="item.taskStatus === 3"
                  type="button"
                  class="secondary-button compact-action danger-action"
                  :disabled="retryingAiTaskId === item.id"
                  @click="retryAiTask(item)"
                >
                  <RotateCcw class="h-4 w-4" :class="{ 'animate-spin': retryingAiTaskId === item.id }" />
                  重试
                </button>
              </div>
            </div>
          </div>
          <div v-if="shouldPaginate(aiTasks.length)" class="section-pager">
            <span>{{ pageRangeText(aiTasks.length, opsPages.aiTasks) }}</span>
            <div class="section-pager-actions">
              <button type="button" :disabled="currentPage(opsPages.aiTasks, aiTasks.length) <= 1" @click="turnSectionPage('aiTasks', aiTasks.length, -1)">上一页</button>
              <button type="button" :disabled="currentPage(opsPages.aiTasks, aiTasks.length) >= pageCount(aiTasks.length)" @click="turnSectionPage('aiTasks', aiTasks.length, 1)">下一页</button>
            </div>
          </div>
        </article>

        <article v-if="canQuestion" class="panel">
          <div class="flex items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">知识卡索引任务</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">知识卡搜索索引重建会展示总数、已索引、失败和状态。</p>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="questionIndexTask" :class="['status-pill', questionIndexTaskStatusClass]">{{ questionIndexTask.status }}</span>
              <button type="button" class="icon-button" title="刷新知识卡索引任务" :disabled="isQuestionIndexTasksLoading" @click="loadQuestionIndexTasks">
                <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isQuestionIndexTasksLoading }" />
              </button>
            </div>
          </div>

          <div v-if="questionIndexTask" class="space-y-5 pt-5">
            <div class="grid gap-4 sm:grid-cols-4">
              <div class="task-stat">
                <span>总数</span>
                <strong>{{ questionIndexTask.total }}</strong>
              </div>
              <div class="task-stat">
                <span>已索引</span>
                <strong>{{ questionIndexTask.indexed }}</strong>
              </div>
              <div class="task-stat">
                <span>失败</span>
                <strong>{{ questionIndexTask.failed }}</strong>
              </div>
              <div class="task-stat">
                <span>索引</span>
                <strong class="truncate text-sm">{{ textOrUnavailable(questionIndexTask.indexName) }}</strong>
              </div>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div class="h-full rounded-full bg-primary-600 transition-all" :style="{ width: questionIndexTaskProgress + '%' }" />
            </div>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ questionIndexTask.message || questionIndexTaskTimeText }}
            </p>
          </div>

          <div class="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
            <div v-if="isQuestionIndexTasksLoading" class="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              正在加载知识卡索引任务...
            </div>
            <div v-else-if="recentQuestionIndexTasks.length === 0" class="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              暂无知识卡索引任务记录。
            </div>
            <div v-else class="space-y-3">
              <div v-for="item in pageItems(recentQuestionIndexTasks, opsPages.questionIndexTasks)" :key="item.taskId" class="admin-row task-row">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="truncate font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">任务 {{ shortId(item.taskId) }}</span>
                    <span :class="['status-pill', searchTaskStatusClass(item.status)]">{{ searchTaskStatusText(item.status) }}</span>
                  </div>
                  <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    已索引 {{ item.indexed }} / {{ item.total }}，失败 {{ item.failed }} · {{ formatTime(item.updatedAt || item.createdAt) }}
                  </p>
                </div>
                <strong class="text-sm text-slate-700 dark:text-slate-200">索引 {{ textOrUnavailable(item.indexName, '未记录') }}</strong>
              </div>
            </div>
            <div v-if="shouldPaginate(recentQuestionIndexTasks.length)" class="section-pager">
              <span>{{ pageRangeText(recentQuestionIndexTasks.length, opsPages.questionIndexTasks) }}</span>
              <div class="section-pager-actions">
                <button type="button" :disabled="currentPage(opsPages.questionIndexTasks, recentQuestionIndexTasks.length) <= 1" @click="turnSectionPage('questionIndexTasks', recentQuestionIndexTasks.length, -1)">上一页</button>
                <button type="button" :disabled="currentPage(opsPages.questionIndexTasks, recentQuestionIndexTasks.length) >= pageCount(recentQuestionIndexTasks.length)" @click="turnSectionPage('questionIndexTasks', recentQuestionIndexTasks.length, 1)">下一页</button>
              </div>
            </div>
          </div>
        </article>

        <article v-if="canAdmin" v-show="activeOpsPane === 'review'" class="panel">
          <div class="flex items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">最近索引任务</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">保留本次启动周期内最近的后台重建记录。</p>
            </div>
            <button type="button" class="icon-button" title="刷新索引任务" :disabled="isTasksLoading" @click="loadTasks">
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isTasksLoading }" />
            </button>
          </div>

          <div v-if="isTasksLoading" class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            正在加载索引任务...
          </div>
          <div v-else-if="recentTasks.length === 0" class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            暂无索引任务记录。
          </div>
          <div v-else class="space-y-3 pt-5">
            <div v-for="item in pageItems(recentTasks, opsPages.searchTasks)" :key="item.taskId" class="admin-row task-row">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="truncate font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">任务 {{ shortId(item.taskId) }}</span>
                  <span :class="['status-pill', searchTaskStatusClass(item.status)]">{{ searchTaskStatusText(item.status) }}</span>
                </div>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  已索引 {{ item.indexed }} / {{ item.total }}，失败 {{ item.failed }} · {{ formatTime(item.updatedAt || item.createdAt) }}
                </p>
              </div>
              <strong class="text-sm text-slate-700 dark:text-slate-200">索引 {{ textOrUnavailable(item.indexName, '未记录') }}</strong>
            </div>
            <div v-if="shouldPaginate(recentTasks.length)" class="section-pager">
              <span>{{ pageRangeText(recentTasks.length, opsPages.searchTasks) }}</span>
              <div class="section-pager-actions">
                <button type="button" :disabled="currentPage(opsPages.searchTasks, recentTasks.length) <= 1" @click="turnSectionPage('searchTasks', recentTasks.length, -1)">上一页</button>
                <button type="button" :disabled="currentPage(opsPages.searchTasks, recentTasks.length) >= pageCount(recentTasks.length)" @click="turnSectionPage('searchTasks', recentTasks.length, 1)">下一页</button>
              </div>
            </div>
          </div>
        </article>

        <article v-if="canModerate" v-show="activeOpsPane === 'review'" class="panel">
          <div class="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">帖子举报审核</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">通过会下架帖子，驳回仅关闭当前举报。</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="item in reportFilters"
                :key="item.label"
                type="button"
                :class="['filter-button', reportStatusFilter === item.value ? 'filter-button-active' : '']"
                @click="setReportStatus(item.value)"
              >
                {{ item.label }}
              </button>
              <label class="test-data-toggle" title="默认隐藏 E2E、SMOKE、CODEX 等测试数据">
                <input v-model="includeTestData" type="checkbox" @change="reloadGovernanceData" />
                <span>测试数据</span>
              </label>
              <button type="button" class="icon-button" title="刷新举报列表" :disabled="isReportsLoading" @click="loadReports">
                <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isReportsLoading }" />
              </button>
            </div>
          </div>

          <div v-if="isReportsLoading" class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            正在加载举报...
          </div>
          <div v-else-if="postReports.length === 0" class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            当前筛选下暂无举报。
          </div>
          <div v-else class="post-report-region">
            <div class="post-report-desktop-table overflow-x-auto pt-4">
              <table class="ops-table report-table">
                <thead>
                  <tr>
                    <th>举报</th>
                    <th>帖子</th>
                    <th>说明</th>
                    <th>状态</th>
                    <th>时间</th>
                    <th class="text-right">审核</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="report in pageItems(postReports, opsPages.postReports)" :key="report.reportId">
                    <td class="font-mono text-xs">{{ report.reportId }}</td>
                    <td>
                      <RouterLink class="font-mono text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400" :to="`/post/${report.postId}`">
                        {{ report.postTitle || report.postId }}
                      </RouterLink>
                      <p class="mt-1 line-clamp-2 max-w-[260px] text-xs text-slate-500 dark:text-slate-400">{{ report.postSummary || '暂无帖子摘要' }}</p>
                    </td>
                    <td class="max-w-[260px]">
                      <p class="font-semibold text-slate-800 dark:text-slate-100">{{ report.reason }}</p>
                      <p class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{{ report.detail || '无补充说明' }}</p>
                      <p v-if="report.reviewNote" class="mt-1 truncate text-xs text-primary-600 dark:text-primary-300">处理备注：{{ report.reviewNote }}</p>
                    </td>
                    <td>
                      <span :class="['status-pill', reportStatusClass(report.reportStatus)]">
                        {{ reportStatusText(report.reportStatus) }}
                      </span>
                    </td>
                    <td>{{ formatTime(report.createTime) }}</td>
                    <td>
                      <div v-if="report.reportStatus === 0" class="flex justify-end gap-2">
                        <button
                          type="button"
                          class="secondary-button compact-action danger-action"
                          :disabled="reviewingReportId === report.reportId"
                          @click="openReviewDialog('post', report, true)"
                        >
                          通过下架
                        </button>
                        <button
                          type="button"
                          class="secondary-button compact-action"
                          :disabled="reviewingReportId === report.reportId"
                          @click="openReviewDialog('post', report, false)"
                        >
                          驳回
                        </button>
                      </div>
                      <span v-else class="block text-right text-xs text-slate-500 dark:text-slate-400">
                        {{ formatTime(report.reviewTime) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="post-report-mobile-list" aria-label="帖子举报移动端审核列表">
              <article v-for="report in pageItems(postReports, opsPages.postReports)" :key="`post-card-${report.reportId}`" class="comment-report-card">
                <div class="comment-report-card-head">
                  <div class="min-w-0">
                    <p class="comment-report-eyebrow">举报 #{{ report.reportId }}</p>
                    <RouterLink class="comment-report-title" :to="`/post/${report.postId}`">
                      {{ report.postTitle || `帖子 ${report.postId}` }}
                    </RouterLink>
                  </div>
                  <span :class="['status-pill', reportStatusClass(report.reportStatus)]">
                    {{ reportStatusText(report.reportStatus) }}
                  </span>
                </div>

                <section class="comment-report-object" aria-label="举报帖子">
                  <span class="comment-report-label">帖子摘要</span>
                  <p class="comment-report-summary">{{ report.postSummary || '暂无帖子摘要' }}</p>
                </section>

                <dl class="comment-report-facts">
                  <div class="comment-report-fact">
                    <dt>举报原因</dt>
                    <dd>{{ report.reason || '未填写原因' }}</dd>
                  </div>
                  <div class="comment-report-fact">
                    <dt>举报时间</dt>
                    <dd>
                      <time :datetime="String(report.createTime || '')">{{ formatTime(report.createTime) }}</time>
                    </dd>
                  </div>
                </dl>

                <p class="comment-report-detail">{{ report.detail || '无补充说明' }}</p>
                <p v-if="report.reviewNote" class="comment-report-note">处理备注：{{ report.reviewNote }}</p>

                <div v-if="report.reportStatus === 0" class="comment-report-card-actions">
                  <button
                    type="button"
                    class="secondary-button danger-action"
                    :disabled="reviewingReportId === report.reportId"
                    @click="openReviewDialog('post', report, true)"
                  >
                    通过下架
                  </button>
                  <button
                    type="button"
                    class="secondary-button"
                    :disabled="reviewingReportId === report.reportId"
                    @click="openReviewDialog('post', report, false)"
                  >
                    驳回
                  </button>
                </div>
                <p v-else class="comment-report-reviewed">处理时间：{{ formatTime(report.reviewTime) }}</p>
              </article>
            </div>
            <div v-if="shouldPaginate(postReports.length)" class="section-pager">
              <span>{{ pageRangeText(postReports.length, opsPages.postReports) }}</span>
              <div class="section-pager-actions">
                <button type="button" :disabled="currentPage(opsPages.postReports, postReports.length) <= 1" @click="turnSectionPage('postReports', postReports.length, -1)">上一页</button>
                <button type="button" :disabled="currentPage(opsPages.postReports, postReports.length) >= pageCount(postReports.length)" @click="turnSectionPage('postReports', postReports.length, 1)">下一页</button>
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>

    <div v-if="selectedOutbox" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" @click.self="closeOutboxDetail">
      <article class="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="outbox-detail-title" tabindex="-1">
        <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h3 id="outbox-detail-title" class="text-lg font-semibold text-slate-950 dark:text-slate-50">事务消息详情</h3>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ selectedOutbox.topic }} / {{ selectedOutbox.id }}</p>
          </div>
          <button ref="outboxCloseButton" type="button" class="secondary-button" @click="closeOutboxDetail">关闭</button>
        </div>
        <div class="max-h-[65vh] space-y-4 overflow-auto p-5">
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="task-stat">
              <span>状态</span>
              <strong>{{ outboxStatusText(selectedOutbox.msgStatus) }}</strong>
            </div>
            <div class="task-stat">
              <span>重试次数</span>
              <strong>{{ selectedOutbox.retryCount }}</strong>
            </div>
            <div class="task-stat">
              <span>下次重试</span>
              <strong class="text-sm">{{ formatTime(selectedOutbox.nextRetryTime) }}</strong>
            </div>
          </div>
          <pre class="payload-box">{{ formatPayload(selectedOutbox.payload) }}</pre>
        </div>
      </article>
    </div>

    <div v-if="reviewDialog.open" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" @click.self="closeReviewDialog">
      <article class="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="report-review-title" tabindex="-1">
        <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h3 id="report-review-title" class="text-lg font-semibold text-slate-950 dark:text-slate-50">{{ reviewDialogTitle }}</h3>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">备注会写入审核记录和审计日志。</p>
          </div>
          <button type="button" class="secondary-button" :disabled="isReviewSubmitting" @click="closeReviewDialog">取消</button>
        </div>
        <div class="space-y-4 p-5">
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
            <p class="font-semibold text-slate-900 dark:text-slate-100">{{ reviewContentTitle }}</p>
            <p class="mt-2 leading-6 text-slate-600 dark:text-slate-300">{{ reviewContentSummary }}</p>
            <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">举报原因：{{ reviewDialog.report?.reason || '未填写原因' }} · {{ reviewDialog.report?.detail || '无补充说明' }}</p>
          </div>
          <label class="block text-sm font-bold text-slate-700 dark:text-slate-200">
            审核备注
            <textarea ref="reviewNoteInput" v-model.trim="reviewDialog.note" class="mt-2 field-textarea" rows="4" placeholder="填写处理依据，例如命中广告引流、辱骂、人身攻击，或证据不足予以驳回。" />
          </label>
          <p v-if="reviewDialog.error" class="text-sm font-bold text-rose-600 dark:text-rose-300">{{ reviewDialog.error }}</p>
          <div class="flex justify-end gap-2">
            <button type="button" class="secondary-button" :disabled="isReviewSubmitting" @click="closeReviewDialog">取消</button>
            <button type="button" :class="['primary-button', reviewDialog.approved ? 'danger-primary' : '']" :disabled="isReviewSubmitting" @click="submitReviewDialog">
              {{ isReviewSubmitting ? '提交中...' : reviewDialog.approved ? '确认通过' : '确认驳回' }}
            </button>
          </div>
        </div>
      </article>
    </div>

    <div v-if="selectedAiTaskDetail" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" @click.self="closeAiTaskDetail">
      <article class="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="ai-task-detail-title" tabindex="-1">
        <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <p class="text-xs font-semibold tracking-wide text-slate-400">结构化任务详情</p>
            <h3 id="ai-task-detail-title" class="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">提题任务详情</h3>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">任务 {{ selectedAiTaskDetail.task.id }} / 来源帖 {{ selectedAiTaskDetail.sourcePostId }}</p>
          </div>
          <button ref="aiTaskDetailCloseButton" type="button" class="secondary-button" @click="closeAiTaskDetail">关闭</button>
        </div>
        <div class="max-h-[72vh] space-y-5 overflow-auto p-5">
          <div class="grid gap-3 sm:grid-cols-4">
            <div class="task-stat"><span>状态</span><strong>{{ aiTaskStatusText(selectedAiTaskDetail.task.taskStatus) }}</strong></div>
            <div class="task-stat"><span>提取题数</span><strong>{{ selectedAiTaskDetail.task.questionCount }}</strong></div>
            <div class="task-stat"><span>重试次数</span><strong>{{ selectedAiTaskDetail.task.retryCount }}</strong></div>
            <div class="task-stat"><span>更新时间</span><strong class="text-sm">{{ formatTime(selectedAiTaskDetail.task.updateTime || selectedAiTaskDetail.task.createTime) }}</strong></div>
          </div>

          <div class="grid gap-3 sm:grid-cols-5">
            <div class="task-stat"><span>模型来源</span><strong>{{ aiProviderText(selectedAiTaskDetail.task.provider) }}</strong></div>
            <div class="task-stat"><span>规则回退</span><strong>{{ aiFallbackText(selectedAiTaskDetail.task.fallbackUsed) }}</strong></div>
            <div class="task-stat"><span>耗时</span><strong>{{ formatDurationMs(selectedAiTaskDetail.task.durationMs) }}</strong></div>
            <div class="task-stat"><span>消耗量</span><strong>{{ formatTokens(selectedAiTaskDetail.task.totalTokens) }}</strong></div>
            <div class="task-stat"><span>成本</span><strong>{{ formatCostMicros(selectedAiTaskDetail.task.estimatedCostMicros) }}</strong></div>
          </div>

          <section class="detail-section">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h4>来源帖子</h4>
              <RouterLink :to="`/post/${selectedAiTaskDetail.sourcePostId}`" class="text-sm font-semibold text-primary-600 hover:underline dark:text-primary-400">打开帖子</RouterLink>
            </div>
            <p class="mt-2 font-semibold text-slate-900 dark:text-slate-100">{{ selectedAiTaskDetail.sourcePostTitle || '来源帖子标题不可见' }}</p>
            <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ selectedAiTaskDetail.sourcePostSummary || '暂无来源摘要，可能是帖子已隐藏或内容为空。' }}</p>
          </section>

          <section class="detail-section">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4>知识沉淀回写</h4>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">人工确认后写回来源帖子摘要、FAQ、知识卡和技术栈。</p>
              </div>
              <button type="button" class="primary-button compact-action" :disabled="isKnowledgeReviewSubmitting || !selectedAiTaskDetail.sourcePostId" @click="submitKnowledgeReview">
                应用到帖子
              </button>
            </div>
            <div class="grid gap-3">
              <label class="field-label">
                摘要
                <textarea v-model.trim="knowledgeReviewForm.summary" class="field-textarea" rows="3" maxlength="500" placeholder="沉淀成一段可展示在帖子详情里的社区知识摘要。" />
              </label>
              <label class="field-label">
                常见问答数据
                <textarea v-model.trim="knowledgeReviewForm.faqJson" class="field-textarea font-mono text-xs" rows="4" placeholder='例如 [{"q":"问题","a":"答案"}]' />
              </label>
              <label class="field-label">
                知识卡数据
                <textarea v-model.trim="knowledgeReviewForm.knowledgeCardJson" class="field-textarea font-mono text-xs" rows="4" placeholder='例如 [{"label":"关键结论","value":"可复用的经验"}]' />
              </label>
              <div class="grid gap-3 md:grid-cols-2">
                <label class="field-label">
                  技术栈
                  <input v-model.trim="knowledgeReviewForm.techStacks" class="field-input" placeholder="Redis, Spring Boot, MySQL" />
                </label>
                <label class="field-label">
                  推荐标签
                  <input v-model.trim="knowledgeReviewForm.suggestedTags" class="field-input" placeholder="性能优化, 踩坑记录" />
                </label>
              </div>
              <label class="field-label">
                审核备注
                <textarea v-model.trim="knowledgeReviewForm.note" class="field-textarea" rows="2" maxlength="500" placeholder="记录人审依据，便于后续审计。" />
              </label>
            </div>
          </section>

          <section class="detail-section">
            <h4>错误信息</h4>
            <p class="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">错误码：{{ selectedAiTaskDetail.task.errorCode || '无' }}</p>
            <pre class="payload-box">{{ selectedAiTaskDetail.task.errorMessage || '暂无错误信息' }}</pre>
          </section>

          <section class="detail-section">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4>同帖尝试记录</h4>
              <span class="text-xs font-semibold text-slate-400">{{ selectedAiTaskDetail.retryRecords.length }} 条</span>
            </div>
            <div v-if="selectedAiTaskDetail.retryRecords.length === 0" class="py-5 text-center text-sm text-slate-500 dark:text-slate-400">暂无尝试记录</div>
            <div v-else class="space-y-2">
              <div v-for="record in selectedAiTaskDetail.retryRecords" :key="record.id" class="admin-row task-row">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">{{ record.id }}</span>
                    <span :class="['status-pill', aiTaskStatusClass(record.taskStatus)]">{{ aiTaskStatusText(record.taskStatus) }}</span>
                  </div>
                  <p class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                    题目 {{ record.questionCount }} · 重试 {{ record.retryCount }} · {{ aiProviderText(record.provider) }} · {{ aiFallbackText(record.fallbackUsed) }} · {{ formatDurationMs(record.durationMs) }} · 消耗 {{ formatTokens(record.totalTokens) }} · {{ record.errorCode || record.errorMessage || formatTime(record.updateTime || record.createTime) }}
                  </p>
                </div>
                <button v-if="record.taskStatus === 3" type="button" class="secondary-button compact-action danger-action" :disabled="retryingAiTaskId === record.id" @click="retryAiTask(record)">
                  <RotateCcw class="h-4 w-4" :class="{ 'animate-spin': retryingAiTaskId === record.id }" />
                  重试
                </button>
              </div>
            </div>
          </section>
        </div>
      </article>
      </div>
    </main>
    <RiskConfirmDialog
      :state="riskConfirmState"
      @confirm="resolveRiskConfirm"
      @cancel="cancelRiskConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { Clipboard, FileText, Power, RefreshCw, RotateCcw, Search, UserPlus } from 'lucide-vue-next'
import { RouterLink, useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import RiskConfirmDialog from '@/components/admin/RiskConfirmDialog.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import { OPS_BATCH_RETRY_LIMIT, opsApi, type AdminUserRole, type AiExtractTask, type AiExtractTaskDetail, type AiTaskMetrics, type BatchActionPreview, type HealthComponentStatus, type KafkaLocalCheck, type MyAdminPermissions, type NotificationRetryTask, type OpsStatus, type OutboxMessage, type PostSearchDiagnostics, type QuestionIndexTask, type ReadinessStatus, type SearchAnalytics, type SearchAnalyticsItem, type SearchIndexRetryTask } from '@/api/ops'
import { searchApi, type SearchIndexTask } from '@/api/search'
import { postApi } from '@/api/post'
import { interactionApi } from '@/api/interaction'
import { useAccessibleDialog } from '@/composables/useAccessibleDialog'
import { useRiskConfirm, type RiskConfirmRequest } from '@/composables/useRiskConfirm'
import { useThemeStore } from '@/stores/theme'
import type { ApiId, CommentReport, PostReport } from '@/api/types'
import { isSyntheticVisibleText } from '@/utils/textQuality'

const themeStore = useThemeStore()
const route = useRoute()
const status = ref<OpsStatus | null>(null)
const readiness = ref<ReadinessStatus | null>(null)
const permissions = ref<MyAdminPermissions | null>(null)
const task = ref<SearchIndexTask | null>(null)
const adminUsers = ref<AdminUserRole[]>([])
const outboxMessages = ref<OutboxMessage[]>([])
const searchIndexRetryTasks = ref<SearchIndexRetryTask[]>([])
const notificationRetryTasks = ref<NotificationRetryTask[]>([])
const aiTasks = ref<AiExtractTask[]>([])
const aiTaskMetrics = ref<AiTaskMetrics | null>(null)
const recentTasks = ref<SearchIndexTask[]>([])
const questionIndexTask = ref<QuestionIndexTask | null>(null)
const recentQuestionIndexTasks = ref<QuestionIndexTask[]>([])
const postReports = ref<PostReport[]>([])
const commentReports = ref<CommentReport[]>([])
const selectedOutbox = ref<OutboxMessage | null>(null)
const selectedAiTaskDetail = ref<AiExtractTaskDetail | null>(null)
const searchAnalytics = ref<SearchAnalytics | null>(null)
const lastRefreshAt = ref('')
const isVisibleAnalyticsItem = (item: SearchAnalyticsItem) => {
  return !isSyntheticVisibleText(item.keyword) && !isSyntheticVisibleText(item.company) && !isSyntheticVisibleText(item.target)
}
const cleanSearchAnalytics = (value?: SearchAnalytics | null): SearchAnalytics => ({
  hotKeywords: (value?.hotKeywords || []).filter(isVisibleAnalyticsItem),
  noResultKeywords: (value?.noResultKeywords || []).filter(isVisibleAnalyticsItem),
  prepClicks: (value?.prepClicks || []).filter(isVisibleAnalyticsItem),
  recommendClicks: (value?.recommendClicks || []).filter(isVisibleAnalyticsItem),
})
const communityRecommendClicks = computed(() => {
  const recommendClicks = searchAnalytics.value?.recommendClicks || []
  return recommendClicks.length ? recommendClicks : (searchAnalytics.value?.prepClicks || [])
})
const outboxStatusFilter = ref<number | undefined>(undefined)
const reportStatusFilter = ref<number | undefined>(0)
const commentReportStatusFilter = ref<number | undefined>(0)
const includeTestData = ref(false)
const postSearchDiagnosticId = ref('')
const postSearchDiagnostics = ref<PostSearchDiagnostics | null>(null)
const isPostSearchDiagnosticsLoading = ref(false)
const kafkaLocalCheck = ref<KafkaLocalCheck | null>(null)
const localMiddlewareCommands = [
  {
    label: '只读检查',
    command: 'powershell -ExecutionPolicy Bypass -File C:\\project\\offerlab-java\\scripts\\check-local-middleware.ps1 -SkipNetworkProbe',
  },
  {
    label: '完整探测',
    command: 'powershell -ExecutionPolicy Bypass -File C:\\project\\offerlab-java\\scripts\\check-local-middleware.ps1',
  },
  {
    label: 'Kafka 启动脚本',
    command: 'powershell -ExecutionPolicy Bypass -File C:\\project\\offerlab-java\\scripts\\start-local-kafka.ps1',
  },
]
const OPS_PAGE_SIZE = 6
type OpsPageKey =
  | 'outbox'
  | 'searchRetry'
  | 'notificationRetry'
  | 'aiTasks'
  | 'questionIndexTasks'
  | 'searchTasks'
  | 'postReports'
  | 'commentReports'
const opsPages = reactive<Record<OpsPageKey, number>>({
  outbox: 1,
  searchRetry: 1,
  notificationRetry: 1,
  aiTasks: 1,
  questionIndexTasks: 1,
  searchTasks: 1,
  postReports: 1,
  commentReports: 1,
})
const opsPageTotals = reactive<Partial<Record<OpsPageKey, number>>>({})
const serverPagedOpsSections = new Set<OpsPageKey>(['outbox', 'searchRetry', 'notificationRetry'])
type OpsPaneKey = 'overview' | 'queues' | 'content' | 'review'
const activeOpsPane = ref<OpsPaneKey>('overview')
const knowledgeReviewForm = reactive({
  summary: '',
  faqJson: '',
  knowledgeCardJson: '',
  techStacks: '',
  suggestedTags: '',
  note: '',
})
const adminForm = ref({ uid: '', roleCode: 'ADMIN', remark: '' })
const isLoading = ref(false)
const isReadinessLoading = ref(false)
const isKafkaLocalCheckLoading = ref(false)
const isAdminsLoading = ref(false)
const isAdminSubmitting = ref(false)
const isOutboxLoading = ref(false)
const isSearchIndexRetryTasksLoading = ref(false)
const isNotificationRetryTasksLoading = ref(false)
const isAiTasksLoading = ref(false)
const isAiTaskMetricsLoading = ref(false)
const isTasksLoading = ref(false)
const isQuestionIndexTasksLoading = ref(false)
const isReportsLoading = ref(false)
const isSearchAnalyticsLoading = ref(false)
const isKnowledgeReviewSubmitting = ref(false)
const isCommentReportsLoading = ref(false)
const isSubmitting = ref(false)
const adminActionUid = ref<ApiId | null>(null)
const retryingId = ref<ApiId | null>(null)
const replayingSearchIndexTaskId = ref<ApiId | null>(null)
const replayingNotificationRetryTaskId = ref<ApiId | null>(null)
const isBatchReplayingSearchIndexTasks = ref(false)
const isBatchReplayingNotificationTasks = ref(false)
const retryingAiTaskId = ref<ApiId | null>(null)
const loadingAiTaskDetailId = ref<ApiId | null>(null)
const reviewingReportId = ref<PostReport['reportId'] | null>(null)
const reviewingCommentReportId = ref<CommentReport['reportId'] | null>(null)
const selectedFailedIds = ref<ApiId[]>([])
const isBatchRetrying = ref(false)
const isQuestionRebuilding = ref(false)
const isQuestionIndexRebuilding = ref(false)
const loadError = ref('')
const outboxCloseButton = ref<HTMLButtonElement | null>(null)
const aiTaskDetailCloseButton = ref<HTMLButtonElement | null>(null)
const reviewNoteInput = ref<HTMLTextAreaElement | null>(null)
const reviewDialog = reactive<{
  open: boolean
  type: 'post' | 'comment'
  report: PostReport | CommentReport | null
  approved: boolean
  note: string
  error: string
}>({ open: false, type: 'post', report: null, approved: false, note: '', error: '' })
const isReviewSubmitting = ref(false)
const { riskConfirmState, confirmRisk, resolveRiskConfirm, cancelRiskConfirm } = useRiskConfirm()
let pollTimer: number | undefined
let questionIndexPollTimer: number | undefined

const outboxFilters = [
  { label: '全部', value: undefined },
  { label: '待投递', value: 0 },
  { label: '已发送', value: 1 },
  { label: '失败', value: 2 },
]

const reportFilters = [
  { label: '待审核', value: 0 },
  { label: '已通过', value: 1 },
  { label: '已驳回', value: 2 },
  { label: '全部', value: undefined },
]

const canOps = computed(() => Boolean(permissions.value?.ops || permissions.value?.admin))
const canAdmin = computed(() => Boolean(permissions.value?.admin))
const canQuestion = computed(() => Boolean(permissions.value?.questionOperator || permissions.value?.admin))
const canModerate = computed(() => Boolean(permissions.value?.contentModerator || permissions.value?.admin))
const isTaskActive = computed(() => task.value?.status === 'PENDING' || task.value?.status === 'RUNNING')
const isQuestionIndexTaskActive = computed(() => questionIndexTask.value?.status === 'PENDING' || questionIndexTask.value?.status === 'RUNNING')
const redisHealth = computed(() => readiness.value?.components?.redis || null)
const kafkaHealth = computed(() => readiness.value?.components?.kafka || null)
const elasticsearchHealth = computed(() => readiness.value?.components?.elasticsearch || null)
const schemaHealth = computed(() => readiness.value?.components?.schema || null)
const canRetryOutbox = computed(() => kafkaLocalCheck.value?.readyForOutboxReplay === true)
const kafkaLocalCheckCards = computed(() => {
  const check = kafkaLocalCheck.value
  if (!check) {
    return [
      { label: 'Kafka TCP', value: '未加载', badge: '待检查', className: 'status-muted', detail: '点击刷新只读检查后读取本地 Kafka 端口状态。' },
      { label: 'Topic', value: '未加载', badge: '待检查', className: 'status-muted', detail: '检查 post.published 是否存在，不创建 topic。' },
      { label: 'Consumer group', value: '未加载', badge: '待检查', className: 'status-muted', detail: '检查 feed fanout 消费组是否可见。' },
      { label: 'Storage', value: '未加载', badge: '待检查', className: 'status-muted', detail: '只读检查 Kafka 数据目录和配置文件是否存在。' },
    ]
  }
  const logDirOk = Boolean(check.storage?.logDir?.exists && check.storage.logDir.directory)
  const metadataDirOk = Boolean(check.storage?.metadataDir?.exists && check.storage.metadataDir.directory)
  const storageOk = logDirOk && metadataDirOk && check.configExists
  return [
    {
      label: 'Kafka TCP',
      value: check.endpoint || check.bootstrapServers,
      badge: check.tcpReachable ? '可达' : '不可达',
      className: check.tcpReachable ? 'status-ok' : 'status-warn',
      detail: check.tcpReachable ? '端口可连接，可以继续只读 AdminClient 探测。' : '端口不可达，先按运行手册启动或检查 Kafka。',
    },
    {
      label: 'Topic',
      value: check.topic,
      badge: check.adminProbe?.topicExists ? '存在' : '缺失',
      className: check.adminProbe?.topicExists ? 'status-ok' : 'status-warn',
      detail: check.adminProbe?.message || '只读检查 topic 列表。',
    },
    {
      label: 'Consumer group',
      value: check.consumerGroup,
      badge: check.adminProbe?.consumerGroupSeen ? '已看到' : '未看到',
      className: check.adminProbe?.consumerGroupSeen ? 'status-ok' : 'status-warn',
      detail: `已发现 ${check.adminProbe?.consumerGroupCount ?? 0} 个消费组。`,
    },
    {
      label: 'Storage',
      value: storageOk ? '目录就绪' : '需人工确认',
      badge: storageOk ? '只读通过' : '缺项',
      className: storageOk ? 'status-ok' : 'status-warn',
      detail: `log=${logDirOk ? 'OK' : '缺失'}，metadata=${metadataDirOk ? 'OK' : '缺失'}，config=${check.configExists ? 'OK' : '缺失'}。`,
    },
  ]
})
const readinessHeadline = computed(() => {
  if (isReadinessLoading.value && !readiness.value) return '检测中'
  if (!readiness.value) return '未加载'
  if (readiness.value.status === 'UP') return '可用'
  if (readiness.value.status === 'DEGRADED') return '降级'
  return readiness.value.status || '未知'
})
const readinessBadge = computed(() => readiness.value?.status || (isReadinessLoading.value ? '检测中' : '未加载'))
const readinessStatusClass = computed(() => {
  if (!readiness.value) return 'status-warn'
  if (readiness.value.status === 'UP') return 'status-ok'
  if (readiness.value.status === 'DISABLED' || readiness.value.status === 'UNKNOWN') return 'status-muted'
  if (readiness.value.status === 'DEGRADED') return 'status-warn'
  return 'status-danger'
})
const searchOnlineText = computed(() => {
  if (!status.value) return '未加载'
  if (status.value.search.publicSearchAvailable === false) return '不可用'
  if (status.value.search.publicSearchSource === 'mysql') return '库表兜底'
  if (!status.value.search.enabled && status.value.search.dbFallbackAvailable) return '库表兜底'
  if (!status.value.search.enabled) return '未启用'
  return status.value.search.available && status.value.search.indexReady ? '在线' : '降级'
})
const searchStatusBadge = computed(() => {
  if (!status.value) return '检测中'
  if (status.value.search.publicSearchSource === 'elasticsearch') return '索引'
  if (status.value.search.publicSearchSource === 'mysql') return '库表兜底'
  if (status.value.search.publicSearchAvailable === false) return '不可用'
  return status.value.search.available ? '在线' : '兜底'
})
const searchStatusPillClass = computed(() => {
  if (!status.value) return 'status-warn'
  if (status.value.search.publicSearchSource === 'elasticsearch') return 'status-ok'
  if (status.value.search.publicSearchAvailable === false) return 'status-danger'
  return 'status-warn'
})
const countText = (value?: number | null) => value === null || value === undefined ? '未加载' : String(value)
type OpsPrioritySeverity = 'ok' | 'warn' | 'danger' | 'muted'
type OpsDutyTone = 'ok' | 'warn' | 'danger' | 'muted'
interface OpsDutyRiskCard {
  label: string
  value: string
  detail: string
  tone: OpsDutyTone
}
const countSeverity = (value?: number | null): OpsPrioritySeverity => {
  if (value === null || value === undefined) return 'muted'
  return value > 0 ? 'danger' : 'ok'
}
const schemaMissingCount = computed(() => {
  const missing = schemaHealth.value?.missing
  return Array.isArray(missing) ? missing.length : 0
})
const opsPriorityCards = computed(() => {
  const outboxFailed = status.value?.outbox.byStatus.failed
  const searchRetryFailed = status.value?.searchIndexRetry.byStatus.failed
  const schemaSeverity: OpsPrioritySeverity = schemaHealth.value?.status === 'UP'
    ? 'ok'
    : schemaHealth.value?.status === 'BLOCKED_BY_SCHEMA' || schemaMissingCount.value > 0
      ? 'danger'
      : schemaHealth.value ? 'warn' : 'muted'
  const readinessSeverity: OpsPrioritySeverity = readiness.value?.status === 'UP'
    ? 'ok'
    : readiness.value?.status === 'DEGRADED' ? 'warn' : readiness.value ? 'danger' : 'muted'
  return [
    {
      key: 'readiness',
      label: '健康检查',
      value: readinessBadge.value,
      detail: readiness.value?.status === 'DEGRADED' ? '当前仍有组件降级，先看数据库结构和失败队列' : '整体健康状态',
      action: '看健康',
      targetId: 'ops-health',
      severity: readinessSeverity,
    },
    {
      key: 'schema',
      label: '数据迁移',
      value: schemaMissingCount.value > 0 ? `缺 ${schemaMissingCount.value} 列` : componentHeadline(schemaHealth.value),
      detail: componentDetail(schemaHealth.value, '数据库迁移'),
      action: '看迁移',
      targetId: 'ops-health',
      severity: schemaSeverity,
    },
    {
      key: 'outbox',
      label: '失败事务消息',
      value: countText(outboxFailed),
      detail: `到期待投递 ${countText(status.value?.outbox.duePending)} 条`,
      action: '处理队列',
      targetId: 'ops-outbox',
      severity: countSeverity(outboxFailed),
    },
    {
      key: 'search-retry',
      label: '搜索同步失败',
      value: countText(searchRetryFailed),
      detail: `待处理 ${countText(status.value?.searchIndexRetry.byStatus.pending)} 条`,
      action: '处理队列',
      targetId: 'ops-search-retry',
      severity: countSeverity(searchRetryFailed),
    },
  ]
})
const opsWorkbenchPanes: Array<{
  key: OpsPaneKey
  label: string
  description: string
  sectionIds: string[]
  hint: string
}> = [
  {
    key: 'overview',
    label: '总览',
    description: '健康、依赖、搜索观测',
    sectionIds: ['ops-health', 'ops-signals', 'ops-search-analytics'],
    hint: '当前为总览工作区，只保留健康、依赖、搜索观测和权限概览；需要处理队列时切到补偿队列。',
  },
  {
    key: 'queues',
    label: '补偿队列',
    description: 'Outbox、搜索、通知重试',
    sectionIds: ['ops-outbox', 'ops-search-retry', 'ops-notification-retry'],
    hint: '事务消息、搜索补偿和通知补偿已按数据库分页；批量操作仅作用于当前筛选和当前页可见记录。',
  },
  {
    key: 'content',
    label: '内容与 AI',
    description: '结构化、知识卡、索引任务',
    sectionIds: ['ops-ai-review'],
    hint: 'AI、知识卡和索引任务仍是当前已加载列表内翻页；失败重试前先确认任务来源和影响范围。',
  },
  {
    key: 'review',
    label: '权限与审核',
    description: '管理员、举报、审计',
    sectionIds: ['ops-search-analytics'],
    hint: '权限、举报和审计集中在当前工作区；建议先用状态筛选，再处理待审核项。',
  },
]
const activeOpsPaneConfig = computed(() => opsWorkbenchPanes.find((pane) => pane.key === activeOpsPane.value) || opsWorkbenchPanes[0])
const activeOpsPaneHint = computed(() => activeOpsPaneConfig.value.hint)
const isOpsSectionVisible = (sectionId: string) => activeOpsPaneConfig.value.sectionIds.includes(sectionId)
const setOpsPane = (pane: OpsPaneKey) => {
  activeOpsPane.value = pane
}
const pageCount = (total: number) => Math.max(1, Math.ceil(total / OPS_PAGE_SIZE))
const currentPage = (page: number, total: number) => Math.min(Math.max(page, 1), pageCount(total))
const sectionTotal = (key: OpsPageKey, loadedTotal: number) => opsPageTotals[key] ?? loadedTotal
const shouldPaginate = (total: number, key?: OpsPageKey) => (key ? sectionTotal(key, total) : total) > OPS_PAGE_SIZE
const pageItems = <T,>(items: T[], page: number, key?: OpsPageKey) => {
  if (key && serverPagedOpsSections.has(key)) return items
  const safePage = currentPage(page, items.length)
  const start = (safePage - 1) * OPS_PAGE_SIZE
  return items.slice(start, start + OPS_PAGE_SIZE)
}
const pageRangeText = (total: number, page: number, key?: OpsPageKey) => {
  const effectiveTotal = key ? sectionTotal(key, total) : total
  if (effectiveTotal <= 0) return '本次未加载到记录'
  const safePage = currentPage(page, effectiveTotal)
  const start = (safePage - 1) * OPS_PAGE_SIZE + 1
  const end = Math.min(effectiveTotal, safePage * OPS_PAGE_SIZE)
  const totalText = key && serverPagedOpsSections.has(key) ? `共 ${effectiveTotal} 条` : `已加载最近 ${effectiveTotal} 条`
  const modeText = key && serverPagedOpsSections.has(key) ? '服务端分页' : '当前列表内翻页'
  return `${totalText} · 显示 ${start}-${end} · 第 ${safePage}/${pageCount(effectiveTotal)} 页 · ${modeText}`
}
const sectionRowNumber = (index: number, page: number, key?: OpsPageKey, total = 0) => {
  const effectiveTotal = key ? sectionTotal(key, total) : total
  const safePage = currentPage(page, effectiveTotal)
  return (safePage - 1) * OPS_PAGE_SIZE + index + 1
}
const turnSectionPage = (key: OpsPageKey, total: number, delta: number) => {
  opsPages[key] = currentPage(opsPages[key] + delta, sectionTotal(key, total))
  if (key === 'outbox') void loadOutbox()
  if (key === 'searchRetry') void loadSearchIndexRetryTasks()
  if (key === 'notificationRetry') void loadNotificationRetryTasks()
}
const scrollToOpsSection = (targetId: string) => {
  const matchedPane = opsWorkbenchPanes.find((pane) => pane.sectionIds.includes(targetId))
  if (matchedPane) {
    activeOpsPane.value = matchedPane.key
  }
  setTimeout(() => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 0)
}
const mobileOpsTodoCards = computed(() => [
  {
    label: '整体状态',
    value: readinessHeadline.value,
    detail: '查看核心依赖是否可用',
  },
  {
    label: '失败事务消息',
    value: countText(status.value?.outbox.byStatus.failed),
    detail: `到期待投递 ${countText(status.value?.outbox.duePending)} 条`,
  },
  {
    label: '搜索同步失败',
    value: countText(status.value?.searchIndexRetry.byStatus.failed),
    detail: `待处理 ${countText(status.value?.searchIndexRetry.byStatus.pending)} 条`,
  },
  {
    label: '通知补偿失败',
    value: countText(status.value?.notificationRetry.byStatus.failed),
    detail: `待处理 ${countText(status.value?.notificationRetry.byStatus.pending)} 条`,
  },
])
const isFailedRetryTask = (item: { taskStatus?: number; status?: number; statusText?: string }) =>
  item.taskStatus === 2 || item.status === 3 || item.statusText === '失败'
const recentFailureSamples = computed(() => [
  ...outboxMessages.value
    .filter((item) => item.msgStatus === 2)
    .slice(0, 3)
    .map((item) => `outbox:${item.id} topic=${item.topic} retry=${item.retryCount} next=${formatTime(item.nextRetryTime)}`),
  ...searchIndexRetryTasks.value
    .filter(isFailedRetryTask)
    .slice(0, 3)
    .map((item) => `searchRetry:${item.id} retry=${item.retryCount} error=${item.lastError || '未记录'}`),
  ...notificationRetryTasks.value
    .filter(isFailedRetryTask)
    .slice(0, 3)
    .map((item) => `notificationRetry:${item.id} retry=${item.retryCount} error=${item.lastError || '未记录'}`),
].slice(0, 5))
const opsDueRetryCount = computed(() => (
  (status.value?.outbox.duePending || 0)
  + (status.value?.searchIndexRetry.duePending || 0)
  + (status.value?.notificationRetry.duePending || 0)
))
const opsFailedRetryCount = computed(() => (
  (status.value?.outbox.byStatus.failed || 0)
  + (status.value?.searchIndexRetry.byStatus.failed || 0)
  + (status.value?.notificationRetry.byStatus.failed || 0)
))
const opsDutyRiskTone = computed<OpsDutyTone>(() => {
  if (!status.value || !readiness.value) return 'muted'
  if (
    readiness.value.status === 'DOWN'
    || schemaMissingCount.value > 0
    || status.value.search.publicSearchAvailable === false
  ) {
    return 'danger'
  }
  if (
    readiness.value.status === 'DEGRADED'
    || opsFailedRetryCount.value > 0
    || status.value.search.publicSearchSource === 'mysql'
  ) {
    return 'warn'
  }
  return 'ok'
})
const opsDutyRiskLevelText = computed(() => {
  if (opsDutyRiskTone.value === 'danger') return '高风险'
  if (opsDutyRiskTone.value === 'warn') return '需关注'
  if (opsDutyRiskTone.value === 'ok') return '稳定'
  return '等待加载'
})
const opsDutyRiskLevelClass = computed(() => {
  if (opsDutyRiskTone.value === 'danger') return 'status-danger'
  if (opsDutyRiskTone.value === 'warn') return 'status-warn'
  if (opsDutyRiskTone.value === 'ok') return 'status-ok'
  return 'status-muted'
})
const opsDutyCurrentRisk = computed(() => {
  if (!status.value) return '等待读取运维状态。'
  if (schemaMissingCount.value > 0) return `数据库结构缺 ${schemaMissingCount.value} 项，先暂停批量重试。`
  if (status.value.search.publicSearchAvailable === false) return '公开搜索不可用，用户无法稳定发现社区知识。'
  if (readiness.value?.status === 'DEGRADED') return '核心依赖存在降级，需要先确认是否影响写入、搜索或通知链路。'
  if (opsFailedRetryCount.value > 0) return `共有 ${opsFailedRetryCount.value} 条失败补偿任务需要人工判断。`
  if (status.value.search.publicSearchSource === 'mysql') return '公开搜索正在使用数据库兜底，排序和召回能力会受限。'
  return '暂无阻断性风险，继续观察失败队列和 AI 知识沉淀任务。'
})
const opsDutyImpactScope = computed(() => {
  if (!status.value) return '影响范围未加载。'
  const scopes: string[] = []
  if (status.value.search.publicSearchAvailable === false) scopes.push('搜索与发现入口')
  else if (status.value.search.publicSearchSource === 'mysql') scopes.push('搜索排序和召回质量')
  if ((status.value.searchIndexRetry.byStatus.failed || 0) > 0) scopes.push('新内容进入索引的时效')
  if ((status.value.outbox.byStatus.failed || 0) > 0) scopes.push('事务消息驱动的异步一致性')
  if ((status.value.notificationRetry.byStatus.failed || 0) > 0) scopes.push('站内通知触达')
  if (aiTaskMetrics.value?.failedCount) scopes.push('AI 摘要、FAQ、知识卡生成')
  return scopes.length ? scopes.join('、') : '暂无已知用户可感知影响。'
})
const opsDutySuggestedAction = computed(() => {
  if (!status.value) return '先刷新状态并复制诊断包。'
  if (schemaMissingCount.value > 0) return '先处理数据库迁移，再恢复重试和审核动作。'
  if (status.value.search.publicSearchAvailable === false) return '先恢复搜索引擎或数据库兜底，再签收相关告警。'
  if (opsFailedRetryCount.value > 0) return '先打开补偿队列看失败样本；批量重试必须经过后端预览、二次确认和原因备注。'
  if (aiTaskMetrics.value?.failedCount) return '查看内容与 AI 面板，优先重试知识沉淀失败任务。'
  return '保持只读观察，必要时复制诊断包给后端或值班同学。'
})
const opsDutyRetryBenefit = computed(() => {
  if (!status.value) return '重试收益未加载。'
  if (opsDueRetryCount.value <= 0) return '当前没有到期可执行的批量补偿，优先单条排查。'
  return `预计可恢复 ${opsDueRetryCount.value} 条到期补偿任务；执行前以预览中的可执行数量和跳过原因作为准入。`
})
const opsDutyRiskCards = computed<OpsDutyRiskCard[]>(() => [
  {
    label: '当前风险',
    value: opsDutyRiskLevelText.value,
    detail: opsDutyCurrentRisk.value,
    tone: opsDutyRiskTone.value,
  },
  {
    label: '影响范围',
    value: opsDutyImpactScope.value,
    detail: '帮助判断是用户可感知事故、质量退化，还是后台补偿积压。',
    tone: opsDutyRiskTone.value === 'danger' ? 'danger' : opsDutyRiskTone.value === 'muted' ? 'muted' : 'warn',
  },
  {
    label: '建议动作',
    value: opsDutySuggestedAction.value,
    detail: '高风险写操作需保留原因、审计记录和预览 nonce。',
    tone: opsFailedRetryCount.value > 0 ? 'warn' : opsDutyRiskTone.value,
  },
  {
    label: '重试收益预估',
    value: opsDutyRetryBenefit.value,
    detail: '批量重试只应作用于当前筛选、当前页和后端确认可执行对象。',
    tone: opsDueRetryCount.value > 0 ? 'warn' : 'ok',
  },
])
const localOpsWindow = computed(() => ({
  windowMinutes: status.value?.opsWindow?.windowMinutes || 15,
  thresholdBreached: Boolean(status.value?.opsWindow?.thresholdBreached || opsFailedRetryCount.value > 0 || opsDueRetryCount.value >= 10),
  failedTotal: status.value?.opsWindow?.failedTotal ?? opsFailedRetryCount.value,
  dueTotal: status.value?.opsWindow?.dueTotal ?? opsDueRetryCount.value,
  pendingTotal: status.value?.opsWindow?.pendingTotal ?? (
    (status.value?.outbox.byStatus.pending || 0)
    + (status.value?.searchIndexRetry.byStatus.pending || 0)
    + (status.value?.notificationRetry.byStatus.pending || 0)
  ),
  impact: status.value?.opsWindow?.impact || opsDutyImpactScope.value,
  suggestedAction: status.value?.opsWindow?.suggestedAction || opsDutySuggestedAction.value,
  thresholds: {
    failedTotalWarn: status.value?.opsWindow?.thresholds?.failedTotalWarn ?? 1,
    dueTotalWarn: status.value?.opsWindow?.thresholds?.dueTotalWarn ?? 10,
    pendingQueueWarn: status.value?.opsWindow?.thresholds?.pendingQueueWarn ?? 50,
  },
}))
const opsWindowThresholdText = computed(() => localOpsWindow.value.thresholdBreached ? '超过阈值' : '阈值内')
const opsWindowCards = computed(() => [
  {
    label: '失败总量',
    value: countText(localOpsWindow.value.failedTotal),
    detail: `告警阈值 ${countText(localOpsWindow.value.thresholds.failedTotalWarn)} 条，覆盖 Outbox、搜索补偿和通知补偿。`,
  },
  {
    label: '到期补偿',
    value: countText(localOpsWindow.value.dueTotal),
    detail: `15 分钟窗口阈值 ${countText(localOpsWindow.value.thresholds.dueTotalWarn)} 条，超过后建议先预览影响。`,
  },
  {
    label: '待处理积压',
    value: countText(localOpsWindow.value.pendingTotal),
    detail: `单队列积压参考阈值 ${countText(localOpsWindow.value.thresholds.pendingQueueWarn)} 条。`,
  },
  {
    label: '窗口建议',
    value: localOpsWindow.value.thresholdBreached ? '需要处理' : '继续观察',
    detail: localOpsWindow.value.suggestedAction,
  },
])
const opsDiagnosticPack = computed(() => [
  '# OfferLab 运维诊断包',
  `生成时间：${formatTime(new Date().toISOString())}`,
  `页面刷新：${lastRefreshAt.value || '未记录'}`,
  '',
  '## 健康状态',
  `readiness：${readiness.value?.status || '未加载'}`,
  `搜索：${searchOnlineText.value} / ${searchStatusBadge.value}`,
  `数据库结构：${componentHeadline(schemaHealth.value)}`,
  `Redis：${componentHeadline(redisHealth.value)}`,
  `Kafka：${componentHeadline(kafkaHealth.value)}`,
  `Elasticsearch：${componentHeadline(elasticsearchHealth.value)}`,
  '',
  '## 队列摘要',
  `失败事务消息：${countText(status.value?.outbox.byStatus.failed)}，到期待投递：${countText(status.value?.outbox.duePending)}`,
  `搜索同步失败：${countText(status.value?.searchIndexRetry.byStatus.failed)}，待处理：${countText(status.value?.searchIndexRetry.byStatus.pending)}`,
  `通知补偿失败：${countText(status.value?.notificationRetry.byStatus.failed)}，待处理：${countText(status.value?.notificationRetry.byStatus.pending)}`,
  '',
  '## 值班判断',
  `当前风险：${opsDutyRiskLevelText.value}`,
  `影响范围：${opsDutyImpactScope.value}`,
  `建议动作：${opsDutySuggestedAction.value}`,
  `重试收益预估：${opsDutyRetryBenefit.value}`,
  `15 分钟窗口：${opsWindowThresholdText.value}`,
  `窗口失败总量：${countText(localOpsWindow.value.failedTotal)}，到期补偿：${countText(localOpsWindow.value.dueTotal)}，积压：${countText(localOpsWindow.value.pendingTotal)}`,
  '',
  '## AI 知识沉淀指标',
  `任务成功率：${formatPercent(aiTaskSuccessRate.value)}`,
  `P95 耗时：${formatDurationMs(aiTaskMetrics.value?.p95DurationMs)}`,
  `Token 消耗：${formatTokens(aiTaskMetrics.value?.totalTokens)}`,
  `估算成本：${formatCostMicros(aiTaskMetrics.value?.estimatedCostMicros)}`,
  '',
  '## 最近失败样本',
  ...(recentFailureSamples.value.length ? recentFailureSamples.value.map((item) => `- ${item}`) : ['- 暂无当前页失败样本']),
].join('\n'))

const copyOpsDiagnosticPack = async () => {
  try {
    await navigator.clipboard.writeText(opsDiagnosticPack.value)
    toast.success('诊断包已复制')
  } catch {
    toast.error('复制诊断包失败，请刷新后重试')
  }
}
const copyLocalMiddlewareCommand = async (command: string) => {
  try {
    await navigator.clipboard.writeText(command)
    toast.success('命令已复制')
  } catch {
    toast.error('复制命令失败')
  }
}

const runPostSearchDiagnostics = async () => {
  const postId = postSearchDiagnosticId.value.trim()
  if (!/^\d+$/.test(postId)) {
    toast.warning('请输入数字帖子 ID')
    return
  }
  isPostSearchDiagnosticsLoading.value = true
  try {
    const res = await opsApi.getPostSearchDiagnostics(postId)
    postSearchDiagnostics.value = res.data || null
    toast.success('帖子搜索诊断已更新')
  } catch (error: any) {
    postSearchDiagnostics.value = null
    toast.error(getErrorMessage(error, '帖子搜索诊断失败'))
  } finally {
    isPostSearchDiagnosticsLoading.value = false
  }
}

const searchFallbackDetailText = computed(() => {
  if (!status.value) return '等待读取 /api/v1/ops/status'
  if (status.value.search.message) return status.value.search.message
  if (status.value.search.publicSearchAvailable === false) {
    return '搜索引擎和数据库兜底都不可用，公开搜索需要先恢复依赖后再签收。'
  }
  if (status.value.search.publicSearchSource === 'mysql') {
    const mode = status.value.search.fallbackMode === 'compat' ? '兼容模式' : '完整标签治理模式'
    return `公开搜索已由数据库兜底接管（${mode}），召回完整性和排序能力会受限。`
  }
  if (!status.value.search.enabled) {
    return '搜索服务未启用，公开搜索使用数据库兜底；失败补偿不会阻断用户搜索入口。'
  }
  if (status.value.search.available && status.value.search.indexReady) {
    return '搜索引擎索引在线，公开搜索优先使用索引；失败补偿用于修复后续同步。'
  }
  return '搜索引擎当前不可用或索引未就绪，公开搜索会走数据库兜底；搜索同步补偿失败数不等同于公开搜索不可用。'
})
const searchRetryImpactText = computed(() => {
  if (!status.value) return '等待读取补偿任务状态'
  const failed = status.value.searchIndexRetry.byStatus.failed || 0
  if (failed <= 0) return '暂无失败补偿任务，索引同步队列没有待人工处理项。'
  if (status.value.search.publicSearchSource === 'mysql' || !status.value.search.available || !status.value.search.indexReady) {
    return `已记录 ${failed} 条失败任务；当前公开搜索由数据库兜底，用户可继续搜索，建议恢复搜索引擎后批量重放。`
  }
  return `已记录 ${failed} 条失败任务；用户搜索仍可用，建议从下方失败列表重放以补齐索引。`
})
const adminModeText = computed(() => {
  if (!status.value) return '未加载'
  if (status.value.adminMode === 'RBAC') return '角色权限'
  if (status.value.adminMode === 'WHITELIST') return '白名单'
  if (status.value.adminMode === 'RBAC_EMPTY') return '角色权限未配置'
  if (status.value.adminMode === 'LOCKED') return '未开放'
  if (status.value.adminMode === 'LOCAL_OPEN') return '本地开放'
  return status.value.adminMode
})
const adminModeClass = computed(() => {
  if (!status.value) return 'status-warn'
  if (status.value.adminMode === 'LOCKED') return 'status-danger'
  if (status.value.adminMode === 'LOCAL_OPEN' || status.value.adminMode === 'RBAC_EMPTY') return 'status-warn'
  return 'status-ok'
})
const adminModeDetailText = computed(() => {
  if (!status.value) return '等待读取 /api/v1/ops/status'
  if (status.value.adminMode === 'LOCAL_OPEN') return '本地开放仅限本机开发验证；演示、预发和生产环境应使用角色权限或白名单。'
  if (status.value.adminMode === 'RBAC') return '当前使用数据库角色权限，按用户角色授予后台权限。'
  if (status.value.adminMode === 'WHITELIST') return '当前使用用户编号白名单，适合小范围运维兜底。'
  if (status.value.adminMode === 'RBAC_EMPTY') return '角色权限已开启但暂无管理员记录，请先配置管理员后再开放操作。'
  if (status.value.adminMode === 'LOCKED') return '当前未开放后台权限。'
  return '请确认当前 profile 与权限配置是否符合预期。'
})

const componentHeadline = (component?: HealthComponentStatus | null) => {
  if (!component) return isReadinessLoading.value ? '检测中' : '未加载'
  if (component.status === 'BLOCKED_BY_SCHEMA') return '待迁移'
  if (component.status === 'DISABLED_BY_CONFIG') return '配置关闭'
  if (component.status === 'DISABLED') return '未启用'
  if (component.status === 'UP') return '可达'
  if (component.status === 'DEGRADED') return '降级'
  if (component.status === 'DOWN') return '不可达'
  return component.status || '未知'
}

const componentBadgeText = (component?: HealthComponentStatus | null) => {
  if (!component) return isReadinessLoading.value ? '检测中' : '未加载'
  if (component.status === 'BLOCKED_BY_SCHEMA') return '迁移阻断'
  if (component.status === 'DISABLED_BY_CONFIG') return '配置关闭'
  if (component.status === 'DISABLED') return '未启用'
  if (component.status === 'UP') return '可达'
  if (component.status === 'DEGRADED') return '降级'
  if (component.status === 'DOWN') return '不可达'
  return component.status || '未知'
}

const componentStatusClass = (component?: HealthComponentStatus | null) => {
  if (!component) return 'status-warn'
  if (component.status === 'UP') return 'status-ok'
  if (component.status === 'DISABLED' || component.status === 'DISABLED_BY_CONFIG' || component.status === 'UNKNOWN') return 'status-muted'
  if (component.status === 'DEGRADED' || component.status === 'BLOCKED_BY_SCHEMA') return 'status-warn'
  return 'status-danger'
}

const componentDetail = (component: HealthComponentStatus | null | undefined, label: string) => {
  if (!component) return '等待读取 health/readiness'
  if (component.status === 'BLOCKED_BY_SCHEMA') {
    const missing = Array.isArray(component.missing) ? component.missing.join('、') : ''
    const migration = typeof component.migration === 'string' && component.migration ? component.migration : '对应迁移脚本'
    return missing ? `${label}缺少 ${missing}，请先执行 ${migration}` : `${label}未完成，请先执行 ${migration}`
  }
  if (component.status === 'DISABLED_BY_CONFIG') return '当前 profile 已通过配置关闭，不参与可用性承诺；用户路径应使用降级方案'
  if (component.status === 'DISABLED') return '当前 profile 已关闭，不参与 readiness 失败判定'
  if (component.configured === false) return `${label} 未配置连接地址`
  if (component.reachable === false || component.available === false) return String(component.message || `${label} 已配置但当前不可达`)
  if (typeof component.brokerCount === 'number') return `已连接 ${component.brokerCount} 个 broker`
  if (typeof component.bootstrapServers === 'string' && component.bootstrapServers) return `连接 ${component.bootstrapServers}`
  return String(component.message || '状态正常')
}

const normalizeOpsStatus = (raw?: OpsStatus | null): OpsStatus => {
  const toCount = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0
  const fallback: OpsStatus = {
    adminWhitelistEnabled: false,
    adminRoleEnabled: false,
    adminMode: 'LOCKED',
    search: {
      status: 'DOWN',
      indexReady: false,
      indexExists: false,
      indexName: '',
      available: false,
      enabled: false,
      publicSearchAvailable: false,
      publicSearchDegraded: false,
      publicSearchSource: 'unavailable',
      dbFallbackAvailable: false,
      fallbackSource: 'mysql',
      fallbackMode: 'unavailable',
      fallbackScanLimit: 0,
      fallbackSchemaReady: false,
      message: '',
      action: '',
    },
    searchIndexRetry: {
      status: 'UP',
      available: true,
      attentionRequired: false,
      message: '',
      action: '',
      byStatus: { pending: 0, done: 0, failed: 0, running: 0, unknown: 0 },
      duePending: 0,
    },
    notificationRetry: {
      status: 'UP',
      available: true,
      attentionRequired: false,
      message: '',
      action: '',
      byStatus: { pending: 0, done: 0, failed: 0, running: 0, unknown: 0 },
      duePending: 0,
    },
    outbox: {
      status: 'UP',
      available: true,
      attentionRequired: false,
      message: '',
      action: '',
      byStatus: { pending: 0, sent: 0, failed: 0, unknown: 0 },
      duePending: 0,
    },
  }

  if (!raw) return fallback

  return {
    ...fallback,
    ...raw,
    search: {
      ...fallback.search,
      ...raw.search,
      indexReady: Boolean(raw.search?.indexReady),
      indexExists: Boolean(raw.search?.indexExists),
      indexName: String(raw.search?.indexName || ''),
      available: Boolean(raw.search?.available),
      enabled: Boolean(raw.search?.enabled),
      publicSearchAvailable: raw.search?.publicSearchAvailable === undefined
        ? Boolean(raw.search?.available || raw.search?.dbFallbackAvailable)
        : Boolean(raw.search.publicSearchAvailable),
      publicSearchDegraded: raw.search?.publicSearchDegraded === undefined
        ? !Boolean(raw.search?.available && raw.search?.indexReady) && Boolean(raw.search?.dbFallbackAvailable)
        : Boolean(raw.search.publicSearchDegraded),
      publicSearchSource: String(raw.search?.publicSearchSource || (raw.search?.available && raw.search?.indexReady ? 'elasticsearch' : raw.search?.dbFallbackAvailable ? 'mysql' : 'unavailable')),
      dbFallbackAvailable: Boolean(raw.search?.dbFallbackAvailable),
      fallbackSource: String(raw.search?.fallbackSource || 'mysql'),
      fallbackMode: String(raw.search?.fallbackMode || ''),
      fallbackScanLimit: toCount(raw.search?.fallbackScanLimit),
      fallbackSchemaReady: Boolean(raw.search?.fallbackSchemaReady),
      message: String(raw.search?.message || ''),
      action: String(raw.search?.action || ''),
    },
    searchIndexRetry: {
      ...fallback.searchIndexRetry,
      ...raw.searchIndexRetry,
      available: raw.searchIndexRetry?.available === undefined ? true : Boolean(raw.searchIndexRetry.available),
      attentionRequired: Boolean(raw.searchIndexRetry?.attentionRequired),
      message: String(raw.searchIndexRetry?.message || ''),
      action: String(raw.searchIndexRetry?.action || ''),
      byStatus: {
        ...fallback.searchIndexRetry.byStatus,
        ...raw.searchIndexRetry?.byStatus,
        pending: toCount(raw.searchIndexRetry?.byStatus?.pending),
        done: toCount(raw.searchIndexRetry?.byStatus?.done),
        failed: toCount(raw.searchIndexRetry?.byStatus?.failed),
        running: toCount(raw.searchIndexRetry?.byStatus?.running),
        unknown: toCount(raw.searchIndexRetry?.byStatus?.unknown),
      },
      duePending: toCount(raw.searchIndexRetry?.duePending),
    },
    notificationRetry: {
      ...fallback.notificationRetry,
      ...raw.notificationRetry,
      available: raw.notificationRetry?.available === undefined ? true : Boolean(raw.notificationRetry.available),
      attentionRequired: Boolean(raw.notificationRetry?.attentionRequired),
      message: String(raw.notificationRetry?.message || ''),
      action: String(raw.notificationRetry?.action || ''),
      byStatus: {
        ...fallback.notificationRetry.byStatus,
        ...raw.notificationRetry?.byStatus,
        pending: toCount(raw.notificationRetry?.byStatus?.pending),
        done: toCount(raw.notificationRetry?.byStatus?.done),
        failed: toCount(raw.notificationRetry?.byStatus?.failed),
        running: toCount(raw.notificationRetry?.byStatus?.running),
        unknown: toCount(raw.notificationRetry?.byStatus?.unknown),
      },
      duePending: toCount(raw.notificationRetry?.duePending),
    },
    outbox: {
      ...fallback.outbox,
      ...raw.outbox,
      available: raw.outbox?.available === undefined ? true : Boolean(raw.outbox.available),
      attentionRequired: Boolean(raw.outbox?.attentionRequired),
      message: String(raw.outbox?.message || ''),
      action: String(raw.outbox?.action || ''),
      byStatus: {
        ...fallback.outbox.byStatus,
        ...raw.outbox?.byStatus,
        pending: toCount(raw.outbox?.byStatus?.pending),
        sent: toCount(raw.outbox?.byStatus?.sent),
        failed: toCount(raw.outbox?.byStatus?.failed),
        unknown: toCount(raw.outbox?.byStatus?.unknown),
      },
      duePending: toCount(raw.outbox?.duePending),
    },
    opsWindow: raw.opsWindow ? {
      ...raw.opsWindow,
      windowMinutes: toCount(raw.opsWindow.windowMinutes) || 15,
      thresholdBreached: Boolean(raw.opsWindow.thresholdBreached),
      failedTotal: toCount(raw.opsWindow.failedTotal),
      dueTotal: toCount(raw.opsWindow.dueTotal),
      pendingTotal: toCount(raw.opsWindow.pendingTotal),
      impact: String(raw.opsWindow.impact || ''),
      suggestedAction: String(raw.opsWindow.suggestedAction || ''),
      thresholds: {
        failedTotalWarn: toCount(raw.opsWindow.thresholds?.failedTotalWarn),
        dueTotalWarn: toCount(raw.opsWindow.thresholds?.dueTotalWarn),
        pendingQueueWarn: toCount(raw.opsWindow.thresholds?.pendingQueueWarn),
      },
    } : undefined,
  }
}
const taskStatusClass = computed(() => {
  if (task.value?.status === 'SUCCEEDED') return 'status-ok'
  if (task.value?.status === 'FAILED') return 'status-danger'
  return 'status-warn'
})
const taskProgress = computed(() => {
  return taskProgressValue(task.value)
})
const taskTimeText = computed(() => {
  if (!task.value?.updatedAt) return '等待任务状态更新'
  return `最近更新：${task.value.updatedAt.replace('T', ' ')}`
})
const questionIndexTaskStatusClass = computed(() => searchTaskStatusClass(questionIndexTask.value?.status || 'PENDING'))
const questionIndexTaskProgress = computed(() => taskProgressValue(questionIndexTask.value))
const questionIndexTaskTimeText = computed(() => {
  if (!questionIndexTask.value?.updatedAt) return '等待知识卡索引任务状态更新'
  return `最近更新：${questionIndexTask.value.updatedAt.replace('T', ' ')}`
})
const failedSearchIndexRetryTaskIds = computed(() => searchIndexRetryTasks.value.filter((item) => item.taskStatus === 2).map((item) => item.id))
const failedNotificationRetryTaskIds = computed(() => notificationRetryTasks.value.filter((item) => item.taskStatus === 2).map((item) => item.id))
const topAiProvider = computed(() => [...(aiTaskMetrics.value?.providerStats || [])].sort((a, b) => b.count - a.count)[0] || null)
const topAiError = computed(() => [...(aiTaskMetrics.value?.errorStats || [])].sort((a, b) => b.count - a.count)[0] || null)
const aiFallbackSummary = computed(() => {
  if (!aiTaskMetrics.value) return '未加载'
  return `${aiTaskMetrics.value.fallbackCount} / ${aiTaskMetrics.value.totalTasks} (${formatPercent(aiTaskMetrics.value.fallbackRate)})`
})
const aiTaskSuccessRate = computed(() => {
  if (!aiTaskMetrics.value || aiTaskMetrics.value.totalTasks <= 0) return undefined
  return aiTaskMetrics.value.successCount / aiTaskMetrics.value.totalTasks
})
const riskObjects = (items: Array<ApiId | string>, limit = 8) => items.slice(0, limit).map((item) => String(item))
const riskContext = (...items: Array<string | false | undefined>) => items.filter(Boolean) as string[]
const previewReasonText = (reason?: string, fallback?: string) => {
  if (fallback) return fallback
  if (reason === 'NOT_FOUND') return '不存在'
  if (reason === 'STATUS_NOT_FAILED') return '状态不是失败'
  if (reason === 'READY') return '可执行'
  return reason || '不可执行'
}
const batchPreviewObjects = (preview: BatchActionPreview, fallbackIds: ApiId[]) => {
  const items = preview.items?.length
    ? preview.items.map((item) => `${item.id}:${item.eligible ? '可执行' : previewReasonText(item.reason, item.reasonText)}`)
    : fallbackIds
  return riskObjects(items)
}
const batchPreviewImpact = (preview: BatchActionPreview) => preview.estimatedImpact ?? preview.eligible
const batchRetryLimit = (preview?: BatchActionPreview | null) => preview?.maxBatchSize ?? OPS_BATCH_RETRY_LIMIT
const batchPreviewExpiresText = (preview: BatchActionPreview) => {
  const seconds = Math.max(1, Number(preview.previewExpiresInSeconds ?? 300))
  if (seconds >= 60) return `${Math.ceil(seconds / 60)} 分钟`
  return `${seconds} 秒`
}
const ensureBatchRetryLimit = (ids: ApiId[], label: string) => {
  if (ids.length <= OPS_BATCH_RETRY_LIMIT) return true
  toast.warning(`${label}一次最多处理 ${OPS_BATCH_RETRY_LIMIT} 条，请缩小筛选范围后重新预览。`)
  return false
}
const batchPreviewContext = (preview: BatchActionPreview, ...items: Array<string | false | undefined>) => {
  const skipped = preview.items
    ?.filter((item) => !item.eligible)
    .slice(0, 3)
    .map((item) => `跳过 ${item.id}：${previewReasonText(item.reason, item.reasonText)}`) || []
  return riskContext(
    ...items,
    `后端预览：可执行 ${preview.eligible} / ${preview.requested}，跳过 ${preview.skipped}`,
    `预计影响：${batchPreviewImpact(preview)}`,
    `批量上限：最多 ${batchRetryLimit(preview)} 条`,
    `二次确认：${preview.confirmationPhrase || 'CONFIRM'} / ${preview.requiresAuditReason === false ? '备注可选' : '备注必填'} / 预览 ${batchPreviewExpiresText(preview)} 内有效`,
    preview.riskReason ? `后端风险原因：${preview.riskReason}` : undefined,
    ...skipped,
  )
}
const requireRiskConfirm = (request: RiskConfirmRequest) => confirmRisk(request)
const reviewDialogTitle = computed(() => {
  const target = reviewDialog.type === 'comment' ? '评论举报' : '帖子举报'
  return `${reviewDialog.approved ? '通过' : '驳回'}${target}`
})
const reviewContentTitle = computed(() => {
  const report = reviewDialog.report
  if (!report) return '未选择内容'
  if (reviewDialog.type === 'comment') return (report as CommentReport).postTitle || `帖子 ${(report as CommentReport).postId}`
  return (report as PostReport).postTitle || `帖子 ${(report as PostReport).postId}`
})
const reviewContentSummary = computed(() => {
  const report = reviewDialog.report
  if (!report) return '未选择内容'
  return reviewDialog.type === 'comment'
    ? ((report as CommentReport).commentSummary || '暂无评论摘要')
    : ((report as PostReport).postSummary || '暂无帖子摘要')
})

const loadPermissions = async () => {
  try {
    const res = await opsApi.myPermissions()
    permissions.value = res.data
  } catch (error: any) {
    loadError.value = getErrorMessage(error, '管理权限接口暂不可用')
  }
}

const loadStatus = async () => {
  if (!canOps.value) return
  isLoading.value = true
  loadError.value = ''
  try {
    const res = await opsApi.status()
    status.value = normalizeOpsStatus(res.data)
  } catch (error: any) {
    loadError.value = getErrorMessage(error, '运维状态接口暂不可用')
  } finally {
    isLoading.value = false
  }
}

const loadReadiness = async () => {
  if (!canOps.value) return
  isReadinessLoading.value = true
  try {
    readiness.value = await opsApi.readiness()
  } catch (error: any) {
    readiness.value = null
    toast.error(getErrorMessage(error, 'readiness 状态接口暂不可用'))
  } finally {
    isReadinessLoading.value = false
  }
}

const loadKafkaLocalCheck = async () => {
  if (!canOps.value) return
  isKafkaLocalCheckLoading.value = true
  try {
    const res = await opsApi.getKafkaLocalCheck()
    kafkaLocalCheck.value = res.data || null
  } catch (error: any) {
    kafkaLocalCheck.value = null
    toast.error(getErrorMessage(error, 'Kafka 本地只读检查失败'))
  } finally {
    isKafkaLocalCheckLoading.value = false
  }
}

const refreshLocalMiddleware = async () => {
  await Promise.all([loadReadiness(), loadKafkaLocalCheck()])
}

const loadOutbox = async () => {
  if (!canOps.value) return
  isOutboxLoading.value = true
  try {
    const res = await opsApi.pageOutbox({ status: outboxStatusFilter.value, page: opsPages.outbox, pageSize: OPS_PAGE_SIZE })
    outboxMessages.value = res.data?.items || []
    opsPageTotals.outbox = res.data?.total ?? outboxMessages.value.length
    selectedFailedIds.value = selectedFailedIds.value.filter((id) =>
      outboxMessages.value.some((message) => message.id === id && message.msgStatus === 2),
    )
  } catch (error: any) {
    toast.error(getErrorMessage(error, '事务消息加载失败'))
    outboxMessages.value = []
    opsPageTotals.outbox = 0
  } finally {
    isOutboxLoading.value = false
  }
}

const loadSearchIndexRetryTasks = async () => {
  if (!canOps.value) return
  isSearchIndexRetryTasksLoading.value = true
  try {
    const res = await opsApi.pageSearchIndexRetryTasks({ page: opsPages.searchRetry, pageSize: OPS_PAGE_SIZE })
    searchIndexRetryTasks.value = res.data?.items || []
    opsPageTotals.searchRetry = res.data?.total ?? searchIndexRetryTasks.value.length
  } catch (error: any) {
    toast.error(getErrorMessage(error, '搜索索引补偿任务加载失败'))
    searchIndexRetryTasks.value = []
    opsPageTotals.searchRetry = 0
  } finally {
    isSearchIndexRetryTasksLoading.value = false
  }
}

const loadNotificationRetryTasks = async () => {
  if (!canOps.value) return
  isNotificationRetryTasksLoading.value = true
  try {
    const res = await opsApi.pageNotificationRetryTasks({ page: opsPages.notificationRetry, pageSize: OPS_PAGE_SIZE })
    notificationRetryTasks.value = res.data?.items || []
    opsPageTotals.notificationRetry = res.data?.total ?? notificationRetryTasks.value.length
  } catch (error: any) {
    toast.error(getErrorMessage(error, '通知补偿任务加载失败'))
    notificationRetryTasks.value = []
    opsPageTotals.notificationRetry = 0
  } finally {
    isNotificationRetryTasksLoading.value = false
  }
}

const loadAiTasks = async () => {
  if (!canQuestion.value) return
  isAiTasksLoading.value = true
  try {
    const res = await opsApi.listAiTasks({ limit: 20 })
    aiTasks.value = res.data || []
  } catch (error: any) {
    toast.error(getErrorMessage(error, 'AI 任务加载失败'))
    aiTasks.value = []
  } finally {
    isAiTasksLoading.value = false
  }
}

const loadAiTaskMetrics = async () => {
  if (!canQuestion.value) return
  isAiTaskMetricsLoading.value = true
  try {
    const res = await opsApi.getAiTaskMetrics(100)
    aiTaskMetrics.value = res.data || null
  } catch (error: any) {
    toast.error(getErrorMessage(error, 'AI 任务指标加载失败'))
    aiTaskMetrics.value = null
  } finally {
    isAiTaskMetricsLoading.value = false
  }
}

const loadAiOps = async () => {
  await Promise.all([loadAiTasks(), loadAiTaskMetrics()])
}

const loadTasks = async () => {
  if (!canAdmin.value) return
  isTasksLoading.value = true
  try {
    const res = await searchApi.listRebuildTasks(10)
    recentTasks.value = res.data || []
  } catch (error: any) {
    toast.error(getErrorMessage(error, '索引任务加载失败'))
    recentTasks.value = []
  } finally {
    isTasksLoading.value = false
  }
}

const loadSearchAnalytics = async () => {
  if (!canOps.value) return
  isSearchAnalyticsLoading.value = true
  try {
    const res = await opsApi.searchAnalytics({ days: 30, limit: 8, includeTestData: includeTestData.value })
    searchAnalytics.value = cleanSearchAnalytics(res.data)
  } catch (error: any) {
    toast.error(getErrorMessage(error, '搜索统计加载失败'))
    searchAnalytics.value = { hotKeywords: [], noResultKeywords: [], prepClicks: [], recommendClicks: [] }
  } finally {
    isSearchAnalyticsLoading.value = false
  }
}

const loadQuestionIndexTasks = async () => {
  if (!canQuestion.value) return
  isQuestionIndexTasksLoading.value = true
  try {
    const res = await opsApi.listQuestionIndexTasks(10)
    recentQuestionIndexTasks.value = res.data || []
  } catch (error: any) {
    toast.error(getErrorMessage(error, '知识卡索引任务加载失败'))
    recentQuestionIndexTasks.value = []
  } finally {
    isQuestionIndexTasksLoading.value = false
  }
}

const loadReports = async () => {
  if (!canModerate.value) return
  isReportsLoading.value = true
  try {
    const res = await postApi.listAdminReports({ status: reportStatusFilter.value, limit: 20, includeTestData: includeTestData.value })
    postReports.value = res.data || []
  } catch (error: any) {
    toast.error(getErrorMessage(error, '举报列表加载失败'))
    postReports.value = []
  } finally {
    isReportsLoading.value = false
  }
}

const loadCommentReports = async () => {
  if (!canModerate.value) return
  isCommentReportsLoading.value = true
  try {
    const res = await interactionApi.listAdminCommentReports({ status: commentReportStatusFilter.value, limit: 20, includeTestData: includeTestData.value })
    commentReports.value = res.data || []
  } catch (error: any) {
    toast.error(getErrorMessage(error, '评论举报列表加载失败'))
    commentReports.value = []
  } finally {
    isCommentReportsLoading.value = false
  }
}

const loadAdmins = async () => {
  if (!canAdmin.value) return
  isAdminsLoading.value = true
  try {
    const res = await opsApi.listAdmins({ limit: 50 })
    adminUsers.value = res.data || []
  } catch (error: any) {
    toast.error(getErrorMessage(error, '管理员列表加载失败'))
    adminUsers.value = []
  } finally {
    isAdminsLoading.value = false
  }
}

const refreshAll = async () => {
  await loadPermissions()
  const loaders: Array<Promise<void>> = []
  if (canOps.value) loaders.push(loadStatus(), loadReadiness(), loadKafkaLocalCheck(), loadOutbox(), loadSearchIndexRetryTasks(), loadNotificationRetryTasks(), loadSearchAnalytics())
  if (canQuestion.value) loaders.push(loadAiOps(), loadQuestionIndexTasks())
  if (canAdmin.value) loaders.push(loadAdmins(), loadTasks())
  if (canModerate.value) loaders.push(loadReports(), loadCommentReports())
  await Promise.all(loaders)
  lastRefreshAt.value = formatTime(new Date().toISOString())
}

const reloadGovernanceData = async () => {
  const loaders: Array<Promise<void>> = []
  if (canOps.value) loaders.push(loadSearchAnalytics())
  if (canModerate.value) loaders.push(loadReports(), loadCommentReports())
  await Promise.all(loaders)
}

const setOutboxStatus = async (statusValue?: number) => {
  outboxStatusFilter.value = statusValue
  opsPages.outbox = 1
  selectedFailedIds.value = []
  await loadOutbox()
}

const setReportStatus = async (statusValue?: number) => {
  reportStatusFilter.value = statusValue
  opsPages.postReports = 1
  await loadReports()
}

const setCommentReportStatus = async (statusValue?: number) => {
  commentReportStatusFilter.value = statusValue
  opsPages.commentReports = 1
  await loadCommentReports()
}

const stopPolling = () => {
  if (pollTimer) {
    window.clearInterval(pollTimer)
    pollTimer = undefined
  }
}

const stopQuestionIndexPolling = () => {
  if (questionIndexPollTimer) {
    window.clearInterval(questionIndexPollTimer)
    questionIndexPollTimer = undefined
  }
}

const pollTask = (taskId: string) => {
  stopPolling()
  pollTimer = window.setInterval(async () => {
    try {
      const res = await searchApi.getRebuildTask(taskId)
      task.value = res.data
      if (!res.data || res.data.status === 'SUCCEEDED' || res.data.status === 'FAILED') {
        stopPolling()
        await refreshAll()
      }
    } catch {
      stopPolling()
    }
  }, 1500)
}

const pollQuestionIndexTask = (taskId: string) => {
  stopQuestionIndexPolling()
  questionIndexPollTimer = window.setInterval(async () => {
    try {
      const res = await opsApi.getQuestionIndexTask(taskId)
      questionIndexTask.value = res.data
      if (!res.data || res.data.status === 'SUCCEEDED' || res.data.status === 'FAILED') {
        stopQuestionIndexPolling()
        await loadQuestionIndexTasks()
      }
    } catch {
      stopQuestionIndexPolling()
    }
  }, 1500)
}

const submitRebuild = async () => {
  if (!canAdmin.value) return
  const note = await requireRiskConfirm({
    title: '重建搜索索引',
    level: 'critical',
    reversible: false,
    impactCount: status.value?.search.indexName || '全量索引',
    objects: riskObjects([status.value?.search.indexName || 'search-index']),
    context: riskContext('范围：帖子搜索索引全量重建', `当前状态：${searchOnlineText.value}`),
    confirmText: '确认重建索引',
  })
  if (note === null) return
  isSubmitting.value = true
  try {
    const res = await searchApi.rebuildIndex(note)
    task.value = res.data
    if (res.data?.taskId) {
      pollTask(res.data.taskId)
      toast.success('索引重建任务已提交')
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '提交重建任务失败'))
  } finally {
    isSubmitting.value = false
  }
}

const openOutboxDetail = async (message: OutboxMessage) => {
  try {
    const res = await opsApi.getOutbox(message.id)
    selectedOutbox.value = res.data || message
  } catch {
    selectedOutbox.value = message
  }
}

const closeOutboxDetail = () => {
  selectedOutbox.value = null
}

const retryMessage = async (message: OutboxMessage) => {
  if (!canRetryOutbox.value) {
    toast.warning('Kafka/topic/consumer group 未就绪，先完成本地只读检查和恢复步骤后再重试 Outbox')
    return
  }
  const note = await requireRiskConfirm({
    title: '重试单条事务消息',
    level: 'high',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([message.id, `${message.topic}:${message.aggregateId}`]),
    context: riskContext(`消息主题：${message.topic}`, `聚合：${message.aggregateType}/${message.aggregateId}`, `重试次数：${message.retryCount}`),
    confirmText: '确认重试',
  })
  if (note === null) return
  retryingId.value = message.id
  try {
    await opsApi.retryOutbox(message.id, note)
    toast.success('失败消息已重置为待投递')
    await refreshAll()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '重试失败消息失败'))
  } finally {
    retryingId.value = null
  }
}

const replaySearchIndexRetryTask = async (task: SearchIndexRetryTask) => {
  const note = await requireRiskConfirm({
    title: '重放搜索索引补偿任务',
    level: 'high',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([task.id, `post:${task.postId}`, task.operation]),
    context: riskContext(`Dedup：${task.dedupKey}`, `重试次数：${task.retryCount}`, task.lastError ? `错误：${task.lastError}` : undefined),
    confirmText: '确认重放',
  })
  if (note === null) return
  replayingSearchIndexTaskId.value = task.id
  try {
    await opsApi.replaySearchIndexRetryTask(task.id, note)
    toast.success('搜索索引补偿任务已重置为待重试')
    await Promise.all([loadStatus(), loadSearchIndexRetryTasks()])
  } catch (error: any) {
    toast.error(getErrorMessage(error, '搜索索引补偿任务重试失败'))
  } finally {
    replayingSearchIndexTaskId.value = null
  }
}

const replayFailedSearchIndexRetryTasks = async () => {
  if (failedSearchIndexRetryTaskIds.value.length === 0) return
  const ids = [...failedSearchIndexRetryTaskIds.value]
  if (!ensureBatchRetryLimit(ids, '批量重试搜索索引补偿任务')) return
  isBatchReplayingSearchIndexTasks.value = true
  try {
    const preview = (await opsApi.previewSearchIndexRetryTasks(ids)).data
    if (!preview || preview.eligible <= 0) {
      toast.warning('后端预览显示没有可重放的搜索索引补偿任务')
      return
    }
    const note = await requireRiskConfirm({
      title: '批量重放搜索索引补偿任务',
      level: 'critical',
      reversible: true,
      impactCount: batchPreviewImpact(preview),
      objects: batchPreviewObjects(preview, ids),
      context: batchPreviewContext(preview, '范围：当前失败搜索索引补偿任务', `当前列表：${searchIndexRetryTasks.value.length} 条`),
      confirmText: '确认批量重试',
    })
    if (note === null) return
    const res = await opsApi.replaySearchIndexRetryTasks(ids, note, preview.previewNonce)
    toast.success(`已重试 ${res.data?.replayed ?? 0} / ${res.data?.requested ?? ids.length} 条搜索索引补偿任务`)
    await Promise.all([loadStatus(), loadSearchIndexRetryTasks()])
  } catch (error: any) {
    toast.error(getErrorMessage(error, '批量重试搜索索引补偿任务失败'))
  } finally {
    isBatchReplayingSearchIndexTasks.value = false
  }
}

const replayNotificationRetryTask = async (task: NotificationRetryTask) => {
  const note = await requireRiskConfirm({
    title: '重放单条通知补偿任务',
    level: 'high',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([task.id, `receiver:${task.receiverUid}`, task.targetId ? `target:${task.targetId}` : task.dedupKey]),
    context: riskContext(`场景：${task.scene || '未标注'}`, `重试次数：${task.retryCount}`, task.lastError ? `错误：${task.lastError}` : undefined),
    confirmText: '确认重放',
  })
  if (note === null) return
  replayingNotificationRetryTaskId.value = task.id
  try {
    await opsApi.replayNotificationRetryTask(task.id, note)
    toast.success('通知补偿任务已重置为待重放')
    await Promise.all([loadStatus(), loadNotificationRetryTasks()])
  } catch (error: any) {
    toast.error(getErrorMessage(error, '通知补偿任务重放失败'))
  } finally {
    replayingNotificationRetryTaskId.value = null
  }
}

const replayFailedNotificationRetryTasks = async () => {
  if (failedNotificationRetryTaskIds.value.length === 0) return
  const ids = [...failedNotificationRetryTaskIds.value]
  if (!ensureBatchRetryLimit(ids, '批量重放通知补偿任务')) return
  isBatchReplayingNotificationTasks.value = true
  try {
    const preview = (await opsApi.previewNotificationRetryTasks(ids)).data
    if (!preview || preview.eligible <= 0) {
      toast.warning('后端预览显示没有可重放的通知补偿任务')
      return
    }
    const note = await requireRiskConfirm({
      title: '批量重放通知补偿任务',
      level: 'critical',
      reversible: true,
      impactCount: batchPreviewImpact(preview),
      objects: batchPreviewObjects(preview, ids),
      context: batchPreviewContext(preview, '范围：当前失败通知补偿任务', `当前列表：${notificationRetryTasks.value.length} 条`),
      confirmText: '确认批量重放',
    })
    if (note === null) return
    const res = await opsApi.replayNotificationRetryTasks(ids, note, preview.previewNonce)
    toast.success(`已重放 ${res.data?.replayed ?? 0} / ${res.data?.requested ?? ids.length} 条通知补偿任务`)
    await Promise.all([loadStatus(), loadNotificationRetryTasks()])
  } catch (error: any) {
    toast.error(getErrorMessage(error, '批量重放通知补偿任务失败'))
  } finally {
    isBatchReplayingNotificationTasks.value = false
  }
}

const retryAiTask = async (task: AiExtractTask) => {
  const note = await requireRiskConfirm({
    title: '重试 AI 提取任务',
    level: 'high',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([task.id, `post:${task.postId}`]),
    context: riskContext(`任务类型：${task.taskType}`, `题目数：${task.questionCount}`, `重试次数：${task.retryCount}`),
    confirmText: '确认重试 AI',
  })
  if (note === null) return
  retryingAiTaskId.value = task.id
  try {
    const res = await opsApi.retryAiTask(task.id, note)
    toast.success('AI 提取任务已重试')
    if (selectedAiTaskDetail.value && selectedAiTaskDetail.value.sourcePostId === task.postId) {
      selectedAiTaskDetail.value = {
        ...selectedAiTaskDetail.value,
        task: selectedAiTaskDetail.value.task.id === task.id ? (res.data || selectedAiTaskDetail.value.task) : selectedAiTaskDetail.value.task,
        retryRecords: selectedAiTaskDetail.value.retryRecords.map((record) => record.id === task.id ? (res.data || record) : record),
      }
    }
    await loadAiOps()
  } catch (error: any) {
    toast.error(getErrorMessage(error, 'AI 任务重试失败'))
  } finally {
    retryingAiTaskId.value = null
  }
}

const parseCsvList = (value: string) => value
  .split(/[,，]/)
  .map((item) => item.trim())
  .filter(Boolean)
  .slice(0, 20)

const hydrateKnowledgeReviewForm = (detail: AiExtractTaskDetail | null) => {
  knowledgeReviewForm.summary = detail?.sourcePostSummary || ''
  knowledgeReviewForm.faqJson = ''
  knowledgeReviewForm.knowledgeCardJson = ''
  knowledgeReviewForm.techStacks = ''
  knowledgeReviewForm.suggestedTags = ''
  knowledgeReviewForm.note = ''
}

const submitKnowledgeReview = async () => {
  const detail = selectedAiTaskDetail.value
  if (!detail?.sourcePostId) return
  const note = await requireRiskConfirm({
    title: '知识沉淀回写',
    level: 'high',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([`post:${detail.sourcePostId}`, `ai-task:${detail.task.id}`]),
    context: riskContext(
      '范围：写回来源帖子扩展字段',
      knowledgeReviewForm.summary ? `摘要：${knowledgeReviewForm.summary.slice(0, 40)}` : '摘要：未填写',
      knowledgeReviewForm.techStacks ? `技术栈：${knowledgeReviewForm.techStacks}` : undefined,
      knowledgeReviewForm.suggestedTags ? `推荐标签：${knowledgeReviewForm.suggestedTags}` : undefined,
    ),
    confirmText: '确认回写',
  })
  if (note === null) return
  isKnowledgeReviewSubmitting.value = true
  try {
    await postApi.reviewKnowledge(detail.sourcePostId, {
      summary: knowledgeReviewForm.summary || undefined,
      faqJson: knowledgeReviewForm.faqJson || undefined,
      knowledgeCardJson: knowledgeReviewForm.knowledgeCardJson || undefined,
      techStacks: parseCsvList(knowledgeReviewForm.techStacks),
      suggestedTags: parseCsvList(knowledgeReviewForm.suggestedTags),
      note: note || knowledgeReviewForm.note || undefined,
    })
    toast.success('知识沉淀已写回帖子')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '知识沉淀回写失败'))
  } finally {
    isKnowledgeReviewSubmitting.value = false
  }
}

const openAiTaskDetail = async (task: AiExtractTask) => {
  loadingAiTaskDetailId.value = task.id
  try {
    const res = await opsApi.getAiTaskDetail(task.id)
    selectedAiTaskDetail.value = res.data || null
    hydrateKnowledgeReviewForm(selectedAiTaskDetail.value)
  } catch (error: any) {
    toast.error(getErrorMessage(error, 'AI 任务详情加载失败'))
  } finally {
    loadingAiTaskDetailId.value = null
  }
}

const closeAiTaskDetail = () => {
  selectedAiTaskDetail.value = null
  hydrateKnowledgeReviewForm(null)
}

const rebuildQuestions = async () => {
  const note = await requireRiskConfirm({
    title: '重建知识卡任务',
    level: 'critical',
    reversible: false,
    impactCount: 100,
    objects: riskObjects(['question-rebuild-limit:100']),
    context: riskContext('范围：提交最多 100 个知识卡重建任务', `AI 任务列表：${aiTasks.value.length} 条`),
    confirmText: '确认重建知识卡',
  })
  if (note === null) return
  isQuestionRebuilding.value = true
  try {
    const res = await opsApi.rebuildQuestions(100, note)
    toast.success(`已提交 ${res.data?.submitted ?? 0} 个知识卡重建任务`)
    await loadAiOps()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '知识卡重建任务提交失败'))
  } finally {
    isQuestionRebuilding.value = false
  }
}

const rebuildQuestionIndex = async () => {
  const note = await requireRiskConfirm({
    title: '重建知识卡索引',
    level: 'critical',
    reversible: false,
    impactCount: questionIndexTask.value?.total || '知识卡索引',
    objects: riskObjects([questionIndexTask.value?.taskId ? `任务 ${shortId(questionIndexTask.value.taskId)}` : '知识卡索引']),
    context: riskContext('范围：知识卡搜索索引任务', questionIndexTask.value?.indexName ? `索引：${questionIndexTask.value.indexName}` : undefined),
    confirmText: '确认重建知识卡索引',
  })
  if (note === null) return
  isQuestionIndexRebuilding.value = true
  try {
    const res = await opsApi.rebuildQuestionIndexTask(note)
    questionIndexTask.value = res.data
    if (res.data?.taskId) {
      pollQuestionIndexTask(res.data.taskId)
    }
    await loadQuestionIndexTasks()
    toast.success(res.data?.taskId ? '知识卡索引重建任务已提交' : '知识卡索引重建已提交')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '知识卡索引重建失败'))
  } finally {
    isQuestionIndexRebuilding.value = false
  }
}

const toggleFailedSelection = (id: ApiId) => {
  selectedFailedIds.value = selectedFailedIds.value.includes(id)
    ? selectedFailedIds.value.filter((item) => item !== id)
    : [...selectedFailedIds.value, id]
}

const retrySelectedMessages = async () => {
  if (selectedFailedIds.value.length === 0) return
  if (!canRetryOutbox.value) {
    toast.warning('Kafka/topic/consumer group 未就绪，批量重试已禁用')
    return
  }
  const ids = [...selectedFailedIds.value]
  if (!ensureBatchRetryLimit(ids, '批量重试事务消息')) return
  isBatchRetrying.value = true
  try {
    const preview = (await opsApi.previewOutboxRetryBatch(ids)).data
    if (!preview || preview.eligible <= 0) {
      toast.warning('后端预览显示没有可重试的失败消息')
      return
    }
    const note = await requireRiskConfirm({
      title: '批量重试事务消息',
      level: 'critical',
      reversible: true,
      impactCount: batchPreviewImpact(preview),
      objects: batchPreviewObjects(preview, ids),
      context: batchPreviewContext(preview, `事务消息筛选：${outboxStatusFilter.value === undefined ? '全部' : outboxStatusText(outboxStatusFilter.value)}`, `当前列表：${outboxMessages.value.length} 条`),
      confirmText: '确认批量重试',
    })
    if (note === null) return
    const res = await opsApi.retryOutboxBatch(ids, note, preview.previewNonce)
    toast.success(`已重置 ${res.data?.retried ?? 0} / ${res.data?.requested ?? ids.length} 条失败消息`)
    selectedFailedIds.value = []
    await refreshAll()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '批量重试失败'))
  } finally {
    isBatchRetrying.value = false
  }
}

const openReviewDialog = (type: 'post' | 'comment', report: PostReport | CommentReport, approved: boolean) => {
  reviewDialog.open = true
  reviewDialog.type = type
  reviewDialog.report = report
  reviewDialog.approved = approved
  reviewDialog.note = ''
  reviewDialog.error = ''
}

const closeReviewDialog = () => {
  if (isReviewSubmitting.value) return
  reviewDialog.open = false
  reviewDialog.report = null
  reviewDialog.note = ''
  reviewDialog.error = ''
}

useAccessibleDialog(() => Boolean(selectedOutbox.value), {
  close: closeOutboxDetail,
  initialFocus: outboxCloseButton,
})

useAccessibleDialog(() => Boolean(selectedAiTaskDetail.value), {
  close: closeAiTaskDetail,
  initialFocus: aiTaskDetailCloseButton,
})

useAccessibleDialog(() => reviewDialog.open, {
  close: closeReviewDialog,
  closeOnEscape: () => !isReviewSubmitting.value,
  initialFocus: reviewNoteInput,
})

const submitReviewDialog = async () => {
  if (!reviewDialog.report) return
  const note = reviewDialog.note.trim()
  if (!note) {
    reviewDialog.error = '请填写审核备注'
    return
  }
  reviewDialog.error = ''
  isReviewSubmitting.value = true
  try {
    if (reviewDialog.type === 'post') {
      await reviewReport(reviewDialog.report as PostReport, reviewDialog.approved, note)
    } else {
      await reviewCommentReport(reviewDialog.report as CommentReport, reviewDialog.approved, note)
    }
    reviewDialog.open = false
    reviewDialog.report = null
    reviewDialog.note = ''
  } catch {
    // Keep the dialog open so the operator can adjust the note or retry.
  } finally {
    isReviewSubmitting.value = false
  }
}

const reviewReport = async (report: PostReport, approved: boolean, note: string) => {
  reviewingReportId.value = report.reportId
  try {
    await postApi.reviewAdminReport(report.reportId, { approved, note })
    toast.success(approved ? '举报已通过，帖子已下架' : '举报已驳回')
    await loadReports()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '举报审核失败'))
    throw error
  } finally {
    reviewingReportId.value = null
  }
}

const reviewCommentReport = async (report: CommentReport, approved: boolean, note: string) => {
  reviewingCommentReportId.value = report.reportId
  try {
    await interactionApi.reviewAdminCommentReport(report.reportId, { approved, note })
    toast.success(approved ? '评论举报已通过，评论已隐藏' : '评论举报已驳回')
    await loadCommentReports()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '评论举报审核失败'))
    throw error
  } finally {
    reviewingCommentReportId.value = null
  }
}

const addAdmin = async () => {
  const uid = adminForm.value.uid.trim()
  if (!/^\d+$/.test(uid)) {
    toast.error('请输入有效用户编号')
    return
  }
  const note = await requireRiskConfirm({
    title: '启用管理员权限',
    level: 'critical',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([`uid:${uid}`, adminForm.value.roleCode]),
    context: riskContext('范围：管理员角色权限变更', adminForm.value.remark ? `备注：${adminForm.value.remark}` : undefined),
    confirmText: '确认启用管理员',
  })
  if (note === null) return
  isAdminSubmitting.value = true
  try {
    await opsApi.addAdmin({ uid, roleCode: adminForm.value.roleCode, remark: adminForm.value.remark, auditRemark: note })
    toast.success('管理员已启用')
    adminForm.value = { uid: '', roleCode: 'ADMIN', remark: '' }
    await refreshAll()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '添加管理员失败'))
  } finally {
    isAdminSubmitting.value = false
  }
}

const toggleAdmin = async (admin: AdminUserRole) => {
  const nextEnabled = !isAdminEnabled(admin)
  const note = await requireRiskConfirm({
    title: nextEnabled ? '启用管理员' : '禁用管理员',
    level: 'critical',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([`uid:${admin.uid}`, admin.roleCode]),
    context: riskContext('范围：管理员角色状态变更', admin.remark ? `备注：${admin.remark}` : undefined),
    confirmText: nextEnabled ? '确认启用' : '确认禁用',
  })
  if (note === null) return
  adminActionUid.value = admin.uid
  try {
    await opsApi.updateAdminStatus(admin.uid, { enabled: nextEnabled, roleCode: admin.roleCode, remark: admin.remark || '', auditRemark: note })
    toast.success(nextEnabled ? '管理员已启用' : '管理员已禁用')
    await refreshAll()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '更新管理员状态失败'))
  } finally {
    adminActionUid.value = null
  }
}

const isAdminEnabled = (admin: AdminUserRole) => admin.enabled === true || admin.enabled === 1

const outboxStatusText = (value: number) => {
  if (value === 0) return '待投递'
  if (value === 1) return '已发送'
  if (value === 2) return '失败'
  return '未知'
}

const outboxStatusClass = (value: number) => {
  if (value === 1) return 'status-ok'
  if (value === 2) return 'status-danger'
  return 'status-warn'
}

const searchIndexRetryTaskText = (value: number) => {
  if (value === 0) return '待重试'
  if (value === 1) return '已完成'
  if (value === 2) return '失败'
  if (value === 3) return '运行中'
  return '未知'
}

const searchIndexRetryTaskClass = (value: number) => {
  if (value === 1) return 'status-ok'
  if (value === 2) return 'status-danger'
  return 'status-warn'
}

const notificationRetryTaskText = (value: number) => {
  if (value === 0) return '待重试'
  if (value === 1) return '已完成'
  if (value === 2) return '失败'
  if (value === 3) return '运行中'
  return '未知'
}

const notificationRetryTaskClass = (value: number) => {
  if (value === 1) return 'status-ok'
  if (value === 2) return 'status-danger'
  return 'status-warn'
}

const aiTaskStatusText = (value: number) => {
  if (value === 0) return '待处理'
  if (value === 1) return '运行中'
  if (value === 2) return '成功'
  if (value === 3) return '失败'
  return '未知'
}

const aiTaskStatusClass = (value: number) => {
  if (value === 2) return 'status-ok'
  if (value === 3) return 'status-danger'
  return 'status-warn'
}

const searchTaskStatusClass = (value?: string) => {
  if (value === 'SUCCEEDED') return 'status-ok'
  if (value === 'FAILED') return 'status-danger'
  return 'status-warn'
}

const searchTaskStatusText = (value?: string) => {
  const labels: Record<string, string> = {
    PENDING: '待执行',
    RUNNING: '运行中',
    SUCCEEDED: '成功',
    FAILED: '失败',
  }
  return value ? labels[value] || '未知状态' : '未知状态'
}

const shortId = (value?: string | number | null) => {
  const text = String(value ?? '').trim()
  if (!text) return '--'
  return text.length > 12 ? `${text.slice(0, 6)}...${text.slice(-4)}` : text
}

const taskProgressValue = (value?: { status?: string; total?: number; indexed?: number; failed?: number } | null) => {
  if (!value) return 0
  if (value.status === 'SUCCEEDED') return 100
  if ((value.total || 0) > 0) {
    return Math.min(100, Math.round((((value.indexed || 0) + (value.failed || 0)) / (value.total || 1)) * 100))
  }
  return value.status === 'RUNNING' ? 35 : 8
}

const reportStatusText = (value?: number) => {
  if (value === 1) return '已通过'
  if (value === 2) return '已驳回'
  return '待审核'
}

const reportStatusClass = (value?: number) => {
  if (value === 1) return 'status-ok'
  if (value === 2) return 'status-danger'
  return 'status-warn'
}

const textOrUnavailable = (value?: string | null, fallback = '不可用') => {
  const text = value?.trim()
  return text || fallback
}

const aiProviderText = (value?: string | null) => {
  const text = value?.trim()
  if (!text) return '未记录'
  if (text === 'deepseek') return 'DeepSeek 模型'
  if (text === 'rules') return '本地规则'
  if (text === 'none') return '未调用模型'
  return text
}

const aiFallbackText = (value?: boolean | null) => value ? '已回退' : '未回退'

const formatPercent = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '未加载'
  return `${Math.round(Number(value) * 1000) / 10}%`
}

const formatDurationMs = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '未加载'
  const ms = Math.max(0, Number(value))
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`
}

const formatTokens = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '未加载'
  const count = Math.max(0, Number(value))
  return count >= 10000 ? `${(count / 10000).toFixed(1)}w` : String(Math.round(count))
}

const formatCostMicros = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '未加载'
  const micros = Math.max(0, Number(value))
  return micros <= 0 ? '0.0000' : (micros / 1_000_000).toFixed(4)
}

const formatTime = (value?: string) => value ? value.replace('T', ' ').slice(0, 19) : '未加载'

const formatPayload = (payload: string) => {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2)
  } catch {
    return payload || '暂无载荷'
  }
}

const initOpsView = async () => {
  includeTestData.value = route.query.includeTestData === '1' || route.query.includeTestData === 'true'
  if (typeof route.query.postId === 'string' && /^\d+$/.test(route.query.postId)) {
    postSearchDiagnosticId.value = route.query.postId
  }
  await refreshAll()
  if (postSearchDiagnosticId.value) {
    await runPostSearchDiagnostics()
  }
}

onMounted(initOpsView)
onBeforeUnmount(() => {
  stopPolling()
  stopQuestionIndexPolling()
})
</script>

<style scoped>
.primary-button,
.secondary-button,
.filter-button,
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.primary-button,
.secondary-button {
  min-height: 40px;
  padding: 0.625rem 1rem;
}

.primary-button {
  background: rgb(79 70 229);
  color: white;
}

.primary-button:hover:not(:disabled) {
  background: rgb(67 56 202);
}

.secondary-button,
.filter-button,
.icon-button {
  border: 1px solid rgb(226 232 240);
  background: white;
  color: rgb(51 65 85);
}

.secondary-button:hover:not(:disabled),
.filter-button:hover:not(:disabled),
.icon-button:hover:not(:disabled) {
  background: rgb(248 250 252);
}

.filter-button {
  min-height: 34px;
  padding: 0.4rem 0.75rem;
}

.test-data-toggle {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 0.45rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.35rem 0.7rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgb(71 85 105);
}

.test-data-toggle input {
  height: 0.875rem;
  width: 0.875rem;
  accent-color: rgb(79 70 229);
}

.filter-button-active {
  border-color: rgb(79 70 229);
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.icon-button {
  height: 32px;
  width: 32px;
  padding: 0;
}

.danger-action {
  color: rgb(185 28 28);
}

.danger-primary {
  background: rgb(220 38 38);
}

.danger-primary:hover:not(:disabled) {
  background: rgb(185 28 28);
}

.field-textarea {
  width: 100%;
  resize: vertical;
  border-radius: 0.5rem;
  border: 1px solid rgb(203 213 225);
  background: white;
  padding: 0.75rem;
  color: rgb(15 23 42);
  outline: none;
}

.analytics-grid {
  display: grid;
  gap: 1rem;
}

.analytics-column {
  min-width: 0;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 1rem;
}

.analytics-column-head,
.analytics-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.analytics-column-head span {
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgb(15 23 42);
}

.analytics-column-head strong {
  color: rgb(100 116 139);
  font-size: 0.875rem;
}

.analytics-list {
  margin-top: 0.875rem;
  display: grid;
  gap: 0.625rem;
}

.analytics-row {
  min-height: 34px;
}

.analytics-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgb(51 65 85);
  font-size: 0.875rem;

}

.analytics-empty {
  padding-top: 1rem;
  color: rgb(100 116 139);
  font-size: 0.875rem;
}

.ai-metrics-grid {
  display: grid;
  gap: 0.75rem;
  padding-top: 1rem;
}

.ai-provider-list {
  margin-top: 0.875rem;
  display: grid;
  gap: 0.5rem;
}

.ai-provider-row {
  display: grid;
  grid-template-columns: minmax(90px, 0.8fr) auto minmax(0, 2fr);
  align-items: center;
  gap: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.625rem 0.75rem;
}

.ai-provider-row span,
.ai-provider-row strong {
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

.ai-provider-row small,
.task-stat small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgb(100 116 139);
  font-size: 0.75rem;
}

.detail-section {
  border-radius: 0.625rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 1rem;
}

.detail-section h4 {
  font-size: 0.875rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

.field-textarea:focus {
  border-color: rgb(79 70 229);
  box-shadow: 0 0 0 3px rgb(199 210 254 / 0.8);
}

.primary-button:disabled,
.secondary-button:disabled,
.filter-button:disabled,
.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.metric-card,
.panel {
  min-width: 0;
  overflow: hidden;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 1.25rem;
}

.panel .overflow-x-auto {
  max-width: 100%;
  -webkit-overflow-scrolling: touch;
}

.metric-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgb(100 116 139);
}

.metric-value {
  margin-top: 0.5rem;
  font-size: 1.75rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.status-ok {
  background: rgb(220 252 231);
  color: rgb(21 128 61);
}

.status-warn {
  background: rgb(254 243 199);
  color: rgb(180 83 9);
}

.status-muted {
  background: rgb(226 232 240);
  color: rgb(71 85 105);
}

.status-danger {
  background: rgb(254 226 226);
  color: rgb(185 28 28);
}

.mobile-ops-summary {
  display: none;
  min-width: 0;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 1rem;
}

.mobile-ops-head {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.mobile-ops-head h2 {
  margin-top: 0.25rem;
  font-size: 1.125rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

.mobile-ops-grid {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.875rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.mobile-ops-card {
  min-width: 0;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.75rem;
}

.mobile-ops-card span,
.mobile-ops-card small {
  display: block;
  font-size: 0.75rem;
  color: rgb(100 116 139);
}

.mobile-ops-card strong {
  display: block;
  margin-top: 0.35rem;
  overflow-wrap: anywhere;
  font-size: 1.125rem;
  color: rgb(15 23 42);
}

.mobile-ops-card small {
  margin-top: 0.25rem;
  line-height: 1.4;
}

.ops-priority-board {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.ops-priority-card {
  display: flex;
  min-width: 0;
  min-height: 136px;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 1rem;
}

.ops-priority-card span,
.ops-priority-card small {
  display: block;
  color: rgb(100 116 139);
  font-size: 0.75rem;
  line-height: 1.45;
}

.ops-priority-card span {
  font-weight: 800;
  text-transform: uppercase;
}

.ops-priority-card strong {
  display: block;
  margin-top: 0.35rem;
  overflow-wrap: anywhere;
  color: rgb(15 23 42);
  font-size: 1.5rem;
  font-weight: 900;
}

.ops-priority-action {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  color: rgb(51 65 85);
  font-size: 0.8125rem;
  font-weight: 800;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.ops-priority-action:hover {
  border-color: rgb(165 180 252);
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.ops-priority-danger {
  border-color: rgb(252 165 165);
  background: rgb(254 242 242);
}

.ops-priority-warn {
  border-color: rgb(252 211 77);
  background: rgb(255 251 235);
}

.ops-priority-ok {
  border-color: rgb(187 247 208);
  background: rgb(240 253 244);
}

.ops-duty-brief {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.5rem;
  background: white;
  padding: 1rem;
}

.ops-duty-brief-head {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.ops-duty-brief-head p,
.ops-duty-card span,
.ops-duty-samples span {
  color: rgb(100 116 139);
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1.4;
}

.ops-duty-brief-head h2 {
  margin-top: 0.25rem;
  color: rgb(15 23 42);
  font-size: 1.125rem;
  font-weight: 900;
}

.ops-duty-grid {
  margin-top: 1rem;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.ops-duty-card {
  min-width: 0;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.875rem;
}

.ops-duty-card strong {
  display: block;
  margin-top: 0.4rem;
  overflow-wrap: anywhere;
  color: rgb(15 23 42);
  font-size: 0.95rem;
  font-weight: 900;
  line-height: 1.45;
}

.ops-duty-card small {
  display: block;
  margin-top: 0.45rem;
  color: rgb(71 85 105);
  font-size: 0.75rem;
  line-height: 1.5;
}

.ops-duty-danger {
  border-color: rgb(252 165 165);
  background: rgb(254 242 242);
}

.ops-duty-warn {
  border-color: rgb(252 211 77);
  background: rgb(255 251 235);
}

.ops-duty-ok {
  border-color: rgb(187 247 208);
  background: rgb(240 253 244);
}

.ops-duty-muted {
  border-color: rgb(226 232 240);
  background: rgb(248 250 252);
}

.ops-duty-samples {
  margin-top: 0.875rem;
  border-top: 1px solid rgb(226 232 240);
  padding-top: 0.875rem;
}

.ops-duty-samples p,
.ops-duty-samples li {
  overflow-wrap: anywhere;
  color: rgb(71 85 105);
  font-size: 0.75rem;
  line-height: 1.55;
}

.ops-duty-samples ul {
  margin-top: 0.5rem;
  display: grid;
  gap: 0.35rem;
}

.ops-window-summary {
  margin-top: 0.875rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.875rem;
}

.ops-window-head {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.ops-window-head span,
.ops-window-grid span {
  color: rgb(100 116 139);
  font-size: 0.75rem;
  font-weight: 800;
}

.ops-window-head strong {
  flex-shrink: 0;
  border-radius: 999px;
  background: rgb(255 251 235);
  padding: 0.2rem 0.6rem;
  color: rgb(146 64 14);
  font-size: 0.75rem;
  font-weight: 900;
}

.ops-window-grid {
  margin-top: 0.75rem;
  display: grid;
  gap: 0.6rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.ops-window-grid article {
  min-width: 0;
  border-radius: 0.5rem;
  background: white;
  padding: 0.7rem;
}

.ops-window-grid strong {
  display: block;
  margin-top: 0.25rem;
  overflow-wrap: anywhere;
  color: rgb(15 23 42);
  font-weight: 900;
}

.ops-window-grid small {
  display: block;
  margin-top: 0.3rem;
  color: rgb(71 85 105);
  font-size: 0.7rem;
  line-height: 1.45;
}

.ops-workbench-nav {
  position: sticky;
  top: 72px;
  z-index: 20;
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: rgb(255 255 255 / 0.92);
  padding: 0.5rem;
  backdrop-filter: blur(14px);
}

.ops-workbench-nav button {
  min-height: 58px;
  flex: 0 0 auto;
  border-radius: 0.5rem;
  border: 1px solid transparent;
  padding: 0.55rem 0.85rem;
  color: rgb(71 85 105);
  text-align: left;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.ops-workbench-pane span {
  display: block;
  font-size: 0.875rem;
  font-weight: 900;
}

.ops-workbench-pane small {
  margin-top: 0.2rem;
  display: block;
  max-width: 11rem;
  color: rgb(100 116 139);
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.35;
}

.ops-workbench-nav button:hover {
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.ops-workbench-pane-active {
  border-color: rgb(99 102 241) !important;
  background: rgb(238 242 255);
  color: rgb(67 56 202) !important;
}

.ops-workbench-pane-active small {
  color: rgb(79 70 229);
}

.ops-pagination-note {
  display: grid;
  gap: 0.25rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.75rem 1rem;
}

.ops-pagination-note strong {
  font-size: 0.8rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.ops-pagination-note span,
.ops-pagination-note small {
  color: rgb(100 116 139);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.45;
}

.task-stat {
  min-width: 0;
  border-radius: 0.5rem;
  background: rgb(248 250 252);
  padding: 0.875rem;
}

.task-stat span {
  display: block;
  font-size: 0.75rem;
  color: rgb(100 116 139);
}

.task-stat strong {
  margin-top: 0.35rem;
  display: block;
  color: rgb(15 23 42);
  font-size: 1.125rem;
}

.ops-table {
  width: 100%;
  min-width: 920px;
  border-collapse: collapse;
}

.ops-table th,
.ops-table td {
  border-bottom: 1px solid rgb(226 232 240);
  padding: 0.875rem 0.75rem;
  text-align: left;
  font-size: 0.875rem;
  color: rgb(51 65 85);
  vertical-align: middle;
}

.ops-table th {
  color: rgb(100 116 139);
  font-size: 0.75rem;
  font-weight: 700;
}

.payload-box {
  max-height: 420px;
  overflow: auto;
  border-radius: 0.5rem;
  background: rgb(15 23 42);
  padding: 1rem;
  color: rgb(226 232 240);
  font-size: 0.8125rem;
}

.admin-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.75rem;
}

.admin-input {
  min-height: 40px;
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  color: rgb(15 23 42);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.admin-input:focus {
  border-color: rgb(79 70 229);
  box-shadow: 0 0 0 3px rgb(199 210 254 / 0.7);
}

.admin-list {
  display: grid;
  gap: 0.75rem;
}

.admin-row {
  display: flex;
  min-width: 0;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  padding: 0.75rem;
}

.middleware-check-card {
  min-width: 0;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.875rem;
}

.middleware-check-card span {
  display: block;
  color: rgb(100 116 139);
  font-size: 0.75rem;
  font-weight: 800;
}

.middleware-check-card strong {
  margin-top: 0.25rem;
  display: block;
  overflow-wrap: anywhere;
  color: rgb(15 23 42);
  font-size: 0.95rem;
  font-weight: 900;
}

.middleware-check-card p {
  margin-top: 0.65rem;
  overflow-wrap: anywhere;
  color: rgb(71 85 105);
  font-size: 0.8125rem;
  line-height: 1.55;
}

.task-row {
  min-height: 72px;
}

.report-table {
  min-width: 980px;
}

.ops-row-number {
  width: 1%;
  white-space: nowrap;
  color: rgb(100 116 139);
  font-size: 0.8125rem;
  font-weight: 800;
}

.section-pager {
  margin-top: 1rem;
  display: flex;
  min-height: 44px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-top: 1px solid rgb(226 232 240);
  padding-top: 1rem;
  color: rgb(100 116 139);
  font-size: 0.8125rem;
  font-weight: 700;
}

.section-pager > span {
  min-width: 0;
  overflow-wrap: anywhere;
  line-height: 1.5;
}

.section-pager-actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.section-pager-actions button {
  min-height: 36px;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0 0.85rem;
  color: rgb(51 65 85);
  font-size: 0.8125rem;
  font-weight: 800;
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}

.section-pager-actions button:hover:not(:disabled) {
  border-color: rgb(199 210 254);
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.section-pager-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.comment-report-mobile-list,
.post-report-mobile-list {
  display: none;
}

.comment-report-card {
  min-width: 0;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.875rem;
}

.comment-report-card-head {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.comment-report-eyebrow,
.comment-report-label,
.comment-report-fact dt,
.comment-report-reviewed {
  font-size: 0.75rem;
  color: rgb(100 116 139);
}

.comment-report-eyebrow {
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-weight: 700;
}

.comment-report-title {
  margin-top: 0.3rem;
  display: block;
  overflow-wrap: anywhere;
  color: rgb(79 70 229);
  font-size: 0.9375rem;
  font-weight: 800;
  line-height: 1.45;
}

.comment-report-object {
  margin-top: 0.85rem;
  min-width: 0;
  border-radius: 0.5rem;
  background: rgb(248 250 252);
  padding: 0.75rem;
}

.comment-report-label,
.comment-report-fact dt {
  display: block;
  font-weight: 800;
}

.comment-report-object-id {
  margin-top: 0.35rem;
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

.comment-report-summary,
.comment-report-detail,
.comment-report-note {
  overflow-wrap: anywhere;
  font-size: 0.8125rem;
  line-height: 1.55;
}

.comment-report-summary {
  margin-top: 0.35rem;
  color: rgb(71 85 105);
}

.comment-report-facts {
  margin-top: 0.75rem;
  display: grid;
  gap: 0.625rem;
}

.comment-report-fact {
  min-width: 0;
  border-radius: 0.5rem;
  background: rgb(248 250 252);
  padding: 0.625rem 0.75rem;
}

.comment-report-fact dd {
  margin-top: 0.3rem;
  overflow-wrap: anywhere;
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.45;
  color: rgb(30 41 59);
}

.comment-report-detail {
  margin-top: 0.75rem;
  color: rgb(100 116 139);
}

.comment-report-note {
  margin-top: 0.45rem;
  font-weight: 700;
  color: rgb(79 70 229);
}

.comment-report-card-actions {
  margin-top: 0.875rem;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  gap: 0.5rem;
}

.comment-report-card-actions .primary-button,
.comment-report-card-actions .secondary-button {
  width: 100%;
  min-width: 0;
}

.comment-report-reviewed {
  margin-top: 0.875rem;
  text-align: right;
}

.outbox-table {
  min-width: 820px;
}

.outbox-mobile-list {
  display: none;
}

.outbox-card {
  min-width: 0;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.875rem;
}

.outbox-card-topline,
.outbox-card-actions,
.outbox-card-meta {
  display: flex;
  min-width: 0;
  align-items: center;
}

.outbox-card-topline {
  justify-content: space-between;
  gap: 0.75rem;
}

.outbox-card-actions {
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 0.4rem;
}

.outbox-select-label {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  gap: 0.35rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  padding: 0 0.45rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(71 85 105);
}

.outbox-row-number {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0 0.55rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(71 85 105);
  white-space: nowrap;
}

.outbox-retry-count,
.outbox-card-meta,
.outbox-aggregate,
.outbox-id-detail {
  font-size: 0.75rem;
  color: rgb(100 116 139);
}

.outbox-card-main {
  margin-top: 0.75rem;
  min-width: 0;
}

.outbox-topic {
  overflow-wrap: anywhere;
  font-size: 0.9375rem;
  font-weight: 700;
  line-height: 1.45;
  color: rgb(15 23 42);
}

.outbox-aggregate {
  margin-top: 0.3rem;
  overflow-wrap: anywhere;
  line-height: 1.4;
}

.outbox-card-meta {
  margin-top: 0.75rem;
  justify-content: space-between;
  gap: 0.75rem;
  line-height: 1.4;
}

.outbox-card-meta time {
  overflow-wrap: anywhere;
}

.outbox-id-detail {
  flex-shrink: 0;
  text-align: right;
}

.outbox-id-detail summary {
  display: inline-flex;
  min-height: 40px;
  min-width: 44px;
  align-items: center;
  justify-content: flex-end;
  border-radius: 0.5rem;
  padding: 0 0.5rem;
  cursor: pointer;
  list-style: none;
  font-weight: 700;
}

.outbox-id-detail summary::-webkit-details-marker {
  display: none;
}

.outbox-id-detail span {
  display: block;
  max-width: min(16rem, 62vw);
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.6875rem;
  font-weight: 600;
}

.compact-action {
  min-height: 32px;
  padding: 0.35rem 0.65rem;
}

@media (min-width: 640px) {
  .admin-form {
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 1fr) auto;
  }

  .ai-metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 768px) {
  .analytics-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1180px) {
  .ai-metrics-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.dark .secondary-button,
.dark .filter-button,
.dark .icon-button,
.dark .section-pager-actions button,
.dark .field-textarea,
.dark .admin-input,
.dark .metric-card,
.dark .mobile-ops-summary,
.dark .mobile-ops-card,
.dark .ops-priority-card,
.dark .ops-priority-action,
.dark .ops-duty-brief,
.dark .ops-duty-card,
.dark .middleware-check-card,
.dark .ops-workbench-nav,
.dark .comment-report-card,
.dark .test-data-toggle,
.dark .outbox-card,
.dark .outbox-select-label,
.dark .outbox-row-number,
.dark .analytics-column,
.dark .ai-provider-row,
.dark .detail-section,
.dark .panel {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .secondary-button,
.dark .filter-button,
.dark .icon-button,
.dark .section-pager-actions button,
.dark .field-textarea,
.dark .admin-input,
.dark .test-data-toggle,
.dark .ops-priority-action,
.dark .ops-workbench-pane,
.dark .ops-row-number,
.dark .outbox-row-number,
.dark .ops-table td {
  color: rgb(203 213 225);
}

.dark .ops-workbench-pane small {
  color: rgb(148 163 184);
}

.dark .ops-workbench-pane-active {
  border-color: rgb(129 140 248) !important;
  background: rgb(49 46 129 / 0.65);
  color: rgb(238 242 255) !important;
}

.dark .ops-workbench-pane-active small {
  color: rgb(199 210 254);
}

.dark .filter-button-active {
  border-color: rgb(99 102 241);
  background: rgb(49 46 129);
  color: white;
}

.dark .secondary-button:hover:not(:disabled),
.dark .filter-button:hover:not(:disabled),
.dark .icon-button:hover:not(:disabled),
.dark .section-pager-actions button:hover:not(:disabled),
.dark .ops-priority-action:hover,
.dark .ops-workbench-nav button:hover {
  background: rgb(30 41 59);
}

.dark .metric-label,
.dark .task-stat span,
.dark .task-stat small,
.dark .analytics-empty,
.dark .ai-provider-row small,
.dark .analytics-column-head strong,
.dark .mobile-ops-card span,
.dark .mobile-ops-card small,
.dark .ops-priority-card span,
.dark .ops-priority-card small,
.dark .ops-duty-brief-head p,
.dark .ops-duty-card span,
.dark .ops-duty-card small,
.dark .middleware-check-card span,
.dark .middleware-check-card p,
.dark .ops-duty-samples span,
.dark .ops-duty-samples p,
.dark .ops-duty-samples li,
.dark .comment-report-eyebrow,
.dark .comment-report-label,
.dark .comment-report-fact dt,
.dark .comment-report-reviewed,
.dark .ops-table th {
  color: rgb(148 163 184);
}

.dark .metric-value,
.dark .ai-provider-row span,
.dark .ai-provider-row strong,
.dark .analytics-column-head span,
.dark .analytics-title,
.dark .ops-pagination-note strong,
.dark .mobile-ops-head h2,
.dark .mobile-ops-card strong,
.dark .ops-priority-card strong,
.dark .ops-duty-brief-head h2,
.dark .ops-duty-card strong,
.dark .middleware-check-card strong,
.dark .comment-report-object-id,
.dark .outbox-topic,
.dark .detail-section h4,
.dark .task-stat strong {
  color: rgb(248 250 252);
}

.dark .comment-report-summary,
.dark .comment-report-detail {
  color: rgb(148 163 184);
}

.dark .comment-report-fact dd {
  color: rgb(203 213 225);
}

.dark .comment-report-title,
.dark .comment-report-note {
  color: rgb(129 140 248);
}

.dark .ops-pagination-note {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .ops-pagination-note span,
.dark .ops-pagination-note small {
  color: rgb(148 163 184);
}

.dark .ops-duty-samples {
  border-top-color: rgb(30 41 59);
}

.dark .ops-window-summary,
.dark .ops-window-grid article {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

.dark .ops-window-head span,
.dark .ops-window-grid span,
.dark .ops-window-grid small {
  color: rgb(148 163 184);
}

.dark .ops-window-grid strong {
  color: rgb(248 250 252);
}

.dark .ops-window-head strong {
  background: rgb(113 63 18 / 0.72);
  color: rgb(254 240 138);
}

.dark .status-ok {
  background: rgb(30 64 175 / 0.38);
  color: rgb(191 219 254);
}

.dark .ops-priority-ok {
  border-color: rgb(30 64 175);
  background: linear-gradient(135deg, rgb(15 23 42), rgb(23 37 84 / 0.72));
}

.dark .ops-priority-muted {
  border-color: rgb(51 65 85);
  background: linear-gradient(135deg, rgb(15 23 42), rgb(30 41 59 / 0.72));
}

.dark .ops-priority-warn {
  border-color: rgb(146 64 14 / 0.75);
  background: linear-gradient(135deg, rgb(15 23 42), rgb(69 26 3 / 0.62));
}

.dark .ops-priority-danger {
  border-color: rgb(127 29 29 / 0.85);
  background: linear-gradient(135deg, rgb(15 23 42), rgb(76 5 25 / 0.66));
}

.dark .ops-duty-ok {
  border-color: rgb(22 101 52 / 0.75);
  background: rgb(5 46 22 / 0.42);
}

.dark .ops-duty-muted {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
}

.dark .ops-duty-warn {
  border-color: rgb(146 64 14 / 0.75);
  background: rgb(69 26 3 / 0.42);
}

.dark .ops-duty-danger {
  border-color: rgb(127 29 29 / 0.85);
  background: rgb(76 5 25 / 0.5);
}

.ops-page-dark .ops-priority-card {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.ops-page-dark .ops-priority-card span,
.ops-page-dark .ops-priority-card small {
  color: rgb(148 163 184);
}

.ops-page-dark .ops-priority-card strong {
  color: rgb(248 250 252);
}

.ops-page-dark .ops-priority-action {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.ops-page-dark .ops-priority-action:hover {
  background: rgb(30 41 59);
}

.ops-page-dark .ops-priority-ok {
  border-color: rgb(30 64 175);
  background: linear-gradient(135deg, rgb(15 23 42), rgb(23 37 84 / 0.72));
}

.ops-page-dark .ops-priority-muted {
  border-color: rgb(51 65 85);
  background: linear-gradient(135deg, rgb(15 23 42), rgb(30 41 59 / 0.72));
}

.ops-page-dark .ops-priority-warn {
  border-color: rgb(146 64 14 / 0.75);
  background: linear-gradient(135deg, rgb(15 23 42), rgb(69 26 3 / 0.62));
}

.ops-page-dark .ops-priority-danger {
  border-color: rgb(127 29 29 / 0.85);
  background: linear-gradient(135deg, rgb(15 23 42), rgb(76 5 25 / 0.66));
}

.ops-page-dark .ops-duty-brief,
.ops-page-dark .ops-duty-card {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.ops-page-dark .ops-duty-brief-head p,
.ops-page-dark .ops-duty-card span,
.ops-page-dark .ops-duty-card small,
.ops-page-dark .ops-duty-samples span,
.ops-page-dark .ops-duty-samples p,
.ops-page-dark .ops-duty-samples li {
  color: rgb(148 163 184);
}

.ops-page-dark .ops-duty-brief-head h2,
.ops-page-dark .ops-duty-card strong {
  color: rgb(248 250 252);
}

.ops-page-dark .ops-duty-samples {
  border-top-color: rgb(30 41 59);
}

.ops-page-dark .ops-window-summary,
.ops-page-dark .ops-window-grid article {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

.ops-page-dark .ops-window-head span,
.ops-page-dark .ops-window-grid span,
.ops-page-dark .ops-window-grid small {
  color: rgb(148 163 184);
}

.ops-page-dark .ops-window-grid strong {
  color: rgb(248 250 252);
}

.ops-page-dark .ops-window-head strong {
  background: rgb(113 63 18 / 0.72);
  color: rgb(254 240 138);
}

.ops-page-dark .ops-duty-ok {
  border-color: rgb(22 101 52 / 0.75);
  background: rgb(5 46 22 / 0.42);
}

.ops-page-dark .ops-duty-muted {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
}

.ops-page-dark .ops-duty-warn {
  border-color: rgb(146 64 14 / 0.75);
  background: rgb(69 26 3 / 0.42);
}

.ops-page-dark .ops-duty-danger {
  border-color: rgb(127 29 29 / 0.85);
  background: rgb(76 5 25 / 0.5);
}

.admin-row > * {
  min-width: 0;
}

@media (max-width: 639px) {
  .metric-card,
  .panel {
    padding: 1rem;
  }

  .admin-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .ops-table {
    min-width: 760px;
  }

  .report-table {
    min-width: 820px;
  }

  .ops-duty-brief-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .ops-duty-grid {
    grid-template-columns: 1fr;
  }

  .ops-window-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .ops-window-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .ops-priority-board {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .ops-priority-card {
    min-height: auto;
    gap: 0.75rem;
    padding: 0.875rem;
  }

  .ops-duty-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ops-window-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mobile-ops-summary {
    display: block;
    padding: 0.875rem;
  }

  .mobile-ops-grid {
    gap: 0.55rem;
  }

  .mobile-ops-card {
    padding: 0.65rem;
  }

  .mobile-ops-card strong {
    margin-top: 0.25rem;
    font-size: 1rem;
  }

  .mobile-ops-card small {
    font-size: 0.7rem;
  }

  .ops-workbench-nav {
    top: 64px;
    margin-inline: -0.25rem;
    padding: 0.35rem;
  }

  .ops-workbench-nav button {
    min-height: 44px;
    padding: 0.45rem 0.65rem;
  }

  .comment-report-desktop-table,
  .post-report-desktop-table,
  .outbox-desktop-table {
    display: none;
  }

  .comment-report-mobile-list,
  .post-report-mobile-list,
  .outbox-mobile-list {
    display: grid;
    gap: 0.75rem;
    padding-top: 1rem;
  }

  .icon-button {
    height: 44px;
    width: 44px;
  }

  .primary-button,
  .secondary-button,
  .filter-button,
  .test-data-toggle,
  .compact-action {
    min-height: 44px;
  }

  .outbox-select-label {
    min-height: 44px;
  }

  .desktop-risk-action {
    display: none !important;
  }

  .ai-provider-row {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }
}

@media (max-width: 520px) {
  .ops-duty-grid,
  .ops-window-grid {
    grid-template-columns: 1fr;
  }
}

.dark .task-stat,
.dark .analytics-column,
.dark .ai-provider-row,
.dark .comment-report-object,
.dark .comment-report-fact,
.dark .detail-section {
  background: rgb(2 6 23);
}

.dark .admin-row {
  border-color: rgb(30 41 59);
}

.dark .ops-table th,
.dark .ops-table td {
  border-bottom-color: rgb(30 41 59);
}

.dark .section-pager {
  border-top-color: rgb(30 41 59);
  color: rgb(148 163 184);
}
</style>
