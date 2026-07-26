import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import ts from 'typescript'

const utilUrl = new URL('../src/utils/editorAssistContext.ts', import.meta.url)
const typesUrl = new URL('../src/api/types.ts', import.meta.url)
const editorUrl = new URL('../src/views/EditorView.vue', import.meta.url)

assert.equal(existsSync(utilUrl), true, 'editor assist context parser must live in src/utils/editorAssistContext.ts')

const transpile = (source) => ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
    importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
  },
}).outputText

const source = readFileSync(utilUrl, 'utf8').replace(/^\uFEFF/, '')
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpile(source)).toString('base64')}`
const mod = await import(moduleUrl)

assert.equal(typeof mod.parseEditorAssistContext, 'function', 'parser must export parseEditorAssistContext')
assert.equal(typeof mod.parseEditorSearchGapContext, 'function', 'parser must export parseEditorSearchGapContext')
assert.equal(typeof mod.buildEditorAssistSourceHint, 'function', 'parser must export buildEditorAssistSourceHint')
assert.deepEqual(
  mod.CREATOR_WORKBENCH_EDITOR_ACTIONS,
  ['update', 'reply', 'continue', 'series', 'topic', 'template', 'fulfill'],
  'creator_workbench actions must include the later collaboration fulfillment contract',
)
assert.deepEqual(
  mod.EDITOR_ASSIST_CONTEXT_TYPES,
  ['post', 'reply', 'idea', 'series', 'topic', 'template', 'need'],
  'editor assist context types must include the later collaboration need contract',
)

const parse = (query) => mod.parseEditorAssistContext(query)

{
  const result = parse({ source: 'creator_workbench', action: 'update', contextType: 'post', postId: '123' })
  assert.equal(result.degraded, false, 'valid creator_workbench post update must not degrade')
  assert.equal(result.context.source, 'creator_workbench')
  assert.equal(result.context.action, 'update')
  assert.equal(result.context.contextType, 'post')
  assert.equal(result.context.postId, '123')
  assert.equal(result.canShowSourceHint, true)
  assert.ok(mod.buildEditorAssistSourceHint(result.context), 'valid context must produce a source hint')
}

{
  const result = parse({ source: 'creator_workbench', action: 'reply', postId: '123', commentId: 'c9' })
  assert.equal(result.degraded, false, 'legacy reply query with postId but no contextType must be compatible')
  assert.equal(result.context.contextType, 'reply')
  assert.equal(result.context.commentId, 'c9')
}

{
  const result = parse({ source: 'creator_workbench', action: 'topic', ideaId: 'idea_1', contextSource: 'series_gap' })
  assert.equal(result.degraded, false, 'legacy idea query with ideaId but no contextType must be compatible')
  assert.equal(result.context.source, 'creator_workbench')
  assert.equal(result.context.contextType, 'idea')
  assert.equal(result.context.ideaId, 'idea_1')
  assert.equal(result.context.contextSource, 'series_gap')
}

{
  const result = parse({ source: 'series_gap', action: 'series', contextType: 'series', seriesId: 's1' })
  assert.equal(result.context, null, 'series_gap must not become EditorAssistContext.source')
  assert.equal(result.degraded, true)
  assert.equal(result.fallbackReason, 'context_only_source')
  assert.equal(result.canShowSourceHint, false)
}

{
  const result = parse({ source: 'topic_idea', action: 'topic', contextType: 'idea', ideaId: 'i1' })
  assert.equal(result.context, null, 'topic_idea must not become EditorAssistContext.source')
  assert.equal(result.fallbackReason, 'context_only_source')
}

{
  const result = parse({ source: 'search_gap', action: 'topic', contextType: 'topic', topicId: 't1' })
  assert.equal(result.context, null, 'search_gap must not become EditorAssistContext.source')
  assert.equal(result.fallbackReason, 'context_only_source')
}

{
  const result = mod.parseEditorSearchGapContext({
    source: 'search_gap',
    keyword: 'system design',
    clusterId: 'cluster-7',
    reasonText: 'Aggregated demand from public discovery signals',
    templateCode: 'question',
    topicId: 'topic-1',
    topicSlug: 'system-design',
    returnHref: '/me#creator-workbench',
    userSearchId: 'private-user-query',
  })
  assert.equal(result.context.source, 'search_gap', 'search gap context must keep its dedicated source')
  assert.equal(result.context.keyword, 'system design')
  assert.equal(result.context.clusterId, 'cluster-7')
  assert.equal(result.context.topicId, 'topic-1')
  assert.equal(result.context.topicSlug, 'system-design')
  assert.equal(result.context.returnHref, '/me#creator-workbench')
  assert.equal(result.context.userSearchId, undefined, 'search gap context must not expose user search records')
  assert.equal(result.canShowSourceHint, true)
  assert.match(result.sourceHint.title, /搜索缺口|search gap/i)
}

{
  const result = mod.parseEditorSearchGapContext({
    source: 'search_discovery',
    keyword: '   ',
    reasonText: 'missing keyword',
  })
  assert.equal(result.context, null, 'search discovery context without keyword must degrade')
  assert.equal(result.degraded, true)
  assert.equal(result.canShowSourceHint, false)
}

{
  const result = parse({ source: 'creator_workbench', postId: '123' })
  assert.equal(result.context, null, 'missing action must degrade to ordinary editor behavior')
  assert.equal(result.degraded, true)
  assert.equal(result.fallbackReason, 'missing_action')
  assert.equal(result.canShowSourceHint, false)
}

{
  const result = parse({
    source: 'creator_workbench',
    editorQuery: JSON.stringify({
      action: 'template',
      contextType: 'template',
      templateCode: 'knowledge_checklist',
      returnHref: '/me?tab=creator-workbench',
    }),
  })
  assert.equal(result.degraded, false, 'nested editorQuery must remain compatible')
  assert.equal(result.context.templateCode, 'knowledge_checklist')
  assert.equal(result.context.returnHref, '/me?tab=creator-workbench')
}

{
  const result = parse({ source: 'creator_workbench', action: 'update', postId: '999' })
  assert.equal(result.degraded, false, 'postId without contextType must infer post for non-reply actions')
  assert.equal(result.context.contextType, 'post')
}

const types = readFileSync(typesUrl, 'utf8').replace(/^\uFEFF/, '')
assert.match(types, /export type EditorAssistSource/, 'api types must expose EditorAssistSource')
assert.match(types, /export interface EditorAssistContext/, 'api types must expose EditorAssistContext')
assert.match(types, /export interface EditorSearchGapContext/, 'api types must expose EditorSearchGapContext')
assert.match(types, /source:\s*'search_gap'\s*\|\s*'search_discovery'/, 'EditorSearchGapContext must use dedicated search gap sources')
assert.match(types, /contextType:\s*EditorAssistContextType/, 'EditorAssistContext must carry explicit contextType')
assert.doesNotMatch(types, /EditorAssistSource[\s\S]{0,300}series_gap/, 'EditorAssistSource must not include series_gap')
assert.doesNotMatch(types, /EditorAssistSource[\s\S]{0,300}topic_idea/, 'EditorAssistSource must not include topic_idea')
assert.doesNotMatch(types, /EditorAssistSource[\s\S]{0,300}search_gap/, 'EditorAssistSource must not include search_gap')

const editor = readFileSync(editorUrl, 'utf8').replace(/^\uFEFF/, '')
assert.match(editor, /parseEditorAssistContext/, 'EditorView must use the shared editor assist context parser')
assert.match(editor, /parseEditorSearchGapContext/, 'EditorView must use the dedicated search gap context parser')
assert.match(editor, /editorSearchGapContext/, 'EditorView must keep search gap context separate from creator assist context')
assert.doesNotMatch(
  editor,
  /allowedSources\s*=\s*new Set\(\[[^\]]*(series_gap|topic_idea|search_gap)/,
  'EditorView must not allow legacy context-only values as entry source',
)

console.log('V4 editor assist context guard passed')
