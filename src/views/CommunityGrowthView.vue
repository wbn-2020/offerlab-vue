<template>
  <div class="community-growth-page min-h-screen">
    <AppHeader />

    <main class="community-page community-growth-main">
      <header class="community-growth-heading mb-5 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="min-w-0">
          <p class="community-growth-kicker">社区成长工作台</p>
          <h1>贡献、野点与社区角色</h1>
          <p class="community-growth-description">
            查看可解释的贡献记录，使用已开放的低风险权益，并参与平台悬赏与社区角色申请。
          </p>
        </div>
        <button type="button" class="secondary-button shrink-0" :disabled="isRefreshing" @click="refreshAll">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isRefreshing }" />
          刷新全部
        </button>
      </header>

      <section class="policy-band mb-5" aria-label="资产边界说明">
        <div>
          <ShieldCheck class="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
          <p><strong>声望不可消费。</strong>它用于解释在具体频道中的长期贡献，不可转让，通常不失效。</p>
        </div>
        <div>
          <Lock class="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
          <p><strong>野点无充值、提现、转账。</strong>野点只能用于已开放的虚拟权益，不能购买流量、曝光或认证。</p>
        </div>
      </section>

      <nav class="section-nav mb-5" aria-label="社区成长分区">
        <a v-for="item in sectionLinks" :key="item.href" :href="item.href">
          <component :is="item.icon" class="h-4 w-4" />
          {{ item.label }}
        </a>
      </nav>

      <div class="space-y-5">
        <section id="assets" class="workspace-panel scroll-mt-24" :aria-busy="summaryState.loading">
          <div class="panel-header">
            <div>
              <h2><WalletCards class="h-5 w-5" />资产摘要</h2>
              <p>按资产类型与频道展示当前总额、可用额和冻结额。</p>
            </div>
            <button type="button" class="icon-button" title="刷新资产摘要" :disabled="summaryState.loading" @click="loadSummary">
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': summaryState.loading }" />
            </button>
          </div>

          <div v-if="summaryState.loading && accounts.length === 0" class="skeleton-grid" aria-label="正在加载资产摘要">
            <div v-for="item in 3" :key="item" class="skeleton-card" />
          </div>
          <div v-else-if="summaryState.error" class="error-state">
            <AlertTriangle class="h-5 w-5" />
            <div><strong>资产摘要加载失败</strong><p>{{ summaryState.error }}</p></div>
            <button type="button" class="secondary-button compact" @click="loadSummary">重试</button>
          </div>
          <div v-else-if="accounts.length === 0" class="empty-state">
            <WalletCards class="h-6 w-6" />
            <div><strong>还没有资产记录</strong><p>满足奖励规则后，服务端会写入不可篡改的流水并生成对应账户。</p></div>
          </div>
          <div v-else class="asset-grid">
            <article v-for="account in accounts" :key="String(account.id)" class="asset-card">
              <div class="asset-title">
                <span :class="['type-mark', account.accountType === 'REPUTATION' ? 'mark-reputation' : 'mark-point']">
                  <Award v-if="account.accountType === 'REPUTATION'" class="h-4 w-4" />
                  <Coins v-else class="h-4 w-4" />
                </span>
                <div class="min-w-0">
                  <strong>{{ accountTypeLabel(account.accountType) }}</strong>
                  <span>{{ account.domainCode || '全站' }} · {{ statusLabel(account.status) }}</span>
                </div>
              </div>
              <dl class="asset-values">
                <div><dt>总额</dt><dd>{{ formatNumber(account.totalBalance) }}</dd></div>
                <div><dt>可用</dt><dd>{{ formatNumber(account.availableBalance) }}</dd></div>
                <div><dt>冻结</dt><dd>{{ formatNumber(account.frozenBalance) }}</dd></div>
                <div v-if="Number(account.recoveryDebt || 0) > 0"><dt>待恢复</dt><dd>{{ formatNumber(account.recoveryDebt || 0) }}</dd></div>
              </dl>
            </article>
          </div>
        </section>

        <section id="ledger" class="workspace-panel scroll-mt-24" :aria-busy="ledgerState.loading">
          <div class="panel-header">
            <div>
              <h2><ListChecks class="h-5 w-5" />贡献流水</h2>
              <p>流水只追加；冲正会生成补偿条目，不直接修改历史余额。</p>
            </div>
            <span class="count-label">{{ ledgerPage.total }} 条</span>
          </div>

          <div v-if="ledgerState.loading && ledgerPage.items.length === 0" class="skeleton-stack" aria-label="正在加载贡献流水">
            <div v-for="item in 4" :key="item" class="skeleton-row" />
          </div>
          <div v-else-if="ledgerState.error" class="error-state">
            <AlertTriangle class="h-5 w-5" />
            <div><strong>流水加载失败</strong><p>{{ ledgerState.error }}</p></div>
            <button type="button" class="secondary-button compact" @click="loadLedger(false)">重试</button>
          </div>
          <div v-else-if="ledgerPage.items.length === 0" class="empty-state">
            <ListChecks class="h-6 w-6" />
            <div><strong>暂无贡献流水</strong><p>普通登录、浏览、点赞和关注不会产生奖励流水。</p></div>
          </div>
          <div v-else class="dense-list">
            <article v-for="entry in ledgerPage.items" :key="String(entry.id)" class="dense-row ledger-row">
              <div class="min-w-0">
                <div class="row-title">
                  <span :class="['status-pill', accountStatusClass(entry.accountType)]">{{ accountTypeLabel(entry.accountType) }}</span>
                  <strong>{{ entryTypeLabel(entry.entryType) }}</strong>
                  <span v-if="entry.domainCode" class="meta-chip">{{ entry.domainCode }}</span>
                </div>
                <p>{{ entry.reason || entry.referenceType || '服务端贡献事件' }}</p>
                <small>{{ formatTime(entry.createTime) }}<template v-if="entry.ruleCode"> · {{ entry.ruleCode }} v{{ entry.ruleVersion || 1 }}</template></small>
              </div>
              <div class="ledger-values">
                <strong :class="Number(entry.deltaTotal) >= 0 ? 'value-positive' : 'value-negative'">{{ signedNumber(entry.deltaTotal) }}</strong>
                <span>可用 {{ signedNumber(entry.deltaAvailable) }}</span>
                <span>冻结 {{ signedNumber(entry.deltaFrozen) }}</span>
              </div>
            </article>
          </div>
          <div v-if="ledgerPage.hasMore && !ledgerState.error" class="load-more-row">
            <button type="button" class="secondary-button" :disabled="ledgerState.loadingMore" @click="loadLedger(true)">
              <Loader2 v-if="ledgerState.loadingMore" class="h-4 w-4 animate-spin" />
              <ChevronDown v-else class="h-4 w-4" />
              加载更多
            </button>
          </div>
        </section>

        <section id="benefits" class="workspace-panel scroll-mt-24">
          <div class="panel-header">
            <div>
              <h2><Gift class="h-5 w-5" />权益目录与订单</h2>
              <p>仅开放低风险虚拟权益；下单会先预留野点与库存，交付失败可取消或退款。</p>
            </div>
            <span class="count-label">可用野点 {{ formatNumber(pointAvailable) }}</span>
          </div>

          <div class="subsection-heading">
            <div><strong>权益目录</strong><span>{{ catalogPage.total }} 项</span></div>
            <button type="button" class="icon-button" title="刷新权益目录" :disabled="catalogState.loading" @click="loadCatalog(false)">
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': catalogState.loading }" />
            </button>
          </div>
          <div v-if="catalogState.loading && catalogPage.items.length === 0" class="skeleton-grid">
            <div v-for="item in 3" :key="item" class="skeleton-card" />
          </div>
          <div v-else-if="catalogState.error" class="error-state">
            <AlertTriangle class="h-5 w-5" />
            <div><strong>权益目录加载失败</strong><p>{{ catalogState.error }}</p></div>
            <button type="button" class="secondary-button compact" @click="loadCatalog(false)">重试</button>
          </div>
          <div v-else-if="catalogPage.items.length === 0" class="empty-state">
            <Gift class="h-6 w-6" />
            <div><strong>暂无开放权益</strong><p>目录为空时不会提供本地模拟商品或隐含消费入口。</p></div>
          </div>
          <div v-else class="benefit-grid">
            <article v-for="benefit in catalogPage.items" :key="String(benefit.id)" class="benefit-card">
              <div class="row-title">
                <span class="meta-chip">{{ categoryLabel(benefit.category) }}</span>
                <span :class="['status-pill', benefit.enabled ? 'status-ok' : 'status-muted']">{{ benefit.enabled ? '开放' : '停用' }}</span>
              </div>
              <h3>{{ benefit.name }}</h3>
              <p>{{ benefit.description || '暂无说明' }}</p>
              <div class="benefit-meta">
                <strong>{{ formatNumber(benefit.pointCost) }} 野点</strong>
                <span>{{ stockLabel(benefit) }}</span>
              </div>
              <div class="benefit-actions">
                <label>
                  <span class="sr-only">兑换数量</span>
                  <input
                    v-model.number="benefitQuantities[String(benefit.id)]"
                    class="quantity-input"
                    type="number"
                    min="1"
                    max="10"
                    :disabled="!benefit.enabled || pendingAction !== ''"
                  >
                </label>
                <button
                  type="button"
                  class="primary-button"
                  :disabled="!canOrderBenefit(benefit)"
                  @click="placeOrder(benefit)"
                >
                  <Loader2 v-if="isActing(`order:${benefit.id}`)" class="h-4 w-4 animate-spin" />
                  <ShoppingBag v-else class="h-4 w-4" />
                  兑换
                </button>
              </div>
            </article>
          </div>
          <div v-if="catalogPage.hasMore && !catalogState.error" class="load-more-row">
            <button type="button" class="secondary-button" :disabled="catalogState.loadingMore" @click="loadCatalog(true)">
              <ChevronDown class="h-4 w-4" />
              更多权益
            </button>
          </div>

          <div class="section-divider" />

          <div class="subsection-heading">
            <div><strong>我的订单</strong><span>{{ ordersPage.total }} 单</span></div>
            <label class="inline-field">
              <span>取消理由</span>
              <input v-model.trim="cancelReason" class="field-input" maxlength="500" placeholder="取消预留订单时必填">
            </label>
          </div>
          <div v-if="ordersState.loading && ordersPage.items.length === 0" class="skeleton-stack">
            <div v-for="item in 3" :key="item" class="skeleton-row" />
          </div>
          <div v-else-if="ordersState.error" class="error-state">
            <AlertTriangle class="h-5 w-5" />
            <div><strong>订单加载失败</strong><p>{{ ordersState.error }}</p></div>
            <button type="button" class="secondary-button compact" @click="loadOrders(false)">重试</button>
          </div>
          <div v-else-if="ordersPage.items.length === 0" class="empty-state compact-empty">
            <PackageCheck class="h-6 w-6" />
            <div><strong>暂无权益订单</strong><p>兑换后可在这里跟踪预留、交付、取消和退款状态。</p></div>
          </div>
          <div v-else class="dense-list">
            <article v-for="order in ordersPage.items" :key="String(order.id)" class="dense-row">
              <div class="min-w-0">
                <div class="row-title">
                  <span :class="['status-pill', statusClass(order.status)]">{{ statusLabel(order.status) }}</span>
                  <strong>{{ order.benefitName }}</strong>
                </div>
                <p>{{ order.orderNo }} · {{ order.quantity }} 件 · {{ formatNumber(order.totalPointCost) }} 野点</p>
                <small>{{ formatTime(order.createTime) }}<template v-if="order.deliveryReference"> · 交付凭证 {{ order.deliveryReference }}</template></small>
              </div>
              <button
                v-if="order.status === 'RESERVED'"
                type="button"
                class="secondary-button compact"
                :disabled="cancelReason.length < 2 || pendingAction !== ''"
                @click="cancelOrder(order)"
              >
                <Loader2 v-if="isActing(`cancel-order:${order.id}`)" class="h-4 w-4 animate-spin" />
                <XCircle v-else class="h-4 w-4" />
                取消
              </button>
            </article>
          </div>
          <div v-if="ordersPage.hasMore && !ordersState.error" class="load-more-row">
            <button type="button" class="secondary-button" :disabled="ordersState.loadingMore" @click="loadOrders(true)">
              <ChevronDown class="h-4 w-4" />
              更多订单
            </button>
          </div>
        </section>

        <section id="thanks" class="workspace-panel scroll-mt-24" :aria-busy="thanksState.loading">
          <div class="panel-header">
            <div>
              <h2><HeartHandshake class="h-5 w-5" />感谢票</h2>
              <p>每日免费额度不可购买、转让或兑换野点；收票人获得感谢记录，不获得可转移余额。</p>
            </div>
            <div class="ticket-counter">
              <Ticket class="h-4 w-4" />
              今日剩余 <strong>{{ thankTicket?.remainingCount ?? 0 }}</strong>
            </div>
          </div>

          <div v-if="thanksState.loading && !thankTicket" class="skeleton-stack">
            <div v-for="item in 2" :key="item" class="skeleton-row" />
          </div>
          <div v-else-if="thanksState.error" class="error-state">
            <AlertTriangle class="h-5 w-5" />
            <div><strong>感谢票加载失败</strong><p>{{ thanksState.error }}</p></div>
            <button type="button" class="secondary-button compact" @click="loadThanks(false)">重试</button>
          </div>
          <div v-else class="split-workspace">
            <form class="form-column" @submit.prevent="sendThank">
              <h3>送出感谢</h3>
              <label class="field-label">
                收票作者编号
                <input v-model.trim="thankForm.receiverUid" class="field-input" inputmode="numeric" placeholder="公开内容作者编号">
              </label>
              <div class="field-pair">
                <label class="field-label">
                  内容类型
                  <select v-model="thankForm.targetType" class="field-input">
                    <option value="POST">帖子</option>
                    <option value="COMMENT">评论</option>
                  </select>
                </label>
                <label class="field-label">
                  内容 ID
                  <input v-model.trim="thankForm.targetId" class="field-input" inputmode="numeric" placeholder="公开内容 ID">
                </label>
              </div>
              <label class="field-label">
                留言
                <textarea v-model.trim="thankForm.note" class="field-input" rows="3" maxlength="200" placeholder="可选，说明这次感谢的具体原因" />
              </label>
              <button type="submit" class="primary-button" :disabled="!canSendThank">
                <Loader2 v-if="isActing('send-thank')" class="h-4 w-4 animate-spin" />
                <Send v-else class="h-4 w-4" />
                送出感谢票
              </button>
            </form>

            <div class="history-column">
              <div class="subsection-heading">
                <div><strong>送出记录</strong><span>{{ thanksSent.total }} 条</span></div>
              </div>
              <div v-if="thanksSent.items.length === 0" class="empty-state compact-empty">
                <HeartHandshake class="h-6 w-6" />
                <div><strong>还没有送出感谢</strong><p>可对公开、有效且可归属作者的帖子或评论表达感谢。</p></div>
              </div>
              <div v-else class="dense-list">
                <article v-for="item in thanksSent.items" :key="String(item.id)" class="dense-row">
                  <div class="min-w-0">
                    <div class="row-title">
                      <span class="status-pill status-info">{{ item.targetType === 'COMMENT' ? '评论' : '帖子' }}</span>
                      <strong>送给 UID {{ item.receiverUid }}</strong>
                    </div>
                    <p>{{ item.note || '未填写留言' }}</p>
                    <small>内容 #{{ item.targetId }} · {{ formatTime(item.createTime || item.thankDate) }}</small>
                  </div>
                </article>
              </div>
              <div v-if="thanksSent.hasMore || thanksReceived.hasMore" class="load-more-row">
                <button type="button" class="secondary-button" :disabled="thanksState.loadingMore" @click="loadThanks(true)">
                  <ChevronDown class="h-4 w-4" />
                  更多送出与收到记录
                </button>
              </div>

              <div class="section-divider" />

              <div class="subsection-heading">
                <div><strong>收到的感谢</strong><span>{{ receivedThankTotal }} 条质量信号</span></div>
              </div>
              <div class="thank-signal-grid" aria-label="收到感谢质量信号">
                <div>
                  <span>帖子</span>
                  <strong>{{ formatNumber(receivedThankByTargetType.POST) }}</strong>
                </div>
                <div>
                  <span>评论</span>
                  <strong>{{ formatNumber(receivedThankByTargetType.COMMENT) }}</strong>
                </div>
                <div v-for="(count, domain) in receivedThankByDomain" :key="domain">
                  <span>{{ domain }}</span>
                  <strong>{{ formatNumber(count) }}</strong>
                </div>
              </div>
              <div v-if="thanksReceived.items.length === 0" class="empty-state compact-empty">
                <HeartHandshake class="h-6 w-6" />
                <div><strong>还没有收到感谢</strong><p>感谢只作为可解释质量信号，不折算野点或公开金额排名。</p></div>
              </div>
              <div v-else class="dense-list">
                <article v-for="item in thanksReceived.items" :key="`received-${item.id}`" class="dense-row">
                  <div class="min-w-0">
                    <div class="row-title">
                      <span class="status-pill status-info">{{ item.targetType === 'COMMENT' ? '评论' : '帖子' }}</span>
                      <strong>来自 UID {{ item.senderUid }}</strong>
                    </div>
                    <p>{{ item.note || '未填写留言' }}</p>
                    <small>内容 #{{ item.targetId }} · {{ formatTime(item.createTime || item.thankDate) }}</small>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section id="bounties" class="workspace-panel scroll-mt-24" :aria-busy="bountyState.loading">
          <div class="panel-header">
            <div>
              <h2><Target class="h-5 w-5" />平台悬赏</h2>
              <p>仅平台可创建配额悬赏；只接受公开内容，受限频道与高风险请求不会进入奖励流程。</p>
            </div>
            <span class="count-label">{{ bountyAvailable.total }} 个开放悬赏</span>
          </div>

          <div v-if="bountyState.loading && bountyAvailable.items.length === 0" class="skeleton-stack">
            <div v-for="item in 3" :key="item" class="skeleton-row" />
          </div>
          <div v-else-if="bountyState.error" class="error-state">
            <AlertTriangle class="h-5 w-5" />
            <div><strong>悬赏工作台加载失败</strong><p>{{ bountyState.error }}</p></div>
            <button type="button" class="secondary-button compact" @click="loadBounties(false)">重试</button>
          </div>
          <div v-else class="split-workspace bounty-layout">
            <div class="history-column">
              <div v-if="bountyAvailable.items.length === 0" class="empty-state compact-empty">
                <Target class="h-6 w-6" />
                <div><strong>当前没有开放悬赏</strong><p>平台关闭或配额用尽的悬赏不会出现在可提交列表。</p></div>
              </div>
              <div v-else class="dense-list">
                <article
                  v-for="bounty in bountyAvailable.items"
                  :key="String(bounty.id)"
                  :class="['dense-row', selectedBounty?.id === bounty.id ? 'selected-row' : '']"
                >
                  <div class="min-w-0">
                    <div class="row-title">
                      <span class="status-pill status-ok">{{ bounty.domainCode }}</span>
                      <span class="meta-chip">{{ requestTypeLabel(bounty.requestType) }}</span>
                      <span class="meta-chip">{{ bounty.riskCategory === 'LOW' ? '低风险' : '中风险' }}</span>
                    </div>
                    <strong class="block-title">{{ bounty.title }}</strong>
                    <p>{{ bounty.description }}</p>
                    <small>奖励 {{ formatNumber(bounty.pointReward) }} 野点 · 已奖励 {{ bounty.awardedCount }}/{{ bounty.quota }}</small>
                  </div>
                  <button type="button" class="secondary-button compact" :disabled="pendingAction !== ''" @click="selectBounty(bounty)">
                    <FileUp class="h-4 w-4" />
                    提交成果
                  </button>
                </article>
              </div>
              <div v-if="bountyAvailable.hasMore || bountySubmissions.hasMore" class="load-more-row">
                <button type="button" class="secondary-button" :disabled="bountyState.loadingMore" @click="loadBounties(true)">
                  <ChevronDown class="h-4 w-4" />
                  更多悬赏与记录
                </button>
              </div>
            </div>

            <form class="form-column" @submit.prevent="submitBounty">
              <h3>{{ selectedBounty ? `提交：${selectedBounty.title}` : '提交悬赏成果' }}</h3>
              <p v-if="!selectedBounty" class="form-hint">先从左侧选择一个开放悬赏。</p>
              <label class="field-label">
                公开帖子 ID
                <input v-model.trim="bountyForm.publicPostId" class="field-input" inputmode="numeric" :disabled="!selectedBounty" placeholder="必须是本人公开有效帖子">
              </label>
              <label class="field-label">
                证据说明
                <textarea v-model.trim="bountyForm.evidence" class="field-input" rows="5" maxlength="2000" :disabled="!selectedBounty" placeholder="说明帖子如何满足悬赏要求" />
              </label>
              <button type="submit" class="primary-button" :disabled="!canSubmitBounty">
                <Loader2 v-if="isActing('submit-bounty')" class="h-4 w-4 animate-spin" />
                <FileUp v-else class="h-4 w-4" />
                提交审核
              </button>

              <div class="subsection-heading form-history-heading">
                <div><strong>我的提交</strong><span>{{ bountySubmissions.total }} 条</span></div>
              </div>
              <div v-if="bountySubmissions.items.length === 0" class="empty-copy">暂无提交记录。</div>
              <div v-else class="mini-history">
                <div v-for="item in bountySubmissions.items" :key="String(item.id)">
                  <span :class="['status-pill', statusClass(item.status)]">{{ statusLabel(item.status) }}</span>
                  <strong>帖子 #{{ item.publicPostId }}</strong>
                  <small>{{ formatTime(item.createTime) }}<template v-if="item.reviewReason"> · {{ item.reviewReason }}</template></small>
                </div>
              </div>
            </form>
          </div>
        </section>

        <CommunityGrowthGovernanceWorkspace ref="governanceWorkspaceRef" />
        <CommunityRoleWorkspace />

        <section id="roles" class="workspace-panel scroll-mt-24" :aria-busy="roleState.loading">
          <div class="panel-header">
            <div>
              <h2><BadgeCheck class="h-5 w-5" />角色资格与申请</h2>
              <p>满足资格只代表可以申请；授权、暂停、撤销和到期都由治理流程执行并保留理由。</p>
            </div>
            <span class="count-label">{{ roleDefinitions.length }} 个角色定义</span>
          </div>

          <div v-if="roleState.loading && roleDefinitions.length === 0" class="skeleton-stack">
            <div v-for="item in 3" :key="item" class="skeleton-row" />
          </div>
          <div v-else-if="roleState.error" class="error-state">
            <AlertTriangle class="h-5 w-5" />
            <div><strong>角色工作台加载失败</strong><p>{{ roleState.error }}</p></div>
            <button type="button" class="secondary-button compact" @click="loadRoles(false)">重试</button>
          </div>
          <div v-else class="split-workspace role-layout">
            <div class="history-column">
              <div v-if="roleDefinitions.length === 0" class="empty-state compact-empty">
                <BadgeCheck class="h-6 w-6" />
                <div><strong>暂无开放角色</strong><p>只有已启用的角色定义会出现在资格检查列表。</p></div>
              </div>
              <div v-else class="dense-list">
                <article
                  v-for="role in roleDefinitions"
                  :key="String(role.id)"
                  :class="['dense-row', selectedRole?.id === role.id ? 'selected-row' : '']"
                >
                  <div class="min-w-0">
                    <div class="row-title">
                      <span class="status-pill status-info">{{ role.domainCode }}</span>
                      <strong>{{ role.roleName }}</strong>
                    </div>
                    <p>{{ role.description || '暂无角色说明' }}</p>
                    <small>
                      声望 ≥ {{ formatNumber(role.minDomainReputation) }} · 活跃 ≥ {{ role.minActivityCount }} · 策展准确率 ≥ {{ formatPercentBps(role.minCurationAccuracyBps) }}
                    </small>
                  </div>
                  <button type="button" class="secondary-button compact" :disabled="pendingAction !== ''" @click="checkEligibility(role)">
                    <SearchCheck class="h-4 w-4" />
                    检查资格
                  </button>
                </article>
              </div>
            </div>

            <form class="form-column" @submit.prevent="applyRole">
              <h3>{{ selectedRole ? selectedRole.roleName : '资格检查与申请' }}</h3>
              <div v-if="eligibilityLoading" class="eligibility-state">
                <Loader2 class="h-5 w-5 animate-spin" />
                正在核验资格...
              </div>
              <div v-else-if="eligibilityError" class="eligibility-state eligibility-error">
                <AlertTriangle class="h-5 w-5" />
                {{ eligibilityError }}
              </div>
              <div v-else-if="roleEligibility" :class="['eligibility-panel', roleEligibility.eligible ? 'eligibility-ok' : 'eligibility-blocked']">
                <div class="eligibility-title">
                  <CheckCircle2 v-if="roleEligibility.eligible" class="h-5 w-5" />
                  <XCircle v-else class="h-5 w-5" />
                  <strong>{{ roleEligibility.eligible ? '当前满足申请条件' : '当前尚未满足条件' }}</strong>
                </div>
                <dl>
                  <div><dt>账号天数</dt><dd>{{ roleEligibility.accountAgeDays }}</dd></div>
                  <div><dt>频道声望</dt><dd>{{ formatNumber(roleEligibility.domainReputation) }}</dd></div>
                  <div><dt>近期活跃</dt><dd>{{ roleEligibility.activityCount }}</dd></div>
                  <div><dt>策展准确率</dt><dd>{{ formatPercentBps(roleEligibility.curationAccuracyBps) }}</dd></div>
                </dl>
                <p v-if="roleEligibility.failedChecks.length">
                  待满足：{{ roleEligibility.failedChecks.map(failedCheckLabel).join('、') }}
                </p>
                <p v-else>申请仍需人工审核，不会自动获得管理权限。</p>
              </div>
              <p v-else class="form-hint">从左侧角色定义开始资格检查。</p>

              <label class="field-label">
                申请陈述
                <textarea v-model.trim="roleStatement" class="field-input" rows="5" maxlength="1000" :disabled="!roleEligibility?.eligible" placeholder="说明你的近期贡献、经验与可承担的职责" />
              </label>
              <button type="submit" class="primary-button" :disabled="!canApplyRole">
                <Loader2 v-if="isActing('apply-role')" class="h-4 w-4 animate-spin" />
                <Send v-else class="h-4 w-4" />
                提交角色申请
              </button>

              <div class="subsection-heading form-history-heading">
                <div><strong>申请与授权</strong><span>{{ Number(roleApplications.total) + Number(roleGrants.total) }} 条</span></div>
              </div>
              <div v-if="roleApplications.items.length === 0 && roleGrants.items.length === 0" class="empty-copy">暂无申请或授权记录。</div>
              <div v-else class="mini-history">
                <div v-for="item in roleApplications.items" :key="`application-${item.id}`">
                  <span :class="['status-pill', statusClass(item.status)]">{{ statusLabel(item.status) }}</span>
                  <strong>{{ item.roleCode }} · {{ item.domainCode }}</strong>
                  <small>申请于 {{ formatTime(item.createTime) }}<template v-if="item.reviewReason"> · {{ item.reviewReason }}</template></small>
                </div>
                <div v-for="item in roleGrants.items" :key="`grant-${item.id}`">
                  <span :class="['status-pill', statusClass(item.status)]">{{ statusLabel(item.status) }}</span>
                  <strong>{{ item.roleCode }} · {{ item.domainCode }}</strong>
                  <small>授权于 {{ formatTime(item.grantedAt) }}<template v-if="item.expiresAt"> · 到期 {{ formatTime(item.expiresAt) }}</template></small>
                </div>
              </div>
              <div v-if="roleApplications.hasMore || roleGrants.hasMore" class="load-more-row">
                <button type="button" class="secondary-button" :disabled="roleState.loadingMore" @click="loadRoles(true)">
                  <ChevronDown class="h-4 w-4" />
                  更多记录
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  AlertTriangle,
  Award,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  Coins,
  FileUp,
  Gift,
  HeartHandshake,
  ListChecks,
  Loader2,
  Lock,
  PackageCheck,
  RefreshCw,
  SearchCheck,
  Send,
  ShieldCheck,
  ShoppingBag,
  Target,
  Ticket,
  WalletCards,
  XCircle,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import AppHeader from '@/components/layout/AppHeader.vue'
