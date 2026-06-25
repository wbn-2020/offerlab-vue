import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const assert = (condition, message) => {
  if (!condition) {
    console.error(`Keyboard accessibility guard failed: ${message}`)
    process.exit(1)
  }
}

const composablePath = 'src/composables/useAccessibleDialog.ts'
assert(existsSync(resolve(root, composablePath)), 'useAccessibleDialog composable must exist')

const dialogComposable = read(composablePath)
assert(dialogComposable.includes("event.key !== 'Escape'"), 'dialog composable must handle Escape')
assert(dialogComposable.includes('previousActiveElement'), 'dialog composable must remember the opener')
assert(dialogComposable.includes('focusInitialElement'), 'dialog composable must move focus into the dialog')
assert(dialogComposable.includes('restorePreviousFocus'), 'dialog composable must restore focus after close')
assert(dialogComposable.includes("event.key === 'Tab'"), 'dialog composable must trap Tab focus')
assert(dialogComposable.includes('trapTabFocus'), 'dialog composable must implement a Tab focus trap')
assert(dialogComposable.includes('dialogRef'), 'dialog composable must accept a dialog root ref')
assert(dialogComposable.includes('focusableSelector'), 'dialog composable must query focusable descendants')

const opsView = read('src/views/OpsView.vue')
assert(opsView.includes('useAccessibleDialog'), 'ops dialogs must use accessible dialog behavior')
assert(opsView.includes('role="dialog" aria-modal="true" aria-labelledby="outbox-detail-title"'), 'outbox detail must expose dialog semantics')
assert(opsView.includes('id="outbox-detail-title"'), 'outbox dialog must have a labelled title')
assert(opsView.includes('ref="outboxCloseButton"'), 'outbox dialog must focus a close action')
assert(opsView.includes('role="dialog" aria-modal="true" aria-labelledby="report-review-title"'), 'report review must expose dialog semantics')
assert(opsView.includes('id="report-review-title"'), 'report review dialog must have a labelled title')
assert(opsView.includes('ref="reviewNoteInput"'), 'report review dialog must focus the note textarea')
assert(opsView.includes('role="dialog" aria-modal="true" aria-labelledby="ai-task-detail-title"'), 'AI task detail must expose dialog semantics')
assert(opsView.includes('id="ai-task-detail-title"'), 'AI task detail dialog must have a labelled title')
assert(opsView.includes('ref="aiTaskDetailCloseButton"'), 'AI task detail dialog must focus a close action')
assert(opsView.includes('@click.self="closeOutboxDetail"'), 'outbox backdrop click must share the close path')
assert(opsView.includes('closeOnEscape: () => !isReviewSubmitting.value'), 'review dialog must not close by Escape while submitting')

const governanceView = read('src/views/AdminGovernanceView.vue')
assert(governanceView.includes('openAuditDetail(item)'), 'audit detail must open through a named handler')
assert(governanceView.includes('closeAuditDetail'), 'audit detail must close through a named handler')
assert(governanceView.includes('role="dialog" aria-modal="true" aria-labelledby="audit-detail-title"'), 'audit detail must expose dialog semantics')
assert(governanceView.includes('id="audit-detail-title"'), 'audit detail dialog must have a labelled title')
assert(governanceView.includes('ref="auditCloseButton"'), 'audit detail dialog must focus a close action')

const adminQuestionsView = read('src/views/AdminQuestionsView.vue')
assert(adminQuestionsView.includes('role="button"'), 'question review rows must expose button semantics')
assert(adminQuestionsView.includes('tabindex="0"'), 'question review rows must be keyboard focusable')
assert(adminQuestionsView.includes('@keydown.enter.prevent="selectQuestion(question)"'), 'question review rows must support Enter')
assert(adminQuestionsView.includes('@keydown.space.prevent="selectQuestion(question)"'), 'question review rows must support Space')

const notificationsView = read('src/views/NotificationsView.vue')
assert(notificationsView.includes(':role="notif.targetPath ? \'button\' : undefined"'), 'clickable notification cards must expose button semantics')
assert(notificationsView.includes(':tabindex="notif.targetPath ? 0 : undefined"'), 'clickable notification cards must be keyboard focusable')
assert(notificationsView.includes('@keydown.enter.prevent="openNotification(notif)"'), 'notification cards must support Enter')
assert(notificationsView.includes('@keydown.space.prevent="openNotification(notif)"'), 'notification cards must support Space')

const loginView = read('src/views/LoginView.vue')
assert(loginView.includes('for="login-account"'), 'login account label must be programmatically associated')
assert(loginView.includes('id="login-account"'), 'login account input must expose a stable id')
assert(loginView.includes('name="account"'), 'login account input must expose a stable name for autofill and tests')
assert(loginView.includes('autocomplete="username"'), 'login account input must support username autofill')
assert(loginView.includes('aria-label="账号或邮箱"'), 'login account input must expose an explicit aria-label')
assert(loginView.includes('for="login-password"'), 'login password label must be programmatically associated')
assert(loginView.includes('id="login-password"'), 'login password input must expose a stable id')
assert(loginView.includes('name="password"'), 'login password input must expose a stable name for autofill and tests')
assert(loginView.includes('autocomplete="current-password"'), 'login password input must support password autofill')
assert(loginView.includes('aria-label="密码"'), 'login password input must expose an explicit aria-label')
assert(loginView.includes('.auth-submit'), 'login submit button must have a stable touch target class')
assert(loginView.includes('min-height: 44px'), 'login helper links and submit button must keep a 44px touch target')

const registerView = read('src/views/RegisterView.vue')
assert(registerView.includes('.auth-inline-link'), 'register login helper link must have a stable touch target class')
assert(registerView.includes('min-height: 44px'), 'register helper link and submit button must keep a 44px touch target')

const appHeader = read('src/components/layout/AppHeader.vue')
assert(appHeader.includes('header-icon-button'), 'header icon actions must use a shared touch target class')
assert(appHeader.includes('h-11 w-11'), 'user menu avatar button must keep a 44px touch target')
assert(appHeader.includes('min-height: 44px'), 'header navigation actions must keep a 44px touch target')

const questionDetailView = read('src/views/QuestionDetailView.vue')
assert(questionDetailView.includes('.pill') && questionDetailView.includes('min-height: 44px'), 'question detail pills must keep a 44px mobile touch target')

const searchView = read('src/views/SearchView.vue')
assert(searchView.includes('@media (max-width: 640px)') && searchView.includes('.mini-icon-button') && searchView.includes('min-height: 44px'), 'search mobile chips and mini icon buttons must keep 44px touch targets')

const postCard = read('src/components/post/PostCard.vue')
assert(postCard.includes('@media (max-width: 420px)') && postCard.includes('min-height: 44px'), 'post card actions must keep 44px touch targets on narrow screens')

const interactionBar = read('src/components/post/InteractionBar.vue')
assert(interactionBar.includes('@media (max-width: 420px)') && interactionBar.includes('min-height: 44px'), 'post detail interaction actions must keep 44px touch targets on narrow screens')

const questionsView = read('src/views/QuestionsView.vue')
for (const label of ['知识库关键词或知识卡正文', '知识库技术栈筛选', '知识库场景筛选', '知识库难度筛选', '知识库错因筛选', '知识库学习状态筛选', '知识库排序方式']) {
  assert(questionsView.includes(`aria-label="${label}"`), `QuestionsView filter must expose aria-label ${label}`)
}
assert(questionsView.includes('.quick-filter') && questionsView.includes('min-height: 44px'), 'QuestionsView quick filters must keep 44px touch targets on mobile')

console.log('Keyboard accessibility guard passed')
