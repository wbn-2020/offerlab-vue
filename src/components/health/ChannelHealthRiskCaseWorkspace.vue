<template>
  <section class="risk-case-workspace" aria-labelledby="channel-quality-risk-cases-heading">
    <header class="workspace-header">
      <div>
        <p>风险处置</p>
        <h2 id="channel-quality-risk-cases-heading">频道质量风险处置台</h2>
      </div>
      <div class="workspace-controls">
        <label>
          <span>频道</span>
          <select v-model.number="selectedDomain" :disabled="queueLoading || domains.length === 0">
            <option v-for="domain in domains" :key="domain.domain" :value="domain.domain">
              {{ domain.domainName }}
            </option>
          </select>
        </label>
        <label>
          <span>范围</span>
          <select v-model="selectedMode" :disabled="queueLoading || selectedDomain == null">
            <option v-for="option in modeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <button
          type="button"
          class="icon-button"
          title="刷新风险处置队列"
          :disabled="queueLoading || detailLoading || eventsLoading || governanceLoading || pendingAction != null"
          @click="reloadRemoteState"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': queueLoading || detailLoading || eventsLoading || governanceLoading }" />
        </button>
      </div>
    </header>

    <p class="workspace-caption">风险处置只编排负责人、计划与恢复闭环；批次协调仍在 V39 入口完成。</p>

    <div v-if="domains.length === 0" class="workspace-state">当前账户没有可治理风险处置单的频道。</div>
    <div v-else-if="queueErrorText" class="workspace-state workspace-state-error">
      <span>{{ queueErrorText }}</span>
      <button type="button" class="retry-button" :disabled="queueLoading || pendingAction != null" @click="loadQueue">重试</button>
    </div>
    <div v-else-if="queueLoading" class="workspace-state">正在读取风险处置队列</div>
    <template v-else>
      <div v-if="queue.items.length === 0" class="workspace-state">当前筛选范围没有待处置风险。</div>
      <div v-else class="queue-list">
        <article
          v-for="item in queue.items"
          :key="item.batchId"
          :class="['queue-row', { 'queue-row-selected': selectedQueueBatchId === String(item.batchId) }]"
        >
          <button type="button" class="queue-main" :disabled="pendingAction != null" @click="selectQueueItem(item)">
            <div class="queue-title">
              <h3>{{ item.batchName }}</h3>
              <span :class="['priority', `priority-${item.priority.toLowerCase()}`]">{{ priorityLabel(item.priority) }}优先级</span>
              <span :class="['case-status', `case-status-${queueStatus(item).toLowerCase()}`]">{{ queueStatusLabel(item) }}</span>
            </div>
            <p>{{ triggerLabel(item.triggerType) }} · {{ redactSensitiveText(item.triggerSummary) }}</p>
            <div class="queue-meta">
              <span>{{ dueStateLabel(item.dueState) }}</span>
              <span>活动任务 {{ item.activeTaskCount }}</span>
              <span>有效截止 {{ formatTime(item.effectiveDueAt) }}</span>
              <span v-if="item.coordinationOwnerUid">协调负责人 {{ maskUid(item.coordinationOwnerUid) }}</span>
            </div>
          </button>
          <button
            v-if="item.caseId"
            type="button"
            class="row-action"
            :disabled="pendingAction != null"
            @click="openCase(item.caseId)"
          >
            查看处置单
          </button>
          <button
            v-else
            type="button"
            class="row-action"
            :disabled="pendingAction != null || queueErrorText !== ''"
            @click="selectCreateTarget(item)"
          >
            建立处置单
          </button>
        </article>
      </div>

      <div v-if="queueLoadMoreErrorText" class="load-more-error">
        <span>{{ queueLoadMoreErrorText }}</span>
        <button type="button" class="retry-button" :disabled="queueLoading || pendingAction != null" @click="loadMoreQueue">重试</button>
      </div>
      <button
        v-if="queue.nextCursor"
        type="button"
        class="load-more-button"
        :disabled="queueLoading || detailLoading || eventsLoading || pendingAction != null"
        @click="loadMoreQueue"
      >
        读取更多风险
      </button>
    </template>

    <section v-if="createTarget" class="create-panel" aria-labelledby="channel-quality-risk-case-create-heading">
      <div class="section-header">
        <div>
          <p>建立处置单</p>
          <h3 id="channel-quality-risk-case-create-heading">{{ createTarget.batchName }}</h3>
        </div>
        <button type="button" class="text-action" :disabled="pendingAction != null" @click="createTarget = null">取消</button>
      </div>
      <p class="create-caption">{{ triggerLabel(createTarget.triggerType) }}，将以当前服务端批次版本建立处置单。</p>
      <p v-if="actionErrorText" class="action-feedback action-feedback-error">{{ actionErrorText }}</p>
      <p v-if="actionSuccessText" class="action-feedback action-feedback-success">{{ actionSuccessText }}</p>
      <form class="action-form" @submit.prevent="createCase">
        <label>
          <span>处置说明</span>
          <textarea
            v-model="createDrafts[String(createTarget.batchId)]"
            rows="3"
            maxlength="500"
            :disabled="!queueReady || pendingAction != null"
            required
          ></textarea>
        </label>
        <button type="submit" :disabled="!queueReady || pendingAction != null">
          {{ pendingAction === 'create' ? '提交中' : '确认建立处置单' }}
        </button>
      </form>
    </section>

    <section v-if="selectedCaseId" class="case-detail" aria-labelledby="channel-quality-risk-case-detail-heading">
      <div class="section-header">
        <div>
          <p>处置单详情</p>
          <h3 id="channel-quality-risk-case-detail-heading">{{ detail?.batch.name || '风险处置单' }}</h3>
        </div>
        <div class="detail-actions">
          <button type="button" class="text-action" :disabled="detailLoading || pendingAction != null" @click="closeCaseDetail">
            关闭详情
          </button>
          <button
            v-if="detail"
            type="button"
            class="open-batch-button"
            :disabled="pendingAction != null || detailLoading"
            @click="emit('open-batch-coordination', detail.batch.batchId)"
          >
            打开批次协调
          </button>
        </div>
      </div>

      <div v-if="detailErrorText" class="workspace-state workspace-state-error">
        <span>{{ detailErrorText }}</span>
        <button type="button" class="retry-button" :disabled="detailLoading || pendingAction != null" @click="reloadSelectedCase">重试</button>
      </div>
      <div v-else-if="detailLoading" class="workspace-state">正在读取处置单快照</div>
      <template v-else-if="detail">
        <div class="detail-summary">
          <span :class="['case-status', `case-status-${detail.status.toLowerCase()}`]">{{ caseStatusLabel(detail.status) }}</span>
          <span>{{ triggerDetailLabel(detail) }}</span>
          <span>风险版本 {{ detail.caseVersion }}</span>
          <span>批次版本 {{ detail.coordinationVersion }}</span>
          <span>活动任务 {{ detail.batch.activeTaskCount }}</span>
          <span v-if="detail.ownerUid">协调负责人 {{ maskUid(detail.ownerUid) }}</span>
        </div>

        <p v-if="actionSuccessText" class="action-feedback action-feedback-success">{{ actionSuccessText }}</p>
        <p v-if="actionErrorText" class="action-feedback action-feedback-error">{{ actionErrorText }}</p>

        <div class="action-grid">
          <form v-if="detail.canAssignOwner" class="action-form" @submit.prevent="assignOwner">
            <div class="action-form-header">
              <h4>指派协调负责人</h4>
            </div>
            <label>
              <span>负责人 UID</span>
              <input
                v-model.trim="assignOwnerUidDraft"
                inputmode="numeric"
                maxlength="19"
                pattern="[1-9][0-9]*"
                :disabled="!canWriteDetail"
                required
              />
            </label>
            <label>
              <span>处置说明</span>
              <textarea v-model="assignOwnerNoteDraft" rows="3" maxlength="500" :disabled="!canWriteDetail" required></textarea>
            </label>
            <button type="submit" :disabled="!canWriteDetail">
              {{ pendingAction === 'assign-owner' ? '提交中' : '确认指派' }}
            </button>
          </form>

          <form v-if="detail.canAcknowledge" class="action-form" @submit.prevent="acknowledge">
            <div class="action-form-header">
              <h4>确认接手</h4>
            </div>
            <label>
              <span>确认说明</span>
              <textarea v-model="acknowledgeNoteDraft" rows="3" maxlength="500" :disabled="!canWriteDetail" required></textarea>
            </label>
            <button type="submit" :disabled="!canWriteDetail">
              {{ pendingAction === 'acknowledge' ? '提交中' : '确认接手' }}
            </button>
          </form>

          <form v-if="detail.canRecordPlan" class="action-form" @submit.prevent="recordPlan">
            <div class="action-form-header">
              <h4>记录恢复计划</h4>
            </div>
            <label>
              <span>计划说明</span>
              <textarea v-model="planNoteDraft" rows="3" maxlength="500" :disabled="!canWriteDetail" required></textarea>
            </label>
            <button type="submit" :disabled="!canWriteDetail">
              {{ pendingAction === 'plan' ? '提交中' : '提交计划' }}
            </button>
          </form>

          <form v-if="detail.canRecordProgress" class="action-form" @submit.prevent="recordProgress">
            <div class="action-form-header">
              <h4>追加处置进展</h4>
            </div>
            <label>
              <span>进展说明</span>
              <textarea v-model="progressNoteDraft" rows="3" maxlength="500" :disabled="!canWriteDetail" required></textarea>
            </label>
            <button type="submit" :disabled="!canWriteDetail">
              {{ pendingAction === 'progress' ? '提交中' : '记录进展' }}
            </button>
          </form>

          <form v-if="detail.canSubmitResolution" class="action-form" @submit.prevent="submitResolution">
            <div class="action-form-header">
              <h4>提交恢复说明</h4>
            </div>
            <label>
              <span>恢复说明</span>
              <textarea v-model="resolutionNoteDraft" rows="3" maxlength="500" :disabled="!canWriteDetail" required></textarea>
            </label>
            <button type="submit" :disabled="!canWriteDetail">
              {{ pendingAction === 'submit-resolution' ? '提交中' : '提交恢复' }}
            </button>
          </form>

        </div>

        <section class="governance-panel" aria-labelledby="channel-quality-risk-case-governance-heading">
          <div class="timeline-header">
            <div>
              <p>V41 治理事实</p>
              <h4 id="channel-quality-risk-case-governance-heading">证据、关闭快照与复盘</h4>
            </div>
            <button
              type="button"
              class="text-action"
              :disabled="governanceLoading || pendingAction != null"
              @click="selectedCaseId && loadGovernanceData(selectedCaseId)"
            >
              刷新治理事实
            </button>
          </div>
          <div v-if="governanceErrorText" class="timeline-state timeline-state-error">
            <span>{{ governanceErrorText }}</span>
            <button
              type="button"
              class="retry-button"
              :disabled="governanceLoading || pendingAction != null"
              @click="selectedCaseId && loadGovernanceData(selectedCaseId)"
            >
              重试
            </button>
          </div>
          <div v-else-if="governanceLoading" class="timeline-state">正在读取治理事实、证据快照与复盘。</div>
          <template v-else-if="governance">
            <div class="detail-summary governance-summary">
              <span>治理版本 {{ governance.governanceFactVersion }}</span>
              <span>行动引用 {{ governance.actionReferenceCount }}</span>
              <span>证据 {{ governance.evidenceCount }}</span>
              <span>里程碑版本 {{ governance.milestoneFactVersion }}</span>
              <span v-if="governance.closeSnapshotId">关闭快照 #{{ governance.closeSnapshotId }}</span>
              <span v-else-if="governance.legacyClosedWithoutSnapshot">历史关闭，未生成 V41 证据快照</span>
            </div>

            <div class="governance-grid">
              <form v-if="governance.canAddResolutionRevision" class="action-form" @submit.prevent="addResolutionRevision">
                <div class="action-form-header"><h4>新增治理结论</h4></div>
                <label>
                  <span>处置结果</span>
                  <select v-model="resolutionOutcomeDraft" :disabled="!canWriteGovernance">
                    <option v-for="option in resolutionOutcomeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </label>
                <label>
                  <span>内容恢复状态</span>
                  <select v-model="resolutionRecoveryStateDraft" :disabled="!canWriteGovernance">
                    <option v-for="option in recoveryStateOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </label>
                <label>
                  <span>残余风险</span>
                  <select v-model="resolutionResidualRiskDraft" :disabled="!canWriteGovernance">
                    <option v-for="option in residualRiskOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </label>
                <label>
                  <span>恢复范围</span>
                  <textarea v-model="resolutionScopeDraft" rows="2" maxlength="500" :disabled="!canWriteGovernance" required></textarea>
                </label>
                <label>
                  <span>结论摘要</span>
                  <textarea v-model="resolutionSummaryDraft" rows="3" maxlength="1000" :disabled="!canWriteGovernance" required></textarea>
                </label>
                <label>
                  <span>主要根因</span>
                  <select v-model="resolutionPrimaryRootCauseDraft" :disabled="!canWriteGovernance">
                    <option v-for="option in rootCauseOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </label>
                <label>
                  <span>根因说明</span>
                  <textarea v-model="resolutionRootCauseNoteDraft" rows="2" maxlength="500" :disabled="!canWriteGovernance" required></textarea>
                </label>
                <button type="submit" :disabled="!canWriteGovernance">
                  {{ pendingAction === 'add-resolution-revision' ? '提交中' : '追加结论' }}
                </button>
              </form>

              <form v-if="governance.canAddActionReference" class="action-form" @submit.prevent="addActionReference">
                <div class="action-form-header"><h4>新增行动引用</h4></div>
                <label>
                  <span>引用类型</span>
                  <select v-model="actionReferenceTypeDraft" :disabled="!canWriteGovernance">
                    <option v-for="option in actionReferenceTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </label>
                <label>
                  <span>受限引用键</span>
                  <input v-model.trim="actionReferenceKeyDraft" maxlength="256" :disabled="!canWriteGovernance" required />
                </label>
                <label>
                  <span>观察版本（可选）</span>
                  <input v-model.trim="actionReferenceObservedVersionDraft" inputmode="numeric" maxlength="10" :disabled="!canWriteGovernance" />
                </label>
                <label>
                  <span>发生时间</span>
                  <input v-model="actionReferenceOccurredAtDraft" type="datetime-local" step="1" :disabled="!canWriteGovernance" required />
                </label>
                <label>
                  <span>安全摘要</span>
                  <textarea v-model="actionReferenceSummaryDraft" rows="3" maxlength="500" :disabled="!canWriteGovernance" required></textarea>
                </label>
                <label>
                  <span>纠正历史引用 ID（可选）</span>
                  <input v-model.trim="actionReferenceCorrectionIdDraft" inputmode="numeric" maxlength="19" :disabled="!canWriteGovernance" />
                </label>
                <button type="submit" :disabled="!canWriteGovernance">
                  {{ pendingAction === 'add-action-reference' ? '提交中' : '追加行动引用' }}
                </button>
              </form>

              <form v-if="governance.canAddEvidence" class="action-form" @submit.prevent="addEvidence">
                <div class="action-form-header"><h4>新增证据条目</h4></div>
                <label>
                  <span>证据类型</span>
                  <select v-model="evidenceTypeDraft" :disabled="!canWriteGovernance">
                    <option v-for="option in evidenceTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </label>
                <label>
                  <span>主张方向</span>
                  <select v-model="evidenceAssertionDraft" :disabled="!canWriteGovernance">
                    <option v-for="option in evidenceAssertionOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </label>
                <label>
                  <span>观察对象类型</span>
                  <input v-model.trim="evidenceSubjectTypeDraft" maxlength="64" :disabled="!canWriteGovernance" required />
                </label>
                <label>
                  <span>受限对象键</span>
                  <input v-model.trim="evidenceSubjectRefDraft" maxlength="256" :disabled="!canWriteGovernance" required />
                </label>
                <label>
                  <span>来源类型</span>
                  <input v-model.trim="evidenceSourceTypeDraft" maxlength="64" :disabled="!canWriteGovernance" required />
                </label>
                <label>
                  <span>受限来源键</span>
                  <input v-model.trim="evidenceSourceRefDraft" maxlength="256" :disabled="!canWriteGovernance" required />
                </label>
                <label>
                  <span>来源版本（可选）</span>
                  <input v-model.trim="evidenceSourceVersionDraft" inputmode="numeric" maxlength="10" :disabled="!canWriteGovernance" />
                </label>
                <label>
                  <span>观察时间</span>
                  <input v-model="evidenceObservedAtDraft" type="datetime-local" step="1" :disabled="!canWriteGovernance" required />
                </label>
                <label>
                  <span>安全摘要</span>
                  <textarea v-model="evidenceSummaryDraft" rows="3" maxlength="1000" :disabled="!canWriteGovernance" required></textarea>
                </label>
                <label>
                  <span>纠正历史证据 ID（可选）</span>
                  <input v-model.trim="evidenceCorrectionIdDraft" inputmode="numeric" maxlength="19" :disabled="!canWriteGovernance" />
                </label>
                <p v-if="evidenceTypeDraft === 'TASK_DELIVERY_RECEIPT'" class="field-hint">过程事实，不单独证明内容恢复。</p>
                <button type="submit" :disabled="!canWriteGovernance">
                  {{ pendingAction === 'add-evidence' ? '提交中' : '追加证据' }}
                </button>
              </form>
            </div>

            <div class="governance-read-grid">
              <section class="governance-list">
                <h5>结论修订</h5>
                <p v-if="resolutionRevisions.items.length === 0" class="governance-empty">尚无结构化结论。</p>
                <ol v-else>
                  <li v-for="item in resolutionRevisions.items" :key="item.id">
                    <strong>{{ outcomeTypeLabel(item.outcomeType) }} · {{ recoveryStateLabel(item.contentRecoveryState) }}</strong>
                    <span>{{ residualRiskLabel(item.residualRiskLevel) }} · {{ formatTime(item.createTime) }}</span>
                    <p>{{ redactSensitiveText(item.summary) }}</p>
                    <p>根因：{{ item.rootCauses.map((cause) => rootCauseLabel(cause.category)).join('、') }}</p>
                  </li>
                </ol>
              </section>
              <section class="governance-list">
                <h5>行动引用</h5>
                <p v-if="actionReferences.items.length === 0" class="governance-empty">尚无行动引用。</p>
                <ol v-else>
                  <li v-for="item in actionReferences.items" :key="item.id">
                    <strong>{{ actionReferenceTypeLabel(item.referenceType) }}</strong>
                    <span>{{ formatTime(item.occurredAt) }}</span>
                    <p v-if="item.correctionOfReferenceId">纠正了历史引用 #{{ item.correctionOfReferenceId }}</p>
                    <p>{{ redactSensitiveText(item.summary) }}</p>
                  </li>
                </ol>
              </section>
              <section class="governance-list">
                <h5>证据条目</h5>
                <p v-if="evidenceEntries.items.length === 0" class="governance-empty">尚无证据条目。</p>
                <ol v-else>
                  <li v-for="item in evidenceEntries.items" :key="item.id">
                    <strong>{{ evidenceTypeLabel(item.evidenceType) }} · {{ evidenceAssertionLabel(item.assertionType) }}</strong>
                    <span>{{ formatTime(item.observedAt) }}</span>
                    <p v-if="item.correctionOfEntryId">纠正了历史证据 #{{ item.correctionOfEntryId }}</p>
                    <p>{{ redactSensitiveText(item.summary) }}</p>
                  </li>
                </ol>
              </section>
            </div>

            <section v-if="governance.canPreviewClose || governance.canClose" class="close-review">
              <div class="timeline-header">
                <div>
                  <p>证据化关闭</p>
                  <h5>关闭预检与不可变快照</h5>
                </div>
              </div>
              <form class="close-selection-form" @submit.prevent="previewClose">
                <label>
                  <span>采纳结论</span>
                  <select v-model="closeResolutionRevisionIdDraft" :disabled="!canWriteGovernance || !governance.canPreviewClose" required>
                    <option v-for="item in resolutionRevisions.items" :key="item.id" :value="String(item.id)">
                      #{{ item.revisionNo }} · {{ outcomeTypeLabel(item.outcomeType) }}
                    </option>
                  </select>
                </label>
                <fieldset>
                  <legend>行动引用</legend>
                  <label v-for="item in actionReferences.items" :key="item.id" class="check-label">
                    <input v-model="closeActionReferenceIdsDraft" type="checkbox" :value="String(item.id)" :disabled="!canWriteGovernance || !governance.canPreviewClose" />
                    <span>#{{ item.id }} · {{ actionReferenceTypeLabel(item.referenceType) }}</span>
                  </label>
                </fieldset>
                <fieldset>
                  <legend>证据条目</legend>
                  <label v-for="item in evidenceEntries.items" :key="item.id" class="check-label">
                    <input v-model="closeEvidenceEntryIdsDraft" type="checkbox" :value="String(item.id)" :disabled="!canWriteGovernance || !governance.canPreviewClose" />
                    <span>#{{ item.id }} · {{ evidenceTypeLabel(item.evidenceType) }}</span>
                  </label>
                </fieldset>
                <label>
                  <span>复盘负责人 UID</span>
                  <input v-model.trim="closeRetrospectiveOwnerUidDraft" inputmode="numeric" maxlength="19" :disabled="!canWriteGovernance || !governance.canPreviewClose" required />
                </label>
                <button type="submit" :disabled="!canWriteGovernance || !governance.canPreviewClose">
                  {{ pendingAction === 'preview-close' ? '预检中' : '运行关闭预检' }}
                </button>
              </form>
              <div v-if="closePreview" class="close-preview-result">
                <strong>{{ closePreview.readyToClose ? '预检通过' : '预检未通过' }}</strong>
                <span>风险版本 {{ closePreview.caseVersion }} · 批次版本 {{ closePreview.coordinationVersion }} · 治理版本 {{ closePreview.governanceFactVersion }}</span>
                <ol>
                  <li v-for="check in closePreview.checks" :key="`${check.providerCode}-${check.providerVersion}`">
                    <strong>{{ closeCheckResultLabel(check.result) }} · {{ check.reasonCode }}</strong>
                    <span>{{ redactSensitiveText(check.summary) }}</span>
                  </li>
                </ol>
              </div>
              <form class="action-form action-form-close" @submit.prevent="closeRiskCase">
                <label>
                  <span>关闭说明</span>
                  <textarea v-model="closeNoteDraft" rows="3" maxlength="500" :disabled="!canWriteGovernance || !closePreviewIsCurrent || !governance.canClose" required></textarea>
                </label>
                <button type="submit" :disabled="!canWriteGovernance || !governance.canClose || !closePreviewIsCurrent">
                  {{ pendingAction === 'close' ? '提交中' : '确认生成快照并关闭' }}
                </button>
              </form>
            </section>

            <section class="governance-snapshot">
              <div class="timeline-header">
                <div>
                  <p>关闭事实</p>
                  <h5>关闭快照</h5>
                </div>
              </div>
              <p v-if="closeSnapshot?.legacyClosedWithoutSnapshot" class="governance-empty">历史关闭，未生成 V41 证据快照。</p>
              <p v-else-if="!closeSnapshot?.snapshot" class="governance-empty">尚未生成关闭快照。</p>
              <template v-else>
                <div class="detail-summary">
                  <span>{{ outcomeTypeLabel(closeSnapshot.snapshot.outcomeType) }}</span>
                  <span>{{ recoveryStateLabel(closeSnapshot.snapshot.contentRecoveryState) }}</span>
                  <span>{{ residualRiskLabel(closeSnapshot.snapshot.residualRiskLevel) }}</span>
                  <span>摘要哈希 {{ closeSnapshot.snapshot.snapshotDigest.slice(0, 12) }}</span>
                </div>
                <p class="snapshot-caption">快照一经生成不可编辑，后续复盘不会覆盖已关闭事实。</p>
              </template>
            </section>

            <section class="retrospective-panel">
              <div class="timeline-header">
                <div>
                  <p>治理复盘</p>
                  <h5>复盘与学习事实</h5>
                </div>
              </div>
              <p v-if="retrospective?.retrospective" class="governance-empty">
                状态：{{ retrospective.retrospective.status }} · 版本 {{ retrospective.retrospective.retrospectiveVersion }}
                <template v-if="retrospective.retrospective.ownerUid"> · 负责人 {{ maskUid(retrospective.retrospective.ownerUid) }}</template>
              </p>
              <form
                v-if="governance.canInitializeRetrospective && retrospective?.legacyClosedWithoutSnapshot && !retrospective.retrospective"
                class="action-form"
                @submit.prevent="initializeRetrospective"
              >
                <div class="action-form-header"><h4>初始化历史复盘</h4></div>
                <label>
                  <span>复盘负责人 UID</span>
                  <input v-model.trim="retrospectiveInitializeOwnerUidDraft" inputmode="numeric" maxlength="19" :disabled="!canWriteGovernance" required />
                </label>
                <label>
                  <span>历史基线说明</span>
                  <textarea v-model="retrospectiveInitializeNoteDraft" rows="3" maxlength="1000" :disabled="!canWriteGovernance" required></textarea>
                </label>
                <button type="submit" :disabled="!canWriteGovernance">
                  {{ pendingAction === 'initialize-retrospective' ? '提交中' : '初始化复盘' }}
                </button>
              </form>
              <div v-else-if="governance.canManageRetrospective && retrospective?.retrospective" class="governance-grid">
                <form v-if="retrospective.retrospective.canAssignOwner" class="action-form" @submit.prevent="assignRetrospectiveOwner">
                  <div class="action-form-header"><h4>改派复盘负责人</h4></div>
                  <label><span>负责人 UID</span><input v-model.trim="retrospectiveOwnerUidDraft" inputmode="numeric" maxlength="19" :disabled="!canWriteGovernance" required /></label>
                  <label><span>说明</span><textarea v-model="retrospectiveOwnerNoteDraft" rows="2" maxlength="1000" :disabled="!canWriteGovernance" required></textarea></label>
                  <button type="submit" :disabled="!canWriteGovernance">{{ pendingAction === 'assign-retrospective-owner' ? '提交中' : '确认改派' }}</button>
                </form>
                <form v-if="retrospective.retrospective.canStart" class="action-form" @submit.prevent="startRetrospective">
                  <div class="action-form-header"><h4>开始复盘</h4></div>
                  <label><span>开始说明</span><textarea v-model="retrospectiveStartNoteDraft" rows="3" maxlength="1000" :disabled="!canWriteGovernance" required></textarea></label>
                  <button type="submit" :disabled="!canWriteGovernance">{{ pendingAction === 'start-retrospective' ? '提交中' : '确认开始' }}</button>
                </form>
                <form v-if="retrospective.retrospective.canRecordFinding" class="action-form" @submit.prevent="recordRetrospectiveFinding">
                  <div class="action-form-header"><h4>记录复盘发现</h4></div>
                  <label>
                    <span>学习分类</span>
                    <select v-model="retrospectiveLearningCategoryDraft" :disabled="!canWriteGovernance">
                      <option v-for="option in learningCategoryOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                    </select>
                  </label>
                  <label><span>发现摘要</span><textarea v-model="retrospectiveFindingSummaryDraft" rows="2" maxlength="1000" :disabled="!canWriteGovernance" required></textarea></label>
                  <label><span>预防行动摘要</span><textarea v-model="retrospectivePreventionActionDraft" rows="2" maxlength="1000" :disabled="!canWriteGovernance" required></textarea></label>
                  <label><span>记录说明</span><textarea v-model="retrospectiveFindingNoteDraft" rows="2" maxlength="1000" :disabled="!canWriteGovernance" required></textarea></label>
                  <button type="submit" :disabled="!canWriteGovernance">{{ pendingAction === 'record-retrospective-finding' ? '提交中' : '追加发现' }}</button>
                </form>
                <form v-if="retrospective.retrospective.canComplete" class="action-form" @submit.prevent="completeRetrospective">
                  <div class="action-form-header"><h4>完成复盘</h4></div>
                  <label><span>完成说明</span><textarea v-model="retrospectiveCompleteNoteDraft" rows="3" maxlength="1000" :disabled="!canWriteGovernance" required></textarea></label>
                  <button type="submit" :disabled="!canWriteGovernance">{{ pendingAction === 'complete-retrospective' ? '提交中' : '确认完成' }}</button>
                </form>
              </div>
              <ol v-if="retrospectiveEvents.items.length" class="event-list">
                <li v-for="event in retrospectiveEvents.items" :key="event.id">
                  <div>
                    <strong>{{ event.eventType }}</strong>
                    <span>{{ formatTime(event.createTime) }} · 版本 {{ event.retrospectiveVersion }}</span>
                  </div>
                  <p v-if="event.learningCategory">{{ learningCategoryLabel(event.learningCategory) }}</p>
                  <p>{{ redactSensitiveText(event.note) }}</p>
                </li>
              </ol>
            </section>

            <section class="recurrence-panel">
              <div class="timeline-header">
                <div>
                  <p>复发关联</p>
                  <h5>仅追加关联，不重开历史处置单</h5>
                </div>
              </div>
              <form v-if="governance.canLinkRecurrence" class="action-form" @submit.prevent="addRecurrenceLink">
                <label><span>历史关闭处置单 ID</span><input v-model.trim="recurrencePreviousCaseIdDraft" inputmode="numeric" maxlength="19" :disabled="!canWriteGovernance" required /></label>
                <label>
                  <span>关联类型</span>
                  <select v-model="recurrenceRelationTypeDraft" :disabled="!canWriteGovernance">
                    <option v-for="option in recurrenceRelationOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </label>
                <label>
                  <span>观察根因</span>
                  <select v-model="recurrenceRootCauseCategoryDraft" :disabled="!canWriteGovernance">
                    <option v-for="option in rootCauseOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </label>
                <label><span>关联说明</span><textarea v-model="recurrenceNoteDraft" rows="3" maxlength="500" :disabled="!canWriteGovernance" required></textarea></label>
                <button type="submit" :disabled="!canWriteGovernance">{{ pendingAction === 'add-recurrence-link' ? '提交中' : '追加复发关联' }}</button>
              </form>
              <ol v-if="recurrenceLinks.items.length" class="event-list">
                <li v-for="item in recurrenceLinks.items" :key="item.id">
                  <div><strong>{{ recurrenceRelationLabel(item.relationType) }}</strong><span>历史处置单 #{{ item.previousCaseId }} · {{ formatTime(item.createTime) }}</span></div>
                  <p>根因：{{ rootCauseLabel(item.rootCauseCategory) }}</p>
                  <p>{{ redactSensitiveText(item.note) }}</p>
                </li>
              </ol>
            </section>

            <section class="milestone-panel">
              <div class="timeline-header">
                <div>
                  <p>稳定治理事实</p>
                  <h5>里程碑时间线</h5>
                </div>
              </div>
              <ol v-if="governanceMilestones.items.length" class="event-list">
                <li v-for="item in governanceMilestones.items" :key="item.sourceFactId">
                  <div>
                    <strong>{{ governanceMilestoneLabel(item.milestoneCode) }}</strong>
                    <span>{{ formatTime(item.occurredAt) }}<template v-if="item.ownerUid"> · 负责人 {{ maskUid(item.ownerUid) }}</template></span>
                  </div>
                  <p v-if="item.requiredAction !== 'NONE'">待执行：{{ item.requiredAction }}</p>
                </li>
              </ol>
              <p v-else class="governance-empty">尚无可展示的稳定治理事实。</p>
            </section>
          </template>
        </section>

        <section class="event-timeline" aria-labelledby="channel-quality-risk-case-events-heading">
          <div class="timeline-header">
            <div>
              <p>处置留痕</p>
              <h4 id="channel-quality-risk-case-events-heading">事件时间线</h4>
            </div>
            <button type="button" class="text-action" :disabled="eventsLoading || pendingAction != null" @click="loadEvents">刷新事件</button>
          </div>
          <div v-if="eventsErrorText" class="timeline-state timeline-state-error">
            <span>{{ eventsErrorText }}</span>
            <button type="button" class="retry-button" :disabled="eventsLoading || pendingAction != null" @click="loadEvents">重试</button>
          </div>
          <div v-else-if="eventsLoading" class="timeline-state">正在读取处置事件</div>
          <div v-else-if="events.items.length === 0" class="timeline-state">当前处置单还没有可展示的留痕。</div>
          <template v-else>
            <ol class="event-list">
              <li v-for="event in events.items" :key="event.id">
                <div>
                  <strong>{{ eventTypeLabel(event.eventType) }}</strong>
                  <span>{{ formatTime(event.createTime) }} · 版本 {{ event.caseVersion }}</span>
                </div>
                <p>{{ redactSensitiveText(event.note) }}</p>
              </li>
            </ol>
            <div v-if="eventsLoadMoreErrorText" class="load-more-error">
              <span>{{ eventsLoadMoreErrorText }}</span>
              <button type="button" class="retry-button" :disabled="eventsLoading || pendingAction != null" @click="loadMoreEvents">重试</button>
            </div>
            <button
              v-if="events.nextCursor"
              type="button"
              class="load-more-button"
              :disabled="eventsLoading || pendingAction != null"
              @click="loadMoreEvents"
            >
              读取更多事件
            </button>
          </template>
        </section>
      </template>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { getErrorMessage } from '@/api/client'
