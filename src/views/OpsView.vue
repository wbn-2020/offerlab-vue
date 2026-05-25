<template>
  <main class="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950">
    <div class="mx-auto max-w-7xl space-y-6">
      <section class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-sm font-medium text-primary-600 dark:text-primary-400">Admin Ops</p>
          <h1 class="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">运维中心</h1>
          <p class="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            查看搜索索引、Outbox 消息投递状态，并安全地处理单条失败消息。
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="button" class="secondary-button" :disabled="isLoading || isOutboxLoading" @click="refreshAll">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading || isOutboxLoading }" />
            刷新状态
          </button>
          <button v-if="canOps" type="button" class="primary-button" :disabled="isSubmitting || isTaskActive" @click="submitRebuild">
            <RotateCcw class="h-4 w-4" :class="{ 'animate-spin': isSubmitting || isTaskActive }" />
            {{ isTaskActive ? '重建中' : '重建索引' }}
          </button>
        </div>
      </section>

      <section v-if="loadError" class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        {{ loadError }}
      </section>

      <section v-if="canOps" class="grid gap-4 md:grid-cols-3">
        <article class="metric-card">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="metric-label">搜索服务</p>
              <h2 class="metric-value">{{ searchOnlineText }}</h2>
            </div>
            <span :class="['status-pill', status?.search.available ? 'status-ok' : 'status-warn']">
              {{ status?.search.available ? 'Online' : 'Fallback' }}
            </span>
          </div>
          <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {{ status?.search.indexName || '--' }} / {{ status?.search.indexReady ? '索引可用' : '索引未就绪' }}
          </p>
        </article>

        <article class="metric-card">
          <p class="metric-label">待投递 Outbox</p>
          <h2 class="metric-value">{{ status?.outbox.byStatus.pending ?? '--' }}</h2>
          <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">
            当前到期可投递 {{ status?.outbox.duePending ?? '--' }} 条
          </p>
        </article>

        <article class="metric-card">
          <p class="metric-label">失败 Outbox</p>
          <h2 class="metric-value">{{ status?.outbox.byStatus.failed ?? '--' }}</h2>
          <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">
            已发送 {{ status?.outbox.byStatus.sent ?? '--' }} 条
          </p>
        </article>
      </section>

      <section class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article v-if="canOps" class="panel">
          <div class="flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">索引重建任务</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">提交后后台执行，页面会自动轮询任务状态。</p>
            </div>
            <span v-if="task" :class="['status-pill', taskStatusClass]">{{ task.status }}</span>
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
                <strong class="truncate text-sm">{{ task.indexName || '--' }}</strong>
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

        <article v-if="canAdmin" class="panel">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">权限状态</h2>
            <button type="button" class="icon-button" title="刷新管理员" :disabled="isAdminsLoading" @click="loadAdmins">
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isAdminsLoading }" />
            </button>
          </div>
          <div class="mt-5 space-y-4">
            <div class="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-950">
              <span class="text-sm text-slate-600 dark:text-slate-300">Admin 模式</span>
              <span :class="['status-pill', adminModeClass]">
                {{ adminModeText }}
              </span>
            </div>
            <p class="text-sm leading-6 text-slate-500 dark:text-slate-400">
              生产环境建议使用数据库 RBAC 或 UID 白名单；本地宽松模式只用于未配置 admin 时的开发验证。
            </p>
            <div class="admin-form">
              <input
                v-model.trim="adminForm.uid"
                class="admin-input"
                inputmode="numeric"
                placeholder="用户 UID"
                :disabled="isAdminSubmitting"
              />
              <select v-model="adminForm.roleCode" class="admin-input" :disabled="isAdminSubmitting">
                <option value="ADMIN">ADMIN</option>
                <option value="OPS">OPS</option>
                <option value="CONTENT_MODERATOR">CONTENT_MODERATOR</option>
                <option value="QUESTION_OPERATOR">QUESTION_OPERATOR</option>
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
                    <span class="truncate font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{{ admin.uid }}</span>
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

        <article v-if="canModerate" class="panel">
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
          <div v-else class="overflow-x-auto pt-4">
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
                <tr v-for="report in commentReports" :key="report.reportId">
                  <td class="font-mono text-xs">{{ report.reportId }}</td>
                  <td class="font-mono text-xs">{{ report.commentId }}</td>
                  <td>
                    <RouterLink class="font-mono text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400" :to="`/post/${report.postId}`">
                      {{ report.postId }}
                    </RouterLink>
                  </td>
                  <td class="max-w-[260px]">
                    <p class="font-semibold text-slate-800 dark:text-slate-100">{{ report.reason }}</p>
                    <p class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{{ report.detail || '--' }}</p>
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
                        @click="reviewCommentReport(report, true)"
                      >
                        通过隐藏
                      </button>
                      <button
                        type="button"
                        class="secondary-button compact-action"
                        :disabled="reviewingCommentReportId === report.reportId"
                        @click="reviewCommentReport(report, false)"
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
        </article>
      </section>

      <section v-if="canOps" class="panel">
        <div class="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">Outbox 消息</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">只展示最近消息，失败消息支持单条和批量重试。</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="secondary-button"
              :disabled="selectedFailedIds.length === 0 || isBatchRetrying"
              @click="retrySelectedMessages"
            >
              <RotateCcw class="h-4 w-4" :class="{ 'animate-spin': isBatchRetrying }" />
              批量重试 {{ selectedFailedIds.length || '' }}
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
          正在加载 Outbox 消息...
        </div>
        <div v-else-if="outboxMessages.length === 0" class="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
          当前筛选下暂无消息。
        </div>
        <div v-else class="overflow-x-auto">
          <table class="ops-table">
            <thead>
              <tr>
                <th>选择</th>
                <th>ID</th>
                <th>Topic</th>
                <th>聚合</th>
                <th>状态</th>
                <th>重试</th>
                <th>创建时间</th>
                <th class="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="message in outboxMessages" :key="message.id">
                <td>
                  <input
                    v-if="message.msgStatus === 2"
                    type="checkbox"
                    class="h-4 w-4 accent-indigo-600"
                    :checked="selectedFailedIds.includes(message.id)"
                    @change="toggleFailedSelection(message.id)"
                  />
                  <span v-else>--</span>
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
                      class="icon-button danger-action"
                      title="重试失败消息"
                      :disabled="retryingId === message.id"
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
      </section>

      <section class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article v-if="canQuestion" class="panel">
          <div class="flex items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">AI 题目提取任务</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">查看面经题目提取状态，失败任务可直接重试。</p>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" class="secondary-button compact-action" :disabled="isQuestionRebuilding" @click="rebuildQuestions">
                <RotateCcw class="h-4 w-4" :class="{ 'animate-spin': isQuestionRebuilding }" />
                重建题库
              </button>
              <button type="button" class="secondary-button compact-action" :disabled="isQuestionIndexRebuilding" @click="rebuildQuestionIndex">
                <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isQuestionIndexRebuilding }" />
                重建索引
              </button>
              <button type="button" class="icon-button" title="刷新 AI 任务" :disabled="isAiTasksLoading" @click="loadAiTasks">
                <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isAiTasksLoading }" />
              </button>
            </div>
          </div>

          <div v-if="isAiTasksLoading" class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            正在加载 AI 任务...
          </div>
          <div v-else-if="aiTasks.length === 0" class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            暂无 AI 提取任务。
          </div>
          <div v-else class="space-y-3 pt-5">
            <div v-for="item in aiTasks" :key="item.id" class="admin-row task-row">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <RouterLink :to="`/post/${item.postId}`" class="truncate font-mono text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400">
                    {{ item.postId }}
                  </RouterLink>
                  <span :class="['status-pill', aiTaskStatusClass(item.taskStatus)]">{{ aiTaskStatusText(item.taskStatus) }}</span>
                </div>
                <p class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                  题目 {{ item.questionCount }} · 重试 {{ item.retryCount }} · {{ item.errorMessage || formatTime(item.updateTime || item.createTime) }}
                </p>
              </div>
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
        </article>

        <article v-if="canOps" class="panel">
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
            <div v-for="item in recentTasks" :key="item.taskId" class="admin-row task-row">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="truncate font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">{{ item.taskId }}</span>
                  <span :class="['status-pill', searchTaskStatusClass(item.status)]">{{ item.status }}</span>
                </div>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  已索引 {{ item.indexed }} / {{ item.total }}，失败 {{ item.failed }} · {{ formatTime(item.updatedAt || item.createdAt) }}
                </p>
              </div>
              <strong class="text-sm text-slate-700 dark:text-slate-200">{{ item.indexName || '--' }}</strong>
            </div>
          </div>
        </article>

        <article v-if="canModerate" class="panel">
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
          <div v-else class="overflow-x-auto pt-4">
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
                <tr v-for="report in postReports" :key="report.reportId">
                  <td class="font-mono text-xs">{{ report.reportId }}</td>
                  <td>
                    <RouterLink class="font-mono text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400" :to="`/post/${report.postId}`">
                      {{ report.postId }}
                    </RouterLink>
                  </td>
                  <td class="max-w-[260px]">
                    <p class="font-semibold text-slate-800 dark:text-slate-100">{{ report.reason }}</p>
                    <p class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{{ report.detail || '--' }}</p>
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
                        @click="reviewReport(report, true)"
                      >
                        通过下架
                      </button>
                      <button
                        type="button"
                        class="secondary-button compact-action"
                        :disabled="reviewingReportId === report.reportId"
                        @click="reviewReport(report, false)"
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
        </article>
      </section>
    </div>

    <div v-if="selectedOutbox" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" @click.self="selectedOutbox = null">
      <article class="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-900">
        <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h3 class="text-lg font-semibold text-slate-950 dark:text-slate-50">Outbox 详情</h3>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ selectedOutbox.topic }} / {{ selectedOutbox.id }}</p>
          </div>
          <button type="button" class="secondary-button" @click="selectedOutbox = null">关闭</button>
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
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { FileText, Power, RefreshCw, RotateCcw, UserPlus } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import { opsApi, type AdminUserRole, type AiExtractTask, type MyAdminPermissions, type OpsStatus, type OutboxMessage } from '@/api/ops'
import { searchApi, type SearchIndexTask } from '@/api/search'
import { postApi } from '@/api/post'
import { interactionApi } from '@/api/interaction'
import type { ApiId, CommentReport, PostReport } from '@/api/types'

