import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import * as ts from 'typescript'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

const [
  domainsSource,
  surfacesSource,
  editorPreviewSource,
  previewPanel,
  previewCard,
  postCard,
  postDetail,
  growthReport,
  growthProfile,
  adminGovernance,
  editorView,
  packageSource,
] = await Promise.all([
  read('src/utils/domains.ts'),
  read('src/utils/domainPostSurfaces.ts'),
  read('src/utils/editorPreview.ts'),
  read('src/components/editor-preview/EditorPreviewPanel.vue'),
  read('src/components/editor-preview/EditorPreviewCard.vue'),
  read('src/components/post/PostCard.vue'),
  read('src/views/PostDetailView.vue'),
  read('src/views/GrowthReportView.vue'),
  read('src/views/GrowthProfileView.vue'),
  read('src/views/AdminGovernanceView.vue'),
  read('src/views/EditorView.vue'),
  read('package.json'),
])

const executeCommonJs = (source, filename, dependencies) => {
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
      if (Object.prototype.hasOwnProperty.call(dependencies, specifier)) {
        return dependencies[specifier]
      }
      throw new Error(`Unexpected dependency: ${specifier}`)
    },
    console,
  }
  sandbox.exports = sandbox.module.exports
  vm.runInNewContext(compiled, sandbox, { filename })
  return sandbox.module.exports
}

const contentTypes = {
  POST_TYPE: {
    RESOURCE: 1,
    QUESTION: 2,
    SYSTEM_DESIGN: 3,
    PROJECT_REVIEW: 4,
    TECH_ARTICLE: 5,
  },
  getContentTypeOption: () => ({
    code: 'TECH_ARTICLE',
    label: '攻略清单',
    shortLabel: '攻略',
    description: '',
  }),
}
const domains = executeCommonJs(domainsSource, 'domains.ts', {
  '@/utils/contentTypes': contentTypes,
})
const surfaces = executeCommonJs(surfacesSource, 'domainPostSurfaces.ts', {
  '@/utils/domains': domains,
})
const editorPreview = executeCommonJs(editorPreviewSource, 'editorPreview.ts', {
  '@/utils/contentTypes': contentTypes,
  '@/utils/domains': domains,
  '@/utils/textQuality': {
    sanitizeVisibleText: (value) => value == null ? '' : String(value).replace(/\s+/g, ' ').trim(),
  },
})

assert.equal(domains.getDomainLabelSafe(undefined), '未标注频道')
assert.equal(domains.getDomainLabelSafe(null), '未标注频道')
assert.equal(domains.getDomainLabelSafe(99), '未标注频道')
assert.equal(domains.getDomainLabelSafe(1), '科技数码')
assert.equal(domains.normalizeDomain(undefined), domains.DOMAIN.TECH)
assert.equal(domains.normalizeDomain(99), domains.DOMAIN.TECH)

const unknownPost = {
  postId: 1,
  postType: 5,
  title: 'unknown domain',
  content: 'content',
  coverUrl: 'https://example.com/cover.png',
  tags: [],
  author: { uid: 1, nickname: 'a', avatar: '', signature: '', createdAt: 0 },
  counter: { view: 0, like: 0, comment: 0, favorite: 0 },
  extension: {},
  domain: 99,
  createdAt: 0,
  updatedAt: 0,
}
assert.equal(surfaces.buildDomainDetailSurface(unknownPost), null)
const unknownCard = surfaces.buildDomainCardSurface(unknownPost)
assert.equal(unknownCard.tone, 'neutral')
assert.equal(unknownCard.chips.length, 0)
assert.equal(unknownCard.imageUrl, unknownPost.coverUrl)

const emptyPreview = editorPreview.mapEditorDraftToPreview({})
assert.equal(emptyPreview.domain.known, false)
assert.equal(emptyPreview.domain.value, null)
assert.equal(emptyPreview.domain.label, '未标注频道')
const techPreview = editorPreview.mapEditorDraftToPreview({ domain: 1 })
assert.equal(techPreview.domain.known, true)
assert.equal(techPreview.domain.value, 1)
assert.equal(techPreview.domain.label, '科技数码')

assert.match(previewPanel, /v-if="preview\.domain\.known"/)
assert.match(previewCard, /v-if="preview\.domain\.known"/)
assert.match(postCard, /v-if="isKnownDomain\(post\.domain\)"/)
assert.match(postDetail, /v-if="isKnownDomain\(post\.domain\) && domainDetailSurface"/)
assert.match(postDetail, /const domainLabel = isKnownDomain\(post\.value\.domain\)/)
assert.match(growthReport, /highlightDomainLabel\(post\)/)
assert.match(growthReport, /domainChangeLabel\(change\)/)
assert.match(growthReport, /getDomainLabelSafe/)
assert.match(growthProfile, /profileDomainLabel\(domain\)/)
assert.match(growthProfile, /primaryDomain\.value \? profileDomainLabel\(primaryDomain\.value\)/)
assert.match(growthProfile, /representativePostDomainLabel/)
assert.match(adminGovernance, /value="POST_PENDING_REVIEW"/)
assert.match(adminGovernance, /POST_PENDING_REVIEW: '帖子待审'/)
assert.match(adminGovernance, /if \(!canModerate\.value\) return false/)
assert.match(adminGovernance, /postApi\.getReviewPreview\(postId\)/)
assert.match(adminGovernance, /previewedPendingPostIds\.value\.has\(pendingPostPreviewKey\(item\)\)/)
assert.match(adminGovernance, /queueExtJson\(item\.backendItem\)\.version/)
assert.match(adminGovernance, /const queueDomain = \(item: BackendReviewQueueItem\)/)
assert.match(adminGovernance, /getDomainLabelSafe\(domain\)/)
assert.match(adminGovernance, /item\.creatorUid && item\.creatorUid === currentUid/)
assert.match(adminGovernance, /item\.assigneeUid && item\.assigneeUid !== currentUid/)
assert.match(editorView, /domain:\s*selectedDomain\.value/)

const pkg = JSON.parse(packageSource)
assert.equal(pkg.scripts?.['test:review-fixes'], 'node scripts/test-review-fixes.mjs')
assert.match(pkg.scripts?.['pretest:guards'] || '', /npm run test:review-fixes/)
assert.match(pkg.scripts?.verify || '', /npm run test:guards/)

console.log('Review fixes guard passed')
