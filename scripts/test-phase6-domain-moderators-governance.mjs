import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const root = new URL('../', import.meta.url)
const readSource = (path) => readFileSync(new URL(path, root), 'utf8')

const governance = readSource('src/views/AdminGovernanceView.vue')
const opsApi = readSource('src/api/ops.ts')
const postApi = readSource('src/api/post.ts')
const interactionApi = readSource('src/api/interaction.ts')
const router = readSource('src/router/index.ts')
const adminPermissions = readSource('src/utils/adminPermissions.ts')
const appHeader = readSource('src/components/layout/AppHeader.vue')
const packageJson = JSON.parse(readSource('package.json'))

const assertSource = (source, pattern, message) => {
  assert.match(source, pattern, message)
}

const constBlock = (name) => {
  const marker = `const ${name}`
  const start = governance.indexOf(marker)
  assert.notEqual(start, -1, `AdminGovernanceView must define ${name}.`)
  const next = governance.indexOf('\nconst ', start + marker.length)
  return governance.slice(start, next === -1 ? governance.length : next)
}

const assertBlockIncludes = (block, pattern, message) => {
  assert.match(block, pattern, message)
}

const assertBlockExcludes = (block, pattern, message) => {
  assert.doesNotMatch(block, pattern, message)
}

assert.equal(
  packageJson.scripts['test:phase6-domain-moderators-governance'],
  'node scripts/test-phase6-domain-moderators-governance.mjs',
  'package.json must expose the Phase 6 governance guard script.',
)
assert.match(
  packageJson.scripts['test:guards'] || '',
  /test:phase6-domain-moderators-governance/,
  'npm run test:guards must include the Phase 6 governance guard.',
)

const adminLinksBlock = appHeader.match(/const adminLinks = computed\(\(\) => \{[\s\S]*?return links\s*\n\}\)/)
assert.ok(adminLinksBlock, 'AppHeader must keep adminLinks as the top-menu admin entry source.')

const governanceHeaderEntry = adminLinksBlock[0].match(/if\s*\(([\s\S]*?)\)\s*links\.push\(\{\s*to:\s*['"]\/admin\/governance['"]/)
assert.ok(governanceHeaderEntry, 'AppHeader adminLinks must expose a /admin/governance entry.')

assertSource(opsApi, /domainModerator:\s*boolean/, 'MyAdminPermissions must expose domainModerator: boolean.')
assertSource(opsApi, /moderatedDomains:\s*number\[\]/, 'MyAdminPermissions must expose moderatedDomains: number[].')
assertSource(adminPermissions, /AdminPermissionKey[\s\S]*domainModerator/, 'AdminPermissionKey must include domainModerator.')

assertSource(router, /path:\s*['"]\/admin\/governance['"][\s\S]*?component:\s*\(\)\s*=>\s*import\(['"]@\/views\/AdminGovernanceView\.vue['"]\)[\s\S]*?adminPermission:\s*\[[\s\S]*?['"]domainModerator['"][\s\S]*?\]/, '/admin/governance must route domainModerator users into AdminGovernanceView.')
assertSource(governanceHeaderEntry[1], /value\.domainModerator/, 'AppHeader governance-center entry must be visible to domainModerator.')

assertSource(postApi, /interface\s+DomainModerator/, 'post.ts must define a DomainModerator API type.')
assertSource(postApi, /uid:\s*ApiId/, 'DomainModerator must expose uid.')
assertSource(postApi, /domain:\s*number/, 'DomainModerator must expose domain.')
assertSource(postApi, /enabled:\s*boolean/, 'DomainModerator must expose enabled.')
assertSource(postApi, /listDomainModerators/, 'postApi must list domain moderators.')
assertSource(postApi, /addDomainModerator/, 'postApi must add or update domain moderators.')
assertSource(postApi, /updateDomainModeratorStatus/, 'postApi must enable or disable domain moderators.')
assertSource(postApi, /\/api\/v1\/posts\/admin\/domain-moderators/, 'postApi must call the backend domain moderator endpoint.')
assertSource(postApi, /domain\?:\s*number[^}]*\}\):\s*Promise<Result<PostReport\[\]>>/s, 'Post report admin list params must accept domain?: number.')
assertSource(interactionApi, /domain\?:\s*number[^}]*\}\):\s*Promise<Result<CommentReport\[\]>>/s, 'Comment report admin list params must accept domain?: number.')

