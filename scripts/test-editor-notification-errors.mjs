import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const editor = readFileSync(new URL('../src/views/EditorView.vue', import.meta.url), 'utf8')
const notifications = readFileSync(new URL('../src/views/NotificationsView.vue', import.meta.url), 'utf8')
const login = readFileSync(new URL('../src/views/LoginView.vue', import.meta.url), 'utf8')
const adapters = readFileSync(new URL('../src/api/adapters.ts', import.meta.url), 'utf8')

assert.match(editor, /getErrorMessage/, 'EditorView must use centralized error messages')
assert.match(editor, /toast\.(success|error|warning)/, 'EditorView must use toast feedback')
assert.match(editor, /发布检查/, 'EditorView must show a publish quality checklist')
assert.match(editor, /blockingQualityIssues/, 'EditorView must block publish when required quality checks fail')
assert.match(editor, /publishDisabledReason/, 'EditorView must explain disabled publish state')
assert.match(editor, /aria-live="polite"/, 'EditorView publish disabled reason must be announced accessibly')
assert.match(editor, /hasCompany/, 'Interview posts must validate company metadata before publishing')
assert.match(editor, /hasPosition/, 'Interview posts must validate position metadata before publishing')
assert.match(editor, /normalizedTags\.value\.length >= \(isInterviewPost\.value \? 2 : 1\)/, 'EditorView must require meaningful tags before publishing')
assert.doesNotMatch(editor, /alert\(/, 'EditorView must not use blocking alert feedback')
assert.doesNotMatch(editor, /console\.error/, 'EditorView must not log user-facing failures instead of showing feedback')

assert.match(notifications, /getErrorMessage/, 'NotificationsView must use centralized error messages')
assert.match(notifications, /toast\.error/, 'NotificationsView mutations must show failures')
assert.match(notifications, /markAllDisabled/, 'NotificationsView must centralize mark-all disabled state')
assert.match(notifications, /暂无未读/, 'NotificationsView must explain when mark-all is disabled because there are no unread notifications')
assert.match(notifications, /toast\.success\('已全部标为已读'\)/, 'NotificationsView must confirm successful mark-all actions')
assert.doesNotMatch(notifications, /console\.error/, 'NotificationsView must not hide failures in console only')

assert.match(login, /router\.replace\(safeRedirect\(route\.query\.redirect\)\)/, 'LoginView must replace the login page after successful login')
assert.match(login, /\^\\\/\(\?:login\|register\)/, 'LoginView must not redirect authenticated users back to auth pages')
assert.match(login, /authStore\.isLoggedIn/, 'LoginView must redirect already authenticated visitors away from login')

assert.match(adapters, /notificationHeading\(type, content, sender\?\.nickname\)/, 'notification adapter must derive titles from system content')
assert.match(adapters, /question_extract_succeeded/, 'question extraction success notifications must have a dedicated frontend message')
assert.match(adapters, /question_extract_failed/, 'question extraction failure notifications must have a dedicated frontend message')
assert.match(adapters, /notificationContent\(type, content, sender\?\.nickname\)/, 'notification adapter must render system notification content')

console.log('editor and notification error guard passed')
