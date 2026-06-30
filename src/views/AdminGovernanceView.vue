<template>
  <div class="governance-page min-h-screen">
    <AppHeader />
    <main class="mx-auto max-w-7xl min-w-0 px-4 py-8">
      <section class="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-sm font-medium text-primary-600 dark:text-primary-400">内容治理</p>
          <h1 class="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">治理中心</h1>
          <p class="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            集中查看迁移状态、审计记录，并维护内容关键词与用户禁言封禁状态。
          </p>
        </div>
        <button type="button" class="secondary-button" :disabled="isLoading" @click="refreshAll">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
          刷新
        </button>
      </section>

      <section v-if="loadError" class="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        {{ loadError }}
      </section>

      <section class="governance-metric-grid mb-6 grid gap-4 md:grid-cols-4">
        <article v-if="canOps" class="metric-card">
          <span>迁移状态</span>
          <strong :class="migration?.ready ? 'text-emerald-600' : 'text-amber-600'">{{ migrationStatusText }}</strong>
        </article>
        <article v-if="canGlobalModerate" class="metric-card">
          <span>关键词</span>
          <strong>{{ keywords.length }}</strong>
        </article>
        <article v-if="canGlobalModerate" class="metric-card">
          <span>受限用户</span>
          <strong>{{ users.length }}</strong>
        </article>
        <article v-if="canGlobalModerate" class="metric-card">
          <span>敏感词命中</span>
          <strong>{{ hits.length }}</strong>
        </article>
        <article v-if="canGlobalModerate" class="metric-card">
          <span>运营专题</span>
          <strong>{{ topics.length }}</strong>
        </article>
        <article v-if="canGlobalModerate" class="metric-card">
          <span>治理标签</span>
          <strong>{{ tags.length }}</strong>
        </article>
        <article v-if="canModerate" class="metric-card">
          <span>待处理举报</span>
          <strong>{{ pendingReportCount }}</strong>
        </article>
        <article v-if="canModerate" class="metric-card">
          <span>审核队列</span>
          <strong>{{ reviewQueueItems.length }}</strong>
        </article>
      </section>

      <section class="tabs">
        <button v-for="tab in visibleTabs" :key="tab.value" type="button" :class="['tab-button', activeTab === tab.value ? 'tab-active' : '']" @click="activeTab = tab.value">
          {{ tab.label }}
        </button>
      </section>

      <section v-if="canModerate" class="domain-filter mb-6">
        <div class="domain-filter-header">
          <div>
            <p class="text-xs font-bold uppercase text-slate-400">Domain scope</p>
            <h2 class="text-base font-extrabold text-slate-950 dark:text-slate-50">领域治理范围</h2>
          </div>
          <p class="text-sm font-semibold text-slate-500">{{ domainScopeText }}</p>
        </div>
        <div class="domain-filter-actions">
          <button v-if="canGlobalModerate" type="button" :class="['tab-button', selectedGovernanceDomain === '' ? 'tab-active' : '']" @click="setSelectedGovernanceDomain('')">
            全部领域
          </button>
          <button
            v-for="domain in governanceDomainOptions"
            :key="domain.value"
            type="button"
            :class="['tab-button', Number(selectedGovernanceDomain) === domain.value ? 'tab-active' : '']"
            @click="setSelectedGovernanceDomain(domain.value)"
          >
            {{ domain.icon }} {{ domain.label }}
          </button>
        </div>
      </section>

      <section v-if="activeTab === 'migration'" class="panel">
        <h2 class="panel-title">迁移检查</h2>
        <div class="grid gap-4 lg:grid-cols-2">
          <StatusList title="表" :items="migration?.tables || {}" />
          <StatusList title="索引" :items="migration?.indexes || {}" />
        </div>
      </section>

      <section v-else-if="activeTab === 'keywords'" class="grid gap-6 lg:grid-cols-[1fr_380px]">
        <article class="panel">
          <h2 class="panel-title">敏感词</h2>
          <div class="space-y-3">
            <button v-for="item in keywords" :key="item.id" type="button" class="row-card" @click="selectKeyword(item)">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <span :class="['status-pill', item.enabled === 1 ? 'status-ok' : 'status-muted']">{{ item.enabled === 1 ? '启用' : '停用' }}</span>
                  <strong>{{ item.keyword }}</strong>
                  <span class="meta-chip">{{ moderationScopeText(item.scope) }}</span>
                  <span class="meta-chip">{{ keywordMatchTypeText(item.matchType) }}</span>
                </div>
                <p class="mt-2 text-sm text-slate-500">{{ item.remark || '暂无备注' }}</p>
              </div>
            </button>
          </div>
        </article>

        <aside class="panel h-fit">
          <h2 class="panel-title">{{ selectedKeyword ? '编辑关键词' : '新增关键词' }}</h2>
          <form class="space-y-3" @submit.prevent="saveKeyword">
            <input v-model.trim="keywordForm.keyword" class="field-input" placeholder="关键词" />
            <select v-model="keywordForm.scope" class="field-input">
              <option value="ALL">全部范围</option>
              <option value="POST">帖子</option>
              <option value="COMMENT">评论</option>
              <option value="REPORT">举报</option>
            </select>
            <select v-model="keywordForm.matchType" class="field-input">
              <option value="CONTAINS">包含匹配</option>
              <option value="EXACT">精确匹配</option>
            </select>
            <select v-model="keywordForm.action" class="field-input">
              <option value="BLOCK">自动拦截</option>
              <option value="REVIEW">人工复核</option>
            </select>
            <select v-model="keywordForm.enabled" class="field-input">
              <option :value="1">启用</option>
              <option :value="0">停用</option>
            </select>
            <textarea v-model.trim="keywordForm.remark" class="field-input min-h-[90px]" placeholder="备注" />
            <div class="flex gap-2">
              <button type="submit" class="primary-button" :disabled="isSaving || keywordForm.keyword.length < 2">保存</button>
              <button type="button" class="secondary-button" @click="resetKeyword">新增</button>
            </div>
          </form>
        </aside>
      </section>

      <section v-else-if="activeTab === 'users'" class="grid gap-6 lg:grid-cols-[1fr_380px]">
        <article class="panel">
          <h2 class="panel-title">用户限制</h2>
          <div class="space-y-3">
            <div v-for="item in users" :key="item.uid" class="row-card">
              <div class="user-limit-row">
                <div class="user-limit-main">
                  <div class="user-brief">
                    <img v-if="item.avatarUrl" :src="item.avatarUrl" alt="" class="user-avatar" />
                    <div v-else class="user-avatar user-avatar-fallback">
                      <CircleUserRound class="h-5 w-5" />
                    </div>
                    <div class="min-w-0">
                      <strong class="block truncate text-slate-950 dark:text-slate-50">{{ item.nickname || `用户 ${item.uid}` }}</strong>
                      <span class="font-mono text-xs font-semibold text-slate-400">用户编号 {{ item.uid }}</span>
                    </div>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <span :class="['status-pill', isMuted(item) ? 'status-warn' : 'status-muted']">禁言至 {{ formatTime(item.mutedUntil) }}</span>
                    <span :class="['status-pill', isBanned(item) ? 'status-danger' : 'status-muted']">封禁至 {{ formatTime(item.bannedUntil) }}</span>
                  </div>
                  <p class="mt-2 text-sm text-slate-500">{{ item.reason || '暂无限制原因' }}</p>
                  <div class="violation-card">
                    <div class="flex flex-wrap items-center gap-2">
                      <AlertTriangle class="h-4 w-4 text-amber-600" />
                      <strong>最近违规</strong>
                      <span v-if="item.recentViolationKeyword" class="meta-chip">{{ item.recentViolationKeyword }}</span>
                      <span v-if="item.recentViolationAction" :class="['status-pill', item.recentViolationAction === 'REVIEW' ? 'status-warn' : 'status-danger']">{{ moderationActionText(item.recentViolationAction) }}</span>
                    </div>
                    <p class="mt-2 text-sm text-slate-500">{{ item.recentViolationSummary || '暂无敏感词命中记录' }}</p>
                    <p v-if="item.recentViolationTime" class="mt-1 text-xs font-semibold text-slate-400">{{ formatTime(item.recentViolationTime) }}</p>
                  </div>
                </div>
                <div class="user-limit-actions">
                  <button type="button" class="secondary-button" :disabled="!isMuted(item) || moderationActionKey === actionKey(item.uid, 'mute')" @click="clearUserMute(item)">
                    <Unlock class="h-4 w-4" />
                    解除禁言
                  </button>
                  <button type="button" class="secondary-button danger-button" :disabled="!isBanned(item) || moderationActionKey === actionKey(item.uid, 'ban')" @click="clearUserBan(item)">
                    <ShieldOff class="h-4 w-4" />
                    解除封禁
                  </button>
                </div>
              </div>
            </div>
          </div>
        </article>

        <aside class="panel h-fit">
          <h2 class="panel-title">设置限制</h2>
          <form class="space-y-3" @submit.prevent="saveUserState">
            <input v-model.trim="userForm.uid" class="field-input" inputmode="numeric" placeholder="用户编号" />
            <input v-model.number="userForm.muteHours" class="field-input" type="number" min="0" placeholder="禁言小时数，至少 1 小时" />
            <input v-model.number="userForm.banHours" class="field-input" type="number" min="0" placeholder="封禁小时数，至少 1 小时" />
            <textarea v-model.trim="userForm.reason" class="field-input min-h-[90px]" placeholder="原因" />
            <button type="submit" class="primary-button" :disabled="isSaving || !userForm.uid">保存</button>
          </form>
        </aside>
      </section>

      <section v-else-if="activeTab === 'hits'" class="panel">
        <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 class="panel-title !mb-1">敏感词命中日志</h2>
            <p class="text-sm text-slate-500">记录发布、评论、举报中的关键词命中，人工复核动作可用于后续人工巡检。</p>
          </div>
          <div class="grid gap-2 sm:grid-cols-5">
            <select v-model="hitFilters.scope" class="field-input">
              <option value="">全部范围</option>
              <option value="POST">帖子</option>
              <option value="COMMENT">评论</option>
              <option value="REPORT">举报</option>
            </select>
            <select v-model="hitFilters.action" class="field-input">
              <option value="">全部动作</option>
              <option value="BLOCK">自动拦截</option>
              <option value="REVIEW">人工复核</option>
            </select>
            <input v-model.trim="hitFilters.keyword" class="field-input" placeholder="关键词" />
            <input v-model.trim="hitFilters.uid" class="field-input" inputmode="numeric" placeholder="用户编号" />
            <button type="button" class="secondary-button" :disabled="isLoading" @click="loadHits">筛选</button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr><th>ID</th><th>范围</th><th>用户</th><th>关键词</th><th>动作</th><th>摘要</th><th>时间</th></tr>
            </thead>
            <tbody>
              <tr v-for="item in hits" :key="item.id">
                <td class="font-mono text-xs">{{ item.id }}</td>
                <td>{{ moderationScopeText(item.scope) }}</td>
                <td>{{ item.uid || '--' }}</td>
                <td>{{ item.keyword }}</td>
                <td><span :class="['status-pill', item.action === 'REVIEW' ? 'status-warn' : 'status-danger']">{{ moderationActionText(item.action) }}</span></td>
                <td class="max-w-[360px] truncate">{{ item.contentSummary || '--' }}</td>
                <td>{{ formatTime(item.createTime) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else-if="activeTab === 'featured'" class="grid gap-6 lg:grid-cols-[1fr_380px]">
        <article class="panel">
          <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 class="panel-title !mb-1">精选管理</h2>
              <p class="text-sm text-slate-500">设置后会进入首页精选流和发现页精选内容，取消精选会保留审计记录。</p>
            </div>
            <button type="button" class="secondary-button" :disabled="isLoading" @click="() => loadFeaturedPosts()">刷新精选</button>
          </div>
          <div v-if="featuredPosts.length" class="space-y-3">
            <div v-for="post in featuredPosts" :key="post.postId" class="row-card">
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="status-pill status-ok">精选</span>
                    <strong class="text-slate-950 dark:text-slate-50">{{ post.title }}</strong>
                  </div>
                  <p class="mt-2 line-clamp-2 text-sm text-slate-500">{{ post.summary || post.content?.slice(0, 120) || '暂无摘要' }}</p>
                  <div class="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>帖子 {{ post.postId }}</span>
                    <span>点赞 {{ post.counter?.like ?? 0 }}</span>
                    <span>收藏 {{ post.counter?.favorite ?? 0 }}</span>
                    <span>评论 {{ post.counter?.comment ?? 0 }}</span>
                  </div>
                </div>
                <button type="button" class="secondary-button danger-button" :disabled="featuredActionKey === String(post.postId)" @click="unsetFeatured(post)">
                  取消精选
                </button>
              </div>
            </div>
          </div>
          <div v-else class="empty-panel">暂无精选内容</div>
        </article>

        <aside class="panel h-fit">
          <h2 class="panel-title">设置精选</h2>
          <form class="space-y-3" @submit.prevent="setFeatured">
            <input v-model.trim="featuredForm.postId" class="field-input" inputmode="numeric" placeholder="帖子 ID" />
            <textarea v-model.trim="featuredForm.note" class="field-input min-h-[90px]" placeholder="精选原因，会写入审计备注" />
            <button type="submit" class="primary-button" :disabled="isSaving || !featuredForm.postId">设置精选</button>
          </form>
        </aside>
      </section>

      <section v-else-if="activeTab === 'moderators'" class="grid gap-6 lg:grid-cols-[1fr_380px]">
        <article class="panel">
          <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 class="panel-title !mb-1">领域版主管理</h2>
              <p class="text-sm text-slate-500">按领域分配治理人员，领域版主只能处理自己负责领域内的举报、精选和知识审核。</p>
            </div>
            <button type="button" class="secondary-button" :disabled="isLoading" @click="() => loadDomainModerators()">刷新版主</button>
          </div>
          <div v-if="domainModerators.length" class="space-y-3">
            <div v-for="item in domainModerators" :key="`${item.uid}:${item.domain}`" class="row-card">
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <span :class="['status-pill', item.enabled ? 'status-ok' : 'status-muted']">{{ item.enabled ? '启用' : '停用' }}</span>
                    <strong class="text-slate-950 dark:text-slate-50">UID {{ item.uid }}</strong>
                    <span class="meta-chip">{{ domainLabel(item.domain) }}</span>
                  </div>
                  <p class="mt-2 text-sm text-slate-500">创建人 {{ item.createdBy || '--' }} · {{ formatTime(item.updatedAt || item.createdAt) }}</p>
                </div>
                <button
                  v-if="canManageDomainModerators"
                  type="button"
                  :class="['secondary-button', item.enabled ? 'danger-button' : '']"
                  :disabled="moderatorActionKey === moderatorKey(item)"
                  @click="toggleDomainModeratorStatus(item)"
                >
                  {{ item.enabled ? '停用' : '启用' }}
                </button>
              </div>
            </div>
          </div>
          <div v-else class="empty-panel">当前领域暂无版主</div>
        </article>

        <aside class="panel h-fit">
          <h2 class="panel-title">新增领域版主</h2>
          <p v-if="!canManageDomainModerators" class="mb-3 text-sm font-semibold text-slate-500">只有超级管理员可以分配或停用领域版主。</p>
          <form class="space-y-3" @submit.prevent="saveDomainModerator">
            <input v-model.trim="moderatorForm.uid" class="field-input" inputmode="numeric" placeholder="用户 UID" :disabled="!canManageDomainModerators" />
            <select v-model.number="moderatorForm.domain" class="field-input" :disabled="!canManageDomainModerators">
              <option v-for="domain in DOMAIN_OPTIONS" :key="domain.value" :value="domain.value">{{ domain.icon }} {{ domain.label }}</option>
            </select>
            <textarea v-model.trim="moderatorForm.note" class="field-input min-h-[90px]" placeholder="分配原因，会写入审计" :disabled="!canManageDomainModerators" />
            <button type="submit" class="primary-button" :disabled="isSaving || !canManageDomainModerators || !moderatorForm.uid">保存版主</button>
          </form>
        </aside>
      </section>

      <section v-else-if="activeTab === 'topics'" class="grid gap-6 lg:grid-cols-[1fr_420px]">
        <article class="panel">
          <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 class="panel-title !mb-1">专题管理</h2>
              <p class="text-sm text-slate-500">维护社区专题、绑定标签、排序和上下线状态，前台首页与发现页会优先展示已上线专题。</p>
            </div>
            <div class="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)_auto]">
              <select v-model="topicFilters.status" class="field-input">
                <option value="">全部状态</option>
                <option value="1">已上线</option>
                <option value="0">已下线</option>
              </select>
              <input v-model.trim="topicFilters.keyword" class="field-input" placeholder="专题名 / 访问路径" @keyup.enter="() => loadTopics()" />
              <button type="button" class="secondary-button" :disabled="isLoading" @click="() => loadTopics()">筛选</button>
            </div>
          </div>
          <div v-if="topics.length" class="space-y-3">
            <div v-for="topic in topics" :key="topic.id" class="row-card">
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span :class="['status-pill', topic.status === 1 ? 'status-ok' : 'status-muted']">{{ topic.status === 1 ? '上线' : '下线' }}</span>
                    <span v-if="topic.featured" class="status-pill status-warn">精选专题</span>
                    <strong class="text-slate-950 dark:text-slate-50">{{ topic.name }}</strong>
                    <span class="meta-chip">路径 {{ topic.slug }}</span>
                  </div>
                  <p class="mt-2 line-clamp-2 text-sm text-slate-500">{{ topic.description || '暂无专题描述' }}</p>
                  <div class="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>内容 {{ topic.postCount ?? 0 }}</span>
                    <span>排序 {{ topic.sortOrder ?? 0 }}</span>
                    <span>类型 {{ topicTypeText(topic.topicType) }}</span>
                    <span v-if="topic.tags.length">标签 {{ topic.tags.map((tag) => tag.name).join(' / ') }}</span>
                  </div>
                </div>
                <div class="flex flex-wrap gap-2">
                  <RouterLink :to="`/topics/${topic.slug}`" class="secondary-button">查看</RouterLink>
                  <button type="button" class="secondary-button" @click="selectTopic(topic)">编辑</button>
                  <button
                    type="button"
                    :class="['secondary-button', topic.status === 1 ? 'danger-button' : '']"
                    :disabled="topicActionKey === String(topic.id)"
                    @click="toggleTopicStatus(topic)"
                  >
                    {{ topic.status === 1 ? '下线' : '上线' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-panel">暂无专题</div>
        </article>

        <aside class="panel h-fit">
          <h2 class="panel-title">{{ selectedTopic ? '编辑专题' : '新增专题' }}</h2>
          <div class="mb-4 flex flex-wrap gap-2">
            <button type="button" class="secondary-button" @click="fillDemoTopicTemplate">填入演示专题</button>
            <button type="button" class="secondary-button" :disabled="isSaving" @click="createDemoTopic">一键创建演示专题</button>
            <RouterLink :to="{ path: '/admin/ops', query: { includeTestData: '1' } }" class="secondary-button">测试数据模式</RouterLink>
          </div>
          <form class="space-y-3" @submit.prevent="saveTopic">
            <input v-model.trim="topicForm.name" class="field-input" placeholder="专题名称，例如 Spring Boot 实战" />
            <input v-model.trim="topicForm.slug" class="field-input" placeholder="访问路径，例如 spring-boot" />
            <select v-model="topicForm.topicType" class="field-input">
              <option value="tech_stack">技术栈</option>
              <option value="scenario">业务场景</option>
              <option value="resource">资源合集</option>
              <option value="project">项目专题</option>
              <option value="custom">自定义</option>
            </select>
            <textarea v-model.trim="topicForm.description" class="field-input min-h-[90px]" placeholder="专题描述" />
            <input v-model.trim="topicForm.coverUrl" class="field-input" placeholder="封面 URL，可选" />
            <input v-model.number="topicForm.sortOrder" class="field-input" type="number" min="0" max="9999" placeholder="排序，数字越大越靠前" />
            <input v-model.trim="topicForm.tagNames" class="field-input" placeholder="绑定标签，用逗号分隔，例如 Java,Spring Boot,Redis" />
            <select v-model.number="topicForm.status" class="field-input">
              <option :value="1">上线</option>
              <option :value="0">下线</option>
            </select>
            <label class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <input v-model="topicForm.featured" type="checkbox" />
              设为精选专题
            </label>
            <textarea v-model.trim="topicForm.note" class="field-input min-h-[80px]" placeholder="运营备注，会写入审计" />
            <div class="flex flex-wrap gap-2">
              <button type="submit" class="primary-button" :disabled="isSaving || topicForm.name.length < 2">保存专题</button>
              <button type="button" class="secondary-button" @click="resetTopic">新增</button>
            </div>
          </form>
        </aside>
      </section>

      <section v-else-if="activeTab === 'tags'" class="grid gap-6 lg:grid-cols-[1fr_420px]">
        <article class="panel">
          <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 class="panel-title !mb-1">标签治理</h2>
              <p class="text-sm text-slate-500">维护标签启用状态、推荐、同义词和合并关系，禁用标签不会破坏历史内容，但新内容不可继续使用。</p>
            </div>
            <div class="grid gap-2 sm:grid-cols-[120px_120px_minmax(0,1fr)_auto]">
              <select v-model="tagFilters.status" class="field-input">
                <option value="">全部状态</option>
                <option value="1">启用</option>
                <option value="0">禁用</option>
              </select>
              <select v-model="tagFilters.recommended" class="field-input">
                <option value="">全部推荐</option>
                <option value="true">已推荐</option>
                <option value="false">未推荐</option>
              </select>
              <input v-model.trim="tagFilters.keyword" class="field-input" placeholder="标签名 / 同义词" @keyup.enter="() => loadTags()" />
              <button type="button" class="secondary-button" :disabled="isLoading" @click="() => loadTags()">筛选</button>
            </div>
          </div>
          <div v-if="tags.length" class="tag-list-shell">
            <div class="tag-scroll-list" aria-label="标签治理列表">
            <div v-for="tag in pagedTags" :key="tag.id" class="row-card tag-row-card">
              <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span :class="['status-pill', isTagActive(tag) ? 'status-ok' : 'status-muted']">{{ isTagActive(tag) ? '启用' : '禁用' }}</span>
                    <span v-if="tag.recommended" class="status-pill status-warn">推荐</span>
                    <span v-if="tag.official" class="meta-chip">官方</span>
                    <strong class="tag-name text-slate-950 dark:text-slate-50">{{ tag.name }}</strong>
                    <span class="meta-chip tag-id-chip">ID {{ tag.id }}</span>
                  </div>
                  <div class="tag-meta-list mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span class="tag-meta-item">使用 {{ tag.count ?? 0 }}</span>
                    <span class="tag-meta-item">类型 {{ tagCategoryText(tag.tagType) }}</span>
                    <span v-if="tag.mergeTargetId" class="tag-meta-item">已合并到 {{ tag.mergeTargetId }}</span>
                    <span v-if="tag.synonyms?.length" class="tag-meta-item tag-synonyms">同义词 {{ tag.synonyms.join(' / ') }}</span>
                  </div>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button type="button" class="secondary-button" @click="selectTag(tag)">编辑</button>
                  <button type="button" class="secondary-button" :disabled="tagActionKey === tagAction(tag.id, 'recommend')" @click="toggleTagRecommended(tag)">
                    {{ tag.recommended ? '取消推荐' : '推荐' }}
                  </button>
                  <button
                    type="button"
                    :class="['secondary-button', isTagActive(tag) ? 'danger-button' : '']"
                    :disabled="tagActionKey === tagAction(tag.id, 'status')"
                    @click="toggleTagStatus(tag)"
                  >
                    {{ isTagActive(tag) ? '禁用' : '启用' }}
                  </button>
                </div>
              </div>
            </div>
            </div>
            <div class="pagination-bar compact-pagination tag-pagination">
              <div class="pagination-meta">
                <span>{{ tagRangeText }}</span>
                <span>每页 {{ tagPageSize }} 条</span>
              </div>
              <div class="pagination-actions">
                <button type="button" class="secondary-button" :disabled="tagPage <= 1" @click="changeTagPage(tagPage - 1)">上一页</button>
                <span class="pagination-page">第 {{ tagPage }} / {{ tagPageCount }} 页</span>
                <button type="button" class="secondary-button" :disabled="tagPage >= tagPageCount" @click="changeTagPage(tagPage + 1)">下一页</button>
              </div>
            </div>
          </div>
          <div v-else class="empty-panel">暂无标签</div>
        </article>

        <aside class="panel h-fit">
          <h2 class="panel-title">{{ selectedTag ? '编辑标签' : '选择标签' }}</h2>
          <form class="space-y-3" @submit.prevent="saveTag">
            <input v-model.trim="tagForm.name" class="field-input" placeholder="标签名称" />
            <select v-model.number="tagForm.tagType" class="field-input">
              <option :value="1">技术栈</option>
              <option :value="2">公司</option>
              <option :value="3">岗位</option>
              <option :value="4">自定义</option>
            </select>
            <select v-model.number="tagForm.status" class="field-input">
              <option :value="1">启用</option>
              <option :value="0">禁用</option>
            </select>
            <label class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <input v-model="tagForm.recommended" type="checkbox" />
              推荐标签
            </label>
            <input v-model.trim="tagForm.synonyms" class="field-input" placeholder="同义词，用逗号分隔" />
            <input v-model.trim="tagForm.mergeTargetId" class="field-input" inputmode="numeric" placeholder="合并目标标签 ID" />
            <textarea v-model.trim="tagForm.note" class="field-input min-h-[80px]" placeholder="治理备注，会写入审计" />
            <div class="flex flex-wrap gap-2">
              <button type="submit" class="primary-button" :disabled="isSaving || !selectedTag || tagForm.name.length < 1">保存标签</button>
              <button type="button" class="secondary-button" :disabled="!selectedTag || tagActionKey === tagAction(selectedTag?.id, 'synonyms')" @click="saveTagSynonyms">保存同义词</button>
              <button type="button" class="secondary-button danger-button" :disabled="!selectedTag || !tagForm.mergeTargetId" @click="mergeSelectedTag">合并标签</button>
              <button type="button" class="secondary-button" @click="resetTag">清空</button>
            </div>
          </form>
        </aside>
      </section>

      <section v-else-if="activeTab === 'queue'" class="panel">
        <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 class="panel-title !mb-1">审核队列</h2>
            <p class="text-sm text-slate-500">优先使用后端统一审核队列；后端不可用或暂未沉淀来源时，保留前端聚合预览辅助排查。</p>
            <div class="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              <span class="meta-chip">来源：{{ reviewQueueSourceText }}</span>
              <span class="meta-chip">后端 {{ backendReviewQueueItems.length }}</span>
              <span class="meta-chip">预览 {{ frontendReviewQueueItems.length }}</span>
            </div>
          </div>
          <div class="queue-filter-grid">
            <select v-model="queueFilters.sourceType" class="field-input">
              <option value="">全部来源</option>
              <option value="POST_REPORT">帖子举报</option>
              <option value="COMMENT_REPORT">评论举报</option>
              <option value="MODERATION_HIT">敏感词命中</option>
              <option value="QUESTION_PENDING">待审题目</option>
              <option value="AI_TASK_FAILED">失败 AI 任务</option>
            </select>
            <select v-model="queueFilters.riskLevel" class="field-input">
              <option value="">全部风险</option>
              <option value="critical">严重</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
            <button type="button" class="secondary-button" :disabled="isLoading" @click="loadReviewQueue">
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
              刷新队列
            </button>
          </div>
        </div>

        <div class="mb-4 grid gap-3 sm:grid-cols-4">
          <div class="review-metric"><span>全部待办</span><strong>{{ reviewQueueItems.length }}</strong></div>
          <div class="review-metric"><span>高风险</span><strong>{{ highRiskQueueCount }}</strong></div>
          <div class="review-metric"><span>举报</span><strong>{{ pendingReportCount }}</strong></div>
          <div class="review-metric"><span>筛选结果</span><strong>{{ filteredReviewQueueItems.length }}</strong></div>
        </div>

        <div v-if="reviewQueueLoadWarnings.length" class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <p v-for="warning in reviewQueueLoadWarnings" :key="warning">{{ warning }}</p>
        </div>

        <div v-if="filteredReviewQueueItems.length" class="space-y-3">
          <div v-for="item in filteredReviewQueueItems" :key="item.id" class="row-card">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span :class="['status-pill', queueRiskClass(item.riskLevel)]">{{ queueRiskText(item.riskLevel) }}</span>
                  <span class="meta-chip">{{ item.sourceLabel }}</span>
                  <span class="meta-chip">{{ queueTargetText(item.targetType) }} {{ item.targetId }}</span>
                  <strong class="text-slate-950 dark:text-slate-50">{{ item.title }}</strong>
                </div>
                <p class="mt-2 line-clamp-2 text-sm text-slate-500">{{ item.summary || '暂无摘要' }}</p>
                <div class="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>{{ item.status }}</span>
                  <span>{{ formatQueueTime(item.createdAt) }}</span>
                  <span>{{ queueSourceLabel(item.sourceType) }}</span>
                  <span v-if="item.assigneeUid">处理人 {{ item.assigneeUid }}</span>
                  <span v-if="item.handledAt">处理于 {{ formatQueueTime(item.handledAt) }}</span>
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <RouterLink :to="item.actionPath" class="secondary-button">{{ item.actionLabel }}</RouterLink>
                <button v-if="item.actionTab" type="button" class="secondary-button" @click="goToQueueItem(item)">在治理中心定位</button>
                <button v-if="canQueueAction(item, 'claim')" type="button" class="secondary-button" :disabled="isSaving" @click="handleReviewQueueAction(item, 'claim')">认领</button>
                <button v-if="canQueueAction(item, 'release')" type="button" class="secondary-button" :disabled="isSaving" @click="handleReviewQueueAction(item, 'release')">释放</button>
                <button v-if="canQueueAction(item, 'approve')" type="button" class="secondary-button" :disabled="isSaving" @click="handleReviewQueueAction(item, 'approve')">通过</button>
                <button v-if="canQueueAction(item, 'reject')" type="button" class="secondary-button danger-button" :disabled="isSaving" @click="handleReviewQueueAction(item, 'reject')">拒绝</button>
                <button v-if="canQueueAction(item, 'close')" type="button" class="secondary-button" :disabled="isSaving" @click="handleReviewQueueAction(item, 'close')">关闭</button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-panel">当前没有符合筛选条件的审核待办</div>
      </section>

      <section v-else-if="activeTab === 'review'" class="grid gap-6 lg:grid-cols-2">
        <article class="panel">
          <div class="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 class="panel-title !mb-1">内容审核总览</h2>
              <p class="text-sm text-slate-500">聚合举报、敏感词命中和后台审计，先形成治理台入口。</p>
            </div>
                <RouterLink v-if="canOps || canGlobalModerate" to="/admin/ops" class="secondary-button">进入运维审核</RouterLink>
          </div>
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="review-metric"><span>待处理举报</span><strong>{{ pendingReportCount }}</strong></div>
            <div class="review-metric"><span>待复核命中</span><strong>{{ reviewHitCount }}</strong></div>
            <div class="review-metric"><span>今日审计</span><strong>{{ auditLogs.length }}</strong></div>
          </div>
        </article>

        <article class="panel">
          <h2 class="panel-title">治理说明</h2>
          <div class="space-y-3 text-sm leading-6 text-slate-500">
            <p>帖子/评论举报仍由现有审核接口处理，治理中心提供统一入口和指标。</p>
            <p>关键词、禁言、封禁、精选等高风险操作使用确认弹窗，并写入后台审计日志。</p>
            <p>下一步可把待审帖子队列、标签合并和低质检测继续拆成独立后台表格。</p>
          </div>
        </article>
      </section>

      <section v-else class="panel">
        <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 class="panel-title !mb-1">审计日志</h2>
            <p class="text-sm text-slate-500">按动作、对象、操作者和日期定位后台操作。</p>
          </div>
          <div class="audit-filter-grid">
            <input v-model.trim="auditFilters.action" class="field-input" placeholder="动作关键字" />
            <input v-model.trim="auditFilters.resourceType" class="field-input" placeholder="对象类型" />
            <input v-model.trim="auditFilters.operatorUid" class="field-input" inputmode="numeric" placeholder="操作者编号" />
            <input v-model="auditFilters.startDate" class="field-input" type="date" />
            <input v-model="auditFilters.endDate" class="field-input" type="date" />
            <button type="button" class="secondary-button" :disabled="isLoading" @click="applyAuditFilters">筛选</button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr><th>序号</th><th>ID</th><th>操作者</th><th>动作</th><th>对象</th><th>备注</th><th>时间</th><th class="text-right">详情</th></tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in auditLogs" :key="item.id">
                <td class="row-number-cell">{{ auditRowNumber(index) }}</td>
                <td class="font-mono text-xs">{{ item.id }}</td>
                <td>{{ item.operatorUid || '--' }}</td>
                <td>{{ item.action }}</td>
                <td>{{ item.resourceType }} / {{ item.resourceId || '--' }}</td>
                <td>{{ item.remark || '--' }}</td>
                <td>{{ formatTime(item.createTime) }}</td>
                <td class="text-right">
                  <button type="button" class="text-button" @click="openAuditDetail(item)">查看</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pagination-bar">
          <div class="pagination-meta">
            <span>共 {{ auditTotal }} 条</span>
            <span>{{ auditRangeText }}</span>
            <span>每页 {{ auditPageSize }} 条</span>
          </div>
          <div class="pagination-actions">
            <button type="button" class="secondary-button" :disabled="isLoading || auditPage <= 1" @click="changeAuditPage(auditPage - 1)">上一页</button>
            <span class="pagination-page">第 {{ auditPage }} / {{ auditPageCount }} 页</span>
            <button type="button" class="secondary-button" :disabled="isLoading || !auditCanGoNext" @click="changeAuditPage(auditPage + 1)">下一页</button>
          </div>
        </div>
      </section>
    </main>

    <RiskConfirmDialog
      :state="riskConfirmState"
      @confirm="resolveRiskConfirm"
      @cancel="cancelRiskConfirm"
    />

    <div v-if="selectedAudit" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" @click.self="closeAuditDetail">
      <article class="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="audit-detail-title" tabindex="-1">
        <div class="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <p class="text-xs font-semibold tracking-wide text-slate-400">审计详情</p>
            <h2 id="audit-detail-title" class="mt-1 text-lg font-bold text-slate-950 dark:text-slate-50">{{ selectedAudit.action }}</h2>
            <p class="mt-1 text-sm text-slate-500">{{ selectedAudit.resourceType }} / {{ selectedAudit.resourceId || '--' }}</p>
          </div>
          <button ref="auditCloseButton" type="button" class="secondary-button" @click="closeAuditDetail">关闭</button>
        </div>
        <div class="grid max-h-[68vh] gap-4 overflow-auto p-5 lg:grid-cols-2">
          <div class="detail-card">
            <span>操作者</span>
            <strong>{{ selectedAudit.operatorUid || '--' }}</strong>
          </div>
          <div class="detail-card">
            <span>备注</span>
            <strong>{{ selectedAudit.remark || '--' }}</strong>
          </div>
          <div class="lg:col-span-2">
            <h3 class="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">变更前</h3>
            <pre class="json-box">{{ formatJson(selectedAudit.beforeJson) }}</pre>
          </div>
          <div class="lg:col-span-2">
            <h3 class="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">变更后</h3>
            <pre class="json-box">{{ formatJson(selectedAudit.afterJson) }}</pre>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { AlertTriangle, CircleUserRound, RefreshCw, ShieldOff, Unlock } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import RiskConfirmDialog from '@/components/admin/RiskConfirmDialog.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import { getErrorMessage } from '@/api/client'
import { opsApi, type AdminAuditLog, type MigrationStatus, type ModerationKeyword, type ModerationKeywordHit, type MyAdminPermissions, type ReviewQueueItem as BackendReviewQueueItem, type ReviewQueueRiskLevel, type ReviewQueueStatus, type UserModerationState } from '@/api/ops'
import { postApi, type DomainModerator } from '@/api/post'
import { interactionApi } from '@/api/interaction'
import type { Question } from '@/api/question'
import type { AiExtractTask } from '@/api/ops'
import type { CommentReport, CommunityTopic, Post, PostReport, Tag } from '@/api/types'
import { useAccessibleDialog } from '@/composables/useAccessibleDialog'
import { useRiskConfirm, type RiskConfirmRequest } from '@/composables/useRiskConfirm'
import { DOMAIN_OPTIONS, getDomainLabel } from '@/utils/domains'

const tabs = [
  { label: '迁移检查', value: 'migration', scope: 'ops' },
  { label: '敏感词', value: 'keywords', scope: 'globalModeration' },
  { label: '命中日志', value: 'hits', scope: 'globalModeration' },
  { label: '用户限制', value: 'users', scope: 'globalModeration' },
  { label: '精选管理', value: 'featured', scope: 'domainModeration' },
  { label: '专题管理', value: 'topics', scope: 'globalModeration' },
  { label: '标签治理', value: 'tags', scope: 'globalModeration' },
  { label: '审核队列', value: 'queue', scope: 'domainModeration' },
  { label: '审核总览', value: 'review', scope: 'domainModeration' },
  { label: '审计日志', value: 'audit', scope: 'ops' },
]

tabs.splice(tabs.findIndex((tab) => tab.value === 'topics'), 0, { label: '领域版主', value: 'moderators', scope: 'domainModeration' })

const route = useRoute()

type ReviewQueueSourceType = 'POST_REPORT' | 'COMMENT_REPORT' | 'MODERATION_HIT' | 'QUESTION_PENDING' | 'AI_TASK_FAILED' | string
type ReviewQueueRisk = ReviewQueueRiskLevel

interface ReviewQueueItem {
  id: string
  sourceType: ReviewQueueSourceType
  sourceLabel: string
  targetType: string
  targetId: string
  title: string
  summary: string
  riskLevel: ReviewQueueRisk
  status: string
  createdAt?: string | number
  actionPath: string
  actionLabel: string
  actionTab?: string
  backendItem?: BackendReviewQueueItem
  queueStatus?: ReviewQueueStatus
  assigneeUid?: string
  handledAt?: string | number
}

const requestedGovernanceTab = () => {
  const metaTab = route.meta.governanceTab
  if (typeof metaTab === 'string') return metaTab
  return typeof route.query.tab === 'string' ? route.query.tab : ''
}

const activeTab = ref(requestedGovernanceTab() || 'migration')
const isLoading = ref(false)
const isSaving = ref(false)
const loadError = ref('')
const permissions = ref<MyAdminPermissions | null>(null)
const migration = ref<MigrationStatus | null>(null)
const keywords = ref<ModerationKeyword[]>([])
const hits = ref<ModerationKeywordHit[]>([])
const users = ref<UserModerationState[]>([])
const featuredPosts = ref<Post[]>([])
const domainModerators = ref<DomainModerator[]>([])
const topics = ref<CommunityTopic[]>([])
const tags = ref<Tag[]>([])
const postReports = ref<PostReport[]>([])
const commentReports = ref<CommentReport[]>([])
const pendingQuestions = ref<Question[]>([])
const failedAiTasks = ref<AiExtractTask[]>([])
const backendReviewQueueItems = ref<BackendReviewQueueItem[]>([])
const safeBackendReviewQueueItems = computed<BackendReviewQueueItem[]>(() => Array.isArray(backendReviewQueueItems.value) ? backendReviewQueueItems.value : [])
const reviewQueueSource = ref<'backend' | 'frontend-fallback'>('frontend-fallback')
const reviewQueueLoadWarnings = ref<string[]>([])
const auditLogs = ref<AdminAuditLog[]>([])
const selectedAudit = ref<AdminAuditLog | null>(null)
const selectedKeyword = ref<ModerationKeyword | null>(null)
const auditCloseButton = ref<HTMLButtonElement | null>(null)
const keywordForm = reactive({ keyword: '', scope: 'ALL', matchType: 'CONTAINS', action: 'BLOCK', enabled: 1, remark: '' })
const hitFilters = reactive({ scope: '', action: '', keyword: '', uid: '' })
const auditFilters = reactive({ action: '', resourceType: '', operatorUid: '', startDate: '', endDate: '' })
const auditPage = ref(1)
const auditPageSize = ref(20)
const auditTotal = ref(0)
const auditHasMore = ref(false)
const moderationActionKey = ref('')
const userForm = reactive({ uid: '', muteHours: 0, banHours: 0, reason: '' })
const featuredForm = reactive({ postId: '', note: '' })
const featuredActionKey = ref('')
const selectedGovernanceDomain = ref<number | ''>('')
const moderatorForm = reactive({ uid: '', domain: DOMAIN_OPTIONS[0]?.value ?? 1, note: '' })
const moderatorActionKey = ref('')
const selectedTopic = ref<CommunityTopic | null>(null)
const topicFilters = reactive({ status: '', keyword: '' })
const topicForm = reactive({
  name: '',
  slug: '',
  description: '',
  topicType: 'tech_stack',
  coverUrl: '',
  sortOrder: 0,
  featured: false,
  status: 1,
  tagNames: '',
  note: '',
})
const topicActionKey = ref('')
const selectedTag = ref<Tag | null>(null)
const tagFilters = reactive({ status: '', recommended: '', keyword: '' })
const tagForm = reactive({ name: '', tagType: 1, status: 1, recommended: false, synonyms: '', mergeTargetId: '', note: '' })
const tagActionKey = ref('')
const tagPage = ref(1)
const tagPageSize = ref(6)
const queueFilters = reactive({ sourceType: '', riskLevel: '' })
const { riskConfirmState, confirmRisk, resolveRiskConfirm, cancelRiskConfirm } = useRiskConfirm()

const canOps = computed(() => Boolean(permissions.value?.ops || permissions.value?.admin))
const canGlobalModerate = computed(() => Boolean(permissions.value?.contentModerator || permissions.value?.admin))
const canDomainModerate = computed(() => Boolean(permissions.value?.domainModerator && (permissions.value?.moderatedDomains || []).length > 0))
const canModerate = computed(() => canGlobalModerate.value || canDomainModerate.value)
const canManageDomainModerators = computed(() => Boolean(permissions.value?.admin))
const canQuestionOps = computed(() => Boolean(permissions.value?.questionOperator || permissions.value?.admin))
const visibleTabs = computed(() => tabs.filter((tab) => {
  if (tab.scope === 'ops') return canOps.value
  if (tab.scope === 'globalModeration') return canGlobalModerate.value
  if (tab.scope === 'domainModeration') return canModerate.value
  return false
}))
const governanceDomainOptions = computed(() => {
  if (permissions.value?.admin || permissions.value?.contentModerator) return DOMAIN_OPTIONS
  const domains = new Set((permissions.value?.moderatedDomains || []).map((item) => Number(item)))
  return DOMAIN_OPTIONS.filter((item) => domains.has(item.value))
})
const selectedDomainParam = computed(() => selectedGovernanceDomain.value === '' ? undefined : Number(selectedGovernanceDomain.value))
const domainScopeText = computed(() => {
  if (permissions.value?.admin || permissions.value?.contentModerator) return '全域治理权限'
  const domains = permissions.value?.moderatedDomains || []
  return domains.length ? `领域版主：${domains.map((domain) => getDomainLabel(domain)).join(' / ')}` : '暂无领域治理权限'
})
const pendingPostReportCount = computed(() => postReports.value.filter((item) => Number(item.reportStatus ?? 0) === 0).length)
const pendingCommentReportCount = computed(() => commentReports.value.filter((item) => Number(item.reportStatus ?? 0) === 0).length)
const pendingReportCount = computed(() => pendingPostReportCount.value + pendingCommentReportCount.value)
const reviewHitCount = computed(() => hits.value.filter((item) => item.action === 'REVIEW').length)
const auditPageCount = computed(() => Math.max(1, Math.ceil(auditTotal.value / auditPageSize.value)))
const auditCanGoNext = computed(() => auditHasMore.value || (auditTotal.value > 0 && auditPage.value < auditPageCount.value))
const auditRangeText = computed(() => {
  if (auditLogs.value.length === 0 || auditTotal.value <= 0) return '本次未加载到记录'
  const start = (auditPage.value - 1) * auditPageSize.value + 1
  const end = Math.min(auditTotal.value, start + auditLogs.value.length - 1)
  return `显示 ${start}-${end} 条`
})
const auditRowNumber = (index: number) => (auditPage.value - 1) * auditPageSize.value + index + 1
const tagPageCount = computed(() => Math.max(1, Math.ceil(tags.value.length / tagPageSize.value)))
const safeTagPage = computed(() => Math.min(Math.max(tagPage.value, 1), tagPageCount.value))
const pagedTags = computed(() => {
  const start = (safeTagPage.value - 1) * tagPageSize.value
  return tags.value.slice(start, start + tagPageSize.value)
})
const tagRangeText = computed(() => {
  if (tags.value.length === 0) return '本次未加载到标签'
  const start = (safeTagPage.value - 1) * tagPageSize.value + 1
  const end = Math.min(tags.value.length, start + pagedTags.value.length - 1)
  return `共 ${tags.value.length} 个标签，显示 ${start}-${end}`
})
const clampTagPage = () => {
  tagPage.value = safeTagPage.value
}
const changeTagPage = (page: number) => {
  tagPage.value = Math.min(Math.max(page, 1), tagPageCount.value)
}
const frontendReviewQueueItems = computed<ReviewQueueItem[]>(() => {
  const items: ReviewQueueItem[] = []
  postReports.value
    .filter((item) => Number(item.reportStatus ?? 0) === 0)
    .forEach((item) => {
      items.push({
        id: `post-report-${item.reportId}`,
        sourceType: 'POST_REPORT',
        sourceLabel: '帖子举报',
        targetType: 'POST',
        targetId: String(item.postId),
        title: item.postTitle || `帖子举报 ${item.postId}`,
        summary: queueSummary([item.reason, item.detail, item.postSummary]),
        riskLevel: 'high',
        status: '待处理举报',
        createdAt: item.createTime,
        actionPath: `/post/${item.postId}`,
        actionLabel: '查看帖子',
        actionTab: 'review',
      })
    })
  commentReports.value
    .filter((item) => Number(item.reportStatus ?? 0) === 0)
    .forEach((item) => {
      items.push({
        id: `comment-report-${item.reportId}`,
        sourceType: 'COMMENT_REPORT',
        sourceLabel: '评论举报',
        targetType: 'COMMENT',
        targetId: String(item.commentId),
        title: item.postTitle || `评论举报 ${item.commentId}`,
        summary: queueSummary([item.reason, item.detail, item.commentSummary]),
        riskLevel: 'high',
        status: '待处理举报',
        createdAt: item.createTime,
        actionPath: `/post/${item.postId}`,
        actionLabel: '查看原帖',
        actionTab: 'review',
      })
    })
  hits.value
    .filter((item) => item.action === 'REVIEW')
    .forEach((item) => {
      items.push({
        id: `moderation-hit-${item.id}`,
        sourceType: 'MODERATION_HIT',
        sourceLabel: '敏感词命中',
        targetType: item.scope || 'CONTENT',
        targetId: String(item.uid || item.id),
        title: `${moderationScopeText(item.scope || 'CONTENT')}命中 ${item.keyword}`,
        summary: item.contentSummary || '命中内容暂无摘要',
        riskLevel: 'medium',
        status: '待人工巡检',
        createdAt: item.createTime,
        actionPath: '/admin/governance',
        actionLabel: '查看命中日志',
        actionTab: 'hits',
      })
    })
  pendingQuestions.value
    .filter((item) => Number(item.status ?? 0) === 0)
    .forEach((item) => {
      items.push({
        id: `question-pending-${item.id}`,
        sourceType: 'QUESTION_PENDING',
        sourceLabel: '待审题目',
        targetType: 'QUESTION',
        targetId: String(item.id),
        title: item.questionText || `待审题目 ${item.id}`,
        summary: queueSummary([item.examPoint, item.qualityReason, item.sourceSnippet]),
        riskLevel: 'medium',
        status: '待题目审核',
        createdAt: item.updatedAt || item.createdAt,
        actionPath: '/admin/questions',
        actionLabel: '进入题目审核',
      })
    })
  failedAiTasks.value
    .filter((item) => Number(item.taskStatus) === 3)
    .forEach((item) => {
      items.push({
        id: `ai-task-failed-${item.id}`,
        sourceType: 'AI_TASK_FAILED',
        sourceLabel: '失败 AI 任务',
        targetType: 'AI_TASK',
        targetId: String(item.id),
        title: `AI 任务失败：帖子 ${item.postId}`,
        summary: queueSummary([item.errorCode, item.errorMessage, `重试 ${item.retryCount ?? 0} 次`]),
        riskLevel: Number(item.retryCount ?? 0) >= 3 ? 'critical' : 'high',
        status: '待排查或重试',
        createdAt: item.updateTime || item.createTime,
        actionPath: '/admin/ops',
        actionLabel: '进入运维中心',
      })
    })
  return items.sort((a, b) => riskRank(b.riskLevel) - riskRank(a.riskLevel) || queueTimeValue(b.createdAt) - queueTimeValue(a.createdAt))
})
const backendReviewQueueViewItems = computed<ReviewQueueItem[]>(() => safeBackendReviewQueueItems.value
  .map(toReviewQueueItem)
  .sort((a, b) => riskRank(b.riskLevel) - riskRank(a.riskLevel) || queueTimeValue(b.createdAt) - queueTimeValue(a.createdAt)))
const reviewQueueItems = computed<ReviewQueueItem[]>(() => {
  if (reviewQueueSource.value === 'backend' && backendReviewQueueViewItems.value.length > 0) {
    return backendReviewQueueViewItems.value
  }
  return frontendReviewQueueItems.value
})
const reviewQueueSourceText = computed(() => (
  reviewQueueSource.value === 'backend' && backendReviewQueueViewItems.value.length > 0
    ? '后端统一队列'
    : '前端聚合预览'
))
const filteredReviewQueueItems = computed(() => reviewQueueItems.value.filter((item) => {
  if (queueFilters.sourceType && item.sourceType !== queueFilters.sourceType) return false
  if (queueFilters.riskLevel && item.riskLevel !== queueFilters.riskLevel) return false
  return true
}))
const highRiskQueueCount = computed(() => reviewQueueItems.value.filter((item) => item.riskLevel === 'critical' || item.riskLevel === 'high').length)
const migrationStatusText = computed(() => {
  if (!migration.value) return '未加载'
  return migration.value.ready ? '正常' : '需检查'
})

const moderationScopeText = (scope?: string) => {
  const labels: Record<string, string> = {
    ALL: '全部范围',
    POST: '帖子',
    COMMENT: '评论',
    REPORT: '举报',
    CONTENT: '内容',
  }
  return scope ? labels[scope] || scope : '未指定'
}

const keywordMatchTypeText = (matchType?: string) => {
  const labels: Record<string, string> = {
    CONTAINS: '包含匹配',
    EXACT: '精确匹配',
  }
  return matchType ? labels[matchType] || matchType : '未指定'
}

const moderationActionText = (action?: string) => {
  const labels: Record<string, string> = {
    BLOCK: '自动拦截',
    REVIEW: '人工复核',
  }
  return action ? labels[action] || action : '未指定'
}

const StatusList = defineComponent({
  props: { title: String, items: { type: Object, required: true } },
  setup(props) {
    return () => h('div', { class: 'status-list' }, [
      h('h3', { class: 'mb-3 font-semibold text-slate-900 dark:text-slate-100' }, props.title),
      ...Object.entries(props.items as Record<string, boolean>).map(([key, ok]) =>
        h('div', { class: 'status-row' }, [
          h('span', { title: key }, key),
          h('strong', { class: ['schema-status-pill', ok ? 'schema-status-ok' : 'schema-status-warn'] }, ok ? '正常' : '缺失'),
        ]),
      ),
    ])
  },
})

const loadPermissions = async () => {
  const res = await opsApi.myPermissions()
  permissions.value = res.data
}

const normalizeGovernanceDomain = () => {
  if (permissions.value?.admin || permissions.value?.contentModerator) return
  const allowed = governanceDomainOptions.value
  if (!allowed.length) {
    selectedGovernanceDomain.value = ''
    return
  }
  if (selectedGovernanceDomain.value === '' || !allowed.some((item) => item.value === Number(selectedGovernanceDomain.value))) {
    selectedGovernanceDomain.value = allowed[0].value
  }
}

const setSelectedGovernanceDomain = async (domain: number | '') => {
  selectedGovernanceDomain.value = domain
  normalizeGovernanceDomain()
  await refreshAll()
}

const domainLabel = (domain?: number | null) => getDomainLabel(domain)

const ensureActiveTab = () => {
  const requested = requestedGovernanceTab()
  if (requested && visibleTabs.value.some((tab) => tab.value === requested)) {
    activeTab.value = requested
    return
  }
  if (visibleTabs.value.some((tab) => tab.value === activeTab.value)) return
  activeTab.value = visibleTabs.value[0]?.value || ''
}

const clearOpsState = () => {
  migration.value = null
  auditLogs.value = []
  auditTotal.value = 0
  auditHasMore.value = false
}

const clearGlobalModerationState = () => {
  keywords.value = []
  hits.value = []
  users.value = []
  topics.value = []
  tags.value = []
  pendingQuestions.value = []
  failedAiTasks.value = []
  backendReviewQueueItems.value = []
  reviewQueueSource.value = 'frontend-fallback'
  reviewQueueLoadWarnings.value = []
}

const clearDomainModerationState = () => {
  featuredPosts.value = []
  domainModerators.value = []
  postReports.value = []
  commentReports.value = []
}

const clearModerationState = () => {
  clearGlobalModerationState()
  clearDomainModerationState()
}

const loadGlobalModerationData = (loaders: Array<Promise<void>>) => {
  if (!canGlobalModerate.value) {
    clearGlobalModerationState()
    return
  }
  reviewQueueLoadWarnings.value = []
  loaders.push(loadBackendReviewQueue(false))
  loaders.push(opsApi.listModerationKeywords({ limit: 80 }).then((res) => { keywords.value = res.data || [] }))
  loaders.push(opsApi.listModerationHits({ limit: 80 }).then((res) => { hits.value = res.data || [] }))
  loaders.push(opsApi.listModerationUsers(80).then((res) => { users.value = res.data || [] }))
  if (canQuestionOps.value) {
    loaders.push(opsApi.listQuestions({ status: 0, limit: 20 }).then((res) => { pendingQuestions.value = res.data || [] }).catch(() => {
      pendingQuestions.value = []
      reviewQueueLoadWarnings.value.push('待审题目来源暂不可用，已保留其他审核待办。')
    }))
    loaders.push(opsApi.listAiTasks({ status: 3, limit: 20 }).then((res) => { failedAiTasks.value = res.data || [] }).catch(() => {
      failedAiTasks.value = []
      reviewQueueLoadWarnings.value.push('失败 AI 任务来源暂不可用，已保留其他审核待办。')
    }))
  } else {
    pendingQuestions.value = []
    failedAiTasks.value = []
  }
  loaders.push(loadTopics(false))
  loaders.push(loadTags(false))
}

const loadDomainModerationData = (loaders: Array<Promise<void>>) => {
  if (!canModerate.value) {
    clearDomainModerationState()
    return
  }
  loaders.push(postApi.listAdminReports({ status: 0, limit: 50, domain: selectedDomainParam.value }).then((res) => { postReports.value = res.data || [] }))
  loaders.push(interactionApi.listAdminCommentReports({ status: 0, limit: 50, domain: selectedDomainParam.value }).then((res) => { commentReports.value = res.data || [] }))
  loaders.push(loadFeaturedPosts(false))
  loaders.push(loadDomainModerators(false))
}

const refreshAll = async () => {
  isLoading.value = true
  loadError.value = ''
  try {
    await loadPermissions()
    normalizeGovernanceDomain()
    ensureActiveTab()
    const loaders: Array<Promise<void>> = []
    if (canOps.value) {
      loaders.push(opsApi.migrationStatus().then((res) => { migration.value = res.data }))
      loaders.push(opsApi.pageAuditLogs(auditQueryParams()).then((res) => applyAuditPageResult(res.data)))
    } else {
      clearOpsState()
    }
    if (canModerate.value) {
      loadGlobalModerationData(loaders)
      loadDomainModerationData(loaders)
    } else {
      clearModerationState()
    }
    if (!loaders.length) {
      loadError.value = '当前账号没有治理中心可用权限'
      return
    }
    const results = await Promise.allSettled(loaders)
    if (results.every((item) => item.status === 'rejected')) {
      toast.error('治理数据加载失败')
    }
  } catch (error: any) {
    loadError.value = getErrorMessage(error, '治理数据加载失败')
    toast.error(loadError.value)
  } finally {
    isLoading.value = false
  }
}

const loadReviewQueue = async () => {
  activeTab.value = 'queue'
  if (!canModerate.value) {
    await refreshAll()
    return
  }
  if (!canGlobalModerate.value) {
    reviewQueueSource.value = 'frontend-fallback'
    backendReviewQueueItems.value = []
    return
  }
  isLoading.value = true
  try {
    await loadBackendReviewQueue(true)
  } finally {
    isLoading.value = false
  }
}

const queueSummary = (parts: Array<string | number | undefined | null>) => parts
  .map((part) => String(part ?? '').trim())
  .filter(Boolean)
  .join(' · ')
  .slice(0, 240)

const queueSourceLabel = (sourceType: string) => {
  const labels: Record<string, string> = {
    POST_REPORT: '帖子举报',
    COMMENT_REPORT: '评论举报',
    MODERATION_HIT: '敏感词命中',
    QUESTION_PENDING: '待审题目',
    AI_TASK_FAILED: '失败 AI 任务',
  }
  return labels[sourceType] || sourceType
}

const queueTargetText = (targetType: string) => {
  const labels: Record<string, string> = {
    POST: '帖子',
    COMMENT: '评论',
    CONTENT: '内容',
    QUESTION: '题目',
    AI_TASK: 'AI 任务',
  }
  return labels[targetType] || queueSourceLabel(targetType)
}

const queueStatusText = (status?: string) => {
  const labels: Record<string, string> = {
    pending: '待认领',
    claimed: '处理中',
    approved: '已通过',
    rejected: '已拒绝',
    closed: '已关闭',
  }
  return status ? labels[status] || status : '待处理'
}

const queueActionPath = (item: BackendReviewQueueItem) => {
  if (item.sourceType === 'POST_REPORT' || item.sourceType === 'POST') return `/post/${item.sourceId || item.id}`
  if (item.sourceType === 'COMMENT_REPORT') return item.sourceId ? `/post/${item.sourceId}` : '/admin/governance'
  if (item.sourceType === 'QUESTION_PENDING' || item.sourceType === 'QUESTION') return '/admin/questions'
  if (item.sourceType === 'AI_TASK_FAILED' || item.sourceType === 'AI_TASK') return '/admin/ops'
  return '/admin/governance'
}

const queueActionLabel = (item: BackendReviewQueueItem) => {
  if (item.sourceType === 'POST_REPORT' || item.sourceType === 'POST') return '查看帖子'
  if (item.sourceType === 'COMMENT_REPORT') return '查看来源'
  if (item.sourceType === 'QUESTION_PENDING' || item.sourceType === 'QUESTION') return '进入题目审核'
  if (item.sourceType === 'AI_TASK_FAILED' || item.sourceType === 'AI_TASK') return '进入运维中心'
  return '查看来源'
}

const queueActionTab = (item: BackendReviewQueueItem) => {
  if (item.sourceType === 'MODERATION_HIT') return 'hits'
  if (item.sourceType === 'POST_REPORT' || item.sourceType === 'COMMENT_REPORT') return 'review'
  return undefined
}

const normalizeQueueRisk = (risk?: string): ReviewQueueRisk => {
  if (risk === 'critical' || risk === 'high' || risk === 'medium' || risk === 'low') return risk
  return 'medium'
}

const toReviewQueueItem = (item: BackendReviewQueueItem): ReviewQueueItem => ({
  id: String(item.id),
  sourceType: item.sourceType,
  sourceLabel: queueSourceLabel(item.sourceType),
  targetType: item.sourceType,
  targetId: String(item.sourceId || item.id),
  title: item.title || `${queueSourceLabel(item.sourceType)} ${item.sourceId || item.id}`,
  summary: item.summary || item.handleNote || '',
  riskLevel: normalizeQueueRisk(item.riskLevel),
  status: queueStatusText(item.queueStatus),
  createdAt: item.createTime || item.updateTime,
  actionPath: queueActionPath(item),
  actionLabel: queueActionLabel(item),
  actionTab: queueActionTab(item),
  backendItem: item,
  queueStatus: item.queueStatus,
  assigneeUid: item.assigneeUid === undefined || item.assigneeUid === null ? undefined : String(item.assigneeUid),
  handledAt: item.handledTime,
})

const loadBackendReviewQueue = async (showToast = true) => {
  if (!canGlobalModerate.value) {
    backendReviewQueueItems.value = []
    reviewQueueSource.value = 'frontend-fallback'
    return
  }
  try {
    const res = await opsApi.listReviewQueue({
      sourceType: queueFilters.sourceType || undefined,
      riskLevel: (queueFilters.riskLevel || undefined) as ReviewQueueRiskLevel | undefined,
      limit: 80,
    })
    backendReviewQueueItems.value = Array.isArray(res.data) ? res.data : []
    reviewQueueSource.value = 'backend'
  } catch (error: any) {
    backendReviewQueueItems.value = []
    reviewQueueSource.value = 'frontend-fallback'
    const message = '后端统一审核队列暂不可用，已切换为前端聚合预览。'
    if (!reviewQueueLoadWarnings.value.includes(message)) reviewQueueLoadWarnings.value.push(message)
    if (showToast) toast.error(getErrorMessage(error, message))
  }
}

type ReviewQueueAction = 'claim' | 'release' | 'approve' | 'reject' | 'close'

const canQueueAction = (item: ReviewQueueItem, action: ReviewQueueAction) => {
  if (!canGlobalModerate.value) return false
  if (!item.backendItem || reviewQueueSource.value !== 'backend') return false
  if (action === 'claim') return item.queueStatus === 'pending' || item.queueStatus === 'claimed'
  if (action === 'release') return item.queueStatus === 'claimed'
  return item.queueStatus === 'pending' || item.queueStatus === 'claimed'
}

const queueActionText = (action: ReviewQueueAction) => {
  const labels: Record<ReviewQueueAction, string> = {
    claim: '认领',
    release: '释放',
    approve: '通过',
    reject: '拒绝',
    close: '关闭',
  }
  return labels[action]
}

const handleReviewQueueAction = async (item: ReviewQueueItem, action: ReviewQueueAction) => {
  if (!canGlobalModerate.value) return
  if (!item.backendItem) return
  const actionText = queueActionText(action)
  const note = await requireRiskConfirm({
    title: `${actionText}审核队列项`,
    level: action === 'claim' || action === 'release' ? 'medium' : item.riskLevel === 'critical' ? 'critical' : 'high',
    reversible: action === 'claim' || action === 'release',
    impactCount: 1,
    objects: riskObjects([`review-queue:${item.id}`, `${item.sourceType}:${item.targetId}`]),
    context: riskContext(
      `来源：${item.sourceLabel}`,
      `状态：${item.status}`,
      `标题：${item.title}`,
    ),
    confirmText: `确认${actionText}`,
    requireNote: action === 'reject' || action === 'close',
    notePlaceholder: action === 'reject' || action === 'close' ? '请填写拒绝/关闭原因，会写入审核队列审计' : '可填写处理说明，会写入审核队列审计',
  })
  if (note === null) return
  isSaving.value = true
  try {
    if (action === 'claim') await opsApi.claimReviewQueueItem(item.backendItem.id)
    if (action === 'release') await opsApi.releaseReviewQueueItem(item.backendItem.id, note)
    if (action === 'approve') await opsApi.approveReviewQueueItem(item.backendItem.id, note)
    if (action === 'reject') await opsApi.rejectReviewQueueItem(item.backendItem.id, note)
    if (action === 'close') await opsApi.closeReviewQueueItem(item.backendItem.id, note)
    toast.success(`审核队列已${actionText}`)
    await loadBackendReviewQueue(false)
  } catch (error: any) {
    toast.error(getErrorMessage(error, `审核队列${actionText}失败`))
  } finally {
    isSaving.value = false
  }
}

const riskRank = (risk: ReviewQueueRisk) => {
  if (risk === 'critical') return 4
  if (risk === 'high') return 3
  if (risk === 'medium') return 2
  return 1
}

const queueTimeValue = (value?: string | number) => {
  if (typeof value === 'number') return value
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

const queueRiskText = (risk: ReviewQueueRisk) => {
  if (risk === 'critical') return '严重'
  if (risk === 'high') return '高风险'
  if (risk === 'medium') return '中风险'
  return '低风险'
}

const queueRiskClass = (risk: ReviewQueueRisk) => {
  if (risk === 'critical') return 'status-danger'
  if (risk === 'high') return 'status-warn'
  if (risk === 'medium') return 'status-ok'
  return 'status-muted'
}

const formatQueueTime = (value?: string | number) => {
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isFinite(date.getTime()) ? date.toLocaleString() : '--'
  }
  return formatTime(value)
}

const goToQueueItem = (item: ReviewQueueItem) => {
  if (!item.actionTab) return
  activeTab.value = item.actionTab
}

const auditQueryParams = () => ({
  action: auditFilters.action || undefined,
  resourceType: auditFilters.resourceType || undefined,
  operatorUid: auditFilters.operatorUid || undefined,
  startDate: auditFilters.startDate || undefined,
  endDate: auditFilters.endDate || undefined,
  page: auditPage.value,
  pageSize: auditPageSize.value,
})

const applyAuditPageResult = (pageData: Awaited<ReturnType<typeof opsApi.pageAuditLogs>>['data']) => {
  auditLogs.value = pageData?.items || []
  auditTotal.value = Number(pageData?.total ?? auditLogs.value.length)
  auditHasMore.value = Boolean(pageData?.hasMore)
}

const loadAuditLogs = async () => {
  if (!canOps.value) return
  isLoading.value = true
  try {
    const res = await opsApi.pageAuditLogs(auditQueryParams())
    applyAuditPageResult(res.data)
  } catch (error: any) {
    toast.error(getErrorMessage(error, '审计日志加载失败'))
  } finally {
    isLoading.value = false
  }
}

const applyAuditFilters = async () => {
  auditPage.value = 1
  await loadAuditLogs()
}

const changeAuditPage = async (page: number) => {
  auditPage.value = Math.max(1, page)
  await loadAuditLogs()
}

const openAuditDetail = (item: AdminAuditLog) => {
  selectedAudit.value = item
}

const closeAuditDetail = () => {
  selectedAudit.value = null
}

useAccessibleDialog(() => Boolean(selectedAudit.value), {
  close: closeAuditDetail,
  initialFocus: auditCloseButton,
})

const loadHits = async () => {
  if (!canGlobalModerate.value) return
  isLoading.value = true
  try {
    const res = await opsApi.listModerationHits({
      scope: hitFilters.scope || undefined,
      action: hitFilters.action || undefined,
      uid: hitFilters.uid || undefined,
      keyword: hitFilters.keyword || undefined,
      limit: 80,
    })
    hits.value = res.data || []
  } catch (error: any) {
    toast.error(getErrorMessage(error, '命中日志加载失败'))
  } finally {
    isLoading.value = false
  }
}

const selectKeyword = (item: ModerationKeyword) => {
  selectedKeyword.value = item
  keywordForm.keyword = item.keyword
  keywordForm.scope = item.scope || 'ALL'
  keywordForm.matchType = item.matchType || 'CONTAINS'
  keywordForm.action = item.action || 'BLOCK'
  keywordForm.enabled = item.enabled ?? 1
  keywordForm.remark = item.remark || ''
}

const resetKeyword = () => {
  selectedKeyword.value = null
  keywordForm.keyword = ''
  keywordForm.scope = 'ALL'
  keywordForm.matchType = 'CONTAINS'
  keywordForm.action = 'BLOCK'
  keywordForm.enabled = 1
  keywordForm.remark = ''
}

const riskObjects = (items: Array<string | number | undefined | null>, limit = 8) => items.filter((item) => item !== undefined && item !== null && String(item).length > 0).slice(0, limit).map((item) => String(item))
const riskContext = (...items: Array<string | false | undefined>) => items.filter(Boolean) as string[]
const requireRiskConfirm = (request: RiskConfirmRequest) => confirmRisk(request)

const loadFeaturedPosts = async (showToast = true) => {
  if (!canModerate.value) return
  try {
    const res = await postApi.list({ featured: true, domain: selectedDomainParam.value, size: 20 })
    featuredPosts.value = res.data?.items || []
  } catch (error: any) {
    if (showToast) toast.error(getErrorMessage(error, '精选内容加载失败'))
  }
}

const loadDomainModerators = async (showToast = true) => {
  if (!canModerate.value) return
  try {
    const res = await postApi.listDomainModerators({ domain: selectedDomainParam.value })
    domainModerators.value = res.data || []
  } catch (error: any) {
    domainModerators.value = []
    if (showToast) toast.error(getErrorMessage(error, '领域版主加载失败'))
  }
}

const moderatorKey = (item: DomainModerator) => `${item.uid}:${item.domain}`

const saveDomainModerator = async () => {
  if (!canManageDomainModerators.value) {
    toast.error('只有超级管理员可以分配领域版主')
    return
  }
  const note = await requireRiskConfirm({
    title: '分配领域版主',
    level: 'high',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([`uid:${moderatorForm.uid}`, `domain:${moderatorForm.domain}`]),
    context: riskContext(
      `领域：${domainLabel(moderatorForm.domain)}`,
      moderatorForm.note ? `原因：${moderatorForm.note}` : '原因：未填写',
      '该用户将获得指定领域内的举报、精选和知识审核权限',
    ),
    confirmText: '确认分配版主',
  })
  if (note === null) return
  isSaving.value = true
  try {
    await postApi.addDomainModerator({ uid: moderatorForm.uid, domain: Number(moderatorForm.domain), note: note || moderatorForm.note })
    moderatorForm.uid = ''
    moderatorForm.note = ''
    toast.success('领域版主已保存')
    await loadDomainModerators(false)
  } catch (error: any) {
    toast.error(getErrorMessage(error, '领域版主保存失败'))
  } finally {
    isSaving.value = false
  }
}

const toggleDomainModeratorStatus = async (item: DomainModerator) => {
  if (!canManageDomainModerators.value) return
  const nextEnabled = !item.enabled
  const note = await requireRiskConfirm({
    title: nextEnabled ? '启用领域版主' : '停用领域版主',
    level: nextEnabled ? 'high' : 'critical',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([`uid:${item.uid}`, `domain:${item.domain}`]),
    context: riskContext(
      `领域：${domainLabel(item.domain)}`,
      `目标状态：${nextEnabled ? '启用' : '停用'}`,
      nextEnabled ? '该用户将恢复领域治理权限' : '该用户将失去该领域治理权限',
    ),
    confirmText: nextEnabled ? '确认启用版主' : '确认停用版主',
  })
  if (note === null) return
  moderatorActionKey.value = moderatorKey(item)
  try {
    await postApi.updateDomainModeratorStatus(item.uid, { domain: item.domain, enabled: nextEnabled, note })
    toast.success(nextEnabled ? '领域版主已启用' : '领域版主已停用')
    await loadDomainModerators(false)
  } catch (error: any) {
    toast.error(getErrorMessage(error, '领域版主状态更新失败'))
  } finally {
    moderatorActionKey.value = ''
  }
}

const loadTopics = async (showToast = true) => {
  if (!canGlobalModerate.value) return
  try {
    const res = await postApi.listAdminTopics({
      status: topicFilters.status === '' ? undefined : Number(topicFilters.status),
      keyword: topicFilters.keyword || undefined,
      limit: 80,
    })
    topics.value = res.data || []
  } catch (error: any) {
    if (showToast) toast.error(getErrorMessage(error, '专题加载失败'))
  }
}

const tagRecommendedFilter = () => {
  if (tagFilters.recommended === '') return undefined
  return tagFilters.recommended === 'true'
}

watch(() => [tagFilters.status, tagFilters.recommended, tagFilters.keyword] as const, () => {
  tagPage.value = 1
})

const loadTags = async (showToast = true) => {
  if (!canGlobalModerate.value) return
  try {
    const res = await postApi.listAdminTags({
      status: tagFilters.status === '' ? undefined : Number(tagFilters.status),
      recommended: tagRecommendedFilter(),
      keyword: tagFilters.keyword || undefined,
      limit: 100,
    })
    tags.value = res.data || []
  } catch (error: any) {
    if (showToast) toast.error(getErrorMessage(error, '标签加载失败'))
  } finally {
    clampTagPage()
  }
}

const resetTopic = () => {
  selectedTopic.value = null
  topicForm.name = ''
  topicForm.slug = ''
  topicForm.description = ''
  topicForm.topicType = 'tech_stack'
  topicForm.coverUrl = ''
  topicForm.sortOrder = 0
  topicForm.featured = false
  topicForm.status = 1
  topicForm.tagNames = ''
  topicForm.note = ''
}

const fillDemoTopicTemplate = () => {
  selectedTopic.value = null
  topicForm.name = 'Kafka 稳定性治理'
  topicForm.slug = 'kafka-reliability'
  topicForm.description = '覆盖消息幂等、Outbox、堆积排查、重试死信和消费者延迟观测。'
  topicForm.topicType = 'scenario'
  topicForm.coverUrl = ''
  topicForm.sortOrder = 80
  topicForm.featured = true
  topicForm.status = 1
  topicForm.tagNames = 'Kafka,Redis,Java'
  topicForm.note = '本地演示专题模板'
  toast.success('已填入演示专题模板')
}

const createDemoTopic = async () => {
  fillDemoTopicTemplate()
  await saveTopic()
}

const selectTopic = (topic: CommunityTopic) => {
  selectedTopic.value = topic
  topicForm.name = topic.name
  topicForm.slug = topic.slug
  topicForm.description = topic.description || ''
  topicForm.topicType = topic.topicType || 'custom'
  topicForm.coverUrl = topic.coverUrl || ''
  topicForm.sortOrder = Number(topic.sortOrder ?? 0)
  topicForm.featured = Boolean(topic.featured)
  topicForm.status = Number(topic.status ?? 1)
  topicForm.tagNames = topic.tags.map((tag) => tag.name).join(',')
  topicForm.note = ''
}

const topicTagNames = () => topicForm.tagNames
  .split(/[,，、]/)
  .map((item) => item.trim())
  .filter(Boolean)

const saveTopic = async () => {
  if (!canGlobalModerate.value) {
    toast.error('当前账号没有内容治理权限')
    return
  }
  const note = await requireRiskConfirm({
    title: selectedTopic.value ? '保存社区专题' : '新增社区专题',
    level: 'high',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([selectedTopic.value ? `topic:${selectedTopic.value.id}` : `topic:${topicForm.slug || topicForm.name}`]),
    context: riskContext(
      `专题：${topicForm.name}`,
      `访问路径：${topicForm.slug || '按名称生成'}`,
      `状态：${Number(topicForm.status) === 1 ? '上线' : '下线'}`,
      topicForm.featured ? '精选专题：是' : '精选专题：否',
      topicForm.tagNames ? `标签：${topicForm.tagNames}` : '标签：未填写',
    ),
    confirmText: '确认保存专题',
  })
  if (note === null) return
  isSaving.value = true
  try {
    const payload = {
      name: topicForm.name,
      slug: topicForm.slug || undefined,
      description: topicForm.description || undefined,
      topicType: topicForm.topicType,
      coverUrl: topicForm.coverUrl || undefined,
      sortOrder: Number(topicForm.sortOrder || 0),
      featured: topicForm.featured,
      status: Number(topicForm.status),
      tagNames: topicTagNames(),
      note: note || topicForm.note,
    }
    selectedTopic.value
      ? await postApi.updateTopic(selectedTopic.value.id, payload)
      : await postApi.createTopic(payload)
    toast.success('专题已保存')
    resetTopic()
    await loadTopics(false)
  } catch (error: any) {
    toast.error(getErrorMessage(error, '专题保存失败'))
  } finally {
    isSaving.value = false
  }
}

const resetTag = () => {
  selectedTag.value = null
  tagForm.name = ''
  tagForm.tagType = 1
  tagForm.status = 1
  tagForm.recommended = false
  tagForm.synonyms = ''
  tagForm.mergeTargetId = ''
  tagForm.note = ''
}

const selectTag = (tag: Tag) => {
  selectedTag.value = tag
  tagForm.name = tag.name
  tagForm.tagType = Number(tag.tagType ?? 1)
  tagForm.status = Number(tag.status ?? 1)
  tagForm.recommended = Boolean(tag.recommended)
  tagForm.synonyms = tag.synonyms?.join(',') || ''
  tagForm.mergeTargetId = tag.mergeTargetId ? String(tag.mergeTargetId) : ''
  tagForm.note = ''
}

const tagSynonyms = () => tagForm.synonyms
  .split(/[,，、]/)
  .map((item) => item.trim())
  .filter(Boolean)

const tagAction = (tagId: Tag['id'] | undefined, action: string) => `${tagId || 'tag'}:${action}`
const isTagActive = (tag: Tag) => Number(tag.status ?? 1) === 1

const topicTypeText = (type?: string) => {
  const labels: Record<string, string> = {
    tech_stack: '技术栈',
    scenario: '业务场景',
    resource: '资源合集',
    project: '项目专题',
    custom: '自定义',
  }
  return labels[type || 'custom'] || type || '自定义'
}

const tagCategoryText = (tagType?: number) => {
  switch (Number(tagType || 4)) {
    case 1: return '技术栈'
    case 2: return '公司'
    case 3: return '岗位'
    default: return '自定义'
  }
}

const saveTag = async () => {
  if (!canGlobalModerate.value || !selectedTag.value) {
    toast.error('请选择要治理的标签')
    return
  }
  const note = await requireRiskConfirm({
    title: '保存标签治理配置',
    level: 'high',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([`tag:${selectedTag.value.id}`]),
    context: riskContext(
      `标签：${tagForm.name}`,
      `状态：${Number(tagForm.status) === 1 ? '启用' : '禁用'}`,
      tagForm.recommended ? '推荐：是' : '推荐：否',
      tagForm.synonyms ? `同义词：${tagForm.synonyms}` : '同义词：未填写',
    ),
    confirmText: '确认保存标签',
  })
  if (note === null) return
  isSaving.value = true
  try {
    const res = await postApi.updateTag(selectedTag.value.id, {
      name: tagForm.name,
      tagType: Number(tagForm.tagType || 4),
      status: Number(tagForm.status),
      recommended: tagForm.recommended,
      synonyms: tagSynonyms(),
      note: note || tagForm.note,
    })
    if (res.data) selectTag(res.data)
    await loadTags(false)
    toast.success('标签已保存')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '标签保存失败'))
  } finally {
    isSaving.value = false
  }
}

const toggleTagStatus = async (tag: Tag) => {
  if (!canGlobalModerate.value) return
  const nextStatus = isTagActive(tag) ? 0 : 1
  const note = await requireRiskConfirm({
    title: nextStatus === 1 ? '启用标签' : '禁用标签',
    level: nextStatus === 1 ? 'medium' : 'critical',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([`tag:${tag.id}`]),
    context: riskContext(
      `标签：${tag.name}`,
      nextStatus === 1 ? '新内容可继续使用该标签' : '新内容和专题不能继续使用该标签',
    ),
    confirmText: nextStatus === 1 ? '确认启用标签' : '确认禁用标签',
  })
  if (note === null) return
  tagActionKey.value = tagAction(tag.id, 'status')
  try {
    await postApi.updateTagStatus(tag.id, nextStatus, note)
    await loadTags(false)
    toast.success(nextStatus === 1 ? '标签已启用' : '标签已禁用')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '标签状态更新失败'))
  } finally {
    tagActionKey.value = ''
  }
}

