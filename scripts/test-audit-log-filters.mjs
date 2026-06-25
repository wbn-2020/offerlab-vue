import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const opsApi = readFileSync(new URL('../src/api/ops.ts', import.meta.url), 'utf8')
const view = readFileSync(new URL('../src/views/AdminGovernanceView.vue', import.meta.url), 'utf8')

assert.match(opsApi, /createTime\?:\s*string/, 'AdminAuditLog must expose createTime')
assert.match(opsApi, /pageAuditLogs/, 'ops API must expose paged audit log query')
assert.match(opsApi, /operatorUid\?:\s*ApiId/, 'paged audit query must support operatorUid')
assert.match(opsApi, /startDate\?:\s*string/, 'paged audit query must support startDate')
assert.match(opsApi, /endDate\?:\s*string/, 'paged audit query must support endDate')
assert.match(opsApi, /PaginatedResponse<AdminAuditLog>/, 'paged audit query must return a paginated response')
assert.match(opsApi, /\/api\/v1\/ops\/audit-logs\/page/, 'paged audit query must call the backend page endpoint')

assert.match(view, /auditFilters = reactive\(\{ action: '', resourceType: '', operatorUid: '', startDate: '', endDate: '' \}\)/, 'Governance view must keep audit filters')
assert.match(view, /auditPage = ref\(1\)/, 'Governance view must keep audit page state')
assert.match(view, /auditPageSize = ref\(20\)/, 'Governance view must keep audit page size state')
assert.match(view, /auditTotal = ref\(0\)/, 'Governance view must show total audit count')
assert.match(view, /auditHasMore = ref\(false\)/, 'Governance view must track next page availability')
assert.match(view, /opsApi\.pageAuditLogs\(auditQueryParams\(\)\)/, 'Governance view must load paged audit logs')
assert.match(view, /applyAuditFilters/, 'Governance view must apply audit filters')
assert.match(view, /changeAuditPage/, 'Governance view must support audit pagination')
assert.match(view, /type="date"/, 'Governance view must expose date range filters')
assert.match(view, /操作者编号/, 'Governance view must expose operator filter')
assert.match(view, /formatTime\(item\.createTime\)/, 'Governance view must show audit create time')
assert.match(view, /<th>序号<\/th><th>ID<\/th>/, 'Governance view must show an audit row number column before ID')
assert.match(view, /auditRowNumber\(index\)/, 'Governance view must render server-page-aware audit row numbers')
assert.match(view, /\(auditPage\.value - 1\) \* auditPageSize\.value \+ index \+ 1/, 'Audit row numbers must be calculated from server pagination state')
assert.match(view, /auditRangeText/, 'Governance view must show the visible audit row range')
assert.match(view, /共 \{\{ auditTotal \}\} 条/, 'Governance view must show total audit count in pagination')
assert.match(view, /每页 \{\{ auditPageSize \}\} 条/, 'Governance view must show audit page size')
assert.match(view, /第 \{\{ auditPage \}\} \/ \{\{ auditPageCount \}\} 页/, 'Governance view must show current audit page and page count')

console.log('audit log filter guard passed')
