import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const dialog = read('../src/components/admin/RiskConfirmDialog.vue')
const composable = read('../src/composables/useRiskConfirm.ts')
const opsView = read('../src/views/OpsView.vue')
const questionsView = read('../src/views/AdminQuestionsView.vue')
const aliasesView = read('../src/views/AdminCompanyAliasesView.vue')
const governanceView = read('../src/views/AdminGovernanceView.vue')

const targetViews = { opsView, questionsView, aliasesView, governanceView }

for (const [name, source] of Object.entries(targetViews)) {
  assert.doesNotMatch(source, /window\.confirm\s*\(/, `${name} must not use window.confirm for risky admin actions`)
  assert.doesNotMatch(source, /\(await confirmRisk\(request\)\) !== null/, `${name} must not collapse risk confirmation notes into booleans`)
  assert.match(source, /const requireRiskConfirm = \(request: RiskConfirmRequest\) => confirmRisk\(request\)/, `${name} must preserve the returned risk note`)
  assert.match(source, /<RiskConfirmDialog[\s\S]*:state="riskConfirmState"/, `${name} must render the shared risk dialog`)
  assert.match(source, /useRiskConfirm/, `${name} must use the shared risk confirmation composable`)
}

assert.match(dialog, /role="dialog"/, 'risk dialog must expose role=dialog')
assert.match(dialog, /aria-modal="true"/, 'risk dialog must be modal to assistive tech')
assert.match(dialog, /useAccessibleDialog/, 'risk dialog must reuse accessible dialog behavior')
assert.match(dialog, /initialFocus:\s*noteInput/, 'risk dialog must move initial focus into the dialog')
assert.match(dialog, /requiresNote/, 'risk dialog must know when a note is required')
assert.match(dialog, /props\.state\.request\.requireNote \?\? props\.state\.request\.level !== 'medium'/, 'high and critical risk must require a note by default')
assert.match(dialog, /cleanNote = note\.value\.trim\(\)/, 'risk dialog must trim the operator note')
assert.match(dialog, /emit\('confirm', cleanNote\)/, 'risk dialog must emit the operator note')
assert.match(dialog, /confirmationPhrase/, 'risk dialog must support a confirmation phrase')
assert.match(dialog, /level === 'critical' \? 'CONFIRM' : ''/, 'critical risk must require a default confirmation phrase')
assert.match(dialog, /危险等级|Risk confirmation|levelText/, 'risk dialog must show the risk level')
assert.match(dialog, /可恢复|不可恢复/, 'risk dialog must show whether the operation is reversible')
assert.match(dialog, /影响数量/, 'risk dialog must show impact count')
assert.match(dialog, /前 \{\{ state\.request\.objects\.length \}\} 个 ID \/ 对象/, 'risk dialog must show affected object previews')
assert.match(dialog, /筛选 \/ 上下文/, 'risk dialog must show filters or context')
assert.match(dialog, /备注/, 'risk dialog must include an operator note input')
assert.match(dialog, /取消/, 'risk dialog must include cancel action')
assert.match(dialog, /确认执行/, 'risk dialog must include confirm action')

assert.match(composable, /export interface RiskConfirmRequest/, 'risk composable must expose structured request options')
assert.match(composable, /requireNote\?: boolean/, 'risk request must allow explicit note requirements')
assert.match(composable, /confirmationPhrase\?: string/, 'risk request must allow explicit confirmation phrases')
assert.match(composable, /confirmRisk/, 'risk composable must expose confirmRisk')
assert.match(composable, /resolveRiskConfirm/, 'risk composable must expose confirm resolver')
assert.match(composable, /cancelRiskConfirm/, 'risk composable must expose cancel resolver')

const functionBody = (source, name) => {
  const start = source.indexOf(`const ${name} = async`)
  assert.notEqual(start, -1, `${name} must exist`)
  const next = source.indexOf('\nconst ', start + 1)
  return source.slice(start, next === -1 ? source.length : next)
}

const assertRiskBeforeCall = (source, functionName, apiPattern, label = functionName) => {
  const body = functionBody(source, functionName)
  const confirmIndex = body.indexOf('requireRiskConfirm')
  assert.notEqual(confirmIndex, -1, `${label} must request risk confirmation`)
  const callMatch = body.match(apiPattern)
  assert.ok(callMatch?.index !== undefined, `${label} must still call its target API`)
  assert.ok(confirmIndex < callMatch.index, `${label} must confirm before calling the target API`)
}

const assertPreviewBeforeRiskBeforeCall = (source, functionName, previewPattern, apiPattern, label = functionName) => {
  const body = functionBody(source, functionName)
  const previewMatch = body.match(previewPattern)
  assert.ok(previewMatch?.index !== undefined, `${label} must call the backend preview API`)
  const confirmIndex = body.indexOf('requireRiskConfirm')
  assert.notEqual(confirmIndex, -1, `${label} must request risk confirmation after preview`)
  const callMatch = body.match(apiPattern)
  assert.ok(callMatch?.index !== undefined, `${label} must still call its target API`)
  assert.ok(previewMatch.index < confirmIndex, `${label} must preview before asking for confirmation`)
  assert.ok(confirmIndex < callMatch.index, `${label} must confirm before calling the target API`)
}

assertRiskBeforeCall(opsView, 'submitRebuild', /searchApi\.rebuildIndex\(note\)/, 'search index rebuild')
assertRiskBeforeCall(opsView, 'retryMessage', /opsApi\.retryOutbox\(message\.id, note\)/, 'single outbox retry')
assertRiskBeforeCall(opsView, 'retrySelectedMessages', /opsApi\.retryOutboxBatch\(ids, note\)/, 'batch outbox retry')
assertPreviewBeforeRiskBeforeCall(opsView, 'retrySelectedMessages', /opsApi\.previewOutboxRetryBatch\(ids\)/, /opsApi\.retryOutboxBatch\(ids, note\)/, 'batch outbox retry preview')
assertRiskBeforeCall(opsView, 'replaySearchIndexRetryTask', /opsApi\.replaySearchIndexRetryTask\(task\.id, note\)/, 'single search index replay')
assertRiskBeforeCall(opsView, 'replayFailedSearchIndexRetryTasks', /opsApi\.replaySearchIndexRetryTasks\(ids, note\)/, 'batch search index replay')
assertPreviewBeforeRiskBeforeCall(opsView, 'replayFailedSearchIndexRetryTasks', /opsApi\.previewSearchIndexRetryTasks\(ids\)/, /opsApi\.replaySearchIndexRetryTasks\(ids, note\)/, 'batch search index replay preview')
assertRiskBeforeCall(opsView, 'replayNotificationRetryTask', /opsApi\.replayNotificationRetryTask\(task\.id, note\)/, 'single notification replay')
assertRiskBeforeCall(opsView, 'replayFailedNotificationRetryTasks', /opsApi\.replayNotificationRetryTasks\(ids, note\)/, 'batch notification replay')
assertPreviewBeforeRiskBeforeCall(opsView, 'replayFailedNotificationRetryTasks', /opsApi\.previewNotificationRetryTasks\(ids\)/, /opsApi\.replayNotificationRetryTasks\(ids, note\)/, 'batch notification replay preview')
assertRiskBeforeCall(opsView, 'retryAiTask', /opsApi\.retryAiTask\(task\.id, note\)/, 'AI retry')
assertRiskBeforeCall(opsView, 'rebuildQuestions', /opsApi\.rebuildQuestions\(100, note\)/, 'question rebuild')
assertRiskBeforeCall(opsView, 'rebuildQuestionIndex', /opsApi\.rebuildQuestionIndexTask\(note\)/, 'ops question index rebuild')
assertRiskBeforeCall(opsView, 'addAdmin', /opsApi\.addAdmin\(\{[\s\S]*auditRemark: note/, 'admin enable')
assertRiskBeforeCall(opsView, 'toggleAdmin', /opsApi\.updateAdminStatus\(admin\.uid,[\s\S]*auditRemark: note/, 'admin enable or disable')
assert.match(opsView, /<button v-if="canAdmin"[\s\S]*@click="submitRebuild"/, 'search index rebuild button must be visible to ADMIN only')
assert.match(opsView, /<article v-if="canAdmin"[\s\S]*索引重建任务/, 'current search index task panel must be visible to ADMIN only')
assert.match(opsView, /<article v-if="canAdmin"[\s\S]*最近索引任务/, 'recent search index task panel must be visible to ADMIN only')
assert.match(functionBody(opsView, 'loadTasks'), /if \(!canAdmin\.value\) return/, 'search index task loading must require ADMIN')
assert.doesNotMatch(functionBody(opsView, 'refreshAll'), /if \(canOps\.value\) loaders\.push\([^\n]*loadTasks\(\)/, 'OPS refresh must not call ADMIN-only search task API')
assert.match(functionBody(opsView, 'refreshAll'), /if \(canAdmin\.value\) loaders\.push\([^\n]*loadTasks\(\)/, 'ADMIN refresh must load search task API')
assert.match(functionBody(opsView, 'submitRebuild'), /if \(!canAdmin\.value\) return/, 'search index rebuild submit must require ADMIN')
assert.match(opsView, /环境 \/ 权限模式/, 'OpsView must show the current environment and permission mode to ops users')
assert.match(opsView, /LOCAL_OPEN 仅限本机开发验证/, 'OpsView must explicitly warn that LOCAL_OPEN is development-only')
assert.match(opsView, /status\.value\.adminMode === 'LOCAL_OPEN'\) return '本地开放'/, 'OpsView must render LOCAL_OPEN as a clear Chinese admin mode')

assertRiskBeforeCall(questionsView, 'submitQuestionIndexTask', /opsApi\.rebuildQuestionIndexTask\(note\)/, 'question index submit')
assertRiskBeforeCall(questionsView, 'retryQuestionIndexTask', /opsApi\.retryQuestionIndexTask\(taskId, note\)/, 'question index retry')
assertRiskBeforeCall(questionsView, 'quickReview', /saveQuestion\(note\)/, 'single question review or hide')
assertRiskBeforeCall(questionsView, 'batchReview', /opsApi\.batchReviewQuestions\(ids, status, note\)/, 'batch question review or hide')
assertRiskBeforeCall(questionsView, 'hideSelectedDuplicates', /opsApi\.hideQuestionDuplicates\(selectedQuestion\.value\.id, ids, note\)/, 'duplicate question hide')

assertRiskBeforeCall(aliasesView, 'toggleAliasStatus', /opsApi\.updateCompanyAliasStatus\(item\.id, nextStatus, note\)/, 'company alias enable or disable')
assertRiskBeforeCall(aliasesView, 'acceptCandidate', /opsApi\.createCompanyAlias\(\{[\s\S]*canonicalCompany: item\.canonicalCompany,[\s\S]*alias: item\.alias,[\s\S]*status: 1,[\s\S]*remark: note/, 'one-click alias candidate acceptance')

assertRiskBeforeCall(governanceView, 'saveKeyword', /opsApi\.updateModerationKeyword\(selectedKeyword\.value\.id, payloadWithAudit\)/, 'governance keyword update')
assertRiskBeforeCall(governanceView, 'saveKeyword', /opsApi\.createModerationKeyword\(payloadWithAudit\)/, 'governance keyword create')
assertRiskBeforeCall(governanceView, 'saveUserState', /opsApi\.saveModerationUser\(\{/, 'governance user restriction save')
assert.match(functionBody(governanceView, 'saveUserState'), /auditRemark: note/, 'governance user restriction save must pass the risk note to audit')
assert.match(functionBody(governanceView, 'saveUserState'), /reason: userForm\.reason \|\| note/, 'governance user restriction save must persist the note when no reason was provided')
assertRiskBeforeCall(governanceView, 'clearUserMute', /opsApi\.clearModerationMute\(item\.uid, note\)/, 'governance clear mute')
assertRiskBeforeCall(governanceView, 'clearUserBan', /opsApi\.clearModerationBan\(item\.uid, note\)/, 'governance clear ban')
assert.match(governanceView, /visibleTabs/, 'governance view must derive visible tabs from permissions')
assert.match(governanceView, /const canOps = computed/, 'governance view must know OPS permission')
assert.match(governanceView, /const canModerate = computed/, 'governance view must know content moderator permission')
assert.match(governanceView, /if \(canOps\.value\)[\s\S]*opsApi\.migrationStatus/, 'governance migration checks must only load for OPS')
assert.match(governanceView, /if \(canModerate\.value\)[\s\S]*opsApi\.listModerationKeywords/, 'governance moderation data must only load for content moderators')

console.log('risk confirmation guard passed')