import {
  channelHealthRiskCasesApi,
  type ChannelHealthRiskCaseActionReferencePage,
  type ChannelHealthRiskCaseActionReferenceType,
  type ChannelHealthRiskCaseClosePreview,
  type ChannelHealthRiskCaseCloseSnapshotResponse,
  type ChannelHealthRiskCaseDetail,
  type ChannelHealthRiskCaseEvidenceAssertionType,
  type ChannelHealthRiskCaseEvidenceEntryPage,
  type ChannelHealthRiskCaseEvidenceType,
  type ChannelHealthRiskCaseEventPage,
  type ChannelHealthRiskCaseEventType,
  type ChannelHealthRiskCaseGovernance,
  type ChannelHealthRiskCaseGovernanceMilestoneCode,
  type ChannelHealthRiskCaseGovernanceMilestonePage,
  type ChannelHealthRiskCaseLearningCategory,
  type ChannelHealthRiskCaseOutcomeType,
  type ChannelHealthRiskCasePriority,
  type ChannelHealthRiskCaseQueueItem,
  type ChannelHealthRiskCaseQueueMode,
  type ChannelHealthRiskCaseQueuePage,
  type ChannelHealthRiskCaseQueueTriggerType,
  type ChannelHealthRiskCaseRecurrenceLinkPage,
  type ChannelHealthRiskCaseRecurrenceRelationType,
  type ChannelHealthRiskCaseResidualRiskLevel,
  type ChannelHealthRiskCaseResolutionRevisionPage,
  type ChannelHealthRiskCaseRetrospectiveEventPage,
  type ChannelHealthRiskCaseRetrospectiveResponse,
  type ChannelHealthRiskCaseStatus,
  type ChannelHealthRiskCaseContentRecoveryState,
  type ChannelHealthRiskCaseRootCauseCategory,
} from '@/api/channelHealthRiskCases'
import type { ChannelHealth } from '@/api/channelHealth'
import type { ApiId } from '@/api/types'