const toggleTagRecommended = async (tag: Tag) => {
  if (!canGlobalModerate.value) return
  const nextRecommended = !tag.recommended
  const note = await requireRiskConfirm({
    title: nextRecommended ? '推荐标签' : '取消推荐标签',
    level: 'medium',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([`tag:${tag.id}`]),
    context: riskContext(`标签：${tag.name}`),
    confirmText: nextRecommended ? '确认推荐标签' : '确认取消推荐',
  })
  if (note === null) return
  tagActionKey.value = tagAction(tag.id, 'recommend')
  try {
    await postApi.updateTagRecommended(tag.id, nextRecommended, note)
    await loadTags(false)
    toast.success(nextRecommended ? '标签已推荐' : '已取消推荐')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '推荐状态更新失败'))
  } finally {
    tagActionKey.value = ''
  }
}

const saveTagSynonyms = async () => {
  if (!canGlobalModerate.value || !selectedTag.value) {
    toast.error('请选择要维护的标签')
    return
  }
  const synonyms = tagSynonyms()
  const note = await requireRiskConfirm({
    title: '保存标签同义词',
    level: 'medium',
    reversible: true,
    impactCount: synonyms.length || 1,
    objects: riskObjects([`tag:${selectedTag.value.id}`, ...synonyms]),
    context: riskContext(
      `标签：${selectedTag.value.name}`,
      synonyms.length ? `同义词：${synonyms.join('、')}` : '将清空同义词',
      '同义词会影响标签归一和后续搜索召回',
    ),
    confirmText: '确认保存同义词',
  })
  if (note === null) return
  tagActionKey.value = tagAction(selectedTag.value.id, 'synonyms')
  try {
    const res = await postApi.updateTagSynonyms(selectedTag.value.id, synonyms, note || tagForm.note)
    if (res.data) selectTag(res.data)
    await loadTags(false)
    toast.success('标签同义词已保存')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '标签同义词保存失败'))
  } finally {
    tagActionKey.value = ''
  }
}