import CommunityGrowthGovernanceWorkspace from '@/components/incentive/CommunityGrowthGovernanceWorkspace.vue'
import CommunityRoleWorkspace from '@/components/incentive/CommunityRoleWorkspace.vue'
import { BizException, getErrorMessage } from '@/api/client'
import {
  incentiveApi,
  type ApiLong,
  type Benefit,
  type BenefitOrder,
  type Bounty,
  type BountySubmission,
  type IncentiveAccount,
  type LedgerEntry,
  type PageResult,
  type RoleApplication,
  type RoleDefinition,
  type RoleEligibility,
  type RoleGrant,
  type ThankRecord,
  type ThankTicket,
} from '@/api/incentives'
import { safeStorage } from '@/utils/safeStorage'

type LoadState = {
  loading: boolean
  loadingMore: boolean
  error: string
  requestId: number
}

const HISTORY_RETENTION_LIMIT = 300

const emptyPage = <T,>(): PageResult<T> => ({
  items: [],
  nextCursor: null,
  hasMore: false,
  total: 0,
})

const pageData = <T,>(value: PageResult<T> | null | undefined): PageResult<T> => ({
  items: Array.isArray(value?.items) ? value.items : [],
  nextCursor: value?.nextCursor || null,
  hasMore: Boolean(value?.hasMore),
  total: Number(value?.total || 0),
})