const status = ref<OpsStatus | null>(null)
const permissions = ref<MyAdminPermissions | null>(null)
const task = ref<SearchIndexTask | null>(null)
const adminUsers = ref<AdminUserRole[]>([])
const outboxMessages = ref<OutboxMessage[]>([])
const aiTasks = ref<AiExtractTask[]>([])
const recentTasks = ref<SearchIndexTask[]>([])
const postReports = ref<PostReport[]>([])
const commentReports = ref<CommentReport[]>([])
const selectedOutbox = ref<OutboxMessage | null>(null)
const outboxStatusFilter = ref<number | undefined>(undefined)
const reportStatusFilter = ref<number | undefined>(0)
const commentReportStatusFilter = ref<number | undefined>(0)
const adminForm = ref({ uid: '', roleCode: 'ADMIN', remark: '' })
const isLoading = ref(false)
const isAdminsLoading = ref(false)
const isAdminSubmitting = ref(false)
const isOutboxLoading = ref(false)
const isAiTasksLoading = ref(false)
const isTasksLoading = ref(false)
const isReportsLoading = ref(false)
const isCommentReportsLoading = ref(false)
const isSubmitting = ref(false)
const adminActionUid = ref<ApiId | null>(null)
const retryingId = ref<ApiId | null>(null)
const retryingAiTaskId = ref<ApiId | null>(null)
const reviewingReportId = ref<PostReport['reportId'] | null>(null)
const reviewingCommentReportId = ref<CommentReport['reportId'] | null>(null)
const selectedFailedIds = ref<ApiId[]>([])
const isBatchRetrying = ref(false)
const isQuestionRebuilding = ref(false)
const isQuestionIndexRebuilding = ref(false)
const loadError = ref('')
let pollTimer: number | undefined

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
const searchOnlineText = computed(() => {
  if (!status.value) return '--'
  if (!status.value.search.enabled) return '未启用'
  return status.value.search.available ? '在线' : '降级'
})
const adminModeText = computed(() => {
  if (!status.value) return '--'
  if (status.value.adminMode === 'RBAC') return 'RBAC'
  if (status.value.adminMode === 'WHITELIST') return '白名单'
  if (status.value.adminMode === 'RBAC_EMPTY') return 'RBAC 未启用'
  if (status.value.adminMode === 'LOCKED') return '未开放'
  return '本地宽松模式'
})
const adminModeClass = computed(() => {
  if (!status.value) return 'status-warn'
  if (status.value.adminMode === 'LOCKED') return 'status-danger'
  if (status.value.adminMode === 'LOCAL_OPEN' || status.value.adminMode === 'RBAC_EMPTY') return 'status-warn'
  return 'status-ok'
})
const taskStatusClass = computed(() => {
  if (task.value?.status === 'SUCCEEDED') return 'status-ok'
  if (task.value?.status === 'FAILED') return 'status-danger'
  return 'status-warn'
})
const taskProgress = computed(() => {
  if (!task.value) return 0
  if (task.value.status === 'SUCCEEDED') return 100
  if (task.value.total > 0) {
    return Math.min(100, Math.round(((task.value.indexed + task.value.failed) / task.value.total) * 100))
  }
  return task.value.status === 'RUNNING' ? 35 : 8
})
const taskTimeText = computed(() => {
  if (!task.value?.updatedAt) return '等待任务状态更新'
  return `最近更新：${task.value.updatedAt.replace('T', ' ')}`
})