const mergeSelectedTag = async () => {
  if (!canGlobalModerate.value) return
  if (!selectedTag.value || !tagForm.mergeTargetId) return
  const note = await requireRiskConfirm({
    title: '合并标签',
    level: 'critical',
    reversible: false,
    impactCount: 1,
    objects: riskObjects([`source:${selectedTag.value.id}`, `target:${tagForm.mergeTargetId}`]),
    context: riskContext(
      `源标签：${selectedTag.value.name}`,
      `目标标签 ID：${tagForm.mergeTargetId}`,
      '合并会迁移帖子和专题引用，并将源标签禁用',
    ),
    confirmText: '确认合并标签',
  })
  if (note === null) return
  tagActionKey.value = tagAction(selectedTag.value.id, 'merge')
  try {
    await postApi.mergeTag(selectedTag.value.id, tagForm.mergeTargetId, note || tagForm.note)
    resetTag()
    await loadTags(false)
    toast.success('标签已合并')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '标签合并失败'))
  } finally {
    tagActionKey.value = ''
  }
}

const toggleTopicStatus = async (topic: CommunityTopic) => {
  if (!canGlobalModerate.value) return
  const nextStatus = topic.status === 1 ? 0 : 1
  const note = await requireRiskConfirm({
    title: nextStatus === 1 ? '上线社区专题' : '下线社区专题',
    level: nextStatus === 1 ? 'high' : 'critical',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([`topic:${topic.id}`, topic.slug]),
    context: riskContext(
      `专题：${topic.name}`,
      `当前状态：${topic.status === 1 ? '上线' : '下线'}`,
      `目标状态：${nextStatus === 1 ? '上线' : '下线'}`,
      nextStatus === 1 ? '前台首页、发现页和专题页可展示' : '前台专题详情将不可访问',
    ),
    confirmText: nextStatus === 1 ? '确认上线' : '确认下线',
  })
  if (note === null) return
  topicActionKey.value = String(topic.id)
  try {
    await postApi.updateTopicStatus(topic.id, nextStatus, note)
    toast.success(nextStatus === 1 ? '专题已上线' : '专题已下线')
    await loadTopics(false)
  } catch (error: any) {
    toast.error(getErrorMessage(error, '专题状态更新失败'))
  } finally {
    topicActionKey.value = ''
  }
}

