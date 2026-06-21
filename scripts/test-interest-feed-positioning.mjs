import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const types = read('src/api/types.ts')
const userApi = read('src/api/user.ts')
const adapters = read('src/api/adapters.ts')
const intentForm = read('src/components/user/IntentForm.vue')
const home = read('src/views/HomeView.vue')
const settings = read('src/views/SettingsView.vue')
const pkg = JSON.parse(read('package.json'))

for (const field of ['interestTopics', 'interestTags', 'contentPreferences']) {
  assert.match(types, new RegExp(`${field}\\??:`), `UserIntent must declare ${field}`)
  assert.match(userApi, new RegExp(field), `userApi must preserve ${field}`)
  assert.match(adapters, new RegExp(`${field}:\\s*toStringArray\\(raw\\?\\.${field}\\)`), `adaptUserIntent must preserve ${field}`)
  assert.match(intentForm, new RegExp(field), `IntentForm must edit ${field}`)
}

for (const option of ['职场成长', '城市生活', '效率工具', '学习成长', '消费决策', '生活方式']) {
  assert.match(intentForm, new RegExp(option), `IntentForm must expose interest topic option: ${option}`)
}

for (const option of ['经验复盘', '避坑指南', '清单推荐', '工具分享', '深度讨论', '新手友好']) {
  assert.match(intentForm, new RegExp(option), `IntentForm must expose interest tag option: ${option}`)
}

for (const option of ['图文笔记', '长文经验', '问答讨论', '趋势观察']) {
  assert.match(intentForm, new RegExp(option), `IntentForm must expose content preference option: ${option}`)
}

assert.match(intentForm, /兴趣|频道|内容偏好/, 'IntentForm should present generalized community interests')
assert.match(home, /兴趣|社区|推荐理由/, 'Home recommendation copy should explain interest/community matching')
assert.match(settings, /<IntentForm[\s\S]*:initial-data="intentFormData \|\| undefined"[\s\S]*@submit="updateIntent"/, 'SettingsView must preload saved intent into IntentForm')
assert.match(settings, /userApi\.getIntent\(/, 'SettingsView must load the saved intent before editing')
assert.match(pkg.scripts['test:interest-feed-positioning'], /test-interest-feed-positioning\.mjs/, 'package scripts must expose interest feed guard')
assert.match(pkg.scripts['test:guards'], /test:interest-feed-positioning/, 'test:guards must include interest feed guard')

console.log('interest feed positioning guard passed')
