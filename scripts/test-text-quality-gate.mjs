import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const projectRoot = fileURLToPath(new URL('../..', import.meta.url))

const scanRoots = [
  'src/views',
  'src/components',
  'src/router',
  'src/api',
  'src/composables',
  'src/utils',
  'src/stores',
  '../offerlab-java/community-domain-question/src/main/java',
  '../offerlab-java/community-domain-search/src/main/java',
  '../offerlab-java/community-bootstrap/src/main/java',
  '../offerlab-java/community-common/src/main/java',
  '../offerlab-java/community-domain-analytics/src/main/java',
  '../offerlab-java/community-domain-interaction/src/main/java',
  '../offerlab-java/community-domain-notification/src/main/java',
  '../offerlab-java/community-domain-post/src/main/java',
  '../offerlab-java/community-domain-user/src/main/java',
  '../offerlab-java/community-infrastructure/src/main/java',
  '../offerlab-java/db/init',
  '../offerlab-java/db/migration',
  '../offerlab-java/docs',
  '../offerlab-java/README.md',
].map((item) => join(repoRoot, item))

const sourceExts = new Set(['.vue', '.ts', '.java', '.sql', '.md'])
const ignoredDirs = new Set(['node_modules', 'dist', 'target', '.git'])

const suspiciousDecodedBytes = /[\uFFFD\u00C3\u00C2\u00A4\u00A5\u00A7\u00D0\u00D1]/
const latin1MojibakeSequence = /(?:\u00C2[\u0080-\u00BF]|\u00C3[\u0080-\u00BF]|[\u00E0-\u00EF][\u0080-\u00BF]{2}|[\u00F0-\u00F4][\u0080-\u00BF]{3})/
const questionPlaceholder = /(['"`>][^\n<]{0,80}\?{3,}[^\n<]{0,80}['"`<])/

const mojibakeFragments = [
  '\u6D93',
  '\u9359',
  '\u93C4',
  '\u7455',
  '\u93B4',
  '\u7487',
  '\u9422',
  '\u7F03',
  '\u9A9E',
  '\u6434',
  '\u6924',
  '\u5BEE',
  '\u59DD',
  '\u93C8',
  '\u93C3',
  '\u7EFE',
  '\u951B',
  '\u9286',
  '\u9225',
]

const walk = (dir, files = []) => {
  if (!existsSync(dir)) return files
  if (statSync(dir).isFile()) {
    if (sourceExts.has(extname(dir))) files.push(dir)
    return files
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath, files)
    } else if (sourceExts.has(extname(entry.name))) {
      files.push(fullPath)
    }
  }
  return files
}

const isSuspiciousLine = (line) => {
  if (latin1MojibakeSequence.test(line)) return true
  if (suspiciousDecodedBytes.test(line)) return true
  if (questionPlaceholder.test(line)) return true
  return mojibakeFragments.some((fragment) => line.includes(fragment))
}

const detectorSelfChecks = [
  {
    label: 'UTF-8 bytes decoded as Latin-1',
    line: `const text = '${String.fromCharCode(0x00C3, 0x00A5, 0x00C2, 0x00AD, 0x00C2, 0x0097)}'`,
    expected: true,
  },
  {
    label: 'GBK/UTF-8 mojibake CJK fragments',
    line: `toast.error('${String.fromCharCode(0x9359, 0x52E9, 0x7D22, 0x93C4, 0x72B6, 0x614B)}')`,
    expected: true,
  },
  {
    label: 'replacement question placeholders',
    line: "const text = '??? ??? ???'",
    expected: true,
  },
  {
    label: 'normal Chinese fallback copy',
    line: `const text = '${String.fromCharCode(0x5185, 0x5BB9, 0x7F16, 0x7801, 0x5F02, 0x5E38, 0xFF0C, 0x5DF2, 0x9690, 0x85CF, 0x539F, 0x6587)}'`,
    expected: false,
  },
]

for (const check of detectorSelfChecks) {
  assert.equal(isSuspiciousLine(check.line), check.expected, `text quality detector self-check failed: ${check.label}`)
}

