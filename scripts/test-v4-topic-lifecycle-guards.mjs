import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')

const failures = []
const check = (condition, message) => {
  if (!condition) failures.push(message)
}
const has = (source, pattern, message) => check(pattern.test(source), message)
const missing = (source, pattern, message) => check(!pattern.test(source), message)
const hasText = (source, text, message) => check(source.includes(text), message)
const section = (source, start, end, name) => {
  const startIndex = source.indexOf(start)
  const endIndex = end ? source.indexOf(end, Math.max(0, startIndex) + start.length) : source.length
  check(startIndex !== -1, `${name} missing section start: ${start}`)
  check(endIndex !== -1, `${name} missing section end: ${end}`)
  return startIndex !== -1 && endIndex !== -1 ? source.slice(startIndex, endIndex) : ''
}

const packageJson = JSON.parse(read('package.json'))
const operationsApi = read('src/api/operations.ts')
const adminOperationsView = read('src/views/AdminOperationsView.vue')
const topicDetailApi = read('src/api/topicDetail.ts')
const topicDetailView = read('src/views/TopicDetailView.vue')
const operationController = read('../offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/controller/OperationCurationController.java')
const operationService = read('../offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/application/OperationCurationService.java')
const operationTopicDto = read('../offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/api/dto/OperationTopicDTO.java')
const operationTopicSectionDto = read('../offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/api/dto/OperationTopicSectionDTO.java')
const operationCandidateDto = read('../offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/api/dto/OperationCandidateDTO.java')
const publicContentFilter = read('../offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/api/PublicContentFilter.java')

const operationStatusType = section(operationsApi, 'export type OperationStatus', '\nexport type OperationResourceKind', 'OperationStatus type')
const operationActionType = section(operationsApi, 'export type OperationAction', '\n\nexport interface OperationCapability', 'OperationAction type')
const adminStatusFlow = section(adminOperationsView, 'const statusFlow = [', 'const activeTab', 'AdminOperations statusFlow')
const adminStatusLabel = section(adminOperationsView, 'function statusLabel', 'function statusClass', 'AdminOperations statusLabel')
const adminStatusClass = section(adminOperationsView, 'function statusClass', 'const refreshAll', 'AdminOperations statusClass')
const topicReadOnlyGuard = section(adminOperationsView, 'const isTopicReadOnly', 'const canMutateTopic', 'AdminOperations isTopicReadOnly')
const topicMutationGuard = section(adminOperationsView, 'const canMutateTopic', 'const sortedSectionItems', 'AdminOperations canMutateTopic')
const candidateTopicGuard = section(adminOperationsView, 'const canAddCandidateToSelectedTopic', 'const actionLabel', 'AdminOperations candidate topic guard')
const addCandidateFlow = section(adminOperationsView, 'const addCandidateToSelectedTopic', 'const removeSlotItemFromHomeFeatured', 'AdminOperations addCandidateToSelectedTopic')
const lifecycleActionFlow = section(adminOperationsView, 'const runLifecycleAction', 'const runTopicLifecycleAction', 'AdminOperations runLifecycleAction')
const filterTopicSnapshot = section(operationService, 'private OperationTopicDTO filterTopicSnapshot', 'private OperationSlotDTO filterSlotSnapshot', 'OperationCurationService filterTopicSnapshot')
const publishTopic = section(operationService, 'public OperationTopicDTO publishTopic', 'public OperationTopicDTO offlineTopic', 'OperationCurationService publishTopic')
const getPublicTopic = section(operationService, 'public OperationTopicDTO getPublicTopic', 'public OperationTopicDTO previewTopic', 'OperationCurationService getPublicTopic')
const listCandidates = section(operationService, 'public List<OperationCandidateDTO> listCandidates', 'public List<OperationCurationItemDTO> listCurationItems', 'OperationCurationService listCandidates')
const publishTopicFeedback = section(operationService, 'private void publishCreatorCurationSelectedEvents(OperationTopicDTO topic)', 'private OperationTopicDTO filterTopicSnapshot', 'OperationCurationService topic feedback')