const setFeatured = async () => {
  if (!canModerate.value) {
    toast.error('当前账号没有内容治理权限')
    return
  }
  const postId = featuredForm.postId
  const note = await requireRiskConfirm({
    title: '设置精选内容',
    level: 'high',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([`post:${postId}`]),
    context: riskContext(
      featuredForm.note ? `原因：${featuredForm.note}` : '原因：未填写',
      '前台首页精选流和发现页精选区会展示该内容',
      '取消精选可通过精选管理列表操作',
    ),
    confirmText: '确认设置精选',
  })
  if (note === null) return
  isSaving.value = true
  featuredActionKey.value = String(postId)
  try {
    await postApi.updateFeatured(postId, true, note || featuredForm.note)
    toast.success('已设置精选')
    featuredForm.postId = ''
    featuredForm.note = ''
    await loadFeaturedPosts(false)
  } catch (error: any) {
    toast.error(getErrorMessage(error, '设置精选失败'))
  } finally {
    featuredActionKey.value = ''
    isSaving.value = false
  }
}

const unsetFeatured = async (post: Post) => {
  if (!canModerate.value) {
    toast.error('当前账号没有内容治理权限')
    return
  }
  const note = await requireRiskConfirm({
    title: '取消精选内容',
    level: 'high',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([`post:${post.postId}`]),
    context: riskContext(
      `标题：${post.title}`,
      '该内容会从首页精选流和发现页精选区移除',
      '操作会写入后台审计日志',
    ),
    confirmText: '确认取消精选',
  })
  if (note === null) return
  featuredActionKey.value = String(post.postId)
  try {
    await postApi.updateFeatured(post.postId, false, note)
    featuredPosts.value = featuredPosts.value.filter((item) => String(item.postId) !== String(post.postId))
    toast.success('已取消精选')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '取消精选失败'))
  } finally {
    featuredActionKey.value = ''
  }
}