const mergePage = <T,>(current: PageResult<T>, incoming: PageResult<T>, append: boolean): PageResult<T> => ({
  ...incoming,
  items: (append ? [...current.items, ...incoming.items] : incoming.items)
    .slice(0, HISTORY_RETENTION_LIMIT),
  hasMore: (append ? [...current.items, ...incoming.items] : incoming.items).length
    < HISTORY_RETENTION_LIMIT && incoming.hasMore,
  nextCursor: (append ? [...current.items, ...incoming.items] : incoming.items).length
    < HISTORY_RETENTION_LIMIT ? incoming.nextCursor : null,
})

const createLoadState = (): LoadState => reactive({
  loading: false,
  loadingMore: false,
  error: '',
  requestId: 0,
})

const sectionLinks = [
  { href: '#assets', label: '资产', icon: WalletCards },
  { href: '#ledger', label: '流水', icon: ListChecks },
  { href: '#benefits', label: '权益', icon: Gift },
  { href: '#thanks', label: '感谢票', icon: HeartHandshake },
  { href: '#bounties', label: '悬赏', icon: Target },
  { href: '#appeals', label: '权益与申诉', icon: ShieldCheck },
  { href: '#roles', label: '角色', icon: BadgeCheck },
]

const summaryState = createLoadState()
const ledgerState = createLoadState()
const catalogState = createLoadState()
const ordersState = createLoadState()
const thanksState = createLoadState()
const bountyState = createLoadState()
const roleState = createLoadState()