const runtimeTextQuality = readFileSync(join(repoRoot, 'src/utils/textQuality.ts'), 'utf8')
const homeView = readFileSync(join(repoRoot, 'src/views/HomeView.vue'), 'utf8')
const appHeader = readFileSync(join(repoRoot, 'src/components/layout/AppHeader.vue'), 'utf8')
const adapters = readFileSync(join(repoRoot, 'src/api/adapters.ts'), 'utf8')
const postApi = readFileSync(join(repoRoot, 'src/api/post.ts'), 'utf8')
const prepPackExport = readFileSync(join(repoRoot, 'src/utils/prepPackExport.ts'), 'utf8')
assert.match(runtimeTextQuality, /LATIN1_MOJIBAKE_SEQUENCE/, 'runtime text sanitizer must detect Latin-1 decoded UTF-8 mojibake')
assert.match(runtimeTextQuality, /LATIN1_MOJIBAKE_SEQUENCE\.test\(value\)/, 'runtime visible text quality check must apply the Latin-1 mojibake detector')
assert.match(runtimeTextQuality, /SYNTHETIC_PROBE_VISIBLE_TEXT/, 'runtime text filter must detect generated browser/probe records')
assert.match(runtimeTextQuality, /TESTDATA/, 'runtime text filter must still hide explicit TESTDATA records')
assert.doesNotMatch(runtimeTextQuality, /\|TEST\|/, 'runtime text filter must not hide normal technical content that mentions tests')
for (const marker of ['RealCheck', 'ReviewActor', 'OrionInterview', 'qingce']) {
  assert.match(runtimeTextQuality, new RegExp(marker), `runtime text filter must hide generated marker ${marker}`)
}
assert.match(runtimeTextQuality, /SYNTHETIC_CHINESE_TEST_TEXT/, 'runtime text filter must detect Chinese browser/test-profile residue')
for (const marker of ['94FE', '516C', '672A']) {
  assert.match(runtimeTextQuality, new RegExp(marker, 'i'), `runtime text filter must hide escaped Chinese marker ${marker}`)
}
assert.match(runtimeTextQuality, /GENERATED_TRAILING_ID\.test\(text\)/, 'runtime text filter must hide titles ending with generated timestamp ids')
for (const field of ['focusTag', 'companySnapshot', 'positionSnapshot', 'questionTextSnapshot', 'answerHintSnapshot', 'signature']) {
  assert.match(runtimeTextQuality, new RegExp(`item\\?\\.${field}`), `runtime text filter must inspect ${field}`)
}
assert.match(homeView, /currentUserSignature/, 'HomeView must sanitize the current user signature before rendering')
for (const source of [adapters, postApi, prepPackExport]) {
  assert.doesNotMatch(source, /未命名标签/, 'frontend fallback copy must not expose raw engineering label names')
}
for (const [name, source] of [
  ['src/api/adapters.ts', adapters],
  ['src/api/post.ts', postApi],
  ['src/utils/prepPackExport.ts', prepPackExport],
  ['src/views/EditorView.vue', readFileSync(join(repoRoot, 'src/views/EditorView.vue'), 'utf8')],
]) {
  assert.doesNotMatch(source, /未命名/, `${name} must use product-grade fallback copy instead of raw unnamed labels`)
}
assert.match(adapters, /未归类主题/, 'tag adapter must use product-grade fallback copy')
assert.match(adapters, /待整理专题/, 'topic adapter must use product-grade fallback copy')
assert.match(postApi, /未归类主题/, 'post draft adapter must use product-grade fallback copy')
assert.match(prepPackExport, /未归类主题/, 'export fallback copy must use product-grade topic wording')
assert.match(homeView, /userDisplaySignature\(user\)/, 'HomeView must sanitize recommended user signatures before rendering')
assert.match(appHeader, /userMenuSignature/, 'AppHeader must sanitize menu user signatures before rendering')

const hits = []
let scanned = 0

for (const root of scanRoots) {
  for (const file of walk(root)) {
    scanned += 1
    const source = readFileSync(file, 'utf8')
    source.split(/\r?\n/).forEach((line, index) => {
      if (!isSuspiciousLine(line)) return
      hits.push(`${relative(projectRoot, file)}:${index + 1}: ${line.trim().slice(0, 160)}`)
    })
  }
}

assert.equal(hits.length, 0, `visible text quality gate found mojibake-like source:\n${hits.slice(0, 20).join('\n')}`)

console.log(`text quality gate passed (${scanned} files scanned)`)
