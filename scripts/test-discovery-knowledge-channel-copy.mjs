import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import * as ts from 'typescript'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

const executeCommonJs = (source, filename, dependencies = {}) => {
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText
  const sandbox = {
    module: { exports: {} },
    exports: {},
    require: (specifier) => {
      if (Object.prototype.hasOwnProperty.call(dependencies, specifier)) return dependencies[specifier]
      throw new Error(`Unexpected dependency: ${specifier}`)
    },
    console,
    Intl,
  }
  sandbox.exports = sandbox.module.exports
  vm.runInNewContext(compiled, sandbox, { filename })
  return sandbox.module.exports
}

const [domainsSource, displaySource, exploreView, searchView, knowledgeView, slotCard, operationsApi, knowledgeApi] = await Promise.all([
  read('src/utils/domains.ts'),
  read('src/utils/publicDisplay.ts'),
  read('src/views/ExploreView.vue'),
  read('src/views/SearchView.vue'),
  read('src/views/KnowledgeExploreView.vue'),
  read('src/components/operations/OperationSlotCard.vue'),
  read('src/api/operations.ts'),
  read('src/api/knowledge.ts'),
])

const domains = executeCommonJs(domainsSource, 'domains.ts', {
  '@/utils/contentTypes': {
    POST_TYPE: {
      RESOURCE: 1,
      QUESTION: 2,
      SYSTEM_DESIGN: 3,
      PROJECT_REVIEW: 4,
      TECH_ARTICLE: 5,
    },
  },
})
const display = executeCommonJs(displaySource, 'publicDisplay.ts')

assert.equal(domains.getCommunityChannel(undefined), undefined)
assert.equal(domains.getCommunityChannel(''), undefined)
assert.equal(domains.getCommunityChannel('unknown-channel'), undefined)
assert.equal(domains.getCommunityChannel('tech-digital')?.name, '科技数码')
assert.equal(domains.getCommunityChannel('tech')?.name, '科技数码')
assert.equal(domains.getCommunityChannel('技术')?.name, '科技数码')
assert.equal(domains.getCommunityChannel('domain-1')?.name, '科技数码')
assert.equal(domains.getCommunityChannel('1')?.name, '科技数码')
assert.equal(domains.getCommunityChannel('reading')?.name, '学习成长')
assert.equal(domains.getCommunityChannel('生活')?.name, '生活方式')
assert.equal(domains.resolveDomainValue('tech'), domains.DOMAIN.TECH)
assert.equal(domains.resolveDomainValue('domain-3'), domains.DOMAIN.READING)
assert.equal(domains.resolveDomainValue('unknown-channel'), undefined)
assert.equal(domains.resolveDomainLabel(1, '技术'), '科技数码')
assert.equal(domains.resolveDomainLabel(undefined, '技术'), '科技数码')
assert.equal(domains.resolveDomainLabel(undefined, ''), '')
assert.equal(domains.resolveDomainLabel(undefined, 'unknown-channel'), '')

assert.equal(display.formatPublicContentCount(3), '3 篇公开内容')
assert.equal(display.formatPublicContentCount(6), '6 篇公开内容')
assert.equal(display.formatPublicContentCountText('3 public posts'), '3 篇公开内容')
assert.equal(display.formatPublicContentCountText('1 public post'), '1 篇公开内容')
assert.equal(display.localizeKnowledgeCopy('From public post'), '来自公开帖子')
assert.equal(display.localizeKnowledgeCopy('From public tag'), '来自公开标签')
assert.equal(display.localizeKnowledgeCopy('From public topic: Java'), '来自公开话题：Java')
assert.equal(display.localizeKnowledgeCopy('From public content series'), '来自公开内容合集')
assert.equal(display.localizeKnowledgeCopy('From search discovery entry: Redis'), '来自公开搜索结果：Redis')
assert.equal(
  display.localizeKnowledgeCopy('Aggregated search entry indicates public coverage demand.'),
  '公开搜索结果显示该主题仍有内容补充需求。',
)
assert.equal(display.localizePublicCopy('Curated from public content'), '来自公开内容的运营整理')
assert.equal(
  display.localizeKnowledgeCopy('Public reading path generated from public asset relations'),
  '根据公开内容关系生成的阅读建议',
)

assert.match(exploreView, /crossDomainDisplayLabel\(item\)/)
assert.match(exploreView, /formatPublicContentCountText\(item\.reasonText \|\| item\.reason\)/)
assert.doesNotMatch(exploreView, /sourceDomainName \|\| '公共内容'/)
assert.match(searchView, /getCommunityChannel\(channelKey\)/)
assert.match(searchView, /getDomainLabelSafe\(item\.domain\)/)
assert.match(knowledgeView, /localizeKnowledgeCopy\(relation\.reasonText/)
assert.doesNotMatch(knowledgeView, /return 'topic to tag'|return 'belongs to'|return 'references'/)
assert.doesNotMatch(knowledgeView, /公共知识资产|公共缺口|请求时公开投影|关系投影降级/)

for (const state of ['LOADING', 'READY', 'EMPTY', 'ERROR', 'DEGRADED']) {
  assert.match(slotCard, new RegExp(`'${state}'`), `Operation slot must model ${state}.`)
}
assert.match(slotCard, /@click="loadSlot"/)
assert.match(slotCard, /当前暂无精选内容，稍后再来看看。/)
assert.doesNotMatch(slotCard, /暂无配置|运营位接口已正常返回|当前没有已发布且可见的精选内容/)
assert.match(operationsApi, /localizePublicCopy\(item\.note \|\| item\.reasonText/)
assert.doesNotMatch(operationsApi, /reason:\s*item\.note \|\| item\.reasonText \|\| 'Curated/)
assert.match(knowledgeApi, /localizeKnowledgeCopy\(raw\?\.summary \?\? raw\?\.description/)
assert.doesNotMatch(knowledgeApi, /safeText\(raw\?\.title, 'Public knowledge path'\)/)
assert.doesNotMatch(knowledgeApi, /Only public visible assets/)

console.log('Discovery, knowledge, channel, and public copy guard passed.')