const saveKeyword = async () => {
  if (!canGlobalModerate.value) {
    toast.error('当前账号没有内容治理权限')
    return
  }
  const payload = { ...keywordForm }
  const note = await requireRiskConfirm({
    title: selectedKeyword.value ? '保存敏感词配置' : '新增敏感词配置',
    level: 'high',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([selectedKeyword.value ? `keyword-id:${selectedKeyword.value.id}` : `keyword:${payload.keyword}`]),
    context: riskContext(
      `关键词：${payload.keyword}`,
      `范围：${payload.scope}`,
      `匹配：${payload.matchType}`,
      `动作：${payload.action}`,
      `状态：${Number(payload.enabled) === 1 ? '启用' : '停用'}`,
      payload.remark ? `备注：${payload.remark}` : '备注：未填写',
      '可恢复：可再次编辑或停用',
    ),
    confirmText: '确认保存关键词',
  })
  if (note === null) return
  const payloadWithAudit = { ...payload, auditRemark: note }
  isSaving.value = true
  try {
    selectedKeyword.value
      ? await opsApi.updateModerationKeyword(selectedKeyword.value.id, payloadWithAudit)
      : await opsApi.createModerationKeyword(payloadWithAudit)
    toast.success('关键词已保存')
    resetKeyword()
    await refreshAll()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '关键词保存失败'))
  } finally {
    isSaving.value = false
  }
}

