import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const api = read('src/api/contentMaintenance.ts')
const workspace = read('src/views/AdminMaintenanceTasksView.vue')
const projectionApi = read('src/api/projectionHealth.ts')
const projectionTable = read('src/components/health/ProjectionHealthTable.vue')
const reconciliation = read('src/components/health/ReconciliationRunPanel.vue')

assert.match(api, /canReassign:\s*boolean/, 'maintenance DTO must expose server-authorized reassign capability')
assert.match(api, /ContentMaintenanceTaskReassignCmd/, 'maintenance API must define the explicit replacement command')
assert.match(api, /replacementUid:\s*ApiId[\s\S]*reason:\s*string/, 'reassign command must carry replacement uid and reason')
assert.match(api, /\/reassign`/, 'maintenance API must call the dedicated reassign endpoint')
assert.match(workspace, /v-if="task\.canReassign"/, 'reassign controls must be gated by the server capability flag')
assert.match(workspace, /contentMaintenanceApi\.reassign/, 'maintenance governance workspace must execute explicit reassignment')
assert.match(workspace, /replacementUid[\s\S]*reason/, 'reassign workbench must collect replacement uid and reason')
assert.doesNotMatch(workspace, /autoAssign|自动选择接替者|自动转派给/i, 'maintenance workbench must not invent automatic assignee selection')
assert.match(projectionApi, /slaMinutes[\s\S]*backlogCount[\s\S]*overdueCount[\s\S]*repairMode/, 'projection health API must expose V9 delivery and repair metadata')
assert.match(projectionApi, /appliedCount[\s\S]*rejectedCount/, 'projection reconcile results must expose reward inbox outcomes')
assert.match(projectionTable, /repairModeLabel/, 'projection workbench must explain repair modes')
assert.match(projectionTable, /超 SLA/, 'projection workbench must display overdue delivery counts')
assert.match(reconciliation, /执行诊断扫描[\s\S]*诊断扫描结果/, 'diagnostic projections must not be presented as account repair')
assert.match(reconciliation, /appliedCount[\s\S]*rejectedCount/, 'reward inbox reconciliation must display applied and rejected outcomes')

console.log('V9 role repair workbench guard passed.')
