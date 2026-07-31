<template>
  <div class="admin-growth-page min-h-screen">
    <AppHeader />

    <main class="mx-auto max-w-7xl min-w-0 px-4 py-6 sm:py-8">
      <header class="mb-5 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="min-w-0">
          <p class="text-sm font-bold text-cyan-700 dark:text-cyan-300">激励与角色治理</p>
          <h1 class="mt-1 text-2xl font-black text-slate-950 dark:text-white">Stage 3-5 管理工作台</h1>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            处理奖励入箱、不可变流水、虚拟权益订单、平台悬赏和社区角色。所有写操作必须附带可审计理由。
          </p>
        </div>
        <button type="button" class="secondary-button shrink-0" :disabled="isLoading" @click="refreshAll">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
          刷新数据
        </button>
      </header>

      <section v-if="permissionState.loading" class="notice notice-info mb-4" role="status">
        <Loader2 class="h-5 w-5 animate-spin" />
        正在核验后台权限...
      </section>
      <section v-else-if="permissionState.error || !canWrite" class="notice notice-danger mb-4" role="alert">
        <ShieldAlert class="h-5 w-5 shrink-0" />
        <div>
          <strong>写操作已关闭</strong>
          <p>{{ permissionState.error || '当前账号缺少系统管理员权限。服务端不会开放激励与角色治理数据或写操作。' }}</p>
        </div>
      </section>
      <section v-else class="notice notice-ok mb-4">
        <ShieldCheck class="h-5 w-5 shrink-0" />
        <div>
          <strong>权限已确认</strong>
          <p>{{ permissionLabel }}。服务端仍会对每次操作执行权限、状态、幂等和风险边界校验。</p>
        </div>
      </section>

      <section class="reason-bar mb-4">
        <label class="field-label min-w-0 flex-1">
          本次操作理由
          <textarea
            v-model.trim="operationReason"
            class="field-input"
            rows="2"
            maxlength="500"
            placeholder="所有写操作必填；说明依据、影响范围和预期结果"
            :disabled="pendingAction !== '' || !canWrite"
          />
        </label>
        <div class="reason-status">
          <span :class="['status-pill', reasonReady ? 'status-ok' : 'status-warn']">
            {{ reasonReady ? '理由已填写' : '理由未填写' }}
          </span>
          <small>成功写入后会自动清空，避免复用旧理由。</small>
        </div>
      </section>

      <nav class="tab-bar mb-5" aria-label="激励治理分区">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          :class="['tab-button', activeTab === tab.key ? 'tab-active' : '']"
          @click="activeTab = tab.key"
        >
          <component :is="tab.icon" class="h-4 w-4" />
          {{ tab.label }}
        </button>
      </nav>

      <section v-if="activeTab === 'rewards'" class="tool-grid three-columns">
        <form class="tool-panel" @submit.prevent="receiveReward">
          <div class="tool-heading">
            <div><h2><Inbox class="h-5 w-5" />奖励事件入箱</h2><p>使用稳定业务键接收服务端奖励事件。</p></div>
          </div>
          <label class="field-label">稳定键<input v-model.trim="rewardInboxForm.stableKey" class="field-input" maxlength="64" placeholder="event:recipient:resource"></label>
          <div class="field-pair">
            <label class="field-label">事件类型<input v-model.trim="rewardInboxForm.eventType" class="field-input" maxlength="64"></label>
            <label class="field-label">接收 UID<input v-model.trim="rewardInboxForm.recipientUid" class="field-input" inputmode="numeric"></label>
          </div>
          <div class="field-pair">
            <label class="field-label">规则编码<input v-model.trim="rewardInboxForm.ruleCode" class="field-input" maxlength="64"></label>
            <label class="field-label">规则版本<input v-model.number="rewardInboxForm.ruleVersion" class="field-input" type="number" min="1"></label>
          </div>
          <div class="field-pair">
            <label class="field-label">入账频道<input v-model.trim="rewardInboxForm.domainCode" class="field-input" maxlength="32" placeholder="声望账户频道"></label>
            <label class="field-label">事件领域<input v-model.trim="rewardInboxForm.eventDomainCode" class="field-input" maxlength="32" placeholder="结算时重新校验领域开关"></label>
          </div>
          <div class="field-pair">
            <label class="field-label">来源类型<input v-model.trim="rewardInboxForm.sourceReferenceType" class="field-input" maxlength="48" placeholder="POST / COMMENT / COLLABORATION"></label>
            <label class="field-label">来源 ID<input v-model.trim="rewardInboxForm.sourceReferenceId" class="field-input" maxlength="128"></label>
          </div>
          <div class="field-pair">
            <label class="field-label">父对象类型<input v-model.trim="rewardInboxForm.parentReferenceType" class="field-input" maxlength="48" placeholder="可选"></label>
            <label class="field-label">父对象 ID<input v-model.trim="rewardInboxForm.parentReferenceId" class="field-input" maxlength="128" placeholder="可选"></label>
          </div>
          <label class="field-label">事件载荷 JSON<textarea v-model.trim="rewardInboxForm.payloadJson" class="field-input code-field" rows="4" maxlength="4000" /></label>
          <button type="submit" class="primary-button" :disabled="!canSubmitRewardInbox">
            <Loader2 v-if="isActing('reward-inbox')" class="h-4 w-4 animate-spin" />
            <Inbox v-else class="h-4 w-4" />
            接收入箱
          </button>
        </form>

        <form class="tool-panel" @submit.prevent="createRewardRule">
          <div class="tool-heading">
            <div><h2><Scale class="h-5 w-5" />奖励规则版本</h2><p>规则以编码与版本唯一，额度由服务端执行。</p></div>
          </div>
          <div class="field-pair">
            <label class="field-label">规则编码<input v-model.trim="rewardRuleForm.ruleCode" class="field-input" maxlength="64"></label>
            <label class="field-label">版本<input v-model.number="rewardRuleForm.ruleVersion" class="field-input" type="number" min="1"></label>
          </div>
          <div class="field-pair">
            <label class="field-label">
              资产类型
              <select v-model="rewardRuleForm.accountType" class="field-input">
                <option value="REPUTATION">频道声望</option>
                <option value="POINT">野点</option>
              </select>
            </label>
            <label class="field-label">频道编码<input v-model.trim="rewardRuleForm.domainCode" class="field-input" maxlength="32" placeholder="声望规则建议填写"></label>
          </div>
          <label class="field-label">奖励数量<input v-model.number="rewardRuleForm.amount" class="field-input" type="number" min="1" max="1000000"></label>
          <div class="field-pair">
            <label class="field-label">每日上限<input v-model.number="rewardRuleForm.dailyUserCap" class="field-input" type="number" min="0"></label>
            <label class="field-label">终身上限<input v-model.number="rewardRuleForm.lifetimeUserCap" class="field-input" type="number" min="0"></label>
          </div>
          <div class="field-pair">
            <label class="field-label">生效时间<input v-model="rewardRuleForm.validFrom" class="field-input" type="datetime-local"></label>
            <label class="field-label">失效时间<input v-model="rewardRuleForm.validUntil" class="field-input" type="datetime-local"></label>
          </div>
          <label class="toggle-row"><input v-model="rewardRuleForm.enabled" type="checkbox">启用该规则版本</label>
          <button type="submit" class="primary-button" :disabled="!canSubmitRewardRule">
            <Loader2 v-if="isActing('reward-rule')" class="h-4 w-4 animate-spin" />
            <Save v-else class="h-4 w-4" />
            保存规则
          </button>
        </form>

        <form class="tool-panel" @submit.prevent="processRewardBatch">
          <div class="tool-heading">
            <div><h2><Layers3 class="h-5 w-5" />奖励批处理</h2><p>按规则批量处理待入账事件，单次最多 100 条。</p></div>
          </div>
          <label class="field-label">批次键<input v-model.trim="rewardBatchForm.batchKey" class="field-input" maxlength="96" placeholder="batch:yyyy-mm-dd:rule"></label>
          <div class="field-pair">
            <label class="field-label">规则编码<input v-model.trim="rewardBatchForm.ruleCode" class="field-input" maxlength="64"></label>
            <label class="field-label">规则版本<input v-model.number="rewardBatchForm.ruleVersion" class="field-input" type="number" min="1"></label>
          </div>
          <label class="field-label">处理上限<input v-model.number="rewardBatchForm.limit" class="field-input" type="number" min="1" max="100"></label>
          <div class="boundary-copy">
            <ShieldCheck class="h-5 w-5" />
            <p>奖励批次只处理已入箱的稳定事件。普通登录、浏览、点赞、关注和投资结果不应被配置为奖励来源。</p>
          </div>
          <button type="submit" class="primary-button" :disabled="!canSubmitRewardBatch">
            <Loader2 v-if="isActing('reward-batch')" class="h-4 w-4 animate-spin" />
            <Play v-else class="h-4 w-4" />
            执行批次
          </button>
        </form>
      </section>

      <section v-else-if="activeTab === 'ledger'" class="tool-grid ledger-layout">
        <div class="tool-panel">
          <div class="tool-heading">
            <div><h2><ScanSearch class="h-5 w-5" />对账记录</h2><p>扫描账户投影与不可变流水的差异。</p></div>
            <button type="button" class="icon-button" title="刷新对账记录" :disabled="reconciliationState.loading" @click="loadReconciliation">
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': reconciliationState.loading }" />
            </button>
          </div>
          <ListState
            :loading="reconciliationState.loading"
            :error="reconciliationState.error"
            :empty="reconciliationRuns.length === 0"
            empty-title="暂无对账记录"
            empty-description="执行一次有理由的有界对账后，结果会显示在这里。"
            @retry="loadReconciliation"
          />
          <div v-if="!reconciliationState.loading && !reconciliationState.error && reconciliationRuns.length" class="dense-list">
            <article v-for="run in reconciliationRuns" :key="String(run.runId)" class="dense-row">
              <div class="min-w-0">
                <div class="row-title">
                  <span :class="['status-pill', statusClass(run.status)]">{{ statusLabel(run.status) }}</span>
                  <strong>对账 #{{ run.runId }}</strong>
                </div>
                <p>{{ run.reason }}</p>
                <small>{{ formatTime(run.createTime) }} · 扫描 {{ run.scannedCount }} · 差异 {{ run.mismatchCount }}</small>
                <small>
                  周期 {{ run.cycleNo ?? '--' }} · 账户游标 {{ run.cursorStartAccountId ?? 0 }} → {{ run.cursorEndAccountId ?? 0 }}
                  · {{ run.coverageComplete ? '覆盖完成' : `下次从 ${run.nextCursorAccountId ?? '--'} 继续` }}
                </small>
              </div>
              <div class="numeric-summary">
                <span>绝对差额</span>
                <strong>{{ formatNumber(run.totalAbsoluteDifference) }}</strong>
              </div>
            </article>
          </div>
        </div>

        <div class="action-stack">
          <form class="tool-panel" @submit.prevent="runReconciliation">
            <div class="tool-heading compact-heading"><div><h2><ScanSearch class="h-5 w-5" />执行对账</h2><p>有界扫描，不直接修余额。</p></div></div>
            <label class="field-label">扫描上限<input v-model.number="reconciliationLimit" class="field-input" type="number" min="1" max="100"></label>
            <button type="submit" class="primary-button" :disabled="!canMutate || reconciliationLimit < 1">
              <Loader2 v-if="isActing('reconciliation')" class="h-4 w-4 animate-spin" />
              <ScanSearch v-else class="h-4 w-4" />
              开始对账
            </button>
          </form>

          <form class="tool-panel" @submit.prevent="freezeAccount">
            <div class="tool-heading compact-heading"><div><h2><Snowflake class="h-5 w-5" />冻结账户</h2><p>冻结生成流水，不修改历史条目。</p></div></div>
            <div class="field-pair">
              <label class="field-label">用户 UID<input v-model.trim="freezeForm.userId" class="field-input" inputmode="numeric"></label>
              <label class="field-label">
                资产类型
                <select v-model="freezeForm.accountType" class="field-input">
                  <option value="POINT">野点</option>
                  <option value="REPUTATION">频道声望</option>
                </select>
              </label>
            </div>
            <div class="field-pair">
              <label class="field-label">频道编码<input v-model.trim="freezeForm.domainCode" class="field-input" maxlength="32" placeholder="野点可留空"></label>
              <label class="field-label">冻结数量<input v-model.number="freezeForm.amount" class="field-input" type="number" min="1"></label>
            </div>
            <label class="toggle-row"><input v-model="freezeForm.blockSpending" type="checkbox">阻止野点消费</label>
            <button type="submit" class="danger-button" :disabled="!canSubmitFreeze">
              <Loader2 v-if="isActing('freeze-account')" class="h-4 w-4 animate-spin" />
              <Snowflake v-else class="h-4 w-4" />
              执行冻结
            </button>
          </form>

          <form class="tool-panel" @submit.prevent="releaseFreeze">
            <div class="tool-heading compact-heading"><div><h2><SunSnow class="h-5 w-5" />解除冻结</h2><p>按冻结记录 ID 生成恢复流水。</p></div></div>
            <label class="field-label">冻结记录 ID<input v-model.trim="releaseFreezeId" class="field-input" inputmode="numeric"></label>
            <button type="submit" class="secondary-button" :disabled="!canMutate || !isPositiveId(releaseFreezeId)">
              <Loader2 v-if="isActing('release-freeze')" class="h-4 w-4 animate-spin" />
              <SunSnow v-else class="h-4 w-4" />
              解除冻结
            </button>
          </form>

          <form class="tool-panel" @submit.prevent="reverseLedger">
            <div class="tool-heading compact-heading"><div><h2><Undo2 class="h-5 w-5" />冲正流水</h2><p>创建补偿条目，不删除或覆盖原流水。</p></div></div>
            <label class="field-label">流水 ID<input v-model.trim="reverseLedgerId" class="field-input" inputmode="numeric"></label>
            <button type="submit" class="danger-button" :disabled="!canMutate || !isPositiveId(reverseLedgerId)">
              <Loader2 v-if="isActing('reverse-ledger')" class="h-4 w-4 animate-spin" />
              <Undo2 v-else class="h-4 w-4" />
              创建冲正
            </button>
          </form>
        </div>
      </section>

      <section v-else-if="activeTab === 'benefits'" class="space-y-4">
        <div class="tool-grid split-columns">
          <div class="tool-panel">
            <div class="tool-heading">
              <div><h2><Gift class="h-5 w-5" />权益目录</h2><p>后台可查看停用项并填入右侧编辑器。</p></div>
              <span class="count-label">{{ benefitCatalog.total }} 项</span>
            </div>
            <ListState
              :loading="catalogState.loading"
              :error="catalogState.error"
              :empty="benefitCatalog.items.length === 0"
              empty-title="暂无权益目录"
              empty-description="创建低风险虚拟权益后会显示在这里。"
              @retry="loadBenefitCatalog"
            />
            <div v-if="!catalogState.loading && !catalogState.error && benefitCatalog.items.length" class="dense-list">
              <article v-for="benefit in benefitCatalog.items" :key="String(benefit.id)" class="dense-row">
                <div class="min-w-0">
                  <div class="row-title">
                    <span :class="['status-pill', benefit.enabled ? 'status-ok' : 'status-muted']">{{ benefit.enabled ? '开放' : '停用' }}</span>
                    <strong>{{ benefit.name }}</strong>
                    <span class="meta-chip">{{ benefit.category }}</span>
                  </div>
                  <p>{{ benefit.description || '暂无说明' }}</p>
                  <small>{{ benefit.benefitCode }} · {{ formatNumber(benefit.pointCost) }} 野点 · {{ stockLabel(benefit) }}</small>
                </div>
                <button type="button" class="secondary-button compact" :disabled="pendingAction !== ''" @click="editBenefit(benefit)">
                  <Pencil class="h-4 w-4" />
                  编辑
                </button>
              </article>
            </div>
            <PageControls :page="benefitCatalogPage" :has-more="benefitCatalog.hasMore" :disabled="catalogState.loading" @change="changeBenefitCatalogPage" />
          </div>

          <form class="tool-panel" @submit.prevent="saveBenefit">
            <div class="tool-heading">
              <div><h2><PackagePlus class="h-5 w-5" />目录编辑</h2><p>按 benefitCode 新增或更新，库存模式变更受服务端约束。</p></div>
              <button v-if="editingBenefitId" type="button" class="text-button" @click="resetBenefitForm">新建</button>
            </div>
            <div class="field-pair">
              <label class="field-label">权益编码<input v-model.trim="benefitForm.benefitCode" class="field-input" maxlength="64"></label>
              <label class="field-label">名称<input v-model.trim="benefitForm.name" class="field-input" maxlength="128"></label>
            </div>
            <label class="field-label">说明<textarea v-model.trim="benefitForm.description" class="field-input" rows="3" maxlength="1000" /></label>
            <div class="field-pair">
              <label class="field-label">
                分类
                <select v-model="benefitForm.category" class="field-input">
                  <option v-for="item in benefitCategories" :key="item" :value="item">{{ item }}</option>
                </select>
              </label>
              <label class="field-label">
                交付类型
                <select v-model="benefitForm.deliveryType" class="field-input">
                  <option value="ACCOUNT_ENTITLEMENT">ACCOUNT_ENTITLEMENT</option>
                  <option value="REVERSIBLE">REVERSIBLE</option>
                  <option value="MANUAL">MANUAL</option>
                </select>
              </label>
            </div>
            <div class="field-pair">
              <label class="field-label">野点成本<input v-model.number="benefitForm.pointCost" class="field-input" type="number" min="1" max="1000000"></label>
              <label class="field-label">总库存<input v-model="benefitForm.totalStock" class="field-input" inputmode="numeric" placeholder="留空表示不限库存"></label>
            </div>
            <label class="toggle-row"><input v-model="benefitForm.enabled" type="checkbox">前台开放兑换</label>
            <div class="boundary-copy">
              <ShieldCheck class="h-5 w-5" />
              <p>分类不得代表现金、机会游戏、认证、曝光、流量或治理权限。</p>
            </div>
            <button type="submit" class="primary-button" :disabled="!canSubmitBenefit">
              <Loader2 v-if="isActing('save-benefit')" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              保存目录
            </button>
          </form>
        </div>

        <div class="tool-panel">
          <div class="tool-heading filter-heading">
            <div><h2><PackageCheck class="h-5 w-5" />权益订单</h2><p>交付、取消和退款均要求当前状态合法。</p></div>
            <div class="filter-actions">
              <select v-model="orderStatusFilter" class="field-input compact-field" @change="loadBenefitOrders(1)">
                <option value="">全部状态</option>
                <option v-for="status in orderStatuses" :key="status" :value="status">{{ statusLabel(status) }}</option>
              </select>
              <input v-model.trim="deliveryReference" class="field-input compact-field" maxlength="256" placeholder="交付凭证（交付时可填）">
            </div>
          </div>
          <ListState
            :loading="ordersState.loading"
            :error="ordersState.error"
            :empty="benefitOrders.items.length === 0"
            empty-title="暂无匹配订单"
            empty-description="调整状态筛选或等待用户创建权益订单。"
            @retry="loadBenefitOrders(benefitOrderPage)"
          />
          <div v-if="!ordersState.loading && !ordersState.error && benefitOrders.items.length" class="dense-list">
            <article v-for="order in benefitOrders.items" :key="String(order.id)" class="dense-row">
              <div class="min-w-0">
                <div class="row-title">
                  <span :class="['status-pill', statusClass(order.status)]">{{ statusLabel(order.status) }}</span>
                  <strong>{{ order.benefitName }}</strong>
                  <span class="meta-chip">UID {{ order.userId }}</span>
                </div>
                <p>{{ order.orderNo }} · {{ order.quantity }} 件 · {{ formatNumber(order.totalPointCost) }} 野点</p>
                <small>{{ formatTime(order.createTime) }}<template v-if="order.deliveryReference"> · 交付凭证 {{ order.deliveryReference }}</template></small>
                <small v-if="order.actionReason || order.operatorUid">
                  最近操作：{{ order.actionReason || '未填写说明' }}<template v-if="order.operatorUid"> · 操作人 {{ order.operatorUid }}</template>
                </small>
              </div>
              <div class="row-actions">
                <button type="button" class="secondary-button compact" :disabled="!canMutate || order.status !== 'RESERVED'" @click="deliverOrder(order)">
                  <Truck class="h-4 w-4" />交付
                </button>
                <button type="button" class="secondary-button compact" :disabled="!canMutate || order.status !== 'RESERVED'" @click="cancelAdminOrder(order)">
                  <XCircle class="h-4 w-4" />取消
                </button>
                <button type="button" class="danger-button compact" :disabled="!canMutate || order.status !== 'DELIVERED'" @click="refundOrder(order)">
                  <RotateCcw class="h-4 w-4" />退款
                </button>
              </div>
            </article>
          </div>
          <PageControls :page="benefitOrderPage" :has-more="benefitOrders.hasMore" :disabled="ordersState.loading" @change="loadBenefitOrders" />
        </div>
      </section>

      <section v-else-if="activeTab === 'bounties'" class="tool-grid split-columns">
        <div class="tool-panel">
          <div class="tool-heading filter-heading">
            <div><h2><ClipboardCheck class="h-5 w-5" />悬赏审核队列</h2><p>通过审核后由服务端结算奖励事件。</p></div>
            <select v-model="bountyStatusFilter" class="field-input compact-field" @change="loadBountySubmissions(1)">
              <option value="">全部状态</option>
              <option value="SUBMITTED">待审核</option>
              <option value="APPROVED">已通过</option>
              <option value="REJECTED">已拒绝</option>
            </select>
          </div>
          <ListState
            :loading="bountyState.loading"
            :error="bountyState.error"
            :empty="bountySubmissions.items.length === 0"
            empty-title="暂无悬赏提交"
            empty-description="开放悬赏收到公开成果后，会进入此队列。"
            @retry="loadBountySubmissions(bountySubmissionPage)"
          />
          <div v-if="!bountyState.loading && !bountyState.error && bountySubmissions.items.length" class="dense-list">
            <article v-for="submission in bountySubmissions.items" :key="String(submission.id)" class="dense-row">
              <div class="min-w-0">
                <div class="row-title">
                  <span :class="['status-pill', statusClass(submission.status)]">{{ statusLabel(submission.status) }}</span>
                  <strong>悬赏 #{{ submission.bountyId }}</strong>
                  <span class="meta-chip">UID {{ submission.applicantUid }}</span>
                </div>
                <p>{{ submission.evidence }}</p>
                <small>公开帖子 #{{ submission.publicPostId }} · {{ submission.requestType }} · {{ submission.riskCategory }} · {{ formatTime(submission.createTime) }}</small>
              </div>
              <div class="row-actions">
                <button type="button" class="success-button compact" :disabled="!canMutate || submission.status !== 'SUBMITTED'" @click="reviewBounty(submission, true)">
                  <Check class="h-4 w-4" />通过
                </button>
                <button type="button" class="danger-button compact" :disabled="!canMutate || submission.status !== 'SUBMITTED'" @click="reviewBounty(submission, false)">
                  <X class="h-4 w-4" />拒绝
                </button>
              </div>
            </article>
          </div>
          <PageControls :page="bountySubmissionPage" :has-more="bountySubmissions.hasMore" :disabled="bountyState.loading" @change="loadBountySubmissions" />
        </div>

        <div class="action-stack">
          <form class="tool-panel" @submit.prevent="createBounty">
            <div class="tool-heading compact-heading"><div><h2><Target class="h-5 w-5" />创建平台悬赏</h2><p>新建后为草稿，需另行开放。</p></div></div>
            <label class="field-label">标题<input v-model.trim="bountyForm.title" class="field-input" maxlength="160"></label>
            <label class="field-label">说明<textarea v-model.trim="bountyForm.description" class="field-input" rows="4" maxlength="2000" /></label>
            <div class="field-pair">
              <label class="field-label">频道编码<input v-model.trim="bountyForm.domainCode" class="field-input" maxlength="32"></label>
              <label class="field-label">
                请求类型
                <select v-model="bountyForm.requestType" class="field-input">
                  <option value="PUBLIC_CONTRIBUTION">PUBLIC_CONTRIBUTION</option>
                  <option value="CURATION">CURATION</option>
                  <option value="COLLABORATION">COLLABORATION</option>
                </select>
              </label>
            </div>
            <div class="field-triple">
              <label class="field-label">
                风险级别
                <select v-model="bountyForm.riskCategory" class="field-input">
                  <option value="LOW">LOW</option>
                </select>
              </label>
              <label class="field-label">名额<input v-model.number="bountyForm.quota" class="field-input" type="number" min="1" max="500"></label>
              <label class="field-label">单份野点<input v-model.number="bountyForm.pointReward" class="field-input" type="number" min="1" max="5000"></label>
            </div>
            <div class="budget-summary">
              <div><span>悬赏总预算</span><strong>{{ formatNumber(bountyBudgetPreview) }} / 100,000</strong></div>
              <div><span>单用户月度上限</span><strong>5,000 野点</strong></div>
              <div><span>平台月度上限</span><strong>1,000,000 野点</strong></div>
              <p>开放时预占平台预算，审核通过后原子消费；关闭或取消时释放未使用预算。投资、医疗、法律、隐私、人肉和代写请求禁止创建。</p>
            </div>
            <button type="submit" class="primary-button" :disabled="!canSubmitBounty">
              <Loader2 v-if="isActing('create-bounty')" class="h-4 w-4 animate-spin" />
              <Target v-else class="h-4 w-4" />
              创建草稿
            </button>
          </form>

          <form class="tool-panel" @submit.prevent="updateBountyStatus">
            <div class="tool-heading compact-heading"><div><h2><ToggleRight class="h-5 w-5" />悬赏状态</h2><p>草稿可开放/取消，开放可关闭/取消。</p></div></div>
            <div class="field-pair">
              <label class="field-label">悬赏 ID<input v-model.trim="bountyStatusForm.bountyId" class="field-input" inputmode="numeric"></label>
              <label class="field-label">
                目标状态
                <select v-model="bountyStatusForm.status" class="field-input">
                  <option value="OPEN">OPEN</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </label>
            </div>
            <button type="submit" class="secondary-button" :disabled="!canMutate || !isPositiveId(bountyStatusForm.bountyId)">
              <Loader2 v-if="isActing('bounty-status')" class="h-4 w-4 animate-spin" />
              <ToggleRight v-else class="h-4 w-4" />
              更新状态
            </button>
          </form>
        </div>
      </section>

      <AdminIncentiveGovernanceWorkspace v-else-if="activeTab === 'governance'" />

      <section v-else class="space-y-4">
        <AdminRoleReviewContext
          :can-inspect="canWrite"
          :permission-loading="permissionState.loading"
          :permission-error="permissionState.error"
        />
        <div class="tool-grid split-columns">
          <div class="tool-panel">
            <div class="tool-heading filter-heading">
              <div><h2><UserCheck class="h-5 w-5" />角色申请</h2><p>通过前会再次核验当前资格。</p></div>
              <div class="filter-actions">
                <select v-model="roleApplicationFilter" class="field-input compact-field" @change="loadRoleApplications(1)">
                  <option value="">全部状态</option>
                  <option value="SUBMITTED">待审核</option>
                  <option value="APPROVED">已通过</option>
                  <option value="REJECTED">已拒绝</option>
                </select>
                <input v-model="roleApprovalExpiresAt" class="field-input compact-field" type="datetime-local" title="通过后授权到期时间，可选">
              </div>
            </div>
            <ListState
              :loading="roleApplicationsState.loading"
              :error="roleApplicationsState.error"
              :empty="roleApplications.items.length === 0"
              empty-title="暂无角色申请"
              empty-description="用户完成资格检查并提交陈述后，会进入此队列。"
              @retry="loadRoleApplications(roleApplicationPage)"
            />
            <div v-if="!roleApplicationsState.loading && !roleApplicationsState.error && roleApplications.items.length" class="dense-list">
              <article v-for="application in roleApplications.items" :key="String(application.id)" class="dense-row">
                <div class="min-w-0">
                  <div class="row-title">
                    <span :class="['status-pill', statusClass(application.status)]">{{ statusLabel(application.status) }}</span>
                    <strong>{{ application.roleCode }} · {{ application.domainCode }}</strong>
                    <span class="meta-chip">UID {{ application.applicantUid }}</span>
                  </div>
                  <p>{{ application.statement }}</p>
                  <small>{{ formatTime(application.createTime) }}<template v-if="application.reviewReason"> · {{ application.reviewReason }}</template></small>
                </div>
                <div class="row-actions">
                  <button type="button" class="success-button compact" :disabled="!canMutate || application.status !== 'SUBMITTED'" @click="reviewRoleApplication(application, true)">
                    <Check class="h-4 w-4" />通过
                  </button>
                  <button type="button" class="danger-button compact" :disabled="!canMutate || application.status !== 'SUBMITTED'" @click="reviewRoleApplication(application, false)">
                    <X class="h-4 w-4" />拒绝
                  </button>
                </div>
              </article>
            </div>
            <PageControls :page="roleApplicationPage" :has-more="roleApplications.hasMore" :disabled="roleApplicationsState.loading" @change="loadRoleApplications" />
          </div>

          <div class="tool-panel">
            <div class="tool-heading filter-heading">
              <div><h2><BadgeCheck class="h-5 w-5" />角色授权</h2><p>授权可暂停、撤销或手动到期。</p></div>
              <select v-model="roleGrantFilter" class="field-input compact-field" @change="loadRoleGrants(1)">
                <option value="">全部状态</option>
                <option value="ACTIVE">生效</option>
                <option value="SUSPENDED">暂停</option>
                <option value="REVOKED">撤销</option>
                <option value="EXPIRED">到期</option>
              </select>
            </div>
            <ListState
              :loading="roleGrantsState.loading"
              :error="roleGrantsState.error"
              :empty="roleGrants.items.length === 0"
              empty-title="暂无角色授权"
              empty-description="角色申请通过后，授权记录会显示在这里。"
              @retry="loadRoleGrants(roleGrantPage)"
            />
            <div v-if="!roleGrantsState.loading && !roleGrantsState.error && roleGrants.items.length" class="dense-list">
              <article v-for="grant in roleGrants.items" :key="String(grant.id)" class="dense-row">
                <div class="min-w-0">
                  <div class="row-title">
                    <span :class="['status-pill', statusClass(grant.status)]">{{ statusLabel(grant.status) }}</span>
                    <strong>{{ grant.roleCode }} · {{ grant.domainCode }}</strong>
                    <span class="meta-chip">UID {{ grant.userId }}</span>
                  </div>
                  <p>{{ grant.actionReason || grant.grantReason || '暂无操作说明' }}</p>
                  <small>授权 {{ formatTime(grant.grantedAt) }}<template v-if="grant.expiresAt"> · 到期 {{ formatTime(grant.expiresAt) }}</template></small>
                </div>
                <div class="row-actions">
                  <button type="button" class="secondary-button compact" :disabled="!canMutate || grant.status !== 'ACTIVE'" @click="transitionGrant(grant, 'suspend')">
                    <Pause class="h-4 w-4" />暂停
                  </button>
                  <button type="button" class="danger-button compact" :disabled="!canMutate || !['ACTIVE', 'SUSPENDED'].includes(grant.status)" @click="transitionGrant(grant, 'revoke')">
                    <Ban class="h-4 w-4" />撤销
                  </button>
                  <button type="button" class="secondary-button compact" :disabled="!canMutate || !['ACTIVE', 'SUSPENDED'].includes(grant.status)" @click="transitionGrant(grant, 'expire')">
                    <TimerOff class="h-4 w-4" />到期
                  </button>
                </div>
              </article>
            </div>
            <PageControls :page="roleGrantPage" :has-more="roleGrants.hasMore" :disabled="roleGrantsState.loading" @change="loadRoleGrants" />
          </div>
        </div>

        <div class="tool-grid three-columns">
          <form class="tool-panel" @submit.prevent="saveRoleDefinition">
            <div class="tool-heading compact-heading"><div><h2><BadgePlus class="h-5 w-5" />角色定义</h2><p>按角色编码与频道新增或更新。</p></div></div>
            <div class="field-pair">
              <label class="field-label">角色编码<input v-model.trim="roleDefinitionForm.roleCode" class="field-input" maxlength="64"></label>
              <label class="field-label">角色名称<input v-model.trim="roleDefinitionForm.roleName" class="field-input" maxlength="128"></label>
            </div>
            <label class="field-label">说明<textarea v-model.trim="roleDefinitionForm.description" class="field-input" rows="3" maxlength="1000" /></label>
            <label class="field-label">频道编码<input v-model.trim="roleDefinitionForm.domainCode" class="field-input" maxlength="32"></label>
            <div class="field-pair">
              <label class="field-label">账号天数<input v-model.number="roleDefinitionForm.minAccountAgeDays" class="field-input" type="number" min="0"></label>
              <label class="field-label">频道声望<input v-model.number="roleDefinitionForm.minDomainReputation" class="field-input" type="number" min="0"></label>
            </div>
            <div class="field-triple">
              <label class="field-label">近期活跃<input v-model.number="roleDefinitionForm.minActivityCount" class="field-input" type="number" min="0"></label>
              <label class="field-label">最大违规<input v-model.number="roleDefinitionForm.maxViolationCount" class="field-input" type="number" min="0"></label>
              <label class="field-label">准确率 bps<input v-model.number="roleDefinitionForm.minCurationAccuracyBps" class="field-input" type="number" min="0" max="10000"></label>
            </div>
            <label class="toggle-row"><input v-model="roleDefinitionForm.requiresNoRiskFreeze" type="checkbox">要求无风险冻结</label>
            <label class="toggle-row"><input v-model="roleDefinitionForm.enabled" type="checkbox">启用角色定义</label>
            <button type="submit" class="primary-button" :disabled="!canSubmitRoleDefinition">
              <Loader2 v-if="isActing('role-definition')" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              保存定义
            </button>
          </form>

          <form class="tool-panel" @submit.prevent="updateRoleMetric">
            <div class="tool-heading compact-heading"><div><h2><Gauge class="h-5 w-5" />策展指标</h2><p>维护用户在频道内的人工复核准确率。</p></div></div>
            <label class="field-label">用户 UID<input v-model.trim="roleMetricForm.userId" class="field-input" inputmode="numeric"></label>
            <label class="field-label">频道编码<input v-model.trim="roleMetricForm.domainCode" class="field-input" maxlength="32"></label>
            <div class="field-pair">
              <label class="field-label">正确数<input v-model.number="roleMetricForm.curationCorrectCount" class="field-input" type="number" min="0"></label>
              <label class="field-label">复核数<input v-model.number="roleMetricForm.curationReviewedCount" class="field-input" type="number" min="0"></label>
            </div>
            <button type="submit" class="secondary-button" :disabled="!canSubmitRoleMetric">
              <Loader2 v-if="isActing('role-metric')" class="h-4 w-4 animate-spin" />
              <Gauge v-else class="h-4 w-4" />
              更新指标
            </button>
          </form>

          <form class="tool-panel" @submit.prevent="expireDueGrants">
            <div class="tool-heading compact-heading"><div><h2><TimerReset class="h-5 w-5" />到期扫描</h2><p>有界处理已到期但仍生效的授权。</p></div></div>
            <label class="field-label">处理上限<input v-model.number="expireDueLimit" class="field-input" type="number" min="1" max="100"></label>
            <div class="boundary-copy">
              <ShieldCheck class="h-5 w-5" />
              <p>资格只允许申请，不自动授予管理权限；暂停、撤销与到期均保留理由和审计记录。</p>
            </div>
            <button type="submit" class="secondary-button" :disabled="!canMutate || expireDueLimit < 1">
              <Loader2 v-if="isActing('expire-due')" class="h-4 w-4 animate-spin" />
              <TimerReset v-else class="h-4 w-4" />
              扫描到期授权
            </button>
          </form>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable vue/one-component-per-file */
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import {
  AlertTriangle,
  BadgeCheck,
  BadgePlus,
  Ban,
  Check,
  ClipboardCheck,
  Gauge,
  Gift,
  Inbox,
  Layers3,
  Loader2,
  PackageCheck,
  PackagePlus,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Scale,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Snowflake,
  SunSnow,
  Target,
  TimerOff,
  TimerReset,
  ToggleRight,
  Truck,
  Undo2,
  UserCheck,
  X,
  XCircle,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import AppHeader from '@/components/layout/AppHeader.vue'
import AdminIncentiveGovernanceWorkspace from '@/components/incentive/AdminIncentiveGovernanceWorkspace.vue'
import AdminRoleReviewContext from '@/components/incentive/AdminRoleReviewContext.vue'
import { getErrorMessage } from '@/api/client'
import { opsApi, type MyAdminPermissions } from '@/api/ops'
import {
  incentiveAdminApi,
  type ApiLong,
  type Benefit,
  type BenefitOrder,
  type BountyRequestType,
  type BountyRiskCategory,
  type BountyStatus,
  type BountySubmission,
  type IncentiveAccountType,
  type PageResult,
  type ReconciliationRun,
  type RoleApplication,
  type RoleGrant,
} from '@/api/incentives'

type DataState = {
  loading: boolean
  error: string
}

const createDataState = (): DataState => reactive({ loading: false, error: '' })
const emptyPage = <T,>(): PageResult<T> => ({ items: [], nextCursor: null, hasMore: false, total: 0 })
const pageData = <T,>(value: PageResult<T> | null | undefined): PageResult<T> => ({
  items: Array.isArray(value?.items) ? value.items : [],
  nextCursor: value?.nextCursor || null,
  hasMore: Boolean(value?.hasMore),
  total: Number(value?.total || 0),
})

const ListState = defineComponent({
  name: 'ListState',
  props: {
    loading: { type: Boolean, required: true },
    error: { type: String, required: true },
    empty: { type: Boolean, required: true },
    emptyTitle: { type: String, required: true },
    emptyDescription: { type: String, required: true },
  },
  emits: ['retry'],
  setup(props, { emit }) {
    return () => {
      if (props.loading) {
        return h('div', { class: 'skeleton-stack', 'aria-label': '正在加载' }, [
          h('div', { class: 'h-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800' }),
          h('div', { class: 'h-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800' }),
          h('div', { class: 'h-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800' }),
        ])
      }
      if (props.error) {
        return h('div', { class: 'error-state' }, [
          h(AlertTriangle, { class: 'h-5 w-5' }),
          h('div', { class: 'min-w-0 flex-1' }, [
            h('strong', { class: 'block text-sm font-black' }, '数据加载失败'),
            h('p', { class: 'mt-1 break-words text-xs leading-5' }, props.error),
          ]),
          h('button', {
            type: 'button',
            class: 'inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
            onClick: () => emit('retry'),
          }, '重试'),
        ])
      }
      if (props.empty) {
        return h('div', { class: 'empty-state' }, [
          h(Inbox, { class: 'h-5 w-5' }),
          h('div', { class: 'min-w-0' }, [
            h('strong', { class: 'block text-sm font-black' }, props.emptyTitle),
            h('p', { class: 'mt-1 break-words text-xs leading-5' }, props.emptyDescription),
          ]),
        ])
      }
      return null
    }
  },
})

const PageControls = defineComponent({
  name: 'PageControls',
  props: {
    page: { type: Number, required: true },
    hasMore: { type: Boolean, required: true },
    disabled: { type: Boolean, required: true },
  },
  emits: ['change'],
  setup(props, { emit }) {
    return () => h('div', { class: 'page-controls' }, [
      h('button', {
        type: 'button',
        class: 'inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
        disabled: props.disabled || props.page <= 1,
        onClick: () => emit('change', props.page - 1),
      }, '上一页'),
      h('span', `第 ${props.page} 页`),
      h('button', {
        type: 'button',
        class: 'inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
        disabled: props.disabled || !props.hasMore,
        onClick: () => emit('change', props.page + 1),
      }, '下一页'),
    ])
  },
})

const tabs = [
  { key: 'rewards', label: '奖励规则', icon: Scale },
  { key: 'ledger', label: '账本风控', icon: ScanSearch },
  { key: 'benefits', label: '权益订单', icon: Gift },
  { key: 'bounties', label: '平台悬赏', icon: Target },
  { key: 'governance', label: '申诉与风控', icon: ShieldAlert },
  { key: 'roles', label: '社区角色', icon: BadgeCheck },
] as const

const benefitCategories = [
  'PROFILE_STYLE',
  'CONTENT_TOOL',
  'COMMEMORATION',
  'COMMUNITY_TOOL',
]
const orderStatuses = ['CREATED', 'RESERVED', 'DELIVERED', 'CANCELLED', 'REFUNDED']

const activeTab = ref<(typeof tabs)[number]['key']>('rewards')
const permissions = ref<MyAdminPermissions | null>(null)
const permissionState = createDataState()
const reconciliationState = createDataState()
const catalogState = createDataState()
const ordersState = createDataState()
const bountyState = createDataState()
const roleApplicationsState = createDataState()
const roleGrantsState = createDataState()

const operationReason = ref('')
const pendingAction = ref('')
const reconciliationRuns = ref<ReconciliationRun[]>([])
const benefitCatalog = ref<PageResult<Benefit>>(emptyPage())
const benefitOrders = ref<PageResult<BenefitOrder>>(emptyPage())
const bountySubmissions = ref<PageResult<BountySubmission>>(emptyPage())
const roleApplications = ref<PageResult<RoleApplication>>(emptyPage())
const roleGrants = ref<PageResult<RoleGrant>>(emptyPage())

const benefitCatalogPage = ref(1)
const benefitOrderPage = ref(1)
const bountySubmissionPage = ref(1)
const roleApplicationPage = ref(1)
const roleGrantPage = ref(1)
const orderStatusFilter = ref('')
const bountyStatusFilter = ref('SUBMITTED')
const roleApplicationFilter = ref('SUBMITTED')
const roleGrantFilter = ref('')
const deliveryReference = ref('')
const roleApprovalExpiresAt = ref('')
const reconciliationLimit = ref(100)
const releaseFreezeId = ref('')
const reverseLedgerId = ref('')
const expireDueLimit = ref(100)
const editingBenefitId = ref<string | null>(null)

const rewardInboxForm = reactive({
  stableKey: '',
  eventType: 'QUALIFIED_PUBLIC_POST',
  recipientUid: '',
  domainCode: '',
  eventDomainCode: '',
  sourceReferenceType: '',
  sourceReferenceId: '',
  parentReferenceType: '',
  parentReferenceId: '',
  ruleCode: '',
  ruleVersion: 1,
  payloadJson: '{}',
})

const rewardRuleForm = reactive({
  ruleCode: '',
  ruleVersion: 1,
  accountType: 'POINT' as IncentiveAccountType,
  domainCode: '',
  amount: 1,
  dailyUserCap: 0,
  lifetimeUserCap: 0,
  enabled: true,
  validFrom: '',
  validUntil: '',
})

const rewardBatchForm = reactive({
  batchKey: '',
  ruleCode: '',
  ruleVersion: 1,
  limit: 100,
})

const freezeForm = reactive({
  userId: '',
  accountType: 'POINT' as IncentiveAccountType,
  domainCode: '',
  amount: 1,
  blockSpending: true,
})

const benefitForm = reactive({
  benefitCode: '',
  name: '',
  description: '',
  category: 'CONTENT_TOOL',
  deliveryType: 'ACCOUNT_ENTITLEMENT',
  pointCost: 1,
  totalStock: '',
  enabled: true,
})

const bountyForm = reactive({
  title: '',
  description: '',
  domainCode: '',
  requestType: 'PUBLIC_CONTRIBUTION' as BountyRequestType,
  riskCategory: 'LOW' as BountyRiskCategory,
  quota: 1,
  pointReward: 1,
})

const bountyStatusForm = reactive({
  bountyId: '',
  status: 'OPEN' as BountyStatus,
})

const roleDefinitionForm = reactive({
  roleCode: '',
  roleName: '',
  description: '',
  domainCode: '',
  minAccountAgeDays: 0,
  minDomainReputation: 0,
  minActivityCount: 0,
  maxViolationCount: 0,
  minCurationAccuracyBps: 0,
  requiresNoRiskFreeze: true,
  enabled: true,
})

const roleMetricForm = reactive({
  userId: '',
  domainCode: '',
  curationCorrectCount: 0,
  curationReviewedCount: 0,
})

const isPositiveId = (value: string) => /^[1-9]\d*$/.test(value.trim())
const hasValidRuleWindow = computed(() => (
  !rewardRuleForm.validFrom
  || !rewardRuleForm.validUntil
  || new Date(rewardRuleForm.validUntil).getTime() > new Date(rewardRuleForm.validFrom).getTime()
))

const canWrite = computed(() => Boolean(permissions.value?.admin))
const reasonReady = computed(() => operationReason.value.trim().length >= 2)
const canMutate = computed(() => canWrite.value && reasonReady.value && pendingAction.value === '')
const permissionLabel = computed(() => {
  if (permissions.value?.admin) return '系统管理员'
  return '无写权限'
})
const isLoading = computed(() => permissionState.loading || [
  reconciliationState,
  catalogState,
  ordersState,
  bountyState,
  roleApplicationsState,
  roleGrantsState,
].some((state) => state.loading) || pendingAction.value !== '')

const canSubmitRewardInbox = computed(() => canMutate.value
  && rewardInboxForm.stableKey.length > 0
  && rewardInboxForm.eventType.length > 0
  && rewardInboxForm.eventDomainCode.length > 0
  && rewardInboxForm.sourceReferenceType.length > 0
  && rewardInboxForm.sourceReferenceId.length > 0
  && isPositiveId(rewardInboxForm.recipientUid)
  && rewardInboxForm.ruleCode.length > 0
  && rewardInboxForm.ruleVersion >= 1)

const canSubmitRewardRule = computed(() => canMutate.value
  && rewardRuleForm.ruleCode.length > 0
  && rewardRuleForm.ruleVersion >= 1
  && rewardRuleForm.amount >= 1
  && rewardRuleForm.amount <= 1_000_000
  && (rewardRuleForm.accountType === 'POINT' || rewardRuleForm.domainCode.length > 0)
  && hasValidRuleWindow.value)

const canSubmitRewardBatch = computed(() => canMutate.value
  && rewardBatchForm.batchKey.length > 0
  && rewardBatchForm.ruleCode.length > 0
  && rewardBatchForm.ruleVersion >= 1
  && rewardBatchForm.limit >= 1
  && rewardBatchForm.limit <= 100)

const canSubmitFreeze = computed(() => canMutate.value
  && isPositiveId(freezeForm.userId)
  && freezeForm.amount >= 1
  && freezeForm.amount <= 1_000_000
  && (freezeForm.accountType === 'POINT' || freezeForm.domainCode.length > 0))

const canSubmitBenefit = computed(() => canMutate.value
  && benefitForm.benefitCode.length > 0
  && benefitForm.name.length > 0
  && benefitForm.category.length > 0
  && benefitForm.deliveryType.length > 0
  && benefitForm.pointCost >= 1
  && benefitForm.pointCost <= 1_000_000
  && (benefitForm.totalStock === '' || Number(benefitForm.totalStock) >= 0))

const canSubmitBounty = computed(() => canMutate.value
  && bountyForm.title.length >= 2
  && bountyForm.description.length >= 10
  && bountyForm.domainCode.length > 0
  && bountyForm.quota >= 1
  && bountyForm.quota <= 500
  && bountyForm.pointReward >= 1
  && bountyForm.pointReward <= 5_000
  && bountyForm.quota * bountyForm.pointReward <= 100_000)
const bountyBudgetPreview = computed(() => Math.max(0, Number(bountyForm.quota || 0) * Number(bountyForm.pointReward || 0)))

const canSubmitRoleDefinition = computed(() => canMutate.value
  && roleDefinitionForm.roleCode.length > 0
  && roleDefinitionForm.roleName.length > 0
  && roleDefinitionForm.domainCode.length > 0)

const canSubmitRoleMetric = computed(() => canMutate.value
  && isPositiveId(roleMetricForm.userId)
  && roleMetricForm.domainCode.length > 0
  && roleMetricForm.curationCorrectCount >= 0
  && roleMetricForm.curationReviewedCount >= roleMetricForm.curationCorrectCount)

const isActing = (key: string) => pendingAction.value === key

const runDataLoad = async (state: DataState, task: () => Promise<void>, fallback: string) => {
  state.loading = true
  state.error = ''
  try {
    await task()
  } catch (error) {
    state.error = getErrorMessage(error, fallback)
  } finally {
    state.loading = false
  }
}

const loadPermissions = () => runDataLoad(permissionState, async () => {
  const response = await opsApi.myPermissions()
  permissions.value = response.data
}, '后台权限校验失败')

const loadReconciliation = () => runDataLoad(reconciliationState, async () => {
  const response = await incentiveAdminApi.listReconciliationRuns(20)
  reconciliationRuns.value = response.data || []
}, '对账记录加载失败')

const loadBenefitCatalog = (page = benefitCatalogPage.value) => runDataLoad(catalogState, async () => {
  const response = await incentiveAdminApi.listBenefitCatalog({ page, size: 12 })
  benefitCatalog.value = pageData(response.data)
  benefitCatalogPage.value = page
}, '权益目录加载失败')

const changeBenefitCatalogPage = (page: number) => loadBenefitCatalog(page)

const loadBenefitOrders = (page = benefitOrderPage.value) => runDataLoad(ordersState, async () => {
  const response = await incentiveAdminApi.listBenefitOrders({
    status: orderStatusFilter.value || undefined,
    page,
    size: 20,
  })
  benefitOrders.value = pageData(response.data)
  benefitOrderPage.value = page
}, '权益订单加载失败')

const loadBountySubmissions = (page = bountySubmissionPage.value) => runDataLoad(bountyState, async () => {
  const response = await incentiveAdminApi.listBountySubmissions({
    status: bountyStatusFilter.value || undefined,
    page,
    size: 20,
  })
  bountySubmissions.value = pageData(response.data)
  bountySubmissionPage.value = page
}, '悬赏审核队列加载失败')

const loadRoleApplications = (page = roleApplicationPage.value) => runDataLoad(roleApplicationsState, async () => {
  const response = await incentiveAdminApi.listRoleApplications({
    status: roleApplicationFilter.value || undefined,
    page,
    size: 20,
  })
  roleApplications.value = pageData(response.data)
  roleApplicationPage.value = page
}, '角色申请加载失败')

const loadRoleGrants = (page = roleGrantPage.value) => runDataLoad(roleGrantsState, async () => {
  const response = await incentiveAdminApi.listRoleGrants({
    status: roleGrantFilter.value || undefined,
    page,
    size: 20,
  })
  roleGrants.value = pageData(response.data)
  roleGrantPage.value = page
}, '角色授权加载失败')

const refreshAll = async () => {
  await Promise.all([
    loadPermissions(),
    loadReconciliation(),
    loadBenefitCatalog(),
    loadBenefitOrders(),
    loadBountySubmissions(),
    loadRoleApplications(),
    loadRoleGrants(),
  ])
}

const runMutation = async (
  key: string,
  successMessage: string,
  task: (reason: string) => Promise<unknown>,
  refresh?: () => Promise<unknown>,
) => {
  if (!canMutate.value) return
  const reason = operationReason.value.trim()
  pendingAction.value = key
  try {
    await task(reason)
    toast.success(successMessage)
    operationReason.value = ''
    if (refresh) await refresh()
  } catch (error) {
    toast.error(getErrorMessage(error, '治理操作失败'))
  } finally {
    pendingAction.value = ''
  }
}

const receiveReward = () => runMutation('reward-inbox', '奖励事件已入箱', (reason) =>
  incentiveAdminApi.receiveReward({
    stableKey: rewardInboxForm.stableKey,
    eventType: rewardInboxForm.eventType,
    recipientUid: rewardInboxForm.recipientUid,
    domainCode: rewardInboxForm.domainCode || undefined,
    eventDomainCode: rewardInboxForm.eventDomainCode,
    sourceReferenceType: rewardInboxForm.sourceReferenceType,
    sourceReferenceId: rewardInboxForm.sourceReferenceId,
    parentReferenceType: rewardInboxForm.parentReferenceType || undefined,
    parentReferenceId: rewardInboxForm.parentReferenceId || undefined,
    ruleCode: rewardInboxForm.ruleCode,
    ruleVersion: rewardInboxForm.ruleVersion,
    payloadJson: rewardInboxForm.payloadJson || undefined,
    reason,
  }), () => {
  rewardInboxForm.stableKey = ''
  rewardInboxForm.recipientUid = ''
  return Promise.resolve()
})

const createRewardRule = () => runMutation('reward-rule', '奖励规则版本已保存', (reason) =>
  incentiveAdminApi.createRewardRule({
    ruleCode: rewardRuleForm.ruleCode,
    ruleVersion: rewardRuleForm.ruleVersion,
    accountType: rewardRuleForm.accountType,
    domainCode: rewardRuleForm.domainCode || undefined,
    amount: rewardRuleForm.amount,
    dailyUserCap: rewardRuleForm.dailyUserCap,
    lifetimeUserCap: rewardRuleForm.lifetimeUserCap,
    enabled: rewardRuleForm.enabled,
    validFrom: rewardRuleForm.validFrom || undefined,
    validUntil: rewardRuleForm.validUntil || undefined,
    reason,
  }))

const processRewardBatch = () => runMutation('reward-batch', '奖励批次处理完成', (reason) =>
  incentiveAdminApi.processRewardBatch({
    batchKey: rewardBatchForm.batchKey,
    ruleCode: rewardBatchForm.ruleCode,
    ruleVersion: rewardBatchForm.ruleVersion,
    limit: rewardBatchForm.limit,
    reason,
  }))

const runReconciliation = () => runMutation('reconciliation', '对账已完成', (reason) =>
  incentiveAdminApi.runReconciliation(reconciliationLimit.value, reason), loadReconciliation)

const freezeAccount = () => runMutation('freeze-account', '账户冻结流水已写入', (reason) =>
  incentiveAdminApi.freezeAccount(freezeForm.userId, {
    accountType: freezeForm.accountType,
    domainCode: freezeForm.domainCode || undefined,
    amount: freezeForm.amount,
    blockSpending: freezeForm.blockSpending,
    idempotencyKey: `freeze:${freezeForm.userId}:${crypto.randomUUID()}`,
    reason,
  }), () => {
  freezeForm.userId = ''
  return Promise.resolve()
})

const releaseFreeze = () => runMutation('release-freeze', '冻结已解除', (reason) =>
  incentiveAdminApi.releaseFreeze(releaseFreezeId.value, {
    idempotencyKey: `release:${releaseFreezeId.value}:${crypto.randomUUID()}`,
    reason,
  }), () => {
  releaseFreezeId.value = ''
  return Promise.resolve()
})

const reverseLedger = () => runMutation('reverse-ledger', '冲正补偿流水已创建', (reason) =>
  incentiveAdminApi.reverseLedger(reverseLedgerId.value, {
    idempotencyKey: `reverse:${reverseLedgerId.value}:${crypto.randomUUID()}`,
    reason,
  }), () => {
  reverseLedgerId.value = ''
  return Promise.resolve()
})

const editBenefit = (benefit: Benefit) => {
  editingBenefitId.value = String(benefit.id)
  benefitForm.benefitCode = benefit.benefitCode
  benefitForm.name = benefit.name
  benefitForm.description = benefit.description || ''
  benefitForm.category = benefit.category
  benefitForm.deliveryType = benefit.deliveryType
  benefitForm.pointCost = Number(benefit.pointCost)
  benefitForm.totalStock = benefit.totalStock == null ? '' : String(benefit.totalStock)
  benefitForm.enabled = benefit.enabled
}

const resetBenefitForm = () => {
  editingBenefitId.value = null
  benefitForm.benefitCode = ''
  benefitForm.name = ''
  benefitForm.description = ''
  benefitForm.category = 'CONTENT_TOOL'
  benefitForm.deliveryType = 'ACCOUNT_ENTITLEMENT'
  benefitForm.pointCost = 1
  benefitForm.totalStock = ''
  benefitForm.enabled = true
}

const saveBenefit = () => runMutation('save-benefit', '权益目录已保存', (reason) =>
  incentiveAdminApi.upsertBenefitCatalog({
    benefitCode: benefitForm.benefitCode,
    name: benefitForm.name,
    description: benefitForm.description || undefined,
    category: benefitForm.category,
    deliveryType: benefitForm.deliveryType,
    pointCost: benefitForm.pointCost,
    totalStock: benefitForm.totalStock === '' ? null : Number(benefitForm.totalStock),
    enabled: benefitForm.enabled,
    reason,
  }), async () => {
  resetBenefitForm()
  await loadBenefitCatalog()
})

const deliverOrder = (order: BenefitOrder) => runMutation(`deliver-order:${order.id}`, '权益订单已交付', (reason) =>
  incentiveAdminApi.deliverBenefitOrder(order.id, {
    reason,
    deliveryReference: deliveryReference.value || undefined,
  }), () => loadBenefitOrders())

const cancelAdminOrder = (order: BenefitOrder) => runMutation(`cancel-order:${order.id}`, '权益订单已取消', (reason) =>
  incentiveAdminApi.cancelBenefitOrder(order.id, { reason }), () => loadBenefitOrders())

const refundOrder = (order: BenefitOrder) => runMutation(`refund-order:${order.id}`, '权益订单已退款', (reason) =>
  incentiveAdminApi.refundBenefitOrder(order.id, { reason }), () => loadBenefitOrders())

const createBounty = () => runMutation('create-bounty', '平台悬赏草稿已创建', (reason) =>
  incentiveAdminApi.createBounty({
    title: bountyForm.title,
    description: bountyForm.description,
    domainCode: bountyForm.domainCode,
    requestType: bountyForm.requestType,
    riskCategory: bountyForm.riskCategory,
    quota: bountyForm.quota,
    pointReward: bountyForm.pointReward,
    reason,
  }), () => {
  bountyForm.title = ''
  bountyForm.description = ''
  return Promise.resolve()
})

const updateBountyStatus = () => runMutation('bounty-status', '悬赏状态已更新', (reason) =>
  incentiveAdminApi.updateBountyStatus(bountyStatusForm.bountyId, {
    status: bountyStatusForm.status,
    reason,
  }), () => {
  bountyStatusForm.bountyId = ''
  return loadBountySubmissions()
})

const reviewBounty = (submission: BountySubmission, approved: boolean) =>
  runMutation(`review-bounty:${submission.id}`, approved ? '悬赏成果已通过' : '悬赏成果已拒绝', (reason) =>
    incentiveAdminApi.reviewBountySubmission(submission.id, { approved, reason }), () => loadBountySubmissions())

const reviewRoleApplication = (application: RoleApplication, approved: boolean) =>
  runMutation(`review-role:${application.id}`, approved ? '角色申请已通过' : '角色申请已拒绝', (reason) =>
    incentiveAdminApi.reviewRoleApplication(application.id, {
      approved,
      reason,
      expiresAt: approved && roleApprovalExpiresAt.value ? roleApprovalExpiresAt.value : undefined,
    }), async () => {
    await Promise.all([loadRoleApplications(), loadRoleGrants()])
  })

const transitionGrant = (grant: RoleGrant, action: 'suspend' | 'revoke' | 'expire') =>
  runMutation(`${action}-grant:${grant.id}`, `角色授权已${action === 'suspend' ? '暂停' : action === 'revoke' ? '撤销' : '到期'}`, (reason) => {
    if (action === 'suspend') return incentiveAdminApi.suspendRoleGrant(grant.id, { reason })
    if (action === 'revoke') return incentiveAdminApi.revokeRoleGrant(grant.id, { reason })
    return incentiveAdminApi.expireRoleGrant(grant.id, { reason })
  }, () => loadRoleGrants())

const saveRoleDefinition = () => runMutation('role-definition', '角色定义已保存', (reason) =>
  incentiveAdminApi.upsertRoleDefinition({
    roleCode: roleDefinitionForm.roleCode,
    roleName: roleDefinitionForm.roleName,
    description: roleDefinitionForm.description || undefined,
    domainCode: roleDefinitionForm.domainCode,
    minAccountAgeDays: roleDefinitionForm.minAccountAgeDays,
    minDomainReputation: roleDefinitionForm.minDomainReputation,
    minActivityCount: roleDefinitionForm.minActivityCount,
    maxViolationCount: roleDefinitionForm.maxViolationCount,
    minCurationAccuracyBps: roleDefinitionForm.minCurationAccuracyBps,
    requiresNoRiskFreeze: roleDefinitionForm.requiresNoRiskFreeze,
    enabled: roleDefinitionForm.enabled,
    reason,
  }))

const updateRoleMetric = () => runMutation('role-metric', '角色策展指标已更新', (reason) =>
  incentiveAdminApi.updateRoleMetric(roleMetricForm.userId, {
    domainCode: roleMetricForm.domainCode,
    curationCorrectCount: roleMetricForm.curationCorrectCount,
    curationReviewedCount: roleMetricForm.curationReviewedCount,
    reason,
  }))

const expireDueGrants = () => runMutation('expire-due', '到期授权扫描完成', async (reason) => {
  const response = await incentiveAdminApi.expireDueRoleGrants(expireDueLimit.value, reason)
  toast.info(`本次处理 ${response.data || 0} 条到期授权`)
}, () => loadRoleGrants())

const formatNumber = (value: ApiLong | null | undefined) => new Intl.NumberFormat('zh-CN').format(Number(value || 0))
const formatTime = (value?: string | null) => {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

const stockLabel = (benefit: Benefit) => benefit.totalStock == null
  ? '不限库存'
  : `剩余 ${formatNumber(benefit.availableStock)} / ${formatNumber(benefit.totalStock)}`

const statusLabel = (value: string) => ({
  CREATED: '已创建',
  RESERVED: '已预留',
  DELIVERED: '已交付',
  CANCELLED: '已取消',
  REFUNDED: '已退款',
  SUBMITTED: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  ACTIVE: '生效',
  SUSPENDED: '已暂停',
  REVOKED: '已撤销',
  EXPIRED: '已到期',
  RUNNING: '运行中',
  SUCCESS: '成功',
  FAILED: '失败',
  OPEN: '开放',
  CLOSED: '关闭',
}[value] || value)

const statusClass = (value: string) => {
  if (['ACTIVE', 'APPROVED', 'DELIVERED', 'SUCCESS', 'OPEN'].includes(value)) return 'status-ok'
  if (['REJECTED', 'REVOKED', 'FAILED', 'CANCELLED'].includes(value)) return 'status-danger'
  if (['SUBMITTED', 'RESERVED', 'SUSPENDED', 'RUNNING', 'CREATED'].includes(value)) return 'status-warn'
  return 'status-muted'
}

onMounted(refreshAll)
</script>

<style scoped>
.admin-growth-page {
  background: rgb(248 250 252);
  color: rgb(15 23 42);
}

.notice {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.7rem;
  border: 1px solid;
  border-radius: 0.75rem;
  padding: 0.85rem 1rem;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.notice strong {
  display: block;
  font-weight: 900;
}

.notice p {
  margin-top: 0.15rem;
}

.notice-info {
  border-color: rgb(186 230 253);
  background: rgb(240 249 255);
  color: rgb(3 105 161);
}

.notice-ok {
  border-color: rgb(187 247 208);
  background: rgb(240 253 244);
  color: rgb(22 101 52);
}

.notice-danger {
  border-color: rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(153 27 27);
}

.reason-bar {
  display: flex;
  min-width: 0;
  align-items: flex-end;
  gap: 1rem;
  border: 1px solid rgb(253 230 138);
  border-radius: 0.75rem;
  background: rgb(255 251 235);
  padding: 0.9rem;
}

.reason-status {
  display: grid;
  flex: 0 0 auto;
  justify-items: end;
  gap: 0.35rem;
}

.reason-status small {
  max-width: 18rem;
  color: rgb(120 53 15);
  font-size: 0.72rem;
  text-align: right;
}

.tab-bar {
  display: flex;
  max-width: 100%;
  gap: 0.4rem;
  overflow-x: auto;
  padding-bottom: 0.2rem;
}

.tab-button {
  display: inline-flex;
  min-height: 40px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: white;
  padding: 0.5rem 0.75rem;
  color: rgb(51 65 85);
  font-size: 0.8125rem;
  font-weight: 900;
}

.tab-active {
  border-color: rgb(8 145 178);
  background: rgb(236 254 255);
  color: rgb(14 116 144);
}

.tool-grid {
  display: grid;
  min-width: 0;
  gap: 1rem;
}

.action-stack {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: 1rem;
}

.tool-panel {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: 0.75rem;
  overflow: hidden;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 1rem;
}

.tool-heading {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.tool-heading h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgb(15 23 42);
  font-size: 0.98rem;
  font-weight: 900;
}

.tool-heading p {
  margin-top: 0.25rem;
  color: rgb(100 116 139);
  font-size: 0.78rem;
  line-height: 1.45;
}

.compact-heading {
  margin-bottom: 0.15rem;
}

.field-label {
  display: grid;
  min-width: 0;
  gap: 0.35rem;
  color: rgb(51 65 85);
  font-size: 0.76rem;
  font-weight: 800;
}

.field-input {
  width: 100%;
  min-width: 0;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: white;
  padding: 0.56rem 0.65rem;
  color: rgb(15 23 42);
  font-size: 0.8125rem;
  line-height: 1.4;
  outline: none;
}

.field-input:focus {
  border-color: rgb(8 145 178);
  box-shadow: 0 0 0 3px rgb(165 243 252 / 0.72);
}

.field-input:disabled {
  cursor: not-allowed;
  background: rgb(241 245 249);
  color: rgb(100 116 139);
}

.code-field {
  font-family: 'JetBrains Mono', monospace;
}

.compact-field {
  min-width: 9rem;
  max-width: 15rem;
}

.field-pair,
.field-triple {
  display: grid;
  min-width: 0;
  gap: 0.65rem;
}

.field-pair {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field-triple {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.toggle-row {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
  color: rgb(51 65 85);
  font-size: 0.78rem;
  font-weight: 800;
}

.toggle-row input {
  height: 1rem;
  width: 1rem;
  accent-color: rgb(8 145 178);
}

.boundary-copy {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.55rem;
  border-top: 1px solid rgb(226 232 240);
  padding-top: 0.7rem;
  color: rgb(71 85 105);
  font-size: 0.75rem;
  line-height: 1.5;
}

.boundary-copy svg {
  flex: 0 0 auto;
  color: rgb(5 150 105);
}

.budget-summary {
  display: grid;
  min-width: 0;
  gap: 0.5rem;
  border: 1px solid rgb(186 230 253);
  border-radius: 0.625rem;
  background: rgb(240 249 255);
  padding: 0.75rem;
}

.budget-summary > div {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  color: rgb(3 105 161);
  font-size: 0.72rem;
}

.budget-summary strong {
  overflow-wrap: anywhere;
  color: rgb(12 74 110);
  font-weight: 900;
  text-align: right;
}

.budget-summary p {
  border-top: 1px solid rgb(186 230 253);
  padding-top: 0.5rem;
  color: rgb(7 89 133);
  font-size: 0.7rem;
  line-height: 1.45;
}

.dense-list,
.skeleton-stack {
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
  padding-top: 0.7rem;
}

.dense-row:first-child {
  border-top: 0;
  padding-top: 0;
}

.row-title {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.row-title strong {
  overflow-wrap: anywhere;
  color: rgb(15 23 42);
  font-size: 0.85rem;
  font-weight: 900;
}

.dense-row p {
  margin-top: 0.32rem;
  max-width: 72ch;
  overflow-wrap: anywhere;
  color: rgb(71 85 105);
  font-size: 0.78rem;
  line-height: 1.48;
}

.dense-row small {
  display: block;
  margin-top: 0.28rem;
  overflow-wrap: anywhere;
  color: rgb(100 116 139);
  font-size: 0.7rem;
  line-height: 1.4;
}

.numeric-summary {
  display: grid;
  flex: 0 0 auto;
  justify-items: end;
  color: rgb(100 116 139);
  font-size: 0.7rem;
}

.numeric-summary strong {
  margin-top: 0.15rem;
  color: rgb(15 23 42);
  font-size: 1rem;
  font-weight: 900;
}

.row-actions,
.filter-actions {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.4rem;
}

.filter-heading {
  align-items: center;
}

.status-pill,
.meta-chip,
.count-label {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  font-size: 0.68rem;
  font-weight: 900;
  overflow-wrap: anywhere;
}

.meta-chip,
.status-muted,
.count-label {
  background: rgb(241 245 249);
  color: rgb(71 85 105);
}

.status-ok {
  background: rgb(220 252 231);
  color: rgb(21 128 61);
}

.status-warn {
  background: rgb(254 243 199);
  color: rgb(146 64 14);
}

.status-danger {
  background: rgb(254 226 226);
  color: rgb(185 28 28);
}

.primary-button,
.secondary-button,
.danger-button,
.success-button,
.icon-button {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 0.42rem;
  border-radius: 0.5rem;
  padding: 0.48rem 0.72rem;
  font-size: 0.78rem;
  font-weight: 900;
}

.primary-button {
  border: 1px solid rgb(14 116 144);
  background: rgb(14 116 144);
  color: white;
}

.secondary-button,
.icon-button {
  border: 1px solid rgb(203 213 225);
  background: white;
  color: rgb(51 65 85);
}

.danger-button {
  border: 1px solid rgb(220 38 38);
  background: rgb(254 242 242);
  color: rgb(185 28 28);
}

.success-button {
  border: 1px solid rgb(22 163 74);
  background: rgb(240 253 244);
  color: rgb(21 128 61);
}

.icon-button {
  height: 38px;
  width: 38px;
  flex: 0 0 auto;
  padding: 0;
}

.compact {
  min-height: 34px;
  padding: 0.35rem 0.58rem;
}

.primary-button:hover:not(:disabled) {
  background: rgb(21 94 117);
}

.secondary-button:hover:not(:disabled),
.icon-button:hover:not(:disabled) {
  border-color: rgb(34 211 238);
  background: rgb(236 254 255);
  color: rgb(14 116 144);
}

.danger-button:hover:not(:disabled) {
  background: rgb(254 226 226);
}

.success-button:hover:not(:disabled) {
  background: rgb(220 252 231);
}

.primary-button:disabled,
.secondary-button:disabled,
.danger-button:disabled,
.success-button:disabled,
.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.text-button {
  color: rgb(14 116 144);
  font-size: 0.78rem;
  font-weight: 900;
}

.page-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  margin-top: 0.75rem;
  color: rgb(100 116 139);
  font-size: 0.75rem;
}

.error-state,
.empty-state {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.65rem;
  border-radius: 0.625rem;
  padding: 0.75rem;
}

.error-state {
  flex-wrap: wrap;
  border: 1px solid rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(153 27 27);
}

.empty-state {
  border: 1px dashed rgb(203 213 225);
  background: rgb(248 250 252);
  color: rgb(71 85 105);
}

.error-state > div {
  min-width: 10rem;
  flex: 1;
}

.error-state strong,
.empty-state strong {
  display: block;
  font-size: 0.82rem;
  font-weight: 900;
}

.error-state p,
.empty-state p {
  margin-top: 0.2rem;
  overflow-wrap: anywhere;
  font-size: 0.74rem;
  line-height: 1.45;
}

.skeleton-row {
  position: relative;
  height: 4.1rem;
  overflow: hidden;
  border-radius: 0.625rem;
  background: rgb(226 232 240);
}

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

@media (min-width: 900px) {
  .three-columns {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .split-columns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ledger-layout {
    grid-template-columns: minmax(0, 1.45fr) minmax(19rem, 0.55fr);
  }
}

@media (max-width: 899px) {
  .reason-bar,
  .tool-heading,
  .filter-heading,
  .dense-row {
    align-items: stretch;
    flex-direction: column;
  }

  .reason-status {
    justify-items: start;
  }

  .reason-status small {
    max-width: none;
    text-align: left;
  }

  .row-actions,
  .filter-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 620px) {
  .field-pair,
  .field-triple {
    grid-template-columns: minmax(0, 1fr);
  }

  .compact-field {
    max-width: none;
  }

  .primary-button,
  .secondary-button,
  .danger-button,
  .success-button {
    min-height: 44px;
  }

  .tool-panel > .primary-button,
  .tool-panel > .secondary-button,
  .tool-panel > .danger-button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-row::after {
    animation: none;
  }
}

.dark .admin-growth-page {
  background: rgb(2 6 23);
  color: rgb(226 232 240);
}

.dark .tool-panel,
.dark .tab-button,
.dark .secondary-button,
.dark .icon-button,
.dark .field-input {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

.dark .reason-bar {
  border-color: rgb(146 64 14);
  background: rgb(120 53 15 / 0.3);
}

.dark .budget-summary {
  border-color: rgb(14 116 144);
  background: rgb(8 47 73 / 0.5);
}

.dark .budget-summary > div,
.dark .budget-summary p {
  color: rgb(165 243 252);
}

.dark .budget-summary strong {
  color: rgb(207 250 254);
}

.dark .reason-status small {
  color: rgb(253 230 138);
}

.dark .tab-active {
  border-color: rgb(6 182 212);
  background: rgb(8 47 73);
  color: rgb(165 243 252);
}

.dark .tool-heading h2,
.dark .row-title strong,
.dark .numeric-summary strong {
  color: rgb(248 250 252);
}

.dark .tool-heading p,
.dark .dense-row p,
.dark .field-label,
.dark .toggle-row,
.dark .boundary-copy {
  color: rgb(148 163 184);
}

.dark .dense-row,
.dark .boundary-copy {
  border-color: rgb(51 65 85);
}

.dark .empty-state {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23 / 0.7);
  color: rgb(148 163 184);
}

.dark .error-state,
.dark .notice-danger {
  border-color: rgb(127 29 29);
  background: rgb(69 10 10 / 0.4);
  color: rgb(254 202 202);
}

.dark .notice-info {
  border-color: rgb(14 116 144);
  background: rgb(8 47 73 / 0.5);
  color: rgb(165 243 252);
}

.dark .notice-ok {
  border-color: rgb(22 101 52);
  background: rgb(20 83 45 / 0.35);
  color: rgb(187 247 208);
}

.dark .danger-button {
  border-color: rgb(185 28 28);
  background: rgb(69 10 10 / 0.35);
  color: rgb(254 202 202);
}

.dark .success-button {
  border-color: rgb(22 101 52);
  background: rgb(20 83 45 / 0.35);
  color: rgb(187 247 208);
}

.dark .skeleton-row {
  background: rgb(30 41 59);
}
</style>
