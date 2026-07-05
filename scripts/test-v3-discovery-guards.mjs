import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8')

const explore = read('src/views/ExploreView.vue')
const discoveryApi = read('src/api/discovery.ts')
const discoveryComposable = read('src/composables/useDiscoveryMap.ts')
const operationsApi = read('src/api/operations.ts')
const operationSlotCard = read('src/components/operations/OperationSlotCard.vue')
const packageJson = read('package.json')
const discoveryMapDto = read('../offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/api/dto/DiscoveryMapDTO.java')
const discoveryMapService = read('../offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/application/DiscoveryMapService.java')

assert.match(packageJson, /"test:v3-discovery-guards":\s*"node scripts\/test-v3-discovery-guards\.mjs"/,
  'package.json must expose the V3 discovery guard script')

assert.match(explore, /useDiscoveryMap/,
  '/explore must read through the DiscoveryMap composable')
assert.doesNotMatch(explore, /demoSeeds|demoPosts|fixture|local_demo/i,
  '/explore must not import or reference demo seed or fixture data')
assert.doesNotMatch(explore, /postApi|domainApi|userApi|searchApi|operationsApi/,
  '/explore must not stitch public discovery modules from legacy page-level fallback calls')

assert.match(discoveryApi, /GET|client\.get\('\/api\/v1\/discovery\/map'\)/,
  'discovery API must target the public DiscoveryMap endpoint')
assert.match(discoveryApi, /DisplayableDiscoverySource\s*=\s*Exclude<DiscoverySource,\s*'fallback-demo'\s*\|\s*'unavailable'>/,
  'displayable discovery sources must exclude fallback-demo and unavailable')
assert.match(discoveryApi, /isDisplayableSource\(item\.source\)/,
  'real discovery items must pass the displayable source guard')
assert.match(discoveryApi, /isSafeHref\(item\.href\)/,
  'real discovery items must carry safe internal hrefs')
assert.match(discoveryApi, /!href!\.startsWith\('\/api\/'\)/,
  'discovery item href guard must reject backend API paths before RouterLink rendering')
assert.match(discoveryApi, /!\/\\s\/\.test\(href!\)/,
  'discovery item href guard must reject whitespace-bearing paths before RouterLink rendering')
assert.match(discoveryApi, /slug\?: string/,
  'discovery items must carry a stable slug when the entry points to a topic')
assert.match(discoveryApi, /reasonText\?: string/,
  'discovery items must carry stable reasonText for curation explanations')
assert.match(discoveryApi, /deriveTopicSlug/,
  'discovery API must derive topic slugs from safe topic hrefs')
assert.match(discoveryApi, /reasonText:\s*safeReasonText/,
  'discovery API must normalize remote reasonText/reason into a stable field')
assert.match(discoveryMapDto, /private String slug;/,
  'backend DiscoveryItemDTO must expose a stable slug for topic entries')
assert.match(discoveryMapDto, /private String reasonText;/,
  'backend DiscoveryItemDTO must expose stable reasonText instead of relying on legacy reason')
assert.match(discoveryMapService, /\.slug\(topic\.getSlug\(\)\)/,
  'operation topic discovery entries must populate slug explicitly')
assert.match(discoveryMapService, /\.reasonText\(item\.getReasonText\(\)\)/,
  'operation topic discovery entries must populate reasonText explicitly')
assert.match(discoveryApi, /emptyDiscoveryMap/,
  'backend failures must become an empty module-level state, not fallback items')
assert.match(discoveryApi, /emptyItemArrays/,
  'empty discovery maps must allocate fresh empty item arrays')
assert.match(discoveryApi, /try\s*{\s*return decodeURIComponent\(match\[1\]\)\s*}\s*catch\s*{\s*return undefined\s*}/s,
  'topic slug derivation must ignore malformed encoded hrefs instead of failing the whole discovery map')
assert.doesNotMatch(discoveryApi, /from ['"][^'"]*(demoSeeds|demoPosts|fixture)/i,
  'discovery API must not import demo or fixture data')

const itemBody = discoveryApi.slice(discoveryApi.indexOf('const adaptItem'), discoveryApi.indexOf('const adaptItems'))
assert.doesNotMatch(itemBody, /fallback-demo|unavailable/,
  'adaptItem must not allow fallback-demo or unavailable inside real item arrays')

const publicSlotBody = operationsApi.slice(
  operationsApi.indexOf('getPublicOperationSlot'),
  operationsApi.indexOf('listOperationTopics'),
)
assert.match(operationsApi, /DISCOVERY_FEATURED_TOPICS_SLOT_CODE\s*=\s*'DISCOVERY_FEATURED_TOPICS'/,
  'operations API must know the discovery featured topics slot code')
assert.match(operationsApi, /PUBLIC_OPERATION_SLOT_CODES/,
  'operations API must keep public slots behind an allowlist')
assert.doesNotMatch(publicSlotBody, /postApi\.list|postApi\.listTopics|demoSeeds|fallbackPosts/i,
  'public operation slot reads must not assemble fallback content')

assert.match(operationSlotCard, /slot(?:\.value\?)?\.source === 'remote'/,
  'operation slot card must still require remote source')
assert.match(operationSlotCard, /slot(?:\.value\?)?\.status === 'PUBLISHED'/,
  'operation slot card must still require published status')
assert.match(operationSlotCard, /!slot(?:\.value\?)?\.degraded/,
  'operation slot card must still reject degraded public slots')
assert.match(operationSlotCard, /item\.source === 'remote'/,
  'operation slot items must still require remote source')

const publicDiscoverySurface = `${explore}\n${discoveryComposable}`
assert.match(explore, /item\.reasonText\s*\|\|\s*item\.reason/,
  '/explore must prefer stable reasonText while preserving legacy reason fallback')

const forbiddenPrivateTrainingEntries = [
  'CodeCoachAI',
  'mockInterview',
  'resumeMatch',
  'privateGoal',
  'applicationTask',
  'AI 教练',
  '私人训练',
  '训练计划',
  '模拟面试',
  '简历匹配',
  '简历/JD',
  'JD 分析',
  '投递任务',
]

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const sourcePatternOf = (value) => new RegExp(value.split('/').map(escapeRegex).join('\\\\?/'), 'i')

for (const forbidden of forbiddenPrivateTrainingEntries) {
  assert.doesNotMatch(publicDiscoverySurface, new RegExp(forbidden, 'i'),
    `public discovery surface must not include private training entry: ${forbidden}`)
  assert.match(discoveryApi, sourcePatternOf(forbidden),
    `discovery adapter safe text guard must block private training entry: ${forbidden}`)
}

console.log('V3 discovery guards passed')