const saveUserState = async () => {
  if (!canGlobalModerate.value) {
    toast.error('当前账号没有内容治理权限')
    return
  }
  const uid = userForm.uid
  const muteHours = Math.max(0, Number(userForm.muteHours || 0))
  const banHours = Math.max(0, Number(userForm.banHours || 0))
  if (muteHours <= 0 && banHours <= 0) {
    toast.error('保存用户限制需至少设置一个大于 0 的时长；清除限制请使用解除禁言/解除封禁按钮')
    return
  }
  const note = await requireRiskConfirm({
    title: '保存用户限制',
    level: banHours > 0 ? 'critical' : 'high',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([`uid:${uid}`]),
    context: riskContext(
      `禁言时长：${muteHours} 小时`,
      `封禁时长：${banHours} 小时`,
      userForm.reason ? `原因：${userForm.reason}` : '原因：未填写',
      '清除限制请使用独立的解除禁言/解除封禁按钮',
    ),
    confirmText: '确认保存限制',
  })
  if (note === null) return
  isSaving.value = true
  try {
    await opsApi.saveModerationUser({
      uid,
      muteHours,
      banHours,
      reason: userForm.reason || note,
      auditRemark: note,
    })
    toast.success('用户限制已保存')
    userForm.uid = ''
    userForm.muteHours = 0
    userForm.banHours = 0
    userForm.reason = ''
    await refreshAll()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '用户限制保存失败'))
  } finally {
    isSaving.value = false
  }
}

