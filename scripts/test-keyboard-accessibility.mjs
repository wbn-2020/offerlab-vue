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

console.log('Keyboard accessibility guard passed')
