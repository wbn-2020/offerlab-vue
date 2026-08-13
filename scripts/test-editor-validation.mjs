import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const validation = readFileSync(new URL('../src/utils/editorValidation.ts', import.meta.url), 'utf8')
const editor = readFileSync(new URL('../src/views/EditorView.vue', import.meta.url), 'utf8')
const markdownEditor = readFileSync(new URL('../src/components/post/MarkdownEditor.vue', import.meta.url), 'utf8')
const postMeta = readFileSync(new URL('../src/components/post/PostMeta.vue', import.meta.url), 'utf8')
const limits = readFileSync(new URL('../../offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/api/dto/PostContentLimits.java', import.meta.url), 'utf8')
const createCmd = readFileSync(new URL('../../offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/api/dto/PostCreateCmd.java', import.meta.url), 'utf8')
const postController = readFileSync(new URL('../../offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/controller/PostController.java', import.meta.url), 'utf8')
const draftController = readFileSync(new URL('../../offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/controller/PostDraftController.java', import.meta.url), 'utf8')
const requestGateSource = readFileSync(new URL('../src/utils/latestRequestGate.ts', import.meta.url), 'utf8')

const importTypeScript = async (source) => {
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)
}

const editorValidation = await importTypeScript(validation)
const requestLifecycle = await importTypeScript(requestGateSource)

assert.match(validation, /titleMax:\s*200/, 'frontend title limit must be 200')
assert.match(validation, /当前超出 \$\{title\.length - EDITOR_LIMITS\.titleMax\} 个/, 'title error must include overflow amount')
assert.match(validation, /summaryMax:\s*240/, 'summary limit must be explicit')
assert.match(validation, /tagMax:\s*5/, 'editor tag limit must be explicit')
assert.match(editor, /:maxlength="EDITOR_LIMITS\.titleMax"/, 'title input must consume the shared limit')
assert.match(editor, /@compositionstart="handleTitleCompositionStart"/, 'title must capture the value before IME composition')
assert.match(editor, /@compositionend="handleTitleCompositionEnd"/, 'title must validate at composition end')
assert.match(editor, /@paste="handleTitlePaste"/, 'title must validate pasted values')
assert.match(editor, /validateEditorPublish\(/, 'publish must use the shared editor validator')
assert.match(editor, /syncEditedFieldErrors/, 'corrected editor fields must clear stale field errors')
assert.match(editor, /正在发布，请勿重复提交|正在保存修改，请勿重复提交/, 'publish disabled reason must explain duplicate-submit protection')
assert.match(editor, /if \(isPublishing\.value \|\| isLoadingPost\.value\) return/, 'publish handler must be idempotent while busy')
assert.match(markdownEditor, /@compositionstart="handleCompositionStart"/, 'body must capture the value before IME composition')
assert.match(markdownEditor, /@compositionend="handleCompositionEnd"/, 'body must validate at composition end')
assert.match(markdownEditor, /@paste="handlePaste"/, 'body must clamp pasted values')
assert.match(markdownEditor, /textarea\?\.value/, 'body paste handling must read the post-paste textarea value')
assert.match(postMeta, /:maxlength="EDITOR_LIMITS\.summaryMax"/, 'summary input must consume shared limit')
assert.match(postMeta, /errors\?\.summary/, 'summary must expose a field-level error')
assert.match(postMeta, /techStacks:\s*\[\.\.\.\(localMeta\.value\.techStacks/, 'metadata updates must not share mutable arrays with the parent')
assert.match(limits, /MIN_TITLE_LEN = 8/, 'backend must expose shared minimum title limit')
assert.match(limits, /MAX_TITLE_LEN = 200/, 'backend must expose shared maximum title limit')
assert.doesNotMatch(createCmd, /@Size\(max = 255\)[\s\S]*private String title/, 'create command must not keep 255 title limit')
assert.doesNotMatch(postController, /@Size\(max = 255\)[\s\S]*private String title/, 'post controller must not keep 255 title limit')
assert.doesNotMatch(draftController, /@Size\(max = 255\)[\s\S]*private String title/, 'draft controller must not keep 255 title limit')

const validResult = editorValidation.validateEditorPublish({
  domain: 1,
  title: '足够长度的测试标题',
  content: '正文内容'.repeat(20),
  summary: '摘要',
  tags: ['Java', 'java', ' Redis '],
  coverUrl: 'https://example.com/cover.png',
  minContentLength: 40,
  minTagCount: 1,
})
assert.deepEqual(validResult.errors, {}, 'valid editor input must pass without field errors')
assert.deepEqual(validResult.normalized.tags, ['Java', 'Redis'], 'tags must normalize and deduplicate case-insensitively')

const invalidResult = editorValidation.validateEditorPublish({
  domain: undefined,
  title: '短',
  content: '',
  summary: '摘'.repeat(241),
  tags: [],
  coverUrl: 'javascript:alert(1)',
  minContentLength: 40,
  minTagCount: 1,
})
assert.deepEqual(
  Object.keys(invalidResult.errors),
  ['domain', 'title', 'content', 'summary', 'tags', 'coverUrl'],
  'publish validation must report every blocking field in one pass',
)

assert.equal(
  editorValidation.applyEditorTextLimit('标'.repeat(201), '标'.repeat(200), 200).length,
  200,
  'legacy over-limit text must be allowed to shrink without losing the remaining value',
)
assert.equal(
  editorValidation.applyEditorTextLimit('标'.repeat(201), '标'.repeat(202), 200).length,
  201,
  'legacy over-limit text must not be allowed to grow',
)
assert.equal(
  editorValidation.applyEditorTextLimit('标'.repeat(199), '标'.repeat(201), 200).length,
  200,
  'new text must stop at the configured limit',
)
assert.doesNotMatch(
  editor,
  /title:\s*clampEditorText\(draft\.title|content:\s*clampEditorText\(draft\.content|title:\s*clampEditorText\(post\.title/,
  'loading posts and drafts must not silently truncate legacy content',
)
assert.match(editor, /exposeLoadedLimitErrors\(\)/, 'loaded over-limit content must expose actionable field errors')
assert.match(editor, /if \(!addEditorTags\(\[item\.label\]\)\) return/, 'failed assistant tag adoption must not report success')
assert.match(
  editor,
  /selectedTags\.value\.splice\(idx,\s*1\)[\s\S]*?form\.value\.tags\s*=\s*\[\]/,
  'editing loaded tags must discard legacy ids and publish the visible text selection',
)
assert.match(
  editor,
  /const changed = next\.length !== selectedTags\.value\.length[\s\S]*?if \(changed\) form\.value\.tags = \[\]/,
  'adding a tag to loaded content must also discard stale tag ids',
)
assert.match(editor, /blockingQualityIssues\.value\.map/, 'disabled publish actions must explain structured quality blockers')
assert.doesNotMatch(editor, /watch\(\(\) => form\.value\.extension/, 'metadata errors must not be cleared by a broad deep watcher')

const gate = requestLifecycle.createLatestRequestGate()
const firstRequest = gate.start()
const secondRequest = gate.start()
assert.equal(firstRequest.signal.aborted, true, 'starting a newer request must abort the previous request')
assert.equal(firstRequest.isCurrent(), false, 'an older request must lose ownership immediately')
assert.equal(secondRequest.isCurrent(), true, 'the newest request must own state updates')
gate.invalidate()
assert.equal(secondRequest.signal.aborted, true, 'component cleanup must abort the in-flight request')
assert.equal(secondRequest.isCurrent(), false, 'cleanup must prevent late state writes')

console.log('editor validation contract guard passed')