check(
  existsSync(new URL('test-v4-topic-lifecycle-guards.mjs', import.meta.url)),
  'V4 topic lifecycle guard must be runnable directly with node.',
)
check(
  packageJson.scripts['test:v4-topic-lifecycle-guards'] === 'node scripts/test-v4-topic-lifecycle-guards.mjs',
  'package.json must expose test:v4-topic-lifecycle-guards.',
)

for (const status of ['DRAFT', 'PREVIEW', 'PUBLISHED', 'OFFLINE', 'ARCHIVED']) {
  hasText(operationStatusType, `'${status}'`, `Frontend OperationStatus must include persistent lifecycle status ${status}.`)
}
missing(operationStatusType, /'DEGRADED'/, 'Frontend OperationStatus must not include DEGRADED as a persistent lifecycle status.')
hasText(operationActionType, "'archive'", 'Frontend OperationAction must include archive.')
has(operationService, /STATUS_ARCHIVED\s*=\s*"ARCHIVED"/, 'Backend lifecycle model must define STATUS_ARCHIVED as a persistent topic status.')
missing(operationService, /STATUS_DEGRADED\s*=\s*"DEGRADED"/, 'Backend lifecycle model must not define DEGRADED as a persistent workflow status.')
has(operationService, /normalizeWorkflowStatus[\s\S]*STATUS_ARCHIVED\.equals\(value\)/, 'Backend workflow status normalizer must accept ARCHIVED.')
has(operationController, /@PostMapping\("\/admin\/topics\/\{topicId\}\/archive"\)/, 'Backend controller must expose the topic archive lifecycle endpoint.')
has(operationController, /operationCurationService\.archiveTopic\(/, 'Backend controller archive endpoint must call archiveTopic.')
has(operationService, /public OperationTopicDTO archiveTopic\(/, 'Backend service must implement archiveTopic.')
check(
  /STATUS_ARCHIVED\.equals\(topic\.getTopicStatus\(\)\)/.test(getPublicTopic)
    || (/isPublicReadableTopicStatus\(topic\.getTopicStatus\(\)\)/.test(getPublicTopic)
      && /isPublicReadableTopicStatus[\s\S]*STATUS_ARCHIVED\.equals\(status\)/.test(operationService)),
  'Public topic read must allow ARCHIVED topics as public revisit assets.',
)
missing(getPublicTopic, /STATUS_OFFLINE\.equals\(topic\.getTopicStatus\(\)\)/, 'Public topic read must not allow OFFLINE topics.')

for (const status of ['OFFLINE', 'ARCHIVED', 'DEGRADED']) {
  hasText(adminStatusFlow, `status: '${status}'`, `Admin status flow must explain ${status}.`)
  hasText(adminStatusLabel, `${status}:`, `Admin status label must map ${status}.`)
}
has(adminStatusClass, /value === 'ARCHIVED'[\s\S]*status-info/, 'ARCHIVED must be visually distinct from OFFLINE.')
has(adminStatusClass, /value === 'OFFLINE'[\s\S]*status-warn/, 'OFFLINE must remain an unavailable/warn status.')
has(adminStatusClass, /value === 'DEGRADED'[\s\S]*status-warn/, 'DEGRADED must remain a warning display state.')
has(adminOperationsView, /DEGRADED[\s\S]{0,120}不作为|DEGRADED[\s\S]{0,120}涓嶄綔/, 'Admin copy must say DEGRADED is display-only, not persistent lifecycle.')

for (const field of ['source', 'degraded', 'fallbackReason', 'previewToken', 'note']) {
  has(operationTopicDto, new RegExp(`private .+ ${field};`), `OperationTopicDTO must keep ${field} explicit for public filtering contracts.`)
}
has(operationTopicSectionDto, /private String reasonText;/, 'OperationTopicSectionDTO must expose public reasonText.')
has(operationCandidateDto, /private String reasonText;/, 'OperationCandidateDTO should expose candidate reasonText as draft input for ops confirmation.')
has(operationCandidateDto, /private String reasonDraftText;/, 'OperationCandidateDTO should expose hint reason only as draft metadata before ops confirmation.')
has(operationCandidateDto, /private Boolean reasonConfirmed;/, 'OperationCandidateDTO should expose whether reasonText was confirmed for public use.')
check(
  /private String visibilityCheck;/.test(operationCandidateDto)
    || (/private String eligibility;/.test(operationCandidateDto) && /private List<String> blockReasons;/.test(operationCandidateDto)),
  'OperationCandidateDTO should expose visibilityCheck or equivalent eligibility/blockReasons reference-only candidate metadata.',
)

has(filterTopicSnapshot, /PublicContentFilter\.isDistributablePost\(post\)/, 'Published topic snapshot must re-run public visibility and governance filtering.')
has(filterTopicSnapshot, /ITEM_ACTIVE\.equals\(section\.getStatus\(\)\)/, 'Published topic snapshot must include only active topic section items.')
has(filterTopicSnapshot, /section\.setReasonText\((?:section\.getReasonText\(\) == null \? section\.getNote\(\) : section\.getReasonText\(\)|publicCurationReason\([^)]*section\.getReasonText\(\)[\s\S]*section\.getNote\(\)[\s\S]*\))\)/, 'Published topic snapshot must keep public reasonText from confirmed ops note.')
has(filterTopicSnapshot, /section\.setNote\(null\)/, 'Published topic snapshot must remove internal section notes.')
has(filterTopicSnapshot, /snapshot\.setNote\(null\)/, 'Published topic snapshot must remove internal topic notes.')
has(filterTopicSnapshot, /snapshot\.setPreviewToken\(null\)/, 'Published topic snapshot must remove previewToken.')
has(filterTopicSnapshot, /snapshot\.setSource\(OPERATION_SOURCE_REMOTE\)/, 'Published topic snapshot must mark source=remote.')
has(filterTopicSnapshot, /snapshot\.setDegraded\(false\)/, 'Published topic snapshot must not publish degraded state.')
has(filterTopicSnapshot, /snapshot\.setFallbackReason\(null\)/, 'Published topic snapshot must remove fallback/demo reason metadata.')
has(publishTopic, /current\s*=\s*filterTopicSnapshot\(copyTopicSnapshot\(before\)\)/, 'Publish must build the public snapshot from backend-side filterTopicSnapshot.')
has(publishTopic, /po\.setPublishedSnapshotJson\(writeJson\(current\)\)/, 'Publish must persist only the filtered topic snapshot.')

has(topicDetailApi, /DisplayableTopicDetailSource\s*=\s*Exclude<TopicDetailSource,\s*'fallback-demo'\s*\|\s*'unavailable'>/, 'Public topic detail adapter must exclude fallback-demo and unavailable sources.')
has(topicDetailApi, /displayableSources[\s\S]*'remote'[\s\S]*'operation-curation'[\s\S]*'community-topic'[\s\S]*'public-content-query'/, 'Public topic detail adapter must whitelist displayable sources.')
has(topicDetailApi, /isSafeHref[\s\S]*!\/fallback\|demo\|fixture\|local_demo\/i\.test\(href!\)/, 'Public topic detail href guard must reject fallback/demo/fixture links.')
has(topicDetailApi, /filter\(hasDisplayableItems\)/, 'Public topic detail adapter must remove fully filtered sections.')
missing(topicDetailApi, /previewToken|internalNote|internalReason/, 'Public topic detail adapter must not expose preview tokens or internal note fields.')
has(topicDetailView, /topicDetailApi\.getCuratedTopicDetail\(slug\)/, 'Topic detail page must read curated published snapshots first.')
has(topicDetailView, /curatedTopicFallbackAllowed/, 'Topic detail page must only fall back to community topics for curated-topic not-found.')
has(topicDetailView, /section\.reasonText/, 'Public topic detail page must render section reasonText.')
has(topicDetailView, /item\.reasonText/, 'Public topic detail page must render item reasonText.')

has(candidateTopicGuard, /candidates\.value\.available[\s\S]*!candidates\.value\.degraded[\s\S]*!selectedTopicReadOnly\.value/, 'Candidate-to-topic action must require available, non-degraded, editable topic state.')
has(candidateTopicGuard, /item\.sourceType === 'POST'/, 'Candidate-to-topic action must only accept public POST sources in P0.')
has(candidateTopicGuard, /item\.governanceState !== 'filtered'/, 'Candidate-to-topic action must reject filtered candidates.')
has(candidateTopicGuard, /!item\.fallback/, 'Candidate-to-topic action must reject fallback/demo candidates.')
has(addCandidateFlow, /window\.prompt\([\s\S]*reasonText[\s\S]*item\.reasonText \|\| item\.reason/, 'Candidate hint reason must be confirmed as public reasonText before inclusion.')
has(addCandidateFlow, /operationsApi\.addTopicCandidateToSection\([\s\S]*reasonText\.trim\(\)/, 'Confirmed reasonText must be sent when adding a candidate to a topic section.')
missing(listCandidates, /publishCreatorCurationSelectedEvents|OperationCurationSelectedEvent|applicationEventPublisher\.publishEvent/, 'Candidate listing must not trigger creator included feedback.')
missing(addCandidateFlow, /OperationCurationSelectedEvent|publishCreatorCurationSelectedEvents/, 'Candidate-to-topic draft action must not trigger creator included feedback in the frontend flow.')
has(publishTopicFeedback, /STATUS_PUBLISHED\.equals\(topic\.getStatus\(\)\)/, 'Creator feedback for topics must only publish from real PUBLISHED snapshots.')
has(publishTopicFeedback, /isAuthorVisibleFeedbackPost\(post\)/, 'Creator feedback must protect anonymous/private author identity.')

has(topicReadOnlyGuard, /!topics\.value\.available[\s\S]*topics\.value\.degraded[\s\S]*topic\.fallback[\s\S]*topic\.degraded[\s\S]*topic\.example[\s\S]*topic\.source !== 'remote'/, 'Topic read-only guard must cover unavailable, degraded, fallback/demo/example, and non-remote sources.')
has(topicMutationGuard, /isTopicReadOnly\(topic\)/, 'All topic mutations must be blocked by the topic read-only guard.')
has(lifecycleActionFlow, /confirmationPhrase:\s*action === 'preview' \? undefined : 'CONFIRM'/, 'Non-preview lifecycle actions must require risk confirmation.')
has(lifecycleActionFlow, /action === 'archive'[\s\S]*ARCHIVED -> restore|action === 'archive'[\s\S]*restore/, 'Archive confirmation copy must state restore is not implemented in P0.')
has(operationsApi, /const permissionAction = action === 'archive' \? 'offline' : action/, 'Archive must reuse offline-level mutation permission until a dedicated permission exists.')
has(operationsApi, /client\.post\(`\/api\/v1\/operations\/admin\/\$\{resourceKind\}s\/\$\{id\}\/\$\{action\}`/, 'Lifecycle action client must call the backend action endpoint, including archive.')

const publicVisibleSurface = [
  adminOperationsView,
  topicDetailView,
  topicDetailApi,
  operationsApi,
].join('\n')
for (const forbidden of [
  /收益机会|收益承诺|打赏|赞助内容|赞助专题|广告位|付费置顶|官方背书|权威认证|保证曝光|保证精选|私人求职训练|简历优化|JD 分析|JD匹配|投递管理|模拟面试|私人 AI 教练/i,
  /monetization opportunity|commercial sponsorship|sponsored topic|ad placement|paid pin|official endorsement|authority certification|guaranteed exposure|guaranteed featuring|private career training|resume optimization|JD analysis|application tracking|mock interview|private AI coach/i,
]) {
  missing(publicVisibleSurface, forbidden, `V4 topic lifecycle public/admin surface must not contain forbidden boundary copy: ${forbidden}.`)
}
has(publicContentFilter, /isUnsafeSuggestionText/, 'Backend public filtering must keep unsafe suggestion text filtering available for operation copy.')
has(publicContentFilter, /isSyntheticText/, 'Backend public filtering must keep synthetic demo/fixture text filtering available for snapshots.')

if (failures.length) {
  console.error('V4 topic lifecycle guards failed:')
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`))
  process.exit(1)
}

console.log('V4 topic lifecycle guards passed.')