type PendingAction =
  | 'create'
  | 'assign-owner'
  | 'acknowledge'
  | 'plan'
  | 'progress'
  | 'submit-resolution'
  | 'close'
  | 'add-resolution-revision'
  | 'add-action-reference'
  | 'add-evidence'
  | 'preview-close'
  | 'initialize-retrospective'
  | 'assign-retrospective-owner'
  | 'start-retrospective'
  | 'record-retrospective-finding'
  | 'complete-retrospective'
  | 'add-recurrence-link'

const props = defineProps<{
  refreshKey?: number
  channels: ChannelHealth[]
  canCreateGlobally: boolean
  moderatedDomains: number[]
}>()

const emit = defineEmits<{
  'open-batch-coordination': [batchId: ApiId]
}>()

const modeOptions: Array<{ value: ChannelHealthRiskCaseQueueMode; label: string }> = [
  { value: 'ALL', label: '全部风险' },
  { value: 'UNHANDLED', label: '待建立处置单' },
  { value: 'ACTIVE', label: '处置中' },
  { value: 'RESOLVED', label: '待关闭' },
]

const emptyQueue = (): ChannelHealthRiskCaseQueuePage => ({
  nextCursor: null,
  items: [],
})

const emptyEvents = (): ChannelHealthRiskCaseEventPage => ({
  nextCursor: null,
  items: [],
})

