import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import assert from 'node:assert/strict'

const source = fs.readFileSync(new URL('../src/utils/adminPermissions.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
})

const sandbox = { exports: {} }
vm.runInNewContext(compiled.outputText, sandbox)

const { adminPermissionRequirementText, hasAdminPermission } = sandbox.exports

const admin = { admin: true, ops: false, contentModerator: false, questionOperator: false }
const ops = { admin: false, ops: true, contentModerator: false, questionOperator: false }
const moderator = { admin: false, ops: false, contentModerator: true, questionOperator: false }

assert.equal(hasAdminPermission(null, 'ops'), false)
assert.equal(hasAdminPermission(ops, 'ops'), true)
assert.equal(hasAdminPermission(ops, 'questionOperator'), false)
assert.equal(hasAdminPermission(admin, ['ops', 'admin']), true)
assert.equal(hasAdminPermission(moderator, ['ops', 'contentModerator']), true)
assert.equal(adminPermissionRequirementText(['ops', 'contentModerator']), '运维管理员 / 内容审核员')

console.log('admin permission tests passed')
