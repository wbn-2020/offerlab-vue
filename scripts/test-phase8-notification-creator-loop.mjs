import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const files = {
  notifications: read('src/views/NotificationsView.vue'),
  meProfile: read('src/views/MeProfileView.vue'),
  notificationApi: read('src/api/notification.ts'),
  userCard: read('src/components/user/UserCard.vue'),
}

const assertIncludes = (name, source, snippets) => {
  const missing = snippets.filter((snippet) => !source.includes(snippet))
  if (missing.length) {
    throw new Error(`${name} missing required phase 8 creator feedback snippets: ${missing.join(' / ')}`)
  }
}

assertIncludes('NotificationsView.vue', files.notifications, [
  '轻反馈',
  '回到讨论',
  '尊重通知偏好',
  '没有生成新的后端通知',
])

assertIncludes('MeProfileView.vue', files.meProfile, [
  '创作者轻反馈',
  '新增关注者',
  '近期表现较好内容',
  '回到内容讨论',
  '只展示公开内容互动',
])

assertIncludes('UserCard.vue', files.userCard, [
  '查看主页',
  '回访作者主页',
])

assertIncludes('notification.ts', files.notificationApi, [
  'normalizeNotificationPreference',
  'interactionPreferenceMuted',
])

const forbidden = [
  '收益',
  '付费',
  '会员',
  '打赏',
  '提现',
  '订阅',
  '订单',
  '支付',
  'AI 教练',
  '私人训练',
  '求职训练',
]

for (const [name, source] of Object.entries(files)) {
  const hits = forbidden.filter((term) => source.includes(term))
  if (hits.length) {
    throw new Error(`${name} contains forbidden monetization or old-mainline copy: ${hits.join(' / ')}`)
  }
}

console.log('phase8 notification creator loop guard passed')
