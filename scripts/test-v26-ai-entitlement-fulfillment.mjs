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
const incentiveApi = read('src/api/incentives.ts')
const workspace = read('src/components/incentive/CommunityGrowthGovernanceWorkspace.vue')
const growth = read('src/views/CommunityGrowthView.vue')

expect(assistApi.includes("'/api/v1/content-assist/enhanced'"), 'V26 enhanced content-assist endpoint is missing')
expect(assistApi.includes("'Idempotency-Key'"), 'V26 enhanced request must send an Idempotency-Key')
expect(assistApi.includes("'/api/v1/content-assist/enhanced/status'"), 'V26 status reconciliation endpoint is missing')
expect(editor.includes('runExplicitAiEnhancement'), 'editor explicit AI enhancement action is missing')
expect(editor.includes('scheduleStageThreeAssist'), 'editor free-rule scheduling must remain present')
expect(editor.includes('contentAssistApi.getEditorAssist(buildStageThreeAssistRequest())'), 'free-rule editor assist path is missing')
expect(editor.includes('contentAssistApi.enhanceEditorAssist(request, idempotencyKey)'), 'explicit AI action must use the atomic enhanced endpoint')
expect(editor.includes('explicitAiState.value = \'reconciling\''), 'unknown outcome must enter reconciliation state')
expect(editor.includes('outcomeMayBeUnknown'), 'explicit AI must distinguish unknown transport outcomes from business rejections')
expect(editor.includes('stageThreeAssistRequestId += 1'), 'paid AI action must invalidate in-flight free-rule responses')
expect(editor.includes('AI 服务处理'), 'explicit AI action must disclose the external data transfer boundary')
expect(!workspace.includes('消费 1 次'), 'generic entitlement consumption button must be removed')
expect(!incentiveApi.includes('consumeEntitlement:'), 'generic entitlement consume API must be removed')
expect(workspace.includes('getMyEntitlementUsages'), 'entitlement workspace must show real usage records')
expect(workspace.includes("item.status === 'ACTIVE'"), 'revoked entitlement must not expose an AI entrypoint')
expect(growth.includes("order?.status === 'DELIVERED'"), 'delivered order must refresh entitlement workspace')
expect(growth.includes('getBenefitOrderStatus(idempotencyKey)'), 'ambiguous benefit order outcome must reconcile through the status API')
expect(growth.includes('sessionSet(key, idempotencyKey'), 'benefit order retry must retain the same idempotency key')

console.log('V26 AI entitlement fulfillment guard passed.')
