import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/^\uFEFF/, '')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)
const hasText = (source, text, message) => assert.ok(source.includes(text), message)

const packageJson = JSON.parse(read('package.json'))
const apiTypes = read('src/api/types.ts')
const creatorFeedback = read('src/api/creatorFeedback.ts')
const editorContext = read('src/utils/editorAssistContext.ts')
const editorTemplates = read('src/data/editorAssistTemplates.ts')
const editor = read('src/views/EditorView.vue')
const meProfile = read('src/views/MeProfileView.vue')
const postDetail = read('src/views/PostDetailView.vue')
const contentAssist = read('src/api/contentAssist.ts')
const previewCard = read('src/components/editor-preview/EditorPreviewCard.vue')

assert.equal(
  existsSync(new URL('test-v4-editor-assist-guards.mjs', import.meta.url)),
  true,
  'V4 editor assist guard must be runnable directly with node.',
)
assert.equal(
  packageJson.scripts['test:v4-editor-assist-guards'],
  'node scripts/test-v4-editor-assist-guards.mjs',
  'package.json must expose test:v4-editor-assist-guards.',
)

for (const typeName of [
  'EditorAssistContextSource',
  'EditorAssistAction',
  'EditorAssistContextType',
  'EditorAssistContext',
]) {
  has(apiTypes, new RegExp(`export (type|interface) ${typeName}`), `API types must expose ${typeName}.`)
}

for (const action of ['update', 'reply', 'continue', 'series', 'topic', 'template']) {
  hasText(apiTypes, `'${action}'`, `EditorAssistAction must include ${action}.`)
}

for (const contextType of ['post', 'reply', 'idea', 'series', 'topic', 'template']) {
  hasText(apiTypes, `'${contextType}'`, `EditorAssistContextType must include ${contextType}.`)
}

for (const field of ['contextType', 'commentId', 'topicId', 'templateCode', 'returnHref', 'reasonText']) {
  has(apiTypes, new RegExp(`${field}\\?:\\s*string|${field}\\?:\\s*EditorAssistContextType`), `CreatorTopicEditorQuery must include ${field}.`)
  hasText(creatorFeedback, `query.${field}`, `buildCreatorWorkbenchEditorHref must preserve ${field}.`)
}
hasText(creatorFeedback, "CREATOR_WORKBENCH_EDITOR_SOURCE = 'creator_workbench'", 'creator feedback helper must force source=creator_workbench.')
hasText(creatorFeedback, 'normalizeCreatorEditorContextType', 'creator feedback helper must infer contextType for old query payloads.')
hasText(creatorFeedback, 'safeSameSitePath(query.returnHref)', 'creator feedback helper must guard returnHref.')

hasText(editorContext, 'parseEditorAssistContext', 'Editor must have a dedicated context parser.')
hasText(editorContext, 'LEGACY_CONTEXT_SOURCES', 'Editor context parser must keep legacy query compatibility.')
hasText(editorContext, "source || 'manual_publish'", 'Unknown entry source must degrade instead of becoming a legacy context source.')
has(editorContext, /ids\.postId\)\s*return 'post'/, 'postId without contextType must infer post context.')
has(editorContext, /ids\.postId && action === 'reply'\)\s*return 'reply'/, 'postId + reply without contextType must infer reply context.')
has(editorContext, /ids\.ideaId\)\s*return 'idea'/, 'ideaId without contextType must infer idea context.')
missing(editorContext, /source:\s*rawSource/, 'EditorAssistContext.source must not pass through series_gap/topic_idea/search_gap as source.')

for (const templateCode of [
  'technical_review',
  'interview_experience_review',
  'project_summary',
  'knowledge_checklist',
  'topic_supplement',
  'discussion_prompt',
  'resource_note',
  'short_opinion',
]) {
  hasText(editorTemplates, `'${templateCode}'`, `V4 P0 template ${templateCode} must exist.`)
}
hasText(editorTemplates, 'PUBLIC_EDITOR_ASSIST_TEMPLATES', 'Template module must expose a public template list.')
hasText(editorTemplates, 'applyEditorAssistTemplateSelection', 'Template module must expose pure selection behavior for guard coverage.')
hasText(editorTemplates, 'needs_confirmation', 'Template switching with existing content must require confirmation.')
hasText(editorTemplates, 'editableMarkdown', 'Templates must remain editable Markdown starters.')

hasText(editor, 'parseEditorAssistContext', 'EditorView must parse V4 editor assist context.')
hasText(editor, 'editor-assist-context', 'EditorView must render the handoff context.')
hasText(editor, 'returnHref', 'EditorView must respect returnHref for source navigation.')
hasText(editor, 'EDITOR_ASSIST_TEMPLATES', 'EditorView must render the V4 public template list.')
hasText(editor, 'window.confirm', 'EditorView must confirm template replacement or clearing when content exists.')
hasText(editor, 'assistContext: editorAssistContext.value', 'EditorView must send parsed context into assist extension.')
hasText(editor, 'assistTemplateCode', 'EditorView must persist the selected V4 assist template code.')
hasText(editor, 'assistTopicCandidateHints', 'EditorView must surface topic candidate hints.')
hasText(editor, 'stageThreeAssist?.sourceLabel', 'EditorView must show remote/fallback source labels when returned.')

for (const source of [meProfile, postDetail, creatorFeedback]) {
  hasText(source, "source: 'creator_workbench'", 'Phase 1 editor entries must keep source=creator_workbench.')
  hasText(source, 'contextType', 'Phase 1 editor entries must include contextType for V4 handoff.')
  hasText(source, 'returnHref', 'Phase 1 editor entries must include returnHref for V4 handoff.')
}
missing(meProfile + postDetail, /source:\s*'(series_gap|topic_idea|search_gap|own_post_feedback)'/, 'Legacy idea sources must not be used as editor source.')

hasText(contentAssist, 'assistContext: req.extension?.assistContext', 'Content assist remote payload must receive editor assist context.')
hasText(contentAssist, 'assistTemplateCode: safeText(req.extension?.assistTemplateCode)', 'Content assist remote payload must receive selected template code.')
hasText(contentAssist, 'private_career_training_boundary', 'Content assist must keep a private-career boundary fallback.')
hasText(previewCard, '@error="handleCoverError"', 'Public preview card must degrade when a cover image fails.')

const safeVisibleSurface = [editorTemplates, editor, meProfile, postDetail].join('\n')
for (const forbidden of [
  /简历优化|JD 分析|JD 匹配|投递建议|模拟面试|私人训练|私人求职训练|AI 教练/,
  /收益结算|打赏|提现|付费曝光|会员权益|创作者收益/,
  /官方背书|权威认证|保证曝光|保证精选|排名冲榜|冲榜/,
  /自动发布|一键发布完整文章|完整代写/,
]) {
  missing(safeVisibleSurface, forbidden, `V4 editor assist visible surface must stay inside public non-commercial boundaries: ${forbidden}.`)
}

console.log('V4 editor assist guards passed.')
