import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const postApi = readFileSync(new URL('../src/api/post.ts', import.meta.url), 'utf8')
const editor = readFileSync(new URL('../src/views/EditorView.vue', import.meta.url), 'utf8')
const textQuality = readFileSync(new URL('../src/utils/textQuality.ts', import.meta.url), 'utf8')

assert.match(postApi, /interface PostDraft/, 'post API must type server drafts')
for (const field of [
  'sourcePostId',
  'postType',
  'domain',
  'anonymous',
  'title',
  'content',
  'tagIds',
  'tagNames',
  'updateTime',
]) {
  assert.match(postApi, new RegExp(field), `PostDraft must expose ${field}`)
}
assert.match(postApi, /interface PostDraftReq[\s\S]*domain\?:\s*number/, 'PostDraftReq must send explicit draft domain')
assert.match(postApi, /interface PostDraftReq[\s\S]*anonymous\?:\s*boolean/, 'PostDraftReq must send explicit draft anonymous')
assert.match(postApi, /domain:\s*normalizeDomain\(\s*raw\?\.domain\s*\?\?\s*extension\?\.domain\s*\)/, 'adaptPostDraft must normalize top-level domain with extJson.domain fallback')
assert.match(postApi, /anonymous:\s*Boolean\(\s*raw\?\.anonymous\s*\?\?\s*extension\?\.anonymous\s*\)/, 'adaptPostDraft must read anonymous from top-level field with extJson fallback')
assert.match(postApi, /draftId\?: ApiId/, 'post create/update requests must carry draftId')
assert.match(postApi, /listDrafts/, 'post API must list server drafts')
assert.match(postApi, /getDraft/, 'post API must load a server draft')
assert.match(postApi, /getLatestDraftBySourcePost/, 'post API must load edit drafts by source post')
assert.match(postApi, /saveDraft/, 'post API must save server drafts')
assert.match(postApi, /deleteDraft/, 'post API must delete drafts')
assert.match(postApi, /\/api\/v1\/post-drafts/, 'server draft endpoint path must stay stable')
assert.match(postApi, /adaptPostDraft/, 'server draft response must be adapted')

assert.match(editor, /type PostDraft/, 'editor must import PostDraft type')
assert.match(editor, /serverDrafts = ref<PostDraft\[\]>\(\[\]\)/, 'editor must keep server draft list state')
assert.match(editor, /serverDraftId = ref\(''\)/, 'editor must track current server draft id')
assert.match(editor, /selectedDraftId = ref\(''\)/, 'editor must track selected draft id')
assert.match(editor, /服务端草稿/, 'editor must expose server draft selector')
assert.match(editor, /visibleDraftText/, 'editor must clean draft labels before showing them')
assert.match(editor, /hasLowQualityVisibleText/, 'editor must detect mojibake-like draft labels through the shared text-quality module')
assert.match(editor, /sanitizeVisibleText/, 'editor must clean draft labels before showing them through the shared text-quality module')
assert.match(editor, /sanitizePublicVisibleText/, 'editor must hide synthetic probe text in visible draft labels')
assert.match(editor, /hasUnsafeDraftPayload/, 'editor must inspect drafts for both mojibake and synthetic probe text before restoring')
assert.match(editor, /isSyntheticVisibleText/, 'editor must reuse the shared synthetic-text detector before restoring drafts')
assert.match(textQuality, /MOJIBAKE_VISIBLE_TEXT/, 'text-quality module must centralize mojibake-like visible text markers')
assert.match(textQuality, /\\u00E6/, 'text-quality module must reject latin-1 mojibake marker')
assert.match(textQuality, /\\u00C3/, 'text-quality module must reject latin-1 mojibake marker')
assert.match(textQuality, /\\u9427/, 'text-quality module must reject Chinese mojibake marker')
assert.match(textQuality, /\\u6769/, 'text-quality module must reject Chinese mojibake marker')
assert.match(textQuality, /\\u7459/, 'text-quality module must reject Chinese mojibake marker')
assert.match(textQuality, /\\u93BB/, 'text-quality module must reject Chinese mojibake marker')
assert.match(textQuality, /questionMarks >= 2/, 'text-quality module must reject question-mark-heavy corrupted draft labels')
assert.match(editor, /hasLowQualityDraftPayload/, 'editor must inspect draft body before restoring it')
assert.match(editor, /\$\{sourceLabel\}疑似包含乱码或测试数据，已跳过恢复/, 'server drafts with mojibake-like or synthetic content must not be restored')
assert.match(editor, /本地草稿疑似包含乱码或测试数据，已跳过恢复/, 'local fallback drafts with mojibake-like or synthetic content must not be restored')
assert.match(editor, /if \(!applyDraft\(draft, '服务端草稿'\)\) return/, 'selected server draft restore must stop when draft text is corrupted')
assert.match(editor, /if \(!applyDraft\(res\.data, '未发布编辑草稿'\)\) return false/, 'edit source draft restore must stop when draft text is corrupted')