const accounts = ref<IncentiveAccount[]>([])
const ledgerPage = ref<PageResult<LedgerEntry>>(emptyPage())
const catalogPage = ref<PageResult<Benefit>>(emptyPage())
const ordersPage = ref<PageResult<BenefitOrder>>(emptyPage())
const thankTicket = ref<ThankTicket | null>(null)
const thanksSent = ref<PageResult<ThankRecord>>(emptyPage())
const thanksReceived = ref<PageResult<ThankRecord>>(emptyPage())
const receivedThankTotal = ref(0)
const receivedThankByTargetType = ref<Record<string, ApiLong>>({})
const receivedThankByDomain = ref<Record<string, ApiLong>>({})
const bountyAvailable = ref<PageResult<Bounty>>(emptyPage())
const bountySubmissions = ref<PageResult<BountySubmission>>(emptyPage())
const roleDefinitions = ref<RoleDefinition[]>([])
const roleApplications = ref<PageResult<RoleApplication>>(emptyPage())
const roleGrants = ref<PageResult<RoleGrant>>(emptyPage())
const governanceWorkspaceRef = ref<{ refreshAll: () => Promise<unknown> } | null>(null)

const ledgerPageNumber = ref(1)
const catalogPageNumber = ref(1)
const ordersPageNumber = ref(1)
const thanksPageNumber = ref(1)
const bountyPageNumber = ref(1)
const rolePageNumber = ref(1)
const pendingAction = ref('')
const cancelReason = ref('')
const benefitQuantities = reactive<Record<string, number>>({})
const benefitOrderAttempts = reactive<Record<string, string>>({})

const thankForm = reactive({
  receiverUid: '',
  targetType: 'POST' as 'POST' | 'COMMENT',
  targetId: '',
  note: '',
})

const selectedBounty = ref<Bounty | null>(null)
const bountyForm = reactive({
  publicPostId: '',
  evidence: '',
})

const selectedRole = ref<RoleDefinition | null>(null)
const roleEligibility = ref<RoleEligibility | null>(null)
const eligibilityLoading = ref(false)
const eligibilityError = ref('')
const roleStatement = ref('')
const isPositiveId = (value: string) => /^[1-9]\d*$/.test(value.trim())

const pointAvailable = computed(() => accounts.value
  .filter((item) => item.accountType === 'POINT')
  .reduce((sum, item) => sum + Number(item.availableBalance || 0), 0))

const isRefreshing = computed(() => [
  summaryState,
  ledgerState,
  catalogState,
  ordersState,
  thanksState,
  bountyState,
  roleState,
].some((state) => state.loading || state.loadingMore) || pendingAction.value !== '')

const canSendThank = computed(() => (
  pendingAction.value === ''
  && Number(thankTicket.value?.remainingCount || 0) > 0
  && isPositiveId(thankForm.receiverUid)
  && isPositiveId(thankForm.targetId)
))

const canSubmitBounty = computed(() => (
  pendingAction.value === ''
  && Boolean(selectedBounty.value)
  && isPositiveId(bountyForm.publicPostId)
  && bountyForm.evidence.length >= 10
))

const canApplyRole = computed(() => (
  pendingAction.value === ''
  && Boolean(selectedRole.value)
  && Boolean(roleEligibility.value?.eligible)
  && roleStatement.value.length >= 10
))

const isActing = (key: string) => pendingAction.value === key

const runLoad = async (
  state: LoadState,
  append: boolean,
  task: (isCurrent: () => boolean) => Promise<void>,
  fallback: string,
) => {
  const requestId = ++state.requestId
  const isCurrent = () => state.requestId === requestId
  if (append) state.loadingMore = true
  else state.loading = true
  state.error = ''
  try {
    await task(isCurrent)
  } catch (error) {
    if (isCurrent()) state.error = getErrorMessage(error, fallback)
  } finally {
    if (isCurrent()) {
      state.loading = false
      state.loadingMore = false
    }
  }
}

const loadSummary = () => runLoad(summaryState, false, async (isCurrent) => {
  const response = await incentiveApi.getMySummary()
  if (isCurrent()) accounts.value = response.data || []
}, '资产摘要加载失败')

