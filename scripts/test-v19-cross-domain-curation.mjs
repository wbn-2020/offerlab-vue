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
  util,
  sectionIdentity,
  topicDetailApi,
  operationsApi,
  topicView,
  adminView,
  slotCard,
  packageJsonRaw,
] = await Promise.all([
  read('src/utils/curationDomainComposition.ts'),
  read('src/utils/topicSectionIdentity.ts'),
  read('src/api/topicDetail.ts'),
  read('src/api/operations.ts'),
  read('src/views/TopicDetailView.vue'),
  read('src/views/AdminOperationsView.vue'),
  read('src/components/operations/OperationSlotCard.vue'),
  read('package.json'),
])
const pkg = JSON.parse(packageJsonRaw)

// --- 守卫自身必须挂进链 ---
assert(
  pkg.scripts['test:v19-cross-domain-curation'] === 'node scripts/test-v19-cross-domain-curation.mjs',
  'package.json must expose the V19 cross-domain curation guard',
)
includes(pkg.scripts['pretest:guards'], 'test:v19-cross-domain-curation', 'pretest:guards chain')

// --- util: 单一事实源 + 纯汇总零请求 ---
includes(util, "from './domains'", 'composition util (must reuse the domains source of truth)')
includes(util, 'summarizeCurationDomains', 'composition util')
includes(util, 'unknownCount', 'composition util (honest unknown counting)')
excludes(util, 'fetch(', 'composition util (no requests)')
excludes(util, 'XMLHttpRequest', 'composition util (no requests)')
excludes(util, 'setInterval', 'composition util (no polling)')
excludes(util, 'INVESTMENT', 'composition util (no channel-specific special casing)')
for (const hardcodedChannel of ['科技数码', '职场经验', '学习成长', '生活方式', '投资理财']) {
  excludes(util, hardcodedChannel, 'composition util (labels come from domains.ts, not local copies)')
}

// --- 适配层: topicScope 只认后端派生两态 ---
includes(topicDetailApi, 'topicScope', 'topicDetail adapter')
includes(topicDetailApi, "raw === 'DOMAIN' || raw === 'CROSS_DOMAIN'", 'topicDetail adapter (strict two-state scope)')
assert(
  (topicDetailApi.match(/domain\?: number \| null/g) || []).length >= 2,
  'public and remote curated topic DTOs must both preserve nullable domain',
)
includes(topicDetailApi, 'domain: raw.domain', 'published curated topic adapter must preserve domain')
includes(topicDetailApi, 'domain: raw?.domain', 'unavailable curated topic adapter must preserve nullable domain')
includes(operationsApi, "raw === 'DOMAIN' || raw === 'CROSS_DOMAIN'", 'operations adapter (strict two-state scope)')
includes(operationsApi, 'topicScope: topic.topicScope', 'operations save payload must carry the explicit scope')
includes(operationsApi, "topic.topicScope === 'CROSS_DOMAIN' ? null : topic.domain", 'cross-domain save must pin domain to null')
includes(operationsApi, 'persistCandidate: false', 'candidate hints must remain validation-only')
excludes(operationsApi, 'persistCandidate: true', 'candidate hints must not write before the final topic save')
includes(operationsApi, "status: 'ACTIVE'", 'validated candidates must use a backend-supported topic item status')
excludes(operationsApi, "status: 'DRAFT'", 'topic item payloads must not use the unsupported DRAFT status')

// --- 收录阻断: 两条人话文案 + 阻断即拒绝 ---
includes(operationsApi, 'DOMAIN_MISMATCH_FOR_SCOPED_TOPIC', 'candidate block copy map')
includes(operationsApi, 'POST_DOMAIN_UNKNOWN', 'candidate block copy map')
includes(operationsApi, '频道不匹配：单频道专题不能收录其他频道内容', 'candidate block copy (mismatch)')
includes(operationsApi, '该内容暂无频道归属', 'candidate block copy (unknown domain)')
includes(operationsApi, 'describeCandidateBlock(selected.blockReasons)', 'blocked candidates must be rejected, not silently added')
includes(operationsApi, '候选校验未返回匹配结果', 'missing validation results must fail closed')
excludes(operationsApi, 'remoteCandidates[0] || candidate', 'candidate validation must never fall back to an unvalidated local item')
includes(operationsApi, "item?.operable === true ? 'eligible' : 'filtered'", 'candidate operability must fail closed')
includes(operationsApi, 'nonEmptyTopicItemList(section.items, section.contents)',
  'empty nested item arrays must fall back to the flat backend topic row')
includes(operationsApi, 'reasonText: nestedItems ? section.reasonText : undefined',
  'flat row reasons must stay attached to their content item')
includes(operationsApi, 'reasonText: item.reasonText,',
  'topic save payloads must preserve each item reason independently')
excludes(operationsApi, 'item.reasonText || section.reasonText',
  'topic save payloads must not copy the first item reason across a section')