const loadPermissions = async () => {
  try {
    const res = await opsApi.myPermissions()
    permissions.value = res.data
  } catch (error: any) {
    loadError.value = getErrorMessage(error, '管理权限接口暂不可用')
    permissions.value = null
  }
}

const loadStatus = async () => {
  if (!canOps.value) return
  isLoading.value = true
  loadError.value = ''
  try {
    const res = await opsApi.status()
    status.value = res.data
  } catch (error: any) {
    loadError.value = getErrorMessage(error, '运维状态接口暂不可用')
  } finally {
    isLoading.value = false
  }
}

const loadOutbox = async () => {
  if (!canOps.value) return
  isOutboxLoading.value = true
  try {
    const res = await opsApi.listOutbox({ status: outboxStatusFilter.value, limit: 30 })
    outboxMessages.value = res.data || []
    selectedFailedIds.value = selectedFailedIds.value.filter((id) =>
      outboxMessages.value.some((message) => message.id === id && message.msgStatus === 2),
    )
  } catch (error: any) {
    toast.error(getErrorMessage(error, 'Outbox 消息加载失败'))
    outboxMessages.value = []
  } finally {
    isOutboxLoading.value = false
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

const loadTasks = async () => {
  if (!canOps.value) return
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

const loadReports = async () => {
  if (!canModerate.value) return
  isReportsLoading.value = true
  try {
    const res = await postApi.listAdminReports({ status: reportStatusFilter.value, limit: 20 })
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
    const res = await interactionApi.listAdminCommentReports({ status: commentReportStatusFilter.value, limit: 20 })
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
  if (canOps.value) loaders.push(loadStatus(), loadOutbox(), loadTasks())
  if (canQuestion.value) loaders.push(loadAiTasks())
  if (canAdmin.value) loaders.push(loadAdmins())
  if (canModerate.value) loaders.push(loadReports(), loadCommentReports())
  await Promise.all(loaders)
}

const setOutboxStatus = async (statusValue?: number) => {
  outboxStatusFilter.value = statusValue
  await loadOutbox()
}

const setReportStatus = async (statusValue?: number) => {
  reportStatusFilter.value = statusValue
  await loadReports()
}

const setCommentReportStatus = async (statusValue?: number) => {
  commentReportStatusFilter.value = statusValue
  await loadCommentReports()
}

const stopPolling = () => {
  if (pollTimer) {
    window.clearInterval(pollTimer)
    pollTimer = undefined
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

const submitRebuild = async () => {
  isSubmitting.value = true
  try {
    const res = await searchApi.rebuildIndex()
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

const retryMessage = async (message: OutboxMessage) => {
  retryingId.value = message.id
  try {
    await opsApi.retryOutbox(message.id)
    toast.success('失败消息已重置为待投递')
    await refreshAll()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '重试失败消息失败'))
  } finally {
    retryingId.value = null
  }
}

const retryAiTask = async (task: AiExtractTask) => {
  retryingAiTaskId.value = task.id
  try {
    await opsApi.retryAiTask(task.id)
    toast.success('AI 提取任务已重试')
    await loadAiTasks()
  } catch (error: any) {
    toast.error(getErrorMessage(error, 'AI 任务重试失败'))
  } finally {
    retryingAiTaskId.value = null
  }
}

const rebuildQuestions = async () => {
  isQuestionRebuilding.value = true
  try {
    const res = await opsApi.rebuildQuestions(100)
    toast.success(`已提交 ${res.data?.submitted ?? 0} 个题库重建任务`)
    await loadAiTasks()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '题库重建任务提交失败'))
  } finally {
    isQuestionRebuilding.value = false
  }
}

const rebuildQuestionIndex = async () => {
  isQuestionIndexRebuilding.value = true
  try {
    const res = await opsApi.rebuildQuestionIndexTask()
    toast.success(res.data?.taskId ? '题库索引重建任务已提交' : '题库索引重建已提交')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '题库索引重建失败'))
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
  isBatchRetrying.value = true
  try {
    const res = await opsApi.retryOutboxBatch(selectedFailedIds.value)
    toast.success(`已重置 ${res.data?.retried ?? 0} / ${res.data?.requested ?? selectedFailedIds.value.length} 条失败消息`)
    selectedFailedIds.value = []
    await refreshAll()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '批量重试失败'))
  } finally {
    isBatchRetrying.value = false
  }
}

const reviewReport = async (report: PostReport, approved: boolean) => {
  reviewingReportId.value = report.reportId
  try {
    await postApi.reviewAdminReport(report.reportId, { approved })
    toast.success(approved ? '举报已通过，帖子已下架' : '举报已驳回')
    await loadReports()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '举报审核失败'))
  } finally {
    reviewingReportId.value = null
  }
}