const loadLedger = (append = false) => runLoad(ledgerState, append, async (isCurrent) => {
  const page = append ? ledgerPageNumber.value + 1 : 1
  const response = await incentiveApi.getMyLedger({ page, size: 20 })
  if (!isCurrent()) return
  const incoming = pageData(response.data)
  ledgerPage.value = mergePage(ledgerPage.value, incoming, append)
  ledgerPageNumber.value = page
}, '贡献流水加载失败')

const loadCatalog = (append = false) => runLoad(catalogState, append, async (isCurrent) => {
  const page = append ? catalogPageNumber.value + 1 : 1
  const response = await incentiveApi.getBenefitCatalog({ page, size: 12 })
  if (!isCurrent()) return
  const incoming = pageData(response.data)
  catalogPage.value = mergePage(catalogPage.value, incoming, append)
  catalogPageNumber.value = page
  for (const benefit of incoming.items) {
    const key = String(benefit.id)
    if (!benefitQuantities[key]) benefitQuantities[key] = 1
  }
}, '权益目录加载失败')

const loadOrders = (append = false) => runLoad(ordersState, append, async (isCurrent) => {
  const page = append ? ordersPageNumber.value + 1 : 1
  const response = await incentiveApi.getMyOrders({ page, size: 12 })
  if (!isCurrent()) return
  const incoming = pageData(response.data)
  ordersPage.value = mergePage(ordersPage.value, incoming, append)
  ordersPageNumber.value = page
}, '权益订单加载失败')

const loadThanks = (append = false) => runLoad(thanksState, append, async (isCurrent) => {
  const page = append ? thanksPageNumber.value + 1 : 1
  const response = await incentiveApi.getMyThanks({ page, size: 12 })
  if (!isCurrent()) return
  if (!response.data) {
    thankTicket.value = null
    thanksSent.value = emptyPage()
    thanksReceived.value = emptyPage()
    receivedThankTotal.value = 0
    receivedThankByTargetType.value = {}
    receivedThankByDomain.value = {}
    return
  }
  thankTicket.value = response.data.ticket
  const incoming = pageData(response.data.sent)
  const receivedIncoming = pageData(response.data.received)
  thanksSent.value = mergePage(thanksSent.value, incoming, append)
  thanksReceived.value = mergePage(thanksReceived.value, receivedIncoming, append)
  receivedThankTotal.value = Number(response.data.receivedTotal || 0)
  receivedThankByTargetType.value = response.data.receivedByTargetType || {}
  receivedThankByDomain.value = response.data.receivedByDomain || {}
  thanksPageNumber.value = page
}, '感谢票加载失败')

const loadBounties = (append = false) => runLoad(bountyState, append, async (isCurrent) => {
  const page = append ? bountyPageNumber.value + 1 : 1
  const response = await incentiveApi.getMyBounties({ page, size: 12 })
  if (!isCurrent()) return
  if (!response.data) {
    bountyAvailable.value = emptyPage()
    bountySubmissions.value = emptyPage()
    return
  }
  bountyAvailable.value = mergePage(bountyAvailable.value, pageData(response.data.available), append)
  bountySubmissions.value = mergePage(bountySubmissions.value, pageData(response.data.submissions), append)
  bountyPageNumber.value = page
}, '平台悬赏加载失败')

const loadRoles = (append = false) => runLoad(roleState, append, async (isCurrent) => {
  const page = append ? rolePageNumber.value + 1 : 1
  const response = await incentiveApi.getMyRoles({ page, size: 12 })
  if (!isCurrent()) return
  if (!response.data) {
    roleDefinitions.value = []
    roleApplications.value = emptyPage()
    roleGrants.value = emptyPage()
    return
  }
  roleDefinitions.value = response.data.definitions || []
  roleApplications.value = mergePage(roleApplications.value, pageData(response.data.applications), append)
  roleGrants.value = mergePage(roleGrants.value, pageData(response.data.grants), append)
  rolePageNumber.value = page
}, '社区角色加载失败')

const refreshAll = async () => {
  await Promise.all([
    loadSummary(),
    loadLedger(false),
    loadCatalog(false),
    loadOrders(false),
    loadThanks(false),
    loadBounties(false),
    loadRoles(false),
    governanceWorkspaceRef.value?.refreshAll(),
  ])
}

const normalizedQuantity = (benefit: Benefit) => {
  const value = Number(benefitQuantities[String(benefit.id)] || 1)
  return Math.max(1, Math.min(10, Number.isFinite(value) ? Math.trunc(value) : 1))
}

const canOrderBenefit = (benefit: Benefit) => {
  const quantity = normalizedQuantity(benefit)
  const inStock = benefit.totalStock == null || Number(benefit.availableStock || 0) >= quantity
  return pendingAction.value === ''
    && benefit.enabled
    && inStock
    && Number(benefit.pointCost) * quantity <= pointAvailable.value
}