includes(operationsApi, 'sectionKey: section.key', 'topic section payload must preserve stable section identity')
includes(operationsApi, 'expectedDraftRevision', 'topic writes must carry the server draft revision')
includes(operationsApi, 'Number(saved.draftRevision) <= expectedDraftRevision',
  'topic saves must reject responses without an advanced server revision')
includes(operationsApi, 'adaptTopicPublishCheck(res.data, topicId)',
  'publish checks must pass strict runtime adaptation')
includes(operationsApi, "String(value.topicId ?? '') !== String(expectedTopicId)",
  'publish checks must bind to the requested topic id')
includes(operationsApi, 'validDraftRevision(value.draftRevision)',
  'publish checks must reject malformed server revisions')
includes(operationsApi, 'legacyTopicSectionKey(title, sortFallback)',
  'admin topic adapter must use a backend-compatible legacy section key')
excludes(operationsApi, 'legacy-title:', 'admin topic adapter must not emit invalid colon section keys')
includes(topicDetailApi, 'legacyTopicSectionKey(title, index + 1)',
  'public topic adapter must use the shared legacy section identity')
includes(topicDetailApi, 'reasonText: undefined',
  'public logical sections must not borrow a content-item reason')
excludes(topicDetailApi, 'legacy-title:', 'public topic adapter must not emit invalid colon section keys')

// --- 专题页: 跨频道身份 + 构成汇总 + CTA 不预填 ---
includes(topicView, '跨频道专题', 'topic view cross-domain chip')
includes(topicView, '每篇内容保留其原频道', 'topic view honest boundary copy')
includes(topicView, 'summarizeCurationDomains', 'topic view must reuse the composition util')
includes(topicView, "curatedTopic.value?.topicScope === 'CROSS_DOMAIN'", 'topic view must read the derived scope, not infer from domain')
includes(topicView, "curatedTopic.value?.topicScope === 'DOMAIN'", 'single-domain curated CTA must require explicit scope')
includes(topicView, 'curatedTopic.value.domain', 'single-domain curated CTA must use the backend topic domain')
includes(topicView, 'posts.value[0]?.domain', 'ordinary community topics must retain first-post domain fallback')
includes(topicView, 'getDomainLabelSafe', 'composition rendering must use the safe label helper')
includes(topicView, "isKnownDomain(item.post?.domain)", 'curated items must keep per-post channel badges, gated honestly')

// --- 管理侧: 显式二选一 ---
includes(adminView, '单频道（选择频道）', 'admin editor explicit scope choice')
includes(adminView, '跨频道（全站）', 'admin editor explicit scope choice')
includes(adminView, '收录不改变内容的频道归属', 'admin editor cross-domain explainer')
includes(adminView, 'DOMAIN_OPTIONS', 'admin editor channel options come from domains.ts')
includes(adminView, 'selectedTopicSavedFingerprint', 'admin editor persisted draft fingerprint')
includes(adminView, 'selectedTopicSavedCandidateScopeFingerprint', 'admin editor persisted candidate-scope fingerprint')
includes(adminView, 'topicPublishCheckFingerprint', 'admin editor publish-check fingerprint')
includes(adminView, '!selectedTopicDirty.value', 'admin editor dirty draft gate')
includes(adminView, '!selectedTopicCandidateScopeDirty.value', 'candidate validation must use the persisted topic scope')
includes(adminView, 'selectedTopicPublishReady.value', 'admin editor current publish-check gate')
includes(adminView, 'selectedTopicHasEmptySection', 'empty local sections must not be saved without content')
includes(adminView, 'removeEmptyTopicSection', 'empty sections must have a recovery path')
includes(adminView, 'removeTopicItem', 'scope narrowing must let operators remove off-channel draft items')
includes(adminView, 'topicItemDomainLabel', 'topic draft items must expose their original channel')
includes(adminView, 'selectedTopicCandidateTargetValid', 'candidate saves must target the only empty section')
includes(adminView, 'selectedTopicCandidateDraftValid', 'candidate saves must not include unrelated dirty draft fields')
includes(adminView, 'normalizeTopicDraftOrder', 'topic saves must normalize the backend global item ordering')
includes(adminView, 'normalizeTopicDraftOrder(draft)', 'manual draft saves must persist normalized ordering')
includes(adminView, 'normalizeTopicDraftOrder(nextTopic)', 'candidate draft saves must persist normalized ordering')
includes(adminView, 'key: section.key', 'draft fingerprint must include logical section identity')
includes(adminView, 'String(topicPublishCheck.value.topicId)', 'publish check must bind to the selected topic')
includes(adminView, "topic.status === 'ARCHIVED'", 'archived topics must remain read-only')
includes(adminView, 'const requestId = ++refreshRequestId', 'refresh results must use latest-request ownership')
includes(adminView, 'requestId !== refreshRequestId', 'stale refresh results must not commit')
includes(adminView, 'const requestId = ++topicDetailRequestId', 'topic detail reads must use latest-request ownership')
includes(adminView, 'requestId !== topicDetailRequestId', 'stale topic detail results must not commit')
includes(adminView, 'clearTopicPublishCheck()\n  loadError.value = \'\'',
  'a new publish check must clear any previous passing result before requesting')
