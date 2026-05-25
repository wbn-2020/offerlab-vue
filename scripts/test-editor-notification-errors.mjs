import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const editor = readFileSync(new URL('../src/views/EditorView.vue', import.meta.url), 'utf8')
const notifications = readFileSync(new URL('../src/views/NotificationsView.vue', import.meta.url), 'utf8')

assert.match(editor, /getErrorMessage/, 'EditorView must use centralized error messages')
assert.match(editor, /toast\.(success|error|warning)/, 'EditorView must use toast feedback')
assert.doesNotMatch(editor, /alert\(/, 'EditorView must not use blocking alert feedback')
assert.doesNotMatch(editor, /console\.error/, 'EditorView must not log user-facing failures instead of showing feedback')

assert.match(notifications, /getErrorMessage/, 'NotificationsView must use centralized error messages')
assert.match(notifications, /toast\.error/, 'NotificationsView mutations must show failures')
assert.doesNotMatch(notifications, /console\.error/, 'NotificationsView must not hide failures in console only')

console.log('editor and notification error guard passed')