const selectedDomain = ref<number | null>(null)
const selectedMode = ref<ChannelHealthRiskCaseQueueMode>('ALL')
const queue = ref<ChannelHealthRiskCaseQueuePage>(emptyQueue())
const queueLoading = ref(false)
const queueErrorText = ref('')
const queueLoadMoreErrorText = ref('')
const selectedQueueBatchId = ref<string | null>(null)
const createTarget = ref<ChannelHealthRiskCaseQueueItem | null>(null)
const createDrafts = ref<Record<string, string>>({})
const selectedCaseId = ref<ApiId | null>(null)
const detail = ref<ChannelHealthRiskCaseDetail | null>(null)
const detailLoading = ref(false)
const detailErrorText = ref('')
const events = ref<ChannelHealthRiskCaseEventPage>(emptyEvents())
const eventsLoading = ref(false)
const eventsErrorText = ref('')
const eventsLoadMoreErrorText = ref('')
const governance = ref<ChannelHealthRiskCaseGovernance | null>(null)
const governanceMilestones = ref<ChannelHealthRiskCaseGovernanceMilestonePage>({ nextCursor: null, items: [] })
const resolutionRevisions = ref<ChannelHealthRiskCaseResolutionRevisionPage>({ nextCursor: null, items: [] })
const actionReferences = ref<ChannelHealthRiskCaseActionReferencePage>({ nextCursor: null, items: [] })
const evidenceEntries = ref<ChannelHealthRiskCaseEvidenceEntryPage>({ nextCursor: null, items: [] })
const closeSnapshot = ref<ChannelHealthRiskCaseCloseSnapshotResponse | null>(null)
const retrospective = ref<ChannelHealthRiskCaseRetrospectiveResponse | null>(null)
const retrospectiveEvents = ref<ChannelHealthRiskCaseRetrospectiveEventPage>({ nextCursor: null, items: [] })
const recurrenceLinks = ref<ChannelHealthRiskCaseRecurrenceLinkPage>({ nextCursor: null, items: [] })
const governanceLoading = ref(false)
const governanceErrorText = ref('')
const pendingAction = ref<PendingAction | null>(null)
const actionErrorText = ref('')
const actionSuccessText = ref('')
const assignOwnerUidDraft = ref('')
const assignOwnerNoteDraft = ref('')
const acknowledgeNoteDraft = ref('')
const planNoteDraft = ref('')
const progressNoteDraft = ref('')
const resolutionNoteDraft = ref('')
const closeNoteDraft = ref('')
const resolutionOutcomeDraft = ref<ChannelHealthRiskCaseOutcomeType>('PARTIAL_RECOVERY')
const resolutionRecoveryStateDraft = ref<ChannelHealthRiskCaseContentRecoveryState>('PARTIAL')
const resolutionResidualRiskDraft = ref<ChannelHealthRiskCaseResidualRiskLevel>('LOW')
const resolutionScopeDraft = ref('')
const resolutionSummaryDraft = ref('')
const resolutionPrimaryRootCauseDraft = ref<ChannelHealthRiskCaseRootCauseCategory>('PROCESS_GAP')
const resolutionRootCauseNoteDraft = ref('')
const actionReferenceTypeDraft = ref<ChannelHealthRiskCaseActionReferenceType>('V40_CASE_EVENT')
const actionReferenceKeyDraft = ref('')
const actionReferenceObservedVersionDraft = ref('')
const actionReferenceOccurredAtDraft = ref('')
const actionReferenceSummaryDraft = ref('')
const actionReferenceCorrectionIdDraft = ref('')
const evidenceTypeDraft = ref<ChannelHealthRiskCaseEvidenceType>('QUALITY_RECHECK')
const evidenceAssertionDraft = ref<ChannelHealthRiskCaseEvidenceAssertionType>('SUPPORTS_PARTIAL_RECOVERY')
const evidenceSubjectTypeDraft = ref('CONTENT_ITEM')
const evidenceSubjectRefDraft = ref('')
const evidenceSourceTypeDraft = ref('QUALITY_RECHECK')
const evidenceSourceRefDraft = ref('')
const evidenceSourceVersionDraft = ref('')
const evidenceObservedAtDraft = ref('')
const evidenceSummaryDraft = ref('')
const evidenceCorrectionIdDraft = ref('')
const closeResolutionRevisionIdDraft = ref('')
const closeActionReferenceIdsDraft = ref<string[]>([])
const closeEvidenceEntryIdsDraft = ref<string[]>([])
const closeRetrospectiveOwnerUidDraft = ref('')
const closePreview = ref<ChannelHealthRiskCaseClosePreview | null>(null)
const closePreviewSelectionKey = ref('')
const retrospectiveInitializeOwnerUidDraft = ref('')
const retrospectiveInitializeNoteDraft = ref('')
const retrospectiveOwnerUidDraft = ref('')
const retrospectiveOwnerNoteDraft = ref('')
const retrospectiveStartNoteDraft = ref('')
const retrospectiveLearningCategoryDraft = ref<ChannelHealthRiskCaseLearningCategory>('PROCESS_AND_HANDOFF')
const retrospectiveFindingSummaryDraft = ref('')
const retrospectivePreventionActionDraft = ref('')
const retrospectiveFindingNoteDraft = ref('')
const retrospectiveCompleteNoteDraft = ref('')
const recurrencePreviousCaseIdDraft = ref('')
const recurrenceRelationTypeDraft = ref<ChannelHealthRiskCaseRecurrenceRelationType>('SAME_ROOT_CAUSE')
const recurrenceRootCauseCategoryDraft = ref<ChannelHealthRiskCaseRootCauseCategory>('PROCESS_GAP')
const recurrenceNoteDraft = ref('')
const commandIds = ref<Record<string, string>>({})
let queueRequestVersion = 0
let detailRequestVersion = 0
let eventsRequestVersion = 0
let governanceRequestVersion = 0

const domains = computed(() => props.channels
  .filter((channel) => (
    Number.isInteger(channel.domain)
    && channel.domain >= 1
    && channel.domain <= 5
    && (props.canCreateGlobally || props.moderatedDomains.includes(channel.domain))
  ))
  .map((channel) => ({
    domain: channel.domain,
    domainName: channel.domainName,
  })))

const queueReady = computed(() => (
  selectedDomain.value != null
  && !queueLoading.value
  && !queueErrorText.value
  && !queueLoadMoreErrorText.value
))

const canWriteDetail = computed(() => (
  detail.value != null
  && !queueLoading.value
  && !queueErrorText.value
  && !queueLoadMoreErrorText.value
  && !detailLoading.value
  && !detailErrorText.value
  && !eventsLoading.value
  && !eventsErrorText.value
  && !eventsLoadMoreErrorText.value
  && pendingAction.value == null
))

const canWriteGovernance = computed(() => (
  governance.value != null
  && canWriteDetail.value
  && !governanceLoading.value
  && !governanceErrorText.value
))

const resolutionOutcomeOptions: Array<{ value: ChannelHealthRiskCaseOutcomeType; label: string }> = [
  { value: 'RECOVERY_CONFIRMED', label: '确认恢复' },
  { value: 'PARTIAL_RECOVERY', label: '部分恢复' },
  { value: 'RISK_CONTAINED', label: '风险已控制' },
  { value: 'FALSE_POSITIVE_CONFIRMED', label: '确认误报' },
  { value: 'RISK_ACCEPTED', label: '接受残余风险' },
]

const recoveryStateOptions: Array<{ value: ChannelHealthRiskCaseContentRecoveryState; label: string }> = [
  { value: 'VERIFIED', label: '已验证恢复' },
  { value: 'PARTIAL', label: '部分恢复' },
  { value: 'NOT_VERIFIED', label: '未验证恢复' },
  { value: 'NOT_APPLICABLE', label: '不适用' },
]

const residualRiskOptions: Array<{ value: ChannelHealthRiskCaseResidualRiskLevel; label: string }> = [
  { value: 'NONE', label: '无残余风险' },
  { value: 'LOW', label: '低残余风险' },
  { value: 'MEDIUM', label: '中残余风险' },
  { value: 'HIGH', label: '高残余风险' },
]

const rootCauseOptions: Array<{ value: ChannelHealthRiskCaseRootCauseCategory; label: string }> = [
  { value: 'CONTENT_QUALITY', label: '内容质量' },
  { value: 'OWNER_CAPACITY', label: '负责人能力' },
  { value: 'PROCESS_GAP', label: '流程缺口' },
  { value: 'DEPENDENCY_BLOCKED', label: '依赖受阻' },
  { value: 'DATA_SIGNAL_ERROR', label: '数据信号错误' },
  { value: 'POLICY_AMBIGUITY', label: '策略歧义' },
  { value: 'SYSTEM_DEFECT', label: '系统缺陷' },
  { value: 'EXTERNAL_CONSTRAINT', label: '外部约束' },
  { value: 'UNKNOWN', label: '尚未确认' },
]

const actionReferenceTypeOptions: Array<{ value: ChannelHealthRiskCaseActionReferenceType; label: string }> = [
  { value: 'V39_COORDINATION_EVENT', label: '批次协调事实' },
  { value: 'V40_CASE_EVENT', label: '处置单事件' },
  { value: 'MAINTENANCE_TASK', label: '维护任务' },
  { value: 'CONTENT_REVISION', label: '内容修订' },
  { value: 'GOVERNANCE_DECISION', label: '治理决定' },
  { value: 'EXTERNAL_TICKET', label: '外部工单' },
]

const evidenceTypeOptions: Array<{ value: ChannelHealthRiskCaseEvidenceType; label: string }> = [
  { value: 'CONTENT_STATE_OBSERVATION', label: '内容状态观察' },
  { value: 'QUALITY_RECHECK', label: '质量复检' },
  { value: 'TASK_DELIVERY_RECEIPT', label: '任务交付回执' },
  { value: 'COORDINATION_CONFIRMATION', label: '协调确认' },
  { value: 'POLICY_DECISION', label: '策略决定' },
  { value: 'EXTERNAL_CONFIRMATION', label: '外部确认' },
]

const evidenceAssertionOptions: Array<{ value: ChannelHealthRiskCaseEvidenceAssertionType; label: string }> = [
  { value: 'SUPPORTS_RECOVERY', label: '支持已恢复' },
  { value: 'SUPPORTS_PARTIAL_RECOVERY', label: '支持部分恢复' },
  { value: 'SUPPORTS_CONTAINMENT', label: '支持风险控制' },
  { value: 'SUPPORTS_FALSE_POSITIVE', label: '支持误报结论' },
  { value: 'SUPPORTS_RISK_ACCEPTANCE', label: '支持风险接受' },
  { value: 'REFUTES_RECOVERY', label: '反证恢复' },
  { value: 'INCONCLUSIVE', label: '结论不充分' },
]

const learningCategoryOptions: Array<{ value: ChannelHealthRiskCaseLearningCategory; label: string }> = [
  { value: 'CONTENT_AND_REVIEW', label: '内容与审核' },
  { value: 'PROCESS_AND_HANDOFF', label: '流程与交接' },
  { value: 'CAPACITY_AND_SLA', label: '能力与时限' },
  { value: 'SIGNAL_AND_DATA', label: '信号与数据' },
  { value: 'POLICY_AND_GOVERNANCE', label: '策略与治理' },
  { value: 'SYSTEM_AND_TOOLING', label: '系统与工具' },
  { value: 'EXTERNAL_DEPENDENCY', label: '外部依赖' },
  { value: 'OTHER', label: '其他' },
]

const recurrenceRelationOptions: Array<{ value: ChannelHealthRiskCaseRecurrenceRelationType; label: string }> = [
  { value: 'SAME_ROOT_CAUSE', label: '相同根因' },
  { value: 'SAME_CHANNEL_PATTERN', label: '相同频道模式' },
  { value: 'SAME_BATCH_PATTERN', label: '相同批次模式' },
  { value: 'MANUAL_RELATED', label: '人工关联' },
]

const ensureSelectedDomain = () => {
  if (selectedDomain.value != null && domains.value.some((item) => item.domain === selectedDomain.value)) return
  selectedDomain.value = domains.value[0]?.domain ?? null
}

const resetQueue = () => {
  queue.value = emptyQueue()
  queueErrorText.value = ''
  queueLoadMoreErrorText.value = ''
}

