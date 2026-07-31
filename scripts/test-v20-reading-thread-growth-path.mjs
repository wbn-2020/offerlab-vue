import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const typescript = require('typescript')
const scriptDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(scriptDir, '..')

const read = (relativePath) => readFile(resolve(root, relativePath), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
const includes = (text, fragment, label) => {
  assert(text.includes(fragment), `${label} must contain ${fragment}`)
}
const excludes = (text, fragment, label) => {
  assert(!text.includes(fragment), `${label} must not contain ${fragment}`)
}

const [
  growth,
  profileView,
  threadPanel,
  relationsApi,
  postDetail,
  clientApi,
  growthApi,
  collaborationApi,
  incentivesApi,
  packageJson,
] = await Promise.all([
  read('src/utils/growthPath.ts'),
  read('src/views/GrowthProfileView.vue'),
  read('src/components/post/ReadingThreadPanel.vue'),
  read('src/api/knowledgeRelations.ts'),
  read('src/views/PostDetailView.vue'),
  read('src/api/client.ts'),
  read('src/api/growth.ts'),
  read('src/api/collaboration.ts'),
  read('src/api/incentives.ts'),
  read('package.json'),
])
const pkg = JSON.parse(packageJson)

// ---------------------------------------------------------------- V20-A 阅读脉络
includes(threadPanel, '先读', 'reading thread panel upstream copy')
includes(threadPanel, '接着读', 'reading thread panel downstream copy')
includes(threadPanel, 'isKnownDomain', 'reading thread panel domain gating')
// 截断必须诚实告知，不能静默裁剪。
includes(threadPanel, 'truncated', 'reading thread panel truncation state')
includes(threadPanel, '经审核确认', 'reading thread panel governance copy')
includes(threadPanel, "relationLabel(node.relationType, 'upstream')", 'upstream relation copy must be direction-aware')
includes(threadPanel, "relationLabel(node.relationType, 'downstream')", 'downstream relation copy must be direction-aware')
includes(threadPanel, '以本篇为前置', 'downstream prerequisite copy')
includes(threadPanel, '被本篇替代', 'upstream supersession copy')
// 不得把参考路线说成官方/必读（无认证权威红线）。
includes(threadPanel, '不是官方规定的必读顺序', 'reading thread panel non-authority copy')
// 只读面板：不得出现任何写路径。
for (const write of ['client.post', 'client.put', 'client.delete', 'propose(']) {
  excludes(threadPanel, write, 'reading thread panel (read-only)')
}
// 域标签必须先过 isKnownDomain 门控，绝不兜底成某个频道（频道明确红线）。
excludes(threadPanel, 'DOMAIN.TECH', 'reading thread panel (no channel fallback)')
includes(threadPanel, 'thread.value = null', 'reading thread panel must clear the previous route immediately')
includes(threadPanel, 'targetRequestId === requestId', 'reading thread panel latest-wins ownership')
includes(threadPanel, 'String(props.postId || \'\') === targetPostId', 'reading thread panel route ownership')
includes(threadPanel, 'onBeforeUnmount', 'reading thread panel unmount invalidation')
includes(threadPanel, "immediate: true, flush: 'sync'", 'reading thread panel synchronous route reset')
excludes(threadPanel, 'onMounted(load)', 'reading thread panel must use one immediate watcher instead of duplicate mount loading')
assert(
  threadPanel.indexOf('thread.value = null') < threadPanel.indexOf('await knowledgeRelationApi.thread'),
  'reading thread panel must clear stale content before awaiting the next route request',
)

// 挂载点：READING 频道门控 + 只在有 postId 时渲染。
includes(postDetail, 'ReadingThreadPanel', 'post detail thread panel mount')
includes(postDetail, 'DOMAIN.READING', 'post detail thread panel channel gate')

// 适配层：thread 契约存在，未知 relationType 不得静默当成合法类型。
includes(relationsApi, 'adaptThread', 'knowledge relations thread adapter')
includes(relationsApi, 'knowledge-relations/thread', 'knowledge relations thread endpoint')
includes(relationsApi, 'THREAD_RELATION_TYPES', 'knowledge relations chain type whitelist')
includes(relationsApi, 'normalizeConfirmedRelationType', 'knowledge relations enum contract normalization')
includes(relationsApi, '.toUpperCase()', 'lowercase backend enum values must normalize before matching')
// 未知/侧向 relationType 必须落成 null 并被过滤掉，不得静默当成合法链式类型。
includes(relationsApi, 'normalizeThreadRelationType(raw?.relationType)', 'knowledge relations unknown type handling')
includes(relationsApi, 'node.relationType', 'knowledge relations node filter')
// 域绝不兜底：非数字一律 null（频道明确红线）。
includes(relationsApi, "typeof raw?.domain === 'number' ? raw.domain : null", 'knowledge relations honest domain')

const transpiledRelations = typescript.transpileModule(relationsApi, {
  compilerOptions: {
    module: typescript.ModuleKind.ESNext,
    target: typescript.ScriptTarget.ES2022,
  },
}).outputText.replace("import client from './client';", 'const client = {};')
const relationsModule = await import(
  `data:text/javascript;base64,${Buffer.from(transpiledRelations).toString('base64')}`,
)
assert(
  relationsModule.normalizeConfirmedRelationType('prerequisite_of') === 'PREREQUISITE_OF',
  'lowercase backend relation enums must normalize to the frontend whitelist',
)
assert(
  relationsModule.normalizeThreadRelationType('continues') === 'CONTINUES',
  'lowercase backend chain enums must survive the thread adapter',
)
assert(
  relationsModule.normalizeThreadRelationType('supplements') === null,
  'lateral relation enums must stay out of the reading thread',
)
assert(
  relationsModule.normalizeConfirmedRelationType('unknown_relation') === null,
  'unknown relation enums must be rejected instead of fabricated',
)

// ---------------------------------------------------------------- V20-B 成长路径
includes(growth, 'summarizeGrowthPath', 'growth path util')
includes(growth, 'GROWTH_PATH_STEPS', 'growth path step definitions')
includes(growth, 'TrustedGrowthPathSource', 'growth path trusted-source contract')
includes(growth, 'isTrustedGrowthPayload', 'growth path payload trust predicate')
includes(growth, 'isTrustedGrowthResult', 'growth path result-envelope trust predicate')
includes(growth, 'hasUntrustedGrowthMetadata', 'growth path nested payload degradation predicate')
includes(growth, 'toGrowthCount', 'growth path count normalization')
// 零请求：取数由页面负责。
for (const net of ['fetch(', 'XMLHttpRequest', 'axios', 'client.get']) {
  excludes(growth, net, 'growth path util (no network)')
}
includes(profileView, '成长路径', 'growth profile view growth path section')
includes(profileView, 'type SessionRequestOwner', 'growth profile request owner')
includes(profileView, 'requestId: number', 'growth profile request owner request id')
includes(profileView, 'uid: string', 'growth profile request owner uid')
includes(profileView, 'sessionQueryScope: number', 'growth profile request owner session scope')
includes(profileView, 'sessionOwnerIsCurrent(owner, growthPathRequestId)', 'growth path latest-session ownership')
includes(profileView, 'sessionOwnerIsCurrent(owner, profileRequestId)', 'profile latest-session ownership')
includes(profileView, 'isTrustedGrowthResult(result.value)', 'growth profile trusted result-envelope mapping')
includes(profileView, 'isUsableNestedGrowthObject', 'growth profile nested page validation')
excludes(profileView, 'withTrustedGrowthMetadata', 'growth profile must not mutate payload shape to add provenance')
includes(profileView, 'trusted: true', 'growth profile trusted evidence construction')
includes(profileView, 'if (totalBalance === null) return null', 'reputation totals must reject unavailable balances')
includes(profileView, 'if (availableBalance === null) return null', 'point totals must reject unavailable balances')
const pathOwnerCheckIndex = profileView.indexOf('if (!sessionOwnerIsCurrent(owner, growthPathRequestId)) return')
const pathCommitIndex = profileView.indexOf('pathSources.value = {', pathOwnerCheckIndex)
assert(pathOwnerCheckIndex >= 0 && pathCommitIndex > pathOwnerCheckIndex,
  'growth path sources must only commit after the current owner check')
const pathFinallyStart = profileView.indexOf('} finally {', pathCommitIndex)
const pathFinallyEnd = profileView.indexOf('const trustedProfilePathSource', pathFinallyStart)
const pathFinally = profileView.slice(pathFinallyStart, pathFinallyEnd)
includes(pathFinally, 'sessionOwnerIsCurrent(owner, growthPathRequestId)', 'growth path loading close ownership')
const growthPathMarkupIndex = profileView.indexOf('id="growth-path"')
const profileOnlyTailIndex = profileView.indexOf('<template v-if="profile && profile.domains.length">')
assert(
  growthPathMarkupIndex >= 0 && profileOnlyTailIndex > growthPathMarkupIndex,
  'growth path must render independently before profile-only curation/domain content',
)
const dayWatchStart = profileView.indexOf('watch(days')
const sessionWatchStart = profileView.indexOf('watch(', dayWatchStart + 1)
const dayWatch = profileView.slice(dayWatchStart, sessionWatchStart)
excludes(dayWatch, 'loadGrowthPathSources', 'day-window changes must not refetch period-independent path sources')
// 边界文案：只反映记录、不代表资质、不做跨用户对比。措辞须避开红线词
// （等级/排名等），否则 test-v3-creator-feedback-guards 的整文件扫描会红。
includes(profileView, '不代表资质', 'growth profile view boundary copy')
includes(profileView, '不与任何人对比', 'growth profile view no-comparison copy')
// 声望边界文案由 growthPath.ts 的步骤 hint 承载，页面通过 step.hint 渲染（单一事实源）。
includes(growth, '不可消费', 'growth path reputation boundary copy')
includes(profileView, 'step.hint', 'growth profile view must render step hints')

// 可信来源必须由 API adapter 写入 Result envelope；页面不得自行猜测。
includes(clientApi, 'withRemoteResultProvenance', 'remote result provenance adapter')
includes(clientApi, 'const rawSources = [result.source, metadata?.source]',
  'remote provenance must reject conflicting envelope and payload markers')
includes(growthApi, 'withRemoteResultProvenance', 'growth API result provenance')
includes(growthApi, 'isGrowthProfilePathPayloadShape',
  'growth profile path provenance must validate the raw backend shape')
includes(growthApi, "fallbackReason: 'malformed_growth_profile'",
  'malformed growth profiles must be unavailable to the growth path')
includes(growthApi, "source: 'demo'", 'growth demo provenance')
includes(growthApi, "source: 'unavailable'", 'growth unavailable provenance')
includes(collaborationApi, 'remoteRequestResult<PageResult<CollaborationNeed>>', 'collaboration growth-source provenance')
for (const method of [
  'getMySummary',
  'getMyLedger',
  'getMyEntitlements',
  'getMyThanks',
  'getMyBounties',
  'getMyRoles',
]) {
  const methodStart = incentivesApi.indexOf(`${method}:`)
  const methodEnd = incentivesApi.indexOf('\n\n', methodStart)
  includes(incentivesApi.slice(methodStart, methodEnd), 'remoteResult(', `${method} provenance`)
}

// ---------------------------------------------------------------- 红线负向扫描
// 只扫真正会渲染给用户的文本：注释里"不做排名/不代表资质"这类禁令描述必须先剥掉，
// 否则守卫会把红线约束的说明本身当成违规。
const stripComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')

const redlines = ['排名', '超越', '百分位', '官方认证', '权威推荐', '专家背书', '付费解锁']
for (const [label, text] of [
  ['growth path util', growth],
  ['reading thread panel', threadPanel],
  ['growth profile view', profileView],
]) {
  const rendered = stripComments(text)
  for (const redline of redlines) excludes(rendered, redline, `${label} (redline)`)
}

// ---------------------------------------------------------------- 转译执行：三态语义
const transpiled = typescript.transpileModule(growth, {
  compilerOptions: {
    module: typescript.ModuleKind.ESNext,
    target: typescript.ScriptTarget.ES2022,
  },
}).outputText
const growthModule = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`,
)
const {
  summarizeGrowthPath,
  GROWTH_PATH_STEPS,
  hasUntrustedGrowthMetadata,
  isTrustedGrowthPayload,
  isTrustedGrowthResult,
  toGrowthCount,
} = growthModule

// 六步顺序与 PRODUCT.md L44-49 严格一致。
const expectedKeys = [
  'trusted-content',
  'co-build',
  'contribution-records',
  'domain-reputation',
  'virtual-benefits',
  'community-roles',
]
assert(
  GROWTH_PATH_STEPS.map((step) => step.key).join(',') === expectedKeys.join(','),
  'growth path step order must match PRODUCT.md six-step path',
)

const allNull = {
  windowDays: 30,
  posts: null,
  coBuild: null,
  records: null,
  reputation: null,
  perks: null,
  roles: null,
}
const unavailableAll = summarizeGrowthPath(allNull)
assert(unavailableAll.length === 6, 'summary must always return six steps')
assert(
  unavailableAll.every((step) => step.state === 'unavailable'),
  'missing sources must all be unavailable, never empty',
)

const emptyAll = summarizeGrowthPath({
  windowDays: 30,
  posts: { trusted: true, windowPostCount: 0 },
  coBuild: { trusted: true, claimedCount: 0, createdCount: 0 },
  records: { trusted: true, ledgerCount: 0 },
  reputation: { trusted: true, reputationDomainCount: 0, pointBalance: 0 },
  perks: { trusted: true, entitlementCount: 0, thanksReceivedCount: 0, bountySubmissionCount: 0 },
  roles: { trusted: true, grantCount: 0, applicationCount: 0 },
})
assert(emptyAll.every((step) => step.state === 'empty'), 'zero records must be empty')

const activeAll = summarizeGrowthPath({
  windowDays: 30,
  posts: { trusted: true, windowPostCount: 2 },
  coBuild: { trusted: true, claimedCount: 1, createdCount: 0 },
  records: { trusted: true, ledgerCount: 5 },
  reputation: { trusted: true, reputationDomainCount: 1, pointBalance: 10 },
  perks: { trusted: true, entitlementCount: 1, thanksReceivedCount: 2, bountySubmissionCount: 0 },
  roles: { trusted: true, grantCount: 1, applicationCount: 1 },
})
assert(activeAll.every((step) => step.state === 'active'), 'existing records must be active')
assert(
  activeAll.every((step) => step.evidence.length > 0),
  'active steps must carry evidence lines',
)

// 未经 trusted 标记的非零数据也必须 unavailable，不能把 demo/degraded 数字冒充个人记录。
const untrustedPosts = summarizeGrowthPath({
  ...allNull,
  posts: { trusted: false, windowPostCount: 3 },
})
assert(untrustedPosts[0].state === 'unavailable', 'untrusted non-zero posts must not become active')

assert(isTrustedGrowthPayload(null) === false, 'null payload must be unavailable')
assert(isTrustedGrowthPayload({ degraded: true, total: 0 }) === false, 'degraded payload must be unavailable')
assert(isTrustedGrowthPayload({ degraded: 'true', total: 0 }) === false,
  'malformed degraded markers must not be treated as authoritative')
assert(isTrustedGrowthPayload({ source: 'fallback-demo', total: 3 }) === false, 'demo/fallback source must be unavailable')
assert(isTrustedGrowthPayload({ fallbackReason: 'upstream_timeout', total: 0 }) === false, 'fallback reason must be unavailable')
assert(isTrustedGrowthPayload({ fallbackReason: { code: 'timeout' }, total: 0 }) === false,
  'non-string fallback metadata must be unavailable')
assert(isTrustedGrowthPayload({ source: { kind: 'remote' }, total: 0 }) === false,
  'malformed source metadata must be unavailable')
assert(isTrustedGrowthPayload([], 'local_demo_seed') === false, 'demo envelope must be unavailable')
assert(isTrustedGrowthPayload({ source: 'remote', degraded: false, total: 0 }) === true,
  'non-degraded remote zero payload must remain authoritative empty')
assert(isTrustedGrowthPayload({ total: 0 }) === false,
  'payloads missing source and degraded metadata must fail closed')
assert(isTrustedGrowthPayload({ source: 'remote', total: 0 }) === false,
  'payloads missing degraded metadata must fail closed')
assert(isTrustedGrowthPayload({ degraded: false, total: 0 }) === false,
  'payloads missing source metadata must fail closed')
assert(isTrustedGrowthResult({
  code: 0,
  message: 'success',
  data: [],
  source: 'remote',
  degraded: false,
}) === true, 'explicit non-degraded remote result envelope must be trusted')
assert(isTrustedGrowthResult({ code: 0, message: 'success', data: [] }) === false,
  'result envelopes missing provenance must fail closed')
assert(isTrustedGrowthResult({
  code: 0,
  message: 'success',
  data: [],
  source: 'remote',
}) === false, 'result envelopes missing degraded metadata must fail closed')
assert(isTrustedGrowthResult({
  code: 0,
  message: 'success',
  data: [],
  degraded: false,
}) === false, 'result envelopes missing source metadata must fail closed')
assert(isTrustedGrowthResult({
  code: 0,
  message: 'local_demo_seed',
  data: [],
  source: 'demo',
  degraded: true,
}) === false, 'demo result envelopes must remain unavailable')
assert(hasUntrustedGrowthMetadata({}) === false,
  'nested remote payloads may rely on their already-trusted result envelope')
assert(hasUntrustedGrowthMetadata({ degraded: true }) === true,
  'nested degraded payloads must be rejected')
assert(hasUntrustedGrowthMetadata({ source: 'fallback' }) === true,
  'nested fallback payloads must be rejected')
assert(toGrowthCount('3') === 3, 'numeric API long strings must normalize')
assert(toGrowthCount(null) === null, 'null counts must remain unavailable')
assert(toGrowthCount('') === null, 'empty-string counts must remain unavailable')
assert(toGrowthCount(-1) === null, 'negative counts must be rejected')
assert(toGrowthCount(1.5) === null, 'fractional counts must be rejected rather than rounded')
assert(toGrowthCount(Number.MAX_SAFE_INTEGER + 1) === null, 'unsafe integer counts must be rejected')
assert(toGrowthCount('not-a-number') === null, 'malformed counts must be rejected')

const malformedTrustedCount = summarizeGrowthPath({
  ...allNull,
  posts: { trusted: true, windowPostCount: 0.5 },
})
assert(
  malformedTrustedCount[0].state === 'unavailable',
  'trusted markers must not turn malformed counts into empty or active states',
)

// 声望步文案守住"不可消费/不代表资质"。
const reputationStep = activeAll.find((step) => step.key === 'domain-reputation')
assert(
  reputationStep.hint.includes('不可消费') && reputationStep.hint.includes('不代表专业资质'),
  'reputation step hint must keep the non-consumable / non-qualification boundary',
)
const perksStep = activeAll.find((step) => step.key === 'virtual-benefits')
assert(
  perksStep.hint.includes('不涉及真实货币'),
  'virtual benefits step hint must keep the no-real-money boundary',
)

// ---------------------------------------------------------------- 挂载进 guard 链
assert(
  pkg.scripts?.['test:v20-reading-thread-growth-path']
    === 'node scripts/test-v20-reading-thread-growth-path.mjs',
  'package.json must expose test:v20-reading-thread-growth-path',
)
includes(
  pkg.scripts?.['pretest:guards'] || '',
  'npm run test:v20-reading-thread-growth-path',
  'pretest:guards',
)

console.log('V20 reading thread + growth path guard passed')
