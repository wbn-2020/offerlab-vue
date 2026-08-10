import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const packageJson = JSON.parse(read('package.json'))
const postDetail = read('src/views/PostDetailView.vue')
const postCard = read('src/components/post/PostCard.vue')
const postApi = read('src/api/post.ts')
const interactionApi = read('src/api/interaction.ts')
const myReports = read('src/views/MyReportsView.vue')
const helperPath = new URL('../src/utils/governanceDisplay.ts', import.meta.url)

assert.equal(
  existsSync(new URL('test-phase11-user-reporting-guards.mjs', import.meta.url)),
  true,
  'Phase 11 user reporting guard must be runnable directly with node.',
)
assert.equal(
  packageJson.scripts['test:phase11-user-reporting-guards'],
  'node scripts/test-phase11-user-reporting-guards.mjs',
  'package.json must expose the Phase 11 user reporting guard.',
)
has(
  packageJson.scripts['test:guards'],
  /test:phase11-governance|test:phase11-user-reporting-guards/,
  'Full guard suite must include Phase 11 user reporting guard, directly or through the Phase 11 aggregate.',
)

assert.equal(
  existsSync(helperPath),
  true,
  'User-side governance copy must be centralized in src/utils/governanceDisplay.ts.',
)

const governanceDisplay = read('src/utils/governanceDisplay.ts')

has(postApi, /report:\s*\(postId[\s\S]*\/api\/v1\/posts\/\$\{postId\}\/reports/, 'Post report entry must call the real backend report API.')
has(interactionApi, /reportComment:\s*\(commentId[\s\S]*\/api\/v1\/comments\/\$\{commentId\}\/reports/, 'Comment report entry must call the real backend report API.')

has(governanceDisplay, /GOVERNANCE_RISK_NOTICE/, 'High-risk public copy must be centralized.')
has(governanceDisplay, /REPORT_REASON_OPTIONS[\s\S]*value:[\s\S]*label:/, 'Post and comment report reasons must share one user-facing option list.')
has(governanceDisplay, /mapReportErrorToFeedback/, 'Report failures must be mapped through a reusable display helper.')
has(governanceDisplay, /30001[\s\S]*tone:\s*'warning'/, 'Duplicate reports must be shown as an existing report, not as a new success.')
has(governanceDisplay, /10429[\s\S]*tone:\s*'warning'/, 'Rate-limited reports must be shown as rate limited.')
has(governanceDisplay, /(10403|403)[\s\S]*(10404|404|410)[\s\S]*tone:\s*'warning'/, 'Restricted, deleted, or unavailable content report attempts must show content-state feedback.')
has(governanceDisplay, /tone:\s*'error'/, 'Unknown report failures must remain explicit failures.')
has(governanceDisplay, /getUnavailableContentCopy/, 'Unavailable content copy must be centralized.')
has(governanceDisplay, /normalizeRiskNoticeForUsers/, 'High-risk public copy must be normalized before display.')

for (const [name, source] of [
  ['governanceDisplay.ts', governanceDisplay],
  ['PostDetailView.vue', postDetail],
  ['PostCard.vue', postCard],
]) {
  missing(source, /(?<![A-Za-z0-9_])(reporterUid|reviewerUid|reviewNote|internalRule|riskScore|realAuthor|originalAuthor)(?![A-Za-z0-9_])/i, `${name} must not expose reporter, reviewer, internal rule, risk-score, or real-author details to users.`)
}

has(postDetail, /REPORT_REASON_OPTIONS/, 'PostDetailView must use the shared report reason options.')
has(postDetail, /reportTargetLabel/, 'PostDetailView must derive one label for post and comment reporting.')
has(postDetail, /reportFeedback/, 'PostDetailView must render real report success and failure feedback inside the dialog.')
has(postDetail, /role="status"[\s\S]*reportFeedback/, 'Successful report feedback must be visible and accessible.')
has(postDetail, /role="alert"[\s\S]*reportFeedback/, 'Failed report feedback must be visible and accessible.')
has(postDetail, /mapReportErrorToFeedback/, 'PostDetailView must not hand-roll report error copy.')
has(postDetail, /reportFeedback\.value\s*=\s*mapReportErrorToFeedback\(error\)/, 'PostDetailView must display mapped deleted, restricted, or unavailable content report feedback.')
has(postDetail, /isReportSubmitSuccess\.value\s*=\s*true[\s\S]*reportFeedback\.value\s*=\s*reportSuccessFeedback/, 'Successful report submissions must set explicit success feedback.')
has(postDetail, /isReportSubmitSuccess\.value\s*=\s*false[\s\S]*mapReportErrorToFeedback/, 'Failed report submissions must stay failures and keep the dialog available.')
const submitReportStart = postDetail.indexOf('const submitReport = async () => {')
const submitReportEnd = postDetail.indexOf('const loadComments', submitReportStart)
assert.ok(submitReportStart >= 0 && submitReportEnd > submitReportStart, 'PostDetailView must keep submitReport as an inspectable function.')
const submitReportBlock = postDetail.slice(submitReportStart, submitReportEnd)
missing(submitReportBlock, /catch\s*\([^)]*\)\s*\{[\s\S]*toast\.success/, 'Report catch block must not show success feedback.')

has(postCard, /reportTo/, 'PostCard must expose a user-side report entry that routes to the shared detail dialog.')
has(myReports, /normalizeReportReceipt/, 'MyReportsView must normalize report records before rendering.')
has(myReports, /normalizeReportPage/, 'MyReportsView must reject malformed report pages.')
has(myReports, /safeTargetPath/, 'MyReportsView must restrict report target links to safe same-site paths.')
missing(myReports, /\{\{\s*(?:loadError|detailError)\s*\}\}[\s\S]*(?:data does not conform|contract|schema)/i, 'MyReportsView must not expose internal contract errors.')
missing(myReports, /getErrorMessage/, 'MyReportsView must use stable user-facing read errors instead of raw backend messages.')

has(postDetail, /\.report-dialog-panel[\s\S]*max-height:\s*min\(calc\(100vh - 2rem\),\s*720px\)[\s\S]*overflow-y:\s*auto/, 'Report dialog must be constrained and scrollable on mobile.')
has(postDetail, /\.governance-unavailable-state[\s\S]*overflow-wrap:\s*anywhere/, 'Unavailable state must avoid mobile overflow.')
has(postCard, /\.governance-card-unavailable[\s\S]*overflow-wrap:\s*anywhere/, 'Card unavailable state must avoid mobile overflow.')

has(postDetail, /normalizeRiskNoticeForUsers/, 'PostDetailView must normalize high-risk copy before display.')
has(postCard, /normalizeRiskNoticeForUsers/, 'PostCard must normalize high-risk copy before display.')
missing(`${postDetail}\n${postCard}`, /authority endorsement|expert endorsement|professional endorsement|professional advice|certifiedExpert|riskScore/i, 'High-risk content must not be packaged as professional advice, endorsement, or visible scoring.')

console.log('Phase 11 user reporting, unavailable-state, and risk-copy guards passed.')