const reviewCommentReport = async (report: CommentReport, approved: boolean) => {
  reviewingCommentReportId.value = report.reportId
  try {
    await interactionApi.reviewAdminCommentReport(report.reportId, { approved })
    toast.success(approved ? '评论举报已通过，评论已隐藏' : '评论举报已驳回')
    await loadCommentReports()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '评论举报审核失败'))
  } finally {
    reviewingCommentReportId.value = null
  }
}

const addAdmin = async () => {
  const uid = adminForm.value.uid.trim()
  if (!/^\d+$/.test(uid)) {
    toast.error('请输入有效 UID')
    return
  }
  isAdminSubmitting.value = true
  try {
    await opsApi.addAdmin({ uid, roleCode: adminForm.value.roleCode, remark: adminForm.value.remark })
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
  adminActionUid.value = admin.uid
  const nextEnabled = !isAdminEnabled(admin)
  try {
    await opsApi.updateAdminStatus(admin.uid, { enabled: nextEnabled, roleCode: admin.roleCode, remark: admin.remark || '' })
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

const searchTaskStatusClass = (value: SearchIndexTask['status']) => {
  if (value === 'SUCCEEDED') return 'status-ok'
  if (value === 'FAILED') return 'status-danger'
  return 'status-warn'
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

const formatTime = (value?: string) => value ? value.replace('T', ' ').slice(0, 19) : '--'

const formatPayload = (payload: string) => {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2)
  } catch {
    return payload || '--'
  }
}

onMounted(refreshAll)
onBeforeUnmount(stopPolling)
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

.primary-button:disabled,
.secondary-button:disabled,
.filter-button:disabled,
.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.metric-card,
.panel {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 1.25rem;
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

.status-danger {
  background: rgb(254 226 226);
  color: rgb(185 28 28);
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
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  padding: 0.75rem;
}

.task-row {
  min-height: 72px;
}

.report-table {
  min-width: 980px;
}

.compact-action {
  min-height: 32px;
  padding: 0.35rem 0.65rem;
}

@media (min-width: 640px) {
  .admin-form {
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 1fr) auto;
  }
}

:global(.dark) .secondary-button,
:global(.dark) .filter-button,
:global(.dark) .icon-button,
:global(.dark) .admin-input,
:global(.dark) .metric-card,
:global(.dark) .panel {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

:global(.dark) .secondary-button,
:global(.dark) .filter-button,
:global(.dark) .icon-button,
:global(.dark) .admin-input,
:global(.dark) .ops-table td {
  color: rgb(203 213 225);
}

:global(.dark) .filter-button-active {
  border-color: rgb(99 102 241);
  background: rgb(49 46 129);
  color: white;
}

:global(.dark) .secondary-button:hover:not(:disabled),
:global(.dark) .filter-button:hover:not(:disabled),
:global(.dark) .icon-button:hover:not(:disabled) {
  background: rgb(30 41 59);
}

:global(.dark) .metric-label,
:global(.dark) .task-stat span,
:global(.dark) .ops-table th {
  color: rgb(148 163 184);
}

:global(.dark) .metric-value,
:global(.dark) .task-stat strong {
  color: rgb(248 250 252);
}

:global(.dark) .task-stat {
  background: rgb(2 6 23);
}

:global(.dark) .admin-row {
  border-color: rgb(30 41 59);
}

:global(.dark) .ops-table th,
:global(.dark) .ops-table td {
  border-bottom-color: rgb(30 41 59);
}
</style>