const clientRequestToken = () => {
  const cryptoApi = globalThis.crypto
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID()
  if (typeof cryptoApi?.getRandomValues === 'function') {
    const values = new Uint32Array(4)
    cryptoApi.getRandomValues(values)
    return [...values].map((value) => value.toString(16).padStart(8, '0')).join('')
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

const orderAttemptStorageKey = (benefit: Benefit, quantity: number) => (
  `benefit-order-attempt:${String(benefit.id)}:${quantity}`
)

const resolveOrderIdempotencyKey = (benefit: Benefit, quantity: number) => {
  const key = orderAttemptStorageKey(benefit, quantity)
  const remembered = benefitOrderAttempts[key] || safeStorage.sessionGet(key)
  if (remembered) {
    benefitOrderAttempts[key] = remembered
    return remembered
  }
  const idempotencyKey = `benefit:${benefit.id}:${clientRequestToken()}`
  benefitOrderAttempts[key] = idempotencyKey
  safeStorage.sessionSet(key, idempotencyKey, { namespace: 'benefit-order' })
  return idempotencyKey
}

const clearOrderIdempotencyKey = (benefit: Benefit, quantity: number) => {
  const key = orderAttemptStorageKey(benefit, quantity)
  delete benefitOrderAttempts[key]
  safeStorage.sessionRemove(key)
}

const outcomeMayBeUnknown = (error: unknown) => {
  if (error instanceof BizException) return false
  const status = (error as { response?: { status?: number } })?.response?.status
  return status == null || status >= 500
}

const refreshAfterBenefitOrder = async (order: BenefitOrder | null | undefined) => {
  await Promise.all([
    loadSummary(),
    loadOrders(false),
    loadCatalog(false),
    order?.status === 'DELIVERED' ? governanceWorkspaceRef.value?.refreshAll() : Promise.resolve(),
  ])
}

const placeOrder = async (benefit: Benefit) => {
  if (!canOrderBenefit(benefit)) return
  const actionKey = `order:${benefit.id}`
  const quantity = normalizedQuantity(benefit)
  const idempotencyKey = resolveOrderIdempotencyKey(benefit, quantity)
  pendingAction.value = actionKey
  try {
    const response = await incentiveApi.placeBenefitOrder({
      benefitId: benefit.id,
      quantity,
      idempotencyKey,
    })
    const order = response.data
    clearOrderIdempotencyKey(benefit, quantity)
    toast.success(order?.status === 'DELIVERED' ? '权益已兑换并立即到账' : '权益订单已创建，正在等待交付')
    await refreshAfterBenefitOrder(order)
  } catch (error) {
    if (!outcomeMayBeUnknown(error)) {
      clearOrderIdempotencyKey(benefit, quantity)
      toast.error(getErrorMessage(error, '权益兑换失败'))
      return
    }
    try {
      const status = await incentiveApi.getBenefitOrderStatus(idempotencyKey)
      if (status.data) {
        clearOrderIdempotencyKey(benefit, quantity)
        toast.success(status.data.status === 'DELIVERED' ? '已确认权益兑换并立即到账' : '已确认权益订单已创建')
        await refreshAfterBenefitOrder(status.data)
        return
      }
    } catch {
      // Keep the exact idempotency key so a later click remains a safe retry.
    }
    toast.info('兑换结果暂未确认。再次点击会复用本次兑换请求，不会重复扣除野点。')
  } finally {
    pendingAction.value = ''
  }
}

const cancelOrder = async (order: BenefitOrder) => {
  if (cancelReason.value.length < 2 || pendingAction.value) return
  pendingAction.value = `cancel-order:${order.id}`
  try {
    await incentiveApi.cancelBenefitOrder(order.id, { reason: cancelReason.value })
    toast.success('订单已取消，预留野点已释放')
    cancelReason.value = ''
    await Promise.all([loadSummary(), loadOrders(false), loadCatalog(false)])
  } catch (error) {
    toast.error(getErrorMessage(error, '订单取消失败'))
  } finally {
    pendingAction.value = ''
  }
}

const sendThank = async () => {
  if (!canSendThank.value) return
  pendingAction.value = 'send-thank'
  try {
    const response = await incentiveApi.sendThank({
      receiverUid: thankForm.receiverUid,
      targetType: thankForm.targetType,
      targetId: thankForm.targetId,
      note: thankForm.note || undefined,
    })
    if (response.data) thankTicket.value = response.data
    toast.success('感谢票已送出')
    thankForm.receiverUid = ''
    thankForm.targetId = ''
    thankForm.note = ''
    await loadThanks(false)
  } catch (error) {
    toast.error(getErrorMessage(error, '感谢票发送失败'))
  } finally {
    pendingAction.value = ''
  }
}

const selectBounty = (bounty: Bounty) => {
  selectedBounty.value = bounty
  bountyForm.publicPostId = ''
  bountyForm.evidence = ''
}

const submitBounty = async () => {
  if (!selectedBounty.value || !canSubmitBounty.value) return
  pendingAction.value = 'submit-bounty'
  try {
    await incentiveApi.submitBounty(selectedBounty.value.id, {
      publicPostId: bountyForm.publicPostId,
      requestType: selectedBounty.value.requestType,
      riskCategory: selectedBounty.value.riskCategory,
      evidence: bountyForm.evidence,
    })
    toast.success('悬赏成果已提交审核')
    bountyForm.publicPostId = ''
    bountyForm.evidence = ''
    await loadBounties(false)
  } catch (error) {
    toast.error(getErrorMessage(error, '悬赏成果提交失败'))
  } finally {
    pendingAction.value = ''
  }
}

const checkEligibility = async (role: RoleDefinition) => {
  selectedRole.value = role
  roleEligibility.value = null
  eligibilityError.value = ''
  roleStatement.value = ''
  eligibilityLoading.value = true
  try {
    const response = await incentiveApi.getRoleEligibility(role.roleCode, role.domainCode)
    roleEligibility.value = response.data
  } catch (error) {
    eligibilityError.value = getErrorMessage(error, '资格检查失败')
  } finally {
    eligibilityLoading.value = false
  }
}

const applyRole = async () => {
  if (!selectedRole.value || !canApplyRole.value) return
  pendingAction.value = 'apply-role'
  try {
    await incentiveApi.applyRole({
      roleCode: selectedRole.value.roleCode,
      domainCode: selectedRole.value.domainCode,
      statement: roleStatement.value,
    })
    toast.success('角色申请已提交，等待人工审核')
    roleStatement.value = ''
    await loadRoles(false)
  } catch (error) {
    toast.error(getErrorMessage(error, '角色申请提交失败'))
  } finally {
    pendingAction.value = ''
  }
}

const formatNumber = (value: ApiLong | null | undefined) => new Intl.NumberFormat('zh-CN').format(Number(value || 0))
const signedNumber = (value: ApiLong | null | undefined) => `${Number(value || 0) > 0 ? '+' : ''}${formatNumber(value)}`
const formatPercentBps = (value: number | null | undefined) => `${(Number(value || 0) / 100).toFixed(1)}%`

const formatTime = (value?: string | null) => {
  if (!value) return '--'
  const time = new Date(value)
  return Number.isNaN(time.getTime()) ? value : time.toLocaleString('zh-CN', { hour12: false })
}

const accountTypeLabel = (value: string) => value === 'REPUTATION' ? '频道声望' : value === 'POINT' ? '野点' : value
const accountStatusClass = (value: string) => value === 'REPUTATION' ? 'status-info' : 'status-point'
const entryTypeLabel = (value: string) => ({
  EARN: '贡献入账',
  SPEND: '野点支出',
  FREEZE: '风险冻结',
  RELEASE: '解除冻结',
  REVERSE: '冲正补偿',
  PLATFORM_GRANT: '平台发放',
  REFUND: '退款返还',
  RESTORE: '恢复',
  DEBT_RECOVERY: '债务抵扣',
  RECOVERY_RELEASE: '债务清偿后释放',
}[value] || value)

const statusLabel = (value: string) => ({
  ACTIVE: '生效',
  FROZEN: '已冻结',
  RECOVERY_DUE: '待恢复',
  CREATED: '已创建',
  RESERVED: '已预留',
  DELIVERED: '已交付',
  CANCELLED: '已取消',
  REFUNDED: '已退款',
  DRAFT: '草稿',
  OPEN: '开放',
  CLOSED: '关闭',
  SUBMITTED: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  SUSPENDED: '已暂停',
  REVOKED: '已撤销',
  EXPIRED: '已到期',
  SUCCESS: '成功',
  FAILED: '失败',
}[value] || value)

const statusClass = (value: string) => {
  if (['ACTIVE', 'OPEN', 'DELIVERED', 'APPROVED', 'SUCCESS'].includes(value)) return 'status-ok'
  if (['REJECTED', 'REVOKED', 'FAILED', 'CANCELLED'].includes(value)) return 'status-danger'
  if (['RESERVED', 'SUBMITTED', 'SUSPENDED', 'CREATED'].includes(value)) return 'status-warn'
  return 'status-muted'
}

const categoryLabel = (value: string) => ({
  PROFILE_STYLE: '主页与身份样式',
  CONTENT_TOOL: '内容工具',
  COMMEMORATION: '社区纪念',
  COMMUNITY_TOOL: '社区工具',
}[value] || value.split('_').join(' '))

const requestTypeLabel = (value: string) => ({
  PUBLIC_CONTRIBUTION: '公开贡献',
  CURATION: '策展',
  COLLABORATION: '协作',
}[value] || value)

const stockLabel = (benefit: Benefit) => benefit.totalStock == null
  ? '不限库存'
  : `剩余 ${formatNumber(benefit.availableStock)} / ${formatNumber(benefit.totalStock)}`

const failedCheckLabel = (value: string) => ({
  ACCOUNT_AGE: '账号年限',
  DOMAIN_REPUTATION: '频道声望',
  ACTIVITY: '近期活跃',
  VIOLATIONS: '违规记录',
  CURATION_ACCURACY: '策展准确率',
  RISK_FREEZE: '风险冻结',
}[value] || value)

onMounted(refreshAll)
</script>

<style scoped>
.community-growth-page {
  background: rgb(248 250 252);
  color: rgb(15 23 42);
}

.policy-band {
  display: grid;
  gap: 0.75rem;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.75rem;
  background: rgb(255 255 255);
  padding: 0.9rem 1rem;
}

.policy-band > div {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.65rem;
}

.policy-band p {
  min-width: 0;
  color: rgb(71 85 105);
  font-size: 0.875rem;
  line-height: 1.55;
}

.policy-band strong {
  color: rgb(15 23 42);
}

.section-nav {
  display: flex;
  max-width: 100%;
  gap: 0.4rem;
  overflow-x: auto;
  padding-bottom: 0.2rem;
}

.section-nav a {
  display: inline-flex;
  min-height: 38px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: white;
  padding: 0.45rem 0.7rem;
  color: rgb(51 65 85);
  font-size: 0.8125rem;
  font-weight: 800;
  text-decoration: none;
}

.section-nav a:hover {
  border-color: rgb(129 140 248);
  background: rgb(238 242 255);
  color: rgb(55 48 163);
}

.workspace-panel {
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 1rem;
}

.panel-header,
.subsection-heading {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.panel-header {
  margin-bottom: 1rem;
}

.panel-header h2 {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: rgb(15 23 42);
  font-size: 1.05rem;
  font-weight: 900;
}

.panel-header p,
.subsection-heading span,
.form-hint {
  margin-top: 0.3rem;
  color: rgb(100 116 139);
  font-size: 0.8125rem;
  line-height: 1.5;
}

.count-label,
.ticket-counter {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  background: rgb(241 245 249);
  padding: 0.3rem 0.65rem;
  color: rgb(71 85 105);
  font-size: 0.75rem;
  font-weight: 800;
}

.thank-signal-grid {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.thank-signal-grid > div {
  display: inline-flex;
  min-width: 5.5rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.5rem;
  background: rgb(248 250 252);
  padding: 0.5rem 0.65rem;
  color: rgb(100 116 139);
  font-size: 0.7rem;
}

.thank-signal-grid strong {
  color: rgb(15 23 42);
  font-size: 0.82rem;
  font-weight: 900;
}

.ticket-counter {
  background: rgb(236 253 245);
  color: rgb(6 95 70);
}

.asset-grid,
.benefit-grid,
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  gap: 0.75rem;
}

.asset-card,
.benefit-card {
  min-width: 0;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.9rem;
}

.asset-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.65rem;
}

.asset-title strong,
.asset-title span,
.block-title {
  display: block;
  overflow-wrap: anywhere;
}

.asset-title strong {
  color: rgb(15 23 42);
  font-size: 0.9rem;
  font-weight: 900;
}

.asset-title span {
  margin-top: 0.15rem;
  color: rgb(100 116 139);
  font-size: 0.75rem;
}

.type-mark {
  display: inline-flex;
  height: 2rem;
  width: 2rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
}

.mark-reputation {
  background: rgb(224 242 254);
  color: rgb(3 105 161);
}

.mark-point {
  background: rgb(254 243 199);
  color: rgb(146 64 14);
}

.asset-values,
.eligibility-panel dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
  margin-top: 0.8rem;
}

.asset-values div,
.eligibility-panel dl div {
  min-width: 0;
  border-top: 1px solid rgb(226 232 240);
  padding-top: 0.55rem;
}

.asset-values dt,
.eligibility-panel dt {
  color: rgb(100 116 139);
  font-size: 0.7rem;
}

.asset-values dd,
.eligibility-panel dd {
  margin-top: 0.15rem;
  overflow-wrap: anywhere;
  color: rgb(15 23 42);
  font-size: 1rem;
  font-weight: 900;
}

.dense-list,
.skeleton-stack,
.mini-history {
  display: grid;
  gap: 0.55rem;
}

.dense-row {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
  border-top: 1px solid rgb(226 232 240);
  padding: 0.75rem 0;
}

.dense-row:first-child {
  border-top: 0;
  padding-top: 0;
}

.selected-row {
  margin: 0 -0.5rem;
  border: 1px solid rgb(165 180 252);
  border-radius: 0.625rem;
  background: rgb(238 242 255);
  padding: 0.75rem 0.5rem;
}

.selected-row:first-child {
  border-top: 1px solid rgb(165 180 252);
}

.row-title {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.row-title strong,
.block-title {
  color: rgb(15 23 42);
  font-size: 0.875rem;
  font-weight: 900;
}

.block-title {
  margin-top: 0.45rem;
}

.dense-row p,
.benefit-card p {
  margin-top: 0.35rem;
  max-width: 70ch;
  overflow-wrap: anywhere;
  color: rgb(71 85 105);
  font-size: 0.8125rem;
  line-height: 1.5;
}

.dense-row small,
.benefit-meta span,
.mini-history small {
  display: block;
  margin-top: 0.3rem;
  overflow-wrap: anywhere;
  color: rgb(100 116 139);
  font-size: 0.72rem;
  line-height: 1.45;
}

.ledger-values {
  display: grid;
  min-width: 7rem;
  flex: 0 0 auto;
  justify-items: end;
  gap: 0.1rem;
  font-size: 0.72rem;
  color: rgb(100 116 139);
}

.ledger-values strong {
  font-size: 1rem;
  font-weight: 900;
}

.value-positive {
  color: rgb(4 120 87);
}

.value-negative {
  color: rgb(185 28 28);
}

.status-pill,
.meta-chip {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.meta-chip,
.status-muted {
  background: rgb(241 245 249);
  color: rgb(71 85 105);
}

.status-ok {
  background: rgb(220 252 231);
  color: rgb(21 128 61);
}

.status-info {
  background: rgb(224 242 254);
  color: rgb(3 105 161);
}

.status-point,
.status-warn {
  background: rgb(254 243 199);
  color: rgb(146 64 14);
}

.status-danger {
  background: rgb(254 226 226);
  color: rgb(185 28 28);
}

.subsection-heading {
  margin-bottom: 0.75rem;
  align-items: center;
}

.subsection-heading strong {
  color: rgb(15 23 42);
  font-size: 0.9rem;
  font-weight: 900;
}

.subsection-heading span {
  display: inline;
  margin-left: 0.45rem;
}

.benefit-card h3 {
  margin-top: 0.65rem;
  overflow-wrap: anywhere;
  color: rgb(15 23 42);
  font-size: 0.95rem;
  font-weight: 900;
}

.benefit-meta,
.benefit-actions {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  margin-top: 0.8rem;
}

.benefit-meta strong {
  color: rgb(124 45 18);
  font-weight: 900;
}

.quantity-input {
  width: 4.25rem;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: white;
  padding: 0.5rem;
  color: rgb(15 23 42);
}

.section-divider {
  height: 1px;
  margin: 1rem 0;
  background: rgb(226 232 240);
}

.inline-field {
  display: flex;
  min-width: min(100%, 24rem);
  align-items: center;
  gap: 0.5rem;
  color: rgb(71 85 105);
  font-size: 0.75rem;
  font-weight: 800;
}

.inline-field .field-input {
  min-width: 0;
  flex: 1;
}

.split-workspace {
  display: grid;
  min-width: 0;
  gap: 1rem;
}

.form-column,
.history-column {
  min-width: 0;
}

.form-column {
  display: grid;
  align-content: start;
  gap: 0.75rem;
  background: rgb(248 250 252);
  padding: 0.9rem;
}

.form-column h3 {
  overflow-wrap: anywhere;
  color: rgb(15 23 42);
  font-size: 0.95rem;
  font-weight: 900;
}

.field-label {
  display: grid;
  min-width: 0;
  gap: 0.35rem;
  color: rgb(51 65 85);
  font-size: 0.78rem;
  font-weight: 800;
}

.field-input {
  width: 100%;
  min-width: 0;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: white;
  padding: 0.58rem 0.65rem;
  color: rgb(15 23 42);
  font-size: 0.8125rem;
  line-height: 1.4;
  outline: none;
}

.field-input:focus,
.quantity-input:focus {
  border-color: rgb(99 102 241);
  box-shadow: 0 0 0 3px rgb(199 210 254 / 0.7);
}

.field-input:disabled,
.quantity-input:disabled {
  cursor: not-allowed;
  background: rgb(241 245 249);
  color: rgb(100 116 139);
}

.field-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.form-history-heading {
  margin-top: 0.35rem;
  margin-bottom: 0;
  border-top: 1px solid rgb(226 232 240);
  padding-top: 0.75rem;
}

.mini-history > div {
  min-width: 0;
  border-top: 1px solid rgb(226 232 240);
  padding-top: 0.55rem;
}

.mini-history strong {
  display: block;
  margin-top: 0.3rem;
  overflow-wrap: anywhere;
  color: rgb(15 23 42);
  font-size: 0.8rem;
}

.empty-copy {
  color: rgb(100 116 139);
  font-size: 0.8125rem;
}

.eligibility-state,
.eligibility-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
}

.eligibility-state {
  color: rgb(71 85 105);
  font-size: 0.8125rem;
}

.eligibility-error {
  color: rgb(185 28 28);
}

.eligibility-panel {
  border: 1px solid rgb(203 213 225);
  border-radius: 0.625rem;
  padding: 0.75rem;
}

.eligibility-panel dl {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.eligibility-panel p {
  margin-top: 0.65rem;
  font-size: 0.75rem;
  line-height: 1.45;
}

.eligibility-ok {
  border-color: rgb(134 239 172);
  background: rgb(240 253 244);
  color: rgb(22 101 52);
}

.eligibility-blocked {
  border-color: rgb(253 230 138);
  background: rgb(255 251 235);
  color: rgb(146 64 14);
}

.load-more-row {
  display: flex;
  justify-content: center;
  margin-top: 0.8rem;
}

.primary-button,
.secondary-button,
.icon-button {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 800;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.primary-button {
  border: 1px solid rgb(67 56 202);
  background: rgb(67 56 202);
  padding: 0.5rem 0.75rem;
  color: white;
}

.primary-button:hover:not(:disabled) {
  background: rgb(55 48 163);
}

.secondary-button {
  border: 1px solid rgb(203 213 225);
  background: white;
  padding: 0.5rem 0.75rem;
  color: rgb(51 65 85);
}

.secondary-button:hover:not(:disabled),
.icon-button:hover:not(:disabled) {
  border-color: rgb(129 140 248);
  background: rgb(238 242 255);
  color: rgb(55 48 163);
}

.icon-button {
  height: 38px;
  width: 38px;
  flex: 0 0 auto;
  border: 1px solid rgb(203 213 225);
  background: white;
  color: rgb(71 85 105);
}

.compact {
  min-height: 34px;
  padding: 0.35rem 0.6rem;
}

.primary-button:disabled,
.secondary-button:disabled,
.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.error-state,
.empty-state {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.75rem;
  border-radius: 0.625rem;
  padding: 0.85rem;
}

.error-state {
  flex-wrap: wrap;
  border: 1px solid rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(153 27 27);
}

.error-state > div {
  min-width: 12rem;
  flex: 1;
}

.error-state strong,
.empty-state strong {
  color: currentColor;
  font-size: 0.875rem;
  font-weight: 900;
}

.error-state p,
.empty-state p {
  margin-top: 0.2rem;
  overflow-wrap: anywhere;
  font-size: 0.78rem;
  line-height: 1.5;
}

.empty-state {
  border: 1px dashed rgb(203 213 225);
  background: rgb(248 250 252);
  color: rgb(71 85 105);
}

.compact-empty {
  padding: 0.75rem;
}

.skeleton-card,
.skeleton-row {
  position: relative;
  overflow: hidden;
  border-radius: 0.625rem;
  background: rgb(226 232 240);
}

.skeleton-card {
  min-height: 8rem;
}

.skeleton-row {
  height: 4.25rem;
}

.skeleton-card::after,
.skeleton-row::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.62), transparent);
  content: '';
  animation: skeleton-slide 1.2s ease-in-out infinite;
}

@keyframes skeleton-slide {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}

@media (min-width: 720px) {
  .policy-band {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .workspace-panel {
    padding: 1.15rem;
  }

  .split-workspace {
    grid-template-columns: minmax(17rem, 0.8fr) minmax(0, 1.2fr);
  }

  .bounty-layout,
  .role-layout {
    grid-template-columns: minmax(0, 1.35fr) minmax(18rem, 0.65fr);
  }
}

@media (max-width: 719px) {
  .panel-header,
  .subsection-heading,
  .dense-row,
  .benefit-meta,
  .benefit-actions,
  .inline-field {
    align-items: stretch;
    flex-direction: column;
  }

  .ledger-values {
    min-width: 0;
    grid-template-columns: repeat(3, minmax(0, auto));
    justify-content: start;
    justify-items: start;
    gap: 0.65rem;
  }

  .field-pair {
    grid-template-columns: minmax(0, 1fr);
  }

  .primary-button,
  .secondary-button {
    min-height: 44px;
  }

  .form-column > .primary-button,
  .benefit-actions .primary-button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-card::after,
  .skeleton-row::after {
    animation: none;
  }
}

.dark .community-growth-page {
  background: rgb(2 6 23);
  color: rgb(226 232 240);
}

.dark .workspace-panel,
.dark .policy-band,
.dark .section-nav a,
.dark .secondary-button,
.dark .icon-button,
.dark .field-input,
.dark .quantity-input {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

.dark .thank-signal-grid > div {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23 / 0.6);
}

.dark .thank-signal-grid strong {
  color: rgb(248 250 252);
}

.dark .asset-card,
.dark .benefit-card,
.dark .form-column,
.dark .empty-state {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23 / 0.72);
}

.dark .panel-header h2,
.dark .policy-band strong,
.dark .asset-title strong,
.dark .asset-values dd,
.dark .row-title strong,
.dark .block-title,
.dark .benefit-card h3,
.dark .subsection-heading strong,
.dark .form-column h3,
.dark .mini-history strong,
.dark .eligibility-panel dd {
  color: rgb(248 250 252);
}

.dark .policy-band p,
.dark .panel-header p,
.dark .dense-row p,
.dark .benefit-card p,
.dark .field-label,
.dark .form-hint {
  color: rgb(148 163 184);
}

.dark .dense-row,
.dark .asset-values div,
.dark .eligibility-panel dl div,
.dark .section-divider,
.dark .form-history-heading,
.dark .mini-history > div {
  border-color: rgb(51 65 85);
}

.dark .selected-row {
  border-color: rgb(99 102 241);
  background: rgb(30 27 75 / 0.5);
}

.dark .error-state {
  border-color: rgb(127 29 29);
  background: rgb(69 10 10 / 0.4);
  color: rgb(254 202 202);
}

.dark .eligibility-ok {
  border-color: rgb(22 101 52);
  background: rgb(20 83 45 / 0.35);
  color: rgb(187 247 208);
}

.dark .eligibility-blocked {
  border-color: rgb(146 64 14);
  background: rgb(120 53 15 / 0.3);
  color: rgb(253 230 138);
}

.dark .skeleton-card,
.dark .skeleton-row {
  background: rgb(30 41 59);
}

/* Public workspace language: dense information, restrained surfaces, shared actions. */
.community-growth-page {
  background: var(--surface-2);
  color: var(--text-primary);
}

.community-growth-main {
  min-width: 0;
  padding-top: 1.5rem;
  padding-bottom: 6rem;
}

.community-growth-heading {
  border-bottom: 1px solid var(--border-subtle);
  padding: 0.25rem 0 1.25rem;
}

.community-growth-kicker {
  color: var(--primary-600);
  font-size: 0.75rem;
  font-weight: 800;
}

.community-growth-heading h1 {
  margin-top: 0.3rem;
  color: var(--text-strong);
  font-size: 1.75rem;
  font-weight: 900;
  letter-spacing: 0;
}

.community-growth-description {
  max-width: 70ch;
  margin-top: 0.55rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.7;
}

.community-growth-page .policy-band,
.community-growth-page .workspace-panel {
  border-color: var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface-1);
  box-shadow: none;
}