const resetGovernanceData = () => {
  governanceRequestVersion += 1
  governance.value = null
  governanceMilestones.value = { nextCursor: null, items: [] }
  resolutionRevisions.value = { nextCursor: null, items: [] }
  actionReferences.value = { nextCursor: null, items: [] }
  evidenceEntries.value = { nextCursor: null, items: [] }
  closeSnapshot.value = null
  retrospective.value = null
  retrospectiveEvents.value = { nextCursor: null, items: [] }
  recurrenceLinks.value = { nextCursor: null, items: [] }
  closePreview.value = null
  closePreviewSelectionKey.value = ''
  governanceLoading.value = false
  governanceErrorText.value = ''
}

const resetDetail = () => {
  detailRequestVersion += 1
  eventsRequestVersion += 1
  selectedCaseId.value = null
  detail.value = null
  detailLoading.value = false
  detailErrorText.value = ''
  events.value = emptyEvents()
  eventsLoading.value = false
  eventsErrorText.value = ''
  eventsLoadMoreErrorText.value = ''
  actionErrorText.value = ''
  actionSuccessText.value = ''
  resetGovernanceData()
}

const priorityLabel = (priority: ChannelHealthRiskCasePriority) => ({
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
})[priority]

const dueStateLabel = (state: ChannelHealthRiskCaseQueueItem['dueState']) => ({
  NOT_APPLICABLE: '无需时限跟踪',
  ON_TRACK: '进度正常',
  DUE_SOON: '临近截止',
  OVERDUE: '已逾期',
})[state]

const triggerLabel = (triggerType: ChannelHealthRiskCaseQueueTriggerType) => ({
  UNHANDLED_RISK_EVENT: '新增风险事件',
  DUE_SOON: '临近截止风险',
  OVERDUE: '逾期风险',
  ACTIVE_CASE: '已有活动处置单',
})[triggerType]

const caseStatusLabel = (status: ChannelHealthRiskCaseStatus) => ({
  OPEN: '待确认',
  ACKNOWLEDGED: '已确认',
  IN_PROGRESS: '处置中',
  RESOLVED: '待治理关闭',
  CLOSED: '已关闭',
})[status]

const queueStatus = (item: ChannelHealthRiskCaseQueueItem): ChannelHealthRiskCaseStatus | 'UNHANDLED' => (
  item.caseStatus || 'UNHANDLED'
)

const queueStatusLabel = (item: ChannelHealthRiskCaseQueueItem) => (
  item.caseStatus ? caseStatusLabel(item.caseStatus) : '待建立'
)

const eventTypeLabel = (eventType: ChannelHealthRiskCaseEventType) => ({
  CASE_OPENED: '处置单已建立',
  OWNER_ASSIGNED: '负责人已指派',
  OWNER_ACKNOWLEDGED: '负责人已确认',
  PLAN_RECORDED: '恢复计划已记录',
  PROGRESS_RECORDED: '处置进展已记录',
  RESOLUTION_SUBMITTED: '恢复说明已提交',
  CASE_CLOSED: '处置单已关闭',
})[eventType]

const outcomeTypeLabel = (value: ChannelHealthRiskCaseOutcomeType) => (
  resolutionOutcomeOptions.find((item) => item.value === value)?.label || value
)

const recoveryStateLabel = (value: ChannelHealthRiskCaseContentRecoveryState) => (
  recoveryStateOptions.find((item) => item.value === value)?.label || value
)

const residualRiskLabel = (value: ChannelHealthRiskCaseResidualRiskLevel) => (
  residualRiskOptions.find((item) => item.value === value)?.label || value
)

const rootCauseLabel = (value: ChannelHealthRiskCaseRootCauseCategory) => (
  rootCauseOptions.find((item) => item.value === value)?.label || value
)

const actionReferenceTypeLabel = (value: ChannelHealthRiskCaseActionReferenceType) => (
  actionReferenceTypeOptions.find((item) => item.value === value)?.label || value
)

const evidenceTypeLabel = (value: ChannelHealthRiskCaseEvidenceType) => (
  evidenceTypeOptions.find((item) => item.value === value)?.label || value
)

const evidenceAssertionLabel = (value: ChannelHealthRiskCaseEvidenceAssertionType) => (
  evidenceAssertionOptions.find((item) => item.value === value)?.label || value
)

const learningCategoryLabel = (value: ChannelHealthRiskCaseLearningCategory) => (
  learningCategoryOptions.find((item) => item.value === value)?.label || value
)

const recurrenceRelationLabel = (value: ChannelHealthRiskCaseRecurrenceRelationType) => (
  recurrenceRelationOptions.find((item) => item.value === value)?.label || value
)

const governanceMilestoneLabel = (value: ChannelHealthRiskCaseGovernanceMilestoneCode) => ({
  OWNER_ASSIGNED: '负责人责任已建立',
  OWNER_ACKNOWLEDGED: '负责人已确认',
  PLAN_RECORDED: '恢复计划已记录',
  CLOSE_SNAPSHOT_GENERATED: '关闭快照已生成',
  RETROSPECTIVE_PENDING: '复盘待完成',
  RETROSPECTIVE_OWNER_ASSIGNED: '复盘负责人已指派',
  RETROSPECTIVE_COMPLETED: '复盘已完成',
})[value]

const closeCheckResultLabel = (value: ChannelHealthRiskCaseClosePreview['checks'][number]['result']) => ({
  PASS: '通过',
  FAIL: '未通过',
  NOT_APPLICABLE: '不适用',
})[value]

const triggerDetailLabel = (current: ChannelHealthRiskCaseDetail) => {
  if (current.triggerType === 'RISK_EVENT') return `风险事件触发：${current.riskCode || '风险说明'}`
  return `到期状态触发：${dueStateLabel(current.dueState || 'ON_TRACK')}`
}

const formatTime = (value: string | null) => {
  if (value == null) return '未设置'
  if (value.endsWith('Z')) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toLocaleString('zh-CN', { hour12: false })
  }
  return value.replace('T', ' ').replace(/(\.\d{1,9})?Z?$/, '')
}

const maskUid = (value: ApiId) => {
  const text = String(value)
  return text.length <= 4 ? '***' : `${text.slice(0, 2)}***${text.slice(-2)}`
}

