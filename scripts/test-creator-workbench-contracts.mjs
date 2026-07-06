import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)
const hasText = (source, text, message) => assert.ok(source.includes(text), message)
const section = (source, start, end) => {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  assert.notEqual(startIndex, -1, `missing section start: ${start}`)
  assert.notEqual(endIndex, -1, `missing section end: ${end}`)
  return source.slice(startIndex, endIndex)
}

const packageJson = JSON.parse(read('package.json'))
const apiTypes = read('src/api/types.ts')
const creatorFeedbackApi = read('src/api/creatorFeedback.ts')
const demoSeeds = read('src/data/demoSeeds.ts')
const demoCreatorSection = section(demoSeeds, 'export const demoCreatorFeedbackSummary', 'export const demoProfileContribution')

assert.equal(
  existsSync(new URL('test-creator-workbench-contracts.mjs', import.meta.url)),
  true,
  'Creator workbench contract guard must be runnable directly with node.',
)
assert.equal(
  packageJson.scripts['test:creator-workbench-contracts'],
  'node scripts/test-creator-workbench-contracts.mjs',
  'package.json must expose the creator workbench contract guard.',
)
hasText(
  packageJson.scripts['test:guards'] || '',
  'npm run test:creator-workbench-contracts',
  'package.json test:guards must include the creator workbench contract guard.',
)

for (const typeName of [
  'CreatorWorkspaceSource',
  'CreatorTopicEditorQuery',
  'CreatorWorkspaceAction',
  'CreatorFeedbackSummary',
  'CreatorCurationFeedbackSummary',
  'CreatorGrowthWorkspace',
]) {
  has(apiTypes, new RegExp(`export (type|interface) ${typeName}`), `API types must expose ${typeName}.`)
}

has(apiTypes, /export type CreatorWorkspaceSource\s*=\s*'remote'\s*\|\s*'empty'\s*\|\s*'demo'\s*\|\s*'fallback'/, 'Creator workspace source must be the strict remote|empty|demo|fallback union.')
has(apiTypes, /source:\s*CreatorWorkspaceSource/, 'Creator workspace aggregate must expose source.')
has(apiTypes, /fallbackReason\?:\s*string/, 'Creator workspace aggregate must expose fallbackReason.')
for (const field of [
  'summary',
  'maintainablePosts',
  'curationFeedback',
  'replyOpportunities',
  'representativePosts',
  'topicIdeas',
  'actions',
]) {
  has(apiTypes, new RegExp(`${field}:`), `CreatorGrowthWorkspace must expose aggregate field ${field}.`)
}
has(apiTypes, /source:\s*'creator_workbench'/, 'CreatorTopicEditorQuery source must be fixed to creator_workbench.')
has(apiTypes, /editorHref:\s*string/, 'CreatorTopicIdea must expose guarded editorHref.')

for (const exportName of [
  'CREATOR_WORKBENCH_EDITOR_SOURCE',
  'buildCreatorWorkbenchEditorHref',
  'emptyCreatorGrowthWorkspace',
  'isDisplayableWorkspaceItem',
  'adaptCreatorWorkspaceAction',
]) {
  hasText(creatorFeedbackApi, `export const ${exportName}`, `creator feedback API must export ${exportName}.`)
}
hasText(creatorFeedbackApi, "CREATOR_WORKBENCH_EDITOR_SOURCE = 'creator_workbench'", 'creator feedback API must define the creator_workbench editor source constant.')
hasText(creatorFeedbackApi, 'source: CREATOR_WORKBENCH_EDITOR_SOURCE', 'topic idea editor query adapter must force source=creator_workbench.')
missing(creatorFeedbackApi, /const source\s*=\s*safeText\(editorQuery\?\.source/, 'topic idea editor query must not pass through arbitrary backend source.')
has(creatorFeedbackApi, /isDisplayableWorkspaceItem[\s\S]*anonymous|anonymous[\s\S]*isDisplayableWorkspaceItem/, 'creator workbench visibility guard must explicitly exclude anonymous content.')
hasText(creatorFeedbackApi, 'isPublicPostVisible', 'creator workbench visibility guard must reuse shared public post governance filtering.')
has(creatorFeedbackApi, /maintainablePosts:\s*maintainablePosts/, 'workspace adapter must expose maintainablePosts.')
has(creatorFeedbackApi, /topPosts:\s*maintainablePosts/, 'workspace adapter must keep topPosts backward compatible with maintainablePosts.')
has(creatorFeedbackApi, /const curationFeedback[\s\S]*adaptCreatorCurationFeedbackSummary/, 'workspace adapter must derive curationFeedback through the summary adapter.')
has(creatorFeedbackApi, /curationFeedback:\s*curationFeedback/, 'workspace adapter must include curationFeedback.')
has(creatorFeedbackApi, /actions:\s*adaptCreatorWorkspaceActions/, 'workspace adapter must include guarded actions.')
has(creatorFeedbackApi, /emptyCreatorGrowthWorkspace\('empty_response',\s*'empty'\)/, 'workspace empty response must become an explicit empty source contract.')
has(creatorFeedbackApi, /emptyCreatorGrowthWorkspace\('backend_not_connected',\s*'fallback'\)/, 'workspace fallback helper must support degraded fallback source.')

for (const sourceField of [
  'source: \'demo\'',
  'fallbackReason: \'local_demo_seed\'',
  'curationFeedback:',
  'maintainablePosts:',
  'actions:',
  'editorHref:',
]) {
  hasText(demoCreatorSection, sourceField, `creator demo seed must include ${sourceField}.`)
}
has(demoCreatorSection, /editorQuery:\s*\{[\s\S]*source:\s*'creator_workbench'/, 'demo topic ideas must route editor query through creator_workbench.')
has(demoCreatorSection, /editorHref:\s*['`]?\/editor\?source=creator_workbench/, 'demo topic ideas must expose guarded editor hrefs.')
missing(demoCreatorSection, /editorQuery:\s*\{[\s\S]{0,160}source:\s*'(own_post_feedback|comment_question|series_gap|content_type_template)'/, 'demo editor query source must not use legacy idea-source values.')

const forbiddenCopy = [
  /revenue\s*settlement|paid\s*exposure|paid\s*priority|subscription|membership|tip|donation/i,
  /\u771f\u5b9e\u652f\u4ed8|\u652f\u4ed8\u6210\u529f|\u6536\u76ca\u7ed3\u7b97|\u6253\u8d4f|\u63d0\u73b0|\u4f1a\u5458|\u8ba2\u9605|\u5b98\u65b9\u80cc\u4e66|\u6392\u540d|\u51b2\u699c|\u4fdd\u8bc1\u66dd\u5149/,
  /application task|private training|CodeCoachAI/i,
  /\u7b80\u5386\/JD|\u6295\u9012\u4efb\u52a1|\u6a21\u62df\u9762\u8bd5|\u79c1\u4eba\u8bad\u7ec3|\u6c42\u804c\u8bad\u7ec3/,
]
const creatorFeedbackCopySurface = creatorFeedbackApi.replace(
  section(creatorFeedbackApi, 'const textBlockers = [', 'const safeCurationText'),
  '',
)
for (const [name, source] of [
  ['api/types.ts', apiTypes],
  ['creatorFeedback.ts', creatorFeedbackCopySurface],
  ['demoSeeds creator section', demoCreatorSection],
]) {
  for (const pattern of forbiddenCopy) {
    missing(source, pattern, `${name} must stay inside V4 P0 public creator workbench boundaries.`)
  }
}

console.log('creator workbench contract guard passed')