assert(
  adminView.indexOf('await operationsApi.addTopicCandidateToSection')
    < adminView.indexOf('await operationsApi.saveOperationTopicDraft(nextTopic)'),
  'candidate validation must finish before the single final topic draft write',
)
const candidateFlow = adminView.slice(
  adminView.indexOf('const addCandidateToSelectedTopic'),
  adminView.indexOf('const removeSlotItemFromHomeFeatured'),
)
includes(candidateFlow, '!canAddCandidateToSelectedTopic(item)',
  'candidate flow must pass through the strict candidate draft gate')

// --- 入口卡: 跨频道中性标注 ---
includes(slotCard, "item.topicScope === 'CROSS_DOMAIN'", 'slot card cross-domain chip condition')
includes(slotCard, '跨频道', 'slot card cross-domain chip copy')

// --- 红线词面扫描（新增/改动面） ---
for (const [name, text] of [
  ['curationDomainComposition.ts', util],
  ['topicDetail.ts', topicDetailApi],
  ['operations.ts', operationsApi],
  ['TopicDetailView.vue', topicView],
  ['AdminOperationsView.vue', adminView],
  ['OperationSlotCard.vue', slotCard],
]) {
  for (const forbidden of ['已验证', '平台认证', '权威推荐', '专家背书', '付费曝光', '荐股', '保本承诺']) {
    excludes(text, forbidden, `${name} (red-line copy)`)
  }
}

// --- 转译执行纯函数，验证计数/排序/未知域诚实 ---
const domainsStub = 'export const isKnownDomain = (domain) => { const v = Number(domain); return Number.isFinite(v) && v >= 1 && v <= 5 }'
const domainsStubUrl = `data:text/javascript;base64,${Buffer.from(domainsStub).toString('base64')}`
const transpiled = typescript.transpileModule(util, {
  compilerOptions: {
    module: typescript.ModuleKind.ESNext,
    target: typescript.ScriptTarget.ES2022,
  },
}).outputText.replaceAll("'./domains'", `'${domainsStubUrl}'`)
const utilModule = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`
)
const { summarizeCurationDomains } = utilModule

const transpiledIdentity = typescript.transpileModule(sectionIdentity, {
  compilerOptions: {
    module: typescript.ModuleKind.ESNext,
    target: typescript.ScriptTarget.ES2022,
  },
}).outputText
const identityModule = await import(
  `data:text/javascript;base64,${Buffer.from(transpiledIdentity).toString('base64')}`
)
const firstLegacyKey = identityModule.legacyTopicSectionKey('同名章节', 1)
assert(firstLegacyKey === identityModule.legacyTopicSectionKey('同名章节', 2),
  'legacy section identity must remain stable for the same title')
assert(firstLegacyKey !== identityModule.legacyTopicSectionKey('另一个章节', 1),
  'different legacy section titles should receive different identities')
assert(/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/.test(firstLegacyKey),
  'legacy section identity must satisfy the backend sectionKey code contract')
assert(identityModule.nonEmptyTopicItemList([], [],) === null,
  'empty nested item arrays must not hide a flat backend row')
const nestedItems = [{ id: 1 }]
assert(identityModule.nonEmptyTopicItemList(nestedItems, []) === nestedItems,
  'non-empty nested item arrays must be preserved')

const empty = summarizeCurationDomains([])
assert(empty.total === 0 && empty.byDomain.length === 0 && empty.unknownCount === 0,
  'empty item list must summarize to zero without fabrication')

const mixed = summarizeCurationDomains([
  { post: { domain: 1 } },
  { post: { domain: 1 } },
  { post: { domain: 2 } },
  { post: { domain: 5 } },
  { post: { domain: null } },
  {},
])
assert(mixed.total === 6, 'total must count every loaded item')
assert(mixed.unknownCount === 2, 'items without a known domain must be counted honestly')
assert(mixed.byDomain.length === 3, 'known-domain groups must be counted per channel')
assert(mixed.byDomain[0].domain === 1 && mixed.byDomain[0].count === 2,
  'byDomain must sort by count descending')
assert(mixed.byDomain[1].domain === 2 && mixed.byDomain[2].domain === 5,
  'equal counts must sort by domain ascending for stability')

const descending = summarizeCurationDomains([
  { post: { domain: 3 } },
  { post: { domain: 3 } },
  { post: { domain: 2 } },
])
assert(descending.byDomain[0].domain === 3 && descending.byDomain[0].count === 2,
  'the most frequent channel must lead the composition')

console.log('V19 cross-domain curation guards passed.')
