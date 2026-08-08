import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const expect = (value, message) => {
  if (!value) throw new Error(message)
}

const editor = read('src/views/EditorView.vue')
const assistApi = read('src/api/contentAssist.ts')
const workspace = read('src/components/incentive/CommunityGrowthGovernanceWorkspace.vue')
const adminView = read('src/views/AdminCommunityGrowthView.vue')
const operationsApi = read('src/api/contentAssistOperations.ts')
const recoveryBlock = editor.slice(
  editor.indexOf('const sha256Hex = async'),
  editor.indexOf('const loadSeriesWorkbench = async'),
)

expect(assistApi.includes("'/api/v1/content-assist/enhanced/recent'"), 'V27 recent enhanced-request API is missing')
expect(assistApi.includes('/enhanced/requests/${encodeURIComponent(String(requestId))}/status'), 'V27 request-id status API is missing')
expect(assistApi.includes('contentAssistEnhancedFingerprintSource'), 'V27 fingerprint source must match the enhanced request payload')
expect(editor.includes("crypto.subtle.digest('SHA-256'"), 'V27 recovery must calculate a browser SHA-256 fingerprint')
expect(editor.includes('contentAssistApi.listRecentEnhancedAssist()'), 'editor must load recent enhanced requests after restoration')
expect(editor.includes('contentAssistApi.getEnhancedAssistStatusByRequestId'), 'editor must reconcile recovered requests by request ID')
expect(editor.includes('matchesCurrentDraft: Boolean(matched'), 'editor must only mark matching fingerprints recoverable')
expect(editor.includes('系统不会展示、覆盖或自动采纳'), 'non-matching recovery records must remain read-only')
expect(!recoveryBlock.includes('safeStorage.'), 'V27 recovery must not persist request IDs, idempotency keys, or drafts to browser storage')
expect(!recoveryBlock.includes('router.'), 'V27 recovery must not place request IDs or drafts in the URL')
expect(workspace.includes("item.benefitCode === 'AI_ASSIST_QUOTA' ? 'AI 增强待确认'"), 'AI quota reservations need a distinct user-facing status')
expect(workspace.includes('to="/editor"'), 'AI recovery entrypoint must navigate to the editor without parameters')
expect(operationsApi.includes("'/api/v1/content-assist/admin/enhanced/exceptions'"), 'V27 operations exception API is missing')
expect(operationsApi.includes("'/api/v1/content-assist/admin/enhanced/reconcile'"), 'V27 operations reconcile API is missing')
expect(adminView.includes("key: 'ai-fulfillment'"), 'V27 operations workspace tab is missing')
expect(adminView.includes('dryRun: true'), 'V27 operations workspace must provide a dry-run reconciliation path')
expect(adminView.includes('dryRun: false'), 'V27 operations workspace must provide a separately armed recovery path')
expect(adminView.includes('aiReconcileArmed.value'), 'V27 actual reconciliation must require a completed dry-run')
expect(!adminView.includes('localStorage'), 'V27 operations workspace must not persist reconciliation identifiers in browser storage')
expect(!adminView.includes('sessionStorage'), 'V27 operations workspace must not persist reconciliation identifiers in browser storage')

console.log('V27 AI entitlement recovery guard passed.')