assertSource(governance, /DOMAIN_OPTIONS/, 'AdminGovernanceView must use shared DOMAIN_OPTIONS for domain controls.')
assertSource(governance, /selectedGovernanceDomain/, 'AdminGovernanceView must keep selectedGovernanceDomain state.')
assertSource(governance, /domain-filter/, 'AdminGovernanceView must render a domain-filter control area.')
assertSource(governance, /canGlobalModerate\s*=\s*computed\(\(\)\s*=>\s*Boolean\([\s\S]*contentModerator[\s\S]*admin[\s\S]*\)\)/, 'AdminGovernanceView must distinguish global content moderation permissions.')
assertSource(governance, /canDomainModerate\s*=\s*computed\(\(\)\s*=>\s*Boolean\([\s\S]*domainModerator[\s\S]*moderatedDomains[\s\S]*length[\s\S]*\)\)/, 'AdminGovernanceView must require a non-empty domain scope for domain moderators.')
assertSource(governance, /canModerate\s*=\s*computed\(\(\)\s*=>\s*canGlobalModerate\.value\s*\|\|\s*canDomainModerate\.value\)/, 'canModerate must be derived from global or scoped domain permissions.')
assertSource(governance, /scope:\s*['"]globalModeration['"]/, 'Global-only moderation tabs must use globalModeration scope.')
assertSource(governance, /scope:\s*['"]domainModeration['"]/, 'Domain-safe moderation tabs must use domainModeration scope.')
assertSource(governance, /visibleTabs\s*=\s*computed\(\(\)\s*=>\s*tabs\.filter\(\(tab\)\s*=>\s*\{[\s\S]*tab\.scope\s*===\s*['"]ops['"][\s\S]*canOps\.value[\s\S]*tab\.scope\s*===\s*['"]globalModeration['"][\s\S]*canGlobalModerate\.value[\s\S]*tab\.scope\s*===\s*['"]domainModeration['"][\s\S]*canModerate\.value/s, 'visibleTabs must gate ops, global moderation, and domain moderation separately.')
assertSource(governance, /v-if="canGlobalModerate"[\s\S]*selectedGovernanceDomain === ''/, 'Only global moderators may select all-domain governance scope.')
assertSource(governance, /governanceDomainOptions\s*=\s*computed\(\(\)\s*=>\s*\{[\s\S]*moderatedDomains[\s\S]*DOMAIN_OPTIONS\.filter/s, 'AdminGovernanceView must derive domainModerator scope from moderatedDomains.')
assertSource(governance, /v-for="domain in governanceDomainOptions"/, 'AdminGovernanceView must render governanceDomainOptions in the domain filter.')
assertSource(governance, /normalizeGovernanceDomain\s*=\s*\(\)\s*=>\s*\{[\s\S]*governanceDomainOptions\.value/s, 'AdminGovernanceView must normalize domainModerator users to their allowed domain scope.')
assertSource(governance, /selectedDomainParam\s*=\s*computed\(\(\)\s*=>/, 'AdminGovernanceView must expose a selected domain request parameter.')
assertSource(governance, /canManageDomainModerators/, 'AdminGovernanceView must distinguish admin-only moderator management.')
assertSource(governance, /v-if="canManageDomainModerators"[\s\S]*toggleDomainModeratorStatus/s, 'Domain moderator enable/disable buttons must be admin-only.')
assertSource(governance, /:disabled="isSaving \|\| !canManageDomainModerators \|\| !moderatorForm\.uid"/, 'Domain moderator save button must be disabled for non-admin users.')
assertSource(governance, /saveDomainModerator\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*if\s*\(!canManageDomainModerators\.value\)[\s\S]*return/s, 'saveDomainModerator must guard non-admin users in code.')
assertSource(governance, /toggleDomainModeratorStatus\s*=\s*async\s*\(item:\s*DomainModerator\)\s*=>\s*\{[\s\S]*if\s*\(!canManageDomainModerators\.value\)\s*return/s, 'toggleDomainModeratorStatus must guard non-admin users in code.')

const refreshAllBlock = constBlock('refreshAll')
assertBlockIncludes(refreshAllBlock, /await loadPermissions\(\)[\s\S]*normalizeGovernanceDomain\(\)[\s\S]*ensureActiveTab\(\)/, 'refreshAll must normalize domain scope after permissions load and before data loaders.')
assertBlockIncludes(refreshAllBlock, /loadGlobalModerationData\(loaders\)/, 'refreshAll must delegate global-only moderation loading.')
assertBlockIncludes(refreshAllBlock, /loadDomainModerationData\(loaders\)/, 'refreshAll must delegate domain-safe moderation loading.')

const globalLoaderBlock = constBlock('loadGlobalModerationData')
assertBlockIncludes(globalLoaderBlock, /if\s*\(!canGlobalModerate\.value\)[\s\S]*clearGlobalModerationState\(\)[\s\S]*return/, 'Global moderation loader must no-op for domain-only moderators.')
assertBlockIncludes(globalLoaderBlock, /loadBackendReviewQueue\(false\)/, 'Only global moderators may load backend review queue.')
assertBlockIncludes(globalLoaderBlock, /opsApi\.listModerationKeywords/, 'Only global moderators may load moderation keywords.')
assertBlockIncludes(globalLoaderBlock, /opsApi\.listModerationHits/, 'Only global moderators may load moderation hits.')
assertBlockIncludes(globalLoaderBlock, /opsApi\.listModerationUsers/, 'Only global moderators may load user moderation states.')
assertBlockIncludes(globalLoaderBlock, /loadTopics\(false\)/, 'Only global moderators may load global topic governance.')
assertBlockIncludes(globalLoaderBlock, /loadTags\(false\)/, 'Only global moderators may load global tag governance.')

const domainLoaderBlock = constBlock('loadDomainModerationData')
assertBlockIncludes(domainLoaderBlock, /if\s*\(!canModerate\.value\)[\s\S]*clearDomainModerationState\(\)[\s\S]*return/, 'Domain moderation loader must no-op when no scoped moderation permission exists.')
assertBlockIncludes(domainLoaderBlock, /listAdminReports\(\{\s*status:\s*0,\s*limit:\s*50,\s*domain:\s*selectedDomainParam\.value/s, 'Post report loading must pass selected domain.')
assertBlockIncludes(domainLoaderBlock, /listAdminCommentReports\(\{\s*status:\s*0,\s*limit:\s*50,\s*domain:\s*selectedDomainParam\.value/s, 'Comment report loading must pass selected domain.')
assertBlockIncludes(domainLoaderBlock, /loadFeaturedPosts\(false\)/, 'Domain-safe loader must load featured content with domain scope.')
assertBlockIncludes(domainLoaderBlock, /loadDomainModerators\(false\)/, 'Domain-safe loader must load domain moderator list with domain scope.')
assertBlockExcludes(domainLoaderBlock, /opsApi\.listModerationKeywords|opsApi\.listModerationHits|opsApi\.listModerationUsers|loadBackendReviewQueue|loadTopics|loadTags|postApi\.listAdminTopics|postApi\.listAdminTags/, 'Domain-only moderators must not trigger global governance loaders.')

const backendQueueBlock = constBlock('loadBackendReviewQueue')
assertBlockIncludes(backendQueueBlock, /if\s*\(!canGlobalModerate\.value\)[\s\S]*reviewQueueSource\.value\s*=\s*['"]frontend-fallback['"][\s\S]*return/, 'Backend review queue must be unavailable to domain-only moderators.')
assertBlockIncludes(backendQueueBlock, /opsApi\.listReviewQueue/, 'Backend review queue should still be used for global content moderators.')
assertBlockExcludes(backendQueueBlock.replace(/if\s*\(!canGlobalModerate\.value\)[\s\S]*?return/, ''), /domain:\s*selectedDomainParam\.value/, 'Do not pretend backend review queue is domain-scoped unless the backend contract supports it.')

assertSource(governance, /loadHits\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*if\s*\(!canGlobalModerate\.value\)\s*return/s, 'Moderation hit loading must be global-only.')
assertSource(governance, /loadTopics\s*=\s*async\s*\(showToast = true\)\s*=>\s*\{[\s\S]*if\s*\(!canGlobalModerate\.value\)\s*return/s, 'Topic governance loading must be global-only.')
assertSource(governance, /loadTags\s*=\s*async\s*\(showToast = true\)\s*=>\s*\{[\s\S]*if\s*\(!canGlobalModerate\.value\)\s*return/s, 'Tag governance loading must be global-only.')
assertSource(governance, /saveKeyword\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*if\s*\(!canGlobalModerate\.value\)/s, 'Keyword changes must be global-only.')
assertSource(governance, /saveUserState\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*if\s*\(!canGlobalModerate\.value\)/s, 'User moderation changes must be global-only.')
assertSource(governance, /handleReviewQueueAction\s*=\s*async\s*\(item:\s*ReviewQueueItem,\s*action:\s*ReviewQueueAction\)\s*=>\s*\{[\s\S]*if\s*\(!canGlobalModerate\.value\)/s, 'Backend review queue actions must be global-only.')
assertSource(governance, /<RouterLink v-if="canOps \|\| canGlobalModerate" to="\/admin\/ops"/, 'Domain-only moderators must not see a global ops review link.')
assertSource(governance, /postApi\.list\(\{\s*featured:\s*true,\s*domain:\s*selectedDomainParam\.value/s, 'Featured post loading must pass selected domain.')
assertSource(governance, /postApi\.listDomainModerators\(\{\s*domain:\s*selectedDomainParam\.value/s, 'Domain moderator loading must pass selected domain.')

console.log('Phase 6 domain moderator governance guard passed.')