.community-growth-page .policy-band {
  gap: 0.65rem;
  padding: 0.85rem 1rem;
}

.community-growth-page .policy-band p {
  color: var(--text-muted);
}

.community-growth-page .policy-band strong,
.community-growth-page .panel-header h2,
.community-growth-page .subsection-heading strong,
.community-growth-page .asset-title strong,
.community-growth-page .asset-values dd,
.community-growth-page .row-title strong,
.community-growth-page .block-title,
.community-growth-page .benefit-card h3,
.community-growth-page .form-column h3,
.community-growth-page .mini-history strong,
.community-growth-page .eligibility-panel dd {
  color: var(--text-strong);
}

.community-growth-page .section-nav {
  gap: 0.35rem;
  padding-bottom: 0.1rem;
}

.community-growth-page .section-nav a {
  min-height: 36px;
  border-color: var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-1);
  color: var(--text-muted);
  font-size: 0.78rem;
}

.community-growth-page .section-nav a:hover {
  border-color: #bfdbfe;
  background: var(--primary-50);
  color: var(--primary-700);
}

.community-growth-page .panel-header {
  margin-bottom: 0.9rem;
}

.community-growth-page .panel-header p,
.community-growth-page .subsection-heading span,
.community-growth-page .form-hint,
.community-growth-page .dense-row small,
.community-growth-page .benefit-meta span,
.community-growth-page .mini-history small {
  color: var(--text-muted);
}

