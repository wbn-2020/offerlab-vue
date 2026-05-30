import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const opsView = readFileSync(new URL('../src/views/OpsView.vue', import.meta.url), 'utf8')
const types = readFileSync(new URL('../src/api/types.ts', import.meta.url), 'utf8')

assert.match(types, /note\?:\s*string/, 'report review request type must support reviewer notes')
assert.match(opsView, /reviewDialog = reactive/, 'OpsView must use a formal review dialog state')
assert.match(opsView, /ref="reviewNoteInput"/, 'review dialog must collect a reviewer note in a textarea')
assert.match(opsView, /reviewDialog\.error = '请填写审核备注'/, 'empty report review notes must show a field-level error')
assert.doesNotMatch(opsView, /window\.prompt/, 'report review must not use window.prompt')
assert.match(opsView, /reviewAdminReport\(report\.reportId, \{ approved, note \}\)/, 'post report review must send the note')
assert.match(opsView, /reviewAdminCommentReport\(report\.reportId, \{ approved, note \}\)/, 'comment report review must send the note')
assert.match(opsView, /处理备注：\{\{ report\.reviewNote \}\}/, 'reviewed reports must show the stored note')

console.log('report review note guard passed')