const actionKey = (uid: UserModerationState['uid'], type: 'mute' | 'ban') => `${uid}:${type}`

const isFutureTime = (value?: string) => Boolean(value && new Date(value).getTime() > Date.now())

const isMuted = (item: UserModerationState) => isFutureTime(item.mutedUntil)

const isBanned = (item: UserModerationState) => isFutureTime(item.bannedUntil)

const replaceUserState = (state?: UserModerationState | null) => {
  if (!state) return
  const index = users.value.findIndex((item) => String(item.uid) === String(state.uid))
  if (index >= 0) {
    users.value.splice(index, 1, state)
  }
}

const clearUserMute = async (item: UserModerationState) => {
  const note = await requireRiskConfirm({
    title: '解除用户禁言',
    level: 'high',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([`uid:${item.uid}`]),
    context: riskContext(
      `当前禁言至：${formatTime(item.mutedUntil)}`,
      item.reason ? `原因：${item.reason}` : '原因：未记录',
      item.recentViolationKeyword ? `最近命中：${item.recentViolationKeyword}` : undefined,
    ),
    confirmText: '确认解除禁言',
  })
  if (note === null) return
  moderationActionKey.value = actionKey(item.uid, 'mute')
  try {
    const res = await opsApi.clearModerationMute(item.uid, note)
    replaceUserState(res.data)
    toast.success('已解除禁言')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '解除禁言失败'))
  } finally {
    moderationActionKey.value = ''
  }
}

const clearUserBan = async (item: UserModerationState) => {
  const note = await requireRiskConfirm({
    title: '解除用户封禁',
    level: 'critical',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([`uid:${item.uid}`]),
    context: riskContext(
      `当前封禁至：${formatTime(item.bannedUntil)}`,
      item.reason ? `原因：${item.reason}` : '原因：未记录',
      item.recentViolationKeyword ? `最近命中：${item.recentViolationKeyword}` : undefined,
    ),
    confirmText: '确认解除封禁',
  })
  if (note === null) return
  moderationActionKey.value = actionKey(item.uid, 'ban')
  try {
    const res = await opsApi.clearModerationBan(item.uid, note)
    replaceUserState(res.data)
    toast.success('已解除封禁')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '解除封禁失败'))
  } finally {
    moderationActionKey.value = ''
  }
}

