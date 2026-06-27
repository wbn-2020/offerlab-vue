import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const contentSeriesApi = readFileSync(new URL('../src/api/contentSeries.ts', import.meta.url), 'utf8')
const editorPreview = readFileSync(new URL('../src/utils/editorPreview.ts', import.meta.url), 'utf8')
const qualityChecklist = readFileSync(new URL('../src/utils/editorQualityChecklist.ts', import.meta.url), 'utf8')

assert.match(contentSeriesApi, /const shouldRethrowSeriesError = \(error: unknown\)/, 'content series API must distinguish remote/auth failures from local fallback reads')
assert.match(contentSeriesApi, /if \(shouldRethrowSeriesError\(error\)\) throw error/, 'content series API must rethrow auth or permission failures instead of masking them as fallback success')
assert.match(contentSeriesApi, /const LOCAL_ONLY_MESSAGE = 'local_only'/, 'content series API must define the local-only fallback marker explicitly')
assert.match(contentSeriesApi, /message:\s*LOCAL_ONLY_MESSAGE/, 'content series API must mark local-only fallback responses explicitly')
assert.doesNotMatch(contentSeriesApi, /catch\s*\{\s*return\s*\{\s*code:\s*0,\s*message:\s*'fallback'/s, 'content series API must not blindly convert every catch into fallback success')

assert.match(editorPreview, /summarySource:\s*'explicit' \| 'derived' \| 'placeholder'/, 'editor preview model must keep the current summary source contract')
assert.match(editorPreview, /const explicitSummary = normalizeText\(draft\.summary\)\s*\|\|\s*normalizeText\(draft\.extension\?\.summary\)/, 'editor preview explicit summary must come only from user or extension summary fields')
assert.match(editorPreview, /const fallbackSummary = normalizeText\(options\.fallbackSummary\)/, 'editor preview must keep fallback summary separate from explicit summary')
assert.match(editorPreview, /source:\s*'derived' as const/, 'editor preview fallback summary must be classified as derived')

assert.match(qualityChecklist, /const paragraphCount = meaningfulParagraphCount\(plainText\)/, 'editor quality checklist must count paragraphs from normalized plain text')
assert.doesNotMatch(qualityChecklist, /meaningfulParagraphCount\(content\)/, 'editor quality checklist must not count paragraphs from raw markdown content')

console.log('editor fallback semantics guard passed')
