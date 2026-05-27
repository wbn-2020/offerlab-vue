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

console.log('markdown safety tests passed')
