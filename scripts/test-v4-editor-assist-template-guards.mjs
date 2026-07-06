import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const moduleUrl = new URL('../src/data/editorAssistTemplates.ts', import.meta.url)
const source = readFileSync(moduleUrl, 'utf8')

const forbiddenCopy = [
  /私人训练/,
  /私人 AI/,
  /AI 教练/,
  /简历/,
  /\bJD\b/i,
  /投递/,
  /完整代写/,
  /代写/,
  /收益/,
  /付费/,
  /背书/,
  /保证曝光/,
  /曝光承诺/,
  /保证精选/,
  /官方认证/,
]

for (const pattern of forbiddenCopy) {
  assert.doesNotMatch(source, pattern, `V4 editor assist templates must not contain forbidden boundary copy: ${pattern}`)
}

const tempDir = mkdtempSync(join(tmpdir(), 'offerlab-editor-assist-'))
try {
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true,
    },
  })
  const outputPath = join(tempDir, 'editorAssistTemplates.mjs')
  writeFileSync(outputPath, transpiled.outputText, 'utf8')

  const templatesModule = await import(pathToFileURL(outputPath).href)
  const {
    EDITOR_ASSIST_TEMPLATE_CODES,
    PUBLIC_EDITOR_ASSIST_TEMPLATES,
    applyEditorAssistTemplateSelection,
    createEditorAssistTemplateMarkdown,
    getEditorAssistTemplate,
    isEditorAssistTemplateCode,
    listEditorAssistTemplates,
  } = templatesModule

  const expectedCodes = [
    'technical_review',
    'interview_experience_review',
    'project_summary',
    'knowledge_checklist',
    'topic_supplement',
    'discussion_prompt',
    'resource_note',
    'short_opinion',
  ]

  assert.deepEqual([...EDITOR_ASSIST_TEMPLATE_CODES], expectedCodes, 'P0 editor assist template codes must be exact and ordered')
  assert.deepEqual(
    listEditorAssistTemplates().map((template) => template.code),
    expectedCodes,
    'template list helper must expose the same exact P0 public template set',
  )
  assert.equal(PUBLIC_EDITOR_ASSIST_TEMPLATES.length, expectedCodes.length, 'P0 template list must contain exactly eight templates')

  for (const code of expectedCodes) {
    assert.equal(isEditorAssistTemplateCode(code), true, `${code} must be recognized as a template code`)
    const template = getEditorAssistTemplate(code)
    assert.ok(template, `${code} must resolve to a template`)
    assert.equal(template.code, code, `${code} must keep its own code`)
    assert.equal(template.audience, 'public_content', `${code} must be scoped to public content production`)
    assert.equal(template.editableMarkdown, true, `${code} body must be editable markdown, not a locked form`)
    assert.ok(template.name.length >= 4, `${code} must have a readable display name`)
    assert.ok(template.description.includes('公开') || template.description.includes('公共'), `${code} must keep public-content positioning`)
    assert.ok(template.actions.length > 0, `${code} must declare applicable editor actions`)
    assert.ok(template.sourceHints.length > 0, `${code} must declare safe trigger hints`)
    assert.ok(template.boundaryNote.includes('结构'), `${code} must state that it is only a starter structure`)

    const markdown = createEditorAssistTemplateMarkdown(code)
    assert.equal(markdown, template.markdown.trim(), `${code} markdown helper must return the editable template body`)
    assert.match(markdown, /^## /m, `${code} markdown must use visible Markdown sections`)
    assert.ok((markdown.match(/^## /gm) || []).length >= 3, `${code} markdown should provide a useful starter structure`)
    assert.ok(markdown.length < 620, `${code} markdown must stay a starter, not a full article`)
    assert.doesNotMatch(markdown, /^# /m, `${code} markdown must not generate a finished article title`)
  }

  assert.equal(getEditorAssistTemplate('resume_optimization'), null, 'unknown or unsafe template code must not resolve')
  assert.equal(isEditorAssistTemplateCode('paid_column'), false, 'non-P0 template code must be rejected')
  assert.equal(createEditorAssistTemplateMarkdown('paid_column'), '', 'unknown template markdown must be empty')

  const inserted = applyEditorAssistTemplateSelection({
    currentContent: '',
    nextTemplateCode: 'technical_review',
  })
  assert.equal(inserted.status, 'inserted', 'empty content should insert the selected template immediately')
  assert.equal(inserted.selectedTemplateCode, 'technical_review', 'inserted result must persist the selected template code')
  assert.match(inserted.content, /^## /, 'inserted result must write Markdown into content')

  const needsConfirmation = applyEditorAssistTemplateSelection({
    currentContent: '已有正文',
    currentTemplateCode: 'technical_review',
    nextTemplateCode: 'project_summary',
  })
  assert.equal(needsConfirmation.status, 'needs_confirmation', 'switching template with existing content must ask for confirmation')
  assert.deepEqual(needsConfirmation.confirmationOptions, ['append', 'replace', 'cancel'], 'confirmation must support append, replace, or cancel')
  assert.equal(needsConfirmation.content, '已有正文', 'confirmation result must not mutate existing content')

  const appended = applyEditorAssistTemplateSelection({
    currentContent: '已有正文',
    currentTemplateCode: 'technical_review',
    nextTemplateCode: 'project_summary',
    mode: 'append',
  })
  assert.equal(appended.status, 'inserted', 'append confirmation should insert markdown')
  assert.match(appended.content, /^已有正文\n\n## /, 'append mode must preserve existing content before the template')

  const replaced = applyEditorAssistTemplateSelection({
    currentContent: '已有正文',
    currentTemplateCode: 'technical_review',
    nextTemplateCode: 'knowledge_checklist',
    mode: 'replace',
  })
  assert.equal(replaced.status, 'inserted', 'replace confirmation should insert markdown')
  assert.equal(replaced.content, createEditorAssistTemplateMarkdown('knowledge_checklist'), 'replace mode must use only the new template markdown')

  const cancelled = applyEditorAssistTemplateSelection({
    currentContent: '已有正文',
    currentTemplateCode: 'technical_review',
    nextTemplateCode: 'project_summary',
    mode: 'cancel',
  })
  assert.equal(cancelled.status, 'cancelled', 'cancel mode must leave the editor untouched')
  assert.equal(cancelled.selectedTemplateCode, 'technical_review', 'cancel mode must keep the previous template code')
  assert.equal(cancelled.content, '已有正文', 'cancel mode must preserve content')

  const cleared = applyEditorAssistTemplateSelection({
    currentContent: createEditorAssistTemplateMarkdown('technical_review'),
    currentTemplateCode: 'technical_review',
    mode: 'clear',
  })
  assert.equal(cleared.status, 'cleared', 'clear mode must clear the selected template body')
  assert.equal(cleared.selectedTemplateCode, null, 'clear mode must remove the selected template code')
  assert.equal(cleared.content, '', 'clear mode must empty the editable template body')

  console.log('V4 editor assist template guards passed.')
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
