import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import assert from 'node:assert/strict'
import MarkdownIt from 'markdown-it'

const source = fs.readFileSync(new URL('../src/utils/markdown.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
})

const sandbox = {
  exports: {},
  require: (name) => {
    if (name === 'markdown-it') return MarkdownIt
    throw new Error(`Unexpected require: ${name}`)
  },
}
vm.runInNewContext(compiled.outputText, sandbox)

const { renderMarkdown } = sandbox.exports

const html = renderMarkdown('<img src=x onerror=alert(1)> [bad](javascript:alert(1)) [ok](https://offerlab.example)')

assert.doesNotMatch(html, /<img/i)
assert.doesNotMatch(html, /<[^>]*\sonerror=/i)
assert.doesNotMatch(html, /href="javascript:/i)
assert.match(html, /&lt;img/)
assert.match(html, /href="https:\/\/offerlab\.example"/)
assert.match(html, /target="_blank"/)
assert.match(html, /rel="noopener noreferrer nofollow"/)

const postCard = fs.readFileSync(new URL('../src/components/post/PostCard.vue', import.meta.url), 'utf8')
assert.match(postCard, /escapeHtml\(highlight\)/, 'Search highlight HTML must be escaped before rendering')
assert.match(postCard, /&lt;em&gt;\/g/, 'Only escaped ES em tags may be converted into mark tags')
assert.match(postCard, /search-highlight/, 'Search highlights must render with a visible mark style')

const typesSource = fs.readFileSync(new URL('../src/api/types.ts', import.meta.url), 'utf8')
assert.match(typesSource, /highlightTitle\?: string/, 'Post type must carry search highlight title')
assert.match(typesSource, /highlightSummary\?: string/, 'Post type must carry search highlight summary')

console.log('markdown safety tests passed')