assert.match(editor, /currentDraftReq/, 'editor must build a stable draft payload')
assert.match(editor, /domain:\s*selectedDomain\.value/, 'server draft request must include selected domain')
assert.match(editor, /anonymous:\s*selectedDomain\.value\s*===\s*DOMAIN\.CAREER\s*\?\s*anonymousCareerPost\.value\s*:\s*false/, 'server draft request must include anonymous only for CAREER')
assert.match(editor, /domain:\s*selectedDomain\.value[\s\S]*anonymous:\s*selectedDomain\.value\s*===\s*DOMAIN\.CAREER/s, 'server draft extJson must preserve domain and anonymous fallback values')
assert.match(editor, /applyDraft/, 'editor must apply server drafts into the form')
assert.match(editor, /normalizeDomain\(\s*draft\.domain\s*\?\?\s*extension\.domain\s*\?\?\s*\(extension\.anonymous\s*\?\s*DOMAIN\.CAREER\s*:\s*DOMAIN\.LIFESTYLE\)\s*\)/, 'server draft restore must prefer explicit domain, fallback to extJson.domain, then community default')
assert.match(editor, /anonymousCareerPost\.value\s*=\s*selectedDomain\.value\s*===\s*DOMAIN\.CAREER\s*\?\s*Boolean\(\s*draft\.anonymous\s*\?\?\s*extension\.anonymous\s*\)\s*:\s*false/, 'server draft restore must prefer explicit anonymous and fallback to extJson.anonymous')
assert.match(editor, /draftForm\.extension\?\.domain/, 'local draft restore must fallback to legacy extension.domain')
assert.match(editor, /loadServerDrafts/, 'editor must load server drafts for new posts')
assert.match(editor, /loadSelectedDraft/, 'editor must restore selected server drafts')
assert.match(editor, /loadLatestSourceDraft/, 'editor must restore edit drafts by source post')
assert.match(editor, /restoreLocalDraft/, 'editor must keep local fallback restore')
assert.match(editor, /postApi\.saveDraft\(currentDraftReq\(\)\)/, 'save button must sync to the server')
assert.match(editor, /draftId: serverDraftId\.value \|\| undefined/, 'publish/update request must include draftId')
assert.match(editor, /safeStorage\.remove\(localDraftKey\(\)\)/, 'publish/update success must clear local fallback draft')

assert.match(editor, /publishFailure = ref/, 'editor must keep a publish failure diagnostic state')
assert.match(editor, /publish-diagnostic/, 'editor must render a publish failure diagnostic card')
assert.match(editor, /persistLocalDraft\(\)[\s\S]*const errors = extractFieldErrors\(error\)/, 'publish failure must protect local draft before parsing server field errors')
assert.match(editor, /草稿已保存/, 'publish failure toast must explicitly confirm the draft was saved')
assert.match(editor, /retryWithTextTagsOnly/, 'editor must offer a safe text-tag retry path for tag/schema failures')
assert.match(editor, /canRetryWithTextTagsOnly\s*=\s*computed\(\(\)\s*=>\s*normalizedTags\.value\.length > 0 && form\.value\.tags\.length > 0\)/, 'editor text-tag retry must only show when old tag IDs can be replaced by visible tag text')
assert.match(editor, /if \(!textTags\.length\)[\s\S]*当前没有可保留的标签文本/, 'editor text-tag retry must guard direct calls without visible tag text')
assert.match(editor, /保留文本标签重试/, 'editor must explain the safe tag retry action in visible copy')
assert.doesNotMatch(editor, /to="\/admin\/tags"/, 'editor must not route users to unavailable tag governance when publish fails')
assert.doesNotMatch(editor, /\/admin\/tags/, 'editor publish failure diagnostics must not contain unavailable tag governance routes')
assert.match(editor, /Trace: \{\{ publishFailure\.traceId \}\}/, 'publish failure diagnostic must display trace id when present')
assert.match(editor, /数据库迁移可能未补齐/, 'publish failure diagnostic must mention missing migration as a possible 5xx cause')

assert.match(editor, /@media \(max-width: 640px\)/, 'editor must include a dedicated narrow-screen layout rule')
assert.match(editor, /\.draft-select[\s\S]*width:\s*100%/, 'editor mobile draft selector must be full width')
assert.match(editor, /\.publish-action-group button[\s\S]*min-height:\s*44px/, 'editor mobile publish buttons must keep touch-friendly height')
assert.match(editor, /\.publish-diagnostic-actions[\s\S]*grid-template-columns:\s*1fr/, 'editor mobile diagnostic actions must stack in one column')

assert.match(editor, /内容整理辅助/, 'editor must expose local knowledge-assist guidance for community posts')
assert.match(editor, /knowledgeAssistMarkdown/, 'editor must build a copyable knowledge-assist draft')
assert.match(editor, /copyKnowledgeAssist/, 'editor must let authors copy the generated knowledge-assist draft')
assert.match(editor, /fillSummaryFromAssist/, 'editor must let authors write the generated summary back into post metadata')
assert.match(editor, /FAQ 候选/, 'editor knowledge assist must guide authors toward reusable FAQ content')
assert.match(editor, /知识卡候选/, 'editor knowledge assist must guide authors toward reusable knowledge cards')
assert.match(editor, /\.knowledge-assist[\s\S]*@media \(max-width: 640px\)/, 'editor knowledge assist must keep narrow-screen layout coverage')
assert.doesNotMatch(editor, /[閺嗘０閸氱粙]|锟絴\?\? \?\?\?\?/, 'editor visible server draft flow must not contain mojibake text')

console.log('server post drafts guard passed')
