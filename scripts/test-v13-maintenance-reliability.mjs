import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const rootUrl = new URL('../', import.meta.url)
const read = relativePath => readFileSync(new URL(relativePath, rootUrl), 'utf8')

const apiSource = read('src/api/contentMaintenance.ts')
const hubSource = read('src/composables/useParticipationHub.ts')
const mineViewSource = read('src/views/MaintenanceTasksView.vue')
const queueViewSource = read('src/views/AdminMaintenanceTasksView.vue')

assert.match(
  apiSource,
  /export interface ContentMaintenanceRequestOptions \{\s*signal\?: AbortSignal\s*skipAuthRedirect\?: boolean\s*\}/,
)
assert.match(
  apiSource,
  /mine:\s*\([\s\S]*options: ContentMaintenanceRequestOptions = \{\}[\s\S]*signal: options\.signal[\s\S]*skipAuthRedirect: options\.skipAuthRedirect/,
  'mine must expose request options and pass them to Axios',
)
assert.match(
  apiSource,
  /queue:\s*\([\s\S]*options: ContentMaintenanceRequestOptions = \{\}[\s\S]*signal: options\.signal[\s\S]*skipAuthRedirect: options\.skipAuthRedirect/,
  'queue must expose request options and pass them to Axios',
)

const apiCalls = []
const apiClient = {
  get: (url, config) => {
    apiCalls.push({ url, config })
    return Promise.resolve({
      code: 0,
      message: 'ok',
      data: { items: [], nextCursor: null, hasMore: false, total: 0 },
    })
  },
  post: () => Promise.resolve({ code: 0, message: 'ok', data: null }),
}
const apiSandbox = {
  AbortController,
  exports: {},
  module: { exports: {} },
  Promise,
  require: (name) => {
    if (name === './client') return { __esModule: true, default: apiClient }
    throw new Error(`Unexpected content maintenance dependency: ${name}`)
  },
}
apiSandbox.module.exports = apiSandbox.exports
const apiCode = ts.transpileModule(apiSource, {
  compilerOptions: {
    esModuleInterop: true,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText
vm.runInNewContext(apiCode, apiSandbox)

const mineQuery = { status: 'CLAIMED', cursor: '52', size: 5 }
const mineController = new AbortController()
await apiSandbox.exports.contentMaintenanceApi.mine(mineQuery, {
  signal: mineController.signal,
  skipAuthRedirect: true,
})
assert.equal(apiCalls[0].url, '/api/v1/content-maintenance/tasks/mine')
assert.strictEqual(apiCalls[0].config.params, mineQuery)
assert.strictEqual(apiCalls[0].config.signal, mineController.signal)
assert.equal(apiCalls[0].config.skipAuthRedirect, true)

const queueQuery = { domain: 2, status: 'SUBMITTED', cursor: '31', size: 50 }
const queueController = new AbortController()
await apiSandbox.exports.contentMaintenanceApi.queue(queueQuery, {
  signal: queueController.signal,
  skipAuthRedirect: false,
})
assert.equal(apiCalls[1].url, '/api/v1/content-maintenance/tasks/queue')
assert.strictEqual(apiCalls[1].config.params, queueQuery)
assert.strictEqual(apiCalls[1].config.signal, queueController.signal)
assert.equal(apiCalls[1].config.skipAuthRedirect, false)

assert.match(hubSource, /const PREVIEW_PAGE_SIZE = 5/)
assert.match(
  hubSource,
  /maintenance:\s*\{[\s\S]*?load:\s*\(signal\)\s*=>\s*contentMaintenanceApi\.mine\(\s*\{\s*size:\s*PREVIEW_PAGE_SIZE\s*\},\s*\{\s*signal\s*\}/,
  'Participation Hub maintenance preview must keep the five-item bound and pass its AbortSignal',
)

const assertCommonListReliability = (source, label) => {
  assert.match(source, /const loading = ref\(false\)/, `${label} must keep first-load state`)
  assert.match(source, /const loadingMore = ref\(false\)/, `${label} must keep append loading state`)
  assert.match(source, /const errorText = ref\(''\)/, `${label} must keep first-load error state`)
  assert.match(source, /const loadMoreErrorText = ref\(''\)/, `${label} must keep append error state`)
  assert.match(source, /new AbortController\(\)/, `${label} must create an AbortController per request`)
  assert.match(source, /\.abort\(\)/, `${label} must abort superseded requests`)
  assert.match(source, /requestId:\s*number/)
  assert.match(source, /cursor:\s*string \| null/)
  assert.match(source, /append:\s*boolean/)
  assert.match(source, /accountKey:\s*string/)
  assert.match(source, /accountGeneration:\s*number/)
  assert.match(source, /(?:snapshot\.)?requestId ===/)
  assert.match(source, /(?:snapshot\.)?accountGeneration ===/)
  assert.match(source, /(?:snapshot\.)?accountKey ===/)
  assert.match(source, /snapshot\.cursor === \(snapshot\.append \? nextCursor\.value : null\)/)
  assert.match(source, /signal:\s*controller\.signal/)
  assert.match(source, /candidate\?\.name === 'AbortError'/)
  assert.match(source, /candidate\?\.name === 'CanceledError'/)
  assert.match(source, /candidate\?\.code === 'ERR_CANCELED'/)
  assert.match(source, /if \(append\) loadMoreErrorText\.value = message\s*else errorText\.value = message/)
  assert.match(source, /items\.value = append \? \[\.\.\.items\.value, \.\.\.incoming\] : incoming/)
  assert.match(source, /@click="load\(true\)">重试加载更多</)
}

assertCommonListReliability(mineViewSource, 'personal maintenance list')
assert.match(mineViewSource, /requestedStatus:\s*MaintenanceStatus \| ''/)
assert.match(mineViewSource, /(?:snapshot\.)?requestedStatus === status\.value/)
assert.match(mineViewSource, /contentMaintenanceApi\.mine\([\s\S]*?\},\s*\{\s*signal:\s*controller\.signal/)
assert.match(mineViewSource, /clearMaintenanceState\(\)/)
assert.match(mineViewSource, /for \(const key of Object\.keys\(drafts\)\) delete drafts\[key\]/)
assert.match(mineViewSource, /contentMaintenanceApi\.claim\(task\.id\)/)
assert.match(
  mineViewSource,
  /contentMaintenanceApi\.submit\(task\.id,\s*\{\s*deliveryType:[\s\S]*deliveryRefId:[\s\S]*deliveryPostId:[\s\S]*note:/,
  'claim and submit write contracts must remain present',
)

assertCommonListReliability(queueViewSource, 'governance maintenance queue')
assert.match(queueViewSource, /requestedDomain:\s*number \| ''/)
assert.match(queueViewSource, /requestedStatus:\s*MaintenanceStatus \| ''/)
assert.match(queueViewSource, /snapshot\.requestedDomain === filterDomain\.value/)
assert.match(queueViewSource, /snapshot\.requestedStatus === filterStatus\.value/)
assert.match(queueViewSource, /contentMaintenanceApi\.queue\([\s\S]*?\},\s*\{\s*signal:\s*controller\.signal/)
assert.match(queueViewSource, /clearMaintenanceQueueState\(true\)/)
assert.match(queueViewSource, /clearRecord\(notes\)/)
assert.match(queueViewSource, /clearRecord\(reassignments\)/)
assert.match(queueViewSource, /resetCreateForm\(\)/)
assert.match(
  queueViewSource,
  /interface MaintenanceWriteSnapshot \{\s*requestId: number\s*accountKey: string\s*accountGeneration: number\s*\}/,
  'governance writes must snapshot request and account ownership',
)
assert.match(queueViewSource, /let maintenanceWriteRequestId = 0/)
assert.match(
  queueViewSource,
  /const beginMaintenanceWrite = \(\): MaintenanceWriteSnapshot \| null => \{\s*if \(busy\.value \|\| !maintenanceAccountIsReady\(\)\) return null[\s\S]*requestId: \+\+maintenanceWriteRequestId[\s\S]*accountKey: currentMaintenanceAccountKey\(\)[\s\S]*accountGeneration: maintenanceAccountGeneration/,
)
assert.match(
  queueViewSource,
  /const maintenanceWriteIsCurrent = \(snapshot: MaintenanceWriteSnapshot\) => \([\s\S]*snapshot\.requestId === maintenanceWriteRequestId[\s\S]*snapshot\.accountGeneration === maintenanceAccountGeneration[\s\S]*snapshot\.accountKey === currentMaintenanceAccountKey\(\)[\s\S]*maintenanceAccountIsReady\(\)/,
  'governance write responses must belong to the current account generation',
)
assert.match(
  queueViewSource,
  /const clearMaintenanceQueueState = [\s\S]*?maintenanceQueueRequestId \+= 1\s*maintenanceWriteRequestId \+= 1/,
  'account resets must invalidate both queue reads and pending writes',
)
assert.match(
  queueViewSource,
  /contentMaintenanceApi\.create\((?:\{|command\))/,
  'governance create must send either an inline command or a validated command object',
)
assert.match(queueViewSource, /contentMaintenanceApi\.review\(task\.id, \{ decision, note: note\(task\) \}\)/)
assert.match(queueViewSource, /contentMaintenanceApi\.reassign\(task\.id, \{/)
assert.match(queueViewSource, /contentMaintenanceApi\.close\(task\.id, note\(task\)\)/)

const functionBlock = (source, name, nextName) => {
  const start = source.indexOf(`const ${name} = async`)
  const end = source.indexOf(`\nconst ${nextName} =`, start)
  assert.ok(start >= 0 && end > start, `${name} function block must be discoverable`)
  return source.slice(start, end)
}

const assertOrdered = (source, label, snippets) => {
  let offset = 0
  for (const snippet of snippets) {
    const index = source.indexOf(snippet, offset)
    assert.ok(index >= 0, `${label} must contain "${snippet}" after its previous ownership checkpoint`)
    offset = index + snippet.length
  }
}

const createBlock = functionBlock(queueViewSource, 'create', 'review')
assert.match(createBlock, /const command = createCommand\.value/)
assertOrdered(createBlock, 'create write', [
  'const snapshot = beginMaintenanceWrite()',
  'if (!snapshot) return',
  'await contentMaintenanceApi.create(',
  'if (!maintenanceWriteIsCurrent(snapshot)) return',
  'resetCreateForm()',
  "toast.success('维护任务已创建')",
  'await load()',
  '} catch (error) {',
  'if (!maintenanceWriteIsCurrent(snapshot)) return',
  "toast.error(getErrorMessage(error, '创建维护任务失败'))",
  '} finally {',
  'if (maintenanceWriteIsCurrent(snapshot)) busy.value = false',
])

const reviewBlock = functionBlock(queueViewSource, 'review', 'reassign')
assertOrdered(reviewBlock, 'review write', [
  'const snapshot = beginMaintenanceWrite()',
  'if (!snapshot) return',
  'await contentMaintenanceApi.review(',
  'if (!maintenanceWriteIsCurrent(snapshot)) return',
  'toast.success(',
  'await load()',
  '} catch (error) {',
  'if (!maintenanceWriteIsCurrent(snapshot)) return',
  "toast.error(getErrorMessage(error, '审核维护任务失败'))",
  '} finally {',
  'if (maintenanceWriteIsCurrent(snapshot)) busy.value = false',
])

const reassignBlock = functionBlock(queueViewSource, 'reassign', 'close')
assertOrdered(reassignBlock, 'reassign write', [
  'const snapshot = beginMaintenanceWrite()',
  'if (!snapshot) return',
  'await contentMaintenanceApi.reassign(',
  'if (!maintenanceWriteIsCurrent(snapshot)) return',
  'delete reassignments[String(task.id)]',
  "toast.success('维护任务已转派')",
  'await load()',
  '} catch (error) {',
  'if (!maintenanceWriteIsCurrent(snapshot)) return',
  "toast.error(getErrorMessage(error, '转派维护任务失败'))",
  '} finally {',
  'if (maintenanceWriteIsCurrent(snapshot)) busy.value = false',
])

const closeBlock = functionBlock(queueViewSource, 'close', 'statusLabel')
assertOrdered(closeBlock, 'close write', [
  'const snapshot = beginMaintenanceWrite()',
  'if (!snapshot) return',
  'await contentMaintenanceApi.close(',
  'if (!maintenanceWriteIsCurrent(snapshot)) return',
  "toast.success('任务已关闭')",
  'await load()',
  '} catch (error) {',
  'if (!maintenanceWriteIsCurrent(snapshot)) return',
  "toast.error(getErrorMessage(error, '关闭维护任务失败'))",
  '} finally {',
  'if (maintenanceWriteIsCurrent(snapshot)) busy.value = false',
])

assert.match(
  queueViewSource,
  /onBeforeUnmount\(\(\) => \{\s*maintenanceQueueRequestId \+= 1\s*maintenanceWriteRequestId \+= 1\s*abortMaintenanceQueueLoad\(\)/,
  'unmount must invalidate pending governance writes before they can commit UI effects',
)

console.log('V13 maintenance request reliability guard passed.')