.community-growth-page .count-label,
.community-growth-page .ticket-counter {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  background: var(--surface-3);
  color: var(--text-muted);
}

.community-growth-page .ticket-counter {
  border-color: #bbf7d0;
  background: #ecfdf5;
  color: #047857;
}

.community-growth-page .asset-card,
.community-growth-page .benefit-card,
.community-growth-page .form-column {
  border-color: var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-2);
}

.community-growth-page .asset-card,
.community-growth-page .benefit-card {
  padding: 0.9rem;
}

.community-growth-page .asset-values div,
.community-growth-page .eligibility-panel dl div,
.community-growth-page .dense-row,
.community-growth-page .section-divider,
.community-growth-page .form-history-heading,
.community-growth-page .mini-history > div {
  border-color: var(--border-subtle);
}

.community-growth-page .dense-row {
  padding: 0.8rem 0;
}

.community-growth-page .selected-row {
  margin-right: 0;
  margin-left: 0;
  border-color: #93c5fd;
  border-radius: var(--radius-control);
  background: var(--primary-50);
  padding: 0.8rem;
}

.community-growth-page .meta-chip,
.community-growth-page .status-muted {
  background: var(--surface-3);
  color: var(--text-muted);
}

.community-growth-page .status-ok {
  background: #ecfdf3;
  color: #047857;
}

.community-growth-page .status-info {
  background: var(--primary-50);
  color: var(--primary-700);
}

.community-growth-page .status-point,
.community-growth-page .status-warn {
  background: #fffbeb;
  color: #b45309;
}

.community-growth-page .status-danger {
  background: #fef2f2;
  color: #b91c1c;
}

.community-growth-page .primary-button,
.community-growth-page .secondary-button,
.community-growth-page .icon-button {
  border-radius: var(--radius-control);
  font-weight: 800;
}

.community-growth-page .primary-button {
  border-color: var(--primary-600);
  background: var(--primary-600);
}

.community-growth-page .primary-button:hover:not(:disabled) {
  background: var(--primary-700);
}

.community-growth-page .secondary-button,
.community-growth-page .icon-button {
  border-color: var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-primary);
}

.community-growth-page .secondary-button:hover:not(:disabled),
.community-growth-page .icon-button:hover:not(:disabled) {
  border-color: #bfdbfe;
  background: var(--primary-50);
  color: var(--primary-700);
}

.community-growth-page .field-input,
.community-growth-page .quantity-input {
  border-color: var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-1);
  color: var(--text-primary);
}

.community-growth-page .field-input:focus,
.community-growth-page .quantity-input:focus {
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgb(47 111 235 / 0.12);
}

.community-growth-page .empty-state {
  border-color: var(--border-strong);
  border-radius: var(--radius-control);
  background: var(--surface-2);
}

.community-growth-page .error-state {
  border-color: #fecaca;
  border-radius: var(--radius-control);
  background: #fef2f2;
}

.community-growth-page .skeleton-card,
.community-growth-page .skeleton-row {
  border-radius: var(--radius-control);
  background: var(--surface-muted);
}

@media (max-width: 719px) {
  .community-growth-main {
    padding-top: 1rem;
  }

  .community-growth-heading h1 {
    font-size: 1.5rem;
  }

  .community-growth-page .policy-band {
    padding: 0.85rem;
  }

  .community-growth-page .workspace-panel {
    padding: 0.9rem;
  }

  .community-growth-page .panel-header h2 {
    font-size: 0.98rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .community-growth-page .skeleton-card::after,
  .community-growth-page .skeleton-row::after {
    animation: none;
  }
}
</style>
