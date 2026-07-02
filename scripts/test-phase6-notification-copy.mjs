import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const notificationsView = read('src/views/NotificationsView.vue')
const adapters = read('src/api/adapters.ts')
const settings = read('src/views/SettingsView.vue')
const header = read('src/components/layout/AppHeader.vue')

for (const text of [
  '社区回访中心',
  '回到讨论',
  '查看作者主页',
  '查看关联内容',
  '点赞',
  '评论',
  '收藏',
  '关注',
  '提及',
]) {
  assert.match(notificationsView, new RegExp(text), `notification center must expose community callback copy: ${text}`)
}

assert.match(adapters, /关注专题有新内容/, 'topic notifications must stay framed as followed-topic updates')
assert.match(adapters, /关注了你/, 'follow notifications must clearly say who followed the user')
assert.match(adapters, /评论了你的帖子/, 'comment notifications must clearly reference the related content')
assert.match(settings, /通知偏好/, 'settings must expose notification preference wording')
assert.match(settings, /事件仍会发生，只是不再提醒/, 'settings must explain disabled notification types without pressure')
assert.match(header, /to="\/me\/notifications"/, 'header bell must keep the notification center entry')

const stage6MainSources = [notificationsView, settings, header].join('\n')
for (const forbidden of ['今日任务', '待训练', '投递进度', '模拟面试提醒', 'AI 教练建议']) {
  assert.doesNotMatch(stage6MainSources, new RegExp(forbidden), `phase6 notification surfaces must not use private task copy: ${forbidden}`)
}

console.log('phase6 notification copy guard passed')
