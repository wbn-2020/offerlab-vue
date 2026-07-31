import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const api = read('src/api/collaboration.ts')
const selector = read('src/components/collaboration/CollaborationDeliverySelector.vue')
const composable = read('src/composables/useCollaborationDeliveryCandidates.ts')
const presentation = read('src/utils/collaborationNeedPresentation.ts')

assert.equal(
  existsSync(new URL('../src/components/collaboration/CollaborationDeliverySelector.vue', import.meta.url)),
  true,
  'Delivery selector must exist.',
)

has(api, /NeedDeliveryCandidate[\s\S]*resolutionType[\s\S]*publicPath[\s\S]*eligible[\s\S]*ineligibleReason/, 'Delivery candidate DTO must expose server eligibility and public routing fields.')
has(api, /deliveryCandidates:[\s\S]*delivery-candidates/, 'Delivery candidate API must use the server-filtered candidate endpoint.')
has(api, /NeedDeliveryCandidateQuery[\s\S]*resolutionType[\s\S]*cursor[\s\S]*size/, 'Delivery candidate API must expose resolution type and cursor parameters.')
has(selector, /candidate\.eligible[\s\S]*candidate\.ineligibleReason/, 'Selector must use the server eligibility result and show the reason for disabled candidates.')
has(selector, /:disabled="!candidate\.eligible"[\s\S]*selectCandidate/, 'Ineligible candidates must not be selectable.')
has(selector, /resolutionType[\s\S]*keyword[\s\S]*loadMore/, 'Selector must provide type, keyword, and paginated candidate controls.')
has(selector, /source:\s*'collaboration_need'[\s\S]*action:\s*'fulfill'[\s\S]*contextType:\s*'need'[\s\S]*needId[\s\S]*returnHref[\s\S]*\/editor/, 'Create-content flow must carry the typed need context and only an internal return URL to the editor.')
has(selector, /isSafeCollaborationPath[\s\S]*needDetailPath/, 'Return URL must pass an internal-path allowlist with a need-detail fallback.')
missing(selector, /collaborationApi\.needs\.submit|collaborationApi\.needs\.fulfill|resolutionId\s*=\s*ref/, 'The picker must not auto-submit or recreate backend eligibility through a manual resource-id flow.')
has(composable, /requestId[\s\S]*currentUid[\s\S]*AbortController/, 'Candidate loading must guard request generations, account changes, and in-flight cancellation.')
has(composable, /uid === currentUid\(\)[\s\S]*targetNeedId === currentNeedId\.value/, 'Candidate responses must be bound to both account and need.')
has(composable, /if \(append\) loadMoreError\.value = message[\s\S]*initialError\.value = message/, 'Candidate composable must distinguish first-page and append errors.')
has(composable, /watch\([\s\S]*authStore\.isLoggedIn[\s\S]*authStore\.user\?\.uid/, 'Candidate loading must reset on login/account changes.')
missing(composable, /ownerUid|authorUid|visibility|domain ===|postType ===|status ===/, 'Candidate composable must not duplicate backend qualification rules.')
has(presentation, /isSafeCollaborationPath[\s\S]*needDetailPath/, 'Shared presentation utilities must keep collaboration return paths internal.')

console.log('V7 delivery resource picker guard passed')
