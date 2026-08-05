import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const expect = (value, message) => assert.ok(value, message)

const packageJson = JSON.parse(read('package.json'))
const opsApi = read('src/api/ops.ts')
const opsView = read('src/views/OpsView.vue')

expect(
  packageJson.scripts['test:v33-readiness-release-gates'] === 'node scripts/test-v33-readiness-release-gates.mjs',
  'V33 readiness guard must have a package script.',
)
expect(
  packageJson.scripts['pretest:guards'].includes('test:v33-readiness-release-gates'),
  'V33 readiness guard must run before the full guard suite.',
)

expect(opsApi.includes("'/api/v1/health/readiness/strict'"),
  'V33 must read strict readiness from the protected endpoint.')
expect(opsApi.includes('validateStatus: () => true'),
  'V33 strict readiness must retain 503 payloads so blocked gates remain visible.')
expect(opsApi.includes('authTokenStore.get()'),
  'V33 strict readiness must preserve the authenticated OPS request context.')
expect(opsApi.includes('releaseGatePresentationState'),
  'V33 must centralize release-gate state handling.')
expect(opsApi.includes("if (!gate) return 'unknown'"),
  'Missing release gates must be unavailable rather than ready.')
expect(opsApi.includes("if (gate.status === 'DEGRADED') return 'degraded'"),
  'Degraded release gates must not be treated as ready.')
expect(opsApi.includes('if (!gate.ready) return \'blocked\''),
  'A non-ready release gate must block release acceptance.')

expect(opsView.includes('data-v33-release-readiness="strict-gates-only"'),
  'V33 must render release readiness inside the existing OPS surface.')
expect(opsView.includes("'revisionAwareQualityProjection'"),
  'V33 must render the revision-aware quality projection gate.')
expect(opsView.includes('strict readiness 未返回可识别的 gate'),
  'Missing or unknown gates must render as unavailable and blocked.')
expect(opsView.includes('后端将该 gate 标记为降级，不能作为发布通过依据。'),
  'Degraded gates must not be presented as ready.')
expect(opsView.includes('后端尚未确认该 gate 通过，发布验收保持阻断。'),
  'Blocked gates must render as blocked.')
expect(opsView.includes('readiness.value?.releaseReady === true'),
  'Release approval must require the backend strict readiness verdict.')
expect(opsView.includes("gate.badge === '已通过'"),
  'Release approval must require every required gate to pass.')
expect(opsView.includes('opsApi.strictReadiness()'),
  'OPS readiness loader must call the strict endpoint.')

for (const forbidden of ['readerUid', 'distinctReaderCount', 'revisionToken', 'effectiveRevisionAt', 'password', 'SELECT ', 'INSERT ', 'UPDATE ', 'DELETE ']) {
  expect(!opsView.includes(forbidden), `V33 OPS release panel must not disclose ${forbidden}.`)
}

console.log('V33 readiness release-gate guard passed.')