const formatTime = (value?: string) => value ? value.replace('T', ' ').slice(0, 19) : '--'

const formatJson = (value?: string) => {
  if (!value) return '--'
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

watch(() => [route.fullPath, permissions.value] as const, () => {
  ensureActiveTab()
})

onMounted(refreshAll)
</script>

<style scoped>
.governance-page {
  --governance-surface: rgb(255 255 255);
  --governance-surface-muted: rgb(248 250 252);
  --governance-surface-raised: rgb(255 255 255 / 0.94);
  --governance-tabs-bg: rgb(255 255 255 / 0.92);
  --governance-button-bg: rgb(255 255 255);
  --governance-button-hover: rgb(248 250 252);
  --governance-button-border: rgb(226 232 240);
  --governance-button-text: rgb(51 65 85);
  --governance-text: rgb(15 23 42);
  --governance-muted: rgb(100 116 139);
  --governance-border: rgb(226 232 240);
  --governance-review-bg: rgb(248 250 252);
  --governance-accent: rgb(79 70 229);
  --governance-accent-soft: rgb(238 242 255);
  --governance-accent-text: rgb(67 56 202);
  --governance-shadow: none;
  background: rgb(248 250 252);
}

.dark .governance-page {
  --governance-surface: rgb(15 23 42 / 0.92);
  --governance-surface-muted: rgb(2 6 23 / 0.74);
  --governance-surface-raised: rgb(15 23 42 / 0.96);
  --governance-tabs-bg: linear-gradient(180deg, rgb(2 6 23 / 0.96), rgb(15 23 42 / 0.94));
  --governance-button-bg: rgb(17 24 39 / 0.92);
  --governance-button-hover: rgb(30 41 59 / 0.92);
  --governance-button-border: rgb(51 65 85 / 0.92);
  --governance-button-text: rgb(203 213 225);
  --governance-text: rgb(248 250 252);
  --governance-muted: rgb(148 163 184);
  --governance-border: rgb(51 65 85 / 0.86);
  --governance-review-bg: rgb(2 6 23 / 0.72);
  --governance-accent: rgb(129 140 248);
  --governance-accent-soft: rgb(49 46 129 / 0.54);
  --governance-accent-text: rgb(199 210 254);
  --governance-shadow: 0 18px 40px rgb(2 6 23 / 0.2);
  background: rgb(2 6 23);
}

.primary-button,
.secondary-button,
.tab-button {
  display: inline-flex;
  min-height: 40px;
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

.secondary-button,
.tab-button {
  border: 1px solid var(--governance-button-border);
  background: var(--governance-button-bg);
  color: var(--governance-button-text);
}

.secondary-button:hover:not(:disabled),
.tab-button:hover:not(:disabled):not(.tab-active) {
  background: var(--governance-button-hover);
}

.text-button {
  display: inline-flex;
  min-height: 40px;
  min-width: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  padding: 0 0.5rem;
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgb(37 99 235);
}

.tabs {
  position: sticky;
  top: 72px;
  z-index: 20;
  margin-bottom: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  border: 1px solid var(--governance-border);
  border-radius: 0.75rem;
  background: var(--governance-tabs-bg);
  padding: 0.5rem;
  backdrop-filter: blur(14px);
}

.tab-active {
  border-color: var(--governance-accent);
  background: var(--governance-accent-soft);
  color: var(--governance-accent-text);
  box-shadow: 0 8px 20px rgb(79 70 229 / 0.12);
}

.metric-card,
.panel {
  min-width: 0;
  overflow: hidden;
  border-radius: 0.75rem;
  border: 1px solid var(--governance-border);
  background: var(--governance-surface-raised);
  padding: 1.25rem;
  box-shadow: var(--governance-shadow);
}

.metric-card span {
  display: block;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--governance-muted);
}

.metric-card strong {
  margin-top: 0.5rem;
  display: block;
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--governance-text);
}

.panel-title {
  margin-bottom: 1rem;
  font-size: 1rem;
  font-weight: 800;
  color: var(--governance-text);
}

.row-card,
.status-list {
  width: 100%;
  border-radius: 0.625rem;
  border: 1px solid var(--governance-border);
  background: var(--governance-surface);
  padding: 1rem;
  text-align: left;
}

.empty-panel,
.review-metric {
  border-radius: 0.625rem;
  border: 1px dashed var(--governance-border);
  background: var(--governance-review-bg);
  padding: 1rem;
  color: var(--governance-muted);
}

.empty-panel {
  text-align: center;
}

.review-metric {
  border-style: solid;
}

.review-metric span {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
}

.review-metric strong {
  margin-top: 0.35rem;
  display: block;
  font-size: 1.6rem;
  font-weight: 900;
  color: var(--governance-accent);
}

.user-limit-row {
  display: grid;
  gap: 1rem;
}

.user-limit-main {
  min-width: 0;
}

.user-brief {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  height: 2.5rem;
  width: 2.5rem;
  flex: 0 0 auto;
  border-radius: 999px;
  border: 1px solid rgb(226 232 240);
  object-fit: cover;
}

.user-avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgb(239 246 255);
  color: rgb(37 99 235);
}

.violation-card {
  margin-top: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--governance-border);
  background: var(--governance-surface-muted);
  padding: 0.75rem;
}

.violation-card strong {
  font-size: 0.8125rem;
  color: var(--governance-text);
}

.user-limit-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.danger-button:not(:disabled) {
  border-color: rgb(254 202 202);
  color: rgb(185 28 28);
}

.secondary-button:disabled,
.danger-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.status-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  min-width: 0;
  align-items: center;
  column-gap: 1rem;
  row-gap: 0.35rem;
  border-top: 1px solid rgb(226 232 240);
  padding: 0.65rem 0;
  font-size: 0.875rem;
}

.status-row span {
  min-width: 0;
  overflow-wrap: anywhere;
  color: rgb(71 85 105);
  font-size: 0.8125rem;
  line-height: 1.35;
}

.status-row strong {
  white-space: nowrap;
}

.schema-status-pill {
  display: inline-flex;
  min-width: 3.2rem;
  justify-content: center;
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 900;
}

.schema-status-ok {
  background: rgb(220 252 231);
  color: rgb(4 120 87);
}

.schema-status-warn {
  background: rgb(254 243 199);
  color: rgb(180 83 9);
}

.panel .overflow-x-auto {
  max-width: 100%;
  min-width: 0;
  -webkit-overflow-scrolling: touch;
}

.status-pill,
.meta-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.status-ok {
  background: rgb(220 252 231);
  color: rgb(21 128 61);
}

.status-muted,
.meta-chip {
  background: rgb(226 232 240);
  color: rgb(71 85 105);
}

.status-warn {
  background: rgb(254 249 195);
  color: rgb(133 77 14);
}

.status-danger {
  background: rgb(254 226 226);
  color: rgb(185 28 28);
}

.field-input {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid var(--governance-border);
  background: var(--governance-surface);
  padding: 0.65rem 0.75rem;
  font-size: 0.875rem;
  color: var(--governance-text);
  outline: none;
}

.audit-filter-grid {
  display: grid;
  width: min(100%, 760px);
  gap: 0.5rem;
}

.pagination-bar {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-top: 1px solid rgb(226 232 240);
  padding-top: 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: rgb(100 116 139);
}

.compact-pagination {
  margin-top: 0;
  padding-top: 0.85rem;
}

.pagination-meta,
.pagination-actions {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
}

.pagination-page {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0 0.75rem;
  color: rgb(51 65 85);
  white-space: nowrap;
}

.tag-list-shell {
  display: grid;
  min-width: 0;
  gap: 0.85rem;
}

.tag-scroll-list {
  display: grid;
  max-height: 32rem;
  min-width: 0;
  gap: 0.75rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 0.25rem;
}

.tag-row-card,
.tag-row-card > div,
.tag-meta-list {
  min-width: 0;
}

.tag-name,
.tag-id-chip,
.tag-meta-item {
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.tag-synonyms {
  flex-basis: 100%;
  line-height: 1.5;
}

.row-number-cell {
  width: 1%;
  white-space: nowrap;
  color: rgb(100 116 139);
  font-weight: 800;
}

@media (min-width: 640px) {
  .audit-filter-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .user-limit-row {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }

  .user-limit-actions {
    justify-content: flex-end;
  }
}

@media (min-width: 1024px) {
  .audit-filter-grid {
    grid-template-columns: 1fr 1fr 1fr 150px 150px auto;
  }
}

.data-table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
  background: var(--governance-surface);
}

.data-table th {
  background: var(--governance-surface-muted);
  color: var(--governance-muted);
}

.data-table th,
.data-table td {
  border-bottom: 1px solid rgb(226 232 240);
  padding: 0.8rem;
  text-align: left;
  font-size: 0.875rem;
}

.detail-card {
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.875rem;
}

.detail-card span {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(100 116 139);
}

.detail-card strong {
  margin-top: 0.35rem;
  display: block;
  word-break: break-all;
  color: rgb(15 23 42);
}

.json-box {
  max-height: 260px;
  overflow: auto;
  border-radius: 0.5rem;
  background: rgb(15 23 42);
  padding: 1rem;
  color: rgb(226 232 240);
  font-size: 0.8125rem;
}

@media (max-width: 640px) {
  .primary-button,
  .secondary-button,
  .tab-button,
  .text-button {
    min-height: 44px;
  }

  .metric-card,
  .panel {
    padding: 1rem;
  }

  .governance-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
    margin-bottom: 1rem;
  }

  .governance-metric-grid .metric-card {
    min-height: 0;
    border-radius: 0.65rem;
    padding: 0.75rem;
  }

  .governance-metric-grid .metric-card span {
    font-size: 0.75rem;
    line-height: 1.2;
  }

  .governance-metric-grid .metric-card strong {
    margin-top: 0.25rem;
    font-size: 1.25rem;
    line-height: 1;
  }

  .data-table {
    min-width: 640px;
  }

  .pagination-actions {
    width: 100%;
  }

  .data-table th,
  .data-table td {
    padding: 0.65rem;
    font-size: 0.8125rem;
  }
}

.dark .panel,
.dark .metric-card,
.dark .secondary-button,
.dark .tab-button,
.dark .tabs,
.dark .field-input,
.dark .row-card,
.dark .status-list {
  border-color: var(--governance-border);
  background: var(--governance-surface);
  color: var(--governance-button-text);
}

.dark .panel-title,
.dark .metric-card strong {
  color: rgb(248 250 252);
}

.dark .row-card,
.dark .status-list {
  border-color: var(--governance-border);
  background: var(--governance-surface);
}

.dark .empty-panel,
.dark .review-metric {
  border-color: var(--governance-border);
  background: var(--governance-review-bg);
  color: var(--governance-muted);
}

.dark .violation-card {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .violation-card strong {
  color: rgb(226 232 240);
}

.dark .user-avatar {
  border-color: rgb(30 41 59);
}

.dark .user-avatar-fallback {
  background: rgb(30 41 59);
  color: rgb(147 197 253);
}

.dark .detail-card {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

.dark .pagination-bar {
  border-top-color: rgb(30 41 59);
  color: rgb(148 163 184);
}

.dark .pagination-page {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .detail-card strong {
  color: rgb(248 250 252);
}

.dark .tabs {
  background: var(--governance-tabs-bg);
}

.dark .tab-active {
  border-color: var(--governance-accent);
  background: var(--governance-accent-soft);
  color: var(--governance-accent-text);
}

.dark .status-row {
  border-top-color: rgb(30 41 59);
  color: rgb(203 213 225);
}

.dark .status-row span {
  color: rgb(148 163 184);
}

.dark .schema-status-ok {
  background: rgb(6 78 59 / 0.72);
  color: rgb(167 243 208);
}

.dark .schema-status-warn {
  background: rgb(120 53 15 / 0.72);
  color: rgb(253 230 138);
}

.dark .status-ok {
  background: rgb(6 78 59 / 0.68);
  color: rgb(167 243 208);
}

.dark .status-muted,
.dark .meta-chip {
  border: 1px solid rgb(51 65 85 / 0.82);
  background: rgb(15 23 42 / 0.82);
  color: rgb(203 213 225);
}

.dark .status-warn {
  background: rgb(120 53 15 / 0.68);
  color: rgb(253 230 138);
}

.dark .status-danger {
  background: rgb(127 29 29 / 0.7);
  color: rgb(254 202 202);
}

.dark .data-table {
  background: var(--governance-surface);
}

.dark .data-table th,
.dark .data-table td {
  border-bottom-color: rgb(30 41 59);
  color: rgb(203 213 225);
}

.dark .data-table th {
  background: var(--governance-surface-muted);
  color: rgb(148 163 184);
}

.dark .detail-card {
  border-color: rgb(30 41 59);
  background: var(--governance-surface-muted);
}

.dark .detail-card span {
  color: rgb(148 163 184);
}

.dark .json-box {
  background: rgb(15 23 42);
  border: 1px solid rgb(30 41 59);
}
</style>
