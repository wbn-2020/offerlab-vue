import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const notificationsView = readFileSync(new URL('../src/views/NotificationsView.vue', import.meta.url), 'utf8')

assert.match(notificationsView, /<div class="overflow-x-auto">/, 'notification tabs must be allowed to scroll horizontally')
assert.match(notificationsView, /<div class="flex min-w-max gap-2">/, 'notification tabs must keep stable inline sizing')
assert.match(notificationsView, /\.tab-button[\s\S]*white-space: nowrap/, 'notification tab labels must not wrap awkwardly on mobile')
assert.match(notificationsView, /@media \(max-width: 640px\)/, 'notification view must include mobile layout rules')
assert.match(notificationsView, /\.notification-item-inner[\s\S]*grid-template-columns: 2\.75rem minmax\(0, 1fr\)/, 'notification cards must keep icon/content layout stable on mobile')
assert.match(notificationsView, /\.notification-read-button[\s\S]*min-height: 44px/, 'notification read buttons must keep mobile touch target size')
assert.match(notificationsView, /class="min-w-0 flex-1"/, 'notification text column must allow long content to shrink safely')
assert.match(notificationsView, /max-w-lg text-sm leading-6/, 'notification empty text must wrap in a constrained width')

console.log('phase6 mobile notification layout guard passed')
