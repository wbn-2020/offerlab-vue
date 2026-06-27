import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const editor = readFileSync(new URL('../src/views/EditorView.vue', import.meta.url), 'utf8')
const assistApi = readFileSync(new URL('../src/api/contentAssist.ts', import.meta.url), 'utf8')
const types = readFileSync(new URL('../src/api/types.ts', import.meta.url), 'utf8')

assert.match(assistApi, /export interface ContentAssistRequest\b/, 'content assist API must define the editor assist request contract')
assert.match(assistApi, /export const contentAssistApi\b/, 'content assist API must expose contentAssistApi')
assert.match(assistApi, /getEditorAssist:\s*async/, 'content assist API must expose getEditorAssist')
assert.match(assistApi, /Promise\.allSettled\(/, 'content assist API must merge the stage3 assist calls with partial failure handling')
assert.match(assistApi, /\/api\/v1\/content-assist\/writing/, 'content assist API must call the writing assistant endpoint')
assert.match(assistApi, /\/api\/v1\/content-assist\/quality-score/, 'content assist API must call the quality score endpoint')
assert.match(assistApi, /\/api\/v1\/content-assist\/tag-topic-suggestions/, 'content assist API must call the tag/topic suggestions endpoint')
assert.match(assistApi, /status:\s*'degraded'/, 'content assist API must expose a degraded fallback state')
assert.match(assistApi, /status:\s*'failed'/, 'content assist API must expose a failed state when suggestions cannot be prepared')
assert.match(types, /export interface ContentAssistSuggestion\b/, 'shared types must define content assist suggestions')
assert.match(types, /export interface ContentAssistResult\b/, 'shared types must define content assist results')

assert.match(editor, /contentAssistApi/, 'EditorView must import the content assist API')
assert.match(editor, /stage3-assist-panel/, 'EditorView must render the stage3 assist panel shell')
assert.match(editor, /loadStageThreeAssist/, 'EditorView must load stage3 assist data')
assert.match(editor, /const assistPanelEnabled = ref\(false\)/, 'EditorView must default the assist panel to disabled')
assert.match(editor, /assistPanelEnabled\.value = safeStorage\.get\(stageThreeAssistPreferenceKey\.value\) === '1'/, 'EditorView must only restore AI assist after an explicit opt-in')
assert.match(editor, /const clearStageThreeAssistState = \(\) => \{\s*clearStageThreeAssistTimer\(\)\s*stageThreeAssist\.value = null\s*stageThreeAssistError\.value = ''\s*\}/s, 'EditorView must clear local assist state when AI stays disabled')
assert.match(editor, /if \(!assistPanelEnabled\.value\) \{\s*clearStageThreeAssistState\(\)\s*return\s*\}/s, 'EditorView must not request content assist while AI remains disabled')
assert.doesNotMatch(editor, /getEditorAssist\(\{ \.\.\.buildStageThreeAssistRequest\(\), aiEnabled: false \}\)/, 'EditorView must not issue disabled-state assist requests automatically')
assert.doesNotMatch(
  editor,
  /onMounted\(async \(\) => \{[\s\S]*?assistPanelEnabled\.value = safeStorage\.get\(stageThreeAssistPreferenceKey\.value\) === '1'[\s\S]*?await loadStageThreeAssist\(\)/,
  'EditorView must not automatically request content assist during mount, even after restoring a prior opt-in',
)
assert.doesNotMatch(
  editor,
  /watch\(\(\) => authStore\.isLoggedIn, async \(loggedIn\) => \{[\s\S]*?await loadStageThreeAssist\(\)/,
  'EditorView must not automatically request content assist when login state changes',
)
assert.doesNotMatch(
  editor,
  /const scheduleStageThreeAssist = \(\) => \{[\s\S]*?loadStageThreeAssist\(\)/,
  'EditorView must not auto-schedule content assist requests without an explicit user action',
)
assert.match(editor, /applyTagSuggestion/, 'EditorView must let users adopt tag suggestions')
assert.match(editor, /applyTopicSuggestion/, 'EditorView must let users adopt topic suggestions')
assert.match(editor, /applyAssistSummary/, 'EditorView must let users adopt writing summary suggestions')
assert.match(editor, /qualityScoreValue/, 'EditorView must compute a numeric quality score')
assert.match(editor, /selectedSeriesId/, 'EditorView must keep selected series state')
assert.match(editor, /stageThreeAssistStatus\.value === 'unauthenticated'/, 'EditorView must handle unauthenticated stage3 assist state')
assert.match(editor, /stageThreeAssistStatus\.value === 'disabled'/, 'EditorView must handle AI disabled stage3 assist state')
assert.match(editor, /stageThreeAssistStatus\.value === 'loading'/, 'EditorView must handle loading stage3 assist state')
assert.match(editor, /stageThreeAssistStatus\.value === 'degraded'/, 'EditorView must handle rules-only degraded stage3 assist state')
assert.match(editor, /stageThreeAssistStatus\.value === 'failed'/, 'EditorView must handle failed stage3 assist state')
assert.match(editor, /return 'AI关闭'/, 'EditorView must surface an AI disabled status label')
assert.match(editor, /return '规则降级'/, 'EditorView must surface a degraded rules-only status label')
assert.match(editor, /return '加载失败'/, 'EditorView must surface a failed status label')
assert.match(editor, /item\.adopted \? '已采纳' : '采纳'/, 'EditorView must show adoption state for tag/topic suggestions')

console.log('stage3 editor assist guard passed')