const redactSensitiveText = (value: string) => value
  .replace(/(?:用户|负责人|操作人|维护者)?\s*(?:UID|uid|用户ID|userId)\s*[:：#]?\s*\d{1,19}/g, '[受限标识]')
  .replace(/(?:任务|task)\s*[#：:]?\s*\d{1,19}/gi, '[受限任务]')
  .replace(/\b\d{17,19}\b/g, '[受限标识]')

const loadQueue = async () => {
  ensureSelectedDomain()
  const domain = selectedDomain.value
  const version = ++queueRequestVersion
  resetQueue()
  createTarget.value = null
  if (domain == null) {
    queueLoading.value = false
    return
  }
  queueLoading.value = true
  try {
    const response = await channelHealthRiskCasesApi.queue({
      domain,
      mode: selectedMode.value,
      size: 10,
    })
    if (version !== queueRequestVersion) return
    if (response.data == null) throw new Error('风险处置队列返回为空')
    queue.value = response.data
    if (
      selectedQueueBatchId.value != null
      && !queue.value.items.some((item) => String(item.batchId) === selectedQueueBatchId.value)
    ) selectedQueueBatchId.value = null
  } catch (error) {
    if (version !== queueRequestVersion) return
    queue.value = emptyQueue()
    queueErrorText.value = getErrorMessage(error, '风险处置队列暂时无法读取')
  } finally {
    if (version === queueRequestVersion) queueLoading.value = false
  }
}

const loadMoreQueue = async () => {
  const domain = selectedDomain.value
  const cursor = queue.value.nextCursor
  if (domain == null || !cursor || queueLoading.value || pendingAction.value != null) return
  const version = ++queueRequestVersion
  queueLoading.value = true
  queueLoadMoreErrorText.value = ''
  try {
    const response = await channelHealthRiskCasesApi.queue({
      domain,
      mode: selectedMode.value,
      cursor,
      size: 10,
    })
    if (version !== queueRequestVersion) return
    if (response.data == null) throw new Error('风险处置队列分页返回为空')
    const seenBatchIds = new Set(queue.value.items.map((item) => String(item.batchId)))
    const nextItems = response.data.items.filter((item) => !seenBatchIds.has(String(item.batchId)))
    if (nextItems.length !== response.data.items.length) throw new Error('风险队列分页结果不可信')
    queue.value = {
      items: [...queue.value.items, ...nextItems],
      nextCursor: response.data.nextCursor,
    }
  } catch (error) {
    if (version !== queueRequestVersion) return
    queueLoadMoreErrorText.value = getErrorMessage(error, '更多风险暂时无法读取')
  } finally {
    if (version === queueRequestVersion) queueLoading.value = false
  }
}

const selectQueueItem = (item: ChannelHealthRiskCaseQueueItem) => {
  if (pendingAction.value != null) return
  selectedQueueBatchId.value = String(item.batchId)
  if (item.caseId) {
    void openCase(item.caseId)
    return
  }
  createTarget.value = item
  if (createDrafts.value[String(item.batchId)] == null) createDrafts.value[String(item.batchId)] = ''
}

const selectCreateTarget = (item: ChannelHealthRiskCaseQueueItem) => {
  selectedQueueBatchId.value = String(item.batchId)
  createTarget.value = item
  if (createDrafts.value[String(item.batchId)] == null) createDrafts.value[String(item.batchId)] = ''
}

const loadDetail = async (caseId: ApiId) => {
  const normalizedId = String(caseId)
  const version = ++detailRequestVersion
  selectedCaseId.value = normalizedId
  detail.value = null
  detailErrorText.value = ''
  detailLoading.value = true
  try {
    const response = await channelHealthRiskCasesApi.detail(caseId)
    if (version !== detailRequestVersion) return
    if (response.data == null) throw new Error('风险处置单详情返回为空')
    if (String(response.data.id) !== normalizedId) throw new Error('处置单详情不符合所选风险单')
    detail.value = response.data
  } catch (error) {
    if (version !== detailRequestVersion) return
    detail.value = null
    detailErrorText.value = getErrorMessage(error, '风险处置单暂时无法读取')
  } finally {
    if (version === detailRequestVersion) detailLoading.value = false
  }
}

const loadEvents = async () => {
  const caseId = selectedCaseId.value
  if (!caseId) return
  const version = ++eventsRequestVersion
  events.value = emptyEvents()
  eventsErrorText.value = ''
  eventsLoadMoreErrorText.value = ''
  eventsLoading.value = true
  try {
    const response = await channelHealthRiskCasesApi.events(caseId, { size: 10 })
    if (version !== eventsRequestVersion) return
    if (response.data == null) throw new Error('处置事件返回为空')
    events.value = response.data
  } catch (error) {
    if (version !== eventsRequestVersion) return
    events.value = emptyEvents()
    eventsErrorText.value = getErrorMessage(error, '处置事件暂时无法读取')
  } finally {
    if (version === eventsRequestVersion) eventsLoading.value = false
  }
}

const loadMoreEvents = async () => {
  const caseId = selectedCaseId.value
  const cursor = events.value.nextCursor
  if (!caseId || !cursor || eventsLoading.value || pendingAction.value != null) return
  const version = ++eventsRequestVersion
  eventsLoading.value = true
  eventsLoadMoreErrorText.value = ''
  try {
    const response = await channelHealthRiskCasesApi.events(caseId, { cursor, size: 10 })
    if (version !== eventsRequestVersion) return
    if (response.data == null) throw new Error('处置事件分页返回为空')
    const seenIds = new Set(events.value.items.map((item) => String(item.id)))
    const nextItems = response.data.items.filter((item) => !seenIds.has(String(item.id)))
    if (nextItems.length !== response.data.items.length) throw new Error('处置事件分页结果不可信')
    events.value = {
      items: [...events.value.items, ...nextItems],
      nextCursor: response.data.nextCursor,
    }
  } catch (error) {
    if (version !== eventsRequestVersion) return
    eventsLoadMoreErrorText.value = getErrorMessage(error, '更多处置事件暂时无法读取')
  } finally {
    if (version === eventsRequestVersion) eventsLoading.value = false
  }
}

const openCase = async (caseId: ApiId) => {
  if (pendingAction.value != null) return
  createTarget.value = null
  await Promise.all([loadDetail(caseId), loadEventsForCase(caseId), loadGovernanceData(caseId)])
}

const loadEventsForCase = async (caseId: ApiId) => {
  const normalizedId = String(caseId)
  const version = ++eventsRequestVersion
  events.value = emptyEvents()
  eventsErrorText.value = ''
  eventsLoadMoreErrorText.value = ''
  eventsLoading.value = true
  try {
    const response = await channelHealthRiskCasesApi.events(caseId, { size: 10 })
    if (version !== eventsRequestVersion || String(selectedCaseId.value) !== normalizedId) return
    if (response.data == null) throw new Error('处置事件返回为空')
    events.value = response.data
  } catch (error) {
    if (version !== eventsRequestVersion || String(selectedCaseId.value) !== normalizedId) return
    events.value = emptyEvents()
    eventsErrorText.value = getErrorMessage(error, '处置事件暂时无法读取')
  } finally {
    if (version === eventsRequestVersion) eventsLoading.value = false
  }
}

const closeSelectionKey = (
  current: ChannelHealthRiskCaseDetail,
  currentGovernance: ChannelHealthRiskCaseGovernance,
) => JSON.stringify({
  caseId: String(current.id),
  caseVersion: current.caseVersion,
  coordinationVersion: current.coordinationVersion,
  governanceVersion: currentGovernance.governanceVersion,
  resolutionRevisionId: closeResolutionRevisionIdDraft.value.trim(),
  actionReferenceIds: [...closeActionReferenceIdsDraft.value].sort(),
  evidenceEntryIds: [...closeEvidenceEntryIdsDraft.value].sort(),
  retrospectiveOwnerUid: closeRetrospectiveOwnerUidDraft.value.trim(),
})

const closePreviewIsCurrent = computed(() => {
  const current = detail.value
  const currentGovernance = governance.value
  const preview = closePreview.value
  if (!current || !currentGovernance || !preview) return false
  return (
    preview.readyToClose
    && String(preview.caseId) === String(current.id)
    && preview.caseVersion === current.caseVersion
    && preview.coordinationVersion === current.coordinationVersion
    && preview.governanceVersion === currentGovernance.governanceVersion
    && preview.governanceFactVersion === currentGovernance.governanceFactVersion
    && closePreviewSelectionKey.value === closeSelectionKey(current, currentGovernance)
  )
})

const commandIdFor = (key: string, prefix: string) => {
  const existing = commandIds.value[key]
  if (existing) return existing
  const entropy = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '')
    : `${Date.now()}${Math.random().toString(36).slice(2, 12)}`
  const commandId = `${prefix}-${entropy}`.slice(0, 64)
  commandIds.value[key] = commandId
  return commandId
}

const clearCommandId = (key: string) => {
  delete commandIds.value[key]
}

const toUtcTimestamp = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value.trim() : date.toISOString()
}

const loadGovernanceData = async (caseId: ApiId) => {
  const normalizedId = String(caseId)
  const version = ++governanceRequestVersion
  governance.value = null
  governanceMilestones.value = { nextCursor: null, items: [] }
  resolutionRevisions.value = { nextCursor: null, items: [] }
  actionReferences.value = { nextCursor: null, items: [] }
  evidenceEntries.value = { nextCursor: null, items: [] }
  closeSnapshot.value = null
  retrospective.value = null
  retrospectiveEvents.value = { nextCursor: null, items: [] }
  recurrenceLinks.value = { nextCursor: null, items: [] }
  closePreview.value = null
  closePreviewSelectionKey.value = ''
  governanceErrorText.value = ''
  governanceLoading.value = true
  try {
    const [
      governanceResponse,
      milestonesResponse,
      revisionsResponse,
      actionsResponse,
      evidenceResponse,
      snapshotResponse,
      retrospectiveResponse,
      retrospectiveEventsResponse,
      recurrenceResponse,
    ] = await Promise.all([
      channelHealthRiskCasesApi.governance(caseId),
      channelHealthRiskCasesApi.governanceMilestones(caseId, { size: 20 }),
      channelHealthRiskCasesApi.resolutionRevisions(caseId, { size: 20 }),
      channelHealthRiskCasesApi.actionReferences(caseId, { size: 20 }),
      channelHealthRiskCasesApi.evidence(caseId, { size: 20 }),
      channelHealthRiskCasesApi.closeSnapshot(caseId),
      channelHealthRiskCasesApi.retrospective(caseId),
      channelHealthRiskCasesApi.retrospectiveEvents(caseId, { size: 20 }),
      channelHealthRiskCasesApi.recurrenceLinks(caseId, { size: 20 }),
    ])
    if (version !== governanceRequestVersion || String(selectedCaseId.value) !== normalizedId) return
    if (
      governanceResponse.data == null
      || milestonesResponse.data == null
      || revisionsResponse.data == null
      || actionsResponse.data == null
      || evidenceResponse.data == null
      || snapshotResponse.data == null
      || retrospectiveResponse.data == null
      || retrospectiveEventsResponse.data == null
      || recurrenceResponse.data == null
    ) throw new Error('治理事实返回为空')
    if (
      String(governanceResponse.data.caseId) !== normalizedId
      || String(snapshotResponse.data.caseId) !== normalizedId
      || String(retrospectiveResponse.data.caseId) !== normalizedId
      || (governanceResponse.data.retrospective != null && (
        retrospectiveResponse.data.retrospective == null
        || String(governanceResponse.data.retrospective.id) !== String(retrospectiveResponse.data.retrospective.id)
      ))
      || (governanceResponse.data.closeSnapshotId != null && (
        snapshotResponse.data.snapshot == null
        || String(governanceResponse.data.closeSnapshotId) !== String(snapshotResponse.data.snapshot.id)
      ))
      || revisionsResponse.data.items.some((item) => String(item.caseId) !== normalizedId)
      || actionsResponse.data.items.some((item) => String(item.caseId) !== normalizedId)
      || evidenceResponse.data.items.some((item) => String(item.caseId) !== normalizedId)
      || recurrenceResponse.data.items.some((item) => String(item.currentCaseId) !== normalizedId)
    ) throw new Error('治理事实未返回同一处置单的可信快照')
    governance.value = governanceResponse.data
    governanceMilestones.value = milestonesResponse.data
    resolutionRevisions.value = revisionsResponse.data
    actionReferences.value = actionsResponse.data
    evidenceEntries.value = evidenceResponse.data
    closeSnapshot.value = snapshotResponse.data
    retrospective.value = retrospectiveResponse.data
    retrospectiveEvents.value = retrospectiveEventsResponse.data
    recurrenceLinks.value = recurrenceResponse.data
    const actionItems = actionsResponse.data.items
    const evidenceItems = evidenceResponse.data.items
    const currentRevisionId = String(governanceResponse.data.currentResolutionRevision?.id || '')
    if (!closeResolutionRevisionIdDraft.value || !revisionsResponse.data.items.some((item) => (
      String(item.id) === closeResolutionRevisionIdDraft.value
    ))) closeResolutionRevisionIdDraft.value = currentRevisionId
    closeActionReferenceIdsDraft.value = closeActionReferenceIdsDraft.value.filter((id) => (
      actionItems.some((item) => String(item.id) === id)
    ))
    closeEvidenceEntryIdsDraft.value = closeEvidenceEntryIdsDraft.value.filter((id) => (
      evidenceItems.some((item) => String(item.id) === id)
    ))
  } catch (error) {
    if (version !== governanceRequestVersion || String(selectedCaseId.value) !== normalizedId) return
    governance.value = null
    governanceMilestones.value = { nextCursor: null, items: [] }
    resolutionRevisions.value = { nextCursor: null, items: [] }
    actionReferences.value = { nextCursor: null, items: [] }
    evidenceEntries.value = { nextCursor: null, items: [] }
    closeSnapshot.value = null
    retrospective.value = null
    retrospectiveEvents.value = { nextCursor: null, items: [] }
    recurrenceLinks.value = { nextCursor: null, items: [] }
    governanceErrorText.value = getErrorMessage(error, 'V41 治理事实暂时无法读取')
  } finally {
    if (version === governanceRequestVersion) governanceLoading.value = false
  }
}

const closeCaseDetail = () => {
  if (detailLoading.value || pendingAction.value != null) return
  resetDetail()
}

const reloadSelectedCase = async () => {
  if (!selectedCaseId.value) return
  await Promise.all([
    loadDetail(selectedCaseId.value),
    loadEventsForCase(selectedCaseId.value),
    loadGovernanceData(selectedCaseId.value),
  ])
}

const reloadRemoteState = async () => {
  await loadQueue()
  if (selectedCaseId.value) await reloadSelectedCase()
}

const refreshAfterWrite = async (caseId: ApiId) => {
  await loadQueue()
  await Promise.all([loadDetail(caseId), loadEventsForCase(caseId), loadGovernanceData(caseId)])
}

const executeWrite = async (
  action: PendingAction,
  successText: string,
  request: () => Promise<{ data: unknown }>,
): Promise<boolean> => {
  const current = detail.value
  if (!current || !canWriteDetail.value) return false
  pendingAction.value = action
  actionErrorText.value = ''
  actionSuccessText.value = ''
  try {
    const response = await request()
    if (!response.data) {
      throw new Error('风险处置写入未返回可信远端快照')
    }
    await refreshAfterWrite(current.id)
    actionSuccessText.value = successText
    return true
  } catch (error) {
    actionErrorText.value = getErrorMessage(error, '风险处置操作未完成，已刷新服务端状态')
    await refreshAfterWrite(current.id).catch(() => {})
    return false
  } finally {
    pendingAction.value = null
  }
}

const createCase = async () => {
  const target = createTarget.value
  if (!target || !queueReady.value || pendingAction.value != null) return
  pendingAction.value = 'create'
  actionErrorText.value = ''
  actionSuccessText.value = ''
  try {
    const response = await channelHealthRiskCasesApi.create(target.batchId, {
      expectedCoordinationVersion: target.coordinationVersion,
      ...(target.riskEventId ? { riskEventId: target.riskEventId } : {}),
      note: createDrafts.value[String(target.batchId)] || '',
    })
    if (!response.data || String(response.data.batch.batchId) !== String(target.batchId)) {
      throw new Error('风险处置单建立未返回可信远端快照')
    }
    createTarget.value = null
    selectedQueueBatchId.value = String(target.batchId)
    await loadQueue()
    await Promise.all([loadDetail(response.data.id), loadEventsForCase(response.data.id)])
    await loadGovernanceData(response.data.id)
    actionSuccessText.value = '处置单已建立，并按服务端状态刷新'
  } catch (error) {
    actionErrorText.value = getErrorMessage(error, '风险处置单未建立，已刷新服务端状态')
    await loadQueue()
  } finally {
    pendingAction.value = null
  }
}

const assignOwner = async () => {
  const current = detail.value
  if (!current || !current.canAssignOwner) return
  await executeWrite('assign-owner', '负责人指派结果已按服务端状态刷新', () => (
    channelHealthRiskCasesApi.assignOwner(current.id, {
      expectedCaseVersion: current.caseVersion,
      ownerUid: assignOwnerUidDraft.value,
      note: assignOwnerNoteDraft.value,
    })
  ))
}

const acknowledge = async () => {
  const current = detail.value
  if (!current || !current.canAcknowledge) return
  await executeWrite('acknowledge', '接手确认已按服务端状态刷新', () => (
    channelHealthRiskCasesApi.acknowledge(current.id, {
      expectedCaseVersion: current.caseVersion,
      note: acknowledgeNoteDraft.value,
    })
  ))
}

const recordPlan = async () => {
  const current = detail.value
  if (!current || !current.canRecordPlan) return
  await executeWrite('plan', '恢复计划已按服务端状态刷新', () => (
    channelHealthRiskCasesApi.plan(current.id, {
      expectedCaseVersion: current.caseVersion,
      note: planNoteDraft.value,
    })
  ))
}

const recordProgress = async () => {
  const current = detail.value
  if (!current || !current.canRecordProgress) return
  await executeWrite('progress', '处置进展已按服务端状态刷新', () => (
    channelHealthRiskCasesApi.progress(current.id, {
      expectedCaseVersion: current.caseVersion,
      note: progressNoteDraft.value,
    })
  ))
}

const submitResolution = async () => {
  const current = detail.value
  if (!current || !current.canSubmitResolution) return
  await executeWrite('submit-resolution', '恢复说明已按服务端状态刷新', () => (
    channelHealthRiskCasesApi.submitResolution(current.id, {
      expectedCaseVersion: current.caseVersion,
      expectedCoordinationVersion: current.coordinationVersion,
      note: resolutionNoteDraft.value,
    })
  ))
}

const closeRiskCase = async () => {
  const current = detail.value
  const currentGovernance = governance.value
  // detail.canClose remains V40 presentation data; V41 authorization uses governance plus a current preview.
  if (!current || !currentGovernance || !currentGovernance.canClose || !closePreviewIsCurrent.value) return
  const succeeded = await executeWrite('close', '治理关闭、证据快照与复盘已按服务端状态刷新', () => (
    channelHealthRiskCasesApi.close(current.id, {
      expectedCaseVersion: current.caseVersion,
      expectedCoordinationVersion: current.coordinationVersion,
      expectedGovernanceVersion: currentGovernance.governanceVersion,
      resolutionRevisionId: closeResolutionRevisionIdDraft.value,
      actionReferenceIds: closeActionReferenceIdsDraft.value,
      evidenceEntryIds: closeEvidenceEntryIdsDraft.value,
      retrospectiveOwnerUid: closeRetrospectiveOwnerUidDraft.value,
      commandId: commandIdFor('close', 'close'),
      note: closeNoteDraft.value,
    })
  ))
  if (succeeded) clearCommandId('close')
}

const addResolutionRevision = async () => {
  const current = detail.value
  const currentGovernance = governance.value
  if (!current || !currentGovernance || !currentGovernance.canAddResolutionRevision || !canWriteGovernance.value) return
  const succeeded = await executeWrite('add-resolution-revision', '治理结论已按服务端状态刷新', () => (
    channelHealthRiskCasesApi.addResolutionRevision(current.id, {
      expectedCaseVersion: current.caseVersion,
      expectedGovernanceVersion: currentGovernance.governanceVersion,
      commandId: commandIdFor('resolution-revision', 'resolution'),
      outcomeType: resolutionOutcomeDraft.value,
      contentRecoveryState: resolutionRecoveryStateDraft.value,
      recoveryScope: resolutionScopeDraft.value,
      residualRiskLevel: resolutionResidualRiskDraft.value,
      summary: resolutionSummaryDraft.value,
      rootCauses: [{
        role: 'PRIMARY',
        category: resolutionPrimaryRootCauseDraft.value,
        note: resolutionRootCauseNoteDraft.value,
      }],
    })
  ))
  if (succeeded) clearCommandId('resolution-revision')
}

const addActionReference = async () => {
  const current = detail.value
  const currentGovernance = governance.value
  if (!current || !currentGovernance || !currentGovernance.canAddActionReference || !canWriteGovernance.value) return
  const succeeded = await executeWrite('add-action-reference', '行动引用已按服务端状态刷新', () => (
    channelHealthRiskCasesApi.addActionReference(current.id, {
      expectedCaseVersion: current.caseVersion,
      expectedGovernanceVersion: currentGovernance.governanceVersion,
      commandId: commandIdFor('action-reference', 'action'),
      referenceType: actionReferenceTypeDraft.value,
      referenceKey: actionReferenceKeyDraft.value,
      ...(actionReferenceObservedVersionDraft.value.trim()
        ? { observedVersion: Number(actionReferenceObservedVersionDraft.value) }
        : {}),
      occurredAt: toUtcTimestamp(actionReferenceOccurredAtDraft.value),
      summary: actionReferenceSummaryDraft.value,
      ...(actionReferenceCorrectionIdDraft.value.trim()
        ? { correctionOfReferenceId: actionReferenceCorrectionIdDraft.value }
        : {}),
    })
  ))
  if (succeeded) clearCommandId('action-reference')
}

const addEvidence = async () => {
  const current = detail.value
  const currentGovernance = governance.value
  if (!current || !currentGovernance || !currentGovernance.canAddEvidence || !canWriteGovernance.value) return
  const succeeded = await executeWrite('add-evidence', '证据条目已按服务端状态刷新', () => (
    channelHealthRiskCasesApi.addEvidence(current.id, {
      expectedCaseVersion: current.caseVersion,
      expectedGovernanceVersion: currentGovernance.governanceVersion,
      commandId: commandIdFor('evidence-entry', 'evidence'),
      evidenceType: evidenceTypeDraft.value,
      assertionType: evidenceAssertionDraft.value,
      subjectType: evidenceSubjectTypeDraft.value,
      subjectRef: evidenceSubjectRefDraft.value,
      sourceType: evidenceSourceTypeDraft.value,
      sourceRef: evidenceSourceRefDraft.value,
      ...(evidenceSourceVersionDraft.value.trim()
        ? { sourceVersion: Number(evidenceSourceVersionDraft.value) }
        : {}),
      observedAt: toUtcTimestamp(evidenceObservedAtDraft.value),
      summary: evidenceSummaryDraft.value,
      ...(evidenceCorrectionIdDraft.value.trim()
        ? { correctionOfEntryId: evidenceCorrectionIdDraft.value }
        : {}),
    })
  ))
  if (succeeded) clearCommandId('evidence-entry')
}

const previewClose = async () => {
  const current = detail.value
  const currentGovernance = governance.value
  if (!current || !currentGovernance || !currentGovernance.canPreviewClose || !canWriteGovernance.value) return
  pendingAction.value = 'preview-close'
  actionErrorText.value = ''
  actionSuccessText.value = ''
  closePreview.value = null
  closePreviewSelectionKey.value = ''
  try {
    const response = await channelHealthRiskCasesApi.closePreview(current.id, {
      expectedCaseVersion: current.caseVersion,
      expectedCoordinationVersion: current.coordinationVersion,
      expectedGovernanceVersion: currentGovernance.governanceVersion,
      resolutionRevisionId: closeResolutionRevisionIdDraft.value,
      actionReferenceIds: closeActionReferenceIdsDraft.value,
      evidenceEntryIds: closeEvidenceEntryIdsDraft.value,
      retrospectiveOwnerUid: closeRetrospectiveOwnerUidDraft.value,
    })
    if (response.data == null) throw new Error('关闭预检返回为空')
    if (
      String(response.data.caseId) !== String(current.id)
      || response.data.caseVersion !== current.caseVersion
      || response.data.coordinationVersion !== current.coordinationVersion
      || response.data.governanceVersion !== currentGovernance.governanceVersion
    ) throw new Error('关闭预检未返回当前版本')
    closePreview.value = response.data
    closePreviewSelectionKey.value = closeSelectionKey(current, currentGovernance)
    actionSuccessText.value = response.data.readyToClose
      ? '关闭预检已通过，请在版本和选择不变时提交关闭'
      : '关闭预检未通过，请根据安全原因码补充治理事实'
  } catch (error) {
    actionErrorText.value = getErrorMessage(error, '关闭预检未完成，已保留服务端关闭限制')
  } finally {
    pendingAction.value = null
  }
}

const initializeRetrospective = async () => {
  const current = detail.value
  const currentGovernance = governance.value
  const currentRetrospective = retrospective.value
  if (
    !current
    || !currentGovernance?.canInitializeRetrospective
    || !currentRetrospective?.legacyClosedWithoutSnapshot
    || currentRetrospective.retrospective != null
    || !canWriteGovernance.value
  ) return
  const succeeded = await executeWrite('initialize-retrospective', '历史复盘已按服务端状态刷新', () => (
    channelHealthRiskCasesApi.initializeRetrospective(current.id, {
      expectedRetrospectiveVersion: 0,
      ownerUid: retrospectiveInitializeOwnerUidDraft.value,
      commandId: commandIdFor('retrospective-initialize', 'retrospective-init'),
      note: retrospectiveInitializeNoteDraft.value,
    })
  ))
  if (succeeded) clearCommandId('retrospective-initialize')
}

const assignRetrospectiveOwner = async () => {
  const current = detail.value
  const currentGovernance = governance.value
  const item = retrospective.value?.retrospective
  if (!current || !currentGovernance?.canManageRetrospective || !item || !item.canAssignOwner || !canWriteGovernance.value) return
  const succeeded = await executeWrite('assign-retrospective-owner', '复盘负责人已按服务端状态刷新', () => (
    channelHealthRiskCasesApi.assignRetrospectiveOwner(current.id, {
      expectedRetrospectiveVersion: item.retrospectiveVersion,
      ownerUid: retrospectiveOwnerUidDraft.value,
      commandId: commandIdFor('retrospective-owner', 'retrospective-owner'),
      note: retrospectiveOwnerNoteDraft.value,
    })
  ))
  if (succeeded) clearCommandId('retrospective-owner')
}

const startRetrospective = async () => {
  const current = detail.value
  const currentGovernance = governance.value
  const item = retrospective.value?.retrospective
  if (!current || !currentGovernance?.canManageRetrospective || !item || !item.canStart || !canWriteGovernance.value) return
  const succeeded = await executeWrite('start-retrospective', '复盘开始结果已按服务端状态刷新', () => (
    channelHealthRiskCasesApi.startRetrospective(current.id, {
      expectedRetrospectiveVersion: item.retrospectiveVersion,
      commandId: commandIdFor('retrospective-start', 'retrospective-start'),
      note: retrospectiveStartNoteDraft.value,
    })
  ))
  if (succeeded) clearCommandId('retrospective-start')
}

const recordRetrospectiveFinding = async () => {
  const current = detail.value
  const currentGovernance = governance.value
  const item = retrospective.value?.retrospective
  if (!current || !currentGovernance?.canManageRetrospective || !item || !item.canRecordFinding || !canWriteGovernance.value) return
  const succeeded = await executeWrite('record-retrospective-finding', '复盘发现已按服务端状态刷新', () => (
    channelHealthRiskCasesApi.recordRetrospectiveFinding(current.id, {
      expectedRetrospectiveVersion: item.retrospectiveVersion,
      commandId: commandIdFor('retrospective-finding', 'retrospective-finding'),
      learningCategory: retrospectiveLearningCategoryDraft.value,
      findingSummary: retrospectiveFindingSummaryDraft.value,
      preventionActionSummary: retrospectivePreventionActionDraft.value,
      note: retrospectiveFindingNoteDraft.value,
    })
  ))
  if (succeeded) clearCommandId('retrospective-finding')
}

const completeRetrospective = async () => {
  const current = detail.value
  const currentGovernance = governance.value
  const item = retrospective.value?.retrospective
  if (!current || !currentGovernance?.canManageRetrospective || !item || !item.canComplete || !canWriteGovernance.value) return
  const succeeded = await executeWrite('complete-retrospective', '复盘完成结果已按服务端状态刷新', () => (
    channelHealthRiskCasesApi.completeRetrospective(current.id, {
      expectedRetrospectiveVersion: item.retrospectiveVersion,
      commandId: commandIdFor('retrospective-complete', 'retrospective-complete'),
      note: retrospectiveCompleteNoteDraft.value,
    })
  ))
  if (succeeded) clearCommandId('retrospective-complete')
}

const addRecurrenceLink = async () => {
  const current = detail.value
  const currentGovernance = governance.value
  if (!current || !currentGovernance?.canLinkRecurrence || !canWriteGovernance.value) return
  const succeeded = await executeWrite('add-recurrence-link', '复发关联已按服务端状态刷新', () => (
    channelHealthRiskCasesApi.addRecurrenceLink(current.id, {
      expectedCurrentCaseVersion: current.caseVersion,
      previousCaseId: recurrencePreviousCaseIdDraft.value,
      relationType: recurrenceRelationTypeDraft.value,
      rootCauseCategory: recurrenceRootCauseCategoryDraft.value,
      commandId: commandIdFor('recurrence-link', 'recurrence'),
      note: recurrenceNoteDraft.value,
    })
  ))
  if (succeeded) clearCommandId('recurrence-link')
}

watch(domains, () => {
  ensureSelectedDomain()
}, { immediate: true })

watch([selectedDomain, selectedMode], ([domain, mode], [previousDomain, previousMode]) => {
  if (domain === previousDomain && mode === previousMode) return
  resetQueue()
  createTarget.value = null
  if (domain == null) {
    queueRequestVersion += 1
    queueLoading.value = false
    return
  }
  void loadQueue()
}, { immediate: true })

watch(() => props.refreshKey, (value, previousValue) => {
  if (value == null || value === previousValue) return
  void reloadRemoteState()
})
</script>

<style scoped>
.risk-case-workspace { margin-top: 1rem; border: 1px solid rgb(226 232 240); border-radius: .625rem; background: white; padding: 1.15rem; }
.workspace-header, .section-header, .timeline-header, .action-form-header { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; }
.workspace-header p, .section-header p, .timeline-header p { margin: 0; color: rgb(190 24 93); font-size: .72rem; font-weight: 800; }
.workspace-header h2, .section-header h3, .timeline-header h4, .action-form-header h4 { margin: .2rem 0 0; color: rgb(15 23 42); font-size: .95rem; font-weight: 900; }
.workspace-controls { display: flex; align-items: flex-end; gap: .5rem; }
.workspace-controls label { display: grid; gap: .25rem; color: rgb(100 116 139); font-size: .67rem; font-weight: 800; }
.workspace-controls select { min-width: 7.8rem; border: 1px solid rgb(203 213 225); border-radius: .5rem; background: white; padding: .42rem .5rem; color: rgb(15 23 42); font-size: .72rem; }
.icon-button { display: inline-flex; height: 2.2rem; width: 2.2rem; align-items: center; justify-content: center; border: 1px solid rgb(203 213 225); border-radius: .5rem; background: white; color: rgb(51 65 85); }
.icon-button:disabled, .retry-button:disabled, .row-action:disabled, .load-more-button:disabled, .text-action:disabled, .open-batch-button:disabled, .action-form button:disabled, .queue-main:disabled { cursor: not-allowed; opacity: .55; }
.workspace-caption, .create-caption { margin: .75rem 0 0; color: rgb(100 116 139); font-size: .74rem; line-height: 1.55; }
.workspace-state, .timeline-state { display: flex; align-items: center; justify-content: center; gap: .65rem; margin-top: .85rem; border: 1px dashed rgb(203 213 225); border-radius: .5rem; background: rgb(248 250 252); padding: 1rem; color: rgb(100 116 139); font-size: .75rem; text-align: center; }
.workspace-state-error, .timeline-state-error { border-style: solid; border-color: rgb(254 202 202); color: rgb(185 28 28); }
.retry-button, .row-action, .load-more-button, .open-batch-button, .action-form button { min-height: 31px; border: 1px solid rgb(203 213 225); border-radius: .5rem; background: white; padding: .32rem .55rem; color: rgb(51 65 85); font-size: .7rem; font-weight: 800; }
.queue-list { display: grid; gap: .6rem; margin-top: .85rem; }
.queue-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .65rem; border: 1px solid rgb(226 232 240); border-radius: .5rem; background: rgb(248 250 252); padding: .7rem; }
.queue-row-selected { border-color: rgb(190 24 93); }
.queue-main { min-width: 0; border: 0; background: transparent; padding: 0; color: inherit; text-align: left; }
.queue-title { display: flex; flex-wrap: wrap; align-items: center; gap: .42rem; }
.queue-title h3 { overflow: hidden; margin: 0; color: rgb(15 23 42); font-size: .82rem; font-weight: 900; text-overflow: ellipsis; white-space: nowrap; }
.priority, .case-status { border-radius: 999px; padding: .18rem .42rem; font-size: .63rem; font-weight: 900; }
.priority-high { background: rgb(254 226 226); color: rgb(185 28 28); }
.priority-medium { background: rgb(254 243 199); color: rgb(146 64 14); }
.priority-low { background: rgb(220 252 231); color: rgb(21 128 61); }
.case-status-unhandled { background: rgb(254 243 199); color: rgb(146 64 14); }
.case-status-open { background: rgb(254 226 226); color: rgb(190 24 93); }
.case-status-acknowledged, .case-status-in_progress { background: rgb(224 242 254); color: rgb(3 105 161); }
.case-status-resolved { background: rgb(224 231 255); color: rgb(67 56 202); }
.case-status-closed { background: rgb(241 245 249); color: rgb(71 85 105); }
.queue-main p { margin: .34rem 0 0; color: rgb(100 116 139); font-size: .72rem; line-height: 1.5; }
.queue-meta, .detail-summary { display: flex; flex-wrap: wrap; gap: .42rem; margin-top: .5rem; }
.queue-meta span, .detail-summary span { color: rgb(71 85 105); font-size: .65rem; font-weight: 800; }
.row-action { align-self: start; }
.load-more-error { display: flex; align-items: center; justify-content: center; gap: .65rem; margin-top: .75rem; color: rgb(185 28 28); font-size: .72rem; }
.load-more-button { display: block; margin-top: .75rem; }
.create-panel, .case-detail { margin-top: 1rem; border-top: 1px solid rgb(226 232 240); padding-top: 1rem; }
.text-action { min-height: 28px; border: 0; background: transparent; color: rgb(190 24 93); font-size: .7rem; font-weight: 800; }
.detail-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .3rem; }
.open-batch-button { border-color: rgb(190 24 93); color: rgb(190 24 93); }
.detail-summary { border: 1px solid rgb(226 232 240); border-radius: .5rem; background: rgb(248 250 252); padding: .6rem; }
.action-feedback { margin: .85rem 0 0; border-radius: .5rem; padding: .55rem .65rem; font-size: .72rem; font-weight: 700; }
.action-feedback-success { background: rgb(220 252 231); color: rgb(21 128 61); }
.action-feedback-error { background: rgb(254 226 226); color: rgb(185 28 28); }
.action-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .8rem; margin-top: .9rem; }
.action-form { display: grid; gap: .55rem; border-top: 1px solid rgb(226 232 240); padding-top: .75rem; }
.action-form label { display: grid; gap: .28rem; color: rgb(71 85 105); font-size: .67rem; font-weight: 800; }
.action-form input, .action-form textarea, .action-form select, .close-selection-form select { width: 100%; border: 1px solid rgb(203 213 225); border-radius: .5rem; background: white; padding: .42rem .5rem; color: rgb(15 23 42); font-size: .72rem; line-height: 1.45; }
.action-form textarea { resize: vertical; }
.action-form button { justify-self: start; border-color: rgb(190 24 93); color: rgb(190 24 93); }
.action-form-close button { border-color: rgb(185 28 28); color: rgb(185 28 28); }
.governance-panel, .retrospective-panel, .recurrence-panel, .milestone-panel, .governance-snapshot { margin-top: 1rem; border-top: 1px solid rgb(226 232 240); padding-top: 1rem; }
.governance-summary { margin-top: .75rem; }
.governance-grid, .governance-read-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .8rem; margin-top: .85rem; }
.governance-list { min-width: 0; border-top: 1px solid rgb(226 232 240); padding-top: .7rem; }
.governance-list h5, .close-review h5, .governance-snapshot h5, .retrospective-panel h5, .recurrence-panel h5, .milestone-panel h5 { margin: .18rem 0 0; color: rgb(15 23 42); font-size: .78rem; font-weight: 900; }
.governance-list ol, .close-preview-result ol { display: grid; gap: .5rem; margin: .6rem 0 0; padding: 0; list-style: none; }
.governance-list li, .close-preview-result li { border-left: 2px solid rgb(251 207 232); padding-left: .6rem; }
.governance-list strong, .close-preview-result strong { display: block; color: rgb(30 41 59); font-size: .69rem; }
.governance-list span, .governance-list p, .close-preview-result span, .close-preview-result li span, .governance-empty, .snapshot-caption, .field-hint { color: rgb(100 116 139); font-size: .67rem; line-height: 1.5; }
.governance-list p, .snapshot-caption, .field-hint { margin: .18rem 0 0; }
.governance-empty { margin: .65rem 0 0; }
.field-hint { color: rgb(146 64 14); font-weight: 800; }
.close-review { margin-top: 1rem; border-top: 1px solid rgb(226 232 240); padding-top: 1rem; }
.close-selection-form { display: grid; gap: .6rem; margin-top: .75rem; }
.close-selection-form > label, .close-selection-form fieldset { display: grid; gap: .3rem; border: 1px solid rgb(226 232 240); border-radius: .5rem; padding: .55rem; color: rgb(71 85 105); font-size: .67rem; font-weight: 800; }
.close-selection-form fieldset { min-width: 0; }
.close-selection-form legend { padding: 0 .2rem; color: rgb(71 85 105); font-size: .67rem; font-weight: 800; }
.check-label { display: flex; align-items: center; gap: .4rem; color: rgb(71 85 105); font-size: .68rem; font-weight: 700; }
.check-label input { width: auto; }
.close-selection-form > button { justify-self: start; min-height: 31px; border: 1px solid rgb(190 24 93); border-radius: .5rem; background: white; padding: .32rem .55rem; color: rgb(190 24 93); font-size: .7rem; font-weight: 800; }
.close-preview-result { margin-top: .75rem; border: 1px solid rgb(226 232 240); border-radius: .5rem; background: rgb(248 250 252); padding: .65rem; }
.close-preview-result > span { display: block; margin-top: .18rem; }
.event-timeline { margin-top: 1rem; border-top: 1px solid rgb(226 232 240); padding-top: 1rem; }
.event-list { display: grid; gap: .6rem; margin: .75rem 0 0; padding: 0; list-style: none; }
.event-list li { border-left: 2px solid rgb(251 207 232); padding-left: .7rem; }
.event-list li > div { display: flex; flex-wrap: wrap; align-items: baseline; gap: .4rem; }
.event-list strong { color: rgb(15 23 42); font-size: .72rem; }
.event-list span, .event-list p { color: rgb(100 116 139); font-size: .68rem; line-height: 1.5; }
.event-list p { margin: .2rem 0 0; }
@media (max-width: 760px) {
  .workspace-header, .section-header, .timeline-header { flex-direction: column; }
  .workspace-controls { width: 100%; justify-content: space-between; }
  .workspace-controls label { flex: 1; }
  .workspace-controls select { min-width: 0; width: 100%; }
  .queue-row { display: flex; flex-direction: column; }
  .row-action { align-self: stretch; }
  .action-grid, .governance-grid, .governance-read-grid { grid-template-columns: 1fr; }
}
.dark .risk-case-workspace { border-color: rgb(51 65 85); background: rgb(15 23 42); }
.dark .workspace-header h2, .dark .section-header h3, .dark .timeline-header h4, .dark .action-form-header h4, .dark .queue-title h3, .dark .event-list strong { color: rgb(248 250 252); }
.dark .workspace-controls label, .dark .workspace-caption, .dark .create-caption, .dark .workspace-state, .dark .timeline-state, .dark .queue-main p, .dark .event-list span, .dark .event-list p { color: rgb(148 163 184); }
.dark .workspace-controls select, .dark .icon-button, .dark .retry-button, .dark .row-action, .dark .load-more-button, .dark .open-batch-button, .dark .action-form input, .dark .action-form textarea, .dark .action-form select, .dark .close-selection-form select, .dark .action-form button, .dark .close-selection-form > button { border-color: rgb(51 65 85); background: rgb(2 6 23); color: rgb(203 213 225); }
.dark .workspace-state, .dark .timeline-state, .dark .queue-row, .dark .detail-summary, .dark .close-preview-result { border-color: rgb(51 65 85); background: rgb(2 6 23 / .55); }
.dark .workspace-state-error, .dark .timeline-state-error { border-color: rgb(127 29 29); color: rgb(252 165 165); }
.dark .queue-row-selected { border-color: rgb(251 113 133); }
.dark .queue-meta span, .dark .detail-summary span { color: rgb(203 213 225); }
.dark .create-panel, .dark .case-detail, .dark .action-form, .dark .event-timeline, .dark .governance-panel, .dark .retrospective-panel, .dark .recurrence-panel, .dark .milestone-panel, .dark .governance-snapshot, .dark .close-review, .dark .governance-list, .dark .close-selection-form > label, .dark .close-selection-form fieldset { border-color: rgb(30 41 59); }
.dark .text-action, .dark .open-batch-button { color: rgb(251 113 133); }
.dark .load-more-error { color: rgb(252 165 165); }
.dark .event-list li { border-color: rgb(131 24 67); }
.dark .governance-list h5, .dark .close-review h5, .dark .governance-snapshot h5, .dark .retrospective-panel h5, .dark .recurrence-panel h5, .dark .milestone-panel h5, .dark .governance-list strong, .dark .close-preview-result strong { color: rgb(226 232 240); }
.dark .governance-list span, .dark .governance-list p, .dark .close-preview-result span, .dark .close-preview-result li span, .dark .governance-empty, .dark .snapshot-caption, .dark .field-hint, .dark .check-label, .dark .close-selection-form > label, .dark .close-selection-form legend { color: rgb(148 163 184); }
</style>
