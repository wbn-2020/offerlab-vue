import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const apiTypes = read('../src/api/types.ts')
const assistApi = read('../src/api/contentAssist.ts')
const checklist = read('../src/utils/editorQualityChecklist.ts')
const checklistComponent = read('../src/components/editor-quality/EditorQualityChecklist.vue')

assert.match(apiTypes, /export type ContentAssistSuggestionType\s*=/, 'content assist suggestions must expose an explicit tag/topic type')
assert.match(apiTypes, /type:\s*ContentAssistSuggestionType/, 'ContentAssistSuggestion must include its suggestion type')
assert.match(apiTypes, /export interface ContentAssistTopicCandidateHint\b/, 'topic candidate hints must have a typed contract')
assert.match(apiTypes, /status:\s*'candidate'/, 'topic candidate hints must stay candidate-only')
assert.match(apiTypes, /sourceLabel\?:\s*string/, 'content assist result must expose user-visible source/fallback labels')
assert.match(apiTypes, /source:\s*ContentAssistSource/, 'content assist result must use a shared source union')

assert.match(checklist, /'blocking'/, 'editor quality checklist must support governance/security blocking state')
assert.match(checklist, /safety/, 'editor quality checklist must include a safety boundary item')
assert.match(checklistComponent, /state === 'blocking'/, 'quality checklist UI must render blocking state distinctly')

const forbiddenUserCopy = [
  /保证推荐/,
  /保证精选/,
  /保证曝光/,
  /官方背书/,
  /权威认证/,
  /变现机会/,
  /训练计划/,
  /简历优化/,
  /\bJD\s*匹配\b/i,
  /投递建议/,
]

for (const source of [assistApi, checklist, checklistComponent]) {
  for (const pattern of forbiddenUserCopy) {
    assert.doesNotMatch(source, pattern, `editor assist quality surface must avoid forbidden user-facing copy: ${pattern}`)
  }
}

const tempDir = mkdtempSync(join(tmpdir(), 'offerlab-v4-editor-assist-quality-'))
try {
  const compileModule = (name, source) => {
    const outputPath = join(tempDir, `${name}.mjs`)
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
        strict: true,
      },
    })
    writeFileSync(outputPath, transpiled.outputText, 'utf8')
    return import(pathToFileURL(outputPath).href)
  }

  const domainShim = `
const DOMAIN = { TECH: 1, CAREER: 2, READING: 3, LIFESTYLE: 4, INVESTMENT: 5 }
const domainLabels = new Map([[1, '科技数码'], [2, '职场经验'], [3, '学习成长'], [4, '生活方式'], [5, '投资理财']])
const isKnownDomain = (domain) => domainLabels.has(Number(domain))
const normalizeDomain = (domain) => domainLabels.has(Number(domain)) ? Number(domain) : DOMAIN.TECH
const getDomainLabel = (domain) => domainLabels.get(normalizeDomain(domain)) || '科技数码'
`

  const contentAssistHarness = assistApi
    .replace(
      /import client, \{ BizException, type Result, getErrorMessage \} from '\.\/client'\r?\n/,
      `
class BizException extends Error {}
const client = { post: async () => { throw new Error('backend unavailable') } }
const getErrorMessage = (error, fallback = '操作失败') => error && error.message ? error.message : fallback
`,
    )
    .replace(/import \{ DOMAIN, getDomainLabel, isKnownDomain, normalizeDomain \} from '@\/utils\/domains'\r?\n/, domainShim)
    .replace(/import \{ POST_TYPE \} from '@\/utils\/contentTypes'\r?\n/, 'const POST_TYPE = { QUESTION: 13 }\n')
    .replace(/import \{ sanitizeVisibleText \} from '@\/utils\/textQuality'\r?\n/, 'const sanitizeVisibleText = (value, fallback = \'\') => String(value ?? \'\').replace(/\\s+/g, \' \').trim() || fallback\n')

  const checklistHarness = checklist
    .replace(/import \{ DOMAIN, getDomainLabel, normalizeDomain, type DomainValue \} from '@\/utils\/domains'\r?\n/, domainShim)

  const { contentAssistApi } = await compileModule('contentAssist', contentAssistHarness)
  const { evaluateEditorQualityChecklist } = await compileModule('editorQualityChecklist', checklistHarness)

  const privateAssist = await contentAssistApi.getEditorAssist({
    title: '需要优化简历并匹配 JD',
    content: '请根据我的简历、JD 和投递记录安排私人模拟面试训练。',
    postType: 15,
    domain: 2,
    tags: [],
  })
  assert.equal(privateAssist.data.status, 'degraded', 'private career training input must become a degraded boundary result')
  assert.equal(privateAssist.data.source, 'fallback', 'private career training boundary must be locally labeled')
  assert.equal(privateAssist.data.fallbackReason, 'private_career_training_boundary', 'private career boundary must expose a stable fallback reason')
  assert.equal(privateAssist.data.tagSuggestions.length, 0, 'private career training input must not produce tag suggestions')
  assert.equal(privateAssist.data.topicSuggestions.length, 0, 'private career training input must not produce topic suggestions')
  assert.equal(privateAssist.data.seriesHints.length, 0, 'private career training input must not produce series hints')

  const normalAssist = await contentAssistApi.getEditorAssist({
    title: 'Redis 缓存穿透复盘',
    content: '背景：线上缓存穿透。过程：排查 Redis 和 MySQL。方案：补充空值缓存。结果：错误率下降。',
    postType: 11,
    domain: 1,
    tags: [],
  })
  assert.equal(normalAssist.data.source, 'fallback', 'remote failure must keep an explicit fallback source')
  assert.match(normalAssist.data.sourceLabel, /本地规则/, 'fallback assist must expose a clear source label')
  assert.ok(normalAssist.data.fallbackReason, 'fallback assist must explain why it is degraded')
  assert.ok(normalAssist.data.tagSuggestions.every((item) => item.type === 'tag'), 'tag suggestions must be typed as tag')
  assert.ok(normalAssist.data.topicSuggestions.every((item) => item.type === 'topic'), 'topic suggestions must be typed as topic')
  assert.ok((normalAssist.data.topicCandidateHints || []).every((item) => item.status === 'candidate'), 'topic candidate hints must not imply inclusion')

  const quality = evaluateEditorQualityChecklist({
    title: '简历和 JD 匹配求建议',
    content: '请基于我的投递记录和私人模拟面试记录给训练计划。',
    domain: 2,
    tags: ['求职'],
  })
  assert.ok(quality.items.some((item) => item.key === 'safety' && item.state === 'blocking'), 'private career training input must produce a safety blocking checklist item')
  assert.ok(quality.summary.blocking >= 1, 'quality summary must count blocking items')

  console.log('V4 editor assist quality guards passed.')
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
