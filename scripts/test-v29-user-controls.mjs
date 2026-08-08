import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const expect = (value, message) => {
  if (!value) throw new Error(message)
}

const feedApi = read('src/api/feed.ts')
const postCard = read('src/components/post/PostCard.vue')
const home = read('src/views/HomeView.vue')
const settings = read('src/views/SettingsView.vue')

for (const endpoint of [
  "'/api/v1/feeds/author-controls'",
  '/api/v1/feeds/author-controls/${encodeURIComponent(String(authorUid))}',
  "'/api/v1/feeds/controls'",
  '/api/v1/feeds/controls/${encodeURIComponent(String(controlId))}',
]) {
  expect(feedApi.includes(endpoint), `V29 feed API is missing ${endpoint}`)
}

expect(feedApi.includes('export interface FeedControl'), 'V29 must expose a typed private feed-control record')
expect(feedApi.includes('listControls'), 'V29 must expose control-list retrieval')
expect(feedApi.includes('deleteControl'), 'V29 must support generic control removal by stable control ID')
expect(!feedApi.includes("'hide_author'"), 'the Vue client must not retain the legacy hide_author action')

expect(postCard.includes("label: '屏蔽作者'"), 'post card must provide an explicit author-control action')
expect(postCard.includes("!Boolean(props.post.anonymous)"), 'anonymous posts must not expose the author-control action')
expect(postCard.includes('屏蔽此作者？'), 'author control requires a visible confirmation dialog')
expect(postCard.includes('不会通知对方'), 'author-control confirmation must explain private scope')
expect(postCard.includes("emit('blockAuthor'"), 'post card must emit an explicit author-control event')
expect(postCard.includes('feedback-menu-wrapper'), 'post card feedback menu must retain its click-boundary wrapper')
expect(!postCard.includes("'hide_author'"), 'post card must not send the legacy hide_author action')

expect(home.includes('feedApi.blockAuthor(authorUid)'), 'home feed must create author controls through the V29 endpoint')
expect(home.includes('@block-author="handleAuthorBlock"'), 'home feed must handle author-control events')
expect(home.includes('此设置仅影响你的信息流'), 'home feedback must explain the private feed-only scope')

expect(settings.includes("value: 'feed-controls'"), 'settings requires a dedicated feed-control tab')
expect(settings.includes('data-v29-feed-control-manager'), 'settings must expose the V29 feed-control manager')
expect(settings.includes('feedApi.listControls'), 'settings manager must load the unified control list')
expect(settings.includes('feedApi.deleteControl'), 'settings manager must remove controls by stable ID')
expect(settings.includes("value: 'AUTHOR'"), 'settings manager must filter author controls')
expect(!settings.includes('control.targetId'), 'settings must not render author or removed-content identifiers')
expect(settings.includes('不会通知其他用户'), 'settings must state that controls remain private')

console.log('V29 user controls guard passed.')
